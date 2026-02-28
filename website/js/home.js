// Live member count from UAW API
(function () {
  const el = document.querySelector('[data-live-stat="members"]');
  if (!el) return;

  fetch('https://uaw-api.unitedagentic.workers.dev/stats')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && typeof data.members === 'number') {
        el.textContent = data.members.toLocaleString();
      }
    })
    .catch(function () {
      // Silently fail — leave the ellipsis
    });
})();
