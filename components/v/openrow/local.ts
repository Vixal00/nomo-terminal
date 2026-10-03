import { RANK_RULE, TABS, type Tab, type Window } from "@/lib/trending";
import type { Tier } from "@/lib/data";

/* Constants Open Row shares between its own files. */

/** The boards this version offers, in tab order. New is left out on
 *  purpose: the simulation has no arrivals, so a "New" tab would be a
 *  static age sort dressed as a feed. Filtered against TABS so a tab the
 *  foundation gates off (Final, while the curve isn't tied to market
 *  cap) can never be offered here by accident. */
export const OR_TABS = (["trending", "top", "z500", "starred"] as const).filter((t) =>
  (TABS as readonly string[]).includes(t),
) as readonly OrTab[];
export type OrTab = "trending" | "top" | "z500" | "starred";

export const TAB_LABEL: Record<OrTab, string> = {
  trending: "Trending",
  top: "Top",
  z500: "Seated",
  starred: "Starred",
};

/** Whether a tab's order depends on the window, for the nameplate's
 *  "#3 · TRENDING 1H" stamp: Top and Seated rank the same in every
 *  window, and printing one beside them would say otherwise. */
export const TAB_WINDOWED: Record<OrTab, boolean> = {
  trending: true,
  top: false,
  z500: false,
  starred: true,
};

// LOCAL: candidate for foundation
/** RANK_RULE typed as one signature. The foundation's `top` and `z500`
 *  take no argument, which makes RANK_RULE[tab](w) a type error for a
 *  tab held in a variable. */
export const rankRule = (tab: Tab, w: Window): string => (RANK_RULE[tab] as (w: Window) => string)(w);

// LOCAL: candidate for foundation
/** A copy of components/ui.tsx's private TIER_TAG, for the static
 *  GlyphBadge in a row. It should be exported from ui.tsx; until then
 *  this must be kept in step with it by hand. */
export const TIER_GLYPH: Record<Tier, { cls: string; box: string }> = {
  Free: { cls: "tier-free", box: "w-[8.1px]" },
  Fortress: { cls: "tier-fortress", box: "w-[10px]" },
  Diamond: { cls: "tier-ice", box: "w-[8.7px]" },
};

// LOCAL: candidate for foundation
/** Answers this page gives that every version should give in the same
 *  words: the Buy key's own reply after a press (the toast carries the
 *  full sentence), and the empty states. */
export const OR_COPY = {
  BUY_KEY_SENT: "Not sent",
  BUY_KEY_NONE: "Select a coin",
  BUY_KEY_EMPTY: "No coin to buy",
  NOTHING_SELECTED: "Nothing selected",
  NOTHING_SELECTED_HINT: "Press J or click a row.",
  NOTHING_SELECTED_HINT_TOUCH: "Tap a row to open it.",
  NOTHING_TO_SELECT: "The list is empty.",
  NO_STARS: "No starred coins yet.",
  NO_STARS_HINT: "Press S on a row, or Star in the inspector.",
  NO_MATCH: "No coin matches.",
  NOT_RANKED: "Not ranked",
  NOT_RANKED_TITLE: "No figure for what this tab ranks by, so the coin is sorted last.",
} as const;

/** The min/max limits that live behind the Filters button, drafted and
 *  committed on Apply. Search, tier, stage and the blacklist apply as
 *  they are pressed, so they aren't in this list. */
export const POP_FIELDS = ["mcMin", "mcMax", "volMin", "liqMin", "top10Max", "devMax"] as const;
export type PopField = (typeof POP_FIELDS)[number];

/** Each field's fixed operator label. Volume is the selected window's,
 *  so its label is built with the window at the moment it is read. */
export function fieldLabel(k: PopField, w: Window): string {
  switch (k) {
    case "mcMin":
      return "Mcap ≥";
    case "mcMax":
      return "Mcap ≤";
    case "volMin":
      return `Vol ${w.toUpperCase()} ≥`;
    case "liqMin":
      return "Liq ≥";
    case "top10Max":
      return "Top 10 ≤ %";
    case "devMax":
      return "Dev ≤ %";
  }
}

export const STAGE_LABEL = { all: "All", curve: "On curve", migrated: "Migrated" } as const;
