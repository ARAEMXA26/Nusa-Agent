"""Skill Manager with progressive disclosure, deterministic precedence, persistence, and audit tracking."""

import datetime
import json
import logging
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Any

from nusa.config import config
from nusa.db.connection import get_db
from nusa.skills.models import (
    AuditStatus,
    DependencyHealthItem,
    RiskLevel,
    ScanResult,
    SkillDetail,
    SkillManifest,
    SkillScope,
)
from nusa.skills.parser import ParsedSkill, SkillParser
from nusa.skills.scanner import SkillSecurityScanner

logger = logging.getLogger(__name__)


class SkillItem:
    def __init__(
        self,
        parsed: ParsedSkill,
        enabled: bool,
        audit: ScanResult,
        scope: SkillScope,
    ):
        self.parsed = parsed
        self.enabled = enabled
        self.audit = audit
        self.scope = scope
        self.is_active = False

    @property
    def id(self) -> str:
        return self.parsed.manifest.id

    @property
    def name(self) -> str:
        return self.parsed.manifest.name

    @property
    def version(self) -> str:
        return self.parsed.manifest.version

    @property
    def description(self) -> str:
        return self.parsed.manifest.description

    @property
    def tags(self) -> list[str]:
        return self.parsed.manifest.tags

    @property
    def tools(self) -> list[str]:
        return self.parsed.manifest.tools

    @property
    def optional_tools(self) -> list[str]:
        return self.parsed.manifest.optionalTools

    @property
    def risk_level(self) -> RiskLevel:
        return self.parsed.manifest.riskLevel

    @property
    def path(self) -> Path:
        return self.parsed.path

    @property
    def metadata(self):
        meta = self.parsed.metadata
        meta.enabled = self.enabled
        return meta

    @property
    def scan_result(self) -> ScanResult:
        return self.audit


class SkillManager:
    """Manages skill discovery, precedence resolution, progressive disclosure, security, and persistence."""

    def __init__(
        self,
        bundled_skills_dir: Path | None = None,
        user_skills_dir: Path | None = None,
        global_skills_dir: Path | None = None,
    ):
        # 1. Bundled Skills directory
        default_bundled = Path(__file__).parent.parent.parent / "skills" / "bundled"
        if not default_bundled.is_dir():
            alt_bundled = Path(__file__).parent.parent.parent.parent / "skills" / "bundled"
            if alt_bundled.is_dir():
                default_bundled = alt_bundled
        self.bundled_skills_dir = bundled_skills_dir or default_bundled

        # 2. User/Global Skills directory
        default_user = config.data_dir / "skills" / "user"
        self.user_skills_dir = user_skills_dir or global_skills_dir or default_user
        self.user_skills_dir.mkdir(parents=True, exist_ok=True)

        self._skills: dict[str, SkillItem] = {}
        self._active_skill_contexts: dict[str, str] = {}  # task_id -> skill_id

    def activate_skill_for_goal(self, skill_name_or_id: str) -> str | None:
        return self.activate_skill(skill_name_or_id)

    def discover_all_skills(self, project_root: str | None = None) -> list[SkillItem]:
        """Discovers skills with deterministic precedence: workspace > user > bundled.
        Only performs static inspection; never executes code or scripts during discovery.
        """
        discovered: dict[str, SkillItem] = {}

        # 1. Bundled Skills (Lowest precedence)
        if self.bundled_skills_dir.is_dir():
            for folder in sorted(self.bundled_skills_dir.iterdir()):
                if folder.is_dir() and ((folder / "skill.json").exists() or (folder / "SKILL.md").exists()):
                    try:
                        item = self._load_and_audit_skill(folder, SkillScope.BUNDLED, project_root)
                        if item:
                            discovered[item.id] = item
                    except Exception as e:
                        logger.warning(f"Failed to parse bundled skill '{folder.name}': {e}")

        # 2. User / Global Skills (Medium precedence, overrides bundled)
        if self.user_skills_dir.is_dir():
            for folder in sorted(self.user_skills_dir.iterdir()):
                if folder.is_dir() and ((folder / "skill.json").exists() or (folder / "SKILL.md").exists()):
                    try:
                        item = self._load_and_audit_skill(folder, SkillScope.USER, project_root)
                        if item:
                            discovered[item.id] = item
                    except Exception as e:
                        logger.warning(f"Failed to parse user skill '{folder.name}': {e}")

        # 3. Workspace Skills (Highest precedence, overrides user and bundled)
        if project_root:
            workspace_skills_dir = Path(project_root) / ".nusa" / "skills"
            if workspace_skills_dir.is_dir():
                for folder in sorted(workspace_skills_dir.iterdir()):
                    if folder.is_dir() and ((folder / "skill.json").exists() or (folder / "SKILL.md").exists()):
                        try:
                            item = self._load_and_audit_skill(folder, SkillScope.WORKSPACE, project_root)
                            if item:
                                discovered[item.id] = item
                        except Exception as e:
                            logger.warning(f"Failed to parse workspace skill '{folder.name}': {e}")

        self._skills = discovered
        self._sync_all_to_database(discovered, project_root)
        return list(discovered.values())

    def _load_and_audit_skill(
        self,
        folder: Path,
        scope: SkillScope,
        project_root: str | None = None,
    ) -> SkillItem | None:
        parsed = SkillParser.parse_skill_folder(folder, scope=scope)
        skill_id = parsed.manifest.id

        # Query database for last recorded audit and checksum
        previous_checksum: str | None = None
        is_marked_stale = False
        enabled = parsed.manifest.enabledByDefault

        try:
            with get_db() as db:
                audit_row = db.execute(
                    "SELECT checksum, status FROM skill_audits WHERE skill_id = ? ORDER BY audited_at DESC LIMIT 1",
                    (skill_id,),
                ).fetchone()
                if audit_row:
                    previous_checksum = audit_row["checksum"]
                    if audit_row["status"] == "stale":
                        is_marked_stale = True

                # Enablement override from DB
                en_row = db.execute(
                    "SELECT enabled FROM skill_enablement WHERE skill_id = ?", (skill_id,)
                ).fetchone()
                if en_row is not None:
                    enabled = bool(en_row["enabled"])
        except Exception:
            pass

        # Perform static audit
        audit_result = SkillSecurityScanner.scan_skill_folder(folder, previous_checksum=previous_checksum)
        if is_marked_stale or (previous_checksum and previous_checksum != parsed.total_checksum):
            audit_result.status = AuditStatus.STALE

        # Fail closed: if audit failed, it cannot be enabled
        if not audit_result.passed:
            enabled = False

        return SkillItem(parsed=parsed, enabled=enabled, audit=audit_result, scope=scope)

    def _sync_all_to_database(
        self, skills: dict[str, SkillItem], project_root: str | None = None
    ) -> None:
        """Persists discovered skills, audits, versions, and dependencies into SQLite database."""
        try:
            with get_db() as db:
                for s in skills.values():
                    manifest_json = json.dumps(s.parsed.manifest.model_dump())
                    db.execute(
                        """
                        INSERT INTO skills (
                            id, name, version, description, scope, risk_level, path,
                            manifest_json, instruction_checksum, manifest_checksum, total_checksum,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(id) DO UPDATE SET
                            name=excluded.name,
                            version=excluded.version,
                            description=excluded.description,
                            scope=excluded.scope,
                            risk_level=excluded.risk_level,
                            path=excluded.path,
                            manifest_json=excluded.manifest_json,
                            instruction_checksum=excluded.instruction_checksum,
                            manifest_checksum=excluded.manifest_checksum,
                            total_checksum=excluded.total_checksum,
                            updated_at=CURRENT_TIMESTAMP
                        """,
                        (
                            s.id,
                            s.name,
                            s.version,
                            s.description,
                            s.scope.value,
                            s.risk_level.value,
                            str(s.path),
                            manifest_json,
                            s.parsed.instruction_checksum,
                            s.parsed.manifest_checksum,
                            s.parsed.total_checksum,
                        ),
                    )

                    # Save version snapshot
                    v_id = f"{s.id}-{s.version}"
                    db.execute(
                        """
                        INSERT INTO skill_versions (id, skill_id, version, checksum, manifest_json)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO NOTHING
                        """,
                        (v_id, s.id, s.version, s.parsed.total_checksum, manifest_json),
                    )

                    # Save audit result
                    a_id = f"audit-{s.id}-{s.parsed.total_checksum[:12]}"
                    findings_json = json.dumps([f.model_dump() for f in s.audit.findings])
                    db.execute(
                        """
                        INSERT INTO skill_audits (
                            id, skill_id, version, checksum, status, findings_json, risk_score, audited_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(id) DO UPDATE SET
                            status=excluded.status,
                            findings_json=excluded.findings_json,
                            risk_score=excluded.risk_score,
                            audited_at=CURRENT_TIMESTAMP
                        """,
                        (
                            a_id,
                            s.id,
                            s.version,
                            s.parsed.total_checksum,
                            s.audit.status.value,
                            findings_json,
                            s.audit.risk_score,
                        ),
                    )

                    # Save default enablement if not exists
                    db.execute(
                        """
                        INSERT OR IGNORE INTO skill_enablement (id, skill_id, project_id, enabled)
                        VALUES (?, ?, 'global', ?)
                        """,
                        (f"en-{s.id}-global", s.id, 1 if s.enabled else 0),
                    )
        except Exception as e:
            logger.error(f"Error persisting skills to database: {e}")

    def get_skill(self, skill_id: str) -> SkillItem | None:
        if not self._skills:
            self.discover_all_skills()
        return self._skills.get(skill_id)

    def get_skill_detail(self, skill_id: str, project_root: str | None = None) -> SkillDetail | None:
        if project_root and not self._skills:
            self.discover_all_skills(project_root)
        item = self.get_skill(skill_id)
        if not item:
            return None

        # Check dependency health
        health = self.check_dependencies_health(item)

        # Count usage
        usage_count = 0
        last_used = None
        try:
            with get_db() as db:
                row = db.execute(
                    "SELECT COUNT(*) as cnt, MAX(started_at) as last_at FROM skill_runs WHERE skill_id = ?",
                    (skill_id,),
                ).fetchone()
                if row:
                    usage_count = row["cnt"]
                    last_used = row["last_at"]
        except Exception:
            pass

        return SkillDetail(
            manifest=item.parsed.manifest,
            instructions=item.parsed.instructions,
            path=str(item.path),
            checksum=item.parsed.total_checksum,
            instruction_checksum=item.parsed.instruction_checksum,
            manifest_checksum=item.parsed.manifest_checksum,
            enabled=item.enabled,
            audit=item.audit,
            dependencies_health=health,
            has_scripts=item.parsed.has_scripts,
            has_references=item.parsed.has_references,
            has_assets=item.parsed.has_assets,
            usage_count=usage_count,
            last_used_at=last_used,
        )

    def check_dependencies_health(self, item: SkillItem) -> list[DependencyHealthItem]:
        """Probes system environment and Tool Registry to verify declared dependencies."""
        health: list[DependencyHealthItem] = []
        from nusa.tools.registry import tool_registry

        # 1. Probe declared tools
        for tool_name in item.tools:
            available = tool_name in tool_registry._tools
            health.append(
                DependencyHealthItem(
                    type="tool",
                    name=tool_name,
                    available=available,
                    required=True,
                    details="Registered in Tool Registry" if available else "Adapter missing in Tool Registry",
                )
            )

        for tool_name in item.optional_tools:
            available = tool_name in tool_registry._tools
            health.append(
                DependencyHealthItem(
                    type="tool",
                    name=tool_name,
                    available=available,
                    required=False,
                    details="Optional tool registered" if available else "Optional tool not registered",
                )
            )

        # 2. Probe required commands
        for cmd in item.parsed.manifest.dependencies.commands:
            exists = shutil.which(cmd) is not None
            health.append(
                DependencyHealthItem(
                    type="command",
                    name=cmd,
                    available=exists,
                    required=True,
                    details=f"Command '{cmd}' on system PATH" if exists else f"Executable '{cmd}' not found",
                )
            )

        # 3. Probe runtimes
        for runtime in item.parsed.manifest.dependencies.runtimes:
            exists = shutil.which(runtime) is not None
            health.append(
                DependencyHealthItem(
                    type="runtime",
                    name=runtime,
                    available=exists,
                    required=True,
                    details=f"Runtime '{runtime}' found" if exists else f"Runtime '{runtime}' not installed",
                )
            )

        # 4. Probe environment variables
        for ev in item.parsed.manifest.dependencies.environmentVariables:
            present = bool(os.getenv(ev))
            health.append(
                DependencyHealthItem(
                    type="env_var",
                    name=ev,
                    available=present,
                    required=True,
                    details=f"Environment variable '{ev}' set" if present else f"Missing env var '{ev}'",
                )
            )

        return health

    def toggle_skill(self, skill_id: str, enabled: bool, project_id: str | None = None) -> bool:
        """Enables or disables a skill with fail-closed security enforcement and DB persistence."""
        item = self.get_skill(skill_id)
        if not item:
            return False

        # Fail-closed: Cannot enable a quarantined/failed skill
        if enabled and item.audit.status == AuditStatus.FAILED:
            logger.warning(f"Refusing to enable quarantined skill '{skill_id}'.")
            return False

        item.enabled = enabled
        item.is_active = enabled

        target_proj = project_id or "global"
        en_id = f"en-{skill_id}-{target_proj}"
        try:
            with get_db() as db:
                db.execute(
                    """
                    INSERT INTO skill_enablement (id, skill_id, project_id, enabled, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id) DO UPDATE SET
                        enabled=excluded.enabled,
                        updated_at=CURRENT_TIMESTAMP
                    """,
                    (en_id, skill_id, target_proj, 1 if enabled else 0),
                )
            return True
        except Exception as e:
            logger.error(f"Error persisting toggle state for '{skill_id}': {e}")
            return False

    # ========================================================
    # Progressive Disclosure
    # ========================================================

    def get_progressive_summary(self, project_root: str | None = None) -> list[dict[str, Any]]:
        """Level 1 Progressive Disclosure:
        Returns low-token metadata summary for model prompt context.
        Full SKILL.md instructions are NEVER loaded into initial prompt.
        """
        self.discover_all_skills(project_root)
        summary = []
        for s in self._skills.values():
            if s.enabled and s.audit.passed:
                summary.append({
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "tags": s.tags,
                    "tools": s.tools,
                    "scope": s.scope.value,
                    "risk_level": s.risk_level.value,
                })
        return summary

    def route_skills(self, user_intent: str, project_root: str | None = None) -> list[SkillItem]:
        """Selects the minimum necessary set of eligible skills matching user goal or explicit mention."""
        self.discover_all_skills(project_root)
        intent_lower = user_intent.lower()

        # Check for explicit skill mentions like `$test-generator` or `task-planning`
        explicit_matches = []
        for s in self._skills.values():
            if not s.enabled or not s.audit.passed:
                continue
            if f"${s.id}" in intent_lower or f"skill:{s.id}" in intent_lower:
                explicit_matches.append(s)

        if explicit_matches:
            return explicit_matches

        # Intent keyword matching
        matches = []
        for s in self._skills.values():
            if not s.enabled or not s.audit.passed:
                continue

            score = 0
            if s.id in intent_lower:
                score += 10
            if s.name.lower() in intent_lower:
                score += 8
            for tag in s.tags:
                if re.search(rf"\b{re.escape(tag)}\b", intent_lower):
                    score += 3
            if any(word in intent_lower for word in s.description.lower().split() if len(word) > 4):
                score += 1

            if score >= 3:
                matches.append((score, s))

        matches.sort(key=lambda x: x[0], reverse=True)
        # Select minimum covering skills (top 2 max to respect context budget)
        return [item[1] for item in matches[:2]]

    def activate_skill(
        self,
        skill_id: str,
        task_id: str | None = None,
        reason: str = "Router match",
        model: str | None = None,
    ) -> str | None:
        """Level 2 Progressive Disclosure:
        Loads full SKILL.md into active context only when activated by router or user.
        Records an observability run trace.
        """
        item = self.get_skill(skill_id)
        if not item or not item.enabled or not item.audit.passed:
            return None

        item.is_active = True
        run_id = f"run-{uuid.uuid4()}"

        if task_id:
            self._active_skill_contexts[task_id] = skill_id
            try:
                with get_db() as db:
                    db.execute(
                        """
                        INSERT INTO skill_runs (id, task_id, skill_id, version, reason, model, status, started_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
                        """,
                        (run_id, task_id, skill_id, item.version, reason, model or "default"),
                    )
            except Exception as e:
                logger.warning(f"Failed to record skill run trace: {e}")

        return f"=== Active Skill: {item.name} (v{item.version}) ===\n{item.parsed.instructions}\n"

    def deactivate_skill(self, task_id: str, status: str = "completed", error: str | None = None) -> None:
        """Unloads skill context when task finishes."""
        skill_id = self._active_skill_contexts.pop(task_id, None)
        if not skill_id:
            return

        try:
            with get_db() as db:
                db.execute(
                    """
                    UPDATE skill_runs
                    SET status = ?, completed_at = CURRENT_TIMESTAMP, error_sanitized = ?
                    WHERE task_id = ? AND skill_id = ? AND status = 'active'
                    """,
                    (status, error, task_id, skill_id),
                )
        except Exception as e:
            logger.warning(f"Failed to update skill run deactivation: {e}")

    def get_active_skill_for_task(self, task_id: str) -> SkillItem | None:
        skill_id = self._active_skill_contexts.get(task_id)
        return self.get_skill(skill_id) if skill_id else None

    def get_skill_reference_or_script(self, skill_id: str, rel_path: str) -> str | None:
        """Level 3 Progressive Disclosure: Loads reference documentation or scripts on-demand safely."""
        item = self.get_skill(skill_id)
        if not item:
            return None

        target_file = (item.path / rel_path).resolve()
        # Security: Prevent path traversal outside skill folder
        if not target_file.is_relative_to(item.path.resolve()):
            logger.error(f"Path traversal attempt in get_skill_reference: '{rel_path}'")
            return None

        if target_file.is_file():
            return target_file.read_text(encoding="utf-8", errors="ignore")
        return None

    # ========================================================
    # Audit & Testing Operations
    # ========================================================

    def audit_skill(self, skill_id: str) -> ScanResult | None:
        """Performs on-demand static audit and updates database record."""
        item = self.get_skill(skill_id)
        if not item:
            return None

        result = SkillSecurityScanner.scan_skill_folder(item.path)
        item.audit = result
        if not result.passed:
            item.enabled = False

        try:
            with get_db() as db:
                a_id = f"audit-{item.id}-{item.parsed.total_checksum[:12]}"
                findings_json = json.dumps([f.model_dump() for f in result.findings])
                db.execute(
                    """
                    INSERT INTO skill_audits (
                        id, skill_id, version, checksum, status, findings_json, risk_score, audited_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(id) DO UPDATE SET
                        status=excluded.status,
                        findings_json=excluded.findings_json,
                        risk_score=excluded.risk_score,
                        audited_at=CURRENT_TIMESTAMP
                    """,
                    (
                        a_id,
                        item.id,
                        item.version,
                        item.parsed.total_checksum,
                        result.status.value,
                        findings_json,
                        result.risk_score,
                    ),
                )
        except Exception as e:
            logger.error(f"Error persisting audit for '{skill_id}': {e}")

        return result

    def test_skill(self, skill_id: str) -> dict[str, Any]:
        """Runs a diagnostic dry-run test: validates manifest, SKILL.md contract, and dependency probing."""
        item = self.get_skill(skill_id)
        if not item:
            return {"success": False, "error": f"Skill '{skill_id}' not found."}

        # Check missing contract sections
        missing_sections = SkillParser.validate_skill_contract(item.parsed.instructions)
        # Check dependencies
        dep_health = self.check_dependencies_health(item)
        all_required_deps_ok = all(d.available for d in dep_health if d.required)

        # Re-verify audit
        audit = SkillSecurityScanner.scan_skill_folder(item.path)

        passed = audit.passed and (len(missing_sections) == 0) and all_required_deps_ok

        return {
            "success": passed,
            "skill_id": skill_id,
            "version": item.version,
            "manifest_valid": True,
            "contract_missing_sections": missing_sections,
            "audit_status": audit.status.value,
            "risk_score": audit.risk_score,
            "dependencies_ok": all_required_deps_ok,
            "dependencies": [d.model_dump() for d in dep_health],
            "findings_count": len(audit.findings),
        }

    # ========================================================
    # Creation, Import, and Lifecycle Mutation
    # ========================================================

    def create_user_skill(
        self,
        manifest_data: dict[str, Any],
        instructions: str,
        workspace_root: str | None = None,
        scope: SkillScope = SkillScope.USER,
    ) -> SkillDetail:
        """Creates a new skill package in user or workspace directory."""
        # Validate manifest
        manifest_data["scope"] = scope.value
        manifest = SkillManifest(**manifest_data)
        skill_id = manifest.id

        target_base = Path(workspace_root) / ".nusa" / "skills" if scope == SkillScope.WORKSPACE and workspace_root else self.user_skills_dir
        target_dir = target_base / skill_id
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / "references").mkdir(exist_ok=True)
        (target_dir / "scripts").mkdir(exist_ok=True)

        # Write files
        (target_dir / "skill.json").write_text(json.dumps(manifest.model_dump(), indent=2), encoding="utf-8")
        (target_dir / "SKILL.md").write_text(instructions, encoding="utf-8")

        # Refresh discovery
        self.discover_all_skills(workspace_root)
        detail = self.get_skill_detail(skill_id)
        if not detail:
            raise RuntimeError(f"Skill '{skill_id}' was created but could not be loaded.")
        return detail

    def delete_skill(self, skill_id: str, workspace_root: str | None = None) -> bool:
        """Deletes user or workspace skill. Bundled skills CANNOT be deleted."""
        item = self.get_skill(skill_id)
        if not item:
            return False

        if item.scope == SkillScope.BUNDLED:
            raise PermissionError("Bundled skills are immutable and cannot be deleted.")

        # Remove directory
        if item.path.is_dir():
            shutil.rmtree(item.path)

        # Remove from database
        try:
            with get_db() as db:
                db.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
                db.execute("DELETE FROM skill_enablement WHERE skill_id = ?", (skill_id,))
        except Exception:
            pass

        self._skills.pop(skill_id, None)
        self.discover_all_skills(workspace_root)
        return True

    def update_skill(
        self,
        skill_id: str,
        manifest_data: dict[str, Any] | None = None,
        instructions: str | None = None,
        workspace_root: str | None = None,
    ) -> SkillDetail:
        """Updates user or workspace skill. Bundled skills are immutable and cannot be updated."""
        item = self.get_skill(skill_id)
        if not item:
            raise FileNotFoundError(f"Skill '{skill_id}' not found.")

        if item.scope == SkillScope.BUNDLED:
            raise PermissionError("Bundled skills are immutable and cannot be edited.")

        if manifest_data:
            manifest_data["id"] = skill_id
            manifest_data["scope"] = item.scope.value
            manifest = SkillManifest(**manifest_data)
            (item.path / "skill.json").write_text(json.dumps(manifest.model_dump(), indent=2), encoding="utf-8")

        if instructions is not None:
            (item.path / "SKILL.md").write_text(instructions, encoding="utf-8")

        # Mark audit as stale in DB because contents changed
        try:
            with get_db() as db:
                db.execute(
                    "UPDATE skill_audits SET status = 'stale' WHERE skill_id = ?",
                    (skill_id,),
                )
        except Exception:
            pass

        # Re-discover to reload parsed skill and check state
        self.discover_all_skills(workspace_root)
        detail = self.get_skill_detail(skill_id)
        if not detail:
            raise RuntimeError(f"Failed to load updated skill '{skill_id}'.")
        return detail

    def import_skill(
        self,
        source_path_or_dict: str | dict[str, Any],
        scope: SkillScope = SkillScope.USER,
        workspace_root: str | None = None,
    ) -> SkillDetail:
        """Imports an external skill into user or workspace storage after validation and security scan."""
        if isinstance(source_path_or_dict, dict):
            manifest_data = source_path_or_dict.get("manifest") or source_path_or_dict
            instructions = source_path_or_dict.get("instructions") or source_path_or_dict.get("skill_md", "")
            return self.create_user_skill(manifest_data, instructions, workspace_root=workspace_root, scope=scope)

        source_path = Path(source_path_or_dict)
        if not source_path.exists():
            raise FileNotFoundError(f"Import source '{source_path}' does not exist.")

        if source_path.is_dir():
            manifest_file = source_path / "skill.json"
            skill_md_file = source_path / "SKILL.md"
            if not manifest_file.exists() or not skill_md_file.exists():
                raise ValueError("Import directory must contain both 'skill.json' and 'SKILL.md'.")

            manifest_data = json.loads(manifest_file.read_text(encoding="utf-8"))
            instructions = skill_md_file.read_text(encoding="utf-8")
            created = self.create_user_skill(manifest_data, instructions, workspace_root=workspace_root, scope=scope)

            # Copy references and scripts if present
            target_dir = Path(created.path)
            for sub in ("references", "scripts", "assets"):
                src_sub = source_path / sub
                if src_sub.is_dir():
                    shutil.copytree(src_sub, target_dir / sub, dirs_exist_ok=True)

            self.discover_all_skills(workspace_root)
            res = self.get_skill_detail(created.manifest.id)
            if not res:
                raise RuntimeError("Imported skill could not be loaded.")
            return res

        raise ValueError("Unsupported import source format. Provide a directory path or skill dictionary.")

    def record_tool_call(
        self,
        task_id: str,
        tool_name: str,
        decision: str,
        permitted: bool,
        arguments: dict[str, Any] | None = None,
        result: dict[str, Any] | None = None,
        duration_ms: int | None = None,
    ) -> None:
        """Records a skill tool call trace in SQLite."""
        skill_id = self._active_skill_contexts.get(task_id)
        if not skill_id:
            return
        try:
            with get_db() as db:
                run_row = db.execute(
                    "SELECT id FROM skill_runs WHERE task_id = ? AND skill_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
                    (task_id, skill_id),
                ).fetchone()
                if run_row:
                    run_id = run_row["id"]
                    db.execute(
                        """
                        INSERT INTO skill_tool_calls (id, run_id, tool_name, permitted, decision, arguments_json, result_json, duration_ms)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            str(uuid.uuid4()),
                            run_id,
                            tool_name,
                            1 if permitted else 0,
                            decision,
                            json.dumps(arguments or {}),
                            json.dumps(result or {}),
                            duration_ms,
                        ),
                    )
        except Exception as e:
            logger.warning(f"Failed to record skill tool call: {e}")

    def record_approval(
        self,
        task_id: str,
        tool_name: str,
        action_type: str,
        reason: str,
        status: str,
        decided_by: str = "user",
    ) -> None:
        """Records a skill human approval decision in SQLite."""
        skill_id = self._active_skill_contexts.get(task_id)
        if not skill_id:
            return
        try:
            with get_db() as db:
                run_row = db.execute(
                    "SELECT id FROM skill_runs WHERE task_id = ? AND skill_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
                    (task_id, skill_id),
                ).fetchone()
                if run_row:
                    run_id = run_row["id"]
                    db.execute(
                        """
                        INSERT INTO skill_approvals (id, run_id, tool_name, action_type, reason, status, decided_at, decided_by)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                        """,
                        (str(uuid.uuid4()), run_id, tool_name, action_type, reason, status, decided_by),
                    )
        except Exception as e:
            logger.warning(f"Failed to record skill approval: {e}")

    def get_skill_traces(self, skill_id: str, limit: int = 50) -> list[dict[str, Any]]:
        """Retrieves sanitized execution traces and tool calls for observability."""
        traces = []
        try:
            with get_db() as db:
                rows = db.execute(
                    """
                    SELECT id, task_id, version, reason, model, status, duration_ms, error_sanitized, started_at, completed_at
                    FROM skill_runs
                    WHERE skill_id = ?
                    ORDER BY started_at DESC
                    LIMIT ?
                    """,
                    (skill_id, limit),
                ).fetchall()
                for r in rows:
                    run_dict = dict(r)
                    # Fetch associated tool calls
                    tc_rows = db.execute(
                        """
                        SELECT id, tool_name, permitted, decision, duration_ms, created_at
                        FROM skill_tool_calls
                        WHERE run_id = ?
                        ORDER BY created_at ASC
                        """,
                        (run_dict["id"],),
                    ).fetchall()
                    run_dict["tool_calls"] = [dict(tc) for tc in tc_rows]
                    traces.append(run_dict)
        except Exception as e:
            logger.error(f"Error fetching traces for '{skill_id}': {e}")
        return traces


# Global Singleton Instance
skill_manager = SkillManager()
