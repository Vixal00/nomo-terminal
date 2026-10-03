"use client";

/* The Line's own helpers and copy.

   Everything here is something the foundation doesn't have yet and The
   Line can't do without: the tier glyph map ui.tsx keeps private, the
   seat minimums as a pass/fail, the two post-filters, where a coin
   stands on the six-step path, a persisted list for stars and hidden
   coins, and the layout mode that decides where the dossier mounts.
   Each export is marked as a candidate for the foundation, because the
   other versions will want most of them and a second copy is how two
   versions end up disagreeing.

   Every sentence in LINE_COPY is built from the spec constants, so no
   threshold on this page is typed twice. */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { FORTRESS, ROUTES, Z500 } from "@/lib/spec";
import { LABELS } from "@/lib/labels";
import { seatState } from "@/lib/seat-state";
import type { TrendingRow } from "@/lib/trending";
import type { Tier } from "@/lib/data";
import * as fmt from "@/lib/format";

/* ------------------------------------------------------------ Glyphs */

/** The tier tag's ramp class and glyph box. ui.tsx keeps TIER_TAG
 *  private, and a glyph-only badge needs the same pair TierMark uses.
 *  LOCAL: candidate for foundation (export TIER_TAG from ui.tsx). */
export const TIER_GLYPH: Record<Tier, { cls: string; box: string }> = {
  Free: { cls: "tier-free", box: "w-[8.1px]" },
  Fortress: { cls: "tier-fortress", box: "w-[10px]" },
  Diamond: { cls: "tier-ice", box: "w-[8.7px]" },
};

/* ------------------------------------------------------------- Gates */

export type Gate = { v: number | null; ok: boolean | null };

/** The two Merit minimums, each as a figure and a pass. Holders are the
 *  audit's (row.holders), never the seat's score inputs, whose holder
 *  count disagrees with the audit on most seats (D6). A figure the
 *  fixtures don't have (T) is neither a pass nor a miss.
 *  LOCAL: candidate for foundation. */
export function meritGates(row: TrendingRow, liqUsd: number | null): { holders: Gate; liq: Gate } {
  const h = row.holders;
  return {
    holders: { v: h, ok: h === null ? null : h >= Z500.minHolders },
    liq: { v: liqUsd, ok: liqUsd === null ? null : liqUsd >= Z500.minLiquidityUsd },
  };
}

/** The attribute CSS draws the ✓ or ✗ from. */
export function gateAttr(ok: boolean | null): "ok" | "miss" | "null" {
  return ok === null ? "null" : ok ? "ok" : "miss";
}

/** "Seat minimums met", for a coin still on the curve. Fortress and
 *  Diamond are seated by route, so they always pass; a Free coin passes
 *  on both Merit minimums. An unknown figure fails: the page can't
 *  claim it passes. LOCAL: candidate for foundation. */
export function meetsMinimums(row: TrendingRow, liqUsd: number | null): boolean {
  if (row.tier !== "Free") return true;
  const g = meritGates(row, liqUsd);
  return g.holders.ok === true && g.liq.ok === true;
}

/** "At risk", for a seated coin: a scored seat under the exit line, or
 *  an unscored one under the mcap floor. The 7d volume floor isn't in
 *  the fixtures, so it can't put a seat at risk here.
 *  LOCAL: candidate for foundation. */
export function atRisk(row: TrendingRow, mcUsd: number | null): boolean {
  const k = seatState(row, mcUsd ?? row.mcUsd).kind;
  return k === "scored-under-exit" || k === "unscored-under-floor";
}

/** Where a coin stands on the path, 1 to 6: launch, curve, graduation,
 *  grace, seat, index. On the curve is step 2; in the grace, step 4; a
 *  graduated coin without a seat, step 5; a seat, step 6.
 *  LOCAL: candidate for foundation. */
export function pathStep(row: TrendingRow): 1 | 2 | 3 | 4 | 5 | 6 {
  switch (seatState(row).kind) {
    case "none":
      return 2;
    case "grace":
      return 4;
    case "graduated-unseated":
      return 5;
    default:
      return 6;
  }
}

/* ----------------------------------------------------------- Storage */

/** A list kept in this browser (stars, hidden coins).
 *
 *  Read after mount, because the server has no storage and a first
 *  client render seeded from it would disagree with the HTML. Every
 *  access sits in try/catch: storage can be blocked outright, and not
 *  remembering a list is no reason to refuse to change it.
 *  LOCAL: candidate for foundation, with the shared keys
 *  "ansem.terminal.blacklist" and "ansem.terminal.stars". */
export function usePersistedList(
  key: string,
): [list: readonly string[], add: (s: string) => void, remove: (s: string) => void, clear: () => void] {
  const [list, setList] = useState<readonly string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setList([...new Set(parsed.filter((x): x is string => typeof x === "string"))]);
      }
    } catch {
      /* Blocked or corrupt storage: start empty. */
    }
  }, [key]);

  const write = useCallback(
    (next: readonly string[]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Kept for this page only. */
      }
    },
    [key],
  );

  const add = useCallback(
    (s: string) =>
      setList((l) => {
        if (l.includes(s)) return l;
        const next = [...l, s];
        write(next);
        return next;
      }),
    [write],
  );
  const remove = useCallback(
    (s: string) =>
      setList((l) => {
        if (!l.includes(s)) return l;
        const next = l.filter((x) => x !== s);
        write(next);
        return next;
      }),
    [write],
  );
  const clear = useCallback(() => {
    setList([]);
    write([]);
  }, [write]);

  return [list, add, remove, clear];
}

/* -------------------------------------------------------------- Mode */

export type Mode = "wide" | "desk" | "stack";

const WIDE = "(min-width: 1400px)";
const DESK = "(min-width: 1024px)";

function modeSubscribe(fn: () => void) {
  const a = matchMedia(WIDE);
  const b = matchMedia(DESK);
  a.addEventListener("change", fn);
  b.addEventListener("change", fn);
  return () => {
    a.removeEventListener("change", fn);
    b.removeEventListener("change", fn);
  };
}

function modeSnapshot(): Mode {
  return matchMedia(WIDE).matches ? "wide" : matchMedia(DESK).matches ? "desk" : "stack";
}

/** Which of the three frames is showing. Null on the server and during
 *  hydration, so nothing mounts a dossier until the client knows where
 *  it goes; the layout itself never reads this, only CSS does, so the
 *  server render lays out correctly at any width.
 *  LOCAL: candidate for foundation. */
export function useMode(): Mode | null {
  return useSyncExternalStore<Mode | null>(modeSubscribe, modeSnapshot, () => null);
}

/* -------------------------------------------------------------- Copy */

/** The seat that follows graduation, said once for the band word and
 *  the AFTER GRADUATION head. */
const AFTER_GRAD = `Fortress and Diamond launches are seated on the Z500 ${Z500.graceHours}h after they graduate. A Free launch takes the Merit route: ${fmt.count(Z500.minHolders)} holders, ${fmt.usd(Z500.minLiquidityUsd)} liquidity and a score of ${Z500.bar} at a reconstitution.`;

/** The routes split by whether the index re-scores them, read off
 *  ROUTES so the sentence can't call a Fortress seat scored. */
const SCORED = ROUTES.filter((r) => r.scored).map((r) => r.id).join(", ");
const UNSCORED = ROUTES.filter((r) => !r.scored).map((r) => r.id).join(", ");

const some = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** LOCAL: candidate for foundation (NO_SEAT_TITLE, SCORE_TITLE,
 *  DERIVED_SOL_TITLE and D10_NOTE especially). The word "live" is kept
 *  out, as it is from LABELS. */
export const LINE_COPY = {
  RAIL_EMPTY: "Select a coin to see where it is on the path.",
  BAND_WORD_TIP: AFTER_GRAD,
  BAND_SEATED: `Fortress, Diamond: seated ${Z500.graceHours}h after`,
  BAND_MERIT: `Free: needs a score of ${Z500.bar}`,
  NO_SEAT_LABEL: "Graduated without a seat",
  NO_SEAT_TITLE: "The fixtures carry no migration times, so no coin can show as waiting for a seat.",
  SCORE_TITLE: `Fixture score. Changes at reconstitution, ${Z500.reconstitution.label}.`,
  STATE_TIP: `Scored seats (Merit, External) exit after ${Z500.exitWeeks} weeks under ${Z500.exit}. Unscored seats (Fortress, Diamond) end after ${Z500.death.weeks} weeks under the ${fmt.usd(Z500.death.mcapUsd)} mcap or ${fmt.usd(Z500.death.volume7dUsd)} 7d-volume floor; the volume floor isn't checked here.`,
  AIRDROP_TITLE: `Roster fixture. ${LABELS.AIRDROP_RESERVE}.`,
  AFTER_GRAD_TIP: AFTER_GRAD,
  SEAT_AFTER: `Seat ${Z500.graceHours}h after graduation`,
  GATES_TITLE: `Merit route minimums: ${fmt.count(Z500.minHolders)} holders and ${fmt.usd(Z500.minLiquidityUsd)} liquidity. Holders are the fixture count; liquidity is simulated here.`,
  MINIMUMS_LABEL: "Seat minimums met",
  MINIMUMS_TIP: `Fortress and Diamond always pass. Free passes at ${fmt.count(Z500.minHolders)} holders and ${fmt.usd(Z500.minLiquidityUsd)} liquidity. A Free coin still needs a score of ${Z500.bar} after graduating.`,
  AT_RISK_LABEL: "At risk",
  AT_RISK_TIP: `A scored seat under the exit line of ${Z500.exit}, or an unscored seat under the ${fmt.usd(Z500.death.mcapUsd)} mcap floor. The 7d volume floor isn't checked.`,
  DERIVED_SOL: "derived",
  DERIVED_SOL_TITLE: `Curve % × ${fmt.count(FORTRESS.graduateSol)} SOL. The docs give only the total, not how it fills.`,
  D10_NOTE: `Fixture: seated this week at a score under the entry bar of ${Z500.bar}. Seat age withheld.`,
  INDEX_RULE: `Scored seats (${SCORED}) are re-scored every ${Z500.reconstitution.label} and exit after ${Z500.exitWeeks} weeks under ${Z500.exit}. Unscored seats (${UNSCORED}) aren't re-scored; they hold while the token is alive.`,
  /** The tag an untrusted curve percentage carries where the column head
   *  and the caveat aren't beside it (cards, the dossier). */
  ROSTER_TAG: "roster",
  EMPTY_FILTERED: "Nothing in this stage matches.",
  EMPTY_STARRED: "No starred coins in this stage. Press S on a row to star it.",
  /** The hidden list emptied the pane, not the tab or a filter, so the
   *  pane says so and offers the list rather than a Clear that can't
   *  bring anything back. */
  EMPTY_STARRED_HIDDEN: (n: number) =>
    `${some(n, "One starred coin", "starred coins")} in this stage ${n === 1 ? "is" : "are"} hidden. Restore ${n === 1 ? "it" : "them"} from the hidden list.`,
  EMPTY_ALL_HIDDEN: (n: number) =>
    `${n === 1 ? "The one coin" : `All ${n} coins`} in this stage ${n === 1 ? "is" : "are"} hidden. Restore ${n === 1 ? "it" : "them"} from the hidden list.`,
  ALSO_HIDDEN: (n: number) =>
    `${some(n, "One coin", "coins")} in this stage ${n === 1 ? "is" : "are"} also hidden; clearing the filters doesn't restore ${n === 1 ? "it" : "them"}.`,
  OPEN_HIDDEN: "Hidden list",
  RANK_HEAD_TITLE: "The figure this tab ranks by. The tabs are the only ordering control.",
  EMPTY_Z500_CURVE: `No seats on the curve. A seat comes after graduation: ${Z500.graceHours}h for Fortress and Diamond, a score of ${Z500.bar} at a reconstitution for Free.`,
  HIDDEN_EMPTY: "Nothing hidden. Press H on a row to hide it.",
  NOTHING_SELECTED: "Nothing selected. Click a row or press J first.",
  COPIED: "Copied. It's a placeholder address and doesn't resolve.",
  COPIED_REAL: "Address copied.",
  SEARCH_PLACEHOLDER: "Search ticker, name or mint",
  CROSS_KEY: "Cross the line",
} as const;
