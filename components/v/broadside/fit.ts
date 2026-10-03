import { LABELS } from "@/lib/labels";
import type { TrendingRow } from "@/lib/trending";

/* Fitted display type, and two small formatting rules the poster needs.
   Pure: no hooks, no window, so the server and the first client render
   compute the same sizes and hydration has nothing to disagree about. */

/* LOCAL: candidate for foundation. Advance widths per glyph, in em,
   measured in Chrome from the repo's own font files with each class's
   tracking already applied. A poster numeral is sized from these rather
   than measured in the browser: a measurement needs the font loaded and
   a layout pass, so the first paint would set the figure at one size
   and then jump to another. Re-measure if app/fonts/republica-minor.otf
   or the Geist package changes, or the fit will be off by the
   difference.

   Republica Minor 400, letter-spacing −0.02em applied (raw − 0.02). */
export const REP_ADV: Record<string, number> = {
  "0": 0.787, "1": 0.427, "2": 0.772, "3": 0.766, "4": 0.859, "5": 0.759, "6": 0.762, "7": 0.715,
  "8": 0.76, "9": 0.762, ",": 0.269, ".": 0.269, "·": 0.269, " ": 0.172, "#": 0.747, "–": 0.565,
  A: 0.829, B: 0.778, C: 0.77, D: 0.778, E: 0.626, F: 0.647, G: 0.771, H: 0.757, I: 0.359, J: 0.771,
  K: 0.818, L: 0.558, M: 1.074, N: 0.864, O: 0.791, P: 0.782, Q: 0.791, R: 0.782, S: 0.797, T: 0.73,
  U: 0.791, V: 0.806, W: 1.184, X: 0.801, Y: 0.86, Z: 0.671, ":": 0.269,
};

/** Geist Sans 800, tabular figures, letter-spacing −0.03em applied. */
export const SANS800_ADV: Record<string, number> = {
  "0": 0.618, "1": 0.618, "2": 0.618, "3": 0.618, "4": 0.618, "5": 0.618, "6": 0.618, "7": 0.618,
  "8": 0.618, "9": 0.618, ",": 0.218, ".": 0.218, $: 0.653, K: 0.675, M: 0.897, B: 0.68, "–": 0.567,
};

/** "rep" is the numeral (−0.02em), "rep-head" the headline, whose
 *  −0.012em tracking is 0.008em wider per glyph than the table. */
export type Face = "rep" | "rep-head" | "sans";

/** The width of `text` in em. A glyph missing from the table counts
 *  0.8, wider than most, so an unexpected character makes the figure a
 *  little small rather than too wide for its box. */
export function emOf(text: string, face: Face): number {
  const table = face === "sans" ? SANS800_ADV : REP_ADV;
  const extra = face === "rep-head" ? 0.008 : 0;
  let em = 0;
  for (const ch of text) em += (table[ch] ?? 0.8) + extra;
  return Math.max(em, 0.5);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** LOCAL: candidate for foundation. The moment an order was computed,
 *  as HH:MM:SS in the reader's own 24-hour time. Built by hand rather
 *  than with toLocaleTimeString, whose output depends on the locale
 *  (a 12-hour clock with "PM" would not fit the unit line). Only ever
 *  called with useLiveOrder's rankedAt once it is a number, which is
 *  never on the server. */
export function clockText(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** LOCAL: candidate for foundation. Why a figure prints as the dash.
 *  The real launch was never indexed, which is a different absence
 *  from a window the fixture has no figure for. */
export function nullTitle(row: TrendingRow, field: string): string {
  if (row.real) return LABELS.NOT_INDEXED;
  return field === "change" ? LABELS.CHANGE_NULL_TITLE : LABELS.NULL_TITLE;
}
