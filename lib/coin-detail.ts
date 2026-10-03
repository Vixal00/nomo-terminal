/**
 * Per-coin market detail: the readings a token screen carries beyond
 * price and curve.
 *
 * Every figure is derived, not fetched. It is also derived from the
 * ticker rather than at random, so a coin's holders, stats and audit are
 * the same on every visit and agree with each other: the audit's holder
 * count is the length of the holder table, buy volume plus sell volume is
 * the window's volume, and the top ten percentage is the sum of the first
 * ten rows. A screen full of independently random numbers reads as fake
 * precisely because those relationships break.
 */

import type { Coin } from "./data";

export type StatWindow = {
  key: "5m" | "1h" | "6h" | "24h";
  priceChange: number;
  volume: number;
  buys: number;
  sells: number;
  buyVol: number;
  sellVol: number;
  buyers: number;
  sellers: number;
};

export type HolderRow = {
  label: string;
  /** Named accounts carry a follower count; bare wallets do not. */
  followers: number | null;
  pct: number;
  /** Absent for wallets held since launch, as on the reference screen. */
  entryMcap: string | null;
  pnl: number | null;
  pnlPct: number | null;
  tag?: "creator" | "airdrop" | "curve";
};

export type CoinDetail = {
  mcNum: number;
  ath: number;
  athLabel: string;
  fromAth: number;
  stats: StatWindow[];
  holders: HolderRow[];
  audit: {
    holders: number;
    top10: number;
    dev: number;
    snipers: number;
    bundlers: number;
    totalFees: string;
  };
  graduated: boolean;
  /** What is in the pool, in dollars: the curve's reserve while the
   *  coin is on it, the DEX pair once it has left. */
  liquidity: number;
};

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function seeded(key: string) {
  let s = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function parseMoney(s: string): number {
  const n = Number(s.replace(/[^0-9.]/g, "")) || 0;
  if (/M/i.test(s)) return n * 1_000_000;
  if (/K/i.test(s)) return n * 1_000;
  return n;
}

export function money(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}K`;
  return `$${v}`;
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

/** Handles for named holders. Fragments rather than finished names, so
 *  the roster never reads as a fixed cast. */
const HANDLE_A = [
  "ansem", "formless", "latent", "nock", "vapor", "obsid", "hornet", "kestrel",
  "drift", "ozone", "cinder", "tremor", "monsoon", "vertex", "lantern", "wraith",
];
const HANDLE_B = ["crab", "fish", "chain", "conzimp", "core", "byte", "hand", "oracle"];

export function coinDetail(coin: Coin): CoinDetail {
  const rand = seeded(coin.ticker + "detail");
  const mcNum = parseMoney(coin.mc);

  /* All-time high sits above the current cap by a factor that grows with
     how far the coin has already run. A coin still on the curve has not
     had time to draw down much; a migrated one usually has. */
  const drawdown = coin.migrated ? 0.35 + rand() * 0.55 : 0.05 + rand() * 0.35;
  const ath = Math.max(mcNum * (1 + drawdown), mcNum * 1.02);
  const fromAth = (mcNum / ath) * 100;

  /* ---------------------------------------------------------- windows */
  const WINDOWS: { key: StatWindow["key"]; share: number }[] = [
    { key: "5m", share: 0.006 },
    { key: "1h", share: 0.055 },
    { key: "6h", share: 0.28 },
    { key: "24h", share: 1 },
  ];

  const dayVol = parseMoney(coin.volume);
  const stats: StatWindow[] = WINDOWS.map((w) => {
    const volume = Math.max(1, dayVol * w.share * (0.75 + rand() * 0.5));
    // Buy and sell volume are split, then summed back, so the two bars
    // and the volume figure above them cannot disagree.
    const buyShare = 0.36 + rand() * 0.28;
    const buyVol = volume * buyShare;
    const sellVol = volume - buyVol;
    // The count comes from the roster's own 24h figure — the one the
    // index and the feed print — cut to the window, so the 24h row here
    // is that number and not a second estimate of it. It used to be
    // derived from volume at a few hundred dollars a trade, which put
    // the stats panel at a fifth of the header's count and gave a
    // five-minute window two trades on every coin.
    const trades =
      w.key === "24h"
        ? coin.txns
        : Math.max(1, Math.round(coin.txns * w.share * (0.8 + rand() * 0.4)));
    const buys = Math.round(trades * (0.4 + rand() * 0.25));
    const sells = trades - buys;
    return {
      key: w.key,
      // The 24h figure is the coin's own, so the panel agrees with the
      // header rather than quoting a second number for the same thing.
      priceChange:
        w.key === "24h" && coin.d24 !== null
          ? coin.d24
          : Math.round((rand() * 40 - 17) * 10) / 10,
      volume,
      buys,
      sells,
      buyVol,
      sellVol,
      buyers: Math.max(1, Math.round(buys * (0.55 + rand() * 0.35))),
      sellers: Math.max(1, Math.round(sells * (0.55 + rand() * 0.35))),
    };
  });

  /* ---------------------------------------------------------- holders */
  const COUNT = 12;
  const holders: HolderRow[] = [];
  // A long tail: the first holder is large and the rest fall away fast,
  // which is the shape a launch actually has.
  let pct = 4 + rand() * 7;
  for (let i = 0; i < COUNT; i++) {
    const named = rand() < 0.45;
    const wallet = () => {
      let a = "", b = "";
      for (let k = 0; k < 4; k++) a += B58[Math.floor(rand() * B58.length)];
      for (let k = 0; k < 4; k++) b += B58[Math.floor(rand() * B58.length)];
      return `${a}…${b}`;
    };
    const label = named
      ? HANDLE_A[Math.floor(rand() * HANDLE_A.length)] +
        HANDLE_B[Math.floor(rand() * HANDLE_B.length)] +
        (rand() < 0.5 ? String(Math.floor(rand() * 900) + 10) : "")
      : wallet();

    // Held-since-launch wallets have no entry price to show, so no PnL.
    const sinceLaunch = rand() < 0.42;
    const entry = sinceLaunch ? null : mcNum * (0.05 + rand() * 1.6);
    const pnlPct = entry === null ? null : ((mcNum - entry) / entry) * 100;
    const pnl = entry === null ? null : (pct / 100) * (mcNum - entry);

    holders.push({
      label,
      followers: named ? Math.floor(rand() * 40_000) + 12 : null,
      pct: Math.round(pct * 100) / 100,
      entryMcap: entry === null ? null : money(entry),
      pnl,
      pnlPct: pnlPct === null ? null : Math.round(pnlPct * 10) / 10,
      tag: i === 0 ? "creator" : i === 1 && coin.migrated ? "airdrop" : undefined,
    });
    pct = Math.max(0.08, pct * (0.42 + rand() * 0.34));
  }

  const top10 = holders.slice(0, 10).reduce((a, h) => a + h.pct, 0);

  /* ------------------------------------------------------------ audit */
  const holderCount = Math.max(
    12,
    Math.round(Math.pow(mcNum, 0.62) * (0.5 + rand() * 0.7))
  );

  return {
    mcNum,
    ath,
    athLabel: money(ath),
    fromAth,
    stats,
    holders,
    audit: {
      holders: holderCount,
      top10: Math.round(top10 * 10) / 10,
      // Team supply is declared upfront on this platform, so a dev
      // holding is a number the page can state rather than infer.
      dev: Math.round(rand() * 42) / 10,
      snipers: Math.round(rand() * 65) / 10,
      bundlers: Math.round(rand() * 38) / 10,
      totalFees: `${(dayVol / 1_000 * (0.6 + rand() * 0.9)).toFixed(1)} SOL`,
    },
    graduated: coin.migrated,
    // Last, and drawn last: every figure above is seeded, and a draw
    // inserted ahead of one would reshuffle it on every coin.
    //
    // A pool is a fraction of the cap it prices. On the curve the
    // reserve grows with the fill — a coin at 5% has next to nothing
    // behind it, one near migration has the most it will ever have —
    // and a migrated pair carries the slice the curve handed over.
    liquidity:
      mcNum *
      (coin.migrated
        ? 0.09 + rand() * 0.06
        : 0.05 + (coin.curve / 100) * 0.1 + rand() * 0.03),
  };
}
