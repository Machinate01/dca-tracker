'use client';

import { useEffect, useState } from 'react';
import type { EnrichedEntry, Summary, Goals, Delta24 } from '@/types';
import Topbar from './Topbar';
import SectionLabel from './SectionLabel';
import PnlCard from './PnlCard';
import ChartCard from './ChartCard';
import StatsGrid from './StatsGrid';
import GoalsComponent from './Goals';
import RecordsTable from './RecordsTable';
import AddBuyModal from './AddBuyModal';
import TweaksPanel, { ACCENTS, type Accent } from './TweaksPanel';

type Props = {
  records: EnrichedEntry[];
  summary: Summary | null;
  delta24: Delta24 | null;
  currentPrice: number;
  priceStale: boolean;
  goals: Goals;
};

export default function Dashboard(props: Props) {
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

      <SectionLabel num="01" title="Overview"          hint="PNL · chart · hover for daily values" />
      <div className="hero">
        <PnlCard
          summary={props.summary}
          records={props.records}
          delta24={props.delta24}
          priceStale={props.priceStale}
        />
        <ChartCard records={props.records} />
      </div>
      <SectionLabel num="02" title="Metrics & Goals" hint="core numbers · progress" />
      <StatsGrid summary={props.summary} records={props.records} />
      <GoalsComponent summary={props.summary} goals={props.goals} />
      <SectionLabel num="03" title="Buy History"     hint="sortable · searchable · paginated" />
      <RecordsTable records={props.records} />
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
