/**
 * TypeScript types for Funding Arbitrage Webapp
 */

export interface FundingRate {
  exchange: string;
  symbol: string;
  rate: number;
  rate_8h: number;
  apr: number;
  interval_hours: number;
  next_funding_time: string;
  timestamp: string;
}

export interface FundingRatesResponse {
  rates: FundingRate[];
  count: number;
  timestamp: string;
}

export interface ArbitrageOpportunity {
  opportunity_id: string;
  symbol: string;
  exchange_short: string;
  rate_short: number;
  rate_short_8h: number;
  exchange_long: string;
  rate_long: number;
  rate_long_8h: number;
  spread_per_interval: number;
  spread_8h: number;
  gross_apr: number;
  net_apr: number;
  entry_fees_pct: number;
  ongoing_fees_per_day: number;
  execution_risk: number;
  liquidity_score: number;
  confidence: number;
  min_position_size_usd: number;
  max_position_size_usd: number;
  recommended_position_size_usd: number;
  timestamp: string;
  expires_at: string | null;
}

export interface OpportunitiesResponse {
  opportunities: ArbitrageOpportunity[];
  count: number;
  timestamp: string;
}

export interface CalculatorRequest {
  symbol: string;
  exchange_short: string;
  exchange_long: string;
  position_size_usd: number;
  holding_period_days?: number;
}

export interface CalculatorResponse {
  symbol: string;
  exchange_short: string;
  exchange_long: string;
  position_size_usd: number;
  holding_period_days: number;
  rate_short: number;
  rate_long: number;
  spread_per_interval: number;
  entry_fee_short: number;
  entry_fee_long: number;
  total_entry_fees: number;
  exit_fee_short: number;
  exit_fee_long: number;
  total_exit_fees: number;
  total_fees: number;
  funding_payments_per_interval: number;
  intervals_per_day: number;
  total_intervals: number;
  funding_collected_short: number;
  funding_paid_long: number;
  net_funding: number;
  gross_profit: number;
  net_profit: number;
  roi: number;
  apr: number;
  net_profit_per_day: number;
  daily_roi: number;
  warnings: string[];
}

export interface WebSocketMessage {
  type: 'initial_data' | 'funding_rates_update' | 'opportunities_update' | 'echo' | 'trade_executed' | 'candle_update';
  data?: any;
  message?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  funding_service: string;
  websocket_connections: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

// Re-export types from symbol-detail
export * from './symbol-detail';

// Legacy Opportunity type (for backward compatibility)
export interface Opportunity {
  symbol: string;
  short_exchange: string;
  long_exchange: string;
  short_apr: number;
  long_apr: number;
  net_apr: number;
  recommended_size: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
}

// HIP-3 Markets (User-deployed perpetuals on Hyperliquid)
export interface HIP3Dex {
  name: string;
  full_name: string;
  deployer: string;
  markets_count: number;
}

export interface HIP3DexesResponse {
  dexes: HIP3Dex[];
  count: number;
  timestamp: string;
}

export interface HIP3MarketRate {
  symbol: string;
  dex_name: string;
  rate_1h: number;
  rate_8h: number;
  apr: number;
  mark_price: number | null;
  open_interest: number | null;
  volume_24h: number | null;
  timestamp: string;
}

export interface HIP3RatesResponse {
  rates: HIP3MarketRate[];
  count: number;
  dex_name: string | null;
  timestamp: string;
}
