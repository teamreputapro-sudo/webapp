# Scanner Router Worker (Cloudflare Pages Base Path)

This Worker routes only `/scanner*` on `54strategydigital.com` to the Pages project and rewrites paths to the Pages origin.

## 1) Update Pages origin

Edit `src/index.js`:

```js
const PAGES_ORIGIN = "https://TU_PROYECTO.pages.dev";
```

Replace with your Pages project URL.

## 2) Deploy the Worker

From this folder:

```bash
wrangler deploy
```

## 3) Attach the route

```bash
wrangler routes add 54strategydigital.com/scanner* --script scanner-router
```

## Behavior

- `/scanner` or `/scanner/` → `/index.html` on Pages
- `/scanner/assets/*` → `/assets/*` on Pages
- `/scanner/anything` (SPA route) → `/index.html`
- Querystring is preserved

