(function () {
  'use strict';

  var root = document.documentElement;
  var LANG_KEY = 'ahmad.lang';
  var THEME_KEY = 'ahmad.theme';

  /* ---------- theme ---------- */

  var themeBtn = document.getElementById('theme-toggle');
  var themeLabel = themeBtn.querySelector('span');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var dark = theme === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeLabel.setAttribute('data-ar', dark ? 'فاتح' : 'داكن');
    themeLabel.setAttribute('data-en', dark ? 'Light' : 'Dark');
    applyLang(currentLang, false);
  }

  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  /* ---------- language ---------- */

  var currentLang = 'ar';

  /* falls back to the arabic artwork if the localised file is missing */
  function swapSource(img, lang) {
    var wanted = img.getAttribute(lang === 'ar' ? 'data-src-ar' : 'data-src-en');
    var fallback = img.getAttribute('data-src-ar');
    if (!wanted || img.getAttribute('src') === wanted) return;

    img.onerror = function () {
      img.onerror = null;
      if (img.getAttribute('src') !== fallback) img.setAttribute('src', fallback);
    };
    img.setAttribute('src', wanted);
  }

  function applyLang(lang, persist) {
    currentLang = lang;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    var nodes = document.querySelectorAll('[data-ar][data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var value = node.getAttribute(lang === 'ar' ? 'data-ar' : 'data-en');
      if (node.tagName === 'META') {
        node.setAttribute('content', value);
      } else if (node.tagName === 'IMG') {
        node.setAttribute('alt', value);
      } else {
        node.textContent = value;
      }
    }

    var sources = document.querySelectorAll('[data-src-ar][data-src-en]');
    for (var s = 0; s < sources.length; s++) swapSource(sources[s], lang);

    var langBtn = document.getElementById('lang-toggle');
    langBtn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');

    if (persist) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    }
  }

  /* ---------- boot ---------- */

  var savedTheme = storedTheme();
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(savedTheme || (prefersDark.matches ? 'dark' : 'light'));

  var savedLang = null;
  try { savedLang = localStorage.getItem(LANG_KEY); } catch (e) {}
  applyLang(savedLang || 'ar', false);

  prefersDark.addEventListener('change', function (e) {
    if (!storedTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });

  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  document.getElementById('lang-toggle').addEventListener('click', function () {
    applyLang(currentLang === 'ar' ? 'en' : 'ar', true);
  });

  /* ---------- email, assembled at runtime so scrapers do not read it from the HTML ---------- */

  var user = ['abutair', '606'].join('');
  var host = ['gmail', 'com'].join('.');
  var address = user + String.fromCharCode(64) + host;

  var mailBtn = document.getElementById('mail-btn');
  var mailLine = document.getElementById('mail-line');

  mailBtn.addEventListener('click', function () {
    var link = document.createElement('a');
    link.href = 'mailto:' + address;
    link.textContent = address;
    mailLine.textContent = '';
    mailLine.appendChild(link);
    mailLine.hidden = false;
    window.location.href = 'mailto:' + address;
  });

  /* ---------- seamless marquee: duplicate the track once ---------- */

  var marquee = document.querySelector('[data-marquee] .marquee__track');
  if (marquee) {
    var clone = marquee.cloneNode(true);
    var items = clone.children;
    while (items.length) {
      var item = items[0];
      item.setAttribute('aria-hidden', 'true');
      marquee.appendChild(item);
    }
  }

  /* ---------- scroll reveal ---------- */

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    for (var j = 0; j < reveals.length; j++) {
      reveals[j].style.transitionDelay = (j % 3) * 70 + 'ms';
      observer.observe(reveals[j]);
    }
  } else {
    for (var k = 0; k < reveals.length; k++) reveals[k].classList.add('is-in');
  }
})();
