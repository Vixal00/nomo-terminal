import {
  COINS,
  DEMO_POSITIONS,
  TOKEN,
  SPOT,
  TOP_AIRDROPS,
  WALLETS,
  coinPriceUsd,
  type Coin,
  type Wallet,
} from "./data";
import { DEMO_WALLET } from "./spec";

/* Wallet identity, and what a wallet's page is made of.
 *
 * The site had four different ways of naming a person and no way of
 * looking one up. A coin credits "8vQm…4Wpx", the leaderboard ranks
 * "vaporbyte", the airdrop table lists a third truncation, and none of
 * them was a link, so every wallet on the site was a dead end. This
 * module is the one place that decides what a wallet is called, what its
 * URL is, and what is true about it.
 *
 * Every figure below is a placeholder, derived from the address so that
 * it is the same on every render and every rebuild. What is not
 * invented is the part that can be checked against the rest of the
 * site: created coins come off the roster, and the leaderboard figures
 * come off the leaderboard.
 */

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SHORT = /^(.{4})…(.{4})$/;

function seeded(key: string) {
  let s = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The connected wallet is one identity with two names: the masthead
 *  calls it "vaporbyte" and every coin it launched credits "8vQm…4Wpx".
 *  Both have to resolve to the same address or the site has two people
 *  where it has one. */
function canonical(key: string) {
  return key === DEMO_WALLET.handle ? DEMO_WALLET.address : key;
}

/** A full address from whatever the site happened to display.
 *
 *  Addresses were never stored: the fixtures carry the truncated form a
 *  UI shows, which is not a URL and cannot be looked up. This expands
 *  one deterministically, keeping the head and tail the reader has
 *  already seen so that the address on the page and the address in the
 *  bar are visibly the same one. */
export function walletAddress(key: string): string {
  const k = canonical(key);
  const rand = seeded(k);
  const m = SHORT.exec(k);
  const head = m ? m[1] : "";
  const tail = m ? m[2] : "";
  let mid = "";
  for (let i = 0; i < 44 - head.length - tail.length; i++) {
    mid += B58[Math.floor(rand() * B58.length)];
  }
  return head + mid + tail;
}

/** Head and tail, the way every address on this site is shortened. */
export function walletShort(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export const walletHref = (address: string) => `/wallet/${address}`;

/** Every wallet the site can link to: the leaderboard's fourteen, every
 *  creator on the roster, the airdrop table's stakers, and the connected
 *  wallet. Deduplicated by resolved address rather than by display
 *  string, since three of those lists name the same people differently. */
export function walletUniverse(): string[] {
  const keys = [
    DEMO_WALLET.address,
    ...WALLETS.map((w) => w.handle),
    ...COINS.map((c) => c.creator),
    ...TOP_AIRDROPS.map((a) => a.staker),
  ];
  const byAddress = new Map<string, string>();
  for (const k of keys) byAddress.set(walletAddress(k), k);
  return [...byAddress.keys()];
}

/* --------------------------------------------------------------- Profile */

export type Holding = {
  ticker: string;
  name: string;
  /** Tokens held. SOL is the one row that is not a launch. */
  amount: number;
  usd: number;
  /** Market cap, as the roster prints it. Null for SOL, which has one
   *  but not one this site is in any position to quote. */
  mc: string | null;
  /** Unrealised, in dollars. Null where there is nothing to compare
   *  against — the same dash the reference screenshot draws. */
  pnl: number | null;
  /** The last 24 hours, as a percentage. Read off the roster for a
   *  launch and off the spot table for SOL, so a row here and the same
   *  coin on the feed cannot quote different moves. Null where the site
   *  has no move to quote. */
  d24: number | null;
};

export type Act = {
  kind: "Buy" | "Sell" | "Creator fee" | "Burn" | "Launch";
  ticker: string;
  name: string;
  /** Signed, in tokens. */
  tokens: number;
  usd: number;
  when: string;
  /** Minutes ago. The feed mixes a coin's own age string with relative
   *  ones, and a list sorted on the text would put "1w" above "6h". */
  mins: number;
  /** A transaction signature, shortened. Nothing resolves it. */
  tx: string;
};

export type WalletProfile = {
  address: string;
  short: string;
  /** The name the leaderboard knows this wallet by, when it has one.
   *  Most wallets are an address and nothing else, and inventing a
   *  handle for them would put a name on the page that appears nowhere
   *  else on the site. */
  handle: string | null;
  since: string;
  /** Lifetime verified burn, in $ANSEM. docs 3/7: only goes up. */
  burned: number;
  /** Launches on record. Not the same number as `created.length` — the
   *  roster is what is live now, and a wallet's older launches are not
   *  on it. The page says so rather than showing two counts that
   *  disagree. */
  launches: number;
  bestCap: string;
  airdropped: string;
  volume: number;
  trades: number;
  bestCall: string;
  /** Where this wallet sits on each board, when it is in the top of
   *  one. Read off the same sort the leaderboard uses. */
  ranks: { board: string; rank: number }[];
  holdings: Holding[];
  /** Total portfolio value, which is the holdings added up rather than
   *  a figure of its own. */
  value: number;
  /** The book's own 24-hour move, in percent. */
  d24: number;
  created: Coin[];
  activity: Act[];
};

const BOARDS: { board: string; by: (w: Wallet) => number }[] = [
  { board: "Burners", by: (w) => w.burned },
  { board: "Creators", by: (w) => w.launches },
  { board: "Traders", by: (w) => w.volume },
];

const SOL_USD = SPOT.find((s) => s.k === "SOL")?.usd ?? 0;

/** Minutes to the shortest true reading of them. Relative, because the
 *  roster has no real timestamps and a fixed date would go stale the
 *  moment it was written. */
function ago(mins: number) {
  if (mins < 60) return `${Math.round(mins)}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d`;
  return `${Math.round(mins / 10080)}w`;
}

/** The roster writes ages as "3w 2d", "2d 14h" and "18h 41m". Read
 *  back into minutes so a launch can be sorted against a trade. */
function ageMinutes(age: string) {
  let mins = 0;
  for (const [, n, unit] of age.matchAll(/(\d+)\s*([wdhm])/g)) {
    const v = Number(n);
    mins += unit === "w" ? v * 10080 : unit === "d" ? v * 1440 : unit === "h" ? v * 60 : v;
  }
  return mins || 60;
}

export function walletProfile(address: string): WalletProfile {
  const rand = seeded(address + "profile");

  const board = WALLETS.find((w) => walletAddress(w.handle) === address) ?? null;
  const isDemo = address === walletAddress(DEMO_WALLET.address);

  /* A handle only where one exists. WALLETS generates half its roster as
     truncated addresses, and those are not names. */
  const handle =
    isDemo
      ? DEMO_WALLET.handle
      : board && !SHORT.test(board.handle)
        ? board.handle
        : null;

  const created = COINS.filter((c) => walletAddress(c.creator) === address);
  const burned = isDemo ? DEMO_WALLET.burned : (board?.burned ?? 0);

  const ranks = BOARDS.flatMap(({ board: name, by }) => {
    if (!board) return [];
    const order = [...WALLETS].sort((x, y) => by(y) - by(x));
    const at = order.findIndex((w) => w.handle === board.handle);
    return at >= 0 && at < 10 ? [{ board: name, rank: at + 1 }] : [];
  });

  /* SOL first, then a few launches. Everyone holds SOL — it is what a
     wallet pays fees in — and the reference screenshot puts it at the
     top of the balances for that reason. */
  const sol = isDemo ? DEMO_WALLET.sol : Math.round((0.4 + rand() * 90) * 100) / 100;
  const holdings: Holding[] = [
    {
      ticker: "SOL",
      name: "Solana",
      amount: sol,
      usd: sol * SOL_USD,
      mc: null,
      pnl: null,
      d24: SPOT.find((s) => s.k === "SOL")?.d ?? null,
    },
  ];

  /* The connected wallet already has a book. DEMO_POSITIONS is what the
     status strip crawls along the bottom of every page, so inventing a
     second set here would have the strip and the profile quoting
     different sizes for the same five coins. */
  const picks: { coin: Coin; usd: number; pnl?: number }[] = isDemo
    ? DEMO_POSITIONS.flatMap((p) => {
        const coin = COINS.find((c) => c.ticker === p.ticker);
        /* The demo book carries a cost basis, so its PNL is arithmetic
           rather than a draw: what is left plus what was sold, less
           what went in. The trading view prints the same three. */
        return coin ? [{ coin, usd: p.usd, pnl: p.usd + p.sold - p.invested }] : [];
      })
    : (() => {
        /* Their own launches first, since a creator holding none of what
           they made is the odd case rather than the normal one, then a
           handful off the roster. */
        const chosen: Coin[] = [...created.slice(0, 2)];
        const pool = COINS.filter((c) => !chosen.includes(c));
        const extra = 2 + Math.floor(rand() * 3);
        for (let i = 0; i < extra; i++) {
          const c = pool[Math.floor(rand() * pool.length)];
          if (c && !chosen.includes(c)) chosen.push(c);
        }
        return chosen.map((coin) => ({
          coin,
          usd: Math.pow(10, 1.4 + rand() * 3),
        }));
      })();

  for (const { coin: c, usd, pnl } of picks) {
    const price = coinPriceUsd(c.price);
    /* Drawn whether or not it is used, so a book with its own cost
       basis leaves the seeded sequence where it was and nothing after
       this loop moves. */
    const drawn = rand() < 0.7 ? usd * (rand() * 1.6 - 0.5) : null;
    holdings.push({
      ticker: c.ticker,
      name: c.name,
      amount: price > 0 ? usd / price : 0,
      usd,
      mc: c.mc,
      /* Some positions have a cost basis on this fixture and some do
         not, which is the same split the reference draws: a dash where
         the wallet received rather than bought. */
      pnl: pnl ?? drawn,
      d24: c.d24 ?? null,
    });
  }
  holdings.sort((a, b) => b.usd - a.usd);

  const value = holdings.reduce((a, h) => a + h.usd, 0);

  /* What the same book was worth yesterday, and therefore how the whole
     wallet moved. Derived from the rows rather than invented: each
     holding's own 24-hour move rolled back to a starting value, summed,
     and compared. A row with no quoted move is carried at its current
     value, which is the honest treatment — unknown is not zero, but it
     is also not a reason to leave the other rows out of the total. */
  const prev = holdings.reduce(
    (a, h) => a + (h.d24 === null ? h.usd : h.usd / (1 + h.d24 / 100)),
    0
  );
  const d24 = prev > 0 ? ((value - prev) / prev) * 100 : 0;

  /* Activity is written against what the wallet actually has: a launch
     row for every coin it created, and trades in coins it holds. A feed
     of transactions in tickers the balances have never heard of is the
     kind of thing that reads fine until somebody checks. */
  const activity: Act[] = [];
  const row = (a: Omit<Act, "when" | "tx">) =>
    activity.push({ ...a, when: ago(a.mins), tx: txSig(rand) });

  /* A launch row sits at the coin's own age, so the feed and the coin
     header cannot disagree about when it happened. */
  for (const c of created.slice(0, 4)) {
    row({
      kind: "Launch",
      ticker: c.ticker,
      name: c.name,
      tokens: 0,
      usd: 0,
      mins: ageMinutes(c.age),
    });
  }
  for (const h of holdings.slice(0, 6)) {
    const sell = rand() < 0.4;
    /* A trade cannot predate the coin. nightwatch launched 18 hours ago
       and the feed was happily reporting a sale of it two weeks back,
       which is the kind of thing that reads fine until the two rows are
       on screen together — and here they always are. */
    const coin = COINS.find((c) => c.ticker === h.ticker);
    const cap = coin ? ageMinutes(coin.age) : Infinity;
    row({
      kind: sell ? "Sell" : "Buy",
      ticker: h.ticker,
      name: h.name,
      tokens: h.amount * (0.15 + rand() * 0.7) * (sell ? -1 : 1),
      usd: h.usd * (0.15 + rand() * 0.7),
      mins: Math.min(30 + Math.floor(rand() * 20000), cap),
    });
  }
  if (burned > 0) {
    const n = Math.max(1, Math.round(burned * 0.25));
    row({
      kind: "Burn",
      ticker: TOKEN.ticker,
      name: TOKEN.name,
      tokens: -n,
      usd: n * ansemUsd(),
      mins: 4000 + Math.floor(rand() * 40000),
    });
  }
  /* Creator fees only where there is a coin to have earned them on. */
  if (created.length) {
    const tokens = Math.round(rand() * 60000) / 1e6;
    row({
      kind: "Creator fee",
      ticker: "SOL",
      name: "Solana",
      tokens,
      usd: tokens * SOL_USD,
      mins: 60 + Math.floor(rand() * 900),
    });
  }
  activity.sort((a, b) => a.mins - b.mins);

  return {
    address,
    short: walletShort(address),
    handle,
    since: isDemo ? "7mo" : (board?.since ?? `${Math.floor(rand() * 11) + 1}mo`),
    burned,
    launches: board?.launches ?? created.length,
    bestCap: board?.bestCap ?? (created[0]?.mc ?? "-"),
    airdropped: board?.airdropped ?? "-",
    volume: board?.volume ?? Math.round(Math.pow(10, 3.2 + rand() * 2.4)),
    trades: board?.trades ?? Math.max(3, Math.round(rand() * 400)),
    bestCall: board?.bestCall ?? "-",
    ranks,
    holdings,
    value,
    d24,
    created,
    activity,
  };
}

function txSig(rand: () => number) {
  let a = "", z = "";
  for (let i = 0; i < 4; i++) a += B58[Math.floor(rand() * B58.length)];
  for (let i = 0; i < 4; i++) z += B58[Math.floor(rand() * B58.length)];
  return `${a}…${z}`;
}

const ansemUsd = () => SPOT.find((s) => s.k === "ANSEM")?.usd ?? 0;
