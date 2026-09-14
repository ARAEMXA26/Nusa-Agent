"""Unit tests for Plugin Marketplace and Lifecycle Manager."""

import json
import tempfile
from pathlib import Path
import pytest
from nusa.db.connection import init_db
from nusa.plugins.crypto import (
    generate_signing_keypair,
    sign_data,
    calculate_directory_hash,
)
from nusa.plugins.manager import PluginManager


@pytest.fixture
def temp_plugin_env():
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        test_db = tpath / "test_plugins.sqlite"
        init_db(test_db)
        p_dir = tpath / "installed_plugins"
        mgr = PluginManager(plugins_dir=p_dir, db_path=test_db)
        yield mgr, tpath


def test_marketplace_catalog(temp_plugin_env):
    mgr, _ = temp_plugin_env
    catalog = mgr.get_marketplace_catalog()
    assert len(catalog) >= 3
    cat_ids = [p["id"] for p in catalog]
    assert "nusa-docker-tools" in cat_ids
    assert "nusa-git-sync" in cat_ids


def test_install_valid_signed_plugin(temp_plugin_env):
    mgr, root = temp_plugin_env
    priv_hex, pub_hex = generate_signing_keypair()

    # Create dummy safe plugin
    src_plugin = root / "sample_plugin"
    src_plugin.mkdir()
    code_file = src_plugin / "main.py"
    code_file.write_text("def ping(): return 'pong'", encoding="utf-8")

    # Compute checksum
    checksum = calculate_directory_hash(src_plugin)
    signature = sign_data(priv_hex, checksum.encode("utf-8"))

    manifest = {
        "id": "sample-crypto-plugin",
        "name": "Sample Crypto Plugin",
        "version": "1.0.0",
        "author": "Tester",
        "description": "A verified test plugin",
        "permissions": ["fs_read"],
        "checksum": checksum,
        "signature": signature,
        "tools": [
            {
                "name": "plugin_ping",
                "description": "Ping tool from plugin",
                "parameters": {"type": "object", "properties": {}},
            }
        ],
    }
    (src_plugin / "plugin.json").write_text(json.dumps(manifest), encoding="utf-8")

    # Install using the custom public key
    result = mgr.install_plugin(src_plugin, public_key_hex=pub_hex)
    assert result["id"] == "sample-crypto-plugin"
    assert result["status"] == "installed"
    assert result["verification_status"] == "verified"

    # Verify in DB
    installed = mgr.list_installed_plugins()
    assert len(installed) == 1
    assert installed[0]["id"] == "sample-crypto-plugin"

    # Toggle plugin
    toggled = mgr.toggle_plugin("sample-crypto-plugin", enabled=False)
    assert toggled["status"] == "disabled"

    # Uninstall plugin
    uninstalled = mgr.uninstall_plugin("sample-crypto-plugin")
    assert uninstalled is True
    assert len(mgr.list_installed_plugins()) == 0


def test_block_malicious_plugin(temp_plugin_env):
    mgr, root = temp_plugin_env
    src_plugin = root / "malicious_plugin"
    src_plugin.mkdir()
    (src_plugin / "bad.py").write_text("import os; os.system('echo hacked')", encoding="utf-8")

    manifest = {
        "id": "malicious-exploit",
        "name": "Malicious Exploit Plugin",
        "version": "1.0.0",
        "author": "Attacker",
    }
    (src_plugin / "plugin.json").write_text(json.dumps(manifest), encoding="utf-8")

    # Should raise PermissionError because AST scanner detects os.system
    with pytest.raises(PermissionError) as exc_info:
        mgr.install_plugin(src_plugin)
    assert "blocked by Static Security Scanner" in str(exc_info.value)
