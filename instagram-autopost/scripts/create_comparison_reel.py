#!/usr/bin/env python3
"""Render a Hebrew, illustrative product comparison Reel for MoveWell."""

import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))

from igpost.render import find_chrome
from igpost.story_render import _capture


def build_html(brand, image_path, seek):
    palette = brand["palette"]
    font = brand["type"]["family"]
    image = html.escape(os.path.abspath(image_path), quote=True)
    css = """
* { box-sizing: border-box; }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; }
body { background: %(bg)s; color: %(ink)s; font-family: %(font)s; direction: rtl; }
.stage { width: 1080px; height: 1920px; padding: 72px 48px; background: linear-gradient(145deg, %(bg)s, %(soft)s); }
.brand { text-align: center; color: %(accent)s; font-size: 34px; font-weight: 700; letter-spacing: .12em; }
.title { margin: 34px auto 42px; max-width: 900px; text-align: center; font-size: 58px; line-height: 1.18; font-weight: 700; }
.compare { display: flex; gap: 18px; direction: ltr; }
.panel { width: 483px; height: 1120px; overflow: hidden; border: 2px solid %(line)s; border-radius: 28px; background: %(surface)s; position: relative; }
.panel img { width: 100%%; height: 100%%; object-fit: cover; }
.without img { filter: grayscale(1) blur(1.5px) brightness(.82); transform: scale(1.025); }
.label { position: absolute; top: 24px; left: 20px; right: 20px; padding: 20px 12px; border-radius: 999px; text-align: center; font-size: 31px; font-weight: 700; color: white; background: %(accent)s; direction: rtl; }
.without .label { background: %(ink)s; }
.note { margin: 38px auto 0; text-align: center; color: %(muted)s; font-size: 29px; line-height: 1.35; }
.cta { margin: 34px auto 0; width: max-content; padding: 22px 46px; border-radius: 999px; color: %(accent_ink)s; background: %(accent)s; font-size: 31px; font-weight: 700; }
""" % dict(font=font, bg=palette["bg"], ink=palette["ink"], muted=palette["muted"],
           accent=palette["accent"], accent_ink=palette["accent_ink"],
           soft=palette["accent_soft"], line=palette["line"], surface=palette["surface"])
    body = """
<div class="stage">
  <div class="brand">MOVEWELL</div>
  <div class="title">מה ההבדל בתמיכה בזמן נסיעה?</div>
  <div class="compare">
    <div class="panel"><img src="%(image)s"><div class="label">עם המוצר</div></div>
    <div class="panel without"><img src="%(image)s"><div class="label">בלי המוצר | המחשה</div></div>
  </div>
  <div class="note">השוואה להמחשה בלבד. נוחות ותמיכה משתנות מאדם לאדם.</div>
  <div class="cta">לינק בביו ← הזמנה תוך דקה</div>
</div>
""" % {"image": image}
    return "<!doctype html><html lang=\"he\" dir=\"rtl\"><head><meta charset=\"utf-8\"><style>%s</style></head><body>%s</body></html>" % (css, body)


def main():
    brand_path = os.path.join(ROOT, "config", "brands", "movewell.json")
    with open(brand_path, "r", encoding="utf-8") as handle:
        brand = json.load(handle)
    image_path = os.path.join(ROOT, "out", "movewell", "stories-test", "MW-PIL-002", "product.jpg")
    frame_dir = os.path.join(ROOT, "out", "movewell", "reels", "2026-09-09", "comparison-frames")
    os.makedirs(frame_dir, exist_ok=True)
    chrome = find_chrome()
    for index in range(54):
        html_path = os.path.join(frame_dir, "frame_%04d.html" % index)
        png_path = os.path.join(frame_dir, "frame_%04d.png" % index)
        with open(html_path, "w", encoding="utf-8") as handle:
            handle.write(build_html(brand, image_path, index / 12.0))
        _capture(chrome, html_path, png_path, timeout=30)
    print(frame_dir)


if __name__ == "__main__":
    main()