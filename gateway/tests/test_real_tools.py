"""Integration tests for real filesystem tools and verification test runner."""

import pytest
from nusa.tools.file_tools import (
    tool_file_read,
    tool_file_write,
    tool_file_patch,
    tool_file_list,
)
from nusa.tools.test_tools import tool_run_test


def test_file_write_read_and_patch(temp_workspace):
    workspace = str(temp_workspace)

    # 1. Write file
    initial_content = "def calculate(a, b):\n    return a - b\n"
    res_write = tool_file_write(workspace, "math_utils.py", initial_content)
    assert res_write["success"] is True
    assert (temp_workspace / "math_utils.py").exists()

    # 2. Read file
    res_read = tool_file_read(workspace, "math_utils.py")
    assert res_read["success"] is True
    assert res_read["content"] == initial_content

    # 3. Apply patch
    res_patch = tool_file_patch(
        workspace,
        "math_utils.py",
        search_content="return a - b",
        replace_content="return a + b",
    )
    assert res_patch["success"] is True
    assert "--- a/math_utils.py" in res_patch["diff"]
    assert "+    return a + b" in res_patch["diff"]

    # Verify updated content on disk
    updated_content = (temp_workspace / "math_utils.py").read_text(encoding="utf-8")
    assert "return a + b" in updated_content


def test_patch_fails_if_search_string_not_found(temp_workspace):
    workspace = str(temp_workspace)
    tool_file_write(workspace, "test.txt", "line 1\nline 2\n")

    res = tool_file_patch(workspace, "test.txt", "non_existent_text", "new_text")
    assert res["success"] is False
    assert "not found" in res["error"]


def test_patch_fails_if_ambiguous_multiple_matches(temp_workspace):
    workspace = str(temp_workspace)
    tool_file_write(workspace, "test.txt", "foo\nbar\nfoo\n")

    res = tool_file_patch(workspace, "test.txt", "foo", "baz")
    assert res["success"] is False
    assert "disambiguate" in res["error"]


@pytest.mark.asyncio
async def test_real_verification_test_runner(temp_workspace):
    workspace = str(temp_workspace)

    # Write a small script that succeeds
    (temp_workspace / "test_success.py").write_text("assert 1 + 1 == 2\nprint('PASSED!')\n")
    res_pass = await tool_run_test(workspace, "python3 test_success.py")
    assert res_pass["success"] is True
    assert res_pass["passed"] is True
    assert res_pass["exit_code"] == 0
    assert "PASSED!" in res_pass["stdout"]

    # Write a small script that fails
    (temp_workspace / "test_failure.py").write_text("assert 1 + 1 == 99, 'Math is broken'\n")
    res_fail = await tool_run_test(workspace, "python3 test_failure.py")
    assert res_fail["success"] is True
    assert res_fail["passed"] is False
    assert res_fail["exit_code"] != 0
    assert "Math is broken" in res_fail["stderr"]
