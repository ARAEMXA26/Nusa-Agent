"""Security tests for Path Jail, Symlink Traversal, Policy Precedence, and Secret Redaction."""

import os
from pathlib import Path
import pytest
from nusa.security.path_jail import PathJail, PathJailError
from nusa.security.policy_engine import PolicyEngine, PolicyDecision
from nusa.security.redaction import redact_secrets


def test_path_jail_allows_valid_paths(temp_workspace):
    jail = PathJail(temp_workspace)
    valid_file = jail.resolve_safe("src/app.py")
    assert valid_file == temp_workspace.resolve() / "src/app.py"


def test_path_jail_blocks_parent_directory_traversal(temp_workspace):
    jail = PathJail(temp_workspace)
    with pytest.raises(PathJailError):
        jail.resolve_safe("../../etc/passwd")

    with pytest.raises(PathJailError):
        jail.resolve_safe("subdir/../../../../outside.txt")


def test_path_jail_blocks_symlink_escape(temp_workspace):
    jail = PathJail(temp_workspace)
    
    # Create an outside sensitive target
    outside_file = temp_workspace.parent / "sensitive_host_file.txt"
    outside_file.write_text("SUPER_SECRET_KEY=12345")

    # Create a malicious symlink inside workspace pointing outside
    symlink_path = temp_workspace / "sneaky_symlink.txt"
    try:
        os.symlink(outside_file, symlink_path)
    except OSError:
        pytest.skip("Symlink creation not permitted in this test environment")

    with pytest.raises(PathJailError):
        jail.resolve_safe("sneaky_symlink.txt")

    # Clean up outside file
    outside_file.unlink(missing_ok=True)


def test_policy_engine_precedence():
    policy = PolicyEngine("/dummy/workspace")

    # 1. Dangerous shell commands -> DENY
    eval_deny = policy.evaluate("shell_execute", {"command": "rm -rf /"})
    assert eval_deny.decision == PolicyDecision.DENY

    eval_deny_fork = policy.evaluate("shell_execute", {"command": ":(){ :|:& };:"})
    assert eval_deny_fork.decision == PolicyDecision.DENY

    # 2. File write & patch -> ASK (requires human approval)
    eval_write = policy.evaluate("file_write", {"path": "main.py", "content": "print('hello')"})
    assert eval_write.decision == PolicyDecision.ASK
    assert eval_write.requires_approval is True

    eval_patch = policy.evaluate("file_patch", {"path": "main.py", "search_content": "a", "replace_content": "b"})
    assert eval_patch.decision == PolicyDecision.ASK
    assert eval_patch.requires_approval is True

    # 3. Read-only inside workspace -> ALLOW
    eval_read = policy.evaluate("file_read", {"path": "main.py"})
    assert eval_read.decision == PolicyDecision.ALLOW
    assert eval_read.requires_approval is False


def test_secret_redaction():
    text_with_keys = (
        "Here is my API key sk-proj-1234567890abcdefghijklmn and another one: "
        "Authorization: Bearer my_secret_bearer_token_123456"
    )
    redacted = redact_secrets(text_with_keys)
    assert "sk-proj-1234567890abcdefghijklmn" not in redacted
    assert "[REDACTED_API_KEY]" in redacted
    assert "my_secret_bearer_token_123456" not in redacted
    assert "Bearer [REDACTED_TOKEN]" in redacted
