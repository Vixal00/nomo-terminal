"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ChainSwitch,
  Disclosure,
  ReconCountdown,
  SimToggle,
  SpotCells,
  UnderlineTab,
  VersionMenu,
  WindowSwitch,
  usePlaceholderBuy,
  useHotkeys,
  useQuickBuy,
  useToast,
} from "@/components/trending";
import { useChain } from "@/components/chain";
import { BullMark } from "@/components/brand";
import { RANK_HEADLINE, RANK_RULE, TABS, activeFilterCount, quickBuy, rowOf, trendingRows, type Tab, type Window } from "@/lib/trending";
import { useBoardInView, useLiveOrder, useLiveRanks, useMarketSim } from "@/lib/trending-live";
import { LABELS } from "@/lib/labels";
import { Board, rowIdOf, sortPhrase } from "./board";
import { CommandLine, COLUMN_SETS, type ColumnSet } from "./command-line";
import { Dock, type Off } from "./dock";
import { KeysDialog } from "./keys-dialog";
import { EMPTY_COMMITTED, hiddenBy, parseQuery, removeToken, type Committed, type QueryError, type Token } from "./parse-query";
import { FIRST_DIR, REORDER_MS, sortTickers, type Sort, type SortKey } from "./columns";
import { readStored, usePersistedList, usePersistedString, writeStored } from "./store";

/* Heatsheet: one ranked sheet, one line per coin, driven from the
   keyboard.

   Five bands, top to bottom: tabs and windows, the command line, the
   sheet, the selected coin, and the status line that says what the
   figures are. The only fills on the sheet are the change-by-window and
   token-info tints; everything else is text on the canvas and hairlines,
   so the eye has one place to go. */

const STARS_KEY = "ansem.terminal.stars";
const BLACKLIST_KEY = "ansem.terminal.blacklist";
const QUERY_KEY = "ansem.terminal.heatsheet.q";
const SET_KEY = "ansem.terminal.heatsheet.set";

const TAB_LABEL: Record<Tab, string> = {
  trending: "Trending",
  top: "Top",
  new: "New",
  final: "Final",
  z500: "Z500",
  starred: "Starred",
};

const KEY_WINDOW: Record<string, Window> = { "1": "5m", "2": "1h", "3": "6h", "4": "24h" };
const ROWS_TOTAL = trendingRows().length;

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const [chain] = useChain();
  const toast = useToast();
  const placeholderBuy = usePlaceholderBuy();
  const gridId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("trending");
  const [w, setW] = useState<Window>("1h");
  const [sort, setSort] = useState<Sort | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [off, setOff] = useState<Off>(null);
  const [stars, updateStars] = usePersistedList(STARS_KEY);
  const [blacklist, updateBlacklist] = usePersistedList(BLACKLIST_KEY);
  const [set, setSet] = usePersistedString<ColumnSet>(SET_KEY, "perf", COLUMN_SETS);
  const [query, setQuery] = useState<Committed>(EMPTY_COMMITTED);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<QueryError[]>([]);
  const [keysOpen, setKeysOpen] = useState(false);
  const [devBad, setDevBad] = useState(false);
  const [amt1, setAmt1, presets1] = useQuickBuy(1);
  const [amt2, setAmt2, presets2] = useQuickBuy(2);

  // The whole screen holds ticking figures (sheet and dock both), so the
  // whole screen is the region that keeps the market running.
  useBoardInView(rootRef);

  /* ------------------------------------------------------ Command line */

  const queryRef = useRef(query);
  queryRef.current = query;

  const commit = useCallback(
    (text: string, prev?: Committed) => {
      const { next, errors: errs, hide, unhide } = parseQuery(text, prev ?? queryRef.current);
      queryRef.current = next;
      setQuery(next);
      setDraft(next.text);
      setErrors(errs);
      if (hide.length || unhide.length) {
        const low = (s: string) => s.trim().toLowerCase();
        updateBlacklist((list) => {
          const gone = new Set(unhide.flatMap((u) => [low(u), `$${low(u).replace(/^\$/, "")}`, low(u).replace(/^\$/, "")]));
          const kept = list.filter((e) => !gone.has(low(e)));
          for (const h of hide) if (!kept.some((e) => low(e) === low(h))) kept.push(h);
          return kept;
        });
      }
      writeStored(QUERY_KEY, next.text);
    },
    [updateBlacklist],
  );

  useEffect(() => {
    const saved = readStored(QUERY_KEY);
    if (saved) commit(saved, EMPTY_COMMITTED);
    // A development-only way to see the bad band drawn: nothing on the
    // fixtures reaches it, so without this it could never be checked.
    // LOCAL: candidate for foundation
    if (process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("bands") === "bad") setDevBad(true);
    // Once, on mount: the saved line is read after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEcho = useCallback(
    (t: Token) => {
      const { text, prev } = removeToken(queryRef.current, t);
      commit(text, prev);
    },
    [commit],
  );

  /* ------------------------------------------------------------- Order */

  const filter = useMemo(() => ({ ...query.filter, blacklist }), [query.filter, blacklist]);
  const order = useLiveOrder(tab, w, filter, { starred: stars, values: true, reorderMs: REORDER_MS });
  const ranks24 = useLiveRanks("trending", "24h", { reorderMs: REORDER_MS });
  // Coins the blacklist takes off the board, not entries in it: one
  // entry can hide several coins, and a stale one none.
  const hidden = useMemo(() => hiddenBy(blacklist), [blacklist]);
  const display = useMemo(
    () => (sort ? sortTickers(order.tickers, sort, w, sim) : order.tickers),
    // The column sort is re-read with the order's snapshot and never
    // between two of them, so it holds while the order holds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order.tickers, order.rankedAt, sort, w, sim],
  );
  const rankOf = useMemo(() => Object.fromEntries(order.tickers.map((t, i) => [t, i + 1])), [order.tickers]);
  const starSet = useMemo(() => new Set(stars), [stars]);

  /* The order never moves under the reader: the pointer on the sheet, or
     keyboard focus inside it, holds it. Focus from a mouse click doesn't
     count, or one click on a row would hold the order until the reader
     clicked somewhere else. */
  const pointerIn = useRef(false);
  const focusIn = useRef(false);
  const touchIn = useRef(false);
  const setFrozen = order.setFrozen;
  const hold = useCallback(() => setFrozen(pointerIn.current || focusIn.current || touchIn.current), [setFrozen]);
  const onPointerInside = useCallback(
    (v: boolean) => {
      pointerIn.current = v;
      hold();
    },
    [hold],
  );
  const onFocusInside = useCallback(
    (v: boolean) => {
      focusIn.current = v;
      hold();
    },
    [hold],
  );
  /* A finger has no hover, and the browser cancels the pointer as soon
     as it takes a drag over for scrolling, so on a touch screen the hold
     comes from the touch and the scroll themselves: on while either is
     going, off a second after the last of them, which also covers a
     flick that keeps scrolling after the finger has lifted. */
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTouchHold = useCallback(
    (active: boolean) => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
      touchTimer.current = null;
      if (active) {
        touchIn.current = true;
        hold();
        return;
      }
      touchTimer.current = setTimeout(() => {
        touchTimer.current = null;
        touchIn.current = false;
        hold();
      }, 1000);
    },
    [hold],
  );
  useEffect(
    () => () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
    },
    [],
  );

  /* --------------------------------------------------------- Selection */

  const displayRef = useRef(display);
  displayRef.current = display;
  const selRef = useRef(sel);
  selRef.current = sel;
  const scrollWanted = useRef(false);

  const reveal = useCallback(
    (t: string | null) => {
      if (t) document.getElementById(rowIdOf(gridId, t))?.scrollIntoView({ block: "nearest" });
    },
    [gridId],
  );

  const selectBy = useCallback(
    (pick: (list: string[], i: number) => string | undefined) => {
      const list = displayRef.current;
      if (!list.length) return;
      const i = selRef.current ? list.indexOf(selRef.current) : -1;
      const next = pick(list, i);
      if (!next) return;
      if (next === selRef.current) reveal(next);
      else {
        scrollWanted.current = true;
        setSel(next);
      }
    },
    [reveal],
  );
  const move = useCallback(
    (d: 1 | -1) => selectBy((list, i) => (i < 0 ? list[0] : list[Math.max(0, Math.min(list.length - 1, i + d))])),
    [selectBy],
  );

  // J/K scroll the newly selected row into view; a click or a re-rank
  // never scrolls (the reader's scroll position is theirs).
  useLayoutEffect(() => {
    if (!scrollWanted.current) return;
    scrollWanted.current = false;
    reveal(sel);
  }, [sel, reveal]);

  const onSelect = useCallback((t: string) => setSel(t), []);

  // Where the selected row is, for the dock's OFF SCREEN key. Observed,
  // never measured in a loop.
  useEffect(() => {
    const root = scrollerRef.current;
    const el = sel ? document.getElementById(rowIdOf(gridId, sel)) : null;
    if (!root || !el || typeof IntersectionObserver === "undefined") {
      setOff(null);
      return;
    }
    const phone = window.matchMedia("(max-width: 899px)").matches;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.rootBounds) return;
        if (e.intersectionRatio >= 0.5) setOff(null);
        else setOff(e.boundingClientRect.top < e.rootBounds.top ? "above" : "below");
      },
      { root, rootMargin: phone ? "-44px 0px 0px 0px" : "-44px 0px -22px 0px", threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sel, gridId, display]);

  /* ------------------------------------------------------ Tabs, scroll */

  const tabRef = useRef(tab);
  tabRef.current = tab;
  const scrollTops = useRef<Partial<Record<Tab, number>>>({});

  const changeTab = useCallback((next: Tab) => {
    if (next === tabRef.current) return;
    if (scrollerRef.current) scrollTops.current[tabRef.current] = scrollerRef.current.scrollTop;
    setSort(null);
    setTab(next);
  }, []);

  /* The tabs are one tab stop, as a tablist is: arrows (and Home, End)
     move the selection along it, wrapping, and focus follows. */
  const onTabKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const i = TABS.indexOf(tabRef.current);
      const to =
        e.key === "ArrowRight" ? (i + 1) % TABS.length
        : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
        : e.key === "Home" ? 0
        : e.key === "End" ? TABS.length - 1
        : -1;
      if (to < 0) return;
      e.preventDefault();
      e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
      changeTab(TABS[to]);
    },
    [changeTab],
  );

  // One sheet for every tab, so each tab's scroll is kept here and put
  // back when the reader returns to it.
  useLayoutEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollTops.current[tab] ?? 0;
  }, [tab]);

  const onSort = useCallback((key: SortKey) => {
    setSort((s) => {
      const first = FIRST_DIR[key] ?? "desc";
      const second = first === "desc" ? "asc" : "desc";
      if (!s || s.key !== key) return { key, dir: first };
      if (s.dir === first) return { key, dir: second };
      return null;
    });
  }, []);

  /* --------------------------------------------------------- Buy, copy */

  const now = useRef({ chain, amt1, amt2 });
  now.current = { chain, amt1, amt2 };

  const onBuy = useCallback(
    (t: string) => {
      const { chain: c, amt1: a1, amt2: a2 } = now.current;
      placeholderBuy(t, c === 2 ? a2 : a1, quickBuy(c).unit);
    },
    [placeholderBuy],
  );

  const onCopy = useCallback(
    (t: string) => {
      const row = rowOf(t);
      if (!row) return;
      if (now.current.chain === 2) {
        toast({ title: LABELS.NET2_MINT, tone: "info" });
        return;
      }
      const done = () => toast({ title: `Copied.${row.mintResolves ? "" : ` ${LABELS.MINT_PLACEHOLDER}.`}`, tone: "info" });
      const fail = () => toast({ title: "Not copied: the browser refused clipboard access.", tone: "fail" });
      try {
        navigator.clipboard.writeText(row.mint).then(done, fail);
      } catch {
        fail();
      }
    },
    [toast],
  );

  /* ----------------------------------------------------------- Hotkeys */

  /* Esc on a focused tooltip is that tooltip's: it closes it, and must
     not also clear the line behind it. The Tip doesn't mark the key as
     handled, and by the time the page's keys run it has already hidden
     itself, so whether the focused one was open is read before anything
     else sees the key. */
  const tipWasOpen = useRef(false);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const wrap = (e.target as Element | null)?.closest?.("[aria-describedby]");
      const id = wrap?.getAttribute("aria-describedby");
      const tip = id ? document.getElementById(id) : null;
      tipWasOpen.current = tip?.getAttribute("role") === "tooltip" && !tip.hidden;
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const needRow = () => {
    toast({ title: "Select a row first.", tone: "info" });
    return null;
  };

  useHotkeys({
    j: () => move(1),
    ArrowDown: () => move(1),
    k: () => move(-1),
    ArrowUp: () => move(-1),
    "/": () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    Escape: () => {
      if (tipWasOpen.current) return;
      if (queryRef.current.text) commit("");
      else setSel(null);
    },
    b: () => (selRef.current ? onBuy(selRef.current) : needRow()),
    p: () => sim.setPaused(!sim.paused()),
    ...Object.fromEntries(Object.entries(KEY_WINDOW).map(([k, v]) => [k, () => setW(v)])),
    "[": () => changeTab(TABS[(TABS.indexOf(tabRef.current) - 1 + TABS.length) % TABS.length]),
    "]": () => changeTab(TABS[(TABS.indexOf(tabRef.current) + 1) % TABS.length]),
    h: () => {
      const t = selRef.current;
      if (!t) return needRow();
      const list = displayRef.current;
      const i = list.indexOf(t);
      const next = i < 0 ? null : (list[i + 1] ?? list[i - 1] ?? null);
      updateBlacklist((l) => (l.some((e) => e.toLowerCase() === `$${t}`.toLowerCase()) ? l : [...l, `$${t}`]));
      scrollWanted.current = next !== null;
      setSel(next);
      toast({ title: `Hidden $${t}. Type +${t} to show it again.`, tone: "info" });
    },
    s: () => {
      const t = selRef.current;
      if (!t) return needRow();
      updateStars((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
    },
    g: (e) => selectBy((list) => (e.shiftKey ? list[list.length - 1] : list[0])),
    q: () => {
      const [amt, setAmt, presets] = now.current.chain === 2 ? [amt2, setAmt2, presets2] : [amt1, setAmt1, presets1];
      const i = presets.indexOf(amt);
      setAmt(presets[(i + 1) % presets.length]);
    },
    x: () => (selRef.current ? onCopy(selRef.current) : needRow()),
    "?": () => setKeysOpen(true),
  });

  /* ------------------------------------------------------------ Render */

  const rule = RANK_RULE[tab](w);
  const ruleText = sort ? `Sorted by ${sortPhrase(sort)}. # keeps this tab's rank: ${rule}` : rule;
  const no24 = tab === "trending" && w === "24h";
  const count = { k: activeFilterCount(query.filter), n: display.length, N: ROWS_TOTAL, h: hidden };
  const orderCell = order.frozen ? (
    <span className="meta st-order" title={LABELS.HELD_TITLE}>
      {LABELS.HELD(order.pending)}
    </span>
  ) : (
    <span className="meta st-order">Re-ranks at most every {REORDER_MS / 1000}s</span>
  );

  return (
    <main
      ref={rootRef}
      className="v-heatsheet face-sans"
      data-set={set}
      data-w={w}
      data-no24={no24 ? "" : undefined}
      data-devbands={devBad ? "bad" : undefined}
    >
      <h1 className="sr-only">Trending</h1>

      <header className="tb">
        <Link href="/" className="tb-brand" title="All versions">
          <BullMark className="h-4 w-4 text-bone" />
          <span className="display tb-word">Ansem</span>
        </Link>
        <div role="tablist" aria-label="Board" className="tb-tabs" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <UnderlineTab key={t} role="tab" on={tab === t} onClick={() => changeTab(t)} controls={gridId} className="hs-ut">
              <span title={RANK_HEADLINE[t](w)}>{TAB_LABEL[t]}</span>
              {t === "starred" && stars.length > 0 && <span className="num">{stars.length}</span>}
            </UnderlineTab>
          ))}
        </div>
        <span aria-hidden className="hs-break tb-break" />
        <WindowSwitch value={w} onChange={setW} tabClassName="hs-ut" className="tb-win" />
        <p className="tb-rule" title={ruleText}>
          {ruleText}
        </p>
        <span className="meta tb-count hs-m">
          <span className="num">
            {count.n}/{count.N}
          </span>
        </span>
        <VersionMenu current="heatsheet" className="tb-menu" />
        <ChainSwitch className="tb-chain" />
      </header>

      <CommandLine
        inputRef={inputRef}
        draft={draft}
        setDraft={setDraft}
        committedText={query.text}
        onCommit={commit}
        errors={errors}
        count={count}
        qb1={{ amount: amt1, setAmount: setAmt1, presets: presets1 }}
        qb2={{ amount: amt2, setAmount: setAmt2, presets: presets2 }}
        set={set}
        setSet={setSet}
        onKeys={() => setKeysOpen(true)}
      />

      <p className="rule-m hs-m">{ruleText}</p>

      <Board
        gridId={gridId}
        scrollerRef={scrollerRef}
        tab={tab}
        w={w}
        display={display}
        rankOf={rankOf}
        ranks24={ranks24}
        rankedAt={order.rankedAt}
        sel={sel}
        starred={starSet}
        starCount={stars.length}
        art={art}
        solAmt={amt1}
        ethAmt={amt2}
        sort={sort}
        onSort={onSort}
        tokens={query.tokens}
        blacklist={blacklist}
        hidden={hidden}
        onEcho={onEcho}
        onClear={() => commit("")}
        onSelect={onSelect}
        onBuy={onBuy}
        onPointerInside={onPointerInside}
        onFocusInside={onFocusInside}
        onTouchHold={onTouchHold}
      />

      <Dock
        ticker={sel}
        n={sel ? (rankOf[sel] ?? null) : null}
        src={sel ? art[sel] : undefined}
        off={off}
        w={w}
        solAmt={amt1}
        ethAmt={amt2}
        onBuy={onBuy}
        onReveal={() => reveal(sel)}
        onCopy={onCopy}
      />

      <footer className="st">
        <div className="st-line hs-d">
          <Disclosure variant="cells" className="st-disc" />
          <SimToggle className="st-cell" />
          <span className="st-cell st-order-cell">{orderCell}</span>
          {devBad && <span className="meta st-cell text-rim">Dev · warn drawn as bad</span>}
          <ReconCountdown className="st-cell st-long" />
          <SpotCells className="st-cell st-spot" />
          <button type="button" className="meta st-keys hover:text-bone" onClick={() => setKeysOpen(true)}>
            ? Keys
          </button>
        </div>
        <div className="st-m hs-m">
          <Disclosure variant="line" className="st-mline" />
          <div className="st-m3">
            <SimToggle />
            <span className="st-order-cell">{orderCell}</span>
            <ReconCountdown />
          </div>
        </div>
      </footer>

      {keysOpen && <KeysDialog onClose={() => setKeysOpen(false)} />}
    </main>
  );
}
