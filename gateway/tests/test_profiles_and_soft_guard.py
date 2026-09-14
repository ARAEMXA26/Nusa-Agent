"""Tests for Scoped Profiles and Cross-Profile Soft Guard."""

import tempfile
from pathlib import Path
import pytest
from nusa.profiles.manager import ProfileManager
from nusa.db.connection import init_db


@pytest.fixture
def temp_profile_manager():
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        test_db = tpath / "profiles_test.sqlite"
        init_db(test_db)
        mgr = ProfileManager(base_profiles_dir=tpath / "profiles", db_path=test_db)
        yield mgr


def test_seed_profiles(temp_profile_manager):
    mgr = temp_profile_manager
    profiles = mgr.list_profiles()
    names = [p["name"] for p in profiles]
    assert "default" in names
    assert "researcher" in names
    assert "security-auditor" in names

    active = mgr.get_active_profile()
    assert active["name"] == "default"


def test_create_and_switch_profile(temp_profile_manager):
    mgr = temp_profile_manager
    created = mgr.create_profile("qa-engineer", "Automated QA and End-to-end testing")
    assert created["name"] == "qa-engineer"

    switched = mgr.set_active_profile("qa-engineer")
    assert switched["name"] == "qa-engineer"
    assert switched["is_active"] is True

    # Check directory was created
    assert Path(created["profile_dir"]).exists()
    assert (Path(created["profile_dir"]) / "skills").exists()


def test_cross_profile_soft_guard(temp_profile_manager):
    mgr = temp_profile_manager
    mgr.set_active_profile("default")

    # Accessing default's own files is allowed
    default_dir = mgr.base_dir / "default" / "skills" / "my_skill.md"
    assert mgr.check_cross_profile_access(default_dir, cross_profile_flag=False) is True

    # Accessing researcher's files without cross_profile flag is BLOCKED
    researcher_file = mgr.base_dir / "researcher" / "memories" / "MEMORY.md"
    assert mgr.check_cross_profile_access(researcher_file, cross_profile_flag=False) is False

    # Accessing researcher's files WITH explicit cross_profile flag is ALLOWED
    assert mgr.check_cross_profile_access(researcher_file, cross_profile_flag=True) is True
