import Dashboard from '@/components/Dashboard';
import { getDb } from '@/lib/db';
import { fetchCurrentPrice } from '@/lib/bitkub';
import { enrichEntries, computeSummary, computeDelta24 } from '@/lib/calc';
import type { Entry, Goals } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();

  const entries = db
    .prepare('SELECT id, date, fiat_thb, satoshi, price_thb, created_at FROM entries ORDER BY date ASC')
    .all() as Entry[];

  const goalRows = db
    .prepare('SELECT key, value FROM settings WHERE key IN (?, ?)')
    .all('goal_fiat', 'goal_satoshi') as Array<{ key: string; value: string }>;
  const goalMap = new Map(goalRows.map((r) => [r.key, Number(r.value)]));
  const goals: Goals = {
    goal_fiat: goalMap.get('goal_fiat') ?? 200_000,
    goal_satoshi: goalMap.get('goal_satoshi') ?? 2_000_000,
  };

  const live = await fetchCurrentPrice();
  const priceStale = live === null;
  const currentPrice =
    live !== null
      ? live
      : entries.length > 0
        ? entries[entries.length - 1]!.price_thb
        : 0;

  const enriched = enrichEntries(entries);
  const summary = enriched.length > 0 ? computeSummary(enriched, currentPrice, goals) : null;
  const delta24 = computeDelta24(enriched);

  return (
    <Dashboard
      records={enriched}
      summary={summary}
      delta24={delta24}
      currentPrice={currentPrice}
      priceStale={priceStale}
      goals={goals}
    />
  );
}
