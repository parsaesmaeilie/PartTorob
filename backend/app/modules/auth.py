"""AUTH — phone + one-time code (OTP), opaque sessions, roles.

    request_otp(phone) ─▶ SmsSender ─▶ (dev: code echoed to the UI)
    verify(phone, code) ─▶ login → session token      (existing user)
    signup(phone, code, name, role) ─▶ user + session (new user)

Security choices: codes and session tokens are stored only as HMAC hashes,
codes expire (120s), lock after 5 wrong tries, and can be re-sent only every
30s. Sessions are server-side so logout / blocking a user takes effect
immediately.
"""
import hashlib
import hmac
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Protocol

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.schema import Schema
from app.core.text import to_latin_digits
from app.db import AuthSession, OtpCode, User, utcnow
from app.modules.garage import DomainError

log = logging.getLogger(__name__)
Role = Literal["customer", "seller", "admin"]
_PHONE = re.compile(r"^09\d{9}$")


class AuthError(DomainError):
    """Raised for bad credentials — mapped to 401/422 by the API."""


# ── SMS port (Kavenegar / Ghasedak adapters would implement this)

class SmsSender(Protocol):
    def send(self, phone: str, text: str) -> None: ...


class LogSms:
    def send(self, phone: str, text: str) -> None:
        log.info("SMS to %s: %s", phone, text)


sms: SmsSender = LogSms()


def normalize_phone(raw: str) -> str:
    p = re.sub(r"[\s\-()]", "", to_latin_digits(raw or ""))
    if p.startswith("+98"):
        p = "0" + p[3:]
    elif p.startswith("98") and len(p) == 12:
        p = "0" + p[2:]
    elif p.startswith("9") and len(p) == 10:
        p = "0" + p
    if not _PHONE.match(p):
        raise AuthError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)")
    return p


def _h(value: str) -> str:
    return hmac.new(settings.secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


class OtpSent(Schema):
    phone: str
    expires_in: int
    resend_in: int
    is_registered: bool
    dev_code: str | None = None  # only in dev mode — shown on screen instead of an SMS


def request_otp(s: Session, raw_phone: str) -> OtpSent:
    phone = normalize_phone(raw_phone)
    now = utcnow()
    row = s.get(OtpCode, phone)
    if row and (now - _aware(row.sent_at)).total_seconds() < settings.otp_resend_seconds:
        wait = settings.otp_resend_seconds - int((now - _aware(row.sent_at)).total_seconds())
        raise AuthError(f"برای ارسال دوباره {wait} ثانیه صبر کنید")
    code = f"{secrets.randbelow(100_000):05d}"
    if row:
        row.code_hash, row.expires_at, row.sent_at, row.attempts = _h(f"{phone}:{code}"), now + timedelta(seconds=settings.otp_ttl_seconds), now, 0
    else:
        s.add(OtpCode(phone=phone, code_hash=_h(f"{phone}:{code}"), expires_at=now + timedelta(seconds=settings.otp_ttl_seconds), sent_at=now))
    s.commit()
    sms.send(phone, f"قطعه ترب\nکد ورود شما: {code}")
    registered = s.query(User.id).filter(User.phone == phone).first() is not None
    return OtpSent(phone=phone, expires_in=settings.otp_ttl_seconds, resend_in=settings.otp_resend_seconds,
                   is_registered=registered, dev_code=code if settings.otp_dev_mode else None)


def _consume_otp(s: Session, phone: str, code: str) -> None:
    row = s.get(OtpCode, phone)
    if not row or _aware(row.expires_at) < utcnow():
        raise AuthError("کد منقضی شده؛ دوباره درخواست کنید")
    if row.attempts >= settings.otp_max_attempts:
        raise AuthError("تلاش‌های ناموفق زیاد بود؛ کد جدید بگیرید")
    if not hmac.compare_digest(row.code_hash, _h(f"{phone}:{to_latin_digits(code).strip()}")):
        row.attempts += 1
        s.commit()
        raise AuthError("کد وارد شده درست نیست")
    s.delete(row)  # single use


class SessionOut(Schema):
    token: str
    user_id: str
    name: str
    role: Role
    status: str


def _open_session(s: Session, u: User) -> SessionOut:
    token = secrets.token_urlsafe(32)
    s.add(AuthSession(token_hash=_h(token), user_id=u.id, expires_at=utcnow() + timedelta(days=settings.session_days)))
    u.last_login_at = utcnow()
    s.commit()
    return SessionOut(token=token, user_id=u.id, name=u.name, role=u.role, status=u.status)


def login(s: Session, raw_phone: str, code: str) -> SessionOut:
    phone = normalize_phone(raw_phone)
    u = s.query(User).filter(User.phone == phone).first()
    if not u:
        raise AuthError("این شماره ثبت‌نام نکرده است؛ ابتدا ثبت‌نام کنید")
    _consume_otp(s, phone, code)
    if u.status == "blocked":
        s.commit()
        raise AuthError("حساب شما مسدود شده است")
    return _open_session(s, u)


def signup(s: Session, raw_phone: str, code: str, *, name: str, role: Role, shop_name: str | None) -> SessionOut:
    phone = normalize_phone(raw_phone)
    if role == "admin":
        raise AuthError("ثبت‌نام ادمین امکان‌پذیر نیست")
    if s.query(User.id).filter(User.phone == phone).first():
        raise AuthError("این شماره قبلاً ثبت‌نام کرده؛ وارد شوید")
    if role == "seller" and not (shop_name or "").strip():
        raise AuthError("نام فروشگاه را وارد کنید")
    _consume_otp(s, phone, code)
    u = User(
        id="u" + uuid.uuid4().hex[:12], name=name.strip(), phone=phone, role=role,
        # new shops start pending until an admin verifies them
        status="pending" if role == "seller" else "active",
        seller_id=("shop-" + uuid.uuid4().hex[:8]) if role == "seller" else None,
        shop_name=shop_name.strip() if role == "seller" and shop_name else None,
    )
    s.add(u)
    s.flush()
    return _open_session(s, u)


def user_for_token(s: Session, token: str) -> User | None:
    row = s.get(AuthSession, _h(token))
    if not row or _aware(row.expires_at) < utcnow():
        return None
    u = s.get(User, row.user_id)
    return u if u and u.status != "blocked" else None


def logout(s: Session, token: str) -> None:
    s.execute(delete(AuthSession).where(AuthSession.token_hash == _h(token)))
    s.commit()


def revoke_all(s: Session, user_id: str) -> None:
    s.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
