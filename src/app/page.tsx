import Dashboard from '@/components/Dashboard';
import { getDb } from '@/lib/db';
import { fetchCurrentPrice } from '@/lib/bitkub';
import { enrichEntries, computeSummary, computeDelta24 } from '@/lib/calc';
import type { Entry, Goals, Holding, HoldingEnriched, PortfolioSummary } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadPortfolio(): Promise<{ holdings: HoldingEnriched[]; summary: PortfolioSummary }> {
  const db = await getDb();
  const rows = await db.all<Holding>(
    'SELECT id, ticker, shares, cost_usd, price_usd, updated_at FROM holdings ORDER BY shares * price_usd DESC',
  );
  const usdThbRow = await db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'usd_thb'");
  const usd_thb = usdThbRow ? Number(usdThbRow.value) : 32.70;

  const withValues = rows.map((r) => ({
    ...r,
    value_usd: r.shares * r.price_usd,
    gain_usd: r.shares * r.price_usd - r.cost_usd,
    gain_pct: ((r.shares * r.price_usd - r.cost_usd) / r.cost_usd) * 100,
    cost_per_share: r.cost_usd / r.shares,
    alloc_pct: 0,
  }));

  const total_value_usd = withValues.reduce((s, h) => s + h.value_usd, 0);
  const total_cost_usd = withValues.reduce((s, h) => s + h.cost_usd, 0);
  const total_gain_usd = total_value_usd - total_cost_usd;

  const holdings: HoldingEnriched[] = withValues.map((h) => ({
    ...h,
    alloc_pct: total_value_usd > 0 ? (h.value_usd / total_value_usd) * 100 : 0,
  }));

  return {
    holdings,
    summary: {
      total_value_usd,
      total_cost_usd,
      total_gain_usd,
      total_gain_pct: total_cost_usd > 0 ? (total_gain_usd / total_cost_usd) * 100 : 0,
      usd_thb,
    },
  };
}

export default async function Page() {
  const db = await getDb();

  const entries = await db.all<Entry>(
    'SELECT id, date, fiat_thb, satoshi, price_thb, created_at FROM entries ORDER BY date ASC',
  );
  const goalRows = await db.all<{ key: string; value: string }>(
    'SELECT key, value FROM settings WHERE key IN (?, ?)',
    ['goal_fiat', 'goal_satoshi'],
  );
  const goalMap = new Map(goalRows.map((r) => [r.key, Number(r.value)]));
  const goals: Goals = {
    goal_fiat: goalMap.get('goal_fiat') ?? 200_000,
    goal_satoshi: goalMap.get('goal_satoshi') ?? 2_000_000,
  };

  const live = await fetchCurrentPrice();
  const priceStale = live === null;
  const currentPrice = live ?? (entries.length > 0 ? entries[entries.length - 1]!.price_thb : 0);

  const enriched = enrichEntries(entries);
  const summary = enriched.length > 0 ? computeSummary(enriched, currentPrice, goals) : null;
  const delta24 = computeDelta24(enriched);
  const portfolio = await loadPortfolio();

  return (
    <Dashboard
      records={enriched}
      summary={summary}
      delta24={delta24}
      currentPrice={currentPrice}
      priceStale={priceStale}
      goals={goals}
      portfolio={portfolio}
    />
  );
}
