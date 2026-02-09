# Webapp (Pages Scanner) Instructions for Claude/Codex

This repo deploys the **scanner** UI to Cloudflare Pages under:
- `https://54strategydigital.com/scanner/`

The site root `/` is served from the VPS, but `/scanner/*` is Pages (via a Worker router).

## Architecture Snapshot

- **Cloudflare Worker**: `scanner-router`
  - Routes only `/scanner*` to the Pages origin and rewrites `/scanner/assets/*` to `/assets/*`.
  - Adds `x-scanner-worker: 1`.
  - Reference: `scanner-router/src/index.js`, `scanner-router/README_DEPLOY.md`

- **Frontend (Vite/React)**: `frontend/src/*`
  - Basepath must be `/scanner/` in production.
  - Static assets must use `withBase(...)` (not `/...`).
  - API calls go to the VPS under `/api/*` (same domain).
  - Reference: `WEBAPP_CONTEXT.md`, `DEPLOY_PAGES_SCANNER_BASEPATH.md`

## Venue Integration

Master runbook:
- `VENUE_INTEGRATION_MASTER.md`

Ethereal venue (UI-first integration):
- Why: allow UI to render/filter the venue as soon as backend begins emitting it (no `undefined` labels).
- What changed:
  - Scanner venue registry: `frontend/src/components/OpportunitiesScanner.tsx`
  - Landing 3D venue list: `frontend/src/components/LandingPage.tsx`
  - Mock/fallback venue lists: `frontend/src/services/symbol-detail-api.ts`
  - Placeholder logo: `public/venue-ethereal.png` (replace with official later)
  - Notes/mapping: `VENUE_ETHEREAL_NOTES.md`

Important:
- UI changes alone do not create data. Real data appears only once the backend emits opportunities with:
  - `exchange_short/exchange_long = "ethereal"` and (optionally) venue-specific metadata.

## Ethereal End-to-End (Collector -> Timescale -> API -> UI)

Ethereal is ingested by the VPS collector (v2) into Timescale, then surfaced by the API and rendered by this UI.

References:
- Collector wiring (v2): `dev/bot-paper-binance-main/tracker_funding_strategy_v2/data_collector/market_collector.py`
- Ethereal client (v2): `dev/bot-paper-binance-main/tracker_funding_strategy_v2/venues/ethereal/client.py`
- Timescale table: `market_snapshots_5m` (VPS, TimescaleDB)
- Official SDK snapshot (offline): `dev/bot-paper-binance-main/tracker_funding_strategy_v3/ethereal-py-sdk-main/ethereal-py-sdk-main/`

Operational note:
- The scanner list auto-refreshes every `30s` (see `frontend/src/components/OpportunitiesScanner.tsx`), but production can still lag:
  - collector interval (typically `300s`)
  - nginx micro-cache on `/api/opportunities` (often `60s` + stale)

Backend perf notes (VPS):
- `/api/opportunities` uses Timescale `get_opportunities_with_history`.
  - It must remain bounded; see the `candidate_symbols` optimization in `webapp/backend/services/timescale_service.py`.
- HIP-3 opportunities should come from the collector-generated cache file so that `search=...` still returns the right pairs
  (ex: `hyna:SUI <-> ethereal:SUI`) without recomputation.
  - See `webapp/backend/api/routes/opportunities_integrated.py` and `UPGRADE_BACKEND.md`.
