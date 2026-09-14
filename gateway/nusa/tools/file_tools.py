"""Real filesystem tools with canonical path jailing and unified diff generation."""

import difflib
from pathlib import Path
from typing import Any
from nusa.security.path_jail import PathJail


def tool_file_read(workspace_root: str, path: str) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    safe_path = jail.resolve_safe(path)
    if not safe_path.exists():
        return {"success": False, "error": f"File '{path}' does not exist."}
    if not safe_path.is_file():
        return {"success": False, "error": f"Path '{path}' is not a regular file."}

    content = safe_path.read_text(encoding="utf-8", errors="replace")
    return {
        "success": True,
        "path": path,
        "content": content,
        "line_count": len(content.splitlines()),
    }


def tool_file_write(workspace_root: str, path: str, content: str) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    safe_path = jail.resolve_safe(path)
    safe_path.parent.mkdir(parents=True, exist_ok=True)

    old_content = ""
    if safe_path.exists() and safe_path.is_file():
        old_content = safe_path.read_text(encoding="utf-8", errors="replace")

    safe_path.write_text(content, encoding="utf-8")

    # Generate unified diff
    diff_lines = list(
        difflib.unified_diff(
            old_content.splitlines(keepends=True),
            content.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
        )
    )
    diff_str = "".join(diff_lines)

    return {
        "success": True,
        "path": path,
        "bytes_written": len(content.encode("utf-8")),
        "diff": diff_str,
    }


def tool_file_patch(
    workspace_root: str, path: str, search_content: str, replace_content: str
) -> dict[str, Any]:
    jail = PathJail(workspace_root)
    safe_path = jail.resolve_safe(path)
    if not safe_path.exists():
        return {"success": False, "error": f"File '{path}' does not exist to patch."}

    old_content = safe_path.read_text(encoding="utf-8", errors="replace")
    if search_content not in old_content:
        return {
            "success": False,
            "error": f"Target search string not found in '{path}'. Patch could not be uniquely applied.",
        }

    # Verify search content occurs exactly once to avoid ambiguous multi-patching
    occurrences = old_content.count(search_content)
    if occurrences > 1:
        return {
            "success": False,
            "error": f"Search string matches {occurrences} locations in '{path}'. Please provide more surrounding context to disambiguate.",
        }

    new_content = old_content.replace(search_content, replace_content, 1)
    safe_path.write_text(new_content, encoding="utf-8")

    diff_lines = list(
        difflib.unified_diff(
            old_content.splitlines(keepends=True),
            new_content.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
        )
    )
    diff_str = "".join(diff_lines)

    return {
        "success": True,
        "path": path,
        "diff": diff_str,
    }


def tool_file_list(workspace_root: str, path: str = ".") -> dict[str, Any]:
    jail = PathJail(workspace_root)
    safe_path = jail.resolve_safe(path)
    if not safe_path.exists():
        return {"success": False, "error": f"Directory '{path}' does not exist."}
    if not safe_path.is_dir():
        return {"success": False, "error": f"Path '{path}' is not a directory."}

    items = []
    for entry in safe_path.iterdir():
        items.append({
            "name": entry.name,
            "is_dir": entry.is_dir(),
            "size": entry.stat().st_size if entry.is_file() else 0,
        })

    # Sort directories first, then files alphabetically
    items.sort(key=lambda x: (not x["is_dir"], x["name"]))
    return {"success": True, "path": path, "items": items}
