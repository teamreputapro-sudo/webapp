import axios, { AxiosInstance } from 'axios';
import type {
  FundingRate,
  Opportunity,
  HistoricalFundingData,
  ExchangeDetailInfo,
  LiveFundingSnapshot,
  SymbolAnalytics,
  RiskMetrics,
  APIResponse,
  PaginatedResponse,
  Timeframe
} from '../types';
import { getApiBaseUrl } from '../lib/apiBase';

const API_BASE_URL = getApiBaseUrl();

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('[API] Response error:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          console.error('[API] No response received:', error.request);
        } else {
          console.error('[API] Request setup error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== EXISTING ENDPOINTS ====================

  /**
   * Get current funding rates for all symbols and exchanges
   */
  async getFundingRates(): Promise<FundingRate[]> {
    const response = await this.client.get<APIResponse<FundingRate[]>>('/api/funding-rates');
    return response.data.data;
  }

  /**
   * Get detected arbitrage opportunities
   */
  async getOpportunities(): Promise<Opportunity[]> {
    const response = await this.client.get<APIResponse<Opportunity[]>>('/api/opportunities');
    return response.data.data;
  }

  /**
   * Calculate profit for a specific arbitrage setup
   */
  async calculateProfit(params: {
    symbol: string;
    short_exchange: string;
    long_exchange: string;
    position_size: number;
    holding_days: number;
  }) {
    const response = await this.client.post('/api/calculate-profit', params);
    return response.data;
  }

  // ==================== NEW ENDPOINTS FOR MODAL ====================

  /**
   * Get historical funding rate data for a symbol
   * @param symbol - Trading pair symbol (e.g., "BTCUSDT")
   * @param timeframe - Time range for historical data
   * @param exchanges - Optional list of specific exchanges
   */
  async getHistoricalFunding(
    symbol: string,
    timeframe: Timeframe = '24h',
    exchanges?: string[]
  ): Promise<HistoricalFundingData[]> {
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);
    if (exchanges && exchanges.length > 0) {
      exchanges.forEach(ex => params.append('exchanges', ex));
    }

    const response = await this.client.get<HistoricalFundingData[]>(
      `/api/symbol-detail/history/${symbol}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get detailed exchange information for a symbol
   * @param symbol - Trading pair symbol
   */
  async getExchangeInfo(symbol: string): Promise<ExchangeDetailInfo[]> {
    const response = await this.client.get<ExchangeDetailInfo[]>(
      `/api/symbol-detail/exchanges/${symbol}`
    );
    return response.data;
  }

  /**
   * Get live funding snapshot with real-time delta calculations
   * @param symbol - Trading pair symbol
   */
  async getLiveSnapshot(symbol: string): Promise<LiveFundingSnapshot> {
    const response = await this.client.get<LiveFundingSnapshot>(
      `/api/symbol-detail/snapshot/${symbol}`
    );
    return response.data;
  }

  /**
   * Get comprehensive analytics for a symbol
   * @param symbol - Trading pair symbol
   */
  async getSymbolAnalytics(symbol: string): Promise<SymbolAnalytics> {
    const response = await this.client.get<SymbolAnalytics>(
      `/api/symbol-detail/analytics/${symbol}`
    );
    return response.data;
  }

  /**
   * Get risk metrics for a specific arbitrage opportunity
   * @param symbol - Trading pair symbol
   * @param shortExchange - Exchange to short
   * @param longExchange - Exchange to long
   */
  async getRiskMetrics(
    symbol: string,
    shortExchange: string,
    longExchange: string
  ): Promise<RiskMetrics> {
    const response = await this.client.get<RiskMetrics>(
      `/api/symbol-detail/risk-metrics/${symbol}`,
      {
        params: {
          short_exchange: shortExchange,
          long_exchange: longExchange,
        },
      }
    );
    return response.data;
  }

  /**
   * Get paginated funding rate history
   * @param symbol - Trading pair symbol
   * @param page - Page number
   * @param pageSize - Items per page
   */
  async getPaginatedHistory(
    symbol: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<PaginatedResponse<HistoricalFundingData>> {
    const response = await this.client.get<PaginatedResponse<HistoricalFundingData>>(
      `/api/symbol-detail/history/${symbol}`,
      {
        params: { page, page_size: pageSize },
      }
    );
    return response.data;
  }

  /**
   * Search symbols by query
   * @param query - Search string
   * @param limit - Maximum results
   */
  async searchSymbols(query: string, limit: number = 10): Promise<string[]> {
    const response = await this.client.get<APIResponse<string[]>>(
      '/api/symbols/search',
      {
        params: { q: query, limit },
      }
    );
    return response.data.data;
  }

  /**
   * Get all available symbols
   */
  async getAvailableSymbols(): Promise<string[]> {
    const response = await this.client.get<APIResponse<string[]>>('/api/symbols');
    return response.data.data;
  }

  /**
   * Get all available exchanges
   */
  async getAvailableExchanges(): Promise<string[]> {
    const response = await this.client.get<APIResponse<string[]>>('/api/exchanges');
    return response.data.data;
  }

  /**
   * Export data to CSV
   * @param symbol - Trading pair symbol
   * @param timeframe - Time range for data
   */
  async exportToCSV(symbol: string, timeframe: Timeframe): Promise<Blob> {
    const response = await this.client.get(
      `/api/symbol-detail/export/${symbol}`,
      {
        params: { timeframe, format: 'csv' },
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Create singleton instance
export const api = new APIClient();

// Export class for custom instances
export default APIClient;

// ==================== MOCK DATA GENERATORS ====================
// Fallback mock data - Only used when TimescaleDB/backend is unavailable

export const mockAPI = {
  /**
   * Generate mock historical data
   * Updated to match backend API response format
   */
  generateMockHistoricalData(
    _symbol: string,
    timeframe: Timeframe
  ): HistoricalFundingData[] {
    const hoursMap: Record<Timeframe, number> = {
      '24h': 24,
      '7d': 168,
      '15d': 360,
      '31d': 744,
    };

    const hours = hoursMap[timeframe];
    const dataPoints = Math.min(hours, 100); // Max 100 points
    const interval = (hours * 60 * 60 * 1000) / dataPoints;
    const now = Date.now();
    const venues = ['hyperliquid', 'lighter', 'pacifica', 'extended'];

    return Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = new Date(now - (dataPoints - i) * interval).toISOString();
      const shortAPR = 50 + Math.random() * 100;
      const longAPR = -20 + Math.random() * 40;
      const spreadAPR = shortAPR - longAPR;

      return {
        timestamp,
        venue_short: venues[Math.floor(Math.random() * 2)],
        venue_long: venues[2 + Math.floor(Math.random() * 2)],
        spread_bps: spreadAPR / 365 / 24 * 10000,
        spread_apr: spreadAPR,
        rate_short: shortAPR / 100 / 365 / 24,
        rate_long: longAPR / 100 / 365 / 24,
        delta_apr: spreadAPR,
      };
    });
  },

  /**
   * Generate mock exchange info
   * Updated to match backend API response format
   */
  generateMockExchangeInfo(_symbol: string): ExchangeDetailInfo[] {
    const venues = ['hyperliquid', 'lighter', 'pacifica', 'extended'];

    return venues.map((venue, idx) => ({
      name: venue,
      type: idx < 2 ? 'short' : 'long' as const,
      funding_rate: (idx < 2 ? 0.0001 : -0.00005) * (1 + Math.random()),
      apr: (idx < 2 ? 50 : -20) * (1 + Math.random()),
      maker_fee: 0,
      taker_fee: 0.025,
      volume_24h: `$${(Math.random() * 50 + 10).toFixed(2)}M`,
      open_interest: `$${(Math.random() * 2 + 0.5).toFixed(2)}M`,
      last_update: new Date().toISOString(),
    }));
  },

  /**
   * Generate mock live snapshot
   * Updated to match backend API response format
   */
  generateMockLiveSnapshot(_symbol: string): LiveFundingSnapshot {
    const spreadAPR = 30 + Math.random() * 70;

    return {
      funding_delta: spreadAPR / 100 / 365 / 24,
      funding_delta_apr: spreadAPR,
      price_spread: Math.random() * 0.2,
      price_spread_bps: Math.random() * 20,
      venue_short: 'hyperliquid',
      venue_long: 'pacifica',
      last_update: new Date().toISOString(),
      is_live: false,  // Mark as not live since it's mock data
    };
  },

  /**
   * Generate mock analytics
   * Updated to match backend API response format
   */
  generateMockAnalytics(symbol: string): SymbolAnalytics {
    return {
      symbol,
      venues: ['hyperliquid', 'lighter', 'pacifica', 'extended'],
      data_points_24h: Math.floor(Math.random() * 1000) + 500,
      data_points_7d: Math.floor(Math.random() * 7000) + 3500,
      avg_funding_24h: Math.random() * 0.0002,
      avg_funding_7d: Math.random() * 0.00015,
      max_funding_24h: Math.random() * 0.0005,
      min_funding_24h: -Math.random() * 0.0001,
      apr_24h: 30 + Math.random() * 50,
      apr_7d: 25 + Math.random() * 40,
      best_opportunity: {
        venue_short: 'hyperliquid',
        venue_long: 'pacifica',
        spread_apr: 40 + Math.random() * 60,
      },
    };
  },

  /**
   * Generate mock risk metrics
   */
  generateMockRiskMetrics(): RiskMetrics {
    const confidence = Math.random() * 100;

    return {
      liquidation_risk: confidence > 80 ? 'low' : confidence > 60 ? 'medium' : 'high',
      funding_rate_volatility: Math.random() * 0.05,
      exchange_reliability_score: Math.random() * 100,
      liquidity_score: Math.random() * 100,
      recommended_max_position: Math.floor(Math.random() * 50000) + 10000,
      confidence_score: confidence,
    };
  },
};

// ==================== USAGE EXAMPLES ====================

// Example 1: Fetch historical data with fallback to mock
export async function fetchHistoricalDataWithFallback(
  symbol: string,
  timeframe: Timeframe
): Promise<HistoricalFundingData[]> {
  try {
    return await api.getHistoricalFunding(symbol, timeframe);
  } catch (error) {
    console.warn('Using mock data for historical funding');
    return mockAPI.generateMockHistoricalData(symbol, timeframe);
  }
}

// Example 2: Fetch all symbol data for modal
export async function fetchSymbolDetailData(symbol: string) {
  try {
    const [historical, exchanges, snapshot, analytics] = await Promise.all([
      api.getHistoricalFunding(symbol, '24h'),
      api.getExchangeInfo(symbol),
      api.getLiveSnapshot(symbol),
      api.getSymbolAnalytics(symbol),
    ]);

    return {
      historical,
      exchanges,
      snapshot,
      analytics,
    };
  } catch (error) {
    console.error('Error fetching symbol detail data:', error);
    
    // Fallback to mock data
    return {
      historical: mockAPI.generateMockHistoricalData(symbol, '24h'),
      exchanges: mockAPI.generateMockExchangeInfo(symbol),
      snapshot: mockAPI.generateMockLiveSnapshot(symbol),
      analytics: mockAPI.generateMockAnalytics(symbol),
    };
  }
}

// Example 3: Download CSV export
export async function downloadSymbolDataCSV(symbol: string, timeframe: Timeframe) {
  try {
    const blob = await api.exportToCSV(symbol, timeframe);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_funding_${timeframe}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    alert('Failed to download CSV. Please try again.');
  }
}
