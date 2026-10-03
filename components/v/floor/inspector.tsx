"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { BoostChip, CoinAvatar, TierMark, cx } from "@/components/ui";
import { CloseMark, CopyMark } from "@/components/marks";
import { SeatBadge } from "@/components/seat-badge";
import { AuditDefTip, amountText, useToast } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import { BUY_SHARE_EDGES, buyShareSide, quickBuy, type ChainId, type TrendingRow, type Window } from "@/lib/trending";
import { useLiveCell, useLiveSparkPath, useLiveValue, useMarketSim, useSinceLaunch, type Cell } from "@/lib/trending-live";
import { seatState, TONE_CLASS } from "@/lib/seat-state";
import * as fmt from "@/lib/format";
import { BUY_SHARE_TITLE, COPIED, MAP_SHARE_TITLE, NOT_DRAWN_LINE, NO_COINS, PIN_FIRST } from "./copy";
import { CurveStage, curveTitle, shareText, type FloorTab } from "./map";

export type InspectState = "PINNED" | "HOVER" | "TOP OF MAP";

/** One network's quick-buy size, lifted to the screen so the control
 *  strip and this key read and write the same number. */
export type QuickSize = { amount: number; unit: "SOL" | "ETH"; chain: ChainId };

/* The coin in the rail. Keyed by ticker from the screen, so every
   ticking cell below subscribes once for the coin it shows and never
   carries a previous coin's node. */
export function Inspector({
  row,
  state,
  w,
  tab,
  art,
  share,
  stamp,
  qb,
  noCoins,
  onUnpin,
  onBuy,
}: {
  row: TrendingRow | null;
  state: InspectState | null;
  w: Window;
  tab: FloorTab;
  art: Record<string, string>;
  /** The coin's share of the drawn total at the snapshot, 0 to 1 (0 for
   *  a coin with no trades in the window), or null when it has no
   *  figure. */
  share: number | null;
  stamp: string | null;
  qb: readonly [QuickSize, QuickSize];
  /** The board is empty, so there is nothing to pin. */
  noCoins: boolean;
  onUnpin: () => void;
  onBuy: (amount: number, unit: "SOL" | "ETH") => void;
}) {
  if (!row) {
    return (
      <div className="fl-insp">
        <div className="fl-ihead">
          <span className="meta">NO COIN SHOWN</span>
        </div>
        <BuyKeys pinned={false} disabledLabel={noCoins ? NO_COINS : PIN_FIRST} qb={qb} onBuy={onBuy} />
      </div>
    );
  }
  return <Body row={row} state={state} w={w} tab={tab} art={art} share={share} stamp={stamp} qb={qb} onUnpin={onUnpin} onBuy={onBuy} />;
}

function Body({
  row,
  state,
  w,
  tab,
  art,
  share,
  stamp,
  qb,
  onUnpin,
  onBuy,
}: {
  row: TrendingRow;
  state: InspectState | null;
  w: Window;
  tab: FloorTab;
  art: Record<string, string>;
  share: number | null;
  stamp: string | null;
  qb: readonly [QuickSize, QuickSize];
  onUnpin: () => void;
  onBuy: (amount: number, unit: "SOL" | "ETH") => void;
}) {
  const t = row.ticker;
  const pinned = state === "PINNED";
  const since = useSinceLaunch(t, w);
  const price = useLiveCell(t, w, "price", fmt.price);
  const ch = useLiveCell(t, w, "change", fmt.pct);
  const spark = useLiveSparkPath(t, w, 120, 24);
  const nullTitle = row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE;

  return (
    <div className="fl-insp" aria-label={`$${t}`} role="region">
      {/* Head: who the coin is. */}
      <div className="fl-ihead">
        <CoinAvatar ticker={t} src={art[t]} size={24} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="fl-insp-tk" title={row.real ? LABELS.REAL_TITLE : LABELS.NO_PAGE}>
              ${t}
            </span>
            <span className="cased min-w-0 truncate text-[12px] text-muted">{row.name}</span>
          </div>
          <div className="fl-tags">
            {/* A Fortress or Diamond seat's route seal wears its tier's
                ramp and glyph, so beside the tier tag it printed the same
                cyan DIAMOND twice. When route and tier agree the seal
                says both; the wrapper's title says so in words (the
                badge ignores the pointer so that title is the one shown). */}
            {!(row.seat && row.seat.route === row.tier) && <TierMark tier={row.tier} showFree />}
            {row.seat && (
              <span
                className={cx("fl-seat", row.seat.route === row.tier && "is-both")}
                title={
                  row.seat.route === row.tier
                    ? `${row.tier} tier, ${row.seat.route} route. Z500 seat ${row.seat.seatNo}.`
                    : `Z500 seat ${row.seat.seatNo}, ${row.seat.route} route`
                }
              >
                <SeatBadge seat={row.seat} />
                {row.seat.route === row.tier && <span className="sr-only">{`${row.tier} tier`}</span>}
              </span>
            )}
            {row.boost && (
              <span className="fl-boost" title={LABELS.BOOST_TITLE}>
                <BoostChip bare points={row.boost.points} />
              </span>
            )}
            {row.real && (
              <span className="meta" title={LABELS.REAL_TITLE}>
                {LABELS.REAL}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-start">
          {state && <span className={cx("meta", pinned && "text-muted")}>{state}</span>}
          {pinned && (
            <button type="button" onClick={onUnpin} aria-label="Unpin (Esc)" title="Unpin (Esc)" className="fl-x">
              <CloseMark className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Price: the window tag labels everything below it. */}
      <div className="fl-iprice">
        <span className="num fl-ip">
          <span ref={price.ref} {...price.data}>
            {price.text}
          </span>
        </span>
        <span className="num fl-ic" title={ch.sign === "null" ? (row.real ? LABELS.NOT_INDEXED : LABELS.CHANGE_NULL_TITLE) : undefined}>
          <span ref={ch.ref} {...ch.data}>
            {ch.text}
          </span>
        </span>
        {since ? (
          <span className="meta" title={LABELS.SINCE_LAUNCH_TITLE}>
            {LABELS.SINCE_LAUNCH}
          </span>
        ) : (
          <span className="meta">{w}</span>
        )}
        <svg className="fl-spark" width={120} height={24} viewBox="0 0 120 24" aria-hidden={false} role="img">
          <title>{LABELS.SPARK_TITLE}</title>
          <path ref={spark.ref} d={spark.d} data-up={spark.up} />
        </svg>
      </div>

      {/* Market: two columns of ruled rows. */}
      <div className="fl-grid">
        <div>
          <Rr label="MCAP">
            <McCell row={row} w={w} nullTitle={nullTitle} />
          </Rr>
          <Rr label="LIQ">
            <Live t={t} w={w} cell="liquidity" format={fmt.usd} nullTitle={nullTitle} />
          </Rr>
          <Rr label="VOL">
            <Live t={t} w={w} cell="volume" format={fmt.usd} nullTitle={nullTitle} />
          </Rr>
          <Rr label="TRADES">
            <Live t={t} w={w} cell="txns" format={fmt.count} nullTitle={nullTitle} />
          </Rr>
        </div>
        <div>
          <Rr label="BUYS">
            <Live t={t} w={w} cell="buys" format={fmt.count} nullTitle={nullTitle} />
          </Rr>
          <Rr label="SELLS">
            <Live t={t} w={w} cell="sells" format={fmt.count} nullTitle={nullTitle} />
          </Rr>
          <Rr label="AVG TRADE">
            <Live t={t} w={w} cell="avgTrade" format={fmt.usd} nullTitle={nullTitle} />
          </Rr>
          <Rr label="MAP SHARE" title={MAP_SHARE_TITLE(tab, w, stamp)}>
            <span
              className={cx("num", share === null && "text-dim")}
              title={share === null ? nullTitle : share === 0 ? NOT_DRAWN_LINE(t, w, false) : undefined}
            >
              {share === null ? fmt.NULL : shareText(share * 100)}
            </span>
          </Rr>
        </div>
      </div>

      <BuyShare t={t} w={w} nullTitle={nullTitle} />

      {/* Token info: one group head, fixture figures, no risk colouring:
          nothing on the fixtures reaches the bad band, so a colour scale
          would imply a check the board didn't make. */}
      <div className="fl-audit-h">
        <AuditDefTip side="bottom" align="start" />
      </div>
      <div className="fl-grid">
        <div>
          <Rr label="HOLDERS">
            <Static v={fmt.count(row.holders)} nullTitle={nullTitle} />
          </Rr>
          <Rr label="TOP 10">
            <Static v={fmt.share(row.top10Pct)} nullTitle={row.top10Hidden ? LABELS.TOP10_HIDDEN : nullTitle} />
          </Rr>
          <Rr label="DEV">
            <Static v={fmt.share(row.devPct)} nullTitle={nullTitle} />
          </Rr>
        </div>
        <div>
          <Rr label="SNIPERS">
            <Static v={fmt.share(row.snipersPct)} nullTitle={nullTitle} />
          </Rr>
          <Rr label="BUNDLERS">
            <Static v={fmt.share(row.bundlersPct)} nullTitle={nullTitle} />
          </Rr>
          {row.migrated ? (
            <Rr label="AIRDROP">
              <Static v={fmt.usd(row.airdroppedUsd)} nullTitle={nullTitle} />
            </Rr>
          ) : (
            <Rr label={row.curveTrusted ? "CURVE" : LABELS.CURVE_HEAD} title={curveTitle(row)}>
              <CurveStage row={row} w={w} barWidth={40} />
            </Rr>
          )}
        </div>
      </div>

      <SeatLine row={row} w={w} />

      <div className="fl-mint">
        <MintCell row={row} />
        <span className="only-chain2 meta">{LABELS.NET2_MINT}</span>
      </div>

      <BuyKeys pinned={pinned} ticker={t} qb={qb} onBuy={onBuy} />
    </div>
  );
}

/** A ruled row: label left, value right. */
function Rr({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <div className="fl-rr" title={title}>
      <span className="meta truncate">{label}</span>
      {children}
    </div>
  );
}

function Live({
  t,
  w,
  cell,
  format,
  nullTitle,
}: {
  t: string;
  w: Window;
  cell: Cell;
  format: (v: number | null) => string;
  nullTitle: string;
}) {
  const c = useLiveCell(t, w, cell, format);
  return (
    <span className="num fl-v" title={c.sign === "null" ? nullTitle : undefined}>
      <span ref={c.ref} {...c.data}>
        {c.text}
      </span>
    </span>
  );
}

function McCell({ row, w, nullTitle }: { row: TrendingRow; w: Window; nullTitle: string }) {
  const f = useMemo(() => fmt.usdLike(row.mcLabel), [row.mcLabel]);
  const c = useLiveCell(row.ticker, w, "mc", f, { split: true });
  return (
    <span className="num fl-v" title={c.sign === "null" ? nullTitle : undefined}>
      <span ref={c.ref} {...c.data}>
        <span>{c.head}</span>
        <span data-part="unit">{c.tail}</span>
      </span>
    </span>
  );
}

function Static({ v, nullTitle }: { v: string; nullTitle: string }) {
  const isNull = v === fmt.NULL;
  return (
    <span className={cx("num fl-v", isNull && "text-dim")} title={isNull ? nullTitle : undefined}>
      {v}
    </span>
  );
}

/** Buy share: a flat 2px split and the whole percent, leaning by the
 *  foundation's edges. */
function BuyShare({ t, w, nullTitle }: { t: string; w: Window; nullTitle: string }) {
  const bar = useLiveValue<HTMLSpanElement>(t, w, "buyRatio", (el, v) => {
    el.style.width = v === null ? "0" : `${v * 100}%`;
  });
  const c = useLiveCell(t, w, "buyRatio", (v) => fmt.share(v === null ? null : v * 100, 0), {
    attrs: (v) => ({ side: String(buyShareSide(v)) }),
    flash: false,
  });
  return (
    <div className="fl-bs" title={BUY_SHARE_TITLE(BUY_SHARE_EDGES)}>
      <span className="meta">BUY SHARE</span>
      <span className="fl-bs-track" aria-hidden>
        <span ref={bar.ref} className="fl-bs-fill" style={{ width: bar.value === null ? 0 : `${bar.value * 100}%` }} />
      </span>
      <span className="num fl-bs-v" title={c.sign === "null" ? nullTitle : undefined}>
        <span ref={c.ref} {...c.data}>
          {c.text}
        </span>
      </span>
    </div>
  );
}

/** The seat's state, re-rendering only when its kind flips (an
 *  unscored seat crossing the $250K floor on a simulated cap). */
function SeatLine({ row, w }: { row: TrendingRow; w: Window }) {
  const sim = useMarketSim();
  useSyncExternalStore(
    sim.subscribe,
    () => seatState(row, sim.value(row.ticker, w, "mc") ?? row.mcUsd).kind,
    () => seatState(row).kind,
  );
  if (!row.seat) {
    return (
      <p className="fl-seatline text-dim" title={seatState(row).sentence}>
        {LABELS.SEAT.NONE}
      </p>
    );
  }
  const st = seatState(row, sim.value(row.ticker, w, "mc") ?? row.mcUsd);
  return (
    <p className={cx("fl-seatline", TONE_CLASS[st.tone])} title={st.sentence}>
      {st.sentence}
    </p>
  );
}

function MintCell({ row }: { row: TrendingRow }) {
  const toast = useToast();
  const short = `${row.mint.slice(0, 4)}…${row.mint.slice(-4)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(row.mint);
    } catch {
      /* Clipboard refused: the toast still says what the address is. */
    }
    toast({ title: COPIED(row.mintResolves), tone: "info" });
  };
  return (
    <span className="only-chain1 fl-mint-1">
      <span className="meta">CA</span>
      <span className="num text-muted">{short}</span>
      <button
        type="button"
        onClick={copy}
        title={row.mintResolves ? "Copy the mint address" : LABELS.MINT_PLACEHOLDER}
        aria-label={row.mintResolves ? "Copy the mint address" : `Copy. ${LABELS.MINT_PLACEHOLDER}`}
        className="fl-copy"
      >
        <CopyMark className="h-3 w-3" />
      </button>
      {!row.mintResolves && <span className="meta fl-mint-note">{LABELS.MINT_PLACEHOLDER}</span>}
    </span>
  );
}

/** The buy key, once per network; the cascade shows the right one, so
 *  the first paint on network 2 already says ETH. Enabled only on a
 *  pinned coin: hover moves the inspector, and a key whose target moves
 *  with the pointer is a key that buys the wrong coin. */
function BuyKeys({
  pinned,
  ticker,
  disabledLabel = PIN_FIRST,
  qb,
  onBuy,
}: {
  pinned: boolean;
  ticker?: string;
  /** What the disabled key says: how to enable it, or why it can't be. */
  disabledLabel?: string;
  qb: readonly [QuickSize, QuickSize];
  onBuy: (amount: number, unit: "SOL" | "ETH") => void;
}) {
  return (
    <div className="fl-buyblock">
      {qb.map((q) => (
        <div key={q.chain} className={q.chain === 1 ? "only-chain1" : "only-chain2"}>
          {pinned && ticker ? (
            <button type="button" className="fl-buy bg-accent text-black" title={LABELS.QB_TITLE} onClick={() => onBuy(q.amount, q.unit)}>
              <span className="fl-buy-l">
                Buy <span className="num">{amountText(q.amount)}</span> {q.unit}
              </span>
              <span className="num fl-buy-usd">{LABELS.USD_EQ(fmt.usd(quickBuy(q.chain).toUsd(q.amount)))}</span>
            </button>
          ) : (
            <button type="button" className="fl-buy bg-raised text-dim" disabled title={LABELS.QB_TITLE}>
              <span className="fl-buy-l">{disabledLabel}</span>
            </button>
          )}
        </div>
      ))}
      <p className="fl-qbnote">
        <span className="meta">{LABELS.QB_TAG}</span> {LABELS.QB_TITLE}
      </p>
      {/* Pinning is as far as a coin goes here. A pinned tile reads as
          the step before a token page, and this build has none, so the
          inspector says so, as the other versions' panels do. */}
      {ticker && <p className="fl-qbnote fl-nopage">{LABELS.NO_PAGE}</p>}
    </div>
  );
}
