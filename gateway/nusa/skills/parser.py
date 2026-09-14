"""Agent Skills standard parser and validator."""

import hashlib
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field


class SkillMetadata(BaseModel):
    name: str
    description: str
    version: str = "1.0.0"
    license: str = "Apache-2.0"
    author: str = "Unknown"
    compatibility: str = ">=1.0.0"
    scope: str = "global"  # global, profile, project, plugin
    allowed_tools: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    checksum: str = ""
    path: str = ""
    enabled: bool = True


class SkillDefinition(BaseModel):
    metadata: SkillMetadata
    instructions: str
    has_scripts: bool = False
    has_references: bool = False
    has_evals: bool = False
    scripts_path: str | None = None
    references_path: str | None = None
    evals_path: str | None = None


class SkillParser:
    """Parses standard skill folders with SKILL.md and metadata."""

    @staticmethod
    def calculate_checksum(folder_path: Path) -> str:
        """Calculates SHA256 over all files in the skill directory for provenance."""
        sha = hashlib.sha256()
        if not folder_path.exists():
            return ""
        for file in sorted(folder_path.rglob("*")):
            if file.is_file():
                sha.update(file.name.encode())
                try:
                    sha.update(file.read_bytes())
                except Exception:
                    pass
        return sha.hexdigest()

    @classmethod
    def parse_skill_folder(cls, folder_path: Path, scope: str = "global") -> SkillDefinition:
        skill_file = folder_path / "SKILL.md"
        if not skill_file.exists():
            raise FileNotFoundError(f"SKILL.md not found in {folder_path}")

        raw_content = skill_file.read_text(encoding="utf-8")
        metadata, instructions = cls._extract_frontmatter_or_headers(raw_content, folder_path.name)
        metadata.scope = scope
        metadata.path = str(folder_path.resolve())
        metadata.checksum = cls.calculate_checksum(folder_path)

        scripts_dir = folder_path / "scripts"
        refs_dir = folder_path / "references"
        evals_dir = folder_path / "evals"

        return SkillDefinition(
            metadata=metadata,
            instructions=instructions,
            has_scripts=scripts_dir.is_dir(),
            has_references=refs_dir.is_dir(),
            has_evals=evals_dir.is_dir(),
            scripts_path=str(scripts_dir.resolve()) if scripts_dir.is_dir() else None,
            references_path=str(refs_dir.resolve()) if refs_dir.is_dir() else None,
            evals_path=str(evals_dir.resolve()) if evals_dir.is_dir() else None,
        )

    @classmethod
    def _extract_frontmatter_or_headers(
        cls, content: str, default_name: str
    ) -> tuple[SkillMetadata, str]:
        lines = content.splitlines()
        meta_dict: dict[str, Any] = {
            "name": default_name,
            "description": "",
            "allowed_tools": [],
            "tags": [],
        }

        # Check for YAML-like frontmatter between ---
        if lines and lines[0].strip() == "---":
            frontmatter_lines = []
            body_start_idx = 1
            for idx, line in enumerate(lines[1:], start=1):
                if line.strip() == "---":
                    body_start_idx = idx + 1
                    break
                frontmatter_lines.append(line)

            for f_line in frontmatter_lines:
                if ":" in f_line:
                    k, v = f_line.split(":", 1)
                    k = k.strip().lower()
                    v = v.strip().strip("\"'")
                    if k in ("allowed_tools", "allowed-tools", "tools"):
                        meta_dict["allowed_tools"] = [
                            t.strip() for t in v.strip("[]").split(",") if t.strip()
                        ]
                    elif k == "tags":
                        meta_dict["tags"] = [t.strip() for t in v.strip("[]").split(",") if t.strip()]
                    elif k in meta_dict:
                        meta_dict[k] = v
                    else:
                        meta_dict[k] = v

            body = "\n".join(lines[body_start_idx:]).strip()
            return SkillMetadata(**meta_dict), body

        # Fallback: Parse markdown headers
        description_lines = []
        body_lines = []
        in_body = False

        for line in lines:
            if line.startswith("# "):
                meta_dict["name"] = line[2:].strip()
            elif line.startswith("> "):
                description_lines.append(line[2:].strip())
            elif line.startswith("## "):
                in_body = True
                body_lines.append(line)
            elif in_body:
                body_lines.append(line)
            else:
                if line.strip() and not line.startswith("#"):
                    description_lines.append(line.strip())

        meta_dict["description"] = " ".join(description_lines).strip()
        body = "\n".join(body_lines).strip()
        return SkillMetadata(**meta_dict), body
