"""Canonical Path Jail to prevent directory traversal and symlink escapes."""

import os
from pathlib import Path


class PathJailError(PermissionError):
    """Raised when a path escapes the allowed workspace boundary."""
    pass


class PathJail:
    def __init__(self, workspace_root: str | Path):
        self.root = Path(workspace_root).resolve()
        if not self.root.is_dir():
            # If workspace doesn't exist yet, make sure parent is resolved
            self.root.mkdir(parents=True, exist_ok=True)

    def resolve_safe(self, rel_or_abs_path: str | Path) -> Path:
        """Resolve a path safely within the workspace root.
        
        Guarantees that:
        1. Traversals like `../../etc/passwd` are rejected.
        2. Symlinks pointing outside workspace root are rejected.
        3. Canonical path strictly starts with workspace root.
        """
        raw_path = Path(rel_or_abs_path)
        
        # If relative, anchor to root
        if not raw_path.is_absolute():
            target = (self.root / raw_path).resolve()
        else:
            target = raw_path.resolve()

        # Check if the target is within root
        try:
            # relative_to will raise ValueError if target is not under self.root
            target.relative_to(self.root)
        except ValueError:
            raise PathJailError(
                f"Security Violation: Path '{rel_or_abs_path}' escapes workspace root '{self.root}'"
            )

        # Check if target or any parent is a symlink pointing outside
        curr = target
        while curr != self.root and curr != curr.parent:
            if curr.is_symlink():
                real_link = curr.resolve()
                try:
                    real_link.relative_to(self.root)
                except ValueError:
                    raise PathJailError(
                        f"Security Violation: Symlink '{curr}' points outside workspace root"
                    )
            curr = curr.parent

        return target

    def is_inside(self, path: str | Path) -> bool:
        try:
            self.resolve_safe(path)
            return True
        except (PathJailError, ValueError):
            return False


def safe_path(workspace_root: str | Path, rel_or_abs_path: str | Path) -> Path:
    return PathJail(workspace_root).resolve_safe(rel_or_abs_path)

