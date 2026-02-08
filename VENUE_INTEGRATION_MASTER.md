# Venue Integration Master (End-to-End)

This doc is a practical runbook for adding a new **venue** end-to-end:

collector/origin -> TimescaleDB -> FastAPI -> Cloudflare (Worker + Pages) -> Scanner UI

It is written for the current architecture where:
- `/scanner/*` is Cloudflare Pages (behind `scanner-router` Worker)
- `/api/*` is the VPS (Nginx -> FastAPI)

## 0) Naming Contract (Do This First)

Pick a canonical venue id:
- Lowercase ASCII, no spaces (example: `variational`)
- Must match across:
  - Timescale rows (`venue` column)
  - backend JSON fields (`exchange_short`, `exchange_long`, `venue_short`, `venue_long`)
  - frontend venue filters and display mapping

If the venue has sub-sources (like Hyperliquid HIP-3), keep `venue` stable and use `dex_name` (or similar) as a separate dimension.

## 1) Data Layer (Collector / Origin)

Goal: the system must ingest snapshots for the new venue with enough fields to compute:
- funding rate (hourly or 8h cadence depending on venue)
- APR conversions (backend usually converts to APR for UI)
- optional Open Interest (OI) if you want OI-based filtering and OI widgets

Minimum deliverable:
- write rows into Timescale `market_snapshots_5m` with:
  - `time`
  - `symbol`
  - `venue`
  - `funding_rate_1h` (or a normalized representation the backend already expects)
  - optional: `open_interest`, `dex_name`

Recommended:
- Also upsert into `arbitrable_symbols` (canonical registry) so opportunities do not disappear due to transient collector timing.

Reference: `UPGRADE_ARBITRABLE_SYMBOLS.md` and `UPGRADE_BACKEND.md`.

## 2) Storage Layer (TimescaleDB)

Required:
- New venue appears in:
  - `market_snapshots_5m`
  - `arbitrable_symbols`

Recommended:
- Ensure `fr_1h_agg` continuous aggregate includes it (or the equivalent in your DB).
- Ensure indexes exist for `symbol, venue, dex_name, time` (or bucket).

Quick DB sanity checks (run on VPS):
```bash
psql -d trading_data -c \"select venue, count(*) from market_snapshots_5m where time > now() - interval '1 day' group by 1 order by 2 desc;\"
psql -d trading_data -c \"select venue, count(*) from arbitrable_symbols group by 1 order by 2 desc;\"
```

## 3) Backend Layer (FastAPI)

### 3.1 `/api/exchanges`
This endpoint should list the new venue so the frontend can be dynamic over time.

### 3.2 `/api/opportunities`
This endpoint must emit opportunities that include the new venue in:
- `exchange_short` and/or `exchange_long`
- (if applicable) `dex_name_short` / `dex_name_long` metadata

Important:
- If Nginx micro-cache is enabled for `/api/opportunities`, you might not see changes for up to ~60s (see `UPGRADE_BACKEND.md`).

### 3.3 Symbol Detail endpoints
The UI relies on these endpoints for the detail view:
- `/api/symbol-detail/history/{symbol}`
- `/api/symbol-detail/snapshot/{symbol}`
- `/api/symbol-detail/exchanges/{symbol}`

Required:
- The new venue must be represented in `exchange_details` (or equivalent) so the detail view can render cards, OI, etc.

## 4) Frontend Layer (Scanner UI, Cloudflare Pages)

### 4.0 Webapp-only integration (UI first)
If you want to "add the venue in the UI" before backend support is complete:
- Add the venue to the local UI registry (names/colors/logos) so the UI can render it.
- The venue will only show real data once the backend includes it in `/api/opportunities` and detail endpoints.

### 4.1 Source of truth for venues
Current state:
- The scanner UI has a hardcoded venue registry used for filters, labels, and colors.

Files to update for a new venue:
- `webapp-cloudflare/frontend/src/components/OpportunitiesScanner.tsx`
  - `ALL_VENUES`
  - `VENUE_DISPLAY_NAMES`
  - `VENUE_ABBREV`
  - `VENUE_COLORS`
- `webapp-cloudflare/frontend/src/components/LandingPage.tsx`
  - `VENUES` array (3D landing visuals)

Recommendation (future-proof):
- Switch `ALL_VENUES` to be driven by `/api/exchanges` and keep the local registry as "styling only" (so adding a venue server-side does not require a UI deploy).

### 4.2 Assets (logos/icons)
Add a logo for the new venue under:
- `webapp-cloudflare/public/venue-<venue>.png`

And reference it via:
- `withBase('venue-<venue>.png')` (important because the scanner base path is `/scanner/`)

### 4.3 Base path invariants
The scanner is served under `/scanner/`. Any static asset path must be basepath-safe:
- Use `withBase(...)` for assets.
- Use `getScannerPath(...)` for links/routes when needed.

Reference: `DEPLOY_PAGES_SCANNER_BASEPATH.md` and `scanner-router/README_DEPLOY.md`.

## 5) Cloudflare Routing Layer (Worker + Pages)

Normally you do not change this per venue, but it is required for correctness:
- Worker `scanner-router` must keep routing `/scanner*` to Pages and preserve querystrings.
- SPA routes like `/scanner/s/:symbol` must return `index.html`.

Reference: `webapp-cloudflare/scanner-router/src/index.js`.

## 6) Verification Checklist (Close the Loop)

### 6.1 Backend checks (from VPS)
```bash
curl -fsS https://54strategydigital.com/api/exchanges | head
curl -fsS 'https://54strategydigital.com/api/opportunities?limit=5' | head
```

### 6.1b Contract spot-check (fields)
The scanner expects these keys (at least) on each opportunity item:
- `symbol`, `exchange_short`, `exchange_long`, `net_apr`, `timestamp`
- Optional but used by UI: `apr_24h`, `apr_7d`, `apr_30d`, `samples_*`, `oi_*`, `dex_name_*`

### 6.2 UI checks (from any client)
- The venue appears in the Scanner filter.
- The venue label renders (no `undefined`).
- Opportunity cards show correct abbreviations and colors.
- Detail view loads and includes the new venue in exchange cards.

### 6.3 Basepath checks
```bash
curl -I https://54strategydigital.com/scanner/ | egrep -i 'x-scanner-worker|server|cf-ray'
curl -I https://54strategydigital.com/scanner/assets/ | head
```

## 7) Common Failure Modes (Fast Diagnosis)

- Venue present in DB but missing in UI:
  - backend `/api/opportunities` is filtering it out (active window, OI requirements, top-k, etc).
  - UI registry not updated (`ALL_VENUES` missing).

- Venue appears in list but detail is empty:
  - backend detail endpoints are not dex-aware or do not emit `exchange_details` for that venue.

- UI shows broken images for new venue:
  - logo not added to `public/`
  - asset path not using `withBase(...)` under `/scanner/`

- Data feels stale in list but correct in detail:
  - nginx micro-cache TTL on `/api/opportunities` (60s + stale) vs detail polling every 30s (see `OpportunitiesScanner.tsx` and `SymbolDetailModal.tsx`).

## Appendix: Venue Notes

- Ethereal: `VENUE_ETHEREAL_NOTES.md`
