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
  function initScrollTracking() {
    var thresholds = [25, 50, 75];
    var fired = new Set();
    var ticking = false;

    function check() {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop + window.innerHeight;
      var total = doc.scrollHeight;
      if (total <= 0) { ticking = false; return; }
      var percent = Math.min(100, Math.floor((scrolled / total) * 100));
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (percent >= t && !fired.has(t)) {
          fired.add(t);
          if (window.gtag) window.gtag('event', 'scroll_depth', { percent: t });
        }
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(check);
        ticking = true;
      }
    }, { passive: true });

    // also check once on load — short pages may already exceed 25%
    requestAnimationFrame(check);
  }
  // initDwellTracking — Task 6
  // initSectionTracking — Task 7

  // ── boot (wired in Task 8) ──────────────────────────────────────────────
})();
