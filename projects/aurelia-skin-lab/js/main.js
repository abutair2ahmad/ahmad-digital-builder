/* ============================================================
   AURELIA SKIN LAB — interactions
   Progressive enhancement. Nothing here is required to read
   the page; every effect degrades to a static, usable layout.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Asset resilience ------------------------------
     Images/video reference local files in assets/. If those
     have not been fetched yet (see scripts/fetch-assets.sh),
     fall back to the original generated source so the site
     still renders correctly.
  --------------------------------------------------------- */
  function wireFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach(function (img) {
      img.addEventListener('error', function onErr() {
        img.removeEventListener('error', onErr);
        img.src = img.dataset.fallback;
      });
      // Cached-error case: complete but zero intrinsic size.
      if (img.complete && img.naturalWidth === 0) img.src = img.dataset.fallback;
    });

    document.querySelectorAll('video[data-poster-fallback]').forEach(function (v) {
      var probe = new Image();
      probe.onerror = function () { v.poster = v.dataset.posterFallback; };
      probe.src = v.poster;
    });
  }

  /* ---------- Hero video -----------------------------------
     The <video> carries a poster but no source. We attach the
     source only when motion is welcome, so reduced-motion
     users (and no-JS users) simply keep the static poster and
     never pay for the video download.
  --------------------------------------------------------- */
  function initHeroVideo() {
    var v = document.querySelector('[data-hero-video]');
    if (!v) return;

    function attach() {
      if (reduced.matches || v.dataset.loaded === '1') return;
      var src = v.dataset.src;
      if (!src) return;
      v.dataset.loaded = '1';
      v.src = src;
      v.addEventListener('error', function () {
        if (v.dataset.fallback && v.src !== v.dataset.fallback) v.src = v.dataset.fallback;
      });
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused — poster stands in */ });
    }

    function detach() {
      if (!reduced.matches) return;
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.dataset.loaded = '';
    }

    attach();
    var onChange = function () { reduced.matches ? detach() : attach(); };
    reduced.addEventListener ? reduced.addEventListener('change', onChange)
                             : reduced.addListener(onChange);

    // Don't burn cycles on an off-screen video.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!v.dataset.loaded) return;
          e.isIntersecting ? v.play().catch(function () {}) : v.pause();
        });
      }, { threshold: 0.05 }).observe(v);
    }
  }

  /* ---------- Header state ---------- */
  function initHeader() {
    var hdr = document.querySelector('[data-header]');
    if (!hdr) return;
    var t = 40, ticking = false;
    function update() {
      hdr.classList.toggle('is-stuck', window.scrollY > t);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Mobile drawer ---------- */
  function initDrawer() {
    var btn = document.querySelector('[data-burger]');
    var drawer = document.querySelector('[data-drawer]');
    if (!btn || !drawer) return;

    var links = drawer.querySelectorAll('.drawer__nav a');

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      links.forEach(function (a, i) {
        a.style.transitionDelay = open ? (90 + i * 55) + 'ms' : '0ms';
      });
      if (open) links[0] && links[0].focus({ preventScroll: true });
    }

    btn.addEventListener('click', function () {
      setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        setOpen(false); btn.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && btn.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;

    if (reduced.matches || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    nodes.forEach(function (n, i) {
      // Stagger siblings inside a shared group.
      var g = n.closest('[data-reveal-group]');
      if (g && !n.style.getPropertyValue('--d')) {
        var sibs = Array.prototype.slice.call(g.querySelectorAll('[data-reveal]'));
        n.style.setProperty('--d', (sibs.indexOf(n) * 110) + 'ms');
      }
      io.observe(n);
    });
  }

  /* ---------- Accordion ---------- */
  function initAccordion() {
    document.querySelectorAll('[data-acc]').forEach(function (acc) {
      var btns = acc.querySelectorAll('.acc__btn');
      btns.forEach(function (btn) {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;

        function set(open, animate) {
          btn.setAttribute('aria-expanded', String(open));
          panel.setAttribute('aria-hidden', String(!open));
          var h = panel.firstElementChild.offsetHeight;
          if (!animate || reduced.matches) {
            panel.style.transition = 'none';
            panel.style.height = open ? 'auto' : '0px';
            requestAnimationFrame(function () { panel.style.transition = ''; });
          } else {
            panel.style.height = open ? h + 'px' : '0px';
          }
        }

        panel.addEventListener('transitionend', function (e) {
          if (e.propertyName === 'height' && btn.getAttribute('aria-expanded') === 'true') {
            panel.style.height = 'auto';
          }
        });

        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') === 'true';
          if (!open) { // close siblings — one panel at a time
            btns.forEach(function (o) {
              if (o !== btn && o.getAttribute('aria-expanded') === 'true') o.click();
            });
          } else {
            panel.style.height = panel.firstElementChild.offsetHeight + 'px';
            void panel.offsetHeight;
          }
          set(!open, true);
        });

        set(btn.getAttribute('aria-expanded') === 'true', false);
      });
    });
  }

  /* ---------- Concept forms (no backend) ---------- */
  function initForms() {
    document.querySelectorAll('[data-concept-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        // The note may sit inside the form or just after it (footer layout).
        var note = form.querySelector('[data-form-note]')
          || (form.parentElement && form.parentElement.querySelector('[data-form-note]'));
        if (note) {
          note.textContent = 'Thank you — this is a portfolio concept, so nothing was sent.';
          note.style.color = 'var(--sage)';
        }
        form.reset();
      });
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  function init() {
    wireFallbacks();
    initHeroVideo();
    initHeader();
    initDrawer();
    initReveal();
    initAccordion();
    initForms();
    initYear();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
