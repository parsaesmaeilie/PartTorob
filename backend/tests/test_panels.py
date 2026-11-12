from tests.conftest import login


def test_roles_are_enforced(client, user, seller):
    assert client.get("/api/v1/admin/overview", headers=user).status_code == 403
    assert client.get("/api/v1/admin/overview", headers=seller).status_code == 403
    assert client.get("/api/v1/seller/dashboard", headers=user).status_code == 403


def test_seller_dashboard_and_price_edit_changes_ranking(client, seller, user):
    d = client.get("/api/v1/seller/dashboard", headers=seller).json()
    assert d["sellerId"] == "yadakpart" and d["listings"] and "clicks7d" in d
    target = next(x for x in d["listings"] if not x["isCheapest"] and x["suggestedPrice"])
    r = client.patch(f"/api/v1/seller/offers/{target['productId']}", json={"priceToman": target["suggestedPrice"], "inStock": True}, headers=seller)
    assert r.status_code == 200
    p = client.get(f"/api/v1/products/{target['productId']}", headers=user).json()["product"]
    cheapest_live = next(o for o in p["offers"] if o["inStock"])
    assert cheapest_live["sellerId"] == "yadakpart"  # now the cheapest in-stock shop for shoppers
    after = next(x for x in client.get("/api/v1/seller/dashboard", headers=seller).json()["listings"] if x["productId"] == target["productId"])
    assert after["isCheapest"] and after["edited"]


def test_seller_price_typo_guard(client, seller):
    item = client.get("/api/v1/seller/dashboard", headers=seller).json()["listings"][0]
    r = client.patch(f"/api/v1/seller/offers/{item['productId']}", json={"priceToman": item["myPrice"] * 10}, headers=seller)
    assert r.status_code == 422


def test_new_seller_is_pending_until_admin_approves(client, admin):
    phone = "09191234567"
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    s = client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "مینا", "role": "seller", "shopName": "قطعه‌سرا"}).json()
    assert s["role"] == "seller" and s["status"] == "pending"
    ov = client.get("/api/v1/admin/overview", headers=admin).json()
    assert ov["pendingSellers"] >= 1
    shop = next(x for x in ov["shops"] if x["ownerPhone"] == phone)
    assert shop["status"] == "pending" and shop["source"] == "registered"
    assert client.patch(f"/api/v1/admin/users/{s['userId']}/status", json={"status": "active"}, headers=admin).status_code == 200
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {s['token']}"}).json()
    assert me["status"] == "active"


def test_blocking_a_user_kicks_them_out(client, admin):
    phone = "09130001122"
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    s = client.post("/api/v1/auth/signup", json={"phone": phone, "code": code, "name": "بلاک"}).json()
    client.patch(f"/api/v1/admin/users/{s['userId']}/status", json={"status": "blocked"}, headers=admin)
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {s['token']}"}).status_code == 401
    code = client.post("/api/v1/auth/otp", json={"phone": phone}).json()["devCode"]
    assert client.post("/api/v1/auth/login", json={"phone": phone, "code": code}).status_code == 422


def test_admin_overview_counts_clicks(client, admin, user):
    r = client.get("/api/v1/search", params={"q": "روغن"}, headers=user).json()["results"][0]
    client.get(f"/api/v1/go/{r['product']['id']}/{r['bestOffer']['sellerId']}", headers=user)
    ov = client.get("/api/v1/admin/overview", headers=admin).json()
    assert ov["totalClicks"] >= 1 and ov["daily"][-1]["clicks"] >= 1 and ov["topProducts"]
    assert {"admin", "seller", "customer"} <= set(ov["usersByRole"])
    assert client.get("/api/v1/admin/ingestion", headers=admin).status_code == 200


def test_admin_cannot_be_blocked(client, admin):
    me = client.get("/api/v1/auth/me", headers=admin).json()
    assert client.patch(f"/api/v1/admin/users/{me['id']}/status", json={"status": "blocked"}, headers=admin).status_code == 422
    assert login(client, "09120000001")  # still able to log in
