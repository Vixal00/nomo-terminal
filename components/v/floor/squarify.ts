/* Floor's geometry. Pure: no React, no DOM, no measuring.

   The map is the ranking drawn to scale, so the one promise this file
   makes is that a tile's area is linear in its figure. Nothing is
   square-rooted, floored or given a minimum size to make it readable:
   a coin too small to name is folded, with its area, into one "rest"
   strip along the bottom, rather than being drawn bigger than it is. */

export type Item = { key: string; v: number };
/** Drawn pixels, integers, relative to the map's content box. */
export type Rect = { key: string; x: number; y: number; w: number; h: number };
export type RestRect = Rect & { tickers: string[]; sum: number };
export type MapLayout = { tiles: Rect[]; rest: RestRect | null };

export const REST_KEY = "__rest";

type Box = { x: number; y: number; w: number; h: number };

/** The worst aspect ratio in a row of areas laid along `side`. */
function worst(sum: number, max: number, min: number, side: number): number {
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

/** Squarified treemap (Bruls, Huizing, van Wijk): values sorted
 *  descending, each row grown while it makes its worst tile squarer.
 *  Returns fractional boxes in the order given. */
export function squarify(values: readonly number[], box: Box): Box[] {
  const out: Box[] = [];
  const total = values.reduce((a, b) => a + b, 0);
  if (!(total > 0) || box.w <= 0 || box.h <= 0) return values.map(() => ({ x: box.x, y: box.y, w: 0, h: 0 }));
  const scale = (box.w * box.h) / total;
  const areas = values.map((v) => v * scale);
  let { x, y, w, h } = box;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(w, h);
    let sum = areas[i];
    let max = areas[i];
    let min = areas[i];
    let j = i + 1;
    while (j < areas.length) {
      const a = areas[j];
      const nSum = sum + a;
      const nMax = Math.max(max, a);
      const nMin = Math.min(min, a);
      if (worst(nSum, nMax, nMin, side) > worst(sum, max, min, side)) break;
      sum = nSum;
      max = nMax;
      min = nMin;
      j++;
    }
    const last = j >= areas.length;
    if (w >= h) {
      // A column down the left edge of what is left.
      const cw = last ? w : sum / h;
      let cy = y;
      for (let k = i; k < j; k++) {
        const rh = k === j - 1 ? y + h - cy : areas[k] / cw;
        out[k] = { x, y: cy, w: cw, h: rh };
        cy += rh;
      }
      x += cw;
      w -= cw;
    } else {
      // A row along the top edge.
      const rh = last ? h : sum / w;
      let cx = x;
      for (let k = i; k < j; k++) {
        const rw = k === j - 1 ? x + w - cx : areas[k] / rh;
        out[k] = { x: cx, y, w: rw, h: rh };
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
    i = j;
  }
  return out;
}

/** Edges are rounded, not sizes: two neighbours share a rounded edge,
 *  so every gap is exactly the one pixel the map's hairline background
 *  shows through, and the outer tiles sit flush with the box. */
function draw(b: Box): Omit<Rect, "key"> {
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  return { x, y, w: Math.round(b.x + b.w) - x - 1, h: Math.round(b.y + b.h) - y - 1 };
}

/** Big enough to carry a name. Below this a tile is folded, not
 *  enlarged. */
export function legible(r: { w: number; h: number }): boolean {
  return r.w >= 44 && r.h >= 24 && r.w * r.h >= 2400;
}

/** Lay out `items` (v > 0, sorted descending) in a W×H box, folding
 *  the tail into one rest tile until every named tile passes `canName`
 *  (the size floor by default; the map passes namesFit).
 *
 *  The rest is a strip across the bottom of the box, as tall as its
 *  share of the total, and the named items are squarified in what is
 *  left above it. Sorted in among the named items at its true value,
 *  it landed wherever that value put it: on a phone the first tile,
 *  top left, pushing #1 aside; on Trending at 1440 the fourth, in the
 *  top row beside BULLP. A block of folded coins is the least
 *  important thing on the map and it sat where a trader looks first.
 *  Across the bottom it keeps its area and reads as what it is, the
 *  end of the ranking.
 *
 *  The number named is the largest that lets every named tile pass,
 *  found by trying each count from all of them down. Jumping straight
 *  to the first tile that failed overshoots here: folding makes the
 *  strip taller, which squeezes every named tile, so one failure led to
 *  the next and a phone ended with six named coins where nine fit. At
 *  78 coins that is at most 78 squarifies of 78 items, on a relayout
 *  that happens at most every 8 seconds. */
export function layoutMap(
  items: readonly Item[],
  W: number,
  H: number,
  canName: (key: string, r: Rect) => boolean = (_, r) => legible(r),
): MapLayout {
  if (!items.length || W <= 0 || H <= 0) return { tiles: [], rest: null };
  const total = items.reduce((a, b) => a + b.v, 0);
  const lay = (k: number): MapLayout => {
    const named = items.slice(0, k);
    const tail = items.slice(k);
    const restSum = tail.reduce((a, b) => a + b.v, 0);
    const stripH = tail.length && total > 0 ? ((H + 1) * restSum) / total : 0;
    const box = { x: 0, y: 0, w: W + 1, h: H + 1 - stripH };
    const boxes = squarify(
      named.map((n) => n.v),
      box,
    );
    const tiles = named.map((n, i) => ({ key: n.key, ...draw(boxes[i]) }));
    let rest: RestRect | null = null;
    if (tail.length) {
      const r = draw({ x: 0, y: box.h, w: W + 1, h: stripH });
      rest = { key: REST_KEY, ...r, h: Math.max(0, r.h), tickers: tail.map((t) => t.key), sum: restSum };
    }
    return { tiles, rest };
  };
  for (let k = items.length; k > 0; k--) {
    const l = lay(k);
    if (l.tiles.every((t) => canName(t.key, t))) return l;
  }
  return lay(0);
}

/* ============================================================ Type fit */

/** Advance widths in em for Geist Sans 800 caps at −0.03em tracking,
 *  measured in Chrome on the running app. LOCAL: candidate for
 *  foundation (Broadside measured its own). Measuring each tile in the
 *  DOM would be a layout read per tile per relayout; a table is a
 *  lookup. Anything not in it is priced as a wide glyph. */
export const ADV: Record<string, number> = {
  A: 0.7204, B: 0.6732, C: 0.7146, D: 0.6978, E: 0.5975, F: 0.5684, G: 0.7212, H: 0.6834, I: 0.2692,
  J: 0.5944, K: 0.6597, L: 0.5422, M: 0.8866, N: 0.7118, O: 0.7578, P: 0.6308, Q: 0.751, R: 0.6756,
  S: 0.6652, T: 0.5942, U: 0.6854, V: 0.712, W: 0.9988, X: 0.6848, Y: 0.6376, Z: 0.5804,
  "0": 0.682, "1": 0.4044, "2": 0.6346, "3": 0.6318, "4": 0.6402, "5": 0.656, "6": 0.6078,
  "7": 0.5392, "8": 0.654, "9": 0.6134,
};

/** A ticker's width in em, with 3% for kerning and rounding. */
export const emWidth = (t: string) => [...t.toUpperCase()].reduce((a, c) => a + (ADV[c] ?? 0.75), 0) * 1.03;

/** The smallest size a ticker is set at. Below it a tile is folded. */
export const MIN_STEP = 11;

export type Level = "XL" | "L" | "M" | "S";
type Named = Exclude<Level, "S">;

const MIN: Record<Named, readonly [number, number]> = { XL: [200, 120], L: [110, 64], M: [56, 36] };
/** Pixels below the ticker line each level needs for its figures. */
export const SEC: Record<Named, number> = { XL: 54, L: 34, M: 16 };
/** Room the L level needs under its figures for the stage row. */
export const L_STAGE = 16;
const PAD = 8;
const AVATAR = 26;

/** The largest size a share has earned: in proportion to the square
 *  root of the share, as the side of a square of that area is, so 15%
 *  earns 80px and a quarter of that share half the size. The area
 *  already shows the share; this keeps the type saying the same thing,
 *  so #1 and #2 never end up the same size because the second happens
 *  to be the squarer tile.
 *
 *  It was a ladder of rungs (80/56/40/28/20) with a share threshold
 *  for each. Two coins either side of a threshold, 7.6% and 7.4%, were
 *  set a whole rung apart, which said they differed when they didn't. */
export function capFor(share: number): number {
  return Math.max(MIN_STEP, 80 * Math.sqrt(share / 0.15));
}

/** The level and ticker size for a tile: the richest level whose
 *  content the tile has room for, at the largest whole-pixel size the
 *  share has earned, the viewport allows and the tile fits.
 *
 *  The fit is continuous. On the ladder, a ticker 2px too wide for a
 *  rung dropped to the next one down, 8px or more smaller, and landed
 *  below coins ranked under it (TORQUN at #12 set at 20px over PHANTT
 *  and HORNET at 28). The map also clamps each tile to the size of the
 *  one ranked above it; see MapPane. */
export function fitTile(ticker: string, w: number, h: number, share: number, maxStep: number): { level: Level; step: number } {
  const limit = Math.min(capFor(share), maxStep);
  const em = emWidth(ticker);
  for (const level of ["XL", "L", "M"] as const) {
    if (w < MIN[level][0] || h < MIN[level][1]) continue;
    const byW = (w - PAD * 2 - (level === "XL" ? AVATAR : 0)) / em;
    const byH = (h - PAD * 2 - SEC[level]) / 0.9;
    const s = Math.floor(Math.min(limit, byW, byH));
    if (s >= MIN_STEP) return { level, step: s };
  }
  return { level: "S", step: 0 };
}

/** Whether an L tile also has room for its stage row. */
export function lHasStage(h: number, step: number): boolean {
  return h - PAD * 2 >= 0.9 * step + SEC.L + L_STAGE;
}

/** Whether a tile can carry its own name: the size floor, and the
 *  ticker fitting at the smallest size with its change line (level M).
 *  The size floor alone lets a six-letter ticker through at 44px wide,
 *  where it can't be set even at 11px, and a named tile that shows no
 *  name is a blank box the reader has to hover to identify. Folding it
 *  instead keeps its area, in the rest strip, which names it in its
 *  index. */
export function namesFit(ticker: string, r: { w: number; h: number }): boolean {
  if (!legible(r)) return false;
  const s = MIN_STEP;
  return r.w >= MIN.M[0] && r.h >= MIN.M[1] && s * emWidth(ticker) + PAD * 2 <= r.w && 0.9 * s + SEC.M <= r.h - PAD * 2;
}

/* ========================================================= Rest index */

/** Advance of a character of the rest strip's index at 10.5px mono, and
 *  of its 10.5px .meta head and 11px .num share, rounded up so an
 *  estimate never overruns the strip. */
const IDX_CH = 6.4;
const META_CH = 7.7;
const NUM11_CH = 6.7;
export const REST_LINE = 14;
/** The strip's padding, top and bottom: 6px over the text, 2px under
 *  it, so a one-line strip needs 22px and a 37px one (Trending at 1440)
 *  holds two lines. */
export const REST_PAD = 8;
/** The least strip height that still carries one line, set tight with
 *  no padding: the 10.5px capitals are about 7.5px tall, so from 9px
 *  they show whole. Below 22px the strip used to print nothing, and on
 *  a 3440 screen, where the map is wide and short, it was an unlabelled
 *  bar in every window. */
export const REST_TIGHT = 9;

/** How many of the folded tickers the strip can print, in rank order,
 *  with "and n more" after them, given what the head line already
 *  takes. Arithmetic on the strip's size rather than a DOM measure: the
 *  strip is re-laid out with the map, and a measure per layout is a
 *  layout read the map otherwise never makes. The text wraps as one
 *  paragraph, so this packs it the way the browser will, word by word. */
export function restIndexFit(tickers: readonly string[], head: readonly { chars: number; kind: "meta" | "num" }[], w: number, h: number): number {
  const lines = Math.floor((h - REST_PAD) / REST_LINE);
  const width = w - PAD * 2;
  if (lines < 1 || width <= 0) return 0;
  const pack = (k: number): boolean => {
    let line = 0;
    let x = 0;
    const put = (px: number) => {
      if (x > 0 && x + px > width) {
        line++;
        x = 0;
      }
      x += px;
    };
    // Each head part is followed by a 4px margin and a space (6.4px).
    for (const p of head) put(p.chars * (p.kind === "meta" ? META_CH : NUM11_CH) + 11);
    for (let i = 0; i < k; i++) put((tickers[i].length + 1) * IDX_CH);
    if (k < tickers.length) put(`and ${tickers.length - k} more`.length * IDX_CH);
    return line < lines;
  };
  for (let k = tickers.length; k > 0; k--) if (pack(k)) return k;
  return 0;
}
