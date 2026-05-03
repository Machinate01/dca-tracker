import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Entry, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(): Promise<NextResponse<ApiResult<Entry[]>>> {
  const rows = getDb()
    .prepare('SELECT id, date, fiat_thb, satoshi, price_thb, created_at FROM entries ORDER BY date ASC')
    .all() as Entry[];
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request): Promise<NextResponse<ApiResult<Entry>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const { date, fiat_thb, price_thb } = body as { date?: unknown; fiat_thb?: unknown; price_thb?: unknown };

  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'invalid_date' }, { status: 400 });
  }
  const fiat = Number(fiat_thb);
  if (!Number.isInteger(fiat) || fiat <= 0 || fiat > 10_000_000) {
    return NextResponse.json({ ok: false, error: 'invalid_fiat_thb' }, { status: 400 });
  }
  const price = Number(price_thb);
  if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) {
    return NextResponse.json({ ok: false, error: 'invalid_price_thb' }, { status: 400 });
  }

  const satoshi = Math.floor((fiat / price) * 1e8);
  if (satoshi <= 0) {
    return NextResponse.json({ ok: false, error: 'satoshi_non_positive' }, { status: 400 });
  }

  const db = getDb();
  try {
    const info = db
      .prepare('INSERT INTO entries (date, fiat_thb, satoshi, price_thb) VALUES (?, ?, ?, ?)')
      .run(date, fiat, satoshi, price);
    const row = db
      .prepare('SELECT id, date, fiat_thb, satoshi, price_thb, created_at FROM entries WHERE id = ?')
      .get(info.lastInsertRowid) as Entry;
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ ok: false, error: 'duplicate_date' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}
