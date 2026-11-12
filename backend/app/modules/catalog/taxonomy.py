"""Category taxonomy (8 groups from the product brief) + lexicons the normalizer uses."""
from typing import Literal

from app.core.schema import Schema

Fitment = Literal["explicit", "oil-spec", "plug-spec", "battery-spec", "universal"]


class CategoryGroup(Schema):
    id: str
    title: str
    subtitle: str
    children: list[str]


class Category(Schema):
    id: str
    title: str
    group: str
    keywords: list[str]
    fitment: Fitment


class Brand(Schema):
    id: str
    name: str
    forms: list[str]
    tier: float


CATEGORY_GROUPS = [
    CategoryGroup(id="brakes", title="سیستم ترمز", subtitle="لنت، دیسک، کالیپر، روغن ترمز", children=["brake-pad", "brake-disc", "brake-fluid"]),
    CategoryGroup(id="oils", title="روغن و روانکار", subtitle="روغن موتور، گیربکس، ضدیخ", children=["engine-oil", "gear-oil", "coolant"]),
    CategoryGroup(id="electrical", title="برق و احتراق", subtitle="شمع، وایر، کوئل، باتری", children=["spark-plug", "ignition-coil", "battery"]),
    CategoryGroup(id="filters", title="فیلترها", subtitle="فیلتر هوا، روغن، بنزین، کابین", children=["oil-filter", "air-filter", "cabin-filter", "fuel-filter"]),
    CategoryGroup(id="suspension", title="سیستم تعلیق", subtitle="کمک‌فنر، سیبک، بوش، طبق", children=["shock-absorber", "ball-joint"]),
    CategoryGroup(id="engine", title="قطعات موتور", subtitle="تسمه تایم، واترپمپ، سوپاپ", children=["timing-belt", "water-pump"]),
    CategoryGroup(id="tools", title="ابزار و تجهیزات", subtitle="آچار، جعبه بکس، جک", children=["tool-set", "jack"]),
    CategoryGroup(id="care", title="لوازم جانبی و نگهداری", subtitle="شوینده، واکس، کمپرسور", children=["car-wax", "air-compressor"]),
]


def _c(id, title, group, keywords, fitment) -> Category:
    return Category(id=id, title=title, group=group, keywords=keywords, fitment=fitment)


CATEGORIES = [
    _c("brake-pad", "لنت ترمز", "brakes", ["لنت ترمز", "لنت"], "explicit"),
    _c("brake-disc", "دیسک ترمز", "brakes", ["دیسک ترمز", "دیسک چرخ", "دیسک"], "explicit"),
    _c("brake-fluid", "روغن ترمز", "brakes", ["روغن ترمز", "dot 4", "dot4"], "universal"),
    _c("engine-oil", "روغن موتور", "oils", ["روغن موتور", "روغن"], "oil-spec"),
    _c("gear-oil", "روغن گیربکس", "oils", ["روغن گیربکس", "واسکازین"], "universal"),
    _c("coolant", "ضدیخ", "oils", ["ضد یخ", "ضدیخ", "کولانت"], "universal"),
    _c("spark-plug", "شمع موتور", "electrical", ["شمع موتور", "شمع خودرو", "شمع"], "plug-spec"),
    _c("ignition-coil", "کوئل", "electrical", ["کوئل", "کویل"], "explicit"),
    _c("battery", "باتری", "electrical", ["باطری", "باتری"], "battery-spec"),
    _c("oil-filter", "فیلتر روغن", "filters", ["فیلتر روغن"], "explicit"),
    _c("air-filter", "فیلتر هوا", "filters", ["فیلتر هوا"], "explicit"),
    _c("cabin-filter", "فیلتر کابین", "filters", ["فیلتر کابین"], "explicit"),
    _c("fuel-filter", "فیلتر بنزین", "filters", ["فیلتر بنزین"], "explicit"),
    _c("shock-absorber", "کمک فنر", "suspension", ["کمک فنر", "کمک"], "explicit"),
    _c("ball-joint", "سیبک", "suspension", ["سیبک"], "explicit"),
    _c("timing-belt", "تسمه تایم", "engine", ["تسمه تایم", "تسمه تایمینگ"], "explicit"),
    _c("water-pump", "واتر پمپ", "engine", ["واتر پمپ", "واترپمپ", "پمپ آب"], "explicit"),
    _c("tool-set", "جعبه بکس", "tools", ["جعبه بکس", "آچار", "ست ابزار"], "universal"),
    _c("jack", "جک خودرو", "tools", ["جک"], "universal"),
    _c("car-wax", "واکس بدنه", "care", ["واکس", "پولیش"], "universal"),
    _c("air-compressor", "کمپرسور باد", "care", ["کمپرسور", "پمپ باد"], "universal"),
]

CATEGORY_BY_ID = {c.id: c for c in CATEGORIES}
GROUP_BY_ID = {g.id: g for g in CATEGORY_GROUPS}


def _b(id, name, forms, tier) -> Brand:
    return Brand(id=id, name=name, forms=forms, tier=tier)


BRANDS = {
    b.id: b
    for b in [
        _b("bosch", "بوش", ["bosch", "بوش"], 0.9),
        _b("ngk", "NGK", ["ngk", "ان جی کی"], 0.9),
        _b("behran", "بهران", ["behran", "بهران"], 0.7),
        _b("iranol", "ایرانول", ["iranol", "ایرانول"], 0.7),
        _b("total", "توتال", ["total", "توتال"], 0.85),
        _b("castrol", "کاسترول", ["castrol", "کاسترول"], 0.9),
        _b("isaco", "ایساکو", ["isaco", "ایساکو"], 0.8),
        _b("pars", "پارس لنت", ["پارس لنت", "parslent"], 0.65),
        _b("sepahan", "سپاهان باتری", ["سپاهان باتری", "سپاهان", "sepahan"], 0.7),
        _b("atlas", "اطلس بی ایکس", ["اطلس بی ایکس", "اطلس", "atlas bx", "atlas"], 0.85),
        _b("sakura", "ساکورا", ["sakura", "ساکورا"], 0.8),
        _b("mahle", "ماهله", ["mahle", "ماهله"], 0.85),
        _b("gates", "گیتس", ["gates", "گیتس"], 0.85),
        _b("sachs", "ساکس", ["sachs", "ساکس"], 0.85),
        _b("ronix", "رونیکس", ["ronix", "رونیکس"], 0.75),
        _b("meguiars", "مگوایرز", ["meguiars", "مگوایرز"], 0.85),
        _b("brembo", "برمبو", ["brembo", "برمبو"], 0.95),
        _b("febi", "فبی", ["febi", "فبی"], 0.8),
        _b("valeo", "والئو", ["valeo", "والئو"], 0.85),
        _b("liquimoly", "لیکومولی", ["liqui moly", "لیکومولی"], 0.92),
        _b("mobil", "موبیل", ["mobil", "موبیل"], 0.9),
        _b("varta", "وارتا", ["varta", "وارتا"], 0.92),
        _b("kyb", "KYB", ["kyb", "کی وای بی"], 0.88),
        _b("denso", "دنسو", ["denso", "دنسو"], 0.9),
    ]
}
