"use client";

import { memo, useMemo } from "react";
import { CoinAvatar, cx } from "@/components/ui";
import { CheckMark, StarMark } from "@/components/marks";
import { amountText } from "@/components/trending";
import { auditBand, buyShareSide, heatBand, quickBuy, rowOf, type TrendingRow, type Window } from "@/lib/trending";
import { useLiveCell, useSinceLaunch, type Cell, type LiveAttrs } from "@/lib/trending-live";
import { LABELS } from "@/lib/labels";
import { TONE_CLASS, scoreTone, seatState } from "@/lib/seat-state";
import * as fmt from "@/lib/format";
import { CHANGE_COLS, RISK_COLS, type ColKey } from "./columns";

// LOCAL: candidate for foundation
/** A formatted figure without its unit, because the unit is printed once
 *  in the column head ("MCAP $", "5M" under "CHANGE BY WINDOW · %").
 *  Composition over lib/format, never a second formatter: the digits are
 *  exactly the ones every other version prints. */
export const bare = (s: string) => s.replace("$", "").replace("%", "");

/** A change at one decimal, whole above 100% where the decimal is noise
 *  and would widen the column. heatBand and data-sign both read the
 *  printed figure, so a tint never disagrees with its text. */
export const chg = (v: number | null) => bare(fmt.pct(v, v !== null && Math.abs(v) >= 100 ? 0 : 1));

const bandAttrs: LiveAttrs = (v) => ({ band: String(heatBand(v)) });
const sideAttrs: LiveAttrs = (v) => ({ side: String(buyShareSide(v)) });
const usdBare = (v: number | null) => bare(fmt.usd(v));
const share0 = (v: number | null) => (v === null ? fmt.NULL : bare(fmt.share(v * 100, 0)));
const curveText = (v: number | null) => (v === null ? fmt.NULL : String(Math.round(v)));

// LOCAL: candidate for foundation
/** The tier as a flat glyph in the tier's ink. The foundation's
 *  TierMark is a plate with an animated sheen, which at 78 rows is a
 *  column of moving metal beside the one field on this page that is
 *  meant to move the eye. The glyph and the ink come from the tier
 *  classes in globals.css, so the three tiers still read as the same
 *  objects they are everywhere else. */
const TIER_CLS: Record<TrendingRow["tier"], string> = {
  Free: "tier-free",
  Fortress: "tier-fortress",
  Diamond: "tier-ice",
};

export function TierGlyph({ tier, className }: { tier: TrendingRow["tier"]; className?: string }) {
  return <span role="img" aria-label={tier} title={tier} className={cx("hs-tier", TIER_CLS[tier], className)} />;
}

// LOCAL: candidate for foundation
/** The boost bolt, flat and still. The foundation's boost chip draws the
 *  same bolt but flickers a green glow on it every few seconds, and 25
 *  of those down a sheet whose only moving colour is meant to be the
 *  heat would pull the eye to the paid rows, the opposite of a
 *  disclosure. Same path, so it is the bolt a reader knows from every
 *  other screen. */
export function BoltGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.9 2 4.6 13.3a.6.6 0 0 0 .46.98h5.2l-1.2 7.02a.6.6 0 0 0 1.05.49l9.3-11.3a.6.6 0 0 0-.46-.98h-5.2l1.2-7.02A.6.6 0 0 0 13.9 2Z" />
    </svg>
  );
}

/** A paid boost, marked on the coin's own row at every width: the dock
 *  spells it out, but only for the selected coin, so the sheet is the
 *  one place a reader can see which coins paid. The words are its title
 *  and, for a screen reader, its name; on a touch screen, ? Keys. */
export function BoostMark({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Paid boost" title={LABELS.BOOST_TITLE} className={cx("hs-bolt", className)}>
      <BoltGlyph className="h-[10px] w-[10px]" />
    </span>
  );
}

function nullTitle(row: TrendingRow, change = false) {
  if (row.real) return LABELS.NOT_INDEXED;
  return change ? LABELS.CHANGE_NULL_TITLE : LABELS.NULL_TITLE;
}

/* No cell on the sheet flashes. The foundation's tick flash is a fill,
   and on this page the fills are the heat: a figure caught mid-flash
   reads as a band it isn't in, and a busy column of flashing trades
   reads as a third heat group. The digits changing, and a tint stepping
   when its figure crosses an edge, are the tick. */
const QUIET = { flash: false } as const;

/** The since-launch marker: a superscript on the figure's own side, so
 *  it can't be read as belonging to the column to the left. The letter
 *  is for the eye; a screen reader gets the words. */
function SinceLaunchMark() {
  return (
    <>
      <span aria-hidden className="sl" title={LABELS.SINCE_LAUNCH_TITLE}>
        L
      </span>
      <span className="sr-only">{LABELS.SINCE_LAUNCH}</span>
    </>
  );
}

/** One ticking figure in its cell. The span is exactly what useLiveCell
 *  writes to: its text (or head and unit) and data attributes, nothing
 *  else, because the hook rewrites it on every commit without React. */
function LiveCell({
  row,
  col,
  w,
  cell,
  format,
  split,
  attrs,
  title,
  className,
}: {
  row: TrendingRow;
  col: ColKey;
  w: Window;
  cell: Cell;
  format: (v: number | null) => string;
  split?: boolean;
  attrs?: LiveAttrs;
  title?: string;
  className?: string;
}) {
  const c = useLiveCell(row.ticker, w, cell, format, { ...QUIET, split, attrs });
  return (
    <div role="gridcell" className={cx("cell", `c-${col}`, className)} title={c.sign === "null" ? nullTitle(row) : title}>
      {split ? (
        <span ref={c.ref} {...c.data} className="num">
          <span>{c.head}</span>
          <span data-part="unit">{c.tail}</span>
        </span>
      ) : (
        <span ref={c.ref} {...c.data} className="num">
          {c.text}
        </span>
      )}
    </div>
  );
}

/** The window before each one: a longer window whose shorter neighbour
 *  already covers the coin's whole life repeats the same since-launch
 *  figure, so it prints a dot instead of the number again. */
const PREV: Record<Window, Window> = { "5m": "5m", "1h": "5m", "6h": "1h", "24h": "6h" };

/** A change cell: the tint sits on the cell, from the data-sign and
 *  data-band the ticking span inside it carries.
 *
 *  A window that only repeats the since-launch figure of the window to
 *  its left prints a dot. The figure stays in the markup, hidden, as the
 *  node the live cell ticks; no layout shows a window without the one to
 *  its left, so the dot never points at the wrong figure. */
export function ChangeCell({ row, col, win }: { row: TrendingRow; col: ColKey; win: Window }) {
  const t = row.ticker;
  const sl = useSinceLaunch(t, win);
  const slPrevRaw = useSinceLaunch(t, PREV[win]);
  const rep = sl && win !== "5m" && slPrevRaw;
  const c = useLiveCell(t, win, "change", chg, { ...QUIET, attrs: bandAttrs });
  return (
    <div
      role="gridcell"
      className={cx("cell c-chg", `c-${col}`, sl && "has-sl", rep && "c-rep")}
      title={c.sign === "null" ? nullTitle(row, true) : sl ? LABELS.SINCE_LAUNCH_TITLE : undefined}
    >
      <span ref={c.ref} {...c.data} className="num">
        {c.text}
      </span>
      {sl && <SinceLaunchMark />}
      {rep && (
        <span className="rep-dot">
          <span aria-hidden>·</span>
          <span className="sr-only">Same as the window before, {LABELS.SINCE_LAUNCH}</span>
        </span>
      )}
    </div>
  );
}

/** Trades in the window, the figure the board ranks by, printed whole,
 *  with the since-launch mark when the window is longer than the coin's
 *  life. */
function TxnCell({ row, w }: { row: TrendingRow; w: Window }) {
  const sl = useSinceLaunch(row.ticker, w);
  const c = useLiveCell(row.ticker, w, "txns", fmt.count, QUIET);
  return (
    <div
      role="gridcell"
      className={cx("cell c-txn", sl && "has-sl")}
      title={c.sign === "null" ? nullTitle(row) : sl ? LABELS.SINCE_LAUNCH_TITLE : undefined}
    >
      <span ref={c.ref} {...c.data} className="num">
        {c.text}
      </span>
      {sl && <SinceLaunchMark />}
    </div>
  );
}

const RISK_FIELD = { top10: "top10Pct", dev: "devPct", snipers: "snipersPct", bundlers: "bundlersPct" } as const;

/** A token-info figure. Static fixture, so the band is an attribute on
 *  the cell itself rather than something a commit rewrites. */
function RiskCell({ row, col, kind }: { row: TrendingRow; col: ColKey; kind: keyof typeof RISK_FIELD }) {
  const v = row[RISK_FIELD[kind]];
  const band = auditBand(kind, v);
  const title =
    v !== null ? undefined : row.real ? LABELS.NOT_INDEXED : kind === "top10" && row.top10Hidden ? LABELS.TOP10_HIDDEN : LABELS.NULL_TITLE;
  return (
    <div role="gridcell" className={cx("cell c-risk", `c-${col}`)} data-risk={band ?? "null"} title={title}>
      <span className="num">{v === null ? fmt.NULL : bare(fmt.share(v))}</span>
    </div>
  );
}

/** The curve as a number, never a bar. Migrated is a muted tick (a
 *  settled fact, not something to look at, so not the accent); a Fortress
 *  curve follows the simulated cap; any other curve is the roster's
 *  figure, dimmed, because it doesn't follow market cap and must not
 *  read as distance to graduation. */
function CurveCell({ row }: { row: TrendingRow }) {
  const c = useLiveCell(row.ticker, "24h", "curve", curveText, QUIET);
  if (row.migrated) {
    return (
      <div role="gridcell" className="cell c-crv">
        <span role="img" aria-label="Migrated" title="Migrated" className="hs-check">
          <CheckMark className="h-[10px] w-[10px]" />
        </span>
      </div>
    );
  }
  if (row.curveTrusted) {
    return (
      <div role="gridcell" className="cell c-crv text-muted">
        <span ref={c.ref} {...c.data} className="num">
          {c.text}
        </span>
      </div>
    );
  }
  return (
    <div role="gridcell" className="cell c-crv text-dim" title={LABELS.CURVE_CAVEAT}>
      <span className="num">{row.curve}</span>
    </div>
  );
}

/** The seat, through seatState only. An unscored seat is a U and never a
 *  numeral: its fixture score is not a figure the index uses. No seat
 *  is an empty cell, because "not seated" is a state, not a missing
 *  figure. */
function SeatCell({ row }: { row: TrendingRow }) {
  const s = seatState(row);
  if (!row.seat) return <div role="gridcell" className="cell c-z" title={s.sentence} />;
  if (s.numeral !== null) {
    return (
      <div role="gridcell" className="cell c-z" title={s.sentence}>
        <span className={cx("num", TONE_CLASS[scoreTone(row.seat)])}>{s.numeral}</span>
      </div>
    );
  }
  return (
    <div role="gridcell" className="cell c-z" title={`${s.sentence} Seat #${row.seat.seatNo}, ${row.seat.route}.`}>
      <span className={cx("meta", TONE_CLASS[s.tone])}>U</span>
    </div>
  );
}

export type RowProps = {
  ticker: string;
  /** The tab's rank: the position in the tab's own order, even when a
   *  column sort has rearranged the rows. */
  n: number;
  r24: number | undefined;
  selected: boolean;
  starred: boolean;
  w: Window;
  src: string | undefined;
  solAmt: number;
  ethAmt: number;
  rowId: string;
  onSelect: (t: string) => void;
  onBuy: (t: string) => void;
};

export const Row = memo(function Row({ ticker, n, r24, selected, starred, w, src, solAmt, ethAmt, rowId, onSelect, onBuy }: RowProps) {
  const row = rowOf(ticker)!;
  const mcFormat = useMemo(() => {
    const f = fmt.usdLike(row.mcLabel);
    return (v: number | null) => bare(f(v));
  }, [row.mcLabel]);
  const ageFormat = useMemo(() => fmt.ageLike(row.ageLabel), [row.ageLabel]);
  const mcTitle = row.fixes.includes("D7-mc") ? "Derived: clamped under the $1M graduation cap while unmigrated." : undefined;

  return (
    <div role="row" id={rowId} aria-selected={selected} className="g row" onClick={() => onSelect(ticker)}>
      <div role="gridcell" className="cell c-rank">
        <span className="num">{n}</span>
      </div>
      <div role="gridcell" className="cell c-r24">
        <span className="num">{r24 ?? ""}</span>
      </div>
      <div role="gridcell" className="cell c-av">
        <CoinAvatar ticker={ticker} src={src} size={14} />
      </div>
      <div role="gridcell" className="cell c-tier">
        <TierGlyph tier={row.tier} />
      </div>
      <div role="gridcell" className="cell c-name">
        <span className="tk">{row.ticker}</span>
        {row.boost && <BoostMark />}
        {starred && (
          <span role="img" aria-label="Starred" className="hs-star">
            <StarMark className="h-2 w-2" />
          </span>
        )}
        {row.real ? (
          <span className="meta nm-real" title={LABELS.REAL_TITLE}>
            {LABELS.REAL}
          </span>
        ) : (
          <span className="nm cased">{row.name}</span>
        )}
        {/* Over the end of the name, on the row the reader is on: a column
            of its own held nothing at rest and took a figure's width. Not
            on T's row, where the end of the name cell is "· SNAPSHOT", and
            a hovered T would read as a live launch. T is bought from the
            dock's key or with B, like any selected row. */}
        {!row.real && (
          <button
            type="button"
            className="rowbuy meta"
            title={LABELS.QB_TITLE}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(ticker);
              onBuy(ticker);
            }}
          >
            Buy{" "}
            <span className="only-chain1">
              {amountText(solAmt)} {quickBuy(1).unit}
            </span>
            <span className="only-chain2">
              {amountText(ethAmt)} {quickBuy(2).unit}
            </span>
          </button>
        )}
      </div>
      <LiveCell row={row} col="age" w="24h" cell="age" format={ageFormat} className="text-muted" />
      <LiveCell row={row} col="mc" w="24h" cell="mc" format={mcFormat} split title={mcTitle} />
      {CHANGE_COLS.map(([col, win]) => (
        <ChangeCell key={col} row={row} col={col} win={win} />
      ))}
      <LiveCell row={row} col="vol" w={w} cell="volume" format={usdBare} split />
      <TxnCell row={row} w={w} />
      <LiveCell row={row} col="bs" w={w} cell="buyRatio" format={share0} attrs={sideAttrs} />
      <LiveCell row={row} col="liq" w="24h" cell="liquidity" format={usdBare} split className="text-muted" />
      <div role="gridcell" className="cell c-hld text-muted" title={row.holders === null ? nullTitle(row) : undefined}>
        <span className="num">{fmt.compact(row.holders)}</span>
      </div>
      {RISK_COLS.map(([col, kind]) => (
        <RiskCell key={col} row={row} col={col} kind={kind} />
      ))}
      <CurveCell row={row} />
      <SeatCell row={row} />
    </div>
  );
});
