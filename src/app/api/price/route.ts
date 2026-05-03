import { NextResponse } from 'next/server';
import { fetchCurrentPrice } from '@/lib/bitkub';
import { getDb } from '@/lib/db';
import type { ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiResult<{ price: number }>>> {
  const price = await fetchCurrentPrice();
  if (price !== null) {
    return NextResponse.json({ ok: true, data: { price } });
  }

  const latest = getDb()
    .prepare('SELECT price_thb FROM entries ORDER BY date DESC LIMIT 1')
    .get() as { price_thb: number } | undefined;
  const fallbackPrice = latest ? latest.price_thb : null;

  // Always HTTP 200 so client fetch code stays simple; the `ok: false` envelope signals failure.
  return NextResponse.json({ ok: false, error: 'bitkub_unavailable', fallbackPrice });
}
