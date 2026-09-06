#!/usr/bin/env python3
"""
AURELIA SKIN LAB — static page builder.

Renders the six pages from one shared layout so the header, footer and
asset wiring stay identical everywhere. Output is plain static HTML with
no runtime build step:  python3 scripts/build.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAN = json.loads((ROOT / "assets" / "manifest.json").read_text())

IMG = MAN["images"]
VID  = MAN["video"]["hero"]
VIDM = MAN["video"]["hero_mobile"]
VIDC = MAN["video"]["campaign"]

BRAND = "AURELIA SKIN LAB"

# --------------------------------------------------------------------------
# Asset helper — local path first, generated source as a runtime fallback.
# --------------------------------------------------------------------------
def img(key, alt, cls="", ratio_attrs="", loading="lazy", sizes=None):
    a = IMG[key]
    s = f'<img src="{a["file"]}" data-fallback="{a["url"]}" alt="{alt}"'
    if cls:
        s += f' class="{cls}"'
    if loading:
        s += f' loading="{loading}" decoding="async"'
    if sizes:
        s += f' sizes="{sizes}"'
    if ratio_attrs:
        s += " " + ratio_attrs
    return s + ">"


def fig(key, alt, shape="wide", drift=True, eager=False, delay=None):
    """An editorial figure: paper ground, image wipes down over it on reveal."""
    cls = f"fig fig--{shape}" + (" fig--drift" if drift else "")
    style = f' style="--d:{delay}"' if delay else ""
    return (f'<figure class="{cls}" data-reveal="clip"{style}>'
            + img(key, alt, loading=("eager" if eager else "lazy")) + "</figure>")


def film_block():
    """Click-to-play campaign film. preload=none so it costs nothing until wanted."""
    return f"""<div class="film" data-film>
  <video class="film__v" data-film-video
         data-src="{VIDC['file']}" data-fallback="{VIDC['url']}"
         poster="{IMG['poster']['file']}" data-poster-fallback="{IMG['poster']['url']}"
         muted loop playsinline preload="none"></video>
  <button class="film__btn" type="button" data-film-btn aria-label="Play the AURELIA campaign film">
    <span class="film__ico" aria-hidden="true"></span>
    <span class="film__lbl">Play the film</span>
  </button>
  <span class="film__meta" aria-hidden="true">AURELIA &mdash; 2026 &middot; 0:21</span>
</div>"""


PRODUCTS = [
    {
        "slug": "radiance-renewal-serum",
        "name": "Radiance Renewal Serum",
        "tag": "Brightening concentrate",
        "price": "£128",
        "size": "30 ml",
        "img": "serum",
        "claim": "Luminosity, engineered.",
        "note": "12% stabilised vitamin C · polyglutamic acid",
        "copy": "A weightless daily concentrate that lifts dullness without lifting the barrier "
                "with it. Tetrahexyldecyl ascorbate is held in an anhydrous base so it stays "
                "active to the last drop.",
    },
    {
        "slug": "velvet-barrier-cream",
        "name": "Velvet Barrier Cream",
        "tag": "Replenishing moisturiser",
        "price": "£96",
        "size": "50 ml",
        "img": "cream",
        "claim": "Comfort, restored.",
        "note": "Ceramide NP · squalane · oat lipid",
        "copy": "A cushioned cream built on the lipid ratio skin makes for itself. It settles "
                "to a soft matte finish and holds water in the upper layers for hours, not "
                "minutes.",
    },
    {
        "slug": "midnight-repair-elixir",
        "name": "Midnight Repair Elixir",
        "tag": "Overnight treatment",
        "price": "£145",
        "size": "30 ml",
        "img": "elixir",
        "claim": "Repair, overnight.",
        "note": "Encapsulated retinal · bakuchiol · algae ferment",
        "copy": "Encapsulation releases retinal slowly across the night, so you get the "
                "resurfacing without the reckoning. Formulated for nightly use from the "
                "first bottle.",
    },
]

INGREDIENTS = [
    ("01", "Tetrahexyldecyl Ascorbate 12%",
     "An oil-soluble vitamin C ester. It survives light and air far better than L-ascorbic "
     "acid, and converts in the skin rather than in the bottle."),
    ("02", "Polyglutamic Acid",
     "Holds several times the water of hyaluronic acid at the surface, which is where "
     "dehydration actually reads on the face."),
    ("03", "Ceramide NP + Squalane",
     "Dosed at the ratio the stratum corneum builds naturally. Barrier repair is the "
     "precondition for everything else we ask of skin."),
    ("04", "Encapsulated Retinal",
     "One step closer to retinoic acid than retinol, released on a curve across the night "
     "so tolerance builds instead of breaking."),
    ("05", "Emerald Algae Ferment",
     "A cold-water ferment rich in antioxidant polysaccharides. It is also, quietly, where "
     "our green comes from."),
    ("06", "Barrier Lipid Matrix",
     "Our own cholesterol and fatty-acid blend, carried across all three formulas so the "
     "routine behaves as one system."),
]

BENEFITS = [
    ("01", "Barrier first",
     "Every formula is judged on what it leaves behind, not only on what it delivers. "
     "Actives are dosed to the point of efficacy, then stopped."),
    ("02", "Clinically dosed",
     "Percentages are printed on the carton. If an ingredient is present below its "
     "studied concentration, we leave it out rather than list it."),
    ("03", "Fragrance-free",
     "No fragrance, no essential oils, no masking agents. What you smell is the "
     "formula itself, and it is nearly nothing."),
    ("04", "Refillable glass",
     "Pharmaceutical-grade glass with a brushed alloy collar, designed to be refilled. "
     "The bottle is the part that should outlast the routine."),
]

QUOTES = [
    ("The first vitamin C my skin has tolerated at this strength. Six weeks in and the "
     "texture change is the part I did not expect.",
     "Marguerite L. — verified"),
    ("It reads as restraint rather than luxury theatre. Three products, no fragrance, "
     "no ceremony. I have not needed anything else since.",
     "Dr. Ines Varga — dermatology"),
    ("The Elixir is the only retinal I have used nightly without a reset week. "
     "Whatever the encapsulation is doing, it is working.",
     "Theo A. — verified"),
]

NAV = [
    ("index.html", "Home"),
    ("shop.html", "Shop"),
    ("science.html", "Science"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]


def nav_html(active, cls="nav"):
    out = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == active else ""
        out.append(f'<a href="{href}"{cur}>{label}</a>')
    return f'<nav class="{cls}" aria-label="Primary">' + "".join(out) + "</nav>"


def drawer_nav(active):
    out = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == active else ""
        out.append(f'<a href="{href}"{cur}>{label}</a>')
    return '<div class="drawer__nav">' + "".join(out) + "</div>"


MARK = ('<a class="mark" href="index.html" aria-label="AURELIA SKIN LAB — home">'
        '<span class="mark__a">AURELIA</span>'
        '<span class="mark__b">Skin Lab</span></a>')


def header(active, over=False):
    over_cls = " hdr--over" if over else ""
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="hdr{over_cls}" data-header>
  <div class="wrap hdr__inner">
    {MARK}
    {nav_html(active)}
    <button class="burger" data-burger type="button" aria-expanded="false"
            aria-controls="drawer" aria-label="Menu"><span></span><span></span></button>
  </div>
</header>
<div class="drawer" id="drawer" data-drawer aria-hidden="true">
  {drawer_nav(active)}
  <div class="small">Concept brand · portfolio work</div>
</div>"""


FOOTER = f"""<footer class="ftr">
  <div class="wrap">
    <div class="ftr__grid">
      <div>
        {MARK}
        <p class="small" style="margin-top:1.2rem;max-width:30ch">
          Clinical formulation, dressed with restraint. Three products, made properly.
        </p>
        <form class="sub" data-concept-form aria-label="Newsletter">
          <label class="skip" for="ftr-email">Email address</label>
          <input id="ftr-email" type="email" name="email" placeholder="Email address" required>
          <button type="submit">Join</button>
        </form>
        <p class="small mt-xs" data-form-note></p>
      </div>
      <div>
        <h4 class="ftr__h">Shop</h4>
        <div class="ftr__list">
          <a href="product.html">Radiance Renewal Serum</a>
          <a href="product.html">Velvet Barrier Cream</a>
          <a href="product.html">Midnight Repair Elixir</a>
          <a href="shop.html">The full collection</a>
        </div>
      </div>
      <div>
        <h4 class="ftr__h">House</h4>
        <div class="ftr__list">
          <a href="about.html">Our story</a>
          <a href="science.html">Ingredients</a>
          <a href="science.html">Formulation ethos</a>
          <a href="contact.html">Contact</a>
        </div>
      </div>
      <div>
        <h4 class="ftr__h">Care</h4>
        <div class="ftr__list">
          <a href="contact.html">Shipping &amp; returns</a>
          <a href="contact.html">Refill programme</a>
          <a href="contact.html">Stockists</a>
          <a href="contact.html">Press</a>
        </div>
      </div>
    </div>
    <div class="ftr__base">
      <span>&copy; <span data-year>2026</span> {BRAND}. A concept brand created for portfolio presentation.</span>
      <span>Design &amp; build — Ahmad</span>
    </div>
  </div>
</footer>"""


def page(filename, title, desc, body, active, over=False):
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#FCFAF6">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;350;400;450;500&display=swap">
<link rel="stylesheet" href="css/main.css">
</head>
<body>
{header(active, over)}
<main id="main">
{body}
</main>
{FOOTER}
<script src="js/main.js" defer></script>
</body>
</html>
"""
    (ROOT / filename).write_text(html)
    print("  ->", filename)


# ==========================================================================
#  HOME
# ==========================================================================
def build_home():
    cards = []
    for p in PRODUCTS:
        cards.append(f"""<a class="card" href="product.html" data-reveal>
  <div class="card__media">
    {img(p['img'], p['name'] + " — " + p['claim'])}
    <span class="btn btn--light card__peek">View<span class="arw" aria-hidden="true">&rarr;</span></span>
  </div>
  <div class="card__body">
    <div class="card__row">
      <span class="card__name">{p['name']}</span>
      <span class="card__price">{p['price']}</span>
    </div>
    <span class="card__note">{p['note']}</span>
    <span class="card__tag">{p['tag']}</span>
  </div>
</a>""")

    specs = "".join(f"""<div class="spec__row" data-reveal>
  <span class="spec__idx">{n}</span>
  <span class="spec__name">{name}</span>
  <span class="spec__desc">{desc}</span>
</div>""" for n, name, desc in INGREDIENTS[:4])

    bens = "".join(f"""<div class="benefit" data-reveal>
  <span class="benefit__n">{n}</span>
  <h3>{t}</h3>
  <p class="small">{d}</p>
</div>""" for n, t, d in BENEFITS)

    quotes = "".join(f"""<figure class="quote" data-reveal>
  <span class="quote__mark" aria-hidden="true">&ldquo;</span>
  <blockquote><p>{q}</p></blockquote>
  <figcaption class="quote__who">{who}</figcaption>
</figure>""" for q, who in QUOTES)

    body = f"""
<!-- 1 · Cinematic hero -->
<section class="hero">
  <div class="hero__media">
    <video data-hero-video
           data-src="{VID['file']}"
           data-src-mobile="{VIDM['file']}"
           data-fallback="{VID['url']}"
           data-fallback-mobile="{VIDM['url']}"
           poster="{IMG['poster']['file']}"
           data-poster-fallback="{IMG['poster']['url']}"
           muted loop playsinline autoplay preload="none"
           aria-hidden="true" tabindex="-1"></video>
  </div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="wrap hero__inner">
    <div class="hero__copy">
      <span class="eyebrow eyebrow--light">Aurelia Skin Lab</span>
      <h1 class="d1">The quiet<br><em>science</em> of skin.</h1>
      <p class="lede">Three formulas. Clinically dosed, fragrance-free, and finished
        to the standard of the glass they arrive in.</p>
      <div class="hero__cta">
        <a class="btn btn--light" href="shop.html">Explore the collection<span class="arw" aria-hidden="true">&rarr;</span></a>
        <a class="btn btn--ghost" href="science.html">The formulation</a>
      </div>
    </div>
  </div>
  <div class="cue" aria-hidden="true"><span class="cue__line"></span>Scroll</div>
</section>

<!-- 2 · Featured products -->
<section class="section" aria-labelledby="feat-h">
  <div class="wrap">
    <div class="split" style="align-items:end;margin-bottom:clamp(2.5rem,5vw,4rem)">
      <div data-reveal>
        <span class="eyebrow">The collection</span>
        <h2 class="d2" id="feat-h">Everything<br>you need. <em>Nothing</em><br>you don't.</h2>
      </div>
      <p class="lede" data-reveal style="--d:120ms">We make three products. Each one exists
        because the routine was incomplete without it — and each is dosed at the
        concentration the research actually supports.</p>
    </div>
    <div class="grid grid--3" data-reveal-group>{"".join(cards)}</div>
    <div class="mt-lg center" data-reveal>
      <a class="link" href="shop.html">View the full collection</a>
    </div>
  </div>
</section>

<!-- 3 · Brand philosophy -->
<section class="section on-paper" aria-labelledby="phil-h">
  <div class="wrap">
    <div class="split">
      <div class="stack-md" data-reveal>
        <span class="eyebrow">Philosophy</span>
        <h2 class="d2" id="phil-h">Restraint is<br>the <em>active</em><br>ingredient.</h2>
        <p class="lede">Most skincare fails not because it does too little, but because it
          asks too much of the barrier at once. We formulate in the other direction.</p>
        <p>Every AURELIA formula starts from the lipid matrix outward. Actives are added
          only once the base can carry them without cost, dosed to the studied
          concentration, and then stopped. No fragrance is added to make a formula feel
          like it is working.</p>
        <a class="link" href="about.html">Read our story</a>
      </div>
      {fig('reflect', 'The Radiance Renewal Serum mirrored in still water over ivory stone', 'tall', delay='120ms')}
    </div>
  </div>
</section>

<!-- 4 · The film -->
<section class="section--tight" aria-labelledby="film-h">
  <div class="wrap">
    <div class="split" style="align-items:end;margin-bottom:clamp(2rem,4vw,3rem)">
      <div data-reveal>
        <span class="eyebrow">The campaign</span>
        <h2 class="d2" id="film-h">Seven shots.<br>One <em>house</em>.</h2>
      </div>
      <p class="lede" data-reveal style="--d:120ms">A twenty-one second film shot entirely in
        the AURELIA studio — the glass, the gold, the water and the light that the whole
        collection is built from.</p>
    </div>
  </div>
  <div class="wrap" data-reveal>{film_block()}</div>
</section>

<!-- 5 · Ingredients / science -->
<section class="section on-emerald" aria-labelledby="sci-h">
  <div class="wrap">
    <div class="split" style="align-items:center;margin-bottom:clamp(2.5rem,5vw,4rem)">
      {fig('cap', 'Macro detail of the brushed muted-gold cap and hairline sage ring', '32')}
      <div class="stack-md" data-reveal style="--d:120ms">
        <span class="eyebrow eyebrow--light">Ingredients &amp; science</span>
        <h2 class="d2" id="sci-h">Printed on<br>the <em>carton</em>.</h2>
        <p class="lede">Concentrations, not claims. Here is what goes in, at what
          strength, and why it earns the space.</p>
      </div>
    </div>
    <div class="spec" data-reveal-group>{specs}</div>
    <div class="split mt-lg" style="align-items:center">
      <div class="stack-md" data-reveal>
        <h3 class="d4">Every active is dosed to<br>the concentration the<br><em>research</em> supports.</h3>
        <p class="small">Below its studied percentage an ingredient is decoration. We would
          rather ship a shorter list than a longer label.</p>
        <a class="btn btn--light" href="science.html">The full formulation<span class="arw" aria-hidden="true">&rarr;</span></a>
      </div>
      {fig('droplet', 'Macro of a champagne-gold serum droplet on optical glass', 'sq', delay='120ms')}
    </div>
  </div>
</section>

<!-- 6 · Product benefits -->
<section class="section" aria-labelledby="ben-h">
  <div class="wrap">
    <div class="maxw-md" data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">
      <span class="eyebrow">Why Aurelia</span>
      <h2 class="d2" id="ben-h">Four commitments,<br>held <em>without</em> exception.</h2>
    </div>
    <div class="grid grid--2" data-reveal-group
         style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">{bens}</div>
  </div>
</section>

<!-- 6b · Editorial band -->
<section class="section--tight">
  <div class="wrap">
    {fig('botanical', 'Botanical light and shadow drifting across an ivory wall behind the serum bottle', 'band')}
  </div>
</section>

<!-- 6c · Editorial brand story -->
<section class="section--tight" aria-labelledby="ed-h">
  <div class="wrap">
    <div class="split">
      <div class="stack-md" data-reveal>
        <span class="eyebrow">The house</span>
        <h2 class="d2" id="ed-h">Built in a<br>laboratory.<br><em>Finished</em> in a<br>studio.</h2>
        <p class="lede">AURELIA began as a formulation practice, not a brand. The packaging
          came last, and only once the formulas were finished.</p>
        <p>Each piece is pharmaceutical-grade glass with a brushed alloy collar and a single
          sage line at the seam — the only decoration we allowed ourselves. It is heavy in
          the hand on purpose, and refillable for the same reason.</p>
        <a class="link" href="about.html">Inside the lab</a>
      </div>
      {fig('shelf', 'All three AURELIA products on a floating ivory stone shelf', 'wide', delay='120ms')}
    </div>
  </div>
</section>

<!-- 6d · Lineup band -->
<section class="section--tight">
  <div class="wrap">
    {fig('lineup', 'The complete AURELIA SKIN LAB collection photographed together', 'band')}
  </div>
</section>

<!-- 7 · Testimonials -->
<section class="section on-paper" aria-labelledby="test-h">
  <div class="wrap">
    <div class="maxw-md" data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">
      <span class="eyebrow">Received</span>
      <h2 class="d2" id="test-h">In their<br><em>words</em>.</h2>
    </div>
    <div class="grid grid--3" data-reveal-group>{quotes}</div>
  </div>
</section>

<!-- 8 · Final CTA -->
<section class="section cta" aria-labelledby="cta-h">
  <div class="wrap">
    <div data-reveal>
      <span class="eyebrow">Begin</span>
      <h2 class="d2" id="cta-h">Three products.<br>One <em>considered</em> routine.</h2>
      <p class="lede">Start with the full collection, or with the one formula your
        skin is asking for.</p>
      <div class="cta__actions">
        <a class="btn" href="shop.html">Shop the collection<span class="arw" aria-hidden="true">&rarr;</span></a>
        <a class="btn btn--ghost" href="contact.html">Speak to the lab</a>
      </div>
    </div>
  </div>
</section>
"""
    page("index.html",
         f"{BRAND} — The quiet science of skin",
         "A concept luxury skincare house. Three clinically dosed, fragrance-free formulas "
         "in refillable pharmaceutical glass.",
         body, "index.html", over=True)


# ==========================================================================
#  SHOP
# ==========================================================================
def build_shop():
    cards = []
    for p in PRODUCTS:
        cards.append(f"""<a class="card" href="product.html" data-reveal>
  <div class="card__media">
    {img(p['img'], p['name'] + " — " + p['claim'])}
    <span class="btn btn--light card__peek">View<span class="arw" aria-hidden="true">&rarr;</span></span>
  </div>
  <div class="card__body">
    <div class="card__row">
      <span class="card__name">{p['name']}</span>
      <span class="card__price">{p['price']}</span>
    </div>
    <span class="card__note">{p['note']}</span>
    <span class="card__tag">{p['tag']} · {p['size']}</span>
  </div>
</a>""")

    body = f"""
<section class="phero">
  <div class="wrap">
    <span class="eyebrow" data-reveal>The collection</span>
    <h1 class="d1" data-reveal style="--d:80ms">Three formulas,<br>made <em>properly</em>.</h1>
    <p class="lede" data-reveal style="--d:160ms">A complete routine in three steps — morning
      brightening, all-day barrier support, and overnight repair. Each sold individually,
      each designed to be refilled.</p>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <hr class="rule">
    <div class="grid grid--3 mt-lg" data-reveal-group>{"".join(cards)}</div>
  </div>
</section>

<section class="section on-paper">
  <div class="wrap">
    <div class="split">
      {fig('shelf', 'The three AURELIA formulas on a floating ivory stone shelf', 'wide')}
      <div class="stack-md" data-reveal style="--d:120ms">
        <span class="eyebrow">The complete routine</span>
        <h2 class="d3">Take all three,<br>and the system<br><em>closes</em>.</h2>
        <p>The Serum brightens in the morning, the Cream holds the barrier through the day,
          and the Elixir resurfaces overnight. They share one lipid matrix, so they layer
          without pilling and without competing.</p>
        <p class="small">The Ritual Set — all three, £338 (£31 saved) — including one refill
          of each.</p>
        <div><a class="btn" href="contact.html">Enquire about the set<span class="arw" aria-hidden="true">&rarr;</span></a></div>
      </div>
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    {fig('lineup', 'The complete AURELIA collection photographed together', 'band')}
  </div>
</section>

<section class="section cta">
  <div class="wrap" data-reveal>
    <span class="eyebrow">Not sure where to begin?</span>
    <h2 class="d2">Ask the <em>lab</em>.</h2>
    <p class="lede">Tell us what your skin is doing and we will tell you which of the three
      to start with — or whether you need us at all.</p>
    <div class="cta__actions">
      <a class="btn" href="contact.html">Get a recommendation<span class="arw" aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>
"""
    page("shop.html", f"Shop — {BRAND}",
         "Three clinically dosed skincare formulas: Radiance Renewal Serum, Velvet Barrier "
         "Cream and Midnight Repair Elixir.",
         body, "shop.html")


# ==========================================================================
#  PRODUCT DETAIL
# ==========================================================================
def build_product():
    p = PRODUCTS[0]
    others = PRODUCTS[1:]

    acc_items = [
        ("How to use",
         "<p>Two to three drops to clean, dry skin each morning, before moisturiser. "
         "Follow with Velvet Barrier Cream and a broad-spectrum SPF. Can be used in the "
         "evening, but the antioxidant benefit is greatest under daylight.</p>"),
        ("Full ingredients",
         "<p class='small'>Caprylic/Capric Triglyceride, Tetrahexyldecyl Ascorbate (12%), "
         "Squalane, Polyglutamic Acid, Ceramide NP, Tocopherol, Bisabolol, "
         "Algae Ferment Filtrate.</p><p class='small mt-xs'>Fragrance-free. "
         "Essential-oil free. Never tested on animals.</p>"),
        ("The evidence",
         "<p>Tetrahexyldecyl ascorbate is dosed at 12% — the concentration at which "
         "photoprotective and pigment-modulating effects are consistently reported in "
         "the literature. Below roughly 8% the evidence thins considerably, which is why "
         "you will not find a 3% version of this bottle.</p>"),
        ("Refills &amp; care",
         "<p>The glass and collar are designed to be kept. Refills arrive in a recycled "
         "aluminium cartridge and cost 30% less than the first purchase. Store away from "
         "direct sun; the anhydrous base is stable, but the glass is clear on purpose.</p>"),
    ]
    accs = []
    for i, (h, c) in enumerate(acc_items):
        accs.append(f"""<div class="acc__item">
  <button class="acc__btn" type="button" id="acc-b{i}" aria-controls="acc-p{i}"
          aria-expanded="{'true' if i == 0 else 'false'}">
    {h}<span class="acc__sign" aria-hidden="true"></span>
  </button>
  <div class="acc__panel" id="acc-p{i}" role="region" aria-labelledby="acc-b{i}"
       aria-hidden="{'false' if i == 0 else 'true'}"><div>{c}</div></div>
</div>""")

    rel = "".join(f"""<a class="card" href="product.html" data-reveal>
  <div class="card__media">{img(o['img'], o['name'])}</div>
  <div class="card__body">
    <div class="card__row">
      <span class="card__name">{o['name']}</span>
      <span class="card__price">{o['price']}</span>
    </div>
    <span class="card__note">{o['note']}</span>
  </div>
</a>""" for o in others)

    body = f"""
<section class="section" style="padding-top:clamp(8rem,14vw,11rem)">
  <div class="wrap">
    <p class="small" style="margin-bottom:clamp(2rem,4vw,3rem)">
      <a href="shop.html">Shop</a> <span aria-hidden="true">/</span> {p['name']}
    </p>
    <div class="pdp">
      <div class="pdp__media">
        <figure class="fig fig--tall" data-reveal="clip">
          {img(p['img'], p['name'] + " — " + p['claim'], loading="eager")}
        </figure>
      </div>
      <div class="stack-md" data-reveal style="--d:100ms">
        <div>
          <span class="eyebrow">{p['tag']}</span>
          <h1 class="d2">{p['name']}</h1>
          <p class="lede mt-sm">{p['claim']} {p['copy']}</p>
        </div>
        <hr class="rule">
        <div class="card__row">
          <span class="pdp__price">{p['price']}</span>
          <span class="card__price">{p['size']}</span>
        </div>
        <div class="pdp__meta">
          <span>Fragrance-free</span><span>Refillable</span><span>Vegan</span><span>pH 5.5</span>
        </div>
        <div class="hero__cta" style="margin-top:.5rem">
          <a class="btn" href="contact.html">Add to bag<span class="arw" aria-hidden="true">&rarr;</span></a>
          <a class="btn btn--ghost" href="science.html">See the science</a>
        </div>
        <p class="small">Concept storefront — checkout is not enabled. This is portfolio work.</p>
        <div class="acc mt-sm" data-acc>{"".join(accs)}</div>
      </div>
    </div>
  </div>
</section>

<section class="section on-emerald">
  <div class="wrap">
    <div class="split">
      <div data-reveal>
        <span class="eyebrow eyebrow--light">What to expect</span>
        <h2 class="d3">Four weeks in,<br>then <em>twelve</em>.</h2>
      </div>
      <div class="stack-md" data-reveal style="--d:120ms">
        <p class="lede">Vitamin C works on a slow curve. Brightness reads first; tone
          evenness takes a full cycle of skin turnover.</p>
        <p><strong style="color:var(--ivory)">Weeks 1–2.</strong> Surface radiance. Skin
          looks less grey in the morning.</p>
        <p><strong style="color:var(--ivory)">Weeks 4–6.</strong> Post-inflammatory marks
          begin to soften at the edges.</p>
        <p><strong style="color:var(--ivory)">Weeks 12+.</strong> Measurable evenness of
          tone, and better resilience to daylight exposure.</p>
      </div>
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <div class="split">
      {fig('droplet', 'Macro of a champagne-gold serum droplet on optical glass', 'sq')}
      <div class="stack-md" data-reveal style="--d:120ms">
        <span class="eyebrow">The texture</span>
        <h2 class="d3">Weightless,<br>and <em>anhydrous</em>.</h2>
        <p>No water means no preservative system fighting the active, and no dilution of
          the ascorbate as the bottle empties. It absorbs in seconds and leaves no film
          under sunscreen.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="maxw-md" data-reveal style="margin-bottom:clamp(2rem,4vw,3rem)">
      <span class="eyebrow">Completes the routine</span>
      <h2 class="d3">Pairs <em>with</em>.</h2>
    </div>
    <div class="grid grid--2" data-reveal-group>{rel}</div>
  </div>
</section>
"""
    page("product.html", f"{p['name']} — {BRAND}",
         f"{p['claim']} {p['note']}. A clinically dosed, fragrance-free brightening "
         "concentrate in refillable pharmaceutical glass.",
         body, "shop.html")


# ==========================================================================
#  ABOUT
# ==========================================================================
def build_about():
    body = f"""
<section class="phero">
  <div class="wrap">
    <span class="eyebrow" data-reveal>Our story</span>
    <h1 class="d1" data-reveal style="--d:80ms">A laboratory<br>that learned<br><em>restraint</em>.</h1>
    <p class="lede" data-reveal style="--d:160ms">AURELIA SKIN LAB began with a formulation
      problem and ended with three products. The order matters.</p>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <figure class="fig fig--band fig--drift" data-reveal="clip">
      {img('hero', 'The Radiance Renewal Serum in the AURELIA studio', loading='eager')}
    </figure>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="split">
      <div data-reveal>
        <span class="eyebrow">The beginning</span>
        <h2 class="d2">We kept<br><em>removing</em><br>things.</h2>
      </div>
      <div class="stack-md" data-reveal style="--d:120ms">
        <p class="lede">The first version of the Serum had nineteen ingredients. The
          version we sell has eight.</p>
        <p>Every removal was an argument. Each one came down to the same question: can we
          demonstrate that this earns its place at the concentration we can actually
          afford to include it at? Most could not. Fragrance went first, then the
          botanical extracts that read well on a carton and do very little on a face.</p>
        <p>What survived is a short list, dosed properly. That is the whole method, and
          it is less romantic than most brand stories — but it is the true one.</p>
      </div>
    </div>
  </div>
</section>

<section class="section on-paper">
  <div class="wrap">
    <div class="split">
      <div class="stack-md" data-reveal>
        <span class="eyebrow">The making</span>
        <h2 class="d3">The glass came<br><em>last</em>.</h2>
        <p>We spent fourteen months on the formulas and six weeks on the bottle. That ratio
          is deliberate, and we would keep it.</p>
        <p>The result is pharmaceutical-grade glass, thick-walled and heavy in the hand, with
          a brushed alloy collar and one sage line where the metal meets the glass. There is
          no printed label on the vessel itself — the carton carries the information, and the
          bottle stays clean enough to keep and refill for years.</p>
        <a class="link" href="science.html">See what goes in</a>
      </div>
      {fig('cream', 'Velvet Barrier Cream jar on a stone surface', 'tall', delay='120ms')}
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    {fig('botanical', 'Afternoon botanical shadows moving across the AURELIA studio wall', 'band')}
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <div class="split">
      {fig('shelf', 'The AURELIA collection on a floating ivory stone shelf', 'wide')}
      <div class="stack-md" data-reveal style="--d:120ms">
        <span class="eyebrow">The shelf</span>
        <h2 class="d3">Three products.<br>That is the <em>whole</em><br>house.</h2>
        <p>We have been asked, more than once, when the fourth is coming. There is no
          fourth. A cleanser we would be proud of does not yet exist in our lab, and we
          would rather sell you nothing than sell you a placeholder.</p>
      </div>
    </div>
  </div>
</section>

<section class="section on-emerald">
  <div class="wrap">
    <div class="maxw-md" data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">
      <span class="eyebrow eyebrow--light">What we hold to</span>
      <h2 class="d2">Four <em>commitments</em>.</h2>
    </div>
    <div class="spec" data-reveal-group>
      {"".join(f'''<div class="spec__row" data-reveal>
        <span class="spec__idx">{n}</span>
        <span class="spec__name">{t}</span>
        <span class="spec__desc">{d}</span>
      </div>''' for n, t, d in BENEFITS)}
    </div>
  </div>
</section>

<section class="section cta">
  <div class="wrap" data-reveal>
    <span class="eyebrow">The collection</span>
    <h2 class="d2">Three products.<br>That is the <em>whole</em> house.</h2>
    <div class="cta__actions">
      <a class="btn" href="shop.html">Explore the collection<span class="arw" aria-hidden="true">&rarr;</span></a>
      <a class="btn btn--ghost" href="contact.html">Contact the lab</a>
    </div>
  </div>
</section>
"""
    page("about.html", f"About — {BRAND}",
         "How a formulation practice became a three-product skincare house, and why "
         "restraint is the method.",
         body, "about.html")


# ==========================================================================
#  SCIENCE
# ==========================================================================
def build_science():
    specs = "".join(f"""<div class="spec__row" data-reveal>
  <span class="spec__idx">{n}</span>
  <span class="spec__name">{name}</span>
  <span class="spec__desc">{desc}</span>
</div>""" for n, name, desc in INGREDIENTS)

    body = f"""
<section class="phero">
  <div class="wrap">
    <span class="eyebrow" data-reveal>Ingredients &amp; science</span>
    <h1 class="d1" data-reveal style="--d:80ms">Concentrations,<br>not <em>claims</em>.</h1>
    <p class="lede" data-reveal style="--d:160ms">Every active in the AURELIA collection is
      listed here with its dose and its reason. If an ingredient cannot survive that
      disclosure, it does not go in.</p>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <div class="spec" data-reveal-group>{specs}</div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    {fig('cap', 'Macro detail of the brushed muted-gold cap, knurling and hairline sage ring', 'band')}
  </div>
</section>

<section class="section on-emerald">
  <div class="wrap">
    <div class="split">
      {fig('elixir', 'Midnight Repair Elixir in a dark studio composition', 'tall')}
      <div class="stack-md" data-reveal style="--d:120ms">
        <span class="eyebrow eyebrow--light">Formulation ethos</span>
        <h2 class="d2">The barrier<br>comes <em>first</em>.</h2>
        <p class="lede">An active is only as good as the skin you deliver it into. We build
          the base before we choose the payload.</p>
        <p>All three formulas share one lipid matrix — cholesterol, ceramide NP and free
          fatty acids in the ratio the stratum corneum builds for itself. That shared base
          is why the products layer cleanly, and why the Elixir can carry retinal nightly
          without the tolerance-building week most retinoids demand.</p>
        <p>It is also why we can dose the Serum at 12%. A compromised barrier could not take
          it. An intact one barely notices.</p>
      </div>
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <div class="split">
      <div class="stack-md" data-reveal>
        <span class="eyebrow">The texture</span>
        <h2 class="d3">You can see the<br>dose in the <em>pour</em>.</h2>
        <p>A 12% ascorbate serum is heavier than a 3% one, and it should look it. Ours is
          honey-thick going on and gone in seconds — the viscosity is the concentration
          made visible, not a thickener added for feel.</p>
      </div>
      {fig('droplet', 'Macro of a champagne-gold serum droplet on optical glass', 'sq', delay='120ms')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="maxw-md" data-reveal style="margin-bottom:clamp(2.5rem,5vw,4rem)">
      <span class="eyebrow">Never included</span>
      <h2 class="d2">The <em>short</em> list<br>of exclusions.</h2>
    </div>
    <div class="grid grid--2" data-reveal-group
         style="grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))">
      <div class="benefit" data-reveal>
        <span class="benefit__n">&mdash;</span><h3>Fragrance</h3>
        <p class="small">Including natural fragrance and essential oils. The leading cause of
          contact sensitivity in leave-on products, and it does nothing for the skin.</p>
      </div>
      <div class="benefit" data-reveal>
        <span class="benefit__n">&mdash;</span><h3>Denatured alcohol</h3>
        <p class="small">A cheap way to make a formula feel light. It costs the barrier more
          than the texture is worth.</p>
      </div>
      <div class="benefit" data-reveal>
        <span class="benefit__n">&mdash;</span><h3>Fairy dusting</h3>
        <p class="small">No ingredient appears on our list below the concentration at which
          it has been shown to do something.</p>
      </div>
      <div class="benefit" data-reveal>
        <span class="benefit__n">&mdash;</span><h3>Colourants</h3>
        <p class="small">The Elixir is dark green because of the algae ferment. Nothing is
          added to make a formula look like it works.</p>
      </div>
    </div>
  </div>
</section>

<section class="section on-paper cta">
  <div class="wrap" data-reveal>
    <span class="eyebrow">Put it to use</span>
    <h2 class="d2">Now read it<br>on the <em>carton</em>.</h2>
    <p class="lede">Every concentration on this page is printed on the packaging you receive.</p>
    <div class="cta__actions">
      <a class="btn" href="shop.html">Shop the collection<span class="arw" aria-hidden="true">&rarr;</span></a>
      <a class="btn btn--ghost" href="contact.html">Ask a formulator</a>
    </div>
  </div>
</section>
"""
    page("science.html", f"Ingredients &amp; Science — {BRAND}",
         "Every active in the AURELIA collection, listed with its concentration and its "
         "reason. Barrier-first formulation.",
         body, "science.html")


# ==========================================================================
#  CONTACT
# ==========================================================================
def build_contact():
    body = f"""
<section class="phero">
  <div class="wrap">
    <span class="eyebrow" data-reveal>Contact</span>
    <h1 class="d1" data-reveal style="--d:80ms">Speak to<br>the <em>lab</em>.</h1>
    <p class="lede" data-reveal style="--d:160ms">Questions about a formula, a concentration
      or a reaction go straight to the people who made it. We answer within two working days.</p>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <hr class="rule">
    <div class="split mt-lg" style="align-items:start">
      <form class="stack-md" data-concept-form data-reveal aria-label="Contact the lab">
        <div class="grid grid--2" style="gap:1.5rem">
          <div class="field">
            <label for="c-name">Name</label>
            <input id="c-name" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="c-email">Email</label>
            <input id="c-email" name="email" type="email" autocomplete="email" required>
          </div>
        </div>
        <div class="field">
          <label for="c-topic">Subject</label>
          <select id="c-topic" name="topic">
            <option>Product recommendation</option>
            <option>Ingredients &amp; formulation</option>
            <option>Refill programme</option>
            <option>Order &amp; shipping</option>
            <option>Press &amp; stockists</option>
          </select>
        </div>
        <div class="field">
          <label for="c-msg">Message</label>
          <textarea id="c-msg" name="message" required></textarea>
        </div>
        <div>
          <button class="btn" type="submit">Send message<span class="arw" aria-hidden="true">&rarr;</span></button>
        </div>
        <p class="form-note" data-form-note>Concept site — this form does not send anything.</p>
      </form>

      <div class="stack-md" data-reveal style="--d:120ms">
        <div>
          <h2 class="d4">The laboratory</h2>
          <p class="small mt-xs">14 Rue des Alpes<br>1201 Geneva, Switzerland</p>
        </div>
        <hr class="rule">
        <div>
          <h2 class="d4">General</h2>
          <p class="small mt-xs"><a href="mailto:hello@aurelia-skinlab.com">hello@aurelia-skinlab.com</a></p>
        </div>
        <div>
          <h2 class="d4">Formulation desk</h2>
          <p class="small mt-xs"><a href="mailto:lab@aurelia-skinlab.com">lab@aurelia-skinlab.com</a></p>
        </div>
        <div>
          <h2 class="d4">Press &amp; stockists</h2>
          <p class="small mt-xs"><a href="mailto:press@aurelia-skinlab.com">press@aurelia-skinlab.com</a></p>
        </div>
        <hr class="rule">
        <div>
          <h2 class="d4">Hours</h2>
          <p class="small mt-xs">Monday to Friday, 09:00 – 17:00 CET</p>
        </div>
        <p class="small">AURELIA SKIN LAB is a concept brand created for portfolio
          presentation. The address and contact details above are fictional.</p>
      </div>
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    {fig('reflect', 'The Radiance Renewal Serum mirrored in still water over ivory stone', 'band')}
  </div>
</section>

<section class="section on-emerald cta">
  <div class="wrap" data-reveal>
    <span class="eyebrow eyebrow--light">Or start here</span>
    <h2 class="d2">Three products.<br>One <em>considered</em> routine.</h2>
    <div class="cta__actions">
      <a class="btn btn--light" href="shop.html">Explore the collection<span class="arw" aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>
"""
    page("contact.html", f"Contact — {BRAND}",
         "Speak to the AURELIA formulation desk about products, ingredients or the "
         "refill programme.",
         body, "contact.html")


if __name__ == "__main__":
    print("Building AURELIA SKIN LAB")
    build_home()
    build_shop()
    build_product()
    build_about()
    build_science()
    build_contact()
    print("Done.")
