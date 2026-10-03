"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BullMark } from "@/components/brand";
import { cx } from "@/components/ui";
import { useChain } from "@/components/chain";
import {
  CORE_HOTKEYS,
  ChainSwitch,
  Disclosure,
  ReconCountdown,
  SimToggle,
  SpotCells,
  UnderlineTab,
  VersionMenu,
  WindowSwitch,
  useHotkeys,
  usePlaceholderBuy,
  useQuickBuy,
  type HotkeyMap,
} from "@/components/trending";
import type { Tier } from "@/lib/data";
import { activeFilterCount, trendingRows, type Stage, type TrendingFilter, type Window } from "@/lib/trending";
import { useBoardInView, useLiveOrder, useMarketSim } from "@/lib/trending-live";
import { Board, type Hidden } from "./list";
import { Inspector, RailMore } from "./inspector";
import { FiltersControl, HiddenControl, STAGE_OPTIONS, Seg, TIER_OPTIONS, filterEcho, type Committed, type Echo } from "./filters";
import { useBlacklist, useStars, useWide } from "./prefs";
import { OR_TABS, TAB_LABEL, type OrTab } from "./local";

/* Open Row: a ranked list beside a full-height inspector.

   The list is for scanning and the inspector is for deciding. The one
   Buy key on the page is in the inspector, under the focused coin's
   ticker set 44px tall, and the row being inspected breaks the wall
   between the two columns: its surface runs straight into the
   inspector's, so which coin the key belongs to is drawn, not implied.

   All page state lives here. The market is the foundation's simulation
   (lib/trending-live); nothing on this page is read from a chain, and
   every screen of it says so in the status bar. */

const TOTAL = trendingRows().length;
const KEY_WINDOW: Record<"1" | "2" | "3" | "4", Window> = { "1": "5m", "2": "1h", "3": "6h", "4": "24h" };

/** The keys this version adds after the core map, for the key help. */
const EXTRA_KEYS: readonly [string, string][] = [
  ["↓ ↑", "Move down / up"],
  ["PgDn PgUp", "Move a screen of rows"],
  ["Home End", "First / last row"],
  ["Enter", "From the list, focus the Buy key"],
  ["R", "Apply waiting moves"],
];

/** The core keys in the foundation's own order. Object.keys can't give
 *  it: integer-like keys ("1" to "4") always enumerate first. */
const CORE_ORDER: readonly (keyof typeof CORE_HOTKEYS)[] = ["j", "k", "/", "Escape", "b", "p", "1", "2", "3", "4", "[", "]", "h", "s"];

const CORE_KEY_LABEL: Record<keyof typeof CORE_HOTKEYS, string> = {
  j: "J",
  k: "K",
  "/": "/",
  Escape: "Esc",
  b: "B",
  p: "P",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "[": "[",
  "]": "]",
  h: "H",
  s: "S",
};

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const wide = useWide();
  const [chain] = useChain();

  const [tab, setTab] = useState<OrTab>("trending");
  const [w, setW] = useState<Window>("1h");
  const [search, setSearch] = useState("");
  const [committed, setCommitted] = useState<Committed>({});
  const [echo, setEcho] = useState<Echo>({});
  const [tier, setTier] = useState<Tier | "all">("all");
  const [stage, setStage] = useState<Stage>("all");
  const { stars, loaded: starsLoaded, toggle: toggleStar } = useStars();
  const bl = useBlacklist();

  const [hover, setHover] = useState(false);
  const [keyHold, setKeyHold] = useState(false);
  const [openTicker, setOpenTicker] = useState<string | null>(null);
  const [selState, setSel] = useState<string | null | undefined>(undefined);
  const [lastHidden, setLastHidden] = useState<Hidden>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);

  /* ------------------------------------------------------ the order */

  const filter = useMemo<TrendingFilter>(
    () => ({
      ...committed,
      search: search.trim() || undefined,
      tiers: tier === "all" ? undefined : [tier],
      stage: stage === "all" ? undefined : stage,
      blacklist: bl.list.length ? bl.list : undefined,
    }),
    [committed, search, tier, stage, bl.list],
  );
  const order = useLiveOrder(tab, w, filter, { starred: tab === "starred" ? stars : undefined });

  /* The selection starts on the first row of the order the server
     rendered, and is pinned to that ticker on mount. Without the pin an
     unset selection would follow whatever is first, and a re-rank
     would change what is inspected with no one touching anything. */
  const sel = selState === undefined ? (order.tickers[0] ?? null) : selState;
  useEffect(() => {
    setSel((s) => (s === undefined ? (order.tickers[0] ?? null) : s));
    // Mount only: this is the pin, not a follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Selection repair. When the inspected coin leaves the list (a filter,
     a tab change), the selection moves to the top. When the reader
     removed it themselves (H, or unstarring on Starred), it moves to
     the row that was below it, or above it at the end of the list, so
     working down a list with H keeps the reader where they were. On a
     phone the open row closes, and the next J or K carries on from
     where it was (noteRemoval, below). A re-rank never moves anything:
     the coin stays inspected wherever it went, and the nameplate's
     "#n" says where that is. */
  const removedFrom = useRef<string[] | null>(null);
  /* Whether an empty selection is the repair's (the list ran out) or
     the reader's (Esc). The reader's stays empty; the repair's gives way
     to the first row as soon as there is one again. */
  const repairedToNull = useRef(false);
  // A layout effect, so no frame is painted with the inspector still on
  // a coin the list no longer holds.
  useLayoutEffect(() => {
    const list = order.tickers;
    const prev = removedFrom.current;
    removedFrom.current = null;
    if (sel === null) {
      if (repairedToNull.current && list.length) {
        repairedToNull.current = false;
        setSel(list[0]);
      }
    } else if (!list.includes(sel)) {
      let next: string | null = list[0] ?? null;
      const i = prev ? prev.indexOf(sel) : -1;
      if (prev && i >= 0) {
        const below = prev.slice(i + 1).find((t) => list.includes(t));
        const above = prev.slice(0, i).reverse().find((t) => list.includes(t));
        next = below ?? above ?? next;
      }
      repairedToNull.current = next === null;
      setSel(next);
    }
    if (openTicker !== null && !list.includes(openTicker)) setOpenTicker(null);
    // Keyed on the order alone: sel and openTicker are read as they are
    // when it changes, and a selection change must not trigger a repair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.tickers]);

  /* ----------------------------------------------------------- freeze */

  /* The order holds while the pointer is on the list, for four seconds
     after a key move, and on a phone while a row is open (the inspector
     is under that row, and a re-rank would carry it off). Pausing the
     simulation stops re-ranks by itself. */
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdKeys = useCallback(() => {
    setKeyHold(true);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setKeyHold(false), 4000);
  }, []);
  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);
  const shouldFreeze = hover || keyHold || (!wide && openTicker !== null);
  const { setFrozen } = order;
  useEffect(() => {
    setFrozen(shouldFreeze);
  }, [shouldFreeze, setFrozen]);

  const applyMoves = () => {
    setFrozen(false);
    if (shouldFreeze) setFrozen(true);
  };

  /* The body stops the market when it is off screen. It holds every
     ticking figure on both layouts: list and rail on desktop, the list
     with its inline inspector on a phone. */
  useBoardInView(bodyRef);

  /* --------------------------------------------------- tabs, scroll */

  const scrollByTab = useRef<Partial<Record<OrTab, number>>>({});
  const restoreFor = useRef<OrTab | null>(null);
  const changeTab = (next: OrTab) => {
    if (next === tab) return;
    scrollByTab.current[tab] = wide ? (bodyRef.current?.scrollTop ?? 0) : window.scrollY;
    restoreFor.current = next;
    setTab(next);
  };
  useLayoutEffect(() => {
    if (restoreFor.current !== tab) return;
    restoreFor.current = null;
    const y = scrollByTab.current[tab];
    if (wide) {
      if (bodyRef.current) bodyRef.current.scrollTop = y ?? 0;
    } else if (y !== undefined) {
      window.scrollTo(0, y);
    }
  }, [tab, wide]);
  const cycleTab = (d: number) => {
    const i = OR_TABS.indexOf(tab);
    changeTab(OR_TABS[(i + d + OR_TABS.length) % OR_TABS.length]);
  };

  /* ------------------------------------------------------- movement */

  const pendingScroll = useRef<string | null>(null);
  useLayoutEffect(() => {
    const t = pendingScroll.current;
    if (!t) return;
    pendingScroll.current = null;
    // Below 1024 the row being moved to opens with its inspector under
    // it, so it goes to the top of the screen, where the inspector has
    // the rest of the screen to show in. On desktop the inspector is
    // beside the list and the row only has to be in view.
    document.getElementById(`or-opt-${t}`)?.scrollIntoView({ block: wide ? "nearest" : "start" });
  });

  /** The coin a key acts on: the selection on desktop, the open row
   *  below 1024. The narrow layouts draw no selection, only an open row,
   *  and a key must not act on something the reader can't see. */
  const focusT = wide ? sel : openTicker;

  /* Below 1024, J and K move the open row itself: the row they land on
     opens, so what B, S and H would act on is always on screen. After
     Esc closes a row, J carries on from that row rather than from the
     top. */
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (openTicker) lastOpen.current = openTicker;
  }, [openTicker]);

  /* When the reader removes the open row themselves (H, or unstarring on
     Starred), the row closes, and its neighbours are kept here so the
     next J opens the row that was below it and the next K the row that
     was above: the narrow layouts' version of the desktop repair. It
     doesn't open the neighbour at once, as the desktop does, because
     there the Buy key would swap coins under a finger that had just
     pressed Hide beside it. */
  const gap = useRef<{ t: string; above: string | null; below: string | null } | null>(null);
  const noteRemoval = (t: string) => {
    const prev = order.tickers;
    const i = prev.indexOf(t);
    removedFrom.current = prev;
    gap.current = i < 0 ? null : { t, above: prev[i - 1] ?? null, below: prev[i + 1] ?? null };
  };

  const move = (to: (i: number, n: number) => number, dir: 1 | -1) => {
    const list = order.tickers;
    const n = list.length;
    if (!n) return;
    const cur = wide ? sel : (openTicker ?? lastOpen.current);
    const i = cur ? list.indexOf(cur) : -1;
    const g = gap.current;
    const resume =
      !wide && i < 0 && cur !== null && g?.t === cur
        ? (dir > 0 ? [g.below, g.above] : [g.above, g.below]).find((x) => x !== null && list.includes(x))
        : undefined;
    const j = Math.max(0, Math.min(n - 1, i < 0 ? 0 : to(i, n)));
    const t = resume ?? list[j];
    repairedToNull.current = false;
    if (wide) setSel(t);
    else setOpenTicker(t);
    pendingScroll.current = t;
    holdKeys();
  };

  /* The rail keeps its own scroll, and a coin is always shown from its
     nameplate: carried over from the last coin, a scrolled rail would
     open the next one with its ticker and Buy key out of sight. */
  useLayoutEffect(() => {
    if (railRef.current) railRef.current.scrollTop = 0;
  }, [sel]);

  /* The sticky list head wraps its rule line when a filter echo makes it
     long, and the status bar wraps on a phone. Rows scroll into view
     clear of both, so their heights are measured into the variables
     the rows' scroll margins read. Written straight onto the element,
     outside React, so the server HTML never disagrees with it. */
  useEffect(() => {
    const root = rootRef.current;
    const head = root?.querySelector<HTMLElement>(".or-sticky");
    const status = root?.querySelector<HTMLElement>(".or-status");
    if (!root || !head || !status) return;
    const write = () => {
      root.style.setProperty("--or-head", `${head.offsetHeight}px`);
      root.style.setProperty("--or-status", `${status.offsetHeight}px`);
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(head);
    ro.observe(status);
    return () => ro.disconnect();
  }, []);
  const page = () => Math.max(1, Math.floor((bodyRef.current?.clientHeight ?? 640) / 32) - 2);

  const pick = useCallback(
    (t: string) => {
      if (wide) {
        setSel(t);
        listboxRef.current?.focus({ preventScroll: true });
      } else {
        setOpenTicker((o) => (o === t ? null : t));
      }
    },
    [wide],
  );

  /* ------------------------------------------------------------ buy */

  const buyToast = usePlaceholderBuy();
  const qb1 = useQuickBuy(1);
  const qb2 = useQuickBuy(2);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Nothing is sent. The toast says so in full, and the key answers in
   *  place for a moment, so the reader who pressed it sees the reply
   *  where they were looking. */
  const buy = (t: string | null) => {
    if (!t) return;
    const [amount, , , unit] = chain === 2 ? qb2 : qb1;
    buyToast(t, amount, unit);
    setSentFor(t);
    if (sentTimer.current) clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSentFor(null), 1600);
  };
  useEffect(() => () => {
    if (sentTimer.current) clearTimeout(sentTimer.current);
  }, []);

  /* -------------------------------------------------- hide and star */

  const hiddenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideFocused = () => {
    if (!focusT) return;
    const entry = `$${focusT}`;
    noteRemoval(focusT);
    bl.hide(entry);
    setLastHidden({ entry, ticker: focusT });
    if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
    hiddenTimer.current = setTimeout(() => setLastHidden(null), 6000);
  };
  const undoHide = () => {
    if (!lastHidden) return;
    bl.unhide(lastHidden.entry);
    setLastHidden(null);
    if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
  };
  useEffect(() => () => {
    if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
  }, []);
  /* The foot's "Hid X · Undo" is a claim that X is hidden. Restored some
     other way (the Hidden panel, Restore all), it is no longer true, and
     goes at once rather than when its six seconds run out. */
  useEffect(() => {
    if (!lastHidden || bl.list.includes(lastHidden.entry)) return;
    setLastHidden(null);
    if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
  }, [bl.list, lastHidden]);

  const starFocused = () => {
    if (!focusT) return;
    if (tab === "starred" && stars.includes(focusT)) noteRemoval(focusT);
    toggleStar(focusT);
  };

  const clearFilters = () => {
    setCommitted({});
    setEcho({});
    setSearch("");
    setTier("all");
    setStage("all");
  };

  /* --------------------------------------------------------- hotkeys */

  const focusBuyKey = () => {
    document.querySelector<HTMLButtonElement>(`.or-rail .only-chain${chain} .or-buy`)?.focus({ preventScroll: true });
  };
  const focusList = () => listboxRef.current?.focus({ preventScroll: true });

  const keys: HotkeyMap = {
    j: () => move((i) => i + 1, 1),
    ArrowDown: () => move((i) => i + 1, 1),
    k: () => move((i) => i - 1, -1),
    ArrowUp: () => move((i) => i - 1, -1),
    "/": () => searchRef.current?.focus(),
    Escape: () => {
      if (search) setSearch("");
      else if (!wide && openTicker) setOpenTicker(null);
      else {
        repairedToNull.current = false;
        setSel(null);
      }
    },
    b: () => buy(focusT),
    p: () => sim.setPaused(!sim.paused()),
    "1": () => setW(KEY_WINDOW["1"]),
    "2": () => setW(KEY_WINDOW["2"]),
    "3": () => setW(KEY_WINDOW["3"]),
    "4": () => setW(KEY_WINDOW["4"]),
    "[": () => cycleTab(-1),
    "]": () => cycleTab(1),
    h: hideFocused,
    s: starFocused,
  };
  if (wide) {
    keys.PageDown = () => move((i) => i + page(), 1);
    keys.PageUp = () => move((i) => i - page(), -1);
    keys.Home = () => move(() => 0, -1);
    keys.End = () => move((_, n) => n - 1, 1);
    keys.r = () => {
      if (order.frozen) applyMoves();
    };
  }
  useHotkeys(keys);

  /* Enter is the listbox's own key rather than a page hotkey: bound on
     the page it would swallow Enter on every focused button. */
  const onListKey = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" && e.target === listboxRef.current && sel) {
      e.preventDefault();
      focusBuyKey();
    }
  };

  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = OR_TABS.indexOf(tab);
    const next = OR_TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + OR_TABS.length) % OR_TABS.length];
    changeTab(next);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.or-tabs [aria-selected="true"]')?.focus());
  };

  /* ---------------------------------------------------------- render */

  const echoList = filterEcho(echo, w, { search, tiers: filter.tiers, stage, hidden: bl.list.length });

  /** What the nameplate's rank stamp may claim. A position is a rank
   *  only when the coin has the figure the tab ranks by; without it the
   *  coin is simply sorted last. Seated is the exception: its unscored
   *  seats have no score but follow by seat number, and the rule line
   *  says so. The count and the word "filtered" appear whenever the list
   *  is not the whole board, so "#1" can't be read as first of 78. */
  const ranked = (t: string) => tab === "z500" || (order.values[t] ?? null) !== null;
  const rankOf = (t: string | null) => {
    const i = t ? order.tickers.indexOf(t) : -1;
    return {
      rankIndex: i,
      rankCount: order.tickers.length,
      ranked: i >= 0 && ranked(t!),
      filtered: echoList.length > 0,
    };
  };
  const filterCount = activeFilterCount(wide ? committed : { ...committed, tiers: filter.tiers, stage: filter.stage });

  const inspectorCommon = {
    tab,
    w,
    setW,
    art,
    qb1,
    qb2,
    onBuy: buy,
    onBuyEscape: focusList,
    onStar: starFocused,
    onHide: hideFocused,
    touch: !wide,
    listEmpty: order.tickers.length === 0,
  };

  const inline =
    !wide && openTicker ? (
      <Inspector
        {...inspectorCommon}
        variant="inline"
        id="or-inline"
        ticker={openTicker}
        {...rankOf(openTicker)}
        sent={sentFor === openTicker}
        starred={stars.includes(openTicker)}
        onClose={() => {
          const t = openTicker;
          setOpenTicker(null);
          requestAnimationFrame(() => document.getElementById(`or-opt-${t}`)?.focus());
        }}
      />
    ) : null;

  return (
    <div ref={rootRef} className="v-openrow face-sans">
      <header className="or-mast">
        <Link href="/" className="or-brand meta hover:text-muted">
          <BullMark className="h-5 w-5 text-bone" />
          <span className="or-brand-word">Ansem Terminal</span>
        </Link>

        <div role="tablist" aria-label="Board" className="or-tabs" onKeyDown={onTabKey}>
          {OR_TABS.map((t) => (
            <UnderlineTab key={t} role="tab" controls="or-board" on={tab === t} onClick={() => changeTab(t)} className="or-tab">
              {TAB_LABEL[t]}
              {t === "starred" && starsLoaded && (
                <span className="num text-dim" aria-label={`${stars.length} starred`}>
                  {stars.length}
                </span>
              )}
            </UnderlineTab>
          ))}
        </div>

        <span className="or-sp" aria-hidden />

        <div className="or-search">
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              e.preventDefault();
              if (search) setSearch("");
              else e.currentTarget.blur();
            }}
            aria-label="Search ticker, name or mint"
            placeholder="Search ticker, name, mint"
            autoComplete="off"
            spellCheck={false}
            className="or-search-input"
          />
          {!search && (
            <kbd aria-hidden className="or-key or-search-key">
              /
            </kbd>
          )}
        </div>

        <div className="or-ver">
          <VersionMenu current="openrow" />
        </div>
        <div className="or-chain">
          <ChainSwitch />
        </div>

        <div className="or-controls">
          <WindowSwitch value={w} onChange={setW} className="or-wsw" tabClassName="or-tab" />
          <span aria-hidden className="or-vsep" />
          <Seg label="Tier" options={TIER_OPTIONS} value={tier} onChange={setTier} className="or-d-only" />
          <Seg label="Stage" options={STAGE_OPTIONS} value={stage} onChange={setStage} className="or-d-only" />
          <FiltersControl
            btnRef={filtersBtnRef}
            wide={wide}
            w={w}
            committed={committed}
            echo={echo}
            count={filterCount}
            onApply={(next, e) => {
              setCommitted(next);
              setEcho(e);
            }}
            tier={tier}
            setTier={setTier}
            stage={stage}
            setStage={setStage}
            hidden={bl.list}
            unhide={bl.unhide}
            restoreAll={bl.restoreAll}
          />
          {bl.list.length > 0 && (
            <HiddenControl
              hidden={bl.list}
              unhide={bl.unhide}
              restoreAll={bl.restoreAll}
              onEmptied={() => filtersBtnRef.current?.focus()}
              className="or-d-only"
            />
          )}
        </div>
      </header>

      <main ref={bodyRef} className="or-body" onKeyDown={onListKey}>
        <Board
          tab={tab}
          w={w}
          tickers={order.tickers}
          ranked={ranked}
          total={TOTAL}
          sel={sel}
          openTicker={openTicker}
          wide={wide}
          stars={stars}
          starsLoaded={starsLoaded}
          art={art}
          echo={echoList}
          onPick={pick}
          listboxRef={listboxRef}
          inline={inline}
          frozen={order.frozen}
          pending={order.pending}
          onApplyMoves={applyMoves}
          lastHidden={lastHidden}
          onUndo={undoHide}
          hiddenCount={bl.list.length}
          onClearFilters={clearFilters}
          onShowHidden={bl.restoreAll}
          onHover={setHover}
          sectionRef={sectionRef}
        />
        <aside ref={railRef} className="or-rail" aria-label="Inspector">
          {wide && (
            <Inspector
              {...inspectorCommon}
              variant="rail"
              ticker={sel}
              {...rankOf(sel)}
              sent={sentFor !== null && sentFor === sel}
              starred={sel !== null && stars.includes(sel)}
            />
          )}
          {wide && <RailMore railRef={railRef} ticker={sel} />}
        </aside>
      </main>

      <footer className="or-status">
        <div className="or-status-l">
          <Disclosure variant="cells" className="or-disc-cells" />
          <Disclosure variant="line" className="or-disc-line" />
          <SimToggle className="or-sim" />
        </div>
        {/* Listed in the order they give way, last first: the key legend
            drops before the countdown, the countdown before the spot. The
            row runs right to left and wraps its overflow onto a hidden
            second line (openrow.css), so an item is either shown whole or
            not at all, whatever the SIM state's label leaves room for. */}
        <div className="or-status-r">
          <SpotCells className="or-pri-spot" />
          <ReconCountdown className="or-pri-cd" />
          <span className="or-pri-keys meta">
            <kbd className="or-key">J</kbd>
            <kbd className="or-key">K</kbd> Move
            <span className="or-dot">·</span>
            {/* The foundation's own qualifier: B sends nothing. */}
            <kbd className="or-key">B</kbd> Buy (placeholder)
            <span className="or-dot">·</span>
            <kbd className="or-key">/</kbd> Search
            <span className="or-dot">·</span>
            <kbd className="or-key">P</kbd> Pause
          </span>
        </div>
        <KeyHelp open={help} setOpen={setHelp} />
      </footer>
    </div>
  );
}

/** The key list, above the status bar. The core map first, in the
 *  foundation's own words, then this version's extras. */
function KeyHelp({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  return (
    <div ref={root} className="or-pri-help or-pop-anchor" data-hotkeys-inert={open ? "" : undefined}>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="or-keyhelp"
        aria-label="Keyboard shortcuts"
        onClick={() => setOpen(!open)}
        className={cx("or-key or-key-btn", open && "is-on")}
      >
        ?
      </button>
      {open && (
        <div id="or-keyhelp" role="dialog" aria-label="Keyboard shortcuts" className="or-pop or-pop-keys">
          <dl className="or-keys-list">
            {CORE_ORDER.map((k) => (
              <div key={k}>
                <dt>
                  <kbd className="or-key">{CORE_KEY_LABEL[k]}</kbd>
                </dt>
                <dd>{CORE_HOTKEYS[k]}</dd>
              </div>
            ))}
          </dl>
          <dl className="or-keys-list is-extra">
            {EXTRA_KEYS.map(([k, v]) => (
              <div key={k}>
                <dt>
                  {k.split(" ").map((part) => (
                    <kbd key={part} className="or-key">
                      {part}
                    </kbd>
                  ))}
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
