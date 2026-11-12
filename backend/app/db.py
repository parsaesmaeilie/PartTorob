"""Persistence: SQLAlchemy 2.0. SQLite for the demo — set DATABASE_URL to Postgres in production."""
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import DateTime, ForeignKey, Integer, String, create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(16), default="customer")  # customer | seller | admin
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | pending | blocked
    seller_id: Mapped[str | None] = mapped_column(String(32), index=True)  # shop this seller manages
    shop_name: Mapped[str | None] = mapped_column(String(80))
    shop_website: Mapped[str | None] = mapped_column(String(200))  # where click-outs land for this shop
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    active_vehicle_id: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="user", cascade="all, delete-orphan", order_by="Vehicle.added_at")
    services: Mapped[list["ServiceRecord"]] = relationship(cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    model_id: Mapped[str] = mapped_column(String(40))
    year: Mapped[int] = mapped_column(Integer)
    odometer_km: Mapped[int] = mapped_column(Integer)
    plate: Mapped[str | None] = mapped_column(String(40))
    nickname: Mapped[str | None] = mapped_column(String(60))
    color: Mapped[str | None] = mapped_column(String(16))
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship(back_populates="vehicles")


class ServiceRecord(Base):
    __tablename__ = "service_records"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    vehicle_id: Mapped[str] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    service_id: Mapped[str] = mapped_column(String(32))
    km: Mapped[int] = mapped_column(Integer)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    cost: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(200))


class OtpCode(Base):
    """One pending code per phone. Only a hash is stored; codes expire and lock after N wrong tries."""

    __tablename__ = "otp_codes"
    phone: Mapped[str] = mapped_column(String(11), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)


class AuthSession(Base):
    """Opaque bearer sessions (hash stored, never the token) — revocable, unlike stateless JWTs."""

    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class OfferOverride(Base):
    """A seller's own price / stock edit from the seller panel; wins over the crawled value."""

    __tablename__ = "offer_overrides"
    seller_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    product_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    price_toman: Mapped[int] = mapped_column(Integer)
    in_stock: Mapped[bool] = mapped_column(default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ClickOut(Base):
    """Every "buy at seller" click — the marketplace's core business metric (CPC billing, ranking feedback)."""

    __tablename__ = "click_outs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    product_id: Mapped[str] = mapped_column(String(32), index=True)
    seller_id: Mapped[str] = mapped_column(String(32), index=True)
    price_toman: Mapped[int] = mapped_column(Integer)
    source: Mapped[str | None] = mapped_column(String(32))  # product page / garage / assistant …
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


if settings.database_url.startswith("sqlite"):
    Path(settings.database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {})

if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _fk_on(conn, _):  # SQLite needs this for ON DELETE CASCADE
        conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(engine, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    """Tiny forward-only migration: add new *nullable* columns to existing tables, so demo data survives
    model changes. (A real deployment would use Alembic.)"""
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name not in have and col.nullable:
                    conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col.type.compile(engine.dialect)}'))


def get_session() -> Iterator[Session]:
    with SessionLocal() as s:
        yield s
