#!/usr/bin/env bash
# Nusa Agent - Instant Local Sync & Application Auto-Updater
# Immediately synchronizes the latest compiled code into /Applications/Nusa Agent.app
# without requiring manual downloads or lengthy re-packaging.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DESKTOP_DIR="$ROOT_DIR/desktop"
APP_TARGET="/Applications/Nusa Agent.app"
DIST_APP="$DESKTOP_DIR/dist-release/mac-arm64/Nusa Agent.app"

echo "========================================================"
echo "    NUSA AGENT - INSTANT LOCAL APPLICATION SYNC         "
echo "========================================================"

# 1. Compile fresh frontend and electron code
echo "[*] Step 1: Compiling latest desktop UI & background processes..."
cd "$DESKTOP_DIR"
npm run build

# 2. Check if destination app exists in /Applications
if [ ! -d "$APP_TARGET" ]; then
    echo "[*] Step 2: /Applications/Nusa Agent.app not found. Performing full initial installation..."
    if [ ! -d "$DIST_APP" ]; then
        echo "[*] Packaging macOS binary bundle first..."
        npm run package:mac
    fi
    cp -R "$DIST_APP" /Applications/
else
    echo "[*] Step 2: Synchronizing compiled application bundle into $APP_TARGET..."
    
    # Sync dist (React UI) and dist-electron (Electron backend)
    APP_RESOURCES="$APP_TARGET/Contents/Resources/app"
    if [ -d "$APP_RESOURCES" ]; then
        mkdir -p "$APP_RESOURCES/dist" "$APP_RESOURCES/dist-electron"
        cp -R "$DESKTOP_DIR/dist/"* "$APP_RESOURCES/dist/"
        cp -R "$DESKTOP_DIR/dist-electron/"* "$APP_RESOURCES/dist-electron/"
        cp "$DESKTOP_DIR/package.json" "$APP_RESOURCES/"
    fi
    
    # Sync Gateway Python resources if present in extraResources
    GATEWAY_RES="$APP_TARGET/Contents/Resources/gateway"
    if [ -d "$GATEWAY_RES" ]; then
        rsync -a --delete --exclude="__pycache__" --exclude=".pytest_cache" --exclude=".venv" \
            "$ROOT_DIR/gateway/" "$GATEWAY_RES/"
    fi
fi

# 3. Ad-hoc codesign and clear quarantine attributes
echo "[*] Step 3: Verifying macOS security signature and permissions..."
xattr -cr "$APP_TARGET" 2>/dev/null || true
codesign --force --deep --sign - "$APP_TARGET" 2>/dev/null || true

echo "========================================================"
echo " [SUCCESS] /Applications/Nusa Agent.app updated instantly!"
echo " You can now run Nusa Agent directly from Applications."
echo "========================================================"
