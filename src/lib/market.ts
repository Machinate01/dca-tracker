const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export type LivePrices = Record<string, number>;

async function fetchFinnhubPrice(symbol: string, token: string): Promise<number | null> {
  try {
    const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { c?: number };
    return typeof json.c === 'number' && json.c > 0 ? json.c : null;
  } catch {
    return null;
  }
}

async function fetchUsdThb(token: string): Promise<number | null> {
  try {
    const res = await fetch(`${FINNHUB_BASE}/forex/rates?base=USD&token=${token}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { quote?: Record<string, number> };
    const thb = json.quote?.THB;
    return typeof thb === 'number' && thb > 0 ? thb : null;
  } catch {
    return null;
  }
}

export async function fetchLivePrices(tickers: string[]): Promise<LivePrices> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token || tickers.length === 0) return {};

  const [prices, usdThb] = await Promise.all([
    Promise.all(tickers.map(async (t) => [t, await fetchFinnhubPrice(t, token)] as [string, number | null])),
    fetchUsdThb(token),
  ]);

  const out: LivePrices = {};
  for (const [ticker, price] of prices) {
    if (price !== null) out[ticker] = price;
  }
  if (usdThb !== null) out['USDTHB=X'] = usdThb;

  return out;
}
