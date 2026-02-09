# Ethereal (MeridianXYZ) Venue Notes

This file is a short, actionable scratchpad for integrating **Ethereal** into the 54SD pipeline.

Scope: market-data ingestion for scanner (funding + OI) and basic UI support.

## Status

- UI: integrated (labels/colors/logo placeholder).
- Backend (VPS): integrated end-to-end (collector -> Timescale -> opportunities API).
- Historical funding backfill: implemented (so Ethereal no longer shows as "Recently listed" due to missing 7d samples).

## What We Already Did (Webapp UI)

Webapp now knows the venue id `ethereal` so it can render labels/colors/logos once the backend starts emitting it:
- `frontend/src/components/OpportunitiesScanner.tsx` includes `ethereal` in venue registry.
- `frontend/src/components/LandingPage.tsx` includes `ethereal` in 3D venue list.
- Logo placeholder added: `public/venue-ethereal.png` (replace with official asset later).

## Canonical Venue Id

- `venue`: `ethereal`
- Display: `Ethereal`
- Abbrev (UI): `ETHR`

## Market Data: Key Endpoint

The Trading API exposes products that include funding and OI:
- `GET /v1/product` (list products)
  - Fields we care about: `ticker`, `fundingRate1h`, `openInterest`, `volume24h`, etc.

Docs:
```text
https://docs.ethereal.trade/developer-guides/trading-api/products
```

SDK (Python):
- `pip install ethereal-sdk`
- SDK docs:
```text
https://meridianxyz.github.io/ethereal-py-sdk/
```

## SDK Config (from docs)

The SDK supports REST + WS and signing (EIP-712). For scanner ingestion we can start with REST read-only.

Typical config:
- `base_url`: `https://api.ethereal.trade` (or testnet variants used in SDK docs)
- `rpc_url`: `https://rpc.ethereal.trade`

## Data Model Mapping (to our Timescale fields)

Proposed mapping (collector -> Timescale):
- `symbol`: product `ticker` (example: `BTCUSD`)
- `venue`: `ethereal`
- `funding_rate_1h`: parse `fundingRate1h` as float
- `open_interest`: normalize to USD notional:
  - if Ethereal returns base-size, multiply by `oraclePrice`
  - if Ethereal returns USD-notional already, store as-is
- `time`: collector timestamp

APR conversion (backend convention):
- `fundingRate1h` is a per-hour rate **in decimal** (example: `-0.000029994`).
- UI convention:
  - show funding as `% per 1h`: `funding_rate_1h_pct = fundingRate1h * 100` (example: `-0.0029994%`)
  - show APR as annualized percent: `apr_pct = fundingRate1h * 24 * 365 * 100` (example: `-26.27%`)

If `fundingRate1h` is a per-hour rate (decimal), annualized APR estimate:
  - `apr_pct ~= fundingRate1h * 24 * 365 * 100`
  - Confirm with Ethereal docs and spot-check against UI expectations before shipping.

## End-To-End Integration References (VPS)

- Collector (v2): `dev/bot-paper-binance-main/tracker_funding_strategy_v2/data_collector/market_collector.py`
- Ethereal client (v2): `dev/bot-paper-binance-main/tracker_funding_strategy_v2/venues/ethereal/client.py`
- Backfill script (v2): `dev/bot-paper-binance-main/tracker_funding_strategy_v2/scripts/backfill_ethereal_funding.py`
- TSDB:
  - raw snapshots: `market_snapshots_5m`
  - hourly cagg: `fr_1h_agg` (used for `samples_7d` and `apr_7d`)

Operational note:
- If you backfill historical rows into `market_snapshots_5m`, you must refresh `fr_1h_agg` (or wait for policy).
  - Example (as postgres on VPS):
```bash
sudo -u postgres psql -d trading_data -Atc \
  "CALL refresh_continuous_aggregate('fr_1h_agg', NOW() - INTERVAL '35 days', NOW());"
```

## Limitations (What We Cannot Reconstruct Yet)

- The backfill currently reconstructs *funding history* only.
- If Ethereal does not expose historical OI/volume/price, we cannot reliably reconstruct those from the SDK "snapshot" alone.

## Open Questions (Confirm When Extending)

- Is `fundingRate1h` always "per hour" for all products, or can cadence differ by market?
- Is `openInterest` USD-notional or base-size? (docs show string numeric; verify semantics)
- Mainnet vs testnet base URLs and auth requirements for any endpoints we plan to call.
