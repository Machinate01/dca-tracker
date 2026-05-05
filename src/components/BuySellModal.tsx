'use client';

import { useState } from 'react';

type Props = {
  ticker: string;
  currentPrice: number;
  defaultType?: 'buy' | 'sell';
  onClose: () => void;
  onDone: () => void;
};

export default function BuySellModal({ ticker, currentPrice, defaultType = 'buy', onClose, onDone }: Props) {
  const [type, setType] = useState<'buy' | 'sell'>(defaultType);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(String(currentPrice));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sharesNum = Number(shares);
  const priceNum = Number(price);
  const total = sharesNum > 0 && priceNum > 0 ? sharesNum * priceNum : null;

  async function submit() {
    if (!sharesNum || sharesNum <= 0) { setError('กรุณากรอกจำนวนหุ้น'); return; }
    if (!priceNum || priceNum <= 0) { setError('กรุณากรอกราคา'); return; }
    setBusy(true);
    setError('');
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, type, shares: sharesNum, price_usd: priceNum, date }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    setBusy(false);
    if (!json.ok) {
      const msgs: Record<string, string> = {
        insufficient_shares: 'จำนวนหุ้นที่ขายเกินกว่าที่ถืออยู่',
        ticker_not_found: 'ไม่พบหุ้นนี้ในพอร์ต',
      };
      setError(msgs[json.error ?? ''] ?? `เกิดข้อผิดพลาด: ${json.error}`);
      return;
    }
    onDone();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'var(--fg)', color: 'var(--bg)',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
              padding: '2px 8px', borderRadius: 3,
            }}>{ticker}</span>
            {type === 'buy' ? 'Buy' : 'Sell'}
          </h3>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Buy / Sell toggle */}
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {(['buy', 'sell'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
                  background: type === t ? (t === 'buy' ? 'var(--pos)' : 'var(--neg)') : 'var(--surface)',
                  color: type === t ? 'white' : 'var(--muted)',
                  transition: 'all 0.12s',
                }}
              >
                {t === 'buy' ? '▲ Buy' : '▼ Sell'}
              </button>
            ))}
          </div>

          <div className="field-pair">
            <div className="field">
              <label>จำนวนหุ้น</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.0000000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label>ราคาต่อหุ้น (USD)</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {total !== null && (
            <div className="preview-row">
              <span>มูลค่ารวม</span>
              <strong>
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--neg)', fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 10px', background: 'var(--neg-soft)', borderRadius: 'var(--radius)' }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>ยกเลิก</button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
            style={{ background: type === 'buy' ? 'var(--pos)' : 'var(--neg)', borderColor: type === 'buy' ? 'var(--pos)' : 'var(--neg)' }}
          >
            {busy ? '…' : type === 'buy' ? '▲ Buy' : '▼ Sell'}
          </button>
        </div>
      </div>
    </div>
  );
}
