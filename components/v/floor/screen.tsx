"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cx } from "@/components/ui";
import { AnsemCrest, ChevronMark } from "@/components/marks";
import { useChain } from "@/components/chain";
import {
  ChainSwitch,
  Disclosure,
  ReconCountdown,
  SimToggle,
  SpotCells,
  UnderlineTab,
  VersionMenu,
  WindowSwitch,
  amountText,
  usePlaceholderBuy,
  useHotkeys,
  useQuickBuy,
  useToast,
} from "@/components/trending";
import { LABELS, RANK_HEADLINE } from "@/lib/labels";
import {
  EMPTY_FILTER,
  WINDOWS,
  activeFilterCount,
  applyFilter,
  type FilterDraft,
  type Stage,
  type Tab,
  type TrendingFilter,
  type Window,
} from "@/lib/trending";
import { useBoardInView, useLiveOrder, useMarketSim } from "@/lib/trending-live";
import type { Tier } from "@/lib/data";
import * as fmt from "@/lib/format";
import { HIDDEN, NARROWED, NOTHING_PINNED, NOTHING_TO_PIN } from "./copy";
import { useStoredList } from "./stored";
import { MapPane, shareText, stampText, type FloorTab, type HoverFn, type Snap } from "./map";
import { Inspector, type InspectState, type QuickSize } from "./inspector";
import { RankList } from "./list";
import { FilterPopover, type FilterErrors } from "./filters";
import { KeySheet } from "./keysheet";

/* New and Z500 are left out on purpose: an area in age, or in a score
   that most seats don't have (unscored seats print no numeral), would
   be a picture of nothing. */
const FLOOR_TABS = ["trending", "top", "starred"] as const satisfies readonly Tab[];
const TAB_LABEL: Record<FloorTab, string> = { trending: "Trending", top: "Top", starred: "Starred" };
const SHOW: readonly { stage: Stage; label: string; key: string }[] = [
  { stage: "all", label: "All", key: "A" },
  { stage: "migrated", label: "Migrated", key: "G" },
  { stage: "curve", label: "On curve", key: "C" },
];

/** Relayout gate: a coin's share has to move this much, relative, for
 *  the map to be redrawn when neither the order nor the set changed.
 *  Below it the old rects stand, and so does the stamp that dates
 *  them. */
const SHARE_MOVE = 0.12;
const REORDER_MS = 8000;

type Limits = { mcMin?: number | null; mcMax?: number | null; liqMin?: number | null; tiers?: readonly Tier[] };
type Echo = { mcMin: string; mcMax: string; liqMin: string };
type Order = { tickers: string[]; values: Record<string, number | null>; rankedAt: number | null };

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function positiveSum(values: Record<string, number | null>, keys?: readonly string[]): number {
  let s = 0;
  for (const k of keys ?? Object.keys(values)) {
    const v = values[k];
    if (v !== null && v !== undefined && v > 0) s += v;
  }
  return s;
}

/** The drawing's snapshot. The roster share takes both of its sides
 *  from the whole-roster order, one moment: the shown coins' figures
 *  there over the roster's total there. Taking the numerator from the
 *  fresh order instead (a filter change recomputes it at once) and the
 *  denominator from the roster's last re-rank, up to 8s older, printed
 *  "these 78 of 78 coins take 100.3%". */
function snapOf(key: string, order: Order, all: Order): Snap {
  const allSum = positiveSum(all.values);
  return {
    key,
    tickers: order.tickers,
    values: order.values,
    rankedAt: order.rankedAt,
    seen: order.rankedAt,
    rosterShare: allSum > 0 ? (positiveSum(all.values, order.tickers) / allSum) * 100 : null,
  };
}

/** Whether a fresh order is worth a new drawing. Always when the
 *  reader changed something (the key), the order or the set moved, or
 *  there is no stamp yet; otherwise only when some coin's share of the
 *  drawn total moved more than SHARE_MOVE of itself. */
function relayout(snap: Snap, order: Order, key: string): boolean {
  if (key !== snap.key || snap.rankedAt === null) return true;
  if (order.tickers.length !== snap.tickers.length) return true;
  for (let i = 0; i < order.tickers.length; i++) if (order.tickers[i] !== snap.tickers[i]) return true;
  const a = positiveSum(snap.values);
  const b = positiveSum(order.values);
  for (const t of snap.tickers) {
    const va = snap.values[t];
    const vb = order.values[t];
    const sa = va && va > 0 && a > 0 ? va / a : 0;
    const sb = vb && vb > 0 && b > 0 ? vb / b : 0;
    if (sa === 0 && sb === 0) continue;
    if (sa === 0 || sb === 0) return true;
    if (Math.abs(sb - sa) / sa > SHARE_MOVE) return true;
  }
  return false;
}

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const toast = useToast();
  const placeholderBuy = usePlaceholderBuy();
  const [chain] = useChain();

  const [tab, setTab] = useState<FloorTab>("trending");
  const [w, setW] = useState<Window>("5m");
  const [stage, setStage] = useState<Stage>("all");
  const [limits, setLimits] = useState<Limits>({});
  const [echo, setEcho] = useState<Echo>({ mcMin: "", mcMax: "", liqMin: "" });
  const [hidden, setHidden] = useStoredList("ansem.terminal.blacklist");
  const [stars, setStars] = useStoredList("ansem.terminal.stars");
  const [q, setQ] = useState("");
  const [pinned, setPinned] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // Map by default on a phone too: the map is what makes this version,
  // and with the fold along the bottom it opens on #1, top left. A
  // stored choice of List still wins (read after mount).
  const [view, setView] = useState<"list" | "map">("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersLeft, setFiltersLeft] = useState<number | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [rest, setRest] = useState<{ key: string; set: ReadonlySet<string> } | null>(null);

  const [amount1, setAmount1, presets1, unit1] = useQuickBuy(1);
  const [amount2, setAmount2, presets2, unit2] = useQuickBuy(2);
  const qb = useMemo(
    () =>
      [
        { amount: amount1, unit: unit1, chain: 1 },
        { amount: amount2, unit: unit2, chain: 2 },
      ] as const satisfies readonly [QuickSize, QuickSize],
    [amount1, unit1, amount2, unit2],
  );

  const rootRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const filtersBtn = useRef<HTMLButtonElement>(null);
  const keysBtn = useRef<HTMLButtonElement>(null);
  const ctrlWrap = useRef<HTMLDivElement>(null);
  const ctrlScroll = useRef<HTMLDivElement>(null);

  useBoardInView(bodyRef);
  // On a phone the inspector is a fixed sheet outside the board's box,
  // so it registers as its own region.
  useBoardInView(sheetRef);

  // The phone view is a preference: read after mount so the server and
  // the first client render agree on the default.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("ansem.terminal.floor.view");
      if (v === "map" || v === "list") setView(v);
    } catch {
      /* Blocked storage: the map stands. */
    }
  }, []);
  const chooseView = useCallback((v: "list" | "map") => {
    setView(v);
    try {
      window.localStorage.setItem("ansem.terminal.floor.view", v);
    } catch {
      /* Remembered for this page only. */
    }
  }, []);

  /* ------------------------------------------------------- the order */

  const filter = useMemo<TrendingFilter>(() => {
    // Only the limits that are set, in a fixed order: the order hook
    // keys on this object's JSON, so an absent field and a null one
    // must not read as two different filters.
    const f: TrendingFilter = {};
    if (limits.mcMin != null) f.mcMin = limits.mcMin;
    if (limits.mcMax != null) f.mcMax = limits.mcMax;
    if (limits.liqMin != null) f.liqMin = limits.liqMin;
    if (limits.tiers?.length) f.tiers = limits.tiers;
    if (stage !== "all") f.stage = stage;
    if (hidden.length) f.blacklist = hidden;
    return f;
  }, [limits, stage, hidden]);

  const starredOpt = tab === "starred" ? stars : undefined;
  const order = useLiveOrder(tab, w, filter, { values: true, reorderMs: REORDER_MS, starred: starredOpt });
  // The whole roster on the same figure, for "these coins take x%".
  const all = useLiveOrder(tab === "top" ? "top" : "trending", w, EMPTY_FILTER, { values: true, reorderMs: REORDER_MS });

  const key = `${tab}|${w}|${JSON.stringify(filter)}|${(starredOpt ?? []).join(",")}`;
  const [snapState, setSnap] = useState<Snap>(() => snapOf(key, order, all));
  let snap = snapState;
  if (order.rankedAt !== snapState.seen || key !== snapState.key) {
    snap = relayout(snapState, order, key) ? snapOf(key, order, all) : { ...snapState, seen: order.rankedAt };
    setSnap(snap);
  }

  const shown = useMemo(() => new Set(snap.tickers), [snap.tickers]);
  // A pinned coin that leaves the board (hidden, filtered out, another
  // tab) is unpinned, so the buy key never targets a coin not on screen.
  if (pinned && !shown.has(pinned)) setPinned(null);
  const hoverShown = hover && shown.has(hover) ? hover : null;

  const drawnTotal = useMemo(() => positiveSum(snap.values, snap.tickers), [snap]);
  const inRest = rest && rest.key === key ? rest.set : null;

  /* ------------------------------------------------ freeze under hand */

  const inside = useRef({ pm: false, pl: false, fm: false, fl: false });
  const [boardIn, setBoardIn] = useState(false);
  const mark = useCallback((k: "pm" | "pl" | "fm" | "fl", v: boolean) => {
    inside.current[k] = v;
    const i = inside.current;
    setBoardIn(i.pm || i.pl || i.fm || i.fl);
  }, []);
  const { setFrozen: freezeOrder } = order;
  const { setFrozen: freezeAll } = all;
  useEffect(() => {
    freezeOrder(boardIn);
    freezeAll(boardIn);
  }, [boardIn, freezeOrder, freezeAll]);

  // Keyboard focus holds the order; a mouse click's focus doesn't, or a
  // pinned tile would hold the map still until the reader clicked
  // somewhere else. The pointer itself is covered by pointerenter.
  const regionHandlers = useCallback(
    (p: "pm" | "pl", f: "fm" | "fl") => ({
      onPointerEnter: () => mark(p, true),
      onPointerLeave: () => mark(p, false),
      onFocus: (e: FocusEvent) => mark(f, (e.target as HTMLElement).matches?.(":focus-visible") ?? false),
      onBlur: (e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) mark(f, false);
      },
    }),
    [mark],
  );
  const mapHandlers = useMemo(() => regionHandlers("pm", "fm"), [regionHandlers]);
  const listHandlers = useMemo(() => regionHandlers("pl", "fl"), [regionHandlers]);

  // Blur alone can't clear the focus flags. When the focused tile or
  // row is removed (H hides it, Show or a filter drops it, a window
  // change folds it), focus falls to <body> and no blur fires, so the
  // order stayed held with nothing on the board. After every render,
  // check that focus is still where the flag says it is.
  useEffect(() => {
    const i = inside.current;
    if (!i.fm && !i.fl) return;
    const a = document.activeElement;
    const root = rootRef.current;
    const within = (sel: string) => !!a && !!root?.querySelector(sel)?.contains(a);
    if (i.fm && !within(".fl-mappane")) mark("fm", false);
    if (i.fl && !within(".fl-listwrap")) mark("fl", false);
  });

  /* ------------------------------------------------------------ find */

  const matchSet = useMemo(() => {
    if (!q.trim()) return null;
    return new Set(applyFilter(sim.rows, { search: q }, w).map((r) => r.ticker));
  }, [q, w, sim]);
  const shownMatches = useMemo(() => (matchSet ? snap.tickers.filter((t) => matchSet.has(t)) : []), [matchSet, snap.tickers]);
  // Zero matches dims nothing: a board gone uniformly grey reads as
  // broken, and the field already says NO MATCH.
  const matches = matchSet && shownMatches.length ? matchSet : null;
  const noMatch = !!matchSet && shownMatches.length === 0;

  /* ------------------------------------------------------ pin & hover */

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHover = useCallback<HoverFn>((t, pointerType) => {
    // Touch has no hover; a tap is a pin.
    if (pointerType !== "mouse") return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHover(t), 60);
  }, []);
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const nav = useRef<{ t: string; focus: boolean; start?: boolean } | null>(null);

  const onPin = useCallback((t: string) => {
    setPinned((p) => (p === t ? null : t));
    setRest(null);
  }, []);

  /** Pin from the keyboard: scroll its row into view, and carry focus
   *  with it if focus was already on the board. */
  const pinTo = useCallback((t: string) => {
    const a = document.activeElement;
    const onBoard = !!a && !!bodyRef.current?.contains(a) && a !== document.body;
    nav.current = { t, focus: onBoard };
    setPinned(t);
    setRest(null);
  }, []);

  const rowEl = (t: string) => listRef.current?.querySelector<HTMLElement>(`.fl-row[data-tk="${CSS.escape(t)}"]`) ?? null;
  const outside = (el: HTMLElement, box: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    return r.top < b.top + 28 || r.bottom > b.bottom;
  };

  useEffect(() => {
    const n = nav.current;
    if (!n) return;
    nav.current = null;
    const row = rowEl(n.t);
    if (n.start) {
      row?.scrollIntoView({ block: "start" });
      return;
    }
    const tile = bodyRef.current?.querySelector<HTMLElement>(`.fl-tile[data-tk="${CSS.escape(n.t)}"]`) ?? null;
    if (n.focus) {
      const target = document.activeElement?.closest(".fl-listwrap") ? row : (tile ?? row);
      target?.focus({ preventScroll: true });
    }
    if (matchMedia("(min-width: 1024px)").matches) {
      const list = listRef.current;
      if (row && list && outside(row, list)) row.scrollIntoView({ block: "nearest" });
      return;
    }
    // Below 1024 the page is the scroller and the sheet covers its
    // bottom, so the pin has to land in the band between the sticky list
    // header (list view) and the sheet's top edge. Keyboard moves only:
    // this effect runs for pinTo, never for a timed re-rank.
    const target = view === "map" ? (tile ?? bodyRef.current?.querySelector<HTMLElement>(".fl-rest") ?? null) : row;
    if (!target) return;
    // The foot's padding for the sheet is written by a ResizeObserver,
    // which reports after this effect; the first pin opens the sheet in
    // this very commit, so write it now or the page is too short to
    // scroll the pin clear.
    if (sheetRef.current) rootRef.current?.style.setProperty("--fl-sheet-h", `${sheetRef.current.offsetHeight}px`);
    const sheet = sheetRef.current?.getBoundingClientRect();
    const top = view === "list" ? 32 : 0;
    const bottom = sheet && sheet.height > 0 ? sheet.top : window.innerHeight - 32;
    const r = target.getBoundingClientRect();
    if (r.bottom > bottom - 8 && r.top > top + 8) window.scrollBy(0, Math.min(r.bottom - bottom + 8, r.top - top - 8));
    else if (r.top < top + 8) window.scrollBy(0, r.top - top - 8);
  });

  // The sheet's height, for the padding that lets the page scroll the
  // last rows and the footer clear of it. Written straight to the root
  // as a variable: it changes with the pinned coin's content, and a
  // React state per resize would re-render the board for a padding.
  useEffect(() => {
    const el = sheetRef.current;
    const root = rootRef.current;
    if (!el || !root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => root.style.setProperty("--fl-sheet-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // After a relayout, keep the pinned row in sight, but only where the
  // list is its own scroller: on a phone the list is the page, and
  // scrolling the page on a timer would move it under the reader.
  useEffect(() => {
    if (!pinned || !matchMedia("(min-width: 1024px)").matches) return;
    const row = rowEl(pinned);
    const list = listRef.current;
    if (row && list && outside(row, list)) row.scrollIntoView({ block: "nearest" });
    // Only on a new drawing, not on every pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.rankedAt, snap.key]);

  const onRest = useCallback(
    (tickers: string[]) => {
      setRest({ key, set: new Set(tickers) });
      // A jump, not a preference: the stored List/Map choice stays.
      if (!matchMedia("(min-width: 1024px)").matches) setView("list");
      // Scrolled by the effect after this render (setRest re-renders).
      nav.current = { t: tickers[0], focus: false, start: true };
    },
    [key],
  );

  /* ------------------------------------------------ one list, per tab */

  const scrollMem = useRef<Partial<Record<FloorTab, number>>>({});
  const changeTab = useCallback(
    (t: FloorTab) => {
      if (listRef.current) scrollMem.current[tab] = listRef.current.scrollTop;
      setTab(t);
    },
    [tab],
  );
  useIsoLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = scrollMem.current[tab] ?? 0;
  }, [tab]);

  /* ------------------------------------------------------------ acts */

  const current = chain === 2 ? qb[1] : qb[0];
  const buy = useCallback(
    (amount: number, unit: "SOL" | "ETH") => {
      if (pinned) placeholderBuy(pinned, amount, unit);
    },
    [pinned, placeholderBuy],
  );
  const nothing = () => toast({ title: snap.tickers.length ? NOTHING_PINNED : NOTHING_TO_PIN, tone: "info" });

  const hide = (t: string) => {
    setHidden([...hidden, `$${t}`]);
    setPinned(null);
    toast({ title: HIDDEN(t), tone: "info" });
  };
  const star = (t: string) => setStars(stars.includes(t) ? stars.filter((s) => s !== t) : [...stars, t]);

  const move = (d: 1 | -1) => {
    const list = snap.tickers;
    if (!list.length) return;
    const i = pinned ? list.indexOf(pinned) : -1;
    pinTo(i < 0 ? list[0] : list[Math.max(0, Math.min(list.length - 1, i + d))]);
  };

  // Below 768 the control strip scrolls sideways. Whether there is more
  // of it either side, for the two edge keys that say so and scroll it:
  // a hidden scrollbar and nothing else left BUY SIZE and Keys out of
  // sight and out of a mouse's reach.
  const [edges, setEdges] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ctrlScroll.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const l = el.scrollLeft > 1;
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((e) => (e.l === l && e.r === r ? e : { l, r }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  const nudge = (d: 1 | -1) => {
    const el = ctrlScroll.current;
    if (el) el.scrollBy({ left: d * Math.round(el.clientWidth * 0.7) });
  };

  const openFilters = useCallback(() => {
    const b = filtersBtn.current;
    const wrap = ctrlWrap.current;
    if (b && wrap && matchMedia("(min-width: 1024px)").matches) {
      const left = b.getBoundingClientRect().left - wrap.getBoundingClientRect().left;
      setFiltersLeft(Math.max(16, Math.min(left, wrap.clientWidth - 320 - 16)));
    } else setFiltersLeft(null);
    setKeysOpen(false);
    setFiltersOpen(true);
  }, []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const closeKeys = useCallback(() => setKeysOpen(false), []);

  const cycle = (d: 1 | -1) => {
    const i = FLOOR_TABS.indexOf(tab);
    changeTab(FLOOR_TABS[(i + d + FLOOR_TABS.length) % FLOOR_TABS.length]);
  };

  const escape = () => {
    if (q) setQ("");
    else if (pinned) setPinned(null);
    setRest(null);
  };

  useHotkeys({
    j: () => move(1),
    ArrowDown: () => move(1),
    k: () => move(-1),
    ArrowUp: () => move(-1),
    "/": () => {
      findRef.current?.focus();
      findRef.current?.select();
    },
    Escape: escape,
    b: () => (pinned ? placeholderBuy(pinned, current.amount, current.unit) : nothing()),
    p: () => sim.setPaused(!sim.paused()),
    "1": () => setW(WINDOWS[0]),
    "2": () => setW(WINDOWS[1]),
    "3": () => setW(WINDOWS[2]),
    "4": () => setW(WINDOWS[3]),
    "[": () => cycle(-1),
    "]": () => cycle(1),
    h: () => (pinned ? hide(pinned) : nothing()),
    s: () => (pinned ? star(pinned) : nothing()),
    a: () => setStage("all"),
    g: () => setStage("migrated"),
    c: () => setStage("curve"),
    f: () => openFilters(),
    Home: () => snap.tickers[0] && pinTo(snap.tickers[0]),
    "?": () => {
      setFiltersOpen(false);
      setKeysOpen(true);
    },
  });

  /* --------------------------------------------------------- filters */

  const limitCount = activeFilterCount({ ...filter, stage: undefined, search: undefined });
  const applyFilters = useCallback(
    (next: TrendingFilter, draft: FilterDraft, errors: FilterErrors) => {
      setLimits({ mcMin: next.mcMin ?? null, mcMax: next.mcMax ?? null, liqMin: next.liqMin ?? null, tiers: next.tiers });
      setHidden(next.blacklist ?? []);
      // The echo is what was typed, for the fields that took; a field
      // that failed keeps showing what is actually applied.
      setEcho((e) => ({
        mcMin: errors.mcMin || errors.mcMax ? e.mcMin : draft.mcMin.trim(),
        mcMax: errors.mcMax ? e.mcMax : draft.mcMax.trim(),
        liqMin: errors.liqMin ? e.liqMin : draft.liqMin.trim(),
      }));
    },
    [setHidden],
  );
  const clearFilters = useCallback(() => {
    setLimits({});
    setStage("all");
    setEcho({ mcMin: "", mcMax: "", liqMin: "" });
  }, []);

  const echoParts: string[] = [];
  if (limits.mcMin != null) echoParts.push(`MC MIN ${echo.mcMin || fmt.usd(limits.mcMin)}`);
  if (limits.mcMax != null) echoParts.push(`MC MAX ${echo.mcMax || fmt.usd(limits.mcMax)}`);
  if (limits.liqMin != null) echoParts.push(`LIQ MIN ${echo.liqMin || fmt.usd(limits.liqMin)}`);
  if (limits.tiers?.length) echoParts.push(`TIERS ${limits.tiers.join(", ")}`);
  if (hidden.length) echoParts.push(`${hidden.length} hidden in this browser`);
  const filtersTitle = echoParts.length ? echoParts.join(" · ") : "No filters set";

  /* ------------------------------------------------------- sentences */

  const narrowedSet = stage !== "all" || limitCount > 0 || hidden.length > 0 || tab === "starred";
  let narrowed: string | null = null;
  // Only when something has a figure: a share of nothing known is not
  // 0%, and the map's empty state already says why.
  if (narrowedSet && snap.tickers.length && snap.rosterShare !== null && drawnTotal > 0) {
    const x = shareText(snap.rosterShare);
    narrowed =
      tab === "top"
        ? NARROWED.cap(snap.tickers.length, sim.rows.length, x)
        : NARROWED.trades(snap.tickers.length, sim.rows.length, x, w);
  }

  const shownTicker = pinned ?? hoverShown ?? snap.tickers[0] ?? null;
  const state: InspectState | null = pinned ? "PINNED" : hoverShown ? "HOVER" : shownTicker ? "TOP OF MAP" : null;
  const shownRow = shownTicker ? sim.row(shownTicker) ?? null : null;
  const shownV = shownTicker ? snap.values[shownTicker] : null;
  // A coin with no trades in the window has a share of exactly zero,
  // which is known; only a coin with no figure has none.
  const shownShare = shownV === null || shownV === undefined || !(drawnTotal > 0) ? null : Math.max(0, shownV) / drawnTotal;
  const stamp = stampText(snap.rankedAt);

  // Arrow keys move between tabs, as a tablist's roving tab stop
  // promises (the unselected tabs are out of the Tab order). Home and
  // End go to the ends; their default is prevented, so Home here
  // doesn't also pin rank 1.
  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = FLOOR_TABS.indexOf(tab);
    const n = FLOOR_TABS.length;
    const next =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    changeTab(FLOOR_TABS[next]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const tabs = (className: string) => (
    <div role="tablist" aria-label="Board" className={className} onKeyDown={onTabKey}>
      {FLOOR_TABS.map((t) => (
        <UnderlineTab key={t} on={tab === t} onClick={() => changeTab(t)} role="tab" controls="fl-board">
          {TAB_LABEL[t]}
          {t === "starred" && stars.length > 0 && <span className="num fl-count">{stars.length}</span>}
        </UnderlineTab>
      ))}
    </div>
  );

  const quickSize = (
    c: 1 | 2,
    amount: number,
    set: (n: number) => void,
    presets: readonly number[],
    unit: string,
  ) => (
    <div role="group" aria-label={`Buy size in ${unit}`} className={cx("fl-group fl-qb", c === 1 ? "only-chain1" : "only-chain2")}>
      <span className="meta">BUY SIZE</span>
      {presets.map((p) => (
        <UnderlineTab key={p} on={amount === p} onClick={() => set(p)} className="num">
          {amountText(p)}
        </UnderlineTab>
      ))}
      <span className="meta">{unit}</span>
      <span className="meta fl-qbtag" title={LABELS.QB_TITLE}>
        {LABELS.QB_TAG}
      </span>
    </div>
  );

  return (
    <main
      ref={rootRef}
      className="v-floor face-sans"
      data-view={view}
      data-sheet={pinned ? "open" : "closed"}
    >
      <header className="fl-mast">
        <Link href="/" className="fl-brand">
          <AnsemCrest className="h-4 w-4" />
          <span className="meta">Ansem Terminal</span>
        </Link>
        {tabs("fl-tabs fl-tabs-mast")}
        <label className={cx("fl-find", noMatch && "is-miss")}>
          <span className="num fl-find-k" aria-hidden>
            /
          </span>
          <input
            ref={findRef}
            type="search"
            value={q}
            placeholder="Find on map"
            aria-label="Find a coin on the map"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                if (q) setQ("");
                else {
                  e.currentTarget.blur();
                  setPinned(null);
                }
              } else if (e.key === "Enter") {
                e.preventDefault();
                const first = shownMatches[0];
                if (first) pinTo(first);
              }
            }}
          />
          {noMatch && <span className="meta fl-nomatch">NO MATCH</span>}
        </label>
        <VersionMenu current="floor" className="fl-version" />
        <ChainSwitch className="fl-chain" />
      </header>

      <div ref={ctrlWrap} className="fl-controls-wrap">
        <div ref={ctrlScroll} className="fl-controls">
          {tabs("fl-tabs fl-tabs-ctrl fl-group")}
          <WindowSwitch value={w} onChange={setW} className="fl-group fl-win" />
          <div role="group" aria-label="Show" className="fl-group fl-show">
            <span className="meta">SHOW</span>
            {SHOW.map((s) => (
              <UnderlineTab key={s.stage} on={stage === s.stage} onClick={() => setStage(s.stage)}>
                {s.label}
              </UnderlineTab>
            ))}
          </div>
          {/* 768 to 1023: the strip wraps here onto a second row, under a
              hairline, rather than scrolling BUY SIZE and Keys out of
              reach. Not rendered as a box at other widths. */}
          <span aria-hidden className="fl-break" />
          <div className="fl-group fl-filtersgroup">
            <button
              ref={filtersBtn}
              type="button"
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              title={filtersTitle}
              onClick={() => (filtersOpen ? setFiltersOpen(false) : openFilters())}
              className={cx("fl-ctl", filtersOpen && "is-open")}
            >
              <span className="meta">Filters</span>
              {limitCount > 0 && <span className="num fl-count">{limitCount}</span>}
            </button>
          </div>
          {quickSize(1, amount1, setAmount1, presets1, unit1)}
          {quickSize(2, amount2, setAmount2, presets2, unit2)}
          <div className="fl-group fl-keysgroup">
            <button
              ref={keysBtn}
              type="button"
              aria-expanded={keysOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setFiltersOpen(false);
                setKeysOpen((o) => !o);
              }}
              className={cx("fl-ctl", keysOpen && "is-open")}
            >
              <span className="meta">Keys</span>
              <kbd className="num fl-kbd">?</kbd>
            </button>
          </div>
        </div>
        {edges.l && (
          <button type="button" aria-hidden tabIndex={-1} title="Scroll the controls left" className="fl-more is-l" onClick={() => nudge(-1)}>
            <ChevronMark className="h-3.5 w-3.5 rotate-90" />
          </button>
        )}
        {edges.r && (
          <button type="button" aria-hidden tabIndex={-1} title="More controls" className="fl-more is-r" onClick={() => nudge(1)}>
            <ChevronMark className="h-3.5 w-3.5 -rotate-90" />
          </button>
        )}
        {filtersOpen && (
          <FilterPopover filter={filter} anchorLeft={filtersLeft} anchorRef={filtersBtn} onApply={applyFilters} onClose={closeFilters} />
        )}
        {keysOpen && <KeySheet onClose={closeKeys} anchorRef={keysBtn} />}
      </div>

      <Disclosure variant="line" className="fl-disclosure-top" />

      <div className="fl-viewswitch" role="group" aria-label="View">
        <UnderlineTab on={view === "list"} onClick={() => chooseView("list")}>
          List
        </UnderlineTab>
        <UnderlineTab on={view === "map"} onClick={() => chooseView("map")}>
          Map
        </UnderlineTab>
      </div>

      <section id="fl-board" ref={bodyRef} className="fl-body" role="tabpanel" aria-label={RANK_HEADLINE[tab](w)}>
        <MapPane
          snap={snap}
          tab={tab}
          w={w}
          art={art}
          pinned={pinned}
          hover={hoverShown}
          matches={matches}
          narrowed={narrowed}
          frozen={order.frozen}
          pending={order.pending}
          empty={{
            starredNone: tab === "starred" && stars.length === 0,
            filters: limitCount,
            hidden: hidden.length,
            onClear: clearFilters,
            onTrending: () => changeTab("trending"),
          }}
          onHover={onHover}
          onPin={onPin}
          onRest={onRest}
          paneHandlers={mapHandlers}
        />
        <aside className="fl-rail" aria-label="Inspector and ranked list">
          <div ref={sheetRef} className="fl-sheet">
            <Inspector
              key={shownTicker ?? "none"}
              row={shownRow}
              state={state}
              w={w}
              tab={tab}
              art={art}
              share={shownShare}
              stamp={stamp}
              qb={qb}
              noCoins={!snap.tickers.length}
              onUnpin={() => setPinned(null)}
              onBuy={buy}
            />
          </div>
          <RankList
            tickers={snap.tickers}
            tab={tab}
            w={w}
            art={art}
            pinned={pinned}
            hover={hoverShown}
            matches={matches}
            stars={stars}
            inRest={inRest}
            scrollRef={listRef}
            narrowed={narrowed}
            empty={{ starredNone: tab === "starred" && stars.length === 0, w, onTrending: () => changeTab("trending") }}
            onHover={onHover}
            onPin={onPin}
            wrapHandlers={listHandlers}
          />
        </aside>
      </section>

      <div className="fl-foot">
        <Disclosure variant="cells" className="fl-foot-disc" />
        <SpotCells className="fl-foot-spot" />
        <ReconCountdown className="fl-foot-recon" />
      </div>

      <footer className="fl-status">
        <SimToggle />
        <span className="meta fl-status-short">{LABELS.DISCLOSURE[0]}</span>
        <Disclosure variant="cells" className="fl-status-disc" />
        <span className="flex-1" />
        <SpotCells className="fl-status-spot" />
        <ReconCountdown className="fl-status-recon" />
      </footer>
    </main>
  );
}
