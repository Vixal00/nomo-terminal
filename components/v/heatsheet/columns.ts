import { AUDIT_BANDS, BUY_SHARE_EDGES, HEAT_EDGES, RANK_RULE, trendingRows, type Tab, type Window } from "@/lib/trending";
import type { MarketSim } from "@/lib/trending-live";
import { LABELS } from "@/lib/labels";
import { Z500 } from "@/lib/spec";

/* The sheet's columns as data: label, group, tip and how a column sorts.

   Widths are not here. The layout is owned by heatsheet.css (one grid
   template per breakpoint, every track named after a key below), so the
   server render is already the final layout and nothing measures the
   viewport. A column this table knows about but the template hides is a
   0px track and display:none cells, so nothing beside it shifts. */

export type ColKey =
  | "rank"
  | "r24"
  | "av"
  | "tier"
  | "name"
  | "age"
  | "mc"
  | "c5m"
  | "c1h"
  | "c6h"
  | "c24h"
  | "vol"
  | "txn"
  | "bs"
  | "liq"
  | "hld"
  | "t10"
  | "dev"
  | "snp"
  | "bnd"
  | "crv"
  | "z";

export type SortKey = "age" | "mc" | "c5m" | "c1h" | "c6h" | "c24h" | "vol" | "txn" | "bs" | "liq" | "hld" | "t10" | "dev" | "snp" | "bnd";
export type Sort = { key: SortKey; dir: "desc" | "asc" };

export const CHANGE_COLS = [
  ["c5m", "5m"],
  ["c1h", "1h"],
  ["c6h", "6h"],
  ["c24h", "24h"],
] as const satisfies readonly (readonly [ColKey, Window])[];

export const RISK_COLS = [
  ["t10", "top10", "Top 10 holders"],
  ["dev", "dev", "Creator"],
  ["snp", "snipers", "Snipers"],
  ["bnd", "bundlers", "Bundlers"],
] as const;

type Ctx = { tab: Tab; w: Window };

export type Col = {
  key: ColKey;
  label: string;
  /** Figures right, words left, marks centred. */
  align: "l" | "r" | "c";
  sort: SortKey | null;
  tip: (c: Ctx) => string;
  /** Tooltips near the right edge open leftward, so the scroller's
   *  overflow doesn't clip them. */
  tipAlign?: "start" | "end";
};

const N = trendingRows().length;

/** How often the market may re-rank the board. Passed to the order and
 *  the 24H# ranks, and printed from here, so the copy that states the
 *  cadence is the cadence. */
export const REORDER_MS = 5000;

const auditTip = (label: string, kind: keyof typeof AUDIT_BANDS) =>
  `${label}, % of supply. Warn at ${AUDIT_BANDS[kind].warn}, bad at ${AUDIT_BANDS[kind].bad}.`;

export const COLS: readonly Col[] = [
  { key: "rank", label: "#", align: "r", sort: null, tip: ({ tab, w }) => RANK_RULE[tab](w) },
  {
    key: "r24",
    label: "24H#",
    align: "r",
    sort: null,
    tip: () => `Rank by trades in the last 24h across all ${N} coins, unfiltered. Re-ranked at most every ${REORDER_MS / 1000}s.`,
  },
  { key: "av", label: "", align: "c", sort: null, tip: () => "" },
  { key: "tier", label: "T", align: "c", sort: null, tip: () => "Launch tier: Free, Fortress or Diamond." },
  { key: "name", label: "TICKER", align: "l", sort: null, tip: () => "Ticker and name. A star marks a coin you starred (S)." },
  { key: "age", label: "AGE", align: "r", sort: "age", tip: () => "Time since launch." },
  { key: "mc", label: "MCAP $", align: "r", sort: "mc", tip: () => "Market cap, USD. Fixture at page open, simulated since." },
  ...CHANGE_COLS.map(
    ([key, win]): Col => ({ key, label: win.toUpperCase(), align: "r", sort: key, tip: () => `Price change over the last ${win}, %.` }),
  ),
  { key: "vol", label: "VOL $", align: "r", sort: "vol", tip: ({ w }) => `Volume in the last ${w}, USD.` },
  { key: "txn", label: "TXN", align: "r", sort: "txn", tip: ({ w }) => `Trades in the last ${w}: buys plus sells.` },
  {
    key: "bs",
    label: "B/S",
    align: "r",
    sort: "bs",
    tip: () =>
      `Buy share of the window's trades, %. Teal over ${BUY_SHARE_EDGES.buy}, red under ${BUY_SHARE_EDGES.sell}.`,
  },
  { key: "liq", label: "LIQ $", align: "r", sort: "liq", tip: () => "Pool liquidity, USD." },
  { key: "hld", label: "HLD", align: "r", sort: "hld", tip: () => "Holders. Fixture; not simulated.", tipAlign: "end" },
  ...RISK_COLS.map(
    ([key, kind, label]): Col => ({ key, label: key.toUpperCase(), align: "r", sort: key, tip: () => auditTip(label, kind), tipAlign: "end" }),
  ),
  {
    key: "crv",
    label: "CRV",
    align: "r",
    sort: null,
    tip: () => `${LABELS.CURVE_HEAD}. ${LABELS.CURVE_CAVEAT} ${LABELS.CURVE_FORTRESS}`,
    tipAlign: "end",
  },
  {
    key: "z",
    label: "Z500",
    align: "r",
    sort: null,
    tip: () =>
      `${RANK_RULE.z500()} Scored seats print their score: bone at ${Z500.bar} and over, rim from ${Z500.exit}, red under ${Z500.exit}. U is an unscored seat.`,
    tipAlign: "end",
  },
];

export const colOf = (k: ColKey) => COLS.find((c) => c.key === k)!;

/** The column a tab already ranks by, for the caret when no column sort
 *  is set. Z500's caret marks the tab's rank; the header isn't a button. */
export const TAB_CARET: Record<Tab, { key: ColKey; dir: "desc" | "asc" }> = {
  trending: { key: "txn", dir: "desc" },
  starred: { key: "txn", dir: "desc" },
  top: { key: "mc", dir: "desc" },
  new: { key: "age", dir: "asc" },
  z500: { key: "z", dir: "desc" },
  final: { key: "crv", dir: "desc" },
};

/** The first direction a click sorts in. Age starts youngest first,
 *  because that is the question anyone sorting by age is asking. */
export const FIRST_DIR: Partial<Record<SortKey, "asc">> = { age: "asc" };

/** What a column sort reads, on the simulated figures. */
export function sortValue(sim: MarketSim, t: string, key: SortKey, w: Window): number | null {
  const row = sim.row(t);
  if (!row) return null;
  switch (key) {
    case "age":
      return sim.value(t, "24h", "age");
    case "mc":
      return sim.value(t, "24h", "mc");
    case "c5m":
      return sim.value(t, "5m", "change");
    case "c1h":
      return sim.value(t, "1h", "change");
    case "c6h":
      return sim.value(t, "6h", "change");
    case "c24h":
      return sim.value(t, "24h", "change");
    case "vol":
      return sim.value(t, w, "volume");
    case "txn":
      return sim.value(t, w, "txns");
    case "bs":
      return sim.value(t, w, "buyRatio");
    case "liq":
      return sim.value(t, "24h", "liquidity");
    case "hld":
      return row.holders;
    case "t10":
      return row.top10Pct;
    case "dev":
      return row.devPct;
    case "snp":
      return row.snipersPct;
    case "bnd":
      return row.bundlersPct;
  }
}

/** A column sort over the tab's order. Unknown figures go last in both
 *  directions (a missing figure is not the smallest one), and ties keep
 *  the tab's order, so # still reads down the tie. */
export function sortTickers(tickers: readonly string[], sort: Sort, w: Window, sim: MarketSim): string[] {
  const vals = new Map(tickers.map((t) => [t, sortValue(sim, t, sort.key, w)]));
  const pos = new Map(tickers.map((t, i) => [t, i]));
  const s = sort.dir === "desc" ? -1 : 1;
  return [...tickers].sort((a, b) => {
    const va = vals.get(a) ?? null;
    const vb = vals.get(b) ?? null;
    if (va === null && vb === null) return pos.get(a)! - pos.get(b)!;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * s || pos.get(a)! - pos.get(b)!;
  });
}

/** The band edges, as the legends print them. */
export const HEAT_LEGEND = HEAT_EDGES.join("/");
