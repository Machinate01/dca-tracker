// Yahoo Finance v8 chart endpoint — no API key required, generous rate limits.
// Returns regularMarketPrice (last trade) for stocks and forex pairs.
const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

export type LivePrices = Record<string, number>;

async function fetchYFPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${YF_CHART}/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DCA-Tracker/1.0)',
          'Accept': 'application/json',
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const p = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof p === 'number' && p > 0 ? p : null;
  } catch {
    return null;
  }
}

export async function fetchLivePrices(tickers: string[]): Promise<LivePrices> {
  if (tickers.length === 0) return {};

  // Fetch all tickers + USDTHB=X forex rate in parallel
  const [tickerResults, usdThb] = await Promise.all([
    Promise.all(tickers.map(async (t) => [t, await fetchYFPrice(t)] as [string, number | null])),
    fetchYFPrice('USDTHB=X'),
  ]);

  const out: LivePrices = {};
  for (const [ticker, price] of tickerResults) {
    if (price !== null) out[ticker] = price;
  }
  if (usdThb !== null) out['USDTHB=X'] = usdThb;

  return out;
}
