/**
 * The Z500's fixtures and its score.
 *
 * The rules are in lib/spec.ts (the Z500 block, cited by section from
 * design/z500-spec.md). This file is what the demo shows: which coins
 * hold a seat, what they scored, who is on this week's ballot, what
 * was bought back, and what the last few reconstitutions changed.
 *
 * Every figure is derived, not fetched, and derived from the ticker
 * rather than at random, so a seat carries the same score on every
 * visit and the same score on every screen. The one rule the fixtures
 * keep to above all: a seat's inputs are anchored on facts the rest of
 * the site already states about the coin — its cap, its age, its
 * liquidity — so the index cannot contradict the token page.
 */

import { COINS, coinPriceUsd, type Coin } from "./data";
import { coinDetail } from "./coin-detail";
import { SCORE, Z500, scorePoints, type Route, type ScoreComponent } from "./spec";

/* ------------------------------------------------------------- Score */

export type ScoreRow = {
  id: ScoreComponent;
  label: string;
  value: number;
  points: number;
  weight: number;
  contribution: number;
};

export type Score = { total: number; rows: ScoreRow[] };

export type ScoreInputs = Record<ScoreComponent, number>;

/** §4.2: each component to points, times its weight, summed.
 *
 *  Checked against the worked examples in §4.3: five of the six
 *  components reproduce the document's points exactly. Holders does
 *  not — the table's floor of 1,000 and ceiling of 100,000 give 3,000
 *  holders 24 points where the example prints 54, and 900 holders 0
 *  where it prints 28. The table is the rule and the example is the
 *  illustration, so the table is what runs; the discrepancy is
 *  flagged to the owner. */
export function scoreOf(inputs: ScoreInputs): Score {
  const rows = SCORE.map((c) => {
    const value = inputs[c.id];
    const points = scorePoints(c.id, value);
    return {
      id: c.id,
      label: c.label,
      value,
      points: Math.round(points),
      weight: c.weight,
      contribution: Math.round(points * c.weight) / 100,
    };
  });
  const total = Math.round(rows.reduce((a, r) => a + r.contribution, 0));
  return { total, rows };
}

/** A component's value, printed the way the spec's tables print it. */
export function scoreValue(id: ScoreComponent, v: number): string {
  const unit = SCORE.find((s) => s.id === id)!.unit;
  switch (unit) {
    case "usd":
      return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`;
    case "count":
      return Math.round(v).toLocaleString("en-US");
    case "pct":
      return `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}%`;
    case "ratio":
      return v.toFixed(1);
    case "weeks":
      return v < 1 ? `${v.toFixed(1)} weeks` : `${Math.round(v)} weeks`;
  }
}

/* ------------------------------------------------------------- Seats */

function seeded(key: string) {
  let seed = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x5eed) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** "3w 2d", "5d 7h" → days. */
export function ageDays(age: string): number {
  let d = 0;
  for (const [, n, unit] of age.matchAll(/(\d+)\s*([wdhm])/g)) {
    const v = Number(n);
    d += unit === "w" ? v * 7 : unit === "d" ? v : unit === "h" ? v / 24 : v / 1440;
  }
  return d;
}

export type Seat = {
  /** Permanent, assigned at first admission (§2). */
  seatNo: number;
  ticker: string;
  name: string;
  chain: 1 | 2;
  /** A token launched elsewhere: it has no coin page here. */
  external: boolean;
  route: Route;
  /** Weeks since the seat was granted. */
  weeksSeated: number;
  /** Position this week and the move since last week's reconstitution. */
  rank: number;
  rankChange: number;
  /** Points the score moved at the same reconstitution. A fixture, the
   *  way rankChange is: the score is computed from this week's inputs
   *  and there are no last-week inputs to compute the other one from.
   *  Bounded so a score cannot be shown having moved further than it
   *  could have come from. */
  scoreChange: number;
  inputs: ScoreInputs;
  score: Score;
  /** Who is behind it (§3.2). Held whether or not it is shown; the
   *  team decides whether it is. */
  team: { identity: string; wallets: string[]; published: boolean };
};

/** Tokens seated through the external route: launched somewhere else,
 *  submitted through the form, passed review. Not on the roster, so
 *  they have no coin page and the seat row does not link. */
const EXTERNAL: {
  ticker: string;
  name: string;
  chain: 1 | 2;
  mcap: number;
  ageDays: number;
  team: string;
  wallets: string[];
  published: boolean;
}[] = [
  {
    ticker: "GLINT",
    name: "glint",
    chain: 2,
    mcap: 3_400_000,
    ageDays: 61,
    team: "Glint Labs",
    wallets: ["0x4bD2…9f1A", "0xC0e7…22b4"],
    published: true,
  },
  {
    ticker: "MOSSY",
    name: "mossy",
    chain: 1,
    mcap: 920_000,
    ageDays: 38,
    team: "mossy collective",
    wallets: ["Hn7q…dR2k"],
    published: false,
  },
];

/** The route a roster coin was seated through.
 *
 *  Diamond-tier launches hold Diamond seats and Fortress launches hold
 *  Fortress seats; both are seated on graduation and never re-scored.
 *  The rest cleared the bar. */
function routeFor(coin: Coin): Route {
  if (coin.tier === "Diamond") return "Diamond";
  if (coin.tier === "Fortress") return "Fortress";
  return "Merit";
}

/** The score's inputs for a coin.
 *
 *  Cap and liquidity are the coin's own, and weeks since graduation is
 *  the roster's age less the 72-hour grace. The other three — venue-wide
 *  7-day volume, holders, holder growth — are readings the site's own
 *  tape does not see, so they are seeded from the ticker and anchored
 *  on the cap: a $2M coin has more holders than a $400K one, and the
 *  worked examples in §4.3 are the shape they follow. */
function inputsFor(ticker: string, mcap: number, liquidity: number, days: number): ScoreInputs {
  const rand = seeded(ticker + "z500");
  const volume = mcap * (0.7 + rand() * 1.9);
  const holders = Math.round(mcap / (45 + rand() * 90));
  const growth = -0.06 + rand() * 0.5;
  const vtl = Math.min(3, (volume / liquidity) * (0.06 + rand() * 0.14));
  const staying = Math.max(0, (days - Z500.graceHours / 24) / 7);
  return { mcap, volume, holders, growth, vtl, staying };
}

function build(): Seat[] {
  const rows: Omit<Seat, "seatNo" | "rank" | "rankChange" | "scoreChange">[] = [];

  for (const coin of COINS) {
    if (!coin.migrated) continue;
    const detail = coinDetail(coin);
    const days = ageDays(coin.age);
    const rand = seeded(coin.ticker + "seat");
    /* The roster carries no chain of its own — the site's network is
       a toggle over the whole roster — so a seat's chain is drawn from
       the ticker: about a third on Robinhood Chain, the rest on
       Solana. Its own seed, so the draw does not move the team's
       published flag below. */
    const chainRand = seeded(coin.ticker + "chain");
    rows.push({
      ticker: coin.ticker,
      name: coin.name,
      chain: chainRand() < 0.35 ? 2 : 1,
      external: false,
      route: routeFor(coin),
      weeksSeated: Math.max(0, Math.floor((days - Z500.graceHours / 24) / 7)),
      inputs: inputsFor(coin.ticker, detail.mcNum, detail.liquidity, days),
      score: { total: 0, rows: [] },
      team: {
        identity: `${coin.name} team`,
        wallets: [coin.creator],
        published: rand() < 0.65,
      },
    });
  }
  for (const x of EXTERNAL) {
    rows.push({
      ticker: x.ticker,
      name: x.name,
      chain: x.chain,
      external: true,
      route: "External",
      weeksSeated: Math.max(0, Math.floor((x.ageDays - 21) / 7)),
      inputs: inputsFor(x.ticker, x.mcap, x.mcap * 0.11, x.ageDays),
      score: { total: 0, rows: [] },
      team: { identity: x.team, wallets: x.wallets, published: x.published },
    });
  }
  for (const r of rows) r.score = scoreOf(r.inputs);

  /* Seat numbers follow admission order: the longest-seated holds the
     lowest number, and a number is never reused. Rank follows score.
     The list itself is by market cap (decision, September 2026): an
     index lists its constituents by weight. */
  const byAdmission = [...rows].sort(
    (a, b) => b.weeksSeated - a.weeksSeated || a.ticker.localeCompare(b.ticker),
  );
  const seatNo = new Map(byAdmission.map((r, i) => [r.ticker, i + 1]));
  const byScore = [...rows].sort((a, b) => b.score.total - a.score.total);
  return byScore
    .map((r, i) => {
      const rand = seeded(r.ticker + "rank");
      // A seat granted this week has no last week to have moved from.
      const fresh = r.weeksSeated === 0;
      const rankChange = fresh ? 0 : Math.round((rand() - 0.5) * 6);
      // Clamped to what the score could have moved from: a seat on 3
      // cannot have risen 8 points, because it would have been on -5.
      const drift = Math.round((rand() - 0.45) * 14);
      const scoreChange = fresh ? 0 : Math.max(-r.score.total, Math.min(100 - r.score.total, drift));
      return { ...r, seatNo: seatNo.get(r.ticker)!, rank: i + 1, rankChange, scoreChange };
    })
    .sort((a, b) => b.inputs.mcap - a.inputs.mcap);
}

/** Every seat, ordered by market cap. Built once: the roster does not
 *  change while the page is open, and coinDetail walks a lot for each
 *  coin. */
export const SEATS: Seat[] = build();

export function seatOf(ticker: string): Seat | undefined {
  return SEATS.find((s) => s.ticker === ticker);
}

/* --------------------------------------------------------- Calendar */

/** The next reconstitution, from a moment: the coming Wednesday 16:00
 *  UTC, or the one after if that has passed. */
export function nextReconstitution(from: Date = new Date()): Date {
  const { weekday, hour } = Z500.reconstitution;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0));
  const delta = (weekday - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + delta);
  if (d.getTime() <= from.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

/** The last reconstitution before a moment. */
export function lastReconstitution(from: Date = new Date()): Date {
  const next = nextReconstitution(from);
  return new Date(next.getTime() - 7 * 86400000);
}

/** "3d 14h 02m" — what a countdown prints. */
export function countdown(to: Date, now: Date): string {
  const s = Math.max(0, Math.floor((to.getTime() - now.getTime()) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${String(m).padStart(2, "0")}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

export function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** When this week's ballot opened: Monday 00:00 UTC before the next
 *  reconstitution (§7.2: shortlist published Monday, voting Monday to
 *  Wednesday). */
export function ballotOpen(next: Date): Date {
  return new Date(next.getTime() - (2 * 24 + Z500.reconstitution.hour) * 3600_000);
}

/** Each candidate's running total from the ballot's opening to now, as
 *  a fixed number of evenly spaced points, the last of which is the
 *  tally on the page. The shape is seeded from the ticker, and it is
 *  not monotone: votes can be moved until reconstitution, so a line
 *  dips where holders changed their minds and the lines cross.
 *  Whatever the clock says, the line ends at the number the row
 *  shows, so the chart and the row cannot disagree. */
export function ballotSeries(rows: BallotRow[], open: Date, now: Date, points = 48): { at: number; votes: number[] }[] {
  const t0 = open.getTime();
  const t1 = Math.max(t0 + 60_000, now.getTime());
  /* Each candidate's path is a walk of increments, mostly gains with
     the odd loss — votes can be moved until reconstitution, so a
     total does fall — smoothed over three steps and scaled so it
     ends at the tally on the page. */
  const paths = rows.map((r) => {
    const rand = seeded(r.ticker + "series");
    const raw: number[] = [];
    for (let i = 1; i < points; i++) {
      const move = rand();
      raw.push(move < 0.14 ? -(0.3 + rand() * 0.9) : 0.7 + rand() * 0.6 + (move > 0.94 ? 0.8 + rand() * 1.4 : 0));
    }
    const w = raw.map((_, i) => {
      let sum = 0;
      let n = 0;
      for (let k = i - 1; k <= i + 1; k++) if (raw[k] !== undefined) (sum += raw[k]), n++;
      return sum / n;
    });
    const c: number[] = [0];
    for (const x of w) c.push(Math.max(0, c[c.length - 1] + x));
    const end = c[c.length - 1] || 1;
    return c.map((x) => x / end);
  });
  const out: { at: number; votes: number[] }[] = [];
  for (let i = 0; i < points; i++) {
    out.push({
      at: t0 + ((t1 - t0) * i) / (points - 1),
      votes: rows.map((r, k) => (i === points - 1 ? r.votes : Math.round(r.votes * paths[k][i]))),
    });
  }
  return out;
}

/* ---------------------------------------------------------- Buybacks */

export type Buyback = {
  /** ISO date of the buy. */
  date: string;
  ticker: string;
  usd: number;
  /** Wallets that voted for the winner, for the equal split. */
  voters: number;
};

/** How many of the token a buyback bought, at the roster's own price.
 *
 *  Derived, not stored: the dollars are the fixture and the price is
 *  the roster's, so the two can never drift into saying different
 *  things about the same buy. A coin the roster does not carry returns
 *  nothing rather than a zero, because zero tokens is a claim and "we
 *  do not know" is the truth. */
export function buybackTokens(b: Buyback): number | null {
  const coin = COINS.find((c) => c.ticker === b.ticker);
  const price = coin ? coinPriceUsd(coin.price) : 0;
  return price > 0 ? b.usd / price : null;
}

/** Executed buybacks, newest first. The last one is what the index
 *  page prints; the rest fill the ledger and the reports. */
export const BUYBACKS: Buyback[] = [
  { date: "2026-09-12", ticker: "BULLP", usd: 18_500, voters: 212 },
  { date: "2026-09-04", ticker: "PYLONX", usd: 12_000, voters: 164 },
  { date: "2026-08-27", ticker: "WRAITK", usd: 15_200, voters: 189 },
  { date: "2026-08-20", ticker: "STATI", usd: 9_800, voters: 141 },
  { date: "2026-08-12", ticker: "OZONEL", usd: 14_000, voters: 176 },
  { date: "2026-08-05", ticker: "KESTR", usd: 11_400, voters: 158 },
];

/** §7.1. Revenue over the trailing window, the cap it implies, and
 *  what the ledger has spent inside it. Revenue is the fixture the
 *  live stats already print for seven days, scaled to thirty. */
export const CAP = (() => {
  const revenue30d = 118_400 * (30 / 7);
  const cap = revenue30d * Z500.capShare;
  const cutoff = Date.now() - Z500.capWindowDays * 86400000;
  const spent = BUYBACKS.filter((b) => new Date(b.date).getTime() >= cutoff).reduce(
    (a, b) => a + b.usd,
    0,
  );
  return { revenue30d, cap, spent, left: Math.max(0, cap - spent) };
})();

/* ------------------------------------------------------------ Ballot */

export type BallotRow = { ticker: string; votes: number; wallets: number };

/** This week's shortlist (§7.3): four seats, none of which won in the
 *  last eight weeks, with the votes and wallets cast so far. The
 *  figures are the tally before the reader's own vote; their votes are
 *  added on the page. */
export const BALLOT: BallotRow[] = (() => {
  // Below BUYBACKS on purpose: it reads the ledger at module load.
  const recent = new Set(BUYBACKS.map((b) => b.ticker));
  const pool = SEATS.filter((s) => !recent.has(s.ticker));
  const picks = [pool[1], pool[3], pool[6], pool[9]].filter(Boolean);
  return picks.map((s, i) => {
    const rand = seeded(s.ticker + "ballot");
    const wallets = 40 + Math.round(rand() * 260);
    return { ticker: s.ticker, votes: wallets * (9 + Math.round(rand() * 30)) + i, wallets };
  });
})();

/* ------------------------------------------------------------ Report */

export type WeekReport = {
  /** The reconstitution this report describes. */
  date: Date;
  granted: { ticker: string; route: Route; seatNo: number }[];
  removed: { ticker: string; route: Route; reason: string }[];
  ballot: { rows: BallotRow[]; winner: string };
  buyback: Buyback | null;
  /** Editorial picks: a labelled rail, not the index (§5). */
  picks: { ticker: string; note: string }[];
};

/** The last few weeks, newest first, each reconstructed from the seats:
 *  a seat granted k weeks ago appears under the reconstitution k weeks
 *  back. Winners are the buyback ledger's tickers in order. */
/* Every week loses a seat to something. The latest three used to lose
   none, so the page that opens on the latest week showed an empty
   column and the red minus beside a removal was a state nobody saw.
   Each reason here is one of §5's own grounds — two weeks under the
   exit line, four under a death floor, or removal for cause — rather
   than a sentence invented to fill the column. */
const REMOVED: WeekReport["removed"][] = [
  [
    { ticker: "TIDE", route: "Merit", reason: `Scored under ${Z500.exit} at ${Z500.exitWeeks} consecutive reconstitutions.` },
    {
      ticker: "HALO2",
      route: "External",
      reason: `Declared wallets sold ${Math.round(Z500.teamSellLimit * 100) + 4}% of holdings in seven days.`,
    },
  ],
  [{ ticker: "SPARKD", route: "Merit", reason: `Scored under ${Z500.exit} at ${Z500.exitWeeks} consecutive reconstitutions.` }],
  [
    {
      ticker: "RIFTL",
      route: "Merit",
      reason: `Under $${(Z500.death.volume7dUsd / 1000).toFixed(0)}K of weekly volume for ${Z500.death.weeks} weeks running.`,
    },
  ],
  [{ ticker: "VELVT", route: "External", reason: `Declared wallets sold 14% of holdings in seven days.` }],
  [{ ticker: "PUMPKN", route: "Diamond", reason: "Editorial removal: the team stopped answering the contact on file." }],
  [{ ticker: "NOVAE", route: "Merit", reason: "Editorial removal: the project's socials went dark for three weeks." }],
];

/* Twelve notes for twelve picks. The report page lists every week at
   once, so a pool of four repeated each note three times on one screen
   and the whole section read as filler. One note per pick. */
const PICK_NOTES = [
  "Deepest order book of any seat this week.",
  "Holder count doubled since the last report.",
  "Held its cap through a week the rest of the index gave back.",
  "The first external seat from the second network.",
  "Volume held up after the launch week's attention moved on.",
  "Took a seat on its first score, without a nomination.",
  "Its liquidity grew faster than its cap for the third week running.",
  "The only seat whose holder count rose every day of the week.",
  "Back on the ballot after a week off it.",
  "Traded on both networks within a day of graduating.",
  "Lowest turnover of any seat in the top twenty.",
  "Climbed eleven places without a single day of net outflow.",
];

export const REPORTS: WeekReport[] = Array.from({ length: 6 }, (_, k) => {
  const date = new Date(lastReconstitution().getTime() - k * 7 * 86400000);
  const granted = SEATS.filter((s) => s.weeksSeated === k)
    .sort((a, b) => a.seatNo - b.seatNo)
    .map((s) => ({ ticker: s.ticker, route: s.route, seatNo: s.seatNo }));
  const winner = BUYBACKS[k]?.ticker ?? SEATS[k].ticker;
  const rand = seeded(`week${k}`);
  const others = SEATS.filter((s) => s.ticker !== winner).slice(k, k + 3);
  const rows: BallotRow[] = [
    { ticker: winner, votes: 4200 + Math.round(rand() * 5000), wallets: BUYBACKS[k]?.voters ?? 150 },
    ...others.map((s) => {
      const w = 30 + Math.round(rand() * 160);
      return { ticker: s.ticker, votes: w * (8 + Math.round(rand() * 22)), wallets: w };
    }),
  ].sort((a, b) => b.votes - a.votes);
  const picks = [SEATS[(k * 2 + 1) % SEATS.length], SEATS[(k * 3 + 4) % SEATS.length]].map((s, i) => ({
    ticker: s.ticker,
    note: PICK_NOTES[(k * 2 + i) % PICK_NOTES.length],
  }));
  return { date, granted, removed: REMOVED[k] ?? [], ballot: { rows, winner }, buyback: BUYBACKS[k] ?? null, picks };
});

/* ------------------------------------------------ Submissions, admin */

export type Submission = {
  id: string;
  ticker: string;
  name: string;
  chain: 1 | 2;
  address: string;
  socials: { x: string; telegram?: string; website?: string };
  contact: string;
  vision: string;
  team: string;
  wallets: string[];
  published: boolean;
  submitted: string;
  /** Pulled automatically at submission (§3.4). */
  pulled: { mcap: number; volume: number; holders: number; ageDays: number; liquidity: number };
  /** The qualitative test (§3.3), as the reviewer ticks it. */
  checks: { socials: boolean; vision: boolean; community: boolean; team: boolean };
  status: "review" | "approved" | "rejected";
  reason?: string;
};

export const SUBMISSIONS: Submission[] = [
  {
    id: "s1",
    ticker: "RIFTL",
    name: "riftline",
    chain: 1,
    address: "Rf7Lx…pump",
    socials: { x: "https://x.com/riftline", telegram: "https://t.me/riftline", website: "https://riftline.xyz" },
    contact: "team@riftline.xyz",
    vision: "A trading terminal that pays its users in the fees they generate.",
    team: "Riftline Labs (three named founders)",
    wallets: ["Rf9a…3kQe", "Rf2c…88Lm"],
    published: true,
    submitted: "2026-09-17",
    pulled: { mcap: 4_100_000, volume: 2_900_000, holders: 8_200, ageDays: 19, liquidity: 410_000 },
    checks: { socials: true, vision: true, community: false, team: true },
    status: "review",
  },
  {
    id: "s2",
    ticker: "HALO2",
    name: "halo",
    chain: 2,
    address: "0x71cE…4a9D",
    socials: { x: "https://x.com/halo_rh" },
    contact: "halo@proton.me",
    vision: "The first index-tracked memecoin on Robinhood Chain.",
    team: "anon, two members",
    wallets: ["0x71cE…4a9D"],
    published: false,
    submitted: "2026-09-16",
    pulled: { mcap: 620_000, volume: 380_000, holders: 1_240, ageDays: 9, liquidity: 62_000 },
    checks: { socials: true, vision: false, community: false, team: false },
    status: "review",
  },
  {
    id: "s3",
    ticker: "SABLE",
    name: "sable",
    chain: 1,
    address: "Sb1e…pump",
    socials: { x: "https://x.com/sablecoin", website: "https://sable.fun" },
    contact: "hi@sable.fun",
    vision: "Coins with a face: every holder gets a sable.",
    team: "Sable Studio",
    wallets: ["Sb4k…9pQr"],
    published: true,
    submitted: "2026-09-11",
    pulled: { mcap: 1_900_000, volume: 2_400_000, holders: 9_400, ageDays: 27, liquidity: 210_000 },
    checks: { socials: true, vision: true, community: true, team: true },
    status: "approved",
  },
  {
    id: "s4",
    ticker: "PUMPKN",
    name: "pumpkin",
    chain: 1,
    address: "Pk1n…pump",
    socials: { x: "https://x.com/pumpkn" },
    contact: "pumpkn@gmail.com",
    vision: "",
    team: "unknown",
    wallets: [],
    published: false,
    submitted: "2026-09-09",
    pulled: { mcap: 210_000, volume: 41_000, holders: 640, ageDays: 5, liquidity: 8_400 },
    checks: { socials: false, vision: false, community: false, team: false },
    status: "rejected",
    reason: "Under the holder and liquidity minimums, and no declared wallets.",
  },
];

/** The score a submission carries at review (§3.1, external route). */
export function submissionScore(s: Submission): Score {
  const p = s.pulled;
  return scoreOf({
    mcap: p.mcap,
    volume: p.volume,
    holders: p.holders,
    growth: 0.18,
    vtl: p.volume / p.liquidity / 7,
    staying: Math.max(0, (p.ageDays - 3) / 7),
  });
}

export type Nomination = { address: string; chain: 1 | 2; by: string; at: string; ticker?: string };

/** Admin only (§3.4, decision). */
export const NOMINATIONS: Nomination[] = [
  { address: "9wZq…pump", chain: 1, by: "Ldc7…9tRn", at: "2026-09-18", ticker: "ORBIT" },
  { address: "0x3aB1…c77E", chain: 2, by: "0x9F3a…7D68", at: "2026-09-18", ticker: "FEATHR" },
  { address: "K3mn…pump", chain: 1, by: "Qw41…7fLd", at: "2026-09-17" },
  { address: "Tt8u…pump", chain: 1, by: "Ff62…rN8k", at: "2026-09-15", ticker: "TIDE" },
  { address: "0x5cD0…11f9", chain: 2, by: "0x22aa…b0c1", at: "2026-09-14" },
];

/* ------------------------------------------------------------- Alerts */

/** §5. What the admin watches between reconstitutions: seats under the
 *  exit line, unscored seats under a death floor, and declared wallets
 *  selling. Derived from the seats so the figures agree with the list. */
export const ALERTS = {
  underExit: SEATS.filter((s) => s.score.total < Z500.exit && ["Merit", "External"].includes(s.route)).map(
    (s) => ({ ticker: s.ticker, score: s.score.total, weeks: 1 }),
  ),
  death: SEATS.filter(
    (s) =>
      !["Merit", "External"].includes(s.route) &&
      (s.inputs.volume < Z500.death.volume7dUsd || s.inputs.mcap < Z500.death.mcapUsd),
  ).map((s) => ({ ticker: s.ticker, volume: s.inputs.volume, mcap: s.inputs.mcap, weeks: 2 })),
  teamSells: [{ ticker: SEATS[4]?.ticker ?? "", share: 0.12, window: "7d" }].filter((a) => a.ticker),
};
