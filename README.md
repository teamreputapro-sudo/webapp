# Funding Arbitrage Frontend

> **Status:** EN PRODUCCION
> **URL:** https://54strategydigital.com/
> **Ultima actualizacion:** 2025-12-15

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
