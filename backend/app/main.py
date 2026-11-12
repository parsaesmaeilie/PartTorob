"""قطعه ترب — FastAPI backend.

    uvicorn app.main:app --reload --port 8000      → docs at /docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin, auth, commerce, garage, seller
from app.api.routes import catalog as catalog_routes
from app.core.config import settings
from app.db import SessionLocal, init_db
from app.modules.catalog.repository import catalog
from app.modules.garage import DomainError
from app.modules.seller_portal import apply_all_overrides
from app.seed import seed_demo_users, seed_population

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    report = catalog.reindex()  # warm the catalog: crawl → normalize → match
    with SessionLocal() as s:
        seed_demo_users(s)
        seed_population(s)  # ~60 customers, shop owners, 30 days of click-outs
        applied = apply_all_overrides(s)  # sellers' own prices win over crawled ones
    logging.info("demo users ready, %s seller overrides applied", applied)
    logging.info("catalog ready: %s raw → %s products in %sms", report.raw_count, report.product_count, report.duration_ms)
    yield


app = FastAPI(title="قطعه ترب API", version="1.0.0", lifespan=lifespan,
              description="Car-parts price comparison, fitment guarantee, garage & maintenance reminders, AI assistant.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(DomainError)
async def domain_error(_: Request, exc: DomainError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok", "products": len(catalog.all())}


for r in (auth.router, catalog_routes.router, garage.router, commerce.router, seller.router, admin.router):
    app.include_router(r, prefix="/api/v1")
