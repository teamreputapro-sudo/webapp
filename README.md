# Funding Arbitrage Frontend (Webapp)

> **Status:** EN PRODUCCION
> **Scanner URL:** https://54strategydigital.com/scanner/
> **Root URL:** https://54strategydigital.com/
> **Ultima actualizacion:** 2026-02-11

---

## Stack Tecnologico

- **React 18** + TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Recharts** - Charts
- **Lucide React** - Icons
- **Axios** - HTTP client
- **Cloudflare Pages** - Hosting del scanner
- **Cloudflare Worker** - Router `/scanner*`

---

## Produccion (estado actual)

El **scanner** se sirve desde **Cloudflare Pages** bajo `/scanner/` y el **home** se sirve desde la **VPS**.

**Scanner (Pages + Worker)**
- **URL:** https://54strategydigital.com/scanner/
- **Pages origin:** proyecto Pages (ver `DEPLOY_PAGES_SCANNER_BASEPATH.md`)
- **Worker:** `scanner-router` proxya `/scanner*` y añade `x-scanner-worker: 1`

**Home (VPS)**
- **URL:** https://54strategydigital.com/
- **Docroot:** `/var/www/webapp` (Nginx)
- **API:** https://54strategydigital.com/api/

### Configuracion Produccion (Pages)

**.env.production:**
```bash
VITE_API_BASE_URL=https://54strategydigital.com
```

---

## Desarrollo Local (scanner)

### Requisitos
- Node.js 18+
- npm

### Instalacion
```bash
npm install
```

### Desarrollo
```bash
npm run dev
# http://localhost:8080/
```

Si no tienes el backend corriendo en local, usa proxy a produccion (sin CORS):
```bash
npm run dev:remote
# http://localhost:8080/scanner/
```

### Build
```bash
npm run build
# Output: dist/
```

---

## Estructura

```
frontend/
├── src/
│   ├── components/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
public/
scanner-router/
```

---

## Docs clave (contexto rápido)

- `WEBAPP_CONTEXT.md` — contexto general del módulo webapp
- `VENUE_INTEGRATION_MASTER.md` — manual end-to-end para integrar una venue nueva
- `DEPLOY_PAGES_SCANNER_BASEPATH.md` — deploy Pages
- `UPGRADE_ARBITRABLE_SYMBOLS.md` — registro canónico de símbolos (backend)
- `UPGRADE_BACKEND.md` — cambios recientes backend + DB

---

## Verificación en producción (con SSL self‑signed en origin)

Desde tu terminal:
```bash
curl -k -I https://54strategydigital.com/scanner/ | egrep -i "x-scanner-worker|server|cache-control|cf-ray"
```
Esperado:
- `x-scanner-worker: 1`
- `server: cloudflare`

Assets cache:
```bash
curl -k -I https://54strategydigital.com/scanner/assets/index-*.js
```
Esperado:
- `Cache-Control: public, max-age=31536000, immutable`

---

## Despliegue

### Build y Deploy
```bash
# Local: build
cd webapp/frontend
npm run build

# Deploy a VPS
SSH_AUTH_SOCK="" rsync -avz -e "ssh -i ~/.ssh/vps_key" \
  dist/ root@72.61.198.77:/var/www/html/
```

### Verificar
```bash
# En VPS
curl -s https://54strategydigital.com/ | head -20
```

---

## Features

### Opportunities Scanner
- Oportunidades de arbitraje en tiempo real
- Filtro por APR minimo
- Vista detallada por simbolo
- 4 venues: Hyperliquid, Lighter, Pacifica, Extended

### Funding Rates Table
- Rates de todos los venues
- Ordenamiento por columnas
- Filtros por simbolo/exchange

### Profit Calculator
- Simulador de profit
- Calculo de fees
- ROI y APR estimados

### Symbol Detail (Scanner)
- Nuevo panel resumen superior estilo "dusk panel" en el detalle de simbolo (`/scanner/s/:symbol`).
- Nuevo timeframe `3d` en el grafico de Funding Spread.
  - Implementacion UI: usa datos `7d` y recorta a las ultimas 72h.
- Zoom in / zoom out unificado para:
  - Funding Spread (APR)
  - Funding Rates (Short vs Long)
  - Price Spread History
- Reordenado visual:
  - `Price Spread History` sube al bloque intermedio principal.
  - `Profit Simulator` se mueve junto a `Open Interest Analysis` (derecha en desktop).
- Ajustes de legibilidad:
  - Mejora visual de cards AVG en el panel superior.
  - Mejora visual del grafico `Funding Rates (Short vs Long)`.
  - Se elimina la frase auxiliar bajo el bloque de imbalance de OI.

---

## Troubleshooting

### "Backend API Offline"
1. Verificar backend corriendo: `pgrep -f 'uvicorn.*8001'`
2. Limpiar cache: Ctrl+Shift+R
3. Probar en incognito

### Build errors
```bash
rm -rf node_modules package-lock.json
npm install
```

---

Ver `../README.md` para documentacion completa del webapp.
