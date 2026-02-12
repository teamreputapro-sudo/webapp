import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Activity, DollarSign, Download, Info, Flame, ZoomIn, ZoomOut, BarChart3 as BarChartIcon } from 'lucide-react';
import { Line, LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import axios from 'axios';
import { buildApiUrl } from '../lib/apiBase';

// Generic opportunity interface that matches both ArbitrageOpportunity and legacy Opportunity
interface OpportunityLike {
  symbol: string;
  net_apr?: number;
  gross_apr?: number;
  apr_24h?: number;
  apr_3d?: number;
  exchange_short?: string;
  exchange_long?: string;
  short_exchange?: string;
  long_exchange?: string;
  apr_7d?: number;
  apr_30d?: number;
  spread_bps?: number;
  oi_short?: number;
  oi_long?: number;
  min_oi?: number;
  dex_name_short?: string | null;
  dex_name_long?: string | null;
}

interface SymbolDetailModalProps {
  symbol: string;
  opportunity?: OpportunityLike;
  onClose: () => void;
  mode?: 'modal' | 'page';
}

// Interfaces matching backend responses
interface HistoricalData {
  timestamp: string;
  venue_short: string;
  venue_long: string;
  spread_bps: number;
  spread_apr: number;
  rate_short: number;
  rate_long: number;
  delta_apr: number;
}

interface ExchangeInfo {
  name: string;
  type: 'short' | 'long';
  dex_name?: string | null;
  funding_rate: number;
  apr: number;
  maker_fee: number;
  taker_fee: number;
  volume_24h: string;
  open_interest: string;
  oi_timestamp?: string | null;
  oi_stale_seconds?: number | null;
  oi_stale?: boolean | null;
  last_update: string;
}

interface LiveSnapshot {
  funding_delta: number;
  funding_delta_apr: number;
  price_spread: number;
  price_spread_bps: number;
  venue_short: string;
  venue_long: string;
  last_update: string;
  is_live: boolean;
}

interface SymbolStats {
  symbol: string;
  venue_short: string;
  venue_long: string;
  dex_name_short?: string | null;
  dex_name_long?: string | null;
  mean_apr: number;
  median_apr: number;
  sharpe_ratio: number;
  positive_rate: number;
  score: number;
  category: string;
  samples: number;
}

type DisplayExchangeInfo = ExchangeInfo & {
  missing?: boolean;
};

type CacheEntry = {
  ts: number;
  historicalData: HistoricalData[];
  exchangeInfo: ExchangeInfo[];
  liveSnapshot: LiveSnapshot | null;
  symbolStats: SymbolStats[];
  selectedVenues?: {
    short: string;
    long: string;
    dexShort?: string | null;
    dexLong?: string | null;
  } | null;
};

const DETAIL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

const THREED_AVG_CACHE = new Map<string, { ts: number; avgApr3d: number | null }>();
const THREED_AVG_TTL_MS = 60 * 1000;
const LONGTERM_AVG_CACHE = new Map<string, { ts: number; avgApr7d: number | null; avgApr30d: number | null }>();
const LONGTERM_AVG_TTL_MS = 60 * 1000;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.5;

const getCacheKey = (
  symbol: string,
  timeframe: string,
  venues: { short: string; long: string; dexShort?: string | null; dexLong?: string | null } | null
): string => {
  if (!venues) return `${symbol}|${timeframe}|_all`;
  return `${symbol}|${timeframe}|${venues.short}|${venues.long}|${venues.dexShort || ''}|${venues.dexLong || ''}`;
};

const get3dKey = (
  symbol: string,
  venues: { short: string; long: string; dexShort?: string | null; dexLong?: string | null } | null
): string => {
  if (!venues) return `${symbol}|3d|_all`;
  return `${symbol}|3d|${venues.short}|${venues.long}|${venues.dexShort || ''}|${venues.dexLong || ''}`;
};

const getLongtermKey = (
  symbol: string,
  venues: { short: string; long: string; dexShort?: string | null; dexLong?: string | null } | null
): string => {
  if (!venues) return `${symbol}|31d|_all`;
  return `${symbol}|31d|${venues.short}|${venues.long}|${venues.dexShort || ''}|${venues.dexLong || ''}`;
};

export default function SymbolDetailModal({ symbol, opportunity, onClose, mode = 'modal' }: SymbolDetailModalProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '3d' | '7d' | '15d' | '31d'>('24h');
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [exchangeInfo, setExchangeInfo] = useState<ExchangeInfo[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshot | null>(null);
  const [symbolStats, setSymbolStats] = useState<SymbolStats[]>([]);
  const [avgApr3d, setAvgApr3d] = useState<number | null>(null);
  const [avgApr7dDerived, setAvgApr7dDerived] = useState<number | null>(null);
  const [avgApr30dDerived, setAvgApr30dDerived] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [simulationAmount, setSimulationAmount] = useState<number>(5000);
  const [simulationDays, setSimulationDays] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Initialize selectedVenues from opportunity if available
  const getInitialVenues = () => {
    const short = opportunity?.exchange_short || opportunity?.short_exchange;
    const long = opportunity?.exchange_long || opportunity?.long_exchange;
    if (short && long) {
      return {
        short,
        long,
        dexShort: opportunity?.dex_name_short || null,
        dexLong: opportunity?.dex_name_long || null
      };
    }
    return null;
  };
  const [selectedVenues, setSelectedVenues] = useState<{
    short: string;
    long: string;
    dexShort?: string | null;
    dexLong?: string | null;
  } | null>(getInitialVenues);

  const normVenue = (value?: string | null) => (value || '').trim().toLowerCase();
  const sameDex = (a?: string | null, b?: string | null) => (a || '') === (b || '');
  const selectedMatchesOpportunity = (() => {
    if (!selectedVenues) return false;
    const oppShort = opportunity?.exchange_short || opportunity?.short_exchange;
    const oppLong = opportunity?.exchange_long || opportunity?.long_exchange;
    if (!oppShort || !oppLong) return false;
    return (
      normVenue(selectedVenues.short) === normVenue(oppShort) &&
      normVenue(selectedVenues.long) === normVenue(oppLong) &&
      sameDex(selectedVenues.dexShort, opportunity?.dex_name_short || null) &&
      sameDex(selectedVenues.dexLong, opportunity?.dex_name_long || null)
    );
  })();

  useEffect(() => {
    fetchSymbolData();
    const interval = setInterval(fetchLiveData, 60000); // Update every 60s
    return () => clearInterval(interval);
  }, [symbol, timeframe, selectedVenues]);

  useEffect(() => {
    setZoomLevel(1);
  }, [symbol, timeframe, selectedVenues]);

  // Compute a real 3D average from history (last 72 hours).
  // We fetch 7d history in the background because the default timeframe is 24h (insufficient for a 3d window).
  useEffect(() => {
    const venues = selectedVenues;
    if (!venues) return;
    if (selectedMatchesOpportunity && typeof opportunity?.apr_3d === 'number' && Number.isFinite(opportunity.apr_3d)) {
      setAvgApr3d(opportunity.apr_3d);
      THREED_AVG_CACHE.set(get3dKey(symbol, venues), { ts: Date.now(), avgApr3d: opportunity.apr_3d });
      return;
    }
    const key = get3dKey(symbol, venues);
    const cached = THREED_AVG_CACHE.get(key);
    if (cached && Date.now() - cached.ts < THREED_AVG_TTL_MS) {
      setAvgApr3d(cached.avgApr3d);
      return;
    }

    const compute = async () => {
      try {
        let url = buildApiUrl(`/api/symbol-detail/history/${symbol}?timeframe=7d`);
        url += `&venue_short=${venues.short}&venue_long=${venues.long}`;
        if (venues.dexShort) url += `&dex_name_short=${encodeURIComponent(venues.dexShort)}`;
        if (venues.dexLong) url += `&dex_name_long=${encodeURIComponent(venues.dexLong)}`;
        const res = await axios.get(url, { timeout: 10000 });
        const data: HistoricalData[] = Array.isArray(res.data) ? res.data : [];

        const cutoff = Date.now() - 72 * 60 * 60 * 1000;
        const values = data
          .filter((d) => d.venue_short === venues.short && d.venue_long === venues.long)
          .filter((d) => {
            const ts = Date.parse(d.timestamp);
            return Number.isFinite(ts) && ts >= cutoff;
          })
          .map((d) => d.spread_apr)
          .filter((v) => Number.isFinite(v));

        const next = values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : null;
        THREED_AVG_CACHE.set(key, { ts: Date.now(), avgApr3d: next });
        setAvgApr3d(next);
      } catch {
        THREED_AVG_CACHE.set(key, { ts: Date.now(), avgApr3d: null });
        setAvgApr3d(null);
      }
    };

    compute();
  }, [symbol, selectedVenues, selectedMatchesOpportunity, opportunity?.apr_3d]);

  // Compute 7d / 30d averages from 31d history so header stats are available even when route state is partial.
  useEffect(() => {
    const venues = selectedVenues;
    if (!venues) return;
    if (selectedMatchesOpportunity) {
      const has7d = typeof opportunity?.apr_7d === 'number' && Number.isFinite(opportunity.apr_7d);
      const has30d = typeof opportunity?.apr_30d === 'number' && Number.isFinite(opportunity.apr_30d);
      if (has7d) setAvgApr7dDerived(opportunity!.apr_7d!);
      if (has30d) setAvgApr30dDerived(opportunity!.apr_30d!);
      if (has7d && has30d) {
        LONGTERM_AVG_CACHE.set(getLongtermKey(symbol, venues), {
          ts: Date.now(),
          avgApr7d: opportunity!.apr_7d!,
          avgApr30d: opportunity!.apr_30d!,
        });
        return;
      }
    }
    const key = getLongtermKey(symbol, venues);
    const cached = LONGTERM_AVG_CACHE.get(key);
    if (cached && Date.now() - cached.ts < LONGTERM_AVG_TTL_MS) {
      setAvgApr7dDerived(cached.avgApr7d);
      setAvgApr30dDerived(cached.avgApr30d);
      return;
    }

    const compute = async () => {
      try {
        let url = buildApiUrl(`/api/symbol-detail/history/${symbol}?timeframe=31d`);
        url += `&venue_short=${venues.short}&venue_long=${venues.long}`;
        if (venues.dexShort) url += `&dex_name_short=${encodeURIComponent(venues.dexShort)}`;
        if (venues.dexLong) url += `&dex_name_long=${encodeURIComponent(venues.dexLong)}`;
        const res = await axios.get(url, { timeout: 10000 });
        const data: HistoricalData[] = Array.isArray(res.data) ? res.data : [];
        const filtered = data.filter((d) => d.venue_short === venues.short && d.venue_long === venues.long);
        const now = Date.now();
        const cutoff7d = now - 7 * 24 * 60 * 60 * 1000;
        const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;

        const values7d = filtered
          .filter((d) => {
            const ts = Date.parse(d.timestamp);
            return Number.isFinite(ts) && ts >= cutoff7d;
          })
          .map((d) => d.spread_apr)
          .filter((v) => Number.isFinite(v));

        const values30d = filtered
          .filter((d) => {
            const ts = Date.parse(d.timestamp);
            return Number.isFinite(ts) && ts >= cutoff30d;
          })
          .map((d) => d.spread_apr)
          .filter((v) => Number.isFinite(v));

        const avg7d = values7d.length ? values7d.reduce((a, b) => a + b, 0) / values7d.length : null;
        const avg30d = values30d.length ? values30d.reduce((a, b) => a + b, 0) / values30d.length : null;
        LONGTERM_AVG_CACHE.set(key, { ts: Date.now(), avgApr7d: avg7d, avgApr30d: avg30d });
        setAvgApr7dDerived(avg7d);
        setAvgApr30dDerived(avg30d);
      } catch {
        LONGTERM_AVG_CACHE.set(key, { ts: Date.now(), avgApr7d: null, avgApr30d: null });
        setAvgApr7dDerived(null);
        setAvgApr30dDerived(null);
      }
    };

    compute();
  }, [symbol, selectedVenues, selectedMatchesOpportunity, opportunity?.apr_7d, opportunity?.apr_30d]);

  const fetchSymbolData = async () => {
    const cacheKey = getCacheKey(symbol, timeframe, selectedVenues);
    const cached = DETAIL_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setHistoricalData(cached.historicalData);
      setExchangeInfo(cached.exchangeInfo);
      setLiveSnapshot(cached.liveSnapshot);
      setSymbolStats(cached.symbolStats);
      if (!selectedVenues && cached.selectedVenues) {
        setSelectedVenues(cached.selectedVenues);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiTimeframe = timeframe === '3d' ? '7d' : timeframe;
      // Build history URL with optional venue params for fixed spread calculation
      let historyUrl = buildApiUrl(`/api/symbol-detail/history/${symbol}?timeframe=${apiTimeframe}`);
      if (selectedVenues) {
        historyUrl += `&venue_short=${selectedVenues.short}&venue_long=${selectedVenues.long}`;
        if (selectedVenues.dexShort) {
          historyUrl += `&dex_name_short=${encodeURIComponent(selectedVenues.dexShort)}`;
        }
        if (selectedVenues.dexLong) {
          historyUrl += `&dex_name_long=${encodeURIComponent(selectedVenues.dexLong)}`;
        }
      }

      // Build snapshot URL with optional venue params
      let snapshotUrl = buildApiUrl(`/api/symbol-detail/snapshot/${symbol}`);
      if (selectedVenues) {
        snapshotUrl += `?venue_short=${selectedVenues.short}&venue_long=${selectedVenues.long}`;
        if (selectedVenues.dexShort) {
          snapshotUrl += `&dex_name_short=${encodeURIComponent(selectedVenues.dexShort)}`;
        }
        if (selectedVenues.dexLong) {
          snapshotUrl += `&dex_name_long=${encodeURIComponent(selectedVenues.dexLong)}`;
        }
      }

      // Build exchanges URL with optional venue params
      let exchangesUrl = buildApiUrl(`/api/symbol-detail/exchanges/${symbol}`);
      if (selectedVenues) {
        exchangesUrl += `?venue_short=${selectedVenues.short}&venue_long=${selectedVenues.long}`;
        if (selectedVenues.dexShort) {
          exchangesUrl += `&dex_name_short=${encodeURIComponent(selectedVenues.dexShort)}`;
        }
        if (selectedVenues.dexLong) {
          exchangesUrl += `&dex_name_long=${encodeURIComponent(selectedVenues.dexLong)}`;
        }
      }

      // Build stats URL with optional venue params (for HIP-3 dex resolution)
      let statsUrl = buildApiUrl(`/api/symbol-detail/stats/${symbol}`);
      if (selectedVenues) {
        const statsParams = new URLSearchParams();
        if (selectedVenues.dexShort) {
          statsParams.set('dex_name_short', selectedVenues.dexShort);
        }
        if (selectedVenues.dexLong) {
          statsParams.set('dex_name_long', selectedVenues.dexLong);
        }
        const qs = statsParams.toString();
        if (qs) {
          statsUrl += `?${qs}`;
        }
      }

      // Fetch all data in parallel from real API
      const [historyRes, exchangesRes, snapshotRes, statsRes] = await Promise.allSettled([
        axios.get(historyUrl, { timeout: 12000 }),
        axios.get(exchangesUrl, { timeout: 8000 }),
        axios.get(snapshotUrl, { timeout: 8000 }),
        axios.get(statsUrl, { timeout: 8000 })
      ]);

      // Process historical data
      let nextSelectedVenues = selectedVenues;
      if (historyRes.status === 'fulfilled' && historyRes.value.data) {
        setHistoricalData(historyRes.value.data);
        // Auto-select venues from first data point
        if (historyRes.value.data.length > 0 && !selectedVenues) {
          const first = historyRes.value.data[0];
          nextSelectedVenues = { short: first.venue_short, long: first.venue_long };
          setSelectedVenues(nextSelectedVenues);
        }
      }

      // Process exchange info
      if (exchangesRes.status === 'fulfilled' && exchangesRes.value.data) {
        setExchangeInfo(exchangesRes.value.data);
      }

      // Process live snapshot
      if (snapshotRes.status === 'fulfilled' && snapshotRes.value.data) {
        setLiveSnapshot(snapshotRes.value.data);
      }

      // Process stats
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setSymbolStats(statsRes.value.data);
      }

      DETAIL_CACHE.set(cacheKey, {
        ts: Date.now(),
        historicalData: historyRes.status === 'fulfilled' && historyRes.value.data ? historyRes.value.data : [],
        exchangeInfo: exchangesRes.status === 'fulfilled' && exchangesRes.value.data ? exchangesRes.value.data : [],
        liveSnapshot: snapshotRes.status === 'fulfilled' && snapshotRes.value.data ? snapshotRes.value.data : null,
        symbolStats: statsRes.status === 'fulfilled' && statsRes.value.data ? statsRes.value.data : [],
        selectedVenues: nextSelectedVenues || undefined,
      });
    } catch (error) {
      console.error('Error fetching symbol data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      let snapshotUrl = buildApiUrl(`/api/symbol-detail/snapshot/${symbol}`);
      if (selectedVenues) {
        snapshotUrl += `?venue_short=${selectedVenues.short}&venue_long=${selectedVenues.long}`;
        if (selectedVenues.dexShort) {
          snapshotUrl += `&dex_name_short=${encodeURIComponent(selectedVenues.dexShort)}`;
        }
        if (selectedVenues.dexLong) {
          snapshotUrl += `&dex_name_long=${encodeURIComponent(selectedVenues.dexLong)}`;
        }
      }
      const response = await axios.get(snapshotUrl, { timeout: 6000 });
      if (response.data) {
        setLiveSnapshot(response.data);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const apiTimeframe = timeframe === '3d' ? '7d' : timeframe;
      window.open(buildApiUrl(`/api/symbol-detail/export/${symbol}?timeframe=${apiTimeframe}&format=csv`), '_blank');
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  // Get unique venue combinations from historical data
  const getVenueCombinations = () => {
    const combinations = new Map<string, {
      short: string;
      long: string;
      dexShort?: string | null;
      dexLong?: string | null;
    }>();

    symbolStats.forEach((s) => {
      const key = `${s.venue_short}|${s.venue_long}|${s.dex_name_short || ''}|${s.dex_name_long || ''}`;
      combinations.set(key, {
        short: s.venue_short,
        long: s.venue_long,
        dexShort: s.dex_name_short || null,
        dexLong: s.dex_name_long || null,
      });
    });

    historicalData.forEach((d) => {
      const carryCurrentDex =
        selectedVenues &&
        selectedVenues.short === d.venue_short &&
        selectedVenues.long === d.venue_long;
      const dexShort = carryCurrentDex ? (selectedVenues.dexShort || null) : null;
      const dexLong = carryCurrentDex ? (selectedVenues.dexLong || null) : null;
      const key = `${d.venue_short}|${d.venue_long}|${dexShort || ''}|${dexLong || ''}`;
      if (!combinations.has(key)) {
        combinations.set(key, {
          short: d.venue_short,
          long: d.venue_long,
          dexShort,
          dexLong,
        });
      }
    });

    return Array.from(combinations.values());
  };

  // Filter historical data by selected venues
  const filteredHistoricalData = selectedVenues
    ? historicalData.filter(d =>
      d.venue_short === selectedVenues.short && d.venue_long === selectedVenues.long
    )
    : historicalData;

  // 3d is served from 7d data and cropped locally to the last 72h.
  const timeframeHistoricalData = timeframe === '3d'
    ? filteredHistoricalData.filter((d) => {
      const ts = Date.parse(d.timestamp);
      return Number.isFinite(ts) && ts >= Date.now() - (72 * 60 * 60 * 1000);
    })
    : filteredHistoricalData;

  const chartData = (() => {
    if (!timeframeHistoricalData.length) return [];
    const visiblePoints = Math.max(16, Math.floor(timeframeHistoricalData.length / zoomLevel));
    return timeframeHistoricalData.slice(-visiblePoints);
  })();

  // Keep price spread chart aligned with the "current" snapshot value shown in header cards.
  const priceSpreadChartData = (() => {
    if (!chartData.length) return chartData;
    const liveBps = liveSnapshot?.price_spread_bps;
    if (liveBps === undefined || liveBps === null || !Number.isFinite(liveBps)) return chartData;
    const liveTs = liveSnapshot?.last_update;
    if (!liveTs) return chartData;

    const last = chartData[chartData.length - 1];
    if (last?.timestamp === liveTs) {
      return chartData.map((d, i) => (i === chartData.length - 1 ? { ...d, spread_bps: liveBps } : d));
    }

    return [...chartData, { timestamp: liveTs, spread_bps: liveBps }];
  })();

  const priceSpreadDisplayData = (() => {
    if (priceSpreadChartData.length < 8) return priceSpreadChartData;
    const absValues = priceSpreadChartData
      .map((d) => Math.abs(d.spread_bps))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (!absValues.length) return priceSpreadChartData;

    const percentile = (arr: number[], q: number) => {
      const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(q * (arr.length - 1))));
      return arr[idx];
    };

    const p95 = percentile(absValues, 0.95);
    const cap = Math.max(50, p95 * 1.5);

    return priceSpreadChartData.map((d, i) => {
      if (!Number.isFinite(d.spread_bps)) return d;
      if (i === priceSpreadChartData.length - 1) return d;
      const clipped = Math.max(-cap, Math.min(cap, d.spread_bps));
      return clipped === d.spread_bps ? d : { ...d, spread_bps: clipped };
    });
  })();

  const calculateSimulation = () => {
    // Use opportunity data or best stats
    // NOTA: opportunity.net_apr viene como porcentaje (ej: 72.68 = 72.68% APR anual)
    // NOTA: symbolStats.mean_apr TAMBIÉN viene como porcentaje (ej: 91.54 = 91.54% APR anual)
    let netApr = opportunity?.net_apr;

    if (!netApr && symbolStats.length > 0) {
      // Find best positive opportunity from stats
      const bestStats = symbolStats.find(s => s.mean_apr > 0 && s.category !== 'REJECT');
      if (bestStats) {
        // mean_apr ya viene como porcentaje desde el backend
        netApr = bestStats.mean_apr;
      }
    }

    if (!netApr || netApr <= 0) return null;

    // netApr es APR anual en porcentaje (ej: 72.68 = 72.68%)
    // dailyRate = APR anual / 365 días / 100 para convertir a decimal
    const dailyRate = netApr / 365 / 100;
    const fundingPayment = simulationAmount * dailyRate * simulationDays;

    // Fees: 0.05% maker por lado = 0.1% total por entrada + 0.1% total por salida = 0.2% total
    const entryFees = simulationAmount * 0.001; // 0.1% entry (ambos lados)
    const exitFees = simulationAmount * 0.001;  // 0.1% exit (ambos lados)
    const netProfit = fundingPayment - entryFees - exitFees;
    const roi = (netProfit / simulationAmount) * 100;

    return {
      fundingPayment,
      entryFees,
      exitFees,
      netProfit,
      roi,
      netApr,
    };
  };

  const simulation = calculateSimulation();
  const venueCombinations = getVenueCombinations();
  const selectedVenueValue = selectedVenues
    ? `${selectedVenues.short}|${selectedVenues.long}|${selectedVenues.dexShort || ''}|${selectedVenues.dexLong || ''}`
    : '';

  const formatAPR = (apr: number) => {
    const absApr = Math.abs(apr);
    if (absApr >= 1000) return `${apr.toFixed(0)}%`;
    if (absApr >= 100) return `${apr.toFixed(1)}%`;
    return `${apr.toFixed(2)}%`;
  };

  const getAPRColor = (apr: number) => {
    if (apr > 50) return 'text-green-400';
    if (apr > 0) return 'text-green-500';
    if (apr > -50) return 'text-red-500';
    return 'text-red-400';
  };

  const formatOI = (oi?: number): string => {
    if (!oi || oi <= 0) return '—';
    if (oi >= 1_000_000_000) return `$${(oi / 1_000_000_000).toFixed(1)}B`;
    if (oi >= 1_000_000) return `$${(oi / 1_000_000).toFixed(1)}M`;
    if (oi >= 1_000) return `$${(oi / 1_000).toFixed(0)}K`;
    return `$${oi.toFixed(0)}`;
  };

  const parseUSD = (value?: string | null): number | null => {
    if (!value) return null;
    const s = value.trim();
    if (!s || s === 'N/A' || s === '—') return null;
    const cleaned = s.replace(/\$/g, '').replace(/,/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  // When detail opens in a new tab, `opportunity` can be undefined.
  // Derive OI from exchangeInfo so the OI box still works.
  const shortEx = exchangeInfo.find(e => e.type === 'short');
  const longEx = exchangeInfo.find(e => e.type === 'long');
  const oiShort = parseUSD(shortEx?.open_interest) ?? opportunity?.oi_short ?? null;
  const oiLong = parseUSD(longEx?.open_interest) ?? opportunity?.oi_long ?? null;
  const minOi = oiShort && oiLong ? Math.min(oiShort, oiLong) : (oiShort || oiLong || opportunity?.min_oi || null);
  const hasOiData = !!(minOi && minOi > 0);

  const getSpreadColor = (spreadBps: number) => {
    return spreadBps >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const getOISizeBadge = (oi?: number): { label: string; color: string } => {
    if (!oi || oi <= 0) return { label: '—', color: 'text-gray-400' };
    if (oi < 1_000_000) return { label: 'Low OI', color: 'text-orange-400' };
    if (oi < 10_000_000) return { label: 'Medium OI', color: 'text-blue-400' };
    return { label: 'High OI', color: 'text-gray-400' };
  };

  const formatTimeTick = (value: string) => {
    const date = new Date(value);
    if (timeframe === '24h') return date.toLocaleTimeString('en-US', { hour: 'numeric' });
    if (timeframe === '3d') return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(MAX_ZOOM, Number((z * ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(MIN_ZOOM, Number((z / ZOOM_STEP).toFixed(2))));
  };

  const avgApr24h = (() => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const values = filteredHistoricalData
      .filter((d) => {
        const ts = Date.parse(d.timestamp);
        return Number.isFinite(ts) && ts >= cutoff;
      })
      .map((d) => d.spread_apr)
      .filter((v) => Number.isFinite(v));
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const finiteOrNull = (value: unknown): number | null => {
    if (typeof value !== 'number') return null;
    return Number.isFinite(value) ? value : null;
  };

  const currentNetApr = finiteOrNull(opportunity?.net_apr) ?? finiteOrNull(liveSnapshot?.funding_delta_apr) ?? avgApr3d ?? 0;
  // Keep header spread aligned with the clicked scanner row when available.
  const currentSpreadBps = finiteOrNull(opportunity?.spread_bps) ?? finiteOrNull(liveSnapshot?.price_spread_bps) ?? 0;
  const headerAvg24h = finiteOrNull(opportunity?.apr_24h) ?? avgApr24h;
  const headerAvg3d = finiteOrNull(opportunity?.apr_3d) ?? avgApr3d;
  const headerAvg7d = finiteOrNull(opportunity?.apr_7d) ?? avgApr7dDerived;
  const headerAvg30d = finiteOrNull(opportunity?.apr_30d) ?? avgApr30dDerived;
  const displayExchangeInfo: DisplayExchangeInfo[] = (() => {
    const shortVenue = selectedVenues?.short || liveSnapshot?.venue_short || opportunity?.exchange_short || opportunity?.short_exchange;
    const longVenue = selectedVenues?.long || liveSnapshot?.venue_long || opportunity?.exchange_long || opportunity?.long_exchange;
    const shortDex = selectedVenues?.dexShort ?? opportunity?.dex_name_short ?? null;
    const longDex = selectedVenues?.dexLong ?? opportunity?.dex_name_long ?? null;
    const norm = (v?: string | null) => (v || '').trim().toLowerCase();
    const sameDex = (a?: string | null, b?: string | null) => (a || '') === (b || '');

    const pick = (type: 'short' | 'long', venue?: string, dex?: string | null): ExchangeInfo | null => {
      if (!venue) return null;
      return (
        exchangeInfo.find((ex) => ex.type === type && norm(ex.name) === norm(venue) && sameDex(ex.dex_name, dex)) ||
        exchangeInfo.find((ex) => ex.type === type && norm(ex.name) === norm(venue)) ||
        null
      );
    };

    const placeholder = (type: 'short' | 'long', venue?: string, dex?: string | null): DisplayExchangeInfo => ({
      name: venue || (type === 'short' ? 'short venue' : 'long venue'),
      type,
      dex_name: dex || null,
      funding_rate: 0,
      apr: 0,
      maker_fee: 0,
      taker_fee: 0,
      volume_24h: 'N/A',
      open_interest: 'N/A',
      last_update: '',
      missing: true,
    });

    if (!shortVenue && !longVenue) {
      return exchangeInfo.slice(0, 2).map((ex) => ({ ...ex }));
    }

    return [
      pick('short', shortVenue, shortDex) || placeholder('short', shortVenue, shortDex),
      pick('long', longVenue, longDex) || placeholder('long', longVenue, longDex),
    ];
  })();

  const wrapperClass = mode === 'modal'
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    : 'min-h-screen bg-gray-900 flex items-start justify-center py-8 px-4';

  const panelClass = mode === 'modal'
    ? 'bg-gray-900 rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto'
    : 'bg-gray-900 rounded-xl max-w-7xl w-full overflow-y-visible';

  return (
    <div className={wrapperClass}>
      <div className={panelClass}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 z-10">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <div className="shrink-0 xl:min-w-[150px]">
              <h2 className="text-2xl font-bold text-white">{symbol}</h2>
              <p className="text-gray-400 text-sm mt-1">Funding Analysis</p>
            </div>

            <div className="flex-1 min-w-0 rounded-xl border border-cyan-900/30 bg-[#070b1c] px-4 py-3 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 rounded-lg border border-cyan-800/50 bg-cyan-900/10 px-4 py-3 text-center flex flex-col justify-center">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Net APR (Current)</div>
                  <div className={`font-mono text-3xl xl:text-4xl font-bold ${getAPRColor(currentNetApr)}`}>
                    {formatAPR(currentNetApr)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    as-of {liveSnapshot ? new Date(liveSnapshot.last_update).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>

                <div className="md:col-span-4 rounded-lg border border-blue-800/60 bg-blue-900/10 px-4 py-3 flex flex-col justify-center">
                  <div className="text-[10px] uppercase text-gray-400 tracking-wide">Price Spread</div>
                  <div className={`font-mono text-xl font-semibold ${getSpreadColor(currentSpreadBps)}`}>
                    {currentSpreadBps >= 0 ? '+' : ''}{currentSpreadBps.toFixed(1)} bps
                  </div>
                  <div className={`text-sm ${getSpreadColor(currentSpreadBps)}`}>
                    ({currentSpreadBps >= 0 ? '+' : ''}{(currentSpreadBps / 100).toFixed(2)}%)
                  </div>
                </div>

                <div className="md:col-span-4 grid grid-cols-2 gap-2">
                  {[
                    { label: '24h Avg', value: headerAvg24h },
                    { label: '3d Avg', value: headerAvg3d },
                    { label: '7d Avg', value: headerAvg7d },
                    { label: '30d Avg', value: headerAvg30d },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-2 text-center min-w-0">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide">{metric.label}</div>
                      <div className={`text-base font-mono font-semibold whitespace-nowrap ${metric.value !== undefined && metric.value !== null ? getAPRColor(metric.value) : 'text-gray-500'}`}>
                        {metric.value !== undefined && metric.value !== null ? `${metric.value.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="self-start xl:self-center p-2 hover:bg-gray-800 rounded-lg transition-colors border border-gray-700/70"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Top Row: Historical Chart + Exchange Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Historical Chart */}
              <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    {symbol} FUNDING SPREAD (APR %)
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* Venue selector */}
                    {venueCombinations.length > 1 && (
                      <select
                        value={selectedVenueValue}
                        onChange={(e) => {
                          const [short, long, dexShort, dexLong] = e.target.value.split('|');
                          setSelectedVenues({
                            short,
                            long,
                            dexShort: dexShort || null,
                            dexLong: dexLong || null,
                          });
                        }}
                        className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                      >
                        {venueCombinations.map((v, idx) => (
                          <option key={idx} value={`${v.short}|${v.long}|${v.dexShort || ''}|${v.dexLong || ''}`}>
                            {v.short}{v.dexShort ? ` (${v.dexShort})` : ''} → {v.long}{v.dexLong ? ` (${v.dexLong})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      {(['24h', '3d', '7d', '15d', '31d'] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${timeframe === tf
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= MIN_ZOOM}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-gray-300"
                        title="Zoom out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= MAX_ZOOM}
                        className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-gray-300"
                        title="Zoom in"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-400 ml-1">{zoomLevel.toFixed(1)}x</span>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                      title="Export CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData.map(d => ({
                      ...d,
                      spread_positive: d.spread_apr >= 0 ? d.spread_apr : 0,
                      spread_negative: d.spread_apr < 0 ? d.spread_apr : 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={formatTimeTick}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'spread_positive' || name === 'spread_negative') return null;
                          return [`${value.toFixed(2)}%`, 'Spread APR'];
                        }}
                      />
                      <ReferenceLine y={0} stroke="#ffffff" strokeDasharray="5 5" strokeWidth={1} label={{ value: '0%', fill: '#9CA3AF', fontSize: 10 }} />
                      <Area
                        type="monotone"
                        dataKey="spread_positive"
                        fill="#10B981"
                        fillOpacity={0.3}
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Positive"
                        legendType="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="spread_negative"
                        fill="#EF4444"
                        fillOpacity={0.3}
                        stroke="#EF4444"
                        strokeWidth={2}
                        name="Negative"
                        legendType="none"
                      />
                      <Line
                        type="monotone"
                        dataKey="spread_apr"
                        stroke="#ffffff"
                        strokeWidth={1}
                        strokeOpacity={0.5}
                        dot={false}
                        name="Spread APR"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    No historical data available for {symbol}
                  </div>
                )}
              </div>

              {/* Exchange Info Cards - filtered to match snapshot venues */}
              <div className="space-y-4">
                {displayExchangeInfo.map((exchange, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 ${exchange.missing
                      ? 'bg-gray-900/40 border border-gray-700'
                      : exchange.type === 'short'
                        ? 'bg-red-900 bg-opacity-30 border border-red-700'
                        : 'bg-green-900 bg-opacity-30 border border-green-700'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {exchange.type === 'short' ? (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        )}
                        <div>
                          <span className="font-medium text-white">
                            {exchange.name}
                            {exchange.dex_name ? ` • ${exchange.dex_name.toUpperCase()}` : ''}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">({exchange.type})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Funding Rate (1h):</div>
                        <div className={`text-sm font-bold ${exchange.missing ? 'text-gray-400' : getAPRColor(exchange.apr)}`}>
                          {exchange.missing ? 'N/A' : `${(exchange.funding_rate * 100).toFixed(4)}%`}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">APR:</span>
                        <span className={`font-bold ${exchange.missing ? 'text-gray-400' : getAPRColor(exchange.apr)}`}>
                          {exchange.missing ? 'N/A' : formatAPR(exchange.apr)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Taker fee:</span>
                        <span className="text-white">{exchange.missing ? 'N/A' : `${exchange.taker_fee}%`}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Live Snapshot */}
                {liveSnapshot && (
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 ${liveSnapshot.is_live ? 'bg-green-500' : 'bg-yellow-500'} rounded-full animate-pulse`}></div>
                      <span className="font-medium text-white">Live Snapshot</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Venues:</span>
                        <span className="text-white text-xs">
                          {liveSnapshot.venue_short} → {liveSnapshot.venue_long}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Funding Δ APR:</span>
                        <span className={`font-bold ${getAPRColor(liveSnapshot.funding_delta_apr)}`}>
                          {formatAPR(liveSnapshot.funding_delta_apr)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Spread (bps):</span>
                        <span className={`font-mono ${getSpreadColor(liveSnapshot.price_spread_bps || 0)}`}>
                          {Number.isFinite(liveSnapshot.price_spread_bps)
                            ? `${liveSnapshot.price_spread_bps >= 0 ? '+' : ''}${liveSnapshot.price_spread_bps.toFixed(2)} bps (${liveSnapshot.price_spread_bps >= 0 ? '+' : ''}${(liveSnapshot.price_spread_bps / 100).toFixed(3)}%)`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Updated: {new Date(liveSnapshot.last_update).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Row: Price Spread + Funding Rates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Spread Historical Chart */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Price Spread History</h3>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-700 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <p className="font-semibold mb-1">Price Spread</p>
                      <p>Executable taker spread: ask(long) - bid(short)</p>
                      <p className="mt-2 text-green-400">&lt;10 bps = Excellent</p>
                      <p className="text-yellow-400">10-30 bps = Acceptable</p>
                      <p className="text-red-400">&gt;30 bps = High risk</p>
                    </div>
                  </div>
                </div>

                {priceSpreadDisplayData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={priceSpreadDisplayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickFormatter={formatTimeTick}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `${value.toFixed(0)} bps`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                        formatter={(value: number) => [
                          `${value >= 0 ? '+' : ''}${value.toFixed(1)} bps (${value >= 0 ? '+' : ''}${(value / 100).toFixed(3)}%)`,
                          'Spread'
                        ]}
                      />
                      <ReferenceLine y={10} stroke="#10B981" strokeDasharray="3 3" label={{ value: '10 bps', fill: '#10B981', fontSize: 10 }} />
                      <ReferenceLine y={30} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: '30 bps', fill: '#F59E0B', fontSize: 10 }} />
                      <Area
                        type="monotone"
                        dataKey="spread_bps"
                        fill="#3B82F6"
                        fillOpacity={0.3}
                        stroke="#3B82F6"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    No spread data available
                  </div>
                )}
              </div>

              {/* Funding Rates by Venue Chart */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/60">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Funding Rates (Short vs Long)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Hourly funding rates (1h, bps) for the selected venue pair
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-600/50 bg-red-950/30 px-2 py-1 text-red-300">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Short
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/50 bg-emerald-950/30 px-2 py-1 text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Long
                    </span>
                  </div>
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickFormatter={formatTimeTick}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `${(value * 10000).toFixed(2)} bps`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value: number, name: string) => [
                          `${(value * 10000).toFixed(2)} bps (${(value * 100).toFixed(4)}%)`,
                          name === 'rate_short' ? `Short (${selectedVenues?.short || ''})` :
                            name === 'rate_long' ? `Long (${selectedVenues?.long || ''})` : name
                        ]}
                      />
                      <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />
                      <Line
                        dataKey="rate_short"
                        type="monotone"
                        stroke="#F87171"
                        strokeWidth={2.2}
                        dot={false}
                        name={`Short (${selectedVenues?.short || 'N/A'})`}
                      />
                      <Line
                        dataKey="rate_long"
                        type="monotone"
                        stroke="#34D399"
                        strokeWidth={2.2}
                        dot={false}
                        name={`Long (${selectedVenues?.long || 'N/A'})`}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-56 text-gray-400">
                    No rate data available
                  </div>
                )}
              </div>
            </div>

            {/* OI + Profit Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* OI Metrics Card */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/60 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Open Interest Analysis</h3>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-3 bg-gray-700 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <p className="font-semibold mb-1">Open Interest</p>
                      <div className="space-y-1">
                        <p className="text-orange-400">Low: &lt;$1M</p>
                        <p className="text-blue-400">Med: $1M-$10M</p>
                        <p className="text-gray-400">High: &gt;$10M</p>
                      </div>
                    </div>
                  </div>
                </div>

                {hasOiData ? (
                  <div className="space-y-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">Min OI (Bottleneck)</span>
                        <div className="flex items-center gap-2">
                          {getOISizeBadge(minOi || undefined).label.includes('Low') && (
                            <Flame className="w-4 h-4 text-orange-400" />
                          )}
                          <span className={`font-mono font-bold ${getOISizeBadge(minOi || undefined).color}`}>
                            {formatOI(minOi || undefined)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getOISizeBadge(minOi || undefined).label.includes('Low') ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-400'}`}>
                            {getOISizeBadge(minOi || undefined).label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-red-400 uppercase">Short Venue OI</span>
                          </div>
                          <div className="font-mono text-lg text-white">
                            {formatOI(oiShort || undefined)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedVenues?.short || opportunity?.exchange_short || opportunity?.short_exchange}
                          </div>
                        </div>
                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400 uppercase">Long Venue OI</span>
                          </div>
                          <div className="font-mono text-lg text-white">
                            {formatOI(oiLong || undefined)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedVenues?.long || opportunity?.exchange_long || opportunity?.long_exchange}
                          </div>
                        </div>
                      </div>

                      {(oiShort || 0) > 0 || (oiLong || 0) > 0 ? (
                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-2">OI Comparison</div>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart
                              data={[
                                { side: 'Short', oi: oiShort || 0 },
                                { side: 'Long', oi: oiLong || 0 },
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="side" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                              <YAxis
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                tickFormatter={(v) => {
                                  const n = Number(v);
                                  if (!Number.isFinite(n)) return '';
                                  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
                                  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                                  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
                                  return `${n.toFixed(0)}`;
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1F2937',
                                  border: '1px solid #374151',
                                  borderRadius: '0.5rem',
                                }}
                                formatter={(value: number) => [formatOI(value), 'Open Interest']}
                              />
                              <Bar dataKey="oi" fill="#60A5FA" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : null}

                      {oiShort && oiLong && oiShort > 0 && oiLong > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">OI Imbalance</span>
                            {(() => {
                              const total = oiShort + oiLong;
                              const imbalance = (oiLong - oiShort) / total;
                              const favoredSide = imbalance > 0.1 ? 'short' : imbalance < -0.1 ? 'long' : 'balanced';
                              return (
                                <div className="flex items-center gap-2">
                                  {favoredSide === 'short' && (
                                    <>
                                      <TrendingDown className="w-4 h-4 text-red-400" />
                                      <span className="text-red-400 text-sm font-mono">Short +{(Math.abs(imbalance) * 100).toFixed(0)}%</span>
                                    </>
                                  )}
                                  {favoredSide === 'long' && (
                                    <>
                                      <TrendingUp className="w-4 h-4 text-green-400" />
                                      <span className="text-green-400 text-sm font-mono">Long +{(Math.abs(imbalance) * 100).toFixed(0)}%</span>
                                    </>
                                  )}
                                  {favoredSide === 'balanced' && (
                                    <span className="text-gray-400 text-sm">Balanced</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {Number.isFinite(currentSpreadBps) && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Current Price Spread</span>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${getSpreadColor(currentSpreadBps)}`}>
                              {currentSpreadBps >= 0 ? '+' : ''}{currentSpreadBps.toFixed(1)} bps
                            </span>
                            <span className={`ml-2 font-mono ${getSpreadColor(currentSpreadBps)}`}>
                              ({currentSpreadBps >= 0 ? '+' : ''}{(currentSpreadBps / 100).toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <BarChartIcon className="w-12 h-12 mb-2 opacity-50" />
                    <p>No OI data available</p>
                    <p className="text-xs mt-1">OI data missing for this symbol/venue pair</p>
                  </div>
                )}
              </div>

              {/* Profit Simulator (moved next to OI) */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700/60 h-full">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" />
                  Profit Simulator
                </h3>

                <div className="space-y-4">
                  {(liveSnapshot || symbolStats.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Long on</span>
                        <span className="px-2 py-1 bg-green-900 text-green-400 rounded text-xs font-medium">
                          {liveSnapshot?.venue_long || symbolStats[0]?.venue_long || 'N/A'}
                        </span>
                      </div>
                      <span className="text-gray-400">×</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Short on</span>
                        <span className="px-2 py-1 bg-red-900 text-red-400 rounded text-xs font-medium">
                          {liveSnapshot?.venue_short || symbolStats[0]?.venue_short || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Spread APR:</span>
                      <span className={`font-bold ${getAPRColor(liveSnapshot?.funding_delta_apr || 0)}`}>
                        {liveSnapshot ? formatAPR(liveSnapshot.funding_delta_apr) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between" title="Computed from /api/symbol-detail/history (last 72 hours). This is an average, not the current snapshot.">
                      <span className="text-gray-400">Avg APR (72h):</span>
                      <span className={`font-bold ${avgApr3d !== null ? getAPRColor(avgApr3d) : 'text-gray-400'}`}>
                        {avgApr3d !== null ? `${avgApr3d.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    {headerAvg7d !== undefined && headerAvg7d !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg APR (7 days):</span>
                        <span className={`font-bold ${getAPRColor(headerAvg7d)}`}>
                          {headerAvg7d.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {headerAvg30d !== undefined && headerAvg30d !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg APR (30 days):</span>
                        <span className={`font-bold ${getAPRColor(headerAvg30d)}`}>
                          {headerAvg30d.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Est. Fees (entry+exit):</span>
                      <span className="text-white">~0.2%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Holding Period: {simulationDays} day{simulationDays > 1 ? 's' : ''}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="365"
                        value={simulationDays}
                        onChange={(e) => setSimulationDays(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Position Size (USD)
                      </label>
                      <input
                        type="number"
                        value={simulationAmount}
                        onChange={(e) => setSimulationAmount(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  {simulation ? (
                    <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Using APR: {simulation.netApr?.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Funding Collected:</span>
                        <span className="text-green-400">+${simulation.fundingPayment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Entry Fees:</span>
                        <span className="text-red-400">-${simulation.entryFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Exit Fees:</span>
                        <span className="text-red-400">-${simulation.exitFees.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Net Profit:</span>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${simulation.netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${simulation.netProfit.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">
                              ROI: {simulation.roi.toFixed(3)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-400 text-sm">
                      No profitable opportunity found for this symbol
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Table */}
            {symbolStats.length > 1 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  All Venue Combinations
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2 px-3">Short Venue</th>
                        <th className="text-left py-2 px-3">Long Venue</th>
                        <th className="text-right py-2 px-3">Mean APR</th>
                        <th className="text-right py-2 px-3">Sharpe</th>
                        <th className="text-right py-2 px-3">Score</th>
                        <th className="text-center py-2 px-3">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolStats.map((stat, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-white">
                            {stat.venue_short}{stat.dex_name_short ? ` (${stat.dex_name_short})` : ''}
                          </td>
                          <td className="py-2 px-3 text-white">
                            {stat.venue_long}{stat.dex_name_long ? ` (${stat.dex_name_long})` : ''}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${stat.mean_apr > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.mean_apr.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-right text-white font-mono">
                            {stat.sharpe_ratio.toFixed(1)}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono ${stat.score > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {stat.score.toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${stat.category === 'STABLE' ? 'bg-green-900/50 text-green-300' :
                              stat.category === 'AGGRESSIVE' ? 'bg-yellow-900/50 text-yellow-300' :
                                'bg-red-900/50 text-red-300'
                              }`}>
                              {stat.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
