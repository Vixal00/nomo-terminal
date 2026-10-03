"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { LABELS } from "@/lib/labels";
import * as fmt from "@/lib/format";
import { sparkPath, type Window } from "@/lib/trending";
import { useLiveSpark } from "@/lib/trending-live";

/* The inspector's chart: the focused coin's path through the selected
   window, and the page's one chart that re-renders.

   Pinned at both ends: the first point is the window's open and the
   last is the price, so the line's direction is always the sign the
   change cell prints. Only those two prices are labelled. The inside of
   the path is a seeded walk between fixture anchors (and, since the
   page opened, the session's own simulated prices), so a high or a low
   label would present a point of that walk as a price the coin traded
   at. The dashed line is the open carried across, so "above or below
   where the window started" reads without a scale.

   Drawn in a fixed 600 × VB box with preserveAspectRatio="none" and a
   non-scaling stroke: CSS sets the painted height per breakpoint, so
   the markup is the same on the server and at every width, and the
   labels are placed in percent of the same box.

   Label placement is settled after layout, because only then are the
   box's pixels known. Each label has an intended side (data-place, from
   where the line goes) and ends on the first position that stays inside
   the box's room and off the other label (data-pos). */

const VB_W = 600;
const VB_H = 120;
const PAD = 6;

export function PinnedChart({ ticker, w, real }: { ticker: string; w: Window; real: boolean }) {
  const spark = useLiveSpark(ticker, w);
  const d = sparkPath(spark, VB_W, VB_H, PAD);
  const empty = spark.points.length === 0 || d === "";

  if (empty) {
    return (
      <figure className="or-chart" aria-label={`No price path for ${w}`}>
        <div className="or-chart-box">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="or-chart-svg" aria-hidden>
            <line x1={0} x2={VB_W} y1={VB_H / 2} y2={VB_H / 2} className="or-chart-null" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <figcaption className="or-caption">{real ? LABELS.NOT_INDEXED : LABELS.CHANGE_NULL_TITLE}</figcaption>
      </figure>
    );
  }

  // Read the ends back out of the path rather than recomputing them, so
  // the dashed open and the labels sit exactly where the line starts
  // and stops.
  const yOpen = Number(/^M[\d.]+ ([\d.]+)/.exec(d)?.[1] ?? VB_H / 2);
  const yLast = Number(/L[\d.]+ ([\d.]+)$/.exec(d)?.[1] ?? VB_H / 2);
  const x0 = spark.startFrac * VB_W;

  // Each label goes on the side of its point the line is not heading
  // to: a label is opaque, and one set across the first stretch of the
  // path hides the move it is meant to anchor.
  const ys = [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
  const lean = (from: number, to: number, at: number) => {
    const part = ys.slice(Math.max(0, from), Math.max(0, to));
    if (!part.length) return at < VB_H / 2 ? "below" : "above";
    const avg = part.reduce((a, b) => a + b, 0) / part.length;
    return avg > at ? "above" : "below";
  };
  const lastSide = lean(ys.length - 9, ys.length - 1, yLast);
  /* A young coin's path starts late in a long window (BULL starts at
     95% of 24h). Its open label then hangs left from the start point,
     into the empty stretch before launch, level with the point: there
     is no line there for it to cover, and it can't run past the box's
     right edge. */
  const openLeft = spark.startFrac > 0.5;
  const openSide = openLeft ? "mid" : lean(1, 9, yOpen);

  return (
    <figure className="or-chart" aria-label={`Price path, ${w}: open ${fmt.price(spark.open)}, last ${fmt.price(spark.last)}`}>
      <ChartBox>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="or-chart-svg" aria-hidden>
          <line x1={x0} x2={VB_W} y1={yOpen} y2={yOpen} className="or-chart-open" vectorEffect="non-scaling-stroke" />
          <path d={d} data-up={String(spark.up)} className="or-chart-path" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          data-label="open"
          data-place={openSide}
          data-pos={openSide}
          className="or-chart-label num"
          style={
            openLeft
              ? { top: `${(yOpen / VB_H) * 100}%`, right: `calc(${(1 - spark.startFrac) * 100}% + 4px)` }
              : { top: `${(yOpen / VB_H) * 100}%`, left: `${spark.startFrac * 100}%` }
          }
        >
          {fmt.price(spark.open)}
        </span>
        <span
          data-label="last"
          data-place={lastSide}
          data-pos={lastSide}
          className="or-chart-label num"
          style={{ top: `${(yLast / VB_H) * 100}%`, right: 0 }}
        >
          {fmt.price(spark.last)}
        </span>
      </ChartBox>
      <figcaption className="or-caption">{LABELS.SPARK_TITLE}</figcaption>
    </figure>
  );
}

type Pos = "above" | "below" | "mid";
const other = (p: string | undefined): Pos => (p === "above" ? "below" : "above");

/** Room a label may use outside the box: above it the chart block's top
 *  padding, below it the gap to the caption. */
const ROOM_ABOVE = 16;
const ROOM_BELOW = 5;

/** The box, and the one layout pass that settles its two labels. Runs
 *  after every render (a render is a commit of the simulated price):
 *  a handful of rects and attribute writes, once a second. */
function ChartBox({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const b = box.current;
    const open = b?.querySelector<HTMLElement>('[data-label="open"]');
    const last = b?.querySelector<HTMLElement>('[data-label="last"]');
    if (!b || !open || !last) return;
    const br = b.getBoundingClientRect();
    const inside = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.top >= br.top - ROOM_ABOVE && r.bottom <= br.bottom + ROOM_BELOW;
    };
    const apart = () => {
      const a = open.getBoundingClientRect();
      const c = last.getBoundingClientRect();
      return !(a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom);
    };
    open.style.setProperty("--nudge", "0px");
    // The price now is placed first; the open gives way to it.
    const lp = last.dataset.place as Pos;
    const op = open.dataset.place as Pos;
    const lastTries: Pos[] = [lp, other(lp)];
    const openTries: Pos[] = op === "mid" ? ["mid", "below", "above"] : [op, other(op)];
    for (const l of lastTries) {
      last.dataset.pos = l;
      if (!inside(last)) continue;
      for (const o of openTries) {
        open.dataset.pos = o;
        if (inside(open) && apart()) return;
      }
    }
    /* Nothing clears: a path that starts in the last few percent of a
       narrow box, with its open and last at one height. The open label
       keeps its level and slides left along it, past the last one, into
       the empty stretch before launch. */
    last.dataset.pos = lp;
    if (!inside(last)) last.dataset.pos = other(lp);
    open.dataset.pos = openTries[0];
    if (!apart()) {
      const shift = open.getBoundingClientRect().right - last.getBoundingClientRect().left + 4;
      open.style.setProperty("--nudge", `${shift}px`);
    }
  });
  return (
    <div ref={box} className="or-chart-box">
      {children}
    </div>
  );
}
