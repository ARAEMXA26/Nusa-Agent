"""Scoped Agent Profiles Manager with Isolation and Soft Guard Protection."""

import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from nusa.config import config
from nusa.db.connection import get_db, init_db


class ProfileDefinition(BaseModel):
    id: str
    name: str
    description: str = ""
    default_model: str = "openai/gpt-4o"
    is_active: bool = False
    profile_dir: Optional[str] = None


class ProfileManager:
    """Manages scoped profiles, directories, and cross-profile access protection."""

    def __init__(self, base_profiles_dir: Optional[Path] = None, db_path: Optional[Path] = None):
        self.base_dir = base_profiles_dir or (config.data_dir / "profiles")
        self.db_path = db_path
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._seed_default_profiles()

    def _seed_default_profiles(self) -> None:
        """Seed default and built-in profiles in DB and disk."""
        init_db(self.db_path)
        defaults = [
            ("default", "General-purpose software engineering & autonomous agent command center.", "openai/gpt-4o", 1),
            ("researcher", "Web browsing, deep research synthesis, and fact-checking specialist.", "openai/gpt-4o", 0),
            ("security-auditor", "Static analysis, zero-trust code review, and secret leak scanner.", "openai/gpt-4o", 0),
        ]

        with get_db(self.db_path) as conn:
            for name, desc, model, is_act in defaults:
                row = conn.execute("SELECT id FROM profiles WHERE name = ?", (name,)).fetchone()
                if not row:
                    p_id = str(uuid.uuid4())
                    conn.execute(
                        """
                        INSERT INTO profiles (id, name, description, default_model, is_active)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (p_id, name, desc, model, is_act),
                    )
                # Create directory structure
                pdir = self.base_dir / name
                pdir.mkdir(parents=True, exist_ok=True)
                (pdir / "skills").mkdir(exist_ok=True)
                (pdir / "memories").mkdir(exist_ok=True)

    def list_profiles(self) -> List[Dict[str, Any]]:
        """List all available profiles."""
        with get_db(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM profiles ORDER BY name ASC").fetchall()
            result = []
            for r in rows:
                item = dict(r)
                item["is_active"] = bool(item["is_active"])
                item["profile_dir"] = str(self.base_dir / item["name"])
                result.append(item)
            return result

    def get_active_profile(self) -> Dict[str, Any]:
        """Get the currently active profile."""
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT * FROM profiles WHERE is_active = 1 LIMIT 1").fetchone()
            if row:
                item = dict(row)
                item["is_active"] = True
                item["profile_dir"] = str(self.base_dir / item["name"])
                return item

            # Fallback to 'default'
            def_row = conn.execute("SELECT * FROM profiles WHERE name = 'default' LIMIT 1").fetchone()
            if def_row:
                item = dict(def_row)
                item["is_active"] = True
                item["profile_dir"] = str(self.base_dir / item["name"])
                return item

        return {
            "id": "default",
            "name": "default",
            "description": "Default profile",
            "default_model": "openai/gpt-4o",
            "is_active": True,
            "profile_dir": str(self.base_dir / "default"),
        }

    def set_active_profile(self, profile_name: str) -> Dict[str, Any]:
        """Switch the active profile."""
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT id FROM profiles WHERE name = ?", (profile_name,)).fetchone()
            if not row:
                raise ValueError(f"Profile '{profile_name}' not found.")

            conn.execute("UPDATE profiles SET is_active = 0")
            conn.execute("UPDATE profiles SET is_active = 1 WHERE name = ?", (profile_name,))

        return self.get_active_profile()

    def create_profile(self, name: str, description: str = "", default_model: str = "openai/gpt-4o") -> Dict[str, Any]:
        """Create a new agent profile."""
        name = name.strip().lower().replace(" ", "-")
        pdir = self.base_dir / name
        pdir.mkdir(parents=True, exist_ok=True)
        (pdir / "skills").mkdir(exist_ok=True)
        (pdir / "memories").mkdir(exist_ok=True)

        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT id FROM profiles WHERE name = ?", (name,)).fetchone()
            if row:
                p_id = row["id"]
                conn.execute(
                    """
                    UPDATE profiles
                    SET description = ?, default_model = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE name = ?
                    """,
                    (description, default_model, name),
                )
            else:
                p_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO profiles (id, name, description, default_model, is_active)
                    VALUES (?, ?, ?, ?, 0)
                    """,
                    (p_id, name, description, default_model),
                )

        return {
            "id": p_id,
            "name": name,
            "description": description,
            "default_model": default_model,
            "is_active": False,
            "profile_dir": str(pdir),
        }

    def check_cross_profile_access(
        self,
        target_path: Path | str,
        current_profile_name: Optional[str] = None,
        cross_profile_flag: bool = False,
    ) -> bool:
        """
        Soft guard: returns True if allowed, or False if cross-profile violation without flag.
        """
        if cross_profile_flag:
            return True

        active = current_profile_name or self.get_active_profile()["name"]
        t_path = Path(target_path).resolve()
        base_resolved = self.base_dir.resolve()

        try:
            rel = t_path.relative_to(base_resolved)
            rel_parts = rel.parts
            if rel_parts and rel_parts[0] != active:
                # Attempting to access another profile's folder
                return False
        except ValueError:
            # Target is not inside profiles directory at all
            pass

        return True


profile_manager = ProfileManager()
