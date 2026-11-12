"""COMPATIBILITY (fitment) ENGINE — «تضمین سازگاری قطعه».

Two kinds of evidence:
  1. explicit fitment: the part lists the vehicle platform
  2. spec fitment: fluids / plugs / batteries match the vehicle's manual
"""
from typing import Literal

from app.core.schema import Schema
from app.modules.catalog.models import Product
from app.modules.catalog.taxonomy import CATEGORY_BY_ID
from app.modules.vehicles import get_vehicle_model

FitStatus = Literal["fits", "no-fit", "universal", "unknown"]


class FitResult(Schema):
    status: FitStatus
    reason: str


def check_fitment(p: Product, vehicle_id: str | None) -> FitResult:
    if not vehicle_id:
        return FitResult(status="unknown", reason="خودرویی انتخاب نشده")
    v = get_vehicle_model(vehicle_id)
    if not v:
        return FitResult(status="unknown", reason="خودرو ناشناخته")
    name, a, kind = v.title, p.attributes, CATEGORY_BY_ID[p.category].fitment

    if kind == "explicit":
        if v.id in p.fitment.vehicle_ids:
            return FitResult(status="fits", reason=f"طبق کد فنی، مخصوص {name}")
        if not p.fitment.platforms:
            return FitResult(status="unknown", reason="فروشنده خودروی سازگار را مشخص نکرده")
        return FitResult(status="no-fit", reason=f"این قطعه برای {name} نیست")
    if kind == "oil-spec":
        if not a.viscosity:
            return FitResult(status="unknown", reason="گرانروی روغن مشخص نیست")
        if a.viscosity in v.specs.oil_viscosity:
            return FitResult(status="fits", reason=f"گرانروی {a.viscosity} در دفترچه {name} توصیه شده (ظرفیت {v.specs.oil_capacity_l:g} لیتر)")
        return FitResult(status="no-fit", reason=f"دفترچه {name} روغن {' یا '.join(v.specs.oil_viscosity)} توصیه می‌کند")
    if kind == "plug-spec":
        if a.plug_code and a.plug_code in v.specs.spark_plug:
            return FitResult(status="fits", reason=f"کد شمع {a.plug_code} برای موتور {v.engine}")
        return FitResult(status="no-fit", reason=f"موتور {name} شمع {' / '.join(v.specs.spark_plug)} می‌خواهد")
    if kind == "battery-spec":
        if a.ampere and a.ampere in v.specs.battery_ah:
            return FitResult(status="fits", reason=f"آمپر {a.ampere} مطابق نیاز {name}")
        return FitResult(status="no-fit", reason=f"{name} باتری {' یا '.join(map(str, v.specs.battery_ah))} آمپر لازم دارد")
    return FitResult(status="universal", reason="مناسب همه خودروها")
