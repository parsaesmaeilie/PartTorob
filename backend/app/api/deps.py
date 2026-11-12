"""Request-scoped dependencies: DB session, the authenticated user, role guards.

The Next.js BFF keeps the session token in an httpOnly cookie and forwards it
as `Authorization: Bearer <token>`. Browsers never see the token in JS.
"""
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import User, get_session
from app.modules.auth import user_for_token

DB = Annotated[Session, Depends(get_session)]


def bearer_token(authorization: Annotated[str | None, Header()] = None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


Token = Annotated[str | None, Depends(bearer_token)]


def current_user(db: DB, token: Token) -> User:
    u = user_for_token(db, token) if token else None
    if not u:
        raise HTTPException(401, "لطفاً وارد حساب کاربری شوید")
    return u


CurrentUser = Annotated[User, Depends(current_user)]


def _uid(u: CurrentUser) -> str:
    return u.id


UserId = Annotated[str, Depends(_uid)]


def _optional_uid(db: DB, token: Token) -> str | None:
    u = user_for_token(db, token) if token else None
    return u.id if u else None


# public endpoints (search, product, compare, click-out): guests welcome, logged-in users get personalisation
OptionalUserId = Annotated[str | None, Depends(_optional_uid)]


def require_role(*roles: str):
    def guard(u: CurrentUser) -> User:
        if u.role not in roles:
            raise HTTPException(403, "دسترسی به این بخش ندارید")
        return u

    return Depends(guard)


AdminUser = Annotated[User, require_role("admin")]
SellerUser = Annotated[User, require_role("seller")]
