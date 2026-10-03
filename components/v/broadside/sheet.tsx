"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BoostChip, CoinAvatar, TierMark, cx } from "@/components/ui";
import { CheckMark } from "@/components/marks";
import { FlatCurveBar, amountText } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { seatState } from "@/lib/seat-state";
import { useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import { quickBuy, type TrendingRow, type Window } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { Live, LiveCurveBar } from "./board";
import { MintCopy } from "./poster";
import { QuickBuySizes, type QuickBuyState } from "./controls";

/* The row, opened, below 1024px: everything the phone row had no room
   for, including the curve with its caveat beside it and the one buy
   key. Mounted only while open, so no list of figures ticks behind a
   closed dialog. A native modal <dialog>: Escape and focus return come
   with it, and it is never position: relative (it would open off screen
   on a scrolled page). */

function Line({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="bs-sheet-line">
      <dt className="meta">{label}</dt>
      <dd className="num">{children}</dd>
    </div>
  );
}

function short(mint: string) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function Sheet({
  ticker,
  w,
  src,
  qb1,
  qb2,
  starred,
  onBuy,
  onStar,
  onHide,
  onClose,
}: {
  ticker: string;
  w: Window;
  src?: string;
  qb1: QuickBuyState;
  qb2: QuickBuyState;
  starred: boolean;
  onBuy: (ticker: string, amount: number, unit: string) => void;
  onStar: () => void;
  onHide: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const sim = useMarketSim();
  const row = sim.row(ticker) as TrendingRow;
  const since = useSinceLaunch(ticker, w);
  const st = seatState(row, sim.value(ticker, w, "mc") ?? row.mcUsd);
  const W = since ? LABELS.SINCE_LAUNCH : w;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const buyGroup = (qb: QuickBuyState, chain: 1 | 2) => {
    const [amount, , , unit] = qb;
    return (
      <div className={cx(chain === 1 ? "only-chain1" : "only-chain2", "flex flex-col gap-2")}>
        <div className="flex items-center gap-2">
          <QuickBuySizes qb={qb} />
          <span className="meta">{unit}</span>
        </div>
        <button type="button" className="bs-sheet-buy meta" title={LABELS.QB_TITLE} onClick={() => onBuy(ticker, amount, unit)}>
          Buy {amountText(amount)} {unit}
        </button>
        <p className="meta" title={LABELS.QB_TITLE}>
          {LABELS.QB_TAG} · {LABELS.USD_EQ(fmt.usd(quickBuy(chain).toUsd(amount)))}
        </p>
      </div>
    );
  };

  return (
    <dialog
      ref={ref}
      aria-label={`$${ticker}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="bs-sheet mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-[560px] overflow-auto border-t border-line-bright bg-elev p-0 text-bone"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CoinAvatar ticker={ticker} src={src} size={28} />
          <span className="bs-sheet-tick">${ticker}</span>
          <span className="cased text-[13px] text-muted">{row.name}</span>
          <TierMark tier={row.tier} showFree />
          {row.real && (
            <span className="meta text-rim" title={LABELS.REAL_TITLE}>
              {LABELS.REAL}
            </span>
          )}
          <button type="button" className="meta bs-textbtn ml-auto" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>

        <p className="meta flex flex-wrap items-center gap-2">
          <span title={st.sentence}>{row.seat ? `Z500 #${row.seat.seatNo} · ${st.short}` : LABELS.SEAT.NONE}</span>
          {row.boost && (
            <span className="bs-boost" title={LABELS.BOOST_TITLE}>
              <BoostChip points={row.boost.points} bare />
            </span>
          )}
        </p>

        <dl className="flex flex-col">
          <Line label="Price">
            <Live row={row} w={w} cell="price" format={fmt.price} />
          </Line>
          <Line label={`Change ${W}`}>
            <Live row={row} w={w} cell="change" format={fmt.pct} className="bs-chg" />
          </Line>
          <Line label={`Trades ${W}`}>
            <Live row={row} w={w} cell="txns" format={fmt.count} />
          </Line>
          <Line label={`Buys / sells ${W}`}>
            <Live row={row} w={w} cell="buys" format={fmt.count} />
            <span className="text-dim"> / </span>
            <Live row={row} w={w} cell="sells" format={fmt.count} />
          </Line>
          <Line label={`Volume ${W}`}>
            <Live row={row} w={w} cell="volume" format={fmt.usd} />
          </Line>
          <Line label="Market cap">
            <Live row={row} w={w} cell="mc" format={fmt.usdLike(row.mcLabel)} />
          </Line>
          <Line label="Liquidity">
            <Live row={row} w={w} cell="liquidity" format={(v) => fmt.usd(v)} />
          </Line>
          <Line label="Curve">
            {row.migrated ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckMark className="h-3 w-3 text-muted" />
                Migrated
              </span>
            ) : row.curveTrusted ? (
              // The bar is written from the same ticking cell as the
              // figure beside it, so the two can't disagree.
              <span className="inline-flex items-center gap-2">
                <LiveCurveBar row={row} w={w} className="inline-block w-[56px]" />
                <Live row={row} w={w} cell="curve" format={(v) => fmt.share(v, 0)} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-[56px]">
                  <FlatCurveBar curve={row.curve} migrated={false} tier={row.tier} trusted={false} untrusted="hatch" height={3} />
                </span>
                <span className="text-dim">{fmt.share(row.curve, 0)}</span>
              </span>
            )}
          </Line>
        </dl>
        {/* Beside the figure it qualifies: a roster curve with no caveat
            next to it would read as progress toward graduation. */}
        {!row.migrated && !row.curveTrusted && <p className="bs-sheet-caveat">{LABELS.CURVE_CAVEAT}</p>}
        <dl className="flex flex-col">
          <Line label="Age">
            <Live row={row} w={w} cell="age" format={fmt.ageLike(row.ageLabel)} />
          </Line>
          <Line label="Mint">
            <span className="only-chain1 inline-flex">
              <MintCopy row={row} className="bs-sheet-mint">
                <span className="num">{short(row.mint)}</span>
              </MintCopy>
            </span>
            {/* The network switch is on the outer span alone, so no
                display rule of this file's can ever outrank the shared
                hide on the same element. */}
            <span className="only-chain2">
              <span className="meta bs-sheet-note">{LABELS.NET2_MINT}</span>
            </span>
          </Line>
        </dl>

        {buyGroup(qb1, 1)}
        {buyGroup(qb2, 2)}

        <div className="flex items-center gap-4">
          <button type="button" className="meta bs-textbtn" aria-pressed={starred} onClick={onStar}>
            {starred ? "Unstar" : "Star"}
          </button>
          <button type="button" className="meta bs-textbtn" onClick={onHide}>
            Hide coin
          </button>
        </div>
        <p className="meta">{LABELS.NO_PAGE}</p>
      </div>
    </dialog>
  );
}
