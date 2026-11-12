"""SELLER PORTAL — a shop sees how it competes on every product it lists,
edits its own price / stock, and sees the clicks we send it.

Edits are stored as OfferOverride rows and applied on top of the crawled
catalog (also after every re-crawl), so the shop's own data wins.
"""
from datetime import timedelta

from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.schema import Schema
from app.db import ClickOut, OfferOverride, User, utcnow
from app.modules.catalog.repository import catalog
from app.modules.garage import DomainError
from app.modules.ingestion.sources import SOURCES


class Listing(Schema):
    product_id: str
    title: str
    category: str
    group: str
    brand: str | None
    my_price: int
    in_stock: bool
    lowest_price: int  # cheapest in-stock competitor price (incl. me)
    rank: int  # my position by price among sellers of this product
    sellers: int
    is_cheapest: bool
    gap_toman: int  # how much more expensive than the cheapest (0 if cheapest)
    suggested_price: int | None  # beat the cheapest competitor by 1%
    clicks: int
    edited: bool  # price set in the panel (not crawled)


class DayCount(Schema):
    day: str
    clicks: int


class SellerDashboard(Schema):
    seller_id: str
    shop_name: str
    status: str
    trust: float | None
    listings: list[Listing]
    total_clicks: int
    clicks_7d: int = Field(alias="clicks7d")  # to_camel would give "clicks7D"
    cheapest_count: int
    daily: list[DayCount]


def apply_all_overrides(s: Session) -> int:
    rows = s.scalars(select(OfferOverride)).all()
    for r in rows:
        catalog.apply_override(r.seller_id, r.product_id, r.price_toman, r.in_stock)
    return len(rows)


def daily_clicks(s: Session, days: int = 14, seller_id: str | None = None) -> list[DayCount]:
    since = utcnow() - timedelta(days=days - 1)
    q = select(func.date(ClickOut.at), func.count()).where(ClickOut.at >= since.replace(hour=0, minute=0, second=0, microsecond=0))
    if seller_id:
        q = q.where(ClickOut.seller_id == seller_id)
    counts = {str(k): v for k, v in s.execute(q.group_by(func.date(ClickOut.at))).all()}
    return [DayCount(day=(d := (utcnow() - timedelta(days=i)).date().isoformat()), clicks=counts.get(d, 0)) for i in range(days - 1, -1, -1)]


def dashboard(s: Session, u: User) -> SellerDashboard:
    sid = u.seller_id or ""
    clicks_by_product = dict(s.execute(select(ClickOut.product_id, func.count()).where(ClickOut.seller_id == sid).group_by(ClickOut.product_id)).all())
    edited = set(s.scalars(select(OfferOverride.product_id).where(OfferOverride.seller_id == sid)).all())
    listings: list[Listing] = []
    for p in catalog.all():
        mine = next((o for o in p.offers if o.seller_id == sid), None)
        if not mine:
            continue
        live = [o for o in p.offers if o.in_stock] or p.offers
        lowest = min(o.price_toman for o in live)
        others = [o.price_toman for o in live if o.seller_id != sid]
        order = sorted(p.offers, key=lambda o: (not o.in_stock, o.price_toman))
        cheapest = mine.in_stock and mine.price_toman <= lowest
        listings.append(Listing(
            product_id=p.id, title=p.title, category=p.category, group=p.group, brand=p.brand,
            my_price=mine.price_toman, in_stock=mine.in_stock, lowest_price=lowest,
            rank=1 + next(i for i, o in enumerate(order) if o.seller_id == sid), sellers=len(p.offers),
            is_cheapest=cheapest, gap_toman=max(0, mine.price_toman - lowest),
            suggested_price=None if cheapest or not others else max(1000, round(min(others) * 0.99 / 1000) * 1000),
            clicks=clicks_by_product.get(p.id, 0), edited=p.id in edited,
        ))
    listings.sort(key=lambda x: (-x.clicks, x.title))
    week = utcnow() - timedelta(days=7)
    src = next((x for x in SOURCES if x.id == sid), None)
    return SellerDashboard(
        seller_id=sid, shop_name=u.shop_name or (src.name if src else "فروشگاه"), status=u.status, trust=src.trust if src else None,
        listings=listings, total_clicks=sum(clicks_by_product.values()),
        clicks_7d=s.scalar(select(func.count()).select_from(ClickOut).where(ClickOut.seller_id == sid, ClickOut.at >= week)) or 0,
        cheapest_count=sum(1 for x in listings if x.is_cheapest), daily=daily_clicks(s, 14, sid),
    )


def update_offer(s: Session, u: User, product_id: str, price_toman: int, in_stock: bool) -> None:
    if u.status != "active":
        raise DomainError("فروشگاه شما هنوز توسط ادمین تأیید نشده است")
    p = catalog.by_id(product_id)
    mine = next((o for o in p.offers if o.seller_id == u.seller_id), None) if p else None
    if not mine:
        raise DomainError("این کالا در فهرست فروشگاه شما نیست")
    # guard against typos (an extra zero) — a real market moves, but not 3x in one edit
    if not (p.avg_price * 0.3 <= price_toman <= p.avg_price * 3):
        raise DomainError("قیمت با قیمت بازار همخوانی ندارد؛ دوباره بررسی کنید")
    row = s.get(OfferOverride, (u.seller_id, product_id))
    if row:
        row.price_toman, row.in_stock, row.updated_at = price_toman, in_stock, utcnow()
    else:
        s.add(OfferOverride(seller_id=u.seller_id, product_id=product_id, price_toman=price_toman, in_stock=in_stock))
    s.commit()
    catalog.apply_override(u.seller_id, product_id, price_toman, in_stock)
