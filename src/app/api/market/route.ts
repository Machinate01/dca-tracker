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

// Server-side in-memory cache — survives warm Vercel instances.
// Multiple client components poll this endpoint every 60 s; the cache
// ensures only ONE real Finnhub request fires per minute regardless of
// how many components are calling simultaneously.
let _cache: { data: MarketData; ts: number } | null = null;
const CACHE_TTL = 55_000; // 55 s — slightly under the 60 s client interval

export async function GET(req: Request): Promise<NextResponse<ApiResult<MarketData>>> {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers'); // e.g. ?tickers=VOO,MSFT

  let tickers: string[];
  if (tickersParam) {
    // Single / comma-separated list from caller (e.g. AddBuyModal live preview).
    // Never cache these — caller wants a fresh quote for a specific symbol.
    tickers = tickersParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  } else {
    // Full portfolio refresh — return cached result if still fresh.
    if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
      return NextResponse.json({ ok: true, data: _cache.data });
    }
    const db = await getDb();
    const rows = await db.all<Pick<Holding, 'ticker'>>('SELECT ticker FROM holdings');
    tickers = rows.map((r) => r.ticker);
  }

  const live = await fetchLivePrices(tickers);
  const usd_thb = live['USDTHB=X'] ?? null;
  delete live['USDTHB=X'];

  const data: MarketData = { prices: live, usd_thb, fetched_at: new Date().toISOString() };

  // Store in cache only for full-portfolio fetches
  if (!tickersParam) {
    _cache = { data, ts: Date.now() };
  }

  return NextResponse.json({ ok: true, data });
}
