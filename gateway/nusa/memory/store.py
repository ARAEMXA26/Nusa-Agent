"""Long-term Memory Store with dual Markdown file and SQLite indexed persistence."""

import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from nusa.config import config
from nusa.db.connection import get_db


class MemoryStore:
    """Manages project-level and global long-term memories with file & DB synchronization."""

    def __init__(self, global_memory_dir: Optional[Path] = None):
        self.global_dir = global_memory_dir or (config.data_dir / "memories")
        self.global_dir.mkdir(parents=True, exist_ok=True)
        self._init_default_global_memories()

    def _init_default_global_memories(self) -> None:
        """Initialize default USER.md and MEMORY.md if not present."""
        user_md = self.global_dir / "USER.md"
        if not user_md.exists():
            user_md.write_text(
                "# Global User Preferences\n\n"
                "- Preferred language: Indonesian and English.\n"
                "- Default code style: Clean, typed, documented, and tested.\n"
                "- Security posture: Safe defaults, ask before external or destructive operations.\n",
                encoding="utf-8",
            )

        memory_md = self.global_dir / "MEMORY.md"
        if not memory_md.exists():
            memory_md.write_text(
                "# System Long-Term Memory\n\n"
                "- Core Architecture: Local-First Desktop Agent Command Center (Nusa Agent).\n"
                "- Database: SQLite WAL mode.\n",
                encoding="utf-8",
            )

    def store_memory(
        self,
        key: str,
        value: str,
        scope: str = "project",
        project_id: Optional[str] = None,
        workspace_root: Optional[str] = None,
        provenance: Optional[str] = None,
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        """Store or update a memory item in both DB and markdown file."""
        scope = scope.lower()
        if scope not in ("global", "user", "project"):
            scope = "project"

        # 1. Update SQLite DB
        with get_db() as conn:
            # Check if key exists in scope/project
            if project_id and scope == "project":
                row = conn.execute(
                    "SELECT id FROM memory_items WHERE key = ? AND project_id = ? AND scope = ?",
                    (key, project_id, scope),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT id FROM memory_items WHERE key = ? AND scope = ?",
                    (key, scope),
                ).fetchone()

            if row:
                mem_id = row["id"]
                conn.execute(
                    """
                    UPDATE memory_items
                    SET value = ?, provenance = ?, confidence = ?, created_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (value, provenance, confidence, mem_id),
                )
            else:
                mem_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO memory_items (id, scope, project_id, key, value, provenance, confidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (mem_id, scope, project_id, key, value, provenance, confidence),
                )

        # 2. Persist to Disk
        if scope == "project" and workspace_root:
            proj_mem_dir = Path(workspace_root) / ".nusa" / "memories"
            proj_mem_dir.mkdir(parents=True, exist_ok=True)
            mem_file = proj_mem_dir / f"{key}.md"
            mem_file.write_text(value, encoding="utf-8")
        else:
            global_mem_file = self.global_dir / f"{key}.md"
            global_mem_file.write_text(value, encoding="utf-8")

        return {
            "id": mem_id,
            "key": key,
            "value": value,
            "scope": scope,
            "project_id": project_id,
            "confidence": confidence,
        }

    def get_memory(
        self,
        key: str,
        scope: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a specific memory item by key."""
        with get_db() as conn:
            if project_id and scope == "project":
                row = conn.execute(
                    "SELECT * FROM memory_items WHERE key = ? AND project_id = ?",
                    (key, project_id),
                ).fetchone()
            elif scope:
                row = conn.execute(
                    "SELECT * FROM memory_items WHERE key = ? AND scope = ?",
                    (key, scope),
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT * FROM memory_items WHERE key = ? ORDER BY created_at DESC LIMIT 1",
                    (key,),
                ).fetchone()

            if row:
                return dict(row)

        # Fallback to reading file directly
        if scope in ("global", "user") or not project_id:
            target_file = self.global_dir / f"{key}.md"
            if target_file.exists():
                content = target_file.read_text(encoding="utf-8")
                return {"id": "file", "key": key, "value": content, "scope": "global"}

        return None

    def search_memories(
        self,
        query: str,
        project_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Search relevant memories using keyword matching and relevance ranking."""
        query_terms = [t.strip().lower() for t in query.split() if len(t.strip()) > 1]
        results: List[Dict[str, Any]] = []

        with get_db() as conn:
            params: List[Any] = []
            where_clauses = []

            if project_id:
                where_clauses.append("(project_id = ? OR scope IN ('global', 'user'))")
                params.append(project_id)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
            rows = conn.execute(
                f"SELECT * FROM memory_items {where_sql} ORDER BY created_at DESC",
                params,
            ).fetchall()

            for row in rows:
                item = dict(row)
                text = f"{item['key']} {item['value']}".lower()
                matches = sum(1 for term in query_terms if term in text)
                if not query_terms or matches > 0:
                    item["match_score"] = matches
                    results.append(item)

        # Include default USER.md / MEMORY.md content if relevant
        for fname in ["USER.md", "MEMORY.md"]:
            fpath = self.global_dir / fname
            if fpath.exists():
                content = fpath.read_text(encoding="utf-8")
                text = f"{fname} {content}".lower()
                matches = sum(1 for term in query_terms if term in text)
                if matches > 0 or not query_terms:
                    # check if not already in results
                    if not any(r["key"] == fname for r in results):
                        results.append({
                            "id": f"global_{fname}",
                            "key": fname,
                            "value": content,
                            "scope": "global",
                            "project_id": None,
                            "confidence": 1.0,
                            "match_score": matches,
                        })

        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return results[:limit]

    def list_memories(
        self,
        project_id: Optional[str] = None,
        scope: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List all stored memory items."""
        with get_db() as conn:
            where_clauses = []
            params: List[Any] = []

            if scope:
                where_clauses.append("scope = ?")
                params.append(scope)
            if project_id:
                where_clauses.append("project_id = ?")
                params.append(project_id)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
            rows = conn.execute(
                f"SELECT * FROM memory_items {where_sql} ORDER BY created_at DESC",
                params,
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_memory(self, key: str, project_id: Optional[str] = None, workspace_root: Optional[str] = None) -> bool:
        """Delete a memory item from DB and disk."""
        deleted = False
        with get_db() as conn:
            if project_id:
                res = conn.execute(
                    "DELETE FROM memory_items WHERE key = ? AND project_id = ?",
                    (key, project_id),
                )
            else:
                res = conn.execute("DELETE FROM memory_items WHERE key = ?", (key,))
            deleted = res.rowcount > 0

        # Remove from disk
        if workspace_root:
            pfile = Path(workspace_root) / ".nusa" / "memories" / f"{key}.md"
            if pfile.exists():
                pfile.unlink()
                deleted = True

        gfile = self.global_dir / f"{key}.md"
        if gfile.exists():
            gfile.unlink()
            deleted = True

        return deleted

    def format_context_snippet(self, project_id: Optional[str] = None) -> str:
        """Generate a concise memory summary block for progressive system prompt injection."""
        snippets = []
        user_md = self.global_dir / "USER.md"
        if user_md.exists():
            snippets.append(f"### User Preferences:\n{user_md.read_text(encoding='utf-8').strip()}")

        mem_md = self.global_dir / "MEMORY.md"
        if mem_md.exists():
            snippets.append(f"### Global Memory:\n{mem_md.read_text(encoding='utf-8').strip()}")

        top_mems = self.search_memories("", project_id=project_id, limit=5)
        custom_items = [
            f"- {m['key']}: {m['value'][:120]}"
            for m in top_mems
            if m["key"] not in ("USER.md", "MEMORY.md")
        ]
        if custom_items:
            snippets.append("### Project & Stored Context:\n" + "\n".join(custom_items))

        return "\n\n".join(snippets)


memory_store = MemoryStore()
