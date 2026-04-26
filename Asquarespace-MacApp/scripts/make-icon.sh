#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_PNG="$ROOT_DIR/../Asquarespace/icons/Asquarespace Mac Icons/Icon-macOS-Default-1024x1024@1x.png"
ICONSET_DIR="$ROOT_DIR/build/icon.iconset"
ICNS_OUT="$ROOT_DIR/build/icon.icns"
ICON_PNG_OUT="$ROOT_DIR/build/icon.png"

if [[ ! -f "$SRC_PNG" ]]; then
  echo "Missing source icon: $SRC_PNG"
  exit 1
fi

rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"
cp "$SRC_PNG" "$ICON_PNG_OUT"

sips -z 16 16   "$SRC_PNG" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32   "$SRC_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32   "$SRC_PNG" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64   "$SRC_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$SRC_PNG" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256 "$SRC_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$SRC_PNG" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512 "$SRC_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$SRC_PNG" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
cp "$SRC_PNG" "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o "$ICNS_OUT"
echo "Created $ICNS_OUT"
