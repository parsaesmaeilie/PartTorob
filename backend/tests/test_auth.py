from tests.conftest import CUSTOMER, login


def test_protected_routes_need_a_session(client):
    assert client.get("/api/v1/garage").status_code == 401
    assert client.get("/api/v1/garage", headers={"Authorization": "Bearer forged"}).status_code == 401


def test_otp_login_flow_and_persian_digits(client):
    sent = client.post("/api/v1/auth/otp", json={"phone": "۰۹۱۲۰۰۰۰۰۰۳"}).json()
    assert sent["phone"] == CUSTOMER and sent["isRegistered"] and len(sent["devCode"]) == 5
    bad = client.post("/api/v1/auth/login", json={"phone": CUSTOMER, "code": "00000" if sent["devCode"] != "00000" else "11111"})
    assert bad.status_code == 422
    ok = client.post("/api/v1/auth/login", json={"phone": CUSTOMER, "code": sent["devCode"]}).json()
    assert ok["role"] == "customer" and ok["token"]
    # single use
    assert client.post("/api/v1/auth/login", json={"phone": CUSTOMER, "code": sent["devCode"]}).status_code == 422


def test_otp_locks_after_too_many_wrong_codes(client):
    phone = "09121112233"
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    wrong = "99999" if code != "99999" else "88888"
    for _ in range(5):
        client.post("/api/v1/auth/signup", json={"phone": phone, "code": wrong, "name": "تست"})
    r = client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "تست"})
    assert r.status_code == 422  # even the right code is refused now


def test_invalid_phone_rejected(client):
    assert client.post("/api/v1/auth/otp", json={"phone": "12345"}).status_code == 422


def test_signup_customer_starts_with_empty_garage(client):
    phone = "09351234567"
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    s = client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "سارا"}).json()
    h = {"Authorization": f"Bearer {s['token']}"}
    assert s["role"] == "customer" and client.get("/api/v1/garage", headers=h).json()["vehicles"] == []
    # duplicate phone
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    assert client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "x2"}).status_code == 422


def test_cannot_sign_up_as_admin(client):
    phone = "09359990000"
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    assert client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "هکر", "role": "admin"}).status_code == 422


def test_logout_revokes_session(client):
    h = login(client, CUSTOMER)
    assert client.get("/api/v1/auth/me", headers=h).status_code == 200
    client.post("/api/v1/auth/logout", headers=h)
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_guests_can_search_view_compare_and_buy(client):
    r = client.get("/api/v1/search", params={"q": "لنت جلو"})
    assert r.status_code == 200 and r.json()["results"] and r.json()["vehicleId"] is None
    p = r.json()["results"][0]
    d = client.get(f"/api/v1/products/{p['product']['id']}").json()
    assert d["garageFits"] == [] and d["fit"]["status"] == "unknown"
    assert client.get("/api/v1/products", params={"ids": p["product"]["id"]}).status_code == 200
    out = client.get(f"/api/v1/go/{p['product']['id']}/{p['bestOffer']['sellerId']}")
    assert out.status_code == 200 and out.json()["url"]
    assert client.get("/api/v1/garage").status_code == 401  # personal pages still need login
