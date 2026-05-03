import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Entry, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx): Promise<NextResponse<ApiResult<Entry>>> {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const { fiat_thb, price_thb } = body as { fiat_thb?: unknown; price_thb?: unknown };

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
  const existing = db.prepare('SELECT id FROM entries WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  db.prepare('UPDATE entries SET fiat_thb = ?, price_thb = ?, satoshi = ? WHERE id = ?')
    .run(fiat, price, satoshi, id);

  const row = db
    .prepare('SELECT id, date, fiat_thb, satoshi, price_thb, created_at FROM entries WHERE id = ?')
    .get(id) as Entry;
  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(_req: Request, ctx: RouteCtx): Promise<NextResponse<ApiResult<{ id: number }>>> {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const info = getDb().prepare('DELETE FROM entries WHERE id = ?').run(id);
  if (info.changes === 0) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
