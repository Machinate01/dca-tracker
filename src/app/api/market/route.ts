import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchLivePrices } from '@/lib/market';
import type { Holding, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type MarketData = {
  prices: Record<string, number>;
  usd_thb: number | null;
  fetched_at: string;
};

export async function GET(req: Request): Promise<NextResponse<ApiResult<MarketData>>> {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers'); // e.g. ?tickers=VOO,MSFT

  let tickers: string[];
  if (tickersParam) {
    // single or comma-separated list from caller
    tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  } else {
    // default: fetch all holdings
    const db = await getDb();
    const rows = await db.all<Pick<Holding, 'ticker'>>('SELECT ticker FROM holdings');
    tickers = rows.map((r) => r.ticker);
  }

  const live = await fetchLivePrices(tickers);
  const usd_thb = live['USDTHB=X'] ?? null;
  delete live['USDTHB=X'];

  return NextResponse.json({
    ok: true,
    data: { prices: live, usd_thb, fetched_at: new Date().toISOString() },
  });
}
