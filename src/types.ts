// Shared types — used by API routes, server components, and client components.

export type Entry = {
  id: number;
  date: string;         // 'YYYY-MM-DD'
  fiat_thb: number;     // positive integer
  satoshi: number;      // positive integer (1 BTC = 1e8 sat)
  price_thb: number;    // positive number
  created_at: string;
};

export type EnrichedEntry = Entry & {
  dayActive: number;    // 1-indexed across all entries after sort asc
  cumSat: number;
  cumFiat: number;
  portfolioValue: number;
  invested: number;
  unrealized: number;
  pctUnrealized: number;
  satPerTHB: number;
};

export type Summary = {
  spendFiat: number;
  totalSatoshi: number;
  numberOfDays: number;
  averageCost: number;       // sat per THB
  todaySatPerTHB: number;
  marketValue: number;
  pctProfitLoss: number;
  maxDrawdown: number;       // percent, <= 0
  worstEntryLossPct: number; // worst single DCA entry % loss vs current price, <= 0
  worstEntryLossThb: number; // worst single DCA entry THB loss vs current price, <= 0
  worstEntryDate: string;    // date of worst entry
  bestEntryGainPct: number;  // best single DCA entry % gain vs current price, >= 0
  bestEntryDate: string;     // date of best entry
  progressFiat: number;      // percent
  progressBTC: number;       // percent
  currentPrice: number;      // duplicated for convenience in UI
  goalFiat: number;
  goalSat: number;
};

export type Goals = {
  goal_fiat: number;
  goal_satoshi: number;
};

export type Delta24 = { delta: number; pct: number };

export type Transaction = {
  id: number;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price_usd: number;
  date: string;
  created_at: string;
};

export type Holding = {
  id: number;
  ticker: string;
  shares: number;
  cost_usd: number;
  price_usd: number;
  updated_at: string;
};

export type HoldingEnriched = Holding & {
  value_usd: number;
  gain_usd: number;
  gain_pct: number;
  alloc_pct: number;
  cost_per_share: number;
};

export type PortfolioSummary = {
  total_value_usd: number;
  total_cost_usd: number;
  total_gain_usd: number;
  total_gain_pct: number;
  usd_thb: number;
};

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; fallbackPrice?: number | null };
export type ApiResult<T> = ApiOk<T> | ApiErr;
