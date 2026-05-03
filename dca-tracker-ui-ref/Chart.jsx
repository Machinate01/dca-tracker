// Charts.jsx — hover-enabled SVG charts for DCA tracker
// 3 chart types: Portfolio Value vs Invested, Unrealized PNL, Cost basis vs Market price

const { useState, useMemo, useRef, useEffect } = React;

function formatTHB(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
function formatTHBFull(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
function formatDateShort(d) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function Chart({ records, mode, timeframe }) {
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [dims, setDims] = useState({ w: 800, h: 280 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    if (timeframe === "7D") return records.slice(-7);
    if (timeframe === "30D") return records.slice(-30);
    return records;
  }, [records, timeframe]);

  const { w, h } = dims;
  const padL = 52, padR = 16, padT = 20, padB = 28;
  const cw = Math.max(0, w - padL - padR);
  const ch = Math.max(0, h - padT - padB);

  // Series definitions per mode
  const series = useMemo(() => {
    if (mode === "portfolio") {
      return [
        { key: "portfolio", label: "Portfolio Value", color: "var(--accent)", fill: "var(--accent-line)", values: data.map((d) => d.portfolioValue) },
        { key: "invested", label: "Invested", color: "var(--fg-2)", dash: "4 4", values: data.map((d) => d.invested) },
      ];
    }
    if (mode === "pnl") {
      return [
        { key: "unrealized", label: "Unrealized PNL", color: "var(--accent)", fill: "var(--accent-line)", values: data.map((d) => d.unrealized), zero: true },
      ];
    }
    // cost
    return [
      { key: "market", label: "Market Price", color: "var(--accent)", values: data.map((d) => d.price) },
      { key: "cost", label: "Avg Cost Basis", color: "var(--fg-2)", dash: "4 4", values: data.map((d, i) => {
        const slice = data.slice(0, i + 1);
        const totalSat = slice.reduce((s, r) => s + r.satoshi, 0);
        const totalFiat = slice.reduce((s, r) => s + r.fiat, 0);
        // cost basis in THB/BTC terms = totalFiat / (totalSat/1e8)
        return totalFiat / (totalSat / 1e8);
      }) },
    ];
  }, [data, mode]);

  const allVals = series.flatMap((s) => s.values);
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  if (series[0]?.zero) {
    // Always include zero in PNL chart
    yMin = Math.min(yMin, 0);
    yMax = Math.max(yMax, 0);
  }
  // padding
  const yRange = yMax - yMin || 1;
  yMin -= yRange * 0.06;
  yMax += yRange * 0.06;

  const x = (i) => padL + (data.length <= 1 ? 0 : (i / (data.length - 1)) * cw);
  const y = (v) => padT + ch - ((v - yMin) / (yMax - yMin)) * ch;

  // Y grid lines
  const gridLines = 4;
  const grid = Array.from({ length: gridLines + 1 }, (_, i) => {
    const v = yMin + ((yMax - yMin) / gridLines) * i;
    return { v, y: y(v) };
  });

  const zeroY = yMin < 0 && yMax > 0 ? y(0) : null;

  // Build area path
  function buildPath(values, withArea) {
    if (values.length === 0) return "";
    let d = `M ${x(0)} ${y(values[0])}`;
    for (let i = 1; i < values.length; i++) d += ` L ${x(i)} ${y(values[i])}`;
    if (withArea) {
      const baseY = zeroY !== null ? zeroY : padT + ch;
      d += ` L ${x(values.length - 1)} ${baseY} L ${x(0)} ${baseY} Z`;
    }
    return d;
  }

  // X ticks — approx 6 labels
  const xTickCount = Math.min(6, data.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const idx = Math.round((i / (xTickCount - 1 || 1)) * (data.length - 1));
    return { idx, x: x(idx), date: data[idx]?.date };
  });

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if (mx < padL) { setHoverIdx(null); return; }
    const rel = (mx - padL) / cw;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))));
    setHoverIdx(idx);
  }
  function onLeave() { setHoverIdx(null); }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  // Tooltip content per mode
  let tooltipRows = [];
  if (hovered) {
    if (mode === "portfolio") {
      tooltipRows = [
        { lbl: "Portfolio", val: formatTHBFull(hovered.portfolioValue) + " ฿" },
        { lbl: "Invested", val: formatTHBFull(hovered.invested) + " ฿" },
        { lbl: "Unrealized", val: (hovered.unrealized >= 0 ? "+" : "") + formatTHBFull(hovered.unrealized) + " ฿" },
      ];
    } else if (mode === "pnl") {
      tooltipRows = [
        { lbl: "Unrealized", val: (hovered.unrealized >= 0 ? "+" : "") + formatTHBFull(hovered.unrealized) + " ฿" },
        { lbl: "%", val: hovered.pctUnrealized.toFixed(2) + "%" },
        { lbl: "Portfolio", val: formatTHBFull(hovered.portfolioValue) + " ฿" },
      ];
    } else {
      const slice = data.slice(0, hoverIdx + 1);
      const tSat = slice.reduce((s, r) => s + r.satoshi, 0);
      const tFiat = slice.reduce((s, r) => s + r.fiat, 0);
      const costBasis = tFiat / (tSat / 1e8);
      tooltipRows = [
        { lbl: "Market Price", val: formatTHBFull(hovered.price) + " ฿" },
        { lbl: "Avg Cost", val: formatTHBFull(costBasis) + " ฿" },
        { lbl: "Spread", val: ((hovered.price - costBasis) / costBasis * 100).toFixed(2) + "%" },
      ];
    }
  }

  const legend = series.map((s) => (
    <span key={s.key} className="legend-item">
      <span
        className="legend-swatch"
        style={{
          background: s.dash ? "transparent" : s.color,
          border: s.dash ? `2px dashed ${s.color}` : "none",
          height: s.dash ? 0 : 10,
        }}
      />
      {s.label}
    </span>
  ));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="chart-legend">{legend}</div>
      <div ref={wrapRef} style={{ flex: 1, position: "relative", minHeight: 0 }} onMouseMove={onMove} onMouseLeave={onLeave}>
        <svg width={w} height={h} style={{ display: "block" }}>
          {/* grid */}
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={g.y} y2={g.y} stroke="var(--divider)" strokeWidth="1" />
              <text x={padL - 8} y={g.y + 3} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--muted)">
                {formatTHB(g.v)}
              </text>
            </g>
          ))}
          {/* zero line for pnl */}
          {zeroY !== null && (
            <line x1={padL} x2={w - padR} y1={zeroY} y2={zeroY} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          )}
          {/* x ticks */}
          {xTicks.map((t, i) => (
            <text key={i} x={t.x} y={h - 8} textAnchor="middle" fontSize="10" fontFamily="var(--mono)" fill="var(--muted)">
              {t.date ? formatDateShort(t.date) : ""}
            </text>
          ))}
          {/* series: area first, then lines */}
          {series.map((s) => s.fill && (
            <path key={s.key + "-area"} d={buildPath(s.values, true)} fill={s.fill} stroke="none" />
          ))}
          {series.map((s) => (
            <path
              key={s.key + "-line"}
              d={buildPath(s.values, false)}
              fill="none"
              stroke={s.color}
              strokeWidth="1.75"
              strokeDasharray={s.dash || "none"}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* hover crosshair */}
          {hoverIdx !== null && (
            <g>
              <line
                x1={x(hoverIdx)} x2={x(hoverIdx)}
                y1={padT} y2={padT + ch}
                stroke="var(--fg)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5"
              />
              {series.map((s) => (
                <circle
                  key={s.key + "-dot"}
                  cx={x(hoverIdx)} cy={y(s.values[hoverIdx])}
                  r="4" fill="var(--surface)"
                  stroke={s.color} strokeWidth="2"
                />
              ))}
            </g>
          )}
        </svg>
        {hovered && (
          <div
            className="tooltip visible"
            style={{ left: x(hoverIdx), top: 0 }}
          >
            <div className="t-date">{formatDate(hovered.date)} · Day {hovered.dayActive}</div>
            {tooltipRows.map((r, i) => (
              <div className="t-row" key={i}>
                <span className="t-lbl">{r.lbl}</span>
                <span>{r.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sparkline for stat cards
function Sparkline({ values, color = "var(--accent)", fill = true }) {
  const w = 64, h = 20, pad = 1;
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xs = (i) => pad + (i / (values.length - 1)) * (w - pad * 2);
  const ys = (v) => pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
  let d = `M ${xs(0)} ${ys(values[0])}`;
  for (let i = 1; i < values.length; i++) d += ` L ${xs(i)} ${ys(values[i])}`;
  const area = d + ` L ${xs(values.length - 1)} ${h} L ${xs(0)} ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, { Chart, Sparkline, formatTHB, formatTHBFull, formatDate, formatDateShort });
