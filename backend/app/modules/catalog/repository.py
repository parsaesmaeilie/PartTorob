"""CatalogRepository — read model for products/offers.

Port: the Protocol. Adapter: an in-memory index filled by the ingestion
pipeline. Swap for Postgres + OpenSearch without touching services or API.
"""
import threading
from typing import Protocol

from app.modules.ingestion.pipeline import run_ingestion
from app.modules.ingestion.types import IngestionReport

from .models import Product


class CatalogRepository(Protocol):
    def all(self) -> list[Product]: ...
    def by_id(self, id: str) -> Product | None: ...
    def by_ids(self, ids: list[str]) -> list[Product]: ...
    def report(self) -> IngestionReport: ...
    def reindex(self) -> IngestionReport: ...
    def apply_override(self, seller_id: str, product_id: str, price_toman: int, in_stock: bool) -> bool: ...


class InMemoryCatalog:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._products: list[Product] = []
        self._by_id: dict[str, Product] = {}
        self._report: IngestionReport | None = None

    def reindex(self) -> IngestionReport:
        products, report = run_ingestion()
        with self._lock:  # atomic swap — readers never see a half-built index
            self._products, self._by_id, self._report = products, {p.id: p for p in products}, report
        return report

    def apply_override(self, seller_id: str, product_id: str, price_toman: int, in_stock: bool) -> bool:
        with self._lock:
            p = self._by_id.get(product_id)
            o = next((x for x in p.offers if x.seller_id == seller_id), None) if p else None
            if not o:
                return False
            o.price_toman, o.in_stock = price_toman, in_stock
            p.offers.sort(key=lambda x: x.price_toman)
            live = [x for x in p.offers if x.in_stock] or p.offers
            p.min_price = min(x.price_toman for x in live)
            p.avg_price = round(sum(x.price_toman for x in p.offers) / len(p.offers))
            p.price_history[-1].price = p.min_price  # today's point follows the live price
            return True

    def _ensure(self) -> None:
        if self._report is None:
            self.reindex()

    def all(self) -> list[Product]:
        self._ensure()
        return self._products

    def by_id(self, id: str) -> Product | None:
        self._ensure()
        return self._by_id.get(id)

    def by_ids(self, ids: list[str]) -> list[Product]:
        self._ensure()
        return [self._by_id[i] for i in ids if i in self._by_id]

    def report(self) -> IngestionReport:
        self._ensure()
        assert self._report
        return self._report


catalog: CatalogRepository = InMemoryCatalog()
