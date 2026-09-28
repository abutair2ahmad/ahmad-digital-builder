#!/usr/bin/env python3
"""Nexora's copper theme: the same eight layouts, drawn in the brand's published style.

The look is taken from Nexora's own hand-made posts — near-black ground, thin
glowing copper sweeps, the N mark top-right, a centred Arabic headline and a
copper pill button in place of the plain footer. It is selected per brand with
`"theme": "copper"` in config/brands/<brand>.json, so MoveWell (no theme) keeps
rendering through layouts.py exactly as before.

Class names that the fit script in render.py measures (.headline, .sub, .tip__t,
.split__text, .col__i, .q, .a, .chip, .cta) are reused on purpose, so auto-fit
and the overflow gate work unchanged.
"""

from html import escape


def _e(value):
    return escape(str(value if value is not None else ""), quote=True)


# A redrawing of the N mark for rendering. Swap for the original artwork when
# the source file is available — the shapes here are approximate.
LOGO = (
    '<svg class="cu-logo__mark" viewBox="0 0 100 100" aria-hidden="true">'
    '<path d="M10 24 L30 42 V92 H14 Q10 92 10 88 Z" fill="var(--cu-mark)"/>'
    '<path d="M16 6 H36 L92 62 V92 H82 L12 22 Q10 20 10 16 V12 Q10 6 16 6 Z" fill="var(--cu-mark)"/>'
    '<path d="M66 26 H92 V56 L66 30 Z" fill="var(--cu-mark)"/>'
    '<path d="M35 52 L35 92 H74 Z" fill="var(--accent)"/>'
    '<rect x="64" y="4" width="30" height="16" rx="5" fill="var(--accent)"/>'
    '<circle cx="72" cy="12" r="2" fill="var(--bg)"/><circle cx="79" cy="12" r="2" fill="var(--bg)"/>'
    '<circle cx="86" cy="12" r="2" fill="var(--bg)"/>'
    '</svg>'
)

# Thin copper light-trails behind everything, as in the reference posts.
GLOW = (
    '<svg class="cu-glow" viewBox="0 0 1080 1080" preserveAspectRatio="none" aria-hidden="true">'
    '<defs><filter id="cu-blur" x="-20%" y="-20%" width="140%" height="140%">'
    '<feGaussianBlur stdDeviation="6"/></filter>'
    '<radialGradient id="cu-pool" cx="50%" cy="100%" r="60%">'
    '<stop offset="0" stop-color="#B57E5A" stop-opacity=".22"/>'
    '<stop offset="1" stop-color="#B57E5A" stop-opacity="0"/></radialGradient></defs>'
    '<rect x="0" y="560" width="1080" height="520" fill="url(#cu-pool)"/>'
    '<g fill="none" stroke="#C48B64" stroke-linecap="round">'
    '<path d="M-40 760 C 240 620, 520 520, 1120 330" stroke-width="7" opacity=".35" filter="url(#cu-blur)"/>'
    '<path d="M-40 760 C 240 620, 520 520, 1120 330" stroke-width="1.6" opacity=".75"/>'
    '<path d="M-60 880 C 300 700, 640 640, 1140 470" stroke-width="5" opacity=".22" filter="url(#cu-blur)"/>'
    '<path d="M-60 880 C 300 700, 640 640, 1140 470" stroke-width="1.2" opacity=".5"/>'
    '<path d="M-80 250 C 200 330, 420 420, 700 620" stroke-width="1" opacity=".22"/>'
    '</g></svg>'
)

CHEVRON = (
    '<svg class="cu-cta__chev" viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.2" '
    'stroke-linecap="round" stroke-linejoin="round"/></svg>'
)

# Line icons for feature cards (24px grid, drawn with currentColor).
ICONS = {
    "pen": '<path d="M4 20 L8 19 L19 8 L16 5 L5 16 Z"/><path d="M14 7 L17 10"/>',
    "phone": '<rect x="7" y="3" width="10" height="18" rx="2.5"/><circle cx="12" cy="17.5" r=".8"/>',
    "gauge": '<path d="M4 16 A8 8 0 1 1 20 16"/><path d="M12 16 L15.5 10.5"/><circle cx="12" cy="16" r="1.2"/>',
    "globe": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12 H20.5"/><path d="M12 3.5 C 8.5 7, 8.5 17, 12 20.5 C 15.5 17, 15.5 7, 12 3.5"/>',
    "cart": '<path d="M3 4 H6 L8.5 15 H18 L20 7 H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
    "check": '<path d="M5 12.5 L10 17 L19 7"/>',
    "calendar": '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10 H20"/><path d="M8 3 V7"/><path d="M16 3 V7"/>',
    "layers": '<path d="M12 4 L20 8.5 L12 13 L4 8.5 Z"/><path d="M4 12.5 L12 17 L20 12.5"/>',
    "bolt": '<path d="M13 3 L5 13.5 H11.5 L10.5 21 L19 10 H12.5 Z"/>',
    "chat": '<path d="M4 6 H20 V16 H10 L6 19.5 V16 H4 Z"/>',
    "code": '<path d="M8 8 L4 12 L8 16"/><path d="M16 8 L20 12 L16 16"/><path d="M13.5 5 L10.5 19"/>',
    "dashboard": '<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/>'
                 '<rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/>',
}
ICON_ORDER = ("pen", "phone", "gauge", "globe", "cart", "layers")


def _icon(name):
    return ('<svg class="cu-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" '
            'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">%s</svg>') % ICONS.get(name, ICONS["check"])


def _pick(options, key):
    return options[sum(ord(c) for c in key) % len(options)] if options else ""


def _chrome(brand, idea, body, extra_class=""):
    """Background, logo, content and the copper button — the frame every post shares."""
    img = idea.get("image", {})
    label = img.get("cta") or _pick(brand.get("cta_buttons", ["راسلنا الآن"]), idea.get("id", ""))
    return (
        '<div class="stage cu %s">%s'
        '<div class="cu-logo">%s<span class="cu-logo__word">%s</span></div>'
        '<div class="cu-body">%s</div>'
        '<div class="cu-cta">%s<span class="cta" data-fit>%s</span></div>'
        '</div>'
    ) % (extra_class, GLOW, LOGO, _e(brand.get("logo_text", "")), body, CHEVRON, _e(label))


def _kicker(idea):
    kicker = idea.get("image", {}).get("kicker")
    return '<div class="cu-kicker" data-fit>%s</div>' % _e(kicker) if kicker else ""


def _headline(text, size=""):
    """`first | second` sets the second part on its own line in copper, as the
    brand's own posts do ("نصمّم متجرك | الإلكتروني باحتراف")."""
    first, _, second = str(text).partition("|")
    inner = _e(first.strip())
    if second.strip():
        inner += '<br><span class="cu-accent">%s</span>' % _e(second.strip())
    return '<h1 class="headline %s" data-fit>%s</h1>' % (size, inner)


def _sub(img):
    return '<p class="sub" data-fit>%s</p>' % _e(img["sub"]) if img.get("sub") else ""


def statement(brand, idea):
    img = idea["image"]
    body = '%s%s%s' % (_kicker(idea), _headline(img["headline"], "headline--lg"), _sub(img))
    return _chrome(brand, idea, '<div class="cu-center">%s</div>' % body)


def offer(brand, idea):
    img = idea["image"]
    body = '%s%s%s' % (_kicker(idea), _headline(img["headline"], "headline--lg"), _sub(img))
    return _chrome(brand, idea, '<div class="cu-center">%s</div>' % body, "cu--offer")


def tips(brand, idea):
    img = idea["image"]
    rows = "".join(
        '<div class="cu-card cu-tip"><span class="cu-num">%d</span><span class="tip__t" data-fit>%s</span></div>'
        % (n, _e(item))
        for n, item in enumerate(img.get("items", [])[:3], start=1)
    )
    body = '%s%s<div class="cu-stack">%s</div>' % (_kicker(idea), _headline(img["headline"]), rows)
    return _chrome(brand, idea, body)


def problem_solution(brand, idea):
    img = idea["image"]
    body = (
        '%s<div class="cu-split">'
        '<div class="cu-card cu-half"><div class="cu-label">المشكلة</div>'
        '<div class="split__text" data-fit>%s</div></div>'
        '<div class="cu-card cu-half cu-card--lit"><div class="cu-label cu-label--copper">الحل</div>'
        '<div class="split__text" data-fit>%s</div></div>'
        '</div>'
    ) % (_kicker(idea), _e(img["problem"]), _e(img["solution"]))
    return _chrome(brand, idea, body)


def compare(brand, idea):
    img = idea["image"]

    def column(css, title, items):
        rows = "".join('<div class="col__i" data-fit>%s</div>' % _e(i) for i in items[:3])
        return '<div class="cu-card cu-col %s"><div class="cu-label">%s</div>%s</div>' % (css, _e(title), rows)

    body = '%s%s<div class="cu-cols">%s%s</div>' % (
        _kicker(idea), _headline(img["headline"], "headline--sm"),
        column("", img["left_title"], img.get("left_items", [])),
        column("cu-card--lit", img["right_title"], img.get("right_items", [])),
    )
    return _chrome(brand, idea, body)


def faq(brand, idea):
    img = idea["image"]
    body = (
        '%s<div class="cu-center"><div class="cu-qmark">%s</div>'
        '<h1 class="q" data-fit>%s</h1>'
        '<div class="cu-card cu-card--lit cu-answer"><div class="a" data-fit>%s</div></div></div>'
    ) % (_kicker(idea), _icon("chat"), _e(img["question"]), _e(img["answer"]))
    return _chrome(brand, idea, body)


def showcase(brand, idea):
    img = idea["image"]
    icons = img.get("icons") or ICON_ORDER
    cards = "".join(
        '<div class="cu-card cu-feature">%s<span class="chip" data-fit>%s</span></div>'
        % (_icon(icons[i % len(icons)]), _e(f))
        for i, f in enumerate(img.get("features", [])[:4])
    )
    body = '%s%s<div class="cu-features">%s</div>' % (
        _kicker(idea), _headline(img["headline"], "headline--sm"), cards)
    return _chrome(brand, idea, body)


def project(brand, idea):
    """A real screenshot from Nexora's own work, inside a laptop frame."""
    img = idea["image"]
    shot_url = "../../../assets/screenshots/%s" % img["screenshot"]
    focus = img.get("screenshot_focus", "center top")
    size = img.get("screenshot_size")
    size_rule = "background-size:%s; " % _e(size) if size else ""
    body = (
        '%s%s%s<div class="cu-device">'
        '<div class="cu-laptop__screen"><div class="cu-laptop__shot" '
        'style="background-image:url(\'%s\'); %sbackground-position:%s;"></div></div>'
        '<div class="cu-laptop__base"></div></div>'
    ) % (_kicker(idea), _headline(img["headline"], "headline--sm"), _sub(img),
         shot_url, size_rule, _e(focus))
    return _chrome(brand, idea, body, "cu--project")


LAYOUTS = {
    "statement": statement,
    "tips": tips,
    "problem_solution": problem_solution,
    "compare": compare,
    "faq": faq,
    "showcase": showcase,
    "offer": offer,
    "project": project,
}
