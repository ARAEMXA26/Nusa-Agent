#!/usr/bin/env bash
# Nusa Agent - Multi-Platform Production Release Packaging Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
GATEWAY_DIR="$ROOT_DIR/gateway"
DESKTOP_DIR="$ROOT_DIR/desktop"
OUTPUT_DIR="$DESKTOP_DIR/dist-release"

echo "================================================================"
echo "    NUSA AGENT - MULTI-PLATFORM PACKAGING & RELEASE BUILD       "
echo "================================================================"
echo "Root:    $ROOT_DIR"
echo "Output:  $OUTPUT_DIR"
echo ""

# 1. Verify Gateway Python dependencies and run tests
echo "[1/5] Verifying Gateway Python Test Suite..."
cd "$GATEWAY_DIR"
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
pytest tests/ -q
echo " -> All Gateway tests passed successfully!"

# 2. Build Desktop React frontend bundle
echo ""
echo "[2/5] Building Desktop React & Tailwind frontend bundle..."
cd "$DESKTOP_DIR"
npm run build:app
echo " -> Frontend React bundle generated in desktop/dist"

# 3. Build Desktop Electron main & preload scripts
echo ""
echo "[3/5] Compiling Electron TypeScript scripts..."
npm run build:electron
echo " -> Electron main and preload scripts compiled in desktop/dist-electron"

# 4. Package Desktop App with Electron Builder
echo ""
echo "[4/5] Packaging Desktop Application with electron-builder..."
npm run pack:dir
echo " -> App packaged successfully in desktop/dist-release"

# 5. Generate SHA-256 Checksums Manifest
echo ""
echo "[5/5] Generating Cryptographic SHA-256 Checksum Manifest..."
cd "$OUTPUT_DIR"
CHECKSUM_FILE="checksums.txt"
rm -f "$CHECKSUM_FILE"

find . -maxdepth 2 -type f \( -name "*.dmg" -o -name "*.zip" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.tar.gz" -o -name "Nusa Agent" \) 2>/dev/null | while read -r file; do
    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" >> "$CHECKSUM_FILE"
    else
        sha256sum "$file" >> "$CHECKSUM_FILE"
    fi
done

if [ ! -s "$CHECKSUM_FILE" ]; then
    # If directory build without archive extension, hash the main binary inside .app
    if [ -d "mac-arm64/Nusa Agent.app" ]; then
        shasum -a 256 "mac-arm64/Nusa Agent.app/Contents/MacOS/Nusa Agent" > "$CHECKSUM_FILE" 2>/dev/null || true
    fi
fi

echo " -> SHA-256 Checksum manifest generated:"
cat "$CHECKSUM_FILE" 2>/dev/null || echo "(No archive files found to hash)"

echo ""
echo "================================================================"
echo "    NUSA AGENT RELEASE PACKAGING COMPLETE                       "
echo "================================================================"
echo "Release directory: $OUTPUT_DIR"
