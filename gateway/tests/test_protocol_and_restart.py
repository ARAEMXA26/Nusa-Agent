"""Tests for API protocol, restart recovery, and mid-turn steering."""

import uuid
import pytest
from fastapi.testclient import TestClient
from nusa.main import app
from nusa.db.connection import get_db, init_db
from nusa.core.orchestrator import orchestrator


def test_api_project_and_task_crud(temp_workspace, test_db):
    client = TestClient(app)

    # 1. Create project
    res_proj = client.post(
        "/api/projects",
        json={"name": "API Test Project", "root_path": str(temp_workspace)},
    )
    assert res_proj.status_code == 200
    proj_data = res_proj.json()
    assert proj_data["name"] == "API Test Project"
    project_id = proj_data["id"]

    # 2. List projects
    res_list = client.get("/api/projects")
    assert res_list.status_code == 200
    assert any(p["id"] == project_id for p in res_list.json())

    # 3. Create task
    (temp_workspace / "main.py").write_text("def calculate(a, b):\n    return a - b\n")
    (temp_workspace / "test_main.py").write_text("from main import calculate\nassert calculate(1, 1) == 2\n")

    res_task = client.post(
        "/api/tasks",
        json={"project_id": project_id, "goal": "Fix main.py", "title": "Test Task"},
    )
    assert res_task.status_code == 200
    task_data = res_task.json()
    task_id = task_data["id"]

    # 4. Fetch task details
    res_details = client.get(f"/api/tasks/{task_id}")
    assert res_details.status_code == 200
    assert res_details.json()["id"] == task_id


def test_state_persistence_and_restart_recovery(temp_workspace, test_db):
    """Simulate app shutdown and restart: data in SQLite must be fully recoverable."""
    # Insert completed task record
    proj_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())
    with get_db() as db:
        db.execute(
            "INSERT INTO projects (id, name, root_path) VALUES (?, 'Restart Test', ?)",
            (proj_id, str(temp_workspace)),
        )
        db.execute(
            "INSERT INTO tasks (id, project_id, title, goal, status) VALUES (?, ?, 'Task Prior To Restart', 'Build feature', 'completed')",
            (task_id, proj_id),
        )
        db.execute(
            "INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, 'assistant', 'Task finished before restart')",
            (str(uuid.uuid4()), task_id),
        )

    # Re-initialize DB (simulating restart)
    init_db(test_db)

    client = TestClient(app)
    res = client.get(f"/api/tasks/{task_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert len(data["messages"]) == 1
    assert data["messages"][0]["content"] == "Task finished before restart"
