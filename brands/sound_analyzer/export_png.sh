#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICON_SVG="$SCRIPT_DIR/icon.svg"
LOGO_SVG="$SCRIPT_DIR/logo.svg"
ICON_PNG="$SCRIPT_DIR/icon.png"
LOGO_PNG="$SCRIPT_DIR/logo.png"

if command -v inkscape >/dev/null 2>&1; then
  inkscape "$ICON_SVG" --export-type=png --export-filename="$ICON_PNG" --export-width=256 --export-height=256
  inkscape "$LOGO_SVG" --export-type=png --export-filename="$LOGO_PNG" --export-width=256 --export-height=256
elif command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 256 -h 256 "$ICON_SVG" -o "$ICON_PNG"
  rsvg-convert -w 256 -h 256 "$LOGO_SVG" -o "$LOGO_PNG"
else
  echo "Neither inkscape nor rsvg-convert is installed."
  echo "Install one of them, then rerun this script:"
  echo "  bash brands/sound_analyzer/export_png.sh"
  exit 1
fi

echo "Generated:"
echo "  $ICON_PNG"
echo "  $LOGO_PNG"
