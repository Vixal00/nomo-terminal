/**
 * What a coin's Z500 seat means right now, in one rule.
 *
 * Every score or seat a version prints goes through here, because the
 * index has two kinds of seat and they are not read the same way
 * (lib/spec.ts ROUTES): Merit and External seats are re-scored every
 * week against the entry bar (50) and the exit line (40); Fortress and
 * Diamond seats are never scored and hold while the token is alive,
 * ending only after four weeks under a death floor. A score beside a
 * Fortress seat reads as a grade the seat doesn't have, so an unscored
 * seat gets no numeral at all.
 *
 * Two things it deliberately doesn't do:
 *
 * - It never reads the seat's score inputs. Their holder count is
 *   re-seeded and disagrees with the audit's on 14 of 16 seats (D6),
 *   so a sentence built from them would contradict a figure elsewhere
 *   on the same screen.
 * - It checks only the mcap half of the death rule. The other half is
 *   7d volume under $100K, and the only 7d volume in the fixtures is a
 *   score input. So the sentence says the volume floor wasn't checked
 *   rather than letting "above the floor" read as a full pass.
 */

import { Z500 } from "./spec";
import { LABELS } from "./labels";
import type { RowSeat, TrendingRow } from "./trending";

export type SeatTone = "bone" | "muted" | "rim" | "neg";

export type SeatKind =
  | "scored-above"
  | "scored-under-bar"
  | "scored-under-exit"
  | "unscored-alive"
  | "unscored-under-floor"
  /* Coded for completeness; the fixtures seat every migrated coin and
     every migrated coin is past its grace, so neither is reachable. */
  | "graduated-unseated"
  | "grace"
  | "none";

export type SeatState = {
  kind: SeatKind;
  /** Two or three words, for a cell. */
  short: string;
  /** The whole state, for a title or an inspector line. */
  sentence: string;
  tone: SeatTone;
  /** The score to print, or null. Null for every unscored seat: its
   *  fixture score is not a figure the index uses. */
  numeral: number | null;
};

/** Token classes for each tone, so versions don't map them by hand. */
export const TONE_CLASS: Record<SeatTone, string> = {
  bone: "text-bone",
  muted: "text-muted",
  rim: "text-rim",
  neg: "text-neg",
};

/** The tone a score numeral takes. Unscored seats are muted. */
export function scoreTone(seat: Pick<RowSeat, "scored" | "score"> | null): SeatTone {
  if (!seat || !seat.scored) return "muted";
  if (seat.score >= Z500.bar) return "bone";
  if (seat.score >= Z500.exit) return "rim";
  return "neg";
}

/** The seat's state. `mcUsd` defaults to the row's fixture cap; pass the
 *  simulated one to keep the floor check in step with a ticking cell. */
export function seatState(row: TrendingRow, mcUsd: number = row.mcUsd): SeatState {
  const s = row.seat;
  if (!s) {
    if (!row.migrated) {
      return { kind: "none", short: LABELS.SEAT.NONE, sentence: "Not seated: still on the curve.", tone: "muted", numeral: null };
    }
    if (row.ageMinutes < Z500.graceHours * 60) {
      return {
        kind: "grace",
        short: LABELS.SEAT.GRACE,
        sentence: "Graduated and inside the 72-hour grace before a seat can be granted.",
        tone: "muted",
        numeral: null,
      };
    }
    return {
      kind: "graduated-unseated",
      short: LABELS.SEAT.UNSEATED,
      sentence: `Graduated without a seat. ${LABELS.NOT_TRACKED}.`,
      tone: "muted",
      numeral: null,
    };
  }

  if (s.scored) {
    if (s.score >= Z500.bar) {
      return {
        kind: "scored-above",
        short: LABELS.SEAT.ABOVE,
        sentence: `Scored ${s.score}, at or above the entry bar of ${Z500.bar}.`,
        tone: "bone",
        numeral: s.score,
      };
    }
    if (s.score >= Z500.exit) {
      return {
        kind: "scored-under-bar",
        short: LABELS.SEAT.UNDER_BAR,
        sentence: `Scored ${s.score}: under the entry bar of ${Z500.bar}, above the exit line of ${Z500.exit}.`,
        tone: "rim",
        numeral: s.score,
      };
    }
    return {
      kind: "scored-under-exit",
      short: LABELS.SEAT.UNDER_EXIT,
      // The rule, not a count: the fixtures don't say how many weeks
      // the seat has been under, so the sentence can't either.
      sentence: `Scored ${s.score}, under the exit line of ${Z500.exit}. Two consecutive weeks under it remove a scored seat.`,
      tone: "neg",
      numeral: s.score,
    };
  }

  if (mcUsd < Z500.death.mcapUsd) {
    return {
      kind: "unscored-under-floor",
      short: LABELS.SEAT.UNDER_FLOOR,
      // Never a number of weeks: nothing in the fixtures tracks it.
      sentence: `Unscored ${s.route} seat, under the $250K mcap floor. Four consecutive weeks under a floor end the seat. ${LABELS.SEAT.VOL_UNCHECKED}.`,
      tone: "rim",
      numeral: null,
    };
  }
  return {
    kind: "unscored-alive",
    short: LABELS.SEAT.ALIVE_SHORT,
    sentence: `${LABELS.SEAT.ALIVE}. Above the $250K mcap floor · ${LABELS.SEAT.VOL_UNCHECKED}.`,
    tone: "muted",
    numeral: null,
  };
}
