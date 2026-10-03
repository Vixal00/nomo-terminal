import { TABS, type Tab } from "@/lib/trending";

/* The version's own copy. Not honesty strings: those are LABELS, word
   for word. These are the poster's voice, and they live in one file so
   the poster, the board and the sheet say the same thing the same way. */
export const COPY = {
  FILTERED: (n: number, total: number) => `Filtered: ${n} of ${total} coins.`,
  UNSCORED: (seatNo: number) => `UNSCORED SEAT · #${seatNo}`,
  EMPTY_HEAD: "Nothing on the bill.",
  EMPTY_SUB: "No coin passes the search, filters and hidden list.",
  STARRED_EMPTY_HEAD: "Nothing starred.",
  /* Said for where the reader is: the Starred tab has no row to select,
     so the sentence names the tabs that do, and the button goes there. */
  STARRED_EMPTY_SUB:
    "Star a coin from Trending, Top or Z500: select its row and press S, or open it and tap Star. Stars are kept in this browser.",
  GO_TRENDING: "Go to Trending",
  CLEAR: "Clear filters",
  SHOW_HIDDEN: (n: number) => `Show hidden (${n})`,
  ART_CAPTION: "The Black Bull. Community-built, not affiliated with Ansem.",
  NO_SELECTION: "No row selected. Press J or K to select one.",
  FOLD: "Fold · F",
  UNFOLD: "Unfold · F",
  COPIED: "Mint copied.",
  /* The copy can fail (a blocked clipboard, an insecure origin), and a
     toast saying "copied" over nothing on the clipboard is a small lie. */
  COPY_FAILED: "Mint not copied: this browser blocked the clipboard.",
} as const;

/* LOCAL: candidate for foundation (LABELS.REAL_SHORT). The real launch's
   tag, cut down for a narrow row's second line. The full tag is 135px at
   9px tracked, wider than line two at 360 and 640, and line two drops
   what doesn't fit, so on a phone the one row that isn't a fixture read
   as one. Both words stay: "real" is what the page-wide fixture notice
   gets wrong about this row, "snapshot" is why its figures never move.
   The full tag stays the title and what a screen reader hears. */
export const REAL_SHORT = "Real · snapshot";

/* Every order Broadside offers is a tab with its rule printed, and no
   header sorts. No New tab (the fixtures have no arrivals to show) and
   no final tab (gated while the curve is a roster fixture). */
export type BsTab = "trending" | "top" | "z500" | "starred";
export const BS_TABS: readonly BsTab[] = (["trending", "top", "z500", "starred"] as const).filter((t) =>
  (TABS as readonly Tab[]).includes(t),
);

export const TAB_LABEL: Record<BsTab, string> = {
  trending: "Trending",
  top: "Top",
  z500: "Z500",
  starred: "Starred",
};
