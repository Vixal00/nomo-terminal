"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CoinAvatar, cx } from "@/components/ui";
import { SeatBadge } from "@/components/seat-badge";
import { CopyMark, SolscanMark } from "@/components/marks";
import { amountText } from "@/components/trending";
import { quickBuy, rowOf, type Window } from "@/lib/trending";
import { useLiveCell, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import { LABELS } from "@/lib/labels";
import { TONE_CLASS, scoreTone, seatState } from "@/lib/seat-state";
import * as fmt from "@/lib/format";
import { BoltGlyph, TierGlyph } from "./row";

/* The selected coin, on one line under the sheet (two on a phone).

   It holds the figures a row has no room for, and the one Buy key a
   phone gets. Nothing in it is a second copy of a row figure except the
   price, which no row prints. */

export type Off = "above" | "below" | null;

type DockProps = {
  ticker: string | null;
  /** The coin's place in the tab's order, or null when it isn't on the board. */
  n: number | null;
  src: string | undefined;
  off: Off;
  w: Window;
  solAmt: number;
  ethAmt: number;
  onBuy: (t: string) => void;
  onReveal: () => void;
  onCopy: (t: string) => void;
};

function BuyLabel({ solAmt, ethAmt }: { solAmt: number; ethAmt: number }) {
  return (
    <>
      Buy <span className="only-chain1">{amountText(solAmt)} SOL</span>
      <span className="only-chain2">{amountText(ethAmt)} ETH</span>
    </>
  );
}

function UsdEq({ solAmt, ethAmt, className }: { solAmt: number; ethAmt: number; className?: string }) {
  return (
    <span className={className}>
      <span className="only-chain1">{LABELS.USD_EQ(fmt.usd(quickBuy(1).toUsd(solAmt)))}</span>
      <span className="only-chain2">{LABELS.USD_EQ(fmt.usd(quickBuy(2).toUsd(ethAmt)))}</span>
    </span>
  );
}

export function Dock(p: DockProps) {
  if (!p.ticker) {
    return (
      <section className="dock dock-empty" aria-label="Selected coin">
        <p className="meta dk-hint">
          <span className="hs-d">Select a row (J/K or click) to see it here.</span>
          <span className="hs-m">Tap a row to see it here.</span>
        </p>
        <button type="button" disabled className="meta dk-buy" title={LABELS.QB_TITLE}>
          Select a row
        </button>
      </section>
    );
  }
  return <DockCoin key={p.ticker} {...p} ticker={p.ticker} />;
}

/** Buyers plus sellers in the window, re-read on each commit. An upper
 *  bound, hence the ≤: a wallet that did both is counted twice. */
function Traders({ ticker, w }: { ticker: string; w: Window }) {
  const sim = useMarketSim();
  const row = rowOf(ticker)!;
  const sum = (b: number | null, s: number | null) => (b === null || s === null ? null : b + s);
  const get = useCallback(() => sum(sim.value(ticker, w, "buyers"), sim.value(ticker, w, "sellers")), [sim, ticker, w]);
  const server = useCallback(() => sum(row.windows[w].buyers, row.windows[w].sellers), [row, w]);
  const v = useSyncExternalStore(sim.subscribe, get, server);
  const sl = useSinceLaunch(ticker, w);
  if (v === null) {
    return (
      <span className="num text-dim" title={row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE}>
        {fmt.NULL}
      </span>
    );
  }
  return (
    <span title={LABELS.TRADERS_TITLE} className="inline-flex items-center gap-1.5">
      <span className="num text-bone">≤{fmt.compact(v)}</span>
      <span className="meta">
        Traders {sl ? `· ${LABELS.SINCE_LAUNCH}` : w}
      </span>
    </span>
  );
}

function DockCoin({ ticker, n, src, off, w, solAmt, ethAmt, onBuy, onReveal, onCopy }: DockProps & { ticker: string }) {
  const row = rowOf(ticker)!;
  const s = seatState(row);
  // One subscription per painted node: the hook keeps a single node, and
  // the desktop line and the phone lines are both in the markup.
  const price = useLiveCell(ticker, "24h", "price", fmt.price);
  const priceM = useLiveCell(ticker, "24h", "price", fmt.price);
  const change = useLiveCell(ticker, w, "change", (v) => fmt.pct(v));
  const priceTitle = "Price. Fixture at page open, simulated since.";

  const place =
    n === null ? (
      <span className="meta">Not on this board</span>
    ) : (
      <span className="num text-dim">#{n}</span>
    );
  /* An arrow in a key, beside the place it points to: "#18 ↓" says the
     row is below, and the words are its title and its name. Spelled out,
     the key was wider than any line could keep for it next to the rank
     and the name on a phone or a laptop. */
  const offKey = off && (
    <button
      type="button"
      className="dk-off text-muted hover:text-bone"
      aria-label="Off screen, show row"
      title="Off screen, show row"
      onClick={onReveal}
    >
      {off === "above" ? "↑" : "↓"}
    </button>
  );
  const seatShort = row.seat && (
    <span className={cx("meta dk-m-seat", TONE_CLASS[s.tone])} title={s.sentence}>
      {s.short}
      {s.numeral !== null && <span className="num"> {s.numeral}</span>}
    </span>
  );
  /* A phone's first line has no room for the state's words, and a
     warning cut to "Under the exit…" is worse than none. It prints the
     seat the way the sheet's Z500 column does: the score in its tone, or
     U for an unscored seat, both explained under ? Keys. */
  const seatMark = row.seat && (
    <span className="inline-flex items-center gap-1.5" title={s.sentence}>
      <span className="meta">Z500</span>
      {s.numeral !== null ? (
        <span className={cx("num", TONE_CLASS[scoreTone(row.seat)])}>{s.numeral}</span>
      ) : (
        <span className={cx("num", TONE_CLASS[s.tone])}>U</span>
      )}
    </span>
  );

  return (
    <section className="dock" aria-label={`Selected coin: ${row.ticker}`}>
      {/* Desktop: one line, cells dropping by priority as the width goes.
          The letters are the order they drop in, h first (under 1920px)
          and b last (under 1024px); the widths are in heatsheet.css.
          The identity, the price, the words "Paid boost" and the Buy key
          have no letter: they never drop. */}
      <div className="dk-line hs-d">
        <div className="dk-cell dk-id">
          <CoinAvatar ticker={ticker} src={src} size={24} />
          <span className="display dk-tk" title={LABELS.NO_PAGE}>
            ${row.ticker}
          </span>
          {row.real ? (
            <span className="meta" title={LABELS.REAL_TITLE}>
              {LABELS.REAL}
            </span>
          ) : (
            <span className="cased dk-nm">{row.name}</span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <TierGlyph tier={row.tier} />
            <span className="meta">{row.tier}</span>
          </span>
          {place}
          {offKey}
        </div>
        <div className="dk-cell">
          <span ref={price.ref} {...price.data} className="num dk-price" title={priceTitle}>
            {price.text}
          </span>
        </div>
        {row.seat && (
          <div className="dk-cell dk-b" title={s.sentence}>
            <SeatBadge seat={row.seat} />
            {seatShort}
          </div>
        )}
        {/* The row's bolt says a coin paid; this is where it says so in
            words, and the words stay at every desktop width. The points
            (c) are a figure like the others and can drop, though only
            the seat outlasts them: that a coin paid matters more than
            how much, and how much more than its mint or its traders. */}
        {row.boost && (
          <div className="dk-cell dk-boost" title={LABELS.BOOST_TITLE}>
            <span className="dk-bolt">
              <BoltGlyph className="h-[10px] w-[10px]" />
            </span>
            <span className="meta">Paid boost</span>
            <span className="dk-c num text-muted">
              {fmt.count(row.boost.points)} <span className="meta">Pts</span>
            </span>
          </div>
        )}
        <div className="dk-cell dk-d dk-mint">
          <span className="only-chain1 inline-flex items-center gap-1.5">
            <span className="meta">Mint</span>
            <span className="num text-muted">
              {row.mint.slice(0, 4)}…{row.mint.slice(-4)}
            </span>
            {row.mintResolves ? (
              <a
                href={`https://solscan.io/token/${row.mint}`}
                target="_blank"
                rel="noopener"
                className="dk-icon"
                aria-label="Open on Solscan"
                title="Open on Solscan"
              >
                <SolscanMark className="h-3 w-3" />
              </a>
            ) : (
              <>
                <button type="button" className="dk-icon text-dim hover:text-bone" aria-label="Copy mint" title={LABELS.MINT_PLACEHOLDER} onClick={() => onCopy(ticker)}>
                  <CopyMark className="h-3 w-3" />
                </button>
                <span className="meta" title={LABELS.MINT_PLACEHOLDER}>
                  {LABELS.QB_TAG}
                </span>
              </>
            )}
          </span>
          <span className="only-chain2 dk-net2" title={LABELS.NET2_MINT}>
            {LABELS.NET2_MINT}
          </span>
        </div>
        <div className="dk-cell dk-e">
          <Traders ticker={ticker} w={w} />
        </div>
        <div className="dk-cell dk-f">
          <span className="inline-flex items-center gap-1.5" title={row.real ? LABELS.NOT_INDEXED : "Fixture at page open: market cap against its all-time high. The simulation doesn't move it."}>
            <span className="meta">From ATH</span>
            <span className={cx("num", row.fromAthPct === null ? "text-dim" : "text-muted")}>{fmt.pct(row.fromAthPct)}</span>
          </span>
        </div>
        {/* The creator is an address like the mint, and like the mint it is
            a roster invention everywhere but T: tagged the same way, and
            not shown on network 2, which has no addresses in the fixtures. */}
        <div className="dk-cell dk-g dk-creator">
          <span className="inline-flex items-center gap-1.5">
            <span className="meta">Creator</span>
            <span className="num text-muted" title={row.real ? LABELS.REAL_TITLE : LABELS.MINT_PLACEHOLDER}>
              {row.creator}
            </span>
            {!row.real && (
              <span className="meta" title={LABELS.MINT_PLACEHOLDER}>
                {LABELS.QB_TAG}
              </span>
            )}
          </span>
        </div>
        <div className="dk-cell dk-h">
          <span className="dk-nopage">{LABELS.NO_PAGE}</span>
        </div>
        <div className="dk-act">
          <span className="meta" title={LABELS.QB_TITLE}>
            {LABELS.QB_TAG}
          </span>
          <button type="button" className="meta dk-buy" title={LABELS.QB_TITLE} onClick={() => onBuy(ticker)}>
            <BuyLabel solAmt={solAmt} ethAmt={ethAmt} />
          </button>
        </div>
      </div>

      {/* Phone: two lines. The Buy key is the only one a phone gets. */}
      <div className="dk-m hs-m">
        <div className="dk-m1">
          <CoinAvatar ticker={ticker} src={src} size={20} />
          <span className="display dk-tk" title={LABELS.NO_PAGE}>
            ${row.ticker}
          </span>
          <span ref={priceM.ref} {...priceM.data} className="num dk-price" title={priceTitle}>
            {priceM.text}
          </span>
          <span ref={change.ref} {...change.data} className="num dk-chg" title={change.sign === "null" ? LABELS.CHANGE_NULL_TITLE : `Change, last ${w}.`}>
            {change.text}
          </span>
          {/* Titles never show on a touch screen, and the row's own label
              is cut short on a phone: the snapshot caveat is stated here
              in full. */}
          {row.real && <span className="meta dk-m-real">{LABELS.REAL}</span>}
          {seatMark}
          <span className="dk-m-place">{offKey ?? place}</span>
        </div>
        <div className="dk-m2">
          <button type="button" className="meta dk-buy" title={LABELS.QB_TITLE} onClick={() => onBuy(ticker)}>
            <BuyLabel solAmt={solAmt} ethAmt={ethAmt} />
          </button>
          <span className="meta" title={LABELS.QB_TITLE}>
            {LABELS.QB_TAG}
          </span>
          <UsdEq solAmt={solAmt} ethAmt={ethAmt} className="dk-usd" />
        </div>
      </div>
    </section>
  );
}
