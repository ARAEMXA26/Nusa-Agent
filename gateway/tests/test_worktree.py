"""Tests for Git Worktree isolation, merging, and cleanup."""

import subprocess
import pytest
from pathlib import Path
from nusa.security.worktree import WorktreeManager, WorktreeError


@pytest.fixture
def git_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-b", "main"], cwd=str(repo), check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Nusa Tester"], cwd=str(repo), check=True)
    subprocess.run(["git", "config", "user.email", "tester@nusa.local"], cwd=str(repo), check=True)

    # Initial commit
    (repo / "README.md").write_text("# Test Repo\n")
    subprocess.run(["git", "add", "."], cwd=str(repo), check=True)
    subprocess.run(["git", "commit", "-m", "initial commit"], cwd=str(repo), check=True)
    return repo


@pytest.mark.asyncio
async def test_is_git_repo(git_repo: Path, tmp_path: Path):
    assert await WorktreeManager.is_git_repo(git_repo) is True
    non_repo = tmp_path / "non_repo"
    non_repo.mkdir()
    assert await WorktreeManager.is_git_repo(non_repo) is False


@pytest.mark.asyncio
async def test_create_and_isolate_worktree(git_repo: Path):
    branch_name = "test-agent-branch"
    wt_path = await WorktreeManager.create_worktree(git_repo, branch_name)

    assert wt_path.exists()
    assert (wt_path / "README.md").exists()

    # Mutation in worktree
    (wt_path / "feature.py").write_text("def hello(): return 'isolated'\n")
    subprocess.run(["git", "add", "."], cwd=str(wt_path), check=True)
    subprocess.run(["git", "commit", "-m", "feature commit in worktree"], cwd=str(wt_path), check=True)

    # Verify main repo does NOT see feature.py yet
    assert not (git_repo / "feature.py").exists()

    # Merge worktree changes to main
    merge_res = await WorktreeManager.merge_worktree(git_repo, branch_name, target_branch="main")
    assert merge_res["success"] is True

    # Main repo now has feature.py
    assert (git_repo / "feature.py").exists()
    assert (git_repo / "feature.py").read_text() == "def hello(): return 'isolated'\n"

    # Cleanup worktree
    cleaned = await WorktreeManager.cleanup_worktree(git_repo, wt_path, branch_name)
    assert cleaned is True
    assert not wt_path.exists()
