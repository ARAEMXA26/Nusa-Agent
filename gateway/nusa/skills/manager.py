"""Skill Manager with progressive disclosure, precedence, and security enforcement."""

import logging
from pathlib import Path
from typing import Any
from nusa.config import config
from nusa.skills.parser import SkillParser, SkillDefinition, SkillMetadata
from nusa.skills.scanner import SkillSecurityScanner, ScanResult

logger = logging.getLogger(__name__)


class SkillItem(SkillDefinition):
    scan_result: ScanResult
    is_active: bool = False


class SkillManager:
    """Manages skill discovery, progressive disclosure, precedence, and safety."""

    def __init__(self, global_skills_dir: Path | None = None):
        self.global_skills_dir = global_skills_dir or (Path(__file__).parent.parent.parent / "skills")
        self.profile_skills_dir = config.data_dir / "skills"
        self._skills: dict[str, SkillItem] = {}
        self._disabled_skills: set[str] = set()

    def discover_all_skills(self, project_root: str | None = None) -> list[SkillItem]:
        """Discovers skills across global, profile, and project scopes with deterministic precedence."""
        discovered: dict[str, SkillItem] = {}

        # 1. Global Scope (Lowest precedence)
        if self.global_skills_dir.is_dir():
            for folder in self.global_skills_dir.iterdir():
                if folder.is_dir() and (folder / "SKILL.md").exists():
                    try:
                        skill_def = SkillParser.parse_skill_folder(folder, scope="global")
                        scan = SkillSecurityScanner.scan_skill_folder(folder)
                        skill_item = SkillItem(
                            **skill_def.model_dump(),
                            scan_result=scan,
                            is_active=scan.passed and (folder.name not in self._disabled_skills),
                        )
                        if not scan.passed:
                            skill_item.metadata.enabled = False
                        discovered[skill_def.metadata.name] = skill_item
                    except Exception as e:
                        logger.warning(f"Failed to load global skill {folder.name}: {e}")

        # 2. Profile Scope (Medium precedence)
        if self.profile_skills_dir.is_dir():
            for folder in self.profile_skills_dir.iterdir():
                if folder.is_dir() and (folder / "SKILL.md").exists():
                    try:
                        skill_def = SkillParser.parse_skill_folder(folder, scope="profile")
                        scan = SkillSecurityScanner.scan_skill_folder(folder)
                        skill_item = SkillItem(
                            **skill_def.model_dump(),
                            scan_result=scan,
                            is_active=scan.passed and (folder.name not in self._disabled_skills),
                        )
                        if not scan.passed:
                            skill_item.metadata.enabled = False
                        discovered[skill_def.metadata.name] = skill_item
                    except Exception as e:
                        logger.warning(f"Failed to load profile skill {folder.name}: {e}")

        # 3. Project Scope (Highest precedence, overrides global/profile)
        if project_root:
            project_skills_dir = Path(project_root) / ".nusa" / "skills"
            if project_skills_dir.is_dir():
                for folder in project_skills_dir.iterdir():
                    if folder.is_dir() and (folder / "SKILL.md").exists():
                        try:
                            skill_def = SkillParser.parse_skill_folder(folder, scope="project")
                            scan = SkillSecurityScanner.scan_skill_folder(folder)
                            skill_item = SkillItem(
                                **skill_def.model_dump(),
                                scan_result=scan,
                                is_active=scan.passed and (folder.name not in self._disabled_skills),
                            )
                            if not scan.passed:
                                skill_item.metadata.enabled = False
                            discovered[skill_def.metadata.name] = skill_item
                        except Exception as e:
                            logger.warning(f"Failed to load project skill {folder.name}: {e}")

        self._skills = discovered
        return list(discovered.values())

    def get_skill(self, name: str) -> SkillItem | None:
        return self._skills.get(name)

    def toggle_skill(self, name: str, enabled: bool) -> bool:
        if name in self._skills:
            if enabled and not self._skills[name].scan_result.passed:
                return False  # Cannot enable quarantined skill
            self._skills[name].metadata.enabled = enabled
            self._skills[name].is_active = enabled
            if enabled:
                self._disabled_skills.discard(name)
            else:
                self._disabled_skills.add(name)
            return True
        return False

    # Progressive Disclosure Level 1: Metadata Summary for Prompt Context
    def get_progressive_summary(self, project_root: str | None = None) -> list[dict[str, Any]]:
        self.discover_all_skills(project_root)
        summary = []
        for s in self._skills.values():
            if s.metadata.enabled and s.scan_result.passed:
                summary.append({
                    "name": s.metadata.name,
                    "description": s.metadata.description,
                    "scope": s.metadata.scope,
                    "allowed_tools": s.metadata.allowed_tools,
                    "tags": s.metadata.tags,
                })
        return summary

    # Progressive Disclosure Level 2: Full Skill Activation
    def activate_skill_for_goal(self, skill_name: str) -> str | None:
        if not self._skills:
            self.discover_all_skills()
        skill = self._skills.get(skill_name)
        if not skill or not skill.metadata.enabled or not skill.scan_result.passed:
            return None
        skill.is_active = True
        return f"=== Skill Active: {skill.metadata.name} (v{skill.metadata.version}) ===\n{skill.instructions}\n"

    # Progressive Disclosure Level 3: Script & Reference Access
    def get_skill_script(self, skill_name: str, script_rel_path: str) -> str | None:
        skill = self._skills.get(skill_name)
        if not skill or not skill.scripts_path:
            return None
        script_file = Path(skill.scripts_path) / script_rel_path
        if script_file.is_file() and script_file.resolve().is_relative_to(Path(skill.scripts_path)):
            return script_file.read_text(encoding="utf-8", errors="ignore")
        return None


# Global Singleton
skill_manager = SkillManager()
