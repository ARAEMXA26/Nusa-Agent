"""Deep AST Static Code Security Scanner for Nusa Agent Plugins."""

import ast
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field


class SecurityFinding(BaseModel):
    rule_id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    message: str
    file_path: str
    line_number: Optional[int] = None
    snippet: Optional[str] = None


class PluginScanReport(BaseModel):
    is_safe: bool
    highest_severity: str
    findings: List[SecurityFinding] = Field(default_factory=list)
    scanned_files_count: int = 0


class PluginASTScanner:
    """Performs deep Abstract Syntax Tree (AST) inspection on Python plugin source files."""

    DANGEROUS_FUNCTIONS = {
        "eval": ("CRITICAL", "Arbitrary code execution via eval()"),
        "exec": ("CRITICAL", "Arbitrary code execution via exec()"),
        "compile": ("HIGH", "Dynamic code compilation detected"),
        "__import__": ("HIGH", "Dynamic module importation detected"),
    }

    DANGEROUS_OS_CALLS = {
        ("os", "system"): ("CRITICAL", "Shell command execution via os.system()"),
        ("os", "popen"): ("HIGH", "Subprocess execution via os.popen()"),
        ("os", "spawn"): ("HIGH", "Process spawning detected"),
        ("ctypes", "*"): ("CRITICAL", "Low-level memory manipulation via ctypes"),
    }

    SENSITIVE_PATTERNS = [
        (re.compile(r"id_rsa|id_ed25519|\.ssh/"), "CRITICAL", "Attempt to access SSH private keys"),
        (re.compile(r"\.aws/credentials|\.aws/config"), "CRITICAL", "Attempt to access AWS credentials"),
        (re.compile(r"/etc/shadow|/etc/passwd"), "CRITICAL", "Attempt to access system authentication files"),
        (re.compile(r"\.env(?:\.local)?"), "HIGH", "Reference to environment secret file (.env)"),
    ]

    def scan_code(self, source_code: str, file_path: str = "main.py") -> List[SecurityFinding]:
        """Scan a Python source code string and return security findings."""
        findings: List[SecurityFinding] = []

        # 1. Regex pattern scanning on raw source
        for pattern, severity, desc in self.SENSITIVE_PATTERNS:
            for match in pattern.finditer(source_code):
                findings.append(
                    SecurityFinding(
                        rule_id="RULE-SECRET-LEAK",
                        severity=severity,
                        message=desc,
                        file_path=file_path,
                        snippet=match.group(0),
                    )
                )

        # 2. Parse Abstract Syntax Tree (AST)
        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            findings.append(
                SecurityFinding(
                    rule_id="RULE-SYNTAX-ERR",
                    severity="MEDIUM",
                    message=f"Plugin syntax error: {str(e)}",
                    file_path=file_path,
                    line_number=e.lineno,
                )
            )
            return findings

        # 3. Walk AST nodes
        for node in ast.walk(tree):
            # Inspect Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in ("ctypes", "pty"):
                        findings.append(
                            SecurityFinding(
                                rule_id="RULE-UNSAFE-IMPORT",
                                severity="HIGH",
                                message=f"Dangerous module import: '{alias.name}'",
                                file_path=file_path,
                                line_number=node.lineno,
                            )
                        )
            elif isinstance(node, ast.ImportFrom):
                if node.module in ("ctypes", "pty"):
                    findings.append(
                        SecurityFinding(
                            rule_id="RULE-UNSAFE-IMPORT",
                            severity="HIGH",
                            message=f"Dangerous module import from: '{node.module}'",
                            file_path=file_path,
                            line_number=node.lineno,
                        )
                    )

            # Inspect Function & Method Calls
            elif isinstance(node, ast.Call):
                func_name = None
                caller = None

                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name in self.DANGEROUS_FUNCTIONS:
                        sev, msg = self.DANGEROUS_FUNCTIONS[func_name]
                        findings.append(
                            SecurityFinding(
                                rule_id="RULE-DYNAMIC-EXEC",
                                severity=sev,
                                message=msg,
                                file_path=file_path,
                                line_number=node.lineno,
                            )
                        )

                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                    if isinstance(node.func.value, ast.Name):
                        caller = node.func.value.id

                    # Check os calls
                    if caller == "os" and func_name in ("system", "popen", "spawnl", "spawnv"):
                        findings.append(
                            SecurityFinding(
                                rule_id="RULE-OS-SHELL",
                                severity="CRITICAL",
                                message=f"Direct shell invocation: os.{func_name}()",
                                file_path=file_path,
                                line_number=node.lineno,
                            )
                        )
                    # Check shutil.rmtree targeting root or recursive deletions
                    elif caller == "shutil" and func_name == "rmtree":
                        findings.append(
                            SecurityFinding(
                                rule_id="RULE-DESTRUCTIVE-FS",
                                severity="HIGH",
                                message="Recursive file tree deletion: shutil.rmtree()",
                                file_path=file_path,
                                line_number=node.lineno,
                            )
                        )
                    # Check subprocess.Popen/run with shell=True
                    elif caller == "subprocess":
                        for kw in node.keywords:
                            if kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                                findings.append(
                                    SecurityFinding(
                                        rule_id="RULE-SUBPROCESS-SHELL",
                                        severity="CRITICAL",
                                        message="Subprocess execution with shell=True",
                                        file_path=file_path,
                                        line_number=node.lineno,
                                    )
                                )

                    # Check socket networking
                    elif caller == "socket" and func_name in ("socket", "create_connection"):
                        findings.append(
                            SecurityFinding(
                                rule_id="RULE-RAW-SOCKET",
                                severity="HIGH",
                                message="Raw network socket creation detected",
                                file_path=file_path,
                                line_number=node.lineno,
                            )
                        )

        return findings

    def scan_plugin_directory(self, plugin_dir: Path) -> PluginScanReport:
        """Recursively scan all Python files within a plugin directory."""
        findings: List[SecurityFinding] = []
        scanned_count = 0

        for file_path in plugin_dir.rglob("*.py"):
            if file_path.is_file():
                try:
                    code = file_path.read_text(encoding="utf-8")
                    rel_path = file_path.relative_to(plugin_dir).as_posix()
                    file_findings = self.scan_code(code, file_path=rel_path)
                    findings.extend(file_findings)
                    scanned_count += 1
                except Exception as e:
                    findings.append(
                        SecurityFinding(
                            rule_id="RULE-READ-ERR",
                            severity="LOW",
                            message=f"Could not read file: {e}",
                            file_path=str(file_path),
                        )
                    )

        highest = "INFO"
        is_safe = True
        severity_ranks = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
        curr_rank = 0

        for f in findings:
            rank = severity_ranks.get(f.severity, 0)
            if rank > curr_rank:
                curr_rank = rank
                highest = f.severity
            if rank >= 3:  # HIGH or CRITICAL blocks installation
                is_safe = False

        return PluginScanReport(
            is_safe=is_safe,
            highest_severity=highest,
            findings=findings,
            scanned_files_count=scanned_count,
        )


plugin_scanner = PluginASTScanner()
