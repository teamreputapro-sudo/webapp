/**
 * Funding Rates Table Component
 *
 * Displays funding rates across exchanges with:
 * - Real-time updates via WebSocket
 * - Sorting and filtering
 * - Color-coded APR values
 */

import { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { FundingRate, SortConfig } from '../types';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';

export default function FundingRatesTable() {
  const [rates, setRates] = useState<FundingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'apr', direction: 'desc' });
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterExchange, setFilterExchange] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchRates();
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((message) => {
      if (message.type === 'funding_rates_update' && message.data?.rates) {
        setRates(message.data.rates);
      } else if (message.type === 'initial_data' && message.data?.rates) {
        setRates(message.data.rates);
      }
    });

    wsClient.connect();

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await api.getFundingRates({
        sort_by: sortConfig.key,
        order: sortConfig.direction,
        limit: 100
      });
      setRates(response.rates);
      setError(null);
    } catch (err) {
      setError('Failed to fetch funding rates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter rates
  const filteredRates = useMemo(() => {
    return rates.filter((rate) => {
      const matchesSymbol = !filterSymbol || rate.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
      const matchesExchange = !filterExchange || rate.exchange.toLowerCase().includes(filterExchange.toLowerCase());
      return matchesSymbol && matchesExchange;
    });
  }, [rates, filterSymbol, filterExchange]);

  // Sort rates
  const sortedRates = useMemo(() => {
    const sorted = [...filteredRates];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof FundingRate];
      const bValue = b[sortConfig.key as keyof FundingRate];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
    return sorted;
  }, [filteredRates, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const formatAPR = (apr: number) => {
    return `${(apr).toFixed(2)}%`;
  };

  const formatRate = (rate: number) => {
    return `${(rate * 100).toFixed(4)}%`;
  };

  const getAPRColor = (apr: number) => {
    if (Math.abs(apr) < 5) return 'text-gray-600 dark:text-gray-400';
    if (Math.abs(apr) < 10) return 'text-yellow-600 dark:text-yellow-400';
    if (Math.abs(apr) < 20) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400 font-bold';
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button onClick={fetchRates} className="mt-2 btn btn-secondary text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Filter by symbol (e.g., BTC)"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <input
          type="text"
          placeholder="Filter by exchange (e.g., binance)"
          value={filterExchange}
          onChange={(e) => setFilterExchange(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <button onClick={fetchRates} className="btn btn-primary">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Rates</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{sortedRates.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Highest APR</div>
          <div className="text-2xl font-bold text-green-600">
            {sortedRates.length > 0 ? formatAPR(Math.max(...sortedRates.map(r => Math.abs(r.apr)))) : '0%'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg APR</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {sortedRates.length > 0
              ? formatAPR(sortedRates.reduce((sum, r) => sum + Math.abs(r.apr), 0) / sortedRates.length)
              : '0%'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900 dark:text-white font-semibold">Symbol</span>
                  <SortIcon column="symbol" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('exchange')}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900 dark:text-white font-semibold">Exchange</span>
                  <SortIcon column="exchange" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('rate')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-gray-900 dark:text-white font-semibold">Rate</span>
                  <SortIcon column="rate" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('rate_8h')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-gray-900 dark:text-white font-semibold">Rate (8h)</span>
                  <SortIcon column="rate_8h" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort('apr')}
              >
                <div className="flex items-center justify-end space-x-2">
                  <span className="text-gray-900 dark:text-white font-semibold">APR</span>
                  <SortIcon column="apr" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-gray-900 dark:text-white font-semibold">Next Funding</th>
            </tr>
          </thead>
          <tbody>
            {sortedRates.map((rate, index) => (
              <tr
                key={`${rate.exchange}-${rate.symbol}-${index}`}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{rate.symbol}</td>
                <td className="px-4 py-3">
                  <span className="badge badge-blue">{rate.exchange}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  <div className="flex items-center justify-end space-x-1">
                    {rate.rate > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className={rate.rate > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatRate(rate.rate)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-900 dark:text-white">
                  {formatRate(rate.rate_8h)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={getAPRColor(rate.apr)}>
                    {formatAPR(rate.apr)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                  {new Date(rate.next_funding_time).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedRates.length === 0 && (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No funding rates found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}
