'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/types';

type SortKey = 'date' | 'ticker' | 'type' | 'shares' | 'price_usd' | 'total';
type SortDir = 'asc' | 'desc';
type EditState = { id: number; ticker: string; type: 'buy' | 'sell'; shares: string; price_usd: string; date: string };

const PAGE_SIZE = 30;

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AllTransactions() {
  const router = useRouter();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/transactions', { cache: 'no-store' });
    const json = await res.json() as { ok: boolean; data: Transaction[] };
    if (json.ok) setRows(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  async function del(id: number) {
    if (!confirm('ลบ transaction นี้?')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    await load();
    router.refresh();
  }

  function startEdit(tx: Transaction) {
    setEditing({
      id: tx.id,
      ticker: tx.ticker,
      type: tx.type,
      shares: String(tx.shares),
      price_usd: String(tx.price_usd),
      date: tx.date,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        ticker: editing.ticker,
        type: editing.type,
        shares: parseFloat(editing.shares),
        price_usd: parseFloat(editing.price_usd),
        date: editing.date,
      }),
    });
    setSaving(false);
    setEditing(null);
    await load();
    router.refresh();
  }

  const q = search.trim().toUpperCase();
  const filtered = rows.filter((r) => !q || r.ticker.includes(q) || r.type.toUpperCase().includes(q));

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string, vb: number | string;
    if (sortKey === 'total')       { va = a.shares * a.price_usd; vb = b.shares * b.price_usd; }
    else if (sortKey === 'date')   { va = a.date; vb = b.date; }
    else if (sortKey === 'ticker') { va = a.ticker; vb = b.ticker; }
    else if (sortKey === 'type')   { va = a.type; vb = b.type; }
    else if (sortKey === 'shares') { va = a.shares; vb = b.shares; }
    else                           { va = a.price_usd; vb = b.price_usd; }
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function Th({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <th onClick={() => toggleSort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    );
  }

  // Ticker summary
  const tickerMap: Record<string, number> = {};
  for (const r of filtered) {
    tickerMap[r.ticker] = (tickerMap[r.ticker] ?? 0) + 1;
  }
  const tickerSummary = Object.entries(tickerMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="records-card">
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search ticker, type…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="search-input"
          style={{ width: 200 }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} records
        </span>
        {tickerSummary.map(([t, n]) => (
          <span
            key={t}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              background: 'var(--surface-2)', border: '1px solid var(--divider)',
              padding: '2px 6px', borderRadius: 3, cursor: 'pointer',
            }}
            onClick={() => { setSearch(search === t ? '' : t); setPage(1); }}
            title={`${n} transactions`}
          >
            {t} ×{n}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          Rows per page {PAGE_SIZE}
        </span>
      </div>

      {/* Table */}
      <div className="records-scroll">
        <table className="records">
          <thead>
            <tr>
              <Th k="date"      label="Date" />
              <Th k="ticker"    label="Ticker" />
              <Th k="type"      label="Type" />
              <Th k="shares"    label="Shares" />
              <Th k="price_usd" label="Price (USD)" />
              <Th k="total"     label="Total (USD)" />
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>loading…</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>No records. Click Add buy to start.</td></tr>
            ) : paginated.map((tx) => (
              <tr key={tx.id}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{tx.date}</td>
                <td>
                  <span style={{
                    display: 'inline-block', background: 'var(--fg)', color: 'var(--bg)',
                    fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 11,
                    padding: '2px 7px', borderRadius: 3, letterSpacing: '0.02em',
                  }}>
                    {tx.ticker}
                  </span>
                </td>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '1px 7px', borderRadius: 3,
                    fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)',
                    background: tx.type === 'buy' ? 'var(--pos-soft)' : 'var(--neg-soft)',
                    color: tx.type === 'buy' ? 'var(--pos)' : 'var(--neg)',
                  }}>
                    {tx.type === 'buy' ? '▲ buy' : '▼ sell'}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {tx.shares.toFixed(7).replace(/0+$/, '').replace(/\.$/, '')}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  ${fmtUsd(tx.price_usd)}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  ${fmtUsd(tx.shares * tx.price_usd)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      onClick={() => startEdit(tx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, padding: '2px 5px', opacity: 0.6 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
                      title="แก้ไข"
                    >✎</button>
                    <button
                      onClick={() => del(tx.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '2px 4px', opacity: 0.5 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--neg)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
                      title="ลบ"
                    >✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11 }}>
        <span style={{ color: 'var(--muted)' }}>
          Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ padding: '3px 8px' }} onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="btn btn-ghost" style={{ padding: '3px 8px' }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          <span style={{ padding: '0 8px', color: 'var(--fg)' }}>{page}</span>
          <button className="btn btn-ghost" style={{ padding: '3px 8px' }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="btn btn-ghost" style={{ padding: '3px 8px' }} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span>แก้ไข Transaction #{editing.id}</span>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-lbl">Ticker</label>
              <input className="field-input" value={editing.ticker}
                onChange={(e) => setEditing({ ...editing, ticker: e.target.value.toUpperCase() })} />

              <label className="field-lbl" style={{ marginTop: 10 }}>Type</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {(['buy', 'sell'] as const).map((t) => (
                  <button
                    key={t}
                    className="btn"
                    style={{
                      flex: 1,
                      background: editing.type === t ? (t === 'buy' ? 'var(--pos-soft)' : 'var(--neg-soft)') : 'transparent',
                      color: editing.type === t ? (t === 'buy' ? 'var(--pos)' : 'var(--neg)') : 'var(--muted)',
                      borderColor: editing.type === t ? (t === 'buy' ? 'var(--pos)' : 'var(--neg)') : 'var(--divider)',
                    }}
                    onClick={() => setEditing({ ...editing, type: t })}
                  >
                    {t === 'buy' ? '▲ Buy' : '▼ Sell'}
                  </button>
                ))}
              </div>

              <label className="field-lbl" style={{ marginTop: 10 }}>Date</label>
              <input className="field-input" type="date" value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })} />

              <label className="field-lbl" style={{ marginTop: 10 }}>Shares</label>
              <input className="field-input" type="number" value={editing.shares} step="0.000001"
                onChange={(e) => setEditing({ ...editing, shares: e.target.value })} />

              <label className="field-lbl" style={{ marginTop: 10 }}>Price per share (USD)</label>
              <input className="field-input" type="number" value={editing.price_usd} step="0.01"
                onChange={(e) => setEditing({ ...editing, price_usd: e.target.value })} />

              {editing.shares && editing.price_usd && (
                <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                  Total: ${(parseFloat(editing.shares) * parseFloat(editing.price_usd)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
