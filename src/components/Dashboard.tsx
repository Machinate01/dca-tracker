'use client';

import { useEffect, useRef, useState } from 'react';
import type { EnrichedEntry, Summary, Goals, Delta24, HoldingEnriched, PortfolioSummary, Transaction } from '@/types';
import type { MarketData } from '@/app/api/market/route';
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

const MARKET_REFRESH_MS = 60_000;

export default function Dashboard(props: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = props.records; // keep for future BTC section restore
  const [accent, setAccent] = useState<Accent>(ACCENTS[0]!);
  const [showModal, setShowModal] = useState(false);
  const [showTweaks, setShowTweaks] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // ── Single shared market-data fetch ──────────────────────────────────────
  // All child sections share this state so only ONE /api/market call fires
  // per 60 s interval, preventing Finnhub rate-limit bursts.
  const [liveData, setLiveData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const marketTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshMarket() {
    setMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json() as { ok: boolean; data: MarketData };
        if (json.ok) setLiveData(json.data);
      }
    } finally {
      setMarketLoading(false);
    }
  }

  useEffect(() => {
    refreshMarket();
    marketTimerRef.current = setInterval(refreshMarket, MARKET_REFRESH_MS);
    return () => { if (marketTimerRef.current) clearInterval(marketTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        liveData={liveData}
        loading={marketLoading}
      />
      <SectionLabel num="02" title="Metrics"           hint="core numbers · click goal to edit" />
      <StockMetricsSection
        holdings={props.portfolio.holdings}
        summary={props.portfolio.summary}
        stockGoalUsd={props.goals.stock_goal_usd}
        liveData={liveData}
      />
      <SectionLabel num="03" title="Stock Portfolio"   hint="click ▲▼ to buy/sell · ▶ for history" />
      <StockPortfolio
        holdings={props.portfolio.holdings}
        summary={props.portfolio.summary}
        liveData={liveData}
        loading={marketLoading}
        onRefresh={refreshMarket}
      />
      <SectionLabel num="04" title="Stock Buy History" hint="sortable · searchable · paginated" />
      <AllTransactions initialData={props.transactions} />
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
