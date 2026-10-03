"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChain } from "@/components/chain";
import { amountText, useHotkeys, usePlaceholderBuy, useQuickBuy, useToast, type HotkeyMap } from "@/components/trending";
import { RANK_RULE } from "@/lib/labels";
import {
  EMPTY_FILTER,
  WINDOWS,
  activeFilterCount,
  commitDraft,
  type FilterDraft,
  type TrendingFilter,
  type Window,
} from "@/lib/trending";
import { useBoardInView, useLiveOrder, useMarketSim } from "@/lib/trending-live";
import { Board, type SelectHow } from "./board";
import { Controls } from "./controls";
import { BS_TABS, COPY, type BsTab } from "./copy";
import { Nav } from "./nav";
import { FoldedStrip, Poster, type PosterEmpty, type Snap } from "./poster";
import { Sheet } from "./sheet";
import { StatusBar } from "./status";
import { BLACKLIST_KEY, POSTER_SCRIPT, STARS_KEY, usePosterToggle, useStoredList } from "./store";

/* Broadside: read the headline first.

   A poster over the Black Bull states the tab's ranking as a sentence
   and sets #1's ranking figure in Republica; a quiet table runs beneath
   it. The poster and the table read the same order object, so #1 on the
   poster is always row 1 of the table, and both hold together while the
   reader is on the board. Row focus is a highlight and a spine on the
   row; the poster never follows it. */

const ruleOf = (tab: BsTab, w: Window) =>
  tab === "top" ? RANK_RULE.top() : tab === "z500" ? RANK_RULE.z500() : RANK_RULE[tab](w);

const isDesk = () => matchMedia("(min-width: 1024px)").matches;

/** LOCAL: candidate for foundation. A snapshot time for figures the
 *  order doesn't rank by. useLiveOrder takes a new snapshot only when
 *  the ranked figures move, and on Z500 those are fixture scores that
 *  never do, so its time would stay on the moment the tab opened while
 *  the poster's sentence (change, cap, buys and sells) went stale under
 *  it. This takes one on the same 5s cadence from the sim's own commits:
 *  none while it is paused or stopped, so the time never claims a read
 *  the sim didn't make, and none while the board is held, like the
 *  order. */
function useSnapshotTime(on: boolean, held: boolean, ms = 5000): number | null {
  const sim = useMarketSim();
  const [at, setAt] = useState<number | null>(null);
  const heldRef = useRef(held);
  heldRef.current = held;
  useEffect(() => {
    if (!on) return;
    let last = performance.now();
    return sim.subscribe(() => {
      const now = performance.now();
      if (heldRef.current || now - last < ms) return;
      last = now;
      setAt(Date.now());
    });
  }, [sim, on, ms]);
  return at;
}

/** Whether a row is fully in the part of the screen the reader can see:
 *  inside the board's scroller under its sticky head at 1024 and up,
 *  inside the window between the sticky header and the status bar
 *  below it (the row's scroll-margin-top is that header's height). */
function inView(el: HTMLElement, board: HTMLElement | null): boolean {
  const r = el.getBoundingClientRect();
  if (isDesk() && board) {
    const b = board.getBoundingClientRect();
    return r.top >= b.top + 28 - 1 && r.bottom <= b.bottom + 1;
  }
  const top = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const status = document.querySelector<HTMLElement>(".v-broadside .bs-status")?.offsetHeight ?? 0;
  return r.top >= top - 1 && r.bottom <= window.innerHeight - status + 1;
}

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const [chain] = useChain();
  const toast = useToast();
  const buy = usePlaceholderBuy();
  // Both networks' sizes, so the cascade can show either on first paint.
  const qb1 = useQuickBuy(1);
  const qb2 = useQuickBuy(2);
  const [amt, unit] = chain === 2 ? [qb2[0], "ETH"] : [qb1[0], "SOL"];

  const rootRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Every ticking figure on the page is inside main: the poster's
  // snapshot, the rows and the sheet's parent.
  useBoardInView(rootRef);

  const [tab, setTab] = useState<BsTab>("trending");
  const [w, setW] = useState<Window>("1h");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [limits, setLimits] = useState<TrendingFilter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<FilterDraft | null>(null);
  const [stars, setStars, starsReady] = useStoredList(STARS_KEY);
  const [blacklist, setBlacklist] = useStoredList(BLACKLIST_KEY);
  // A ticker, not an index, so a re-rank can't move a buy onto another coin.
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const togglePoster = usePosterToggle();

  const filter = useMemo<TrendingFilter>(
    () => ({ ...limits, search: search.trim() || undefined, blacklist: blacklist.length ? blacklist : undefined }),
    [limits, search, blacklist],
  );
  // values: true takes a fresh snapshot on every re-rank the figures
  // moved in, even when the order holds. BULLP leads Trending and Top in
  // every window, so without it the poster numeral and its time would
  // sit on the first snapshot for the whole session.
  const order = useLiveOrder(tab, w, filter, { starred: stars, values: true });
  const { tickers, rankedAt } = order;
  const t0 = tickers[0] ?? null;
  const row0 = t0 ? (sim.row(t0) ?? null) : null;
  // On Z500 the order's time only moves when the tab, the filters or the
  // hold change; the snapshot there also moves on a steady cadence (see
  // useSnapshotTime). Whichever is later is the one the figures are from.
  const zAt = useSnapshotTime(tab === "z500", order.frozen);
  const snapAt = tab === "z500" && rankedAt !== null && zAt !== null ? Math.max(rankedAt, zAt) : rankedAt;

  // The sentence under the numeral is read at the moment of the
  // snapshot, not at render: a hover or a selection re-renders the
  // screen, and must not move the figures ahead of the time printed
  // with them. On the server the time is null and the sim reads the
  // fixture, so the server and hydration print the same figures.
  const snap = useMemo<Snap | null>(
    () =>
      t0
        ? {
            change: sim.value(t0, w, "change"),
            mc: sim.value(t0, w, "mc"),
            txns: sim.value(t0, w, "txns"),
            buys: sim.value(t0, w, "buys"),
            sells: sim.value(t0, w, "sells"),
            age: sim.value(t0, w, "age"),
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim, t0, w, tab, snapAt],
  );

  /* ---- holding the order ----
     Held while the mouse is over the board, while keyboard focus is in
     it, and while the sheet is open. A click's focus doesn't hold it on
     its own: once the pointer leaves, nothing can land on a row that
     moved, and a board held until the next click elsewhere would read
     "Order held" for no reason the reader could see. */
  const hold = useRef({ hover: false, focus: false, sheet: false });
  const setFrozen = useRef(order.setFrozen);
  setFrozen.current = order.setFrozen;
  const syncHold = useCallback(() => {
    const h = hold.current;
    setFrozen.current(h.hover || h.focus || h.sheet);
  }, []);
  const onHover = useCallback((on: boolean) => {
    hold.current.hover = on;
    syncHold();
  }, [syncHold]);
  const onFocusIn = useCallback((on: boolean) => {
    hold.current.focus = on;
    syncHold();
  }, [syncHold]);
  useEffect(() => {
    hold.current.sheet = sheet !== null;
    syncHold();
  }, [sheet, syncHold]);

  /* ---- selection ----
     `follow` is whether the selected row should be kept on screen: set
     when the reader selects, cleared when they scroll it away on
     purpose, so a re-rank never drags them back from where they went. */
  const follow = useRef(false);
  const selRef = useRef(selected);
  selRef.current = selected;
  const rowEl = (t: string) => boardRef.current?.querySelector<HTMLElement>(`[data-ticker="${CSS.escape(t)}"]`) ?? null;

  const onSelect = useCallback((t: string, how: SelectHow) => {
    setSelected(t);
    follow.current = true;
    if (how === "click" && !isDesk()) setSheet(t);
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (!tickers.includes(selected)) {
      setSelected(null);
      return;
    }
    if (!follow.current) return;
    const el = rowEl(selected);
    if (el && !inView(el, boardRef.current)) el.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [tickers, selected]);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const s = selRef.current;
      const el = s ? rowEl(s) : null;
      if (el) follow.current = inView(el, boardRef.current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const b = boardRef.current;
    b?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      b?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* ---- tabs, with the scroll position kept per tab ---- */
  const scrollByTab = useRef<Partial<Record<BsTab, number>>>({});
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const goTab = useCallback((next: BsTab) => {
    if (next === tabRef.current) return;
    scrollByTab.current[tabRef.current] = isDesk() ? (boardRef.current?.scrollTop ?? 0) : window.scrollY;
    setTab(next);
  }, []);
  useLayoutEffect(() => {
    const y = scrollByTab.current[tab];
    if (isDesk()) {
      if (boardRef.current) boardRef.current.scrollTop = y ?? 0;
      return;
    }
    if (y !== undefined) {
      window.scrollTo({ top: y, behavior: "instant" });
      return;
    }
    // A tab not visited yet opens at its row 1, as it does at 1024 and
    // up: left at the last tab's depth, Top opened mid-list. A reader
    // still up at the poster stays there; one down in a list is brought
    // back to where the list starts under the sticky controls.
    const root = rootRef.current;
    const controls = root?.querySelector<HTMLElement>(".bs-controls");
    const poster = root?.querySelector<HTMLElement>(".bs-poster");
    if (!controls || !poster) return;
    const stick = parseFloat(getComputedStyle(controls).top) || 0;
    const start = poster.getBoundingClientRect().bottom + window.scrollY - stick;
    if (window.scrollY > start) window.scrollTo({ top: start, behavior: "instant" });
  }, [tab]);

  /* ---- actions ---- */
  const toggleStar = useCallback(
    (t: string) => setStars(stars.includes(t) ? stars.filter((s) => s !== t) : [...stars, t]),
    [stars, setStars],
  );
  const hide = useCallback(
    (t: string) => {
      const i = tickers.indexOf(t);
      const next = tickers[i + 1] ?? tickers[i - 1] ?? null;
      setBlacklist([...blacklist, `$${t}`]);
      setSelected(next);
    },
    [tickers, blacklist, setBlacklist],
  );
  const clearFilters = useCallback(() => {
    setLimits(EMPTY_FILTER);
    setApplied(null);
    setSearch("");
  }, []);
  const onBuy = useCallback((t: string) => buy(t, amt, unit), [buy, amt, unit]);
  const onApply = useCallback(
    (draft: FilterDraft) => {
      const { filter: next, errors } = commitDraft({ ...draft, search: "", blacklist: "" }, limits);
      // Always safe to apply by contract: a field that didn't parse, or
      // an inverted cap range, keeps its last committed value. The echo
      // keeps the last good strings for those fields too, so the title
      // never states a limit the board isn't applying.
      setLimits(next);
      setApplied((prev) => {
        const out: FilterDraft = { ...draft };
        const keep = (k: "mcMin" | "mcMax" | "volMin" | "liqMin") => {
          out[k] = prev?.[k] ?? "";
        };
        for (const k of ["mcMin", "mcMax", "volMin", "liqMin"] as const) if (errors[k]) keep(k);
        if (errors.mcMax) keep("mcMin");
        return out;
      });
      return errors;
    },
    [limits],
  );

  const move = (d: 1 | -1) => {
    if (!tickers.length) return;
    const i = selected ? tickers.indexOf(selected) : -1;
    const next = i < 0 ? tickers[0] : tickers[Math.max(0, Math.min(tickers.length - 1, i + d))];
    follow.current = true;
    setSelected(next);
    // Focus travels with the selection when it is already on the board,
    // so the roving tab stop and the highlighted row stay one row.
    if (boardRef.current?.contains(document.activeElement)) {
      requestAnimationFrame(() => rowEl(next)?.focus({ preventScroll: true }));
    }
  };
  const needSel = (fn: (t: string) => void) => () => {
    if (selected) fn(selected);
    else toast({ tone: "info", title: COPY.NO_SELECTION });
  };
  const stepTab = (d: 1 | -1) => goTab(BS_TABS[(BS_TABS.indexOf(tab) + d + BS_TABS.length) % BS_TABS.length]);

  const keys: HotkeyMap = {
    j: () => move(1),
    ArrowDown: () => move(1),
    k: () => move(-1),
    ArrowUp: () => move(-1),
    "/": () => {
      if (matchMedia("(max-width: 767px)").matches && !searchOpen) setSearchOpen(true);
      else searchRef.current?.focus();
    },
    Escape: () => {
      if (search) setSearch("");
      else if (selected) setSelected(null);
    },
    b: needSel((t) => buy(t, amt, unit)),
    p: () => sim.setPaused(!sim.paused()),
    "[": () => stepTab(-1),
    "]": () => stepTab(1),
    h: needSel(hide),
    s: needSel(toggleStar),
    f: () => {
      if (isDesk()) togglePoster();
    },
  };
  WINDOWS.forEach((win, i) => {
    keys[String(i + 1)] = () => setW(win);
  });
  useHotkeys(keys);

  // Opened below 768 (by the button or by "/"), the field takes the focus.
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* ---- what the poster and the rule say ---- */
  const filtering = activeFilterCount(limits) > 0 || !!search.trim() || blacklist.length > 0;
  const rule = ruleOf(tab, w) + (filtering ? ` ${COPY.FILTERED(tickers.length, sim.rows.length)}` : "");
  const goTrending = useCallback(() => goTab("trending"), [goTab]);
  const empty: PosterEmpty | null = tickers.length
    ? null
    : tab === "starred" && stars.length === 0
      ? { kind: "starred", goTrending }
      : { kind: "filtered", clear: clearFilters, hidden: blacklist.length, showHidden: () => setBlacklist([]) };
  const starSet = useMemo(() => new Set(stars), [stars]);
  const value0 = t0 ? (order.values[t0] ?? null) : null;

  return (
    <main ref={rootRef} className="v-broadside face-sans" data-search={searchOpen || search ? "open" : undefined}>
      {/* Before the poster, so a stored fold is on <html> before the
          poster is parsed (see POSTER_SCRIPT). */}
      <script dangerouslySetInnerHTML={{ __html: POSTER_SCRIPT }} />
      <Nav
        searchRef={searchRef}
        search={search}
        setSearch={setSearch}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        onEscapeEmpty={() => setSelected(null)}
      />
      <Poster
        tab={tab}
        w={w}
        row={row0}
        value={value0}
        at={snapAt}
        snap={snap}
        src={t0 ? art[t0] : undefined}
        rule={rule}
        empty={empty}
        onToggle={togglePoster}
      />
      <FoldedStrip
        tab={tab}
        w={w}
        row={row0}
        value={value0}
        at={snapAt}
        snap={snap}
        rule={rule}
        empty={empty}
        onToggle={togglePoster}
      />
      <Controls
        tab={tab}
        onTab={goTab}
        w={w}
        setW={setW}
        starCount={starsReady ? stars.length : null}
        limits={limits}
        applied={applied}
        onApply={onApply}
        blacklist={blacklist}
        onResetHidden={() => setBlacklist([])}
        qb1={qb1}
        qb2={qb2}
      />
      <Board
        boardRef={boardRef}
        tickers={tickers}
        tab={tab}
        w={w}
        selected={selected}
        stars={starSet}
        art={art}
        zTick={snapAt ?? 0}
        onSelect={onSelect}
        onBuy={onBuy}
        onHover={onHover}
        onFocusIn={onFocusIn}
        amt={amountText(amt)}
        unit={unit}
        empty={
          empty?.kind === "starred"
            ? { sub: COPY.STARRED_EMPTY_SUB, action: { label: COPY.GO_TRENDING, run: goTrending } }
            : { sub: COPY.EMPTY_SUB, action: { label: COPY.CLEAR, run: clearFilters } }
        }
      />
      <StatusBar frozen={order.frozen} pending={order.pending} />
      {sheet && (
        <Sheet
          ticker={sheet}
          w={w}
          src={art[sheet]}
          qb1={qb1}
          qb2={qb2}
          starred={starSet.has(sheet)}
          onBuy={buy}
          onStar={() => toggleStar(sheet)}
          onHide={() => {
            hide(sheet);
            setSheet(null);
          }}
          onClose={() => {
            // Closing hands focus back to the row, and after an Escape the
            // browser shows it as keyboard focus. That is the dialog
            // tidying up, not the reader settling on the board, so it
            // doesn't hold the order.
            hold.current.focus = false;
            setSheet(null);
          }}
        />
      )}
    </main>
  );
}
