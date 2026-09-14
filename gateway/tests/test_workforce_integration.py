"""Integration tests for Workforce DAG orchestration, subagent execution, and API endpoints."""

import subprocess
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from nusa.main import app
from nusa.workforce.planner import WorkforcePlanner
from nusa.workforce.manager import workforce_manager
from nusa.workforce.dag import SubtaskStatus
from nusa.db.connection import get_db


@pytest.fixture
def git_workspace(tmp_path: Path) -> Path:
    ws = tmp_path / "workforce_ws"
    ws.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=str(ws), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Tester"], cwd=str(ws), check=True)
    subprocess.run(["git", "config", "user.email", "test@nusa.local"], cwd=str(ws), check=True)

    # Initial code file
    (ws / "math_lib.py").write_text("def add(a, b):\n    return a - b\n")
    (ws / "test_math.py").write_text("from math_lib import add\ndef test_add():\n    assert add(2, 3) == 5\n")

    subprocess.run(["git", "add", "."], cwd=str(ws), check=True)
    subprocess.run(["git", "commit", "-m", "initial math commit"], cwd=str(ws), check=True)
    return ws


@pytest.mark.asyncio
async def test_standard_workforce_dag_execution(git_workspace: Path, test_db):
    parent_task_id = "test-task-wf-101"
    goal = "Fix the add function in math_lib.py and verify tests pass."

    # Insert parent project and task to satisfy foreign key constraints
    with get_db() as db:
        db.execute(
            "INSERT INTO projects (id, name, root_path, default_model) VALUES (?, ?, ?, ?)",
            ("proj-wf-1", "WF Proj", str(git_workspace), "deterministic"),
        )
        db.execute(
            "INSERT INTO tasks (id, project_id, title, goal, status) VALUES (?, ?, ?, ?, ?)",
            (parent_task_id, "proj-wf-1", "Test Task", goal, "executing"),
        )

    dag = WorkforcePlanner.generate_standard_dag(parent_task_id=parent_task_id, goal=goal)
    assert len(dag.nodes) == 4

    result = await workforce_manager.execute_dag(
        dag=dag,
        workspace_root=str(git_workspace),
        model_name="deterministic",
        use_worktree_isolation=True,
    )

    assert result["success"] is True
    assert dag.is_all_completed() is True
    assert all(n.status == SubtaskStatus.COMPLETED for n in dag.nodes.values())


from unittest.mock import patch

def test_workforce_api_endpoints(temp_workspace: Path, test_db):
    task_id = "api-task-wf-99"
    goal = "Build authentication system"

    with get_db() as db:
        db.execute(
            "INSERT INTO projects (id, name, root_path, default_model) VALUES (?, ?, ?, ?)",
            ("proj-api-99", "API Proj", str(temp_workspace), "deterministic"),
        )
        db.execute(
            "INSERT INTO tasks (id, project_id, title, goal, status) VALUES (?, ?, ?, ?, ?)",
            (task_id, "proj-api-99", "API Task", goal, "queued"),
        )

    client = TestClient(app)

    with patch("nusa.workforce.manager.workforce_manager.execute_dag") as mock_exec:
        # 1. Trigger DAG plan
        plan_res = client.post(
            f"/api/tasks/{task_id}/dag/plan",
            json={"use_worktree": False},
        )
        assert plan_res.status_code == 200
        data = plan_res.json()
        assert data["parent_task_id"] == task_id
        assert len(data["dag"]["nodes"]) == 4

        # 2. Query DAG state
        dag_res = client.get(f"/api/tasks/{task_id}/dag")
        assert dag_res.status_code == 200
        dag_data = dag_res.json()
        assert dag_data["parent_task_id"] == task_id
        assert len(dag_data["nodes"]) >= 4

        # 3. Test cancel DAG endpoint
        cancel_res = client.post(f"/api/tasks/{task_id}/dag/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["task_id"] == task_id
