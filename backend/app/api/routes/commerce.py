"""Click-out, AI assistant, image search and admin endpoints."""
import base64

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import Field

from app.api.deps import DB, OptionalUserId, UserId
from app.core.schema import Schema
from app.db import ClickOut
from app.modules.assistant.agent import AssistantReply, ChatTurn, PartGuess, ask, identify_part
from app.modules.catalog.repository import catalog
from app.modules.garage import active_vehicle

router = APIRouter()

# ── click-out: "buy at seller" (no cart — the purchase happens on the shop's own site)


class ClickOutOut(Schema):
    url: str
    seller_name: str
    price_toman: int


@router.get("/go/{product_id}/{seller_id}", response_model=ClickOutOut, tags=["click-out"])
def go(product_id: str, seller_id: str, db: DB, uid: OptionalUserId, src: str | None = Query(None, max_length=32)):
    p = catalog.by_id(product_id)
    o = next((x for x in p.offers if x.seller_id == seller_id), None) if p else None
    if not o:
        raise HTTPException(404, "پیشنهاد یافت نشد")
    db.add(ClickOut(user_id=uid or "guest", product_id=product_id, seller_id=seller_id, price_toman=o.price_toman, source=src))
    db.commit()
    return ClickOutOut(url=o.url, seller_name=o.seller_name, price_toman=o.price_toman)


# ── assistant


class ChatIn(Schema):
    messages: list[ChatTurn] = Field(min_length=1, max_length=40)


class ProductCard(Schema):
    id: str
    title: str
    category: str
    price: int
    offers: int


class ChatOut(AssistantReply):
    products: list[ProductCard]


@router.post("/assistant/chat", response_model=ChatOut, tags=["assistant"])
def chat(body: ChatIn, db: DB, uid: UserId):
    history = [m for m in body.messages if m.content.strip()][-12:]
    if not history or history[-1].role != "user":
        raise HTTPException(400, "آخرین پیام باید از کاربر باشد")
    a = active_vehicle(db, uid)
    reply = ask(history, db, uid, a[1].id if a else None)
    cards = [ProductCard(id=p.id, title=p.title, category=p.category, price=p.min_price, offers=len(p.offers)) for p in catalog.by_ids(reply.product_ids)]
    return ChatOut(**reply.model_dump(), products=cards)


_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/assistant/image-search", response_model=PartGuess, tags=["assistant"])
async def image_search(image: UploadFile = File(...)):
    if image.content_type not in _IMAGE_TYPES:
        raise HTTPException(400, "فرمت تصویر پشتیبانی نمی‌شود")
    data = await image.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "حجم تصویر بیش از ۵ مگابایت است")
    try:
        return identify_part(base64.b64encode(data).decode(), image.content_type)
    except Exception as e:  # no key / API error / unparsable output
        raise HTTPException(503, "جست‌وجوی تصویری به کلید Claude API نیاز دارد (ANTHROPIC_API_KEY در backend/.env)") from e
