# Deploy Scanner Frontend to Cloudflare Pages (Base Path /scanner/)

**Goal:** Serve the scanner SPA at `https://54strategydigital.com/scanner/` while the FastAPI backend stays on the VPS.

## Cloudflare Pages Settings

- **Root directory:** `webapp/frontend`
- **Build command:** `npm ci && npm run build`
- **Output directory:** `dist`

## Environment Variables (Pages)

- `VITE_API_BASE_URL=https://54strategydigital.com`
- `VITE_BASE_PATH=/scanner/`

> The frontend resolves the API base as `VITE_API_BASE_URL || window.location.origin`.

## Base Path Behavior

- Vite uses `VITE_BASE_PATH=/scanner/` to set `base: "/scanner/"`.
- React Router uses `basename` derived from `import.meta.env.BASE_URL`.
- Static assets are referenced via `import.meta.env.BASE_URL` so they resolve under `/scanner/`.
- Symbol detail uses a dedicated route: `/scanner/s/:symbol` and opens in a **new tab**.
- Detail links include venue hints so backend calls stay consistent:
  `?venue_short=...&venue_long=...&dex_name_short=...&dex_name_long=...`

## Cache Headers (Pages)

`public/_headers` is included in the build:

```
/scanner/assets/*
  Cache-Control: public, max-age=31536000, immutable

/scanner/*
  Cache-Control: public, max-age=60
```

## Note on Custom Domain Routing

If you attach the Pages project to `54strategydigital.com`, you need a **Worker/router** to route `/scanner/*` to the Pages project while keeping the existing VPS site at `/`.
