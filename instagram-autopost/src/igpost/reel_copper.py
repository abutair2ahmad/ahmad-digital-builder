#!/usr/bin/env python3
"""Nexora's animated Reel/Story: one approved feed idea, told in 1080x1920 motion.

Same frame model as story_render.py — every frame is an independent headless
Chrome screenshot of one HTML stage, with `--seek` scrubbing every CSS animation
through a negative animation-delay — but the stage is built from a content idea
in the copper theme instead of a product photo. The words are the ones already
approved for the feed, so a video never says anything a post would not.

Layout keeps the message between y≈150 and y≈1540: Instagram lays its own
username, caption and buttons over the bottom ~380px of a Reel.
"""

import os
from concurrent.futures import ThreadPoolExecutor
from html import escape

from .layouts_copper import GLOW, LOGO, CHEVRON, _icon, _pick
from .render import find_chrome
from .story_render import _capture

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT_DIR = os.path.join(ROOT, "templates", "fonts")

# Layouts whose content reads well as a short sequence of cards. "project" is
# left out: its desktop screenshot is illegible at phone width.
REEL_LAYOUTS = ("tips", "showcase", "problem_solution", "compare", "faq", "statement", "offer")

SECONDS = 8.0


def _e(value):
    return escape(str(value if value is not None else ""), quote=True)


def _fonts():
    """@font-face rules with absolute file:// URLs — frame HTML lives deeper in
    out/ than feed HTML, so base.css's relative paths would not resolve."""
    rules = []
    ranges = {"arabic": "U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC",
              "latin": "U+0000-00FF, U+2000-206F, U+2190-2193, U+2212"}
    for weight in (400, 500, 600):
        for script, unicode_range in ranges.items():
            path = os.path.join(FONT_DIR, "plex-arabic-%s-%d.woff2" % (script, weight))
            rules.append(
                "@font-face{font-family:'IBM Plex Sans Arabic';font-weight:%d;"
                "src:url('file://%s') format('woff2');unicode-range:%s;}" % (weight, path, unicode_range))
    return "\n".join(rules)


def eligible(ideas):
    return [i for i in ideas if i.get("layout") in REEL_LAYOUTS]


def choose_idea(ideas, on_date):
    """One idea per calendar day, walking the eligible list in order.

    Deterministic, so a retried run on the same day renders the same video, and
    no idea repeats until every eligible idea has had its turn.
    """
    pool = eligible(ideas)
    if not pool:
        raise ValueError("no ideas with a reel-friendly layout")
    return pool[on_date.toordinal() % len(pool)]


def _headline(text):
    first, _, second = str(text).partition("|")
    out = '<span class="line enter rise" style="--delay:.9s">%s</span>' % _e(first.strip())
    if second.strip():
        out += '<span class="line accent enter rise" style="--delay:1.3s">%s</span>' % _e(second.strip())
    return out


def _cards(idea):
    """(label, text, icon, lit) rows for the card sequence, per layout."""
    img, layout = idea["image"], idea["layout"]
    if layout == "tips":
        return [(str(n), t, None, False) for n, t in enumerate(img.get("items", [])[:3], start=1)]
    if layout == "showcase":
        icons = img.get("icons") or ["check"]
        return [(None, t, icons[i % len(icons)], False) for i, t in enumerate(img.get("features", [])[:4])]
    if layout == "problem_solution":
        return [("المشكلة", img["problem"], None, False), ("الحل", img["solution"], None, True)]
    if layout == "compare":
        return [(img["left_title"], "، ".join(img.get("left_items", [])[:3]), None, False),
                (img["right_title"], "، ".join(img.get("right_items", [])[:3]), None, True)]
    if layout == "faq":
        return [(None, img["answer"], "chat", True)]
    return []


def build_html(brand, idea, css_path, seek_seconds):
    with open(css_path, "r", encoding="utf-8") as handle:
        css = handle.read()
    img = idea["image"]
    title = img.get("question") if idea["layout"] == "faq" else img.get("headline", "")
    sub = img.get("sub") if idea["layout"] in ("statement", "offer") else ""

    rows = []
    for n, (label, text, icon, lit) in enumerate(_cards(idea)):
        delay = 2.2 + n * 0.55
        badge = ""
        if icon:
            badge = '<span class="badge badge--icon">%s</span>' % _icon(icon)
        elif label and label.isdigit():
            badge = '<span class="badge">%s</span>' % _e(label)
        head = '<span class="label">%s</span>' % _e(label) if label and not label.isdigit() else ""
        rows.append(
            '<div class="card%s enter slide" style="--delay:%.2fs">%s'
            '<div class="card__body">%s<span class="card__text">%s</span></div></div>'
            % (" card--lit" if lit else "", delay, badge, head, _e(text)))

    cta_delay = 2.2 + max(len(rows), 1) * 0.55 + 0.5
    label = img.get("cta") or _pick(brand.get("cta_buttons", ["راسلنا الآن"]), idea.get("id", ""))
    kicker = '<div class="kicker enter rise" style="--delay:.55s">%s</div>' % _e(img["kicker"]) if img.get("kicker") else ""
    sub_html = '<div class="sub enter rise" style="--delay:1.6s">%s</div>' % _e(sub) if sub else ""

    body = (
        '<div class="stage">'
        '<div class="bg"></div>%s'
        '<div class="content">'
        '<div class="logo enter zoom" style="--delay:.2s">%s<span class="logo__word">%s</span></div>'
        '<div class="middle">%s<h1 class="headline">%s</h1>%s'
        '<div class="cards">%s</div></div>'
        '<div class="cta-wrap" style="--delay:%.2fs"><div class="cta">%s<span>%s</span></div></div>'
        '<div class="site enter rise" style="--delay:%.2fs">%s</div>'
        '</div></div>'
    ) % (GLOW.replace('<path ', '<path pathLength="1" class="trail" '),
         LOGO, _e(brand.get("logo_text", "")), kicker, _headline(title), sub_html,
         "".join(rows), cta_delay, CHEVRON, _e(label), cta_delay + 0.3, _e(brand.get("site", "")))

    palette = brand["palette"]
    variables = "--bg:%s;--ink:%s;--muted:%s;--accent:%s;--seek:%.3fs;" % (
        palette["bg"], palette["ink"], palette["muted"], palette["accent"], seek_seconds)
    return (
        '<!doctype html>\n<html lang="%s" dir="%s"><head><meta charset="utf-8">\n'
        "<style>%s\n:root{%s}\n%s</style></head><body>%s</body></html>\n"
    ) % (brand.get("language", "ar"), brand.get("direction", "rtl"), _fonts(), variables, css, body)


def render_frames(brand, idea, css_path, frame_dir, fps, duration_seconds=SECONDS, chrome=None,
                  timeout=60, workers=None):
    """Frames are independent Chrome runs, so they are captured in parallel."""
    binary = find_chrome(chrome)
    os.makedirs(frame_dir, exist_ok=True)
    total = max(1, int(round(fps * duration_seconds)))

    def one(i):
        html_path = os.path.join(frame_dir, "frame_%04d.html" % i)
        png_path = os.path.join(frame_dir, "frame_%04d.png" % i)
        with open(html_path, "w", encoding="utf-8") as handle:
            handle.write(build_html(brand, idea, css_path, i / float(fps)))
        _capture(binary, html_path, png_path, timeout)

    with ThreadPoolExecutor(max_workers=workers or os.cpu_count() or 2) as pool:
        list(pool.map(one, range(total)))        # list() re-raises the first render error
    return total
