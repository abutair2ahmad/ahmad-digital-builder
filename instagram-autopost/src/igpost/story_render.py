#!/usr/bin/env python3
"""Turn one real product into a short animated Story: a sequence of PNG frames.

Each frame is one headless Chrome screenshot of the same HTML stage with a
different `--seek` value baked in (see templates/story.css for how one CSS
custom property scrubs every animation on the page via negative animation-delay).
video.py then stitches the frames into an MP4 with ffmpeg. No JS drives a live
browser between frames — every frame is an independent, reproducible render, the
same headless-Chrome-to-PNG approach render.py already uses for feed images.
"""

import html
import os
import subprocess

from .render import RenderError, find_chrome

CANVAS_W = 1080
CANVAS_H = 1920

CURRENCY_SYMBOLS = {"ILS": "₪", "USD": "$", "EUR": "€", "GBP": "£"}


def format_price(product):
    amount = product.get("price")
    try:
        text = ("%.2f" % float(amount)).rstrip("0").rstrip(".")
    except (TypeError, ValueError):
        text = str(amount)
    symbol = CURRENCY_SYMBOLS.get(product.get("currency"))
    if symbol:
        return "%s%s" % (symbol, text)
    return "%s %s" % (text, product.get("currency", ""))


def build_html(brand_cfg, product, css_path, seek_seconds, image_path):
    """Assemble the standalone HTML stage for one frame of one product's Story."""
    with open(css_path, "r", encoding="utf-8") as handle:
        css = handle.read()
    palette, type_cfg, shape = brand_cfg["palette"], brand_cfg["type"], brand_cfg["shape"]
    variables = "\n".join([
        "--bg: %s;" % palette["bg"],
        "--surface: %s;" % palette["surface"],
        "--ink: %s;" % palette["ink"],
        "--muted: %s;" % palette["muted"],
        "--accent: %s;" % palette["accent"],
        "--accent-ink: %s;" % palette["accent_ink"],
        "--accent-soft: %s;" % palette["accent_soft"],
        "--line: %s;" % palette["line"],
        "--font: %s;" % type_cfg["family"],
        "--weight-display: %s;" % type_cfg["display_weight"],
        "--tracking: %s;" % type_cfg["tracking"],
        "--radius: %spx;" % shape["radius"],
        "--radius-pill: %spx;" % shape["radius_pill"],
        "--stroke: %spx;" % shape["stroke"],
        "--seek: %.3fs;" % seek_seconds,
    ])

    fields = {
        "brand": html.escape(brand_cfg.get("display_name") or brand_cfg.get("logo_text") or ""),
        "image": html.escape(image_path, quote=True),
        "title": html.escape(product["title"]),
        "benefit": html.escape(product.get("benefit") or ""),
        "price": html.escape(format_price(product)),
        "cta": html.escape((brand_cfg.get("cta_pool") or ["Link in bio"])[0]),
        "footer": html.escape(brand_cfg.get("footer_text") or ""),
    }

    body = """
<div class="stage">
  <div class="bg"></div>
  <div class="content">
    <div class="kicker enter fade-up" style="--delay:0s">%(brand)s</div>
    <div class="frame enter zoom-in" style="--delay:.15s">
      <img src="%(image)s" />
    </div>
    <div class="title enter fade-up" style="--delay:.55s">%(title)s</div>
    <div class="benefit enter fade-up" style="--delay:.8s">%(benefit)s</div>
    <div class="price-row enter pop-in" style="--delay:1.15s">
      <div class="price">%(price)s</div>
    </div>
    <div class="spacer"></div>
    <div class="cta-wrap" style="--delay:1.5s">
      <div class="cta">%(cta)s</div>
    </div>
    <div class="footer enter fade-up" style="--delay:.3s">%(footer)s</div>
  </div>
</div>
""" % fields

    return (
        '<!doctype html>\n<html lang="%s" dir="%s"><head><meta charset="utf-8">\n'
        "<style>:root{\n%s\n}\n%s</style></head><body>\n%s\n</body></html>\n"
    ) % (brand_cfg.get("language", "en"), brand_cfg.get("direction", "ltr"), variables, css, body)


def _capture(binary, html_path, png_path, timeout):
    command = [
        binary, "--headless=new", "--disable-gpu", "--no-first-run",
        "--no-default-browser-check", "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=%d,%d" % (CANVAS_W, CANVAS_H),
        "--virtual-time-budget=400",
        "--screenshot=" + os.path.abspath(png_path),
        "file://" + os.path.abspath(html_path),
    ]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise RenderError("Chrome timed out after %ss rendering %s" % (timeout, html_path))
    if not os.path.exists(png_path) or os.path.getsize(png_path) == 0:
        raise RenderError("Chrome produced no frame for %s (exit %s)" % (html_path, result.returncode))


def render_frames(brand_cfg, product, css_path, frame_dir, image_path, fps, duration_seconds,
                   chrome=None, timeout=30):
    """Render one PNG per frame at `fps` for `duration_seconds`. Returns the frame count.

    Every frame is a fresh, independent Chrome invocation of the same HTML stage
    with only `--seek` (and therefore every element's animation phase) changed —
    there is no shared browser state between frames to get out of sync.
    """
    binary = find_chrome(chrome)
    os.makedirs(frame_dir, exist_ok=True)
    total_frames = max(1, int(round(fps * duration_seconds)))
    for i in range(total_frames):
        seek = i / float(fps)
        html_path = os.path.join(frame_dir, "frame_%04d.html" % i)
        png_path = os.path.join(frame_dir, "frame_%04d.png" % i)
        with open(html_path, "w", encoding="utf-8") as handle:
            handle.write(build_html(brand_cfg, product, css_path, seek, image_path))
        _capture(binary, html_path, png_path, timeout)
    return total_frames
