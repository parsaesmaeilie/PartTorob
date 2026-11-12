"""Source adapters — one per shop.

To plug a real website in, write a class with `id`, `name`, `trust` and a
`fetch()` that crawls the site (or reads its feed) and returns RawListing[].
Nothing downstream changes.
"""
from datetime import datetime, timezone

from app.core.config import settings
from app.modules.ingestion.types import RawListing, SourceAdapter

from .market import SELLERS, SellerStyle, render_listings


class SimulatedShop:
    def __init__(self, style: SellerStyle):
        self.style = style
        self.id = style.id
        self.name = style.name
        self.trust = style.trust

    def fetch(self) -> list[RawListing]:
        now = datetime.now(timezone.utc).isoformat()
        return [
            RawListing(source_id=self.id, seller_name=self.name, url=f"{settings.storefront_base_url}/{self.id}/{row['external_id']}", crawled_at=now, **row)
            for row in render_listings(self.style)
        ]


SOURCES: list[SourceAdapter] = [SimulatedShop(s) for s in SELLERS]
