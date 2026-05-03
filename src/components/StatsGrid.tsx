import { fmtInt, fmtThb } from './_fmt';
import Sparkline from './Sparkline';
import type { Summary, EnrichedEntry } from '@/types';

type Props = {
  summary: Summary | null;
  records: EnrichedEntry[];
};

type StatCell = {
  lbl: string;
  val: string;
  sub: string;
  foot: string;
  spark: number[] | null;
  color: string;
};

const EMPTY_CELLS: StatCell[] = [
  { lbl: 'Spend Fiat',         val: '—', sub: '฿',     foot: '0 days', spark: null, color: 'var(--muted)' },
  { lbl: 'Total Satoshi',      val: '—', sub: 'sat',   foot: '—',      spark: null, color: 'var(--muted)' },
  { lbl: 'Current BTC Price',  val: '—', sub: '฿',     foot: 'Bitkub · spot', spark: null, color: 'var(--muted)' },
  { lbl: 'Market Value',       val: '—', sub: '฿',     foot: 'Your portfolio in THB', spark: null, color: 'var(--muted)' },
  { lbl: 'Average Cost',       val: '—', sub: 'sat/฿', foot: 'Across all buys',       spark: null, color: 'var(--muted)' },
  { lbl: 'Today sat/THB',      val: '—', sub: 'sat/฿', foot: '—',      spark: null, color: 'var(--muted)' },
  { lbl: 'Max Drawdown',       val: '—', sub: '%',     foot: 'Peak-to-trough', spark: null, color: 'var(--muted)' },
  { lbl: '% Profit / Loss',    val: '—', sub: '%',     foot: '—',      spark: null, color: 'var(--muted)' },
  { lbl: 'Worst Single Buy',   val: '—', sub: '%',     foot: '—',      spark: null, color: 'var(--muted)' },
  { lbl: 'Best Single Buy',    val: '—', sub: '%',     foot: '—',      spark: null, color: 'var(--muted)' },
];

function buildCells(summary: Summary, records: EnrichedEntry[]): StatCell[] {
  const last30 = records.slice(-30);
  const investedSeries = last30.map((r) => r.invested);
  const portfolioSeries = last30.map((r) => r.portfolioValue);
  const priceSeries = last30.map((r) => r.price_thb);
  const satPerTHBSeries = last30.map((r) => r.satPerTHB);

  const cumSatSeries: number[] = [];
  let runningSat = 0;
  for (const r of last30) {
    runningSat += r.satoshi;
    cumSatSeries.push(runningSat);
  }

  return [
    {
      lbl: 'Spend Fiat',
      val: fmtInt(summary.spendFiat),
      sub: '฿',
      foot: `${summary.numberOfDays} days · ${summary.numberOfDays > 0 ? Math.round(summary.spendFiat / summary.numberOfDays) : 0} ฿/day`,
      spark: investedSeries,
      color: 'var(--fg)',
    },
    {
      lbl: 'Total Satoshi',
      val: fmtInt(summary.totalSatoshi),
      sub: 'sat',
      foot: (summary.totalSatoshi / 1e8).toFixed(8) + ' BTC',
      spark: cumSatSeries,
      color: 'var(--accent)',
    },
    {
      lbl: 'Current BTC Price',
      val: fmtInt(summary.currentPrice),
      sub: '฿',
      foot: 'Bitkub · spot',
      spark: priceSeries,
      color: 'var(--accent)',
    },
    {
      lbl: 'Market Value',
      val: fmtThb(summary.marketValue),
      sub: '฿',
      foot: 'Your portfolio in THB',
      spark: portfolioSeries,
      color: summary.pctProfitLoss >= 0 ? 'var(--pos)' : 'var(--neg)',
    },
    {
      lbl: 'Average Cost',
      val: summary.averageCost.toFixed(2),
      sub: 'sat/฿',
      foot: 'Across all buys',
      spark: null,
      color: 'var(--fg)',
    },
    {
      lbl: 'Today sat/THB',
      val: summary.todaySatPerTHB.toFixed(2),
      sub: 'sat/฿',
      foot:
        summary.todaySatPerTHB > summary.averageCost
          ? `+${(summary.todaySatPerTHB - summary.averageCost).toFixed(2)} vs avg (good buy)`
          : `${(summary.todaySatPerTHB - summary.averageCost).toFixed(2)} vs avg`,
      spark: satPerTHBSeries,
      color: summary.todaySatPerTHB > summary.averageCost ? 'var(--pos)' : 'var(--neg)',
    },
    {
      lbl: 'Max Drawdown',
      val: summary.maxDrawdown.toFixed(2),
      sub: '%',
      foot: 'Peak-to-trough',
      spark: null,
      color: 'var(--neg)',
    },
    {
      lbl: '% Profit / Loss',
      val: (summary.pctProfitLoss >= 0 ? '+' : '') + summary.pctProfitLoss.toFixed(2),
      sub: '%',
      foot: `฿${fmtThb(summary.marketValue - summary.spendFiat)} unrealized`,
      spark: null,
      color: summary.pctProfitLoss >= 0 ? 'var(--pos)' : 'var(--neg)',
    },
    {
      lbl: 'Worst Single Buy',
      val: (summary.worstEntryLossPct <= 0 ? '' : '+') + summary.worstEntryLossPct.toFixed(2),
      sub: '%',
      foot: summary.worstEntryDate
        ? `${summary.worstEntryDate} · ฿${fmtThb(summary.worstEntryLossThb)}`
        : 'No losing entries',
      spark: null,
      color: summary.worstEntryLossPct < 0 ? 'var(--neg)' : 'var(--pos)',
    },
    {
      lbl: 'Best Single Buy',
      val: '+' + summary.bestEntryGainPct.toFixed(2),
      sub: '%',
      foot: summary.bestEntryDate ? summary.bestEntryDate : '—',
      spark: null,
      color: 'var(--pos)',
    },
  ];
}

export default function StatsGrid({ summary, records }: Props) {
  const cells = summary ? buildCells(summary, records) : EMPTY_CELLS;
  return (
    <div className="stats-grid">
      {cells.map((s, i) => (
        <div className="stat" key={i}>
          <div className="stat-lbl">{s.lbl}</div>
          <div className="stat-val" style={{ color: s.color }}>
            {s.val}
            <span className="sub">{s.sub}</span>
          </div>
          <div className="stat-foot">{s.foot}</div>
          {s.spark && s.spark.length >= 2 && <Sparkline values={s.spark} color={s.color} />}
        </div>
      ))}
    </div>
  );
}
