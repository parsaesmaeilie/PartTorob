"""Offline assistant — deterministic answers from the same intent parser +
ranker. Used when no Claude credentials are configured or the API fails,
so the demo works anywhere.
"""
import re

from sqlalchemy.orm import Session

from app.core.text import format_number, format_toman
from app.modules.garage import overview
from app.modules.search import parse_intent, search_products
from app.modules.vehicles import get_vehicle_model

from .agent import AssistantReply, ChatTurn, ToolCall


def offline_answer(history: list[ChatTurn], session: Session, user_id: str, active_vehicle_id: str | None) -> AssistantReply:
    q = next((t.content for t in reversed(history) if t.role == "user"), "")
    intent = parse_intent(q)
    vid = intent.vehicle_ids[0] if intent.vehicle_ids else active_vehicle_id
    v = get_vehicle_model(vid)

    if re.search(r"سرویس|کی باید|یادآوری|عوض کنم|تعویض", q) and not intent.categories:
        g = overview(session, user_id)
        lines = [
            f"• {x.title}: {s.title} — " + (f"{format_number(-s.remaining_km)} کیلومتر گذشته" if s.remaining_km <= 0 else f"{format_number(s.remaining_km)} کیلومتر مانده")
            for x in g.vehicles for s in [s for s in x.services if s.status != "ok"][:2]
        ]
        text = "سرویس‌های نزدیک گاراژ شما:\n" + "\n".join(lines) if lines else "همه سرویس‌های خودروهای شما به‌روز است."
        return AssistantReply(text=text, product_ids=[], mode="offline", tool_calls=[ToolCall(name="get_my_garage(offline)", input={})])

    res = search_products(q, vehicle_id=vid, limit=3)
    if not res.results:
        return AssistantReply(text="چیزی پیدا نکردم. نام قطعه را بنویسید، مثلاً «لنت جلو» یا «روغن موتور».", product_ids=[], mode="offline", tool_calls=[])
    top = res.results[0]
    spec = f"دفترچه {v.title} روغن {' یا '.join(v.specs.oil_viscosity)} با ظرفیت {v.specs.oil_capacity_l:g} لیتر را توصیه می‌کند. " if v and "engine-oil" in intent.categories else ""
    text = (
        f"{spec}{f'برای {v.title} ' if v else ''}بهترین گزینه «{top.product.title}» است با قیمت {format_toman(top.best_offer.price_toman)} از {top.best_offer.seller_name}. "
        + (f"دلیل: {'، '.join(top.reasons)}." if top.reasons else "")
        + (" گزینه‌های دیگر را هم پایین ببینید." if len(res.results) > 1 else "")
    )
    return AssistantReply(text=text, product_ids=[r.product.id for r in res.results], mode="offline",
                          tool_calls=[ToolCall(name="search_products(offline)", input={"q": q, "vehicle_id": vid})])
