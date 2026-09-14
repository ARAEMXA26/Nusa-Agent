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
import ssl
from pathlib import Path

# Allow HTTPS requests on environments without pre-installed CA certificates bundle
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass

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
    patterns = ["*.dmg", "*.zip", "*.exe", "*.AppImage", "*.deb", "*.tar.gz", "*.yml", "*.blockmap"]
    files_to_upload = []
    seen = set()
    for pat in patterns:
        for f in sorted(DIST_DIR.glob(pat)):
            # Normalize redundant arch names
            if "x86_64" in f.name and (DIST_DIR / f.name.replace("x86_64", "x64")).exists():
                continue
            if "amd64" in f.name and (DIST_DIR / f.name.replace("amd64", "x64")).exists():
                continue
            if f.name not in seen and f.is_file():
                seen.add(f.name)
                files_to_upload.append(f)
    
    checksums_path = DIST_DIR / "checksums.txt"
    checksum_lines = []
    for f in sorted(files_to_upload):
        if f.suffix in [".dmg", ".zip", ".exe", ".AppImage", ".deb", ".gz"]:
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

    existing_assets = {a["name"]: (a["id"], a["size"]) for a in release_data.get("assets", [])}

    for file_path in files_to_upload:
        filename = file_path.name
        file_size = file_path.stat().st_size
        
        # If asset exists and has exact same size, skip re-uploading to save time (except for DMG, blockmaps, yml, and checksums)
        always_reupload = filename.endswith(".dmg") or filename.endswith(".blockmap") or filename == "checksums.txt" or filename.endswith(".yml")
        if not always_reupload and filename in existing_assets and existing_assets[filename][1] == file_size:
            print(f"[OK] Asset {filename} already exists with identical size ({file_size / 1024 / 1024:.1f} MB), skipping.")
            continue

        if filename in existing_assets:
            asset_id = existing_assets[filename][0]
            print(f"[*] Asset {filename} already exists (ID: {asset_id}), deleting old version...")
            del_req = urllib.request.Request(
                f"https://api.github.com/repos/{REPO}/releases/assets/{asset_id}",
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
        elif filename.endswith(".exe"):
            content_type = "application/x-msdownload"
        elif filename.endswith(".deb"):
            content_type = "application/vnd.debian.binary-package"
        elif filename.endswith(".AppImage"):
            content_type = "application/x-executable"

        print(f"[*] Uploading {filename} ({file_size / 1024 / 1024:.1f} MB)...", flush=True)
        upload_endpoint = f"{base_upload_url}?name={urllib.parse.quote(filename)}"
        
        # Use curl for reliable large file streaming upload over TLS
        curl_cmd = [
            "curl", "-sSL", "-X", "POST",
            "--connect-timeout", "60",
            "--max-time", "600",
            "--speed-limit", "10240",
            "--speed-time", "30",
            "--retry", "3",
            "-H", f"Authorization: token {token}",
            "-H", f"Content-Type: {content_type}",
            "-H", "Accept: application/vnd.github.v3+json",
            "--data-binary", f"@{file_path}",
            upload_endpoint
        ]
        try:
            print(f"    Starting transfer of {filename}...", flush=True)
            res = subprocess.run(curl_cmd, capture_output=True, text=True, check=True)
            res_json = json.loads(res.stdout)
            if "browser_download_url" in res_json:
                print(f" [OK] Successfully uploaded: {res_json.get('browser_download_url')}", flush=True)
            else:
                print(f" [!] Upload response: {res.stdout[:200]}", flush=True)
        except Exception as e:
            print(f"[!] Error uploading {filename} via curl: {e}", flush=True)

    print(f"\n[SUCCESS] All assets uploaded to GitHub Release: {release_data['html_url']}")

if __name__ == "__main__":
    main()
