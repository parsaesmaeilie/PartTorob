"""Demo data — idempotent, deterministic (fixed RNG seed), runs on startup.

  • 3 fixed accounts (one per role) — the ones in the README
  • ~60 customers with garages and service history
  • a seller account for most crawled shops + newly registered shops (pending / blocked)
  • 30 days of click-outs, shaped like real traffic (weekly rhythm, growth,
    cheaper offers and popular categories get more clicks)
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import ClickOut, ServiceRecord, User, Vehicle
from app.modules.catalog.repository import catalog
from app.modules.garage import seed_demo_garage
from app.modules.ingestion.sources import SOURCES
from app.modules.vehicles import VEHICLE_MODELS

DEMO_USERS = [
    {"id": "u-admin", "phone": "09120000001", "name": "مدیر سامانه", "role": "admin"},
    {"id": "u-seller", "phone": "09120000002", "name": "علی رضایی", "role": "seller", "seller_id": "yadakpart", "shop_name": "یدک‌پارت",
     "shop_website": "https://yadakpart.example"},
    {"id": "u-customer", "phone": "09120000003", "name": "پارسا اسماعیلی", "role": "customer"},
]

FIRST = ["محمد", "علی", "حسین", "رضا", "مهدی", "امیر", "سارا", "مریم", "زهرا", "فاطمه", "نرگس", "نیلوفر", "کیان", "آرش", "بهاره",
         "سینا", "پریسا", "یاسمن", "مهسا", "پویا", "هومن", "شیما", "الهام", "میلاد", "نازنین", "امید", "فرهاد", "لیلا", "ساناز", "بردیا"]
LAST = ["محمدی", "حسینی", "احمدی", "کریمی", "رضایی", "موسوی", "جعفری", "صادقی", "رحیمی", "نوری", "عباسی", "قاسمی", "مرادی", "کاظمی",
        "اکبری", "ملکی", "شریفی", "یوسفی", "حیدری", "طاهری", "زارعی", "فرهادی", "نجفی", "سلطانی", "بهرامی"]
PREFIX = ["0912", "0935", "0919", "0901", "0936", "0921", "0910"]
COLORS = ["#94a3b8", "#f1f5f9", "#111827", "#e3262f", "#1e3a8a", "#0f766e", "#f59e0b", "#6b7280"]
# how common each car is on Iranian roads (drives garages and click mix)
CAR_WEIGHTS = {"peugeot-206-t5": 14, "peugeot-206-t2": 8, "peugeot-pars": 12, "samand-lx": 10, "dena-plus": 8, "pride-131": 12,
               "haima-s7": 4, "zamyad-capra": 3, "toyota-86": 1}
CATEGORY_POPULARITY = {"engine-oil": 10, "brake-pad": 9, "oil-filter": 6, "battery": 5, "air-filter": 4, "spark-plug": 4, "brake-disc": 3,
                       "shock-absorber": 3, "timing-belt": 3, "coolant": 2, "cabin-filter": 2}


def _uid(p: str) -> str:
    return p + uuid.uuid4().hex[:10]


def _phone(r: random.Random, used: set[str]) -> str:
    while True:
        p = r.choice(PREFIX) + f"{r.randrange(10**7):07d}"
        if p not in used and not p.startswith("0912000"):
            used.add(p)
            return p


def seed_demo_users(s: Session) -> None:
    for d in DEMO_USERS:
        if s.query(User.id).filter(User.phone == d["phone"]).first():
            continue
        u = User(status="active", **d)
        s.add(u)
        s.flush()
        if d["role"] == "customer":
            seed_demo_garage(s, u)
    # backfill: shop owners created before the website field existed (".example" = reserved demo domain)
    for u in s.scalars(select(User).where(User.role == "seller", User.shop_website.is_(None))).all():
        slug = u.seller_id if u.seller_id and not u.seller_id.startswith("shop-") else u.id.removeprefix("u-s-")
        u.shop_website = f"https://{slug}.example"
    s.commit()


def seed_population(s: Session) -> None:
    """Fills the marketplace with people. Skips itself once it has run."""
    if (s.scalar(select(func.count()).select_from(User)) or 0) >= 20:
        return
    r = random.Random(1405)
    now = datetime.now(timezone.utc)
    used = set(s.scalars(select(User.phone)).all())
    models = [m.id for m in VEHICLE_MODELS]
    weights = [CAR_WEIGHTS.get(m, 1) for m in models]

    # ── customers with garages
    for i in range(60):
        joined = now - timedelta(days=r.randint(0, 120), hours=r.randint(0, 23))
        u = User(id=f"u-c{i:03d}", name=f"{r.choice(FIRST)} {r.choice(LAST)}", phone=_phone(r, used), role="customer",
                 status="blocked" if i in (17, 44) else "active", created_at=joined, last_login_at=now - timedelta(days=r.randint(0, 20)))
        s.add(u)
        s.flush()
        cars = r.choices([0, 1, 2, 3], weights=[2, 8, 4, 1])[0]
        for _ in range(cars):
            pick = r.choices(models, weights)[0]
            model = next(m for m in VEHICLE_MODELS if m.id == pick)
            km = r.randint(8_000, 220_000)
            v = Vehicle(id=_uid("v"), user_id=u.id, model_id=model.id, year=r.randint(model.years[0], model.years[1]), odometer_km=km,
                        color=r.choice(COLORS), added_at=joined)
            s.add(v)
            s.flush()
            u.active_vehicle_id = u.active_vehicle_id or v.id
            for rule in r.sample(model.maintenance, k=r.randint(1, 4)):
                done_km = max(0, km - r.randint(500, int(rule.km * 1.3)))
                s.add(ServiceRecord(id=_uid("s"), user_id=u.id, vehicle_id=v.id, service_id=rule.service_id, km=done_km,
                                    date=now - timedelta(days=r.randint(5, rule.months * 34)), cost=r.randint(3, 60) * 100_000))

    # ── sellers: most crawled shops are claimed by their owner
    for i, src in enumerate(SOURCES):
        if src.id == "yadakpart" or i % 5 == 4:  # yadakpart is the README account; leave a few unclaimed
            continue
        s.add(User(id=f"u-s-{src.id}", name=f"{r.choice(FIRST)} {r.choice(LAST)}", phone=_phone(r, used), role="seller", status="active",
                   seller_id=src.id, shop_name=src.name, shop_website=f"https://{src.id}.example", created_at=now - timedelta(days=r.randint(60, 300))))
    # ── shops that just signed up (the admin's approval queue) + one blocked shop
    for j, (shop, status) in enumerate([("قطعه‌سرای البرز", "pending"), ("یدکی نوین شیراز", "pending"), ("لوازم یدکی امید", "pending"), ("فروشگاه اسپید", "blocked")]):
        s.add(User(id=f"u-s-new{j}", name=f"{r.choice(FIRST)} {r.choice(LAST)}", phone=_phone(r, used), role="seller", status=status,
                   seller_id=f"shop-new{j}", shop_name=shop, shop_website=f"https://shop-new{j}.example", created_at=now - timedelta(days=r.randint(0, 6), hours=r.randint(1, 20))))
    s.commit()
    seed_clickouts(s, r, now)


def seed_clickouts(s: Session, r: random.Random, now: datetime, days: int = 30) -> None:
    """Realistic click-out history: growth trend, Friday dip, cheapest offer wins most clicks."""
    if (s.scalar(select(func.count()).select_from(ClickOut)) or 0) > 100:
        return
    customers = s.scalars(select(User.id).where(User.role == "customer")).all()
    products = catalog.all()
    pweights = [CATEGORY_POPULARITY.get(p.category, 1) * (1 + len(p.offers) / 5) for p in products]
    rows: list[ClickOut] = []
    for d in range(days, -1, -1):
        day = now - timedelta(days=d)
        growth = 0.55 + 0.45 * (1 - d / days)  # the product is growing
        friday = 0.6 if day.weekday() == 4 else 1.0  # Iranian weekend
        n = int(r.gauss(95, 12) * growth * friday) if d else int(r.gauss(95, 12) * growth * min(1, now.hour / 24 + 0.15))
        for _ in range(max(0, n)):
            p = r.choices(products, pweights)[0]
            live = sorted((o for o in p.offers if o.in_stock), key=lambda o: o.price_toman) or p.offers
            # rank 1 gets ~half the clicks; trust nudges the rest
            o = r.choices(live, [(0.5 ** i) * (0.6 + x.seller_trust) for i, x in enumerate(live)])[0]
            at = day.replace(hour=r.choices(range(24), [1, 1, 1, 1, 1, 1, 2, 3, 5, 7, 8, 8, 7, 6, 6, 7, 8, 9, 10, 11, 10, 8, 5, 3])[0], minute=r.randint(0, 59))
            if at > now:
                at = now - timedelta(minutes=r.randint(1, 90))
            rows.append(ClickOut(user_id=r.choice(customers), product_id=p.id, seller_id=o.seller_id, price_toman=o.price_toman,
                                 source=r.choices(["product-offers", "product-buybox", "garage", "compare", "assistant"], [5, 6, 2, 1, 1])[0], at=at))
    s.add_all(rows)
    s.commit()
