# WEBAPP_CONTEXT.md

## Purpose
Single-page context for the **webapp module** (frontend + Cloudflare Pages/Worker + backend expectations).
This file is meant to be a short orientation for new sessions.

---

## Architecture (current)

**Frontend (Scanner)**
- Built with Vite/React.
- **Pages origin** serves the scanner under **/scanner/**.
- Base path is `/scanner/`, and routing supports `/scanner/` and `/scanner/s/:symbol`.

**Worker router**
- Routes `/scanner*` to Pages origin.
- Adds `x-scanner-worker: 1` header.

**Backend**
- FastAPI on VPS (127.0.0.1:8001 behind Nginx).
- `/api/opportunities` and symbol detail endpoints served by VPS.

---

## Key Specs

**Scanner base path**
- Must be `/scanner/` (not subdomain).
- The root site `/` stays on VPS.

**Navigation behavior**
- From home (`/`), clicking **Scanner** must redirect to `/scanner/` **with a hard reload** so Pages is used.
- `/scanner` should normalize to `/scanner/`.

**HIP‑3**
- DEX list is dynamic (see backend docs).
- DEX fallback list includes: `xyz, flx, vntl, hyna, km, cash`.

---

## Operational Notes

**Cloudflare Pages**
- Uses repo `teamreputapro-sudo/webapp`.
- Output dir: `dist`.
- Root directory should match current repo layout (not `frontend/`).

**Worker**
- `scanner-router` proxies `/scanner*` to Pages origin.
- Do not rewrite assets to index.

---

## AdSense (Home)

The root site (`/`) is served from the VPS, but the frontend bundle still includes AdSense wiring.

- AdSense script tag lives in `index.html` (and is also present in `frontend/index.html`; legacy subtree).
  - It is built into the final `dist/index.html` for the root build (VPS home).
- React ad units are rendered via `src/components/AdBanner.tsx` (and also `frontend/src/components/AdBanner.tsx`).
- Slot IDs (current):
  - Top: `2893729326`
  - Bottom: `3776222694`
- Banners are hidden on the landing/home route (`getLandingPath()`).
  - In root mode this is `/`.
  - In scanner mode the "Home" link is `/scanner/home` which hard-navigates back to `/`.
  - Legacy direct paths are also treated as landing: `/home`, `/index.html`.

---

## Symbol Detail UX (2026-02-11)

Scanner detail view (`/scanner/s/:symbol`) was updated in both source trees:
- `frontend/src/components/SymbolDetailModal.tsx`
- `src/components/SymbolDetailModal.tsx`

Implemented:
- New summary header panel ("dusk panel" style) in the top area of symbol detail.
  - Includes short/long APR, net APR current, price spread, OI and period summaries.
- New `3d` button in the timeframe selector.
  - API compatibility: the UI requests `7d` history and crops to the last 72h to render `3d`.
- Added zoom controls (`+` / `-`) for chart data window.
  - Zoom now applies consistently to:
    - Funding Spread (APR)
    - Funding Rates (Short vs Long)
    - Price Spread History
- Layout reorder:
  - `Price Spread History` moved up to the row where the simulator was.
  - `Profit Simulator` moved to the final block of the detail page.

Verification notes:
- `npm run build` in `frontend/` passes.
- `npm run build:root` in repo root passes.

---

## Where to read more

- `UPGRADE_ARBITRABLE_SYMBOLS.md` — canonical symbol registry + HIP‑3 integration.
- `UPGRADE_BACKEND.md` — backend changes, cache, DB, and API behavior.
- `VENUE_INTEGRATION_MASTER.md` — end-to-end checklist to add a venue (DB → backend → UI).
- `DEPLOY_PAGES_SCANNER_BASEPATH.md` — Pages settings + env.
- `README.md` — general project overview.

---

## Verification checklist

1) `/scanner/` returns `x-scanner-worker: 1` and loads Pages assets.
2) Assets at `/scanner/assets/*` are **immutable cached**.
3) `/` loads VPS frontend and **Scanner** button sends to `/scanner/` (hard reload).
