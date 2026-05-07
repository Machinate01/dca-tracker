'use client';

import { useState } from 'react';
import type { HoldingEnriched, PortfolioSummary } from '@/types';
import type { MarketData } from '@/app/api/market/route';
import Sparkline from './Sparkline';

type Props = {
  holdings: HoldingEnriched[];
  summary: PortfolioSummary;
  stockGoalUsd: number;
  liveData: MarketData | null;
};

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockMetricsSection({ holdings: initHoldings, summary: initSummary, stockGoalUsd: initGoal, liveData }: Props) {
  const [goal, setGoal] = useState(initGoal);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(initGoal));

  async function saveGoal() {
    const v = parseFloat(goalInput.replace(/,/g, ''));
    if (!Number.isFinite(v) || v <= 0) return;
    setGoal(v);
    setEditGoal(false);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_goal_usd: v }),
    });
  }

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

  const progressPct = goal > 0 ? Math.min((total_value_usd / goal) * 100, 100) : 0;
  const usd_thb_val = liveData?.usd_thb ?? initSummary.usd_thb;

  return (
    <>
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

      {/* Goal progress bar */}
      <div className="goals">
        <div className="goal-card" style={{ cursor: 'pointer' }} onClick={() => { setEditGoal(true); setGoalInput(String(goal)); }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="lbl">GOAL · PORTFOLIO VALUE (USD)</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>
              {progressPct.toFixed(2)}%
            </span>
          </div>
          <div className="goal-bar">
            <div className="goal-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            <span>${fmtUsd(total_value_usd)}</span>
            <span>
              Goal · ${fmtUsd(goal)}
              <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 10 }}>✎ click to edit</span>
            </span>
          </div>
        </div>

        <div className="goal-card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="lbl">GOAL · PORTFOLIO VALUE (THB)</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>
              {progressPct.toFixed(2)}%
            </span>
          </div>
          <div className="goal-bar">
            <div className="goal-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            <span>฿{Math.round(total_value_usd * usd_thb_val).toLocaleString()}</span>
            <span>Goal · ฿{Math.round(goal * usd_thb_val).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Edit goal modal */}
      {editGoal && (
        <div className="modal-backdrop" onClick={() => setEditGoal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>Set Portfolio Goal (USD)</span>
              <button className="btn btn-ghost" onClick={() => setEditGoal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>Target value (USD $)</label>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  autoFocus
                  min="1"
                  step="100"
                  style={{ fontFamily: 'var(--mono)', fontSize: 14, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--divider)', borderRadius: 4, color: 'var(--fg)', width: '100%' }}
                />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  ≈฿{Number.isFinite(parseFloat(goalInput)) ? Math.round(parseFloat(goalInput) * usd_thb_val).toLocaleString() : '—'}
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setEditGoal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveGoal}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
