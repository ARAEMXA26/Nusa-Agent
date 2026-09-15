import pytest
from pathlib import Path
from starlette.testclient import TestClient
from nusa.main import app
from nusa.api.routes_workspace import set_current_workspace

client = TestClient(app)

def test_workspace_open_and_current(tmp_path):
    # Setup test workspace
    test_repo = tmp_path / "my_project"
    test_repo.mkdir()
    (test_repo / "package.json").write_text('{"name": "test-pkg"}', encoding="utf-8")
    (test_repo / "tsconfig.json").write_text('{}', encoding="utf-8")

    # Open workspace
    res = client.post("/api/workspace/open", json={"root_path": str(test_repo), "name": "My Project"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "open"
    assert data["name"] == "My Project"
    assert "nodejs" in data["project_types"]
    assert "typescript" in data["project_types"]

    # Get current workspace info
    res_curr = client.get("/api/workspace/current")
    assert res_curr.status_code == 200
    assert res_curr.json()["root_path"] == str(test_repo)


def test_workspace_tree_and_file_crud(tmp_path):
    test_repo = tmp_path / "crud_project"
    test_repo.mkdir()
    (test_repo / "src").mkdir()
    (test_repo / "src" / "index.ts").write_text("console.log('hello');", encoding="utf-8")

    set_current_workspace(str(test_repo))

    # Read tree
    res_tree = client.get("/api/workspace/tree?path=.")
    assert res_tree.status_code == 200
    entries = res_tree.json()["entries"]
    names = [e["name"] for e in entries]
    assert "src" in names

    # Read file
    res_file = client.get("/api/workspace/file?path=src/index.ts")
    assert res_file.status_code == 200
    assert res_file.json()["content"] == "console.log('hello');"

    # Write file
    res_write = client.post("/api/workspace/file", json={"path": "src/index.ts", "content": "console.log('updated');"})
    assert res_write.status_code == 200
    assert res_write.json()["success"] is True
    assert (test_repo / "src" / "index.ts").read_text() == "console.log('updated');"

    # Create new file
    res_create = client.post("/api/workspace/create", json={"path": "src/utils.ts", "is_dir": False})
    assert res_create.status_code == 200
    assert (test_repo / "src" / "utils.ts").exists()

    # Rename item
    res_rename = client.post("/api/workspace/rename", json={"old_path": "src/utils.ts", "new_path": "src/helpers.ts"})
    assert res_rename.status_code == 200
    assert (test_repo / "src" / "helpers.ts").exists()
    assert not (test_repo / "src" / "utils.ts").exists()

    # Delete item
    res_delete = client.delete("/api/workspace/file?path=src/helpers.ts")
    assert res_delete.status_code == 200
    assert not (test_repo / "src" / "helpers.ts").exists()


def test_path_traversal_protection(tmp_path):
    test_repo = tmp_path / "jailed_project"
    test_repo.mkdir()
    set_current_workspace(str(test_repo))

    # Attempt to read outside workspace root
    res_bad = client.get("/api/workspace/file?path=../../etc/passwd")
    assert res_bad.status_code in [400, 403]
