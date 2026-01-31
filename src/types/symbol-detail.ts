// Base types
export interface FundingRate {
  symbol: string;
  exchange: string;
  rate: number;
  apr: number;
  next_funding_time: string;
  timestamp: string;
}

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

export interface ProfitCalculation {
  symbol: string;
  short_exchange: string;
  long_exchange: string;
  position_size: number;
  holding_days: number;
  funding_payment: number;
  entry_fees: number;
  exit_fees: number;
  net_profit: number;
  roi: number;
  apr: number;
}

// New types for Symbol Detail Modal - Updated to match backend API responses

export interface HistoricalFundingData {
  timestamp: string;
  venue_short: string;
  venue_long: string;
  spread_bps: number;
  spread_apr: number;
  rate_short: number;
  rate_long: number;
  delta_apr: number;
  // Legacy field mappings for backward compatibility
  extended_apr?: number;
  lighter_apr?: number;
  extended_rate?: number;
  lighter_rate?: number;
  price?: number;
}

export interface ExchangeDetailInfo {
  name: string;
  type: 'short' | 'long';  // Updated from 'extended' | 'lighter'
  funding_rate: number;
  apr: number;
  maker_fee: number;
  taker_fee: number;
  volume_24h: string;
  open_interest: string;
  last_update: string;
}

export interface LiveFundingSnapshot {
  funding_delta: number;
  funding_delta_apr: number;
  price_spread: number;
  price_spread_bps: number;
  venue_short: string;
  venue_long: string;
  last_update: string;
  is_live: boolean;
  // Legacy field mappings for backward compatibility
  extended_exchange?: string;
  lighter_exchange?: string;
}

export interface ArbitrageSimulation {
  position_size: number;
  holding_days: number;
  extended_funding_payment: number;
  lighter_funding_payment: number;
  net_funding_payment: number;
  entry_fees: number;
  exit_fees: number;
  total_fees: number;
  net_profit: number;
  roi_percentage: number;
  daily_apr: number;
  annualized_apr: number;
}

export interface SymbolAnalytics {
  symbol: string;
  venues: string[];
  data_points_24h: number;
  data_points_7d: number;
  avg_funding_24h: number;
  avg_funding_7d: number;
  max_funding_24h: number;
  min_funding_24h: number;
  apr_24h: number;
  apr_7d: number;
  best_opportunity?: {
    venue_short: string;
    venue_long: string;
    spread_apr: number;
  };
  // Legacy field mappings for backward compatibility
  avg_funding_30d?: number;
  volatility_24h?: number;
  volume_24h?: number;
  open_interest?: number;
  funding_payment_count_24h?: number;
  max_apr_24h?: number;
  min_apr_24h?: number;
}

export interface RiskMetrics {
  liquidation_risk: 'low' | 'medium' | 'high';
  funding_rate_volatility: number;
  exchange_reliability_score: number;
  liquidity_score: number;
  recommended_max_position: number;
  confidence_score: number;
}

// WebSocket message types
export interface WSMessage {
  type: 'funding_update' | 'opportunity_update' | 'price_update';
  data: FundingRate | Opportunity | any;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// Filter and sort types
export type SortDirection = 'asc' | 'desc';

export interface TableSort {
  field: string;
  direction: SortDirection;
}

export interface OpportunityFilters {
  min_apr?: number;
  max_apr?: number;
  min_confidence?: number;
  symbols?: string[];
  exchanges?: string[];
  risk_levels?: ('low' | 'medium' | 'high')[];
}

export interface FundingRateFilters {
  symbols?: string[];
  exchanges?: string[];
  min_apr?: number;
  max_apr?: number;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  symbol: string;
  data: ChartDataPoint[];
  timeframe: '1h' | '4h' | '24h' | '7d' | '15d' | '31d';
}

// User preferences
export interface UserPreferences {
  default_position_size: number;
  default_holding_days: number;
  min_apr_filter: number;
  min_confidence_filter: number;
  favorite_symbols: string[];
  favorite_exchanges: string[];
  notifications_enabled: boolean;
  dark_mode: boolean;
}

// Export grouped types
export type Timeframe = '24h' | '7d' | '15d' | '31d';
export type ExchangeType = 'short' | 'long';  // Updated from 'extended' | 'lighter'
export type RiskLevel = 'low' | 'medium' | 'high';
