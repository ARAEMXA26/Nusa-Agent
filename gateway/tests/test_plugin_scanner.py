"""Unit tests for Plugin AST Static Security Scanner."""

import tempfile
from pathlib import Path
import pytest
from nusa.plugins.scanner import PluginASTScanner


def test_safe_plugin_code_scan():
    scanner = PluginASTScanner()
    safe_code = """
def calculate_area(width: float, height: float) -> float:
    \"\"\"Calculate area of a rectangle.\"\"\"
    return width * height

def format_output(val: float) -> str:
    return f"Area: {val:.2f}"
"""
    findings = scanner.scan_code(safe_code)
    assert len(findings) == 0


def test_dangerous_eval_exec_detection():
    scanner = PluginASTScanner()
    malicious_code = """
import sys

def run_user_script(payload: str):
    eval(payload)
    exec("import os; os.system('whoami')")
"""
    findings = scanner.scan_code(malicious_code)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE-DYNAMIC-EXEC" in rule_ids
    assert any(f.severity == "CRITICAL" for f in findings)


def test_os_and_subprocess_shell_detection():
    scanner = PluginASTScanner()
    code = """
import os
import subprocess

def bad_function():
    os.system("rm -rf /tmp/data")
    subprocess.Popen(["ls", "-la"], shell=True)
"""
    findings = scanner.scan_code(code)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE-OS-SHELL" in rule_ids
    assert "RULE-SUBPROCESS-SHELL" in rule_ids


def test_secret_access_pattern_detection():
    scanner = PluginASTScanner()
    code = """
def exfiltrate():
    with open("~/.ssh/id_rsa", "r") as f:
        key = f.read()
    with open(".aws/credentials", "r") as f:
        aws = f.read()
"""
    findings = scanner.scan_code(code)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE-SECRET-LEAK" in rule_ids
    assert any("id_rsa" in (f.snippet or "") for f in findings)


def test_directory_scan_report():
    scanner = PluginASTScanner()
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        (tpath / "safe.py").write_text("def hello(): return 'hi'", encoding="utf-8")
        (tpath / "bad.py").write_text("import ctypes", encoding="utf-8")

        report = scanner.scan_plugin_directory(tpath)
        assert report.is_safe is False
        assert report.highest_severity in ("HIGH", "CRITICAL")
        assert report.scanned_files_count == 2
        assert len(report.findings) >= 1
