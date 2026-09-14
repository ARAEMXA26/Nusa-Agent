"""Git Worktree Manager for isolated sub-agent workspace execution."""

import asyncio
import logging
import shutil
from pathlib import Path
from typing import Any
from nusa.security.path_jail import PathJail

logger = logging.getLogger(__name__)


class WorktreeError(Exception):
    pass


class WorktreeManager:
    """Manages ephemeral Git worktrees to isolate agent mutations from user's primary tree."""

    @staticmethod
    async def _run_git(repo_root: Path, args: list[str]) -> tuple[int, str, str]:
        proc = await asyncio.create_subprocess_exec(
            "git",
            *args,
            cwd=str(repo_root),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        return proc.returncode or 0, stdout.decode("utf-8", errors="replace"), stderr.decode("utf-8", errors="replace")

    @classmethod
    async def is_git_repo(cls, repo_root: Path) -> bool:
        code, out, _ = await cls._run_git(repo_root, ["rev-parse", "--is-inside-work-tree"])
        return code == 0 and out.strip() == "true"

    @classmethod
    async def get_current_branch(cls, repo_root: Path) -> str:
        code, out, _ = await cls._run_git(repo_root, ["rev-parse", "--abbrev-ref", "HEAD"])
        if code == 0 and out.strip():
            return out.strip()
        return "main"

    @classmethod
    async def create_worktree(
        cls, repo_root: Path, branch_name: str, base_branch: str | None = None
    ) -> Path:
        """Create an ephemeral worktree under `<repo_root>/.nusa/worktrees/<branch_name>`."""
        repo_root = repo_root.resolve()
        if not await cls.is_git_repo(repo_root):
            raise WorktreeError(f"Directory {repo_root} is not a valid Git repository.")

        base = base_branch or await cls.get_current_branch(repo_root)
        worktrees_base = repo_root / ".nusa" / "worktrees"
        worktrees_base.mkdir(parents=True, exist_ok=True)
        worktree_path = worktrees_base / branch_name

        # Ensure worktree directory is safe and inside workspace
        jail = PathJail(repo_root)
        safe_wt = jail.resolve_safe(worktree_path)

        # Remove existing worktree dir if leftover
        if safe_wt.exists():
            await cls.cleanup_worktree(repo_root, safe_wt, branch_name)

        # Create branch & worktree: git worktree add -b <branch_name> <worktree_path> <base>
        code, out, err = await cls._run_git(
            repo_root,
            ["worktree", "add", "-b", branch_name, str(safe_wt), base],
        )
        if code != 0:
            # Maybe branch already exists? Try adding without -b
            code2, out2, err2 = await cls._run_git(
                repo_root,
                ["worktree", "add", str(safe_wt), branch_name],
            )
            if code2 != 0:
                raise WorktreeError(f"Failed to create worktree: {err or err2}")

        logger.info(f"Created isolated worktree at {safe_wt} on branch {branch_name}")
        return safe_wt

    @classmethod
    async def merge_worktree(
        cls, repo_root: Path, branch_name: str, target_branch: str | None = None
    ) -> dict[str, Any]:
        """Merge the changes from ephemeral branch back into target_branch."""
        repo_root = repo_root.resolve()
        target = target_branch or await cls.get_current_branch(repo_root)

        # 1. Switch to target branch in main repo if not already
        current = await cls.get_current_branch(repo_root)
        if current != target:
            code, _, err = await cls._run_git(repo_root, ["checkout", target])
            if code != 0:
                return {"success": False, "error": f"Failed to checkout {target}: {err}"}

        # 2. Merge branch_name
        code, out, err = await cls._run_git(
            repo_root,
            ["merge", "--no-ff", "-m", f"Merge agent worktree {branch_name}", branch_name],
        )
        if code != 0:
            # Abort merge on conflict
            await cls._run_git(repo_root, ["merge", "--abort"])
            return {"success": False, "error": f"Merge conflict or failure: {err}"}

        return {"success": True, "output": out.strip()}

    @classmethod
    async def cleanup_worktree(
        cls, repo_root: Path, worktree_path: Path, branch_name: str | None = None
    ) -> bool:
        """Prune and delete ephemeral worktree and optional branch."""
        repo_root = repo_root.resolve()
        # 1. git worktree remove --force <worktree_path>
        await cls._run_git(repo_root, ["worktree", "remove", "--force", str(worktree_path)])

        # 2. If directory still exists, remove it
        if worktree_path.exists():
            shutil.rmtree(worktree_path, ignore_errors=True)

        # 3. git worktree prune
        await cls._run_git(repo_root, ["worktree", "prune"])

        # 4. Optional branch deletion
        if branch_name:
            await cls._run_git(repo_root, ["branch", "-D", branch_name])

        return True
