"""End-to-End integration test for Phase 1 Vertical Slice."""

import asyncio
import uuid
import pytest
from nusa.db.connection import get_db
from nusa.core.orchestrator import orchestrator
from nusa.core.state_machine import TaskState
from nusa.artifacts.manager import artifact_manager


@pytest.mark.asyncio
async def test_vertical_slice_complete_flow(temp_workspace, test_db):
    """
    Test the full Phase 1 Thin Vertical Slice:
    1. Create Project.
    2. Write buggy code and test in workspace.
    3. Create Task.
    4. Orchestrator executes planning -> reads file.
    5. Proposes patch -> enters awaiting_approval.
    6. User approves patch.
    7. Patch applied to real file on disk.
    8. Real verification test executed.
    9. Artifacts (Diff & Test Report) created.
    10. Task marked completed.
    """
    # 1. Prepare buggy project in workspace
    (temp_workspace / "main.py").write_text("def calculate(a, b):\n    return a - b\n")
    (temp_workspace / "test_main.py").write_text(
        "from main import calculate\nassert calculate(2, 3) == 5\nprint('TEST PASSED')\n"
    )

    project_id = str(uuid.uuid4())
    with get_db() as db:
        db.execute(
            "INSERT INTO projects (id, name, root_path, default_model) VALUES (?, ?, ?, 'deterministic')",
            (project_id, "Calculator Project", str(temp_workspace)),
        )

    # 2. Create Task
    task_id = str(uuid.uuid4())
    goal = "Fix the calculate function in main.py so that test_main.py passes"
    with get_db() as db:
        db.execute(
            "INSERT INTO tasks (id, project_id, title, goal, status) VALUES (?, ?, ?, ?, 'queued')",
            (task_id, project_id, "Fix calculation bug", goal),
        )

    # 3. Start task in background
    task_task = asyncio.create_task(orchestrator.start_task(task_id))

    # 4. Wait until the task reaches AWAITING_APPROVAL
    for _ in range(50):
        await asyncio.sleep(0.1)
        state = orchestrator.get_state(task_id)
        if state == TaskState.AWAITING_APPROVAL:
            break
    assert orchestrator.get_state(task_id) == TaskState.AWAITING_APPROVAL

    # 5. Verify approval record exists in DB
    with get_db() as db:
        approval = db.execute(
            "SELECT * FROM approvals WHERE task_id = ? AND status = 'pending'", (task_id,)
        ).fetchone()
        assert approval is not None
        assert approval["action_type"] == "file_patch"
        approval_id = approval["id"]

    # 6. User approves the action
    resolved = orchestrator.resolve_approval(approval_id, "approved")
    assert resolved is True

    # 7. Wait for task completion
    for _ in range(50):
        await asyncio.sleep(0.1)
        state = orchestrator.get_state(task_id)
        if state == TaskState.COMPLETED:
            break
    assert orchestrator.get_state(task_id) == TaskState.COMPLETED

    # 8. Verify the file was actually patched on disk
    patched_content = (temp_workspace / "main.py").read_text()
    assert "return a + b" in patched_content

    # 9. Verify artifacts were generated
    artifacts = artifact_manager.get_task_artifacts(task_id)
    assert len(artifacts) >= 2

    diff_artifact = next((a for a in artifacts if a.type == "diff"), None)
    assert diff_artifact is not None
    assert "+    return a + b" in diff_artifact.content

    test_artifact = next((a for a in artifacts if a.type == "test_report"), None)
    assert test_artifact is not None
    assert test_artifact.verification_status == "verified"
    assert "Passed: True" in test_artifact.content

    # 10. Verify audit events were recorded
    with get_db() as db:
        audit_logs = db.execute("SELECT * FROM audit_events WHERE task_id = ?", (task_id,)).fetchall()
        assert len(audit_logs) >= 1
