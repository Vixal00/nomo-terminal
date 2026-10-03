"use client";

import Image from "next/image";
import { memo, useSyncExternalStore } from "react";
import { cx } from "@/components/ui";
import { CopyMark, EthereumMark, SolanaMark, StarMark } from "@/components/marks";
import { LABELS } from "@/lib/labels";
import { seatState } from "@/lib/seat-state";
import type { TrendingRow, Window } from "@/lib/trending";
import { useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { COPY, TIER_CLS, TIER_TIP } from "./copy";
import { BoltIcon, UserIcon, UsersIcon } from "./icons";
import { Live, SparkChart } from "./live";
import { RowTip } from "./row-tip";
import { TokenInfo } from "./token-info";

/** The reference prints its cap, liquidity and volume bare ("59.3K"),
 *  and the column heads say what they are (in US dollars; each head's
 *  title says so). Same digits as the dollar formatters, without the
 *  sign, so a small figure keeps its cents rather than rounding to a
 *  whole number. */
const bare = (f: (v: number | null) => string) => (v: number | null) => f(v).replace("$", "");
const usdBare = bare(fmt.usd);

/** The Z500 tag, on seated rows only. Its sentence reads the seat's
 *  state at the simulated cap: an unscored seat crosses the $250K floor
 *  as the cap ticks, so the row re-renders when the state's kind
 *  changes (a string snapshot, so a tick that leaves it where it was
 *  renders nothing). */
function SeatTag({ row, w, focusable }: { row: TrendingRow; w: Window; focusable: boolean }) {
  const sim = useMarketSim();
  const seat = row.seat!;
  const kind = useSyncExternalStore(
    sim.subscribe,
    () => seatState(row, sim.value(row.ticker, w, "mc") ?? row.mcUsd).kind,
    () => seatState(row).kind,
  );
  const st = seatState(row, sim.value(row.ticker, w, "mc") ?? row.mcUsd);
  return (
    <RowTip label={`Z500 seat ${seat.seatNo}, ${seat.route} route. ${st.sentence}`} focusable={focusable} className="dc-seat-tip">
      <span className="dc-seat" data-kind={kind}>
        <span className="dc-seat-z">Z500</span>
        <span className="num">#{seat.seatNo}</span>
      </span>
    </RowTip>
  );
}

export type SelectHow = "focus" | "click";

type RowProps = {
  ticker: string;
  index: number;
  w: Window;
  selected: boolean;
  starred: boolean;
  /** The row that holds the board's one tab stop. Its inner controls and
   *  tips take focus too; every other row's are reached with J / K first,
   *  so Tab doesn't walk through 78 rows of chips. */
  active: boolean;
  src?: string;
  /** The quick-buy size on each network, as typed; the cascade shows one. */
  amt1: string;
  amt2: string;
  onSelect: (t: string, how: SelectHow) => void;
  onBuy: (t: string) => void;
  onStar: (t: string) => void;
  onCopy: (t: string) => void;
};

/** The reference's pair row: 112px tall at 1920, a 70px picture with a
 *  corner plate, two lines of identity, a chart, four figure columns, the
 *  token-info block and a buy key. Keyed by ticker and memoised, so a
 *  re-rank moves it without remounting it, and a commit re-renders
 *  nothing: every figure in it is written in place by the sim hooks. */
export const Row = memo(function Row({
  ticker,
  index,
  w,
  selected,
  starred,
  active,
  src,
  amt1,
  amt2,
  onSelect,
  onBuy,
  onStar,
  onCopy,
}: RowProps) {
  const sim = useMarketSim();
  const row = sim.row(ticker)!;
  const since = useSinceLaunch(ticker, w);
  const tab = active ? 0 : -1;
  const sinceTitle = since ? `${LABELS.SINCE_LAUNCH}: ${LABELS.SINCE_LAUNCH_TITLE}` : undefined;

  return (
    <div
      role="row"
      aria-selected={selected}
      data-ticker={ticker}
      tabIndex={tab}
      onFocus={(e) => {
        if (e.target === e.currentTarget) onSelect(ticker, "focus");
      }}
      onClick={() => onSelect(ticker, "click")}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        onSelect(ticker, "click");
      }}
      className="dc-row dc-grid"
    >
      {/* ---------------------------------------------------- pair info */}
      <div role="gridcell" className="dc-c dc-c-pair">
        <span className="dc-av">
          {src ? (
            <Image
              src={src}
              alt=""
              width={128}
              height={128}
              sizes="(max-width: 739px) 44px, (max-width: 1679px) 60px, 70px"
              priority={index < 8}
              className="dc-av-img"
            />
          ) : (
            <span aria-hidden className="dc-av-img dc-av-letters num">
              {ticker.slice(0, 2)}
            </span>
          )}
          <RowTip label={TIER_TIP[row.tier]} focusable={false} className="dc-tierbadge">
            <span className={cx("dc-tierplate", TIER_CLS[row.tier])}>
              <span aria-hidden className="dc-glyph" />
              <span className="sr-only">{TIER_TIP[row.tier]}</span>
            </span>
          </RowTip>
        </span>

        <span className="dc-pairtext">
          <span className="dc-l1">
            <span className="dc-tick" title={LABELS.NO_PAGE}>
              ${ticker}
            </span>
            <span className="dc-name" title={LABELS.NO_PAGE}>
              <span aria-hidden className="dc-dot">
                ·
              </span>
              <span className="cased">{row.name}</span>
            </span>
            <span className="only-chain1 dc-copywrap">
              <RowTip label={row.mintResolves ? "Copy the mint address" : `Copy the mint. ${LABELS.MINT_PLACEHOLDER}`} focusable={false}>
                <button
                  type="button"
                  tabIndex={tab}
                  className="dc-copy"
                  aria-label={`Copy $${ticker} mint address. ${row.mintResolves ? "" : LABELS.MINT_PLACEHOLDER}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(ticker);
                  }}
                >
                  <CopyMark className="h-full w-full" />
                </button>
              </RowTip>
            </span>
            <span className="only-chain2 dc-copywrap">
              <RowTip label={LABELS.NET2_MINT} focusable={false}>
                <button type="button" tabIndex={tab} className="dc-copy" aria-disabled="true" aria-label={LABELS.NET2_MINT} onClick={(e) => e.stopPropagation()}>
                  <CopyMark className="h-full w-full" />
                </button>
              </RowTip>
            </span>
            {/* The star sits after the copy key, where line one has room:
                on line two it crowded the Z500 tag into the chart. */}
            <button
              type="button"
              tabIndex={tab}
              aria-pressed={starred}
              aria-label={starred ? `Unstar $${ticker}` : `Star $${ticker}`}
              title={starred ? "Starred. Press S or click to unstar." : "Star (S). Stars are kept in this browser."}
              className="dc-star"
              onClick={(e) => {
                e.stopPropagation();
                onStar(ticker);
              }}
            >
              <StarMark className="h-full w-full" />
            </button>
          </span>

          {/* Line two in the reference's rhythm: the age, then small
              glyphs on a ~20px pitch, then a count. The age, the creator
              and a seat or real-launch tag always show; the holder count
              and boost points after them repeat the token-info block, so
              they are the part that gives way (wraps out of sight) when
              the column is too narrow for all of it. */}
          <span className="dc-l2" data-real={row.real ? "" : undefined}>
            <Live row={row} w={w} cell="age" format={fmt.ageLike(row.ageLabel)} flash={false} className="num dc-age" />
            <RowTip label={COPY.CREATOR(row.creator)} focusable={active} className="dc-creator-tip">
              <span className="dc-l2-ic dc-creator">
                <UserIcon className="h-full w-full" />
                <span className="sr-only">{COPY.CREATOR(row.creator)}</span>
              </span>
            </RowTip>
            {row.seat && <SeatTag row={row} w={w} focusable={active} />}
            {row.real && (
              <RowTip label={LABELS.REAL_TITLE} focusable={active} className="dc-real-tip">
                <span className="dc-real">{LABELS.REAL}</span>
              </RowTip>
            )}
            {!row.real && (
              <span className="dc-l2-more" aria-hidden>
                <span className="dc-l2-gap" />
                <span className="dc-l2-fact" title={row.holders === null ? `Holders: ${LABELS.NULL_TITLE}` : "Holders"}>
                  <UsersIcon className="dc-l2-ic" />
                  <span className="num">{fmt.compact(row.holders)}</span>
                </span>
                {row.boost && (
                  <span className="dc-l2-fact" title={`Boost points. ${LABELS.BOOST_TITLE}`}>
                    <BoltIcon className="dc-l2-ic dc-l2-bolt" />
                    <span className="num">{fmt.compact(row.boost.points)}</span>
                  </span>
                )}
              </span>
            )}
          </span>
        </span>
      </div>

      {/* ------------------------------------------------------- chart */}
      <div role="gridcell" className="dc-c dc-c-chart" title={LABELS.SPARK_TITLE}>
        <SparkChart row={row} w={w} />
      </div>

      {/* ----------------------------------------------------- figures */}
      <div role="gridcell" className="dc-c dc-c-mc">
        <Live row={row} w={w} cell="mc" format={bare(fmt.usdLike(row.mcLabel))} className="num dc-fig" />
        {/* The window's change. On a coin younger than the window it is
            the change since launch, marked as the volume is. */}
        <span className={cx("dc-chgwrap", since && "is-since")} title={sinceTitle}>
          <Live row={row} w={w} cell="change" format={fmt.pct} className="num dc-sub dc-chg" />
          {since && <span className="sr-only"> {LABELS.SINCE_LAUNCH}</span>}
        </span>
      </div>
      <div role="gridcell" className="dc-c dc-c-liq">
        <Live row={row} w={w} cell="liquidity" format={usdBare} className="num dc-fig" />
      </div>
      <div role="gridcell" className="dc-c dc-c-vol">
        <span className={cx("dc-volwrap", since && "is-since")} title={sinceTitle}>
          <Live row={row} w={w} cell="volume" format={usdBare} className="num dc-fig" />
          {since && <span className="sr-only"> {LABELS.SINCE_LAUNCH}</span>}
        </span>
      </div>
      <div role="gridcell" className="dc-c dc-c-txns">
        <Live row={row} w={w} cell="txns" format={fmt.compact} className="num dc-fig" />
        <span className="num dc-sub dc-bs" title="Buys / sells">
          <Live row={row} w={w} cell="buys" format={fmt.compact} className="dc-buys" />
          <span className="dc-slash"> / </span>
          <Live row={row} w={w} cell="sells" format={fmt.compact} className="dc-sells" />
        </span>
      </div>

      {/* -------------------------------------------------- token info */}
      <div role="gridcell" className="dc-c dc-c-info">
        <TokenInfo row={row} w={w} focusable={active} />
      </div>

      {/* ------------------------------------------------------ action */}
      <div role="gridcell" className="dc-c dc-c-act">
        {/* A key on every row, like the reference. Safe because the order
            holds while the pointer is on the board (useLiveOrder's
            freeze): the row under the cursor can't be swapped for another
            between aiming and pressing. It sends nothing, and says so
            before the press (title, label) and after it (the toast). */}
        <button
          type="button"
          tabIndex={tab}
          className="dc-buy"
          title={LABELS.QB_TITLE}
          aria-label={`Buy $${ticker}. ${LABELS.QB_TITLE}`}
          onClick={(e) => {
            e.stopPropagation();
            onBuy(ticker);
          }}
        >
          <span>Buy</span>
          <span className="only-chain1 dc-buy-amt">
            <SolanaMark className="dc-buy-mark" />
            <span className="num">{amt1}</span>
          </span>
          <span className="only-chain2 dc-buy-amt">
            <EthereumMark className="dc-buy-mark" />
            <span className="num">{amt2}</span>
          </span>
        </button>
      </div>
    </div>
  );
});
