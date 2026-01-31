/**
 * HIP-3 Markets Component
 *
 * Displays user-deployed perpetual markets on Hyperliquid (HIP-3).
 * Features:
 * - DEX selector tabs (xyz, flx, vntl, hyna, km)
 * - Market table with funding rates, APR, OI, volume
 * - Sorting and filtering
 * - Click-through to market details
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Building2, TrendingUp, DollarSign, BarChart3, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { HIP3Dex, HIP3MarketRate } from '../types';

// DEX metadata with colors and descriptions
const DEX_INFO: Record<string, { color: string; category: string; icon: string }> = {
  xyz: { color: 'from-blue-500 to-indigo-600', category: 'Stocks & Commodities', icon: 'AAPL, TSLA, GOLD' },
  flx: { color: 'from-orange-500 to-red-500', category: 'Crypto & Commodities', icon: 'XMR, OIL' },
  vntl: { color: 'from-violet-500 to-purple-600', category: 'AI & Tech Companies', icon: 'ANTHROPIC, OPENAI' },
  hyna: { color: 'from-emerald-500 to-green-600', category: 'Crypto Alternatives', icon: 'LIGHTER' },
  km: { color: 'from-cyan-500 to-blue-500', category: 'Market Indices', icon: 'US500, USTECH' },
  abcd: { color: 'from-pink-500 to-rose-500', category: 'New Markets', icon: 'New' },
  cash: { color: 'from-amber-500 to-yellow-500', category: 'Cash Markets', icon: 'Cash' },
};

const ITEMS_PER_PAGE = 15;

export default function HIP3Markets() {
  const [dexes, setDexes] = useState<HIP3Dex[]>([]);
  const [rates, setRates] = useState<HIP3MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDex, setSelectedDex] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'apr' | 'volume_24h' | 'open_interest'>('apr');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDexes();
  }, []);

  useEffect(() => {
    if (dexes.length > 0 || selectedDex === null) {
      fetchRates();
    }
  }, [selectedDex, dexes]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDex, sortBy, sortDirection]);

  const fetchDexes = async () => {
    try {
      console.log('[HIP3] Fetching dexes...');
      const response = await api.getHIP3Dexes();
      console.log('[HIP3] DEXes received:', response?.count);
      setDexes(response.dexes);
    } catch (err: any) {
      console.error('[HIP3] DEXes fetch error:', err?.message, err);
    }
  };

  const fetchRates = async () => {
    try {
      setLoading(true);
      console.log('[HIP3] Fetching rates with params:', { dex: selectedDex, sort_by: sortBy, order: sortDirection });
      const response = await api.getHIP3Rates({
        dex: selectedDex || undefined,
        sort_by: sortBy,
        order: sortDirection,
        limit: 500,
      });
      console.log('[HIP3] Response received:', response?.count, 'rates');
      setRates(response.rates);
      setError(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Unknown error';
      console.error('[HIP3] Fetch error:', errorMsg, err);
      setError(`Failed to fetch HIP-3 rates: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (column: 'apr' | 'volume_24h' | 'open_interest') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort rates
  const filteredRates = useMemo(() => {
    let filtered = rates.filter(rate => {
      if (!searchQuery) return true;
      return rate.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'volume_24h':
          aVal = a.volume_24h || 0;
          bVal = b.volume_24h || 0;
          break;
        case 'open_interest':
          aVal = a.open_interest || 0;
          bVal = b.open_interest || 0;
          break;
        default: // apr
          aVal = Math.abs(a.apr);
          bVal = Math.abs(b.apr);
      }
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [rates, searchQuery, sortBy, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredRates.length / ITEMS_PER_PAGE);
  const paginatedRates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRates.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRates, currentPage]);

  // Summary stats
  const stats = useMemo(() => {
    const totalOI = filteredRates.reduce((sum, r) => sum + (r.open_interest || 0), 0);
    const totalVol = filteredRates.reduce((sum, r) => sum + (r.volume_24h || 0), 0);
    const avgAPR = filteredRates.length > 0
      ? filteredRates.reduce((sum, r) => sum + Math.abs(r.apr), 0) / filteredRates.length
      : 0;
    return { totalOI, totalVol, avgAPR, count: filteredRates.length };
  }, [filteredRates]);

  const formatAPR = (apr: number) => `${apr.toFixed(1)}%`;

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

  const formatCurrency = (value: number | null): string => {
    if (!value || value <= 0) return '-';
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPrice = (price: number | null): string => {
    if (!price) return '-';
    if (price >= 10000) return `$${price.toFixed(0)}`;
    if (price >= 100) return `$${price.toFixed(2)}`;
    if (price >= 1) return `$${price.toFixed(3)}`;
    return `$${price.toFixed(6)}`;
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading && rates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 spinner border-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading HIP-3 markets...</p>
      </div>
    );
  }

  if (error && rates.length === 0) {
    return (
      <div className="card border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 animate-fade-in">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-semibold">{error}</p>
            <button onClick={fetchRates} className="mt-2 btn btn-secondary text-sm">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Info */}
      <div className="card bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-200 dark:border-violet-500/30 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-violet-500" />
              HIP-3 User-Deployed Markets
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Perpetual contracts deployed by third parties on Hyperliquid. Trade stocks, commodities, AI companies, and more.
            </p>
          </div>
          <a
            href="https://app.hyperliquid.xyz/trade"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            Trade on Hyperliquid
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Markets</span>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{stats.count}</div>
        </div>
        <div className="card p-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg APR</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${getAPRColor(stats.avgAPR)} ${getAPRGlow(stats.avgAPR)}`}>
            {formatAPR(stats.avgAPR)}
          </div>
        </div>
        <div className="card p-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total OI</span>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{formatCurrency(stats.totalOI)}</div>
        </div>
        <div className="card p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">24h Volume</span>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{formatCurrency(stats.totalVol)}</div>
        </div>
      </div>

      {/* DEX Selector */}
      <div className="card p-4 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* DEX Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">DEX</span>
            <button
              onClick={() => setSelectedDex(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedDex === null
                  ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-500/30'
                  : 'bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-600'
              }`}
            >
              All DEXes
            </button>
            {dexes.map(dex => (
              <button
                key={dex.name}
                onClick={() => setSelectedDex(dex.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDex === dex.name
                    ? `bg-gradient-to-r ${DEX_INFO[dex.name]?.color || 'from-gray-500 to-gray-600'} text-white shadow-sm`
                    : 'bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-surface-600'
                }`}
                title={DEX_INFO[dex.name]?.category}
              >
                {dex.name.toUpperCase()}
                <span className="ml-1 text-xs opacity-75">({dex.markets_count})</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-gray-200 dark:bg-surface-600" />

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              placeholder="Search symbol (e.g., TSLA, OPENAI)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Selected DEX Info */}
        {selectedDex && DEX_INFO[selectedDex] && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-surface-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{selectedDex.toUpperCase()}</span>
              {' - '}
              {DEX_INFO[selectedDex].category}
              <span className="text-gray-400 dark:text-gray-500 ml-2">({DEX_INFO[selectedDex].icon})</span>
            </p>
          </div>
        )}

        {/* Results count */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-surface-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {filteredRates.length} markets
            {searchQuery && <span className="text-primary-500"> matching "{searchQuery}"</span>}
            {selectedDex && <span className="text-violet-500"> in {selectedDex.toUpperCase()}</span>}
          </span>
          {totalPages > 1 && <span>Page {currentPage} / {totalPages}</span>}
        </div>
      </div>

      {/* Markets Table */}
      <div className="card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-surface-700 bg-gray-50 dark:bg-surface-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  DEX
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Mark Price
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-500 transition-colors"
                  onClick={() => toggleSort('apr')}
                >
                  <div className="flex items-center justify-end gap-1">
                    APR
                    {sortBy === 'apr' && (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Rate (1h)
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-500 transition-colors"
                  onClick={() => toggleSort('open_interest')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Open Interest
                    {sortBy === 'open_interest' && (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-primary-500 transition-colors"
                  onClick={() => toggleSort('volume_24h')}
                >
                  <div className="flex items-center justify-end gap-1">
                    24h Volume
                    {sortBy === 'volume_24h' && (
                      sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRates.map((rate, index) => (
                <tr
                  key={rate.symbol}
                  className={`border-b border-gray-50 dark:border-surface-700/50 hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors animate-fade-in-up cursor-pointer`}
                  style={{ animationDelay: `${(index % 15) * 30}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-display text-gray-900 dark:text-white">
                        {rate.symbol.includes(':') ? rate.symbol.split(':')[1] : rate.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${DEX_INFO[rate.dex_name]?.color || 'from-gray-500 to-gray-600'} text-white`}>
                      {rate.dex_name.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                    {formatPrice(rate.mark_price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-bold ${getAPRColor(rate.apr)} ${getAPRGlow(rate.apr)}`}>
                      {formatAPR(rate.apr)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                    {rate.rate_1h >= 0 ? '+' : ''}{(rate.rate_1h * 100).toFixed(4)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                    {formatCurrency(rate.open_interest)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                    {formatCurrency(rate.volume_24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRates.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-display">No markets found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {searchQuery ? `No results for "${searchQuery}"` : 'Try selecting a different DEX'}
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
