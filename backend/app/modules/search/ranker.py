"""RANKING ENGINE — "rank by user intent, explain the best choice".

    score = Σ wᵢ · featureᵢ      (every feature normalized to 0..1)

Weights shift with the parsed intent (cheap / quality / fast). Every result
carries a human-readable explanation built from the features that actually
moved its score — no black box.
"""
from app.core.schema import Schema
from app.core.text import normalize_text, to_persian_digits
from app.modules.catalog.models import Offer, Product
from app.modules.catalog.taxonomy import GROUP_BY_ID
from app.modules.compatibility import FitResult, check_fitment

from .intent import Priority, SearchIntent

FEATURES = ["relevance", "fitment", "price", "quality", "trust", "availability", "warranty", "speed"]
FEATURE_FA = {"relevance": "ارتباط با جست‌وجو", "fitment": "سازگاری با خودرو", "price": "قیمت", "quality": "کیفیت برند", "trust": "اعتبار فروشنده", "availability": "موجودی", "warranty": "گارانتی", "speed": "سرعت ارسال"}
_BASE = {"relevance": 0.28, "fitment": 0.24, "price": 0.16, "quality": 0.12, "trust": 0.08, "availability": 0.06, "warranty": 0.03, "speed": 0.03}
# additive boosts per priority; several priorities stack, then everything is re-normalized to 100%
_BOOST: dict[str, dict[str, float]] = {
    "balanced": {},
    "cheap": {"price": 0.22},
    "quality": {"quality": 0.16, "trust": 0.05, "warranty": 0.03},
    "fast": {"speed": 0.18, "availability": 0.06},
    "warranty": {"warranty": 0.16, "trust": 0.03},
}


class Weight(Schema):
    key: str
    label: str
    weight: float


class RankedResult(Schema):
    product: Product
    score: float
    fit: FitResult
    best_offer: Offer
    reasons: list[str]
    breakdown: dict[str, float]
    saving_vs_avg: float


def weights_for(priorities: list[str] | str) -> dict[str, float]:
    ps = [priorities] if isinstance(priorities, str) else priorities
    w = dict(_BASE)
    for p in ps:
        for k, v in _BOOST.get(p, {}).items():
            w[k] += v
    total = sum(w.values())
    return {k: v / total for k, v in w.items()}


def describe_weights(priorities: list[str] | str) -> list[Weight]:
    w = weights_for(priorities)
    return [Weight(key=k, label=FEATURE_FA[k], weight=w[k]) for k in FEATURES]


def price_trend(p: Product) -> float:
    """Relative change of min price over the last 30 days."""
    h = p.price_history
    then = h[max(0, len(h) - 31)].price
    return (h[-1].price - then) / then


def best_offer(p: Product, priority: Priority | list[str]) -> Offer:
    ps = [priority] if isinstance(priority, str) else priority
    prices = [o.price_toman for o in p.offers]
    lo, hi = min(prices), max(prices)
    wp = 0.5 + (0.2 if "cheap" in ps else 0) - (0.2 if "quality" in ps else 0)
    ws = 0.4 if "fast" in ps else 0.1
    ww = 0.3 if "warranty" in ps else 0.0

    def score(o: Offer) -> float:
        price = 1 if hi == lo else 1 - (o.price_toman - lo) / (hi - lo)
        speed = 1 - min(o.shipping_days, 6) / 6
        return (1 if o.in_stock else -2) + wp * price + (1 - wp) * o.seller_trust + ws * speed + ww * min(1, o.warranty_months / 18) + (0.1 if o.is_original else 0)

    return max(p.offers, key=score)


def _relevance(p: Product, intent: SearchIntent, cats: list[str]) -> float:
    r = (1.0 if p.category in cats else 0.0) if cats else 0.3
    if intent.brand:
        r *= 1.15 if p.brand == intent.brand else 0.8
    if intent.terms:
        t = normalize_text(f"{p.title} {p.brand_name} {p.attributes.line or ''}")
        hit = sum(1 for w in intent.terms if w in t) / len(intent.terms)
        r = r * (0.85 + 0.15 * hit) if cats else max(r, hit)
    return min(1.0, r)


def _explain(p: Product, f: dict[str, float], fit: FitResult, o: Offer, saving: float, priorities: list[str]) -> list[str]:
    fa = to_persian_digits
    r: list[str] = []
    if fit.status == "fits":
        r.append(f"✓ {fit.reason}")
    if saving > 0.03:
        r.append(f"{fa(round(saving * 100))}٪ ارزان‌تر از میانگین {fa(len(p.offers))} فروشنده")
    if f["quality"] > 0.8:
        r.append(f"برند معتبر {p.brand_name}")
    if o.seller_trust >= 0.9:
        r.append(f"فروشنده خوش‌سابقه ({o.seller_name})")
    if o.warranty_months:
        r.append(f"{fa(o.warranty_months)} ماه گارانتی")
    if o.shipping_days <= 1:
        r.append("ارسال امروز" if o.shipping_days == 0 else "ارسال فردا")
    trend = price_trend(p)
    if trend < -0.03:
        r.append(f"قیمت در ۳۰ روز اخیر {fa(round(-trend * 100))}٪ کاهش یافته")
    if "cheap" in priorities and f["price"] > 0.9:
        r.insert(0, "ارزان‌ترین گزینه سازگار")
    return r[:4]


def rank(products: list[Product], intent: SearchIntent, *, vehicle_id: str | None = None, category: str | None = None,
         hide_incompatible: bool = True, limit: int = 60) -> list[RankedResult]:
    vehicle_id = intent.vehicle_ids[0] if intent.vehicle_ids else vehicle_id
    prios = intent.priorities or [intent.priority]
    w = weights_for(prios)
    cats = (GROUP_BY_ID[category].children if category in GROUP_BY_ID else [category]) if category else intent.categories
    pool = [p for p in products if p.category in cats] if cats else products

    candidates = []
    for p in pool:
        fit = check_fitment(p, vehicle_id)
        offer = best_offer(p, prios)
        rel = _relevance(p, intent, cats)
        if rel <= 0.05:
            continue
        if hide_incompatible and vehicle_id and fit.status == "no-fit":
            continue
        if intent.max_price and offer.price_toman > intent.max_price:
            continue
        # explicit specs in the query are hard constraints
        if intent.viscosity and p.attributes.viscosity and p.attributes.viscosity != intent.viscosity:
            continue
        if intent.position and p.attributes.position and p.attributes.position != intent.position:
            continue
        candidates.append((p, fit, offer, rel))

    # price normalized per category so oil vs. pads stay comparable
    ranges: dict[str, tuple[int, int]] = {}
    for p, _, o, _ in candidates:
        lo, hi = ranges.get(p.category, (o.price_toman, o.price_toman))
        ranges[p.category] = (min(lo, o.price_toman), max(hi, o.price_toman))

    results = []
    for p, fit, o, rel in candidates:
        lo, hi = ranges[p.category]
        f = {
            "relevance": rel,
            "fitment": {"fits": 1.0, "universal": 0.75, "unknown": 0.4}.get(fit.status, 0.0),
            "price": 0.8 if hi == lo else 1 - (o.price_toman - lo) / (hi - lo),
            "quality": 0.7 * p.brand_tier + 0.3 * (1 if any(x.is_original for x in p.offers) else 0.4),
            "trust": o.seller_trust,
            "availability": sum(1 for x in p.offers if x.in_stock) / len(p.offers),
            "warranty": min(1.0, max(x.warranty_months for x in p.offers) / 18),
            "speed": 1 - min(o.shipping_days, 6) / 6,
        }
        saving = max(0.0, (p.avg_price - o.price_toman) / p.avg_price)
        results.append(RankedResult(
            product=p, score=round(sum(w[k] * f[k] for k in FEATURES), 4), fit=fit, best_offer=o,
            reasons=_explain(p, f, fit, o, saving, prios), breakdown=f, saving_vs_avg=saving,
        ))
    return sorted(results, key=lambda r: -r.score)[:limit]
