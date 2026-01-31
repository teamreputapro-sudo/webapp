/**
 * API Client for Funding Arbitrage Backend
 *
 * Provides type-safe methods to interact with the FastAPI backend.
 */

import axios, { AxiosInstance } from 'axios';
import type {
  FundingRatesResponse,
  OpportunitiesResponse,
  CalculatorRequest,
  CalculatorResponse,
  HealthResponse,
  HIP3DexesResponse,
  HIP3RatesResponse
} from '../types';
import { getApiBaseUrl } from '../lib/apiBase';

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    console.log('[API] Creating client with baseURL:', baseURL || '(empty - using relative paths)');
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        console.log('[API] Request:', config.method?.toUpperCase(), config.url, config.params);
        return config;
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('[API] Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('[API] Error:', error.response?.status, error.config?.url, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health & Status
  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  // Funding Rates
  async getFundingRates(params?: {
    symbols?: string;
    exchanges?: string;
    min_apr?: number;
    max_apr?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }): Promise<FundingRatesResponse> {
    const response = await this.client.get<FundingRatesResponse>('/api/funding-rates', { params });
    return response.data;
  }

  async getFundingRatesBySymbol(symbol: string): Promise<FundingRatesResponse> {
    const response = await this.client.get<FundingRatesResponse>(`/api/funding-rates/symbol/${symbol}`);
    return response.data;
  }

  async getFundingRatesByExchange(exchange: string): Promise<FundingRatesResponse> {
    const response = await this.client.get<FundingRatesResponse>(`/api/funding-rates/exchange/${exchange}`);
    return response.data;
  }

  async getAvailableSymbols(): Promise<{ symbols: string[]; count: number }> {
    const response = await this.client.get('/api/funding-rates/symbols');
    return response.data;
  }

  async getAvailableExchanges(): Promise<{ exchanges: string[]; count: number }> {
    const response = await this.client.get('/api/funding-rates/exchanges');
    return response.data;
  }

  // Opportunities
  async getOpportunities(params?: {
    symbols?: string;
    exchanges?: string;
    min_net_apr?: number;
    min_confidence?: number;
    sort_by?: string;
    order?: 'asc' | 'desc';
    limit?: number;
  }): Promise<OpportunitiesResponse> {
    const response = await this.client.get<OpportunitiesResponse>('/api/opportunities', { params });
    return response.data;
  }

  async getOpportunityById(opportunityId: string): Promise<OpportunitiesResponse> {
    const response = await this.client.get<OpportunitiesResponse>(`/api/opportunities/${opportunityId}`);
    return response.data;
  }

  async getOpportunitiesBySymbol(symbol: string): Promise<OpportunitiesResponse> {
    const response = await this.client.get<OpportunitiesResponse>(`/api/opportunities/symbol/${symbol}`);
    return response.data;
  }

  // Top Performers
  async getTopPerformers(): Promise<{
    top_24h: { symbol: string; exchange_short: string; exchange_long: string; apr: number; samples: number } | null;
    top_7d: { symbol: string; exchange_short: string; exchange_long: string; apr: number; samples: number } | null;
    top_30d: { symbol: string; exchange_short: string; exchange_long: string; apr: number; samples: number } | null;
    timestamp: string;
    source: string;
  }> {
    const response = await this.client.get('/api/opportunities/top-performers');
    return response.data;
  }

  // Calculator
  async calculateProfit(request: CalculatorRequest): Promise<CalculatorResponse> {
    const response = await this.client.post<CalculatorResponse>('/api/calculator', request);
    return response.data;
  }

  async quickEstimate(symbol: string, positionSize?: number): Promise<any> {
    const params = positionSize ? { position_size: positionSize } : {};
    const response = await this.client.get(`/api/calculator/quick-estimate/${symbol}`, { params });
    return response.data;
  }

  // History (placeholder endpoints)
  async getHistory(symbol: string, params?: {
    exchange?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<any> {
    const response = await this.client.get(`/api/history/${symbol}`, { params });
    return response.data;
  }

  async getHistoryStats(symbol: string, params?: {
    exchange?: string;
    days?: number;
  }): Promise<any> {
    const response = await this.client.get(`/api/history/${symbol}/stats`, { params });
    return response.data;
  }

  async getChartData(symbol: string, params?: {
    exchange?: string;
    days?: number;
    interval?: string;
  }): Promise<any> {
    const response = await this.client.get(`/api/history/${symbol}/chart`, { params });
    return response.data;
  }

  // HIP-3 Markets (User-deployed perpetuals on Hyperliquid)
  async getHIP3Dexes(): Promise<HIP3DexesResponse> {
    const response = await this.client.get<HIP3DexesResponse>('/api/hip3/dexes');
    return response.data;
  }

  async getHIP3Rates(params?: {
    dex?: string;
    min_apr?: number;
    max_apr?: number;
    symbol?: string;
    sort_by?: 'apr' | 'volume_24h' | 'open_interest';
    order?: 'asc' | 'desc';
    limit?: number;
  }): Promise<HIP3RatesResponse> {
    const response = await this.client.get<HIP3RatesResponse>('/api/hip3/rates', { params });
    return response.data;
  }

  async getHIP3DexMarkets(dexName: string, params?: {
    sort_by?: 'apr' | 'volume_24h' | 'open_interest' | 'symbol';
    order?: 'asc' | 'desc';
  }): Promise<any> {
    const response = await this.client.get(`/api/hip3/dex/${dexName}/markets`, { params });
    return response.data;
  }

  async getHIP3MarketDetail(symbol: string): Promise<any> {
    const response = await this.client.get(`/api/hip3/market/${symbol}`);
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;
