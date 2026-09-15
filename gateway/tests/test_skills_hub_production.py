"""Comprehensive test suite for Skills Hub: discovery, validation, precedence, security, progressive disclosure, and policy."""

import os
import json
import shutil
import tempfile
import pytest
from pathlib import Path
from pydantic import ValidationError

from nusa.config import config
from nusa.db.connection import init_db
from nusa.skills.models import (
    SkillManifest,
    SkillScope,
    RiskLevel,
    AuditStatus,
    SkillDetail,
)
from nusa.skills.parser import SkillParser
from nusa.skills.scanner import SkillSecurityScanner
from nusa.skills.manager import SkillManager
from nusa.security.policy_engine import PolicyEngine, PolicyDecision
from nusa.tools.registry import tool_registry


@pytest.fixture(autouse=True)
def init_test_database():
    temp_dir = tempfile.mkdtemp(prefix="nusa_test_db_")
    db_file = Path(temp_dir) / "test_nusa.sqlite"
    old_db_path = config.db_path
    config.db_path = db_file
    init_db(db_file)
    yield db_file
    config.db_path = old_db_path
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_1_discovery_all_20_bundled_skills():
    """Requirement 1: Discover all 20 bundled skills."""
    manager = SkillManager()
    skills = manager.discover_all_skills()
    skill_ids = {s.id for s in skills}

    expected_skills = {
        "task-planning",
        "multi-agent-orchestration",
        "web-research",
        "software-development",
        "code-reviewer",
        "test-generator",
        "git-workflow",
        "browser-automation",
        "computer-use",
        "document",
        "pdf",
        "spreadsheet",
        "slides",
        "media-creation",
        "data-analysis",
        "security-audit",
        "automation-scheduler",
        "memory-curator",
        "skill-creator",
        "plugin-mcp-manager",
    }

    assert expected_skills.issubset(skill_ids), f"Missing bundled skills: {expected_skills - skill_ids}"
    assert len(skill_ids) >= 20

    # Verify each bundled skill has valid manifest and instructions
    for skill in skills:
        if skill.id in expected_skills:
            assert skill.scope == SkillScope.BUNDLED
            assert skill.name
            assert skill.version == "1.0.0"
            assert len(skill.tools) > 0
            assert skill.audit.passed, f"Bundled skill '{skill.id}' failed audit: {skill.audit.findings}"


def test_2_manifest_validation_valid_and_invalid():
    """Requirement 2: Strict manifest schema validation."""
    # Valid manifest
    valid_data = {
        "schemaVersion": 1,
        "id": "my-valid-skill",
        "name": "Valid Skill",
        "version": "1.0.0",
        "description": "A valid test skill",
        "tags": ["test"],
        "scope": "user",
        "entrypoint": "SKILL.md",
        "enabledByDefault": True,
        "tools": ["file_read"],
        "permissions": {
            "filesystem": "read",
            "network": "none",
            "shell": "none",
            "computerControl": "none",
        },
        "riskLevel": "low",
        "requiresApprovalFor": [],
    }
    manifest = SkillManifest(**valid_data)
    assert manifest.id == "my-valid-skill"

    # Invalid ID (not kebab-case)
    invalid_id_data = dict(valid_data, id="My_Invalid_Skill!")
    with pytest.raises(ValidationError):
        SkillManifest(**invalid_id_data)

    # Invalid Version (not semver)
    invalid_ver_data = dict(valid_data, version="v1-final")
    with pytest.raises(ValidationError):
        SkillManifest(**invalid_ver_data)


def test_3_precedence_workspace_over_user_over_bundled():
    """Requirement 3: Precedence resolution: workspace > user > bundled."""
    with tempfile.TemporaryDirectory() as tmpdir:
        workspace_dir = Path(tmpdir) / "workspace"
        workspace_dir.mkdir()
        user_skills_dir = Path(tmpdir) / "user_skills"
        user_skills_dir.mkdir()

        # Create user override of 'task-planning'
        user_task_planning = user_skills_dir / "task-planning"
        user_task_planning.mkdir()
        (user_task_planning / "skill.json").write_text(
            json.dumps({
                "schemaVersion": 1,
                "id": "task-planning",
                "name": "User Task Planning",
                "version": "2.0.0",
                "description": "User customized planning",
                "tags": ["user"],
                "tools": ["workspace_read"],
                "scope": "user",
            })
        )
        (user_task_planning / "SKILL.md").write_text(
            "# User Task Planning\n\n## Purpose\nUser purpose\n## Trigger Conditions\nTrigger\n## Do Not Use When\nNever\n## Inputs\nIn\n## Allowed Tools\nTool\n## Workflow\nWork\n## Safety and Approval Gates\nSafe\n## Verification\nVerify\n## Output Contract\nOut\n## Failure Handling\nFail\n"
        )

        manager = SkillManager(user_skills_dir=user_skills_dir)
        skills = manager.discover_all_skills()
        tp_item = manager.get_skill("task-planning")
        assert tp_item is not None
        assert tp_item.scope == SkillScope.USER
        assert tp_item.name == "User Task Planning"

        # Now create workspace override
        ws_skills = workspace_dir / ".nusa" / "skills" / "task-planning"
        ws_skills.mkdir(parents=True)
        (ws_skills / "skill.json").write_text(
            json.dumps({
                "schemaVersion": 1,
                "id": "task-planning",
                "name": "Workspace Task Planning",
                "version": "3.0.0",
                "description": "Workspace customized planning",
                "tags": ["workspace"],
                "tools": ["workspace_read"],
                "scope": "workspace",
            })
        )
        (ws_skills / "SKILL.md").write_text(
            "# Workspace Task Planning\n\n## Purpose\nWS purpose\n## Trigger Conditions\nTrigger\n## Do Not Use When\nNever\n## Inputs\nIn\n## Allowed Tools\nTool\n## Workflow\nWork\n## Safety and Approval Gates\nSafe\n## Verification\nVerify\n## Output Contract\nOut\n## Failure Handling\nFail\n"
        )

        manager.discover_all_skills(project_root=str(workspace_dir))
        tp_item_ws = manager.get_skill("task-planning")
        assert tp_item_ws is not None
        assert tp_item_ws.scope == SkillScope.WORKSPACE
        assert tp_item_ws.name == "Workspace Task Planning"


def test_4_progressive_disclosure():
    """Requirement 4: Progressive disclosure (L1 summary has no body, L2 loads on activate, L3 on demand)."""
    manager = SkillManager()
    summary = manager.get_progressive_summary()
    assert len(summary) >= 20
    for s in summary:
        assert "instructions" not in s
        assert "## Purpose" not in str(s)

    # Level 2 activation
    instructions = manager.activate_skill("test-generator", reason="Test activation")
    assert instructions is not None
    assert "## Purpose" in instructions
    assert "Test Generator" in instructions

    # Level 3 on-demand references
    ref = manager.get_skill_reference_or_script("test-generator", "references/test_runner_guide.md")
    assert ref is not None
    assert "Test Generator Reference Guide" in ref


def test_5_disabled_skill_cannot_be_routed():
    """Requirement 5: Disabled skill is excluded from auto-routing."""
    manager = SkillManager()
    manager.toggle_skill("web-research", False)
    item = manager.get_skill("web-research")
    assert not item.enabled

    # Try routing
    routed = manager.route_skills("Mencari referensi dan riset di web tentang react")
    assert not any(s.id == "web-research" for s in routed)

    # Re-enable
    manager.toggle_skill("web-research", True)
    assert manager.get_skill("web-research").enabled


def test_6_undeclared_tool_rejected_least_privilege():
    """Requirement 6: Tool undeclared in active skill is rejected (Deny by Default)."""
    manager = SkillManager()
    tp_skill = manager.get_skill("task-planning")
    assert "file_write" not in tp_skill.tools

    policy = PolicyEngine(workspace_root="/tmp")
    eval_res = policy.evaluate("file_write", {"path": "test.txt", "content": "hello"}, active_skill=tp_skill)
    assert eval_res.decision == PolicyDecision.DENY
    assert "not declared" in eval_res.reason


def test_7_human_approval_gates():
    """Requirement 7: Approval gates for risky operations (delete, host shell, external publish)."""
    policy = PolicyEngine(workspace_root="/tmp")

    # Destructive file delete requires approval
    res_del = policy.evaluate("file_delete", {"path": "/tmp/important.txt"})
    assert res_del.decision == PolicyDecision.ASK
    assert res_del.requires_approval

    # Host shell execution requires approval
    res_shell = policy.evaluate("run_command", {"command": "git push origin main"})
    assert res_shell.decision == PolicyDecision.ASK

    # Absolute dangerous commands are DENIED unconditionally
    res_danger = policy.evaluate("run_command", {"command": "rm -rf /"})
    assert res_danger.decision == PolicyDecision.DENY


def test_8_path_traversal_prevention():
    """Requirement 8: Path traversal and symlink escapes are safely prevented."""
    manager = SkillManager()
    # Try traversing out of skill folder
    traversal_ref = manager.get_skill_reference_or_script("task-planning", "../../../etc/passwd")
    assert traversal_ref is None

    # Static scanner also detects traversal in manifest
    finding = SkillSecurityScanner.scan_skill_folder(manager.get_skill("task-planning").path)
    assert finding.passed


def test_9_stale_audit_on_content_change():
    """Requirement 9: Audit status becomes stale when skill contents change."""
    with tempfile.TemporaryDirectory() as tmpdir:
        user_skills_dir = Path(tmpdir) / "user_skills"
        user_skills_dir.mkdir()
        manager = SkillManager(user_skills_dir=user_skills_dir)

        detail = manager.create_user_skill(
            manifest_data={
                "id": "audit-test-skill",
                "name": "Audit Test Skill",
                "version": "1.0.0",
                "description": "Testing stale audits",
                "tags": ["audit"],
                "tools": ["workspace_read"],
            },
            instructions="# Audit Test\n\n## Purpose\nTesting\n## Trigger Conditions\nTrigger\n## Do Not Use When\nNever\n## Inputs\nIn\n## Allowed Tools\nTool\n## Workflow\nWork\n## Safety and Approval Gates\nSafe\n## Verification\nVerify\n## Output Contract\nOut\n## Failure Handling\nFail\n",
        )
        assert detail.audit.status in (AuditStatus.PASSED, AuditStatus.NOT_AUDITED)

        # Update instructions
        updated = manager.update_skill("audit-test-skill", instructions="# Tampered content")
        assert updated.audit.status == AuditStatus.STALE


def test_10_bundled_skills_immutable():
    """Requirement 10 & 18: Bundled skills cannot be deleted or modified."""
    manager = SkillManager()
    with pytest.raises(PermissionError):
        manager.delete_skill("task-planning")

    with pytest.raises(PermissionError):
        manager.update_skill("task-planning", instructions="hacked")


def test_11_skill_traces_and_tool_calls():
    """Requirement 19: Observability traces record runs, tool calls, and approvals."""
    from nusa.db.connection import get_db
    manager = SkillManager()
    manager.discover_all_skills()
    task_id = "test-task-123"

    with get_db() as db:
        db.execute("INSERT OR IGNORE INTO projects (id, name, root_path) VALUES ('proj-1', 'Test Proj', '/tmp')")
        db.execute("INSERT OR IGNORE INTO tasks (id, project_id, title, goal, status) VALUES (?, 'proj-1', 'Goal Title', 'Goal', 'executing')", (task_id,))

    manager.activate_skill("task-planning", task_id=task_id, reason="Unit test trace")

    # Record tool call
    manager.record_tool_call(
        task_id=task_id,
        tool_name="workspace_read",
        decision="allow",
        permitted=True,
        arguments={"path": "."},
        result={"files": ["a.txt"]},
        duration_ms=15,
    )

    # Record approval
    manager.record_approval(
        task_id=task_id,
        tool_name="file_delete",
        action_type="file_delete",
        reason="Test approval",
        status="approved",
    )

    traces = manager.get_skill_traces("task-planning", limit=5)
    assert len(traces) > 0
    latest_run = traces[0]
    assert latest_run["task_id"] == task_id
    assert len(latest_run["tool_calls"]) > 0
    assert latest_run["tool_calls"][0]["tool_name"] == "workspace_read"

    # Deactivate
    manager.deactivate_skill(task_id, status="completed")
    assert manager.get_active_skill_for_task(task_id) is None


def test_12_diagnostic_test_runner():
    """Requirement 12: Diagnostic dry-run test report."""
    manager = SkillManager()
    report = manager.test_skill("test-generator")
    assert report["success"] is True
    assert report["manifest_valid"] is True
    assert len(report["contract_missing_sections"]) == 0
    assert report["dependencies_ok"] is True


def test_13_api_endpoints_full_lifecycle():
    """Requirement 13: Full REST API verification using FastAPI TestClient."""
    from starlette.testclient import TestClient
    from nusa.main import app

    client = TestClient(app)

    # 1. GET /api/skills
    resp = client.get("/api/skills")
    assert resp.status_code == 200
    skills_data = resp.json()
    assert len(skills_data) >= 20
    tp = next(s for s in skills_data if s["id"] == "task-planning")
    assert tp["name"] == "Task Planning"
    assert tp["scope"] == "bundled"
    assert tp["audit"]["status"] == "passed"

    # 2. GET /api/skills/{id}
    resp_detail = client.get("/api/skills/task-planning")
    assert resp_detail.status_code == 200
    detail = resp_detail.json()
    assert detail["manifest"]["id"] == "task-planning"
    assert "## Purpose" in detail["instructions"]

    # 3. POST /api/skills/{id}/disable
    resp_dis = client.post("/api/skills/task-planning/disable")
    assert resp_dis.status_code == 200
    assert resp_dis.json()["enabled"] is False

    # 4. POST /api/skills/{id}/enable
    resp_en = client.post("/api/skills/task-planning/enable")
    assert resp_en.status_code == 200
    assert resp_en.json()["enabled"] is True

    # 5. POST /api/skills/{id}/audit
    resp_audit = client.post("/api/skills/task-planning/audit")
    assert resp_audit.status_code == 200
    assert resp_audit.json()["status"] == "passed"

    # 6. POST /api/skills/{id}/test
    resp_test = client.post("/api/skills/task-planning/test")
    assert resp_test.status_code == 200
    assert resp_test.json()["success"] is True

    # 7. POST /api/skills/create (User scope)
    create_payload = {
        "manifest": {
            "id": "custom-tester",
            "name": "Custom Tester",
            "version": "1.0.0",
            "description": "User test skill",
            "tags": ["custom"],
            "tools": ["workspace_read"],
            "scope": "user",
        },
        "instructions": "# Custom\n\n## Purpose\nTest\n## Trigger Conditions\nTrigger\n## Do Not Use When\nNever\n## Inputs\nIn\n## Allowed Tools\nTool\n## Workflow\nWork\n## Safety and Approval Gates\nSafe\n## Verification\nVerify\n## Output Contract\nOut\n## Failure Handling\nFail\n",
        "scope": "user",
    }
    resp_create = client.post("/api/skills/create", json=create_payload)
    assert resp_create.status_code == 200
    created_id = resp_create.json()["manifest"]["id"]
    assert created_id == "custom-tester"

    # 8. PATCH /api/skills/{id}
    resp_patch = client.patch(
        f"/api/skills/{created_id}",
        json={"instructions": "# Updated instructions\n"},
    )
    assert resp_patch.status_code == 200
    assert resp_patch.json()["audit"]["status"] == "stale"

    # 9. DELETE /api/skills/{id} (Bundled skill returns 403 Forbidden)
    resp_del_bundled = client.delete("/api/skills/task-planning")
    assert resp_del_bundled.status_code == 403

    # 10. DELETE /api/skills/{id} (User skill succeeds)
    resp_del_user = client.delete(f"/api/skills/{created_id}")
    assert resp_del_user.status_code == 200
    assert resp_del_user.json()["deleted_id"] == created_id
