import { fmtInt, fmtThb, fmtPct } from './_fmt';
import type { Summary, EnrichedEntry, Delta24 } from '@/types';

type Props = {
  summary: Summary | null;
  records: EnrichedEntry[];
  delta24: Delta24 | null;
  priceStale: boolean;
};

export default function PnlCard({ summary, records, delta24, priceStale }: Props) {
  if (!summary || records.length === 0) {
    return (
      <div className="pnl-card">
        <div className="pnl-head">
          <span>Unrealized P&amp;L</span>
          <span className="live">
            <span className="live-dot" style={priceStale ? { background: 'var(--muted)' } : undefined} />
            LIVE
          </span>
        </div>
        <div>
          <div className="pnl-value" style={{ color: 'var(--muted)' }}>—</div>
          <div className="pnl-delta">
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              No purchases yet
            </span>
          </div>
        </div>
        <div className="pnl-split">
          <div>
            <div className="lbl">Market Value</div>
            <div className="val" style={{ color: 'var(--muted)' }}>—</div>
          </div>
          <div>
            <div className="lbl">Invested</div>
            <div className="val" style={{ color: 'var(--muted)' }}>—</div>
          </div>
        </div>
      </div>
    );
  }

  const pos = summary.marketValue - summary.spendFiat >= 0;

  return (
    <div className="pnl-card">
      <div className="pnl-head">
        <span>Unrealized P&amp;L</span>
        <span className="live" title={priceStale ? 'Price stale — Bitkub unreachable' : undefined}>
          <span className="live-dot" style={priceStale ? { background: 'var(--muted)' } : undefined} />
          LIVE
        </span>
      </div>
      <div>
        <div className="pnl-value">
          <span className="currency">฿</span>
          {fmtThb(summary.marketValue - summary.spendFiat)}
        </div>
        <div className="pnl-delta">
          <span className={'chip ' + (pos ? 'pos' : 'neg')}>
            {fmtPct(summary.pctProfitLoss)}
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            all-time · {summary.numberOfDays} days
          </span>
        </div>
      </div>
      <div className="pnl-split">
        <div>
          <div className="lbl">Market Value</div>
          <div className="val">฿{fmtThb(summary.marketValue)}</div>
        </div>
        <div>
          <div className="lbl">Invested</div>
          <div className="val">฿{fmtInt(summary.spendFiat)}</div>
        </div>
      </div>
      {delta24 && (
        <div className="pnl-meta">
          <span>
            24h{' '}
            <strong style={{ color: delta24.delta >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
              {delta24.delta >= 0 ? '+' : ''}
              {fmtThb(delta24.delta)}฿
            </strong>{' '}
            ({fmtPct(delta24.pct)})
          </span>
        </div>
      )}
    </div>
  );
}
