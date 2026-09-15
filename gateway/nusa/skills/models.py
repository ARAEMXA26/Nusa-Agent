"""Strict Pydantic models and schemas for Nusa Agent Skills Hub."""

import re
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class SkillScope(str, Enum):
    BUNDLED = "bundled"
    GLOBAL = "global"
    USER = "user"
    WORKSPACE = "workspace"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditStatus(str, Enum):
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"
    NOT_AUDITED = "not_audited"
    STALE = "stale"


class SkillPermissions(BaseModel):
    filesystem: Literal["none", "read", "workspace-write"] = "workspace-write"
    network: Literal["none", "restricted", "unrestricted"] = "none"
    shell: Literal["none", "sandboxed", "host-with-approval"] = "none"
    computerControl: Literal["none", "view", "interact-with-approval"] = "none"


class SkillDependencies(BaseModel):
    commands: list[str] = Field(default_factory=list)
    runtimes: list[str] = Field(default_factory=list)
    plugins: list[str] = Field(default_factory=list)
    environmentVariables: list[str] = Field(default_factory=list)


class SkillCompatibility(BaseModel):
    os: list[str] = Field(default_factory=lambda: ["darwin", "linux", "win32"])
    minAppVersion: str = "0.1.0"


class SkillManifest(BaseModel):
    schemaVersion: Literal[1] = 1
    id: str
    name: str
    version: str = "1.0.0"
    description: str
    tags: list[str] = Field(default_factory=list)
    scope: SkillScope = SkillScope.BUNDLED
    entrypoint: Literal["SKILL.md"] = "SKILL.md"
    enabledByDefault: bool = True
    tools: list[str] = Field(default_factory=list)
    optionalTools: list[str] = Field(default_factory=list)
    dependencies: SkillDependencies = Field(default_factory=SkillDependencies)
    permissions: SkillPermissions = Field(default_factory=SkillPermissions)
    riskLevel: RiskLevel = RiskLevel.LOW
    requiresApprovalFor: list[str] = Field(default_factory=list)
    compatibility: SkillCompatibility = Field(default_factory=SkillCompatibility)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", v):
            raise ValueError(
                f"Skill id '{v}' must be strictly kebab-case (lowercase alphanumeric separated by hyphens)."
            )
        if len(v) < 2 or len(v) > 64:
            raise ValueError("Skill id must be between 2 and 64 characters long.")
        return v

    @field_validator("version")
    @classmethod
    def validate_version(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$", v):
            raise ValueError(
                f"Skill version '{v}' must follow Semantic Versioning (e.g. '1.0.0' or '1.0.0-beta.1')."
            )
        return v


class ScanFinding(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    category: str
    message: str
    file: str = "SKILL.md"
    line: int | None = None


class ScanResult(BaseModel):
    passed: bool
    status: AuditStatus = AuditStatus.PASSED
    risk_score: int = 0
    findings: list[ScanFinding] = Field(default_factory=list)
    audited_at: str = ""
    audited_version: str = ""
    checksum: str = ""


class DependencyHealthItem(BaseModel):
    type: Literal["command", "runtime", "plugin", "env_var", "tool"]
    name: str
    available: bool
    required: bool = True
    details: str = ""


class SkillDetail(BaseModel):
    manifest: SkillManifest
    instructions: str
    path: str
    checksum: str
    instruction_checksum: str
    manifest_checksum: str
    enabled: bool = True
    audit: ScanResult
    dependencies_health: list[DependencyHealthItem] = Field(default_factory=list)
    has_scripts: bool = False
    has_references: bool = False
    has_assets: bool = False
    usage_count: int = 0
    last_used_at: str | None = None
