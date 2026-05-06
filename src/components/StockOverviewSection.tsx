'use client';

import { useEffect, useRef, useState } from 'react';
import type { Transaction, HoldingEnriched, PortfolioSummary } from '@/types';
import type { MarketData } from '@/app/api/market/route';

type Props = {
  transactions: Transaction[];
  holdings: HoldingEnriched[];
  summary: PortfolioSummary;
};

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}
function fmtDateShort(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

type ChartPoint = { date: string; cumCost: number; label: string };

function InvestmentChart({ points }: { points: ChartPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 200 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (points.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13 }}>
        ยังไม่มีข้อมูล transaction
      </div>
    );
  }

  const { w, h } = dims;
  const padL = 56, padR = 12, padT = 20, padB = 28;
  const cw = Math.max(0, w - padL - padR);
  const ch = Math.max(0, h - padT - padB);

  const vals = points.map((p) => p.cumCost);
  const yMin = Math.min(...vals) * 0.92;
  const yMax = Math.max(...vals) * 1.06;
  const yRange = yMax - yMin || 1;

  const xi = (i: number) => padL + (points.length <= 1 ? 0 : (i / (points.length - 1)) * cw);
  const yi = (v: number) => padT + ch - ((v - yMin) / yRange) * ch;

  let d = `M ${xi(0)} ${yi(vals[0]!)}`;
  for (let i = 1; i < vals.length; i++) d += ` L ${xi(i)} ${yi(vals[i]!)}`;
  const area = d + ` L ${xi(vals.length - 1)} ${padT + ch} L ${xi(0)} ${padT + ch} Z`;

  const gridCount = 4;
  const grid = Array.from({ length: gridCount + 1 }, (_, i) => {
    const v = yMin + ((yMax - yMin) / gridCount) * i;
    const yp = yi(v);
    return { v, yp };
  });

  const xTickCount = Math.min(6, points.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.round((i / (xTickCount - 1 || 1)) * (points.length - 1));
    return { idx, x: xi(idx), date: points[idx]?.date };
  });

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - padL;
    if (mx < 0) { setHoverIdx(null); return; }
    const idx = Math.max(0, Math.min(points.length - 1, Math.round((mx / cw) * (points.length - 1))));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', padding: '4px 8px 0', display: 'flex', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 20, height: 2, background: 'var(--accent)', display: 'inline-block', borderRadius: 1 }} />
          Cumulative Invested (USD)
        </span>
      </div>
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 0 }} onMouseLeave={() => setHoverIdx(null)}>
        <svg width={w} height={h} style={{ display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}>
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={g.yp} y2={g.yp} stroke="var(--divider)" strokeWidth="1" />
              <text x={padL - 6} y={g.yp + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--muted)">
                ${g.v >= 1000 ? (g.v / 1000).toFixed(1) + 'k' : g.v.toFixed(0)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={t.x} y={h - 8} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'} fontSize="10" fontFamily="var(--mono)" fill="var(--muted)">
              {t.date ? fmtDateShort(new Date(t.date + 'T00:00:00')) : ''}
            </text>
          ))}
          <path d={area} fill="var(--accent-line)" stroke="none" />
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          {hoverIdx !== null && (
            <g>
              <line x1={xi(hoverIdx)} x2={xi(hoverIdx)} y1={padT} y2={padT + ch} stroke="var(--fg)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              <circle cx={xi(hoverIdx)} cy={yi(vals[hoverIdx] ?? 0)} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hovered && hoverIdx !== null && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: xi(hoverIdx) < padL + cw * 0.55 ? 8 : undefined,
              left: xi(hoverIdx) >= padL + cw * 0.55 ? 8 : undefined,
              background: 'var(--surface)',
              border: '1px solid var(--divider)',
              borderRadius: 4,
              padding: '6px 10px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              lineHeight: 1.7,
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ color: 'var(--muted)', marginBottom: 2 }}>{fmtDate(new Date(hovered.date + 'T00:00:00'))}</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Ticker</span>
              <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{hovered.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Cum. Invested</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${fmtUsd(hovered.cumCost)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockOverviewSection({ transactions, holdings, summary: initSummary }: Props) {
  const [liveData, setLiveData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json() as { ok: boolean; data: MarketData };
        if (j.ok) setLiveData(j.data);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  // Compute live totals
  const computedHoldings = holdings.map((h) => {
    const livePrice = liveData?.prices[h.ticker];
    if (!livePrice) return h;
    const value_usd = h.shares * livePrice;
    return { ...h, price_usd: livePrice, value_usd, gain_usd: value_usd - h.cost_usd, gain_pct: ((value_usd - h.cost_usd) / h.cost_usd) * 100 };
  });
  const total_value_usd = computedHoldings.reduce((s, h) => s + h.value_usd, 0);
  const total_cost_usd  = computedHoldings.reduce((s, h) => s + h.cost_usd, 0);
  const total_gain_usd  = total_value_usd - total_cost_usd;
  const total_gain_pct  = total_cost_usd > 0 ? (total_gain_usd / total_cost_usd) * 100 : 0;
  const usd_thb = liveData?.usd_thb ?? initSummary.usd_thb;
  const isLive = liveData !== null && Object.keys(liveData.prices).length > 0;

  // Build chart points sorted by date
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  const chartPoints: ChartPoint[] = sorted.map((tx) => {
    cum += tx.type === 'buy' ? tx.shares * tx.price_usd : -(tx.shares * tx.price_usd);
    return { date: tx.date, cumCost: Math.max(0, cum), label: tx.ticker };
  });

  const pos = total_gain_usd >= 0;

  return (
    <div className="hero">
      {/* Left: PnL card */}
      <div className="pnl-card">
        <div className="pnl-head">
          <span>Stock P&amp;L</span>
          <span className="live" style={!isLive ? { opacity: 0.4 } : undefined}>
            <span className="live-dot" style={!isLive ? { background: 'var(--muted)' } : undefined} />
            {loading ? 'loading…' : isLive ? 'LIVE' : 'stale'}
          </span>
        </div>
        <div>
          <div className="pnl-value" style={{ color: pos ? 'var(--pos)' : 'var(--neg)' }}>
            <span className="currency">$</span>
            {total_value_usd > 0 ? fmtUsd(total_gain_usd) : '—'}
          </div>
          <div className="pnl-delta">
            {total_cost_usd > 0 && (
              <span className={`chip ${pos ? 'pos' : 'neg'}`}>{fmtPct(total_gain_pct)}</span>
            )}
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {transactions.length} buys · {new Set(transactions.map((t) => t.ticker)).size} stocks
            </span>
          </div>
        </div>
        <div className="pnl-split">
          <div>
            <div className="lbl">Market Value</div>
            <div className="val">${fmtUsd(total_value_usd)}</div>
          </div>
          <div>
            <div className="lbl">Invested</div>
            <div className="val">${fmtUsd(total_cost_usd)}</div>
          </div>
        </div>
        <div className="pnl-meta">
          <span>USD/THB ฿{usd_thb.toFixed(2)} · ≈฿{Math.round(total_value_usd * usd_thb).toLocaleString()}</span>
        </div>
      </div>

      {/* Right: chart card */}
      <div className="chart-card">
        <InvestmentChart points={chartPoints} />
      </div>
    </div>
  );
}
