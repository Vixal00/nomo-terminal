import { MARKET_CHAINS, type MarketChain, type Token } from "./data";

export type MarketFilters = {
  chains: MarketChain[];
  capMin: string;
  capMax: string;
  volumeMin: string;
  volumeMax: string;
  keywords: string;
};

export const emptyMarketFilters = (): MarketFilters => ({ chains: [...MARKET_CHAINS], capMin: "", capMax: "", volumeMin: "", volumeMax: "", keywords: "" });

export function parseMarketBound(raw: string): number | null {
  const match = raw.trim().replace(/^\$/, "").replaceAll(",", "").match(/^(\d+(?:\.\d*)?|\.\d+)\s*([kmb])?$/i);
  if (!match) return null;
  const value = Number(match[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1);
  return Number.isFinite(value) ? value : null;
}

// Fixed window proportions for the local market snapshot, not measured activity.
export const marketWindowShare = (time: string) => ({ "1m": .0015, "5m": .007, "30m": .045, "1h": .085 }[time] ?? 1);
export const marketVolume = (token: Token, time: string) => token.volume * marketWindowShare(time);

export function matchesMarketFilters(token: Token, filters: MarketFilters, time: string): boolean {
  if (!filters.chains.includes(token.chain)) return false;
  const minCap = parseMarketBound(filters.capMin), maxCap = parseMarketBound(filters.capMax);
  const minVolume = parseMarketBound(filters.volumeMin), maxVolume = parseMarketBound(filters.volumeMax);
  if (minCap !== null && token.mcap < minCap || maxCap !== null && token.mcap > maxCap) return false;
  const volume = marketVolume(token, time);
  if (minVolume !== null && volume < minVolume || maxVolume !== null && volume > maxVolume) return false;
  const terms = filters.keywords.split(",").map(term => term.trim().replace(/^\$/, "").toLowerCase()).filter(Boolean);
  return !terms.length || terms.some(term => `${token.symbol} ${token.name} ${token.contract}`.toLowerCase().includes(term));
}

export function activeMarketFilterCount(filters: MarketFilters) {
  return [filters.capMin, filters.capMax, filters.volumeMin, filters.volumeMax, filters.keywords].filter(value => value.trim()).length + Number(filters.chains.length !== MARKET_CHAINS.length);
}
