# seven.club read-tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship GA4 + custom listeners on seven.club so every page reports pageview, scroll-depth (25/50/75/90%), foreground-only dwell time (30/60/120 s), and section-reached events.

**Architecture:** Single GA4 property. Two custom-code blocks injected via Webflow Project Settings (site-wide on every page): a small `gtag.js` loader in `<head>`, and one IIFE in `<footer>` containing three independent listeners (scroll, dwell, section). All events flow into the same GA4 property. No backend, no build step — plain JS pasted into Webflow.

**Tech Stack:** Webflow Designer custom code, Google Analytics 4 (`gtag.js`), browser-native APIs (`IntersectionObserver`, Page Visibility API, `requestAnimationFrame`).

**Spec:** `docs/superpowers/specs/2026-05-02-seven-club-read-tracking-design.md`

---

## File structure

```
~/scripts/seven-club-tracking/
├── docs/
│   ├── specs/2026-05-02-seven-club-read-tracking-design.md   (already written)
│   └── plans/2026-05-02-seven-club-read-tracking.md          (this file)
└── src/
    ├── ga4-head.html       — paste this into Webflow Head Code
    ├── webflow-footer.js   — full IIFE (paste wrapped in <script>…</script> into Footer Code)
    └── test-page.html      — local smoke test, open in a browser to verify listeners fire
```

Each `src/` file has one responsibility:
- `ga4-head.html` — only the gtag loader + config (no listener logic)
- `webflow-footer.js` — the three listeners + label-derivation helper, no GA4 loader (assumes `gtag` is global)
- `test-page.html` — fake page with mock `gtag` that logs to `console`, four `<section>`s, scrollable

---

## Task 1: Create GA4 property + capture Measurement ID

**Files:** none (manual)

This task is done by Nancy in a browser. The output is a Measurement ID like `G-XXXXXXXXXX` that the next task hardcodes.

- [ ] **Step 1: Open GA4 admin**

In a browser: https://analytics.google.com → bottom-left ⚙️ Admin → "+ Create" → Property.

- [ ] **Step 2: Create property**

- Property name: `seven.club`
- Reporting time zone: `(GMT+04:00) Dubai`
- Currency: `AED`
- Click "Next" through the business detail prompts (any answer is fine)
- Click "Create" → accept the data-processing terms

- [ ] **Step 3: Add a Web data stream**

- Choose "Web" platform
- Website URL: `https://seven.club`
- Stream name: `seven.club`
- Click "Create stream"

- [ ] **Step 4: Capture the Measurement ID**

The stream details page shows "Measurement ID: G-XXXXXXXXXX" in the top-right.
Copy this value. Paste it temporarily into a scratch buffer (or password manager); we will hardcode it into Step 1 of Task 3.

- [ ] **Step 5: Confirm Enhanced Measurement is on**

On the same stream details page, find the "Enhanced measurement" toggle. It is ON by default. Confirm:
- ✅ Page views
- ✅ Scrolls
- ✅ Outbound clicks
- ✅ Site search
- ✅ File downloads
- ✅ Video engagement

If any are off, click the gear icon and turn them on. (We rely on Scrolls = the auto 90% event.)

---

## Task 2: Set up local working dir

**Files:**
- Create: `~/scripts/seven-club-tracking/src/`
- Create: `~/scripts/seven-club-tracking/.gitignore`

- [ ] **Step 1: Create src directory**

```bash
mkdir -p ~/scripts/seven-club-tracking/src
```

- [ ] **Step 2: Add a .gitignore**

Write `~/scripts/seven-club-tracking/.gitignore`:

```
.DS_Store
node_modules/
*.log
```

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add .gitignore
git commit -m "chore: gitignore"
```

---

## Task 3: Write the GA4 head snippet

**Files:**
- Create: `~/scripts/seven-club-tracking/src/ga4-head.html`

- [ ] **Step 1: Write the snippet**

Replace `G-XXXXXXXXXX` with the real Measurement ID captured in Task 1, Step 4. (There are two occurrences — the URL and the `gtag('config', ...)` call. Both must match.)

Write `~/scripts/seven-club-tracking/src/ga4-head.html`:

```html
<!-- Google Analytics 4 — gtag.js -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX', { send_page_view: true });
</script>
```

- [ ] **Step 2: Sanity-check both Measurement-ID occurrences match**

```bash
grep -c 'G-' ~/scripts/seven-club-tracking/src/ga4-head.html
```
Expected: `2` (two lines containing the Measurement ID).

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/ga4-head.html
git commit -m "feat: GA4 head snippet"
```

---

## Task 4: Write the section-label helper

This is a pure function. It takes a DOM element and returns a string label per the spec's priority order: `data-track-section` → `id` → first class not matching `^(w-|section$)` → first heading text (truncated to 50) → `'unnamed'`.

**Files:**
- Create: `~/scripts/seven-club-tracking/src/webflow-footer.js`

- [ ] **Step 1: Write the helper inside the file**

Write `~/scripts/seven-club-tracking/src/webflow-footer.js` (this file will grow across the next tasks):

```js
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
```

- [ ] **Step 2: Syntax-check it**

```bash
node --check ~/scripts/seven-club-tracking/src/webflow-footer.js
```
Expected: no output (silent success). Any syntax error prints a stack trace.

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/webflow-footer.js
git commit -m "feat: section-label helper (priority order per spec)"
```

---

## Task 5: Add scroll-depth tracker

Adds `initScrollTracking()` to `webflow-footer.js`. Fires `scroll_depth` events at 25/50/75 % each at most once per page load. rAF-throttled.

**Files:**
- Modify: `~/scripts/seven-club-tracking/src/webflow-footer.js`

- [ ] **Step 1: Insert the tracker after the helper**

In `~/scripts/seven-club-tracking/src/webflow-footer.js`, replace the line `// initScrollTracking — Task 5` with:

```js
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
```

- [ ] **Step 2: Syntax-check**

```bash
node --check ~/scripts/seven-club-tracking/src/webflow-footer.js
```
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/webflow-footer.js
git commit -m "feat: scroll-depth tracker (25/50/75 once per page)"
```

---

## Task 6: Add dwell-time tracker

Adds `initDwellTracking()`. Counts only foreground-tab seconds. Fires at 30/60/120 s, each at most once.

**Files:**
- Modify: `~/scripts/seven-club-tracking/src/webflow-footer.js`

- [ ] **Step 1: Insert after the scroll tracker**

In `~/scripts/seven-club-tracking/src/webflow-footer.js`, replace the line `// initDwellTracking — Task 6` with:

```js
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
          if (window.gtag) window.gtag('event', 'dwell_time', { seconds: t });
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
```

- [ ] **Step 2: Syntax-check**

```bash
node --check ~/scripts/seven-club-tracking/src/webflow-footer.js
```
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/webflow-footer.js
git commit -m "feat: dwell-time tracker (foreground-only, 30/60/120 s)"
```

---

## Task 7: Add section-reached tracker

Adds `initSectionTracking()`. Observes every `<section>` plus anything with `data-track-section`. Fires `section_reached` once per element when ≥50% visible.

**Files:**
- Modify: `~/scripts/seven-club-tracking/src/webflow-footer.js`

- [ ] **Step 1: Insert after the dwell tracker**

In `~/scripts/seven-club-tracking/src/webflow-footer.js`, replace the line `// initSectionTracking — Task 7` with:

```js
  function initSectionTracking() {
    if (!('IntersectionObserver' in window)) return;
    var targets = document.querySelectorAll('section, [data-track-section]');
    if (targets.length === 0) return;

    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isIntersecting) {
          var label = deriveSectionLabel(entry.target);
          if (window.gtag) window.gtag('event', 'section_reached', { section: label });
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.5 });

    for (var j = 0; j < targets.length; j++) observer.observe(targets[j]);
  }
```

- [ ] **Step 2: Syntax-check**

```bash
node --check ~/scripts/seven-club-tracking/src/webflow-footer.js
```
Expected: silent success.

- [ ] **Step 3: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/webflow-footer.js
git commit -m "feat: section-reached tracker (IntersectionObserver, 50% threshold)"
```

---

## Task 8: Wire up boot

Replaces the `// ── boot ──` placeholder with code that runs all three trackers on `DOMContentLoaded` (or immediately, if DOM is already parsed).

**Files:**
- Modify: `~/scripts/seven-club-tracking/src/webflow-footer.js`

- [ ] **Step 1: Append boot block**

In `~/scripts/seven-club-tracking/src/webflow-footer.js`, replace the line `// ── boot (wired in Task 8) ──────────────────────────────────────────────` with:

```js
  // ── boot ────────────────────────────────────────────────────────────────
  function start() {
    initScrollTracking();
    initDwellTracking();
    initSectionTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
```

- [ ] **Step 2: Syntax-check the full file**

```bash
node --check ~/scripts/seven-club-tracking/src/webflow-footer.js
```
Expected: silent success.

- [ ] **Step 3: Verify all four tracker functions are present**

```bash
grep -E 'function (deriveSectionLabel|initScrollTracking|initDwellTracking|initSectionTracking|start)' ~/scripts/seven-club-tracking/src/webflow-footer.js | wc -l
```
Expected: `5`

- [ ] **Step 4: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/webflow-footer.js
git commit -m "feat: boot — wire all three trackers on DOMContentLoaded"
```

---

## Task 9: Local smoke-test page

A standalone HTML file that includes a mocked `gtag` (logs to console) plus the IIFE, plus four scrollable sections. Opening it in Chrome and watching DevTools console proves the listeners fire correctly **before** we paste anything into Webflow.

**Files:**
- Create: `~/scripts/seven-club-tracking/src/test-page.html`

- [ ] **Step 1: Write the test page**

Write `~/scripts/seven-club-tracking/src/test-page.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>seven.club tracking — smoke test</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; }
    section { min-height: 100vh; padding: 2rem; border-bottom: 2px solid #ccc; }
    section:nth-child(odd)  { background: #f6f6f6; }
    section:nth-child(even) { background: #ececec; }
    h2 { margin: 0 0 1rem; }
  </style>
  <!-- Mock gtag — logs every call to the console instead of sending to GA4 -->
  <script>
    window.gtag = function () {
      console.log('[gtag]', Array.from(arguments));
    };
  </script>
</head>
<body>
  <section id="hero">
    <h2>Hero</h2>
    <p>Scroll down. Each section should fire one section_reached event when ≥50% on screen. Scroll-depth events fire at 25/50/75 %. Dwell events at 30/60/120 s of foreground time.</p>
  </section>
  <section class="membership">
    <h2>Membership</h2>
    <p>Long enough that scrolling past it crosses the next scroll threshold.</p>
  </section>
  <section data-track-section="recovery">
    <h2>Recovery (custom label via data-track-section)</h2>
  </section>
  <section>
    <h2>Footer</h2>
    <p>End of page. Scroll-depth 75 % should have fired by now; GA4's auto 90% would fire here in production.</p>
  </section>

  <!-- Listener IIFE — same content that ships into Webflow Footer Code -->
  <script src="./webflow-footer.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open in a browser**

```bash
open ~/scripts/seven-club-tracking/src/test-page.html
```

- [ ] **Step 3: Verify in DevTools console**

Open Chrome DevTools (`Cmd-Opt-I`) → Console tab. Expected output:

1. **Immediately** — `[gtag] ["event", "section_reached", {section: "hero"}]` (first section is already 50% visible).
2. **Scroll slowly to the bottom.** As you cross 25%, 50%, 75% scroll, you'll see `[gtag] ["event", "scroll_depth", {percent: 25}]` etc.
3. As each section crosses 50% visibility, `[gtag] ["event", "section_reached", {section: "<label>"}]` fires once. Section labels should be: `hero`, `membership`, `recovery`, `Footer` (last one falls through to the `<h2>` text).
4. **Wait 30 s with the tab focused** → `[gtag] ["event", "dwell_time", {seconds: 30}]`.
5. **Switch to another tab for 10 s, switch back, wait until 60 s of total focused time** → `[gtag] ["event", "dwell_time", {seconds: 60}]`. (Foreground only — verifies the visibility-pause logic.)

If any expectation fails, fix the relevant tracker (Tasks 5/6/7) before proceeding. Re-run `node --check` and re-open the test page after every fix.

- [ ] **Step 4: Commit**

```bash
cd ~/scripts/seven-club-tracking
git add src/test-page.html
git commit -m "test: local smoke-test page with mock gtag"
```

---

## Task 10: Paste into Webflow + Publish

This task is done by Nancy in the Webflow Designer. The MCP cannot edit Custom Code blocks (security restriction).

**Files:** none (manual)

- [ ] **Step 1: Open the seven.club Webflow Designer**

Browser → https://webflow.com → Workspaces → seven.club site → Designer. Or directly: visit the seven.club Designer URL from your Webflow dashboard.

- [ ] **Step 2: Open Project Settings → Custom Code**

Top-left "W" Webflow icon → Project Settings → "Custom Code" tab.

- [ ] **Step 3: Paste the head snippet**

Open `~/scripts/seven-club-tracking/src/ga4-head.html`. Copy the entire file. Paste into the **Head Code** box (top section, "Add code to <head> tag").

Confirm both `G-XXXXXXXXXX` placeholders have been replaced with the real Measurement ID from Task 1 Step 4. (If you're seeing literal `XXXXXXXXXX`, abort and fix Task 3 first.)

- [ ] **Step 4: Paste the footer listeners**

Open `~/scripts/seven-club-tracking/src/webflow-footer.js`. Copy the entire file content. **Wrap it in a `<script>` tag** when pasting:

```html
<script>
…paste the IIFE contents here…
</script>
```

Paste into the **Footer Code** box (bottom section, "Add code before </body> tag").

- [ ] **Step 5: Save**

Click "Save Changes" at the bottom of the Custom Code page. **This does not publish the site.**

- [ ] **Step 6: Publish**

Top-right "Publish" button → check the production domain (`seven.club`) → Publish to Selected Domains. Wait for the green confirmation toast.

Custom Code only ships on publish. Without this step the listeners are not live.

---

## Task 11: Verify live with GA4 Realtime

**Files:** none (manual)

- [ ] **Step 1: Open seven.club in a clean browser**

Use an Incognito window so there's no ad-blocker or earlier session contaminating the test. Visit https://seven.club.

- [ ] **Step 2: Open GA4 Realtime in another tab**

https://analytics.google.com → seven.club property → Reports → Realtime.

- [ ] **Step 3: Confirm pageview**

Within ~30 seconds of step 1, the "Users in last 30 minutes" card should show ≥1. The "Event count by Event name" card should show `page_view`. If not after 60 s, see Troubleshooting below.

- [ ] **Step 4: Trigger custom events on seven.club**

In the seven.club tab:
- Scroll slowly to the bottom of the page.
- Wait at least 30 s with the tab focused.

In the GA4 Realtime tab, the "Event count by Event name" card should grow to include:
- `scroll_depth`
- `dwell_time`
- `section_reached`
- (and the auto `scroll` event from GA4 Enhanced Measurement at 90%)

Click each event name to inspect the parameters — verify `percent`, `seconds`, `section` values look reasonable.

- [ ] **Step 5: Test a non-home page**

Navigate to another seven.club page (membership, classes, etc.). Confirm a new `page_view` event fires. Confirm `section_reached` fires for that page's sections too.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No events in Realtime after 60 s | Custom Code wasn't published | Webflow → Publish → check domain → Publish |
| `page_view` works but custom events don't | Footer Code didn't include `<script>` wrapper | Re-paste with `<script>…</script>` wrapping |
| Console error `gtag is not defined` | Footer ran before Head | Confirm head snippet is in Head Code box, not Footer |
| Some events but not others | Ad blocker (uBlock, Privacy Badger) | Test in an Incognito window with extensions disabled |
| `section_reached` only fires once on whole page | All `<section>`s have the same `id` or only the first is `<section>`-tagged | Inspect `<section>` markup in DevTools; add `data-track-section="<unique-name>"` Custom Attributes in Webflow Designer per section |

---

## Task 12: Push the local repo to GitHub

Per `feedback_push_work.md` — completed work goes to GitHub. The local repo currently has no remote.

**Files:** none (git remote operations)

- [ ] **Step 1: Create a private GitHub repo**

```bash
gh repo create nxofares/seven-club-tracking --private --source=/Users/nancyfares/scripts/seven-club-tracking --remote=origin --push
```

Expected: prints the new repo URL and pushes the existing branch.

- [ ] **Step 2: Verify**

```bash
cd ~/scripts/seven-club-tracking
git remote -v
git log --oneline | head -10
```

Expected: `origin` remote points at github.com; commits from this plan are visible.

- [ ] **Step 3: Done — close the loop**

Save a memory entry for this work so future sessions know it shipped: a one-liner under "Webapps deployed" or as a fresh project memory `project_seven_club_tracking.md`. (This step is a Claude action, not a manual one — trigger by saying "remember this work" or letting auto-memory pick it up at session end.)

---

## Self-review checklist (already run; no issues found)

1. **Spec coverage:**
   - Pageview → Task 1 (GA4 created) + Task 3 (snippet) ✓
   - Auto 90% scroll → Task 1 Step 5 (Enhanced Measurement on) ✓
   - Custom 25/50/75% scroll → Task 5 ✓
   - Foreground-only dwell 30/60/120 s → Task 6 ✓
   - Section-reached, generic detection → Task 7 ✓
   - All-pages coverage → Task 10 (Project Settings = site-wide) ✓
   - Verification step → Task 11 ✓
   - Privacy/consent deferred → not in plan, matches spec ✓
   - Approach B as TODO → already in seven-analytics backlog memory, not in plan ✓

2. **Placeholder scan:** Only `G-XXXXXXXXXX` (deliberate — captured in Task 1, hardcoded in Task 3 with a sanity check). No TBDs, no "implement later", no vague "handle errors".

3. **Type/name consistency:**
   - `deriveSectionLabel`, `initScrollTracking`, `initDwellTracking`, `initSectionTracking`, `start` — same names in Tasks 4–8.
   - Event names match across plan and spec: `scroll_depth`, `dwell_time`, `section_reached`, parameters `percent`, `seconds`, `section`.
   - Threshold values (25/50/75 scroll; 30/60/120 dwell; 0.5 IntersectionObserver) match spec.
