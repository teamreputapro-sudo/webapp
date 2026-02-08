# Ethereal (MeridianXYZ) Venue Notes

This file is a short, actionable scratchpad for integrating **Ethereal** into the 54SD pipeline.

Scope: market-data ingestion for scanner (funding + OI) and basic UI support.

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
- `https://docs.ethereal.trade/developer-guides/trading-api/products`

SDK (Python):
- `pip install ethereal-sdk`
- SDK docs: `https://meridianxyz.github.io/ethereal-py-sdk/`

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
- `open_interest`: parse `openInterest` as float (USD)
- `time`: collector timestamp

APR conversion (backend convention):
- If `fundingRate1h` is a per-hour rate (decimal), annualized APR estimate:
  - `apr_pct ~= fundingRate1h * 24 * 365 * 100`
  - Confirm with Ethereal docs and spot-check against UI expectations before shipping.

## Open Questions (Need Confirm Before Full Integration)

- Is `fundingRate1h` always "per hour" for all products, or can cadence differ by market?
- Is `openInterest` USD-notional or base-size? (docs show string numeric; verify semantics)
- Mainnet vs testnet base URLs and auth requirements for any endpoints we plan to call.
