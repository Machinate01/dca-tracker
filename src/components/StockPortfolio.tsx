'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HoldingEnriched, PortfolioSummary } from '@/types';
import type { MarketData } from '@/app/api/market/route';
import BuySellModal from './BuySellModal';
import TransactionHistory from './TransactionHistory';

type Props = {
  holdings: HoldingEnriched[];
  summary: PortfolioSummary;
  liveData: MarketData | null;
  loading: boolean;
  onRefresh: () => void;
};

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number) {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}
function fmtShares(v: number) {
  return v.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function StockPortfolio({ holdings: initHoldings, summary: initSummary, liveData, loading, onRefresh }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<{ ticker: string; price: number; defaultType: 'buy' | 'sell' } | null>(null);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // Merge live prices into holdings, then sort by value desc (= ALLOC% high→low)
  const holdings = initHoldings
    .map((h) => {
      const livePrice = liveData?.prices[h.ticker];
      if (!livePrice) return h;
      const value_usd = h.shares * livePrice;
      const gain_usd = value_usd - h.cost_usd;
      return {
        ...h,
        price_usd: livePrice,
        value_usd,
        gain_usd,
        gain_pct: (gain_usd / h.cost_usd) * 100,
      };
    })
    .sort((a, b) => b.value_usd - a.value_usd);

  const total_value_usd = holdings.reduce((s, h) => s + h.value_usd, 0);
  const total_cost_usd = holdings.reduce((s, h) => s + h.cost_usd, 0);
  const total_gain_usd = total_value_usd - total_cost_usd;
  const total_gain_pct = total_cost_usd > 0 ? (total_gain_usd / total_cost_usd) * 100 : 0;

  const usd_thb = liveData?.usd_thb ?? initSummary.usd_thb;
  const totalThb = total_value_usd * usd_thb;
  const isLive = liveData !== null && Object.keys(liveData.prices).length > 0;


  return (
    <div className="records-card">
      {/* Summary bar */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="lbl" style={{ marginBottom: 4 }}>Total Value</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--muted)', fontSize: 14, marginRight: 4 }}>$</span>
              {fmtUsd(total_value_usd)}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)' }}>
              ≈฿{Math.round(totalThb).toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <div className="lbl" style={{ marginBottom: 4 }}>Total Gain</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`chip ${total_gain_usd >= 0 ? 'pos' : 'neg'}`}>
              {total_gain_usd >= 0 ? '+' : ''}${fmtUsd(total_gain_usd)}
            </span>
            <span className={`chip ${total_gain_pct >= 0 ? 'pos' : 'neg'}`}>
              {fmtPct(total_gain_pct)}
            </span>
          </div>
        </div>

        <div>
          <div className="lbl" style={{ marginBottom: 4 }}>USD/THB</div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
            ฿{usd_thb.toFixed(2)}
            {liveData?.usd_thb && (
              <span style={{ color: 'var(--pos)', fontSize: 11, marginLeft: 6 }}>live</span>
            )}
          </span>
        </div>

        {/* Live indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>refreshing…</span>
          )}
          {isLive && !loading && (
            <span className="pnl-head live">
              <span className="live-dot" />
              {fmtTime(liveData!.fetched_at)}
            </span>
          )}
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={onRefresh}
            disabled={loading}
            title="Refresh prices"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="records-scroll">
        <table className="records">
          <thead>
            <tr>
              <th className="left">Ticker</th>
              <th>Alloc %</th>
              <th>Shares</th>
              <th>Avg Cost/Share</th>
              <th>Price (USD)</th>
              <th>Value (USD)</th>
              <th>Gain (USD)</th>
              <th>Gain %</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const hasLive = liveData?.prices[h.ticker] !== undefined;
              const alloc = total_value_usd > 0 ? (h.value_usd / total_value_usd) * 100 : 0;
              const isExpanded = expandedTicker === h.ticker;
              return (
                <Fragment key={h.ticker}>
                  <tr>
                    <td className="left">
                      <button
                        onClick={() => setExpandedTicker(isExpanded ? null : h.ticker)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 6, color: 'var(--muted)', fontSize: 10 }}
                        title="ประวัติ transaction"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      <span style={{
                        display: 'inline-block',
                        background: 'var(--fg)',
                        color: 'var(--bg)',
                        fontFamily: 'var(--mono)',
                        fontWeight: 600,
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 3,
                        letterSpacing: '0.02em',
                      }}>
                        {h.ticker}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <div style={{ width: 40, height: 4, background: 'var(--divider)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(alloc, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                        </div>
                        <span>{alloc.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>{fmtShares(h.shares)}</td>
                    <td>${fmtUsd(h.cost_per_share)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        ${fmtUsd(h.price_usd)}
                        {hasLive && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pos)', display: 'inline-block', flexShrink: 0 }} title="Live price" />
                        )}
                      </span>
                    </td>
                    <td>${fmtUsd(h.value_usd)}</td>
                    <td className={h.gain_usd >= 0 ? 'pos' : 'neg'}>
                      {h.gain_usd >= 0 ? '+' : ''}${fmtUsd(h.gain_usd)}
                    </td>
                    <td className={h.gain_pct >= 0 ? 'pos' : 'neg'}>
                      {fmtPct(h.gain_pct)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: 11, color: 'var(--pos)', borderColor: 'var(--pos)', background: 'var(--pos-soft)' }}
                          onClick={() => setModal({ ticker: h.ticker, price: h.price_usd, defaultType: 'buy' })}
                        >
                          ▲
                        </button>
                        <button
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: 11, color: 'var(--neg)', borderColor: 'var(--neg)', background: 'var(--neg-soft)' }}
                          onClick={() => setModal({ ticker: h.ticker, price: h.price_usd, defaultType: 'sell' })}
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)' }}>
                        <div style={{ borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
                          <TransactionHistory ticker={h.ticker} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--divider)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{holdings.length} positions · auto-refresh every 60s</span>
        <span>
          {isLive
            ? `${Object.keys(liveData!.prices).length}/${holdings.length} live · ▶ = ประวัติ`
            : 'fetching live prices…'}
        </span>
      </div>

      {modal && (
        <BuySellModal
          ticker={modal.ticker}
          currentPrice={modal.price}
          defaultType={modal.defaultType}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
