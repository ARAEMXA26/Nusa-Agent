#!/usr/bin/env bash
# Nusa Agent - Instant Local Sync & Application Auto-Updater
# Compiles and installs the fresh application bundle directly into /Applications/Nusa Agent.app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DESKTOP_DIR="$ROOT_DIR/desktop"
APP_TARGET="/Applications/Nusa Agent.app"
DIST_APP="$DESKTOP_DIR/dist-release/mac-arm64/Nusa Agent.app"

echo "========================================================"
echo "    NUSA AGENT - INSTANT LOCAL APPLICATION SYNC         "
echo "========================================================"

# 1. Compile fresh frontend and electron code, package dir
echo "[*] Step 1: Compiling latest desktop UI & electron binary..."
cd "$DESKTOP_DIR"
npm run build
npx electron-builder --mac --arm64 --dir

# 2. Kill any currently running instance of Nusa Agent and old gateway process so files can be replaced and updated
echo "[*] Step 2: Terminating any running instances of Nusa Agent and stale gateway processes..."
pkill -f "Nusa Agent" 2>/dev/null || true
pkill -f "uvicorn nusa.main:app" 2>/dev/null || true
pkill -f "nusa-gateway" 2>/dev/null || true
lsof -ti:4141 | xargs kill -9 2>/dev/null || true
sleep 1

# 3. Cleanly install/replace /Applications/Nusa Agent.app
echo "[*] Step 3: Installing fresh application bundle into $APP_TARGET..."
rm -rf "$APP_TARGET"
cp -R "$DIST_APP" /Applications/

# 4. Link python .venv if present
GATEWAY_RES="$APP_TARGET/Contents/Resources/gateway"
if [ -d "$GATEWAY_RES" ] && [ -d "$ROOT_DIR/gateway/.venv" ]; then
    echo "[*] Step 4: Linking dedicated Python gateway environment..."
    ln -sfn "$ROOT_DIR/gateway/.venv" "$GATEWAY_RES/.venv"
fi

# 5. Ad-hoc codesign and clear quarantine attributes
echo "[*] Step 5: Applying macOS security signature & permissions..."
xattr -cr "$APP_TARGET" 2>/dev/null || true
codesign --force --deep --sign - "$APP_TARGET" 2>/dev/null || true

echo "========================================================"
echo " [SUCCESS] /Applications/Nusa Agent.app updated completely!"
echo " You can now run Nusa Agent directly from Applications."
echo "========================================================"
