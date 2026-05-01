# seven.club read-tracking design

**Date:** 2026-05-02
**Site:** https://seven.club (SEVEN WELLNESS CLUB main marketing site, Webflow)
**Goal:** Know how many people actually read the site — not just how many landed on it.

## Signals being collected

| # | Signal | What it answers | Mechanism |
|---|---|---|---|
| 1 | Pageview | Did the page load? | GA4 default (auto) |
| 2a | Auto scroll 90% | Did they reach the bottom? | GA4 Enhanced Measurement (auto) |
| 2b | Custom scroll 25 / 50 / 75 % | How far did they actually go? | Custom listener |
| 3 | Dwell time 30 / 60 / 120 s | How long were they actually engaged (foreground tab only)? | Custom listener |
| 4 | Section reached | Which sections of the page were actually seen? | Custom `IntersectionObserver` |

All events are sent to a single GA4 property and visible in `analytics.google.com` → Realtime + Reports → Engagement → Events.

## Architecture

```
seven.club page load (any page, site-wide)
  │
  ├── <head> ── GA4 gtag.js loader + config (one snippet, one Measurement ID)
  │              ├─ fires `page_view` on every page automatically
  │              └─ Enhanced Measurement enabled in GA4 admin
  │                    (gives 90% scroll, outbound clicks, file downloads, video)
  │
  └── before </body> ── single IIFE wrapping three listeners
                          ├─ scroll-thresholds  → gtag('event','scroll_depth',{percent:25|50|75})
                          ├─ dwell-time         → gtag('event','dwell_time',{seconds:30|60|120})
                          └─ section-reached    → gtag('event','section_reached',{section:<label>})
```

The IIFE runs once per page load. There is no build step; the script is plain JS.

## Section-reached: generic, no hardcoded selectors

The user wants this on **all pages** of seven.club. Hardcoding a list of sections per page does not scale. Instead the listener auto-detects sections using this priority:

1. Any element with `data-track-section="<label>"` (explicit override — wins)
2. Every `<section>` element on the page
3. Element label is derived (in order): `data-track-section` → `id` → first non-Webflow class → first `<h1>/<h2>` text → "unnamed"

Each section is observed once with `IntersectionObserver` at `threshold: 0.5` (must be 50% on screen). Each section fires its event at most once per page load (the observer disconnects that target after firing).

Webflow renders sections as `<section class="section">…</section>` so this approach maps cleanly to standard Webflow output. If a future page has unusual structure, dropping a `data-track-section` attribute on any element via Webflow's "Custom Attributes" gives explicit control.

## Dwell-time: foreground only

Dwell counts only when the tab is **focused and visible**. The listener:

1. Starts a counter on `DOMContentLoaded`
2. Pauses on `visibilitychange` → hidden
3. Resumes on `visibilitychange` → visible
4. Fires `dwell_time` events at 30 s, 60 s, 120 s thresholds (each fires at most once)

This avoids inflated numbers from people leaving tabs open in the background — a common dwell-time mistake.

## Scroll thresholds

GA4 Enhanced Measurement already covers 90%. The custom listener adds 25 / 50 / 75 % so we can see the full drop-off curve, not just "did they reach the bottom."

The handler is throttled (rAF-gated) to avoid firing on every pixel of scroll.

## Where the code lives

Webflow Designer → **Project Settings → Custom Code**:

- **Head Code**: GA4 gtag.js install snippet (~12 lines, references `G-XXXXXXXXXX` Measurement ID)
- **Footer Code**: the three listeners as one IIFE (~70 lines)

After paste, **publish the site** (custom code only ships on publish, not on Designer save).

The Webflow MCP cannot edit these custom-code blocks (security restriction documented in `reference_webflow_mcp_quirks.md`). Nancy pastes manually.

## What does NOT need to be built

- **Per-page setup** — Project-level Custom Code injects on every page automatically.
- **A receiving server** — GA4 ingests directly from the browser via `gtag.js`.
- **A dashboard** — GA4 has Realtime + Reports built in.

## Verification (post-deploy)

1. Open `seven.club` in a clean browser tab.
2. Open GA4 → Reports → Realtime.
3. Confirm a "User in last 30 minutes" appears within ~30 s.
4. Scroll the page, wait 30 s, scroll more, click a different page.
5. Within ~60 s, `scroll_depth`, `dwell_time`, and `section_reached` events should appear in the Realtime "Event count by Event name" card.

If events do not show up: check `Network` tab for requests to `*.google-analytics.com/g/collect`. If those are blocked (ad-blocker), that is a known data-quality limit — not a bug in the listener.

## Privacy / consent (deferred)

GA4 sets cookies. If meaningful EU traffic shows up, a consent banner is required (Cookiebot, Iubenda, Webflow's own cookie consent). Not blocking for v1 since seven.club's primary audience is Dubai. Revisit if EU traffic exceeds ~5% of sessions.

## Future work (deferred — Approach B)

A custom event collector at `analytics.seven.expert/api/events` would let the same `gtag` events also POST to Nancy's self-hosted analytics, joining Webflow engagement to the nginx-log funnel data already collected for the visit/join/members webapps. Captured as a TODO in the seven-analytics backlog. **Not in scope for this design.**

## Open items at design-time

None. Defaults below are locked unless Nancy says otherwise during plan/implementation:

- **Site:** seven.club (all pages)
- **GA4 property:** new — to be created during implementation
- **Scroll thresholds:** 25 / 50 / 75 % (plus 90% from GA4 default)
- **Dwell thresholds:** 30 / 60 / 120 s
- **Sections tracked:** every `<section>` element + anything with `data-track-section`
- **Consent banner:** deferred
