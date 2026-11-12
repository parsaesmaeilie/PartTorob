"""Admin panel API — every route requires role=admin."""
from typing import Literal

from fastapi import APIRouter

from app.api.deps import DB, AdminUser
from app.core.schema import Schema
from app.modules import admin_portal
from app.modules.catalog.repository import catalog
from app.modules.ingestion.types import IngestionReport
from app.modules.seller_portal import apply_all_overrides

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=admin_portal.AdminOverview)
def overview(db: DB, _: AdminUser):
    return admin_portal.overview(db)


@router.get("/ingestion", response_model=IngestionReport)
def ingestion_report(_: AdminUser):
    return catalog.report()


@router.post("/reindex", response_model=IngestionReport)
def reindex(db: DB, _: AdminUser):
    """Re-runs crawl → normalize → match, then re-applies sellers' own edits."""
    report = catalog.reindex()
    apply_all_overrides(db)
    return report


class StatusIn(Schema):
    status: Literal["active", "blocked"]


@router.patch("/users/{user_id}/status")
def set_status(user_id: str, body: StatusIn, db: DB, admin: AdminUser):
    admin_portal.set_status(db, admin, user_id, body.status)
    return {"ok": True}
