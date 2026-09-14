"""API tests for Browser routes."""

from fastapi.testclient import TestClient
from nusa.main import app

client = TestClient(app)


def test_browser_api_status_and_close():
    # 1. Check status
    res = client.get("/api/browser/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_open" in data
    assert "url" in data
    assert "title" in data

    # 2. Close session
    res_close = client.post("/api/browser/close")
    assert res_close.status_code == 200
    assert "closed" in res_close.json()["message"]
