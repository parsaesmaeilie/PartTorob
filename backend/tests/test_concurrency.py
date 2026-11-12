from concurrent.futures import ThreadPoolExecutor


def test_parallel_page_requests(client, user):
    """A page render fires /me, /garage, /meta in parallel."""
    with ThreadPoolExecutor(6) as pool:
        codes = list(pool.map(lambda p: client.get(p, headers=user).status_code, ["/api/v1/me", "/api/v1/garage", "/api/v1/meta"] * 2))
    assert codes == [200] * 6
