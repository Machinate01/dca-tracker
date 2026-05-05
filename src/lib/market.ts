const YF_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote';

type YFQuote = { symbol: string; regularMarketPrice?: number };
type YFResponse = { quoteResponse?: { result?: YFQuote[] } };

export type LivePrices = Record<string, number>;

export async function fetchLivePrices(tickers: string[]): Promise<LivePrices> {
  if (tickers.length === 0) return {};
  try {
    const symbols = [...tickers, 'USDTHB=X'].join(',');
    const url = `${YF_QUOTE}?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice`;
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as YFResponse;
    const quotes = json.quoteResponse?.result ?? [];
    const out: LivePrices = {};
    for (const q of quotes) {
      if (typeof q.regularMarketPrice === 'number' && q.regularMarketPrice > 0) {
        out[q.symbol] = q.regularMarketPrice;
      }
    }
    return out;
  } catch {
    return {};
  }
}
