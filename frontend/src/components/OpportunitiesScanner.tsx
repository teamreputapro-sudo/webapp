/**
 * Opportunities Scanner Component
 *
 * Displays detected arbitrage opportunities with:
 * - Clean, professional financial terminal aesthetic
 * - Unified filter bar (venues + search)
 * - Top performers by period
 * - Integrated action previews
 */

import { useState, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { AlertCircle, Search, ArrowUpRight, Trophy, Clock, Calendar, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, Calculator, BarChart3, Zap, Info, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../lib/apiBase';

// Available venues (lowercase to match API response)
const ALL_VENUES = ['hyperliquid', 'lighter', 'pacifica', 'extended', 'variational', 'ethereal'];

// Display names for venues
const VENUE_DISPLAY_NAMES: Record<string, string> = {
  'hyperliquid': 'Hyperliquid',
  'lighter': 'Lighter',
  'pacifica': 'Pacifica',
  'extended': 'Extended',
  'variational': 'Variational',
  'ethereal': 'Ethereal'
};

// Short abbreviations for venues (used in OI display)
const VENUE_ABBREV: Record<string, string> = {
  'hyperliquid': 'HL',
  'lighter': 'LIT',
  'pacifica': 'PAC',
  'extended': 'EX',
  'variational': 'VAR',
  'ethereal': 'ETHR'
};

// Venue accent colors (brand kit)
const VENUE_COLORS: Record<string, string> = {
  'hyperliquid': 'from-lime-400 to-emerald-400',      // Light green
  'extended': 'from-emerald-600 to-green-700',        // Dark green
  'pacifica': 'from-sky-400 to-cyan-400',             // Light blue
  'lighter': 'from-slate-400 to-gray-500',            // White/Black (gray)
  'variational': 'from-purple-500 to-violet-600',     // Grape purple
  'ethereal': 'from-amber-400 to-orange-500'          // Placeholder (update with brand kit)
};

// HIP-3 DEX colors (user-deployed perpetuals on Hyperliquid)
const HIP3_DEX_COLORS: Record<string, string> = {
  'xyz': 'from-blue-500 to-indigo-600',               // Stocks & Commodities (AAPL, TSLA, GOLD)
  'flx': 'from-orange-500 to-red-500',                // Felix: XMR, OIL
  'vntl': 'from-violet-500 to-purple-600',            // Ventuals: AI (ANTHROPIC, OPENAI, SPACEX)
  'hyna': 'from-emerald-500 to-green-600',            // HyENA: Crypto alternatives
  'km': 'from-cyan-500 to-blue-500',                  // Kinetiq: Market indices (US500, USTECH)
};

// Banned symbols (not available for trading)

// Minimum samples for 7d with hourly aggregates (7 * 24 = 168).
// Keep a buffer for missing buckets so we don't mark active symbols as "recently listed".
const MIN_SAMPLES_7D = 120;

interface Opportunity {
  opportunity_id: string;
  symbol: string;
  exchange_short: string;
  exchange_long: string;
  rate_short: number;
  rate_long: number;
  rate_short_apr?: number;
  rate_long_apr?: number;
  spread_bps: number;
  oi_short?: number;
  oi_long?: number;
  min_oi?: number;
  net_apr: number;
  max_apr?: number;
  min_apr?: number;
  apr_24h?: number;
  apr_7d?: number;
  apr_30d?: number;
  samples_24h?: number;
  samples_7d?: number;
  samples_30d?: number;
  samples: number;
  confidence: number;
  timestamp: string;
  // HIP-3 metadata for proper ticker identification
  dex_name_short?: string | null;  // e.g., "xyz", "vntl", "hyna"
  dex_name_long?: string | null;
  is_hip3_short?: boolean;
  is_hip3_long?: boolean;
}

interface TopPerformer {
  symbol: string;
  exchange_short: string;
  exchange_long: string;
  apr: number;
  samples: number;
}

const ITEMS_PER_PAGE = 10;
const CACHE_TTL_MS = 30_000;

export default function OpportunitiesScanner() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [topPerformers, setTopPerformers] = useState<{
    top_24h: TopPerformer[];
    top_3d: TopPerformer[];
    top_7d: TopPerformer[];
    top_30d: TopPerformer[];
  }>({ top_24h: [], top_3d: [], top_7d: [], top_30d: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);
  const autoRefreshTick = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set(ALL_VENUES));
  const [selectedVenuesDraft, setSelectedVenuesDraft] = useState<Set<string>>(new Set(ALL_VENUES));
  const [hideRecentlyListed, setHideRecentlyListed] = useState(false);
  const [hideRecentlyListedDraft, setHideRecentlyListedDraft] = useState(false);
  const [sortBy, setSortBy] = useState<'net_apr' | 'min_oi' | 'spread_bps'>('net_apr');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [sortByDraft, setSortByDraft] = useState<'net_apr' | 'min_oi' | 'spread_bps'>('net_apr');
  const [sortDirectionDraft, setSortDirectionDraft] = useState<'desc' | 'asc'>('desc');
  // HIP-3 filter: 'all' shows everything, 'crypto' hides HIP-3, 'hip3' shows only HIP-3
  const [hip3Filter, setHip3Filter] = useState<'all' | 'crypto' | 'hip3'>('all');
  const [hip3FilterDraft, setHip3FilterDraft] = useState<'all' | 'crypto' | 'hip3'>('all');
  const cacheRef = useRef<Map<string, { data: Opportunity[]; total: number; ts: number }>>(new Map());
  const requestSeq = useRef(0);
  const buildDetailUrl = (opp: Opportunity) => {
    const params = new URLSearchParams();
    if (opp.exchange_short) params.set('venue_short', opp.exchange_short);
    if (opp.exchange_long) params.set('venue_long', opp.exchange_long);
    if (opp.dex_name_short) params.set('dex_name_short', opp.dex_name_short);
    if (opp.dex_name_long) params.set('dex_name_long', opp.dex_name_long);
    const qs = params.toString();
    return `${window.location.origin}/scanner/s/${encodeURIComponent(opp.symbol)}${qs ? `?${qs}` : ''}`;
  };

  const openDetail = (opp: Opportunity, event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    const url = buildDetailUrl(opp);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      console.warn('Popup blocked. Please allow popups to open symbol detail.');
    }
  };

  // Helper to check if a symbol is recently listed (insufficient historical data)
  const isRecentlyListed = (opp: Opportunity): boolean => {
    return (opp.samples_7d || 0) < MIN_SAMPLES_7D;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedVenues, hideRecentlyListed, sortBy, sortDirection, hip3Filter]);

  useEffect(() => {
    fetchData();
  }, [currentPage, searchQuery, selectedVenues, hideRecentlyListed, sortBy, sortDirection, hip3Filter]);

  // Auto-refresh the scanner list. We intentionally bypass the local in-memory cache so that
  // the list doesn't lag behind the detail view (which polls live snapshot every 30s).
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // The server may still serve cached data (nginx/CF). Do a lightweight cache-bust
      // periodically so values stay consistent with the detail view.
      autoRefreshTick.current += 1;
      const hardRefresh = (autoRefreshTick.current % 4) === 0; // ~ every 2 minutes
      fetchData({ bypassLocalCache: true, hardRefresh });
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, searchQuery, selectedVenues, hideRecentlyListed, sortBy, sortDirection, hip3Filter]);

  const formatAsOf = (iso?: string | null): string | null => {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    const ageS = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    const hhmmss = new Date(ms).toLocaleTimeString([], { hour12: false });
    return `${hhmmss} (${ageS}s ago)`;
  };

  const computeTopPerformers = (list: Opportunity[]) => {
    if (list.length === 0) {
      return;
    }

    const mapToPerformer = (o: Opportunity, aprField: 'apr_24h' | 'apr_7d' | 'apr_30d', samplesField: 'samples_24h' | 'samples_7d' | 'samples_30d'): TopPerformer => ({
      symbol: o.symbol,
      exchange_short: o.exchange_short,
      exchange_long: o.exchange_long,
      apr: o[aprField] || o.net_apr,
      samples: o[samplesField] || o.samples
    });

    const estimateApr3d = (apr24h?: number, apr7d?: number): number | undefined => {
      if (!Number.isFinite(apr24h) || !Number.isFinite(apr7d)) return undefined;
      // Heuristic estimate when backend doesn't provide a real 72h window:
      // derived from 24h and 7d averages: (2*apr24h + 7*apr7d)/9.
      return (2 * (apr24h as number) + 7 * (apr7d as number)) / 9;
    };

    // Only include symbols with sufficient historical data in top performers (exclude recently listed)
    const withSufficientHistory = list.filter((o: Opportunity) => (o.samples_7d || 0) >= MIN_SAMPLES_7D);

    const sorted24h = [...withSufficientHistory].sort((a, b) => (b.apr_24h || b.net_apr) - (a.apr_24h || a.net_apr));
    const top3_24h = sorted24h.slice(0, 3).map(o => mapToPerformer(o, 'apr_24h', 'samples_24h'));

    const sorted3d = [...withSufficientHistory]
      .map((o) => ({ o, apr3d: estimateApr3d(o.apr_24h, o.apr_7d) }))
      .filter((x): x is { o: Opportunity; apr3d: number } => x.apr3d !== undefined)
      .sort((a, b) => b.apr3d - a.apr3d);
    const top3_3d = sorted3d.slice(0, 3).map(({ o, apr3d }) => ({
      symbol: o.symbol,
      exchange_short: o.exchange_short,
      exchange_long: o.exchange_long,
      apr: apr3d,
      samples: o.samples_7d || o.samples,
    }));

    const sorted7d = [...withSufficientHistory].sort((a: Opportunity, b: Opportunity) => (b.apr_7d || 0) - (a.apr_7d || 0));
    const top3_7d = sorted7d.slice(0, 3).map(o => mapToPerformer(o, 'apr_7d', 'samples_7d'));

    const with30d = withSufficientHistory.filter((o: Opportunity) => o.apr_30d !== undefined);
    const sorted30d = [...with30d].sort((a: Opportunity, b: Opportunity) => (b.apr_30d || 0) - (a.apr_30d || 0));
    const top3_30d = sorted30d.slice(0, 3).map(o => mapToPerformer(o, 'apr_30d', 'samples_30d'));

    setTopPerformers({
      top_24h: top3_24h,
      top_3d: top3_3d,
      top_7d: top3_7d,
      top_30d: top3_30d
    });
  };

  const fetchData = async (opts?: { bypassLocalCache?: boolean; hardRefresh?: boolean }) => {
    try {
      const initial = opportunities.length === 0;
      if (initial) setLoading(true);
      else setRefreshing(true);

      const params = {
        min_net_apr: 0,
        sort_by: sortBy,
        order: sortDirection,
        hours: 24,
        include_hip3: hip3Filter !== 'crypto',
        page: currentPage,
        page_size: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
        venues: selectedVenues.size === ALL_VENUES.length ? undefined : Array.from(selectedVenues).join(','),
        hide_recently_listed: hideRecentlyListed,
        hip3_filter: hip3Filter,
        ...(opts?.hardRefresh ? { __t: Date.now() } : {}),
      };

      const cacheKey = JSON.stringify(params);
      const cached = cacheRef.current.get(cacheKey);
      if (!opts?.bypassLocalCache && cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
        setOpportunities(cached.data);
        setTotalCount(cached.total);
        computeTopPerformers(cached.data);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const reqId = ++requestSeq.current;
      const fetchWithRetry = async () => {
        const delays = [600, 1200, 2000];
        for (let attempt = 0; attempt <= delays.length; attempt += 1) {
          try {
            return await axios.get(buildApiUrl('/api/opportunities'), { params });
          } catch (err) {
            if (attempt === delays.length) throw err;
            await new Promise(res => setTimeout(res, delays[attempt]));
          }
        }
        throw new Error('unreachable');
      };

      const oppsResponse = await fetchWithRetry();
      if (reqId !== requestSeq.current) {
        return;
      }

      const opps: Opportunity[] = oppsResponse.data.opportunities || [];
      const baseTotal = oppsResponse.data.total_count || opps.length;
      cacheRef.current.set(cacheKey, { data: opps, total: baseTotal, ts: Date.now() });
      setOpportunities(opps);
      setTotalCount(baseTotal);
      computeTopPerformers(opps);
      setLastFetchAt(Date.now());
      try {
        const maxTs = opps
          .map((o) => o.timestamp)
          .filter((t) => !!t)
          .reduce((acc: string | null, t: string) => (acc && acc > t ? acc : t), null);
        setDataAsOf(maxTs);
      } catch {
        setDataAsOf(null);
      }

      const totalPages = Math.max(1, Math.ceil(baseTotal / ITEMS_PER_PAGE));
      const prefetchPage = async (page: number) => {
        if (page < 1 || page > totalPages) return;
        const preParams = { ...params, page };
        const preKey = JSON.stringify(preParams);
        const preCached = cacheRef.current.get(preKey);
        if (preCached && (Date.now() - preCached.ts < CACHE_TTL_MS)) return;
        try {
          const res = await axios.get(buildApiUrl('/api/opportunities'), { params: preParams });
          const preOpps: Opportunity[] = res.data.opportunities || [];
          const preTotal = res.data.total_count || preOpps.length;
          cacheRef.current.set(preKey, { data: preOpps, total: preTotal, ts: Date.now() });
        } catch {
          // Ignore prefetch errors
        }
      };

      prefetchPage(currentPage + 1);
      if (currentPage > 1) {
        prefetchPage(currentPage - 1);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch opportunities');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleVenue = (venue: string) => {
    setSelectedVenuesDraft(prev => {
      const next = new Set(prev);
      if (next.has(venue)) {
        if (next.size > 1) {
          next.delete(venue);
        }
      } else {
        next.add(venue);
      }
      return next;
    });
  };

  const selectAllVenues = () => {
    setSelectedVenuesDraft(new Set(ALL_VENUES));
  };

  const applyFilters = () => {
    setSelectedVenues(new Set(selectedVenuesDraft));
    setHideRecentlyListed(hideRecentlyListedDraft);
    setSortBy(sortByDraft);
    setSortDirection(sortDirectionDraft);
    setHip3Filter(hip3FilterDraft);
    setSearchQuery(searchDraft);
    setCurrentPage(1);
  };

  // Server-side filtered + sorted
  const filteredOpportunities = useMemo(() => opportunities, [opportunities]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paginatedOpportunities = filteredOpportunities;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const formatAPR = (apr: number) => `${apr.toFixed(1)}%`;

  const estimateApr3d = (apr24h?: number, apr7d?: number): number | undefined => {
    if (!Number.isFinite(apr24h) || !Number.isFinite(apr7d)) return undefined;
    return (2 * (apr24h as number) + 7 * (apr7d as number)) / 9;
  };

  const renderOI = (opp: Opportunity) => {
    const shortBadge = getOISizeBadge(opp.oi_short);
    const longBadge = getOISizeBadge(opp.oi_long);
    const shortAbbrev = opp.dex_name_short?.toUpperCase() || VENUE_ABBREV[opp.exchange_short] || opp.exchange_short.slice(0, 3).toUpperCase();
    const longAbbrev = opp.dex_name_long?.toUpperCase() || VENUE_ABBREV[opp.exchange_long] || opp.exchange_long.slice(0, 3).toUpperCase();
    return (
      <div className="flex items-center justify-center">
        <div className="flex-1 text-center">
          <div className="text-[9px] text-red-400 font-medium mb-0.5">{shortAbbrev}</div>
          <div className="flex items-center justify-center gap-0.5">
            {shortBadge.icon === 'flame' && <Flame className="w-2.5 h-2.5 text-orange-400" />}
            <span className={`font-mono text-xs font-semibold ${shortBadge.color}`}>
              {formatOI(opp.oi_short)}
            </span>
          </div>
        </div>
        <div className="w-px h-8 bg-gray-300 dark:bg-surface-600 mx-2" />
        <div className="flex-1 text-center">
          <div className="text-[9px] text-emerald-400 font-medium mb-0.5">{longAbbrev}</div>
          <div className="flex items-center justify-center gap-0.5">
            {longBadge.icon === 'flame' && <Flame className="w-2.5 h-2.5 text-orange-400" />}
            <span className={`font-mono text-xs font-semibold ${longBadge.color}`}>
              {formatOI(opp.oi_long)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const getAPRColor = (apr: number) => {
    if (apr >= 50) return 'text-neon-green';
    if (apr >= 20) return 'text-emerald-500 dark:text-emerald-400';
    if (apr >= 0) return 'text-gray-600 dark:text-gray-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getAPRGlow = (apr: number) => {
    if (apr >= 50) return 'drop-shadow-[0_0_8px_rgba(0,255,159,0.5)]';
    return '';
  };

  const formatOI = (oi?: number): string => {
    if (!oi || oi <= 0) return '—';
    if (oi >= 1_000_000_000) return `$${(oi / 1_000_000_000).toFixed(1)}B`;
    if (oi >= 1_000_000) return `$${(oi / 1_000_000).toFixed(1)}M`;
    if (oi >= 1_000) return `$${(oi / 1_000).toFixed(0)}K`;
    return `$${oi.toFixed(0)}`;
  };

  // Price Spread color: green for positive (long > short), red for negative (long < short)
  const getSpreadColor = (spreadBps: number) => {
    if (spreadBps >= 0) return 'text-emerald-500 dark:text-emerald-400';
    return 'text-red-500 dark:text-red-400';
  };

  // OI Size category for points farming
  const getOISizeBadge = (oi?: number): { label: string; icon: 'flame' | 'chart' | 'bank'; color: string } => {
    if (!oi || oi <= 0) return { label: '—', icon: 'chart', color: 'text-gray-400' };
    if (oi < 1_000_000) return { label: 'Low', icon: 'flame', color: 'text-orange-400' }; // Good for points
    if (oi < 10_000_000) return { label: 'Med', icon: 'chart', color: 'text-blue-400' };
    return { label: 'High', icon: 'bank', color: 'text-gray-400' };
  };

  const isInitialLoading = loading && opportunities.length === 0;
  if (isInitialLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {import.meta.env.DEV && (
          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
              Venues (UI Registry Preview)
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {ALL_VENUES.map(venue => (
                <span
                  key={venue}
                  className={'px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ' + VENUE_COLORS[venue] + ' text-white'}
                  title="Dev-only: proves venue is wired in the UI even if API is offline."
                >
                  {VENUE_DISPLAY_NAMES[venue]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Keep a large, stable layout while the API warms up (improves mobile UX and long-tail LCP). */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card">
              <div className="h-5 w-32 bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
              <div className="mt-4 h-8 w-24 bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
              <div className="mt-3 h-4 w-40 bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div className="h-6 w-48 bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
            <div className="h-9 w-28 bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-gray-200 dark:bg-surface-800 rounded animate-pulse" />
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Scanning opportunities...
          </p>
        </div>
      </div>
    );
  }

  const errorBanner = error ? (
    <div className="card border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-semibold">{error}</p>
            <p className="text-xs text-red-700/80 dark:text-red-200/80 mt-0.5">
              UI is still usable; data will populate once the API responds.
            </p>
          </div>
        </div>
        <button onClick={() => fetchData({ bypassLocalCache: true })} className="btn btn-secondary text-sm">
          Retry
        </button>
      </div>
    </div>
  ) : null;

  const topPerformerCards = [
    { key: 'top_24h', label: 'Avg 24h', icon: Clock, data: topPerformers.top_24h, color: 'from-amber-500 to-orange-500', iconColor: 'text-amber-500', rankColors: ['text-amber-400', 'text-gray-400', 'text-amber-700'] },
    { key: 'top_3d', label: 'Avg 3 Days*', title: 'Heuristic estimate derived from 24h and 7d averages. For exact 72h, backend must return apr_3d.', icon: Zap, data: topPerformers.top_3d, color: 'from-sky-500 to-indigo-600', iconColor: 'text-sky-500', rankColors: ['text-sky-400', 'text-gray-400', 'text-indigo-400'] },
    { key: 'top_7d', label: 'Avg 7 Days', icon: Calendar, data: topPerformers.top_7d, color: 'from-emerald-500 to-green-500', iconColor: 'text-emerald-500', rankColors: ['text-emerald-400', 'text-gray-400', 'text-emerald-700'] },
    { key: 'top_30d', label: 'Avg 30 Days', icon: CalendarDays, data: topPerformers.top_30d, color: 'from-primary-500 to-cyan-500', iconColor: 'text-primary-500', rankColors: ['text-cyan-400', 'text-gray-400', 'text-cyan-700'] },
  ];

  return (
    <div className="space-y-6">
      {errorBanner}
      {/* Top Performers Section - Original Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {topPerformerCards.map((card, index) => (
          <div
            key={card.key}
            className="card hover-lift animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-surface-700">
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <span className="data-label" title={(card as { title?: string }).title}>{card.label}</span>
              </div>
              <Trophy className="w-5 h-5 text-amber-400 opacity-50" />
            </div>

            {card.data.length > 0 ? (
              <div className="space-y-3">
                {card.data.map((performer, rank) => (
                  <div
                    key={`${performer.symbol}-${performer.exchange_short}-${performer.exchange_long}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-surface-800 hover:bg-gray-100 dark:hover:bg-surface-700 cursor-pointer transition-colors"
                    onClick={(event) => {
                      const opp = opportunities.find(o =>
                        o.symbol === performer.symbol &&
                        o.exchange_short === performer.exchange_short &&
                        o.exchange_long === performer.exchange_long
                      );
                      if (opp) {
                        openDetail(opp, event);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`font-bold font-mono text-sm w-5 ${card.rankColors[rank] || 'text-gray-500'}`}>
                        #{rank + 1}
                      </span>
                      <div>
                        <span className="font-bold font-display text-gray-900 dark:text-white">
                          {performer.symbol}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {VENUE_DISPLAY_NAMES[performer.exchange_short]} → {VENUE_DISPLAY_NAMES[performer.exchange_long]}
                        </div>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${getAPRColor(performer.apr)} ${getAPRGlow(performer.apr)}`}>
                      {formatAPR(performer.apr)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 dark:text-gray-500 text-sm">
                No data available
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unified Control Bar */}
      <div className="card p-5 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Search */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                Search
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input w-full pl-10 py-2.5 text-sm"
                  placeholder="Search symbol..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Venue Filters */}
          <div className="lg:col-span-8">
            <div className="h-full rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                Venues
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {ALL_VENUES.map(venue => (
                  <button
                    key={venue}
                    onClick={() => toggleVenue(venue)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedVenuesDraft.has(venue)
                        ? 'bg-gradient-to-r ' + VENUE_COLORS[venue] + ' text-white shadow-sm'
                        : 'bg-gray-100/80 dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-600'
                    }`}
                  >
                    {VENUE_DISPLAY_NAMES[venue]}
                  </button>
                ))}
                {selectedVenuesDraft.size < ALL_VENUES.length && (
                  <button
                    onClick={selectAllVenues}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* HIP-3 Filter (Stocks, Commodities, AI) */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                Type
              </div>
              <div className="grid grid-cols-3 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-surface-600 bg-gray-50 dark:bg-surface-700">
                <button
                  onClick={() => setHip3FilterDraft('all')}
                  className={`px-3.5 py-2 text-sm font-medium transition-all ${
                    hip3FilterDraft === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHip3FilterDraft('crypto')}
                  className={`px-3.5 py-2 text-sm font-medium transition-all border-x border-gray-200 dark:border-surface-600 ${
                    hip3FilterDraft === 'crypto'
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600'
                  }`}
                  title="Crypto assets only (BTC, ETH, etc.)"
                >
                  Crypto
                </button>
                <button
                  onClick={() => setHip3FilterDraft('hip3')}
                  className={`px-3.5 py-2 text-sm font-medium transition-all ${
                    hip3FilterDraft === 'hip3'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-600'
                  }`}
                  title="HIP-3 markets: Stocks, Commodities, AI (TSLA, GOLD, OPENAI)"
                >
                  HIP-3
                </button>
              </div>
            </div>
          </div>

          {/* Recently Listed Filter */}
          <div className="lg:col-span-3">
            <div className="h-full rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                Data
              </div>
              <button
                onClick={() => setHideRecentlyListedDraft(!hideRecentlyListedDraft)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  hideRecentlyListedDraft
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                    : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-600'
                }`}
                title="Hide symbols with less than 7 days of historical data"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Hide New Listings</span>
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                Sort
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: 'net_apr' as const, label: 'APR' },
                  { key: 'min_oi' as const, label: 'OI' },
                  { key: 'spread_bps' as const, label: 'Spread' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      if (sortByDraft === option.key) {
                        setSortDirectionDraft(sortDirectionDraft === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortByDraft(option.key);
                        setSortDirectionDraft('desc');
                      }
                    }}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      sortByDraft === option.key
                        ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-500/30'
                        : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-600'
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortByDraft === option.key && (
                      sortDirectionDraft === 'desc'
                        ? <ArrowDown className="w-3 h-3" />
                        : <ArrowUp className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>

        {/* Results count */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-surface-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {totalCount} opportunities
            {searchQuery && <span className="text-primary-500"> matching "{searchQuery}"</span>}
          </span>
          <div className="flex items-center gap-3">
            {totalPages > 1 && <span>Page {currentPage} / {totalPages}</span>}
            {dataAsOf && (
              <span title="Max opportunity timestamp in the current response">
                as-of {new Date(dataAsOf).toLocaleTimeString()}
              </span>
            )}
            {lastFetchAt && (
              <span title="Client fetch time">
                updated {new Date(lastFetchAt).toLocaleTimeString()}
              </span>
            )}
            {refreshing && <div className="w-3 h-3 spinner" />}
            <button
              onClick={() => fetchData({ bypassLocalCache: true })}
              className="px-2 py-1 rounded bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
              title="Refresh (bypass local cache). Server may still serve cached data."
            >
              Refresh
            </button>
            <button
              onClick={() => fetchData({ bypassLocalCache: true, hardRefresh: true })}
              className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
              title="Hard refresh (adds a cache-busting query param). Use sparingly."
            >
              Hard
            </button>
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`px-2 py-1 rounded transition-colors ${
                autoRefresh
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                  : 'bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600'
              }`}
              title="Auto-refresh every 30s"
            >
              Auto {autoRefresh ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="space-y-3">
        {paginatedOpportunities.map((opp, index) => (
          <div
            key={opp.opportunity_id}
            className={`card p-5 hover-glow cursor-pointer animate-fade-in-up group ${
              opp.net_apr < 0 ? 'border-red-200/50 dark:border-red-500/20' : ''
            }`}
            style={{ animationDelay: `${(index % 10) * 40}ms` }}
            onClick={(event) => {
              openDetail(opp, event);
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
              {/* Left: Symbol & Rates */}
              <div className="lg:w-72">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <h3 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                    {opp.symbol}
                  </h3>
                  {/* HIP-3 DEX Badges */}
                  {(opp.is_hip3_short || opp.is_hip3_long) && (
                    <div className="flex items-center gap-1">
                      {opp.dex_name_short && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gradient-to-r ${HIP3_DEX_COLORS[opp.dex_name_short] || 'from-gray-500 to-gray-600'} text-white shadow-sm`}>
                          {opp.dex_name_short}
                        </span>
                      )}
                      {opp.dex_name_long && opp.dex_name_long !== opp.dex_name_short && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gradient-to-r ${HIP3_DEX_COLORS[opp.dex_name_long] || 'from-gray-500 to-gray-600'} text-white shadow-sm`}>
                          {opp.dex_name_long}
                        </span>
                      )}
                    </div>
                  )}
                  {opp.net_apr < 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded">
                      Neg
                    </span>
                  )}
                  {/* Recently Listed Indicator */}
                  {isRecentlyListed(opp) && (
                    <div className="relative group/new">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center cursor-help">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 dark:bg-gray-800 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover/new:opacity-100 group-hover/new:visible transition-all z-50 pointer-events-none">
                        <p className="font-semibold mb-1 text-amber-400">Recently Listed Symbol</p>
                        <p className="text-gray-300 leading-relaxed">
                          This symbol was recently listed and lacks historical data. The 7D and 30D averages may not reflect actual performance.
                        </p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Short/Long Rates */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-lg px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 mb-0.5">
                      Short · {opp.dex_name_short ? `${opp.dex_name_short.toUpperCase()} (HL)` : VENUE_DISPLAY_NAMES[opp.exchange_short]}
                    </div>
                    <div className="font-mono font-bold text-red-600 dark:text-red-400">
                      {opp.rate_short_apr !== undefined ? `${opp.rate_short_apr.toFixed(1)}%` : `${(opp.rate_short * 8760 * 100).toFixed(1)}%`}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-lg px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-0.5">
                      Long · {opp.dex_name_long ? `${opp.dex_name_long.toUpperCase()} (HL)` : VENUE_DISPLAY_NAMES[opp.exchange_long]}
                    </div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {opp.rate_long_apr !== undefined ? `${opp.rate_long_apr.toFixed(1)}%` : `${(opp.rate_long * 8760 * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Center: Net APR - Hero */}
              <div className="flex-1 flex justify-center">
                <div className="text-center px-8 py-3 rounded-xl bg-gray-50 dark:bg-surface-700/50 border border-gray-100 dark:border-surface-600">
                  <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Net APR (Current)</div>
                  <div className={`font-mono font-bold text-4xl ${getAPRColor(opp.net_apr)} ${getAPRGlow(opp.net_apr)}`}>
                    {formatAPR(opp.net_apr)}
                  </div>
                  {formatAsOf(opp.timestamp) && (
                    <div className="mt-1 text-[10px] text-gray-400" title="Timestamp of the snapshot used for this row.">
                      as-of {formatAsOf(opp.timestamp)}
                    </div>
                  )}
                </div>
              </div>

              {/* Spread + OI Column */}
              <div className="lg:w-48 flex flex-col items-center gap-1">
                {/* Price Spread Card - Left/Right Layout */}
                <div className="relative p-2 rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-100 dark:border-surface-700 w-full group/spread">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400">Price Spread</span>
                    <div className="relative">
                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-gray-900 dark:bg-gray-800 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover/spread:opacity-100 group-hover/spread:visible transition-all z-50 pointer-events-none">
                        <p className="font-semibold mb-1">Price Spread</p>
                        <p className="text-gray-300 mb-2">Long venue price − Short venue price</p>
                        <p className="text-emerald-400">Positive: Long price &gt; Short price</p>
                        <p className="text-red-400">Negative: Long price &lt; Short price</p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
                      </div>
                    </div>
                  </div>
                  {/* Left/Right Values */}
                  <div className="flex items-center justify-center">
                    <div className={`flex-1 text-center font-mono text-sm font-semibold ${getSpreadColor(opp.spread_bps)}`}>
                      {opp.spread_bps >= 0 ? '+' : ''}{opp.spread_bps.toFixed(1)} bps
                    </div>
                    <div className="w-px h-6 bg-gray-300 dark:bg-surface-600 mx-2" />
                    <div className={`flex-1 text-center font-mono text-sm ${getSpreadColor(opp.spread_bps)}`}>
                      {opp.spread_bps >= 0 ? '+' : ''}{(opp.spread_bps / 100).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* OI Card - Left/Right Layout */}
                <div className="relative p-2 rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-100 dark:border-surface-700 w-full group/oi">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400">Open Interest</span>
                    <div className="relative">
                      <Info className="w-3 h-3 text-gray-400 cursor-help" />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 dark:bg-gray-800 text-xs text-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover/oi:opacity-100 group-hover/oi:visible transition-all z-50 pointer-events-auto">
                        <p className="font-semibold mb-1">Open Interest per Venue</p>
                        <div className="space-y-1 mb-2">
                          <p className="text-orange-400">Low: &lt;$1M</p>
                          <p className="text-blue-400">Med: $1M-$10M</p>
                          <p className="text-gray-400">High: &gt;$10M</p>
                        </div>
                        <Link
                          to="/insights/understanding-open-interest"
                          className="text-primary-400 hover:text-primary-300 underline text-[10px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Learn more about OI →
                        </Link>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
                      </div>
                    </div>
                  </div>

                  {/* OI per Venue - Left/Right */}
                  {renderOI(opp)}
                </div>
              </div>

              {/* Right: Historical Averages + Actions */}
              <div className="lg:w-80 flex items-center gap-4">
                {/* Historical Averages - Separated */}
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: '24h Avg', value: opp.apr_24h },
                      { label: '3d Avg*', value: estimateApr3d(opp.apr_24h, opp.apr_7d), title: 'Estimated from 24h and 7d averages. Exact 72h requires backend support.' },
                      { label: '7d Avg', value: opp.apr_7d },
                      { label: '30d Avg', value: opp.apr_30d },
                    ].map((period) => (
                      <div key={period.label} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-surface-800 border border-gray-100 dark:border-surface-700" title={(period as { title?: string }).title}>
                        <div className="text-[9px] uppercase tracking-wider text-gray-400 mb-1">{period.label}</div>
                        <div className={`font-mono text-sm font-semibold ${period.value !== undefined ? getAPRColor(period.value) : 'text-gray-400'}`}>
                          {period.value !== undefined ? formatAPR(period.value) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons - More Clickable */}
                <div className="flex flex-col gap-1">
                  <button
                    className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-500/20 border border-primary-200 dark:border-primary-500/30 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-500/30 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    title="View Chart"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </button>
                  <button
                    className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-500/30 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    title="Profit Calculator"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </button>
                  <button
                    className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-500/30 hover:scale-105 active:scale-95 transition-all shadow-sm"
                    title="Analysis"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {totalCount === 0 && (
          <div className="card text-center py-16 animate-fade-in">
            <Zap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-display">
              No opportunities found
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {searchQuery ? `No results for "${searchQuery}"` : 'Adjust venue filters to see more'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === pageNum
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
