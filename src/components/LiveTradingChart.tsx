/**
 * Live Trading Chart Component
 *
 * Displays real-time candlestick chart with buy/sell markers
 * for algorithm trades using TradingView Lightweight Charts.
 */

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { TrendingUp, Play, Pause, RefreshCw } from 'lucide-react';
import { wsClient } from '../services/websocket';

interface Trade {
  timestamp: number;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  symbol: string;
  pnl?: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function LiveTradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [isLive, setIsLive] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Load initial data
    loadHistoricalData();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, interval]);

  // Subscribe to WebSocket for live trades
  useEffect(() => {
    if (!isLive) return;

    const unsubscribe = wsClient.subscribe((message) => {
      // Handle trade execution messages
      if (message.type === 'trade_executed' && message.data) {
        const trade: Trade = message.data;
        addTradeMarker(trade);
        setTrades(prev => [trade, ...prev].slice(0, 100)); // Keep last 100
        updateStats(trade);
      }

      // Handle candle updates
      if (message.type === 'candle_update' && message.data) {
        updateCandle(message.data);
      }
    });

    wsClient.connect();

    return () => {
      unsubscribe();
    };
  }, [isLive]);

  const loadHistoricalData = async () => {
    try {
      // TODO: Call your backend to get historical candles
      // const response = await api.getHistoricalCandles(symbol, interval, 500);

      // Mock data for demonstration
      const mockCandles = generateMockCandles(500);

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(mockCandles);
      }
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  };

  const updateCandle = (candle: Candle) => {
    if (!candlestickSeriesRef.current) return;

    const chartCandle = {
      time: (candle.time / 1000) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };

    candlestickSeriesRef.current.update(chartCandle);
  };

  const addTradeMarker = (trade: Trade) => {
    if (!candlestickSeriesRef.current) return;

    const marker = {
      time: (trade.timestamp / 1000) as Time,
      position: trade.side === 'BUY' ? 'belowBar' : 'aboveBar',
      color: trade.side === 'BUY' ? '#22c55e' : '#ef4444',
      shape: trade.side === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `${trade.side} @ ${trade.price.toFixed(2)}`,
    } as any;

    // Get existing markers and add new one
    const existingMarkers = candlestickSeriesRef.current.markers() || [];
    candlestickSeriesRef.current.setMarkers([...existingMarkers, marker]);
  };

  const updateStats = (trade: Trade) => {
    setStats(prev => {
      const newStats = {
        totalTrades: prev.totalTrades + 1,
        wins: trade.pnl && trade.pnl > 0 ? prev.wins + 1 : prev.wins,
        losses: trade.pnl && trade.pnl < 0 ? prev.losses + 1 : prev.losses,
        totalPnL: prev.totalPnL + (trade.pnl || 0),
      };
      return newStats;
    });
  };

  const generateMockCandles = (count: number): any[] => {
    const candles = [];
    let basePrice = 45000;
    const now = Date.now();

    for (let i = count; i > 0; i--) {
      const time = (now - i * 60000) / 1000;
      const open = basePrice + (Math.random() - 0.5) * 100;
      const close = open + (Math.random() - 0.5) * 200;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;

      candles.push({
        time: time as Time,
        open,
        high,
        low,
        close,
      });

      basePrice = close;
    }

    return candles;
  };

  const winRate = stats.totalTrades > 0
    ? ((stats.wins / stats.totalTrades) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Coming Soon</h2>
          <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
          🚀 <strong>Live Trading Signals</strong> with Real-Time Execution
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Integraremos el sistema de trading algorítmico con señales de compra/venta en tiempo real,
          ejecución automática de órdenes y tracking de P&L en vivo.
        </p>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
          <span>📊 Análisis Técnico</span>
          <span>•</span>
          <span>🤖 ML Predictions</span>
          <span>•</span>
          <span>⚡ Auto-Execution</span>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium mb-2">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="input"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="input"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`btn ${isLive ? 'btn-danger' : 'btn-success'}`}
            >
              {isLive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Live
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume Live
                </>
              )}
            </button>

            <button
              onClick={loadHistoricalData}
              className="btn btn-secondary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrades}</div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold text-green-600">{winRate}%</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {stats.wins}W / {stats.losses}L
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total P&L</div>
          <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${stats.totalPnL.toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="font-medium text-gray-900 dark:text-white">{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Trading Chart</h3>
          {isLive && (
            <span className="badge badge-green animate-pulse">LIVE</span>
          )}
        </div>

        <div ref={chartContainerRef} className="w-full" />

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>🟢 Green arrows = BUY signals</p>
          <p>🔴 Red arrows = SELL signals</p>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Trades</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-semibold">Time</th>
                <th className="px-4 py-2 text-left text-gray-900 dark:text-white font-semibold">Side</th>
                <th className="px-4 py-2 text-right text-gray-900 dark:text-white font-semibold">Price</th>
                <th className="px-4 py-2 text-right text-gray-900 dark:text-white font-semibold">Quantity</th>
                <th className="px-4 py-2 text-right text-gray-900 dark:text-white font-semibold">P&L</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No trades yet. Waiting for algorithm signals...
                  </td>
                </tr>
              ) : (
                trades.map((trade, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${trade.side === 'BUY' ? 'badge-green' : 'badge-red'}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-white">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-white">
                      {trade.quantity.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {trade.pnl !== undefined && (
                        <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${trade.pnl.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
