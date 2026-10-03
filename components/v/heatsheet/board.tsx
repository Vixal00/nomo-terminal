"use client";

import { useMemo, type ReactNode, type RefObject } from "react";
import { AuditDefTip, Tip } from "@/components/trending";
import { cx } from "@/components/ui";
import { AUDIT_BANDS, BUY_SHARE_EDGES, HEAT_EDGES, RANK_HEADLINE, RANK_RULE, type Tab, type Window } from "@/lib/trending";
import { signOf, useMarketSim } from "@/lib/trending-live";
import { LABELS } from "@/lib/labels";
import { Z500 } from "@/lib/spec";
import * as fmt from "@/lib/format";
import { CHANGE_COLS, COLS, FIRST_DIR, HEAT_LEGEND, TAB_CARET, colOf, type ColKey, type Sort, type SortKey } from "./columns";
import type { Token } from "./parse-query";
import { Row, bare, chg } from "./row";

/* The sheet: a sticky three-line head, the rows, and a sticky Σ/median
   line, all inside the one scroller. Head and Σ living inside it is what
   keeps them aligned with the rows: they share the rows' width and the
   scrollbar's gutter, so nothing is measured to line them up. */

/* The curve's head in the label's own words, cut at its " · " for a
   narrow sheet, which sets it on two lines: the first word in the group
   line over the column, the rest in place of the column's CRV. */
const CURVE_SEP = " · ";
const CURVE_CUT = LABELS.CURVE_HEAD.indexOf(CURVE_SEP);
const CURVE_A = CURVE_CUT < 0 ? LABELS.CURVE_HEAD : LABELS.CURVE_HEAD.slice(0, CURVE_CUT);
const CURVE_B = CURVE_CUT < 0 ? "" : LABELS.CURVE_HEAD.slice(CURVE_CUT + CURVE_SEP.length);

const CHANGE_TIP = `Price change over each window: fixture before this page opened, simulated since. Tints step at |change| ${HEAT_LEGEND}%, read at one decimal; teal up, red down. Each window is its own figure, drawn independently in the fixtures, so a run of one colour across a row is not a trend.`;

export type BoardProps = {
  gridId: string;
  scrollerRef: RefObject<HTMLDivElement | null>;
  tab: Tab;
  w: Window;
  display: string[];
  rankOf: Record<string, number>;
  ranks24: Record<string, number>;
  rankedAt: number | null;
  sel: string | null;
  starred: ReadonlySet<string>;
  starCount: number;
  art: Record<string, string>;
  solAmt: number;
  ethAmt: number;
  sort: Sort | null;
  onSort: (key: SortKey) => void;
  tokens: Token[];
  blacklist: string[];
  /** Coins the blacklist takes off the board (not entries in it). */
  hidden: number;
  onEcho: (t: Token) => void;
  onClear: () => void;
  onSelect: (t: string) => void;
  onBuy: (t: string) => void;
  onPointerInside: (inside: boolean) => void;
  onFocusInside: (inside: boolean) => void;
  /** A touch or a scroll on the sheet: true while it lasts, false when it ends. */
  onTouchHold: (active: boolean) => void;
};

export function rowIdOf(gridId: string, ticker: string) {
  return `${gridId}-${ticker}`;
}

/** The label a sort names itself by, for the rule and the group head. */
export function sortPhrase(sort: Sort) {
  return `${colOf(sort.key).label} ${sort.dir === "desc" ? "↓" : "↑"}`;
}

export function Board(p: BoardProps) {
  const { tab, w, display, sort } = p;
  const empty = display.length === 0;

  return (
    <div
      ref={p.scrollerRef}
      className="hs-scroll relative no-anchor"
      // A touch "enters" on touch-down and "leaves" the moment the browser
      // takes the drag for scrolling, so touch holds through its own
      // handlers below, never these.
      onPointerEnter={(e) => e.pointerType !== "touch" && p.onPointerInside(true)}
      onPointerLeave={(e) => e.pointerType !== "touch" && p.onPointerInside(false)}
      onTouchStart={() => p.onTouchHold(true)}
      onTouchEnd={() => p.onTouchHold(false)}
      onTouchCancel={() => p.onTouchHold(false)}
      onScroll={() => {
        p.onTouchHold(true);
        p.onTouchHold(false);
      }}
      onFocus={(e) => p.onFocusInside((e.target as HTMLElement).matches?.(":focus-visible") ?? false)}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) p.onFocusInside(false);
      }}
    >
      <div
        id={p.gridId}
        role="grid"
        tabIndex={0}
        aria-label="Trending board"
        // Three head rows, the coins, and one more: the Σ line, or the
        // empty state in its place.
        aria-rowcount={display.length + 4}
        aria-activedescendant={p.sel && p.rankOf[p.sel] ? rowIdOf(p.gridId, p.sel) : undefined}
        className="hs-grid"
      >
        <div role="rowgroup" className="hd">
          <GroupRow tab={tab} w={w} sort={sort} />
          <LabelRow tab={tab} w={w} sort={sort} onSort={p.onSort} />
          <EchoRow tokens={p.tokens} blacklist={p.blacklist} hidden={p.hidden} onEcho={p.onEcho} />
        </div>
        <div role="rowgroup" className="body">
          {empty ? (
            <Empty tab={tab} w={w} starCount={p.starCount} tokens={p.tokens} hidden={p.hidden} onClear={p.onClear} />
          ) : (
            display.map((t) => (
              <Row
                key={t}
                ticker={t}
                n={p.rankOf[t]}
                r24={p.ranks24[t]}
                selected={p.sel === t}
                starred={p.starred.has(t)}
                w={w}
                src={p.art[t]}
                solAmt={p.solAmt}
                ethAmt={p.ethAmt}
                rowId={rowIdOf(p.gridId, t)}
                onSelect={p.onSelect}
                onBuy={p.onBuy}
              />
            ))
          )}
        </div>
        {!empty && <Aggregate tickers={display} w={w} rankedAt={p.rankedAt} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Head */

function GroupRow({ tab, w, sort }: { tab: Tab; w: Window; sort: Sort | null }) {
  const headline = RANK_HEADLINE[tab](w);
  return (
    <div role="row" className="g hd-g">
      <div role="columnheader" className="gh gh-id">
        <Tip label={RANK_RULE[tab](w)} className="gh-tip">
          <span className="meta gh-text">{sort ? `Sorted by ${sortPhrase(sort)} · # = ${headline}` : headline}</span>
        </Tip>
      </div>
      <div role="columnheader" className="gh gh-chg">
        <Tip label={CHANGE_TIP} className="gh-tip">
          <span className="meta gh-text">Change by window · %</span>
        </Tip>
      </div>
      <div role="columnheader" className="gh gh-flow">
        <Tip label="Volume, trades and buy share in the selected window." className="gh-tip">
          <span className="meta gh-text">{w} window</span>
        </Tip>
      </div>
      <div role="columnheader" className="gh gh-token">
        <span className="meta gh-wide">Token info ·</span>
        <AuditDefTip align="end" />
      </div>
      {/* The curve's own head, in the label's exact words, over the curve
          alone: spanning Z500 too, it would call the seats roster curve. */}
      <div role="columnheader" className="gh gh-crv">
        <Tip label={LABELS.CURVE_CAVEAT} align="end" className="gh-tip">
          <span className="meta gh-text">
            {CURVE_A}
            {CURVE_B && <span className="crv-wide">{CURVE_SEP + CURVE_B}</span>}
          </span>
        </Tip>
      </div>
      <div role="columnheader" className="gh gh-z" />
    </div>
  );
}

function LabelRow({ tab, w, sort, onSort }: { tab: Tab; w: Window; sort: Sort | null; onSort: (k: SortKey) => void }) {
  const active = sort ? { key: sort.key as ColKey, dir: sort.dir } : TAB_CARET[tab];
  return (
    <div role="row" className="g hd-l">
      {COLS.map((c) => {
        const on = active.key === c.key;
        const caret = on ? (
          <span aria-hidden className="caret">
            {active.dir === "desc" ? "▼" : "▲"}
          </span>
        ) : null;
        // The selected window's column is the one the flow group and the
        // trending rank read, so its head carries the window's own mark.
        const isWindow = CHANGE_COLS.some(([k, win]) => k === c.key && win === w);
        const tone = cx(on && "hl-on", isWindow && "hl-win");
        const ariaSort = on ? (active.dir === "desc" ? "descending" : "ascending") : undefined;
        if (!c.label) return <div key={c.key} role="columnheader" className={cx("cell", `c-${c.key}`)} />;
        if (c.sort) {
          const key = c.sort;
          return (
            <div key={c.key} role="columnheader" aria-sort={ariaSort} className={cx("cell", `c-${c.key}`)}>
              <Tip label={c.tip({ tab, w })} focusable={false} align={c.tipAlign ?? "start"}>
                <button
                  type="button"
                  className={cx("meta hl", tone)}
                  onClick={() => onSort(key)}
                  aria-label={`${c.label}: sort${FIRST_DIR[key] ? ", youngest first" : ""}`}
                >
                  {c.label}
                  {caret}
                </button>
              </Tip>
            </div>
          );
        }
        const title = c.key === "crv" ? LABELS.CURVE_SORT_OFF : c.key === "z" ? "Use the Z500 tab to rank by seat." : undefined;
        return (
          <div key={c.key} role="columnheader" aria-sort={ariaSort} className={cx("cell", `c-${c.key}`)}>
            <Tip label={c.tip({ tab, w })} align={c.tipAlign ?? "start"}>
              <span className={cx("meta hl", tone)} title={title}>
                {c.key === "crv" && CURVE_B ? (
                  <>
                    <span className="crv-wide">{c.label}</span>
                    <span className="crv-narrow">{CURVE_B}</span>
                  </>
                ) : (
                  c.label
                )}
                {caret}
              </span>
            </Tip>
          </div>
        );
      })}
    </div>
  );
}

function Echo({ token, onEcho }: { token: Token; onEcho: (t: Token) => void }) {
  return (
    <button type="button" className="meta echo text-accent" title={`Remove ${token.raw}`} onClick={() => onEcho(token)}>
      {token.shown}
    </button>
  );
}

function Edges({ a, b }: { a: number; b: number }) {
  return (
    <span className="meta edges">
      {a}/{b}
    </span>
  );
}

function EchoRow({
  tokens,
  blacklist,
  hidden,
  onEcho,
}: {
  tokens: Token[];
  blacklist: string[];
  hidden: number;
  onEcho: (t: Token) => void;
}) {
  const of = (...kinds: Token["kind"][]) => tokens.filter((t) => kinds.includes(t.kind));
  const echoes = (list: Token[]) => list.map((t) => <Echo key={t.kind + t.raw} token={t} onEcho={onEcho} />);
  const t10 = of("top10Max");
  const dev = of("devMax");
  const nameTokens = of("search", "tier", "stage");
  const hiddenText = `Hidden: ${blacklist.join(", ")} (${hidden} ${hidden === 1 ? "coin" : "coins"}). Type +name to show one again.`;
  // The name cell clips what doesn't fit rather than printing over the
  // echoes beside it; the whole of it is in the title, and the line above
  // always reads in full.
  const nameTitle = [nameTokens.map((t) => t.raw).join(" "), hidden > 0 ? hiddenText : ""].filter(Boolean).join(" · ") || undefined;
  return (
    <div role="row" className="g hd-e">
      <div role="columnheader" className="cell c-name ec" title={nameTitle}>
        {/* The hidden count first: the echoes repeat words the line above
            prints in full, and this is the one figure here that isn't. */}
        {hidden > 0 && (
          <span className="meta ec-hidden" title={hiddenText}>
            {fmt.MINUS}
            {hidden} hidden
          </span>
        )}
        {echoes(nameTokens)}
      </div>
      <div role="columnheader" className="cell c-mc ec">
        {echoes(of("mcMin", "mcMax"))}
      </div>
      <div role="columnheader" className="gh ec-chg">
        <Tip label={CHANGE_TIP} className="gh-tip">
          <span className="legend">
            {HEAT_EDGES.map((e, i) => (
              <span key={e} className="lg">
                <i className="sw" data-b={i + 1} aria-hidden>
                  <b />
                  <b />
                </i>
                <span className="meta">{e}</span>
              </span>
            ))}
            <span className="lg lg-sl">
              <span aria-hidden className="meta sl-key">
                L
              </span>
              <span className="meta">{LABELS.SINCE_LAUNCH}</span>
            </span>
          </span>
        </Tip>
      </div>
      <div role="columnheader" className="cell c-vol ec">
        {echoes(of("volMin"))}
      </div>
      <div role="columnheader" className="cell c-bs ec">
        <Edges a={BUY_SHARE_EDGES.buy} b={BUY_SHARE_EDGES.sell} />
      </div>
      <div role="columnheader" className="cell c-liq ec">
        {echoes(of("liqMin"))}
      </div>
      <div role="columnheader" className="cell c-t10 ec">
        {t10.length ? echoes(t10) : <Edges a={AUDIT_BANDS.top10.warn} b={AUDIT_BANDS.top10.bad} />}
      </div>
      <div role="columnheader" className="cell c-dev ec">
        {dev.length ? echoes(dev) : <Edges a={AUDIT_BANDS.dev.warn} b={AUDIT_BANDS.dev.bad} />}
      </div>
      <div role="columnheader" className="cell c-snp ec">
        <Edges a={AUDIT_BANDS.snipers.warn} b={AUDIT_BANDS.snipers.bad} />
      </div>
      <div role="columnheader" className="cell c-bnd ec">
        <Edges a={AUDIT_BANDS.bundlers.warn} b={AUDIT_BANDS.bundlers.bad} />
      </div>
      <div role="columnheader" className="cell c-crv ec" />
      <div role="columnheader" className="cell c-z ec">
        <Edges a={Z500.bar} b={Z500.exit} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Empty */

function Empty({
  tab,
  w,
  starCount,
  tokens,
  hidden,
  onClear,
}: {
  tab: Tab;
  w: Window;
  starCount: number;
  tokens: Token[];
  hidden: number;
  onClear: () => void;
}) {
  if (tab === "starred" && starCount === 0) {
    return (
      <div role="row" className="hs-empty">
        <div role="gridcell">
          <p className="text-[12px] text-muted">No starred coins. Press S on a selected row to star it.</p>
          <p className="text-[11px] text-dim">{RANK_RULE.starred(w)}</p>
        </div>
      </div>
    );
  }
  // What is applied, token by token, never the line as typed: a token
  // the parser refused is not part of the filter and isn't printed here.
  const applied = tokens.map((t) => t.raw).join(" ");
  return (
    <div role="row" className="hs-empty">
      <div role="gridcell" className="hs-empty-row">
        <span className="meta">No coin matches</span>
        {applied && <span className="font-mono text-[12px] text-accent">{applied}</span>}
        {applied && (
          <button type="button" className="meta hs-key" onClick={onClear}>
            Clear the line
          </button>
        )}
        {hidden > 0 && <span className="meta">{hidden} hidden by your blacklist</span>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Σ/MED */

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

type Agg = { v: number | null; k: number };

/** Every row on the board, scrolled into view or not, summed where a
 *  sum means something (volume, trades, liquidity) and the median
 *  everywhere else. Computed from the same
 *  snapshot as the order: it re-computes exactly when the order does, so
 *  it never describes a different moment from the rows above it. */
function Aggregate({ tickers, w, rankedAt }: { tickers: string[]; w: Window; rankedAt: number | null }) {
  const sim = useMarketSim();
  const n = tickers.length;

  const a = useMemo(() => {
    const pick = (f: (t: string) => number | null) => tickers.map(f).filter((v): v is number => v !== null && Number.isFinite(v));
    const med = (f: (t: string) => number | null): Agg => {
      const xs = pick(f);
      return { v: median(xs), k: xs.length };
    };
    const sum = (f: (t: string) => number | null): Agg => {
      const xs = pick(f);
      return { v: xs.length ? xs.reduce((s, x) => s + x, 0) : null, k: xs.length };
    };
    const row = (t: string) => sim.row(t)!;
    return {
      age: med((t) => sim.value(t, "24h", "age")),
      mc: med((t) => sim.value(t, "24h", "mc")),
      c5m: med((t) => sim.value(t, "5m", "change")),
      c1h: med((t) => sim.value(t, "1h", "change")),
      c6h: med((t) => sim.value(t, "6h", "change")),
      c24h: med((t) => sim.value(t, "24h", "change")),
      vol: sum((t) => sim.value(t, w, "volume")),
      txn: sum((t) => sim.value(t, w, "txns")),
      bs: med((t) => sim.value(t, w, "buyRatio")),
      liq: sum((t) => sim.value(t, "24h", "liquidity")),
      hld: med((t) => row(t).holders),
      t10: med((t) => row(t).top10Pct),
      dev: med((t) => row(t).devPct),
      snp: med((t) => row(t).snipersPct),
      bnd: med((t) => row(t).bundlersPct),
    };
    // rankedAt is the order's snapshot moment: re-compute with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers, w, rankedAt, sim]);

  const at = rankedAt === null ? "" : `, at ${new Date(rankedAt).toLocaleTimeString("en-GB", { hour12: false })}`;
  const partial = (x: Agg, sigma: boolean) =>
    x.k < n ? (sigma ? `Σ of ${x.k} of ${n} rows that have it` : `Median of ${x.k} of ${n} rows that have it`) : undefined;

  const cell = (key: ColKey, x: Agg, text: string, sigma = false, extra?: ReactNode) => (
    <div role="gridcell" className={cx("cell", `c-${key}`)} title={x.v === null ? LABELS.NULL_TITLE : partial(x, sigma)}>
      {sigma && x.v !== null && <span className="sig">Σ </span>}
      <span className="num">{text}</span>
      {extra}
    </div>
  );

  return (
    <div role="rowgroup" className="sigma-wrap">
      <div role="row" className="g sigma">
        <div role="gridcell" className="gh sg-id">
          <Tip
            side="top"
            label={`Σ: sum over the ${n} rows on this board, including those scrolled out of view (VOL, TXN, LIQ). Every other figure is the median of the rows that have it. Computed when the order was last ranked${at}.`}
          >
            <span className="meta">
              Σ/MED n=<span className="num">{n}</span>
            </span>
          </Tip>
        </div>
        {cell("age", a.age, fmt.age(a.age.v))}
        {cell("mc", a.mc, bare(fmt.usd(a.mc.v)))}
        {CHANGE_COLS.map(([key]) => {
          const x = a[key];
          const text = chg(x.v);
          return (
            <div key={key} role="gridcell" className={cx("cell", `c-${key}`)} title={x.v === null ? LABELS.NULL_TITLE : partial(x, false)}>
              <span className="num" data-sign={signOf(x.v, text)}>
                {text}
              </span>
            </div>
          );
        })}
        {cell("vol", a.vol, bare(fmt.usd(a.vol.v)), true)}
        {cell("txn", a.txn, fmt.compact(a.txn.v), true)}
        {cell("bs", a.bs, a.bs.v === null ? fmt.NULL : bare(fmt.share(a.bs.v * 100, 0)))}
        {cell("liq", a.liq, bare(fmt.usd(a.liq.v)), true)}
        {cell("hld", a.hld, fmt.compact(a.hld.v))}
        {cell("t10", a.t10, a.t10.v === null ? fmt.NULL : bare(fmt.share(a.t10.v)))}
        {cell("dev", a.dev, a.dev.v === null ? fmt.NULL : bare(fmt.share(a.dev.v)))}
        {cell("snp", a.snp, a.snp.v === null ? fmt.NULL : bare(fmt.share(a.snp.v)))}
        {cell("bnd", a.bnd, a.bnd.v === null ? fmt.NULL : bare(fmt.share(a.bnd.v)))}
        {/* Empty, but present: the group hairlines run down to the last line. */}
        <div role="gridcell" className="cell c-crv" />
        <div role="gridcell" className="cell c-z" />
      </div>
    </div>
  );
}
