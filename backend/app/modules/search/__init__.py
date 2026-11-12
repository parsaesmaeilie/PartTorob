"""Search application service — used by the API, the garage and the AI assistant's tools."""
from collections import Counter

from app.core.schema import Schema
from app.modules.catalog.repository import catalog
from app.modules.catalog.taxonomy import BRANDS

from .intent import SearchIntent, parse_intent
from .ranker import RankedResult, Weight, describe_weights, price_trend, rank


class BrandFacet(Schema):
    id: str
    name: str
    count: int


class SearchResponse(Schema):
    intent: SearchIntent
    results: list[RankedResult]
    vehicle_id: str | None
    weights: list[Weight]
    brand: str | None = None  # active brand filter
    brand_facets: list[BrandFacet] = []  # brands in the result set (before the brand filter), with counts


def search_products(query: str, *, vehicle_id: str | None = None, category: str | None = None, brand: str | None = None,
                    hide_incompatible: bool = True, limit: int = 60) -> SearchResponse:
    intent = parse_intent(query)
    # rank the whole matching set once: facets must count *all* matches, not just the first page
    ranked = rank(catalog.all(), intent, vehicle_id=vehicle_id, category=category, hide_incompatible=hide_incompatible, limit=10_000)
    counts = Counter(r.product.brand for r in ranked if r.product.brand)
    facets = [BrandFacet(id=b, name=BRANDS[b].name, count=n) for b, n in counts.most_common()]
    if brand:
        ranked = [r for r in ranked if r.product.brand == brand]
    return SearchResponse(
        intent=intent,
        results=ranked[:limit],
        vehicle_id=intent.vehicle_ids[0] if intent.vehicle_ids else vehicle_id,
        weights=describe_weights(intent.priorities or [intent.priority]),
        brand=brand,
        brand_facets=facets,
    )


__all__ = ["search_products", "parse_intent", "price_trend", "SearchResponse", "RankedResult", "SearchIntent", "BrandFacet"]
