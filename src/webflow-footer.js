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

  // POST a copy of every event to analytics.seven.expert/api/events
  // alongside the gtag() call. Fire-and-forget: failures (network, ad-block,
  // endpoint down) are swallowed silently — GA4 path is unaffected.
  function postEvent(eventName, params) {
    if (!navigator.sendBeacon) return;
    try {
      var sid = '';
      var match = document.cookie.match(/(?:^|; )session_id=([^;]+)/);
      if (match) sid = decodeURIComponent(match[1]);
      var payload = JSON.stringify({
        event: eventName,
        params: params,
        page: location.pathname,
        session_id: sid
      });
      navigator.sendBeacon(
        'https://analytics.seven.expert/api/events',
        new Blob([payload], { type: 'application/json' })
      );
    } catch (e) { /* never throw */ }
  }

  // ── trackers ─────────────────────────────────────────────────────────────
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
          var params = { percent: t };
          if (window.gtag) window.gtag('event', 'scroll_depth', params);
          postEvent('scroll_depth', params);
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

  function initDwellTracking() {
    var thresholds = [30, 60, 120];
    var fired = new Set();
    var totalSeconds = 0;
    var lastTick = (document.visibilityState === 'visible') ? Date.now() : null;

    function flush() {
      if (lastTick === null) return;
      var now = Date.now();
      totalSeconds += (now - lastTick) / 1000;
      lastTick = now;
      for (var i = 0; i < thresholds.length; i++) {
        var t = thresholds[i];
        if (totalSeconds >= t && !fired.has(t)) {
          fired.add(t);
          var params = { seconds: t };
          if (window.gtag) window.gtag('event', 'dwell_time', params);
          postEvent('dwell_time', params);
        }
      }
    }

    setInterval(flush, 1000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        lastTick = Date.now();
      } else {
        flush();
        lastTick = null;
      }
    });
  }

  function initSectionTracking() {
    if (!('IntersectionObserver' in window)) return;
    var targets = document.querySelectorAll('section, [data-track-section]');
    if (targets.length === 0) return;

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isIntersecting) {
          var label = deriveSectionLabel(entry.target);
          var params = { section: label };
          if (window.gtag) window.gtag('event', 'section_reached', params);
          postEvent('section_reached', params);
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.5 });

    for (var j = 0; j < targets.length; j++) observer.observe(targets[j]);
  }

  // ── boot ────────────────────────────────────────────────────────────────
  function start() {
    // GA4 fires page_view automatically from the head snippet's gtag('config').
    // /api/events does not — fire it explicitly here so both stores get parity.
    postEvent('page_view', {});
    initScrollTracking();
    initDwellTracking();
    initSectionTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
