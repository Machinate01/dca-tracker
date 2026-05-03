'use client';
import { useState } from 'react';
import Chart from './Chart';
import type { EnrichedEntry } from '@/types';

export type Mode = 'portfolio' | 'pnl' | 'cost' | 'sats' | 'entries';
type Timeframe = '7D' | '30D' | '60D' | '90D' | '180D' | '1Y' | '2Y' | '4Y' | 'ALL';

type Props = { records: EnrichedEntry[] };

export default function ChartCard({ records }: Props) {
  const [mode, setMode] = useState<Mode>('portfolio');
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL');
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-tabs">
          <button className={'chart-tab' + (mode === 'portfolio' ? ' active' : '')} onClick={() => setMode('portfolio')}>Portfolio vs Invested</button>
          <button className={'chart-tab' + (mode === 'pnl'       ? ' active' : '')} onClick={() => setMode('pnl')}>Unrealized P&amp;L</button>
          <button className={'chart-tab' + (mode === 'cost'      ? ' active' : '')} onClick={() => setMode('cost')}>Cost vs Market</button>
          <button className={'chart-tab' + (mode === 'sats'      ? ' active' : '')} onClick={() => setMode('sats')}>Sat Accumulation</button>
          <button className={'chart-tab' + (mode === 'entries'   ? ' active' : '')} onClick={() => setMode('entries')}>Entry Points</button>
        </div>
        <select
          className="select"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
        >
          {(['7D', '30D', '60D', '90D', '180D', '1Y', '2Y', '4Y', 'ALL'] as const).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="chart-body">
        <Chart records={records} mode={mode} timeframe={timeframe} />
      </div>
    </div>
  );
}
