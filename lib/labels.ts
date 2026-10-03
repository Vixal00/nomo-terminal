/**
 * The honesty copy for the Trending page, word for word.
 *
 * Every version prints these strings rather than its own paraphrase of
 * them. The page has no backend and every figure on it is a fixture or
 * simulated in the browser, so the sentences that say so are the most
 * load-bearing copy on the screen, and five slightly different wordings
 * of "this isn't real" is how one of them ends up saying something that
 * is.
 *
 * One word is kept out on purpose: nothing here calls anything "live".
 * Nothing on the page is read from a chain, and that word is the one a
 * trader takes as a promise that it is. The seat copy says "alive",
 * which is the Z500 spec's own word for a token that has not died.
 *
 * Templates are functions so a version cannot drop a clause by
 * formatting it itself.
 */

export type LabelWindow = "5m" | "1h" | "6h" | "24h";

const WINDOW_WORD: Record<LabelWindow, string> = {
  "5m": "5 minutes",
  "1h": "hour",
  "6h": "6 hours",
  "24h": "24 hours",
};

export const LABELS = {
  /** The three facts every screen states, as cells or as one line. */
  DISCLOSURE: ["Fixture data", "Trades simulated in this browser", "No chain connection"] as const,
  DISCLOSURE_LINE: "Fixture data · Trades simulated in this browser · No chain connection",

  /** The simulation toggle. The title is the whole explanation. */
  SIM_TITLE: "Trades are simulated here. Nothing is read from a chain.",
  /** "offscreen" is the market halting because every board that asked
   *  (useBoardInView) is scrolled out of view: on a stacked phone layout
   *  the status can still be on screen, over figures that have stopped. */
  SIM_STATES: {
    sim: "SIM",
    paused: "PAUSED",
    stopped: "STOPPED · TAB HIDDEN",
    offscreen: "STOPPED · BOARD OFF SCREEN",
  } as const,
  SIM_PAUSE: "Pause the simulation",
  SIM_RESUME: "Resume the simulation",

  /** The board's order, held while the reader is on it. */
  HELD: (n: number) => (n === 0 ? "Order held" : `Order held · ${n} ${n === 1 ? "move" : "moves"} waiting`),
  HELD_TITLE: "The order doesn't change under the pointer. The figures keep updating unless the simulation is paused.",

  /** The curve column, while the roster curve is not tied to market cap. */
  CURVE_CAVEAT:
    "Curve % is a roster fixture for Free and Diamond launches and doesn't follow market cap.",
  CURVE_SORT_OFF:
    "Not sortable: for Free and Diamond launches the curve is a roster fixture that doesn't follow market cap.",
  CURVE_HEAD: "CURVE · ROSTER",
  CURVE_FORTRESS: "Fortress: from market cap, $100K to $1M.",

  /** The token-info group. One label for the group, not one per digit. */
  AUDIT_HEAD: "FIXTURE",
  AUDIT_DEF:
    "Fixture figures. Snipers and bundlers exclude the launch's own airdrop reserve and declared dev buy, which land in the creation transaction by design.",
  /** Worded as two fixtures disagreeing, not as a fact about the coin:
   *  for Free and Diamond launches the curve it is checked against is
   *  itself a roster fixture that doesn't follow market cap. */
  TOP10_HIDDEN:
    "Not shown: the fixture top 10 is more than the share of supply the roster curve says has sold. The two fixtures disagree.",

  /** The one real launch. */
  REAL: "REAL LAUNCH · SNAPSHOT",
  REAL_TITLE: "A real launch, copied by hand at one moment. It is never simulated and may be stale.",
  NOT_INDEXED: "Not indexed",

  /** Nulls and short lives. */
  NULL_TITLE: "No figure",
  CHANGE_NULL_TITLE: "No figure for this window",
  SINCE_LAUNCH: "since launch",
  SINCE_LAUNCH_TITLE: "The coin is younger than this window, so every figure here is since launch.",
  NOT_TRACKED: "Not tracked in fixtures",

  /** Derived figures with a caveat. */
  TRADERS_TITLE: "A wallet that did both is counted twice.",
  /** Both halves, because after the first commit the newest part of
   *  every ticking coin's line is the session's own simulated prices. */
  SPARK_TITLE: "Fixture path before this page opened, simulated since. Pinned to this window's open and last price.",

  /** Addresses. */
  MINT_PLACEHOLDER: "Placeholder address, doesn't resolve",
  NET2_MINT: "Robinhood Chain addresses aren't in the fixtures.",

  /** Quick buy. There is no execution, and the page says so before and
   *  after the press. */
  QB_TAG: "PLACEHOLDER",
  QB_TITLE: "Trading isn't wired in this terminal. Pressing buy sends nothing.",
  BUY_TOAST: (amt: string, unit: string, ticker: string) =>
    `Not sent: ${amt} ${unit} of $${ticker}. Trading isn't wired in this terminal, so no transaction was created.`,
  USD_EQ: (usd: string) => `≈ ${usd} at demo spot`,
  SPOT_TAG: "DEMO SPOT",
  SPOT_TITLE: "Fixture prices, not a feed.",

  /** Paid placement. */
  BOOST_TITLE: "Paid placement. Doesn't change rank.",

  /** A coin the build has no page for. */
  NO_PAGE: "No token page in this build yet.",

  /** Launch facts that the docs call changeable with platform settings. */
  AS_DOCUMENTED: "as documented",
  AIRDROP_RESERVE: "Airdrop reserve: bought at creation · hold ≥100 to qualify",

  /** The index calendar. The server render prints the first half only;
   *  the countdown fills in from an effect, so no clock is baked into
   *  the markup. */
  COUNTDOWN_LABEL: "Z500 reconstitutes Wed 16:00 UTC",
  COUNTDOWN: (countdown: string) => `Z500 reconstitutes Wed 16:00 UTC · ${countdown}`,

  /** Seat states. See lib/seat-state.ts for when each applies. */
  SEAT: {
    ABOVE: "Above the bar",
    UNDER_BAR: "Under the bar",
    UNDER_EXIT: "Under the exit line",
    ALIVE: "Unscored seat · holds while the token is alive",
    ALIVE_SHORT: "Holds while alive",
    UNDER_FLOOR: "Under the $250K floor",
    VOL_UNCHECKED: "7d volume floor not checked",
    GRACE: "Graduated · in the 72h grace",
    UNSEATED: "Graduated · no seat",
    NONE: "No seat",
  },
} as const;

/** The rule a tab ranks by, printed wherever the ranking is. A board
 *  whose order can't be explained in one sentence on the same screen is
 *  a board a trader has to take on trust. */
export const RANK_RULE = {
  trending: (w: LabelWindow) => `Ranked by trades in the last ${w}. Boosts don't change rank.`,
  /** rank(..., { rule: "turnover" }). Says the floor as well as the
   *  ratio, or a quiet coin sitting under a busier one reads as a bug. */
  turnover: (w: LabelWindow) =>
    `Ranked by trades in the last ${w} for their market cap, among the busier half by trades; the rest follow by trades. Boosts don't change rank.`,
  top: () => "Ranked by market cap.",
  new: () => "Newest first.",
  final: () => "Unmigrated, curve 70% or more, closest first.",
  z500: () =>
    "Ranked by index score. Fortress and Diamond seats aren't scored week to week, so they follow by seat number.",
  starred: (w: LabelWindow) =>
    `Your starred coins, ranked by trades in the last ${w}. Stars are kept in this browser.`,
} as const;

/** The same rule as a headline, for versions that lead with it. */
export const RANK_HEADLINE = {
  trending: (w: LabelWindow) => `Most traded, last ${WINDOW_WORD[w]}.`,
  turnover: (w: LabelWindow) => `Busiest for their size, last ${WINDOW_WORD[w]}.`,
  top: () => "Largest by market cap.",
  new: () => "Newest launches.",
  final: () => "Closest to graduation.",
  z500: () => "Z500 seats: scored first, then by seat number.",
  starred: () => "Starred.",
} as const;
