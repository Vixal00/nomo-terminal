import { LABELS } from "@/lib/labels";
import { HEAT_EDGES, type Window } from "@/lib/trending";

/* The few sentences only Floor says. Everything else on the page is
   LABELS, RANK_RULE or RANK_HEADLINE, word for word: this file is for
   what the map adds (area, the moment the areas are from, the fold) and
   for the one rule Floor has that the others don't, that the buy key
   acts on the pinned coin and nothing else. */

export const PIN_FIRST = "Click a tile to pin it";
export const NOTHING_PINNED = `Nothing is pinned. ${PIN_FIRST}.`;
/** The disabled buy key and the keys' answer when the board is empty:
 *  pointing at tiles that aren't there is an instruction the screen
 *  can't support. */
export const NO_COINS = "No coins to pin";
export const NOTHING_TO_PIN = "No coins on this board to pin.";
export const HIDDEN = (t: string) => `Hidden $${t} in this browser. Filters lists it.`;
export const COPIED = (resolves: boolean) => (resolves ? "Mint address copied." : `Copied. ${LABELS.MINT_PLACEHOLDER}.`);

/** The stamp's title. The areas are a snapshot, and the stamp names the
 *  moment it was taken, so the reader knows the drawing lags the cells
 *  printed on it by up to the relayout interval. */
export const STAMP_TITLE =
  "Tile areas are from this moment. They are re-laid out at most every 8 seconds, never under the pointer.";

/** Says where the action happens: Starred has no coins to pin, so
 *  "pin a coin" alone asks for something this view can't do. It never
 *  says where stars are kept: the rank rule printed above it on every
 *  width already ends with that sentence. */
export const STARRED_EMPTY = "On Trending or Top, pin a coin and press S.";

export const BUY_SHARE_TITLE = (e: { sell: number; buy: number }) =>
  `Buys as a share of trades. Over ${e.buy}% leans buy, under ${e.sell}% leans sell.`;

export const HEAT_TITLE = `Change bands at ±${HEAT_EDGES.join("/")}%, read at the printed one decimal.`;

/** The area rule, per tab. {n} is every coin with an area: the named
 *  tiles plus the ones folded into the rest tile, because the fold
 *  keeps their area. */
const coins = (n: number) => `${n} ${n === 1 ? "coin" : "coins"}`;
export const AREA = {
  trending: (n: number) => `Area = share of those trades among the ${coins(n)} drawn.`,
  starred: (n: number) => `Area = share of those trades among your ${n} starred ${n === 1 ? "coin" : "coins"} drawn.`,
  top: (n: number) => `Area = share of the combined market cap of the ${coins(n)} drawn.`,
} as const;

/** When the shown set is narrowed, what it is a share of. */
const these = (m: number, total: number) => (m === 1 ? `This 1 of ${total} coins takes` : `These ${m} of ${total} coins take`);
export const NARROWED = {
  trades: (m: number, total: number, x: string, w: Window) => `${these(m, total)} ${x} of all ${w} trades.`,
  cap: (m: number, total: number, x: string) => `${these(m, total)} ${x} of the whole roster's market cap.`,
} as const;

/** What a map share is out of, for the tile titles, the rest strip and
 *  the inspector: the drawn coins, never the whole roster. */
export const SHARE_OF = (tab: "trending" | "top" | "starred", w: Window) =>
  tab === "top" ? "of the combined market cap drawn" : `of the ${w} trades drawn`;

/** The inspector's MAP SHARE title: what it is a share of, and when the
 *  share was taken. */
export const MAP_SHARE_TITLE = (tab: "trending" | "top" | "starred", w: Window, stamp: string | null) =>
  `Share ${SHARE_OF(tab, w)} on the map${stamp ? `, at ${stamp}` : ""}. ${STAMP_TITLE}`;

export const NO_BAR =
  "A named tile with no curve bar is migrated. Every unmigrated tile carries one, with its percent where the tile has room.";

export const REST_TITLE = (tickers: readonly string[]) =>
  `Folded, too small to name as tiles at this size: ${tickers.map((t) => `$${t}`).join(", ")}. The strip's area is theirs. Click to find them in the list.`;

export const NOT_DRAWN_LINE = (t: string, w: Window, isNull: boolean) =>
  isNull ? `$${t}: ${LABELS.NOT_INDEXED}` : `$${t}: no trades in ${w}`;

export const EMPTY = {
  starredHead: "NO STARRED COINS",
  noMatchHead: "NO COINS MATCH",
  nothingHead: "NOTHING TO DRAW",
  /** Worded by why: an unknown figure (T's windows) is not a zero. */
  nothing: (w: Window, allUnknown: boolean) =>
    allUnknown ? `No trade figures for ${w} among the coins shown.` : `No trades in ${w} among the coins shown.`,
  hiddenNote: (h: number) => `${h} hidden in this browser`,
} as const;
