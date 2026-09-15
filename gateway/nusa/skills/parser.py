"""Agent Skills manifest & SKILL.md parser with strict contract validation."""

import json
import logging
import re
from pathlib import Path
from typing import Any
from nusa.skills.models import (
    RiskLevel,
    SkillCompatibility,
    SkillDependencies,
    SkillManifest,
    SkillPermissions,
    SkillScope,
)
from nusa.skills.scanner import SkillSecurityScanner

logger = logging.getLogger(__name__)

REQUIRED_CONTRACT_SECTIONS = [
    "Purpose",
    "Trigger Conditions",
    "Do Not Use When",
    "Inputs",
    "Allowed Tools",
    "Workflow",
    "Safety and Approval Gates",
    "Verification",
    "Output Contract",
    "Failure Handling",
]


class ParsedSkill:
    def __init__(
        self,
        manifest: SkillManifest,
        instructions: str,
        path: Path,
        has_scripts: bool = False,
        has_references: bool = False,
        has_assets: bool = False,
        contract_missing_sections: list[str] | None = None,
    ):
        self.manifest = manifest
        self.instructions = instructions
        self.path = path
        self.has_scripts = has_scripts
        self.has_references = has_references
        self.has_assets = has_assets
        self.contract_missing_sections = contract_missing_sections or []

        self.instruction_checksum = SkillSecurityScanner.calculate_file_checksum(path / "SKILL.md")
        self.manifest_checksum = SkillSecurityScanner.calculate_file_checksum(path / "skill.json")
        self.total_checksum = SkillSecurityScanner.calculate_folder_checksum(path)

    @property
    def metadata(self):
        class _LegacyMeta:
            def __init__(self, p: "ParsedSkill"):
                self.name = p.manifest.name
                self.description = p.manifest.description
                self.version = p.manifest.version
                self.scope = p.manifest.scope.value
                self.allowed_tools = p.manifest.tools
                self.tags = p.manifest.tags
                self.enabled = p.manifest.enabledByDefault
                self.path = str(p.path)
                self.checksum = p.total_checksum
        return _LegacyMeta(self)


class SkillParser:
    """Parses skill directory containing skill.json manifest and SKILL.md instructions."""

    @classmethod
    def parse_skill_folder(cls, folder_path: Path, scope: SkillScope = SkillScope.BUNDLED) -> ParsedSkill:
        folder_path = folder_path.resolve()
        if not folder_path.is_dir():
            raise NotADirectoryError(f"Skill path '{folder_path}' is not a directory.")

        manifest_path = folder_path / "skill.json"
        skill_md_path = folder_path / "SKILL.md"

        manifest: SkillManifest | None = None
        instructions = ""

        # 1. Parse instructions from SKILL.md
        if skill_md_path.is_file():
            instructions = skill_md_path.read_text(encoding="utf-8")
        else:
            raise FileNotFoundError(f"SKILL.md entrypoint not found in '{folder_path}'")

        # 2. Parse manifest from skill.json
        if manifest_path.is_file():
            try:
                raw_json = json.loads(manifest_path.read_text(encoding="utf-8"))
                raw_json["scope"] = scope.value
                manifest = SkillManifest(**raw_json)
            except Exception as e:
                raise ValueError(f"Invalid skill.json manifest in '{folder_path}': {e}")
        else:
            # Fallback: extract YAML-like frontmatter from SKILL.md
            manifest = cls._extract_frontmatter_as_manifest(instructions, folder_path.name, scope)

        # 3. Contract Validation on SKILL.md sections
        missing_sections = cls.validate_skill_contract(instructions)

        has_scripts = (folder_path / "scripts").is_dir()
        has_references = (folder_path / "references").is_dir()
        has_assets = (folder_path / "assets").is_dir()

        return ParsedSkill(
            manifest=manifest,
            instructions=instructions,
            path=folder_path,
            has_scripts=has_scripts,
            has_references=has_references,
            has_assets=has_assets,
            contract_missing_sections=missing_sections,
        )

    @classmethod
    def validate_skill_contract(cls, content: str) -> list[str]:
        """Validates that SKILL.md has all 10 required operational sections."""
        missing = []
        for section in REQUIRED_CONTRACT_SECTIONS:
            pattern = rf"^##\s+{re.escape(section)}"
            if not re.search(pattern, content, re.MULTILINE | re.IGNORECASE):
                missing.append(section)
        return missing

    @classmethod
    def _extract_frontmatter_as_manifest(
        cls, content: str, default_id: str, scope: SkillScope
    ) -> SkillManifest:
        lines = content.splitlines()
        meta: dict[str, Any] = {
            "schemaVersion": 1,
            "id": default_id,
            "name": default_id.replace("-", " ").title(),
            "version": "1.0.0",
            "description": "",
            "tags": [],
            "scope": scope.value,
            "entrypoint": "SKILL.md",
            "enabledByDefault": True,
            "tools": [],
            "optionalTools": [],
            "dependencies": {},
            "permissions": {},
            "riskLevel": "low",
            "requiresApprovalFor": [],
        }

        if lines and lines[0].strip() == "---":
            for line in lines[1:]:
                if line.strip() == "---":
                    break
                if ":" in line:
                    k, v = line.split(":", 1)
                    k = k.strip().lower().replace("-", "_")
                    v = v.strip().strip("\"'")
                    if k in ("allowed_tools", "tools"):
                        meta["tools"] = [t.strip() for t in v.strip("[]").split(",") if t.strip()]
                    elif k == "tags":
                        meta["tags"] = [t.strip() for t in v.strip("[]").split(",") if t.strip()]
                    elif k == "description":
                        meta["description"] = v
                    elif k == "name":
                        meta["name"] = v
                    elif k == "version":
                        meta["version"] = v
                    elif k == "risk_level":
                        meta["riskLevel"] = v.lower()

        if not meta["description"]:
            for line in lines:
                if line.strip().startswith(">"):
                    meta["description"] = line.strip().lstrip(">").strip()
                    break

        return SkillManifest(**meta)
