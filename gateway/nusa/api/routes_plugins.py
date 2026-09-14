"""API routes for Nusa Plugin Marketplace, Cryptographic Verification, and AST Security Scanner."""

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nusa.plugins.manager import plugin_manager
from nusa.plugins.scanner import plugin_scanner

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


class PluginInstallRequest(BaseModel):
    source_dir: str
    public_key_hex: Optional[str] = None
    force_untrusted: bool = False


class PluginScanRequest(BaseModel):
    directory_path: str


class PluginToggleRequest(BaseModel):
    enabled: bool


@router.get("/marketplace")
async def list_marketplace(
    category: Optional[str] = Query(None, description="Filter by plugin category"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
):
    """Retrieve available plugins in the curated marketplace."""
    catalog = plugin_manager.get_marketplace_catalog()
    if category:
        catalog = [p for p in catalog if p.get("category", "").lower() == category.lower()]
    if search:
        s = search.lower()
        catalog = [
            p
            for p in catalog
            if s in p.get("name", "").lower()
            or s in p.get("description", "").lower()
            or s in p.get("id", "").lower()
        ]
    return {"catalog": catalog, "total": len(catalog)}


@router.get("/installed")
async def list_installed():
    """List all installed and quarantined plugins."""
    plugins = plugin_manager.list_installed_plugins()
    return {"plugins": plugins, "total": len(plugins)}


@router.post("/scan")
async def scan_plugin_source(req: PluginScanRequest):
    """Run an on-demand static AST security scan on a plugin folder."""
    p_dir = Path(req.directory_path)
    if not p_dir.exists() or not p_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory '{req.directory_path}' does not exist.")

    report = plugin_scanner.scan_plugin_directory(p_dir)
    return {"report": report.dict()}


@router.post("/install")
async def install_plugin(req: PluginInstallRequest):
    """Install, verify signature/checksum, and scan a plugin."""
    p_dir = Path(req.source_dir)
    if not p_dir.exists() or not p_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"Source directory '{req.source_dir}' does not exist.")

    try:
        res = plugin_manager.install_plugin(
            source_dir=p_dir,
            public_key_hex=req.public_key_hex,
            force_untrusted=req.force_untrusted,
        )
        return {"plugin": res, "message": "Plugin successfully verified and installed"}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to install plugin: {e}")


@router.post("/{plugin_id}/toggle")
async def toggle_plugin(plugin_id: str, req: PluginToggleRequest):
    """Enable or disable a plugin."""
    try:
        plugin = plugin_manager.toggle_plugin(plugin_id, req.enabled)
        return {"plugin": plugin}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.delete("/{plugin_id}")
async def uninstall_plugin(plugin_id: str):
    """Uninstall a plugin and remove its artifacts."""
    success = plugin_manager.uninstall_plugin(plugin_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_id}' not found.")
    return {"message": f"Plugin '{plugin_id}' uninstalled successfully."}
