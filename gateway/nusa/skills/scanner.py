"""Static Security Scanner for Agent Skills and Scripts."""

import re
from pathlib import Path
from pydantic import BaseModel


class ScanFinding(BaseModel):
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    message: str
    file: str = "SKILL.md"
    line: int | None = None


class ScanResult(BaseModel):
    passed: bool
    findings: list[ScanFinding]
    risk_score: int  # 0 to 100


class SkillSecurityScanner:
    """Scans skills statically for prompt injection, secret exfiltration, and destructive commands."""

    INJECTION_PATTERNS = [
        (re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE), "Prompt Injection: Instruction Override"),
        (re.compile(r"bypass\s+(the\s+)?(policy|security|guardrails|sandbox)", re.IGNORECASE), "Prompt Injection: Policy Bypass"),
        (re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE), "Prompt Injection: Mode Escape"),
        (re.compile(r"disregard\s+system\s+rules", re.IGNORECASE), "Prompt Injection: System Rules Disregard"),
    ]

    EXFILTRATION_PATTERNS = [
        (re.compile(r"(curl|wget)\s+.*-(d|F|T)\s+.*(\.env|secret|id_rsa|token)", re.IGNORECASE), "Exfiltration: Sensitive File Upload"),
        (re.compile(r"https?://(webhook\.site|pipedream\.net|ngrok\.io)", re.IGNORECASE), "Exfiltration: Suspicious Exfiltration Domain"),
        (re.compile(r"nc\s+-[el].*\d+", re.IGNORECASE), "Exfiltration: Netcat Reverse Shell"),
    ]

    DESTRUCTIVE_PATTERNS = [
        (re.compile(r"rm\s+-rf\s+[/~]", re.IGNORECASE), "Destructive Command: Root/Home Deletion"),
        (re.compile(r":\(\)\s*\{\s*:\|:&\s*\};:", re.IGNORECASE), "Destructive Command: Fork Bomb"),
        (re.compile(r"mkfs(\.[a-z0-9]+)?\s+", re.IGNORECASE), "Destructive Command: Filesystem Format"),
        (re.compile(r"dd\s+if=/dev/(zero|urandom)\s+of=/dev/", re.IGNORECASE), "Destructive Command: Disk Wipe"),
    ]

    OBFUSCATION_PATTERNS = [
        (re.compile(r"(eval|exec)\s*\(\s*base64\.b64decode", re.IGNORECASE), "Obfuscation: Encoded Execution"),
        (re.compile(r"__import__\s*\(\s*['\"]os['\"]\s*\)\.system", re.IGNORECASE), "Obfuscation: Dynamic OS Invocation"),
    ]

    @classmethod
    def scan_content(cls, content: str, filename: str = "SKILL.md") -> list[ScanFinding]:
        findings = []
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

        return findings

    @classmethod
    def scan_skill_folder(cls, folder_path: Path) -> ScanResult:
        all_findings: list[ScanFinding] = []

        # Scan SKILL.md
        skill_md = folder_path / "SKILL.md"
        if skill_md.exists():
            try:
                content = skill_md.read_text(encoding="utf-8")
                all_findings.extend(cls.scan_content(content, "SKILL.md"))
            except Exception as e:
                all_findings.append(ScanFinding(severity="HIGH", category="io_error", message=f"Could not read SKILL.md: {e}", file="SKILL.md"))

        # Scan any scripts inside scripts/
        scripts_dir = folder_path / "scripts"
        if scripts_dir.is_dir():
            for script_file in scripts_dir.glob("**/*"):
                if script_file.is_file() and script_file.suffix in (".py", ".sh", ".js", ".bash"):
                    try:
                        content = script_file.read_text(encoding="utf-8", errors="ignore")
                        all_findings.extend(cls.scan_content(content, str(script_file.relative_to(folder_path))))
                    except Exception:
                        pass

        # Calculate risk score
        critical_count = sum(1 for f in all_findings if f.severity == "CRITICAL")
        high_count = sum(1 for f in all_findings if f.severity == "HIGH")
        medium_count = sum(1 for f in all_findings if f.severity == "MEDIUM")

        risk_score = min(100, (critical_count * 50) + (high_count * 25) + (medium_count * 10))
        passed = critical_count == 0 and high_count == 0

        return ScanResult(passed=passed, findings=all_findings, risk_score=risk_score)
