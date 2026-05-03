const BITKUB_URL = 'https://api.bitkub.com/api/market/ticker?sym=THB_BTC';

type BitkubTicker = { last: number; high24hr: number; low24hr: number };
type BitkubResponse = Record<string, BitkubTicker>;

export async function fetchCurrentPrice(): Promise<number | null> {
  try {
    const res = await fetch(BITKUB_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as BitkubResponse;
    const ticker = json.THB_BTC;
    if (!ticker || typeof ticker.last !== 'number' || ticker.last <= 0) return null;
    return ticker.last;
  } catch {
    return null;
  }
}
