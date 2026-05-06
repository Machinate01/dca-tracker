'use client';

import { useEffect, useState } from 'react';
import type { EnrichedEntry, Summary, Goals, Delta24, HoldingEnriched, PortfolioSummary, Transaction } from '@/types';
import Topbar from './Topbar';
import SectionLabel from './SectionLabel';
import StockPortfolio from './StockPortfolio';
import StockOverviewSection from './StockOverviewSection';
import StockMetricsSection from './StockMetricsSection';
import AllTransactions from './AllTransactions';
import AddBuyModal from './AddBuyModal';
import TweaksPanel, { ACCENTS, type Accent } from './TweaksPanel';

type Props = {
  records: EnrichedEntry[];
  summary: Summary | null;
  delta24: Delta24 | null;
  currentPrice: number;
  priceStale: boolean;
  goals: Goals;
  portfolio: { holdings: HoldingEnriched[]; summary: PortfolioSummary };
  transactions: Transaction[];
};

export default function Dashboard(props: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = props.records; // keep for future BTC section restore
  const [accent, setAccent] = useState<Accent>(ACCENTS[0]!);
  const [showModal, setShowModal] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dca.accent') : null;
    if (saved) {
      const found = ACCENTS.find((a) => a.name === saved);
      if (found) setAccent(found);
    }
  }, []);

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('dca.theme') : null;
    if (savedTheme === 'dark') setIsDark(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.hex);
    root.style.setProperty('--accent-strong', accent.strong);
    root.style.setProperty('--accent-soft', accent.soft);
    root.style.setProperty('--accent-line', accent.line);
    localStorage.setItem('dca.accent', accent.name);
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dca.theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="shell">
      <Topbar
        onAdd={() => setShowModal(true)}
        onToggleTweaks={() => setShowTweaks(v => !v)}
        isDark={isDark}
        onToggleDark={() => setIsDark(v => !v)}
      />

      <SectionLabel num="01" title="Overview"          hint="P&L · chart · live prices" />
      <StockOverviewSection
        transactions={props.transactions}
        holdings={props.portfolio.holdings}
        summary={props.portfolio.summary}
      />
      <SectionLabel num="02" title="Metrics"           hint="core numbers · all positions" />
      <StockMetricsSection holdings={props.portfolio.holdings} summary={props.portfolio.summary} />
      <SectionLabel num="03" title="Stock Portfolio"   hint="click ▲▼ to buy/sell · ▶ for history" />
      <StockPortfolio holdings={props.portfolio.holdings} summary={props.portfolio.summary} />
      <SectionLabel num="04" title="Stock Buy History" hint="sortable · searchable · paginated" />
      <AllTransactions />
      {showModal && (
        <AddBuyModal
          onClose={() => setShowModal(false)}
          currentPrice={props.currentPrice}
        />
      )}
      {showTweaks && (
        <TweaksPanel
          onClose={() => setShowTweaks(false)}
          accent={accent}
          setAccent={setAccent}
        />
      )}
    </div>
  );
}
