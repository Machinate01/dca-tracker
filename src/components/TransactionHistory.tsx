'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/types';

type Props = { ticker: string };

export default function TransactionHistory({ ticker }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/transactions?ticker=${encodeURIComponent(ticker)}`);
    const json = await res.json() as { ok: boolean; data: Transaction[] };
    if (json.ok) setRows(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [ticker]);

  async function del(id: number) {
    if (!confirm('ลบ transaction นี้?\n(shares และ cost จะไม่ถูกอัปเดตย้อนหลัง)')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    await load();
    router.refresh();
  }

  if (loading) return <div style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>loading…</div>;
  if (rows.length === 0) return <div style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>ยังไม่มี transaction</div>;

  return (
    <table className="records" style={{ margin: 0 }}>
      <thead>
        <tr>
          <th className="left">Date</th>
          <th className="left">Type</th>
          <th>Shares</th>
          <th>Price (USD)</th>
          <th>Total (USD)</th>
          <th style={{ width: 32 }}></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((tx) => (
          <tr key={tx.id}>
            <td className="left" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{tx.date}</td>
            <td className="left">
              <span style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--mono)',
                background: tx.type === 'buy' ? 'var(--pos-soft)' : 'var(--neg-soft)',
                color: tx.type === 'buy' ? 'var(--pos)' : 'var(--neg)',
              }}>
                {tx.type === 'buy' ? '▲ buy' : '▼ sell'}
              </span>
            </td>
            <td>{tx.shares.toFixed(7).replace(/0+$/, '').replace(/\.$/, '')}</td>
            <td>${tx.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${(tx.shares * tx.price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>
              <button
                onClick={() => del(tx.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '2px 4px', opacity: 0.5 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--neg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
                title="ลบ transaction"
              >✕</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
