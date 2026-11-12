"""Search application service — used by the API, the garage and the AI assistant's tools."""
from app.core.schema import Schema
from app.modules.catalog.repository import catalog

from .intent import SearchIntent, parse_intent
from .ranker import RankedResult, Weight, describe_weights, price_trend, rank


class SearchResponse(Schema):
    intent: SearchIntent
    results: list[RankedResult]
    vehicle_id: str | None
    weights: list[Weight]


def search_products(query: str, *, vehicle_id: str | None = None, category: str | None = None,
                    hide_incompatible: bool = True, limit: int = 60) -> SearchResponse:
    intent = parse_intent(query)
    results = rank(catalog.all(), intent, vehicle_id=vehicle_id, category=category, hide_incompatible=hide_incompatible, limit=limit)
    return SearchResponse(
        intent=intent,
        results=results,
        vehicle_id=intent.vehicle_ids[0] if intent.vehicle_ids else vehicle_id,
        weights=describe_weights(intent.priority),
    )


__all__ = ["search_products", "parse_intent", "price_trend", "SearchResponse", "RankedResult", "SearchIntent"]
