import { NextResponse } from 'next/server';
import { getDb, type Db } from '@/lib/db';
import type { Holding, HoldingEnriched, PortfolioSummary, ApiResult } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function enrichHoldings(db: Db): Promise<{ holdings: HoldingEnriched[]; summary: PortfolioSummary }> {
  const rows = await db.all<Holding>(
    'SELECT id, ticker, shares, cost_usd, price_usd, updated_at FROM holdings ORDER BY shares * price_usd DESC',
  );
  const usdThbRow = await db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'usd_thb'");
  const usd_thb = usdThbRow ? Number(usdThbRow.value) : 32.70;

  const withValues = rows.map((r) => ({
    ...r,
    value_usd: r.shares * r.price_usd,
    gain_usd: r.shares * r.price_usd - r.cost_usd,
    gain_pct: ((r.shares * r.price_usd - r.cost_usd) / r.cost_usd) * 100,
    cost_per_share: r.cost_usd / r.shares,
    alloc_pct: 0,
  }));

  const total_value_usd = withValues.reduce((s, h) => s + h.value_usd, 0);
  const total_cost_usd = withValues.reduce((s, h) => s + h.cost_usd, 0);
  const total_gain_usd = total_value_usd - total_cost_usd;

  const holdings: HoldingEnriched[] = withValues.map((h) => ({
    ...h,
    alloc_pct: total_value_usd > 0 ? (h.value_usd / total_value_usd) * 100 : 0,
  }));

  return {
    holdings,
    summary: {
      total_value_usd,
      total_cost_usd,
      total_gain_usd,
      total_gain_pct: total_cost_usd > 0 ? (total_gain_usd / total_cost_usd) * 100 : 0,
      usd_thb,
    },
  };
}

export async function GET(): Promise<NextResponse<ApiResult<{ holdings: HoldingEnriched[]; summary: PortfolioSummary }>>> {
  const db = await getDb();
  return NextResponse.json({ ok: true, data: await enrichHoldings(db) });
}

export async function PATCH(req: Request): Promise<NextResponse<ApiResult<{ holdings: HoldingEnriched[]; summary: PortfolioSummary }>>> {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { ticker, price_usd, usd_thb } = body as { ticker?: unknown; price_usd?: unknown; usd_thb?: unknown };
  const db = await getDb();
  const upsertSql = "INSERT INTO settings (key, value) VALUES ('usd_thb', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";

  if (usd_thb !== undefined) {
    const rate = Number(usd_thb);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_usd_thb' }, { status: 400 });
    }
    await db.run(upsertSql, [String(rate)]);
  }

  if (ticker !== undefined) {
    if (typeof ticker !== 'string') {
      return NextResponse.json({ ok: false, error: 'invalid_ticker' }, { status: 400 });
    }
    const price = Number(price_usd);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_price_usd' }, { status: 400 });
    }
    const existing = await db.get('SELECT id FROM holdings WHERE ticker = ?', [ticker]);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    await db.run("UPDATE holdings SET price_usd = ?, updated_at = datetime('now') WHERE ticker = ?", [price, ticker]);
  }

  return NextResponse.json({ ok: true, data: await enrichHoldings(db) });
}
