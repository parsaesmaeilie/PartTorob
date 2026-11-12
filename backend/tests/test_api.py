def test_demo_garage_is_seeded(client, user):
    g = client.get("/api/v1/garage", headers=user).json()
    assert len(g["vehicles"]) == 4 and g["activeVehicleId"] == g["vehicles"][0]["vehicle"]["id"]
    assert any(s["status"] != "ok" for s in g["vehicles"][0]["services"])  # demo 206 has services coming due


def test_max_four_vehicles(client, user):
    body = {"modelId": "pride-131", "year": 1395, "odometerKm": 1000}
    r = client.post("/api/v1/garage/vehicles", json=body, headers=user)
    assert r.status_code == 422 and "۴" in r.json()["detail"]


def test_odometer_never_decreases_and_service_resets_reminder(client, user):
    g = client.get("/api/v1/garage", headers=user).json()
    v = g["vehicles"][0]
    vid, km = v["vehicle"]["id"], v["vehicle"]["odometerKm"]
    assert client.patch(f"/api/v1/garage/vehicles/{vid}/odometer", json={"km": km - 1}, headers=user).status_code == 422
    assert client.post(f"/api/v1/garage/vehicles/{vid}/services", json={"serviceId": "brake-pad", "km": km}, headers=user).status_code == 201
    pad = next(s for s in client.get("/api/v1/garage", headers=user).json()["vehicles"][0]["services"] if s["serviceId"] == "brake-pad")
    assert pad["status"] == "ok" and not pad["estimated"]


def test_click_out_redirects_to_seller_and_is_logged(client, user):
    r = client.get("/api/v1/search", params={"q": "لنت جلو"}, headers=user).json()["results"][0]
    pid = r["product"]["id"]
    for o in r["product"]["offers"]:  # every shop selling the product is reachable
        out = client.get(f"/api/v1/go/{pid}/{o['sellerId']}", params={"src": "test"}, headers=user).json()
        assert out["url"] == o["url"] and out["priceToman"] == o["priceToman"]
        assert client.get(f"/api/v1/go/{pid}/nope", headers=user).status_code == 404


def test_search_can_ignore_the_garage_car(client, user):
    mine = client.get("/api/v1/search", params={"q": "لنت جلو"}, headers=user).json()
    anyc = client.get("/api/v1/search", params={"q": "لنت جلو", "any_car": True}, headers=user).json()
    assert mine["vehicleId"] == "peugeot-206-t5" and mine["activeVehicleTitle"]
    assert anyc["vehicleId"] is None and anyc["anyCar"] is True
    assert len(anyc["results"]) > len(mine["results"])  # pads for every car, not only the 206
    named = client.get("/api/v1/search", params={"q": "لنت جلو سمند", "any_car": True}, headers=user).json()
    assert named["vehicleId"] == "samand-lx"  # a car typed in the query still applies


def test_assistant_offline_grounded_in_catalog(client, user):
    r = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "user", "content": "روغن موتور برای پراید"}]}, headers=user).json()
    assert r["mode"] == "offline" and r["products"]
    assert r["products"][0]["title"] in r["text"]


def test_product_detail_wire_keys(client, user):
    pid = client.get("/api/v1/search", params={"q": "لنت"}, headers=user).json()["results"][0]["product"]["id"]
    d = client.get(f"/api/v1/products/{pid}", headers=user).json()
    assert isinstance(d["trend30d"], float)  # frontend contract (was serialized as trend30D)
