# UPGRADE_BACKEND.md

> **Scope:** Webapp backend + DB + nginx optimizations
> **Goal:** Reduce latency, keep accuracy, preserve CWV (no frontend regression)
> **Last update:** 2026-02-05

---

## Cambios Aplicados

### 0) Registro canónico de símbolos arbitrables + HIP‑3 dinámico

- **Tabla canónica:** `arbitrable_symbols` (ver `webapp/sql/arbitrable_symbols.sql`).
- **Collector:** upsert por ciclo con `(symbol_base, venue, dex_name)` y `last_seen`.
- **Backend:** usa `arbitrable_symbols` para filtrar símbolos activos y compara por `base_symbol`.
- **HIP‑3 DEX list:** dinámica (usa `get_hip3_dexes`), fallback a `xyz/flx/vntl/hyna/km/cash`.

**Archivos:**  
`webapp/sql/arbitrable_symbols.sql`  
`tracker_funding_strategy_v2/data_collector/market_collector.py`  
`webapp/backend/services/timescale_service.py`  
`webapp/backend/adapters/public_rates.py`  
`webapp/backend/api/routes/hip3.py`

### 1) Canonical pairs + ABS spread (Timescale)

- **Problema:** oportunidades válidas desaparecían cuando el orden canónico dejaba `net_apr` negativo.
- **Fix:** `ABS(l1.apr - l2.apr) >= min_apr` en `get_opportunities_with_history`.

**Archivo:**  
`webapp/backend/services/timescale_service.py`

---

### 2) Search exacto / ILIKE fallback

- Si el símbolo existe -> usa `symbol = X` (más rápido).
- Si no existe -> usa `ILIKE`.

**Archivo:**  
`webapp/backend/services/timescale_service.py`

---

### 3) Históricos limitados a venues relevantes

- `hist_24h / hist_7d / hist_30d` ahora consultan solo `(symbol, venue, dex_name)` presentes en oportunidades reales (`opps_venues`).

**Archivo:**  
`webapp/backend/services/timescale_service.py`

---

### 3b) Fix 0.0% en 7d/30d (dex_name NULL)

- **Problema:** `dex_name NULL` no matcheaba en el `IN (...)` y dejaba los históricos en 0.0%.
- **Fix:** normalización con `COALESCE(dex_name, '')` tanto en `opps_venues` como en los joins/filters de históricos.

**Archivo:**  
`webapp/backend/services/timescale_service.py`

---

### 3c) Bounding de símbolos (evitar timeouts en `/api/opportunities`)

- **Síntoma:** `/api/opportunities` podía tardar 20s+ (timeouts en móvil / primer load frío) cuando el dataset creció.
- **Causa raíz:** el `CROSS JOIN latest l1 x latest l2` escalaba con demasiados símbolos en la CTE `latest_raw`.
- **Fix:** introducir `candidate_symbols` (spread max-min por símbolo) y limitar el conjunto antes del self-join.

**Archivo:**  
`webapp/backend/services/timescale_service.py`

Validación rápida (origen, sin nginx):
```bash
curl -s -o /dev/null -w 'time_total=%{time_total}\n' \
  'http://127.0.0.1:8001/api/opportunities?limit=80'
```

---

### 4) Continuous aggregate `fr_1h_agg`

Materialized view para promedios por hora (reduce costo de agregados):

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS fr_1h_agg
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS bucket,
       symbol, venue, dex_name,
       AVG(funding_rate_1h) AS avg_rate_1h
FROM market_snapshots_5m
GROUP BY bucket, symbol, venue, dex_name;

CREATE INDEX IF NOT EXISTS fr_1h_agg_symbol_venue_dex_bucket
ON fr_1h_agg (symbol, venue, dex_name, bucket DESC);

SELECT add_continuous_aggregate_policy(
  'fr_1h_agg',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

**Uso en query:**  
Los agregados 24h/7d/30d ahora leen de `fr_1h_agg`.

---

### 5) Endpoint `/api/opportunities/symbol/{symbol}`

- Ahora usa TimescaleDB cuando está disponible.
- Soporta `include_negative`, `require_oi`, `oi_window_minutes`, `active_window_minutes`.

**Archivo:**  
`webapp/backend/api/routes/opportunities_integrated.py`

---

### 6) nginx micro-cache añadido

Ahora cachea:
- `/api/opportunities`
- `/api/opportunities/symbol/*`

TTL: 60s, stale-while-revalidate 300s.

**Archivo VPS:**  
`/etc/nginx/sites-enabled/54strategydigital.com`

---

### 7) HIP-3 detail: dex-aware + evitar filtros agresivos

- **Problema:** los endpoints de detalle para HIP-3 devolvían datos incompletos cuando solo una pata tenía `dex_name` (el filtro `dex_name IN (...)` eliminaba venues no-HIP3).
- **Fix:** solo aplicar `dex_names` en Timescale cuando **ambas** patas son HIP-3; si solo una pata es HIP-3, no filtrar por dex.
- **Extra:** auto-resolver `dex_name` si se pide detalle de Hyperliquid sin dex y existe un único DEX activo para el símbolo.
- **Salida:** `dex_name` se incluye en `exchange_details` para mostrar la procedencia (xyz/flx/vntl/etc).

**Archivos:**  
`webapp/backend/api/routes/symbol_detail.py`  
`webapp/backend/services/timescale_service.py`

---

### 7b) Symbol Detail Stats: incluir HIP-3 dexes (flx/hyna/vntl/...)

- **Síntoma:** en el detalle (`All Venue Combinations`) faltaban combinaciones como:
  - short `hyperliquid (flx)` vs long `variational/extended/pacifica/...`
- **Causa raíz:** `get_venue_comparison()` y `get_funding_stats()` agregaban solo por `venue` y requerían `symbol = X`,
  así que ignoraban filas HIP-3 almacenadas como `dex:SYMBOL` y colapsaban `dex_name`.
- **Fix:** hacer `dex_name`-aware y, cuando se consulta por símbolo base, incluir también `split_part(symbol, ':', 2) = base`.
  El endpoint `/api/symbol-detail/stats/{symbol}` ahora devuelve `dex_name_short/dex_name_long`.

**Archivos (VPS):**  
`webapp/backend/services/timescale_service.py`  
`webapp/backend/api/routes/symbol_detail.py`

---

### 9) HIP-3 cache prioritario (primer load rápido)

- **Problema:** primer filtro HIP‑3 era lento porque el backend ignoraba el cache si faltaba histórico
  y hacía fetch a la API pública (multi‑DEX).
- **Fix:** permitir usar el cache local fresco y además soportar `search` y `top_n > 1`
  desde archivo, para no perder combinaciones legítimas al filtrar (ej: `hyna:SUI <-> ethereal:SUI`).

**Archivo:**  
`webapp/backend/api/routes/opportunities_integrated.py`

---

### 9b) `/api/opportunities` debe incluir HIP-3 aunque Timescale devuelva 0

- **Síntoma:** `search=XMR` devolvía 0 porque Timescale no puede cruzar `dex:SYMBOL` con `SYMBOL` (son `symbol` distintos),
  y el endpoint hacía `return` antes de agregar HIP-3.
- **Fix:** mover el early-return para que HIP-3 se añada siempre; si solo hay HIP-3, `source = hip3`.
- **Extra:** cuando `search` está presente, subir `hip3_top_n` efectivo (por defecto a `50`) para no perder combinaciones
  en símbolos con muchas DEXs HIP-3.

**Archivo (VPS):**  
`webapp/backend/api/routes/opportunities_integrated.py`

---

### 10) Warm-cache automático (primer load sin “offline”)

- **Problema:** primer load (cache frío) podía tardar 20–25s y el frontend marcaba backend offline.
- **Fix:** timer en VPS que golpea `/api/opportunities` y `/api/opportunities?hip3_filter=hip3`
  para mantener el micro‑cache caliente.

**Archivos VPS:**  
`/etc/systemd/system/webapp-warm-cache.service`  
`/etc/systemd/system/webapp-warm-cache.timer`

---

### 11) Retry/backoff frontend

- **Problema:** un MISS inicial podía fallar y requerir refresh.
- **Fix:** 3 reintentos con backoff (600ms, 1200ms, 2000ms) en el fetch principal.

**Archivo:**  
`webapp/frontend/src/components/OpportunitiesScanner.tsx`

---

### 8) “Recently listed” con hourly aggregates

- **Problema:** el umbral antiguo (1500) marcaba como “recently listed” símbolos activos con `fr_1h_agg`.
- **Fix:** nuevo umbral `MIN_SAMPLES_7D = 120` (≈7 días con 1h buckets + buffer).

**Archivos:**  
`webapp/backend/api/routes/opportunities_integrated.py`  
`webapp/frontend/src/components/OpportunitiesScanner.tsx`

---

### 12) Ethereal: backfill histórico para eliminar "Recently listed"

- **Problema:** al activar una venue nueva (Ethereal), `samples_7d` era bajo y la UI la marcaba como "Recently listed".
- **Fix:** backfill de funding histórico (30-35d) en `market_snapshots_5m` y refresh explícito de `fr_1h_agg`.

Refs:
- Script: `tracker_funding_strategy_v2/scripts/backfill_ethereal_funding.py`
- Refresh cagg:
```bash
sudo -u postgres psql -d trading_data -Atc \
  "CALL refresh_continuous_aggregate('fr_1h_agg', NOW() - INTERVAL '35 days', NOW());"
```

## Validaciones

### 1) Datos correctos para 2Z pacifica↔variational

```bash
curl -s 'http://127.0.0.1:8001/api/opportunities/symbol/2Z?include_negative=true'
```

### 2) Latencia search (origen)

```bash
curl -s -o /dev/null -w 'time_total=%{time_total}\n' \
  'http://127.0.0.1:8001/api/opportunities?search=2Z&include_negative=true&limit=50'
```

---

## Riesgos / Consideraciones

- `/api/opportunities` sigue siendo pesado **en origen** sin cache; en producción se amortigua con nginx + Cloudflare.
- Continuous aggregates dependen de refresco (policy cada 1h).

---

## Próximos Pasos

1) Observabilidad de cache-hit (Nginx) + timings por endpoint.
2) Optimización adicional con background warm-cache si necesario.
3) Auditoría del frontend para CWV (bundle split y lazy charts).
