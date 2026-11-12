import os
import tempfile

# isolated DB + deterministic offline assistant — must be set before importing the app
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db".replace("\\", "/")
os.environ["AI_MODE"] = "off"
os.environ["OTP_RESEND_SECONDS"] = "0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ADMIN, SELLER, CUSTOMER = "09120000001", "09120000002", "09120000003"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def login(client, phone: str) -> dict[str, str]:
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    token = client.post("/api/v1/auth/login", json={"phone": phone, "code": code}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user(client):
    """The seeded demo customer (has the 4-car demo garage)."""
    return login(client, CUSTOMER)


@pytest.fixture
def seller(client):
    return login(client, SELLER)


@pytest.fixture
def admin(client):
    return login(client, ADMIN)
