"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { Tip } from "@/components/trending";
import { LABELS, RANK_RULE } from "@/lib/labels";
import { RANK_METRIC, applyFilter, rank, trendingRows, type RankMetric, type Tab, type Window } from "@/lib/trending";
import { LINE_COPY } from "./lifecycle";
import { Row, type Kind, type SelectHow } from "./row";

/* One side of the line.

   A title strip that says what is here and why it is in this order,
   then a scroller whose first child is the labels strip, sticky inside
   it, so heads and rows share one content width (and one scrollbar
   gutter) with the band's axis. The curve pane ends on its caveat,
   sticky at the bottom, so the hatched bars are never on screen without
   the sentence that explains them. */

type Order = { frozen: boolean; setFrozen: (f: boolean) => void; pending: number };

export function Pane({
  kind,
  tab,
  w,
  list,
  order,
  sel,
  inline,
  stars,
  blacklisted,
  art,
  qbAmount,
  qbUnit,
  echo,
  toggle,
  narrowed,
  navByKey,
  scrollRef,
  onSelect,
  onClearFilters,
  onShowHidden,
  renderInline,
}: {
  kind: Kind;
  tab: Tab;
  w: Window;
  list: readonly string[];
  order: Order;
  sel: string | null;
  /** The card whose dossier is open under it (stack mode only). */
  inline: string | null;
  stars: readonly string[];
  /** Every ticker the hidden list removes, whatever the tab. */
  blacklisted: ReadonlySet<string>;
  art: Record<string, string>;
  qbAmount: number;
  qbUnit: string;
  echo: readonly string[];
  /** The one toggle that filters only this pane, set in its own strip
   *  so nobody has to guess which side it narrows. */
  toggle: ReactNode;
  /** Whether anything beyond the tab narrows this pane (search, limits,
   *  tiers, this pane's toggle), so an empty pane can say which it is. */
  narrowed: boolean;
  navByKey: RefObject<boolean>;
  scrollRef: RefObject<HTMLDivElement | null>;
  onSelect: (ticker: string, how: SelectHow) => void;
  onClearFilters: () => void;
  onShowHidden: () => void;
  renderInline: (ticker: string) => ReactNode;
}) {
  const z500Curve = kind === "curve" && tab === "z500";
  const rule = z500Curve ? null : (RANK_RULE[tab] as (w: Window) => string)(w);
  const W = w.toUpperCase();

  /* Scroll kept per tab, in a ref: one board serves every tab, so going
     back to Trending from Z500 returns to where the reader was without
     five mounted boards. */
  const memo = useRef<Record<string, number>>({});
  const tabRef = useRef(tab);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const on = () => {
      memo.current[`${tabRef.current}:${kind}`] = el.scrollTop;
    };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [kind, scrollRef]);
  useLayoutEffect(() => {
    tabRef.current = tab;
    const el = scrollRef.current;
    if (el) el.scrollTop = memo.current[`${tab}:${kind}`] ?? 0;
  }, [tab, kind, scrollRef]);

  /* A re-rank can carry the selected row out of view. Follow it only
     when the reader is moving by keyboard: someone who moved with the
     mouse is looking somewhere, and the list must not scroll away from
     where they are looking. */
  const selRef = useRef(sel);
  selRef.current = sel;
  const key = list.join(",");
  useLayoutEffect(() => {
    const s = selRef.current;
    if (!navByKey.current || !s || !list.includes(s)) return;
    scrollRef.current?.querySelector(`.lrow[data-ticker="${s}"]`)?.scrollIntoView({ block: "nearest" });
    // Keyed on the order itself; sel moves are scrolled by the key that moved them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* The order holds while the pointer is over the pane or focus is in
     it, and only lets go when neither is. The two are kept apart
     because each ends on its own event: a click on a cell blurs the
     row button while the pointer is still here, and Esc drops focus
     with the pointer resting on the list.

     Only keyboard focus counts. A mouse press on a row's gutter focuses
     its button where a press on a cell focuses nothing, and a hold that
     outlived the pointer by which pixel was clicked would keep the list
     still for a reader who is looking at the rail. */
  const inside = useRef({ pointer: false, focus: false });
  const hold = () => order.setFrozen(inside.current.pointer || inside.current.focus);
  /* Chrome fires no blur when the focused row is removed (a tab switch,
     H on the last row, an unstar on Starred), so after every render a
     stale "inside" is checked against the page and cleared. It only
     ever clears: a sticky touch :hover must not hold a list. */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const s = inside.current;
    if (!el || !(s.pointer || s.focus)) return;
    let changed = false;
    if (s.focus && !el.contains(document.activeElement)) {
      s.focus = false;
      changed = true;
    }
    if (s.pointer && !el.matches(":hover")) {
      s.pointer = false;
      changed = true;
    }
    if (changed) order.setFrozen(s.pointer || s.focus);
  });

  const empty = z500Curve ? (
    <p className="empty">{LINE_COPY.EMPTY_Z500_CURVE}</p>
  ) : list.length === 0 ? (
    <Empty
      kind={kind}
      tab={tab}
      w={w}
      stars={stars}
      blacklisted={blacklisted}
      narrowed={narrowed}
      onClearFilters={onClearFilters}
      onShowHidden={onShowHidden}
    />
  ) : null;

  const starSet = new Set(stars);
  /* One tab stop per pane: the selected row if it is here, else the
     first. J, K and the arrows move between rows, and B buys, so a
     stop per row and per Buy key would only put the dossier a hundred
     and sixty presses away. */
  const stop = sel !== null && list.includes(sel) ? sel : list[0];

  return (
    <section
      className="pane"
      data-kind={kind}
      data-metric={RANK_METRIC[tab]}
      data-empty={empty ? "" : undefined}
      aria-label={kind === "grad" ? "Graduated" : "On the curve"}
    >
      <div className="title">
        <span className="meta tl">{kind === "grad" ? "Graduated" : "On the curve"}</span>
        <span className="num cnt">{z500Curve ? 0 : list.length}</span>
        {rule && <span className="rule">{rule}</span>}
        {!z500Curve && toggle}
        {echo.length > 0 && (
          <span className="meta echo">
            {echo.map((t, i) => (
              <Fragment key={t}>
                {i > 0 && " · "}
                <span className="et">{t}</span>
              </Fragment>
            ))}
          </span>
        )}
        <span className="grow" />
        {/* Always in the strip. Where the strip wraps (cards, and the
            overlaid drawer) a note that came and went, or grew with its
            count, would re-wrap it and move every row under the reader,
            which is what the hold is there to stop. There the CSS keeps
            the note's place while the order runs and prints the short
            form from data-short, one length whatever the count, which
            the title then carries. */}
        <span
          className="meta held"
          data-on={order.frozen ? "" : undefined}
          data-short={LABELS.HELD(0)}
          title={order.frozen ? `${LABELS.HELD(order.pending)}. ${LABELS.HELD_TITLE}` : undefined}
        >
          {order.frozen && <span className="hl">{LABELS.HELD(order.pending)}</span>}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="scroll no-anchor"
        onPointerEnter={() => {
          inside.current.pointer = true;
          hold();
        }}
        onPointerLeave={() => {
          inside.current.pointer = false;
          hold();
        }}
        onFocusCapture={(e) => {
          inside.current.focus = (e.target as Element).matches(":focus-visible");
          hold();
        }}
        onBlurCapture={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          inside.current.focus = false;
          hold();
        }}
      >
        <Labels kind={kind} W={W} metric={RANK_METRIC[tab]} />
        {!z500Curve && list.length > 0 && (
          <ol className="rows" role="list">
            {list.map((t) => (
              <PaneRow
                key={t}
                ticker={t}
                kind={kind}
                w={w}
                src={art[t]}
                selected={sel === t}
                tabbable={t === stop}
                starred={starSet.has(t)}
                qbAmount={qbAmount}
                qbUnit={qbUnit}
                onSelect={onSelect}
                inline={inline === t ? renderInline(t) : null}
              />
            ))}
          </ol>
        )}
        {empty}
        {kind === "curve" && (
          <div className="foot">
            <span className="fh">
              <span className="sw hatch door-art" aria-hidden />
              <span className="ft">{LABELS.CURVE_CAVEAT}</span>
            </span>
            <span className="fh">
              <span className="sw solid" aria-hidden />
              <span className="ft">{LABELS.CURVE_FORTRESS}</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function PaneRow({ inline, ...props }: Parameters<typeof Row>[0] & { inline: ReactNode }) {
  return (
    <>
      <Row {...props} />
      {inline && <li className="inline-dossier">{inline}</li>}
    </>
  );
}

/** Why a pane is empty, said truthfully. The tab and this stage decide
 *  which coins could be here; the hidden list and the filters are the
 *  only two things that take them out, and each gets its own way back.
 *  Counted only when the pane is empty, off the fixture rows, since it
 *  asks which coins the tab lists, not how they rank. */
function Empty({
  kind,
  tab,
  w,
  stars,
  blacklisted,
  narrowed,
  onClearFilters,
  onShowHidden,
}: {
  kind: Kind;
  tab: Tab;
  w: Window;
  stars: readonly string[];
  blacklisted: ReadonlySet<string>;
  narrowed: boolean;
  onClearFilters: () => void;
  onShowHidden: () => void;
}) {
  const here = rank(applyFilter(trendingRows(), { stage: kind === "grad" ? "migrated" : "curve" }, w), tab, w, {
    starred: tab === "starred" ? stars : undefined,
  });
  const hidden = blacklisted.size ? here.filter((r) => blacklisted.has(r.ticker)).length : 0;
  const showHidden = (
    <button type="button" className="meta clr" onClick={onShowHidden}>
      {LINE_COPY.OPEN_HIDDEN}
    </button>
  );

  if (narrowed) {
    return (
      <div className="empty">
        <p>
          {LINE_COPY.EMPTY_FILTERED}
          {hidden > 0 && ` ${LINE_COPY.ALSO_HIDDEN(hidden)}`}
        </p>
        <div className="acts">
          <button type="button" className="meta clr" onClick={onClearFilters}>
            Clear filters
          </button>
          {hidden > 0 && showHidden}
        </div>
      </div>
    );
  }
  if (hidden > 0) {
    return (
      <div className="empty">
        <p>{tab === "starred" ? LINE_COPY.EMPTY_STARRED_HIDDEN(hidden) : LINE_COPY.EMPTY_ALL_HIDDEN(hidden)}</p>
        <div className="acts">{showHidden}</div>
      </div>
    );
  }
  return <p className="empty">{tab === "starred" ? LINE_COPY.EMPTY_STARRED : LINE_COPY.EMPTY_FILTERED}</p>;
}

/** The column heads. None of them sorts: the tab is the only ordering
 *  control, so the curve column can't be sorted by accident while the
 *  roster curve doesn't follow market cap. The head of the figure the
 *  tab ranks by is set in bone with a direction mark, so the reason
 *  for the order is on the column and not only in the title sentence. */
function Labels({ kind, W, metric }: { kind: Kind; W: string; metric: RankMetric }) {
  const ranked = (m: RankMetric) => (metric === m ? { "data-rank": "", title: LINE_COPY.RANK_HEAD_TITLE } : {});
  return (
    <div className="labels">
      <span className="lc c-pair meta">
        Pair
        {metric === "age" && (
          <span className="rkh" {...ranked("age")}>
            · Age
            <RankMark up />
          </span>
        )}
      </span>
      <span className="lc c-chg fig meta">Δ {W}</span>
      <span className="lc c-mc fig meta" {...ranked("mc")}>
        Mcap
        {metric === "mc" && <RankMark />}
      </span>
      <span className="lc c-vol fig meta">Vol {W}</span>
      <span className="lc c-txn fig meta" {...ranked("txns")}>
        Txn {W}
        {metric === "txns" && <RankMark />}
      </span>
      <span className="lc c-liq fig meta">Liq</span>
      <span className="lc c-pre">
        {kind === "grad" ? (
          <span className="meta">Z500 seat</span>
        ) : (
          <Tip label={`${LABELS.CURVE_CAVEAT} ${LABELS.CURVE_FORTRESS}`}>
            <span className="meta tiph">{LABELS.CURVE_HEAD}</span>
          </Tip>
        )}
      </span>
      <span className="lc c-node" />
      <span className="lc c-post">
        {kind === "grad" ? (
          <span className="pg">
            <Tip label={LINE_COPY.SCORE_TITLE}>
              <span className="meta tiph" data-rank={metric === "score" ? "" : undefined}>
                Standing
                {metric === "score" && <RankMark />}
              </span>
            </Tip>
            <Tip label={LINE_COPY.STATE_TIP} align="end">
              <span className="meta tiph">State</span>
            </Tip>
            <span className="meta air-h" title={LINE_COPY.AIRDROP_TITLE}>
              Airdrop
            </span>
          </span>
        ) : (
          <Tip label={LINE_COPY.AFTER_GRAD_TIP}>
            <span className="meta tiph">After graduation</span>
          </Tip>
        )}
      </span>
      <span className="lc c-buy" />
    </div>
  );
}

/** Down for largest first, up for the one tab that ranks smallest
 *  first (New: youngest). A mark, not a control: nothing here sorts. */
function RankMark({ up = false }: { up?: boolean }) {
  return (
    <span className="rk" aria-hidden>
      {up ? "▴" : "▾"}
    </span>
  );
}
