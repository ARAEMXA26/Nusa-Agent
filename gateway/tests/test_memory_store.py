"""Tests for Long-term Memory Store and progressive context injection."""

import tempfile
from pathlib import Path
import pytest
from nusa.memory.store import MemoryStore
from nusa.db.connection import init_db


@pytest.fixture
def temp_memory_store():
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        db_path = tpath / "test.sqlite"
        init_db(db_path)
        mem_dir = tpath / "memories"
        store = MemoryStore(global_memory_dir=mem_dir)
        yield store


def test_memory_store_and_retrieve(temp_memory_store):
    store = temp_memory_store
    res = store.store_memory(
        key="tech_stack",
        value="Frontend: React + Tailwind. Backend: FastAPI + SQLite.",
        scope="global",
    )
    assert res["key"] == "tech_stack"

    retrieved = store.get_memory("tech_stack", scope="global")
    assert retrieved is not None
    assert "React" in retrieved["value"]


def test_memory_search_and_ranking(temp_memory_store):
    store = temp_memory_store
    store.store_memory("auth_policy", "Always use JWT with 15min expiry", scope="global")
    store.store_memory("db_config", "PostgreSQL in prod, SQLite WAL in local", scope="global")

    search_jwt = store.search_memories("JWT expiry")
    assert len(search_jwt) >= 1
    assert search_jwt[0]["key"] == "auth_policy"

    search_db = store.search_memories("SQLite local WAL")
    assert len(search_db) >= 1
    assert any(r["key"] == "db_config" for r in search_db)


def test_memory_context_snippet_formatting(temp_memory_store):
    store = temp_memory_store
    store.store_memory("coding_rule", "Write type hints for every function", scope="global")
    snippet = store.format_context_snippet()
    assert "User Preferences" in snippet
    assert "Global Memory" in snippet
    assert "coding_rule" in snippet


def test_memory_delete(temp_memory_store):
    store = temp_memory_store
    store.store_memory("temp_item", "to be forgotten", scope="global")
    assert store.get_memory("temp_item", scope="global") is not None

    assert store.delete_memory("temp_item") is True
    assert store.get_memory("temp_item", scope="global") is None
