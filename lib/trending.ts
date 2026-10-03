/**
 * The Trending page's data: one typed row per roster coin, the rules
 * that rank them, the filters, the price path the sparklines are cut
 * from, and the native-unit helpers.
 *
 * Five design versions of the page read from here and differ only in
 * presentation, so a figure cannot mean one thing on one version and
 * something else on another. None of them re-derives a window, a clamp
 * or a format: if a version needs something this module lacks, it is
 * added here.
 *
 * Pure, deterministic and server-safe. No window, no fs, no clock, no
 * Math.random: the server render and the first client render build the
 * same rows from the same seeds.
 *
 * The fixtures behind it (lib/data.ts, lib/coin-detail.ts, lib/z500.ts)
 * carry defects a trader would catch between two cells. They are fixed
 * HERE, not at source, because fixing coinDetail would change the token
 * page too and that is the owner's call. Each fix names its defect
 * (D1 to D10, numbered in the research notes) where it is made, and every
 * row lists the fixes that changed it in `fixes`.
 */

import { COINS, SPOT, coinBoost, coinMint, coinPriceUsd, type Boost, type Coin, type Tier } from "./data";
import { coinDetail, parseMoney, type StatWindow } from "./coin-detail";
import { ageDays, seatOf } from "./z500";
import { FORTRESS, ROUTES, Z500, type Route } from "./spec";
import { RANK_HEADLINE, RANK_RULE } from "./labels";
import { roundsToZero } from "./format";

export { RANK_RULE, RANK_HEADLINE };

/* ================================================================ Flags */

/** Whether the curve column is computed from market cap.
 *
 *  The roster's curve for Free and Diamond launches is an independent
 *  draw (GRIT is at 4% on a $229K cap, WRAIT at 80% on $130K), so any
 *  sort by "closest to graduation" ranks noise. While this is false the
 *  curve is shown as the roster fixture with a caveat, the Final tab is
 *  gated off, and curve headers don't sort. Only Fortress curves, which
 *  the roster already reads off market cap, are trusted. Owner decision
 *  pending. Typed as boolean so the gated branches still typecheck. */
export const CURVE_FROM_MCAP: boolean = false;

/* ================================================================ Types */

export type Window = StatWindow["key"];
export const WINDOWS: readonly Window[] = ["5m", "1h", "6h", "24h"];
export const WINDOW_SECONDS: Record<Window, number> = {
  "5m": 300,
  "1h": 3600,
  "6h": 21600,
  "24h": 86400,
};

export type Tab = "trending" | "top" | "new" | "final" | "z500" | "starred";

/** The tabs a version may offer. "final" (closest to graduation) is
 *  left out while the curve isn't tied to market cap, because on the
 *  fixtures it would open on a $2K coin at 95%. rank() returns nothing
 *  for it in that state, so a version that offers it anyway shows an
 *  empty board rather than a false one. */
export const TABS: readonly Tab[] = CURVE_FROM_MCAP
  ? ["trending", "top", "new", "final", "z500", "starred"]
  : ["trending", "top", "new", "z500", "starred"];

export type ChainId = 1 | 2;

/** Where a group of figures comes from. Designs label by group, not
 *  per digit. */
export type Source =
  | "snapshot" // T only: a real launch, copied by hand at one moment
  | "roster" //   a COINS literal (fixture)
  | "fixture" //  seeded in coinDetail or z500: the same on every screen, invented
  | "derived" //  arithmetic on the above, so it agrees with the trade view
  | "simulated"; // produced in this browser by lib/trending-live

/** A defect fix that changed this row. */
export type Fix = "D1" | "D2" | "D3" | "D4" | "D5" | "D7" | "D7-mc" | "D10" | "nest";

export type WindowFigures = {
  key: Window;
  /** %, null when there is no figure (d24 null, or T). */
  change: number | null;
  volume: number | null;
  buys: number | null;
  sells: number | null;
  txns: number | null;
  buyVol: number | null;
  sellVol: number | null;
  buyers: number | null;
  sellers: number | null;
  /** buys / txns, 0 to 1; null when txns is 0 or unknown. */
  buyRatio: number | null;
  /** buyVol − sellVol, signed USD. */
  netFlow: number | null;
  /** volume / txns. */
  avgTrade: number | null;
  /** The window is at least as long as the coin's life, so every
   *  figure in it is since launch. Print LABELS.SINCE_LAUNCH, not the
   *  window, beside it. */
  sinceLaunch: boolean;
};

export type RowSeat = {
  seatNo: number;
  route: Route;
  /** ROUTES[].scored: Merit and External are scored week to week,
   *  Fortress and Diamond are not. An unscored seat's fixture score is
   *  not a figure to print (see lib/seat-state.ts). */
  scored: boolean;
  score: number;
  /** Null where D10 withholds it; see weeksSeated. */
  scoreChange: number | null;
  /** Null where D10 withholds it; see weeksSeated. */
  rankChange: number | null;
  /** Null where the fixture's seat age contradicts its score (D10): a
   *  scored seat granted this week under the entry bar it had to clear
   *  to be granted. Print nothing for the age then, not a 0, and never
   *  print an age beside the seat state without checking for null. */
  weeksSeated: number | null;
  chain: 1 | 2;
};

export type TrendingRow = {
  ticker: string;
  name: string;
  slug: string;
  tier: Tier;
  /** Coin art is dealt by roster position. */
  rosterIndex: number;
  /** T, the one real launch: never simulated, no invented depth. */
  real: boolean;
  ageMinutes: number;
  /** The roster's own string, e.g. "3w 2d". */
  ageLabel: string;
  priceUsd: number;
  mcUsd: number;
  /** The roster string ("$418.3K"), or the clamped figure for D7-mc. */
  mcLabel: string;
  liquidityUsd: number | null;
  athUsd: number | null;
  /** Percent below the all-time high, as a signed change: −42.6 means
   *  the cap is 42.6% under its ATH. coinDetail's `fromAth` is percent
   *  OF the ATH (57.4), which read as a drawdown prints the wrong
   *  number. */
  fromAthPct: number | null;
  /** 0 to 100, clamped to 99 while unmigrated (D7). */
  curve: number;
  /** Whether the curve follows market cap: Fortress, migrated, T's
   *  snapshot, or everything once CURVE_FROM_MCAP is on. An untrusted
   *  curve is a roster fixture and must not be drawn as progress toward
   *  graduation or sorted on. */
  curveTrusted: boolean;
  migrated: boolean;
  /** null prints the dash: the roster's "-". */
  airdroppedUsd: number | null;
  windows: Record<Window, WindowFigures>;
  /** Rank by 24h trades across the whole roster, 1-based, on the
   *  fixture at page open. It goes stale as soon as the simulation
   *  commits, so a 24H# column beside ticking cells reads
   *  useLiveRanks("trending", "24h") from lib/trending-live instead. */
  fixtureRank24h: number;
  holders: number | null;
  /** null when unknown (T) or hidden by the D4 guard; see top10Hidden. */
  top10Pct: number | null;
  /** True when the fixture's top-10 exceeds the share the roster curve
   *  says has sold. Print LABELS.TOP10_HIDDEN as the null's title. */
  top10Hidden: boolean;
  /** audit.dev, never holders[0].pct (D1). */
  devPct: number | null;
  snipersPct: number | null;
  bundlersPct: number | null;
  seat: RowSeat | null;
  /** Paid placement. Never changes rank. */
  boost: Boost | null;
  creator: string;
  mint: string;
  /** True only for T. Every other mint is a placeholder. */
  mintResolves: boolean;
  source: {
    market: Source;
    windows: Source;
    holders: Source;
    audit: Source;
    seat: Source;
    boost: Source;
    mint: Source;
  };
  /** The defect fixes that changed this row's figures. */
  fixes: readonly Fix[];
};

/* ================================================================ Seeds */

/** The same generator the fixtures use, with a salt of its own so the
 *  price path never shares a sequence with any figure it is pinned to. */
function seeded(key: string) {
  let s = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x7a11) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gauss(rand: () => number) {
  // Box-Muller. 1 − u keeps the log away from zero.
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ================================================================ Rows */

const FORTRESS_UNMIGRATED_CAP = FORTRESS.graduateMcapUsd - 1_000; // $999K

function blankWindow(key: Window): WindowFigures {
  return {
    key,
    change: null,
    volume: null,
    buys: null,
    sells: null,
    txns: null,
    buyVol: null,
    sellVol: null,
    buyers: null,
    sellers: null,
    buyRatio: null,
    netFlow: null,
    avgTrade: null,
    sinceLaunch: false,
  };
}

function withDerived(w: WindowFigures): WindowFigures {
  const txns = w.buys !== null && w.sells !== null ? w.buys + w.sells : w.txns;
  return {
    ...w,
    txns,
    buyRatio: txns && w.buys !== null ? w.buys / txns : null,
    netFlow: w.buyVol !== null && w.sellVol !== null ? w.buyVol - w.sellVol : null,
    avgTrade: txns && w.volume !== null ? w.volume / txns : null,
  };
}

/** Curve percent from market cap, the way the roster already derives
 *  Fortress curves: the $100K open to the $1M graduation cap, and for
 *  Free and Diamond (only once CURVE_FROM_MCAP is on) the pump.fun
 *  curve's roughly $105K. Unmigrated is at most 99 (D7). */
function mcapCurve(tier: Tier, mcUsd: number): number {
  const c =
    tier === "Fortress"
      ? ((mcUsd - FORTRESS.openMcapUsd) / (FORTRESS.graduateMcapUsd - FORTRESS.openMcapUsd)) * 100
      : mcUsd / 1_050;
  return Math.max(0, Math.min(99, Math.round(c)));
}

/** A row's curve at a given market cap. Where the curve is trusted it
 *  follows the cap, so the simulation moves it with the cap it moves
 *  (the "curve" cell in lib/trending-live); an untrusted curve is a
 *  roster fixture and stays where it is. At the row's own cap this is
 *  row.curve exactly. */
export function curveAt(row: TrendingRow, mcUsd: number): number {
  if (row.migrated) return 100;
  if (row.real) return row.curve;
  if (row.tier === "Fortress" || CURVE_FROM_MCAP) return mcapCurve(row.tier, mcUsd);
  return row.curve;
}

/** The money string the roster itself would have printed. */
function rosterMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return `$${n}`;
}

function buildRow(coin: Coin, rosterIndex: number): TrendingRow {
  const real = coin.ticker === "T";
  const d = coinDetail(coin);
  const fixes: Fix[] = [];
  // Rounded, not floored: ageDays divides by 24 and 1440 and "5d 7h"
  // comes back as 7619.999… minutes.
  const ageMinutes = Math.round(ageDays(coin.age) * 1440);

  /* D7, second half. DRIFT1 is a Fortress coin on the curve at $1.10M,
     above the $1M its curve graduates at. Clamping the curve to 99%
     fixes one cell and leaves the contradiction in the one beside it,
     and the simulation caps unmigrated Fortress caps under $1M, so its
     first tick would drop the cap 9% with no trade behind it. So the
     base cap is clamped to $999K here, and price, liquidity and ATH
     scale with it so every ratio the fixture had is kept. */
  let mcUsd = d.mcNum;
  let priceUsd = coinPriceUsd(coin.price);
  let scale = 1;
  let mcLabel = coin.mc;
  if (coin.tier === "Fortress" && !coin.migrated && mcUsd > FORTRESS_UNMIGRATED_CAP) {
    scale = FORTRESS_UNMIGRATED_CAP / mcUsd;
    mcUsd = FORTRESS_UNMIGRATED_CAP;
    priceUsd = priceUsd * scale;
    mcLabel = rosterMoney(mcUsd);
    fixes.push("D7-mc");
  }

  /* D7. The Fortress curve formula isn't clamped in data.ts, so DRIFT1
     reads 111% on a coin that hasn't migrated. Unmigrated is at most
     99: 100 is a state, and the coin isn't in it. */
  let curve = coin.migrated ? 100 : Math.max(0, Math.min(99, coin.curve));
  if (!coin.migrated && coin.curve > 99) fixes.push("D7");
  // A Fortress curve is the roster's own reading of market cap, so it is
  // rebuilt from the same formula the simulation moves it by; on the
  // fixtures the two agree to the percent for every Fortress coin.
  if ((CURVE_FROM_MCAP || coin.tier === "Fortress") && !coin.migrated && !real) curve = mcapCurve(coin.tier, mcUsd);
  const curveTrusted = CURVE_FROM_MCAP || coin.migrated || coin.tier === "Fortress" || real;

  /* ------------------------------------------------------------ windows */
  const byKey = Object.fromEntries(d.stats.map((s) => [s.key, s])) as Record<Window, StatWindow>;
  const windows = {} as Record<Window, WindowFigures>;

  if (real) {
    /* T is a real launch copied by hand. coinDetail gives it a 5m window
       holding its only trade and a sell in 6h that 24h doesn't contain.
       None of that happened as far as the snapshot knows, so only the
       roster's own 24h figures print: one trade, $3.63, no change. */
    for (const k of WINDOWS) windows[k] = blankWindow(k);
    windows["24h"] = withDerived({
      ...blankWindow("24h"),
      volume: parseMoney(coin.volume),
      txns: coin.txns,
    });
  } else {
    const raw: Record<Window, WindowFigures> = {} as Record<Window, WindowFigures>;
    for (const k of WINDOWS) {
      const s = byKey[k];
      raw[k] = {
        ...blankWindow(k),
        change: s.priceChange,
        volume: s.volume,
        buys: s.buys,
        sells: s.sells,
        txns: s.buys + s.sells,
        buyVol: s.buyVol,
        sellVol: s.sellVol,
        buyers: s.buyers,
        sellers: s.sellers,
      };
    }

    /* D3. coinDetail jitters 24h volume ±25% away from the roster
       figure the feed and the index print. The roster wins, and the two
       sides scale with it so they still sum to the total. */
    const dayVol = parseMoney(coin.volume);
    const k24 = dayVol / (raw["24h"].volume as number);
    if (Math.abs(k24 - 1) > 1e-9) fixes.push("D3");
    raw["24h"].volume = dayVol;
    raw["24h"].buyVol = (raw["24h"].buyVol as number) * k24;
    raw["24h"].sellVol = dayVol - raw["24h"].buyVol;

    /* D2. When the roster has no 24h change coinDetail invents one. A
       fresh launch has no 24h figure, and neither does a coin the
       roster left blank, so null stays null and prints the dash. */
    if (coin.d24 === null) fixes.push("D2");
    raw["24h"].change = coin.d24;

    /* D5. max(1, …) put "0 sells, 1 seller" on twelve coins and more
       buyers than buys on sixteen. A window with no buys has no buyers,
       and unique wallets can't outnumber the trades they made. */
    let d5 = false;
    for (const k of WINDOWS) {
      const w = raw[k];
      const buyers = w.buys === 0 ? 0 : Math.min(w.buys as number, w.buyers as number);
      const sellers = w.sells === 0 ? 0 : Math.min(w.sells as number, w.sellers as number);
      if (buyers !== w.buyers || sellers !== w.sellers) d5 = true;
      w.buyers = buyers;
      w.sellers = sellers;
    }
    if (d5) fixes.push("D5");

    /* Short lives. A window at least as long as the coin's life holds
       everything since launch, which for a coin under 24h is exactly
       the 24h row. Without this a 3-hour-old coin's 6h figures say 72%
       of its volume traded before it existed. */
    for (const k of WINDOWS) {
      if (ageMinutes * 60 <= WINDOW_SECONDS[k]) {
        raw[k] = { ...raw["24h"], key: k, sinceLaunch: true };
      }
    }

    /* Nesting. The windows are drawn independently, so T and TORQUZ
       had a shorter window holding more than the longer one around it.
       Each window is clamped to the one outside it, longest first. */
    let nested = false;
    const COUNT_FIELDS = ["buys", "sells", "buyVol", "sellVol", "buyers", "sellers"] as const;
    for (let i = WINDOWS.length - 2; i >= 0; i--) {
      const inner = raw[WINDOWS[i]];
      const outer = raw[WINDOWS[i + 1]];
      for (const f of COUNT_FIELDS) {
        const v = Math.min(inner[f] as number, outer[f] as number);
        if (v !== inner[f]) nested = true;
        inner[f] = v;
      }
      inner.buyers = Math.min(inner.buyers as number, inner.buys as number);
      inner.sellers = Math.min(inner.sellers as number, inner.sells as number);
      inner.volume = (inner.buyVol as number) + (inner.sellVol as number);
    }
    if (nested) fixes.push("nest");

    for (const k of WINDOWS) windows[k] = withDerived(raw[k]);
  }

  /* ------------------------------------------------------------ holders */
  /* D4. The holder table can hold more than the curve has sold: CINDR
     is 5% through its curve with a top ten of 28.4%. The two can't both
     be right, so the top-10 is hidden with a reason rather than printed
     beside a curve it contradicts. For Free and Diamond launches the
     curve is itself a roster fixture that doesn't follow market cap
     (18 of the 21 hidden), so the reason says the fixtures disagree and
     doesn't claim to know which is wrong. The 56 coins where the pair
     is possible keep the fixture. */
  const top10Hidden = !real && !coin.migrated && d.audit.top10 > curve * 0.9;
  if (top10Hidden) fixes.push("D4");

  /* D1. holders[0] is tagged creator at 4 to 11% while audit.dev says
     0 to 4.2%; they disagree on 76 of 78 coins. The trade rail prints
     audit.dev, so that is the dev figure here too. Listed as a fix only
     where the two would visibly disagree. */
  if (!real && Math.abs((d.holders[0]?.pct ?? 0) - d.audit.dev) > 1) fixes.push("D1");

  const s = real ? undefined : seatOf(coin.ticker);
  const route = s ? ROUTES.find((r) => r.id === s.route) : undefined;

  /* D10. DRIFTU is a Merit seat granted this week (0 weeks seated) with
     a score of 44, under the entry bar of 50 it had to clear to be
     granted. The score is the index's figure and the state sentence is
     built from it, so it stays; the seat's age is what goes. A "new
     seat" beside "Under the bar" states both halves of the
     contradiction, and the zero score and rank moves only exist
     because the fixture thought the seat was new. */
  const d10 = !!(s && route?.scored && s.weeksSeated === 0 && s.score.total < Z500.bar);
  if (d10) fixes.push("D10");
  return {
    ticker: coin.ticker,
    name: coin.name,
    slug: coin.ticker.toLowerCase(),
    tier: coin.tier,
    rosterIndex,
    real,
    ageMinutes,
    ageLabel: coin.age,
    priceUsd,
    mcUsd,
    mcLabel,
    liquidityUsd: real ? null : d.liquidity * scale,
    athUsd: real ? null : d.ath * scale,
    fromAthPct: real ? null : d.fromAth - 100,
    curve,
    curveTrusted,
    migrated: coin.migrated,
    airdroppedUsd: coin.airdropped === "-" ? null : parseMoney(coin.airdropped),
    windows,
    fixtureRank24h: 0,
    holders: real ? null : d.audit.holders,
    top10Pct: real || top10Hidden ? null : d.audit.top10,
    top10Hidden,
    devPct: real ? null : d.audit.dev,
    snipersPct: real ? null : d.audit.snipers,
    bundlersPct: real ? null : d.audit.bundlers,
    seat:
      s && route
        ? {
            seatNo: s.seatNo,
            route: s.route,
            scored: route.scored,
            score: s.score.total,
            scoreChange: d10 ? null : s.scoreChange,
            rankChange: d10 ? null : s.rankChange,
            weeksSeated: d10 ? null : s.weeksSeated,
            chain: s.chain,
          }
        : null,
    // A boost on the real launch would be a paid placement nobody paid for.
    boost: real ? null : coinBoost(coin.ticker),
    creator: coin.creator,
    mint: coinMint(coin.ticker),
    mintResolves: real,
    source: {
      // DRIFT1's cap, price, liquidity and ATH are the clamp's arithmetic,
      // not the roster's figures ($1.10M there), so they are derived.
      market: real ? "snapshot" : fixes.includes("D7-mc") ? "derived" : "roster",
      windows: real ? "snapshot" : "fixture",
      holders: "fixture",
      audit: "fixture",
      seat: "fixture",
      boost: "fixture",
      mint: real ? "snapshot" : "fixture",
    },
    fixes: real ? [] : fixes,
  };
}

let ROWS: readonly TrendingRow[] | null = null;

/** All rows, built once. coinDetail walks a lot per coin, and the
 *  roster doesn't change while the page is open. */
export function trendingRows(): readonly TrendingRow[] {
  if (ROWS) return ROWS;
  const rows = COINS.map(buildRow);
  const by24 = [...rows].sort(
    (a, b) =>
      desc(a.windows["24h"].txns, b.windows["24h"].txns) ||
      desc(a.windows["24h"].volume, b.windows["24h"].volume) ||
      a.ticker.localeCompare(b.ticker),
  );
  by24.forEach((r, i) => (r.fixtureRank24h = i + 1));
  ROWS = Object.freeze(rows);
  return ROWS;
}

export function rowOf(ticker: string): TrendingRow | undefined {
  return trendingRows().find((r) => r.ticker === ticker);
}

/* ============================================================ The path */

/** One price path per coin, anchored at every window's open.
 *
 *  coinDetail draws each window's change on its own, and the old
 *  sparkline was a random walk unrelated to any of them: it agreed in
 *  direction with the change beside it at chance (D8). Bridging each
 *  window separately fixes the direction but not the joins, because the
 *  1h line at −5m wouldn't equal the 5m line's open. So there is one
 *  path through −24h, −6h, −1h, −5m and now, each point being the price
 *  that window's change implies, and every window's sparkline is cut
 *  from it. Between anchors it is a seeded walk in log space with its
 *  drift removed, the way lib/candles.ts pins its series, so it wanders
 *  without ever missing an anchor.
 *
 *  A window with no change (d24 null) contributes no anchor, and the
 *  path doesn't exist before its oldest anchor: priceAt() returns null
 *  there, and nothing is drawn. */
type Anchor = { s: number; p: number };
type Path = { anchors: Anchor[]; segs: number[][] };

const NODES = 96;
const PATHS = new Map<string, Path>();

function anchorsOf(row: TrendingRow): Anchor[] {
  const now = row.priceUsd;
  const out: Anchor[] = [{ s: 0, p: now }];
  if (row.real) return out;
  const life = row.ageMinutes * 60;
  for (const k of WINDOWS) {
    const w = row.windows[k];
    if (w.sinceLaunch) continue;
    if (w.change !== null) out.push({ s: WINDOW_SECONDS[k], p: now / (1 + w.change / 100) });
  }
  // A coin under 24h: every since-launch window opens at launch, at the
  // price its since-launch change (d24) implies.
  const launch = WINDOWS.find((k) => row.windows[k].sinceLaunch);
  if (launch) {
    const c = row.windows[launch].change;
    if (c !== null) out.push({ s: life, p: now / (1 + c / 100) });
  }
  return out.sort((a, b) => a.s - b.s);
}

function pathOf(row: TrendingRow): Path {
  const hit = PATHS.get(row.ticker);
  if (hit) return hit;
  const anchors = anchorsOf(row);
  const rand = seeded(row.ticker + "path");
  // A per-coin temperament, so every coin doesn't wiggle alike.
  const vol = 0.1 + rand() * 0.12;
  const segs: number[][] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const step = vol * Math.sqrt((b.s - a.s) / 86400 / NODES);
    const walk = [0];
    for (let n = 1; n <= NODES; n++) walk.push(walk[n - 1] + gauss(rand) * step);
    const end = walk[NODES];
    const la = Math.log(a.p);
    const lb = Math.log(b.p);
    // Node 0 is the newer anchor (a, fewer seconds ago), node NODES the
    // older one. De-trended so both ends land exactly.
    segs.push(walk.map((v, n) => la + (lb - la) * (n / NODES) + (v - end * (n / NODES))));
  }
  const path = { anchors, segs };
  PATHS.set(row.ticker, path);
  return path;
}

/** The fixture price `secondsAgo` before the page's reference moment,
 *  or null where the path has no anchor that far back. */
export function basePriceAt(row: TrendingRow, secondsAgo: number): number | null {
  const { anchors, segs } = pathOf(row);
  if (secondsAgo <= 0) return row.priceUsd;
  const last = anchors[anchors.length - 1];
  if (secondsAgo > last.s + 1e-6) return null;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (secondsAgo > b.s + 1e-6) continue;
    if (Math.abs(secondsAgo - b.s) < 1e-6) return b.p;
    const x = ((secondsAgo - a.s) / (b.s - a.s)) * NODES;
    const n = Math.floor(x);
    const f = x - n;
    const seg = segs[i];
    const v = n >= NODES ? seg[NODES] : seg[n] + (seg[n + 1] - seg[n]) * f;
    return Math.exp(v);
  }
  return null;
}

/** How far back a window opens for this row, in seconds: its span, or
 *  the coin's life when the window is since launch. */
export function windowStartSeconds(row: TrendingRow, w: Window): number {
  return row.windows[w].sinceLaunch ? row.ageMinutes * 60 : WINDOW_SECONDS[w];
}

/** A sparkline that agrees with its row.
 *
 *  `points` are prices, oldest first, spanning the drawn part of the
 *  window. `startFrac` is where the drawn part begins across the
 *  window's width: 0 normally, later for a since-launch window, so
 *  nothing is drawn before the coin existed. The first point is the
 *  window's open and the last is the price, so `up` is the sign of the
 *  window's change as printed and the line cannot disagree with the %
 *  beside it: true for a gain, false for a loss, and null when the
 *  change prints as "0.0%" (colour it neutral) or there is none. With
 *  no change at all `points` is empty too: draw a dim flat hairline or
 *  nothing. */
export type Spark = {
  points: number[];
  startFrac: number;
  up: boolean | null;
  open: number | null;
  last: number;
};

/** A spark's direction from its window's change, as pct() prints it. */
export function sparkUp(change: number): boolean | null {
  return roundsToZero(change) ? null : change > 0;
}

export function sparkFor(row: TrendingRow, w: Window, n = 48): Spark {
  const f = row.windows[w];
  if (f.change === null) {
    return { points: [], startFrac: 0, up: null, open: null, last: row.priceUsd };
  }
  const start = windowStartSeconds(row, w);
  const points: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = basePriceAt(row, start * (1 - i / (n - 1)));
    points.push(p ?? row.priceUsd);
  }
  return {
    points,
    startFrac: f.sinceLaunch ? Math.max(0, 1 - start / WINDOW_SECONDS[w]) : 0,
    up: sparkUp(f.change),
    open: points[0],
    last: points[points.length - 1],
  };
}

/** An SVG path for a spark in a `width` × `height` box, `pad` pixels in
 *  from top and bottom. Scaled to its own range, like every sparkline:
 *  the shape is the reading, not the height. Empty string when there is
 *  nothing to draw. */
export function sparkPath(spark: Pick<Spark, "points" | "startFrac">, width: number, height: number, pad = 1): string {
  const pts = spark.points;
  if (pts.length < 2) return "";
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pts) {
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  }
  const span = hi - lo;
  const x0 = spark.startFrac * width;
  const dx = (width - x0) / (pts.length - 1);
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const y = span === 0 ? height / 2 : pad + (1 - (pts[i] - lo) / span) * (height - 2 * pad);
    d += `${i === 0 ? "M" : "L"}${(x0 + i * dx).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/* ============================================================ Ranking */

/** What a ranking or filter reads. The pure default reads the fixture;
 *  lib/trending-live passes one that reads the simulated values, so the
 *  board re-ranks on the same rules the rule sentence states. */
export type Metric = "txns" | "volume" | "mc" | "liquidity" | "change";
export type Reader = (row: TrendingRow, w: Window, m: Metric) => number | null;

export const baseReader: Reader = (row, w, m) => {
  switch (m) {
    case "mc":
      return row.mcUsd;
    case "liquidity":
      return row.liquidityUsd;
    default:
      return row.windows[w][m];
  }
};

/** Descending, unknown last. */
function desc(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/** Pure sort; never mutates. Unknown figures sort last, ties break on
 *  the ticker so the order is stable across renders.
 *
 *  - trending: window trades, then window volume. Activity is the rank.
 *  - top: market cap.
 *  - new: youngest first.
 *  - final: unmigrated at curve ≥ 70, highest first. Gated: empty while
 *    CURVE_FROM_MCAP is false.
 *  - z500: scored seats by score, then unscored seats by seat number.
 *    Fortress and Diamond seats aren't scored week to week, so ranking
 *    them among scored seats by their fixture score would rank by a
 *    number the rule on the same screen says doesn't count.
 *  - starred: the viewer's starred tickers, in trending order.
 *
 *  Boosts never enter any of these. */
/** How the trending tab ranks.
 *
 *  - "trades": window trades, the rule the first five versions use.
 *  - "turnover": window trades per dollar of market cap, among the
 *    busier half of the board by trades; the quieter half follows by
 *    trades.
 *
 *  Turnover exists because on raw trades the top of the board is the
 *  Z500. The fixtures scale every figure with market cap and seats go
 *  to the largest coins, so ranking by activity alone put a seat on 9
 *  or 10 of the top 10 rows in every window. A trending board is meant
 *  to surface what is busy for its size, which is mostly coins that
 *  are not yet seated: turnover brings that to 3 or 4 of 10. The
 *  busier-half floor keeps a $5K coin with three trades from topping
 *  the board on a ratio. The half is taken over the rows passed in,
 *  so it is the busier half of what the filter left, and a version
 *  using this rule prints RANK_RULE.turnover, which says all of this. */
export type TrendingRule = "trades" | "turnover";

export function rank(
  rows: readonly TrendingRow[],
  tab: Tab,
  w: Window,
  opts: { starred?: readonly string[]; read?: Reader; rule?: TrendingRule } = {},
): TrendingRow[] {
  const read = opts.read ?? baseReader;
  const byTicker = (a: TrendingRow, b: TrendingRow) => a.ticker.localeCompare(b.ticker);
  const byTrades = (a: TrendingRow, b: TrendingRow) =>
    desc(read(a, w, "txns"), read(b, w, "txns")) ||
    desc(read(a, w, "volume"), read(b, w, "volume")) ||
    byTicker(a, b);

  switch (tab) {
    case "trending": {
      const byActivity = [...rows].sort(byTrades);
      if (opts.rule !== "turnover") return byActivity;
      const known = byActivity.filter((r) => read(r, w, "txns") !== null && (read(r, w, "mc") ?? 0) > 0);
      const busier = known.slice(0, Math.ceil(known.length / 2));
      const inBusier = new Set(busier.map((r) => r.ticker));
      const turnover = (r: TrendingRow) => read(r, w, "txns")! / read(r, w, "mc")!;
      busier.sort((a, b) => turnover(b) - turnover(a) || byTrades(a, b));
      return [...busier, ...byActivity.filter((r) => !inBusier.has(r.ticker))];
    }
    case "top":
      return [...rows].sort((a, b) => desc(read(a, w, "mc"), read(b, w, "mc")) || byTicker(a, b));
    case "new":
      return [...rows].sort((a, b) => a.ageMinutes - b.ageMinutes || byTicker(a, b));
    case "final":
      if (!CURVE_FROM_MCAP) return [];
      return rows
        .filter((r) => !r.migrated && r.curve >= 70)
        .sort((a, b) => b.curve - a.curve || byTicker(a, b));
    case "z500": {
      const seated = rows.filter((r) => r.seat);
      const scored = seated
        .filter((r) => r.seat!.scored)
        .sort((a, b) => b.seat!.score - a.seat!.score || a.seat!.seatNo - b.seat!.seatNo);
      const unscored = seated.filter((r) => !r.seat!.scored).sort((a, b) => a.seat!.seatNo - b.seat!.seatNo);
      return [...scored, ...unscored];
    }
    case "starred": {
      const set = new Set(opts.starred ?? []);
      return rows.filter((r) => set.has(r.ticker)).sort(byTrades);
    }
  }
}

/** What each tab ranks by, as a single figure per row: the value
 *  useLiveOrder reports beside its order, for a poster numeral or a tile
 *  area that must come from the same moment as the order. "score" is
 *  null for an unscored seat. Trending and starred break ties on
 *  volume, which this doesn't carry. */
export type RankMetric = "txns" | "mc" | "age" | "score" | "curve";
export const RANK_METRIC: Record<Tab, RankMetric> = {
  trending: "txns",
  starred: "txns",
  top: "mc",
  new: "age",
  z500: "score",
  final: "curve",
};

/* ============================================================== Bands */

/** The fixed edges tints are drawn at, so no version invents its own
 *  and a legend can print them. Each is read on the figure as printed
 *  (a change at pct()'s one decimal, a buy share at whole percent), so a
 *  cell's tint never disagrees with its text at an edge. */

/** Signed-heat edges on |change|, in percent: under 1 no tint, then
 *  1–5, 5–20, 20–50, 50 and over. */
export const HEAT_EDGES = [1, 5, 20, 50] as const;

/** 0 (untinted) to 4 for a change in percent; null when there is none.
 *  The sign is the cell's data-sign, not part of the band. */
export function heatBand(change: number | null): 0 | 1 | 2 | 3 | 4 | null {
  if (change === null || !Number.isFinite(change)) return null;
  const a = Number(Math.abs(change).toFixed(1));
  let b = 0;
  for (const e of HEAT_EDGES) if (a >= e) b++;
  return b as 0 | 1 | 2 | 3 | 4;
}

/** Buy share edges, in percent: over 55 leans buy, under 45 leans sell. */
export const BUY_SHARE_EDGES = { sell: 45, buy: 55 } as const;

/** Which way a window's buy share (buyRatio, 0 to 1) leans. */
export function buyShareSide(ratio: number | null): "buy" | "sell" | "even" | null {
  if (ratio === null || !Number.isFinite(ratio)) return null;
  const p = Math.round(ratio * 100);
  return p > BUY_SHARE_EDGES.buy ? "buy" : p < BUY_SHARE_EDGES.sell ? "sell" : "even";
}

/** Risk bands for the audit figures, warn and bad, in percent. On the
 *  fixtures nothing reaches bad (critique C.10), so a version that draws
 *  the bad step says so rather than implying the board was checked. */
export const AUDIT_BANDS = {
  top10: { warn: 25, bad: 45 },
  dev: { warn: 2, bad: 8 },
  snipers: { warn: 3, bad: 10 },
  bundlers: { warn: 3, bad: 10 },
} as const;

export function auditBand(kind: keyof typeof AUDIT_BANDS, pct: number | null): "ok" | "warn" | "bad" | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  const v = Number(pct.toFixed(1));
  const b = AUDIT_BANDS[kind];
  return v >= b.bad ? "bad" : v >= b.warn ? "warn" : "ok";
}

/* ============================================================ Filters */

export type Stage = "all" | "curve" | "migrated";

/** The committed filter. Every field optional: absent or null means
 *  "no limit". A limit on a figure a row doesn't have (T's liquidity, a
 *  hidden top-10) excludes the row, because the page can't claim an
 *  unknown figure passes. */
export type TrendingFilter = {
  /** Ticker or name substring, or a mint (whole, or a prefix of 6+). */
  search?: string;
  mcMin?: number | null;
  mcMax?: number | null;
  /** Volume in the selected window. */
  volMin?: number | null;
  liqMin?: number | null;
  /** Percent, 0 to 100. */
  top10Max?: number | null;
  devMax?: number | null;
  /** "$TICKER" or "TICKER" hides that ticker exactly; any other entry of
   *  three or more characters hides coins whose name or ticker contains
   *  it. A viewer preference, kept in localStorage by the version. */
  blacklist?: readonly string[];
  /** Empty or absent means every tier. */
  tiers?: readonly Tier[];
  stage?: Stage;
};

export const EMPTY_FILTER: TrendingFilter = Object.freeze({});

function blacklisted(row: TrendingRow, list: readonly string[]) {
  const t = row.ticker.toLowerCase();
  const n = row.name.toLowerCase();
  for (const raw of list) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    const bare = e.replace(/^\$/, "");
    if (bare === t || bare === n) return true;
    // Exact-only for short entries: "t" as a keyword would hide half
    // the roster, which nobody typing it meant.
    if (!e.startsWith("$") && e.length >= 3 && (n.includes(e) || t.includes(e))) return true;
  }
  return false;
}

function matches(row: TrendingRow, q: string) {
  const s = q.trim().replace(/^\$/, "").toLowerCase();
  if (!s) return true;
  if (row.ticker.toLowerCase().includes(s) || row.name.toLowerCase().includes(s)) return true;
  const m = row.mint.toLowerCase();
  return m === s || (s.length >= 6 && m.startsWith(s));
}

export function applyFilter(
  rows: readonly TrendingRow[],
  f: TrendingFilter,
  w: Window,
  read: Reader = baseReader,
): TrendingRow[] {
  const has = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);
  return rows.filter((r) => {
    if (f.search && !matches(r, f.search)) return false;
    if (f.blacklist?.length && blacklisted(r, f.blacklist)) return false;
    if (f.tiers?.length && !f.tiers.includes(r.tier)) return false;
    if (f.stage === "curve" && r.migrated) return false;
    if (f.stage === "migrated" && !r.migrated) return false;
    const mc = read(r, w, "mc");
    if (has(f.mcMin) && !(mc !== null && mc >= f.mcMin)) return false;
    if (has(f.mcMax) && !(mc !== null && mc <= f.mcMax)) return false;
    const vol = read(r, w, "volume");
    if (has(f.volMin) && !(vol !== null && vol >= f.volMin)) return false;
    const liq = read(r, w, "liquidity");
    if (has(f.liqMin) && !(liq !== null && liq >= f.liqMin)) return false;
    if (has(f.top10Max) && !(r.top10Pct !== null && r.top10Pct <= f.top10Max)) return false;
    if (has(f.devMax) && !(r.devPct !== null && r.devPct <= f.devMax)) return false;
    return true;
  });
}

/** How many limits a filter sets, for a "Filters · 3" label. */
export function activeFilterCount(f: TrendingFilter): number {
  let n = 0;
  for (const k of ["mcMin", "mcMax", "volMin", "liqMin", "top10Max", "devMax"] as const) {
    if (f[k] !== null && f[k] !== undefined) n++;
  }
  if (f.search?.trim()) n++;
  if (f.blacklist?.length) n++;
  if (f.tiers?.length) n++;
  if (f.stage && f.stage !== "all") n++;
  return n;
}

/** The editable copy of a filter. Min/max fields publish, so they are
 *  edited as strings and committed on Apply: bound live, a half-typed
 *  "2" would briefly be a real $2 floor and empty the board. */
export type FilterDraft = {
  search: string;
  mcMin: string;
  mcMax: string;
  volMin: string;
  liqMin: string;
  top10Max: string;
  devMax: string;
  /** Comma or whitespace separated. */
  blacklist: string;
  tiers: Tier[];
  stage: Stage;
};

const AMOUNT_FIELDS = ["mcMin", "mcMax", "volMin", "liqMin"] as const;
const PCT_FIELDS = ["top10Max", "devMax"] as const;

/** "20k" → 20000, "1.5m" → 1500000, "$250K" → 250000, "" → null.
 *  NaN for anything that isn't an amount, so a draft can say which
 *  field is wrong rather than silently dropping it. */
export function parseAmount(s: string): number | null {
  const t = s.trim().replace(/[$,\s]/g, "").toLowerCase();
  if (!t) return null;
  const m = /^(\d+(?:\.\d+)?|\.\d+)([kmb]?)$/.exec(t);
  if (!m) return NaN;
  const mult = m[2] === "b" ? 1e9 : m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1;
  return Number(m[1]) * mult;
}

function draftAmount(n: number | null | undefined) {
  if (n === null || n === undefined) return "";
  if (n >= 1e6 && n % 1e5 === 0) return `${n / 1e6}m`;
  if (n >= 1e3 && n % 100 === 0) return `${n / 1e3}k`;
  return String(n);
}

export function draftOf(f: TrendingFilter): FilterDraft {
  return {
    search: f.search ?? "",
    mcMin: draftAmount(f.mcMin),
    mcMax: draftAmount(f.mcMax),
    volMin: draftAmount(f.volMin),
    liqMin: draftAmount(f.liqMin),
    top10Max: f.top10Max === null || f.top10Max === undefined ? "" : String(f.top10Max),
    devMax: f.devMax === null || f.devMax === undefined ? "" : String(f.devMax),
    blacklist: (f.blacklist ?? []).join(", "),
    tiers: [...(f.tiers ?? [])],
    stage: f.stage ?? "all",
  };
}

/** Draft to filter. `errors` names each field that didn't parse, or an
 *  inverted cap range; the filter keeps that field's (or that pair's)
 *  previous committed value when `prev` is given, and drops it
 *  otherwise, so the returned filter is always safe to apply. */
export function commitDraft(
  d: FilterDraft,
  prev: TrendingFilter = EMPTY_FILTER,
): { filter: TrendingFilter; errors: Partial<Record<keyof FilterDraft, string>> } {
  const errors: Partial<Record<keyof FilterDraft, string>> = {};
  const out: TrendingFilter = {
    search: d.search.trim() || undefined,
    blacklist: d.blacklist
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    tiers: d.tiers.length ? [...d.tiers] : undefined,
    stage: d.stage === "all" ? undefined : d.stage,
  };
  for (const k of AMOUNT_FIELDS) {
    const v = parseAmount(d[k]);
    if (Number.isNaN(v)) {
      errors[k] = "Not an amount";
      out[k] = prev[k] ?? null;
    } else out[k] = v;
  }
  for (const k of PCT_FIELDS) {
    const v = parseAmount(d[k].replace(/%$/, ""));
    if (Number.isNaN(v) || (v !== null && v > 100)) {
      errors[k] = "Not a percentage";
      out[k] = prev[k] ?? null;
    } else out[k] = v;
  }
  // An inverted range would empty the board, so like an unparseable
  // field it keeps the last committed pair rather than applying.
  if (out.mcMin != null && out.mcMax != null && out.mcMin > out.mcMax) {
    errors.mcMax = "Below the minimum";
    out.mcMin = prev.mcMin ?? null;
    out.mcMax = prev.mcMax ?? null;
  }
  if (!out.blacklist?.length) delete out.blacklist;
  return { filter: out, errors };
}

/* ======================================================= Native units */

/** Quick-buy sizes in the network's own unit. The only place SOL vs ETH
 *  is decided for this page.
 *
 *  Network 2 used to reuse the SOL sizes as ETH, which made the smallest
 *  quick buy $216. These follow the boost ladder's own rounding
 *  (BOOST_TIERS), so the ladder costs about the same on either network.
 *  toUsd prices at the SPOT fixture, so any dollar figure it produces is
 *  printed with LABELS.USD_EQ ("at demo spot"). */
export function quickBuy(chain: ChainId): {
  unit: "SOL" | "ETH";
  presets: readonly number[];
  spotUsd: number;
  toUsd(n: number): number;
} {
  const unit = chain === 2 ? "ETH" : "SOL";
  const spot = SPOT.find((s) => s.k === unit)!.usd;
  return {
    unit,
    presets: chain === 2 ? [0.002, 0.005, 0.02] : [0.05, 0.1, 0.5],
    spotUsd: spot,
    toUsd: (n) => n * spot,
  };
}

/** The spot strip: the network's native asset and $ANSEM. No BTC or
 *  BNB: they aren't fixtures, and adding one would be a new invented
 *  price. Label the strip LABELS.SPOT_TAG. */
export function spotStrip(chain: ChainId): { k: string; usd: number; d: number }[] {
  const native = chain === 2 ? "ETH" : "SOL";
  return SPOT.filter((s) => s.k === native || s.k === "ANSEM").map((s) => ({ k: s.k, usd: s.usd, d: s.d }));
}
