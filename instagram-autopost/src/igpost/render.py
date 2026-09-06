#!/usr/bin/env python3
"""Turn a content idea into a 1080x1080 PNG, and measure the result while doing it.

The visual is generated, never sourced: an HTML stage is built from the brand's own
palette, type and shape tokens, then Chrome renders it headlessly. Nothing is
downloaded, so no third party's image can end up in a post.

One Chrome invocation both writes the PNG and dumps the laid-out DOM, so the fit
measurements returned here describe exactly the frame that was captured rather
than a second, separately laid-out run.
"""

import base64
import json
import os
import re
import subprocess

from . import layouts

# <root>/src/igpost/render.py -> <root>. Brand font files are declared relative to
# the project root so a brand config never has to know where it was installed.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CHROME_CANDIDATES = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
)

CANVAS = 1080
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S)

# Runs after layout. Reports whether any text block overflowed its box and whether
# the stage is exactly the frame we intend to export. The verdict travels back
# through <title> because that is the one value --dump-dom reliably surfaces.
QA_SCRIPT = """
(function () {
  var stage = document.querySelector('.stage');
  var out = { ok: false, overflow: [], stage: null, empty_text: 0, shrunk: [] };
  if (!stage) { document.title = JSON.stringify(out); return; }

  // Auto-fit. Copy length varies per idea and per language, so rather than
  // demanding every headline be short enough for one fixed size, type is stepped
  // down until it fits. A floor of 55%% means a block that still cannot fit is
  // reported as an overflow and fails the gate, instead of shrinking to nothing.
  function overflows(el) {
    return el.scrollHeight - el.clientHeight > 2 || el.scrollWidth - el.clientWidth > 2;
  }
  function stageFits() { return stage.scrollHeight - stage.clientHeight <= 2; }
  var fitters = stage.querySelectorAll('.headline, .q, .split__text, .tip__t, .col__i, .a, .chip, .cta, .sub');
  for (var f = 0; f < fitters.length; f++) {
    var el = fitters[f];
    var size = parseFloat(getComputedStyle(el).fontSize);
    var floor = size * 0.55, start = size, guard = 0;
    while ((!stageFits() || overflows(el)) && size > floor && guard++ < 80) {
      size -= 2;
      el.style.fontSize = size + 'px';
    }
    if (size < start) out.shrunk.push({ cls: el.className, from: start, to: size });
    if (stageFits()) { /* stop early once the whole stage is settled */ }
  }

  var box = stage.getBoundingClientRect();
  out.stage = { w: Math.round(box.width), h: Math.round(box.height) };
  var nodes = stage.querySelectorAll('[data-fit]');
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (!n.textContent.trim()) { out.empty_text++; continue; }
    var overflowsY = n.scrollHeight - n.clientHeight > 2;
    var overflowsX = n.scrollWidth - n.clientWidth > 2;
    var r = n.getBoundingClientRect();
    var escapes = r.right > box.right + 2 || r.left < box.left - 2 ||
                  r.bottom > box.bottom + 2 || r.top < box.top - 2;
    if (overflowsY || overflowsX || escapes) {
      out.overflow.push({
        cls: n.className || n.tagName,
        text: n.textContent.trim().slice(0, 40),
        y: overflowsY, x: overflowsX, escapes: escapes
      });
    }
  }
  out.measured = nodes.length;
  out.stage_fits = stageFits();
  out.ok = out.overflow.length === 0 && out.empty_text === 0 && out.stage_fits &&
           out.stage.w === %d && out.stage.h === %d;
  document.title = JSON.stringify(out);
})();
""" % (CANVAS, CANVAS)


class RenderError(RuntimeError):
    pass


def find_chrome(explicit=None):
    for candidate in ([explicit] if explicit else []) + list(CHROME_CANDIDATES):
        if candidate and os.path.exists(candidate):
            return candidate
    raise RenderError("no Chrome/Chromium binary found for rendering")


def webfont_css(brand):
    """Inline the brand's own font files as data URIs.

    A post is rendered on whatever host the scheduler happens to be running on —
    a laptop, a VPS, a GitHub runner — and a missing system font is invisible to
    the fit report, which only measures what the DOM claimed. That is survivable
    for Latin and fatal for a joined script: Arabic falling back to a face with no
    shaping tables measures perfectly and produces an image nobody should post.
    Embedding the faces the repository already ships makes the frame identical
    everywhere and removes the "install these fonts first" failure mode.

    A brand with no `webfonts` key renders exactly as before, on system fonts.
    A declared file that is missing raises, which fails the slot at the render
    stage — cheaply, and long before anything reaches Instagram.
    """
    faces = []
    for face in brand.get("webfonts", []):
        with open(os.path.join(PROJECT_ROOT, face["file"]), "rb") as handle:
            payload = base64.b64encode(handle.read()).decode("ascii")
        faces.append(
            "@font-face{font-family:%s;font-style:normal;font-weight:%s;"
            "font-display:block;src:url(data:font/woff2;base64,%s) format('woff2');%s}"
            % (json.dumps(face["family"]), face["weight"], payload,
               ("unicode-range:%s;" % face["unicode_range"]) if face.get("unicode_range") else "")
        )
    return "\n".join(faces)


def build_html(brand, idea, css_path):
    """Assemble the standalone HTML stage for one post."""
    with open(css_path, "r", encoding="utf-8") as handle:
        css = handle.read()
    palette, type_cfg, shape = brand["palette"], brand["type"], brand["shape"]
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
    ])
    return (
        '<!doctype html>\n<html lang="%s" dir="%s"><head><meta charset="utf-8">\n'
        "<style>%s\n:root{\n%s\n}\n%s</style></head><body>\n%s\n"
        "<script>%s</script></body></html>\n"
    ) % (brand.get("language", "en"), brand.get("direction", "ltr"),
         webfont_css(brand), variables, css, layouts.build(brand, idea), QA_SCRIPT)


def render(brand, idea, css_path, html_path, png_path, chrome=None, timeout=60):
    """Write the HTML, render it to PNG, and return the fit report from that same pass."""
    binary = find_chrome(chrome)
    os.makedirs(os.path.dirname(os.path.abspath(png_path)), exist_ok=True)
    with open(html_path, "w", encoding="utf-8") as handle:
        handle.write(build_html(brand, idea, css_path))

    command = [
        binary, "--headless=new", "--disable-gpu", "--no-first-run",
        "--no-default-browser-check", "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=%d,%d" % (CANVAS, CANVAS),
        "--virtual-time-budget=3000",          # let fonts and layout settle first
        "--screenshot=" + os.path.abspath(png_path),
        "--dump-dom",
        "file://" + os.path.abspath(html_path),
    ]
    try:
        result = subprocess.run(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout
        )
    except subprocess.TimeoutExpired:
        raise RenderError("Chrome timed out after %ss rendering %s" % (timeout, idea.get("id")))

    if not os.path.exists(png_path) or os.path.getsize(png_path) == 0:
        raise RenderError("Chrome produced no image for %s (exit %s)" % (idea.get("id"), result.returncode))

    match = TITLE_RE.search(result.stdout.decode("utf-8", "replace"))
    if not match:
        return {"ok": False, "overflow": [], "stage": None, "reason": "no fit report returned"}
    try:
        return json.loads(match.group(1))
    except ValueError:
        return {"ok": False, "overflow": [], "stage": None, "reason": "unreadable fit report"}
