"""INGESTION PIPELINE  (crawl → normalize → match → publish)

    SourceAdapter[] ─fetch─▶ RawListing[] ─normalize─▶ NormalizedListing[]
        ─cluster by product_key─▶ Product + Offer[] ─▶ CatalogRepository

In production each stage is a queue worker (crawl jobs scheduled per source,
normalized rows in Postgres, the matcher upserts products and refreshes the
search index). Here it runs in-process on startup.
"""
import hashlib
import math
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

from app.core.text import seeded_random
from app.modules.catalog.models import Attributes, Fitment, Offer, PricePoint, Product
from app.modules.catalog.taxonomy import BRANDS, CATEGORY_BY_ID
from app.modules.vehicles import platform_display, platform_vehicle_ids

from .normalize import normalize_listing, product_key
from .sources import SOURCES
from .types import IngestionReport, NormalizedListing, Rejected, Sample, SourceStat

POS_FA = {"front": "جلو", "rear": "عقب"}


def _id(key: str) -> str:
    return "p" + hashlib.sha1(key.encode()).hexdigest()[:8]


def build_title(n: NormalizedListing) -> str:
    parts = [
        CATEGORY_BY_ID[n.category].title,
        POS_FA.get(n.position or "", ""),
        BRANDS[n.brand].name if n.brand else "",
        n.line or "",
        n.viscosity or "",
        n.plug_code or "",
    ]
    if n.ampere:
        parts.append(f"{n.ampere} آمپر")
    if n.volume_l:
        parts.append("نیم لیتری" if n.volume_l < 1 else f"{n.volume_l:g} لیتری")
    if n.platforms:
        parts.append("مناسب " + " و ".join(platform_display(p) for p in n.platforms))
    return " ".join(p for p in parts if p)


def synthesize_history(pid: str, current: int, days: int = 120) -> list[PricePoint]:
    """Daily min-price history anchored to today's real min price (Iranian market: mostly up)."""
    r = seeded_random(f"hist:{pid}")
    drift = 0.25 + r.random() * 0.2
    today = date.today()
    out = []
    for d in range(days, -1, -1):
        t = d / days
        wave = math.sin((d + r.random() * 3) / 9) * 0.025
        noise = 1 if d == 0 else 1 + (r.random() - 0.5) * 0.02
        price = current * (1 - drift * t + wave) * noise
        out.append(PricePoint(date=(today - timedelta(days=d)).isoformat(), price=round(price / 1000) * 1000))
    out[-1].price = current
    return out


def run_ingestion() -> tuple[list[Product], IngestionReport]:
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as pool:  # crawls are I/O bound
        fetched = list(zip(SOURCES, pool.map(lambda s: s.fetch(), SOURCES)))

    normalized: list[NormalizedListing] = []
    rejected: list[Rejected] = []
    for _, rows in fetched:
        for raw in rows:
            n = normalize_listing(raw)
            if isinstance(n, str):
                rejected.append(Rejected(raw=raw, reason=n))
            else:
                normalized.append(n)

    # MATCH: cluster by fingerprint (insertion-ordered dict keeps output stable)
    clusters: dict[str, list[NormalizedListing]] = {}
    for n in normalized:
        clusters.setdefault(product_key(n), []).append(n)

    trust = {s.id: s.trust for s in SOURCES}
    products: list[Product] = []
    samples: list[Sample] = []
    for key, rows in clusters.items():
        head = rows[0]
        pid = _id(key)
        offers = sorted(
            (
                Offer(
                    seller_id=n.raw.source_id, seller_name=n.raw.seller_name, seller_trust=trust.get(n.raw.source_id, 0.5),
                    price_toman=n.price_toman, in_stock=n.in_stock, warranty_months=n.warranty_months,
                    shipping_days=n.shipping_days, is_original=n.is_original, url=n.raw.url, raw_title=n.raw.title,
                )
                for n in rows
            ),
            key=lambda o: o.price_toman,
        )
        available = [o for o in offers if o.in_stock] or offers
        min_price = min(o.price_toman for o in available)
        product = Product(
            id=pid,
            key=key,
            title=build_title(head),
            category=head.category,
            group=CATEGORY_BY_ID[head.category].group,
            brand=head.brand,
            brand_name=BRANDS[head.brand].name if head.brand else "متفرقه",
            brand_tier=BRANDS[head.brand].tier if head.brand else 0.4,
            attributes=Attributes(position=head.position, viscosity=head.viscosity, volume_l=head.volume_l, ampere=head.ampere, plug_code=head.plug_code, line=head.line),
            fitment=Fitment(platforms=head.platforms, vehicle_ids=platform_vehicle_ids(head.platforms)),
            offers=offers,
            min_price=min_price,
            avg_price=round(sum(o.price_toman for o in offers) / len(offers)),
            price_history=synthesize_history(pid, min_price),
            confidence=min(r.confidence for r in rows),
        )
        products.append(product)
        if len(samples) < 8 and len(rows) > 1:
            samples.append(Sample(before=rows[1].raw.title, after=product.title, product_id=pid))

    report = IngestionReport(
        ran_at=datetime.now(timezone.utc).isoformat(),
        sources=[SourceStat(id=s.id, name=s.name, fetched=len(rows)) for s, rows in fetched],
        raw_count=sum(len(rows) for _, rows in fetched),
        normalized_count=len(normalized),
        rejected=rejected,
        product_count=len(products),
        low_confidence=sum(1 for p in products if p.confidence < 0.7),
        duration_ms=round((time.perf_counter() - t0) * 1000),
        samples=samples,
    )
    return products, report
