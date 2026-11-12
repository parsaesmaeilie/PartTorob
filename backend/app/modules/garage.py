"""GARAGE — «گاراژ من». Application service enforcing the domain rules:
max 4 vehicles, odometer never decreases, one active vehicle.
"""
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.schema import Schema
from app.core.text import to_persian_digits
from app.db import ServiceRecord, User, Vehicle, utcnow
from app.modules.maintenance import ServiceStatus, maintenance_status
from app.modules.vehicles import VehicleModel, get_vehicle_model


class DomainError(Exception):
    pass


def _uid(prefix: str) -> str:
    return prefix + uuid.uuid4().hex[:10]


# ── read models (API shapes)

class VehicleOut(Schema):
    id: str
    model_id: str
    year: int
    odometer_km: int
    plate: str | None
    nickname: str | None
    color: str | None
    added_at: datetime


class ServiceRecordOut(Schema):
    id: str
    vehicle_id: str
    service_id: str
    km: int
    date: datetime
    cost: int | None
    note: str | None


class GarageVehicle(Schema):
    vehicle: VehicleOut
    model: VehicleModel
    title: str
    services: list[ServiceStatus]
    due: int
    total_cost: int
    history: list[ServiceRecordOut]


class GarageOverview(Schema):
    user_id: str
    name: str
    active_vehicle_id: str | None
    max_vehicles: int
    vehicles: list[GarageVehicle]


# ── demo garage (seeded for the demo customer so the video has a living garage)

def seed_demo_garage(s: Session, u: User) -> None:
    now = utcnow()
    ago = lambda d: now - timedelta(days=d)  # noqa: E731
    v1, v2, v3, v4 = (_uid("v") for _ in range(4))
    u.vehicles = [
        Vehicle(id=v1, model_id="peugeot-206-t5", year=1398, odometer_km=82_400, plate="۱۲ ب ۳۴۵ ایران ۶۷", nickname="پژوی نقره‌ای", color="#94a3b8", added_at=ago(400)),
        Vehicle(id=v2, model_id="samand-lx", year=1396, odometer_km=145_000, nickname="سمند بابا", color="#1e3a8a", added_at=ago(399)),
        Vehicle(id=v3, model_id="zamyad-capra", year=1401, odometer_km=58_000, nickname="وانت کار", color="#f1f5f9", added_at=ago(398)),
        Vehicle(id=v4, model_id="toyota-86", year=1396, odometer_km=61_000, nickname="اسپرت قرمز", color="#e3262f", added_at=ago(397)),
    ]
    u.active_vehicle_id = v1
    s.flush()  # vehicles must exist before their service records (FK)
    rec = lambda v, sid, km, d, cost: ServiceRecord(id=_uid("s"), user_id=u.id, vehicle_id=v, service_id=sid, km=km, date=ago(d), cost=cost)  # noqa: E731
    u.services = [
        rec(v1, "engine-oil", 78_000, 150, 1_350_000), rec(v1, "oil-filter", 78_000, 150, 210_000),
        rec(v1, "brake-pad", 64_000, 330, 1_900_000), rec(v1, "air-filter", 70_000, 260, 380_000),
        rec(v2, "engine-oil", 141_000, 60, 1_100_000), rec(v2, "timing-belt", 80_000, 700, 2_600_000),
        rec(v3, "engine-oil", 55_000, 120, 1_400_000), rec(v4, "engine-oil", 52_000, 300, 4_200_000), rec(v4, "brake-pad", 40_000, 400, 6_500_000),
    ]


def get_user(s: Session, user_id: str) -> User:
    u = s.get(User, user_id)
    if not u:
        raise DomainError("کاربر یافت نشد")
    return u


def _vehicle(u: User, vehicle_id: str) -> Vehicle:
    v = next((x for x in u.vehicles if x.id == vehicle_id), None)
    if not v:
        raise DomainError("خودرو یافت نشد")
    return v


def active_vehicle(s: Session, user_id: str) -> tuple[Vehicle, VehicleModel] | None:
    u = get_user(s, user_id)
    v = next((x for x in u.vehicles if x.id == u.active_vehicle_id), None) or (u.vehicles[0] if u.vehicles else None)
    return (v, get_vehicle_model(v.model_id)) if v else None


def overview(s: Session, user_id: str) -> GarageOverview:
    u = get_user(s, user_id)
    out = []
    for v in u.vehicles:
        model = get_vehicle_model(v.model_id)
        services = maintenance_status(v, u.services)
        mine = sorted((r for r in u.services if r.vehicle_id == v.id), key=lambda r: r.date, reverse=True)
        out.append(GarageVehicle(
            vehicle=VehicleOut.model_validate(v), model=model, title=model.title, services=services,
            due=sum(1 for x in services if x.status != "ok"), total_cost=sum(r.cost or 0 for r in mine),
            history=[ServiceRecordOut.model_validate(r) for r in mine],
        ))
    return GarageOverview(user_id=u.id, name=u.name, active_vehicle_id=u.active_vehicle_id, max_vehicles=settings.max_vehicles, vehicles=out)


# ── commands

def add_vehicle(s: Session, user_id: str, *, model_id: str, year: int, odometer_km: int, plate: str | None = None, nickname: str | None = None, color: str | None = None) -> Vehicle:
    if not get_vehicle_model(model_id):
        raise DomainError("مدل خودرو نامعتبر است")
    if odometer_km < 0:
        raise DomainError("کارکرد نامعتبر است")
    u = get_user(s, user_id)
    if len(u.vehicles) >= settings.max_vehicles:
        raise DomainError(f"حداکثر {to_persian_digits(settings.max_vehicles)} خودرو می‌توانید ثبت کنید")
    v = Vehicle(id=_uid("v"), model_id=model_id, year=year, odometer_km=odometer_km, plate=plate or None, nickname=nickname or None, color=color or "#e3262f", added_at=utcnow())
    u.vehicles.append(v)
    s.flush()
    u.active_vehicle_id = v.id
    s.commit()
    return v


def remove_vehicle(s: Session, user_id: str, vehicle_id: str) -> None:
    u = get_user(s, user_id)
    v = _vehicle(u, vehicle_id)
    u.services = [r for r in u.services if r.vehicle_id != vehicle_id]
    u.vehicles.remove(v)
    if u.active_vehicle_id == vehicle_id:
        u.active_vehicle_id = u.vehicles[0].id if u.vehicles else None
    s.commit()


def set_active(s: Session, user_id: str, vehicle_id: str) -> None:
    u = get_user(s, user_id)
    _vehicle(u, vehicle_id)
    u.active_vehicle_id = vehicle_id
    s.commit()


def update_odometer(s: Session, user_id: str, vehicle_id: str, km: int) -> None:
    v = _vehicle(get_user(s, user_id), vehicle_id)
    if km < v.odometer_km:
        raise DomainError("کیلومتر جدید نمی‌تواند کمتر از کارکرد فعلی باشد")
    v.odometer_km = km
    s.commit()


def log_service(s: Session, user_id: str, *, vehicle_id: str, service_id: str, km: int, cost: int | None = None, note: str | None = None) -> None:
    u = get_user(s, user_id)
    v = _vehicle(u, vehicle_id)
    model = get_vehicle_model(v.model_id)
    if service_id not in {r.service_id for r in model.maintenance}:
        raise DomainError("سرویس نامعتبر است")
    u.services.append(ServiceRecord(id=_uid("s"), user_id=user_id, vehicle_id=vehicle_id, service_id=service_id, km=km, cost=cost, note=note, date=utcnow()))
    v.odometer_km = max(v.odometer_km, km)
    s.commit()
