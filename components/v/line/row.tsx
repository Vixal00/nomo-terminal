"use client";

import { memo, type MouseEvent } from "react";
import { CoinAvatar, GlyphBadge, cx } from "@/components/ui";
import { RouteMark, SeatBadge } from "@/components/seat-badge";
import { CheckMark, StarMark } from "@/components/marks";
import { FlatCurveBar, amountText, usePlaceholderBuy } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { TONE_CLASS, scoreTone, seatState } from "@/lib/seat-state";
import type { RowSeat, TrendingRow, Window } from "@/lib/trending";
import { useLiveCell, useLiveValue, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { LINE_COPY, TIER_GLYPH, gateAttr, meritGates } from "./lifecycle";

export type Kind = "grad" | "curve";
export type SelectHow = "click" | "focus";

/* One coin on either side of the line.

   Both kinds share one DOM and one column grid (--line-cols in
   line.css), so the lifecycle slot, the 14px node column, falls at the
   same x above and below the band: a graduated row puts its tick there,
   a trusted curve row the end of its bar. Only the three cells around
   that slot differ by kind.

   Every ticking figure is a useLiveCell span with nothing else inside
   it, so a commit rewrites text and data attributes in place and the
   row never re-renders for a tick. The row itself is memoised on its
   props: a re-rank moves rows, a selection re-renders two of them, and
   nothing else touches them. */

type RowProps = {
  ticker: string;
  kind: Kind;
  w: Window;
  src?: string;
  selected: boolean;
  /** The pane's one tab stop (see Pane). */
  tabbable: boolean;
  starred: boolean;
  qbAmount: number;
  qbUnit: string;
  onSelect: (ticker: string, how: SelectHow) => void;
};

export const Row = memo(function Row({ ticker, kind, w, src, selected, tabbable, starred, qbAmount, qbUnit, onSelect }: RowProps) {
  const sim = useMarketSim();
  const row = sim.row(ticker);
  if (!row) return null;

  /* The whole row answers a click, not only the transparent button
     under the cells: the cells sit above it so their titles still show
     on hover, and a click on one bubbles here. Focus isn't moved by
     script on a click: a script-moved focus draws the keyboard ring,
     and the row keys act on the selection, not on focus. */
  const click = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(".c-buy")) return;
    onSelect(ticker, "click");
  };

  return (
    <li
      className="lrow"
      data-kind={kind}
      data-tier={row.tier}
      data-ticker={ticker}
      aria-current={selected || undefined}
      onClick={click}
    >
      <button
        type="button"
        className="hit"
        tabIndex={tabbable ? 0 : -1}
        aria-label={`$${ticker}, ${row.name}`}
        onFocus={() => onSelect(ticker, "focus")}
      />
      <PairCell row={row} w={w} src={src} starred={starred} />
      <MarketCells row={row} w={w} />
      {kind === "grad" ? <GradCells row={row} w={w} /> : <CurveCells row={row} w={w} />}
      <BuyKey ticker={ticker} amount={qbAmount} unit={qbUnit} />
    </li>
  );
});

/* ------------------------------------------------------------- Pair */

function PairCell({ row, w, src, starred }: { row: TrendingRow; w: Window; src?: string; starred: boolean }) {
  const age = useLiveCell(row.ticker, w, "age", fmt.ageLike(row.ageLabel));
  const since = useSinceLaunch(row.ticker, w);
  const g = TIER_GLYPH[row.tier];
  return (
    <div className="lc c-pair">
      <CoinAvatar ticker={row.ticker} src={src} size={22} />
      <div className="pid">
        <div className="l1">
          <span className="tk">${row.ticker}</span>
          <GlyphBadge cls={g.cls} box={g.box} label={row.tier} />
          {starred && <StarMark className="star" />}
        </div>
        <div className="l2">
          <span className="nm cased" title={row.name}>
            {row.name}
          </span>
          <span ref={age.ref} {...age.data} className="num age">
            {age.text}
          </span>
          {since && (
            <span className="meta since" title={LABELS.SINCE_LAUNCH_TITLE}>
              {LABELS.SINCE_LAUNCH}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Market */

/** The reason a dash is a dash. T's nulls are figures nobody indexed;
 *  anyone else's is a window with nothing in it. */
function nullTitle(row: TrendingRow, text: string, fallback: string = LABELS.NULL_TITLE) {
  if (text !== fmt.NULL) return undefined;
  return row.real ? LABELS.NOT_INDEXED : fallback;
}

function Split({ cell }: { cell: ReturnType<typeof useLiveCell> }) {
  return (
    <>
      <span>{cell.head}</span>
      <span data-part="unit">{cell.tail}</span>
    </>
  );
}

function MarketCells({ row, w }: { row: TrendingRow; w: Window }) {
  const t = row.ticker;
  const chg = useLiveCell(t, w, "change", fmt.pct);
  const mc = useLiveCell(t, w, "mc", fmt.usdLike(row.mcLabel), { split: true });
  const vol = useLiveCell(t, w, "volume", fmt.usd, { split: true });
  const flow = useLiveCell(t, w, "netFlow", fmt.usd);
  const txns = useLiveCell(t, w, "txns", fmt.count);
  const liq = useLiveCell(t, w, "liquidity", fmt.usd, { split: true });
  /* The buy share as a width, written to the node: a bar is not text,
     so it takes useLiveValue, and the track goes flat when the window
     has no trades to split. */
  const ratio = useLiveValue<HTMLSpanElement>(t, w, "buyRatio", (el, v) => {
    el.style.width = v === null ? "0%" : `${v * 100}%`;
    if (el.parentElement) el.parentElement.dataset.null = String(v === null);
  });

  return (
    <>
      <div className="lc c-chg fig">
        <span ref={chg.ref} {...chg.data} className="num sg" title={nullTitle(row, chg.text, LABELS.CHANGE_NULL_TITLE)}>
          {chg.text}
        </span>
      </div>
      <div className="lc c-mc fig">
        <span ref={mc.ref} {...mc.data} className="num">
          <Split cell={mc} />
        </span>
      </div>
      <div className="lc c-vol fig">
        <span ref={vol.ref} {...vol.data} className="num" title={nullTitle(row, vol.text)}>
          <Split cell={vol} />
        </span>
        <span ref={flow.ref} {...flow.data} className="num sg sub" title={nullTitle(row, flow.text) ?? "Net flow: buy volume less sell volume"}>
          {flow.text}
        </span>
      </div>
      <div className="lc c-txn fig">
        <span ref={txns.ref} {...txns.data} className="num" title={nullTitle(row, txns.text)}>
          {txns.text}
        </span>
        <span className="split" data-null={String(ratio.value === null)} aria-hidden>
          <span ref={ratio.ref} style={{ width: ratio.value === null ? "0%" : `${ratio.value * 100}%` }} />
        </span>
      </div>
      <div className="lc c-liq fig">
        <span ref={liq.ref} {...liq.data} className="num" title={nullTitle(row, liq.text)}>
          <Split cell={liq} />
        </span>
      </div>
    </>
  );
}

/* -------------------------------------------------------- Graduated */

function GradCells({ row, w }: { row: TrendingRow; w: Window }) {
  const seat = row.seat;
  /* The state reads the simulated cap (an unscored seat can cross the
     $250K floor mid-session), so it is kept current on the node and
     coloured from data-tone, which the same write updates. */
  const state = useLiveValue<HTMLSpanElement>(row.ticker, w, "mc", (el, v) => {
    const s = seatState(row, v ?? row.mcUsd);
    if (el.textContent !== s.short) el.textContent = s.short;
    if (el.dataset.tone !== s.tone) el.dataset.tone = s.tone;
    if (el.title !== s.sentence) el.title = s.sentence;
  });
  const s = seatState(row, state.value ?? row.mcUsd);

  return (
    <>
      <div className="lc c-pre">{seat && <SeatBadge seat={seat} />}</div>
      <div className="lc c-node">
        <CheckMark className="gmark" />
      </div>
      <div className="lc c-post">
        <div className="pg">
          <span className="stand">
            {seat?.scored ? (
              <ScoreBar seat={seat} size="row" />
            ) : (
              <span className="meta unsc" title={s.sentence}>
                Unscored
              </span>
            )}
          </span>
          <span ref={state.ref} className="state" data-tone={s.tone} title={s.sentence}>
            {s.short}
          </span>
          <span className="num air v-val" title={LINE_COPY.AIRDROP_TITLE}>
            {fmt.usd(row.airdroppedUsd)}
          </span>
        </div>
      </div>
    </>
  );
}

/** One bar for the whole score, 0 to 100, with the exit line (40) and
 *  the entry bar (50) ticked on it. No per-component segments: they
 *  would need the score inputs, which disagree with the holder count
 *  printed elsewhere (D6). Only scored seats get one; a Fortress or
 *  Diamond seat's fixture score isn't a figure the index uses. */
export function ScoreBar({ seat, size }: { seat: Pick<RowSeat, "scored" | "score">; size: "row" | "lg" }) {
  const tone = scoreTone(seat);
  return (
    <span className="sbar" data-size={size} title={LINE_COPY.SCORE_TITLE}>
      <span className="sb-track v-val" aria-hidden>
        <span className="sb-fill" data-tone={tone} style={{ width: `${Math.max(0, Math.min(100, seat.score))}%` }} />
        <span className="sb-tick exit" />
        <span className="sb-tick bar" />
      </span>
      <span className={cx("num sn", TONE_CLASS[tone])}>{seat.score}</span>
    </span>
  );
}

/* --------------------------------------------------------- On curve */

function CurveCells({ row, w }: { row: TrendingRow; w: Window }) {
  const t = row.ticker;
  const pct = useLiveCell(t, w, "curve", curvePct, { flash: false });
  /* Only a trusted curve moves (an unmigrated Fortress cap), and only
     its fill: the width is written to the node, capped at 99 like the
     foundation's, so the bar can't draw a graduation that hasn't
     happened. */
  const bar = useLiveValue<HTMLDivElement>(t, w, "curve", (el, v) => {
    const f = el.querySelector<HTMLElement>("[data-trusted] > div");
    if (f && v !== null) f.style.width = `${Math.min(99, v)}%`;
  });

  let post;
  if (row.real) {
    post = (
      <span className="meta" title={LABELS.REAL_TITLE}>
        {LABELS.REAL}
      </span>
    );
  } else if (row.tier === "Free") {
    post = <Gates row={row} w={w} />;
  } else {
    post = (
      <span className="route">
        <RouteMark route={row.tier} className="rmark" />
        <span className="after">{LINE_COPY.SEAT_AFTER}</span>
      </span>
    );
  }

  return (
    <>
      <div className="lc c-pre" data-trusted={String(row.curveTrusted)}>
        <span
          ref={pct.ref}
          {...pct.data}
          className="num cpct"
          title={row.curveTrusted ? (row.real ? LABELS.REAL_TITLE : LABELS.CURVE_FORTRESS) : LABELS.CURVE_CAVEAT}
        >
          {pct.text}
        </span>
        {/* Cards drop the column head and the caveat footer out of view,
            so there the figure carries its own qualifier. */}
        {!row.curveTrusted && (
          <span className="meta ctag" title={LABELS.CURVE_CAVEAT}>
            {LINE_COPY.ROSTER_TAG}
          </span>
        )}
        <div ref={bar.ref} className="cbar">
          <FlatCurveBar
            curve={bar.value ?? row.curve}
            migrated={false}
            tier={row.tier}
            trusted={row.curveTrusted}
            untrusted="hatch"
            height={6}
          />
        </div>
      </div>
      <div className="lc c-node">{row.curveTrusted && <span className="tick" aria-hidden />}</div>
      <div className="lc c-post">{post}</div>
    </>
  );
}

/** A curve reading as a whole percent, through the shared formatter so
 *  a null prints the one dash every other figure does. */
export const curvePct = (v: number | null) => fmt.share(v, 0);

/** The Merit minimums for a Free coin: holders (the audit's, static)
 *  and liquidity (simulated). The pass mark sits in its own span beside
 *  each value, so a card can drop the figures and keep the marks. */
function Gates({ row, w }: { row: TrendingRow; w: Window }) {
  const liq = useLiveCell(row.ticker, w, "liquidity", fmt.usd);
  const mark = useLiveValue<HTMLSpanElement>(row.ticker, w, "liquidity", (el, v) => {
    const g = gateAttr(meritGates(row, v).liq.ok);
    if (el.dataset.gate !== g) el.dataset.gate = g;
  });
  const g = meritGates(row, mark.value);
  return (
    <span className="gates" title={LINE_COPY.GATES_TITLE}>
      <span className="meta">Merit</span>
      <span className="gi">
        <span className="meta">Hld</span>
        <span className="num v-val">{fmt.count(g.holders.v)}</span>
        <span className="gm" data-gate={gateAttr(g.holders.ok)} />
      </span>
      <span className="gi">
        <span className="meta">Liq</span>
        <span ref={liq.ref} {...liq.data} className="num v-val">
          {liq.text}
        </span>
        <span ref={mark.ref} className="gm" data-gate={gateAttr(g.liq.ok)} />
      </span>
    </span>
  );
}

/* -------------------------------------------------------------- Buy */

/** The row's buy key. It never fills: the accent carries no text on
 *  this page, so nothing here needs the black-ink case on network 2. It
 *  says what it would send and that nothing is sent. Out of the tab
 *  order: B buys the selected row, and a stop per row would bury the
 *  dossier behind every other row's key. */
function BuyKey({ ticker, amount, unit }: { ticker: string; amount: number; unit: string }) {
  const buy = usePlaceholderBuy();
  return (
    <div className="lc c-buy">
      <button
        type="button"
        className="buy meta"
        tabIndex={-1}
        title={LABELS.QB_TITLE}
        aria-label={`Buy ${amountText(amount)} ${unit} of $${ticker}. ${LABELS.QB_TITLE}`}
        onClick={(e) => {
          e.stopPropagation();
          buy(ticker, amount, unit);
        }}
      >
        Buy
      </button>
    </div>
  );
}
