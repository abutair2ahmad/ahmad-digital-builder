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
v = m["video"]["hero"]
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
if command -v ffmpeg >/dev/null 2>&1; then
  echo "==> optimising hero video"
  SRC=assets/video/hero-loop.mp4
  if [ -s "$SRC" ]; then
    # 1080p H.264, silent, faststart, tuned for a quiet background loop
    ffmpeg -y -loglevel error -i "$SRC" -an \
      -c:v libx264 -profile:v high -pix_fmt yuv420p \
      -crf 26 -preset slow -movflags +faststart \
      assets/video/hero-loop.web.mp4 && \
      echo "  -> assets/video/hero-loop.web.mp4"
    # 720p companion for narrow viewports
    ffmpeg -y -loglevel error -i "$SRC" -an -vf "scale=1280:-2" \
      -c:v libx264 -profile:v high -pix_fmt yuv420p \
      -crf 28 -preset slow -movflags +faststart \
      assets/video/hero-loop.720.mp4 && \
      echo "  -> assets/video/hero-loop.720.mp4"
  fi
else
  echo "==> ffmpeg not found — skipping video optimisation"
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
