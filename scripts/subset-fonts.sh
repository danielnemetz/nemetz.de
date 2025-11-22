#!/bin/bash
set -e

FONTS_DIR="public/fonts"
# Basic Latin, Latin-1 Supplement, General Punctuation, Currency Symbols
UNICODES="U+0000-00FF,U+2000-206F,U+20A0-20CF,U+2100-2183"

echo "Subsetting fonts in $FONTS_DIR..."

for font in "$FONTS_DIR"/*.woff2; do
  if [ -f "$font" ]; then
    filename=$(basename "$font")
    echo "Subsetting $filename..."
    
    # Run pyftsubset
    # --flavor=woff2: Output WOFF2
    # --output-file: Overwrite existing file
    # --unicodes: Target range
    # --layout-features='*': Keep OpenType features
    # --desubroutinize: Optimization for WOFF2
    python3 -m fontTools.subset "$font" \
      --flavor=woff2 \
      --output-file="$font.tmp" \
      --unicodes="$UNICODES" \
      --layout-features='*' \
      --desubroutinize
    
    mv "$font.tmp" "$font"
  fi
done

echo "Subsetting complete."
