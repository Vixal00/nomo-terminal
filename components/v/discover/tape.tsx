"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlameMark, PulseMark, StarMark } from "@/components/marks";
import { Tip } from "@/components/trending";
import { cx } from "@/components/ui";
import { LABELS } from "@/lib/labels";
import { applyFilter, type TrendingFilter, type Window } from "@/lib/trending";
import { useBoardInView, useClock, useLiveOrder, useMarketSim, useSinceLaunch, type MarketSim } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { COPY, TAPE_MODE, type TapeMode } from "./copy";
import { Live } from "./live";

const TAPE_LEN = 14;

/** LOCAL: candidate for foundation. The tape's third source: the coins
 *  whose change over the window is largest either way, read from the sim
 *  at the moment it is asked. A coin with no figure for the window is
 *  left out rather than ranked as a zero. */
function topMovers(sim: MarketSim, w: Window, allowed: ReadonlySet<string>, n: number): string[] {
  const out: { t: string; a: number }[] = [];
  for (const r of sim.rows) {
    if (!allowed.has(r.ticker)) continue;
    const v = sim.value(r.ticker, w, "change");
    if (v !== null && Number.isFinite(v)) out.push({ t: r.ticker, a: Math.abs(v) });
  }
  out.sort((x, y) => y.a - x.a || x.t.localeCompare(y.t));
  return out.slice(0, n).map((x) => x.t);
}

function Chip({
  ticker,
  src,
  dup,
  w,
  title,
  onChip,
}: {
  ticker: string;
  src?: string;
  dup: boolean;
  w: Window;
  title: string;
  onChip: (t: string) => void;
}) {
  const sim = useMarketSim();
  const row = sim.row(ticker)!;
  const since = useSinceLaunch(ticker, w);
  return (
    <li className="dc-chip-li">
      <button type="button" tabIndex={dup ? -1 : 0} className="dc-chip" onClick={() => onChip(ticker)} title={title}>
        {src ? (
          <Image src={src} alt="" width={36} height={36} sizes="18px" className="dc-chip-av" />
        ) : (
          <span aria-hidden className="dc-chip-av" />
        )}
        <span className="dc-chip-t">{ticker}</span>
        <Live row={row} w={w} cell="mc" format={fmt.usdLike(row.mcLabel)} flash={false} className="num dc-chip-mc" />
        <span className={since ? "dc-chip-since" : undefined} title={since ? `${LABELS.SINCE_LAUNCH}: ${LABELS.SINCE_LAUNCH_TITLE}` : undefined}>
          <Live row={row} w={w} cell="change" format={fmt.pct} className="num dc-chip-chg" />
          {since && <span className="sr-only"> {LABELS.SINCE_LAUNCH}</span>}
        </span>
      </button>
    </li>
  );
}

/** R2, 40px at 1920: three source toggles and the window, then a strip
 *  of coin chips moving right to left. Every change on it is over the
 *  board's window, so a coin reads the same here as on its row. The
 *  reader's Blacklist applies here as on the board. The strip is two
 *  identical copies translated by CSS, so no script runs per frame; it
 *  holds still under the pointer or focus and not at all under reduced
 *  motion, where it is a strip that scrolls by hand. The chips' order
 *  holds for 30s at a time, and while the pointer is on it, so a chip
 *  isn't swapped out from under a click. */
export function Tape({
  mode,
  setMode,
  stars,
  starsReady,
  blacklist,
  w,
  art,
  whyNot,
  onChip,
}: {
  mode: TapeMode;
  setMode: (m: TapeMode) => void;
  stars: readonly string[];
  starsReady: boolean;
  blacklist: string[];
  w: Window;
  art: Record<string, string>;
  /** Why the board isn't listing a coin right now, or null when it is. */
  whyNot: (t: string) => string | null;
  onChip: (t: string) => void;
}) {
  const sim = useMarketSim();
  const rootRef = useRef<HTMLDivElement>(null);
  useBoardInView(rootRef);

  const filter = useMemo<TrendingFilter>(() => ({ blacklist: blacklist.length ? blacklist : undefined }), [blacklist]);
  // Hidden coins, by the foundation's own blacklist rule.
  const allowed = useMemo(() => new Set(applyFilter(sim.rows, filter, w).map((r) => r.ticker)), [sim, filter, w]);
  const trending = useLiveOrder("trending", w, filter, { rule: "turnover", limit: TAPE_LEN, reorderMs: 30000 });
  const tick = useClock(30000);
  const tickers = useMemo(() => {
    if (mode === "starred") return stars.filter((t) => sim.row(t) && allowed.has(t));
    if (mode === "movers") return topMovers(sim, w, allowed, TAPE_LEN);
    return trending.tickers;
    // tick re-reads the movers every 30s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stars, sim, w, allowed, trending.tickers, tick]);

  /* Measured, not per frame: the strip's width sets the duration so the
     speed is the same whatever is on it, and a strip narrower than its
     window doesn't move at all (a loop would show the seam). */
  const viewRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [motion, setMotion] = useState<{ moving: boolean; dur: number }>({ moving: true, dur: 60 });
  useEffect(() => {
    const view = viewRef.current;
    const set = setRef.current;
    if (!view || !set || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const sw = set.getBoundingClientRect().width;
      const vw = view.getBoundingClientRect().width;
      setMotion({ moving: sw > vw, dur: Math.max(20, Math.round(sw / 38)) });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    ro.observe(set);
    return () => ro.disconnect();
  }, [tickers.length, mode]);

  const btn = (m: TapeMode, icon: React.ReactNode) => (
    <Tip label={TAPE_MODE[m](w)} focusable={false} side="bottom">
      <button
        type="button"
        aria-pressed={mode === m}
        aria-label={TAPE_MODE[m](w)}
        className={cx("dc-tape-mode", mode === m && "is-on")}
        onClick={() => setMode(m)}
      >
        {icon}
      </button>
    </Tip>
  );

  /* Two different empties, and the tape says which: nothing starred (or
     no star names a coin on the roster), or stars that the reader's own
     Blacklist hides. The second must not claim there are no stars. */
  const empty = mode === "starred" && starsReady && tickers.length === 0;
  const hiddenByBlacklist = empty && stars.some((t) => sim.row(t));
  const titleOf = (t: string) => {
    const why = whyNot(t);
    return why ? COPY.NOT_IN_VIEW(t, why) : COPY.SHOW_ON_BOARD(t);
  };

  return (
    <div ref={rootRef} className="dc-tape">
      <div role="group" aria-label="Tape source" className="dc-tape-modes">
        {btn("trending", <FlameMark className="h-4 w-4" />)}
        {btn("starred", <StarMark className="h-4 w-4" />)}
        {btn("movers", <PulseMark className="h-4 w-4" />)}
        <span className="num dc-tape-w" title={`Changes on the tape are over the last ${w}, the board's window.`}>
          {w}
        </span>
      </div>
      <div
        ref={viewRef}
        className="dc-tape-view"
        data-moving={motion.moving ? "" : undefined}
        onPointerEnter={() => trending.setFrozen(true)}
        onPointerLeave={() => trending.setFrozen(false)}
        onBlur={(e) => {
          // Tabbing to a chip past the edge scrolls this clipped view to
          // show it. Put it back when focus leaves, or every later loop
          // of the moving strip would end on a blank band. Under reduced
          // motion the strip is scrolled by hand, and stays where it was.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          e.currentTarget.scrollLeft = 0;
        }}
      >
        {empty ? (
          <p className="dc-tape-empty">{hiddenByBlacklist ? COPY.STARRED_BLACKLIST : COPY.TAPE_STARRED_EMPTY}</p>
        ) : (
          <div className="dc-tape-track" style={{ "--dc-dur": `${motion.dur}s` } as React.CSSProperties}>
            <ul ref={setRef} className="dc-tape-set" aria-label={TAPE_MODE[mode](w)}>
              {tickers.map((t) => (
                <Chip key={t} ticker={t} src={art[t]} dup={false} w={w} title={titleOf(t)} onChip={onChip} />
              ))}
            </ul>
            <ul className="dc-tape-set dc-tape-dup" aria-hidden>
              {tickers.map((t) => (
                <Chip key={t} ticker={t} src={art[t]} dup w={w} title={titleOf(t)} onChip={onChip} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
