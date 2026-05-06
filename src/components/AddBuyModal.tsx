'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  onClose: () => void;
  currentPrice: number; // unused now, kept for compat
};

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AddBuyModal({ onClose }: Props) {
  const router = useRouter();
  const [date, setDate]     = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [ticker, setTicker] = useState('');
  const [totalUsd, setTotalUsd] = useState<string>('');
  const [shares, setShares]     = useState<string>('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [fetching, setFetching]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived: price per share = total / shares
  const totalNum  = parseFloat(totalUsd);
  const sharesNum = parseFloat(shares);
  const pricePerShare = Number.isFinite(totalNum) && Number.isFinite(sharesNum) && sharesNum > 0
    ? totalNum / sharesNum
    : null;

  // Fetch live price when ticker changes (debounced 600ms)
  useEffect(() => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) { setLivePrice(null); return; }
    if (tickerTimer.current) clearTimeout(tickerTimer.current);
    tickerTimer.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/market?tickers=${encodeURIComponent(sym)}`);
        const j = await res.json() as { ok: boolean; data: { prices: Record<string, number> } };
        if (j.ok) setLivePrice(j.data.prices[sym] ?? null);
        else setLivePrice(null);
      } catch { setLivePrice(null); }
      finally { setFetching(false); }
    }, 600);
    return () => { if (tickerTimer.current) clearTimeout(tickerTimer.current); };
  }, [ticker]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const sym = ticker.trim().toUpperCase();
    if (!sym) { setError('Enter a ticker symbol'); return; }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) { setError('Shares must be > 0'); return; }
    if (!Number.isFinite(totalNum) || totalNum <= 0) { setError('Total USD must be > 0'); return; }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: sym,
          type: 'buy',
          shares: sharesNum,
          price_usd: pricePerShare,
          date,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || 'Save failed');
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Add Stock Buy</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        <div className="modal-body">
          {/* Date */}
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {/* Ticker */}
          <div className="field">
            <label>Ticker</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="VOO, NVDA, MSFT…"
                style={{ textTransform: 'uppercase', width: '100%' }}
                autoFocus
                required
              />
              {fetching && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                  fetching…
                </span>
              )}
            </div>
            {livePrice !== null && !fetching && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--pos)' }}>
                Current price: ${fmtUsd(livePrice)}
              </span>
            )}
          </div>

          {/* Total USD + Shares side by side */}
          <div className="field-pair">
            <div className="field">
              <label>ราคาที่ซื้อ (USD $)</label>
              <input
                type="number"
                value={totalUsd}
                min={0.01}
                step={0.01}
                placeholder="0.00"
                onChange={(e) => setTotalUsd(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Shares ที่ซื้อ</label>
              <input
                type="number"
                value={shares}
                min={0.000001}
                step={0.000001}
                placeholder="0.000000"
                onChange={(e) => setShares(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Preview row */}
          <div className="preview-row">
            <span>ราคาต่อ share</span>
            <strong>
              {pricePerShare !== null
                ? `$${fmtUsd(pricePerShare)}${livePrice ? ` · live $${fmtUsd(livePrice)}` : ''}`
                : '—'}
            </strong>
          </div>

          {error && (
            <div style={{ color: 'var(--neg)', fontSize: 12 }}>{error}</div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Record buy'}
          </button>
        </div>
      </form>
    </div>
  );
}
