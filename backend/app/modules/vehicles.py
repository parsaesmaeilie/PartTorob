"""Vehicle knowledge base.

In production this comes from OEM manuals / a fitment provider; here it is a
curated seed. `maintenance` is the per-model owner's manual — the reminder
engine never uses global numbers.
"""
from typing import Literal

from app.core.schema import Schema
from app.core.text import normalize_text


class MaintenanceRule(Schema):
    service_id: str
    km: int
    months: int


class VehicleSpecs(Schema):
    oil_viscosity: list[str]
    oil_capacity_l: float
    spark_plug: list[str]
    battery_ah: list[int]
    coolant_l: float


BodyType = Literal["hatchback", "sedan", "suv", "truck", "sport"]


class VehicleModel(Schema):
    id: str
    body_type: BodyType
    brand: str
    model: str
    trim: str
    platform: str  # parts are usually shared across a platform
    engine: str
    years: tuple[int, int]
    aliases: list[str]
    specs: VehicleSpecs
    maintenance: list[MaintenanceRule]

    @property
    def title(self) -> str:
        return f"{self.brand} {self.model} {self.trim}"


def _rules(oil, oil_f, air, pad, plug, fluid, belt, coolant):
    pairs = {"engine-oil": oil, "oil-filter": oil_f, "air-filter": air, "brake-pad": pad, "spark-plug": plug, "brake-fluid": fluid, "timing-belt": belt, "coolant": coolant}
    return [MaintenanceRule(service_id=k, km=v[0], months=v[1]) for k, v in pairs.items()]


def _v(id, body, brand, model, trim, platform, engine, years, aliases, visc, cap, plug, ah, cool, rules):
    return VehicleModel(
        id=id, body_type=body, brand=brand, model=model, trim=trim, platform=platform, engine=engine, years=years, aliases=aliases,
        specs=VehicleSpecs(oil_viscosity=visc, oil_capacity_l=cap, spark_plug=plug, battery_ah=ah, coolant_l=cool),
        maintenance=rules,
    )


VEHICLE_MODELS: list[VehicleModel] = [
    _v("peugeot-206-t5", "hatchback", "پژو", "۲۰۶", "تیپ ۵", "peugeot-206", "TU5 – ۱۶۰۰cc", (1385, 1403),
       ["206 تیپ 5", "206 t5", "206تیپ5", "206 tip 5", "پژو 206 تیپ 5"], ["10W40", "5W30"], 3.5, ["BKR6E", "FR7"], [60, 66], 6,
       _rules((5000, 6), (5000, 6), (15000, 12), (20000, 12), (20000, 24), (40000, 24), (60000, 48), (40000, 24))),
    _v("peugeot-206-t2", "hatchback", "پژو", "۲۰۶", "تیپ ۲", "peugeot-206", "TU3 – ۱۴۰۰cc", (1381, 1402),
       ["206 تیپ 2", "206 t2", "206تیپ2", "پژو 206 تیپ 2"], ["10W40"], 3.2, ["BKR6E", "FR7"], [55, 60], 5.5,
       _rules((5000, 6), (5000, 6), (10000, 12), (20000, 12), (20000, 24), (40000, 24), (50000, 48), (40000, 24))),
    _v("peugeot-pars", "sedan", "پژو", "پارس", "XU7P", "peugeot-405", "XU7P – ۱۸۰۰cc", (1380, 1403),
       ["پارس", "پژو پارس", "pars", "405", "پژو 405"], ["10W40", "20W50"], 4.5, ["BKR6E", "FR7"], [66, 70], 7,
       _rules((5000, 6), (5000, 6), (10000, 12), (25000, 12), (20000, 24), (40000, 24), (60000, 48), (40000, 24))),
    _v("samand-lx", "sedan", "ایران‌خودرو", "سمند", "LX EF7", "samand", "EF7 – ۱۷۰۰cc", (1390, 1402),
       ["سمند", "samand", "سمند lx", "ef7"], ["10W40", "5W40"], 4.2, ["BKR6E"], [66, 70], 7,
       _rules((7500, 6), (7500, 6), (15000, 12), (25000, 12), (30000, 24), (40000, 24), (80000, 60), (40000, 24))),
    _v("dena-plus", "sedan", "ایران‌خودرو", "دنا پلاس", "توربو", "dena", "EF7 TC – ۱۷۰۰cc توربو", (1397, 1403),
       ["دنا", "دنا پلاس", "dena", "dena plus"], ["5W30", "5W40"], 4.5, ["ILZKR7B"], [70, 74], 7.5,
       _rules((7500, 6), (7500, 6), (15000, 12), (30000, 18), (40000, 36), (40000, 24), (90000, 60), (60000, 36))),
    _v("pride-131", "sedan", "سایپا", "پراید", "۱۳۱", "pride", "M13 – ۱۳۰۰cc", (1385, 1399),
       ["پراید", "pride", "پراید 131", "131", "تیبا", "tiba"], ["20W50", "10W40"], 3.5, ["BKR6E", "FR7"], [45, 55], 5,
       _rules((5000, 6), (5000, 6), (10000, 12), (20000, 12), (15000, 18), (30000, 24), (45000, 36), (30000, 24))),
    _v("haima-s7", "suv", "هایما", "S7", "توربو", "haima-s7", "۱۸۰۰cc توربو", (1395, 1403),
       ["هایما", "haima", "s7", "هایما s7"], ["5W30", "5W40"], 4.8, ["ILZKR7B"], [70, 74], 8,
       _rules((10000, 12), (10000, 12), (20000, 12), (30000, 18), (40000, 36), (40000, 24), (100000, 60), (60000, 36))),
    _v("zamyad-capra", "truck", "زامیاد", "کاپرا ۲", "دوکابین", "capra", "۲۰۰۰cc", (1397, 1403),
       ["کاپرا", "capra", "وانت کاپرا", "پیکاپ"], ["10W40", "15W40"], 4.5, ["BKR6E"], [74, 88], 8,
       _rules((5000, 6), (5000, 6), (10000, 12), (20000, 12), (20000, 24), (40000, 24), (60000, 48), (40000, 24))),
    _v("toyota-86", "sport", "تویوتا", "86", "GT", "toyota-86", "FA20 – ۲۰۰۰cc بوکسر", (1392, 1400),
       ["تویوتا 86", "gt86", "toyota 86", "جی تی 86"], ["0W20", "5W30"], 5.4, ["ILZKR7B"], [60, 66], 7,
       _rules((10000, 12), (10000, 12), (20000, 24), (30000, 18), (90000, 60), (40000, 24), (150000, 96), (100000, 60))),
]

SERVICE_DEFS: dict[str, dict[str, str]] = {
    "engine-oil": {"title": "تعویض روغن موتور", "category": "engine-oil", "basis": "کیلومتر و زمان"},
    "oil-filter": {"title": "تعویض فیلتر روغن", "category": "oil-filter", "basis": "همراه سرویس روغن"},
    "air-filter": {"title": "تعویض فیلتر هوا", "category": "air-filter", "basis": "برنامه سرویس"},
    "brake-pad": {"title": "بررسی لنت ترمز", "category": "brake-pad", "basis": "بازدید و وضعیت"},
    "spark-plug": {"title": "تعویض شمع", "category": "spark-plug", "basis": "توصیه سازنده"},
    "brake-fluid": {"title": "بررسی روغن ترمز", "category": "brake-fluid", "basis": "توصیه سازنده"},
    "timing-belt": {"title": "بررسی تسمه تایم", "category": "timing-belt", "basis": "مشخصات خودرو"},
    "coolant": {"title": "بررسی ضدیخ", "category": "coolant", "basis": "فصلی و دوره‌ای"},
}

_BY_ID = {v.id: v for v in VEHICLE_MODELS}


def get_vehicle_model(id: str | None) -> VehicleModel | None:
    return _BY_ID.get(id) if id else None


def platform_vehicle_ids(platforms: list[str]) -> list[str]:
    return [v.id for v in VEHICLE_MODELS if v.platform in platforms]


def platform_display(platform: str) -> str:
    v = next(m for m in VEHICLE_MODELS if m.platform == platform)
    return f"{v.brand} {v.model}" if v.brand in ("پژو", "هایما") else v.model


def _build_alias_index() -> list[tuple[str, list[str]]]:
    m: dict[str, set[str]] = {}
    for v in VEHICLE_MODELS:
        for a in [*v.aliases, f"{v.model} {v.trim}"]:
            m.setdefault(normalize_text(a), set()).add(v.id)
    m["206"] = {"peugeot-206-t5", "peugeot-206-t2"}
    m["پژو 206"] = {"peugeot-206-t5", "peugeot-206-t2"}
    # longest first so "206 تیپ 5" wins over "206"
    return sorted(((k, sorted(ids)) for k, ids in m.items()), key=lambda x: -len(x[0]))


_ALIAS_INDEX = _build_alias_index()


def detect_vehicles(text: str) -> tuple[list[str], str]:
    """Finds vehicle mentions in free text; returns ids and the text with mentions removed."""
    rest = f" {normalize_text(text)} "
    ids: list[str] = []
    for alias, vids in _ALIAS_INDEX:
        needle = f" {alias} "
        if needle in rest:
            ids.extend(i for i in vids if i not in ids)
            rest = rest.replace(needle, " ", 1)
    # put the more specific (first matched) id first for "the user's car"
    return ids, rest.strip()
