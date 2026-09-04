"""Tiles the generated post images into a single contact sheet.

Kept out of the browser on purpose: headless Chromium stops painting a
screenshot surface past a certain height, which silently clipped the
bottom row. Run via build.mjs, or on its own: python3 contact_sheet.py
"""

import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

CELL, GAP, PAD, COLS, CAP = 360, 20, 40, 3, 34
BG, INK, LINE = (242, 241, 236), (86, 92, 88), (221, 220, 213)


def caption_font():
    """The site's own Plex, unpacked from woff2; captions are dropped if
    fonttools is not installed."""
    try:
        from fontTools.ttLib import TTFont
        src = os.path.join(ROOT, "fonts", "plex-arabic-latin-500.woff2")
        ttf = os.path.join(HERE, ".plex-caption.ttf")
        if not os.path.exists(ttf):
            font = TTFont(src)
            font.flavor = None
            font.save(ttf)
        return ImageFont.truetype(ttf, 17)
    except Exception:
        return None


def main():
    with open(os.path.join(HERE, "posts.json"), encoding="utf-8") as fh:
        posts = json.load(fh)

    rows = -(-len(posts) // COLS)
    width = PAD * 2 + CELL * COLS + GAP * (COLS - 1)
    height = PAD * 2 + (CELL + CAP) * rows + GAP * (rows - 1)

    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    font = caption_font()

    for i, post in enumerate(posts):
        name = f"{post['id']}.png"
        x = PAD + (i % COLS) * (CELL + GAP)
        y = PAD + (i // COLS) * (CELL + CAP + GAP)

        tile = Image.open(os.path.join(HERE, name)).convert("RGB")
        tile = tile.resize((CELL, CELL), Image.LANCZOS)
        sheet.paste(tile, (x, y))
        draw.rectangle([x, y, x + CELL - 1, y + CELL - 1], outline=LINE)

        if font:
            draw.text((x, y + CELL + 9), name, font=font, fill=INK)

    out = os.path.join(HERE, "contact-sheet.png")
    sheet.save(out)
    print(f"built contact-sheet.png ({width}x{height})")


if __name__ == "__main__":
    main()
