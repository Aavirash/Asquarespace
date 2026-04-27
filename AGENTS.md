# Asquarespace Workspace Instructions

This repository mixes multiple experiments, but the active shipped Space 2 runtime lives in `Asquarespace/www/`.

## Critical Runtime Rules

- Treat the phone experience as the web app running inside a wrapper/browser. Do not assume a separate native mobile UI unless the user explicitly asks for native app work.
- For shipped Asquarespace UI changes, edit `Asquarespace/www/` files first. The parallel `Asquarespace/` source copies may be gitignored and are not the deploy target for this repo workflow.
- After changing shipped CSS or JS, bump the cache-bust query string in `Asquarespace/www/index.html` so the phone browser wrapper pulls fresh assets.
- When the user says "phone app" in this repo, interpret that as the wrapped web app unless they explicitly redirect you to native iOS or macOS code.

## Space 2 Layout Rules

- Space 2 mobile and desktop can have different layouts. Do not silently apply a mobile-only request to desktop, or a desktop request to mobile.
- Before editing Space 2 layout, verify the requested scope: mobile-only, desktop-only, or both.
- Current user expectation to preserve unless changed explicitly:
  - Space 2 mobile: bottom dock above AI toolbar for action buttons.
  - Space 2 mobile: view switch in the sidebar header top-left.
  - Space 2 mobile: search in the sidebar header to the right of the view switch.
  - Space 2 desktop/web: do not assume the same layout as mobile unless explicitly requested.

## Deployment / Git Rules

- Git-tracked runtime files are under `Asquarespace/www/`.
- Avoid staging gitignored mirror files under `Asquarespace/` when the runtime change is intended for the deployed app.
- Validate the exact touched slice after edits: DOM/CSS/JS errors first, then push only the tracked runtime files.

### Why phone changes may appear to "not show"

- This repo currently has **two tracked runtime trees** (`Asquarespace/` and `Asquarespace/www/`) with overlapping HTML/CSS/JS (`index.html`, `css/style.css`, `js/main.js`).
- Depending on how the phone wrapper/web URL is configured at that moment, the app may render one tree while fixes were made in the other.
- Symptom: many reloads show no UI change even though commits succeeded.
- Required verification before/after UI fixes:
  - Confirm which runtime path the phone build is serving right now.
  - Keep cache-bust versions in the served `index.html` in sync with edited CSS/JS.
  - If unsure, mirror critical mobile fixes into both trees intentionally and then prune later.

## Supabase / Media Rules

- Avoid regenerating signed URLs on every restore or reload; reuse them until near expiry.
- Prefer near-viewport lazy loading for Space 2 images to reduce egress during testing.
- Heavy reload testing on many images can inflate Supabase egress quickly; keep caching behavior intact when editing media flows.

## Working Style For Future Agents

- Start from the exact requested surface and restate the scope internally before editing.
- If a user is correcting scope, treat the latest correction as authoritative over earlier assumptions.
- When a UI change is not visible on phone after a push, check cache-busting before assuming the code path is wrong.