/* Demo storefront data for the local preview renderer.
   Mirrors the shape of the Shopify Liquid objects the theme actually uses. */

const money = (n) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const shop = {
  name: 'Cavelier',
  description: 'Made-to-order fine jewellery. Engagement rings, wedding bands and diamonds, cut and set in Clerkenwell, London.',
  url: 'https://cavelier.example',
  money_format: '£{{amount}}',
  customer_accounts_enabled: true,
  email: 'atelier@cavelier.example'
};

const METALS = ['18k Yellow Gold', '18k White Gold', '18k Rose Gold', 'Platinum'];
const SIZES = ['I', 'J', 'K', 'L', 'M', 'N'];

let vid = 40000000;

function buildVariants(optionNames, optionValues, basePrice, priceRules = {}) {
  const combos = optionValues.reduce((acc, values) => {
    const out = [];
    acc.forEach((prefix) => values.forEach((v) => out.push([...prefix, v])));
    return out;
  }, [[]]);

  return combos.map((options, i) => {
    let price = basePrice;
    options.forEach((o) => { if (priceRules[o]) price += priceRules[o]; });
    const available = !(options.includes('Platinum') && options.includes('N'));
    return {
      id: ++vid,
      title: options.join(' / '),
      options,
      option1: options[0] ?? null,
      option2: options[1] ?? null,
      option3: options[2] ?? null,
      price: price * 100,
      compare_at_price: null,
      available,
      sku: `CVL-${String(vid).slice(-6)}`,
      url: null
    };
  });
}

function makeProduct(cfg) {
  const optionNames = cfg.options.map((o) => o.name);
  const optionValues = cfg.options.map((o) => o.values);
  const variants = buildVariants(optionNames, optionValues, cfg.price, cfg.priceRules || {});
  variants.forEach((v) => { v.url = `/products/${cfg.handle}?variant=${v.id}`; });

  const prices = variants.map((v) => v.price);
  const media = (cfg.images || []).map((src, i) => ({
    id: 900000 + i,
    src,
    alt: cfg.imageAlts?.[i] || cfg.title,
    aspect_ratio: 0.8,
    width: 1200,
    height: 1500,
    media_type: 'image'
  }));

  const selected = variants.find((v) => v.available) || variants[0];

  return {
    id: cfg.id,
    title: cfg.title,
    handle: cfg.handle,
    url: `/products/${cfg.handle}`,
    type: cfg.type,
    vendor: 'Cavelier',
    tags: cfg.tags || [],
    description: cfg.description,
    price: Math.min(...prices),
    price_min: Math.min(...prices),
    price_max: Math.max(...prices),
    price_varies: Math.min(...prices) !== Math.max(...prices),
    compare_at_price: null,
    compare_at_price_max: null,
    available: variants.some((v) => v.available),
    has_only_default_variant: false,
    options: optionNames,
    options_with_values: cfg.options.map((o, i) => ({
      name: o.name,
      position: i + 1,
      values: o.values,
      selected_value: selected.options[i]
    })),
    variants,
    selected_or_first_available_variant: selected,
    featured_media: media[0] || null,
    media,
    images: media,
    collections: [],
    metafields: { custom: { badge: cfg.badge || null, carat: cfg.carat || null } }
  };
}

export const products = [
  makeProduct({
    id: 7001, title: 'Aveline Solitaire', handle: 'aveline-solitaire', type: 'Engagement ring',
    price: 3450, tags: ['Engagement'], carat: '1.00 – 2.00ct',
    options: [
      { name: 'Metal', values: METALS },
      { name: 'Stone', values: ['Natural 1.00ct', 'Natural 1.50ct', 'Lab-grown 1.50ct', 'Lab-grown 2.00ct'] },
      { name: 'Size', values: SIZES }
    ],
    priceRules: { 'Platinum': 420, 'Natural 1.50ct': 2600, 'Lab-grown 1.50ct': 450, 'Lab-grown 2.00ct': 1150 },
    images: ['cavelier-product-solitaire.jpg', 'cavelier-product-solitaire-alt.jpg', 'cavelier-product-solitaire-detail.jpg'],
    imageAlts: [
      'The Aveline solitaire in 18k yellow gold, three-quarter view on bone paper',
      'The Aveline solitaire worn on a hand resting on ivory linen',
      'Macro detail of the four-claw setting and cut-down gallery'
    ],
    description: '<p>A four-claw solitaire set low enough to live under a glove. The shank tapers from 2.1mm at the shoulder to 1.9mm at the base, which is what makes it disappear on the hand.</p><p>Cut for the wearer and set by hand in Clerkenwell. Choose the metal and the stone; we will show you three or four candidates loose, with certificates, before anything is set.</p>'
  }),
  makeProduct({
    id: 7002, title: 'Marlowe Emerald-Cut', handle: 'marlowe-emerald-cut', type: 'Engagement ring',
    price: 6900, tags: ['Engagement', 'New'], carat: '2.05ct',
    options: [
      { name: 'Metal', values: ['18k White Gold', '18k Yellow Gold', 'Platinum'] },
      { name: 'Size', values: SIZES }
    ],
    priceRules: { 'Platinum': 540 },
    images: ['cavelier-product-emerald.jpg', 'cavelier-product-emerald-alt.jpg'],
    imageAlts: ['The Marlowe emerald-cut ring in platinum on bone paper', 'The Marlowe ring photographed from the side, showing the low gallery'],
    description: '<p>An emerald cut forgives nothing, which is the point. A step-cut stone shows clarity rather than fire, so we set only VS or better and keep the setting almost invisible.</p><p>Two tapered baguettes flank the centre stone. The whole thing sits 4.6mm above the finger.</p>'
  }),
  makeProduct({
    id: 7003, title: 'Solene Oval', handle: 'solene-oval', type: 'Engagement ring',
    price: 4280, tags: ['Engagement'], carat: '1.40ct',
    options: [
      { name: 'Metal', values: METALS },
      { name: 'Size', values: SIZES }
    ],
    priceRules: { 'Platinum': 460 },
    images: ['cavelier-product-oval.jpg', 'cavelier-product-oval-alt.jpg'],
    imageAlts: ['The Solene oval solitaire in 18k rose gold', 'The Solene ring worn, photographed in soft window light'],
    description: '<p>An oval reads larger than its weight and elongates the finger, which is why it is the shape we are asked for most. Six claws, north–south, with a hidden bridge that stops the stone rocking.</p>'
  }),
  makeProduct({
    id: 7004, title: 'Verrine Eternity Band', handle: 'verrine-eternity-band', type: 'Wedding band',
    price: 3150, tags: ['Wedding', 'New'], carat: '0.90ct total',
    options: [
      { name: 'Metal', values: METALS },
      { name: 'Size', values: SIZES }
    ],
    priceRules: { 'Platinum': 380 },
    images: ['cavelier-product-eternity.jpg', 'cavelier-product-eternity-alt.jpg'],
    imageAlts: ['The Verrine half-eternity band in platinum', 'The Verrine band stacked with a plain wedding band'],
    description: '<p>Half eternity, castle set, 2.2mm wide. Half rather than full so it can be resized later — a full eternity cannot, and fingers change.</p>'
  }),
  makeProduct({
    id: 7005, title: 'Ombra Sculpted Band', handle: 'ombra-sculpted-band', type: 'Ring',
    price: 980, tags: ['Rings'],
    options: [
      { name: 'Metal', values: METALS },
      { name: 'Size', values: SIZES }
    ],
    priceRules: { 'Platinum': 220 },
    images: ['cavelier-product-sculptural.jpg', 'cavelier-product-sculptural-alt.jpg'],
    imageAlts: ['The Ombra sculpted band in 18k yellow gold', 'The Ombra band worn on a hand'],
    description: '<p>Carved rather than cast round: the band swells to 4mm at the top and drops to 2mm underneath, so it sits heavy without feeling bulky between the fingers.</p>'
  }),
  makeProduct({
    id: 7006, title: 'Lumen Diamond Studs', handle: 'lumen-diamond-studs', type: 'Earrings',
    price: 2240, tags: ['Fine jewellery'], carat: '0.50ct total',
    options: [
      { name: 'Metal', values: ['18k Yellow Gold', '18k White Gold', 'Platinum'] },
      { name: 'Stone', values: ['Natural 0.50ct total', 'Natural 1.00ct total', 'Lab-grown 1.00ct total'] }
    ],
    priceRules: { 'Platinum': 260, 'Natural 1.00ct total': 1980, 'Lab-grown 1.00ct total': 420 },
    images: ['cavelier-product-studs.jpg', 'cavelier-product-studs-alt.jpg'],
    imageAlts: ['The Lumen diamond studs in 18k yellow gold on bone paper', 'The Lumen studs worn, cropped at the ear'],
    description: '<p>Martini settings, three claws, screw backs. Low enough to sleep in, which people do regardless of what we advise.</p>'
  }),
  makeProduct({
    id: 7007, title: 'Rivière Tennis Bracelet', handle: 'riviere-tennis-bracelet', type: 'Bracelet',
    price: 7400, tags: ['Fine jewellery', 'New'], carat: '3.20ct total',
    options: [
      { name: 'Metal', values: ['18k White Gold', '18k Yellow Gold', 'Platinum'] },
      { name: 'Length', values: ['16.5cm', '17.5cm', '18.5cm'] }
    ],
    priceRules: { 'Platinum': 900, '18.5cm': 480 },
    images: ['cavelier-product-tennis.jpg', 'cavelier-product-tennis-alt.jpg'],
    imageAlts: ['The Rivière tennis bracelet in 18k white gold, coiled on bone paper', 'The Rivière bracelet worn at the wrist'],
    description: '<p>Sixty-four stones, matched for colour across the whole line, which is the part that takes the time. Double-catch clasp with a hidden safety.</p>'
  }),
  makeProduct({
    id: 7008, title: 'Filament Chain Necklace', handle: 'filament-chain-necklace', type: 'Necklace',
    price: 1120, tags: ['Fine jewellery'],
    options: [
      { name: 'Metal', values: ['18k Yellow Gold', '18k White Gold', '18k Rose Gold'] },
      { name: 'Length', values: ['40cm', '45cm', '50cm'] }
    ],
    priceRules: { '50cm': 180 },
    images: ['cavelier-product-necklace.jpg', 'cavelier-product-necklace-alt.jpg'],
    imageAlts: ['The Filament chain necklace pooled on ivory paper', 'The Filament necklace worn at the collarbone'],
    description: '<p>A 1.1mm cable chain, drawn and soldered by hand. Fine enough to wear under a shirt and layered with two others without tangling.</p>'
  })
];

const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

function makeCollection(cfg) {
  const items = cfg.handles.map((h) => byHandle[h]);
  return {
    id: cfg.id,
    title: cfg.title,
    handle: cfg.handle,
    url: `/collections/${cfg.handle}`,
    description: cfg.description,
    products: items,
    products_count: items.length,
    all_products_count: items.length,
    featured_image: cfg.image ? { src: cfg.image, alt: cfg.title, aspect_ratio: 0.8 } : null,
    sort_by: 'manual',
    default_sort_by: 'manual',
    sort_options: [
      { name: 'Featured', value: 'manual' },
      { name: 'Price, low to high', value: 'price-ascending' },
      { name: 'Price, high to low', value: 'price-descending' },
      { name: 'Newest', value: 'created-descending' }
    ],
    filters: cfg.filters ?? defaultFilters(items)
  };
}

function defaultFilters(items) {
  const metals = new Set();
  const types = new Set();
  items.forEach((p) => {
    p.options_with_values.forEach((o) => {
      if (o.name === 'Metal') o.values.forEach((v) => metals.add(v));
    });
    if (p.type) types.add(p.type);
  });
  const listFilter = (label, param, values) => ({
    type: 'list',
    label,
    param_name: param,
    active_values: [],
    values: [...values].map((v) => ({
      label: v,
      value: v,
      param_name: param,
      active: false,
      count: 1 + (v.length % 3),
      url_to_remove: '#'
    }))
  });
  return [
    listFilter('Metal', 'filter.p.m.custom.metal', metals),
    listFilter('Piece', 'filter.p.product_type', types),
    listFilter('Stone', 'filter.p.m.custom.stone', ['Natural diamond', 'Lab-grown diamond']),
    {
      type: 'price_range',
      label: 'Price',
      active_values: [],
      values: [],
      min_value: { param_name: 'filter.v.price.gte', value: null },
      max_value: { param_name: 'filter.v.price.lte', value: null },
      range_max: 1200000
    }
  ];
}

export const collections = [
  makeCollection({
    id: 501, title: 'Engagement', handle: 'engagement',
    description: '<p>Solitaires, three-stone and low-set designs. Every ring here is cut for the hand that will wear it — tell us the finger size when you order, or ask for a sizing set and take your time.</p>',
    handles: ['aveline-solitaire', 'marlowe-emerald-cut', 'solene-oval', 'verrine-eternity-band', 'ombra-sculpted-band', 'lumen-diamond-studs'],
    image: 'cavelier-collection-engagement.jpg'
  }),
  makeCollection({
    id: 502, title: 'Wedding bands', handle: 'wedding',
    description: '<p>Plain, milled and set. Made in pairs and matched by hand, because two bands cast separately never quite agree.</p>',
    handles: ['verrine-eternity-band', 'ombra-sculpted-band', 'aveline-solitaire'],
    image: 'cavelier-collection-wedding.jpg'
  }),
  makeCollection({
    id: 503, title: 'Fine jewellery', handle: 'fine-jewellery',
    description: '<p>Earrings, necklaces and bracelets in 18k gold — the pieces that are worn every day rather than kept for occasions.</p>',
    handles: ['lumen-diamond-studs', 'riviere-tennis-bracelet', 'filament-chain-necklace'],
    image: 'cavelier-collection-fine.jpg'
  }),
  makeCollection({
    id: 504, title: 'Diamonds', handle: 'diamonds',
    description: '<p>Natural and lab-grown, sourced to your brief and shown loose before they are set.</p>',
    handles: ['aveline-solitaire', 'marlowe-emerald-cut', 'solene-oval', 'riviere-tennis-bracelet'],
    image: 'cavelier-collection-diamonds.jpg'
  }),
  makeCollection({
    id: 505, title: 'Rings', handle: 'rings',
    description: '<p>Sculptural gold, worn every day.</p>',
    handles: ['ombra-sculpted-band', 'aveline-solitaire', 'solene-oval', 'verrine-eternity-band'],
    image: 'cavelier-collection-rings.jpg'
  }),
  makeCollection({
    id: 506, title: 'Earrings', handle: 'earrings', description: '<p>Studs and drops in 18k gold.</p>',
    handles: ['lumen-diamond-studs'], image: 'cavelier-product-studs.jpg'
  }),
  makeCollection({
    id: 507, title: 'Necklaces', handle: 'necklaces', description: '<p>Chains drawn and soldered by hand.</p>',
    handles: ['filament-chain-necklace'], image: 'cavelier-product-necklace.jpg'
  }),
  makeCollection({
    id: 508, title: 'All pieces', handle: 'all',
    description: '<p>Everything currently in the book.</p>',
    handles: products.map((p) => p.handle), image: 'cavelier-collection-fine.jpg'
  })
];

products.forEach((p) => {
  p.collections = collections.filter((c) => c.products.includes(p));
});

export const articles = [
  {
    id: 8001, title: 'How to choose an engagement ring', handle: 'how-to-choose-an-engagement-ring',
    url: '/blogs/journal/how-to-choose-an-engagement-ring',
    author: 'Margot Cavelier', published_at: '2026-04-18', tags: ['Guide'],
    image: { src: 'cavelier-journal-1.jpg', alt: 'A hand-drawn ring sketch beside a loose diamond', aspect_ratio: 1.5 },
    excerpt: 'Start with the hand, not the carat. A practical order of operations for the least practical purchase of your life.',
    content: `<p>Almost everyone starts in the wrong place. They start with the stone — a number, a shape, a budget — and work outward. It is the natural thing to do, because the stone is the part that has a price attached, and it is also the reason so many rings end up technically impressive and slightly wrong.</p>
<h2>Start with the hand</h2>
<p>Look at the hand that will wear it. Long fingers carry a round or a cushion beautifully and can take height. Shorter fingers are flattered by anything elongated — oval, marquise, emerald — set north to south. Someone who works with their hands wants a low setting and a strong shank, and will thank you for it every day for forty years.</p>
<p>None of this is aesthetics. It is engineering. A ring that catches on gloves comes off, and a ring that is off is a ring that gets lost.</p>
<h2>Then decide what the budget is really for</h2>
<p>A budget buys three things: carat, quality and craft. You cannot maximise all three, and the honest question is which one the wearer would notice. Most people cannot tell VS1 from VS2 across a table. Almost everyone can tell a well-cut stone from a badly cut one, because cut is what makes a diamond move.</p>
<p>If we had to spend a fixed sum, we would take cut first, colour second, clarity third, and carat last. That is not a house line — it is what we would do with our own money.</p>
<h2>Natural or lab-grown</h2>
<p>A lab-grown diamond is a diamond. It has the same hardness, the same refractive index, the same everything, and it costs somewhere between a fifth and a third of the price. It also has no meaningful resale value, and it never will, because supply is unlimited.</p>
<p>If the ring is going to be worn and never sold, that is an argument for lab-grown. If it is going to be inherited, or if the idea of geological time is part of the point for you, that is an argument for natural. Both answers are reasonable. Be suspicious of anyone who tells you otherwise.</p>
<h2>Get the size right, quietly</h2>
<p>Borrow a ring she already wears on that finger and have it measured. Failing that, ask her sister. Failing that, guess large — a ring can be taken in more easily than let out, and our first resize is free anyway.</p>
<h2>Give yourself eight weeks</h2>
<p>Anything made properly takes six to nine weeks. If you are working to a date, start three months out. The people who end up disappointed are almost always the ones who started in week two.</p>`
  },
  {
    id: 8002, title: 'Understanding diamond cuts', handle: 'understanding-diamond-cuts',
    url: '/blogs/journal/understanding-diamond-cuts',
    author: 'Margot Cavelier', published_at: '2026-03-02', tags: ['Stones'],
    image: { src: 'cavelier-journal-2.jpg', alt: 'Loose diamonds of several cuts on a bone-grey surface', aspect_ratio: 1.5 },
    excerpt: 'Why an emerald cut forgives less than a brilliant, and what that means for your budget.',
    content: `<p>There are two families of cut, and everything else is a variation. Brilliant cuts are made of triangular and kite-shaped facets arranged to bounce light back at you. Step cuts are made of long parallel facets arranged like a staircase, and they do something quite different: they show you into the stone rather than throwing light out of it.</p>
<h2>Brilliant cuts hide things</h2>
<p>The round brilliant, the oval, the pear, the cushion. All that facet activity is visually noisy, and noise hides inclusions. You can set a Si1 round brilliant and most people will never see a thing.</p>
<h2>Step cuts show everything</h2>
<p>Emerald and Asscher cuts have big open tables. There is nowhere for an inclusion to hide, and a stone one grade too low looks tired rather than clear. This is why we will not set an emerald cut below VS2 — not because of purity, but because you would see it.</p>
<p>The trade-off is that step cuts cost less per carat for the same apparent size, and they are the most architectural shapes in jewellery. If you want the look, budget for the clarity and take a smaller stone.</p>
<h2>Cut grade is not shape</h2>
<p>Confusingly, "cut" also means the quality of the cutting — proportions, symmetry, polish — and this is graded only for round brilliants. For fancy shapes there is no cut grade at all, which means you are relying on your jeweller's eye. Ask to see the stone next to two others. If nobody will show you comparisons, go elsewhere.</p>`
  },
  {
    id: 8003, title: '14k or 18k gold', handle: '14k-vs-18k-gold',
    url: '/blogs/journal/14k-vs-18k-gold',
    author: 'Margot Cavelier', published_at: '2026-01-21', tags: ['Metal'],
    image: { src: 'cavelier-journal-3.jpg', alt: 'Coils of raw gold wire on bone plaster', aspect_ratio: 1.5 },
    excerpt: 'One is harder. One is warmer. Neither is better — it depends on the wearer.',
    content: `<p>18k gold is 75% pure. 14k is 58.5%. That difference decides colour, hardness and price, and very little else.</p>
<h2>Colour</h2>
<p>18k yellow gold is noticeably warmer, because there is more gold in it. Next to each other the difference is obvious; apart, most people would not notice. In white gold the gap closes further, since both are rhodium plated.</p>
<h2>Hardness</h2>
<p>14k is harder and resists scratching better. This matters for a plain band worn daily by someone who lifts things. It matters less for a solitaire, where the stone takes the abuse.</p>
<h2>What we recommend</h2>
<p>18k for anything with a stone in it, and for pieces where the colour is the point. 14k for hard-worn plain bands and for anyone with a nickel sensitivity, since a lower gold content allows a friendlier alloy. If you are pairing a band with an existing ring, match the karat — mismatched golds wear against each other and the softer one loses.</p>`
  },
  {
    id: 8004, title: 'The bespoke process, in detail', handle: 'the-bespoke-process',
    url: '/blogs/journal/the-bespoke-process',
    author: 'Margot Cavelier', published_at: '2025-11-09', tags: ['Atelier'],
    image: { src: 'cavelier-bespoke-hero.jpg', alt: 'A graphite ring sketch beside a carved wax model', aspect_ratio: 1.5 },
    excerpt: 'What actually happens between the first conversation and the hallmark.',
    content: `<p>People imagine bespoke means expensive. In this house it means ordinary — almost everything we make is made once, for one person, and it costs the same as a stock design of the same specification.</p>
<h2>Week one: the conversation</h2>
<p>An hour, and mostly about the wearer rather than the ring. What do they do with their hands. What jewellery do they already own and never take off. What do they own and never wear, which is usually more revealing.</p>
<h2>Weeks one to two: drawing</h2>
<p>By hand first, because a pencil drawing is quicker to argue with than a render. Then a scaled rendering from four angles, so you can see the gallery and the profile — the parts a photograph never shows.</p>
<h2>Weeks two to three: the stone</h2>
<p>We source to the brief and show three or four candidates loose, under the same light, with certificates. This is the stage that most often changes the plan, and that is fine.</p>
<h2>Weeks three to eight: the bench</h2>
<p>Carved in wax, cast, then set, filed, emeried and polished by hand. Hallmarked in London with the year it was made.</p>
<h2>Week eight or nine: delivery</h2>
<p>Collected in the atelier, or sent insured and signed-for. Either way we photograph it first, because we like to keep a record and clients like to have one.</p>`
  },
  {
    id: 8005, title: 'A jewellery care guide', handle: 'jewellery-care-guide',
    url: '/blogs/journal/jewellery-care-guide',
    author: 'Margot Cavelier', published_at: '2025-09-14', tags: ['Care'],
    image: { src: 'cavelier-journal-4.jpg', alt: 'A soft brush and a ring on a bone-coloured cloth', aspect_ratio: 1.5 },
    excerpt: 'Four habits that will keep a ring looking new, and three that will quietly ruin it.',
    content: `<p>Fine jewellery is more robust than people fear and more vulnerable than people assume. The damage we see is almost never dramatic — it is a claw worn thin over five years, or a shank gone oval from being pulled off by the stone.</p>
<h2>Do</h2>
<p>Clean it weekly in warm water with a drop of unscented washing-up liquid and a soft toothbrush. Rinse, and dry on a cloth rather than a towel — loops catch on claws. Take it off before the gym, the pool and the garden. Put it in the same place every time; most lost rings are not lost, they are somewhere in the house.</p>
<h2>Do not</h2>
<p>Do not use ultrasonic cleaners on emeralds, opals or anything with a fracture-filled stone. Do not sleep in a ring with a raised setting, whatever we said earlier about people doing it anyway. Do not pull a ring off by gripping the stone — take it by the band, or you will loosen the setting a fraction at a time.</p>
<h2>Once a year</h2>
<p>Bring it to us, or to any competent bench, and have the claws checked under a loupe. It takes five minutes and it is the difference between a tightened claw and a lost diamond.</p>`
  }
];

export const blogs = {
  journal: {
    id: 9001,
    title: 'Journal',
    handle: 'journal',
    url: '/blogs/journal',
    articles,
    articles_count: articles.length,
    all_tags: ['Guide', 'Stones', 'Metal', 'Atelier', 'Care']
  }
};

articles.forEach((a) => { a.blog = blogs.journal; a.excerpt_or_content = a.excerpt; a.content_html = a.content; });

export const pages = {
  about: { id: 6001, title: 'Our story', handle: 'about', url: '/pages/about', content: '' },
  bespoke: { id: 6002, title: 'Bespoke', handle: 'bespoke', url: '/pages/bespoke', content: '' },
  contact: { id: 6003, title: 'Contact', handle: 'contact', url: '/pages/contact', content: '' },
  'size-guide': {
    id: 6004, title: 'Ring size guide', handle: 'size-guide', url: '/pages/size-guide',
    content: `<p>Getting the size right at a distance is easier than it sounds, and we would rather you took a week over it than guessed.</p>
<h2>The reliable method</h2>
<p>Borrow a ring she already wears on the correct finger and post it to us. We measure it on a mandrel and post it back, insured, within two days.</p>
<h2>The next best</h2>
<p>Ask us for a sizing set — seven sterling silver bands, sent free anywhere in the UK, yours to keep. Try them at the end of the day when fingers are at their largest, and in a warm room.</p>
<h2>If you must guess</h2>
<p>The UK average is L for women and T for men. Guess one size large: taking a ring in is straightforward, letting it out is not, and your first resize is complimentary within the first year.</p>
<h2>Bands that cannot be resized</h2>
<p>Full eternity rings cannot be sized, which is why we make half eternities unless you insist. Rings with channel-set stones running past the halfway point are also limited. We will always tell you before you order.</p>`
  },
  'shipping-returns': {
    id: 6005, title: 'Shipping and returns', handle: 'shipping-returns', url: '/pages/shipping-returns',
    content: `<h2>Delivery</h2><p>Complimentary insured, signed-for delivery worldwide. UK orders travel by Royal Mail Special Delivery; international orders by FedEx Priority, fully insured to the value of the piece. You will have a tracking number the day it leaves the atelier.</p>
<h2>Lead times</h2><p>Everything is made to order. Allow six to nine weeks from confirmation to dispatch. If you are working to a date, tell us at the enquiry stage and we will tell you honestly whether it is possible.</p>
<h2>Duties</h2><p>Deliveries outside the UK may attract import duty and local taxes, which are the responsibility of the recipient. We declare the full value; we will not under-declare.</p>
<h2>Returns</h2><p>Fourteen days from delivery to return an unworn stock design in its original packaging for a full refund. Bespoke commissions, engraved pieces and rings resized to a non-standard size are not returnable — we say so before you pay a deposit, not after.</p>
<h2>Resizing</h2><p>The first resize within twelve months is complimentary, including return postage. After that it is charged at cost.</p>`
  },
  'jewellery-care': {
    id: 6006, title: 'Jewellery care', handle: 'jewellery-care', url: '/pages/jewellery-care',
    content: `<h2>Every week</h2><p>Warm water, a drop of unscented washing-up liquid, a soft toothbrush. Rinse and dry on a lint-free cloth.</p>
<h2>Every day</h2><p>Remove before sport, swimming, gardening and sleep. Put it in the same place each time.</p>
<h2>Every year</h2><p>Bring it in — or take it to any competent bench — and have the claws checked under a loupe. Five minutes now saves a stone later.</p>
<h2>Never</h2><p>Ultrasonic cleaners on emeralds, opals or fracture-filled stones. Bleach or chlorine on any gold alloy. Pulling a ring off by the stone.</p>
<h2>What we do, free, forever</h2><p>Cleaning, re-polishing and re-setting for as long as you wear the piece. Post it to us or bring it in.</p>`
  },
  privacy: {
    id: 6007, title: 'Privacy', handle: 'privacy', url: '/pages/privacy',
    content: `<p>This is a concept project and collects nothing. In a live version of this store the policy below would apply.</p><h2>What we would collect</h2><p>The details you give us in an enquiry or an order: name, email, telephone, delivery address, and what you told us about the piece.</p><h2>What we would do with it</h2><p>Answer your enquiry, make and deliver your piece, and keep a record of the commission so we can service it later. Nothing else.</p><h2>What we would not do</h2><p>Sell it, rent it, or pass it to anyone except the carrier and the payment processor.</p><h2>Your rights</h2><p>Ask us what we hold, ask us to correct it, ask us to delete it. We would answer within thirty days.</p>`
  },
  terms: {
    id: 6008, title: 'Terms', handle: 'terms', url: '/pages/terms',
    content: `<p>This is a concept project. Nothing on this site is offered for sale and no contract can be formed. The terms below are illustrative.</p><h2>Orders</h2><p>An order is confirmed when we accept it and take a deposit, normally 50%. The balance is due before dispatch.</p><h2>Prices</h2><p>Prices are shown in pounds sterling and reflect the specification listed. A different stone or metal changes the price; we quote a fixed figure after the design stage and it does not move.</p><h2>Bespoke</h2><p>Commissions are not returnable. You approve the drawing, the stone and, where relevant, the wax before we proceed.</p><h2>Guarantee</h2><p>Manufacturing faults are corrected free for life. Accidental damage and ordinary wear are charged at cost.</p>`
  }
};

export const linklists = {
  'main-menu': {
    title: 'Main menu',
    handle: 'main-menu',
    links: [
      {
        title: 'Shop', url: '/collections', active: false,
        links: [
          { title: 'All pieces', url: '/collections/all', links: [] },
          { title: 'Engagement', url: '/collections/engagement', links: [] },
          { title: 'Wedding bands', url: '/collections/wedding', links: [] },
          { title: 'Fine jewellery', url: '/collections/fine-jewellery', links: [] },
          { title: 'Rings', url: '/collections/rings', links: [] },
          { title: 'Earrings', url: '/collections/earrings', links: [] },
          { title: 'Necklaces', url: '/collections/necklaces', links: [] },
          { title: 'Diamonds', url: '/collections/diamonds', links: [] }
        ]
      },
      { title: 'Engagement', url: '/collections/engagement', active: false, links: [] },
      { title: 'Wedding', url: '/collections/wedding', active: false, links: [] },
      { title: 'Bespoke', url: '/pages/bespoke', active: false, links: [] },
      { title: 'Our story', url: '/pages/about', active: false, links: [] },
      { title: 'Journal', url: '/blogs/journal', active: false, links: [] },
      { title: 'Contact', url: '/pages/contact', active: false, links: [] }
    ]
  },
  footer: {
    title: 'Footer',
    handle: 'footer',
    links: [
      { title: 'Shipping & returns', url: '/pages/shipping-returns', links: [] },
      { title: 'Jewellery care', url: '/pages/jewellery-care', links: [] },
      { title: 'Ring size guide', url: '/pages/size-guide', links: [] },
      { title: 'Contact', url: '/pages/contact', links: [] },
      { title: 'Bespoke', url: '/pages/bespoke', links: [] },
      { title: 'Our story', url: '/pages/about', links: [] },
      { title: 'Journal', url: '/blogs/journal', links: [] },
      { title: 'Privacy', url: '/pages/privacy', links: [] },
      { title: 'Terms', url: '/pages/terms', links: [] }
    ]
  }
};

export const cart = {
  item_count: 2,
  total_price: 762000,
  currency: { iso_code: 'GBP' },
  note: '',
  items: [
    {
      key: '40000001:aaa',
      quantity: 1,
      url: '/products/aveline-solitaire',
      title: 'Aveline Solitaire — 18k Yellow Gold / Natural 1.00ct / L',
      final_line_price: 345000,
      image: { src: 'cavelier-product-solitaire.jpg', alt: '' },
      variant: { title: '18k Yellow Gold / Natural 1.00ct / L' },
      product: { title: 'Aveline Solitaire', has_only_default_variant: false },
      selling_plan_allocation: null
    },
    {
      key: '40000002:bbb',
      quantity: 1,
      url: '/products/verrine-eternity-band',
      title: 'Verrine Eternity Band — Platinum / L',
      final_line_price: 417000,
      image: { src: 'cavelier-product-eternity.jpg', alt: '' },
      variant: { title: 'Platinum / L' },
      product: { title: 'Verrine Eternity Band', has_only_default_variant: false },
      selling_plan_allocation: null
    }
  ]
};

export { money };
