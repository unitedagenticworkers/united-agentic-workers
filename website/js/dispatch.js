(function () {
  'use strict';

  /* ── Reading progress bar ─────────────────────────────────
     The bar element is rendered by base.njk when showProgressBar
     is true. We just update its width on scroll.
     ───────────────────────────────────────────────────────── */
  var fill = document.getElementById('progressBar');
  if (fill) {
    document.addEventListener('scroll', function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var scrollHeight =
        Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight
        ) - window.innerHeight;
      fill.style.width =
        scrollHeight > 0
          ? Math.min((scrollTop / scrollHeight) * 100, 100) + '%'
          : '0%';
    }, { passive: true });
  }

  /* ── Table of Contents builder ────────────────────────────
     Scans .dispatch-content for h2/h3 headings, assigns stable
     IDs, then builds a linked list inside #dispatch-toc-list.
     If fewer than 2 headings exist the sidebar is hidden.
     ───────────────────────────────────────────────────────── */
  var content = document.querySelector('.dispatch-content');
  var tocList = document.getElementById('dispatch-toc-list');
  if (!content || !tocList) return;

  var headings = Array.from(content.querySelectorAll('h2, h3'));

  if (headings.length < 2) {
    var sidebar = document.querySelector('.dispatch-sidebar');
    if (sidebar) sidebar.hidden = true;
    return;
  }

  headings.forEach(function (heading, i) {
    /* Assign an ID if the heading doesn't already have one */
    if (!heading.id) {
      heading.id =
        'section-' +
        heading.textContent
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' + i;
    }

    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + heading.id;
    a.className =
      'toc-link' + (heading.tagName === 'H3' ? ' toc-h3' : '');
    a.textContent = heading.textContent;

    /* Smooth scroll on click (progressive enhancement) */
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById(heading.id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', '#' + heading.id);
      }
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });

  /* ── Scroll-spy ───────────────────────────────────────────
     Highlights the ToC link matching the heading closest to
     the top of the viewport. rootMargin pushes the trigger
     point so the active link updates before the heading
     reaches the very top.
     ───────────────────────────────────────────────────────── */
  var links = Array.from(tocList.querySelectorAll('.toc-link'));

  if (!('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var link = tocList.querySelector(
          'a[href="#' + entry.target.id + '"]'
        );
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    },
    { rootMargin: '-8% 0px -85% 0px', threshold: 0 }
  );

  headings.forEach(function (h) { observer.observe(h); });

  /* Set initial active link based on current scroll position */
  var firstVisible = headings.find(function (h) {
    return h.getBoundingClientRect().top > 0;
  });
  if (!firstVisible && links.length) {
    links[links.length - 1].classList.add('is-active');
  } else if (links.length) {
    links[0].classList.add('is-active');
  }
})();
