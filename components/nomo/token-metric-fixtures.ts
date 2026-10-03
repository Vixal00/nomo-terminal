import type { Token } from "./data";

// Authored audit fixtures, matching the rest of the local market snapshot.
// These fields must come from an audit provider when market data is connected.
export function tokenMetricFixtures(token: Token) {
  const seed = [...token.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  const bought = 220 + seed * .43;
  return {
    dexPaidAt: `2026/10/03 ${String(1 + seed % 4).padStart(2, "0")}:${String(seed % 60).padStart(2, "0")}:${String(seed * 7 % 60).padStart(2, "0")}`,
    botHoldPct: 8 + (seed % 2700) / 100,
    bundlerAthPct: Math.min(99.9, token.bundlersPct * 2.4 + 12),
    bundlerCount: Math.max(1, Math.round(token.holders * .014)),
    bundledTotalSol: 8 + seed * .27,
    bundledTokenPct: 102 + seed % 167 + .6,
    developer: {
      wallet: ["FaJx…yrQ5", "C7mQ…4bKp", "H2vN…8zRt"][seed % 3],
      funding: ["BY4S…BEcx", "G6pN…2wJh", "K9rM…5aTv"][seed % 3],
      bought,
      buyTxs: 1 + seed % 3,
      sold: token.devPct === 0 ? bought * 1.48 : bought * .42,
      sellTxs: 1 + seed % 4,
      balance: token.mcap * token.devPct / 100,
      transferSol: 2 + seed * .017,
      fundedAt: `2026/09/${String(20 + seed % 10).padStart(2, "0")} 13:40:16`,
    },
  };
}
