"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { BoostChip, CoinAvatar, TierMark, cx } from "@/components/ui";
import { CheckMark, CopyMark, SolscanMark, StarMark } from "@/components/marks";
import { SeatBadge } from "@/components/seat-badge";
import { AuditDefTip, FlatCurveBar, amountText, type useQuickBuy } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import * as fmt from "@/lib/format";
import { WINDOWS, auditBand, quickBuy, rowOf, type ChainId, type TrendingRow, type Window } from "@/lib/trending";
import { useLiveCell, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import { TONE_CLASS, scoreTone, seatState } from "@/lib/seat-state";
import { Z500 } from "@/lib/spec";
import { PinnedChart } from "./chart";
import { ShareTrack } from "./list";
import { OR_COPY, TAB_LABEL, TAB_WINDOWED, type OrTab } from "./local";

/* The right column: everything about one coin, and the page's only Buy
   key, directly under that coin's name printed large.

   That is the whole argument of this version. On a board that re-ranks,
   the costly mistake is pressing Buy on a row that moved under the
   pointer. Here the list has no Buy at all, hover never changes what is
   inspected, and the key sits under a 44px ticker, so what you are
   about to buy is the largest thing on the screen.

   One instance at a time: in the rail on desktop, inline under the open
   row on a phone. It subscribes to the focused coin only. */

/** The escape hatch for the nameplate face. Republica is a poster face
 *  and this is the one place on the page it appears; if its digits kern
 *  badly against a ticker like DRIFTX8, "sans" swaps it for the sans at
 *  800 at the same size. */
const NAMEPLATE_FACE: "republica" | "sans" = "republica";

export type QB = ReturnType<typeof useQuickBuy>;

type InspectorProps = {
  ticker: string | null;
  /** Where the coin sits in the list as shown, and how far that can be
   *  read as a rank (see rankOf in screen.tsx). */
  rankIndex: number;
  rankCount: number;
  ranked: boolean;
  filtered: boolean;
  tab: OrTab;
  w: Window;
  setW: (w: Window) => void;
  art: Record<string, string>;
  variant: "rail" | "inline";
  id?: string;
  onClose?: () => void;
  qb1: QB;
  qb2: QB;
  sent: boolean;
  onBuy: (ticker: string) => void;
  onBuyEscape: () => void;
  starred: boolean;
  onStar: () => void;
  onHide: () => void;
  touch?: boolean;
  /** The list holds no coin at all (a filter, an empty Starred), so
   *  there is nothing to select and no hint to give. */
  listEmpty?: boolean;
};

export function Inspector(p: InspectorProps) {
  const row = p.ticker ? rowOf(p.ticker) : undefined;
  const inline = p.variant === "inline";
  return (
    <div
      id={p.id}
      className={cx("or-inspector", inline && "or-inline")}
      aria-label={row ? `${row.ticker}, inspected` : "Inspector"}
      role="region"
    >
      {row ? <Filled {...p} row={row} /> : <EmptyPlate {...p} />}
    </div>
  );
}

/* ------------------------------------------------------ empty state */

/* With the list empty, "Press J or click a row" would point at keys
   and rows that do nothing, so the plate says why there is nothing to
   select instead; the list's own empty state carries the way back. */
function EmptyPlate(p: InspectorProps) {
  const hint = p.listEmpty ? OR_COPY.NOTHING_TO_SELECT : p.touch ? OR_COPY.NOTHING_SELECTED_HINT_TOUCH : OR_COPY.NOTHING_SELECTED_HINT;
  return (
    <div className="or-block or-plate-block">
      <div className="or-plate-row">
        <span aria-hidden className="door-art or-door" />
        <div className="min-w-0 flex-1 self-center">
          <p className="font-sans text-[13px] text-muted">{OR_COPY.NOTHING_SELECTED}</p>
          <p className="meta mt-1">{hint}</p>
        </div>
      </div>
      <Tickets {...p} ticker={null} />
    </div>
  );
}

/* ----------------------------------------------------------- filled */

/* Top to bottom: everything a reader acts on first (the nameplate, the
   Buy key, Star, Hide, Copy), then the figures, then the reference
   prose. At 1440 × 789 the rail can't hold all of it for a coin with a
   seat and a boost, and whatever goes under the fold is then prose,
   never a control. Each block below the key names itself in data-more,
   so the rail can say what is under the fold (RailMore). */
function Filled(p: InspectorProps & { row: TrendingRow }) {
  const { row, w } = p;
  const t = row.ticker;
  return (
    <>
      <Nameplate {...p} />
      <PriceLine t={t} w={w} row={row} />
      <WindowStrip t={t} w={w} setW={p.setW} real={row.real} />
      <div className="or-block or-chart-block" data-more="Chart">
        <PinnedChart ticker={t} w={w} real={row.real} />
      </div>
      <div className="or-block or-grids">
        <Flows t={t} w={w} real={row.real} />
        <Fixture row={row} />
      </div>
      <CurveRow t={t} w={w} row={row} />
      {row.seat && <SeatRow t={t} w={w} row={row} />}
      {row.boost && <BoostRow row={row} />}
    </>
  );
}

/* -------------------------------------------------------- nameplate */

function Nameplate(p: InspectorProps & { row: TrendingRow }) {
  const { row } = p;
  const inline = p.variant === "inline";
  const plate = useRef<HTMLHeadingElement>(null);

  /* Fitted by measurement, not by a guessed character count: step down
     two pixels at a time while the ticker is wider than its column, and
     stop at 28. Measured again when the column changes width and once
     the display face has loaded, since the fallback face sets a
     different width. The resize work waits a frame, so the size change
     it makes is never inside the observer's own delivery. */
  useLayoutEffect(() => {
    const el = plate.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > 28) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    let lastW = el.clientWidth;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastW) return;
      lastW = el.clientWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(el);
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [row.ticker]);

  /* The stamp is the only sign of where the coin went after a re-rank
     (nothing auto-scrolls), so it sits on the name line, read as part of
     the plate, with its numeral in figures. It claims no more than the
     list shows: "of n" and "filtered" whenever the list is not the
     whole board, and no numeral at all for a coin sorted last only
     because it lacks the figure the tab ranks by. */
  const where = `${TAB_LABEL[p.tab]}${TAB_WINDOWED[p.tab] ? ` ${p.w.toUpperCase()}` : ""}${p.filtered ? " · filtered" : ""}`;
  const subset = p.filtered || p.tab === "starred";
  const stamp =
    p.rankIndex < 0 ? null : p.ranked ? (
      <span className="meta or-stamp">
        <span className="num">#{p.rankIndex + 1}</span>
        {subset && (
          <>
            {" of "}
            <span className="num">{p.rankCount}</span>
          </>
        )}
        {` · ${where}`}
      </span>
    ) : (
      <span className="meta or-stamp" title={OR_COPY.NOT_RANKED_TITLE}>
        {`${OR_COPY.NOT_RANKED} · ${where}`}
      </span>
    );

  return (
    <div className="or-block or-plate-block">
      <div className="or-plate-row">
        <CoinAvatar ticker={row.ticker} src={p.art[row.ticker]} size={inline ? 40 : 56} />
        <div className="or-plate-col">
          {/* The ticker has the column's whole width to itself: the rank
              stamp sits on the name line below, so a seven-character
              ticker holds 44px at the narrowest rail. */}
          <h2
            ref={plate}
            className={cx(
              "or-plate uppercase text-bone",
              NAMEPLATE_FACE === "republica"
                ? "font-display leading-[0.9] tracking-[-0.012em]"
                : "font-sans font-extrabold leading-[0.9] tracking-[-0.03em]",
            )}
          >
            {row.ticker}
          </h2>
          <div className="or-plate-sub">
            <span className="cased truncate font-sans text-[13px] text-muted">{row.name}</span>
            {row.real ? (
              <span className="meta shrink-0 text-rim" title={LABELS.REAL_TITLE}>
                {LABELS.REAL}
              </span>
            ) : (
              <TierMark tier={row.tier} showFree />
            )}
            {!inline && stamp}
          </div>
        </div>
        {inline && (
          <button type="button" onClick={p.onClose} aria-controls={`or-opt-${row.ticker}`} className="meta or-close hover:text-bone">
            Close
          </button>
        )}
      </div>
      <Tickets {...p} ticker={row.ticker} />
      <Actions {...p} />
    </div>
  );
}

/* ----------------------------------------------------------- ticket */

/** Rendered once per network and shown by the cascade (.only-chain1 /
 *  .only-chain2), so the first paint on network 2 is already in ETH
 *  rather than a frame of SOL sizes before hydration corrects it. */
function Tickets(p: InspectorProps) {
  return (
    <>
      <Ticket chain={1} qb={p.qb1} className="only-chain1" {...p} />
      <Ticket chain={2} qb={p.qb2} className="only-chain2" {...p} />
    </>
  );
}

function Ticket({
  chain,
  qb,
  className,
  ticker,
  sent,
  onBuy,
  onBuyEscape,
  listEmpty,
}: InspectorProps & { chain: ChainId; qb: QB; className: string }) {
  const [amount, setAmount, presets, unit] = qb;
  const usd = quickBuy(chain).toUsd(amount);
  const label =
    ticker === null
      ? listEmpty
        ? OR_COPY.BUY_KEY_EMPTY
        : OR_COPY.BUY_KEY_NONE
      : sent
        ? OR_COPY.BUY_KEY_SENT
        : `Buy ${amountText(amount)} ${unit}`;
  /* One 32px line of things to press: the size, then the key it
     spends. The key is the size group's direct sibling, so where the
     rail is narrow only the dollar caption wraps, never the key away
     from its size. The PLACEHOLDER tag heads the line that explains it,
     unboxed, so nothing in the key's row looks pressable that isn't. */
  return (
    <div className={cx("or-ticket", className)}>
      <div className="or-ticket-row">
        <div className="or-size">
          <div role="group" aria-label={`Quick-buy size in ${unit}`} className="or-seg">
            {presets.map((n) => (
              <button key={n} type="button" aria-pressed={n === amount} onClick={() => setAmount(n)} className="num">
                {amountText(n)}
              </button>
            ))}
          </div>
          <span className="meta">{unit}</span>
        </div>
        <button
            type="button"
            className="or-buy"
            disabled={ticker === null}
            title={LABELS.QB_TITLE}
            aria-label={ticker ? `${label} of ${ticker}. ${LABELS.QB_TITLE}` : label}
            onClick={() => ticker && onBuy(ticker)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onBuyEscape();
              }
            }}
          >
            {label}
          </button>
        <span className="meta or-usd">{LABELS.USD_EQ(fmt.usd(usd))}</span>
      </div>
      {/* The key's own disclaimer, at a strength in proportion to the key:
          the tag in rim ink and the sentence in muted, not the dim of the
          reference notes further down. */}
      <p className="or-qb-note">
        <span className="meta or-qb-tag">{LABELS.QB_TAG}</span> {LABELS.QB_TITLE}
      </p>
    </div>
  );
}

/* ------------------------------------------------------- price line */

function PriceLine({ t, w, row }: { t: string; w: Window; row: TrendingRow }) {
  const price = useLiveCell(t, w, "price", (v) => fmt.price(v));
  const mc = useLiveCell(t, w, "mc", fmt.usdLike(row.mcLabel), { split: true });
  const liq = useLiveCell(t, w, "liquidity", (v) => fmt.usd(v));
  return (
    <div className="or-block or-price or-val">
      <span className="or-kv-inline">
        <span className="meta">Price</span>
        <span ref={price.ref} {...price.data} className="num text-bone">
          {price.text}
        </span>
      </span>
      <span className="or-kv-inline">
        <span className="meta">MC</span>
        <span ref={mc.ref} {...mc.data} className="num text-bone">
          <span>{mc.head}</span>
          <span data-part="unit">{mc.tail}</span>
        </span>
      </span>
      <span className="or-kv-inline">
        <span className="meta">Liq</span>
        <span
          ref={liq.ref}
          {...liq.data}
          title={liq.sign === "null" ? (row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE) : undefined}
          className="num text-bone"
        >
          {liq.text}
        </span>
      </span>
    </div>
  );
}

/* ----------------------------------------------------- window strip */

function WindowStrip({ t, w, setW, real }: { t: string; w: Window; setW: (w: Window) => void; real: boolean }) {
  return (
    <div role="group" aria-label="Window" className="or-strip or-val">
      {WINDOWS.map((k) => (
        <StripCell key={k} t={t} k={k} on={k === w} onPick={setW} real={real} />
      ))}
    </div>
  );
}

function StripCell({ t, k, on, onPick, real }: { t: string; k: Window; on: boolean; onPick: (w: Window) => void; real: boolean }) {
  const c = useLiveCell(t, k, "change", (v) => fmt.pct(v));
  const since = useSinceLaunch(t, k);
  return (
    <button type="button" aria-pressed={on} onClick={() => onPick(k)} className="or-strip-cell">
      <span className={cx("meta", since && "is-since")} title={since ? LABELS.SINCE_LAUNCH_TITLE : undefined}>
        {since ? LABELS.SINCE_LAUNCH : k.toUpperCase()}
      </span>
      <span
        ref={c.ref}
        {...c.data}
        title={c.sign === "null" ? (real ? LABELS.NOT_INDEXED : LABELS.CHANGE_NULL_TITLE) : undefined}
        className="num sg"
      >
        {c.text}
      </span>
    </button>
  );
}

/* --------------------------------------------------- flows, fixture */

function KV({ label, title, children }: { label: ReactNode; title?: string; children: ReactNode }) {
  return (
    <div className="or-kv">
      <span className="meta truncate" title={title}>
        {label}
      </span>
      <span className="or-kv-v">{children}</span>
    </div>
  );
}

/** A live figure with the inspector's null rule: the dash, dim, titled
 *  "Not indexed" for the real launch and "No figure" otherwise. */
function Tick({
  t,
  w,
  cell,
  format,
  real,
  signed,
  className,
}: {
  t: string;
  w: Window;
  cell: Parameters<typeof useLiveCell>[2];
  format: (v: number | null) => string;
  real: boolean;
  signed?: boolean;
  className?: string;
}) {
  const c = useLiveCell(t, w, cell, format);
  return (
    <span
      ref={c.ref}
      {...c.data}
      title={c.sign === "null" ? (real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE) : undefined}
      className={cx("num", signed && "sg", className)}
    >
      {c.text}
    </span>
  );
}

/* The window heads the column, the way FIXTURE heads the other one.
   Every figure under it is for that window, or since launch for a coin
   younger than the window, so the qualifier belongs to the column, not
   to its first row: there it shared 22px with two counts and a bar, and
   "since launch", the one words that make those counts true, was the
   part cut off. Alone on its line it is always printed whole. */
function Flows({ t, w, real }: { t: string; w: Window; real: boolean }) {
  const since = useSinceLaunch(t, w);
  const count = (v: number | null) => fmt.count(v);
  const usd = (v: number | null) => fmt.usd(v);
  return (
    <div className="or-col" data-more="Flows">
      <div className="or-kv-head">
        <span className={cx("meta", since && "is-since")} title={since ? LABELS.SINCE_LAUNCH_TITLE : undefined}>
          Flows · {since ? LABELS.SINCE_LAUNCH : w.toUpperCase()}
        </span>
      </div>
      <KV label="Buys">
        <Tick t={t} w={w} cell="buys" format={count} real={real} />
        <ShareTrack ticker={t} w={w} className="or-track-wide" />
        <Tick t={t} w={w} cell="sells" format={count} real={real} />
        <span className="meta">Sells</span>
      </KV>
      <KV label="Buy vol / Sell vol">
        <Tick t={t} w={w} cell="buyVol" format={usd} real={real} />
        <span className="or-slash">/</span>
        <Tick t={t} w={w} cell="sellVol" format={usd} real={real} />
      </KV>
      <KV label="Buyers / Sellers">
        <Tick t={t} w={w} cell="buyers" format={count} real={real} />
        <span className="or-slash">/</span>
        <Tick t={t} w={w} cell="sellers" format={count} real={real} />
      </KV>
      <KV label="Net flow">
        <Tick t={t} w={w} cell="netFlow" format={usd} real={real} signed />
      </KV>
      <KV label="Avg trade">
        <Tick t={t} w={w} cell="avgTrade" format={usd} real={real} />
      </KV>
    </div>
  );
}

/** A static fixture figure: holders and the audit shares never tick. */
function Fixed({ v, text, band, title }: { v: number | null; text: string; band?: string | null; title?: string }) {
  return (
    <span className="num" data-sign={v === null ? "null" : undefined} data-band={band ?? undefined} title={title}>
      {text}
    </span>
  );
}

function Fixture({ row }: { row: TrendingRow }) {
  const nt = (fallback: string = LABELS.NULL_TITLE) => (row.real ? LABELS.NOT_INDEXED : fallback);
  const t10 = row.top10Hidden ? null : row.top10Pct;
  return (
    <div className="or-col or-col-fixture" data-more="Fixture">
      <div className="or-kv-head">
        <AuditDefTip side="bottom" align="start" />
      </div>
      <KV label="Holders">
        <Fixed v={row.holders} text={fmt.count(row.holders)} title={row.holders === null ? nt() : undefined} />
      </KV>
      <KV label="Top 10">
        <Fixed
          v={t10}
          text={fmt.share(t10)}
          band={auditBand("top10", t10)}
          title={row.top10Hidden ? LABELS.TOP10_HIDDEN : t10 === null ? nt() : undefined}
        />
      </KV>
      <KV label="Dev">
        <Fixed v={row.devPct} text={fmt.share(row.devPct)} band={auditBand("dev", row.devPct)} title={row.devPct === null ? nt() : undefined} />
      </KV>
      <KV label="Snipers">
        <Fixed
          v={row.snipersPct}
          text={fmt.share(row.snipersPct)}
          band={auditBand("snipers", row.snipersPct)}
          title={row.snipersPct === null ? nt() : undefined}
        />
      </KV>
      <KV label="Bundlers">
        <Fixed
          v={row.bundlersPct}
          text={fmt.share(row.bundlersPct)}
          band={auditBand("bundlers", row.bundlersPct)}
          title={row.bundlersPct === null ? nt() : undefined}
        />
      </KV>
      <KV label="Airdropped" title={LABELS.AIRDROP_RESERVE}>
        <span
          className={cx("num", row.airdroppedUsd !== null && "text-bone")}
          data-sign={row.airdroppedUsd === null ? "null" : undefined}
          title={row.airdroppedUsd === null ? nt() : undefined}
        >
          {fmt.usd(row.airdroppedUsd)}
        </span>
      </KV>
    </div>
  );
}

/* ------------------------------------------------------------ curve */

function CurveRow({ t, w, row }: { t: string; w: Window; row: TrendingRow }) {
  const sim = useMarketSim();
  // The bar follows the simulated curve where the foundation lets it
  // move (a trusted Fortress curve), at whole percent so the component
  // re-renders only when the printed figure would.
  const curve = useSyncExternalStore(
    sim.subscribe,
    () => Math.round(sim.value(t, w, "curve") ?? row.curve),
    () => Math.round(row.curve),
  );
  const val = useLiveCell(t, w, "curve", (v) => fmt.share(v, 0));
  const fortress = row.tier === "Fortress" && !row.migrated && row.curveTrusted;
  return (
    <div className="or-block or-curve" data-more="Curve">
      <div className="or-curve-row">
        <span className="meta whitespace-nowrap" title={fortress ? LABELS.CURVE_FORTRESS : undefined}>
          {row.curveTrusted ? "Curve" : LABELS.CURVE_HEAD}
        </span>
        <FlatCurveBar
          curve={curve}
          migrated={row.migrated}
          tier={row.tier}
          trusted={row.curveTrusted}
          untrusted="dim"
          height={3}
          className="min-w-0 flex-1"
        />
        {row.migrated ? (
          <span className="flex items-center gap-1 whitespace-nowrap">
            <CheckMark className="h-3 w-3 text-muted" />
            <span className="meta">Migrated</span>
          </span>
        ) : (
          <span ref={val.ref} {...val.data} className="num or-curve-v text-bone">
            {val.text}
          </span>
        )}
      </div>
      {!row.curveTrusted && <p className="or-note">{LABELS.CURVE_CAVEAT}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- seat */

function SeatRow({ t, w, row }: { t: string; w: Window; row: TrendingRow }) {
  const sim = useMarketSim();
  const seat = row.seat!;
  // The floor check follows the simulated cap. Subscribed to the
  // sentence, so this re-renders only when the state it states changes.
  const sentence = useSyncExternalStore(
    sim.subscribe,
    () => seatState(row, sim.value(t, w, "mc") ?? row.mcUsd).sentence,
    () => seatState(row).sentence,
  );
  const state = seatState(row, sim.value(t, w, "mc") ?? row.mcUsd);
  return (
    <div className="or-block or-seat" data-more="Seat">
      <div className="or-seat-row">
        <SeatBadge seat={seat} />
        {state.numeral !== null && (
          <span className="flex items-center gap-2" title={`Entry bar ${Z500.bar}, exit line ${Z500.exit}`}>
            <span className={cx("num text-[12px]", TONE_CLASS[scoreTone(seat)])}>{state.numeral}</span>
            <span aria-hidden className="or-score-bar">
              <span style={{ width: `${Math.max(0, Math.min(100, state.numeral))}%` }} />
              <i style={{ left: `${Z500.exit}%` }} />
              <i style={{ left: `${Z500.bar}%` }} />
            </span>
          </span>
        )}
        {seat.weeksSeated !== null && (
          <span className="meta ml-auto whitespace-nowrap">
            <span className="num">{seat.weeksSeated}</span>w seated
          </span>
        )}
      </div>
      <p className={cx("or-seat-s font-sans text-[12px]", TONE_CLASS[state.tone])}>{sentence}</p>
    </div>
  );
}

/* ------------------------------------------------------------ boost */

/* No "hours left". The fixture's figure is a seeded constant: printed as
   a countdown it never counts, and beside the Z500 countdown, which
   does, it would be a false time within minutes. */
function BoostRow({ row }: { row: TrendingRow }) {
  const b = row.boost!;
  return (
    <div className="or-block or-boost-row" data-more="Boost">
      <span className="or-boost">
        <BoostChip points={b.points} bare />
      </span>
      <span className="or-note-inline">{LABELS.BOOST_TITLE}</span>
    </div>
  );
}

/* ---------------------------------------------------------- actions */

/** Star, Hide and Copy, in the nameplate block under the Buy key they
 *  sit beside: the three other things a reader does to the inspected
 *  coin, so they are never the part of the rail under the fold. */
function Actions(p: InspectorProps & { row: TrendingRow }) {
  const { row } = p;
  // Keyed to the ticker, so moving to another coin shows its own
  // "Copy CA" at once rather than the last coin's "Copied".
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const copied = copiedFor === row.ticker;
  useEffect(() => {
    if (copiedFor === null) return;
    const id = setTimeout(() => setCopiedFor(null), 1200);
    return () => clearTimeout(id);
  }, [copiedFor]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(row.mint);
      setCopiedFor(row.ticker);
    } catch {
      /* Clipboard refused (permissions, insecure context): the label
         stays "Copy CA" rather than claiming a copy that didn't happen. */
    }
  };

  return (
    <div className="or-acts">
      <button type="button" aria-pressed={p.starred} onClick={p.onStar} className="or-act meta">
        <StarMark className={cx("h-2.5 w-2.5", p.starred ? "text-bone" : "text-dim")} />
        {p.starred ? "Starred" : "Star"}
        <kbd className="or-key">S</kbd>
      </button>
      <button type="button" onClick={p.onHide} className="or-act meta">
        Hide
        <kbd className="or-key">H</kbd>
      </button>
      <span className="only-chain1 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          title={row.mintResolves ? row.mint : LABELS.MINT_PLACEHOLDER}
          className="or-act meta"
        >
          {copied ? <CheckMark className="h-3 w-3" /> : <CopyMark className="h-3 w-3" />}
          {/* The 77 fixture mints don't resolve. Said on the button
              itself, since a finger never sees the title. */}
          {copied ? "Copied" : row.mintResolves ? "Copy CA" : "Copy placeholder CA"}
        </button>
        {row.mintResolves && (
          <a
            href={`https://solscan.io/token/${row.mint}`}
            target="_blank"
            rel="noreferrer"
            className="or-act meta"
            title="Open on Solscan"
          >
            <SolscanMark className="h-3 w-3" />
            Solscan
          </a>
        )}
      </span>
      <span className="only-chain2 meta" title={LABELS.NET2_MINT}>
        CA {fmt.NULL}
      </span>
      <span className="or-nopage">{LABELS.NO_PAGE}</span>
    </div>
  );
}

/* -------------------------------------------------------- more below */

const MORE_H = 22;

/** A strip pinned to the foot of the rail, naming the blocks under the
 *  fold. A 789px screen can't hold every block for a coin with a seat
 *  and a boost, and a rail cut off mid-sentence gives no sign there is
 *  more. Pressing it scrolls the rail down. It takes no layout room: the
 *  pin is zero height, and the strip hangs above it. */
export function RailMore({ railRef, ticker }: { railRef: RefObject<HTMLElement | null>; ticker: string | null }) {
  const [below, setBelow] = useState<string[]>([]);
  const btn = useRef<HTMLButtonElement>(null);
  const shown = useRef<string[]>([]);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const names: string[] = [];
      if (rail.scrollTop + rail.clientHeight < rail.scrollHeight - 1) {
        // The strip covers the rail's last line, so a block whose content
        // ends under it counts as below too; its bottom padding doesn't.
        const limit = rail.getBoundingClientRect().bottom - MORE_H;
        for (const el of rail.querySelectorAll<HTMLElement>("[data-more]")) {
          const end = el.getBoundingClientRect().bottom - parseFloat(getComputedStyle(el).paddingBottom);
          if (end > limit + 1 && el.dataset.more) names.push(el.dataset.more);
        }
      }
      // The strip is about to unmount with keyboard focus on it (the rail
      // was scrolled some other way while it was focused): focus would
      // fall to the page body, so it goes to the block the strip named
      // first, which is now in view.
      if (!names.length && shown.current.length && document.activeElement === btn.current) {
        focusBlock(rail, shown.current[0]);
      }
      shown.current = names;
      setBelow((prev) => (prev.join() === names.join() ? prev : names));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    schedule();
    rail.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(rail);
    for (const c of rail.children) ro.observe(c);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [railRef, ticker]);

  if (!below.length) return null;
  /* The rail scrolls until the first block the strip names reaches its
     top, or as far as it goes, and that block takes focus. The strip
     unmounts once nothing is left below; a keyboard reader's focus would
     go with it to the page body, and the next Tab would start again from
     the top of the page. Focus moves first, without a scroll of its own,
     so the rail's scroll is the only one. */
  const down = () => {
    const rail = railRef.current;
    if (!rail) return;
    // Flows and the fixture share one block; its rule, not the column's
    // first row, is what lands on the rail's top edge.
    const el = focusBlock(rail, below[0])?.closest<HTMLElement>(".or-block");
    const top = el ? rail.scrollTop + el.getBoundingClientRect().top - rail.getBoundingClientRect().top : rail.scrollHeight;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ top, behavior: still ? "auto" : "smooth" });
  };
  return (
    <div className="or-more-pin">
      <button ref={btn} type="button" onClick={down} className="or-more meta">
        More below · {below.join(", ")}
        <span aria-hidden>↓</span>
      </button>
    </div>
  );
}

/** Focuses a rail block by its data-more name. The block is made
 *  focusable only for as long as it holds focus: left focusable, a click
 *  anywhere in its text would take focus from the list, and Enter there
 *  would no longer reach the Buy key. */
function focusBlock(rail: HTMLElement, name: string | undefined): HTMLElement | null {
  const el = name ? rail.querySelector<HTMLElement>(`[data-more="${name}"]`) : null;
  if (!el) return null;
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }
  el.focus({ preventScroll: true });
  return el;
}
