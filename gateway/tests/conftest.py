"""Pytest configuration and test fixtures."""

import os
import shutil
import tempfile
from pathlib import Path
import pytest
from nusa.config import config
from nusa.db.connection import init_db


@pytest.fixture
def temp_workspace():
    """Create a temporary directory simulating a user project workspace."""
    temp_dir = tempfile.mkdtemp(prefix="nusa_workspace_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def test_db():
    """Create a temporary SQLite database for testing."""
    temp_dir = tempfile.mkdtemp(prefix="nusa_db_")
    db_file = Path(temp_dir) / "test_nusa.sqlite"
    old_db_path = config.db_path
    config.db_path = db_file
    init_db(db_file)
    yield db_file
    config.db_path = old_db_path
    shutil.rmtree(temp_dir, ignore_errors=True)
