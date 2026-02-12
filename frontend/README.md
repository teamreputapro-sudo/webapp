# Funding Arbitrage Frontend

> **Status:** EN PRODUCCION
> **URL:** https://54strategydigital.com/
> **Ultima actualizacion:** 2026-02-11

---

## Stack Tecnologico

- **React 18** + TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Recharts** - Charts
- **Lucide React** - Icons
- **Axios** - HTTP client

---

## Produccion

El frontend esta desplegado en:
- **URL:** https://54strategydigital.com/
- **Archivos:** `/var/www/html/` en VPS
- **API:** https://54strategydigital.com/api/

### Configuracion Produccion

**.env.production:**
```bash
VITE_API_URL=https://54strategydigital.com
VITE_WS_URL=wss://54strategydigital.com/ws
```

---

## Desarrollo Local

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
# http://localhost:5173
```

### Build
```bash
npm run build
# Output: dist/
```

---

## Estructura

```
src/
├── components/           # React components
│   ├── FundingRatesTable.tsx
│   ├── OpportunitiesScanner.tsx
│   └── ProfitCalculator.tsx
├── services/            # API clients
│   ├── api.ts          # REST API
│   └── websocket.ts    # WebSocket
├── types/              # TypeScript types
├── App.tsx             # Main app
├── main.tsx            # Entry point
└── index.css           # Global styles
```

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

### Symbol Detail (Scanner) - 2026-02-11
- Nuevo panel superior estilo "dusk panel" en detalle de simbolo.
- Timeframe `3d` agregado al grafico de Funding Spread (se obtiene desde `7d` y se recorta a 72h).
- Controles `zoom in` / `zoom out` compartidos en:
  - Funding Spread
  - Funding Rates (short vs long)
  - Price Spread History
- Reordenado del layout:
  - `Price Spread History` sube al bloque principal intermedio.
  - `Profit Simulator` se mueve junto a `Open Interest Analysis` (derecha en desktop).
- Ajustes de legibilidad:
  - Mejora visual de cards AVG en panel superior.
  - Mejora visual del grafico `Funding Rates (short vs long)`.
  - Se elimina la frase auxiliar bajo el bloque de imbalance de OI.

### Scanner/Detail Consistency - 2026-02-12
- `Price Spread` se muestra en formato dual en detalle: `bps` + `%` (header, live snapshot y tooltip de `Price Spread History`).
- El bloque de `Current Price Spread` usa el mismo valor live que la cabecera, evitando diferencias visuales.
- Seleccion de par en detalle conserva `venue + dex` para evitar mezclar patas HIP-3.
- Si falta una pata temporalmente en exchange info, se mantienen ambas cajas (`short` y `long`) con `N/A` en lugar de ocultar una.
- Cadencia unificada a 60s en frontend:
  - `OpportunitiesScanner` auto-refresh/caché local: `60s`.
  - `SymbolDetailModal` polling live + cachés derivados: `60s`.
- `3d Avg` en scanner pasa a usar `apr_3d` real de backend (ventana 72h) cuando está disponible.
  - Fallback: estimación desde `24h/7d` solo si `apr_3d` no existe.
- En backend, oportunidades HIP-3 usan `spread_bps` ejecutable con la misma fórmula de detalle:
  - `ask(long) - bid(short)` normalizado por `ask(long)`.
- Paridad scanner -> detalle (click-through):
  - En detalle, la cabecera ahora prioriza los valores del `opportunity` clicado (`spread_bps`, `net_apr`, `apr_24h`, `apr_3d`, `apr_7d`, `apr_30d`) para que coincidan con la fila del scanner.
  - Si no hay `opportunity` en estado de ruta (ej. apertura directa de URL), se usa fallback al snapshot/historial derivado como antes.

### Home Stability Hotfix - 2026-02-12
- Fix crítico en `LandingPage` (home en blanco):
  - Causa: `VENUES` tenía 6 entradas (incluyendo `ethereal`) y el layout 3D solo definía 5 posiciones.
  - Síntoma: runtime crash `Cannot read properties of undefined (reading 'z')`.
  - Solución:
    - Se agregó la 6ª posición para `ethereal`.
    - Se agregó fallback defensivo cuando falte una posición.

### Build Sync Guardrail - 2026-02-12
- Árbol canónico (nuevo): `src/`
  - Es el que usa `npm run build:scanner` y `npm run build:root`.
- Árbol espejo (legacy): `frontend/src/`
  - Se mantiene sincronizado, pero no es suficiente para producción si se toca en solitario.
- Se detectó un desfase entre ambos árboles que rompía `/scanner/s/:symbol` y mostraba fallback a home.
- Se re-sincronizaron los archivos de scanner/detail entre `frontend/src` y `src`.

### Performance & HIP-3 Coverage - 2026-02-12
- Frontend:
  - Scanner cancela requests en vuelo al cambiar filtros (evita solapamiento de llamadas).
  - Timeouts ajustados para evitar UI bloqueada.
  - Prefetch de páginas reducido a escenarios ligeros (`all` sin búsqueda), para bajar carga.
  - Detail evita recalcular 3d/7d/30d por API cuando ya vienen en `opportunity` del scanner para el mismo par.
- Backend:
  - `opportunities` usa caché de universo base (reutilizable entre filtros/paginación) para evitar recomputar fetch pesado en cada cambio UI.
  - En búsquedas por símbolo se amplía el pool HIP-3 para no perder mercados válidos por truncado top-N.
  - Dedupe de oportunidades por par (`symbol+legs+dex`) para consistencia de listado.

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
