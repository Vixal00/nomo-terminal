"use client";

/**
 * The simulated market behind the Trending page.
 *
 * There is no feed. What moves on the board is produced here, in this
 * browser, from the fixture's own rates, and the page says so wherever
 * it moves (LABELS.DISCLOSURE, the SIM toggle). What this module
 * guarantees is that the movement is at least consistent with itself:
 *
 * - Trades arrive at the rate the coin's 5m window implies, with the
 *   window's own buy share and trade sizes, so a busy coin is busy and a
 *   quiet one is quiet. The flash that used to fire on a random row with
 *   no figure changing is gone: a cell flashes only when its text does.
 * - Price moves with the trades, against the coin's own pool, and every
 *   window's change is read off one price path: the fixture path
 *   (lib/trending.ts basePriceAt) before the page opened, the session's
 *   own after. The change column, the sparkline and the price agree.
 * - Windows stay nested and don't grow forever: each window's fixture
 *   figure drains as the window slides and the session's fills refill it.
 * - T, the real launch, never ticks. Holders never tick either: a fixture
 *   count moving here would contradict the trade rail.
 * - An unmigrated Fortress cap stays at or under $999K. The sim has no
 *   graduation event, and a Fortress coin past its graduation cap still
 *   on the curve is the contradiction D7 exists to remove. The cap is
 *   held on market cap, per coin: the roster's caps aren't exactly price
 *   × 1B, so a cap on price alone let DRIFT1 print "$1M" at 99%. $999K
 *   is also far enough under $999.5K that no formatter rounds it up.
 *   A trusted Fortress curve moves with that cap (the "curve" cell).
 * - No arrivals. Whether synthetic launches may land on New is an open
 *   owner decision, so nothing lands.
 *
 * Cost. One setTimeout drives everything, committing about once a second
 * at an irregular interval (a tape that ticks on the beat reads as an
 * animation). A commit touches only subscribers: useLiveCell writes its
 * own node's text and flashes it with element.animate, with no React
 * render at all, and useLiveOrder re-ranks every few seconds at most.
 * Nothing runs while the tab is hidden, or while every board that asked
 * is off screen, and the status says which. Nothing runs on the server
 * either: the sim starts in an effect, so the server render and the
 * hydration render both read the fixture and cannot disagree. The generator is seeded, not Math.random,
 * so a session replays the same way on every load.
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import {
  WINDOWS,
  WINDOW_SECONDS,
  EMPTY_FILTER,
  RANK_METRIC,
  applyFilter,
  basePriceAt,
  curveAt,
  rank,
  sparkFor,
  sparkPath,
  sparkUp,
  trendingRows,
  type Metric,
  type Reader,
  type Spark,
  type Tab,
  type TrendingRule,
  type TrendingFilter,
  type TrendingRow,
  type Window,
} from "./trending";
import { FORTRESS } from "./spec";
import { splitSuffix } from "./format";

/* =============================================================== Types */

export type Cell =
  | "price"
  | "mc"
  | "liquidity"
  | "age"
  | "change"
  | "volume"
  | "txns"
  | "buys"
  | "sells"
  | "buyVol"
  | "sellVol"
  | "buyers"
  | "sellers"
  | "buyRatio"
  | "netFlow"
  | "avgTrade"
  /** 0 to 100. Moves with the simulated cap where the curve is trusted
   *  (Fortress, and everything once CURVE_FROM_MCAP is on); an untrusted
   *  curve is a roster fixture and stays put. lib/trending curveAt. */
  | "curve";

/** 'stopped' is the tab hidden, 'offscreen' every board that asked
 *  (useBoardInView) scrolled out of view. Print LABELS.SIM_STATES. */
export type SimStatus = "sim" | "paused" | "stopped" | "offscreen";

/** What the last commit did to one coin. For a row-level cue on a large
 *  fill, not for a flash on every trade: the busiest coin trades several
 *  times a second and a flash per trade would strobe. */
export type Step = { at: number; buys: number; sells: number; buyVol: number; sellVol: number; big: boolean };

export interface MarketSim {
  readonly rows: readonly TrendingRow[];
  row(ticker: string): TrendingRow | undefined;
  /** useSyncExternalStore contract; fires once per commit. */
  subscribe(fn: () => void): () => void;
  /** Bumps once per commit. */
  version(): number;
  /** The simulated figure (fixture before the first commit). */
  value(ticker: string, w: Window, cell: Cell): number | null;
  /** A Reader for rank() and applyFilter() that reads simulated figures. */
  read: Reader;
  /** Price `msAgo` before now, on the one path: session samples, then
   *  the fixture path. Null beyond the path's oldest anchor. */
  priceAt(ticker: string, msAgo: number): number | null;
  /** The window's sparkline, cut from that path, ending on the price. */
  spark(ticker: string, w: Window, n?: number): Spark;
  /** Whether the window currently covers the coin's whole life. */
  sinceLaunch(ticker: string, w: Window): boolean;
  lastStep(ticker: string): Step | null;
  /** Simulated milliseconds since the page opened. Stops while paused. */
  elapsed(): number;
  status(): SimStatus;
  subscribeStatus(fn: () => void): () => void;
  paused(): boolean;
  setPaused(p: boolean): void;
  /** Called by MarketSimProvider. */
  start(): void;
  stop(): void;
  /** Called by useBoardInView. */
  setBoardVisible(id: string, visible: boolean | null): void;
}

/* =========================================================== Randomness */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

function gauss(r: Rand) {
  const u = 1 - r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

function poisson(r: Rand, mean: number) {
  if (mean <= 0) return 0;
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gauss(r)));
  const L = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L);
  return k - 1;
}

function binomial(r: Rand, n: number, p: number) {
  if (n <= 0) return 0;
  if (n > 40) {
    const m = n * p;
    return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(m * (1 - p)) * gauss(r))));
  }
  let k = 0;
  for (let i = 0; i < n; i++) if (r() < p) k++;
  return k;
}

/** Summed trade sizes, log-normal around `mean`. Per trade when few,
 *  as a normal sum when many. */
const SIZE_SIGMA = 0.9;
function sizes(r: Rand, n: number, mean: number): { sum: number; max: number } {
  if (n <= 0 || mean <= 0) return { sum: 0, max: 0 };
  const mu = -(SIZE_SIGMA * SIZE_SIGMA) / 2;
  if (n <= 40) {
    let sum = 0;
    let max = 0;
    for (let i = 0; i < n; i++) {
      const s = mean * Math.exp(mu + SIZE_SIGMA * gauss(r));
      sum += s;
      if (s > max) max = s;
    }
    return { sum, max };
  }
  const sd = mean * Math.sqrt(Math.exp(SIZE_SIGMA * SIZE_SIGMA) - 1);
  return { sum: Math.max(0, n * mean + Math.sqrt(n) * sd * gauss(r)), max: mean * 3 };
}

/* ========================================================= Accumulators */

type Acc = { buys: number; sells: number; buyVol: number; sellVol: number; buyers: number; sellers: number };
type Bucket = Acc & { t: number };
const ACC_KEYS = ["buys", "sells", "buyVol", "sellVol", "buyers", "sellers"] as const;
const zero = (): Acc => ({ buys: 0, sells: 0, buyVol: 0, sellVol: 0, buyers: 0, sellers: 0 });

/** The session's fills inside one window, as a queue of buckets.
 *
 *  Buckets are coarser for the longer windows (10s for 1h, a minute for
 *  6h and 24h) so a long session holds a few thousand small objects
 *  rather than one per commit per coin per window. A bucket leaves the
 *  window whole, so a window can over-count by at most one bucket. */
class WindowAcc {
  readonly sum: Acc = zero();
  private queue: Bucket[] = [];
  private head = 0;
  private open: Bucket | null = null;
  constructor(
    readonly span: number,
    readonly grain: number,
  ) {}

  add(t: number, a: Acc) {
    if (!this.open || t - this.open.t >= this.grain) {
      if (this.open) this.queue.push(this.open);
      this.open = { t, ...zero() };
    }
    for (const k of ACC_KEYS) {
      this.open[k] += a[k];
      this.sum[k] += a[k];
    }
  }

  expire(now: number) {
    const edge = now - this.span;
    while (this.head < this.queue.length && this.queue[this.head].t + this.grain <= edge) {
      const b = this.queue[this.head++];
      for (const k of ACC_KEYS) this.sum[k] -= b[k];
    }
    if (this.open && this.open.t + this.grain <= edge && this.head >= this.queue.length) {
      for (const k of ACC_KEYS) this.sum[k] -= this.open[k];
      this.open = null;
    }
    if (this.head > 256) {
      this.queue = this.queue.slice(this.head);
      this.head = 0;
    }
  }
}

const GRAIN: Record<Window, number> = { "5m": 0, "1h": 10_000, "6h": 60_000, "24h": 60_000 };

/* ============================================================== Coins */

type Sample = { t: number; p: number };

type CoinSim = {
  row: TrendingRow;
  p0: number;
  p: number;
  cap: number;
  lambda: number;
  buyP: number;
  buySize: number;
  sellSize: number;
  buyerP: number;
  sellerP: number;
  /** Expected (buyVol − sellVol) per second, so price moves on the
   *  surprise in the flow rather than drifting one way forever. */
  flowBias: number;
  acc: Record<Window, WindowAcc>;
  fine: Sample[];
  coarse: Sample[];
  last: Step | null;
};

const EMPTY_SPARK: Spark = { points: [], startFrac: 0, up: null, open: null, last: 0 };

const FINE_KEEP = 10 * 60_000;
const COARSE_EVERY = 60_000;
const COARSE_KEEP = 24 * 3_600_000;
const FORTRESS_MC_CAP = FORTRESS.graduateMcapUsd - 1_000;

function coinSim(row: TrendingRow): CoinSim {
  const w5 = row.windows["5m"];
  const w24 = row.windows["24h"];
  const txns = w5.txns ?? 0;
  const buys = w5.buys ?? 0;
  const sells = w5.sells ?? 0;
  const avg = w5.avgTrade ?? 1;
  const acc = {} as Record<Window, WindowAcc>;
  for (const k of WINDOWS) acc[k] = new WindowAcc(WINDOW_SECONDS[k] * 1000, GRAIN[k]);
  return {
    row,
    p0: row.priceUsd,
    p: row.priceUsd,
    // The price at which this coin's simulated cap (mcUsd × p/p0) reaches
    // $999K. Per coin, because mcUsd / (price × 1e9) runs 0.998 to 1.004
    // across the roster's Fortress coins.
    cap: row.tier === "Fortress" && !row.migrated ? (row.priceUsd * FORTRESS_MC_CAP) / row.mcUsd : Infinity,
    lambda: txns / 300,
    buyP: txns ? buys / txns : 0.5,
    buySize: buys ? (w5.buyVol ?? 0) / buys : avg,
    sellSize: sells ? (w5.sellVol ?? 0) / sells : avg,
    buyerP: w24.buys ? Math.min(1, (w24.buyers ?? 0) / w24.buys) : 0.6,
    sellerP: w24.sells ? Math.min(1, (w24.sellers ?? 0) / w24.sells) : 0.6,
    flowBias: ((w5.buyVol ?? 0) - (w5.sellVol ?? 0)) / 300,
    acc,
    fine: [{ t: 0, p: row.priceUsd }],
    coarse: [{ t: 0, p: row.priceUsd }],
    last: null,
  };
}

/** The last sample at or before t, interpolated toward the next. */
function sampleAt(list: Sample[], t: number): number | null {
  if (!list.length || t < list[0].t) return null;
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (list[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = list[lo];
  const b = list[lo + 1];
  if (!b) return a.p;
  return a.p + ((b.p - a.p) * (t - a.t)) / (b.t - a.t);
}

/* ========================================================== The market */

type Figures = Record<Cell, number | null>;

export function createMarketSim(
  rows: readonly TrendingRow[] = trendingRows(),
  opts: { commitMs?: number; seed?: number } = {},
): MarketSim {
  const commitMs = opts.commitMs ?? 1000;
  const rand = mulberry32(opts.seed ?? 0x5eed_7e4d);
  const coins = new Map<string, CoinSim>();
  for (const r of rows) if (!r.real) coins.set(r.ticker, coinSim(r));
  const byTicker = new Map(rows.map((r) => [r.ticker, r]));

  const listeners = new Set<() => void>();
  const statusListeners = new Set<() => void>();
  let ver = 0;
  let elapsed = 0;
  let started = false;
  let userPaused = false;
  let hidden = false;
  let reduced = false;
  const boards = new Map<string, boolean>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWall = 0;
  let statusNow: SimStatus = "sim";
  const cache = new Map<string, { ver: number; f: Figures }>();
  const sparkCache = new Map<string, { ver: number; s: Spark }>();

  const offscreen = () => boards.size > 0 && ![...boards.values()].some(Boolean);
  const running = () => started && !userPaused && !hidden && !offscreen();

  function setStatus() {
    const next: SimStatus = userPaused ? "paused" : hidden ? "stopped" : started && offscreen() ? "offscreen" : "sim";
    if (next !== statusNow) {
      statusNow = next;
      statusListeners.forEach((f) => f());
    }
  }

  /* ------------------------------------------------------------- step */
  function step(c: CoinSim, dt: number, t: number) {
    const n = poisson(rand, c.lambda * dt);
    const nb = binomial(rand, n, c.buyP);
    const ns = n - nb;
    const b = sizes(rand, nb, c.buySize);
    const s = sizes(rand, ns, c.sellSize);
    const a: Acc = {
      buys: nb,
      sells: ns,
      buyVol: b.sum,
      sellVol: s.sum,
      buyers: binomial(rand, nb, c.buyerP),
      sellers: binomial(rand, ns, c.sellerP),
    };
    for (const k of WINDOWS) {
      if (n) c.acc[k].add(t, a);
      c.acc[k].expire(t);
    }
    /* Constant product with a quote reserve of half the pool: a trade of
       size s moves price by about 4s/L. On the surprise in the flow only,
       so a coin whose fixture leans to buys doesn't climb all session. */
    const liq = liquidityOf(c);
    if (liq && n) {
      const surprise = b.sum - s.sum - c.flowBias * dt;
      const limit = Math.min(0.25, 0.03 * Math.sqrt(Math.max(1, dt)));
      const move = Math.max(-limit, Math.min(limit, (4 * surprise) / liq));
      c.p = Math.min(c.cap, c.p * Math.exp(move));
    }
    c.fine.push({ t, p: c.p });
    while (c.fine.length > 2 && c.fine[1].t < t - FINE_KEEP) c.fine.shift();
    const lastCoarse = c.coarse[c.coarse.length - 1];
    if (t - lastCoarse.t >= COARSE_EVERY) {
      c.coarse.push({ t, p: c.p });
      while (c.coarse.length > 2 && c.coarse[1].t < t - COARSE_KEEP) c.coarse.shift();
    }
    const avg = (b.sum + s.sum) / Math.max(1, n);
    c.last = {
      at: t,
      buys: nb,
      sells: ns,
      buyVol: b.sum,
      sellVol: s.sum,
      big: n > 0 && Math.max(b.max, s.max) > 8 * Math.max(avg, c.buySize, c.sellSize),
    };
  }

  /** Advance the market by dt seconds. A long gap (a hidden tab coming
   *  back) is walked in steps so each window gets the fills that fall
   *  inside it, not the whole gap in its newest bucket: minute steps for
   *  the last hour, which the 5m and 1h windows see at that grain, and
   *  at most 120 coarser steps before it, which only the 6h and 24h
   *  windows see. A day away walked a minute at a time was 1,440 steps
   *  over 77 coins in one task, about 200ms of jank on return. Listeners
   *  hear once, at the end. */
  function advance(dtSec: number) {
    const total = Math.min(dtSec, 24 * 3600);
    const fine = total > 5 ? 60 : total;
    const recent = Math.min(total, 3600);
    const coarse = Math.max(fine, (total - recent) / 120);
    let left = total;
    while (left > 1e-6) {
      const d = Math.min(left > recent ? Math.min(coarse, left - recent) : fine, left);
      elapsed += d * 1000;
      for (const c of coins.values()) step(c, d, elapsed);
      left -= d;
    }
    ver++;
    listeners.forEach((f) => f());
  }

  function schedule() {
    if (timer !== null || !running()) return;
    const base = reduced ? 5000 : commitMs;
    const delay = base * (0.8 + rand() * 0.4);
    timer = setTimeout(tick, delay);
  }

  function tick() {
    timer = null;
    if (!running()) return;
    const now = performance.now();
    const dt = (now - lastWall) / 1000;
    lastWall = now;
    advance(dt);
    schedule();
  }

  function halt() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  /** Resume after a hidden or off-screen stretch: the market kept going,
   *  so the gap is advanced in one go (no replay, no flash storm: cells
   *  flash only on the commit that follows). A user pause is different:
   *  time stops with it, so nothing is caught up. */
  function resume(catchUp: boolean) {
    if (!running()) return;
    const now = performance.now();
    if (catchUp && lastWall) advance((now - lastWall) / 1000);
    lastWall = now;
    schedule();
  }

  /* ------------------------------------------------------------ reads */
  function liquidityOf(c: CoinSim) {
    const l0 = c.row.liquidityUsd;
    return l0 === null ? null : l0 * Math.sqrt(c.p / c.p0);
  }

  function sinceLaunchNow(row: TrendingRow, w: Window) {
    return row.ageMinutes * 60_000 + elapsed <= WINDOW_SECONDS[w] * 1000;
  }

  function priceAtRow(row: TrendingRow, msAgo: number): number | null {
    const c = coins.get(row.ticker);
    if (!c) return basePriceAt(row, msAgo / 1000);
    const t = elapsed - msAgo;
    if (t >= 0) {
      const inFine = c.fine[0].t <= t ? sampleAt(c.fine, t) : null;
      return inFine ?? sampleAt(c.coarse, t) ?? c.p0;
    }
    return basePriceAt(row, -t / 1000);
  }

  function figures(ticker: string, w: Window): Figures | null {
    const row = byTicker.get(ticker);
    if (!row) return null;
    const key = `${ticker}|${w}`;
    const hit = cache.get(key);
    if (hit && hit.ver === ver) return hit.f;
    const base = row.windows[w];
    const c = coins.get(ticker);
    let f: Figures;
    if (!c || elapsed === 0) {
      f = {
        price: row.priceUsd,
        mc: row.mcUsd,
        curve: row.curve,
        liquidity: row.liquidityUsd,
        age: row.ageMinutes,
        change: base.change,
        volume: base.volume,
        txns: base.txns,
        buys: base.buys,
        sells: base.sells,
        buyVol: base.buyVol,
        sellVol: base.sellVol,
        buyers: base.buyers,
        sellers: base.sellers,
        buyRatio: base.buyRatio,
        netFlow: base.netFlow,
        avgTrade: base.avgTrade,
      };
    } else {
      const span = WINDOW_SECONDS[w] * 1000;
      const life = row.ageMinutes * 60_000;
      // A since-launch window loses nothing until the coin outlives it;
      // after that its fixture share drains as the window slides.
      const cross = Math.max(0, span - life);
      const keep = Math.max(0, 1 - Math.max(0, elapsed - cross) / span);
      const s = c.acc[w].sum;
      const count = (b: number | null, add: number) => (b === null ? null : Math.round(b * keep + add));
      const money = (b: number | null, add: number) => (b === null ? null : b * keep + add);
      const buys = count(base.buys, s.buys);
      const sells = count(base.sells, s.sells);
      const buyVol = money(base.buyVol, s.buyVol);
      const sellVol = money(base.sellVol, s.sellVol);
      const txns = buys !== null && sells !== null ? buys + sells : null;
      const volume = buyVol !== null && sellVol !== null ? buyVol + sellVol : null;
      const buyers = count(base.buyers, s.buyers);
      const sellers = count(base.sellers, s.sellers);
      // The window opens at its span ago, or at launch while the coin is
      // younger than the window. Where the path has no price that far
      // back (no d24 on the roster) the change stays unknown.
      const open = priceAtRow(row, sinceLaunchNow(row, w) ? life + elapsed : span);
      const mc = row.mcUsd * (c.p / c.p0);
      f = {
        price: c.p,
        mc,
        curve: curveAt(row, mc),
        liquidity: liquidityOf(c),
        age: row.ageMinutes + elapsed / 60_000,
        change: open === null ? null : (c.p / open - 1) * 100,
        volume,
        txns,
        buys,
        sells,
        buyVol,
        sellVol,
        buyers: buyers !== null && buys !== null ? Math.min(buyers, buys) : buyers,
        sellers: sellers !== null && sells !== null ? Math.min(sellers, sells) : sellers,
        buyRatio: txns ? (buys as number) / txns : null,
        netFlow: buyVol !== null && sellVol !== null ? buyVol - sellVol : null,
        avgTrade: txns && volume !== null ? volume / txns : null,
      };
    }
    cache.set(key, { ver, f });
    return f;
  }

  const metricCell: Record<Metric, Cell> = {
    txns: "txns",
    volume: "volume",
    mc: "mc",
    liquidity: "liquidity",
    change: "change",
  };

  const sim: MarketSim = {
    rows,
    row: (t) => byTicker.get(t),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    version: () => ver,
    value(ticker, w, cell) {
      return figures(ticker, w)?.[cell] ?? null;
    },
    read: (row, w, m) => figures(row.ticker, w)?.[metricCell[m]] ?? null,
    priceAt(ticker, msAgo) {
      const row = byTicker.get(ticker);
      return row ? priceAtRow(row, msAgo) : null;
    },
    spark(ticker, w, n = 48) {
      const row = byTicker.get(ticker);
      if (!row) return EMPTY_SPARK;
      const key = `${ticker}|${w}|${n}`;
      const hit = sparkCache.get(key);
      if (hit && hit.ver === ver) return hit.s;
      let s: Spark;
      if (!coins.has(ticker) || elapsed === 0) s = sparkFor(row, w, n);
      else {
        const change = figures(ticker, w)!.change;
        const since = sinceLaunchNow(row, w);
        const span = WINDOW_SECONDS[w] * 1000;
        const start = since ? row.ageMinutes * 60_000 + elapsed : span;
        if (change === null) s = { points: [], startFrac: 0, up: null, open: null, last: coins.get(ticker)!.p };
        else {
          const points: number[] = [];
          for (let i = 0; i < n; i++) points.push(priceAtRow(row, start * (1 - i / (n - 1))) ?? row.priceUsd);
          s = {
            points,
            startFrac: since ? Math.max(0, 1 - start / span) : 0,
            up: sparkUp(change),
            open: points[0],
            last: points[points.length - 1],
          };
        }
      }
      sparkCache.set(key, { ver, s });
      return s;
    },
    sinceLaunch(ticker, w) {
      const row = byTicker.get(ticker);
      return row ? (row.real ? row.windows[w].sinceLaunch : sinceLaunchNow(row, w)) : false;
    },
    lastStep: (t) => coins.get(t)?.last ?? null,
    elapsed: () => elapsed,
    status: () => statusNow,
    subscribeStatus(fn) {
      statusListeners.add(fn);
      return () => statusListeners.delete(fn);
    },
    paused: () => userPaused,
    setPaused(p) {
      if (p === userPaused) return;
      userPaused = p;
      setStatus();
      if (p) halt();
      else {
        // Time stood still while paused, so nothing is caught up.
        lastWall = performance.now();
        resume(false);
      }
    },
    start() {
      if (started) return;
      started = true;
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      hidden = document.visibilityState === "hidden";
      setStatus();
      lastWall = performance.now();
      document.addEventListener("visibilitychange", onVisibility);
      motion = matchMedia("(prefers-reduced-motion: reduce)");
      motion.addEventListener("change", onMotion);
      schedule();
    },
    stop() {
      started = false;
      halt();
      document.removeEventListener("visibilitychange", onVisibility);
      motion?.removeEventListener("change", onMotion);
    },
    setBoardVisible(id, visible) {
      const wasOff = offscreen();
      if (visible === null) boards.delete(id);
      else boards.set(id, visible);
      const isOff = offscreen();
      setStatus();
      if (!wasOff && isOff) halt();
      if (wasOff && !isOff) resume(true);
    },
  };

  let motion: MediaQueryList | null = null;
  function onMotion(e: MediaQueryListEvent) {
    reduced = e.matches;
  }
  function onVisibility() {
    const h = document.visibilityState === "hidden";
    if (h === hidden) return;
    hidden = h;
    setStatus();
    if (h) halt();
    else resume(true);
  }

  return sim;
}

/* ============================================================ Provider */

const SimCtx = createContext<MarketSim | null>(null);

/** One simulated market for the page. Wrap the client screen in it; the
 *  version shells in app/v/<slug>/page.tsx already do. Built on the
 *  server too (it is pure until start()), so hooks read the fixture
 *  during the server render and during hydration. */
export function MarketSimProvider({ children, commitMs }: { children: ReactNode; commitMs?: number }) {
  const [sim] = useState(() => createMarketSim(trendingRows(), { commitMs }));
  useEffect(() => {
    sim.start();
    return () => sim.stop();
  }, [sim]);
  return createElement(SimCtx.Provider, { value: sim }, children);
}

export function useMarketSim(): MarketSim {
  const sim = useContext(SimCtx);
  if (!sim) throw new Error("useMarketSim needs a MarketSimProvider above it.");
  return sim;
}

/* =============================================================== Hooks */

/** 'sim', 'paused' (the reader paused it), 'stopped' (the tab is
 *  hidden) or 'offscreen' (every board that asked is scrolled out of
 *  view). Print LABELS.SIM_STATES[status]. */
export function useSimStatus(): SimStatus {
  const sim = useMarketSim();
  return useSyncExternalStore(sim.subscribeStatus, sim.status, () => "sim" as const);
}

let tintCache: { pos: string; neg: string } | null = null;

/** The flash tints, read from the tokens rather than written as hex, so
 *  a token change reaches the flash. --color-pos and --color-neg don't
 *  move with the network, so one read serves the session. */
function tints() {
  if (tintCache) return tintCache;
  const cs = getComputedStyle(document.documentElement);
  const rgba = (hex: string, a: number) => {
    const h = hex.trim().replace("#", "");
    const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  tintCache = {
    pos: rgba(cs.getPropertyValue("--color-pos") || "#3fe0a8", 0.2),
    neg: rgba(cs.getPropertyValue("--color-neg") || "#ff3b5c", 0.2),
  };
  return tintCache;
}

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type Sign = "pos" | "neg" | "zero" | "null";

/** The sign a reader sees, taken from the printed text rather than the
 *  raw value: a change of 0.02 prints "0.0%", and a cell styled from
 *  `[data-sign="pos"]` would colour that zero as a gain. A text with no
 *  non-zero digit in it is a zero whatever the value underneath. */
export function signOf(v: number | null, text: string): Sign {
  if (v === null || !Number.isFinite(v)) return "null";
  if (!/[1-9]/.test(text)) return "zero";
  return v > 0 ? "pos" : v < 0 ? "neg" : "zero";
}

/** Extra data attributes a live cell keeps current alongside its text,
 *  e.g. `(v) => ({ band: String(heatBand(v)) })` for data-band. Keys are
 *  dataset names: lower case, one word. Return the same keys every time. */
export type LiveAttrs = (v: number | null) => Record<string, string>;

function dataProps(sign: Sign, attrs: Record<string, string>): Record<`data-${string}`, string> {
  const out: Record<`data-${string}`, string> = { "data-sign": sign };
  for (const k in attrs) out[`data-${k}`] = attrs[k];
  return out;
}

/** One cell's text, kept current without re-rendering anything.
 *
 *  Render it as `<span ref={ref} {...data}>{text}</span>` and put nothing
 *  else inside that element: on each commit the hook writes the node's
 *  text and data attributes directly, and flashes its background with
 *  element.animate, tinted pos when the figure rose and neg when it fell.
 *  React sees none of it, so a ticking board costs no renders.
 *
 *  `data` carries data-sign (the sign as printed; see signOf) and one
 *  data-* per key `attrs` returns, for state beyond the sign that a
 *  version styles from its CSS: a heat band, which side a buy share
 *  leans. The attributes are written on every commit even when the text
 *  hasn't changed, because a value can cross a band edge or zero inside
 *  one printed string.
 *
 *  `split: true` is for a figure whose unit is dimmed. Render
 *  `<span ref={ref} {...data}><span>{head}</span><span data-part="unit">{tail}</span></span>`
 *  (exactly those two children) and both are kept current; the split is
 *  format.ts splitSuffix, so "$418K" is "$418" and "K".
 *
 *  Flashes only when the text changes, never under reduced motion, and
 *  not for `age`. Pass `flash: false` to turn them off for a cell. */
export function useLiveCell(
  ticker: string,
  w: Window,
  cell: Cell,
  format: (v: number | null) => string,
  opts: { flash?: boolean; split?: boolean; attrs?: LiveAttrs } = {},
): {
  text: string;
  head: string;
  tail: string;
  sign: Sign;
  data: Record<`data-${string}`, string>;
  ref: (node: HTMLElement | null) => void;
} {
  const sim = useMarketSim();
  const value = sim.value(ticker, w, cell);
  const text = format(value);
  const sign = signOf(value, text);
  const [head, tail] = splitSuffix(text);
  const data = dataProps(sign, opts.attrs ? opts.attrs(value) : {});
  const node = useRef<HTMLElement | null>(null);
  const fmt = useRef(format);
  const attrs = useRef(opts.attrs);
  const prev = useRef(value);
  const flash = opts.flash ?? cell !== "age";
  const split = !!opts.split;

  useEffect(() => {
    fmt.current = format;
    attrs.current = opts.attrs;
    prev.current = value;
  });

  useEffect(() => {
    return sim.subscribe(() => {
      const el = node.current;
      if (!el) return;
      const v = sim.value(ticker, w, cell);
      const t = fmt.current(v);
      const before = prev.current;
      prev.current = v;
      const sg = signOf(v, t);
      if (el.dataset.sign !== sg) el.dataset.sign = sg;
      if (attrs.current) {
        const a = attrs.current(v);
        for (const k in a) if (el.dataset[k] !== a[k]) el.dataset[k] = a[k];
      }
      if (split) {
        const [h, u] = splitSuffix(t);
        const a = el.firstElementChild;
        const b = el.lastElementChild;
        if (!a || !b || a === b) return;
        if (a.textContent === h && b.textContent === u) return;
        if (a.textContent !== h) a.textContent = h;
        if (b.textContent !== u) b.textContent = u;
      } else {
        const tn = el.firstChild;
        const only = tn && tn === el.lastChild && tn.nodeType === 3;
        const current = only ? tn.nodeValue : el.textContent;
        if (t === current) return;
        if (only) tn.nodeValue = t;
        else el.textContent = t;
      }
      if (!flash || before === null || v === null || v === before || reducedMotion()) return;
      const tint = v > before ? tints().pos : tints().neg;
      el.animate([{ backgroundColor: tint }, { backgroundColor: "transparent" }], {
        duration: 820,
        easing: "ease-out",
      });
    });
  }, [sim, ticker, w, cell, flash, split]);

  const ref = useCallback((el: HTMLElement | null) => {
    node.current = el;
  }, []);
  return { text, head, tail, sign, data, ref };
}

/** A figure applied to something other than text, kept current without
 *  re-rendering: a split bar's width from buyRatio, a tile's fill. Render
 *  from `value` (so the server render and hydration agree), give the
 *  element `ref`, and `apply(el, v)` runs on each commit that changes the
 *  value. `apply` may change every render; the newest one runs. */
export function useLiveValue<E extends Element = HTMLElement>(
  ticker: string,
  w: Window,
  cell: Cell,
  apply: (el: E, v: number | null) => void,
): { value: number | null; ref: (node: E | null) => void } {
  const sim = useMarketSim();
  const value = sim.value(ticker, w, cell);
  const node = useRef<E | null>(null);
  const fn = useRef(apply);
  const prev = useRef(value);

  useEffect(() => {
    fn.current = apply;
    prev.current = value;
  });

  useEffect(() => {
    return sim.subscribe(() => {
      const el = node.current;
      if (!el) return;
      const v = sim.value(ticker, w, cell);
      if (v === prev.current) return;
      prev.current = v;
      fn.current(el, v);
    });
  }, [sim, ticker, w, cell]);

  const ref = useCallback((el: E | null) => {
    node.current = el;
  }, []);
  return { value, ref };
}

/** A window's sparkline as data, re-rendering the caller on each commit
 *  that changes it. For a handful of sparks; for a column of them use
 *  useLiveSparkPath, which writes the path without rendering.
 *
 *  The server snapshot is the sim's own cached spark too: at elapsed 0
 *  it is the fixture's, and it is the same object on every call, which
 *  React checks during hydration (a fresh object each call logs "The
 *  result of getServerSnapshot should be cached"). */
export function useLiveSpark(ticker: string, w: Window, n = 48): Spark {
  const sim = useMarketSim();
  const get = useCallback(() => sim.spark(ticker, w, n), [sim, ticker, w, n]);
  return useSyncExternalStore(sim.subscribe, get, get);
}

/** A sparkline path for a `width` × `height` box, kept current by
 *  writing the `d` and `data-up` attributes of the node given `ref`
 *  directly. Render `<path ref={ref} d={d} data-up={up} />`; colour it
 *  from `[data-up="true"]` / `[data-up="false"]` / `[data-up="null"]`
 *  in the version's CSS so the colour follows the line. "null" is a
 *  change that prints as 0.0%, or none: neutral, not a gain. */
export function useLiveSparkPath(
  ticker: string,
  w: Window,
  width: number,
  height: number,
  n = 48,
): { d: string; up: "true" | "false" | "null"; ref: (node: SVGPathElement | null) => void } {
  const sim = useMarketSim();
  const spark = sim.spark(ticker, w, n);
  const d = sparkPath(spark, width, height);
  const node = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    return sim.subscribe(() => {
      const el = node.current;
      if (!el) return;
      const s = sim.spark(ticker, w, n);
      const next = sparkPath(s, width, height);
      if (el.getAttribute("d") !== next) el.setAttribute("d", next);
      const up = String(s.up);
      if (el.dataset.up !== up) el.dataset.up = up;
    });
  }, [sim, ticker, w, n, width, height]);

  const ref = useCallback((el: SVGPathElement | null) => {
    node.current = el;
  }, []);
  return { d, up: String(spark.up) as "true" | "false" | "null", ref };
}

/** Whether a window currently covers the coin's whole life, so the
 *  label beside it reads LABELS.SINCE_LAUNCH. Re-renders only when that
 *  flips (a young coin outliving its 5m window mid-session). */
export function useSinceLaunch(ticker: string, w: Window): boolean {
  const sim = useMarketSim();
  const row = sim.row(ticker);
  return useSyncExternalStore(
    sim.subscribe,
    () => sim.sinceLaunch(ticker, w),
    () => row?.windows[w].sinceLaunch ?? false,
  );
}

type OrderState = {
  key: string;
  tickers: string[];
  values: Record<string, number | null>;
  rankedAt: number | null;
  pending: number;
};

/** The figure a tab ranks by, for one row, as the sim has it now. */
function rankValue(sim: MarketSim, row: TrendingRow, tab: Tab, w: Window): number | null {
  const m = RANK_METRIC[tab];
  if (m === "score") return row.seat?.scored ? row.seat.score : null;
  return sim.value(row.ticker, w, m);
}

function sameValues(a: Record<string, number | null>, b: Record<string, number | null>) {
  for (const k in b) if (a[k] !== b[k]) return false;
  return true;
}

/** The board's order for a tab, window and filter, on the simulated
 *  figures.
 *
 *  Tab, window and filter changes apply at once: the reader asked. The
 *  market's own re-ranks come at most every `reorderMs` (5s), and never
 *  while frozen: set frozen while the pointer or focus is on the board,
 *  so a row can't slide out from under a click. While frozen, `pending`
 *  counts the rows that would move; unfreezing applies them. Pausing the
 *  sim stops re-ranks with it, because nothing commits.
 *
 *  `values` is each listed coin's ranking figure (RANK_METRIC: window
 *  trades for trending, cap for top, and so on) at the moment the order
 *  on screen was computed, and `rankedAt` is that moment in wall-clock
 *  ms. So a poster numeral, a tile area or a "re-ranked at" stamp can
 *  come from the same snapshot as the order instead of from a cell that
 *  has moved on since. Both hold while frozen, with the order.
 *
 *  By default the hook re-renders only when the order changes, and
 *  `values`/`rankedAt` describe that last change. Pass `values: true`
 *  to take a fresh snapshot on every re-rank the figures moved in, even
 *  when the order holds (the board then renders every `reorderMs`):
 *  a treemap whose shares move without two neighbours swapping needs it.
 *
 *  The first render ranks the fixture, so the server and hydration
 *  agree; `rankedAt` is null there, as useClock is, and set on mount. */
export function useLiveOrder(
  tab: Tab,
  w: Window,
  filter: TrendingFilter,
  opts: { reorderMs?: number; limit?: number; starred?: readonly string[]; values?: boolean; rule?: TrendingRule } = {},
): {
  tickers: string[];
  values: Record<string, number | null>;
  rankedAt: number | null;
  frozen: boolean;
  setFrozen: (f: boolean) => void;
  pending: number;
} {
  const sim = useMarketSim();
  const reorderMs = opts.reorderMs ?? 5000;
  const limit = opts.limit;
  const starred = opts.starred;
  const eager = !!opts.values;
  const rule = opts.rule;
  const key = `${tab}|${w}|${JSON.stringify(filter)}|${(starred ?? []).join(",")}|${limit ?? ""}|${rule ?? ""}`;

  const compute = useCallback(() => {
    const ranked = rank(applyFilter(sim.rows, filter, w, sim.read), tab, w, { starred, read: sim.read, rule });
    const list = limit ? ranked.slice(0, limit) : ranked;
    const values: Record<string, number | null> = {};
    for (const r of list) values[r.ticker] = rankValue(sim, r, tab, w);
    return { tickers: list.map((r) => r.ticker), values };
    // key carries filter and starred by value, so a new object with the
    // same contents doesn't rebuild the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, key]);

  const [state, setState] = useState<OrderState>(() => ({ key, ...compute(), rankedAt: null, pending: 0 }));
  let current = state;
  if (state.key !== key) {
    // Only ever on the client, after the reader changed something.
    current = { key, ...compute(), rankedAt: Date.now(), pending: 0 };
    setState(current);
  }

  const [frozen, setFrozenState] = useState(false);
  const frozenRef = useRef(false);
  const lastRank = useRef(0);

  // The fixture order was true as of the moment the page came up.
  useEffect(() => {
    setState((s) => (s.rankedAt === null ? { ...s, rankedAt: Date.now() } : s));
  }, []);

  useEffect(() => {
    return sim.subscribe(() => {
      const now = performance.now();
      if (now - lastRank.current < reorderMs) return;
      lastRank.current = now;
      const next = compute();
      setState((s) => {
        if (s.key !== key) return s;
        const moved =
          next.tickers.reduce((n, t, i) => n + (s.tickers[i] === t ? 0 : 1), 0) +
          Math.max(0, s.tickers.length - next.tickers.length);
        if (frozenRef.current) return moved === s.pending ? s : { ...s, pending: moved };
        if (moved === 0 && (!eager || sameValues(s.values, next.values))) return s;
        return { key, ...next, rankedAt: Date.now(), pending: 0 };
      });
    });
  }, [sim, compute, key, reorderMs, eager]);

  const setFrozen = useCallback(
    (f: boolean) => {
      if (frozenRef.current === f) return;
      frozenRef.current = f;
      setFrozenState(f);
      if (!f) {
        const next = compute();
        lastRank.current = performance.now();
        setState((s) => (s.key === key ? { key, ...next, rankedAt: Date.now(), pending: 0 } : s));
      }
    },
    [compute, key],
  );

  return {
    tickers: current.tickers,
    values: current.values,
    rankedAt: current.rankedAt,
    frozen,
    setFrozen,
    pending: current.pending,
  };
}

/** Every coin's rank on a tab and window, ticker to 1-based rank, across
 *  the whole unfiltered roster, on the same re-rank cadence as the
 *  board. This is the 24H# column: `useLiveRanks("trending", "24h")`.
 *  The row's own fixtureRank24h is the fixture at page open and goes
 *  stale on the first commit. Call it once per board and pass the map
 *  down, not once per row. Never frozen: it is a figure, not the order
 *  under the reader's pointer. */
export function useLiveRanks(tab: Tab, w: Window, opts: { reorderMs?: number } = {}): Record<string, number> {
  const { tickers } = useLiveOrder(tab, w, EMPTY_FILTER, { reorderMs: opts.reorderMs });
  return useMemo(() => Object.fromEntries(tickers.map((t, i) => [t, i + 1])), [tickers]);
}

/** Stop the market while this board is off screen. The sim runs while
 *  any registered board is in view (or none has registered), and
 *  catches up in one step when one comes back; while it is stopped the
 *  status reads 'offscreen'.
 *
 *  Pass the element that holds every ticking figure, not only the list
 *  scroller: on a stacked phone layout an inspector below the list is
 *  still on screen when the list isn't, and its figures would stop with
 *  the list. Register each such region separately if they don't share
 *  a root. */
export function useBoardInView(ref: RefObject<Element | null>) {
  const sim = useMarketSim();
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) sim.setBoardVisible(id, e.isIntersecting);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      sim.setBoardVisible(id, null);
    };
  }, [sim, id, ref]);
}

/* ============================================================== Clock */

type Clock = {
  now: number | null;
  subs: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  subscribe: (fn: () => void) => () => void;
  get: () => number | null;
};

const clocks = new Map<number, Clock>();

/** One clock object per interval, with a stable subscribe: a subscribe
 *  made fresh on each render would restart the interval on each render,
 *  and every restart is a new time and so another render. */
function clockFor(ms: number): Clock {
  const hit = clocks.get(ms);
  if (hit) return hit;
  const c: Clock = {
    now: null,
    subs: new Set(),
    timer: null,
    subscribe(fn) {
      c.subs.add(fn);
      if (c.timer === null) {
        c.now = Date.now();
        c.timer = setInterval(() => {
          c.now = Date.now();
          c.subs.forEach((f) => f());
        }, ms);
        // The first reading lands after the subscriber has rendered null.
        queueMicrotask(() => c.subs.forEach((f) => f()));
      }
      return () => {
        c.subs.delete(fn);
        if (c.subs.size === 0 && c.timer !== null) {
          clearInterval(c.timer);
          c.timer = null;
          c.now = null;
        }
      };
    },
    get: () => c.now,
  };
  clocks.set(ms, c);
  return c;
}

const nullClock = () => null;

/** One shared wall clock per interval, so every countdown and elapsed
 *  label on the page turns over on the same tick. Null on the server and
 *  during hydration: a time baked into the markup would disagree with the
 *  client's first render by however long the page took to arrive. */
export function useClock(ms = 1000): number | null {
  const c = clockFor(ms);
  return useSyncExternalStore(c.subscribe, c.get, nullClock);
}
