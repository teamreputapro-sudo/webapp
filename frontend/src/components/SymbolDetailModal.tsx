import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Activity, DollarSign, Download, Info, Flame, BarChart3 as BarChartIcon } from 'lucide-react';
import { Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import axios from 'axios';
import { buildApiUrl } from '../lib/apiBase';

// Generic opportunity interface that matches both ArbitrageOpportunity and legacy Opportunity
interface OpportunityLike {
  symbol: string;
  net_apr?: number;
  gross_apr?: number;
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
  funding_rate: number;
  apr: number;
  maker_fee: number;
  taker_fee: number;
  volume_24h: string;
  open_interest: string;
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
  mean_apr: number;
  median_apr: number;
  sharpe_ratio: number;
  positive_rate: number;
  score: number;
  category: string;
  samples: number;
}

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
const CACHE_TTL_MS = 120 * 1000;

const getCacheKey = (
  symbol: string,
  timeframe: string,
  venues: { short: string; long: string; dexShort?: string | null; dexLong?: string | null } | null
): string => {
  if (!venues) return `${symbol}|${timeframe}|_all`;
  return `${symbol}|${timeframe}|${venues.short}|${venues.long}|${venues.dexShort || ''}|${venues.dexLong || ''}`;
};

export default function SymbolDetailModal({ symbol, opportunity, onClose, mode = 'modal' }: SymbolDetailModalProps) {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '15d' | '31d'>('24h');
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [exchangeInfo, setExchangeInfo] = useState<ExchangeInfo[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshot | null>(null);
  const [symbolStats, setSymbolStats] = useState<SymbolStats[]>([]);
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

  useEffect(() => {
    fetchSymbolData();
    const interval = setInterval(fetchLiveData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [symbol, timeframe, selectedVenues]);

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
      // Build history URL with optional venue params for fixed spread calculation
      let historyUrl = buildApiUrl(`/api/symbol-detail/history/${symbol}?timeframe=${timeframe}`);
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

      // Fetch all data in parallel from real API
      const [historyRes, exchangesRes, snapshotRes, statsRes] = await Promise.allSettled([
        axios.get(historyUrl),
        axios.get(exchangesUrl),
        axios.get(snapshotUrl),
        axios.get(buildApiUrl(`/api/symbol-detail/stats/${symbol}`))
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
      const response = await axios.get(snapshotUrl);
      if (response.data) {
        setLiveSnapshot(response.data);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      window.open(buildApiUrl(`/api/symbol-detail/export/${symbol}?timeframe=${timeframe}&format=csv`), '_blank');
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  // Get unique venue combinations from historical data
  const getVenueCombinations = () => {
    const combinations = new Set<string>();
    historicalData.forEach(d => {
      combinations.add(`${d.venue_short}|${d.venue_long}`);
    });
    return Array.from(combinations).map(c => {
      const [short, long] = c.split('|');
      return { short, long };
    });
  };

  // Filter historical data by selected venues
  const filteredHistoricalData = selectedVenues
    ? historicalData.filter(d =>
      d.venue_short === selectedVenues.short && d.venue_long === selectedVenues.long
    )
    : historicalData;

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

  const getSpreadColor = (spreadBps: number) => {
    if (spreadBps < 10) return 'text-green-400';
    if (spreadBps < 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getOISizeBadge = (oi?: number): { label: string; color: string } => {
    if (!oi || oi <= 0) return { label: '—', color: 'text-gray-400' };
    if (oi < 1_000_000) return { label: 'Low OI', color: 'text-orange-400' };
    if (oi < 10_000_000) return { label: 'Medium OI', color: 'text-blue-400' };
    return { label: 'High OI', color: 'text-gray-400' };
  };

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
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
            <p className="text-gray-400 text-sm mt-1">Funding Rate Analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
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
                  <div className="flex items-center gap-4">
                    {/* Venue selector */}
                    {venueCombinations.length > 1 && (
                      <select
                        value={selectedVenues ? `${selectedVenues.short}|${selectedVenues.long}` : ''}
                        onChange={(e) => {
                          const [short, long] = e.target.value.split('|');
                          setSelectedVenues({ short, long });
                        }}
                        className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                      >
                        {venueCombinations.map((v, idx) => (
                          <option key={idx} value={`${v.short}|${v.long}`}>
                            {v.short} → {v.long}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      {(['24h', '7d', '15d', '31d'] as const).map((tf) => (
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
                    <button
                      onClick={handleExportCSV}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                      title="Export CSV"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {filteredHistoricalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={filteredHistoricalData.map(d => ({
                      ...d,
                      spread_positive: d.spread_apr >= 0 ? d.spread_apr : 0,
                      spread_negative: d.spread_apr < 0 ? d.spread_apr : 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return timeframe === '24h'
                            ? date.toLocaleTimeString('en-US', { hour: 'numeric' })
                            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
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
                {exchangeInfo
                  .filter(ex =>
                    liveSnapshot
                      ? (ex.name === liveSnapshot.venue_short || ex.name === liveSnapshot.venue_long)
                      : true
                  )
                  .slice(0, 2)
                  .map((exchange, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 ${exchange.type === 'short'
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
                          <span className="font-medium text-white">{exchange.name}</span>
                          <span className="text-xs text-gray-400 ml-2">({exchange.type})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Funding Rate:</div>
                        <div className={`text-sm font-bold ${getAPRColor(exchange.apr)}`}>
                          {(exchange.funding_rate * 100).toFixed(4)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">APR:</span>
                        <span className={`font-bold ${getAPRColor(exchange.apr)}`}>
                          {formatAPR(exchange.apr)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Taker fee:</span>
                        <span className="text-white">{exchange.taker_fee}%</span>
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
                        <span className="text-white">{liveSnapshot.price_spread_bps?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Updated: {new Date(liveSnapshot.last_update).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Row: Arbitrage Summary + Funding Delta Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Arbitrage Summary with Simulator */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" />
                  Profit Simulator
                </h3>

                <div className="space-y-4">
                  {/* Show venue info from stats or snapshot */}
                  {(liveSnapshot || symbolStats.length > 0) && (
                    <div className="flex items-center gap-3 text-sm">
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

                  {/* Current APR info */}
                  <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Spread APR:</span>
                      <span className={`font-bold ${getAPRColor(liveSnapshot?.funding_delta_apr || 0)}`}>
                        {liveSnapshot ? formatAPR(liveSnapshot.funding_delta_apr) : 'N/A'}
                      </span>
                    </div>
                    {opportunity?.apr_7d !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg APR (7 days):</span>
                        <span className={`font-bold ${getAPRColor(opportunity.apr_7d)}`}>
                          {opportunity.apr_7d.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {opportunity?.apr_30d !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg APR (30 days):</span>
                        <span className={`font-bold ${getAPRColor(opportunity.apr_30d)}`}>
                          {opportunity.apr_30d.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Est. Fees (entry+exit):</span>
                      <span className="text-white">~0.2%</span>
                    </div>
                  </div>

                  {/* Simulator */}
                  <div className="mt-4">
                    <div className="mb-4">
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

                    <div className="mb-4">
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

                    {simulation ? (
                      <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                          <span>Using APR: {simulation.netApr?.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Funding Collected:</span>
                          <span className="text-green-400">
                            +${simulation.fundingPayment.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Entry Fees:</span>
                          <span className="text-red-400">
                            -${simulation.entryFees.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Exit Fees:</span>
                          <span className="text-red-400">
                            -${simulation.exitFees.toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-semibold">Net Profit:</span>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${simulation.netProfit > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
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

              {/* Funding Rates by Venue Chart */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Funding Rates (Short vs Long)
                  </h3>
                </div>

                {filteredHistoricalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredHistoricalData.slice(-30)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `${(value * 10000).toFixed(0)}bp`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#F3F4F6' }}
                        formatter={(value: number, name: string) => [
                          `${(value * 100).toFixed(4)}%`,
                          name === 'rate_short' ? `Short (${selectedVenues?.short || ''})` :
                            name === 'rate_long' ? `Long (${selectedVenues?.long || ''})` : name
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="rate_short"
                        fill="#EF4444"
                        radius={[2, 2, 0, 0]}
                        name="Short Rate"
                      />
                      <Bar
                        dataKey="rate_long"
                        fill="#10B981"
                        radius={[2, 2, 0, 0]}
                        name="Long Rate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    No rate data available
                  </div>
                )}
              </div>
            </div>

            {/* Price Spread & OI Analysis Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Spread Historical Chart */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Price Spread History</h3>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-700 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <p className="font-semibold mb-1">Price Spread</p>
                      <p>Price difference between venues:</p>
                      <p className="mt-2 text-green-400">&lt;10 bps = Excellent</p>
                      <p className="text-yellow-400">10-30 bps = Acceptable</p>
                      <p className="text-red-400">&gt;30 bps = High risk</p>
                    </div>
                  </div>
                </div>

                {filteredHistoricalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={filteredHistoricalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return timeframe === '24h'
                            ? date.toLocaleTimeString('en-US', { hour: 'numeric' })
                            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
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
                        formatter={(value: number) => [`${value.toFixed(1)} bps`, 'Spread']}
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

              {/* OI Metrics Card */}
              <div className="bg-gray-800 rounded-xl p-6">
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

                {opportunity?.min_oi ? (
                  <div className="space-y-4">
                    {/* OI Summary */}
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400">Min OI (Bottleneck)</span>
                        <div className="flex items-center gap-2">
                          {getOISizeBadge(opportunity.min_oi).label.includes('Low') && (
                            <Flame className="w-4 h-4 text-orange-400" />
                          )}
                          <span className={`font-mono font-bold ${getOISizeBadge(opportunity.min_oi).color}`}>
                            {formatOI(opportunity.min_oi)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getOISizeBadge(opportunity.min_oi).label.includes('Low') ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-400'}`}>
                            {getOISizeBadge(opportunity.min_oi).label}
                          </span>
                        </div>
                      </div>

                      {/* OI by Side */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-red-400 uppercase">Short Venue OI</span>
                          </div>
                          <div className="font-mono text-lg text-white">
                            {formatOI(opportunity.oi_short)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {opportunity.exchange_short || opportunity.short_exchange}
                          </div>
                        </div>
                        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400 uppercase">Long Venue OI</span>
                          </div>
                          <div className="font-mono text-lg text-white">
                            {formatOI(opportunity.oi_long)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {opportunity.exchange_long || opportunity.long_exchange}
                          </div>
                        </div>
                      </div>

                      {/* Imbalance Indicator */}
                      {opportunity.oi_short && opportunity.oi_long && opportunity.oi_short > 0 && opportunity.oi_long > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">OI Imbalance</span>
                            {(() => {
                              const total = opportunity.oi_short + opportunity.oi_long;
                              const imbalance = (opportunity.oi_long - opportunity.oi_short) / total;
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
                          <p className="text-xs text-gray-500 mt-2">
                            Side with less OI may yield more points on DEXs.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Current Spread */}
                    {opportunity.spread_bps !== undefined && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Current Price Spread</span>
                          <div className="text-right">
                            <span className={`font-mono font-bold ${getSpreadColor(opportunity.spread_bps)}`}>
                              {opportunity.spread_bps.toFixed(1)} bps
                            </span>
                            <span className={`ml-2 font-mono ${getSpreadColor(opportunity.spread_bps)}`}>
                              ({(opportunity.spread_bps / 100).toFixed(2)}%)
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
                    <p className="text-xs mt-1">OI data requires TimescaleDB connection</p>
                  </div>
                )}
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
                          <td className="py-2 px-3 text-white">{stat.venue_short}</td>
                          <td className="py-2 px-3 text-white">{stat.venue_long}</td>
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
