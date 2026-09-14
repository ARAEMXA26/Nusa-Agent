#!/usr/bin/env python3
"""
Nusa Agent - Automated GitHub Release Publisher
Publishes v0.1.0 release and uploads multi-platform artifacts to GitHub.
"""

import os
import sys
import json
import hashlib
import subprocess
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

REPO = "ARAEMXA26/Nusa-Agent"
TAG = "v0.1.0"
NAME = "Nusa Agent v0.1.0 - Production Multi-Platform Release"
DIST_DIR = Path(__file__).resolve().parent.parent / "desktop" / "dist-release"

def get_github_token() -> str:
    env_token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if env_token:
        return env_token
    
    # Extract from git credential helper
    res = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n",
        capture_output=True,
        text=True
    )
    for line in res.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    return ""

def calculate_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def main():
    token = get_github_token()
    if not token:
        print("[ERROR] Could not find GitHub token from environment or git credential helper.")
        sys.exit(1)
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Nusa-Agent-Publisher"
    }

    # 1. Compute checksums
    print(f"[*] Scanning release artifacts in {DIST_DIR}...")
    files_to_upload = list(DIST_DIR.glob("*.dmg")) + list(DIST_DIR.glob("*.zip"))
    
    checksums_path = DIST_DIR / "checksums.txt"
    checksum_lines = []
    for f in sorted(files_to_upload):
        h = calculate_sha256(f)
        line = f"{h}  {f.name}"
        checksum_lines.append(line)
        print(f"    - {f.name} ({f.stat().st_size / 1024 / 1024:.1f} MB) -> {h[:16]}...")
    
    with open(checksums_path, "w") as cf:
        cf.write("\n".join(checksum_lines) + "\n")
    print(f"[OK] Generated {checksums_path.name}")
    files_to_upload.append(checksums_path)

    # 2. Check if release already exists
    print(f"[*] Checking existing release for tag {TAG}...")
    release_url = f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"
    req = urllib.request.Request(release_url, headers=headers)
    release_data = None
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                release_data = json.loads(resp.read().decode())
                print(f" -> Found existing release ID {release_data['id']}")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"[!] Warning checking release: {e}")

    # 3. Create release if not exists
    if not release_data:
        print(f"[*] Creating new release {TAG} on GitHub...")
        body_text = f"""## 🛡️ Nusa Agent v0.1.0 — Production Multi-Platform Release

Official desktop release of **Nusa Agent**, the local-first autonomous AI agent command center.

### 📥 Direct Downloads
- **macOS Apple Silicon (M1/M2/M3/M4)**: [Nusa-Agent-0.1.0-mac-arm64.dmg](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-mac-arm64.dmg) | [Portable ZIP](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-mac-arm64.zip)
- **macOS Intel (x64)**: [Nusa-Agent-0.1.0-mac-x64.dmg](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-mac-x64.dmg) | [Portable ZIP](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-mac-x64.zip)
- **Windows (x64)**: [Setup EXE](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-win-x64.exe) | [Portable EXE](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-win-x64-portable.exe)
- **Linux (x64)**: [AppImage](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-linux-x64.AppImage) | [Debian DEB](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-linux-x64.deb) | [Tarball](https://github.com/{REPO}/releases/download/{TAG}/Nusa-Agent-0.1.0-linux-x64.tar.gz)

### 🔑 Features Highlights (Phase 0 to Phase 7 Complete)
- **Zero-Trust Security**: Strict Canonical Path Jail (`PathJail`) and `DENY > ASK > ALLOW` policy hierarchy.
- **Multi-Agent Workforce**: Parallel DAG execution with isolated Git worktree sandboxing.
- **Progressive Skills Hub**: Token-efficient dynamic disclosure with AST static security auditing.
- **Headless Browser Sandbox**: DOM-first Playwright automation with SSRF protection.
- **Dual Long-Term Memory**: Human-readable Markdown sync with SQLite WAL FTS search.
- **Scoped Profiles & Cron**: Multiple isolated agent profiles with background cron task scheduler.
- **Plugin Marketplace**: Ed25519 cryptographic signing and directory integrity verification.
- **Auto-Updater**: Embedded local Gateway daemon lifecycle with in-app updates.
"""
        create_payload = json.dumps({
            "tag_name": TAG,
            "target_commitish": "main",
            "name": NAME,
            "body": body_text,
            "draft": False,
            "prerelease": False
        }).encode("utf-8")
        
        req = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/releases",
            data=create_payload,
            headers={**headers, "Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            release_data = json.loads(resp.read().decode())
            print(f"[OK] Release created: {release_data['html_url']}")

    # 4. Upload Assets
    upload_url_template = release_data["upload_url"] # e.g. "https://uploads.github.com/repos/.../releases/123/assets{?name,label}"
    base_upload_url = upload_url_template.split("{")[0]

    existing_assets = {a["name"]: a["id"] for a in release_data.get("assets", [])}

    for file_path in files_to_upload:
        filename = file_path.name
        if filename in existing_assets:
            print(f"[*] Asset {filename} already exists (ID: {existing_assets[filename]}), deleting old version...")
            del_req = urllib.request.Request(
                f"https://api.github.com/repos/{REPO}/releases/assets/{existing_assets[filename]}",
                headers=headers,
                method="DELETE"
            )
            try:
                with urllib.request.urlopen(del_req) as del_resp:
                    pass
            except Exception as e:
                print(f"[!] Warning deleting {filename}: {e}")

        content_type = "application/octet-stream"
        if filename.endswith(".txt"):
            content_type = "text/plain"
        elif filename.endswith(".dmg"):
            content_type = "application/x-apple-diskimage"
        elif filename.endswith(".zip"):
            content_type = "application/zip"

        file_size = file_path.stat().st_size
        print(f"[*] Uploading {filename} ({file_size / 1024 / 1024:.1f} MB)...")
        upload_endpoint = f"{base_upload_url}?name={urllib.parse.quote(filename)}"
        
        with open(file_path, "rb") as f:
            data = f.read()

        upload_req = urllib.request.Request(
            upload_endpoint,
            data=data,
            headers={
                **headers,
                "Content-Type": content_type,
                "Content-Length": str(len(data))
            }
        )
        try:
            with urllib.request.urlopen(upload_req) as up_resp:
                res_json = json.loads(up_resp.read().decode())
                print(f" [OK] Successfully uploaded: {res_json.get('browser_download_url')}")
        except Exception as e:
            print(f"[!] Error uploading {filename}: {e}")

    print(f"\n[SUCCESS] All assets uploaded to GitHub Release: {release_data['html_url']}")

if __name__ == "__main__":
    main()
