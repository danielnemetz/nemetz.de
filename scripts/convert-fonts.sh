#!/bin/bash
set -e

FONTS_DIR="public/fonts"

echo "Converting fonts in $FONTS_DIR to WOFF2..."

for font in "$FONTS_DIR"/*.ttf; do
  if [ -f "$font" ]; then
    filename=$(basename "$font" .ttf)
    echo "Converting $filename.ttf..."
    cat "$font" | npx ttf2woff2 > "$FONTS_DIR/$filename.woff2"
    # Optional: Remove original
    # rm "$font"
  fi
done

echo "Conversion complete."
