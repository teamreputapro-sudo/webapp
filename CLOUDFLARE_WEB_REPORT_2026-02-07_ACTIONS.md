# Cloudflare Web Report (2026-02-07) - Lectura y mejoras aplicables

**Reporte:** `cloudflare web report 02-07.pdf`

## Hallazgo clave (LCP)

De la captura (pagina 2/4) se observa:

- LCP distribution: `Good 95%`, `Needs improvement 4%`, `Poor 1%`
- LCP percentiles:
  - `p50 = 960ms`
  - `p75 = 1,588ms`
  - `p90 = 2,140ms`
  - `p99 = 20,012ms`

Interpretacion:
- El sitio esta bien para la mayoria.
- El problema a atacar es la **cola larga** (p99): sesiones en movil/red lenta o picos de API/terceros que dejan la UI en blanco mucho tiempo.

## Cambios recomendados (prioridad)

### 1) Reducir "pantalla en blanco" durante calentamiento de API

- Mostrar skeleton (layout grande y estable) en vez de un spinner pequeno mientras carga el scanner.
- Esto mejora UX y evita que el LCP se dispare cuando el primer contenido "grande" aparece solo tras recibir datos.

Estado:
- Implementado skeleton de carga inicial en `frontend/src/components/OpportunitiesScanner.tsx`.

### 1.1) Arreglar rutas absolutas bajo `/scanner/`

Si el frontend vive bajo `/scanner/`, cualquier path absoluto tipo `/ktx2/...` se va al origin del root (VPS) y puede 404 o ir lento.

Estado:
- Corregido `KTX2Loader.setTranscoderPath('/ktx2/')` a `withBase('ktx2/')` en `frontend/src/components/LandingPage.tsx`.

## Hallazgos adicionales (INP y CLS)

De las capturas (p.3/4 y p.4/4):

**INP (Interaction to Next Paint)**
- Distribution: `Good 83%`, `Needs improvement 14%`, `Poor 3%`
- Esto sugiere que el JS no esta "mal" en general, pero hay margen en interacciones bajo carga (movil).

**CLS (Cumulative Layout Shift)**
- Distribution: `Good 14%`, `Needs improvement 3%`, `Poor 82%` (critico)
- Percentiles: `p50 ~0.563`, `p75 ~0.864`, `p90 ~0.907`, `p99 ~0.921`

Interpretacion:
- La web esta teniendo **cambios de layout masivos** (típicamente por banners/ads que aparecen tarde, contenido que empuja, o placeholders sin altura).

### 1.2) Fix directo para CLS: reservar altura de Ads y evitar inserciones tardias

Cambios aplicados:
- Los banners de ads (top y bottom) ahora **siempre reservan espacio** aunque `backendStatus` este en `checking/offline`, evitando que el contenido se mueva cuando el healthcheck termina.
  - `frontend/src/App.tsx`
- `AdBanner` ahora reserva altura responsive (`90px` mobile, `250px` desktop) y muestra un placeholder si no esta enabled.
  - `frontend/src/components/AdBanner.tsx`

### 2) Revisar outliers: API lenta o timeouts intermitentes

- Medir TTFB y total en:
  - `GET /scanner/`
  - `GET /api/opportunities`
  - `GET /api/symbol-detail/*`
- Si hay picos, agregar cache/timeout/retry con backoff y mostrar error claro con retry.

### 3) Mantener peso inicial bajo en movil

Heuristica:
- Bundle principal del scanner debe mantenerse < ~350KB minificado cuando sea posible.

Estado:
- El build del scanner genera chunks separados (LandingPage, SymbolDetailModal, LiveTradingChart, etc).

## Checks rapidos

```bash
curl -I https://54strategydigital.com/cdn-cgi/trace | egrep -i "server:|cf-ray:"
curl -I https://54strategydigital.com/scanner/ | egrep -i "cache-control|cf-cache-status|server:|x-scanner-worker|cf-ray"
curl -I https://54strategydigital.com/scanner/assets/index-*.js | egrep -i "cache-control|cf-cache-status|server:|cf-ray"
```
