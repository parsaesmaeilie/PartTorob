"""Garage & maintenance API — «گاراژ من»."""
from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB, UserId
from app.core.schema import Schema
from app.modules import garage
from app.modules.search import RankedResult, search_products

router = APIRouter(prefix="/garage", tags=["garage"])


class NeededPart(Schema):
    service_id: str
    service_title: str
    result: RankedResult


class GarageOut(garage.GarageOverview):
    selected_vehicle_id: str | None
    needed: list[NeededPart]


@router.get("", response_model=GarageOut)
def get_garage(db: DB, uid: UserId, v: str | None = None):
    g = garage.overview(db, uid)
    sel = next((x for x in g.vehicles if x.vehicle.id == (v or g.active_vehicle_id)), g.vehicles[0] if g.vehicles else None)
    needed: list[NeededPart] = []
    if sel:
        # parts for the most urgent services, already fitment-filtered for this car
        for s in [s for s in sel.services if s.status != "ok"][:3]:
            res = search_products("", vehicle_id=sel.model.id, category=s.category, limit=1).results
            if res:
                needed.append(NeededPart(service_id=s.service_id, service_title=s.title, result=res[0]))
    return GarageOut(**g.model_dump(), selected_vehicle_id=sel.vehicle.id if sel else None, needed=needed)


class VehicleIn(Schema):
    model_id: str
    year: int = Field(ge=1350, le=1410)
    odometer_km: int = Field(ge=0, le=2_000_000)
    plate: str | None = Field(None, max_length=40)
    nickname: str | None = Field(None, max_length=60)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class OdometerIn(Schema):
    km: int = Field(ge=0, le=2_000_000)


class ServiceIn(Schema):
    service_id: str
    km: int = Field(ge=0, le=2_000_000)
    cost: int | None = Field(None, ge=0)
    note: str | None = Field(None, max_length=200)


class Ok(Schema):
    ok: bool = True
    id: str | None = None


@router.post("/vehicles", response_model=Ok, status_code=201)
def add_vehicle(body: VehicleIn, db: DB, uid: UserId):
    v = garage.add_vehicle(db, uid, **body.model_dump())
    return Ok(id=v.id)


@router.delete("/vehicles/{vehicle_id}", response_model=Ok)
def remove_vehicle(vehicle_id: str, db: DB, uid: UserId):
    garage.remove_vehicle(db, uid, vehicle_id)
    return Ok()


@router.post("/vehicles/{vehicle_id}/activate", response_model=Ok)
def activate(vehicle_id: str, db: DB, uid: UserId):
    garage.set_active(db, uid, vehicle_id)
    return Ok()


@router.patch("/vehicles/{vehicle_id}/odometer", response_model=Ok)
def odometer(vehicle_id: str, body: OdometerIn, db: DB, uid: UserId):
    garage.update_odometer(db, uid, vehicle_id, body.km)
    return Ok()


@router.post("/vehicles/{vehicle_id}/services", response_model=Ok, status_code=201)
def log_service(vehicle_id: str, body: ServiceIn, db: DB, uid: UserId):
    garage.log_service(db, uid, vehicle_id=vehicle_id, **body.model_dump())
    return Ok()
