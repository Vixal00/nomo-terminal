"use client";

import { memo, type FocusEvent, type PointerEvent, type RefObject } from "react";
import { BoostChip, CoinAvatar, GlyphBadge, cx } from "@/components/ui";
import { CheckMark, StarMark } from "@/components/marks";
import { FlatCurveBar, Tip } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { TONE_CLASS, seatState } from "@/lib/seat-state";
import { useLiveCell, useLiveValue, useMarketSim, useSinceLaunch, type Cell } from "@/lib/trending-live";
import type { TrendingRow, Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { REAL_SHORT, type BsTab } from "./copy";
import { nullTitle } from "./fit";

/* components/ui.tsx keeps its tier table private, so the three glyph
   pairs are copied here. The same plates TierMark draws, without the
   word: in a row the tier is one fact among twelve. */
const TIER_GLYPH = {
  Free: { cls: "tier-free", box: "w-[8.1px]" },
  Fortress: { cls: "tier-fortress", box: "w-[10px]" },
  Diamond: { cls: "tier-ice", box: "w-[8.7px]" },
} as const;

export type SelectHow = "focus" | "click";

/* ------------------------------------------------------------ cells */

/** One ticking figure. The span holds nothing but the text (or the
 *  head and unit pair), because useLiveCell rewrites it in place on
 *  every commit without a React render. The null title is read at
 *  render: the sim keeps a null base null, so a dash never turns into a
 *  figure under a stale title.
 *
 *  Only a change flashes. The foundation's flash is teal when a figure
 *  rises and red when it falls, and on a trade count, a cap or a volume
 *  that reads as a gain or a loss the figure never claimed: a size is
 *  not a gain. A column of them flashing also turned the quiet table
 *  into a heat map. The digits turning over are the tick. */
export function Live({
  row,
  w,
  cell,
  format,
  split,
  flash = cell === "change",
  className,
}: {
  row: TrendingRow;
  w: Window;
  cell: Cell;
  format: (v: number | null) => string;
  split?: boolean;
  flash?: boolean;
  className?: string;
}) {
  const c = useLiveCell(row.ticker, w, cell, format, { split, flash });
  const title = c.sign === "null" ? nullTitle(row, cell) : undefined;
  if (split) {
    return (
      <span ref={c.ref} {...c.data} title={title} className={className}>
        <span>{c.head}</span>
        <span data-part="unit">{c.tail}</span>
      </span>
    );
  }
  return (
    <span ref={c.ref} {...c.data} title={title} className={className}>
      {c.text}
    </span>
  );
}

/** Buy share as a 2px bar under the counts: teal for the buys, red for
 *  the rest. Written straight to the node on each commit. */
function SplitBar({ row, w }: { row: TrendingRow; w: Window }) {
  const { value, ref } = useLiveValue<HTMLSpanElement>(row.ticker, w, "buyRatio", (el, v) => {
    el.style.width = v === null ? "0" : `${v * 100}%`;
  });
  return (
    <span aria-hidden className={cx("bs-split", value === null ? "bg-raised" : "bg-neg/70")}>
      <span ref={ref} className="bs-split-fill bg-pos/70" style={{ width: value === null ? "0" : `${value * 100}%` }} />
    </span>
  );
}

/** LOCAL: candidate for foundation (FlatCurveBar live width).
 *  FlatCurveBar has no ticking mode, and a Fortress curve moves with the
 *  simulated cap, so the fill's width is written from the "curve" cell
 *  on each commit. Only ever used for a trusted curve. The sheet uses it
 *  too: a fixed bar beside a ticking percentage would disagree with it. */
export function LiveCurveBar({ row, w, className = "bs-curvebar" }: { row: TrendingRow; w: Window; className?: string }) {
  const { value, ref } = useLiveValue<HTMLSpanElement>(row.ticker, w, "curve", (el, v) => {
    const fill = el.querySelector<HTMLElement>(":scope > div > div");
    if (fill && v !== null) fill.style.width = `${Math.max(0, Math.min(99, v))}%`;
  });
  return (
    <span ref={ref} className={className}>
      <FlatCurveBar curve={value ?? row.curve} migrated={false} tier={row.tier} trusted height={3} />
    </span>
  );
}

/** Migrated is the common state (most of the board), so its mark is
 *  muted. The accent means "look here", and a column of accent ticks
 *  would make the least remarkable fact the loudest one on the row. */
function CurveCell({ row, w }: { row: TrendingRow; w: Window }) {
  if (row.migrated) {
    return (
      <span title="Migrated" className="inline-flex">
        <CheckMark className="h-3 w-3 text-muted" />
        <span className="sr-only">Migrated</span>
      </span>
    );
  }
  if (row.curveTrusted) {
    return (
      <>
        <LiveCurveBar row={row} w={w} />
        <Live row={row} w={w} cell="curve" format={(v) => fmt.share(v, 0)} className="bs-curve-n num" />
      </>
    );
  }
  // A roster fixture: hatched, never filled, and its figure static and
  // dim, so a Free coin at 95% doesn't read as nearly graduated.
  return (
    <>
      <span className="bs-curvebar" title={LABELS.CURVE_CAVEAT}>
        <FlatCurveBar curve={row.curve} migrated={false} tier={row.tier} trusted={false} untrusted="hatch" height={3} />
      </span>
      <span className="bs-curve-n num text-dim" title={LABELS.CURVE_CAVEAT}>
        {fmt.share(row.curve, 0)}
      </span>
    </>
  );
}

/** The coin's age, and the since-launch mark when the coin is younger
 *  than the window. It sits before the seat on a narrow row's second
 *  line, and in its own headed slot at the end of the line on the
 *  workstation: set straight after "Z500 #13" it read as how long the
 *  seat had been held.
 *
 *  The mark is a footnote, explained under the Age head, with the words
 *  in its title and for a screen reader. Written out, "· since launch"
 *  didn't fit beside a seat, a boost and a name at any width (at 24h it
 *  was cut to "· SI…" on a dozen rows), and an honesty label cut short
 *  says nothing. The age beside it is what explains it: a 15h coin has
 *  no 24h of its own. */
function Age({ row, w, since }: { row: TrendingRow; w: Window; since: boolean }) {
  return (
    <span className="bs-age">
      <Live row={row} w={w} cell="age" format={fmt.ageLike(row.ageLabel)} className="num" />
      {since && (
        <span className="bs-sl" title={LABELS.SINCE_LAUNCH_TITLE}>
          <span aria-hidden>*</span>
          <span className="sr-only">{LABELS.SINCE_LAUNCH}</span>
        </span>
      )}
    </span>
  );
}

/** What the age mark means. */
const AGE_NOTE = `Coin age. * ${LABELS.SINCE_LAUNCH}: ${LABELS.SINCE_LAUNCH_TITLE}`;

/** Buys over sells, each in a slot of its own so a column of buys lines
 *  up with buys whatever the sells beside it print. */
function FlowCell({ row, w, since }: { row: TrendingRow; w: Window; since: boolean }) {
  const span = since ? LABELS.SINCE_LAUNCH : `last ${w}`;
  return (
    <div role="gridcell" className="bs-c-flow bs-fig" title={`Buys / sells, ${span}. Bar: buy share of trades.`}>
      <span className="bs-flow-n num">
        <Live row={row} w={w} cell="buys" format={fmt.count} />
        <span className="bs-slash">/</span>
        <Live row={row} w={w} cell="sells" format={fmt.count} />
      </span>
      <SplitBar row={row} w={w} />
    </div>
  );
}

/* -------------------------------------------------------------- row */

type RowProps = {
  ticker: string;
  index: number;
  w: Window;
  tab: BsTab;
  selected: boolean;
  starred: boolean;
  focusable: boolean;
  src?: string;
  onSelect: (t: string, how: SelectHow) => void;
  onBuy: (t: string) => void;
  /** The quick-buy size and unit, for the key's spoken label. */
  amt: string;
  unit: string;
  /** The poster snapshot's time on the Z500 tab, else 0. Only here so the
   *  sixteen seat rows re-render on each snapshot and the seat state
   *  reads the same cap as the MCAP cell beside it. */
  zTick: number;
};

export const Row = memo(function Row({
  ticker,
  index,
  w,
  tab,
  selected,
  starred,
  focusable,
  src,
  onSelect,
  onBuy,
  amt,
  unit,
}: RowProps) {
  const sim = useMarketSim();
  const row = sim.row(ticker)!;
  const seat = row.seat;
  const z = tab === "z500";
  const st = seat ? seatState(row, sim.value(ticker, w, "mc") ?? row.mcUsd) : null;
  const tier = TIER_GLYPH[row.tier];
  const since = useSinceLaunch(ticker, w);

  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      data-ticker={ticker}
      data-since={since ? "" : undefined}
      tabIndex={focusable ? 0 : -1}
      onFocus={() => onSelect(ticker, "focus")}
      onClick={() => onSelect(ticker, "click")}
      onKeyDown={(e) => {
        // The row's own keys only: Enter on the Buy key inside it is the
        // key's click, and must not be taken from it.
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onSelect(ticker, "click");
      }}
      className="bs-row bs-grid"
    >
      <div role="gridcell" className="bs-c-rank num">
        {index + 1}
      </div>

      <div role="gridcell" className="bs-c-pair">
        <CoinAvatar ticker={ticker} src={src} size={20} />
        <span className="bs-id">
          <span className="bs-tick" title={row.name}>
            ${ticker}
          </span>
          <span className="bs-name cased" title={row.name}>
            {row.name}
          </span>
        </span>
        <span className="bs-l2">
          <GlyphBadge cls={tier.cls} box={tier.box} label={row.tier} className="bs-tierg" />
          <Age row={row} w={w} since={since} />
          {seat && st && (
            <span className="meta bs-seat" title={`Z500 seat ${seat.seatNo}, ${seat.route} route. ${st.sentence}`}>
              Z500 #{seat.seatNo}
            </span>
          )}
          {row.boost && (
            <span className="bs-boost" title={LABELS.BOOST_TITLE}>
              <BoostChip points={row.boost.points} bare />
            </span>
          )}
          {starred && (
            <span className="bs-star inline-flex">
              <StarMark className="h-2.5 w-2.5 text-muted" />
              <span className="sr-only">Starred</span>
            </span>
          )}
          {/* The one row that is neither a fixture nor simulated, so on a
              narrow row this is the item line two never drops: it goes
              first, in its short form where the full one won't fit beside
              the age (see broadside.css). Both forms are hidden from a
              screen reader, which hears the full tag once. */}
          {row.real && (
            <span className="meta text-rim bs-real" title={LABELS.REAL_TITLE}>
              <span aria-hidden className="bs-real-full">
                {LABELS.REAL}
              </span>
              <span aria-hidden className="bs-real-short">
                {REAL_SHORT}
              </span>
              <span className="sr-only">{LABELS.REAL}</span>
            </span>
          )}
          {row.migrated && (
            <span className="bs-mig-sm inline-flex" title="Migrated">
              <CheckMark className="h-3 w-3 text-muted" />
            </span>
          )}
        </span>
      </div>

      {z ? (
        <div role="gridcell" className="bs-c-trades bs-fig is-rank">
          {st?.numeral != null ? (
            <span className={cx("num", TONE_CLASS[st.tone])} title={st.sentence}>
              {st.numeral}
            </span>
          ) : seat ? (
            // Unscored seats follow by seat number, so the number is what
            // this column prints for them: the order reads down one column.
            <span className="meta bs-seatno" title={st?.sentence}>
              Seat #{seat.seatNo}
            </span>
          ) : null}
        </div>
      ) : (
        <div role="gridcell" className={cx("bs-c-trades bs-fig", tab !== "top" && "is-rank")}>
          <Live row={row} w={w} cell="txns" format={fmt.count} className="num" />
        </div>
      )}

      <FlowCell row={row} w={w} since={since} />

      <div role="gridcell" className="bs-c-chg bs-fig">
        <Live row={row} w={w} cell="change" format={fmt.pct} className="num bs-chg" />
      </div>

      <div role="gridcell" className={cx("bs-c-mc bs-fig", tab === "top" && "is-rank")}>
        <Live row={row} w={w} cell="mc" format={fmt.usdLike(row.mcLabel)} split className="num" />
      </div>

      <div role="gridcell" className="bs-c-vol bs-fig">
        <Live row={row} w={w} cell="volume" format={fmt.usd} split className="num" />
      </div>

      <div role="gridcell" className="bs-c-curve bs-fig">
        <CurveCell row={row} w={w} />
      </div>

      <div role="gridcell" className="bs-c-act">
        <BuyKey ticker={ticker} onBuy={onBuy} label={`Buy ${amt} ${unit} of $${ticker}. ${LABELS.QB_TITLE}`} />
      </div>
    </div>
  );
});

/** Shown only on the hovered, focused or selected row, so a column of
 *  identical keys doesn't sit beside every coin. The words are in the
 *  label and the title both: pressing it sends nothing. */
function BuyKey({ ticker, onBuy, label }: { ticker: string; onBuy: (t: string) => void; label: string }) {
  return (
    <button
      type="button"
      className="bs-buy meta"
      aria-label={label}
      title={LABELS.QB_TITLE}
      onClick={(e) => {
        e.stopPropagation();
        onBuy(ticker);
      }}
    >
      Buy
    </button>
  );
}

/* ------------------------------------------------------------- head */

function Head({ tab, w }: { tab: BsTab; w: Window }) {
  const W = w.toUpperCase();
  const rankCol = tab === "top" ? "mc" : "trades";
  const h = (key: string, label: string, cls: string) => (
    <div
      role="columnheader"
      aria-sort={key === rankCol ? "descending" : undefined}
      className={cx("meta", cls, key === rankCol && "is-rank")}
    >
      {label}
      {key === rankCol && <span aria-hidden> ▼</span>}
    </div>
  );
  return (
    <div role="row" aria-rowindex={1} className="bs-thead bs-grid">
      <div role="columnheader" className="meta bs-c-rank">
        #
      </div>
      <div role="columnheader" className="bs-c-pair">
        <span className="meta">Pair</span>
        <span className="bs-agehead">
          <Tip label={AGE_NOTE} align="end">
            <span className="meta cursor-help underline decoration-dotted underline-offset-2">Age</span>
          </Tip>
        </span>
      </div>
      {h("trades", tab === "z500" ? "Score/seat" : `Trades ${W}`, "bs-c-trades bs-fig")}
      {h("flow", `Buys / sells ${W}`, "bs-c-flow bs-fig")}
      {h("chg", `Chg ${W}`, "bs-c-chg bs-fig")}
      {h("mc", "Mcap", "bs-c-mc bs-fig")}
      {h("vol", `Vol ${W}`, "bs-c-vol bs-fig")}
      <div role="columnheader" className="bs-c-curve bs-fig">
        <Tip label={`${LABELS.CURVE_CAVEAT} ${LABELS.CURVE_FORTRESS}`} align="end">
          <span className="meta cursor-help underline decoration-dotted underline-offset-2">{LABELS.CURVE_HEAD}</span>
        </Tip>
      </div>
      <div role="columnheader" className="bs-c-act">
        <span className="sr-only">Action</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ board */

export function Board({
  boardRef,
  tickers,
  tab,
  w,
  selected,
  stars,
  art,
  zTick,
  onSelect,
  onBuy,
  onHover,
  onFocusIn,
  amt,
  unit,
  empty,
}: {
  boardRef: RefObject<HTMLDivElement | null>;
  tickers: string[];
  tab: BsTab;
  w: Window;
  selected: string | null;
  stars: ReadonlySet<string>;
  art: Record<string, string>;
  zTick: number;
  onSelect: (t: string, how: SelectHow) => void;
  onBuy: (t: string) => void;
  onHover: (on: boolean) => void;
  onFocusIn: (on: boolean) => void;
  amt: string;
  unit: string;
  empty: { sub: string; action?: { label: string; run: () => void } };
}) {
  const hasSel = selected !== null && tickers.includes(selected);
  return (
    <div
      id="bs-board"
      ref={boardRef}
      data-w={w}
      role="tabpanel"
      aria-label={`${tab === "z500" ? "Z500" : tab[0].toUpperCase() + tab.slice(1)} board`}
      className="bs-board no-anchor"
      onPointerEnter={(e: PointerEvent) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={(e: FocusEvent) => onFocusIn((e.target as HTMLElement).matches(":focus-visible"))}
      onBlur={(e: FocusEvent) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) onFocusIn(false);
      }}
    >
      <div role="grid" aria-rowcount={tickers.length + 1} aria-label="Board" className="bs-table">
        <Head tab={tab} w={w} />
        {tickers.length === 0 ? (
          <div role="row" className="bs-empty">
            <div role="gridcell" className="bs-empty-cell">
              <p className="meta">{empty.sub}</p>
              {empty.action && (
                <button type="button" className="meta bs-textbtn" onClick={empty.action.run}>
                  {empty.action.label}
                </button>
              )}
            </div>
          </div>
        ) : (
          tickers.map((t, i) => (
            <Row
              key={t}
              ticker={t}
              index={i}
              w={w}
              tab={tab}
              selected={t === selected}
              starred={stars.has(t)}
              focusable={hasSel ? t === selected : i === 0}
              src={art[t]}
              onSelect={onSelect}
              onBuy={onBuy}
              amt={amt}
              unit={unit}
              zTick={tab === "z500" ? zTick : 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
