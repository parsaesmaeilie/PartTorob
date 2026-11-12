"""MAINTENANCE ENGINE — per-vehicle schedule from the model's own manual.

Pure: (model rules, odometer, service history, now) → status list.
Whichever of km or time comes first triggers the reminder.
"""
from datetime import datetime, timedelta, timezone
from typing import Literal, Protocol

from app.core.schema import Schema
from app.modules.vehicles import SERVICE_DEFS, get_vehicle_model

DueStatus = Literal["ok", "soon", "overdue"]


class VehicleLike(Protocol):
    id: str
    model_id: str
    odometer_km: int
    added_at: datetime


class RecordLike(Protocol):
    vehicle_id: str
    service_id: str
    km: int
    date: datetime


class ServiceStatus(Schema):
    service_id: str
    title: str
    category: str
    basis: str
    interval_km: int
    interval_months: int
    last_km: int
    last_date: datetime
    estimated: bool
    next_km: int
    next_date: datetime
    remaining_km: int
    remaining_days: int
    progress: float
    status: DueStatus


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def maintenance_status(vehicle: VehicleLike, records: list[RecordLike], now: datetime | None = None) -> list[ServiceStatus]:
    model = get_vehicle_model(vehicle.model_id)
    if not model:
        return []
    now = now or datetime.now(timezone.utc)
    mine = [r for r in records if r.vehicle_id == vehicle.id]
    out: list[ServiceStatus] = []
    for rule in model.maintenance:
        d = SERVICE_DEFS[rule.service_id]
        history = sorted((r for r in mine if r.service_id == rule.service_id), key=lambda r: r.km, reverse=True)
        last = history[0] if history else None
        # no history → assume it was done at the last multiple of the interval
        last_km = last.km if last else (vehicle.odometer_km // rule.km) * rule.km
        last_date = _aware(last.date if last else vehicle.added_at)
        period = timedelta(days=rule.months * 30)
        next_date = last_date + period
        progress = max((vehicle.odometer_km - last_km) / rule.km, (now - last_date) / period)
        out.append(
            ServiceStatus(
                service_id=rule.service_id, title=d["title"], category=d["category"], basis=d["basis"],
                interval_km=rule.km, interval_months=rule.months, last_km=last_km, last_date=last_date, estimated=last is None,
                next_km=last_km + rule.km, next_date=next_date, remaining_km=last_km + rule.km - vehicle.odometer_km,
                remaining_days=round((next_date - now).total_seconds() / 86400), progress=progress,
                status="overdue" if progress >= 1 else "soon" if progress >= 0.8 else "ok",
            )
        )
    return sorted(out, key=lambda s: -s.progress)
