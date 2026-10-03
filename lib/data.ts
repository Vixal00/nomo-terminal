import { DEMO_WALLET, FORTRESS } from "./spec";

/**
 * Static mock data. No backend — every figure here is illustrative and is
 * labelled as such in the UI. Real numbers must come from on-chain reads
 * before any of this ships publicly.
 */

export const TOKEN = {
  name: "The Black Bull",
  ticker: "ANSEM",
  chain: "Solana",
  program: "Token-2022",
  mint: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
  supply: "1,000,000,000",
  launchpad: "Pump.fun",
};

/** Hero artwork. Named here rather than inline because two heroes render
 *  it and the uploaded filename is a hash: one constant is the difference
 *  between swapping art in a line and grepping for a UUID. */
export const HERO_ART = "/art/bgimg.jpg";

/** The leaderboard's banner. Named here for the same reason HERO_ART is:
 *  the uploaded filename is a hash, and one constant is the difference
 *  between swapping art in a line and grepping for a UUID. */
export const LEADERBOARD_ART =
  "/art/hf_20260807_150219_ce9130ad-61de-4e00-8ebd-c877c953700b.jpg";

/** Named here because the generated filename says nothing at the call
 *  site, and the FAQ should not have to carry a uuid to draw a picture. */
export const FAQ_ART =
  "/art/hf_20260806_184353_522174a3-166d-4e37-ad42-f768fdb771f1.png";

/** Pulled out of the list below because two places now need the account
 *  itself rather than a row in a footer: the masthead's X button and the
 *  timeline on an unlocked coin page. Declared once so the handle and the
 *  URL cannot drift apart. */
export const X_ACCOUNT = {
  label: "X / Twitter",
  value: "@BlackBullSol",
  href: "https://x.com/blackbullsol",
};

export const OFFICIAL_LINKS = [
  X_ACCOUNT,
  { label: "Website", value: "blackbullsol.com", href: "https://www.blackbullsol.com/" },
  { label: "Launch", value: "ansem.deployr.meme", href: "https://ansem.deployr.meme/launch" },
];

/** The account's last five posts, for the timeline on an unlocked coin
 *  page.
 *
 *  Written, not fetched. Reading a timeline needs an API key and a
 *  server to hold it, and this build has neither — so these are
 *  placeholders like every figure on the site, and the notice each page
 *  carries covers them.
 *
 *  Every unlocked coin shows this one account for now. A coin's own
 *  handle is already collected on the create form, so the swap is a
 *  field away once there is something to read it with. */
export const LATEST_TWEETS: {
  when: string;
  body: string;
  /** An attached picture, on the posts that have one.
   *
   *  Optional rather than required, and most do not: a timeline where
   *  every row carries an image is a gallery, and the two that do carry
   *  one stop standing out. Cropped to a single wide shape whichever
   *  way the source is oriented, because a column of pictures at four
   *  different heights reads as a broken layout rather than as
   *  variety — `position` is how a portrait keeps its subject inside
   *  that crop. */
  image?: { src: string; alt: string; position?: string };
}[] = [
  {
    when: "2h",
    body: "Diamond queue is open for the week. Every submission gets a call with a person, not a form reply.",
    image: {
      src: "/art/index5.jpg",
      alt: "The black bull under a constellation of green nodes, each one wired back to it.",
    },
  },
  {
    when: "9h",
    body: "Burn totals decide which tiers a wallet can reach. Nothing else does — no allowlist, no application, no discretion.",
  },
  {
    when: "1d",
    body: "The community airdrop is bought in the same transaction that creates the coin. It cannot be skipped and it cannot be topped up later.",
    image: {
      src: "/art/airdrop34.jpg",
      alt: "Supply crates coming down under parachutes over a bull on a ridge.",
      /* The source is a 3:4 portrait and the crop is 2:1, so it keeps
         37% of the height. Centred, that band is empty sky; at 46% it
         holds the lowest crate and the bull's horns. */
      position: "50% 46%",
    },
  },
  {
    when: "2d",
    body: "Reminder: we will never DM you first, and we will never ask you to connect a wallet to claim anything. Check the domain before you sign.",
  },
  {
    when: "4d",
    body: "Team supply is declared at launch and visible on Solana from the first block. If a page will not tell you where the supply is, that is the answer.",
  },
];

export const TICKER_ITEMS = [
  { k: "ANSEM", v: "$0.02471", d: +8.2 },
  { k: "TVL", v: "$4.82M", d: +6.4 },
  { k: "bbINDEX NAV", v: "$1.0374", d: +0.9 },
  { k: "7D FEES", v: "$118.4K", d: +12.1 },
  { k: "BUYBACKS", v: "$23.7K", d: +4.4 },
  { k: "HOLDERS", v: "143,204", d: +1.8 },
  { k: "PODS LIVE", v: "4", d: 0 },
];

/** The two prices the fixed end of the status strip carries when nobody
 *  is connected: the chain's own asset and this site's token. Ordered
 *  left to right, which puts $ANSEM at the far right — the last thing
 *  read on the line is the one this site is about.
 *
 *  A visitor has no holdings to report, and a strip that says "Holdings"
 *  to someone without a wallet is reporting on nothing. */
/** What a connected wallet's crawl can be pointed at.
 *
 *  Ticker lists rather than rows of their own: every figure still comes
 *  from COINS, so a coin cannot quote one price on the strip and another
 *  on its own page. `size` is the position, which is the one thing the
 *  book knows that the index does not.
 */
export const DEMO_POSITIONS: {
  ticker: string;
  size: string;
  /** The same figure as a number. Carried rather than parsed back out of
   *  the string: "$3.18K" is a thing to read, not a thing to compute
   *  with, and a panel that divides a display string by a price is one
   *  formatting change away from being wrong. */
  usd: number;
  /** What went in and what has come out, in dollars, so the trading
   *  view can state a position as four figures — invested, sold, what
   *  is left, and the difference — rather than one. The profile's
   *  PNL for these five reads off the same two numbers. */
  invested: number;
  sold: number;
}[] = [
  { ticker: "HORNET", size: "$3.18K", usd: 3180, invested: 1850, sold: 620 },
  { ticker: "NGHT", size: "$980", usd: 980, invested: 1200, sold: 0 },
  { ticker: "RONIN", size: "$412", usd: 412, invested: 300, sold: 150 },
  { ticker: "QRTZ", size: "$255", usd: 255, invested: 400, sold: 0 },
  { ticker: "SOLST", size: "$96", usd: 96, invested: 60, sold: 0 },
];

export type Position = { usd: number; invested: number; sold: number };

/** A position in any coin, for the trading view and the sell side of
 *  its panel. The five the book carries are the book's; every other
 *  coin gets one seeded from its ticker, so the same coin shows the
 *  same figures on every visit. The owner's call for the prototype:
 *  a strip of four dashes on nine coins in ten read as a screen that
 *  had not been built rather than a wallet that had not bought, and
 *  the design has to be judged with numbers in it. The profile and the
 *  status tape still print only the five; they are the wallet's own
 *  page and stay at what it holds. */
export function demoPosition(ticker: string): Position {
  const held = DEMO_POSITIONS.find((p) => p.ticker === ticker);
  if (held) return { usd: held.usd, invested: held.invested, sold: held.sold };
  let seed = [...ticker].reduce((a, c) => a * 31 + c.charCodeAt(0), 0x2545) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Sizes on a log scale, like everything else on this launchpad: most
  // positions are small and a few are not. About half have sold some;
  // what is left has moved anywhere from a 60% loss to a triple.
  const invested = Math.round(Math.pow(10, 1.6 + rand() * 2.6));
  const sold = rand() < 0.5 ? Math.round(invested * rand() * 0.8) : 0;
  const usd = Math.round(invested * (0.4 + rand() * 2.6) - sold * 0.5);
  return { usd: Math.max(usd, 5), invested, sold };
}

export const DEMO_WATCHLIST = [
  "OBSD",
  "EMBER",
  "PYLON",
  "DRIFT",
  "KSTRL",
  "CINDR",
  "LNTRN",
];

/** Where the connected wallet stands on each board, and how many
 *  wallets are on it.
 *
 *  The visible roster here is fourteen. A real board is thousands, and
 *  "11th of 14" reads as a rounding error rather than as a position —
 *  so the row that appears under the top ten reports these instead.
 *  They stand in for a query against the index, which is the only thing
 *  that can answer where an address sits among everyone.
 *
 *  Only read when the wallet is not already in the ten above it. */
export const DEMO_STANDING: Record<string, { rank: number; of: number }> = {
  Burners: { rank: 263, of: 2847 },
  Creators: { rank: 41, of: 2847 },
  Traders: { rank: 1094, of: 2847 },
};

/** The strip's prices, and what a wallet is worth.
 *
 *  Invented, like everything else in this file. SOL and ETH are the
 *  settlement unit of one network each — what a balance on that network
 *  is denominated in and what the strip prices — and $ANSEM is the
 *  platform's own, which shows on both because the token does not
 *  change when the chain does.
 *
 *  ETH replaces a HOOD row that was here briefly. HOOD is Robinhood's
 *  listed equity ticker, which is not what a balance on its chain is
 *  held in; the chain settles in ether like the rest of that lineage,
 *  and a stock price printed beside a wallet balance was inviting a
 *  reading nobody meant. */
export const SPOT = [
  { k: "SOL", v: "$186.42", usd: 186.42, d: +2.4 },
  { k: "ETH", v: "$4,318.60", usd: 4318.6, d: +1.9 },
  /* A dollar stablecoin, so the price is the peg and the move is zero.
     It is here to be priced against, not to be shown in the strip —
     nothing quotes a stablecoin at people. */
  { k: "USDG", v: "$1.00", usd: 1, d: 0 },
  { k: "ANSEM", v: "$0.02471", usd: 0.02471, d: +8.2 },
] as const;

/** A coin's price as a number.
 *
 *  The roster stores it as the string it is displayed as, because that
 *  is what every table on this site renders. One place converts it, so
 *  the panels that need arithmetic all agree. */
export function coinPriceUsd(price: string) {
  return Number(price.replace(/[^0-9.]/g, "")) || 0;
}

export type Pod = {
  id: string;
  pair: string;
  kind: "Genesis" | "Stable" | "Satellite";
  tvl: string;
  apr: string;
  fees7d: string;
  depositors: number;
  utilisation: number;
  status: "Live" | "Seeding" | "Queued";
};

export const PODS: Pod[] = [
  {
    id: "genesis",
    pair: "ANSEM / SOL",
    kind: "Genesis",
    tvl: "$2,940,000",
    apr: "41.2%",
    fees7d: "$71,300",
    depositors: 1287,
    utilisation: 82,
    status: "Live",
  },
  {
    id: "stable",
    pair: "ANSEM / USDC",
    kind: "Stable",
    tvl: "$1,180,000",
    apr: "26.8%",
    fees7d: "$31,900",
    depositors: 604,
    utilisation: 67,
    status: "Live",
  },
  {
    id: "sol-usdc",
    pair: "SOL / USDC",
    kind: "Satellite",
    tvl: "$612,000",
    apr: "14.1%",
    fees7d: "$12,400",
    depositors: 221,
    utilisation: 44,
    status: "Live",
  },
  {
    id: "deployment-02",
    pair: "TBD / SOL",
    kind: "Satellite",
    tvl: "-",
    apr: "-",
    fees7d: "-",
    depositors: 0,
    utilisation: 0,
    status: "Queued",
  },
];

export const BASKET = [
  { asset: "SOL", weight: 54, amount: "182.44", usd: "$41,208" },
  { asset: "USDC", weight: 31, amount: "23,655.10", usd: "$23,655" },
  { asset: "ANSEM", weight: 11, amount: "339,204", usd: "$8,382" },
  { asset: "JitoSOL", weight: 4, amount: "12.90", usd: "$3,051" },
];

export const RADAR = [
  { sym: "ANSEM", name: "The Black Bull", mc: "$24.7M", vol: "$3.11M", d: +8.2, age: "47d", pod: true },
  { sym: "SOL", name: "Solana", mc: "$112.4B", vol: "$2.84B", d: +2.1, age: "-", pod: true },
  { sym: "BONK", name: "Bonk", mc: "$1.92B", vol: "$184M", d: -1.4, age: "-", pod: false },
  { sym: "WIF", name: "dogwifhat", mc: "$1.11B", vol: "$96.2M", d: +4.7, age: "-", pod: false },
  { sym: "PNUT", name: "Peanut", mc: "$284M", vol: "$41.8M", d: -3.2, age: "-", pod: false },
  { sym: "MEW", name: "cat in a dogs world", mc: "$196M", vol: "$18.3M", d: +1.1, age: "-", pod: false },
];

/* ------------------------------------------------------------------
   Launchpad surface. Figures are deliberately small and messy — a new
   launchpad with one coin on the curve reads as honest, where round
   headline numbers read as invented.
------------------------------------------------------------------- */

export type Tier = "Free" | "Fortress" | "Diamond";

export const TIERS: {
  id: Tier;
  burn: string;
  blurb: string;
  detail: string;
}[] = [
  /* Copy follows lib/spec.ts. The middle rung is Fortress, a curve
     rather than a burn (decision, September 2026); Free is stated as a
     complete product, because nothing is withheld at Free. */
  {
    id: "Free",
    burn: "0",
    blurb: "Open to everyone",
    detail:
      "Create a coin in minutes, with the standard community-airdrop buy included.",
  },
  {
    id: "Fortress",
    burn: "0",
    blurb: "The deep curve",
    detail:
      "Opens at a $100K market cap and graduates at $1M, after 2,740 SOL.",
  },
  {
    id: "Diamond",
    burn: "5",
    blurb: "Burn 5 $ANSEM · reviewed",
    detail:
      "The largest burn, plus a submission the team reviews personally before launch day.",
  },
];

export const COIN_FILTERS = [
  "All",
  "On curve",
  "Migrated",
  "Free",
  "Fortress",
  "Diamond",
] as const;

export type Coin = {
  name: string;
  ticker: string;
  tier: Tier;
  price: string;
  mc: string;
  age: string;
  txns: number;
  volume: string;
  d24: number | null;
  airdropped: string;
  curve: number;
  migrated: boolean;
  creator: string;
};

/** `t` is the one real launch and stays first at its real figures. The
 *  rest are placeholder rows for layout review — every screen carries the
 *  MockNotice for exactly this reason. Numbers are deliberately uneven;
 *  a roster of round market caps reads as invented at a glance. */
const CURATED: Coin[] = [
  { name: "t", ticker: "T", tier: "Free", price: "$0.00000206", mc: "$2.1K", age: "5d 7h", txns: 1, volume: "$3.63", d24: null, airdropped: "-", curve: 0, migrated: false, creator: "53RY…iJSg" },
  { name: "hornet", ticker: "HORNET", tier: "Diamond", price: "$0.00041827", mc: "$418.3K", age: "3w 2d", txns: 25412, volume: "$96.4K", d24: 42.7, airdropped: "$11.2K", curve: 100, migrated: true, creator: "8vQm…4Wpx" },
  { name: "obsidian", ticker: "OBSD", tier: "Diamond", price: "$0.00019544", mc: "$195.4K", age: "5w 4d", txns: 16588, volume: "$54.8K", d24: -12.4, airdropped: "$6.44K", curve: 100, migrated: true, creator: "Ldc7…9tRn" },
  /* Same creator as hornet, and not by accident: these are the two
     launches the demo wallet owns, and My projects lists them as its
     own. A coin page crediting a wallet the projects page says is
     yours to somebody else is the kind of thing nobody notices until
     they do. */
  { name: "nightwatch", ticker: "NGHT", tier: "Free", price: "$0.00008812", mc: "$88.1K", age: "18h 41m", txns: 9047, volume: "$27.3K", d24: 71.9, airdropped: "-", curve: 74, migrated: false, creator: "8vQm…4Wpx" },
  { name: "ronin", ticker: "RONIN", tier: "Free", price: "$0.00006193", mc: "$61.9K", age: "1d 6h", txns: 6731, volume: "$18.7K", d24: 8.3, airdropped: "-", curve: 61, migrated: false, creator: "Qw41…7fLd" },
  { name: "emberfall", ticker: "EMBER", tier: "Free", price: "$0.00004470", mc: "$44.7K", age: "9h 22m", txns: 4926, volume: "$14.1K", d24: -23.8, airdropped: "-", curve: 47, migrated: false, creator: "Zx9c…Ht3v" },
  { name: "quartzcat", ticker: "QRTZ", tier: "Free", price: "$0.00003318", mc: "$33.2K", age: "2d 3h", txns: 3981, volume: "$9.86K", d24: 15.2, airdropped: "-", curve: 38, migrated: false, creator: "Ff62…rN8k" },
  { name: "solstice", ticker: "SOLST", tier: "Free", price: "$0.00002904", mc: "$29.0K", age: "7h 8m", txns: 3286, volume: "$7.72K", d24: 34.6, airdropped: "-", curve: 31, migrated: false, creator: "Mn05…wY6q" },
  { name: "driftwood", ticker: "DRIFT", tier: "Free", price: "$0.00002177", mc: "$21.8K", age: "3d 19h", txns: 2447, volume: "$5.41K", d24: -6.1, airdropped: "-", curve: 24, migrated: false, creator: "Tb88…kJ1a" },
  { name: "kestrel", ticker: "KSTRL", tier: "Free", price: "$0.00001648", mc: "$16.5K", age: "1d 11h", txns: 1973, volume: "$4.09K", d24: 3.4, airdropped: "-", curve: 19, migrated: false, creator: "Ry37…pQ9s" },
  { name: "lanterndao", ticker: "LNTRN", tier: "Free", price: "$0.00001192", mc: "$11.9K", age: "12h 55m", txns: 1344, volume: "$2.88K", d24: -18.7, airdropped: "-", curve: 14, migrated: false, creator: "Vc16…dE4u" },
  { name: "pylon", ticker: "PYLON", tier: "Free", price: "$0.00000934", mc: "$9.34K", age: "5h 31m", txns: 968, volume: "$1.96K", d24: 27.1, airdropped: "-", curve: 11, migrated: false, creator: "Jh72…nS5g" },
  { name: "tremorsol", ticker: "TREMR", tier: "Free", price: "$0.00000718", mc: "$7.18K", age: "22h 4m", txns: 703, volume: "$1.13K", d24: -9.9, airdropped: "-", curve: 8, migrated: false, creator: "Ws29…bK7m" },
  { name: "cinderx", ticker: "CINDR", tier: "Free", price: "$0.00000455", mc: "$4.55K", age: "3h 47m", txns: 431, volume: "$742", d24: 11.8, airdropped: "-", curve: 5, migrated: false, creator: "Ap63…zL2j" },
  { name: "husk22", ticker: "HUSK", tier: "Free", price: "$0.00000311", mc: "$3.11K", age: "1h 12m", txns: 214, volume: "$318", d24: -4.2, airdropped: "-", curve: 3, migrated: false, creator: "Gk90…vC8r" },
  { name: "ozoneprime", ticker: "OZONE", tier: "Free", price: "$0.00000229", mc: "$2.29K", age: "26m", txns: 38, volume: "$104", d24: null, airdropped: "-", curve: 1, migrated: false, creator: "Nd54…xT3p" },
];


/** Protocol counters. Stored as numbers with a formatter and a per-tick
 *  step, so the live ticker can increment them without parsing strings
 *  back out of display copy.
 *
 *  These are all-time cumulative figures. The Explore feed and Z500 show
 *  the current page of the roster, which is why "16 of 16" there does not
 *  contradict the launch count here. */
export type Stat = {
  id: string;
  label: string;
  icon: string;
  value: number;
  kind: "int" | "usd" | "token";
  hint: string;
  /** Inclusive range added on each tick. Every metric's floor is large
   *  enough to shift the formatted string, otherwise a tick lands with
   *  nothing visibly happening and the counter reads as broken. */
  step: [number, number];
  /** Inclusive millisecond range between ticks. */
  period: [number, number];
  /** Milliseconds before the first tick. Metrics that move at a similar
   *  rate are given opposing phases so they alternate instead of firing
   *  together. */
  phase: number;
};

export const LEADERBOARD_STATS: Stat[] = [
  /* Launches and volume run on the same cadence half a period apart, so
     the eye catches one, then the other, rather than both jumping at
     once. Airdrops are deliberately rare: they only happen when a launch
     completes its curve, so a payout every few seconds would contradict
     the migration count sitting next to it. */
  {
    id: "launched",
    label: "Projects launched",
    icon: "rocket",
    value: 28417,
    kind: "int",
    hint: "All time, across every tier",
    step: [1, 3],
    period: [4600, 5400],
    phase: 900,
  },
  {
    id: "airdropped",
    label: "Airdropped to stakers",
    icon: "gift",
    value: 1846200,
    kind: "usd",
    hint: "Distributed at migration",
    /* Displayed to two decimals of a million, so anything under 10,000
       moves the number without moving the text. */
    step: [12000, 28000],
    period: [62000, 108000],
    phase: 21000,
  },
  {
    id: "volume",
    label: "Volume traded",
    icon: "chart",
    value: 41283000,
    kind: "usd",
    hint: "Across the curve and after",
    step: [11000, 30000],
    period: [4600, 5400],
    phase: 3400,
  },
  {
    id: "migrated",
    label: "Migrated coins",
    icon: "swap",
    value: 3164,
    kind: "int",
    hint: "Completed the curve",
    step: [1, 2],
    period: [26000, 44000],
    phase: 8000,
  },
  {
    id: "burned",
    label: "$ANSEM burned",
    icon: "fire",
    value: 94812,
    kind: "token",
    hint: "Removed by tier burns",
    step: [1, 9],
    period: [7000, 11000],
    phase: 2200,
  },
  {
    id: "stakers",
    label: "Active stakers",
    icon: "users",
    value: 12470,
    kind: "int",
    hint: "Wallets earning allocation",
    step: [1, 3],
    period: [13000, 21000],
    phase: 5600,
  },
];

export const TOP_AIRDROPS = [
  { rank: 1, staker: "8vQm…4Wpx", airdropped: "$6.71K", launches: 3, burned: "11 $ANSEM" },
  { rank: 2, staker: "Ldc7…9tRn", airdropped: "$4.02K", launches: 2, burned: "7 $ANSEM" },
  { rank: 3, staker: "Qw41…7fLd", airdropped: "$2.88K", launches: 4, burned: "6 $ANSEM" },
  { rank: 4, staker: "3Kpz…mB2e", airdropped: "$1.94K", launches: 1, burned: "5 $ANSEM" },
  { rank: 5, staker: "Zx9c…Ht3v", airdropped: "$1.13K", launches: 2, burned: "3 $ANSEM" },
  { rank: 6, staker: "Ff62…rN8k", airdropped: "$614", launches: 1, burned: "2 $ANSEM" },
  { rank: 7, staker: "Mn05…wY6q", airdropped: "$287", launches: 1, burned: "1 $ANSEM" },
];

/** `external` entries leave the site, so the nav renders them as plain
 *  anchors with the usual target and rel rather than as router links.
 *
 *  `auth` entries are yours rather than the platform's, and only appear
 *  once a wallet is connected. Showing "My projects" to a visitor with no
 *  wallet promises a page that cannot exist for them yet. */
export const NAV_UNITS: {
  href: string;
  label: string;
  unit: string;
  external?: boolean;
  auth?: boolean;
  /** Narrows an entry to one side of the platform. The last slot is the
   *  same slot for both — what belongs there is your own shelf if you
   *  arrived to launch, and the review queue if you are the one deciding
   *  whose launches go through. Two labels in one place rather than two
   *  places, because they are the same answer to "what is mine here". */
  role?: "user" | "admin";
  /** Belongs to the first network. Same flag the footer and the wallet
   *  menu carry, and the nav spends it the same way — as a class the
   *  cascade acts on, not a filter React runs, because the nav is drawn
   *  before the provider has read which network this is. */
  only1?: boolean;
}[] = [
  { href: "/", label: "Home", unit: "00" },
  { href: "/z500", label: "Z500", unit: "01" },
  { href: "/leaderboard", label: "Leaderboard", unit: "02" },
  { href: "/airdrop", label: "Airdrop", unit: "03" },
  { href: "/swap", label: "Swap", unit: "04", only1: true },
  { href: "/terminal", label: "Terminal", unit: "05" },
  { href: "/projects", label: "My projects", unit: "06", auth: true, role: "user" },
  { href: "/dashboard", label: "Dashboard", unit: "06", auth: true, role: "admin" },
];

/** The trading terminal, which is somebody else's product.
 *
 *  It used to sit in the nav as "Trading Terminal", which was both the
 *  widest label in the row and a promise the nav could not keep: every
 *  other entry there is a page of this site. As Bullpen's own mark in
 *  the utility cluster it says whose product it is before the click, and
 *  the leaving panel still stands between the reader and the departure.
 */
export const TERMINAL = {
  href: "https://app.bullpen.fi/token/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
  label: "Trading terminal on Bullpen",
};

/* ------------------------------------------------------------------
   Terminal feed vocabulary. Fragments rather than finished names — the
   generator assembles them so the stream never visibly repeats.
------------------------------------------------------------------- */

export const FEED_WORDS = [
  "bull", "horn", "ember", "static", "vapor", "midnight", "neon", "ronin",
  "phantom", "cascade", "obsidian", "tremor", "halo", "drift", "ozone",
  "cinder", "monsoon", "kestrel", "vertex", "lantern", "grit", "wraith",
  "aurora", "torque", "husk", "pylon", "solstice", "brim", "onyx", "quartz",
];

export const FEED_SUFFIX = [
  "", "", "", "sol", "inu", "cat", "dao", "fi", "x", "22", "prime",
];

/* ------------------------------------------------------------------
   Roster depth.

   The curated rows above are hand-written and stay first, `t` included,
   because they are the ones whose figures were chosen to look plausible
   next to each other. Everything after them is generated.

   The reason is the grid. An index is a wall of coins, and a feed with
   sixteen entries in it reads as a demo of a feed rather than as one:
   the filters have nothing to filter, the density the layout is built
   for never appears, and the page argues against its own headline about
   28,000 launches. Seventy-eight avatars arrived, so the roster goes to
   the same number and every card gets its own picture.

   Deterministic, from a seed, so a coin keeps its name, its figures and
   its artwork across filters, views, reloads and rebuilds. A roster that
   reshuffled on every render would break the one thing this page is
   supposed to demonstrate, which is that the same coin is the same coin
   wherever you meet it.
------------------------------------------------------------------- */

/** An age from three draws — the same three whichever branch is taken,
 *  so adding the migrated case did not shift the seeded sequence for
 *  every coin after it and redeal the roster. */
function ageOf(migrated: boolean, short: boolean, a: number, b: number) {
  // A few migrated coins are days past the curve rather than weeks:
  // past the 72-hour grace, seated at the latest reconstitution.
  if (migrated && a < 0.14) return `${4 + Math.floor(b * 5)}d ${Math.floor(a * 150) % 24}h`;
  if (migrated) return `${Math.floor(a * 12) + 1}w ${Math.floor(b * 6)}d`;
  return short
    ? `${Math.floor(a * 23) + 1}h ${Math.floor(b * 59)}m`
    : `${Math.floor(a * 6) + 1}d ${Math.floor(b * 23)}h`;
}

function rosterFill(count: number): Coin[] {
  let seed = 0x9e3779b9;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
  const tiers: Tier[] = ["Free", "Free", "Free", "Fortress", "Fortress", "Diamond"];
  const b58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const wallet = () => {
    let a = "", b = "";
    for (let i = 0; i < 4; i++) a += b58[Math.floor(rand() * b58.length)];
    for (let i = 0; i < 4; i++) b += b58[Math.floor(rand() * b58.length)];
    return `${a}\u2026${b}`;
  };

  const out: Coin[] = [];
  const used = new Set(CURATED.map((c) => c.ticker));

  for (let i = 0; i < count; i++) {
    const word = pick(FEED_WORDS);
    const name = rand() < 0.45 ? `${word}${pick(FEED_SUFFIX)}` : word;
    let ticker = name.slice(0, 5).toUpperCase();
    /* 33, not 34. b58 drops I and O, so its digits and capitals run to
       index 32 and reaching one further picks up the first lowercase
       letter — which is how "$DRIFTa" ended up on the roster. Tickers
       are uppercase everywhere else on this site. */
    while (used.has(ticker)) ticker = ticker + b58[Math.floor(rand() * 33)];
    used.add(ticker);

    /* Market caps run on a log scale. Sampling linearly would put most of
       the roster in the same order of magnitude, and the whole shape of a
       launchpad is that almost everything is small and a few are not. */
    const mc = Math.round(Math.pow(10, 3.2 + rand() * 3.1));
    const migrated = mc > 260_000 && rand() < 0.7;
    const curve = migrated ? 100 : Math.max(1, Math.round(Math.pow(rand(), 1.5) * 96));
    const price = mc / 1_000_000_000;
    const vol = Math.round(mc * (0.08 + rand() * 0.55));
    /* Three to thirteen dollars a trade. It was eighteen to eighty-eight,
       which is a size memecoin volume does not come in: a curve is
       filled by hundreds of small buys, not dozens of large ones, and
       the counts it produced read as a dead market beside the volume
       they were meant to explain. The curated rows above were rescaled
       by the same factor so the two halves of the roster agree. */
    const txns = Math.max(1, Math.round(vol / (3 + rand() * 10)));

    /* Drawn here, where the literal used to draw it, so the sequence of
       draws — and with it every ticker on the roster — is unchanged.
       A Fortress launch opens at $100K and graduates at $1M, so the
       pick only stands where the cap allows it: on the curve from
       $100K up, or past it from $1M up. Anywhere else the coin is Free,
       and a Fortress coin on the curve reads its progress off that
       curve rather than the standard one. */
    const picked = pick(tiers);
    const tier: Tier =
      picked !== "Fortress"
        ? picked
        : mc >= (migrated ? FORTRESS.graduateMcapUsd : FORTRESS.openMcapUsd)
          ? "Fortress"
          : "Free";
    const curveOut =
      tier === "Fortress" && !migrated
        ? Math.max(
            1,
            Math.round(
              ((mc - FORTRESS.openMcapUsd) / (FORTRESS.graduateMcapUsd - FORTRESS.openMcapUsd)) * 100,
            ),
          )
        : curve;

    out.push({
      name,
      ticker,
      tier,
      price: `$${price.toFixed(8)}`,
      mc: money(mc),
      /* A migrated coin is weeks old, not hours. It has filled a curve,
         left it, and — for the index — sat out a 72-hour grace and been
         scored at a reconstitution or two; "6h 24m" beside a completed
         curve was two facts that could not both hold. The Z500's
         weeks-seated and staying-power figures read off this age, so
         the roster and the index agree by construction. */
      age: ageOf(migrated, rand() < 0.5, rand(), rand()),
      txns,
      volume: money(vol),
      // A fresh launch has no 24h figure yet, and the table has to cope
      // with that rather than inventing one.
      d24: rand() < 0.06 ? null : Math.round((rand() * 160 - 55) * 10) / 10,
      airdropped: migrated ? money(Math.round(mc * 0.026)) : "-",
      curve: curveOut,
      migrated,
      creator: wallet(),
    });
  }
  return out;
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return `$${n}`;
}

/** One entry per avatar in the pool, so no card repeats a picture. */
export const COINS: Coin[] = [...CURATED, ...rosterFill(62)];

/* ------------------------------------------------------------- Airdrops */

/** One launch's allocation to the connected wallet.
 *
 *  A list rather than a single figure, because that is the shape of the
 *  thing: allocation is earned per launch, weighted by what was burned
 *  against that launch's tier, and lands when that launch completes its
 *  curve. A wallet that was in four completed launches is owed four
 *  separate amounts in four separate coins, and one "Claim" button over
 *  a summed dollar value would be describing a transaction that cannot
 *  exist.
 */
export type Allocation = {
  ticker: string;
  name: string;
  /** Tokens owed, in the launched coin. */
  tokens: number;
  /** What one of those tokens is worth. Only read for launches that
   *  have already left the feed — a coin still on the roster takes its
   *  price from COINS, so a claim row cannot quote a figure the coin's
   *  own page disagrees with. */
  price: number;
  /** When the curve completed. */
  when: string;
};

/** Only completed curves appear here: an allocation against a launch
 *  still on the bonding curve is not claimable yet, so it would be a row
 *  with nothing to press. The two roster coins that migrated are here;
 *  the other two are older launches, which is why they are no longer on
 *  the feed. */
export const DEMO_AIRDROPS: Allocation[] = [
  { ticker: "HORNET", name: "hornet", tokens: 1_240_000, price: 0.00041827, when: "2d ago" },
  { ticker: "OBSD", name: "obsidian", tokens: 2_860_000, price: 0.00019544, when: "4d ago" },
  { ticker: "VLTG", name: "voltage", tokens: 8_400_000, price: 0.00004120, when: "11d ago" },
  { ticker: "MRSH", name: "marshland", tokens: 15_600_000, price: 0.00001185, when: "18d ago" },
  { ticker: "ARCL", name: "arclight", tokens: 6_200_000, price: 0.00002740, when: "23d ago" },
  { ticker: "TIDE", name: "tidepool", tokens: 22_400_000, price: 0.00000642, when: "29d ago" },
  { ticker: "GLYPH", name: "glyphwork", tokens: 4_900_000, price: 0.00002215, when: "34d ago" },
  { ticker: "CRVD", name: "corvid", tokens: 31_000_000, price: 0.00000318, when: "41d ago" },
  { ticker: "PLNK", name: "plinth", tokens: 12_700_000, price: 0.00000774, when: "52d ago" },
];

/** What an allocation is worth, in dollars. */
export function allocationUsd(a: Allocation) {
  const coin = COINS.find((c) => c.ticker === a.ticker);
  return a.tokens * (coin ? coinPriceUsd(coin.price) : a.price);
}

/* ------------------------------------------------------------------
   Deterministic price series for the detail sparkline. Seeded from the
   ticker so a coin's chart is identical on the server and the client and
   stable across reloads: a chart that reshuffles on every render reads as
   broken rather than live.
------------------------------------------------------------------- */
export function priceSeries(ticker: string, points = 64): number[] {
  let seed = [...ticker].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    // Drift plus noise, clamped, so the line wanders without escaping.
    v += (rand() - 0.46) * 9;
    v = Math.max(6, Math.min(94, v));
    out.push(v);
  }
  return out;
}

export const TIMEFRAMES = ["1H", "1D", "1W", "1M", "1Y", "All"] as const;

/* ------------------------------------------------------------------
   Token detail helpers. The launch page shows a mint, a supply story
   and a holder split for every coin; only `t` has real values, so the
   rest are derived deterministically from the ticker and stay stable
   across rebuilds rather than shuffling on every render.
------------------------------------------------------------------- */

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Real mint for the one real launch, deterministic placeholder for the
 *  rest. Placeholders keep the `pump` suffix so they read as the same
 *  family of address without pretending to resolve. */
export function coinMint(ticker: string): string {
  if (ticker === "T") return "2AMzTtggrA46aAFLRSDSxM4GfXZPKuDQmanunGZmGFXP";
  let s = 0;
  for (const ch of ticker) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  let out = "";
  for (let i = 0; i < 40; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out += B58[s % B58.length];
  }
  return out + "pump";
}

/** Supply and airdrop commitments, which the tier decides. */
export function coinTerms(coin: Coin) {
  const free = coin.tier === "Free";
  return {
    about: coin.name,
    teamSupply: free
      ? "None declared."
      : `Declared at launch and held in the creator wallet, visible on ${TOKEN.chain}.`,
    holderAirdrop: free
      ? `Free tier, no declared airdrop share.`
      : `${coin.tier} tier. ${
          coin.airdropped === "-"
            ? "Allocation opens when the curve completes."
            : `${coin.airdropped} distributed so far.`
        }`,
  };
}

/** Where the supply sits. Before migration the curve holds all of it;
 *  after, it is split across the pool and the wallets that bought in. */
export function holderSplit(coin: Coin): { label: string; pct: number }[] {
  if (!coin.migrated) {
    return [
      { label: "Bonding curve", pct: 100 - coin.curve },
      ...(coin.curve > 0 ? [{ label: "Holders", pct: coin.curve }] : []),
    ];
  }
  let s = 0;
  for (const ch of coin.ticker) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const top = 4 + (s % 7);
  const lp = 38 + (s % 11);
  return [
    { label: "Liquidity pool", pct: lp },
    { label: "Top holder", pct: top },
    { label: "Everyone else", pct: 100 - lp - top },
  ];
}

/* ------------------------------------------------------------------
   The thesis. Three explainers that answer "what is this" for someone
   landing on the index cold. Source copy used em dashes throughout;
   rewritten here without them to match the rest of the site.
------------------------------------------------------------------- */

export type Explainer = {
  id: string;
  label: string;
  title: string;
  body: string[];
  /** Optional pull quote, set apart from the body. */
  quote?: string;
  /** Optional figures rendered as a row of readings. */
  figures?: { value: string; label: string }[];
  /** Optional closing line, set smaller than the body. */
  coda?: string;
  /** `only1` marks a call to action whose destination exists on the
   *  first network only. The class hides it elsewhere. */
  cta?: { label: string; href: string; only1?: boolean };
};

export const EXPLAINERS: Explainer[] = [
  {
    id: "what",
    label: "What is Z500",
    title: "What is Z500?",
    body: [
      "An index of live tokens whose seats cannot be bought. A seat is earned by completing a launch track on Ansem.io, by clearing a published score at a weekly reconstitution, or by passing review as a token launched anywhere on Solana or Robinhood Chain.",
      "Seats are backed by platform revenue. Every week $ANSEM holders vote a seated token into a buyback funded from a fixed share of revenue, and the purchased tokens go to new traders and to the voters. The index has five hundred seats and runs mostly empty, because the score, not the capacity, decides membership.",
    ],
    quote: "Seats are earned on market cap, volume, holders, and history, and re-scored every week.",
    coda:
      "Every input is measured in dollars, wallets and days, so a pump.fun token and a Robinhood Chain token score on the same scale. Nothing waits longer than a week, nothing is penalized, and every wallet counts.",
  },
  {
    id: "problem",
    label: "The problem",
    title: "The problem",
    body: [
      "Launch curation is either paid placement, where rank is a function of spend, or editorial, where rank is a function of one account's attention. Both decay: paid rank is discounted by everyone who sees it, and editorial rank stops the moment the account stops posting.",
      "A seat does what an exchange listing does. It is broadcast in the weekly report and on the token's page. It is the only way to be bought, because the ballot is drawn from seats. And it is a credential that cannot be moved: it lives here and in the terminal, and cannot be exported, bought or transferred.",
    ],
    figures: [
      { value: "500", label: "Seats, mostly empty" },
      { value: "50", label: "The bar, on a 0 to 100 score" },
      { value: "20%", label: "Of revenue, at most, to buybacks" },
    ],
  },
  {
    id: "bagwork",
    label: "Proof of Bagwork",
    title: "Proof of Bagwork",
    body: [
      "Burn $ANSEM for early access to every launch's holder round before the public curve opens. It is the reward for generating attention and holding through it.",
      "Hold $ANSEM to vote: every thousand at the snapshot is one vote on the week's ballot, and the wallets that back the winner share the buyback equally.",
    ],
    cta: { label: "Burn $ANSEM", href: "/burn", only1: true },
  },
];

/* ------------------------------------------------------------------
   Burn surface.
------------------------------------------------------------------- */

export const BURN = {
  price: "$0.187",
  route: "Jupiter",
  wallet: "Community burn wallet",
  reasons: [
    "Counts toward the Diamond tier, permanently.",
    "Qualifies you for holder rounds and automatic airdrops from every launch.",
    "Every burn shrinks supply, recorded on-chain as proof of conviction.",
  ],
};

/* ------------------------------------------------------------------
   Boosts. Paid placement on the index, priced with a volume discount:
   5,000 costs 4 SOL rather than the 5 a flat rate would charge.
------------------------------------------------------------------- */

/** A boost tier, priced in each network's own settlement asset.
 *
 *  Two prices rather than one converted at render, because these are
 *  list prices: a launchpad publishes round numbers in the unit its
 *  buyers hold, and a figure divided out of a live rate would print
 *  0.00216 where 0.002 is what a price list says.
 *
 *  The ether column is set at the dollar value of the SOL column at the
 *  spot table's own rates, then rounded to something a price list would
 *  actually carry — within about a tenth of the SOL price at every rung,
 *  so the ladder costs the same on either network. */
export type BoostTier = { amount: number; sol: string; eth: string };

export const BOOST_TIERS: BoostTier[] = [
  { amount: 50, sol: "0.05", eth: "0.002" },
  { amount: 100, sol: "0.1", eth: "0.005" },
  { amount: 500, sol: "0.45", eth: "0.02" },
  { amount: 1000, sol: "0.85", eth: "0.04" },
  { amount: 5000, sol: "4", eth: "0.18" },
];

/** Second tier is the default. First reads as a token gesture and the
 *  last as a commitment nobody makes on a first pass. */
/* The enhanced page's price moved to lib/spec.ts, where it sits beside
   the launch discount. Two constants naming one price is how they end
   up disagreeing, and these two already did: 0.5 SOL here against the
   2 SOL the create form charges. */

export const BOOST_DEFAULT = 100;

/* ------------------------------------------------------------------
   Live boosts.

   docs: anyone can boost any listed coin, boosts stack while their
   windows overlap, and a boosted coin carries a visible badge with its
   active points. Points are what stacks, so the badge shows the sum
   rather than the largest single purchase.
------------------------------------------------------------------- */

export type Boost = { points: number; hoursLeft: number; buyers: number };

/** Derived from the ticker so a coin's boost holds across reloads and
 *  agrees with itself between the feed and its own page. */
export function coinBoost(ticker: string): Boost | null {
  let s = [...ticker].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7919) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // Most coins are not boosted at any given moment. A badge on every card
  // would say nothing.
  if (rand() > 0.28) return null;

  // Stacked from one to four purchases off the published ladder, which is
  // what makes the totals land between the tiers rather than on them.
  const buys = 1 + Math.floor(Math.pow(rand(), 1.7) * 4);
  let points = 0;
  for (let i = 0; i < buys; i++) {
    points += BOOST_TIERS[Math.floor(rand() * BOOST_TIERS.length)].amount;
  }
  return {
    points,
    hoursLeft: Math.max(1, Math.round(rand() * 24)),
    buyers: buys,
  };
}

export const BOOST_WINDOW = "24 hours";

/* ------------------------------------------------------------------
   The leaderboard's subject: wallets, not coins.

   docs: it ranks burners, creators and traders "so the people building
   the ecosystem are visible, not just the coins". The coins already have
   the Z500; a second coin ranking said nothing the index did not, and
   left the platform without a single screen that was about anyone.

   One roster serves all three boards, re-sorted per board, so a wallet
   near the top of one can be found in the others and the boards read as
   three views of a community rather than three unrelated lists.
------------------------------------------------------------------- */

export type Wallet = {
  handle: string;
  burned: number;
  launches: number;
  bestCap: string;
  airdropped: string;
  volume: number;
  trades: number;
  bestCall: string;
  since: string;
  /** How long ago this wallet last traded. A board that ranks by volume
   *  is ranking a rate, and a rate with no recency beside it cannot
   *  tell a wallet that stopped last year from one still going. */
  lastTrade: string;
};

export const WALLETS: Wallet[] = (() => {
  let s = 0x5f3759df;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const b58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const named = [
    "ansemconzimp", "formlesscrab", "latentfish", "nockchain", "vaporbyte",
    "obsidianhand", "kestrelcore", "driftoracle",
  ];
  const out: Wallet[] = [];
  for (let i = 0; i < 14; i++) {
    const handle =
      i < named.length && rand() < 0.75
        ? named[i]
        : (() => {
            let a = "", z = "";
            for (let k = 0; k < 4; k++) a += b58[Math.floor(rand() * b58.length)];
            for (let k = 0; k < 4; k++) z += b58[Math.floor(rand() * b58.length)];
            return `${a}\u2026${z}`;
          })();
    const burned = Math.round(Math.pow(10, 0.2 + rand() * 2.6) * 10) / 10;
    const launches = Math.floor(Math.pow(rand(), 1.6) * 24) + 1;
    const cap = Math.round(Math.pow(10, 4 + rand() * 2.4));
    const volume = Math.round(Math.pow(10, 3.6 + rand() * 2.9));
    out.push({
      handle,
      burned,
      launches,
      bestCap: cap >= 1e6 ? `$${(cap / 1e6).toFixed(2)}M` : `$${(cap / 1e3).toFixed(0)}K`,
      airdropped: `$${(Math.round(cap * 0.026) / 1000).toFixed(1)}K`,
      volume,
      trades: Math.max(3, Math.round(volume / (40 + rand() * 260))),
      bestCall: `+${Math.round(rand() * 1900 + 60)}%`,
      since: `${Math.floor(rand() * 11) + 1}mo`,
      /* Weighted to the recent end: the wallets high enough on a volume
         board to be seen are, by construction, the ones still trading.
         A cube keeps a long tail without making the top of the board
         look abandoned. */
      lastTrade: (() => {
        const mins = Math.round(Math.pow(rand(), 3) * 1500);
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
        return `${Math.round(mins / 1440)}d ago`;
      })(),
    });
  }

  /* One row on this board is checkable, and so it is not generated.
     The connected wallet's launches are on the roster, My projects
     lists them, and its profile page counts them — three screens that
     have to agree, against a figure drawn from a random number that
     agrees with nothing. Everyone else's is a fixture; this one is
     read off the coins. */
  const own = out.find((w) => w.handle === DEMO_WALLET.handle);
  if (own) {
    const mine = CURATED.filter((c) => c.creator === DEMO_WALLET.address);
    const caps = mine.map((c) => capUsd(c.mc));
    const air = mine.reduce((a, c) => a + capUsd(c.airdropped), 0);
    own.launches = mine.length;
    own.bestCap = mine[caps.indexOf(Math.max(...caps))]?.mc ?? "-";
    own.airdropped = air > 0 ? `$${(air / 1000).toFixed(1)}K` : "-";
  }
  return out;
})();

/** "$418.3K" back to 418300. The roster stores caps the way it prints
 *  them, so comparing two of them means reading the suffix. */
export function capUsd(value: string) {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return value.includes("M") ? n * 1e6 : value.includes("K") ? n * 1e3 : n;
}
