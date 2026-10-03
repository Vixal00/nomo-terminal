"use client";

import { memo, type ReactNode, type RefObject } from "react";
import { CoinAvatar, GlyphBadge, cx } from "@/components/ui";
import { StarMark } from "@/components/marks";
import { Tip } from "@/components/trending";
import { LABELS } from "@/lib/labels";
import * as fmt from "@/lib/format";
import { RANK_METRIC, auditBand, rowOf, type TrendingRow, type Window } from "@/lib/trending";
import { useLiveCell, useLiveValue, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import { TONE_CLASS, scoreTone, seatState } from "@/lib/seat-state";
import { OR_COPY, TIER_GLYPH, rankRule, type OrTab } from "./local";

/* The left column: the ranked list, and nothing to act on but the rows.

   There is no Buy in a row, and hover never changes the inspector. The
   one Buy key on the page sits under the inspected coin's nameplate, so
   a re-rank that slides a different coin under the pointer can't turn a
   click into a buy of the wrong row.

   Each figure is a live cell from lib/trending-live: the hook writes the
   node's text directly on every simulated commit, so a ticking board of
   78 rows costs no React renders. A row renders again only when its own
   props change (selection, star, window, tab), which is what the memo
   below is keyed on. */

/* ------------------------------------------------------------- cells */

/** A null prints the dash, dim, with the reason on hover. T's nulls are
 *  its own: the real launch is a snapshot and the fixtures never had
 *  those figures for it. */
function nullTitle(real: boolean, fallback: string = LABELS.NULL_TITLE) {
  return real ? LABELS.NOT_INDEXED : fallback;
}

/** The reason for a dash comes first. A coin with no figure for the
 *  window has nothing to be "since launch" about, so a null change keeps
 *  the null title and never takes the dotted since-launch mark: the list
 *  and the inspector's strip explain the same dash the same way. */
function ChangeCell({ ticker, w, real }: { ticker: string; w: Window; real: boolean }) {
  const c = useLiveCell(ticker, w, "change", (v) => fmt.pct(v));
  const since = useSinceLaunch(ticker, w) && c.sign !== "null";
  const title = c.sign === "null" ? nullTitle(real, LABELS.CHANGE_NULL_TITLE) : since ? LABELS.SINCE_LAUNCH_TITLE : undefined;
  return (
    <span className="c-chg c-num">
      <span ref={c.ref} {...c.data} data-since={since ? "" : undefined} title={title} className="num sg">
        {c.text}
      </span>
    </span>
  );
}

function McCell({ ticker, w, row }: { ticker: string; w: Window; row: TrendingRow }) {
  const c = useLiveCell(ticker, w, "mc", fmt.usdLike(row.mcLabel), { split: true });
  return (
    <span className="c-mc c-num">
      <span ref={c.ref} {...c.data} className="num">
        <span>{c.head}</span>
        <span data-part="unit">{c.tail}</span>
      </span>
    </span>
  );
}

function VolCell({ ticker, w, real }: { ticker: string; w: Window; real: boolean }) {
  const c = useLiveCell(ticker, w, "volume", (v) => fmt.usd(v));
  return (
    <span className="c-vol c-num">
      <span ref={c.ref} {...c.data} title={c.sign === "null" ? nullTitle(real) : undefined} className="num">
        {c.text}
      </span>
    </span>
  );
}

/** Writes the buy share onto the 2px track under the trade count: the
 *  width of the teal part, and whether there is a share at all (a window
 *  with no trades has none, and its track goes flat grey rather than
 *  reading as all-sell). Shared with the inspector's Buys row, so the
 *  page has one split-bar idiom. */
export function applyShare(el: HTMLElement, v: number | null) {
  el.style.width = v === null ? "0" : `${v * 100}%`;
  // Written only when it flips: it almost never does, and 78 rows
  // rewriting an unchanged attribute every tick is work for nothing.
  const track = el.parentElement;
  const n = String(v === null);
  if (track && track.dataset.null !== n) track.dataset.null = n;
}

export function ShareTrack({ ticker, w, className }: { ticker: string; w: Window; className?: string }) {
  const r = useLiveValue<HTMLSpanElement>(ticker, w, "buyRatio", applyShare);
  return (
    <span aria-hidden className={cx("or-track", className)} data-null={String(r.value === null)}>
      <span ref={r.ref} style={{ width: r.value === null ? "0" : `${r.value * 100}%` }} />
    </span>
  );
}

function TxnCell({ ticker, w, real }: { ticker: string; w: Window; real: boolean }) {
  const c = useLiveCell(ticker, w, "txns", (v) => fmt.compact(v));
  return (
    <span className="c-txn c-num" title="Trades in the window. The bar under it is the buys' share.">
      <span ref={c.ref} {...c.data} title={c.sign === "null" ? nullTitle(real) : undefined} className="num">
        {c.text}
      </span>
      <ShareTrack ticker={ticker} w={w} />
    </span>
  );
}

function LiqCell({ ticker, w, real }: { ticker: string; w: Window; real: boolean }) {
  const c = useLiveCell(ticker, w, "liquidity", (v) => fmt.usd(v));
  return (
    <span className="c-liq c-num">
      <span ref={c.ref} {...c.data} title={c.sign === "null" ? nullTitle(real) : undefined} className="num">
        {c.text}
      </span>
    </span>
  );
}

/** Top-10 share · dev share, each in its own band colour. Static: the
 *  holder figures are fixtures and never tick. */
function RiskCell({ row }: { row: TrendingRow }) {
  if (row.real) {
    return (
      <span className="c-risk c-num">
        <span className="num" data-sign="null" title={LABELS.NOT_INDEXED}>
          {fmt.NULL}
        </span>
      </span>
    );
  }
  const t10 = row.top10Hidden ? null : row.top10Pct;
  return (
    <span className="c-risk c-num">
      <span className="num">
        <span
          data-band={auditBand("top10", t10) ?? "null"}
          title={row.top10Hidden ? LABELS.TOP10_HIDDEN : t10 === null ? LABELS.NULL_TITLE : undefined}
        >
          {fmt.share(t10, 0)}
        </span>
        <span className="or-dot">·</span>
        <span
          data-band={auditBand("dev", row.devPct) ?? "null"}
          title={row.devPct === null ? LABELS.NULL_TITLE : undefined}
        >
          {fmt.share(row.devPct, 1)}
        </span>
      </span>
    </span>
  );
}

/** Seated tab: the score takes the risk slot. A numeral only for a
 *  scored seat. A Fortress or Diamond seat isn't scored week to week, so
 *  it says so in words: its seat number printed here as "#3" would sit
 *  in a column of scores looking like one, or like a rank. */
function ScoreCell({ row }: { row: TrendingRow }) {
  const st = seatState(row);
  if (!row.seat) {
    return (
      <span className="c-risk c-num">
        <span className="num" data-sign="null" title={st.sentence}>
          {fmt.NULL}
        </span>
      </span>
    );
  }
  return (
    <span className="c-risk c-num">
      {st.numeral !== null ? (
        <span className={cx("num", TONE_CLASS[scoreTone(row.seat)])} title={st.sentence}>
          {st.numeral}
        </span>
      ) : (
        <span className="meta text-muted" title={`${st.sentence} Seat #${row.seat.seatNo}.`}>
          Unscored
        </span>
      )}
    </span>
  );
}

function AgeCell({ ticker, w, row }: { ticker: string; w: Window; row: TrendingRow }) {
  const c = useLiveCell(ticker, w, "age", fmt.ageLike(row.ageLabel));
  return (
    <span className="c-age c-num">
      <span ref={c.ref} {...c.data} className="num">
        {c.text}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- row */

type RowProps = {
  ticker: string;
  index: number;
  /** Whether the position is a rank: the coin has the figure the tab
   *  ranks by (rankOf in screen.tsx makes the same test for the
   *  nameplate's stamp). */
  ranked: boolean;
  selected: boolean;
  open: boolean;
  starred: boolean;
  tab: OrTab;
  w: Window;
  wide: boolean;
  src: string | undefined;
  onPick: (ticker: string) => void;
};

function Cells({ ticker, index, ranked, starred, tab, w, src, row }: Omit<RowProps, "selected" | "open" | "wide" | "onPick"> & { row: TrendingRow }) {
  const g = TIER_GLYPH[row.tier];
  return (
    <>
      {/* A coin without the figure the tab ranks by is sorted last, not
          ranked last: its position printed as a numeral would contradict
          the nameplate's "Not ranked" for the same coin. */}
      {ranked ? (
        <span className="or-rank num">{index + 1}</span>
      ) : (
        <span className="or-rank num" data-sign="null" title={OR_COPY.NOT_RANKED_TITLE}>
          {fmt.NULL}
        </span>
      )}
      <span className="c-art">
        <CoinAvatar ticker={ticker} src={src} size={18} />
      </span>
      <span className="c-pair">
        {/* No link colour on hover: a row selects its coin, it doesn't
            go anywhere, and there is no token page to go to. */}
        <span className="or-tk font-mono text-[12.5px] font-medium text-bone">{ticker}</span>
        {row.real ? (
          <span className="meta or-real text-rim" title={LABELS.REAL_TITLE}>
            {LABELS.REAL}
          </span>
        ) : (
          <GlyphBadge cls={g.cls} box={g.box} label={`${row.tier} tier`} title={row.tier} className="or-glyph" />
        )}
        <span className="or-name cased font-sans text-[11px] text-muted">{row.name}</span>
        {starred && (
          <span className="or-star" title="Starred">
            <StarMark className="h-2.5 w-2.5 text-muted" />
          </span>
        )}
      </span>
      <ChangeCell ticker={ticker} w={w} real={row.real} />
      <McCell ticker={ticker} w={w} row={row} />
      <VolCell ticker={ticker} w={w} real={row.real} />
      <TxnCell ticker={ticker} w={w} real={row.real} />
      <LiqCell ticker={ticker} w={w} real={row.real} />
      {tab === "z500" ? <ScoreCell row={row} /> : <RiskCell row={row} />}
      <AgeCell ticker={ticker} w={w} row={row} />
    </>
  );
}

/** One coin. An option in a listbox on desktop, where the inspector
 *  beside the list follows the selection; a disclosure button on a
 *  phone, where the inspector opens under the row itself. Spans all the
 *  way down, because a button may only hold phrasing content. */
export const Row = memo(function Row(p: RowProps) {
  const row = rowOf(p.ticker)!;
  const cells = <Cells {...p} row={row} />;
  if (p.wide) {
    return (
      <div
        role="option"
        id={`or-opt-${p.ticker}`}
        aria-selected={p.selected}
        className="or-row or-grid"
        onClick={() => p.onPick(p.ticker)}
      >
        {cells}
      </div>
    );
  }
  return (
    <button
      type="button"
      id={`or-opt-${p.ticker}`}
      aria-expanded={p.open}
      aria-controls={p.open ? "or-inline" : undefined}
      className={cx("or-row or-grid", p.open && "is-open")}
      onClick={() => p.onPick(p.ticker)}
    >
      {cells}
    </button>
  );
});

/* ------------------------------------------------------------- board */

export type Hidden = { entry: string; ticker: string } | null;

export function Board({
  tab,
  w,
  tickers,
  ranked,
  total,
  sel,
  openTicker,
  wide,
  stars,
  starsLoaded,
  art,
  echo,
  onPick,
  listboxRef,
  inline,
  frozen,
  pending,
  onApplyMoves,
  lastHidden,
  onUndo,
  hiddenCount,
  onClearFilters,
  onShowHidden,
  onHover,
  sectionRef,
}: {
  tab: OrTab;
  w: Window;
  tickers: string[];
  ranked: (ticker: string) => boolean;
  total: number;
  sel: string | null;
  openTicker: string | null;
  wide: boolean;
  stars: readonly string[];
  starsLoaded: boolean;
  art: Record<string, string>;
  echo: string[];
  onPick: (ticker: string) => void;
  listboxRef: RefObject<HTMLDivElement | null>;
  inline: ReactNode;
  frozen: boolean;
  pending: number;
  onApplyMoves: () => void;
  lastHidden: Hidden;
  onUndo: () => void;
  hiddenCount: number;
  onClearFilters: () => void;
  onShowHidden: () => void;
  onHover: (on: boolean) => void;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const sim = useMarketSim();
  const W = w.toUpperCase();
  const starSet = new Set(stars);

  /* The rule is the tab's own sentence, then what narrowed the list,
     then the one mark a reader can't decode on sight. Read from the sim
     in render: before the first commit it is the fixture, the same on
     the server and in hydration. */
  const anySince = tickers.some((t) => sim.sinceLaunch(t, w));

  const empty =
    tickers.length > 0 ? null : tab === "starred" && starsLoaded && stars.length === 0 ? "stars" : tab === "starred" && !starsLoaded ? "loading" : "match";

  return (
    <section
      ref={sectionRef}
      id="or-board"
      role="tabpanel"
      aria-label="Board"
      data-rank={RANK_METRIC[tab]}
      className="or-list no-anchor"
      onPointerEnter={(e) => {
        // A finger has no hover: a tap would freeze the order and nothing
        // would ever unfreeze it.
        if (e.pointerType === "mouse") onHover(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") onHover(false);
      }}
    >
      <div className="or-sticky">
        {/* The sentence is the tab's standing rule and recedes like a
            column head. What follows it is state, and on a phone the
            only record of what narrows the list, so it is set a step
            brighter, in the muted ink. */}
        <p className="or-rule">
          {rankRule(tab, w)}
          {echo.length > 0 && <span className="or-rule-state"> · Filtered: {echo.join(", ")}</span>}
          {anySince && <span className="or-rule-state"> · Dotted change: since launch</span>}
        </p>
        <div className="or-heads or-grid meta">
          <span className="or-rank">#</span>
          <span className="c-art" />
          <span className="c-pair">Pair</span>
          {/* The window is printed once, on the first column it governs.
              Two right-aligned heads that both end in it ("VOL 1H TXNS 1H")
              have a gap no wider than their own word space and read as one
              phrase, and at 24H they touch. The titles carry it in full. */}
          <span className="c-chg c-num" title={`Price change in the last ${w}`}>
            Δ{W}
          </span>
          <span className="c-mc c-num">MCap</span>
          <span className="c-vol c-num" title={`Volume in the last ${w}`}>
            Vol
          </span>
          <span className="c-txn c-num" title={`Trades in the last ${w}`}>
            Txns
          </span>
          <span className="c-liq c-num">Liq</span>
          <span className="c-risk c-num">
            {tab === "z500" ? (
              "Score"
            ) : (
              <Tip label={LABELS.AUDIT_DEF} side="bottom" align="end" className="or-head-tip">
                <span className="cursor-help underline decoration-dotted underline-offset-2">T10·Dev</span>
              </Tip>
            )}
          </span>
          <span className="c-age c-num">Age</span>
        </div>
      </div>

      {wide ? (
        <div
          ref={listboxRef}
          role="listbox"
          tabIndex={0}
          aria-label="Coins"
          aria-activedescendant={sel && tickers.includes(sel) ? `or-opt-${sel}` : undefined}
          className="or-rows"
        >
          {tickers.map((t, i) => (
            <Row
              key={t}
              ticker={t}
              index={i}
              ranked={ranked(t)}
              selected={t === sel}
              open={false}
              starred={starSet.has(t)}
              tab={tab}
              w={w}
              wide
              src={art[t]}
              onPick={onPick}
            />
          ))}
          {empty && (
            <Empty kind={empty} echo={echo} hiddenCount={hiddenCount} onClear={onClearFilters} onShowHidden={onShowHidden} />
          )}
        </div>
      ) : (
        <div role="list" aria-label="Coins" className="or-rows">
          {tickers.map((t, i) => (
            <div role="listitem" key={t}>
              <Row
                ticker={t}
                index={i}
                ranked={ranked(t)}
                selected={false}
                open={t === openTicker}
                starred={starSet.has(t)}
                tab={tab}
                w={w}
                wide={false}
                src={art[t]}
                onPick={onPick}
              />
              {t === openTicker && inline}
            </div>
          ))}
          {empty && (
            <Empty kind={empty} echo={echo} hiddenCount={hiddenCount} onClear={onClearFilters} onShowHidden={onShowHidden} />
          )}
        </div>
      )}

      <div className="or-foot meta">
        <span className="whitespace-nowrap">
          <span className="num">{tickers.length}</span> of <span className="num">{total}</span> coins
        </span>
        {lastHidden && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            Hid {lastHidden.ticker} ·
            <button type="button" onClick={onUndo} className="meta text-muted underline underline-offset-2 hover:text-bone">
              Undo
            </button>
          </span>
        )}
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {frozen && (
            <span className="truncate" title={LABELS.HELD_TITLE}>
              {LABELS.HELD(pending)}
            </span>
          )}
          {frozen && pending > 0 && (
            <button type="button" aria-label="Apply waiting moves" onClick={onApplyMoves} className="or-key or-key-btn">
              R
            </button>
          )}
        </span>
      </div>
    </section>
  );
}

function Empty({
  kind,
  echo,
  hiddenCount,
  onClear,
  onShowHidden,
}: {
  kind: "stars" | "match" | "loading";
  echo: string[];
  hiddenCount: number;
  onClear: () => void;
  onShowHidden: () => void;
}) {
  // Stars are read from storage after mount; until then there is
  // nothing true to say about them, so say nothing.
  if (kind === "loading") return <div className="or-empty" />;
  if (kind === "stars") {
    return (
      <div className="or-empty">
        <p className="text-bone">{OR_COPY.NO_STARS}</p>
        <p>{OR_COPY.NO_STARS_HINT}</p>
      </div>
    );
  }
  return (
    <div className="or-empty">
      <p className="text-bone">{OR_COPY.NO_MATCH}</p>
      {echo.length > 0 && <p>{echo.join(", ")}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onClear} className="or-btn meta">
          Clear filters
        </button>
        {hiddenCount > 0 && (
          <button type="button" onClick={onShowHidden} className="or-btn meta">
            {/* Named for what it does: it empties the saved list, as the
                Hidden panel's own "Restore all" does. */}
            Restore all hidden (<span className="num">{hiddenCount}</span>)
          </button>
        )}
      </div>
    </div>
  );
}
