#!/usr/bin/env bash
# Builds an installable Shopify theme ZIP from theme/.
# Upload it at Online Store → Themes → Add theme → Upload zip file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEME="$ROOT/theme"
DIST="$ROOT/dist"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$THEME/config/settings_schema.json'))[0].theme_version)")"
OUT="$DIST/cavelier-theme-$VERSION.zip"

node "$ROOT/tools/validate.mjs"

rm -rf "$DIST"
mkdir -p "$DIST"

cd "$THEME"
# Shopify reads the standard directories from the archive root.
zip -q -r -X "$OUT" \
  assets config layout locales sections snippets templates \
  -x '*.DS_Store' -x '__MACOSX/*'

cd "$ROOT"
echo
echo "Wrote $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -1
