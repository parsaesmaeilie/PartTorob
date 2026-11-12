from typing import Literal

from app.core.schema import Schema


class Offer(Schema):
    seller_id: str
    seller_name: str
    seller_trust: float
    price_toman: int
    in_stock: bool
    warranty_months: int
    shipping_days: int
    is_original: bool
    url: str
    raw_title: str  # kept for transparency: what the shop actually wrote


class Attributes(Schema):
    position: Literal["front", "rear"] | None = None
    viscosity: str | None = None
    volume_l: float | None = None
    ampere: int | None = None
    plug_code: str | None = None
    line: str | None = None


class Fitment(Schema):
    platforms: list[str]
    vehicle_ids: list[str]


class PricePoint(Schema):
    date: str
    price: int


class Product(Schema):
    id: str
    key: str
    title: str
    category: str
    group: str
    brand: str | None
    brand_name: str
    brand_tier: float
    attributes: Attributes
    fitment: Fitment
    offers: list[Offer]
    min_price: int
    avg_price: int
    price_history: list[PricePoint]
    confidence: float
