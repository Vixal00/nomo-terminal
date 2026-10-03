"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChain } from "@/components/chain";
import { amountText, useHotkeys, usePlaceholderBuy, useQuickBuy, useToast, type HotkeyMap } from "@/components/trending";
import { LABELS, RANK_RULE } from "@/lib/labels";
import {
  EMPTY_FILTER,
  WINDOWS,
  activeFilterCount,
  applyFilter,
  commitDraft,
  draftOf,
  rank,
  type TrendingFilter,
  type Window,
} from "@/lib/trending";
import { useBoardInView, useLiveOrder, useMarketSim } from "@/lib/trending-live";
import { COPY, DC_TABS, TAB_NAME, type DcTab, type TapeMode } from "./copy";
import { AMOUNT_KEYS, EMPTY_AMOUNTS, FilterBar, type AmountDraft, type AmountKey } from "./filter-bar";
import { Masthead } from "./masthead";
import type { SelectHow } from "./row";
import { StatusBar } from "./status-bar";
import { BLACKLIST_KEY, STARS_KEY, useStoredList } from "./store";
import { Table, type Empty } from "./table";
import { Tape } from "./tape";
import { ViewTabs } from "./view-tabs";

/* Discover: the reference screen ("Arteria"), rebranded.

   The same regions in the same order and proportions: masthead, ticker
   tape, view tabs, a filter card, a table card of tall pair rows with a
   chart and a token-info block and a buy key on each, and a status strip
   fixed to the bottom. Where the reference shows something nothing here
   backs (a balance, watchers, insiders, a "Paid" flag, a BNB price, a
   connection that is "stable"), the cell is replaced with the Ansem
   figure that fits it or left out, and the three disclosure facts sit
   where its status pills were.

   Trending ranks by turnover (trades for their size), not raw trades: on
   raw trades the Z500 fills nine or ten of the top ten rows in every
   window, and only seated rows carry a Z500 tag. */

const ruleOf = (tab: DcTab, w: Window) =>
  tab === "trending"
    ? RANK_RULE.turnover(w)
    : tab === "top"
      ? RANK_RULE.top()
      : tab === "z500"
        ? RANK_RULE.z500()
        : RANK_RULE.starred(w);

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const [chain] = useChain();
  const toast = useToast();
  const buy = usePlaceholderBuy();
  // Both networks' sizes, so the cascade can show either on first paint.
  const qb1 = useQuickBuy(1);
  const qb2 = useQuickBuy(2);
  const amt1 = amountText(qb1[0]);
  const amt2 = amountText(qb2[0]);

  const cardRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const qbRef = useRef<HTMLDivElement>(null);
  useBoardInView(cardRef);

  const [tab, setTab] = useState<DcTab>("trending");
  const [w, setW] = useState<Window>("1h");
  const [tapeMode, setTapeMode] = useState<TapeMode>("trending");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [stars, setStars, starsReady] = useStoredList(STARS_KEY);
  const [blacklist, setBlacklist] = useStoredList(BLACKLIST_KEY);
  const [blOpen, setBlOpen] = useState(false);
  // A ticker, not an index, so a re-rank can't move a buy onto another coin.
  const [selected, setSelected] = useState<string | null>(null);

  /* ---- filters: draft, applied echo, committed ----
     The amounts are edited as a draft and committed on Filter (or Enter).
     `applied` is the draft as it was last committed, so the key can say
     "No changes" when there is nothing to apply, and a field that didn't
     parse keeps showing what the reader typed (with the error) while the
     board keeps the last good value. Search is not drafted: it filters
     as it is typed, like the reference's search. */
  const [limits, setLimits] = useState<TrendingFilter>(EMPTY_FILTER);
  const [draft, setDraft] = useState<AmountDraft>(EMPTY_AMOUNTS);
  const [applied, setApplied] = useState<AmountDraft>(EMPTY_AMOUNTS);
  const [errors, setErrors] = useState<Partial<Record<AmountKey, string>>>({});
  const dirty = AMOUNT_KEYS.some((k) => draft[k].trim() !== applied[k].trim());

  const setField = useCallback((k: AmountKey, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => {
      if (!e[k] && !(k === "mcMin" && e.mcMax)) return e;
      const next = { ...e };
      delete next[k];
      if (k === "mcMin") delete next.mcMax;
      return next;
    });
  }, []);

  const onApply = useCallback(() => {
    const { filter: next, errors: errs } = commitDraft({ ...draftOf(EMPTY_FILTER), ...draft }, limits);
    // Always safe by contract: a field that didn't parse, or an inverted
    // cap range, keeps its last committed value.
    setLimits({ mcMin: next.mcMin, mcMax: next.mcMax, volMin: next.volMin, liqMin: next.liqMin });
    const echo: AmountDraft = { ...draft };
    for (const k of AMOUNT_KEYS) if (errs[k]) echo[k] = applied[k];
    if (errs.mcMax) echo.mcMin = applied.mcMin;
    setApplied(echo);
    const e: Partial<Record<AmountKey, string>> = {};
    for (const k of AMOUNT_KEYS) if (errs[k]) e[k] = errs[k];
    setErrors(e);
  }, [draft, applied, limits]);

  const clearFilters = useCallback(() => {
    setLimits(EMPTY_FILTER);
    setDraft(EMPTY_AMOUNTS);
    setApplied(EMPTY_AMOUNTS);
    setErrors({});
    setSearch("");
  }, []);

  const filter = useMemo<TrendingFilter>(
    () => ({ ...limits, search: search.trim() || undefined, blacklist: blacklist.length ? blacklist : undefined }),
    [limits, search, blacklist],
  );
  const activeCount = activeFilterCount({ ...limits, search: search.trim() || undefined });

  const order = useLiveOrder(tab, w, filter, {
    starred: stars,
    rule: tab === "trending" ? "turnover" : undefined,
  });
  const { tickers } = order;

  /* ---- holding the order ----
     Held while the mouse is over the table card and while keyboard focus
     is in it: the buy key on every row is only safe because the row
     under the pointer can't be swapped for another. */
  const hold = useRef({ hover: false, focus: false });
  const setFrozen = useRef(order.setFrozen);
  setFrozen.current = order.setFrozen;
  const sync = useCallback(() => setFrozen.current(hold.current.hover || hold.current.focus), []);
  const onHover = useCallback(
    (on: boolean) => {
      hold.current.hover = on;
      sync();
    },
    [sync],
  );
  const onFocusIn = useCallback(
    (on: boolean) => {
      hold.current.focus = on;
      sync();
    },
    [sync],
  );

  /* ---- selection ---- */
  const rowEl = (t: string) =>
    cardRef.current?.querySelector<HTMLElement>(`.dc-row[data-ticker="${CSS.escape(t)}"]`) ?? null;

  const onSelect = useCallback(
    (t: string, how: SelectHow) => {
      setSelected(t);
      if (how === "click") toast({ tone: "info", title: LABELS.NO_PAGE });
    },
    [toast],
  );

  // A selected coin that leaves the view (hidden, filtered out) is let go.
  useEffect(() => {
    if (selected && !tickers.includes(selected)) setSelected(null);
  }, [tickers, selected]);

  const reveal = (t: string, focus: boolean) => {
    const el = rowEl(t);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const head = cardRef.current?.querySelector<HTMLElement>(".dc-head")?.offsetHeight ?? 0;
    const foot = document.querySelector<HTMLElement>(".v-discover .dc-status")?.offsetHeight ?? 0;
    if (r.top < head || r.bottom > window.innerHeight - foot) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    if (focus) el.focus({ preventScroll: true });
  };

  const move = (d: 1 | -1) => {
    if (!tickers.length) return;
    const i = selected ? tickers.indexOf(selected) : -1;
    const next = i < 0 ? tickers[0] : tickers[Math.max(0, Math.min(tickers.length - 1, i + d))];
    setSelected(next);
    const onBoard = cardRef.current?.contains(document.activeElement) ?? false;
    requestAnimationFrame(() => reveal(next, onBoard));
  };

  /* ---- tabs, with each view's scroll position kept ---- */
  const scrollByTab = useRef<Partial<Record<DcTab, number>>>({});
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const goTab = useCallback((next: DcTab) => {
    if (next === tabRef.current) return;
    scrollByTab.current[tabRef.current] = window.scrollY;
    setTab(next);
  }, []);
  useLayoutEffect(() => {
    const y = scrollByTab.current[tab];
    if (y !== undefined) {
      window.scrollTo({ top: y, behavior: "instant" });
      return;
    }
    // A view not visited yet opens at its first row: a reader down in
    // the list is brought back to where the table starts.
    const card = cardRef.current;
    if (!card) return;
    const top = card.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
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
      if (!blacklist.includes(`$${t}`)) setBlacklist([...blacklist, `$${t}`]);
      setSelected(next);
      toast({ tone: "info", title: COPY.HIDDEN(t) });
    },
    [tickers, blacklist, setBlacklist, toast],
  );
  // The size is read at the press, through a ref, so the callback (and
  // with it every memoised row) stays the same object across renders.
  const size = useRef({ chain, sol: qb1[0], eth: qb2[0] });
  size.current = { chain, sol: qb1[0], eth: qb2[0] };
  const onBuy = useCallback(
    (t: string) => {
      const s = size.current;
      if (s.chain === 2) buy(t, s.eth, "ETH");
      else buy(t, s.sol, "SOL");
    },
    [buy],
  );
  const onCopy = useCallback(
    (t: string) => {
      const row = sim.row(t);
      if (!row) return;
      const done = () =>
        toast({ tone: "info", title: COPY.COPIED, body: row.mintResolves ? undefined : LABELS.MINT_PLACEHOLDER });
      try {
        navigator.clipboard.writeText(row.mint).then(done, () => toast({ tone: "fail", title: COPY.COPY_FAILED }));
      } catch {
        toast({ tone: "fail", title: COPY.COPY_FAILED });
      }
    },
    [sim, toast],
  );
  /* Which coins the view lists before any filter: the tab's own
     membership (every coin on Trending and Top, seats on Z500, stars on
     Starred). Used to say why a coin isn't on the board, never to rank. */
  const inView = useMemo(
    () => new Set(rank(sim.rows, tab, w, { starred: stars }).map((r) => r.ticker)),
    [sim, tab, w, stars],
  );
  const onBoard = useMemo(() => new Set(tickers), [tickers]);
  const whyNot = useCallback(
    (t: string) => (onBoard.has(t) ? null : inView.has(t) ? COPY.WHY_FILTERS : COPY.WHY_VIEW(TAB_NAME[tab])),
    [onBoard, inView, tab],
  );
  const onChip = useCallback(
    (t: string) => {
      const why = whyNot(t);
      if (why) {
        toast({ tone: "info", title: COPY.NOT_IN_VIEW(t, why) });
        return;
      }
      setSelected(t);
      requestAnimationFrame(() => reveal(t, true));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [whyNot, toast],
  );
  const focusQuickBuy = useCallback(() => {
    const root = qbRef.current;
    if (!root) return;
    const btn = [...root.querySelectorAll<HTMLButtonElement>('button[aria-pressed="true"]')].find((b) => b.offsetParent !== null);
    btn?.focus();
    root.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, []);

  /* ---- keys: the core map, same meaning on every version ---- */
  const needSel = (fn: (t: string) => void) => () => {
    if (selected) fn(selected);
    else toast({ tone: "info", title: COPY.NO_SELECTION });
  };
  const stepTab = (d: 1 | -1) => goTab(DC_TABS[(DC_TABS.indexOf(tab) + d + DC_TABS.length) % DC_TABS.length]);
  const keys: HotkeyMap = {
    j: () => move(1),
    ArrowDown: () => move(1),
    k: () => move(-1),
    ArrowUp: () => move(-1),
    "/": () => {
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    },
    Escape: () => {
      if (search) setSearch("");
      else if (selected) setSelected(null);
    },
    b: needSel(onBuy),
    p: () => sim.setPaused(!sim.paused()),
    "[": () => stepTab(-1),
    "]": () => stepTab(1),
    h: needSel(hide),
    s: needSel(toggleStar),
  };
  WINDOWS.forEach((x, i) => {
    keys[String(i + 1)] = () => setW(x);
  });
  useHotkeys(keys);

  /* ---- what the board says when it is empty ----
     Says the actual cause: no stars yet, the reader's own Blacklist
     hiding the whole view (with a way to the list, since Clear doesn't
     touch it), or the limits and search, which Clear resets. */
  const starSet = useMemo(() => new Set(stars), [stars]);
  let empty: Empty | null = null;
  if (!tickers.length && !(tab === "starred" && !starsReady)) {
    const viewRows = sim.rows.filter((r) => inView.has(r.ticker));
    if (!viewRows.length && tab === "starred") {
      empty = { text: COPY.STARRED_EMPTY, sub: COPY.STARRED_HOW };
    } else if (blacklist.length && viewRows.length && !applyFilter(viewRows, { blacklist }, w).length) {
      empty = {
        text: tab === "starred" ? COPY.STARRED_BLACKLIST : COPY.EMPTY_BLACKLIST,
        action: { label: COPY.OPEN_BLACKLIST, run: () => openBlacklist() },
      };
    } else if (activeCount > 0) {
      empty = { text: COPY.EMPTY, action: { label: COPY.CLEAR, run: clearFilters } };
    } else {
      empty = { text: COPY.EMPTY };
    }
  }
  const openBlacklist = () => {
    setBlOpen(true);
    document.querySelector<HTMLElement>(".v-discover .dc-bl")?.scrollIntoView({ block: "nearest", behavior: "instant" });
  };

  return (
    <main className="v-discover face-sans" data-search={searchOpen || search ? "open" : undefined}>
      <Masthead
        searchRef={searchRef}
        search={search}
        setSearch={setSearch}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        onEscapeEmpty={() => setSelected(null)}
        onStarred={() => goTab("starred")}
        starCount={starsReady ? stars.length : null}
        starredOn={tab === "starred"}
      />
      <Tape
        mode={tapeMode}
        setMode={setTapeMode}
        stars={stars}
        starsReady={starsReady}
        blacklist={blacklist}
        w={w}
        art={art}
        whyNot={whyNot}
        onChip={onChip}
      />
      <ViewTabs tab={tab} onTab={goTab} count={tickers.length} />

      <div className="dc-page">
        <FilterBar
          draft={draft}
          applied={applied}
          errors={errors}
          setField={setField}
          dirty={dirty}
          onApply={onApply}
          activeCount={activeCount}
          onClear={clearFilters}
          search={search}
          setSearch={setSearch}
          blacklist={blacklist}
          setBlacklist={setBlacklist}
          blOpen={blOpen}
          setBlOpen={setBlOpen}
          qb1={qb1}
          qb2={qb2}
          qbRef={qbRef}
          w={w}
          setW={setW}
        />
        {/* The rule the board is ranked by, in the gap over the card it
            ranks, where the reference has nothing. */}
        <p className="dc-rule">{ruleOf(tab, w)}</p>
        {/* A phone shows no title before a press, and the filter card's
            PLACEHOLDER tag is scrolled out of sight there: so the notice
            is set once over the board, where every Buy key is under it. */}
        <p className="dc-qb-note">
          <span className="meta">{LABELS.QB_TAG}</span> {LABELS.QB_TITLE}
        </p>
        <Table
          cardRef={cardRef}
          tickers={tickers}
          w={w}
          selected={selected}
          stars={starSet}
          art={art}
          amt1={amt1}
          amt2={amt2}
          empty={empty}
          onSelect={onSelect}
          onBuy={onBuy}
          onStar={toggleStar}
          onCopy={onCopy}
          onHover={onHover}
          onFocusIn={onFocusIn}
          frozen={order.frozen}
          pending={order.pending}
        />
      </div>

      <StatusBar amt1={amt1} amt2={amt2} onQuickBuy={focusQuickBuy} />
    </main>
  );
}
