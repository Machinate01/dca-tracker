'use client';

import { useEffect, useState } from 'react';
import type { HoldingEnriched, PortfolioSummary } from '@/types';
import type { MarketData } from '@/app/api/market/route';
import Sparkline from './Sparkline';

type Props = {
  holdings: HoldingEnriched[];
  summary: PortfolioSummary;
};

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockMetricsSection({ holdings: initHoldings, summary: initSummary }: Props) {
  const [liveData, setLiveData] = useState<MarketData | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json() as { ok: boolean; data: MarketData };
        if (j.ok) setLiveData(j.data);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  const holdings = initHoldings.map((h) => {
    const livePrice = liveData?.prices[h.ticker];
    if (!livePrice) return h;
    const value_usd = h.shares * livePrice;
    return { ...h, price_usd: livePrice, value_usd, gain_usd: value_usd - h.cost_usd, gain_pct: ((value_usd - h.cost_usd) / h.cost_usd) * 100 };
  });

  const total_value_usd = holdings.reduce((s, h) => s + h.value_usd, 0);
  const total_cost_usd  = holdings.reduce((s, h) => s + h.cost_usd, 0);
  const total_gain_usd  = total_value_usd - total_cost_usd;
  const total_gain_pct  = total_cost_usd > 0 ? (total_gain_usd / total_cost_usd) * 100 : 0;
  const usd_thb = liveData?.usd_thb ?? initSummary.usd_thb;

  const sorted = [...holdings].sort((a, b) => b.gain_pct - a.gain_pct);
  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];

  const valueSeries = holdings.map((h) => h.value_usd);
  const costSeries  = holdings.map((h) => h.cost_usd);

  type Cell = { lbl: string; val: string; sub: string; foot: string; color: string; spark: number[] | null };

  const cells: Cell[] = [
    {
      lbl: 'Total Invested',
      val: '$' + fmtUsd(total_cost_usd),
      sub: '',
      foot: `${holdings.length} positions`,
      color: 'var(--fg)',
      spark: costSeries,
    },
    {
      lbl: 'Current Value',
      val: '$' + fmtUsd(total_value_usd),
      sub: '',
      foot: `≈฿${Math.round(total_value_usd * usd_thb).toLocaleString()}`,
      color: total_gain_usd >= 0 ? 'var(--pos)' : 'var(--neg)',
      spark: valueSeries,
    },
    {
      lbl: 'Total P&L',
      val: (total_gain_usd >= 0 ? '+$' : '-$') + fmtUsd(Math.abs(total_gain_usd)),
      sub: '',
      foot: `≈฿${total_gain_usd >= 0 ? '+' : ''}${Math.round(total_gain_usd * usd_thb).toLocaleString()}`,
      color: total_gain_usd >= 0 ? 'var(--pos)' : 'var(--neg)',
      spark: null,
    },
    {
      lbl: 'P&L %',
      val: (total_gain_pct >= 0 ? '+' : '') + total_gain_pct.toFixed(2),
      sub: '%',
      foot: 'Unrealized · all positions',
      color: total_gain_pct >= 0 ? 'var(--pos)' : 'var(--neg)',
      spark: null,
    },
    {
      lbl: 'Best Performer',
      val: best ? best.ticker : '—',
      sub: '',
      foot: best ? `+${best.gain_pct.toFixed(2)}% · +$${fmtUsd(best.gain_usd)}` : '—',
      color: 'var(--pos)',
      spark: null,
    },
    {
      lbl: 'Worst Performer',
      val: worst ? worst.ticker : '—',
      sub: '',
      foot: worst ? `${worst.gain_pct.toFixed(2)}% · ${worst.gain_usd >= 0 ? '+' : ''}$${fmtUsd(worst.gain_usd)}` : '—',
      color: worst && worst.gain_pct < 0 ? 'var(--neg)' : 'var(--pos)',
      spark: null,
    },
    {
      lbl: 'USD / THB',
      val: '฿' + usd_thb.toFixed(2),
      sub: '',
      foot: liveData?.usd_thb ? 'live rate · Finnhub' : 'stored rate',
      color: 'var(--fg)',
      spark: null,
    },
    {
      lbl: 'Positions',
      val: holdings.length.toString(),
      sub: '',
      foot: holdings.map((h) => h.ticker).join(' · '),
      color: 'var(--accent)',
      spark: null,
    },
  ];

  return (
    <div className="stats-grid">
      {cells.map((c, i) => (
        <div className="stat" key={i}>
          <div className="stat-lbl">{c.lbl}</div>
          <div className="stat-val" style={{ color: c.color }}>
            {c.val}
            {c.sub && <span className="sub">{c.sub}</span>}
          </div>
          <div className="stat-foot">{c.foot}</div>
          {c.spark && c.spark.length >= 2 && <Sparkline values={c.spark} color={c.color} />}
        </div>
      ))}
    </div>
  );
}
