// Realistic DCA dataset — 104 days, 108 THB/day
// Roughly modeled on user's reference (Spend 11,232 / 472k sat / current 2.398M THB/BTC)
(function () {
  const START_DATE = new Date('2026-01-01T00:00:00');
  const DAYS = 104;
  const DAILY_FIAT = 108;

  // Generate a plausible BTC price walk in THB, ending near 2,398,015
  // Use a deterministic seeded "random" so the chart is stable across reloads.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(42);

  // Walk prices to land near 2,398,015 on day 104
  const prices = [];
  let p = 2_050_000;
  for (let i = 0; i < DAYS; i++) {
    // slight upward drift + noise + a dip around day 50-65 (drawdown)
    let drift = 3500;
    let vol = (rand() - 0.5) * 60000;
    if (i > 48 && i < 66) drift -= 18000; // drawdown period
    if (i > 66 && i < 80) drift += 9000;  // recovery
    p = Math.max(1_600_000, p + drift + vol);
    prices.push(Math.round(p));
  }
  // Anchor the last price to the reference
  prices[prices.length - 1] = 2_398_015;
  // Also anchor max drawdown roughly to -27% from a peak
  // (walk is naturally close; leave as-is)

  const records = [];
  let totalSat = 0;
  let totalFiat = 0;
  let peakPortfolio = 0;
  let maxDD = 0;

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(START_DATE.getTime() + i * 86400000);
    const price = prices[i];
    const satPerTHB = 100_000_000 / price; // sat per 1 THB
    const satBought = Math.round(DAILY_FIAT * satPerTHB);
    totalSat += satBought;
    totalFiat += DAILY_FIAT;

    const portfolioValue = (totalSat / 100_000_000) * price;
    const unrealized = portfolioValue - totalFiat;
    const pctUnrealized = (unrealized / totalFiat) * 100;

    peakPortfolio = Math.max(peakPortfolio, portfolioValue);
    const dd = (portfolioValue - peakPortfolio) / peakPortfolio * 100;
    if (dd < maxDD) maxDD = dd;

    records.push({
      dayActive: i + 1,
      date,
      fiat: DAILY_FIAT,
      satoshi: satBought,
      price,
      portfolioValue,
      invested: totalFiat,
      unrealized,
      pctUnrealized,
      satPerTHB,
    });
  }

  const last = records[records.length - 1];
  const avgCostSatPerTHB = totalSat / totalFiat;
  const todaySatPerTHB = 100_000_000 / last.price;

  const summary = {
    spendFiat: totalFiat,
    totalSatoshi: totalSat,
    currentPrice: last.price,
    maxDrawdown: maxDD,
    numberOfDays: DAYS,
    averageCost: avgCostSatPerTHB,
    todaySatPerTHB,
    marketValue: last.portfolioValue,
    pctProfitLoss: (last.portfolioValue - totalFiat) / totalFiat * 100,
    goalFiat: 200_000,
    goalSat: 2_000_000,
    progressFiat: totalFiat / 200_000 * 100,
    progressBTC: totalSat / 100_000_000 / 0.02 * 100, // 2M sat = 0.02 BTC
  };

  window.DCA = { records, summary, DAILY_FIAT, DAYS };
})();
