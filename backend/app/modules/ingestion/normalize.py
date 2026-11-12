"""NORMALIZER — one messy RawListing → one structured NormalizedListing.

Pure functions, no I/O → trivially unit-testable, and the natural place to
add an LLM extractor for the long tail (low-confidence rows).
"""
import re

from app.core.text import normalize_text, to_latin_digits
from app.modules.catalog.taxonomy import BRANDS, CATEGORIES, CATEGORY_BY_ID
from app.modules.vehicles import detect_vehicles, get_vehicle_model

from .types import NormalizedListing, RawListing

_CATEGORY_KEYWORDS = sorted(((normalize_text(k), c.id) for c in CATEGORIES for k in c.keywords), key=lambda x: -len(x[0]))
_BRAND_FORMS = sorted(((normalize_text(f), b.id) for b in BRANDS.values() for f in b.forms), key=lambda x: -len(x[0]))
# product-line lexicon: canonical → tolerant regex (optional spaces)
_LINES = [
    (canon, re.compile(r"\s?".join(map(re.escape, normalize_text(canon).split(" ")))))
    for canon in ["سوپر پیشتاز", "پیشتاز", "رانا", "quartz 7000", "quartz 9000", "magnatec", "edge", "16000", "dot4", "94 پارچه", "46 پارچه", "سوسماری 2 تن", "گلد کلاس", "فندکی"]
]

_VISC = re.compile(r"(\d{1,2})\s?w\s?(\d{2})")
_VOL = re.compile(r"(\d+(?:\.\d+)?)\s?(?:لیتری|لیتر|l\b)")
_AMP = re.compile(r"(\d{2,3})\s?(?:امپر|ah)")  # normalize_text maps آ→ا
_PLUG = re.compile(r"\b(bkr6e|fr7|ilzkr7b)\b")


def parse_price(text: str) -> int | None:
    t = re.sub(r"[,٬،\s]", "", to_latin_digits(text))
    m = re.search(r"(\d{4,})", t)
    if not m:
        return None
    n = int(m.group(1))
    return round(n / 10) if re.search(r"ریال|rial", text, re.I) else n


def _warranty(text: str | None) -> int:
    m = re.search(r"(\d+)\s*ماه", to_latin_digits(text or ""))
    return int(m.group(1)) if m else 0


def _shipping(text: str | None) -> int:
    if not text:
        return 5
    if re.search(r"امروز|فوری", text):
        return 0
    m = re.search(r"(\d+)", to_latin_digits(text))
    return int(m.group(1)) if m else 5


def normalize_listing(raw: RawListing) -> NormalizedListing | str:
    """Returns a NormalizedListing, or a rejection reason (str)."""
    text = normalize_text(raw.title)

    # 1) category — longest keyword wins ("روغن ترمز" beats "روغن")
    cat_id = next((cid for k, cid in _CATEGORY_KEYWORDS if k in text), None)
    if not cat_id:
        return "دسته‌بندی تشخیص داده نشد"
    category = CATEGORY_BY_ID[cat_id]
    price = parse_price(raw.price_text)
    if not price:
        return "قیمت نامعتبر"

    # 2) brand first and strip it ("پارس لنت" is a brand, "پارس" alone is a car)
    hit = next(((f, bid) for f, bid in _BRAND_FORMS if f in text), None)
    brand = hit[1] if hit else None
    without_brand = text.replace(hit[0], " ", 1) if hit else text

    # 3) vehicles — strip them so "206" isn't read as a spec
    vehicle_ids, rest = detect_vehicles(without_brand)
    platforms = sorted({get_vehicle_model(v).platform for v in vehicle_ids})

    # 4) attributes
    line = next((canon for canon, rx in _LINES if rx.search(rest)), None)
    visc, vol, amp, plug = _VISC.search(rest), _VOL.search(rest), _AMP.search(rest), _PLUG.search(rest)

    # 5) confidence — penalize missing fields the category needs
    confidence = 1.0
    if not brand:
        confidence -= 0.35
    if category.fitment == "explicit" and not platforms:
        confidence -= 0.4
    if category.fitment == "oil-spec" and not visc:
        confidence -= 0.4

    return NormalizedListing(
        raw=raw,
        category=category.id,
        brand=brand,
        line=line,
        position="front" if "جلو" in rest else "rear" if "عقب" in rest else None,
        viscosity=f"{visc.group(1)}W{visc.group(2)}" if visc else None,
        volume_l=0.5 if "نیم لیتر" in rest else float(vol.group(1)) if vol else None,
        ampere=int(amp.group(1)) if amp else None,
        plug_code=plug.group(1).upper() if plug else None,
        platforms=platforms,
        vehicle_ids=vehicle_ids,
        is_original=bool(re.search(r"اصل|اورجینال|original", text)),
        price_toman=price,
        in_stock=not re.search(r"ناموجود|تماس", raw.stock_text),
        warranty_months=_warranty(raw.warranty_text),
        shipping_days=_shipping(raw.shipping_text),
        confidence=max(0.0, confidence),
    )


def product_key(n: NormalizedListing) -> str:
    """Deterministic fingerprint — listings with the same key are the same product."""

    def s(v):
        return "" if v is None else (f"{v:g}" if isinstance(v, float) else str(v))

    return "|".join([n.category, n.brand or "?", s(n.line), s(n.position), s(n.viscosity), s(n.volume_l), s(n.ampere), s(n.plug_code), "+".join(n.platforms)])
