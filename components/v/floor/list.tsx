"use client";

import { memo, useMemo, type FocusEventHandler, type PointerEventHandler, type RefObject } from "react";
import { CoinAvatar, cx } from "@/components/ui";
import { StarMark } from "@/components/marks";
import { LABELS, RANK_HEADLINE, RANK_RULE } from "@/lib/labels";
import type { TrendingRow, Window } from "@/lib/trending";
import { useLiveCell, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { EMPTY, STARRED_EMPTY } from "./copy";
import type { FloorTab, HoverFn } from "./map";

/* Each figure cell carries its label for a screen reader. The visible
   header is a row of labels, not a header a reader can walk, so without
   these a row read as "1 BULLP 1,665 −6.7% $1.82M": numbers with no
   names and no window. */
function Sr({ children }: { children: string }) {
  return <span className="sr-only">{children}</span>;
}

/* The full ranked list, in the snapshot's order, so a coin's row and
   its tile always agree on rank. Sorted by the tab's rule only: the
   headers are labels, not sort buttons, so there is no curve sort to
   switch off. */
export function RankList({
  tickers,
  tab,
  w,
  art,
  pinned,
  hover,
  matches,
  stars,
  inRest,
  scrollRef,
  narrowed,
  empty,
  onHover,
  onPin,
  wrapHandlers,
}: {
  tickers: readonly string[];
  tab: FloorTab;
  w: Window;
  art: Record<string, string>;
  pinned: string | null;
  hover: string | null;
  matches: ReadonlySet<string> | null;
  stars: readonly string[];
  inRest: ReadonlySet<string> | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  narrowed: string | null;
  empty: { starredNone: boolean; w: Window; onTrending: () => void };
  onHover: HoverFn;
  onPin: (t: string) => void;
  wrapHandlers: {
    onPointerEnter: PointerEventHandler;
    onPointerLeave: PointerEventHandler;
    onFocus: FocusEventHandler;
    onBlur: FocusEventHandler;
  };
}) {
  const sim = useMarketSim();
  const starSet = useMemo(() => new Set(stars), [stars]);
  const W = w.toUpperCase();
  const ranked = tab === "top" ? "MCAP" : `TRADES ${W}`;
  const other = tab === "top" ? `TRADES ${W}` : "MCAP";
  const tabStop = pinned && tickers.includes(pinned) ? pinned : tickers[0];

  return (
    <div className="fl-listwrap" {...wrapHandlers}>
      {/* The rule, wherever the ranking is. From 1024 the map's caption
          beside the list carries it; below, the list is shown alone and
          has to say what it is ranked by itself. */}
      <p className="fl-lrule">
        {RANK_RULE[tab](w)}
        {narrowed && <> {narrowed}</>}
      </p>
      {/* no-anchor: on a phone the list is the page, and when a re-rank
          moved the row the browser had anchored to, it scrolled the page
          after it, under a reader who had touched nothing. */}
      <div ref={scrollRef} className="fl-list no-anchor" data-tab={tab === "top" ? "top" : "trades"}>
        <div className="fl-lh" aria-hidden>
          <span className="meta fl-c-r">#</span>
          <span className="meta">COIN</span>
          <span className="meta fl-c-r">{ranked}</span>
          <span className="meta fl-c-r">Δ {W}</span>
          <span className="meta fl-c-r">{other}</span>
          <span className="fl-c-r fl-starcol text-dim">
            <StarMark className="ml-auto h-2.5 w-2.5" />
          </span>
        </div>
        {tickers.length ? (
          <ol aria-label={`Coins, ${RANK_HEADLINE[tab](w)}`}>
            {tickers.map((t, i) => (
              <li key={t}>
                <ListRow
                  row={sim.row(t)!}
                  rank={i + 1}
                  tab={tab}
                  w={w}
                  src={art[t]}
                  pinned={pinned === t}
                  hovered={hover === t}
                  dim={!!matches && !matches.has(t)}
                  starred={starSet.has(t)}
                  inRest={!!inRest?.has(t)}
                  tabbable={tabStop === t}
                  onHover={onHover}
                  onPin={onPin}
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="fl-lempty">
            <p className="meta">{empty.starredNone ? EMPTY.starredHead : EMPTY.noMatchHead}</p>
            {/* From 1024 the map beside the list says the rest; below, the
                list stands alone and says it once. */}
            <p className="fl-lempty-more text-muted">{empty.starredNone ? STARRED_EMPTY : "Clear filters or Show to see coins."}</p>
            {empty.starredNone && (
              <button type="button" onClick={empty.onTrending} className="meta fl-emptybtn fl-lempty-more">
                Go to Trending
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ListRow = memo(function ListRow({
  row,
  rank,
  tab,
  w,
  src,
  pinned,
  hovered,
  dim,
  starred,
  inRest,
  tabbable,
  onHover,
  onPin,
}: {
  row: TrendingRow;
  rank: number;
  tab: FloorTab;
  w: Window;
  src?: string;
  pinned: boolean;
  hovered: boolean;
  dim: boolean;
  starred: boolean;
  inRest: boolean;
  tabbable: boolean;
  onHover: HoverFn;
  onPin: (t: string) => void;
}) {
  const t = row.ticker;
  const mcFmt = useMemo(() => fmt.usdLike(row.mcLabel), [row.mcLabel]);
  const tx = useLiveCell(t, w, "txns", fmt.count);
  const mc = useLiveCell(t, w, "mc", mcFmt, { split: true });
  const ch = useLiveCell(t, w, "change", fmt.pct);
  const since = useSinceLaunch(t, w);
  const nullTitle = row.real ? LABELS.NOT_INDEXED : LABELS.NULL_TITLE;

  const trades = (
    <span className="num fl-c-r" title={tx.sign === "null" ? nullTitle : undefined}>
      <Sr>{`, trades ${w}: `}</Sr>
      <span ref={tx.ref} {...tx.data}>
        {tx.text}
      </span>
    </span>
  );
  const cap = (
    <span className="num fl-c-r" title={mc.sign === "null" ? nullTitle : undefined}>
      <Sr>, market cap: </Sr>
      <span ref={mc.ref} {...mc.data}>
        <span>{mc.head}</span>
        <span data-part="unit">{mc.tail}</span>
      </span>
    </span>
  );

  return (
    <button
      type="button"
      className="fl-row"
      data-tk={t}
      data-pinned={pinned}
      data-hover={hovered}
      data-dim={dim}
      data-inrest={inRest}
      aria-pressed={pinned}
      tabIndex={tabbable ? 0 : -1}
      onPointerEnter={(e) => onHover(t, e.pointerType)}
      onPointerLeave={(e) => onHover(null, e.pointerType)}
      onClick={() => onPin(t)}
    >
      <span className="num fl-c-r fl-rank">
        <Sr>Rank </Sr>
        {rank}
      </span>
      <span className="fl-coin">
        <CoinAvatar ticker={t} src={src} size={18} />
        <span className="num fl-ltk" title={row.real ? LABELS.REAL_TITLE : undefined}>
          <Sr>, $</Sr>
          {t}
        </span>
        {/* Below 768 the star column goes, so the coin keeps room for
            seven characters; a starred row marks it here instead. */}
        {starred && <StarMark className="fl-star-in h-2.5 w-2.5 flex-none text-muted" />}
        {starred && <Sr>, starred</Sr>}
      </span>
      {tab === "top" ? cap : trades}
      <span
        className={cx("num fl-c-r fl-d", since && "fl-since-u")}
        title={ch.sign === "null" ? (row.real ? LABELS.NOT_INDEXED : LABELS.CHANGE_NULL_TITLE) : since ? LABELS.SINCE_LAUNCH_TITLE : undefined}
      >
        <Sr>{`, change ${w}: `}</Sr>
        <span ref={ch.ref} {...ch.data}>
          {ch.text}
        </span>
      </span>
      {tab === "top" ? trades : cap}
      <span aria-hidden className="fl-c-r fl-starcol text-muted">
        {starred ? <StarMark className="ml-auto h-2.5 w-2.5" /> : null}
      </span>
    </button>
  );
});
