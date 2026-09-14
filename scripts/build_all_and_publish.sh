#!/usr/bin/env bash
# Nusa Agent - Unified Cross-Platform Build, Git Push & Release Sync
# Builds macOS (arm64/x64), Windows (nsis/portable), and Linux (AppImage/deb/tar.gz)
# and synchronizes all releases directly with GitHub.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
DIST_DIR="$DESKTOP_DIR/dist-release"

echo "====================================================="
echo "   NUSA AGENT - MULTI-PLATFORM BUILD & RELEASE SYNC   "
echo "====================================================="

# 1. Compile Vite frontend and Electron main
echo "[*] Step 1: Compiling desktop frontend & backend..."
cd "$DESKTOP_DIR"
npm run build

# 2. Package macOS (arm64 & x64)
echo "[*] Step 2: Packaging macOS bundles (arm64 & x64 DMG + ZIP)..."
npm run package:mac

# 3. Package Windows 64-bit (Setup installer + Portable executable)
echo "[*] Step 3: Packaging Windows targets (NSIS Installer & Portable EXE)..."
npx electron-builder --win --x64 --config electron-builder.json

# 4. Package Linux Universal (AppImage, DEB, tar.gz)
echo "[*] Step 4: Packaging Linux targets (AppImage, Debian DEB, tarball)..."
npx electron-builder --linux --x64 --config electron-builder.json

# 5. Normalize artifact names to match GitHub release spec
echo "[*] Step 5: Normalizing release artifact filenames..."
cd "$DIST_DIR"
for appimg in *linux-x86_64.AppImage; do
  [ -f "$appimg" ] && cp -f "$appimg" "${appimg//x86_64/x64}"
done
for deb in *linux-amd64.deb; do
  [ -f "$deb" ] && cp -f "$deb" "${deb//amd64/x64}"
done

# 6. Commit & Push to GitHub repository if there are changes
echo "[*] Step 6: Checking Git status & pushing changes to remote..."
cd "$ROOT_DIR"
if [ -n "$(git status --porcelain)" ]; then
  git add .
  COMMIT_MSG="${1:-fix: update cross-platform build artifacts and release manifests}"
  git commit -m "$COMMIT_MSG"
  git push origin main
  echo "[OK] Pushed latest commit to origin/main"
else
  echo "[i] Working tree clean, no new git commits needed."
fi

# 7. Upload all device artifacts to GitHub Releases
echo "[*] Step 7: Publishing and synchronizing all assets to GitHub Releases..."
python3 "$ROOT_DIR/scripts/publish_release.py"

echo "====================================================="
echo " [SUCCESS] All devices built, pushed, and published! "
echo " Releases: https://github.com/ARAEMXA26/Nusa-Agent/releases/latest"
echo "====================================================="
