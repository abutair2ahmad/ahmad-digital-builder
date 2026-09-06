#!/usr/bin/env python3
"""The seven post layouts, as functions from (brand, idea) to the stage markup.

Every layout keeps its text short on purpose — an Instagram post is read at
thumbnail size, so a layout that needs a paragraph to work is the wrong layout.
The long form of the thought lives in the caption, never in the image.

Text that comes from a content bank is escaped here. `data-fit` marks the blocks
the quality gate measures for overflow after the browser has laid the page out.
"""

from html import escape


def _e(value):
    return escape(str(value if value is not None else ""), quote=True)


def _footer(brand, idea):
    note = idea.get("image", {}).get("footnote") or brand.get("footer_text", "")
    return (
        '<div class="footer"><span class="logo">%s</span>'
        '<span class="note" data-fit>%s</span></div>'
    ) % (_e(brand.get("logo_text", "")), _e(note))


def _kicker(idea):
    kicker = idea.get("image", {}).get("kicker")
    return '<div class="kicker" data-fit>%s</div>' % _e(kicker) if kicker else ""


def _mark(brand):
    """An abstract brand mark for the showcase slab.

    Deliberately not the wordmark — that already sits in the footer, and repeating
    it reads as a placeholder. Each brand gets its own geometry instead: soft
    concentric rings for MoveWell, a hard modular grid for Nexora, so the two
    accounts stay visually distinct even in a thumbnail.
    """
    ink = brand["palette"]["accent_ink"]
    if brand.get("mark") == "rings":
        rings = "".join(
            '<circle cx="200" cy="200" r="%d" fill="none" stroke="%s" stroke-width="10" opacity="%.2f"/>'
            % (r, ink, op)
            for r, op in ((170, 0.20), (132, 0.32), (94, 0.48), (56, 0.70))
        )
        return ('<svg viewBox="0 0 400 400" width="330" height="330" aria-hidden="true">%s'
                '<circle cx="200" cy="200" r="20" fill="%s"/></svg>') % (rings, ink)
    cells = "".join(
        '<rect x="%d" y="%d" width="70" height="70" rx="6" fill="%s" opacity="%.2f"/>'
        % (40 + col * 88, 40 + row * 88, ink, op)
        for row, cols in enumerate(((0.16, 0.28, 0.16, 0.10),
                                    (0.28, 0.85, 0.42, 0.16),
                                    (0.16, 0.42, 0.28, 0.16),
                                    (0.10, 0.16, 0.16, 0.10)))
        for col, op in enumerate(cols)
    )
    return '<svg viewBox="0 0 400 400" width="330" height="330" aria-hidden="true">%s</svg>' % cells


def statement(brand, idea):
    img = idea["image"]
    sub = '<p class="sub" data-fit>%s</p>' % _e(img["sub"]) if img.get("sub") else ""
    return (
        '<div class="stage stage--accent">%s<div class="fill">'
        '<h1 class="headline headline--lg" data-fit>%s</h1>%s</div>%s</div>'
    ) % (_kicker(idea), _e(img["headline"]), sub, _footer(brand, idea))


def tips(brand, idea):
    img = idea["image"]
    rows = "".join(
        '<div class="tip"><div class="tip__n">%d</div><div class="tip__t" data-fit>%s</div></div>'
        % (n, _e(item))
        for n, item in enumerate(img.get("items", [])[:3], start=1)
    )
    return (
        '<div class="stage">%s<h1 class="headline" data-fit>%s</h1>'
        '<div class="tips">%s</div><div class="spacer"></div>%s</div>'
    ) % (_kicker(idea), _e(img["headline"]), rows, _footer(brand, idea))


def problem_solution(brand, idea):
    img = idea["image"]
    bad_label, good_label = ("הבעיה", "הפתרון") if brand.get("language") == "he" else ("PROBLEM", "SOLUTION")
    return (
        '<div class="stage">%s<div class="split">'
        '<div class="split__half split__half--bad"><div class="split__label">%s</div>'
        '<div class="split__text" data-fit>%s</div></div>'
        '<div class="split__half split__half--good"><div class="split__label">%s</div>'
        '<div class="split__text" data-fit>%s</div></div>'
        '</div>%s</div>'
    ) % (_kicker(idea), _e(bad_label), _e(img["problem"]),
         _e(good_label), _e(img["solution"]), _footer(brand, idea))


def compare(brand, idea):
    img = idea["image"]

    def column(css, title, items):
        body = "".join('<div class="col__i" data-fit>%s</div>' % _e(i) for i in items[:3])
        return '<div class="col %s"><div class="col__h" data-fit>%s</div>%s</div>' % (css, _e(title), body)

    return (
        '<div class="stage">%s<h1 class="headline headline--sm" data-fit>%s</h1>'
        '<div class="cols">%s%s</div>%s</div>'
    ) % (
        _kicker(idea), _e(img["headline"]),
        column("col--a", img["left_title"], img.get("left_items", [])),
        column("col--b", img["right_title"], img.get("right_items", [])),
        _footer(brand, idea),
    )


def faq(brand, idea):
    img = idea["image"]
    return (
        '<div class="stage">%s<div class="fill"><div class="q-mark">?</div>'
        '<h1 class="q" data-fit>%s</h1><div class="a" data-fit>%s</div></div>%s</div>'
    ) % (_kicker(idea), _e(img["question"]), _e(img["answer"]), _footer(brand, idea))


def showcase(brand, idea):
    img = idea["image"]
    chips = "".join('<span class="chip" data-fit>%s</span>' % _e(f) for f in img.get("features", [])[:3])
    return (
        '<div class="stage">%s<h1 class="headline headline--sm" data-fit>%s</h1>'
        '<div class="chips">%s</div>'
        '<div class="slab">%s</div>%s</div>'
    ) % (_kicker(idea), _e(img["headline"]), chips,
         _mark(brand), _footer(brand, idea))


def offer(brand, idea):
    img = idea["image"]
    sub = '<p class="sub" data-fit>%s</p>' % _e(img["sub"]) if img.get("sub") else ""
    cta = '<div class="cta" data-fit>%s</div>' % _e(img["cta"]) if img.get("cta") else ""
    return (
        '<div class="stage stage--accent">%s<div class="fill">'
        '<h1 class="headline headline--lg" data-fit>%s</h1>%s%s</div>%s</div>'
    ) % (_kicker(idea), _e(img["headline"]), sub, cta, _footer(brand, idea))


LAYOUTS = {
    "statement": statement,
    "tips": tips,
    "problem_solution": problem_solution,
    "compare": compare,
    "faq": faq,
    "showcase": showcase,
    "offer": offer,
}


def build(brand, idea):
    layout = idea.get("layout")
    if layout not in LAYOUTS:
        raise KeyError("unknown layout %r for idea %r" % (layout, idea.get("id")))
    return LAYOUTS[layout](brand, idea)
