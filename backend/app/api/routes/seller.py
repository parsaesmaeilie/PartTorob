"""Seller panel API — every route requires role=seller."""
from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB, SellerUser
from app.core.schema import Schema
from app.modules import seller_portal

router = APIRouter(prefix="/seller", tags=["seller"])


@router.get("/dashboard", response_model=seller_portal.SellerDashboard)
def dashboard(db: DB, u: SellerUser):
    return seller_portal.dashboard(db, u)


class OfferIn(Schema):
    price_toman: int = Field(ge=1000, le=500_000_000)
    in_stock: bool = True


@router.patch("/offers/{product_id}")
def update_offer(product_id: str, body: OfferIn, db: DB, u: SellerUser):
    seller_portal.update_offer(db, u, product_id, body.price_toman, body.in_stock)
    return {"ok": True}
