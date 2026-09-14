"""Plugin Marketplace and Manager with Integrity Verification and AST Security Scanner."""

import json
import logging
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from nusa.config import config
from nusa.db.connection import get_db, init_db
from nusa.plugins.crypto import (
    OFFICIAL_NUSA_PUBLIC_KEY_HEX,
    calculate_directory_hash,
    verify_signature,
)
from nusa.plugins.scanner import plugin_scanner, PluginScanReport
from nusa.tools.registry import tool_registry, ToolDefinition

logger = logging.getLogger("nusa.plugins")


class PluginManifest(BaseModel):
    id: str
    name: str
    version: str = "1.0.0"
    author: str = "Nusa Team"
    description: str = ""
    permissions: List[str] = Field(default_factory=list)
    entrypoint: str = "main.py"
    tools: List[Dict[str, Any]] = Field(default_factory=list)
    signature: Optional[str] = None
    checksum: Optional[str] = None


class PluginManager:
    """Orchestrates plugin lifecycle: discovery, security scanning, cryptographic verification, and loading."""

    def __init__(self, plugins_dir: Optional[Path] = None, db_path: Optional[Path] = None):
        self.plugins_dir = plugins_dir or (config.data_dir / "plugins")
        self.db_path = db_path
        self.plugins_dir.mkdir(parents=True, exist_ok=True)
        self._init_db_and_marketplace()

    def _init_db_and_marketplace(self) -> None:
        """Ensure DB tables exist and catalog directory is prepared."""
        init_db(self.db_path)

    def get_marketplace_catalog(self) -> List[Dict[str, Any]]:
        """Return curated plugins available in the Nusa Plugin Marketplace."""
        return [
            {
                "id": "nusa-docker-tools",
                "name": "Docker & Container Ops",
                "version": "1.2.0",
                "author": "Nusa Official",
                "description": "Docker container lifecycle management, image inspection, and isolated task execution.",
                "category": "DevOps",
                "permissions": ["shell", "fs_read"],
                "is_official": True,
                "stars": 342,
            },
            {
                "id": "nusa-git-sync",
                "name": "Git Flow & PR Assistant",
                "version": "1.0.4",
                "author": "Nusa Official",
                "description": "Intelligent branch orchestration, merge conflict resolution, and automated PR generation.",
                "category": "Development",
                "permissions": ["shell", "fs_read", "fs_write"],
                "is_official": True,
                "stars": 519,
            },
            {
                "id": "nusa-sqlite-inspector",
                "name": "SQLite WAL Analyzer",
                "version": "1.1.0",
                "author": "Nusa Official",
                "description": "Visual schema inspector, index performance analyzer, and query plan explainer.",
                "category": "Database",
                "permissions": ["fs_read"],
                "is_official": True,
                "stars": 288,
            },
            {
                "id": "nusa-web-scraper",
                "name": "DOM Markdown Extractor",
                "version": "0.9.5",
                "author": "Community (OpenSource)",
                "description": "Clean markdown extractor from web pages using headless readability heuristics.",
                "category": "Web Automation",
                "permissions": ["network", "browser"],
                "is_official": False,
                "stars": 174,
            },
        ]

    def list_installed_plugins(self) -> List[Dict[str, Any]]:
        """List all installed plugins from SQLite WAL database."""
        with get_db(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM plugins ORDER BY installed_at DESC").fetchall()
            result = []
            for r in rows:
                item = dict(r)
                if item.get("permissions"):
                    try:
                        item["permissions"] = json.loads(item["permissions"])
                    except Exception:
                        item["permissions"] = []
                result.append(item)
            return result

    def get_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific installed plugin by ID."""
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT * FROM plugins WHERE id = ?", (plugin_id,)).fetchone()
            if not row:
                return None
            item = dict(row)
            if item.get("permissions"):
                try:
                    item["permissions"] = json.loads(item["permissions"])
                except Exception:
                    item["permissions"] = []
            return item

    def install_plugin(
        self,
        source_dir: Path,
        public_key_hex: Optional[str] = None,
        force_untrusted: bool = False,
    ) -> Dict[str, Any]:
        """Install, verify, and register a plugin from a directory."""
        manifest_path = source_dir / "plugin.json"
        if not manifest_path.exists():
            raise ValueError(f"Missing plugin.json manifest in {source_dir}")

        manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest = PluginManifest(**manifest_data)

        # 1. Deep AST Static Security Scan
        scan_report: PluginScanReport = plugin_scanner.scan_plugin_directory(source_dir)
        if not scan_report.is_safe and not force_untrusted:
            # Dangerous plugin code detected
            status = "quarantined"
            verification_status = "untrusted"
            findings_summary = "; ".join(f"[{f.severity}] {f.message}" for f in scan_report.findings[:3])
            raise PermissionError(
                f"Plugin '{manifest.id}' blocked by Static Security Scanner (Highest Severity: {scan_report.highest_severity}): {findings_summary}"
            )

        # 2. Checksum Verification
        computed_checksum = calculate_directory_hash(source_dir)
        verification_status = "untrusted"

        if manifest.checksum:
            if manifest.checksum != computed_checksum:
                raise ValueError(
                    f"Checksum mismatch for plugin '{manifest.id}': expected {manifest.checksum}, got {computed_checksum}. Possible tampering detected!"
                )

        # 3. Cryptographic Signature Verification
        target_pub_key = public_key_hex or OFFICIAL_NUSA_PUBLIC_KEY_HEX
        if manifest.signature:
            # Verify signature against computed directory checksum
            is_valid = verify_signature(
                public_key_hex=target_pub_key,
                data=computed_checksum.encode("utf-8"),
                signature_hex=manifest.signature,
            )
            if is_valid:
                verification_status = "verified"
            else:
                if not force_untrusted:
                    raise ValueError(f"Invalid cryptographic signature for plugin '{manifest.id}'.")
                verification_status = "untrusted"

        # 4. Copy to installed plugins directory
        dest_dir = self.plugins_dir / manifest.id
        if dest_dir.exists():
            shutil.rmtree(dest_dir)
        shutil.copytree(source_dir, dest_dir)

        status = "quarantined" if not scan_report.is_safe else "installed"

        # 5. Persist into SQLite DB
        with get_db(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO plugins (
                    id, name, version, author, description, status, verification_status,
                    signature, checksum, permissions, installed_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    manifest.id,
                    manifest.name,
                    manifest.version,
                    manifest.author,
                    manifest.description,
                    status,
                    verification_status,
                    manifest.signature,
                    computed_checksum,
                    json.dumps(manifest.permissions),
                    str(dest_dir),
                ),
            )

        # 6. If safe and installed, dynamically register tools
        if status == "installed":
            self._register_plugin_tools(manifest, dest_dir)

        return {
            "id": manifest.id,
            "name": manifest.name,
            "version": manifest.version,
            "status": status,
            "verification_status": verification_status,
            "checksum": computed_checksum,
            "scan_report": scan_report.dict(),
            "installed_path": str(dest_dir),
        }

    def _register_plugin_tools(self, manifest: PluginManifest, plugin_dir: Path) -> None:
        """Register tools defined in plugin manifest into Nusa ToolRegistry."""
        for tool_spec in manifest.tools:
            t_name = tool_spec.get("name")
            if not t_name:
                continue

            schema = tool_spec.get("parameters", {"type": "object", "properties": {}})
            tool_def = ToolDefinition(
                name=t_name,
                description=f"[{manifest.name}] {tool_spec.get('description', '')}",
                parameters=[],
                parameters_schema=schema,
            )
            tool_registry.register_tool(tool_def)
            logger.info(f"Registered plugin tool: {t_name}")

    def uninstall_plugin(self, plugin_id: str) -> bool:
        """Uninstall and remove a plugin."""
        plugin = self.get_plugin(plugin_id)
        if not plugin:
            return False

        # Remove from disk
        p_path = Path(plugin["installed_path"])
        if p_path.exists():
            shutil.rmtree(p_path)

        # Remove from database
        with get_db(self.db_path) as conn:
            conn.execute("DELETE FROM plugins WHERE id = ?", (plugin_id,))

        return True

    def toggle_plugin(self, plugin_id: str, enabled: bool) -> Dict[str, Any]:
        """Enable or disable an installed plugin."""
        new_status = "installed" if enabled else "disabled"
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT id FROM plugins WHERE id = ?", (plugin_id,)).fetchone()
            if not row:
                raise ValueError(f"Plugin '{plugin_id}' not found.")

            conn.execute(
                "UPDATE plugins SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_status, plugin_id),
            )

        return self.get_plugin(plugin_id) or {}


plugin_manager = PluginManager()
