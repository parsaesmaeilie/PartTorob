"""QUERY UNDERSTANDING — Persian free text → structured intent.

Rule-based and instant. The AI assistant reuses the same structure, so LLM
and non-LLM paths share one ranking engine.
"""
import re
from typing import Literal

from app.core.schema import Schema
from app.core.text import normalize_text
from app.modules.catalog.taxonomy import BRANDS, CATEGORIES
from app.modules.vehicles import detect_vehicles

Priority = Literal["balanced", "cheap", "quality", "fast", "warranty"]
# each priority: trigger words (normalized text; آ→ا) — all matches stack, order = order of appearance
_PRIORITY_WORDS: dict[str, str] = {
    "cheap": r"ارزان|ارزون|اقتصادی|کم ?هزینه|مقرون|ارزونترین|ارزانترین",
    "quality": r"اصل|کیفیت|اورجینال|مطمئن|بهترین|حرفه ای|معتبر|درجه یک",
    "fast": r"فوری|امروز|سریع|فردا|زود|عجله|ارسال",
    "warranty": r"گارانتی|ضمانت|وارانتی",
}


class SearchIntent(Schema):
    raw: str
    categories: list[str]
    vehicle_ids: list[str]
    brand: str | None = None
    viscosity: str | None = None
    position: Literal["front", "rear"] | None = None
    max_price: int | None = None
    priority: Priority = "balanced"  # the first one the user mentioned (kept for simple consumers)
    priorities: list[Priority] = []  # every priority mentioned — weights stack
    terms: list[str] = []


_SYNONYMS = {"روغن ماشین": "engine-oil", "روغن موتور": "engine-oil", "ترمز": "brake-pad", "باطری": "battery", "تسمه": "timing-belt", "ابزار": "tool-set"}
_CAT_WORDS = sorted(
    [*((normalize_text(k), c.id) for c in CATEGORIES for k in c.keywords), *((normalize_text(k), v) for k, v in _SYNONYMS.items())],
    key=lambda x: -len(x[0]),
)
_STOP = {"برای", "من", "چه", "چی", "مناسب", "مناسبه", "میخوام", "می", "خوام", "یه", "یک", "با", "و", "به", "از", "که", "را", "رو", "ماشین", "ماشینم", "خودرو", "قیمت", "خرید", "بهترین"}
_PRICE = re.compile(r"(?:زیر|تا|کمتر از|حداکثر)\s?(\d+(?:\.\d+)?)\s?(میلیون|هزار|تومن|تومان)?")
_VISC = re.compile(r"(\d{1,2})\s?w\s?(\d{2})")


def _max_price(t: str) -> int | None:
    m = _PRICE.search(t)
    if not m:
        return None
    n = float(m.group(1))
    if m.group(2) == "میلیون":
        return int(n * 1_000_000)
    if m.group(2) == "هزار":
        return int(n * 1_000)
    return int(n * 1_000_000 if n < 1000 else n)


def parse_intent(query: str) -> SearchIntent:
    t = normalize_text(query)
    vehicle_ids, rest = detect_vehicles(t)

    categories: list[str] = []
    remaining = f" {rest} "
    for k, cid in _CAT_WORDS:
        if k in remaining:
            if cid not in categories:
                categories.append(cid)
            remaining = remaining.replace(k, " ", 1)
    brand = next((b.id for b in BRANDS.values() if any(normalize_text(f) in remaining for f in b.forms)), None)
    visc = _VISC.search(t)

    found = [(m.start(), p) for p, rx in _PRIORITY_WORDS.items() if (m := re.search(rx, t))]
    priorities: list[Priority] = [p for _, p in sorted(found)]  # type: ignore[misc]

    # spec / price phrases are structured now — drop them from free-text terms
    remaining = _PRICE.sub(" ", remaining)
    remaining = _VISC.sub(" ", remaining)
    for rx in _PRIORITY_WORDS.values():  # priority words are not product words
        remaining = re.sub(rx, " ", remaining)
    remaining = re.sub(r"جلو|عقب|خیلی|هم|باشه|باشد|داشته", " ", remaining)
    terms = [w for w in remaining.split() if w not in _STOP and len(w) > 1]

    return SearchIntent(
        raw=query,
        categories=categories,
        vehicle_ids=vehicle_ids,
        brand=brand,
        viscosity=f"{visc.group(1)}W{visc.group(2)}" if visc else None,
        position="front" if "جلو" in t else "rear" if "عقب" in t else None,
        max_price=_max_price(t),
        priority=priorities[0] if priorities else "balanced",
        priorities=priorities,
        terms=terms,
    )
