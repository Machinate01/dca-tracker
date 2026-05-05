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

  const db = await getDb();
  const latest = await db.get<{ price_thb: number }>(
    'SELECT price_thb FROM entries ORDER BY date DESC LIMIT 1',
  );
  const fallbackPrice = latest ? latest.price_thb : null;
  return NextResponse.json({ ok: false, error: 'bitkub_unavailable', fallbackPrice });
}
