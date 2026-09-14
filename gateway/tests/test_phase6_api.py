"""Integration tests for Phase 6 Plugin REST API endpoints."""

import json
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from nusa.main import app
from nusa.plugins.crypto import (
    generate_signing_keypair,
    sign_data,
    calculate_directory_hash,
)

client = TestClient(app)


def test_api_plugins_marketplace():
    resp = client.get("/api/plugins/marketplace")
    assert resp.status_code == 200
    data = resp.json()
    assert "catalog" in data
    assert data["total"] >= 3

    # Search
    search_resp = client.get("/api/plugins/marketplace?search=docker")
    assert search_resp.status_code == 200
    assert len(search_resp.json()["catalog"]) >= 1


def test_api_plugins_scan_and_install_flow():
    with tempfile.TemporaryDirectory() as td:
        pdir = Path(td) / "test_api_plugin"
        pdir.mkdir()
        (pdir / "main.py").write_text("def ping(): return 'pong'", encoding="utf-8")

        # 1. On-demand scan
        scan_resp = client.post("/api/plugins/scan", json={"directory_path": str(pdir)})
        assert scan_resp.status_code == 200
        report = scan_resp.json()["report"]
        assert report["is_safe"] is True

        # Sign plugin
        priv_hex, pub_hex = generate_signing_keypair()
        checksum = calculate_directory_hash(pdir)
        sig = sign_data(priv_hex, checksum.encode("utf-8"))

        manifest = {
            "id": "test-api-plugin-01",
            "name": "Test API Plugin 01",
            "version": "1.0.0",
            "checksum": checksum,
            "signature": sig,
            "permissions": ["network"],
        }
        (pdir / "plugin.json").write_text(json.dumps(manifest), encoding="utf-8")

        # 2. Install
        install_resp = client.post(
            "/api/plugins/install",
            json={
                "source_dir": str(pdir),
                "public_key_hex": pub_hex,
                "force_untrusted": False,
            },
        )
        assert install_resp.status_code == 200
        p_res = install_resp.json()["plugin"]
        assert p_res["id"] == "test-api-plugin-01"
        assert p_res["verification_status"] == "verified"

        # 3. List installed
        list_resp = client.get("/api/plugins/installed")
        assert list_resp.status_code == 200
        installed = list_resp.json()["plugins"]
        assert any(p["id"] == "test-api-plugin-01" for p in installed)

        # 4. Toggle
        toggle_resp = client.post("/api/plugins/test-api-plugin-01/toggle", json={"enabled": False})
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["plugin"]["status"] == "disabled"

        # 5. Uninstall
        del_resp = client.delete("/api/plugins/test-api-plugin-01")
        assert del_resp.status_code == 200
