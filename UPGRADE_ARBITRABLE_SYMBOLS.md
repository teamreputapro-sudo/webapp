# UPGRADE_ARBITRABLE_SYMBOLS.md

> **Scope:** Webapp (collector → DB → backend → frontend → Pages/Worker)
> **Goal:** Garantizar que **todos** los símbolos arbitrables aparezcan y se comparen contra **todas** las venues disponibles, incluyendo HIP‑3 por DEX (xyz/flx/vntl/hyna/km/cash).
> **Last update:** 2026-02-05

---

## Resumen ejecutivo

Hoy la “lista de símbolos arbitrables” **no existe como entidad canónica**. Se infiere de:

1) **Snapshots activos** en Timescale (`market_snapshots_5m`)  
2) **Filtros dinámicos** del backend (`active_window`, `topk_per_symbol`, `require_oi`, `venues`)  
3) **Cache HIP‑3** (JSON sidecar) y/o fetch directo de API pública  

Esto implica que **símbolos rentables pueden faltar** por:
- filtros agresivos (top‑K por símbolo, ventana de activo, OI),
- timings / race de collector,
- divergencia entre HIP‑3 cache y Timescale.

La solución robusta es **introducir un “registro canónico” de símbolos arbitrables** que el backend use como base, y que se actualice continuamente.

---

## Hallazgos por capa

### 1) Collector (data_collector)
**Fuente real de símbolos**: se detectan “en vivo” desde cada venue.
HIP‑3 se recoge por DEX en Hyperliquid y se escribe en cache:

- HIP‑3 DEXs en backend: `xyz, flx, vntl, hyna, km`  
- En tu requerimiento aparece **cash**: no está en código actual.

**Cache file HIP‑3**:
```
/opt/funding-arbitrage/data/hip3_opportunities.json
```

Problemas típicos:
- cache sin histórico (apr_7d/30d = 0, samples=1)
- DEX nuevo no mapeado → símbolos invisibles

### 2) DB (Timescale)
**Tabla clave:** `market_snapshots_5m`  
**HIP‑3:** símbolos prefijados `dex:symbol` y `dex_name` no nulo.

La DB es hoy la **única fuente completa** de símbolos arbitrables si:
- el collector escribe snapshots de todas las venues,
- la ventana de activo es suficiente.

### 3) Backend (opportunities)
Filtros que pueden **eliminar símbolos rentables**:
- `topk_per_symbol`: reduce venues antes del self‑join (ej. un venue queda fuera).
- `active_window_minutes`: si una venue no reporta reciente → símbolo fuera.
- `require_oi`: si OI nulo en ventana → símbolo fuera.
- `venues` filter: antes se aplicaba en memoria, ahora también en SQL (mejor).

**HIP‑3**
- DEX list hardcoded (`xyz/flx/vntl/hyna/km`).
- cache file se usa aunque no tenga histórico para acelerar el primer load.

### 4) Frontend / Pages
No filtra símbolos arbitrables por sí mismo, pero:
- la UI oculta “recently listed” si `samples_7d` debajo del umbral.
- los tiempos largos al primer load hacen parecer “missing”.

Worker/Pages **no afecta** la lista de símbolos, solo la entrega.

---

## Plan recomendado (canónico)

### Objetivo principal
Crear un **registro canónico de símbolos arbitrables** actualizado continuamente y usado en todo el flujo.

### 1) Tabla canónica (DB)
Nueva tabla:

```
arbitrable_symbols (
  symbol TEXT,
  venue TEXT,
  dex_name TEXT NULL,
  is_active BOOL,
  last_seen TIMESTAMP,
  source TEXT,
  PRIMARY KEY(symbol, venue, dex_name)
)
```

### 2) Población automática (collector)
Cada ciclo:
- Ingesta de snapshots → update `arbitrable_symbols`
- Para HIP‑3: registrar `(symbol_base, hyperliquid, dex_name)`
- Para venues normales: `(symbol, venue, NULL)`

### 3) Backend: uso del registro
En `/api/opportunities`:
- filtrar contra `arbitrable_symbols` (is_active=true)  
- luego hacer self‑join entre venues arbitrables de ese símbolo  
- elimina huecos por “top‑K arbitrario”

### 4) HIP‑3 DEX list dinámica
En vez de hardcode:
- usar `/api/hip3/dexes` para poblar `arbitrable_symbols`
- incluir `cash` si aparece en API

### 5) Frontend
El frontend no filtra; solo refleja:
- “recently listed” basado en samples real
- mostrar DEX en detail

---

## Prioridad de implementación

1. **Tabla canónica + ingest** (DB + collector)  
2. **Backend**: usar tabla en `get_opportunities_with_history`  
3. **HIP‑3**: DEX list dinámica (incluyendo cash)  
4. **Frontend**: mostrar fuente y estado de símbolo  

---

## Validaciones clave

1) **Completeness**
- Para un símbolo rentable conocido, debe aparecer en oportunidades.
- Comparar venues manualmente con DB snapshots.

2) **HIP‑3**
- Cada DEX (xyz/flx/vntl/hyna/km/cash) visible en backend.
- Detalle correcto con dex_name.

3) **Performance**
- `/api/opportunities` debe responder rápido (con cache + pre‑filter).

---

## Estado actual

✅ Tabla canónica `arbitrable_symbols` (ver `webapp/sql/arbitrable_symbols.sql`)  
✅ Collector upsert de símbolos arbitrables (por venue + dex)  
✅ Backend filtra oportunidades por `arbitrable_symbols` (activo + last_seen)  
✅ Base symbol canónica en queries para comparar venues (incluye HIP‑3 dex)  
✅ HIP‑3 DEX list dinámica (usa `/hip3/dexes`) con fallback a lista conocida (incluye `cash`)  
✅ Warm‑cache + retry ya aplicados  
✅ Venue filter empujado a SQL  

---

## Notas de despliegue (VPS)

1) Aplicar SQL (si aún no existe):
```
psql -d trading_data -f webapp/sql/arbitrable_symbols.sql
```

2) Permisos para el usuario del collector:
```
GRANT SELECT,INSERT,UPDATE,DELETE ON arbitrable_symbols TO trading_bot;
```

3) Reiniciar collector y backend:
```
systemctl restart data-collector.service webapp.service
```

4) Verificación rápida:
```
psql -d trading_data -c "select count(*) from arbitrable_symbols;"
```

---

## Resultado esperado

- Símbolos arbitrables completos (incluyendo HIP‑3)  
- No se pierden oportunidades por `topk` ni por OI nulo puntual  
- DEXs nuevos aparecen automáticamente si Hyperliquid los expone  
