import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Transaction, Holding, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request): Promise<NextResponse<ApiResult<Transaction[]>>> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  const db = await getDb();
  const rows = ticker
    ? await db.all<Transaction>('SELECT * FROM transactions WHERE ticker = ? ORDER BY date DESC, id DESC', [ticker])
    : await db.all<Transaction>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request): Promise<NextResponse<ApiResult<{ transaction: Transaction; holding: Holding }>>> {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { ticker, type, shares, price_usd, date } = body as Record<string, unknown>;

  if (typeof ticker !== 'string' || !ticker.trim()) {
    return NextResponse.json({ ok: false, error: 'invalid_ticker' }, { status: 400 });
  }
  if (type !== 'buy' && type !== 'sell') {
    return NextResponse.json({ ok: false, error: 'invalid_type' }, { status: 400 });
  }
  const sharesNum = Number(shares);
  if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_shares' }, { status: 400 });
  }
  const priceNum = Number(price_usd);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_price_usd' }, { status: 400 });
  }
  const dateStr = typeof date === 'string' && DATE_RE.test(date) ? date : new Date().toISOString().slice(0, 10);
  const tickerUp = (ticker as string).toUpperCase();

  const db = await getDb();
  const existing = await db.get<Holding>('SELECT * FROM holdings WHERE ticker = ?', [tickerUp]);

  if (type === 'sell') {
    if (!existing) return NextResponse.json({ ok: false, error: 'ticker_not_found' }, { status: 404 });
    if (sharesNum > existing.shares + 1e-9) {
      return NextResponse.json({ ok: false, error: 'insufficient_shares' }, { status: 400 });
    }
  }

  const txInfo = await db.run(
    'INSERT INTO transactions (ticker, type, shares, price_usd, date) VALUES (?, ?, ?, ?, ?)',
    [tickerUp, type, sharesNum, priceNum, dateStr],
  );
  const tx = await db.get<Transaction>('SELECT * FROM transactions WHERE id = ?', [Number(txInfo.lastInsertRowid)]);

  if (type === 'buy') {
    if (existing) {
      await db.run(
        'UPDATE holdings SET shares = ?, cost_usd = ?, price_usd = ?, updated_at = datetime(\'now\') WHERE ticker = ?',
        [existing.shares + sharesNum, existing.cost_usd + sharesNum * priceNum, priceNum, tickerUp],
      );
    } else {
      await db.run(
        'INSERT INTO holdings (ticker, shares, cost_usd, price_usd) VALUES (?, ?, ?, ?)',
        [tickerUp, sharesNum, sharesNum * priceNum, priceNum],
      );
    }
  } else {
    const newShares = existing!.shares - sharesNum;
    if (newShares < 1e-9) {
      await db.run('DELETE FROM holdings WHERE ticker = ?', [tickerUp]);
    } else {
      const newCost = existing!.cost_usd * (newShares / existing!.shares);
      await db.run(
        'UPDATE holdings SET shares = ?, cost_usd = ?, updated_at = datetime(\'now\') WHERE ticker = ?',
        [newShares, newCost, tickerUp],
      );
    }
  }

  const holding = await db.get<Holding>('SELECT * FROM holdings WHERE ticker = ?', [tickerUp]);
  return NextResponse.json({ ok: true, data: { transaction: tx!, holding: holding! } }, { status: 201 });
}

export async function DELETE(req: Request): Promise<NextResponse<ApiResult<{ id: number }>>> {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }
  const db = await getDb();
  const info = await db.run('DELETE FROM transactions WHERE id = ?', [id]);
  if (info.rowsAffected === 0) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
