"""AI CAR ASSISTANT — Claude + tool use over our own domain services.

The LLM never invents products or prices: it sees the catalog only through
tools (search / fitment / specs / garage) that call the same services the
website uses. Product cards in the reply come from tool results, not from
model text.
"""
import json
import logging
from typing import Any, Literal

import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.schema import Schema
from app.modules.catalog.repository import catalog
from app.modules.compatibility import check_fitment
from app.modules.garage import overview
from app.modules.search import search_products
from app.modules.vehicles import VEHICLE_MODELS, get_vehicle_model

log = logging.getLogger(__name__)


class ChatTurn(Schema):
    role: Literal["user", "assistant"]
    content: str


class ToolCall(Schema):
    name: str
    input: dict[str, Any]


class AssistantReply(Schema):
    text: str
    product_ids: list[str]
    mode: Literal["claude", "offline"]
    tool_calls: list[ToolCall]


TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_products",
        "description": "Search the live parts catalog (aggregated offers from many Iranian shops). Returns ranked products with best offer, price in Toman, fitment verdict and the reasons for the rank. Use Persian queries like 'روغن موتور 10W40' or 'لنت جلو'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Persian search text: part name, brand, spec."},
                "vehicle_id": {"type": "string", "description": "Vehicle model id to check fitment against, e.g. peugeot-206-t5."},
                "priority": {"type": "string", "enum": ["balanced", "cheap", "quality", "fast"]},
                "max_price_toman": {"type": "number"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_vehicle_specs",
        "description": "Owner's-manual specs for a vehicle model: engine, recommended oil viscosities and capacity, spark plug codes, battery amperage, service intervals.",
        "input_schema": {"type": "object", "properties": {"vehicle_id": {"type": "string"}}, "required": ["vehicle_id"]},
    },
    {
        "name": "check_compatibility",
        "description": "Verify whether a specific product fits a vehicle, with the reason.",
        "input_schema": {"type": "object", "properties": {"product_id": {"type": "string"}, "vehicle_id": {"type": "string"}}, "required": ["product_id", "vehicle_id"]},
    },
    {
        "name": "get_my_garage",
        "description": "The user's registered cars (up to 4), odometer, and which periodic services are due soon or overdue.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

_SYSTEM_BASE = f"""You are «دستیار قطعه ترب», a car-parts and maintenance assistant inside a Persian price-comparison marketplace.
Answer in natural, friendly Persian. Keep replies short (3-6 sentences or a short list).

Ground every product, price and compatibility claim in tool results — never invent products, prices or specs. If the user mentions a car, map it to one of these vehicle ids:
{chr(10).join(f"{v.id}: {v.title}" for v in VEHICLE_MODELS)}

When you recommend a product, mention it by name and price and say briefly why it fits (spec match, price vs. market, seller trust). Recommend at most 3. Prices are in Toman.
If the question is about maintenance timing, use get_my_garage and get_vehicle_specs and give concrete kilometres."""


class _Ctx:
    def __init__(self, session: Session, user_id: str, active_vehicle_id: str | None):
        self.session, self.user_id, self.active_vehicle_id = session, user_id, active_vehicle_id
        self.shown: list[str] = []


def _run_tool(name: str, args: dict[str, Any], ctx: _Ctx) -> Any:
    if name == "search_products":
        vid = args.get("vehicle_id") or ctx.active_vehicle_id
        prio = {"cheap": " ارزان", "quality": " اصل"}.get(args.get("priority", ""), "")
        res = search_products(f"{args['query']}{prio}", vehicle_id=vid, limit=5)
        rows = [r for r in res.results if not args.get("max_price_toman") or r.best_offer.price_toman <= args["max_price_toman"]]
        for r in rows:
            if r.product.id not in ctx.shown:
                ctx.shown.append(r.product.id)
        return [
            {"product_id": r.product.id, "title": r.product.title, "brand": r.product.brand_name, "best_price_toman": r.best_offer.price_toman,
             "best_seller": r.best_offer.seller_name, "offers_count": len(r.product.offers), "market_avg_toman": r.product.avg_price,
             "fitment": r.fit.status, "fitment_reason": r.fit.reason, "rank_reasons": r.reasons}
            for r in rows
        ]
    if name == "get_vehicle_specs":
        v = get_vehicle_model(args.get("vehicle_id"))
        return {"title": v.title, "engine": v.engine, "specs": v.specs.model_dump(), "maintenance": [m.model_dump() for m in v.maintenance]} if v else {"error": "unknown vehicle id"}
    if name == "check_compatibility":
        p = catalog.by_id(args.get("product_id", ""))
        return check_fitment(p, args.get("vehicle_id")).model_dump() if p else {"error": "unknown product id"}
    if name == "get_my_garage":
        g = overview(ctx.session, ctx.user_id)
        return [
            {"vehicle_id": v.model.id, "title": v.title, "year": v.vehicle.year, "odometer_km": v.vehicle.odometer_km,
             "active": v.vehicle.id == g.active_vehicle_id,
             "due_services": [{"service": s.title, "status": s.status, "remaining_km": s.remaining_km, "remaining_days": s.remaining_days} for s in v.services if s.status != "ok"]}
            for v in g.vehicles
        ]
    raise ValueError(f"unknown tool {name}")


def ask(history: list[ChatTurn], session: Session, user_id: str, active_vehicle_id: str | None) -> AssistantReply:
    from .fallback import offline_answer

    if settings.ai_mode == "off":
        return offline_answer(history, session, user_id, active_vehicle_id)

    ctx = _Ctx(session, user_id, active_vehicle_id)
    calls: list[ToolCall] = []
    system = _SYSTEM_BASE + (
        f"\nThe user's currently selected car is {active_vehicle_id} — assume it unless they name another." if active_vehicle_id
        else "\nThe user has not selected a car; ask which car if it matters."
    )
    messages: list[dict[str, Any]] = [{"role": t.role, "content": t.content} for t in history]

    try:
        client = anthropic.Anthropic()
        for _ in range(6):
            resp = client.beta.messages.create(
                model=settings.claude_model,
                max_tokens=4000,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                output_config={"effort": "low"},
                system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                tools=TOOLS,
                messages=messages,
            )
            if resp.stop_reason == "refusal":
                return AssistantReply(text="متأسفانه نمی‌توانم به این سؤال پاسخ بدهم. درباره قطعه یا سرویس خودروتان بپرسید.", product_ids=[], mode="claude", tool_calls=calls)

            messages.append({"role": "assistant", "content": resp.content})
            uses = [b for b in resp.content if b.type == "tool_use"]
            if resp.stop_reason != "tool_use" or not uses:
                text = "\n".join(b.text for b in resp.content if b.type == "text").strip()
                return AssistantReply(text=text, product_ids=ctx.shown[:6], mode="claude", tool_calls=calls)

            results = []
            for u in uses:  # all results go back in ONE user message
                calls.append(ToolCall(name=u.name, input=u.input or {}))
                try:
                    out = _run_tool(u.name, u.input or {}, ctx)
                    results.append({"type": "tool_result", "tool_use_id": u.id, "content": json.dumps(out, ensure_ascii=False, default=str)})
                except Exception as e:  # tool failure → tell the model, don't crash the turn
                    results.append({"type": "tool_result", "tool_use_id": u.id, "content": str(e), "is_error": True})
            messages.append({"role": "user", "content": results})
        return AssistantReply(text="جست‌وجو طولانی شد؛ لطفاً سؤال را دقیق‌تر بپرسید.", product_ids=ctx.shown, mode="claude", tool_calls=calls)
    except (anthropic.APIError, anthropic.AnthropicError, TypeError) as e:
        # TypeError: SDK raises it when no credentials are configured
        log.warning("Claude unavailable, using offline assistant: %s", e)
        return offline_answer(history, session, user_id, active_vehicle_id)


class PartGuess(Schema):
    query: str
    note: str


def identify_part(image_b64: str, media_type: str) -> PartGuess:
    """Photo search: Claude vision names the part, then the normal ranker takes over."""
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model=settings.claude_model,
        max_tokens=1000,
        output_config={
            "effort": "low",
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "part_name_fa": {"type": "string", "description": "Persian part name usable as a search query, e.g. 'لنت ترمز جلو'"},
                        "brand_or_code": {"type": "string", "description": "Visible brand or part code, empty if none"},
                        "note_fa": {"type": "string", "description": "One short Persian sentence on what you see"},
                    },
                    "required": ["part_name_fa", "brand_or_code", "note_fa"],
                    "additionalProperties": False,
                },
            },
        },
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
            {"type": "text", "text": "Identify this car part for a Persian auto-parts search engine."},
        ]}],
    )
    j = json.loads("".join(b.text for b in resp.content if b.type == "text"))
    return PartGuess(query=f"{j['part_name_fa']} {j['brand_or_code']}".strip(), note=j["note_fa"])
