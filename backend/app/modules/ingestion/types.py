from typing import Literal, Protocol

from app.core.schema import Schema


class RawListing(Schema):
    """What a crawler/source adapter returns — untyped strings, as on the web."""

    source_id: str
    seller_name: str
    external_id: str
    url: str
    title: str
    price_text: str
    stock_text: str
    warranty_text: str | None = None
    shipping_text: str | None = None
    crawled_at: str


class SourceAdapter(Protocol):
    """Port every crawler / feed / seller-API integration implements."""

    id: str
    name: str
    trust: float  # 0..1 — reviews, return rate, delivery SLA

    def fetch(self) -> list[RawListing]: ...


class NormalizedListing(Schema):
    raw: RawListing
    category: str
    brand: str | None = None
    line: str | None = None
    position: Literal["front", "rear"] | None = None
    viscosity: str | None = None
    volume_l: float | None = None
    ampere: int | None = None
    plug_code: str | None = None
    platforms: list[str]
    vehicle_ids: list[str]
    is_original: bool
    price_toman: int
    in_stock: bool
    warranty_months: int
    shipping_days: int
    confidence: float  # drives the "needs review" queue


class Rejected(Schema):
    raw: RawListing
    reason: str


class SourceStat(Schema):
    id: str
    name: str
    fetched: int


class Sample(Schema):
    before: str
    after: str
    product_id: str


class IngestionReport(Schema):
    ran_at: str
    sources: list[SourceStat]
    raw_count: int
    normalized_count: int
    rejected: list[Rejected]
    product_count: int
    low_confidence: int
    duration_ms: int
    samples: list[Sample]
