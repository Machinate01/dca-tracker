import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Goals, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSERT = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';

async function readGoals(): Promise<Goals> {
  const db = await getDb();
  const rows = await db.all<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN (?, ?, ?)",
    ['goal_fiat', 'goal_satoshi', 'stock_goal_usd'],
  );
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  return {
    goal_fiat:       map.get('goal_fiat')       ?? 200_000,
    goal_satoshi:    map.get('goal_satoshi')     ?? 2_000_000,
    stock_goal_usd:  map.get('stock_goal_usd')   ?? 5_000,
  };
}

export async function GET(): Promise<NextResponse<ApiResult<Goals>>> {
  return NextResponse.json({ ok: true, data: await readGoals() });
}

export async function PATCH(req: Request): Promise<NextResponse<ApiResult<Goals>>> {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const { goal_fiat, goal_satoshi, stock_goal_usd } = body as Record<string, unknown>;

  const db = await getDb();

  if (goal_fiat !== undefined) {
    const v = Number(goal_fiat);
    if (!Number.isInteger(v) || v <= 0 || v > 1_000_000_000)
      return NextResponse.json({ ok: false, error: 'invalid_goal_fiat' }, { status: 400 });
    await db.run(UPSERT, ['goal_fiat', String(v)]);
  }
  if (goal_satoshi !== undefined) {
    const v = Number(goal_satoshi);
    if (!Number.isInteger(v) || v <= 0 || v > 1_000_000_000)
      return NextResponse.json({ ok: false, error: 'invalid_goal_satoshi' }, { status: 400 });
    await db.run(UPSERT, ['goal_satoshi', String(v)]);
  }
  if (stock_goal_usd !== undefined) {
    const v = Number(stock_goal_usd);
    if (!Number.isFinite(v) || v <= 0 || v > 10_000_000)
      return NextResponse.json({ ok: false, error: 'invalid_stock_goal_usd' }, { status: 400 });
    await db.run(UPSERT, ['stock_goal_usd', String(v)]);
  }

  return NextResponse.json({ ok: true, data: await readGoals() });
}
