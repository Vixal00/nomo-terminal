"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { CoinAvatar, cx } from "@/components/ui";
import { FlatCurveBar, Tip } from "@/components/trending";
import { LABELS, RANK_RULE } from "@/lib/labels";
import { HEAT_EDGES, heatBand, type TrendingRow, type Window } from "@/lib/trending";
import { signOf, useLiveCell, useLiveValue, useMarketSim, useSinceLaunch } from "@/lib/trending-live";
import * as fmt from "@/lib/format";
import { AREA, EMPTY, HEAT_TITLE, NOT_DRAWN_LINE, NO_BAR, REST_TITLE, SHARE_OF, STAMP_TITLE, STARRED_EMPTY } from "./copy";
import {
  REST_LINE,
  REST_PAD,
  REST_TIGHT,
  fitTile,
  layoutMap,
  lHasStage,
  namesFit,
  restIndexFit,
  type Item,
  type Level,
  type Rect,
  type RestRect,
} from "./squarify";

export type FloorTab = "trending" | "top" | "starred";

/** The moment the drawn areas are from. The map and the list both read
 *  this, never the order hook directly, so list order, tile areas and
 *  the stamp are always one snapshot. */
export type Snap = {
  key: string;
  tickers: string[];
  values: Record<string, number | null>;
  rankedAt: number | null;
  /** The order hook's rankedAt this snapshot last looked at. */
  seen: number | null;
  /** The shown coins' share of the whole roster's total of the same
   *  figure, in percent, for the "these coins take x%" sentence. Both
   *  sides are read from the whole-roster order at one moment (see
   *  snapOf), so a subset can never take more than all of it. */
  rosterShare: number | null;
};

export type HoverFn = (ticker: string | null, pointerType: string) => void;

export function stampText(at: number | null): string | null {
  return at === null ? null : new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

/** A coin's curve as a whole percent, re-rendering only when that
 *  whole percent changes, so the bar and the printed percent beside it
 *  never disagree. Only unmigrated Fortress curves ever move. */
export function useCurve(row: TrendingRow, w: Window): number {
  const sim = useMarketSim();
  return useSyncExternalStore(
    sim.subscribe,
    () => Math.round(sim.value(row.ticker, w, "curve") ?? row.curve),
    () => Math.round(row.curve),
  );
}

const pct0 = (v: number | null) => fmt.share(v, 0);

/** A share of the drawn total, in percent. LOCAL: candidate for
 *  foundation. fmt.share prints a real but tiny share (T's one trade in
 *  a 24h window) as "0.0%", which reads as none at all; like fmt.usd's
 *  "<$0.01", a share that rounds to nothing prints as a bound. */
export function shareText(pct: number | null): string {
  if (pct !== null && pct > 0 && Number(pct.toFixed(1)) === 0) return "<0.1%";
  return fmt.share(pct);
}

/** Why a curve reads the way it does: T's is its snapshot, a Fortress
 *  curve follows market cap, anything else is the roster's figure. */
export function curveTitle(row: TrendingRow): string {
  return row.real ? LABELS.REAL_TITLE : row.curveTrusted ? LABELS.CURVE_FORTRESS : LABELS.CURVE_CAVEAT;
}

/* ================================================================ Map */

export function MapPane({
  snap,
  tab,
  w,
  art,
  pinned,
  hover,
  matches,
  narrowed,
  frozen,
  pending,
  empty,
  onHover,
  onPin,
  onRest,
  paneHandlers,
}: {
  snap: Snap;
  tab: FloorTab;
  w: Window;
  art: Record<string, string>;
  pinned: string | null;
  hover: string | null;
  /** The Find matches, or null when Find is off or matched nothing. */
  matches: ReadonlySet<string> | null;
  narrowed: string | null;
  frozen: boolean;
  pending: number;
  empty: {
    starredNone: boolean;
    filters: number;
    hidden: number;
    onClear: () => void;
    onTrending: () => void;
  };
  onHover: HoverFn;
  onPin: (t: string) => void;
  onRest: (tickers: string[]) => void;
  paneHandlers: {
    onPointerEnter: PointerEventHandler;
    onPointerLeave: PointerEventHandler;
    onFocus: FocusEventHandler;
    onBlur: FocusEventHandler;
  };
}) {
  const sim = useMarketSim();
  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const [maxStep, setMaxStep] = useState(80);

  // Measured once per size change, never per tile: the layout is pure
  // arithmetic on this box.
  useEffect(() => {
    const el = mapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      setSize((s) => (s && s.W === W && s.H === H ? s : { W, H }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The largest ticker size by viewport. Client only, and tiles are
  // client only anyway (they wait for the measure).
  useEffect(() => {
    const wide = matchMedia("(min-width: 1280px)");
    const mid = matchMedia("(min-width: 768px)");
    const update = () => setMaxStep(wide.matches ? 80 : mid.matches ? 56 : 40);
    update();
    wide.addEventListener("change", update);
    mid.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      mid.removeEventListener("change", update);
    };
  }, []);

  const { items, notDrawn, total, rankOf } = useMemo(() => {
    const items: Item[] = [];
    const notDrawn: { t: string; isNull: boolean }[] = [];
    const rankOf: Record<string, number> = {};
    snap.tickers.forEach((t, i) => {
      rankOf[t] = i + 1;
      const v = snap.values[t];
      if (v !== null && v !== undefined && v > 0) items.push({ key: t, v });
      else notDrawn.push({ t, isNull: v === null || v === undefined });
    });
    // Rank order is descending in the figure already; sorting again only
    // guards the layout's assumption.
    items.sort((a, b) => b.v - a.v);
    return {
      items,
      notDrawn,
      total: items.reduce((a, b) => a + b.v, 0),
      rankOf,
    };
  }, [snap]);

  const layout = useMemo(() => (size && size.W > 0 && size.H > 0 ? layoutMap(items, size.W, size.H, namesFit) : null), [items, size]);

  // Each tile's level and ticker size, walked in rank order with every
  // size clamped to the one ranked above it, so type never grows as
  // rank falls. The fit alone can't promise that: a squat tile for #3
  // and a square one for #4 would set #4 larger.
  const fits = useMemo(() => {
    const out: Record<string, { level: Level; step: number }> = {};
    if (!layout) return out;
    let prev = Infinity;
    for (const r of [...layout.tiles].sort((a, b) => rankOf[a.key] - rankOf[b.key])) {
      const f = fitTile(r.key, r.w, r.h, (snap.values[r.key] ?? 0) / total, maxStep);
      if (f.level !== "S") {
        f.step = Math.min(f.step, prev);
        prev = f.step;
      }
      out[r.key] = f;
    }
    return out;
  }, [layout, rankOf, snap.values, total, maxStep]);

  const stamp = stampText(snap.rankedAt);
  const pinnedFolded = !!pinned && !!layout?.rest?.tickers.includes(pinned);
  // Roving tab stop: the pinned tile, else the top of the map.
  const tabStop = pinned && layout?.tiles.some((r) => r.key === pinned) ? pinned : (layout?.tiles[0]?.key ?? null);
  const drawn = items.length > 0;

  let body: ReactNode = null;
  if (!snap.tickers.length) {
    body = empty.starredNone ? (
      <Empty
        head={EMPTY.starredHead}
        line={STARRED_EMPTY}
        action={
          <button type="button" onClick={empty.onTrending} className="meta fl-emptybtn">
            Go to Trending
          </button>
        }
      />
    ) : (
      <Empty
        head={EMPTY.noMatchHead}
        line={
          <>
            Filters {empty.filters > 0 ? <span className="num">{empty.filters}</span> : null}
            {empty.hidden > 0 ? ` · ${EMPTY.hiddenNote(empty.hidden)}` : null}
          </>
        }
        action={
          <button type="button" onClick={empty.onClear} className="meta fl-emptybtn">
            Clear filters
          </button>
        }
      />
    );
  } else if (!items.length) {
    body = (
      <Empty
        head={EMPTY.nothingHead}
        line={EMPTY.nothing(
          w,
          notDrawn.every((n) => n.isNull),
        )}
      />
    );
  } else if (layout) {
    body = (
      <>
        {layout.tiles.map((rect) => {
          const row = sim.row(rect.key)!;
          const share = (snap.values[rect.key] ?? 0) / total;
          const { level, step } = fits[rect.key];
          return (
            <Tile
              key={rect.key}
              row={row}
              rect={rect}
              level={level}
              step={step}
              rank={rankOf[rect.key]}
              share={share}
              w={w}
              tab={tab}
              pinned={pinned === rect.key}
              hovered={hover === rect.key}
              dim={!!matches && !matches.has(rect.key)}
              tabbable={tabStop === rect.key}
              stamp={stamp}
              src={art[rect.key]}
              onHover={onHover}
              onPin={onPin}
            />
          );
        })}
        {layout.rest && layout.rest.h >= 1 && (
          <RestTile
            rest={layout.rest}
            tab={tab}
            w={w}
            share={layout.rest.sum / total}
            pinned={pinnedFolded}
            matches={matches}
            onRest={onRest}
          />
        )}
      </>
    );
  }

  const W = w.toUpperCase();
  return (
    <div className="fl-mappane" {...paneHandlers}>
      <div className="fl-caption">
        <p className="fl-rule">
          {RANK_RULE[tab](w)} {drawn && AREA[tab](items.length)}
          {narrowed && <> {narrowed}</>}
        </p>
        {/* Nothing drawn, nothing to date: a stamp over an empty map
            says sizes were taken of nothing. The line keeps its height,
            so the map doesn't move when the first coin arrives. The
            not-drawn count sits at its right: it changes only with a new
            drawing, as the stamp does, and in the legend it pushed the
            legend onto a second line at 1440. */}
        <div className="fl-stampline">
          <span className="meta fl-stamp">
            {!drawn ? null : frozen ? (
              <span title={LABELS.HELD_TITLE}>{LABELS.HELD(pending)}</span>
            ) : stamp ? (
              <span title={STAMP_TITLE}>
                SIZES AT <span className="num">{stamp}</span>
              </span>
            ) : null}
          </span>
          {notDrawn.length > 0 && (
            <Tip
              side="bottom"
              align="end"
              className="fl-lg-nd"
              label={
                <span className="block">
                  {notDrawn.map((n) => (
                    <span key={n.t} className="block">
                      {NOT_DRAWN_LINE(n.t, w, n.isNull)}
                    </span>
                  ))}
                </span>
              }
            >
              <span className="meta cursor-help underline decoration-dotted underline-offset-2">
                NOT DRAWN · <span className="num">{notDrawn.length}</span>
              </span>
            </Tip>
          )}
        </div>
      </div>
      <div ref={mapRef} className="fl-map" role="group" aria-label={`Map: ${RANK_RULE[tab](w)}`}>
        {body}
      </div>
      {drawn && (
        <div className="fl-legend">
          <span className="fl-lg-heat" title={HEAT_TITLE}>
            <span className="meta">TINT · CHANGE {W}</span>
            <HeatScale />
          </span>
          <span className="fl-lg-item" title={LABELS.CHANGE_NULL_TITLE}>
            <span aria-hidden className="fl-sw door-art" />
            <span className="meta">NO FIGURE</span>
          </span>
          <span className="fl-lg-item meta" title={NO_BAR}>
            NO BAR = MIGRATED
          </span>
          <span className="fl-lg-item fl-lg-curve meta" title={LABELS.CURVE_CAVEAT}>
            HATCHED BAR: ROSTER CURVE
          </span>
        </div>
      )}
    </div>
  );
}

function Empty({ head, line, action }: { head: string; line: ReactNode; action?: ReactNode }) {
  return (
    <div className="fl-empty">
      <p className="meta">{head}</p>
      <p className="mt-1.5 text-[12px] text-muted">{line}</p>
      {action}
    </div>
  );
}

/** The nine swatches, labelled from HEAT_EDGES so the legend can't
 *  disagree with the bands. */
function HeatScale() {
  const E = HEAT_EDGES;
  const neg = [`≥${E[3]}`, `${E[2]}`, `${E[1]}`, `${E[0]}`];
  const pos = [`${E[0]}`, `${E[1]}`, `${E[2]}`, `≥${E[3]}`];
  return (
    <span className="fl-scale">
      {neg.map((l, i) => (
        <span key={`n${i}`} className="fl-sc">
          <span aria-hidden className="fl-sw" data-sign="neg" data-band={String(4 - i)} />
          <span className="num">{l}</span>
        </span>
      ))}
      <span className="fl-sc">
        <span aria-hidden className="fl-sw" data-sign="zero" data-band="0" />
        <span className="num">{`<${E[0]}`}</span>
      </span>
      {pos.map((l, i) => (
        <span key={`p${i}`} className="fl-sc">
          <span aria-hidden className="fl-sw" data-sign="pos" data-band={String(i + 1)} />
          <span className="num">{l}</span>
        </span>
      ))}
      <span className="num">%</span>
    </span>
  );
}

/* =============================================================== Tile */

type TileProps = {
  row: TrendingRow;
  rect: Rect;
  level: Level;
  step: number;
  rank: number;
  share: number;
  w: Window;
  tab: FloorTab;
  pinned: boolean;
  hovered: boolean;
  dim: boolean;
  tabbable: boolean;
  stamp: string | null;
  src?: string;
  onHover: HoverFn;
  onPin: (t: string) => void;
};

const shareOf = SHARE_OF;

const Tile = memo(function Tile({
  row,
  rect,
  level,
  step,
  rank,
  share,
  w,
  tab,
  pinned,
  hovered,
  dim,
  tabbable,
  stamp,
  src,
  onHover,
  onPin,
}: TileProps) {
  const t = row.ticker;
  // The tint is its own layer so the change cell's data attributes stay
  // the cell's own (useLiveCell rewrites them on every commit). Written
  // only when they differ: a same-value write still invalidates style
  // for every [data-band][data-sign] rule, on every tile, every commit.
  const tint = useLiveValue<HTMLSpanElement>(t, w, "change", (el, v) => {
    const band = String(heatBand(v));
    const sign = signOf(v, fmt.pct(v));
    if (el.dataset.band !== band) el.dataset.band = band;
    if (el.dataset.sign !== sign) el.dataset.sign = sign;
    el.classList.toggle("door-art", v === null || row.real);
  });
  // No flash on the map. The tint is the signal there, and a flash
  // colours the direction a figure moved, not its sign: a loss that
  // shrank flashed teal over a red figure, on most tiles at once, over
  // the tint it was meant to sit on. The list and the inspector keep
  // theirs, where one figure sits beside its label.
  const ch = useLiveCell(t, w, "change", fmt.pct, { flash: false });
  const since = useSinceLaunch(t, w);
  const band = heatBand(tint.value);
  const stage = level === "XL" || (level === "L" && lHasStage(rect.h, step));
  const pctText = shareText(share * 100);
  const title = `$${t} · #${rank} · ${pctText} ${shareOf(tab, w)}${stamp ? ` · sizes at ${stamp}` : ""}${
    row.real ? `. ${LABELS.REAL_TITLE}` : ""
  }`;
  const chTitle =
    ch.sign === "null"
      ? row.real
        ? LABELS.NOT_INDEXED
        : LABELS.CHANGE_NULL_TITLE
      : since && level !== "XL"
        ? LABELS.SINCE_LAUNCH_TITLE
        : undefined;

  return (
    <button
      type="button"
      className="fl-tile"
      data-tk={t}
      data-level={level}
      data-pinned={pinned}
      data-hover={hovered}
      data-dim={dim}
      aria-pressed={pinned}
      tabIndex={tabbable ? 0 : -1}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      title={title}
      onPointerEnter={(e) => onHover(t, e.pointerType)}
      onPointerLeave={(e) => onHover(null, e.pointerType)}
      onClick={() => onPin(t)}
    >
      <span
        aria-hidden
        ref={tint.ref}
        className={cx("fl-tint", (band === null || row.real) && "door-art")}
        data-band={String(band)}
        data-sign={signOf(tint.value, fmt.pct(tint.value))}
      />
      {level !== "S" && (
        <>
          <span aria-hidden className="fl-tk" style={{ fontSize: step }}>
            {t}
          </span>
          <span aria-hidden className={cx("num fl-ch", since && level !== "XL" && "fl-since-u")} title={chTitle}>
            <span ref={ch.ref} {...ch.data}>
              {ch.text}
            </span>
            {level === "XL" && since && (
              <span className="meta fl-since" title={LABELS.SINCE_LAUNCH_TITLE}>
                {LABELS.SINCE_LAUNCH}
              </span>
            )}
          </span>
          {(level === "XL" || level === "L") && <TileCount row={row} w={w} tab={tab} level={level} />}
          {!row.migrated && (stage ? <CurveStage row={row} w={w} flash={false} /> : <MiniCurve row={row} w={w} width={rect.w} />)}
          {level === "XL" && (
            <span aria-hidden className="fl-av">
              <CoinAvatar ticker={t} src={src} size={20} />
            </span>
          )}
        </>
      )}
      <span className="sr-only">
        {`$${t}, rank ${rank}, ${pctText} ${shareOf(tab, w)} at the last layout, ${row.migrated ? "migrated" : "on the curve"}`}
      </span>
    </button>
  );
});

/** The ranked figure first: trades on Trending and Starred, market cap
 *  on Top. XL adds the other one after it. */
function TileCount({ row, w, tab, level }: { row: TrendingRow; w: Window; tab: FloorTab; level: Level }) {
  const mcFmt = useMemo(() => fmt.usdLike(row.mcLabel), [row.mcLabel]);
  const tx = useLiveCell(row.ticker, w, "txns", fmt.count, { flash: false });
  const mc = useLiveCell(row.ticker, w, "mc", mcFmt, {
    split: true,
    flash: false,
  });
  const trades = (
    <>
      <span ref={tx.ref} {...tx.data}>
        {tx.text}
      </span>{" "}
      trades
    </>
  );
  const cap = (
    <span ref={mc.ref} {...mc.data}>
      <span>{mc.head}</span>
      <span data-part="unit">{mc.tail}</span>
    </span>
  );
  const first = tab === "top" ? cap : trades;
  const second = tab === "top" ? trades : cap;
  return (
    <span aria-hidden className="num fl-ct">
      {first}
      {level === "XL" && <> · {second}</>}
    </span>
  );
}

/* The stage row marks the exception, not the norm. On Trending most
   named tiles are migrated, and a "MIGRATED" tag on each was the same
   word eleven times over, alone at the foot of mostly empty tiles,
   with the one coin still on its curve lost among them. So a migrated
   tile carries nothing, and every unmigrated tile carries a bar: the
   full stage row (bar and percent) where there is room, a bare bar in
   the tile's bottom padding where there isn't. That is what lets the
   legend say "no bar = migrated" of every named tile. */

/** The bar alone, for a tile with no room for the stage row. It sits in
 *  the tile's bottom padding, below everything the level fits. */
function MiniCurve({ row, w, width }: { row: TrendingRow; w: Window; width: number }) {
  const curve = useCurve(row, w);
  return (
    <span aria-hidden className="fl-minibar" title={curveTitle(row)} style={{ width: Math.min(64, width - 16) }}>
      <FlatCurveBar curve={curve} migrated={false} tier={row.tier} trusted={row.curveTrusted} untrusted="hatch" height={3} />
    </span>
  );
}

export function CurveStage({ row, w, barWidth = 64, flash }: { row: TrendingRow; w: Window; barWidth?: number; flash?: boolean }) {
  const curve = useCurve(row, w);
  const c = useLiveCell(row.ticker, w, "curve", pct0, { flash });
  return (
    <span aria-hidden className="fl-stage" title={curveTitle(row)}>
      <span className="fl-bar" style={{ width: barWidth }}>
        <FlatCurveBar curve={curve} migrated={false} tier={row.tier} trusted={row.curveTrusted} untrusted="hatch" height={3} />
      </span>
      <span className={cx("num fl-cv", !row.curveTrusted && "text-dim")}>
        <span ref={c.ref} {...c.data}>
          {c.text}
        </span>
      </span>
    </span>
  );
}

/* ========================================================== Rest tile */

/** The fold: every coin too small to name, as one strip across the
 *  bottom of the map with their combined area. It is an index of what
 *  was folded, in rank order, cut off with "and n more" where the strip
 *  runs out. Its own tab stop: it is a separate control, not one of the
 *  tiles the arrow keys and J/K move through. */
function RestTile({
  rest,
  tab,
  w,
  share,
  pinned,
  matches,
  onRest,
}: {
  rest: RestRect;
  tab: FloorTab;
  w: Window;
  share: number;
  pinned: boolean;
  matches: ReadonlySet<string> | null;
  onRest: (tickers: string[]) => void;
}) {
  const n = rest.tickers.length;
  const pctText = shareText(share * 100);
  const of = shareOf(tab, w);
  const head = `+${n} ${n === 1 ? "coin" : "coins"}`;
  const shareLine = `${pctText} ${of}`;
  const matchCount = matches ? rest.tickers.filter((t) => matches.has(t)).length : 0;
  const matchLine = matchCount > 0 ? `${matchCount} ${matchCount === 1 ? "match" : "matches"}` : null;
  // Tall enough for its padding and a line, the strip wraps as one
  // paragraph; thinner than that it carries one unpadded line, centred,
  // counted as a single line by the same arithmetic.
  const oneLine = REST_LINE + REST_PAD;
  const tight = rest.h < oneLine && rest.h >= REST_TIGHT;
  const showHead = rest.h >= oneLine || tight;
  const k = showHead
    ? restIndexFit(
        rest.tickers,
        [
          { chars: head.length, kind: "meta" },
          { chars: shareLine.length, kind: "num" },
          ...(matchLine ? [{ chars: matchLine.length, kind: "meta" as const }] : []),
        ],
        rest.w,
        tight ? oneLine : rest.h,
      )
    : 0;
  return (
    <button
      type="button"
      className="fl-tile fl-rest"
      data-pinned={pinned}
      data-tight={tight || undefined}
      style={{ left: rest.x, top: rest.y, width: rest.w, height: rest.h }}
      title={REST_TITLE(rest.tickers)}
      onClick={() => onRest(rest.tickers)}
    >
      {showHead && (
        <span aria-hidden className="fl-rest-p">
          {/* The spaces between the parts are the paragraph's break
              points; without them the first ticker was glued to the
              share line and ran out of the strip at 320. */}
          <span className="meta fl-rest-n">{head}</span>{" "}
          <span className="num fl-rest-s">{shareLine}</span>{" "}
          {matchLine && (
            <>
              <span className="meta fl-rest-m">{matchLine}</span>{" "}
            </>
          )}
          {rest.tickers.slice(0, k).map((t) => (
            <span key={t} className={cx("num fl-rest-t", matches?.has(t) && "is-match")}>
              {t}{" "}
            </span>
          ))}
          {k > 0 && k < n && <span className="num fl-rest-more">and {n - k} more</span>}
        </span>
      )}
      <span className="sr-only">{`${n} more ${n === 1 ? "coin" : "coins"}, ${pctText} ${of}. Show them in the list.`}</span>
    </button>
  );
}
