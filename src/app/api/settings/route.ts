import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Goals, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readGoals(): Promise<Goals> {
  const db = await getDb();
  const rows = await db.all<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN (?, ?)",
    ['goal_fiat', 'goal_satoshi'],
  );
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  return {
    goal_fiat: map.get('goal_fiat') ?? 200_000,
    goal_satoshi: map.get('goal_satoshi') ?? 2_000_000,
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
  const { goal_fiat, goal_satoshi } = body as { goal_fiat?: unknown; goal_satoshi?: unknown };

  const db = await getDb();
  const upsertSql = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value';

  if (goal_fiat !== undefined) {
    const v = Number(goal_fiat);
    if (!Number.isInteger(v) || v <= 0 || v > 1_000_000_000) {
      return NextResponse.json({ ok: false, error: 'invalid_goal_fiat' }, { status: 400 });
    }
    await db.run(upsertSql, ['goal_fiat', String(v)]);
  }
  if (goal_satoshi !== undefined) {
    const v = Number(goal_satoshi);
    if (!Number.isInteger(v) || v <= 0 || v > 1_000_000_000) {
      return NextResponse.json({ ok: false, error: 'invalid_goal_satoshi' }, { status: 400 });
    }
    await db.run(upsertSql, ['goal_satoshi', String(v)]);
  }

  return NextResponse.json({ ok: true, data: await readGoals() });
}
