"use client";

import { useCallback, useEffect, useRef } from "react";
import { LABELS } from "@/lib/labels";
import type { Spark, TrendingRow, Window } from "@/lib/trending";
import { useLiveCell, useMarketSim, type Cell } from "@/lib/trending-live";

/** Why a figure prints as the dash. The real launch was never indexed,
 *  which is a different absence from a window the fixture has no figure
 *  for. */
export function nullTitle(row: TrendingRow, cell: string): string {
  if (row.real) return LABELS.NOT_INDEXED;
  return cell === "change" ? LABELS.CHANGE_NULL_TITLE : LABELS.NULL_TITLE;
}

/** One ticking figure. The span holds nothing but its text, because
 *  useLiveCell rewrites it in place on each commit without a render.
 *
 *  Only a cap and a change flash. The foundation's flash is teal on a
 *  rise and red on a fall; on a trade count or a volume, which only
 *  climb as trades land, that reads as a gain the figure never claimed.
 *  A cap moving is the price moving, so it keeps its flash. */
export function Live({
  row,
  w,
  cell,
  format,
  flash = cell === "change" || cell === "mc",
  className,
}: {
  row: TrendingRow;
  w: Window;
  cell: Cell;
  format: (v: number | null) => string;
  flash?: boolean;
  className?: string;
}) {
  const c = useLiveCell(row.ticker, w, cell, format, { flash });
  return (
    <span ref={c.ref} {...c.data} title={c.sign === "null" ? nullTitle(row, cell) : undefined} className={className}>
      {c.text}
    </span>
  );
}

/** The chart's coordinate box. The SVG scales to its column with
 *  preserveAspectRatio="none" and a non-scaling stroke, so one path
 *  serves the 262px chart at 1920 and the narrower ones below it. */
export const SPARK_W = 262;
export const SPARK_H = 45;
/** Points per chart. Fewer than the shared 48, so the line reads as the
 *  reference's even curve rather than a staircase; the ends are the same
 *  two prices whatever the count, so it still agrees with the change. */
const SPARK_N = 32;
/** Headroom above and below the line, as the reference leaves it: its
 *  curve sits in the middle of the box, not against the edges. */
const SPARK_PAD = 6;

/** LOCAL: the drawn line, smoothed. The same scaling as the shared
 *  sparkPath (the window's own range, nothing drawn left of a young
 *  coin's launch), joined with a monotone cubic instead of straight
 *  segments. Monotone, so the curve never swings above or below a price
 *  the path actually had between two points: smoothing that invented a
 *  peak would be drawing a price that didn't happen. */
function smoothPaths(s: Spark, W: number, H: number): { line: string; area: string } {
  const pts = s.points;
  const n = pts.length;
  if (n < 2) return { line: "", area: "" };
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pts) {
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  }
  const span = hi - lo;
  const x0 = s.startFrac * W;
  const dx = (W - x0) / (n - 1);
  const y = pts.map((p) => (span === 0 ? H / 2 : SPARK_PAD + (1 - (p - lo) / span) * (H - 2 * SPARK_PAD)));
  const x = (i: number) => x0 + i * dx;
  // Fritsch-Carlson tangents on an even grid: zero at a turn, otherwise
  // bounded by the smaller neighbouring slope.
  const t = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const s0 = (y[i] - y[i - 1]) / dx;
    const s1 = (y[i + 1] - y[i]) / dx;
    if (s0 * s1 <= 0) continue;
    t[i] = Math.sign(s0) * Math.min(Math.abs(s0), Math.abs(s1), Math.abs(s0 + s1) / 4) * 2;
  }
  t[0] = n > 2 ? (3 * ((y[1] - y[0]) / dx) - t[1]) / 2 : (y[1] - y[0]) / dx;
  t[n - 1] = n > 2 ? (3 * ((y[n - 1] - y[n - 2]) / dx) - t[n - 2]) / 2 : (y[n - 1] - y[n - 2]) / dx;
  const f = (v: number) => v.toFixed(1);
  let line = `M${f(x(0))} ${f(y[0])}`;
  const h = dx / 3;
  for (let i = 0; i < n - 1; i++) {
    line += `C${f(x(i) + h)} ${f(y[i] + h * t[i])} ${f(x(i + 1) - h)} ${f(y[i + 1] - h * t[i + 1])} ${f(x(i + 1))} ${f(y[i + 1])}`;
  }
  return { line, area: `${line}L${f(W)} ${H}L${f(x0)} ${H}Z` };
}

/** LOCAL: the chart's two paths, the line and the faint fill under it,
 *  from one spark on one commit, written straight to the nodes (no React
 *  render per tick), so the fill can't drift from the line. */
function useSmoothSpark(ticker: string, w: Window) {
  const sim = useMarketSim();
  const spark = sim.spark(ticker, w, SPARK_N);
  const first = smoothPaths(spark, SPARK_W, SPARK_H);
  const lineEl = useRef<SVGPathElement | null>(null);
  const areaEl = useRef<SVGPathElement | null>(null);
  useEffect(() => {
    return sim.subscribe(() => {
      const s = sim.spark(ticker, w, SPARK_N);
      const next = smoothPaths(s, SPARK_W, SPARK_H);
      const up = String(s.up);
      const l = lineEl.current;
      const a = areaEl.current;
      if (l && l.getAttribute("d") !== next.line) l.setAttribute("d", next.line);
      if (a && a.getAttribute("d") !== next.area) a.setAttribute("d", next.area);
      if (l && l.dataset.up !== up) l.dataset.up = up;
      if (a && a.dataset.up !== up) a.dataset.up = up;
    });
  }, [sim, ticker, w]);
  const lineRef = useCallback((el: SVGPathElement | null) => {
    lineEl.current = el;
  }, []);
  const areaRef = useCallback((el: SVGPathElement | null) => {
    areaEl.current = el;
  }, []);
  return { ...first, up: String(spark.up), lineRef, areaRef };
}

/** The row's chart: the window's price path, coloured by the sign of the
 *  change printed beside it (pos, neg, or neutral for 0.0% and none).
 *  No axes, like the reference. The reference fades a tint out under its
 *  line; with no gradients here, the tint is one flat wash so faint it
 *  only reads right under the line. A coin with no change for the window
 *  gets a dim level hairline rather than an invented line. */
export function SparkChart({ row, w }: { row: TrendingRow; w: Window }) {
  const p = useSmoothSpark(row.ticker, w);
  return (
    <svg className="dc-spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" aria-hidden>
      {p.line ? (
        <>
          <path ref={p.areaRef} d={p.area} data-up={p.up} className="dc-spark-area" />
          <path ref={p.lineRef} d={p.line} data-up={p.up} className="dc-spark-line" vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        <line x1="0" x2={SPARK_W} y1={SPARK_H / 2} y2={SPARK_H / 2} className="dc-spark-none" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
