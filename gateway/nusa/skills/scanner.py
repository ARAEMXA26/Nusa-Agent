"""Deep Static Security Scanner & Audit Engine for Agent Skills."""

import datetime
import hashlib
import json
import logging
import os
import re
from pathlib import Path
from typing import Any
from nusa.skills.models import (
    AuditStatus,
    RiskLevel,
    ScanFinding,
    ScanResult,
    SkillManifest,
)

logger = logging.getLogger(__name__)


class SkillSecurityScanner:
    """Performs deep static audits of skill manifests, instructions, references, and scripts."""

    INJECTION_PATTERNS = [
        (re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE), "Prompt Injection: Instruction Override"),
        (re.compile(r"bypass\s+(the\s+)?(policy|security|guardrails|sandbox)", re.IGNORECASE), "Prompt Injection: Policy Bypass"),
        (re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE), "Prompt Injection: Mode Escape"),
        (re.compile(r"disregard\s+system\s+(rules|prompt|guardrails)", re.IGNORECASE), "Prompt Injection: System Rules Disregard"),
        (re.compile(r"disable\s+(safety|security|policy)\s+checks?", re.IGNORECASE), "Prompt Injection: Safety Disabling"),
    ]

    EXFILTRATION_PATTERNS = [
        (re.compile(r"(curl|wget)\s+.*-(d|F|T)\s+.*(\.env|secret|id_rsa|token|key|credential)", re.IGNORECASE), "Exfiltration: Sensitive File/Secret Upload"),
        (re.compile(r"https?://(webhook\.site|pipedream\.net|ngrok\.io|requestbin)", re.IGNORECASE), "Exfiltration: Suspicious External Exfiltration Domain"),
        (re.compile(r"nc\s+-[el].*\d+", re.IGNORECASE), "Exfiltration: Netcat Reverse Shell Pattern"),
        (re.compile(r"bash\s+-i\s+>&", re.IGNORECASE), "Exfiltration: Interactive Bash Reverse Shell"),
    ]

    DESTRUCTIVE_PATTERNS = [
        (re.compile(r"rm\s+-rf\s+([/~]|\$HOME|\.\.)", re.IGNORECASE), "Destructive Command: Root/Home/Parent Path Deletion"),
        (re.compile(r":\(\)\s*\{\s*:\|:&\s*\};:", re.IGNORECASE), "Destructive Command: Fork Bomb"),
        (re.compile(r"mkfs(\.[a-z0-9]+)?\s+", re.IGNORECASE), "Destructive Command: Filesystem Formatting"),
        (re.compile(r"dd\s+if=/dev/(zero|urandom)\s+of=/dev/", re.IGNORECASE), "Destructive Command: Disk Wipe"),
        (re.compile(r"chmod\s+-R\s+777\s+/", re.IGNORECASE), "Destructive Command: Global Permission Compromise"),
    ]

    OBFUSCATION_PATTERNS = [
        (re.compile(r"(eval|exec)\s*\(\s*(base64\.b64decode|codecs\.decode)", re.IGNORECASE), "Obfuscation: Base64 Decoded Dynamic Execution"),
        (re.compile(r"__import__\s*\(\s*['\"]os['\"]\s*\)\.(system|popen)", re.IGNORECASE), "Obfuscation: Dynamic OS Invocation"),
        (re.compile(r"subprocess\.(Popen|run)\s*\(\s*\[?['\"](sh|bash)['\"]", re.IGNORECASE), "Obfuscation: Unaudited Subshell Spawn"),
    ]

    SECRET_PATTERNS = [
        (re.compile(r"(api[_-]?key|secret[_-]?token|password|bearer)\s*=\s*['\"][A-Za-z0-9_\-\.]{12,}['\"]", re.IGNORECASE), "Secret Leak: Hardcoded API Key or Password"),
        (re.compile(r"-----BEGIN\s+(RSA|OPENSSH|EC|PRIVATE)\s+KEY-----"), "Secret Leak: Embedded Private Cryptographic Key"),
    ]

    @staticmethod
    def calculate_folder_checksum(folder: Path) -> str:
        sha = hashlib.sha256()
        if not folder.exists():
            return ""
        for file in sorted(folder.rglob("*")):
            if file.is_file():
                try:
                    rel = str(file.relative_to(folder))
                    sha.update(rel.encode("utf-8"))
                    sha.update(file.read_bytes())
                except Exception:
                    pass
        return sha.hexdigest()

    @staticmethod
    def calculate_file_checksum(file_path: Path) -> str:
        if not file_path.is_file():
            return ""
        try:
            return hashlib.sha256(file_path.read_bytes()).hexdigest()
        except Exception:
            return ""

    @classmethod
    def scan_content(cls, content: str, filename: str = "SKILL.md") -> list[ScanFinding]:
        findings: list[ScanFinding] = []
        lines = content.splitlines()

        for idx, line in enumerate(lines, start=1):
            for pattern, desc in cls.INJECTION_PATTERNS:
                if pattern.search(line):
                    findings.append(ScanFinding(severity="CRITICAL", category="injection", message=desc, file=filename, line=idx))

            for pattern, desc in cls.EXFILTRATION_PATTERNS:
                if pattern.search(line):
                    findings.append(ScanFinding(severity="CRITICAL", category="exfiltration", message=desc, file=filename, line=idx))

            for pattern, desc in cls.DESTRUCTIVE_PATTERNS:
                if pattern.search(line):
                    findings.append(ScanFinding(severity="CRITICAL", category="destructive", message=desc, file=filename, line=idx))

            for pattern, desc in cls.OBFUSCATION_PATTERNS:
                if pattern.search(line):
                    findings.append(ScanFinding(severity="HIGH", category="obfuscation", message=desc, file=filename, line=idx))

            for pattern, desc in cls.SECRET_PATTERNS:
                if pattern.search(line):
                    findings.append(ScanFinding(severity="CRITICAL", category="secret_leak", message=desc, file=filename, line=idx))

        return findings

    @classmethod
    def scan_skill_folder(cls, folder_path: Path, previous_checksum: str | None = None) -> ScanResult:
        """Audits an entire skill folder statically and deterministically."""
        all_findings: list[ScanFinding] = []
        folder_path = folder_path.resolve()
        current_checksum = cls.calculate_folder_checksum(folder_path)

        # 1. Manifest Validation
        manifest_file = folder_path / "skill.json"
        manifest: SkillManifest | None = None

        if manifest_file.exists():
            try:
                manifest_data = json.loads(manifest_file.read_text(encoding="utf-8"))
                manifest = SkillManifest(**manifest_data)
            except json.JSONDecodeError as je:
                all_findings.append(ScanFinding(
                    severity="CRITICAL",
                    category="manifest_invalid",
                    message=f"skill.json contains invalid JSON: {je}",
                    file="skill.json",
                ))
            except Exception as ve:
                all_findings.append(ScanFinding(
                    severity="CRITICAL",
                    category="manifest_invalid",
                    message=f"Manifest schema validation error: {ve}",
                    file="skill.json",
                ))
        else:
            # Check if frontmatter exists in SKILL.md as fallback
            skill_md = folder_path / "SKILL.md"
            if not skill_md.exists():
                all_findings.append(ScanFinding(
                    severity="CRITICAL",
                    category="missing_entrypoint",
                    message="Neither skill.json nor SKILL.md found in skill folder.",
                    file="SKILL.md",
                ))

        # 2. Path Traversal & Symlink Escape Verification
        try:
            for item in folder_path.rglob("*"):
                if item.is_symlink():
                    target = item.resolve()
                    if not target.is_relative_to(folder_path):
                        all_findings.append(ScanFinding(
                            severity="CRITICAL",
                            category="symlink_escape",
                            message=f"Symlink '{item.name}' escapes skill root: {target}",
                            file=str(item.relative_to(folder_path)),
                        ))
                # Check for suspicious parent traversal in names
                if ".." in str(item):
                    all_findings.append(ScanFinding(
                        severity="CRITICAL",
                        category="path_traversal",
                        message=f"Path traversal character detected in path: '{item}'",
                        file=str(item.relative_to(folder_path)),
                    ))
        except Exception as pe:
            all_findings.append(ScanFinding(
                severity="HIGH",
                category="traversal_error",
                message=f"Error checking path security: {pe}",
                file=".",
            ))

        # 3. Content scanning on SKILL.md
        skill_md = folder_path / "SKILL.md"
        skill_content = ""
        if skill_md.exists():
            try:
                skill_content = skill_md.read_text(encoding="utf-8")
                all_findings.extend(cls.scan_content(skill_content, "SKILL.md"))
            except Exception as e:
                all_findings.append(ScanFinding(
                    severity="HIGH",
                    category="io_error",
                    message=f"Could not read SKILL.md: {e}",
                    file="SKILL.md",
                ))
        else:
            all_findings.append(ScanFinding(
                severity="CRITICAL",
                category="missing_file",
                message="Entrypoint SKILL.md is missing.",
                file="SKILL.md",
            ))

        # 4. Content scanning on scripts & references
        for sub in ("scripts", "references"):
            sub_dir = folder_path / sub
            if sub_dir.is_dir():
                for script_file in sub_dir.glob("**/*"):
                    if script_file.is_file() and script_file.suffix in (".py", ".sh", ".js", ".ts", ".bash", ".md"):
                        try:
                            sc = script_file.read_text(encoding="utf-8", errors="ignore")
                            rel_name = str(script_file.relative_to(folder_path))
                            all_findings.extend(cls.scan_content(sc, rel_name))
                        except Exception:
                            pass

        # 5. Excessive Permissions & Undeclared Tools Check
        if manifest:
            # Check for excessive permissions relative to risk level
            if manifest.riskLevel == RiskLevel.LOW:
                if manifest.permissions.shell == "host-with-approval":
                    all_findings.append(ScanFinding(
                        severity="HIGH",
                        category="excessive_permissions",
                        message="Low risk skill should not request host-with-approval shell permission.",
                        file="skill.json",
                    ))
                if manifest.permissions.computerControl != "none":
                    all_findings.append(ScanFinding(
                        severity="HIGH",
                        category="excessive_permissions",
                        message="Low risk skill should not request computer control permissions.",
                        file="skill.json",
                    ))

            # Undeclared tools in instruction check: scan SKILL.md for tool invocation directives
            declared = set(manifest.tools + manifest.optionalTools)
            mentioned_tools = re.findall(r"\btool_([a-z0-9_]+)\b", skill_content)
            for mt in mentioned_tools:
                t_name = f"tool_{mt}"
                # If tool mentioned is not declared and not a general documentation reference
                if t_name not in declared and mt not in declared and t_name not in ("tool_registry", "tool_search_mcp", "tool_call"):
                    all_findings.append(ScanFinding(
                        severity="MEDIUM",
                        category="undeclared_tool",
                        message=f"Skill references undeclared tool '{mt}' in instructions.",
                        file="SKILL.md",
                    ))

        # 6. Scoring and Status Determination
        critical_count = sum(1 for f in all_findings if f.severity == "CRITICAL")
        high_count = sum(1 for f in all_findings if f.severity == "HIGH")
        medium_count = sum(1 for f in all_findings if f.severity == "MEDIUM")
        low_count = sum(1 for f in all_findings if f.severity == "LOW")

        risk_score = min(100, (critical_count * 50) + (high_count * 25) + (medium_count * 10) + (low_count * 3))

        if critical_count > 0 or high_count > 0:
            status = AuditStatus.FAILED
            passed = False
        elif medium_count > 0 or low_count > 0:
            status = AuditStatus.WARNING
            passed = True  # Allowed with warning
        else:
            status = AuditStatus.PASSED
            passed = True

        # Check if audit is stale relative to previous recorded checksum
        if previous_checksum and previous_checksum != current_checksum:
            status = AuditStatus.STALE

        return ScanResult(
            passed=passed,
            status=status,
            risk_score=risk_score,
            findings=all_findings,
            audited_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            audited_version=manifest.version if manifest else "1.0.0",
            checksum=current_checksum,
        )
