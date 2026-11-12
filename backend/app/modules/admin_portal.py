"""ADMIN PORTAL — platform health: users, shops, click-outs (revenue), data quality."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.schema import Schema
from app.db import ClickOut, User, Vehicle
from app.modules.auth import revoke_all
from app.modules.catalog.repository import catalog
from app.modules.garage import DomainError
from app.modules.ingestion.sources import SOURCES
from app.modules.seller_portal import DayCount, daily_clicks


class ShopRow(Schema):
    seller_id: str
    name: str
    source: str  # crawled | registered
    trust: float | None
    listings: int
    clicks: int
    owner_id: str | None
    owner_name: str | None
    owner_phone: str | None
    status: str  # active | pending | blocked | unclaimed


class TopProduct(Schema):
    product_id: str
    title: str
    clicks: int


class UserRow(Schema):
    id: str
    name: str
    phone: str
    role: str
    status: str
    shop_name: str | None
    vehicles: int
    created_at: str


class AdminOverview(Schema):
    users_by_role: dict[str, int]
    pending_sellers: int
    products: int
    offers: int
    total_clicks: int
    daily: list[DayCount]
    top_products: list[TopProduct]
    shops: list[ShopRow]
    users: list[UserRow]
    raw_listings: int
    rejected_listings: int
    low_confidence: int
    last_crawl: str


def overview(s: Session) -> AdminOverview:
    products = catalog.all()
    clicks_by_seller = dict(s.execute(select(ClickOut.seller_id, func.count()).group_by(ClickOut.seller_id)).all())
    listings_by_seller: dict[str, int] = {}
    for p in products:
        for o in p.offers:
            listings_by_seller[o.seller_id] = listings_by_seller.get(o.seller_id, 0) + 1
    owners = {u.seller_id: u for u in s.scalars(select(User).where(User.role == "seller")).all()}

    shops = [
        ShopRow(seller_id=src.id, name=src.name, source="crawled", trust=src.trust, listings=listings_by_seller.get(src.id, 0),
                clicks=clicks_by_seller.get(src.id, 0), owner_id=(o := owners.get(src.id)) and o.id, owner_name=o and o.name,
                owner_phone=o and o.phone, status=o.status if o else "unclaimed")
        for src in SOURCES
    ]
    crawled = {x.id for x in SOURCES}
    shops += [
        ShopRow(seller_id=sid, name=u.shop_name or "فروشگاه", source="registered", trust=None, listings=listings_by_seller.get(sid, 0),
                clicks=clicks_by_seller.get(sid, 0), owner_id=u.id, owner_name=u.name, owner_phone=u.phone, status=u.status)
        for sid, u in owners.items() if sid not in crawled
    ]

    top = s.execute(select(ClickOut.product_id, func.count().label("n")).group_by(ClickOut.product_id).order_by(func.count().desc()).limit(5)).all()
    vehicles = dict(s.execute(select(Vehicle.user_id, func.count()).group_by(Vehicle.user_id)).all())
    users = s.scalars(select(User).order_by(User.created_at.desc()).limit(50)).all()
    report = catalog.report()
    return AdminOverview(
        users_by_role=dict(s.execute(select(User.role, func.count()).group_by(User.role)).all()),
        pending_sellers=s.scalar(select(func.count()).select_from(User).where(User.role == "seller", User.status == "pending")) or 0,
        products=len(products), offers=sum(len(p.offers) for p in products),
        total_clicks=sum(clicks_by_seller.values()), daily=daily_clicks(s, 14),
        top_products=[TopProduct(product_id=pid, title=(p.title if (p := catalog.by_id(pid)) else pid), clicks=n) for pid, n in top],
        shops=sorted(shops, key=lambda x: (x.status != "pending", -x.clicks)),
        users=[UserRow(id=u.id, name=u.name, phone=u.phone, role=u.role, status=u.status, shop_name=u.shop_name,
                       vehicles=vehicles.get(u.id, 0), created_at=u.created_at.isoformat()) for u in users],
        raw_listings=report.raw_count, rejected_listings=len(report.rejected), low_confidence=report.low_confidence, last_crawl=report.ran_at,
    )


def set_status(s: Session, admin: User, user_id: str, status: str) -> None:
    u = s.get(User, user_id)
    if not u:
        raise DomainError("کاربر یافت نشد")
    if u.id == admin.id or u.role == "admin":
        raise DomainError("وضعیت ادمین را نمی‌توان تغییر داد")
    u.status = status
    if status == "blocked":
        revoke_all(s, u.id)  # kicks the user out immediately
    s.commit()
