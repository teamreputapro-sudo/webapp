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

## Where to read more

- `UPGRADE_ARBITRABLE_SYMBOLS.md` — canonical symbol registry + HIP‑3 integration.
- `UPGRADE_BACKEND.md` — backend changes, cache, DB, and API behavior.
- `DEPLOY_PAGES_SCANNER_BASEPATH.md` — Pages settings + env.
- `README.md` — general project overview.

---

## Verification checklist

1) `/scanner/` returns `x-scanner-worker: 1` and loads Pages assets.
2) Assets at `/scanner/assets/*` are **immutable cached**.
3) `/` loads VPS frontend and **Scanner** button sends to `/scanner/` (hard reload).
