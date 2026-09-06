#!/usr/bin/env bash
# ---------------------------------------------------------------
# AURELIA SKIN LAB — localise generated assets
#
# The site references local files under assets/. This script pulls
# every Higgsfield-generated asset listed in assets/manifest.json
# into place, then (if ffmpeg / ImageMagick are available) writes
# web-optimised derivatives.
#
#   bash scripts/fetch-assets.sh
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

MAN="assets/manifest.json"
[ -f "$MAN" ] || { echo "missing $MAN"; exit 1; }

mkdir -p assets/img assets/video

echo "==> downloading source assets"
python3 - "$MAN" <<'PY' > /tmp/aurelia-assets.tsv
import json, sys
m = json.load(open(sys.argv[1]))
for v in m["images"].values():
    print(f'{v["file"]}\t{v["url"]}')
for v in m["video"].values():
    print(f'{v["file"]}\t{v["url"]}')
PY

while IFS=$'\t' read -r file url; do
  [ "$url" = "PENDING" ] && { echo "  -- skip $file (no url yet)"; continue; }
  if [ -s "$file" ]; then
    echo "  ok $file (already present)"
  else
    echo "  .. $file"
    curl -fsSL --retry 3 --retry-delay 2 -o "$file" "$url" \
      || echo "  !! FAILED $file  <- $url"
  fi
done < /tmp/aurelia-assets.tsv
rm -f /tmp/aurelia-assets.tsv

# ---- optional web optimisation --------------------------------
# The films arrive already web-encoded (H.264, faststart, silent) straight from
# the edit, so there is nothing useful left to re-compress. Just report them.
if command -v ffprobe >/dev/null 2>&1; then
  echo "==> video check"
  for f in assets/video/*.mp4; do
    [ -s "$f" ] || continue
    D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
    R=$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=x "$f")
    printf "  %-40s %-10s %6.1fs  %s\n" "$f" "$R" "$D" "$(du -h "$f" | cut -f1)"
  done
fi

if command -v magick >/dev/null 2>&1 || command -v convert >/dev/null 2>&1; then
  IM=$(command -v magick || command -v convert)
  echo "==> writing web-sized images"
  for f in assets/img/*.png; do
    [ -s "$f" ] || continue
    base="${f%.png}"
    "$IM" "$f" -resize '1800x1800>' -quality 82 -strip "${base}.webp" 2>/dev/null \
      && echo "  -> ${base}.webp"
    "$IM" "$f" -resize '1600x1600>' -quality 84 -strip "${base}.jpg" 2>/dev/null \
      && echo "  -> ${base}.jpg"
  done
else
  echo "==> ImageMagick not found — skipping image optimisation"
fi

echo
echo "Done. Serve with:  python3 -m http.server 8080"
