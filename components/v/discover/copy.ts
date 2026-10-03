import type { TrendingRow } from "@/lib/trending";

/* Discover's own words. Everything that states a fact about the data
   (fixtures, simulation, placeholders) comes from lib/labels.ts word for
   word; these are the navigation and help strings only this version
   prints. */

/** The masthead's other sections. They are not pages in this build, and
 *  a link to a page that isn't there would claim one is. */
export const NAV_SOON = "Not in this terminal yet.";
/** The Z500 section: no index page here, but the board has a Z500 view. */
export const NAV_Z500 = "No Z500 index page in this terminal yet. The Z500 view is on the board below.";

export type DcTab = "trending" | "top" | "z500" | "starred";

/** No New (no arrivals: owner decision pending), no Memescope (its final
 *  stretch needs CURVE_FROM_MCAP), no For You (nothing backs it). */
export const DC_TABS: readonly DcTab[] = ["trending", "top", "z500", "starred"];

export const TAB_NAME: Record<DcTab, string> = {
  trending: "Trending",
  top: "Top",
  z500: "Z500",
  starred: "Starred",
};

export const TIER_TIP: Record<TrendingRow["tier"], string> = {
  Free: "Free launch",
  Fortress: "Fortress launch",
  Diamond: "Diamond launch",
};

/** The tier classes in globals.css, for the flat corner glyph. */
export const TIER_CLS: Record<TrendingRow["tier"], string> = {
  Free: "tier-free",
  Fortress: "tier-fortress",
  Diamond: "tier-ice",
};

export type TapeMode = "trending" | "starred" | "movers";

/** The tape follows the board's window, so a coin's change on the tape
 *  is the same figure as on its row; the window is named on the tape
 *  and in each source's tip. */
export const TAPE_MODE: Record<TapeMode, (w: string) => string> = {
  trending: (w) => `Tape: trending, change over the last ${w}`,
  starred: (w) => `Tape: starred coins, change over the last ${w}`,
  movers: (w) => `Tape: biggest moves over the last ${w}, either way`,
};

export const COPY = {
  EMPTY: "No pairs match these filters.",
  /** The view is empty only because of the reader's own hidden list. */
  EMPTY_BLACKLIST: "Every pair in this view is hidden by your Blacklist.",
  STARRED_BLACKLIST: "Your starred coins are hidden by your Blacklist.",
  OPEN_BLACKLIST: "Show the Blacklist",
  STARRED_EMPTY: "No starred coins yet.",
  STARRED_HOW: "Press S on a row, or use the star after its name.",
  TAPE_STARRED_EMPTY: "No starred coins yet. Press S on a row or use the star on it.",
  CLEAR: "Clear",
  NO_SELECTION: "Select a row first: J / K, or click one.",
  HIDDEN: (t: string) => `Hid $${t}. It is listed under Blacklist, where it can be shown again.`,
  COPIED: "Copied",
  COPY_FAILED: "Not copied: the browser blocked the clipboard.",
  NO_CHANGES: "No changes to apply. Type a Market Cap, Volume or Liquidity limit first.",
  /** The same key with filters already in force (its count shows them). */
  NO_CHANGES_ACTIVE: "No changes to apply. Edit a limit, or Clear.",
  FILTER: "Filter",
  HIDE_EMPTY: "Type a $TICKER or keyword first.",
  SEARCH_PH: "Search by token or CA…",
  /** One substring, not a keyword list: the foundation's search matches
   *  a ticker, a name or a mint, so the chip says that. */
  SEARCH_CHIP_PH: "Name, ticker or CA",
  BLACKLIST_PH: "$TICKER or keyword",
  BLACKLIST_EMPTY: "Nothing hidden. Press H on a row, or add a ticker or keyword here.",
  BLACKLIST_NOTE: "$TICKER hides that coin. Any other entry of 3+ letters hides names and tickers containing it. Kept in this browser.",
  KEYS: "Keys",
  CREATOR: (a: string) => `Creator ${a}`,
  PAIRS: (n: number) => `${n} ${n === 1 ? "pair" : "pairs"}`,
  /** A tape chip whose coin the board isn't listing right now. */
  NOT_IN_VIEW: (t: string, why: string) => `$${t} isn't on the board: ${why}`,
  WHY_FILTERS: "the filters or search exclude it.",
  WHY_VIEW: (view: string) => `it isn't in the ${view} view.`,
  SHOW_ON_BOARD: (t: string) => `Show $${t} on the board`,
} as const;
