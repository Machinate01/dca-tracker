import type { Entry, EnrichedEntry, Summary, Goals, Delta24 } from '@/types';

// Walk entries oldest -> newest. Input must be pre-sorted ASC by date.
export function enrichEntries(entries: Entry[]): EnrichedEntry[] {
  let cumSat = 0;
  let cumFiat = 0;
  return entries.map((e, i) => {
    cumSat += e.satoshi;
    cumFiat += e.fiat_thb;
    const portfolioValue = (cumSat / 1e8) * e.price_thb;
    const invested = cumFiat;
    const unrealized = portfolioValue - invested;
    const pctUnrealized = invested > 0 ? (unrealized / invested) * 100 : 0;
    const satPerTHB = 1e8 / e.price_thb;
    return {
      ...e,
      dayActive: i + 1,
      cumSat,
      cumFiat,
      portfolioValue,
      invested,
      unrealized,
      pctUnrealized,
      satPerTHB,
    };
  });
}

export function computeSummary(
  enriched: EnrichedEntry[],
  currentPrice: number,
  goals: Goals,
): Summary {
  if (enriched.length === 0) {
    return {
      spendFiat: 0,
      totalSatoshi: 0,
      numberOfDays: 0,
      averageCost: 0,
      todaySatPerTHB: currentPrice > 0 ? 1e8 / currentPrice : 0,
      marketValue: 0,
      pctProfitLoss: 0,
      maxDrawdown: 0,
      worstEntryLossPct: 0,
      worstEntryLossThb: 0,
      worstEntryDate: '',
      bestEntryGainPct: 0,
      bestEntryDate: '',
      progressFiat: 0,
      progressBTC: 0,
      currentPrice,
      goalFiat: goals.goal_fiat,
      goalSat: goals.goal_satoshi,
    };
  }

  const spendFiat = enriched.reduce((s, e) => s + e.fiat_thb, 0);
  const totalSatoshi = enriched.reduce((s, e) => s + e.satoshi, 0);
  const numberOfDays = enriched.length;
  const averageCost = spendFiat > 0 ? totalSatoshi / spendFiat : 0;
  const todaySatPerTHB = currentPrice > 0 ? 1e8 / currentPrice : 0;
  const marketValue = (totalSatoshi / 1e8) * currentPrice;
  const pctProfitLoss = spendFiat > 0 ? ((marketValue - spendFiat) / spendFiat) * 100 : 0;

  let peak = 0;
  let maxDrawdown = 0;
  for (const e of enriched) {
    if (e.portfolioValue > peak) peak = e.portfolioValue;
    if (peak > 0) {
      const dd = ((e.portfolioValue - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
  }

  let worstEntryLossPct = 0;
  let worstEntryLossThb = 0;
  let worstEntryDate = '';
  let bestEntryGainPct = 0;
  let bestEntryDate = '';
  for (const e of enriched) {
    const currentVal = (e.satoshi / 1e8) * currentPrice;
    const diffThb = currentVal - e.fiat_thb;
    const pct = e.fiat_thb > 0 ? (diffThb / e.fiat_thb) * 100 : 0;
    if (pct < worstEntryLossPct) {
      worstEntryLossPct = pct;
      worstEntryLossThb = diffThb;
      worstEntryDate = e.date;
    }
    if (pct > bestEntryGainPct) {
      bestEntryGainPct = pct;
      bestEntryDate = e.date;
    }
  }

  const progressFiat = goals.goal_fiat > 0 ? (marketValue / goals.goal_fiat) * 100 : 0;
  const progressBTC = goals.goal_satoshi > 0 ? (totalSatoshi / goals.goal_satoshi) * 100 : 0;

  return {
    spendFiat,
    totalSatoshi,
    numberOfDays,
    averageCost,
    todaySatPerTHB,
    marketValue,
    pctProfitLoss,
    maxDrawdown,
    worstEntryLossPct,
    worstEntryLossThb,
    worstEntryDate,
    bestEntryGainPct,
    bestEntryDate,
    progressFiat,
    progressBTC,
    currentPrice,
    goalFiat: goals.goal_fiat,
    goalSat: goals.goal_satoshi,
  };
}

export function computeDelta24(enriched: EnrichedEntry[]): Delta24 | null {
  if (enriched.length < 2) return null;
  const last = enriched[enriched.length - 1]!;
  const prev = enriched[enriched.length - 2]!;
  const delta = last.portfolioValue - prev.portfolioValue;
  const pct = prev.portfolioValue > 0 ? (delta / prev.portfolioValue) * 100 : 0;
  return { delta, pct };
}
