/* CAVELIER — theme behaviour. Vanilla, no dependencies. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (cents) {
    var f = window.Cavelier && window.Cavelier.moneyFormat;
    var v = (cents / 100).toFixed(2).replace(/\.00$/, '');
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return f ? f.replace(/\{\{\s*amount[^}]*\}\}/, v) : v;
  };

  /* ---------- Sticky header shadow ------------------------------------ */
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Scroll reveal -------------------------------------------- */
  (function () {
    var items = $$('.reveal');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Drawers --------------------------------------------------- */
  var openDrawer = null;
  var lastFocus = null;

  function trap(e) {
    if (!openDrawer || e.key !== 'Tab') return;
    var f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', openDrawer)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function drawerOpen(id) {
    var d = document.getElementById(id);
    if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('no-scroll');
    openDrawer = d;
    var target = $('[data-autofocus]', d) || $('[data-drawer-close]', d);
    if (target) setTimeout(function () { target.focus(); }, 60);
  }

  function drawerClose() {
    if (!openDrawer) return;
    openDrawer.classList.remove('is-open');
    openDrawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('no-scroll');
    openDrawer = null;
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-drawer-open]');
    if (opener) { e.preventDefault(); drawerOpen(opener.getAttribute('data-drawer-open')); return; }
    if (e.target.closest('[data-drawer-close]') || e.target.hasAttribute('data-drawer-scrim')) {
      e.preventDefault(); drawerClose();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') drawerClose();
    trap(e);
  });

  /* ---------- Mobile menu accordions ------------------------------------ */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.menu__toggle');
    if (!t) return;
    var open = t.getAttribute('aria-expanded') === 'true';
    t.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  /* ---------- Announcement rotator --------------------------------------- */
  (function () {
    var bar = $('[data-announcement]');
    if (!bar) return;
    var items = $$('.announcement__item', bar);
    if (items.length < 2 || reduced) return;
    var i = 0;
    setInterval(function () {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, parseInt(bar.getAttribute('data-interval'), 10) || 6000);
  })();

  /* ---------- Quantity steppers ------------------------------------------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty]');
    if (!b) return;
    var input = $('input', b.parentElement);
    if (!input) return;
    var step = b.getAttribute('data-qty') === 'up' ? 1 : -1;
    var min = parseInt(input.min, 10) || 1;
    input.value = Math.max(min, (parseInt(input.value, 10) || min) + step);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* ---------- Gallery dots (mobile) ---------------------------------------- */
  $$('[data-gallery]').forEach(function (g) {
    var dots = $$('.gallery__dot', g.parentElement);
    if (!dots.length) return;
    g.addEventListener('scroll', function () {
      var i = Math.round(g.scrollLeft / (g.clientWidth * 0.84 + 8));
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === Math.min(i, dots.length - 1)); });
    }, { passive: true });
  });

  /* ---------- Sticky buy bar ------------------------------------------------ */
  (function () {
    var bar = $('[data-buybar]');
    var anchor = $('[data-buybar-anchor]');
    if (!bar || !anchor || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { rootMargin: '-120px 0px 0px 0px' }).observe(anchor);
  })();

  /* ---------- Variant selection --------------------------------------------- */
  $$('[data-product-form]').forEach(function (form) {
    var root = form.closest('[data-product]');
    if (!root) return;
    var dataEl = $('[data-variants]', root);
    if (!dataEl) return;

    var variants;
    try { variants = JSON.parse(dataEl.textContent); } catch (err) { return; }

    var idInput  = $('[data-variant-id]', form);
    var priceEl  = $('[data-price]', root);
    var barPrice = $('[data-buybar-price]');
    var submit   = $('[data-add]', form);
    var submitText = submit ? $('[data-add-text]', submit) : null;
    var skuEl    = $('[data-sku]', root);

    function selected() {
      return $$('[data-option-index]', form)
        .filter(function (el) { return el.type !== 'radio' || el.checked; })
        .sort(function (a, b) { return a.dataset.optionIndex - b.dataset.optionIndex; })
        .map(function (el) { return el.value; });
    }

    function match(opts) {
      return variants.filter(function (v) {
        return opts.every(function (o, i) { return v.options[i] === o; });
      })[0];
    }

    function render() {
      var opts = selected();
      var v = match(opts);

      // Reflect the chosen value next to each option name
      $$('[data-option-group]', form).forEach(function (g) {
        var out = $('[data-option-current]', g);
        var checked = $('input:checked', g);
        if (out && checked) out.textContent = checked.value;
      });

      // Grey out combinations that do not exist at all
      $$('[data-option-index]', form).forEach(function (el) {
        if (el.type !== 'radio') return;
        var trial = selected();
        trial[el.dataset.optionIndex] = el.value;
        var cand = match(trial);
        var wrap = el.closest('.swatch');
        if (wrap) wrap.classList.toggle('is-unavailable', !cand || !cand.available);
      });

      if (!v) {
        if (submit) { submit.disabled = true; }
        if (submitText) submitText.textContent = root.dataset.unavailableText || 'Unavailable';
        return;
      }

      if (idInput) idInput.value = v.id;
      if (priceEl) {
        priceEl.innerHTML = v.compare_at_price && v.compare_at_price > v.price
          ? '<del>' + money(v.compare_at_price) + '</del><ins>' + money(v.price) + '</ins>'
          : money(v.price);
      }
      if (barPrice) barPrice.textContent = money(v.price);
      if (skuEl) skuEl.textContent = v.sku || '';
      if (submit) submit.disabled = !v.available;
      if (submitText) {
        submitText.textContent = v.available
          ? (root.dataset.addText || 'Add to bag')
          : (root.dataset.soldText || 'Enquire');
      }

      if (window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url);
      }
    }

    form.addEventListener('change', render);
    render();
  });

  /* ---------- Cart ------------------------------------------------------------ */
  function refreshCartCount(count) {
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
  }

  function loadCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    if (!drawer) return Promise.resolve();
    return fetch(window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + '?section_id=cart-drawer' : '/?section_id=cart-drawer')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('[data-cart-contents]');
        var target = $('[data-cart-contents]', drawer);
        if (fresh && target) target.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-product-form]');
    if (!form || form.dataset.ajax === 'false') return;
    e.preventDefault();
    var submit = $('[data-add]', form);
    if (submit) submit.setAttribute('aria-disabled', 'true');
    fetch('/cart/add.js', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function () { return fetch('/cart.js').then(function (r) { return r.json(); }); })
      .then(function (cart) {
        refreshCartCount(cart.item_count);
        return loadCartDrawer();
      })
      .then(function () { drawerOpen('cart-drawer'); })
      .catch(function () { form.submit(); })
      .finally(function () { if (submit) submit.removeAttribute('aria-disabled'); });
  });

  document.addEventListener('click', function (e) {
    var rm = e.target.closest('[data-cart-remove]');
    if (!rm) return;
    e.preventDefault();
    changeLine(rm.getAttribute('data-cart-remove'), 0);
  });

  document.addEventListener('change', function (e) {
    var q = e.target.closest('[data-cart-qty]');
    if (!q) return;
    changeLine(q.getAttribute('data-cart-qty'), parseInt(q.value, 10) || 0);
  });

  function changeLine(key, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        refreshCartCount(cart.item_count);
        if (document.body.classList.contains('template-cart')) { window.location.reload(); return; }
        return loadCartDrawer();
      })
      .catch(function () { window.location.reload(); });
  }

  /* ---------- Collection: submit filters on change ----------------------------- */
  $$('[data-facet-form]').forEach(function (form) {
    if (form.dataset.auto === 'false') return;
    form.addEventListener('change', function () { form.submit(); });
  });

  /* ---------- Bespoke enquiry: reflect budget/date into readable labels --------- */
  $$('[data-mirror]').forEach(function (el) {
    var out = document.getElementById(el.getAttribute('data-mirror'));
    if (!out) return;
    var sync = function () { out.textContent = el.value; };
    el.addEventListener('input', sync);
    sync();
  });
})();
