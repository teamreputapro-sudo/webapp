/**
 * Profit Calculator Component
 *
 * Interactive calculator for arbitrage profit estimation
 */

import { useState, useEffect } from 'react';
import { Calculator, DollarSign, Calendar, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import type { CalculatorRequest, CalculatorResponse } from '../types';
import { api } from '../services/api';

export default function ProfitCalculator() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculatorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CalculatorRequest>({
    symbol: 'BTCUSDT',
    exchange_short: 'binance',
    exchange_long: 'hyperliquid',
    position_size_usd: 1000,
    holding_period_days: 30
  });

  // Fetch available symbols and exchanges
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [symbolsRes, exchangesRes] = await Promise.all([
        api.getAvailableSymbols(),
        api.getAvailableExchanges()
      ]);
      setSymbols(symbolsRes.symbols);
      setExchanges(exchangesRes.exchanges);

      // Set defaults if available
      if (symbolsRes.symbols.length > 0 && !formData.symbol) {
        setFormData(prev => ({ ...prev, symbol: symbolsRes.symbols[0] }));
      }
      if (exchangesRes.exchanges.length > 0) {
        if (!formData.exchange_short) {
          setFormData(prev => ({ ...prev, exchange_short: exchangesRes.exchanges[0] }));
        }
        if (!formData.exchange_long && exchangesRes.exchanges.length > 1) {
          setFormData(prev => ({ ...prev, exchange_long: exchangesRes.exchanges[1] }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - el backend tardó demasiado')), 10000)
      );

      const calculatePromise = api.calculateProfit(formData);

      const response = await Promise.race([calculatePromise, timeoutPromise]) as any;
      setResult(response);
    } catch (err: any) {
      console.error('Calculator error:', err);

      let errorMessage = 'Failed to calculate profit';

      if (err.message?.includes('timeout')) {
        errorMessage = 'El cálculo tardó demasiado. Verifica que el backend esté funcionando correctamente.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message?.includes('Network Error') || err.message?.includes('fetch')) {
        errorMessage = 'No se puede conectar al backend. Asegúrate de que esté corriendo en http://localhost:8000';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CalculatorRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear result when inputs change
    setResult(null);
  };

  const formatUSD = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              ¿Cómo funciona el Arbitraje de Funding Rates?
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                El arbitraje de funding rates consiste en aprovechar las diferencias en las tasas de financiamiento entre exchanges:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>SHORT en Exchange A:</strong> Cobras funding si la tasa es positiva</li>
                <li><strong>LONG en Exchange B:</strong> Pagas funding si la tasa es positiva</li>
                <li><strong>Profit:</strong> La diferencia entre lo que cobras y pagas, menos los fees</li>
              </ul>
              <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                Esta calculadora estima tu profit basándose en las tasas actuales. Recuerda que las tasas cambian cada 8 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <Calculator className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calculadora de Profit</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center space-x-2">
                <span>Símbolo (Par de Trading)</span>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Selecciona el par de criptomonedas para arbitrar. Ej: BTCUSDT, ETHUSDT
                  </div>
                </div>
              </div>
            </label>
            <select
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value)}
              className="input w-full"
            >
              {symbols.length === 0 && <option value="">Cargando símbolos...</option>}
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Position Size */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Tamaño de Posición (USD)</span>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Cantidad de capital a usar en cada lado (SHORT y LONG). El total será el doble de este valor.
                  </div>
                </div>
              </div>
            </label>
            <input
              type="number"
              value={formData.position_size_usd}
              onChange={(e) => handleInputChange('position_size_usd', Number(e.target.value))}
              className="input w-full"
              min="100"
              step="100"
              placeholder="Ej: 1000"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Capital total requerido: ${(formData.position_size_usd * 2).toLocaleString()}
            </p>
          </div>

          {/* Exchange SHORT */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center space-x-2">
                <span>Exchange SHORT (cobras funding) 📈</span>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Exchange donde abrirás una posición SHORT. Si la funding rate es positiva, recibirás pagos cada 8 horas.
                  </div>
                </div>
              </div>
            </label>
            <select
              value={formData.exchange_short}
              onChange={(e) => handleInputChange('exchange_short', e.target.value)}
              className="input w-full"
            >
              {exchanges.length === 0 && <option value="">Cargando exchanges...</option>}
              {exchanges.map(exchange => (
                <option key={exchange} value={exchange}>{exchange.charAt(0).toUpperCase() + exchange.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Exchange LONG */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center space-x-2">
                <span>Exchange LONG (pagas funding) 📉</span>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Exchange donde abrirás una posición LONG. Si la funding rate es positiva, pagarás funding cada 8 horas.
                  </div>
                </div>
              </div>
            </label>
            <select
              value={formData.exchange_long}
              onChange={(e) => handleInputChange('exchange_long', e.target.value)}
              className="input w-full"
            >
              {exchanges.length === 0 && <option value="">Cargando exchanges...</option>}
              {exchanges.map(exchange => (
                <option key={exchange} value={exchange}>{exchange.charAt(0).toUpperCase() + exchange.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Holding Period */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Período de Holding: {formData.holding_period_days} días</span>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Cuántos días planeas mantener la posición abierta. Las funding rates se pagan cada 8 horas (3 veces al día).
                  </div>
                </div>
              </div>
            </label>
            <input
              type="range"
              min="1"
              max="365"
              value={formData.holding_period_days}
              onChange={(e) => handleInputChange('holding_period_days', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>1 día</span>
              <span className="text-center font-medium text-gray-700 dark:text-gray-300">
                {(formData.holding_period_days ?? 1) * 3} pagos de funding (cada 8 horas)
              </span>
              <span>365 días</span>
            </div>
            <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
              3 pagos/día × {formData.holding_period_days ?? 1} días = {(formData.holding_period_days ?? 1) * 3} pagos totales
            </div>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="btn btn-primary w-full mt-6 text-lg font-semibold"
        >
          {loading ? '⏳ Calculando...' : '🧮 Calcular Profit Estimado'}
        </button>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Error al calcular
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                {error.includes('Failed') && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    💡 Asegúrate de que el backend esté corriendo en http://localhost:8000
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
                Net Profit
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatUSD(result.net_profit)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {formatUSD(result.net_profit_per_day)}/day
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">APR</div>
              <div className="text-3xl font-bold text-primary-600">
                {formatPercent(result.apr)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                ROI: {formatPercent(result.roi)}
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Fees</div>
              <div className="text-3xl font-bold text-red-600">
                {formatUSD(result.total_fees)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Entry + Exit
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detailed Breakdown</h3>

            <div className="space-y-6">
              {/* Funding Rates */}
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Current Funding Rates
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">SHORT ({result.exchange_short})</div>
                    <div className="text-xl font-bold text-green-600">
                      +{formatPercent(result.rate_short * 100)}
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">LONG ({result.exchange_long})</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatPercent(result.rate_long * 100)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Spread:</span>
                  <span className="font-medium text-gray-900 dark:text-white ml-2">{formatPercent(result.spread_per_interval * 100)}</span>
                </div>
              </div>

              {/* Fees Breakdown */}
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Fees Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Entry Fee (SHORT)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.entry_fee_short)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Entry Fee (LONG)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.entry_fee_long)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Exit Fee (SHORT)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.exit_fee_short)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Exit Fee (LONG)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.exit_fee_long)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                    <span className="text-gray-900 dark:text-white">Total Fees</span>
                    <span className="text-red-600">{formatUSD(result.total_fees)}</span>
                  </div>
                </div>
              </div>

              {/* Funding Payments */}
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Funding Payments
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Payment per Interval</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.funding_payments_per_interval)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Intervals per Day</span>
                    <span className="font-medium text-gray-900 dark:text-white">{result.intervals_per_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Intervals ({result.holding_period_days} days)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{result.total_intervals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Funding Collected (SHORT)</span>
                    <span className="font-medium text-green-600">{formatUSD(result.funding_collected_short)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Funding Paid (LONG)</span>
                    <span className="font-medium text-red-600">{formatUSD(result.funding_paid_long)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                    <span className="text-gray-900 dark:text-white">Net Funding</span>
                    <span className="text-green-600">{formatUSD(result.net_funding)}</span>
                  </div>
                </div>
              </div>

              {/* Final Profit */}
              <div>
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Profit Calculation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Gross Profit (before fees)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatUSD(result.gross_profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Fees</span>
                    <span className="font-medium text-red-600">-{formatUSD(result.total_fees)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-gray-300 dark:border-gray-600 font-bold text-lg">
                    <span className="text-gray-900 dark:text-white">Net Profit</span>
                    <span className="text-green-600">{formatUSD(result.net_profit)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Daily ROI</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatPercent(result.daily_roi)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Risk Warnings
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
