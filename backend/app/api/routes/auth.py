"""Auth API — OTP login / signup / logout / me."""
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB, CurrentUser, Token
from app.core.schema import Schema
from app.modules import auth

router = APIRouter(prefix="/auth", tags=["auth"])


class PhoneIn(Schema):
    phone: str = Field(max_length=20)


class VerifyIn(PhoneIn):
    code: str = Field(min_length=4, max_length=8)


class SignupIn(VerifyIn):
    name: str = Field(min_length=2, max_length=60)
    role: Literal["customer", "seller"] = "customer"
    shop_name: str | None = Field(None, max_length=80)


class UserOut(Schema):
    id: str
    name: str
    phone: str
    role: str
    status: str
    seller_id: str | None
    shop_name: str | None


@router.post("/otp", response_model=auth.OtpSent)
def request_otp(body: PhoneIn, db: DB):
    return auth.request_otp(db, body.phone)


@router.post("/login", response_model=auth.SessionOut)
def login(body: VerifyIn, db: DB):
    return auth.login(db, body.phone, body.code)


@router.post("/signup", response_model=auth.SessionOut, status_code=201)
def signup(body: SignupIn, db: DB):
    return auth.signup(db, body.phone, body.code, name=body.name, role=body.role, shop_name=body.shop_name)


@router.post("/logout")
def logout(db: DB, token: Token):
    if token:
        auth.logout(db, token)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(u: CurrentUser):
    return UserOut.model_validate(u)
