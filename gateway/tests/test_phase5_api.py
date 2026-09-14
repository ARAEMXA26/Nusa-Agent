"""Tests for Phase 5 REST API routes: Memory, Profiles, and Cron."""

from fastapi.testclient import TestClient
from nusa.main import app

client = TestClient(app)


def test_api_profiles_flow():
    # 1. List profiles
    res = client.get("/api/profiles")
    assert res.status_code == 200
    data = res.json()
    assert "profiles" in data
    assert len(data["profiles"]) >= 3

    # 2. Get active profile
    active_res = client.get("/api/profiles/active")
    assert active_res.status_code == 200
    active = active_res.json()
    assert "name" in active

    # 3. Create a profile
    create_res = client.post(
        "/api/profiles",
        json={"name": "test-analyst", "description": "API Test Profile"},
    )
    assert create_res.status_code == 200
    assert create_res.json()["profile"]["name"] == "test-analyst"

    # 4. Switch active profile
    switch_res = client.post("/api/profiles/active", json={"name": "test-analyst"})
    assert switch_res.status_code == 200
    assert switch_res.json()["active_profile"]["name"] == "test-analyst"


def test_api_memory_flow():
    # 1. Store memory
    store_res = client.post(
        "/api/memory",
        json={
            "key": "api_test_key",
            "value": "Important API guideline: REST idempotency",
            "scope": "global",
        },
    )
    assert store_res.status_code == 200
    assert store_res.json()["success"] is True

    # 2. Search memory
    search_res = client.get("/api/memory?query=idempotency")
    assert search_res.status_code == 200
    items = search_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["key"] == "api_test_key"

    # 3. Memory context snippet
    ctx_res = client.get("/api/memory/context")
    assert ctx_res.status_code == 200
    assert "api_test_key" in ctx_res.json()["context"]

    # 4. Delete memory
    del_res = client.delete("/api/memory/api_test_key")
    assert del_res.status_code == 200


def test_api_cron_flow():
    # 1. Create a cron job
    c_res = client.post(
        "/api/cron/jobs",
        json={
            "title": "API Test Scheduled Job",
            "prompt": "Run automated linting check",
            "cron_expr": "@hourly",
            "enabled": True,
        },
    )
    assert c_res.status_code == 200
    job_id = c_res.json()["job"]["id"]

    # 2. List jobs
    list_res = client.get("/api/cron/jobs")
    assert list_res.status_code == 200
    assert any(j["id"] == job_id for j in list_res.json()["jobs"])

    # 3. Toggle job
    toggle_res = client.post(f"/api/cron/jobs/{job_id}/toggle", json={"enabled": False})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["job"]["enabled"] is False

    # 4. Trigger run now
    run_res = client.post(f"/api/cron/jobs/{job_id}/run")
    assert run_res.status_code == 200
    assert run_res.json()["run"]["status"] == "success"

    # 5. Check run history
    runs_res = client.get(f"/api/cron/jobs/{job_id}/runs")
    assert runs_res.status_code == 200
    assert len(runs_res.json()["runs"]) >= 1

    # 6. Delete job
    del_res = client.delete(f"/api/cron/jobs/{job_id}")
    assert del_res.status_code == 200
