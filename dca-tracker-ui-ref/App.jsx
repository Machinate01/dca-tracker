// App.jsx — DCA Tracker main app
const { useState, useMemo, useEffect } = React;

// ---------- helpers ----------
const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
const fmtThb = (n, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n, d = 2) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";

// ---------- Top bar ----------
function Topbar({ onAdd, onToggleTweaks }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">₿</div>
        <div>
          <div className="brand-name">DCA Tracker</div>
          <div className="brand-sub">sats/THB · v1.04</div>
        </div>
      </div>
      <div className="topbar-actions">
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", marginRight: 12 }}>
          Last sync · {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <button className="btn" onClick={onToggleTweaks}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" stroke="currentColor" strokeWidth="1.3"/></svg>
          Tweaks
        </button>
        <button className="btn btn-primary" onClick={onAdd}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          Add buy
        </button>
      </div>
    </header>
  );
}

// ---------- PNL card ----------
function PnlCard({ summary, records }) {
  const pos = summary.marketValue - summary.spendFiat >= 0;
  // 24h delta = portfolio today - portfolio yesterday
  const last = records[records.length - 1];
  const prev = records[records.length - 2];
  const delta24 = last.portfolioValue - prev.portfolioValue;
  const deltaPct24 = (delta24 / prev.portfolioValue) * 100;
  return (
    <div className="pnl-card">
      <div className="pnl-head">
        <span>Unrealized P&amp;L</span>
        <span className="live"><span className="live-dot" /> LIVE</span>
      </div>
      <div>
        <div className="pnl-value">
          <span className="currency">฿</span>
          {fmtThb(summary.marketValue - summary.spendFiat)}
        </div>
        <div className="pnl-delta">
          <span className={"chip " + (pos ? "pos" : "neg")}>
            {fmtPct(summary.pctProfitLoss)}
          </span>
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            all-time · {summary.numberOfDays} days
          </span>
        </div>
      </div>
      <div className="pnl-split">
        <div>
          <div className="lbl">Market Value</div>
          <div className="val">฿{fmtThb(summary.marketValue)}</div>
        </div>
        <div>
          <div className="lbl">Invested</div>
          <div className="val">฿{fmtInt(summary.spendFiat)}</div>
        </div>
      </div>
      <div className="pnl-meta">
        <span>24h <strong className={delta24 >= 0 ? "" : ""} style={{ color: delta24 >= 0 ? "var(--pos)" : "var(--neg)" }}>{delta24 >= 0 ? "+" : ""}{fmtThb(delta24)}฿</strong> ({fmtPct(deltaPct24)})</span>
      </div>
    </div>
  );
}

// ---------- Chart card ----------
function ChartCard({ records }) {
  const [mode, setMode] = useState("portfolio");
  const [timeframe, setTimeframe] = useState("ALL");
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-tabs">
          <button className={"chart-tab" + (mode === "portfolio" ? " active" : "")} onClick={() => setMode("portfolio")}>Portfolio vs Invested</button>
          <button className={"chart-tab" + (mode === "pnl" ? " active" : "")} onClick={() => setMode("pnl")}>Unrealized P&amp;L</button>
          <button className={"chart-tab" + (mode === "cost" ? " active" : "")} onClick={() => setMode("cost")}>Cost vs Market</button>
        </div>
        <div className="timeframe">
          {["7D", "30D", "ALL"].map((t) => (
            <button key={t} className={timeframe === t ? "active" : ""} onClick={() => setTimeframe(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="chart-body">
        <Chart records={records} mode={mode} timeframe={timeframe} />
      </div>
    </div>
  );
}

// ---------- Stats grid ----------
function StatsGrid({ summary, records }) {
  // Sparkline series
  const portfolioSeries = records.slice(-30).map((r) => r.portfolioValue);
  const priceSeries = records.slice(-30).map((r) => r.price);
  const satSeries = records.slice(-30).map((r) => r.satPerTHB);
  const investedSeries = records.slice(-30).map((r) => r.invested);

  const stats = [
    {
      lbl: "Spend Fiat",
      val: fmtInt(summary.spendFiat),
      sub: "฿",
      foot: `${summary.numberOfDays} days · ${summary.numberOfDays > 0 ? Math.round(summary.spendFiat / summary.numberOfDays) : 0} ฿/day`,
      spark: investedSeries,
      color: "var(--fg)",
    },
    {
      lbl: "Total Satoshi",
      val: fmtInt(summary.totalSatoshi),
      sub: "sat",
      foot: (summary.totalSatoshi / 1e8).toFixed(8) + " BTC",
      spark: records.slice(-30).map((r, i, arr) => {
        // cumulative sat up to i (approx — use record's satoshi cumulatively from slice start)
        return arr.slice(0, i + 1).reduce((s, x) => s + x.satoshi, 0);
      }),
      color: "var(--accent)",
    },
    {
      lbl: "Current BTC Price",
      val: fmtInt(summary.currentPrice),
      sub: "฿",
      foot: "Binance · spot",
      spark: priceSeries,
      color: "var(--accent)",
    },
    {
      lbl: "Market Value",
      val: fmtThb(summary.marketValue),
      sub: "฿",
      foot: "Your portfolio in THB",
      spark: portfolioSeries,
      color: summary.pctProfitLoss >= 0 ? "var(--pos)" : "var(--neg)",
    },
    {
      lbl: "Average Cost",
      val: summary.averageCost.toFixed(2),
      sub: "sat/฿",
      foot: "Across all buys",
      spark: null,
      color: "var(--fg)",
    },
    {
      lbl: "Today sat/THB",
      val: summary.todaySatPerTHB.toFixed(2),
      sub: "sat/฿",
      foot: summary.todaySatPerTHB > summary.averageCost
        ? `+${(summary.todaySatPerTHB - summary.averageCost).toFixed(2)} vs avg (good buy)`
        : `${(summary.todaySatPerTHB - summary.averageCost).toFixed(2)} vs avg`,
      spark: satSeries,
      color: summary.todaySatPerTHB > summary.averageCost ? "var(--pos)" : "var(--neg)",
    },
    {
      lbl: "Max Drawdown",
      val: summary.maxDrawdown.toFixed(2),
      sub: "%",
      foot: "Peak-to-trough",
      spark: null,
      color: "var(--neg)",
    },
    {
      lbl: "% Profit / Loss",
      val: (summary.pctProfitLoss >= 0 ? "+" : "") + summary.pctProfitLoss.toFixed(2),
      sub: "%",
      foot: `฿${fmtThb(summary.marketValue - summary.spendFiat)} unrealized`,
      spark: null,
      color: summary.pctProfitLoss >= 0 ? "var(--pos)" : "var(--neg)",
    },
  ];
  return (
    <div className="stats-grid">
      {stats.map((s, i) => (
        <div className="stat" key={i}>
          <div className="stat-lbl">{s.lbl}</div>
          <div className="stat-val" style={{ color: s.color }}>
            {s.val}<span className="sub">{s.sub}</span>
          </div>
          <div className="stat-foot">{s.foot}</div>
          {s.spark && <Sparkline values={s.spark} color={s.color} />}
        </div>
      ))}
    </div>
  );
}

// ---------- Goals ----------
function Goals({ summary }) {
  return (
    <div className="goals">
      <div className="goal-card">
        <div className="goal-top">
          <h3>Goal · Fiat Invested</h3>
          <div className="pct">{summary.progressFiat.toFixed(2)}%</div>
        </div>
        <div className="goal-bar">
          <div className="goal-fill" style={{ width: Math.min(100, summary.progressFiat) + "%" }} />
        </div>
        <div className="goal-ticks">
          <span>฿{fmtInt(summary.spendFiat)}</span>
          <span>Goal · ฿{fmtInt(summary.goalFiat)}</span>
        </div>
      </div>
      <div className="goal-card">
        <div className="goal-top">
          <h3>Goal · Total Satoshi</h3>
          <div className="pct">{summary.progressBTC.toFixed(2)}%</div>
        </div>
        <div className="goal-bar">
          <div className="goal-fill alt" style={{ width: Math.min(100, summary.progressBTC) + "%" }} />
        </div>
        <div className="goal-ticks">
          <span>{fmtInt(summary.totalSatoshi)} sat</span>
          <span>Goal · {fmtInt(summary.goalSat * 100)} sat (0.02 ₿)</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Records table ----------
const COLUMNS = [
  { key: "dayActive", label: "Day", align: "left", fmt: (v) => <span className="day-chip">{v}</span> },
  { key: "date", label: "Date", align: "left", fmt: (v) => v.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
  { key: "fiat", label: "Fiat (฿)", fmt: (v) => fmtInt(v) },
  { key: "satoshi", label: "Satoshi", fmt: (v) => fmtInt(v) },
  { key: "price", label: "BTC Price", fmt: (v) => fmtInt(v) },
  { key: "portfolioValue", label: "Portfolio Value", fmt: (v) => fmtThb(v) },
  { key: "invested", label: "Invested", fmt: (v) => fmtInt(v) },
  { key: "unrealized", label: "Unrealized", fmt: (v) => (v >= 0 ? "+" : "") + fmtThb(v), cls: (v) => v >= 0 ? "pos" : "neg" },
  { key: "pctUnrealized", label: "% Unrealized", fmt: (v) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%", cls: (v) => v >= 0 ? "pos" : "neg" },
];

function RecordsTable({ records }) {
  const [sortKey, setSortKey] = useState("dayActive");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.toLowerCase();
    return records.filter((r) => {
      return r.dayActive.toString().includes(q) ||
        r.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase().includes(q) ||
        r.price.toString().includes(q);
    });
  }, [records, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av instanceof Date) return sortDir === "asc" ? av - bv : bv - av;
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageData = sorted.slice((curPage - 1) * pageSize, curPage * pageSize);

  useEffect(() => { setPage(1); }, [pageSize, query, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  // Pagination numbers — up to 7 buttons with ellipsis
  function pageNums() {
    const nums = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
      return nums;
    }
    if (curPage <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (curPage >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", curPage - 1, curPage, curPage + 1, "…", totalPages];
  }

  return (
    <div className="records-card">
      <div className="records-toolbar">
        <div className="records-toolbar-left">
          <div className="search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input placeholder="Search day, date, price…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            {filtered.length} records
          </span>
        </div>
        <div className="records-toolbar-right">
          <span>Rows per page</span>
          <select className="select" value={pageSize} onChange={(e) => setPageSize(+e.target.value)}>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </div>
      </div>
      <div className="records-scroll">
        <table className="records">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={(c.align === "left" ? "left " : "") + (sortKey === c.key ? "sorted" : "")}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  <span className="sort-arrow">
                    {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.dayActive}>
                {COLUMNS.map((c) => {
                  const raw = r[c.key];
                  const cls = c.cls ? c.cls(raw) : "";
                  return (
                    <td key={c.key} className={(c.align === "left" ? "left " : "") + cls}>
                      {c.fmt(raw)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          Showing {(curPage - 1) * pageSize + 1}–{Math.min(curPage * pageSize, sorted.length)} of {sorted.length}
        </span>
        <div className="pager">
          <button disabled={curPage === 1} onClick={() => setPage(1)}>«</button>
          <button disabled={curPage === 1} onClick={() => setPage(curPage - 1)}>‹</button>
          {pageNums().map((n, i) => (
            n === "…"
              ? <button key={i} disabled style={{ border: "none", background: "transparent" }}>…</button>
              : <button key={i} className={n === curPage ? "active" : ""} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button disabled={curPage === totalPages} onClick={() => setPage(curPage + 1)}>›</button>
          <button disabled={curPage === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Add buy modal ----------
function AddBuyModal({ onClose, onAdd, currentPrice }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fiat, setFiat] = useState(108);
  const [price, setPrice] = useState(currentPrice);
  const satPerTHB = 100_000_000 / price;
  const sat = Math.round(fiat * satPerTHB);
  function submit() {
    onAdd({ date: new Date(date), fiat: +fiat, price: +price, satoshi: sat });
    onClose();
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Record new buy</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "2px 8px" }}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field-pair">
            <div className="field">
              <label>Fiat spent (฿)</label>
              <input type="number" value={fiat} onChange={(e) => setFiat(e.target.value)} />
            </div>
            <div className="field">
              <label>BTC price (฿)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="preview-row">
            <span>You get</span>
            <strong>{fmtInt(sat)} sat · {satPerTHB.toFixed(2)} sat/฿</strong>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Record buy</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Tweaks panel ----------
const ACCENTS = [
  { name: "Bitcoin Orange", hex: "#F2A900", strong: "#E89100", soft: "#FFF4DC", line: "rgba(242,169,0,0.15)" },
  { name: "Saffron", hex: "#E77B1D", strong: "#C86511", soft: "#FCE9D6", line: "rgba(231,123,29,0.15)" },
  { name: "Amber", hex: "#D98F1C", strong: "#B37416", soft: "#FBEBCF", line: "rgba(217,143,28,0.15)" },
  { name: "Crimson", hex: "#C84A3F", strong: "#A33A2F", soft: "#F5DCD8", line: "rgba(200,74,63,0.15)" },
  { name: "Forest", hex: "#2E7D5B", strong: "#24634A", soft: "#D9EBDF", line: "rgba(46,125,91,0.15)" },
  { name: "Ink", hex: "#2B3A66", strong: "#1F2B4D", soft: "#DBE0EE", line: "rgba(43,58,102,0.15)" },
];

function TweaksPanel({ onClose, accent, setAccent }) {
  return (
    <div className="tweaks-panel">
      <h4>Tweaks <button onClick={onClose}>✕</button></h4>
      <div className="tweaks-label">Accent color</div>
      <div className="swatches">
        {ACCENTS.map((a) => (
          <div
            key={a.hex}
            className={"swatch" + (accent.hex === a.hex ? " selected" : "")}
            style={{ background: a.hex }}
            title={a.name}
            onClick={() => setAccent(a)}
          />
        ))}
      </div>
      <div className="tweaks-label" style={{ marginTop: 8 }}>Selected · {accent.name}</div>
    </div>
  );
}

// ---------- Root ----------
function App() {
  const [records, setRecords] = useState(window.DCA.records);
  const [showModal, setShowModal] = useState(false);
  const [showTweaks, setShowTweaks] = useState(true);
  const [accent, setAccent] = useState(ACCENTS[0]);

  // Recompute summary when records change
  const summary = useMemo(() => {
    let totalSat = 0, totalFiat = 0, peak = 0, maxDD = 0;
    const r = records.map((rec, i) => {
      totalSat += rec.satoshi; totalFiat += rec.fiat;
      const pv = (totalSat / 1e8) * rec.price;
      peak = Math.max(peak, pv);
      const dd = (pv - peak) / peak * 100;
      if (dd < maxDD) maxDD = dd;
      return { ...rec, portfolioValue: pv, invested: totalFiat, unrealized: pv - totalFiat, pctUnrealized: (pv - totalFiat) / totalFiat * 100, satPerTHB: 1e8 / rec.price };
    });
    const last = r[r.length - 1];
    return {
      spendFiat: totalFiat,
      totalSatoshi: totalSat,
      currentPrice: last.price,
      maxDrawdown: maxDD,
      numberOfDays: r.length,
      averageCost: totalSat / totalFiat,
      todaySatPerTHB: 1e8 / last.price,
      marketValue: last.portfolioValue,
      pctProfitLoss: (last.portfolioValue - totalFiat) / totalFiat * 100,
      goalFiat: 200_000,
      goalSat: 2_000_000,
      progressFiat: totalFiat / 200_000 * 100,
      progressBTC: totalSat / (2_000_000) * 100,
      enrichedRecords: r,
    };
  }, [records]);

  // apply accent
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", accent.hex);
    r.style.setProperty("--accent-strong", accent.strong);
    r.style.setProperty("--accent-soft", accent.soft);
    r.style.setProperty("--accent-line", accent.line);
  }, [accent]);

  function handleAdd(entry) {
    const last = records[records.length - 1];
    const next = {
      dayActive: last.dayActive + 1,
      date: entry.date,
      fiat: entry.fiat,
      price: entry.price,
      satoshi: entry.satoshi,
      satPerTHB: 1e8 / entry.price,
      portfolioValue: 0, invested: 0, unrealized: 0, pctUnrealized: 0, // recomputed
    };
    setRecords([...records, next]);
  }

  return (
    <div className="shell">
      <Topbar onAdd={() => setShowModal(true)} onToggleTweaks={() => setShowTweaks((v) => !v)} />

      <div className="section-label">
        <span className="num-badge">01</span>
        <h2>Overview</h2>
        <span className="dots" />
        <span className="hint">PNL · chart · hover for daily values</span>
      </div>
      <div className="hero">
        <PnlCard summary={summary} records={summary.enrichedRecords} />
        <ChartCard records={summary.enrichedRecords} />
      </div>

      <div className="section-label">
        <span className="num-badge">02</span>
        <h2>Metrics &amp; Goals</h2>
        <span className="dots" />
        <span className="hint">core numbers · progress</span>
      </div>
      <StatsGrid summary={summary} records={summary.enrichedRecords} />
      <Goals summary={summary} />

      <div className="section-label">
        <span className="num-badge">03</span>
        <h2>Buy History</h2>
        <span className="dots" />
        <span className="hint">sortable · searchable · paginated</span>
      </div>
      <RecordsTable records={summary.enrichedRecords} />

      {showModal && <AddBuyModal onClose={() => setShowModal(false)} onAdd={handleAdd} currentPrice={summary.currentPrice} />}
      {showTweaks && <TweaksPanel onClose={() => setShowTweaks(false)} accent={accent} setAccent={setAccent} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
