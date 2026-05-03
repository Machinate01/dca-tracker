'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtInt } from './_fmt';
import type { Summary, Goals as GoalsType } from '@/types';

type Props = {
  summary: Summary | null;
  goals: GoalsType;
};

type EditField = 'goal_fiat' | 'goal_satoshi' | null;

export default function Goals({ summary, goals }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditField>(null);
  const [draft, setDraft] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const spendFiat = summary?.spendFiat ?? 0;
  const totalSatoshi = summary?.totalSatoshi ?? 0;
  const progressFiat = summary?.progressFiat ?? 0;
  const progressBTC = summary?.progressBTC ?? 0;
  const btcFromSat = goals.goal_satoshi / 1e8;

  function startEdit(field: 'goal_fiat' | 'goal_satoshi') {
    setEditing(field);
    setDraft(goals[field]);
  }

  async function save() {
    if (editing === null) return;
    const value = Math.floor(draft);
    if (!Number.isInteger(value) || value <= 0) {
      window.alert('Goal must be a positive integer');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editing]: value }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        window.alert(body.error || 'Save failed');
        return;
      }
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setEditing(null);
  }

  return (
    <div className="goals">
      <div className="goal-card">
        <div className="goal-top">
          <h3>Goal · Fiat Invested</h3>
          <div className="pct">{progressFiat.toFixed(2)}%</div>
        </div>
        <div className="goal-bar">
          <div className="goal-fill" style={{ width: Math.min(100, progressFiat) + '%' }} />
        </div>
        <div className="goal-ticks">
          <span>฿{fmtInt(spendFiat)}</span>
          {editing === 'goal_fiat' ? (
            <span>Goal · ฿
              <input
                type="number"
                className="inline"
                value={draft}
                min={1}
                onChange={(e) => setDraft(+e.target.value)}
                onBlur={save}
                onKeyDown={handleKey}
                disabled={busy}
                autoFocus
              />
            </span>
          ) : (
            <span className="editable" onClick={() => startEdit('goal_fiat')} title="Click to edit">
              Goal · ฿{fmtInt(goals.goal_fiat)}
            </span>
          )}
        </div>
      </div>

      <div className="goal-card">
        <div className="goal-top">
          <h3>Goal · Total Satoshi</h3>
          <div className="pct">{progressBTC.toFixed(2)}%</div>
        </div>
        <div className="goal-bar">
          <div className="goal-fill alt" style={{ width: Math.min(100, progressBTC) + '%' }} />
        </div>
        <div className="goal-ticks">
          <span>{fmtInt(totalSatoshi)} sat</span>
          {editing === 'goal_satoshi' ? (
            <span>Goal ·
              <input
                type="number"
                className="inline"
                value={draft}
                min={1}
                onChange={(e) => setDraft(+e.target.value)}
                onBlur={save}
                onKeyDown={handleKey}
                disabled={busy}
                autoFocus
              /> sat ({(draft / 1e8).toFixed(2)} ₿)
            </span>
          ) : (
            <span className="editable" onClick={() => startEdit('goal_satoshi')} title="Click to edit">
              Goal · {fmtInt(goals.goal_satoshi)} sat ({btcFromSat.toFixed(2)} ₿)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
