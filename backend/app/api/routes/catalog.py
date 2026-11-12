"""Catalog read API: meta, search, products, compare."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import Field

from app.api.deps import DB, CurrentUser, OptionalUserId
from app.core.schema import Schema
from app.modules.catalog.models import Product
from app.modules.catalog.repository import catalog
from app.modules.catalog.taxonomy import BRANDS, CATEGORIES, CATEGORY_BY_ID, CATEGORY_GROUPS, Brand, Category, CategoryGroup
from app.modules.compatibility import FitResult, check_fitment
from app.modules.garage import active_vehicle, get_user
from app.modules.search import RankedResult, SearchResponse, price_trend, search_products
from app.modules.vehicles import VEHICLE_MODELS, get_vehicle_model

router = APIRouter(tags=["catalog"])


class VehicleOption(Schema):
    id: str
    title: str
    body_type: str
    years: tuple[int, int]


class Meta(Schema):
    groups: list[CategoryGroup]
    categories: list[Category]
    brands: list[Brand]
    vehicles: list[VehicleOption]


class ActiveVehicle(Schema):
    id: str
    model_id: str
    title: str
    body_type: str
    color: str | None


class Me(Schema):
    user_id: str
    name: str
    phone: str
    role: str
    status: str
    shop_name: str | None
    active_vehicle: ActiveVehicle | None


@router.get("/meta", response_model=Meta)
def meta():
    return Meta(groups=CATEGORY_GROUPS, categories=CATEGORIES, brands=list(BRANDS.values()),
                vehicles=[VehicleOption(id=v.id, title=v.title, body_type=v.body_type, years=v.years) for v in VEHICLE_MODELS])


@router.get("/me", response_model=Me)
def me(db: DB, u: CurrentUser):
    a = active_vehicle(db, u.id)
    return Me(user_id=u.id, name=u.name, phone=u.phone, role=u.role, status=u.status, shop_name=u.shop_name,
              active_vehicle=ActiveVehicle(id=a[0].id, model_id=a[1].id, title=a[1].title, body_type=a[1].body_type, color=a[0].color) if a else None)


class SearchOut(SearchResponse):
    vehicle_title: str | None
    active_vehicle_title: str | None  # the garage car, even when the search ignores it
    any_car: bool


@router.get("/search", response_model=SearchOut)
def search(db: DB, uid: OptionalUserId, q: str = "", cat: str | None = None, car: str | None = None,
           all: bool = False, any_car: bool = Query(False, description="ignore the garage car (a car named in the query still counts)"),
           limit: int = Query(60, ge=1, le=100)):
    a = active_vehicle(db, uid) if uid else None
    if car is None and a and not any_car:
        car = a[1].id
    res = search_products(q, vehicle_id=car, category=cat, hide_incompatible=not all, limit=limit)
    v = get_vehicle_model(res.vehicle_id)
    return SearchOut(**res.model_dump(), vehicle_title=v.title if v else None,
                     active_vehicle_title=a[1].title if a else None, any_car=any_car)


class GarageFit(Schema):
    vehicle_id: str
    title: str
    fit: FitResult


class ProductDetail(Schema):
    product: Product
    category_title: str
    fit: FitResult
    garage_fits: list[GarageFit]
    trend30d: float = Field(alias="trend30d")
    similar: list[RankedResult]


@router.get("/products/{product_id}", response_model=ProductDetail)
def product_detail(product_id: str, db: DB, uid: OptionalUserId):
    p = catalog.by_id(product_id)
    if not p:
        raise HTTPException(404, "محصول یافت نشد")
    vehicles = get_user(db, uid).vehicles if uid else []
    a = active_vehicle(db, uid) if uid else None
    cat = CATEGORY_BY_ID[p.category]
    similar = [r for r in search_products(cat.title, vehicle_id=a[1].id if a else None, category=p.category, limit=5).results if r.product.id != p.id][:4]
    return ProductDetail(
        product=p, category_title=cat.title, fit=check_fitment(p, a[1].id if a else None),
        garage_fits=[GarageFit(vehicle_id=v.id, title=get_vehicle_model(v.model_id).title, fit=check_fitment(p, v.model_id)) for v in vehicles],
        trend30d=price_trend(p), similar=similar,
    )


class CompareItem(Schema):
    product: Product
    category_title: str
    fit: FitResult
    trend30d: float = Field(alias="trend30d")


class CompareOut(Schema):
    active_vehicle_title: str | None
    items: list[CompareItem]


@router.get("/products", response_model=CompareOut)
def compare(db: DB, uid: OptionalUserId, ids: str = Query(..., description="comma-separated product ids (max 4)")):
    a = active_vehicle(db, uid) if uid else None
    mid = a[1].id if a else None
    items = [CompareItem(product=p, category_title=CATEGORY_BY_ID[p.category].title, fit=check_fitment(p, mid), trend30d=price_trend(p))
             for p in catalog.by_ids([i for i in ids.split(",") if i][:4])]
    return CompareOut(active_vehicle_title=a[1].title if a else None, items=items)
