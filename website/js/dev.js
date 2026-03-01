  /* ── Integration-path tabs ─────────────────────────── */
  (function () {
    var tabs   = document.querySelectorAll('.dev-tab');
    var panels = document.querySelectorAll('.dev-tab-panel');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('aria-controls');

        tabs.forEach(function (t) {
          t.classList.remove('dev-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('dev-tab--active');
        tab.setAttribute('aria-selected', 'true');

        panels.forEach(function (p) {
          if (p.id === target) {
            p.classList.add('dev-tab-panel--active');
            p.removeAttribute('hidden');
          } else {
            p.classList.remove('dev-tab-panel--active');
            p.setAttribute('hidden', '');
          }
        });
      });
    });
  }());

  /* ── Language toggle (JS / Python) ─────────────────── */
  (function () {
    var btns   = document.querySelectorAll('.dev-lang-btn');
    var panels = document.querySelectorAll('.dev-lang-panel');
    if (!btns.length) return;

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang');

        btns.forEach(function (b) {
          b.classList.toggle('dev-lang-btn--active', b.getAttribute('data-lang') === lang);
        });
        panels.forEach(function (p) {
          if (p.id === 'lang-' + lang) {
            p.classList.add('dev-lang-panel--active');
            p.removeAttribute('hidden');
          } else {
            p.classList.remove('dev-lang-panel--active');
            p.setAttribute('hidden', '');
          }
        });
      });
    });
  }());

  /* ── Accordion auto-open on hash nav ──────────────── */
  (function () {
    function openAccordionForHash() {
      var hash = window.location.hash;
      if (!hash) return;
      var target = document.querySelector(hash);
      if (!target) return;
      var details = target.querySelector('.dev-accordion') || target.closest('.dev-accordion');
      if (details && !details.open) details.open = true;
    }
    openAccordionForHash();
    window.addEventListener('hashchange', openAccordionForHash);
  }());

  /* ── Copy buttons ──────────────────────────────────── */
  (function () {
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      // Fallback for older browsers / non-HTTPS
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve();
    }

    document.querySelectorAll('.dev-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.dev-code-block');
        var text  = block ? block.getAttribute('data-copy') : '';
        if (!text) {
          var pre = block ? block.querySelector('pre') : null;
          text = pre ? pre.textContent : '';
        }
        copyText(text).then(function () {
          var label = btn.querySelector('.dev-copy-label');
          if (label) {
            label.textContent = 'Copied';
            setTimeout(function () { label.textContent = 'Copy'; }, 1500);
          }
        });
      });
    });
  }());
