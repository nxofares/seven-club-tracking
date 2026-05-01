(function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────────────
  function deriveSectionLabel(el) {
    var explicit = el.getAttribute('data-track-section');
    if (explicit) return explicit;
    if (el.id) return el.id;
    var meaningful = null;
    for (var i = 0; i < el.classList.length; i++) {
      var c = el.classList[i];
      if (!/^(w-|section$)/.test(c)) { meaningful = c; break; }
    }
    if (meaningful) return meaningful;
    var heading = el.querySelector('h1, h2');
    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim().slice(0, 50);
    }
    return 'unnamed';
  }

  // ── trackers (added in next tasks) ──────────────────────────────────────
  // initScrollTracking — Task 5
  // initDwellTracking — Task 6
  // initSectionTracking — Task 7

  // ── boot (wired in Task 8) ──────────────────────────────────────────────
})();
