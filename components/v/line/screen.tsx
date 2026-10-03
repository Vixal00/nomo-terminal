"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BullMark } from "@/components/brand";
import { useChain } from "@/components/chain";
import { CloseMark } from "@/components/marks";
import {
  CORE_HOTKEYS,
  ChainSwitch,
  Disclosure,
  ReconCountdown,
  SimToggle,
  SpotCells,
  Tip,
  UnderlineTab,
  VersionMenu,
  WindowSwitch,
  useHotkeys,
  usePlaceholderBuy,
  useQuickBuy,
  useToast,
} from "@/components/trending";
import { LABELS } from "@/lib/labels";
import {
  EMPTY_FILTER,
  TABS,
  WINDOWS,
  applyFilter,
  rowOf,
  trendingRows,
  type Tab,
  type TrendingFilter,
  type Window,
} from "@/lib/trending";
import { useBoardInView, useLiveOrder, useMarketSim } from "@/lib/trending-live";
import type { Tier } from "@/lib/data";
import * as fmt from "@/lib/format";
import { Dossier, PathLegend, type QbPair } from "./dossier";
import { FiltersDialog, QbPresets, TierChips, Toggle } from "./filters";
import { LINE_COPY, atRisk, meetsMinimums, useMode, usePersistedList } from "./lifecycle";
import { Pane } from "./pane";
import type { Kind, SelectHow } from "./row";

/* The Line: Trending split by the graduation line.

   Graduated coins sit above the band and coins still on the curve sit
   below it. Both panes rank by the tab's one rule and share one column
   grid, so the node column, where a coin graduates, falls at the same x
   in both and on the band between them. The band is the page's one bold
   object; everything else is hairlines and figures.

   CSS owns the layout at every width. The only thing JS decides from
   the viewport is where the dossier mounts (rail, drawer or under the
   card), and it decides nothing until after hydration, so the server
   render at any width is already the right layout. */

const TAB_LABEL: Record<Tab, string> = {
  trending: "Trending",
  top: "Top",
  new: "New",
  final: "Final",
  z500: "Z500",
  starred: "Starred",
};

const ROW_PITCH = 36;
/* The band word's tip is about 80px tall at its 280px width, plus its
   6px offset. Below this much room it opens upward instead. */
const BAND_TIP_ROOM = 120;

export function Screen({ art }: { art: Record<string, string> }) {
  const sim = useMarketSim();
  const mode = useMode();
  const [chain] = useChain();
  const toast = useToast();
  const buy = usePlaceholderBuy();
  const qb1 = useQuickBuy(1);
  const qb2 = useQuickBuy(2);
  const qb = chain === 2 ? qb2 : qb1;

  const [tab, setTab] = useState<Tab>("trending");
  const [w, setW] = useState<Window>("1h");
  const [search, setSearch] = useState("");
  const [limits, setLimits] = useState<Pick<TrendingFilter, "mcMin" | "mcMax" | "liqMin">>(EMPTY_FILTER);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [risk, setRisk] = useState(false);
  const [minimums, setMinimums] = useState(false);
  // The page calls it the hidden list, but it is the same blacklist the
  // other four versions keep under this key, in the same "$TICKER"
  // entries, so a coin hidden on one of them stays hidden here.
  const [hidden, hide, unhide, unhideAll] = usePersistedList("ansem.terminal.blacklist");
  const [stars, addStar, removeStar] = usePersistedList("ansem.terminal.stars");
  const [sel, setSel] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [inline, setInline] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "filters" | "hidden">(null);
  const navByKey = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLElement>(null);
  const gradScroll = useRef<HTMLDivElement>(null);
  const curveScroll = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useBoardInView(boardRef);

  /* ------------------------------------------------------ The order */

  const base = useMemo<TrendingFilter>(
    () => ({
      search: search || undefined,
      blacklist: hidden.length ? hidden : undefined,
      tiers: tiers.length ? tiers : undefined,
      mcMin: limits.mcMin ?? null,
      mcMax: limits.mcMax ?? null,
      liqMin: limits.liqMin ?? null,
    }),
    [search, hidden, tiers, limits],
  );
  // Stars only change the order on the Starred tab; passing them on the
  // others would re-rank the board each time a star is toggled.
  const starOpt = tab === "starred" ? stars : undefined;
  const gradOrder = useLiveOrder(tab, w, { ...base, stage: "migrated" }, { starred: starOpt });
  const curveOrder = useLiveOrder(tab, w, { ...base, stage: "curve" }, { starred: starOpt });

  /* The two post-filters read the simulated cap and liquidity, but only
     when the order itself is recomputed: a row must not drop out of a
     frozen pane under the pointer because its cap ticked. */
  const gradList = useMemo(
    () => (risk ? gradOrder.tickers.filter((t) => atRisk(sim.row(t)!, sim.value(t, w, "mc"))) : gradOrder.tickers),
    [gradOrder.tickers, risk, sim, w],
  );
  const curveList = useMemo(
    () =>
      minimums
        ? curveOrder.tickers.filter((t) => meetsMinimums(sim.row(t)!, sim.value(t, w, "liquidity")))
        : curveOrder.tickers,
    [curveOrder.tickers, minimums, sim, w],
  );
  const lists = useRef({ grad: gradList, curve: curveList });
  lists.current = { grad: gradList, curve: curveList };

  /* What the hidden list takes out, by the foundation's own blacklist
     rule (an entry can match a name as well as a ticker), so the panes
     and the Starred count can tell hidden from filtered or absent. */
  const blacklisted = useMemo<ReadonlySet<string>>(() => {
    if (!hidden.length) return new Set();
    const all = trendingRows();
    const kept = new Set(applyFilter(all, { blacklist: hidden }, "24h").map((r) => r.ticker));
    return new Set(all.filter((r) => !kept.has(r.ticker)).map((r) => r.ticker));
  }, [hidden]);
  // The tab counts the starred coins the Starred tab can show: a hidden
  // one is still starred, but the pane says so rather than the count.
  const starCount = stars.filter((t) => rowOf(t) && !blacklisted.has(t)).length;

  /* ------------------------------------------------------ Selection */

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const selRef = useRef(sel);
  selRef.current = sel;

  const onSelect = useCallback((t: string, how: SelectHow) => {
    setSel(t);
    if (how === "focus") return;
    navByKey.current = false;
    const m = modeRef.current;
    if (m === "desk") setDrawer(true);
    else if (m === "stack") setInline((cur) => (cur === t ? null : t));
  }, []);

  const focusRow = useCallback((t: string) => {
    const li = document.querySelector<HTMLElement>(`.v-line .lrow[data-ticker="${t}"]`);
    li?.querySelector<HTMLElement>(".hit")?.focus({ preventScroll: true });
    li?.scrollIntoView({ block: "nearest" });
    setSel(t);
  }, []);

  const keyMove = (t: string) => {
    navByKey.current = true;
    // Cards don't jump under the reader: a key move closes the inline
    // dossier. The drawer stays open and follows the selection.
    setInline(null);
    focusRow(t);
  };

  const move = (dir: 1 | -1) => {
    const flat = [...lists.current.grad, ...lists.current.curve];
    if (!flat.length) return;
    const i = sel ? flat.indexOf(sel) : -1;
    if (i === -1) return keyMove(flat[0]);
    const j = i + dir;
    if (j < 0 || j >= flat.length) return;
    keyMove(flat[j]);
  };

  /** L: to the other side of the line, at the same height on screen. */
  const cross = () => {
    if (!sel) return;
    const from: Kind | null = lists.current.grad.includes(sel) ? "grad" : lists.current.curve.includes(sel) ? "curve" : null;
    if (!from) return;
    const to: Kind = from === "grad" ? "curve" : "grad";
    const other = lists.current[to];
    if (!other.length) return;
    const idx = lists.current[from].indexOf(sel);
    const top = (from === "grad" ? gradScroll : curveScroll).current?.scrollTop ?? 0;
    const otherTop = (to === "grad" ? gradScroll : curveScroll).current?.scrollTop ?? 0;
    const vis = idx - Math.floor(top / ROW_PITCH);
    const target = Math.max(0, Math.min(other.length - 1, Math.floor(otherTop / ROW_PITCH) + vis));
    keyMove(other[target]);
  };

  const toggleStar = (t: string) => {
    if (stars.includes(t)) removeStar(t);
    else addStar(t);
  };

  const hideCoin = (t: string) => {
    const pane = lists.current.grad.includes(t) ? lists.current.grad : lists.current.curve.includes(t) ? lists.current.curve : null;
    let next: string | null = null;
    if (pane) {
      const i = pane.indexOf(t);
      next = pane[i + 1] ?? pane[i - 1] ?? null;
    }
    const hadFocus = !!document.activeElement?.closest?.(`.lrow[data-ticker="${t}"]`);
    hide(`$${t}`);
    setInline((cur) => (cur === t ? null : cur));
    toast({ title: `$${t} hidden. Restore it from the hidden list.`, tone: "info" });
    if (next && hadFocus) focusRow(next);
    else setSel(next);
  };

  const clearFilters = useCallback(() => {
    setSearch("");
    setLimits(EMPTY_FILTER);
    setTiers([]);
    setRisk(false);
    setMinimums(false);
  }, []);

  const drawerShown = mode === "desk" && drawer && sel !== null;
  const inlineShown = mode === "stack" && inline !== null;

  const closeDossier = useCallback(() => {
    const inside = document.activeElement?.closest?.(".drawer, .inline-dossier");
    setDrawer(false);
    setInline(null);
    // Focus goes back to the row the dossier was about, not to the page.
    const s = selRef.current;
    if (inside && s) requestAnimationFrame(() => focusRow(s));
  }, [focusRow]);

  /* --------------------------------------------------------- Keys */

  const cycleTab = (d: 1 | -1) => {
    const i = TABS.indexOf(tab);
    setTab(TABS[(i + d + TABS.length) % TABS.length]);
  };

  useHotkeys({
    j: () => move(1),
    ArrowDown: () => move(1),
    k: () => move(-1),
    ArrowUp: () => move(-1),
    "/": () => searchRef.current?.focus(),
    Escape: () => {
      if (search) return setSearch("");
      if (drawerShown || inlineShown) return closeDossier();
      setSel(null);
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
    b: () => {
      if (sel) buy(sel, qb[0], qb[3]);
      else toast({ title: LINE_COPY.NOTHING_SELECTED, tone: "info" });
    },
    p: () => sim.setPaused(!sim.paused()),
    "1": () => setW(WINDOWS[0]),
    "2": () => setW(WINDOWS[1]),
    "3": () => setW(WINDOWS[2]),
    "4": () => setW(WINDOWS[3]),
    "[": () => cycleTab(-1),
    "]": () => cycleTab(1),
    h: () => sel && hideCoin(sel),
    s: () => sel && toggleStar(sel),
    l: () => cross(),
  });

  /* Below 1024 the band docks above the sticky status bar until the
     page reaches it, and rows scroll clear of both. Their heights vary
     with the wrapped disclosure and the two-line phone band, so they
     are measured and handed to CSS, as the gutter is below. */
  useEffect(() => {
    const root = rootRef.current;
    const st = statusRef.current;
    const band = bandRef.current;
    if (!root || !st || !band) return;
    const set = () => {
      root.style.setProperty("--line-status-h", `${st.offsetHeight}px`);
      root.style.setProperty("--line-band-h", `${band.offsetHeight}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(st);
    ro.observe(band);
    return () => ro.disconnect();
  }, []);

  /* Docked above the status bar, the band has no room beneath it: the
     word's tooltip opened downward under the bar, which paints over it,
     and at 768 ran past the screen's bottom edge, so on the first screen
     the definition of the line could not be read. It opens upward
     whenever the room between the band and the bar is short of a tip,
     and downward again once the band is stuck to the top. The desktop
     board always has 300px or more there and never flips. Starts
     downward so the server and the first client render agree. */
  const [bandTipUp, setBandTipUp] = useState(false);
  useEffect(() => {
    const band = bandRef.current;
    const st = statusRef.current;
    if (!band || !st) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const room = Math.min(st.getBoundingClientRect().top, window.innerHeight) - band.getBoundingClientRect().bottom;
      setBandTipUp(room < BAND_TIP_ROOM);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* The band's axis has to share the panes' content width, and the
     panes reserve a scrollbar gutter that CSS can't name. The band
     can't reserve its own (that needs overflow: hidden, which would
     clip the word's tooltip), so the gutter is measured off the
     scroller and handed to the band as a variable. Written to the node:
     it is layout, not state. */
  useEffect(() => {
    const stage = stageRef.current;
    const sc = gradScroll.current;
    if (!stage || !sc) return;
    const set = () => stage.style.setProperty("--line-gutter", `${sc.offsetWidth - sc.clientWidth}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(sc);
    return () => ro.disconnect();
  }, []);

  /* ----------------------------------------------------- Derived */

  const echo: string[] = [];
  if (limits.mcMin != null) echo.push(`Mcap ≥ ${fmt.usd(limits.mcMin)}`);
  if (limits.mcMax != null) echo.push(`Mcap ≤ ${fmt.usd(limits.mcMax)}`);
  if (limits.liqMin != null) echo.push(`Liq ≥ ${fmt.usd(limits.liqMin)}`);
  if (tiers.length) echo.push(tiers.join(", "));

  // The toggles sit in their own panes' strips and show their state
  // there, so the count and the echo cover what the dialog holds.
  const limitCount = [limits.mcMin, limits.mcMax, limits.liqMin].filter((v) => v != null).length;
  const allCount = limitCount + (tiers.length ? 1 : 0);

  const qbPair: QbPair = { 1: { amount: qb1[0], unit: qb1[3] }, 2: { amount: qb2[0], unit: qb2[3] } };

  const dossierFor = (t: string, variant: "rail" | "drawer" | "inline") => (
    <Dossier
      key={t}
      ticker={t}
      src={art[t]}
      w={w}
      variant={variant}
      starred={stars.includes(t)}
      qb={qbPair}
      onStar={() => toggleStar(t)}
      onHide={() => hideCoin(t)}
      onClose={variant === "rail" ? undefined : closeDossier}
    />
  );

  // Each toggle narrows one pane only, so each pane counts its own.
  const narrowedBoth = !!search || allCount > 0;

  const paneProps = {
    tab,
    w,
    sel,
    inline: mode === "stack" ? inline : null,
    stars,
    blacklisted,
    echo,
    art,
    qbAmount: qb[0],
    qbUnit: qb[3],
    navByKey,
    onSelect,
    onClearFilters: clearFilters,
    onShowHidden: () => setDialog("hidden"),
    renderInline: (t: string) => dossierFor(t, "inline"),
  };

  const gradEmpty = gradList.length === 0;
  const curveEmpty = tab === "z500" || curveList.length === 0;
  const stageEmpty = gradEmpty ? (curveEmpty ? "both" : "grad") : curveEmpty ? "curve" : undefined;

  /* Arrow keys, Home and End move along the tabs, as a tablist's do:
     only the selected tab is a tab stop, so without them the other
     four are out of reach from the keyboard but for [ and ]. */
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const n = TABS.length;
    const j =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setTab(TABS[j]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[j]?.focus();
  };

  /* The core keys first, in the order CORE_HOTKEYS declares them (an
     object walk would put the digits first), then this page's own. */
  const KEY_ORDER = ["j", "k", "/", "Escape", "b", "p", "1", "2", "3", "4", "[", "]", "h", "s"] as const;
  const keyHelp = (
    <span className="keys">
      {KEY_ORDER.map((k) => (
        <span key={k} className="kh">
          <span className="num">{k === "Escape" ? "Esc" : k.toUpperCase()}</span> {CORE_HOTKEYS[k]}
        </span>
      ))}
      <span className="kh">
        <span className="num">L</span> {LINE_COPY.CROSS_KEY}
      </span>
    </span>
  );

  return (
    <div ref={rootRef} className="v-line face-sans">
      {/* ------------------------------------------------ Masthead */}
      <header className="mast">
        <Link href="/" className="brand" aria-label="Ansem Terminal, all versions">
          <BullMark className="h-5 w-5 text-bone" />
          <span className="meta text-bone">Ansem Terminal</span>
        </Link>
        <div className="mrow2">
          <div role="tablist" aria-label="Board" className="tabs" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <UnderlineTab key={t} role="tab" controls="line-board" on={tab === t} onClick={() => setTab(t)} className="ut">
                {TAB_LABEL[t]}
                {t === "starred" && starCount > 0 && <span className="num tcount">{starCount}</span>}
              </UnderlineTab>
            ))}
          </div>
          <span className="grow" />
          <div className="search">
            <input
              ref={searchRef}
              id="line-search"
              type="search"
              value={search}
              placeholder={LINE_COPY.SEARCH_PLACEHOLDER}
              aria-label="Search coins"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.preventDefault();
                if (search) {
                  setSearch("");
                  e.stopPropagation();
                } else e.currentTarget.blur();
              }}
            />
            {search ? (
              <button type="button" className="sclear" aria-label="Clear the search" onClick={() => setSearch("")}>
                <CloseMark className="h-3 w-3" />
              </button>
            ) : (
              <kbd className="kcap" aria-hidden>
                /
              </kbd>
            )}
          </div>
        </div>
        <VersionMenu current="line" className="vmenu" />
        <ChainSwitch className="chain" />
      </header>

      {/* ------------------------------------------------- Toolbar */}
      <div className="tools">
        <WindowSwitch value={w} onChange={setW} className="wins" tabClassName="ut" />
        <span className="sep ge1280" aria-hidden />
        <TierChips tiers={tiers} onChange={setTiers} className="ge1280" />
        <span className="sep ge1024" aria-hidden />
        <button type="button" className="tbtn fbtn" aria-haspopup="dialog" onClick={() => setDialog("filters")}>
          <span className="meta">Filters</span>
          <span className="num ge1280i">{limitCount}</span>
          <span className="num lt1280i">{allCount}</span>
        </button>
        <button type="button" className="tbtn ge1024" aria-haspopup="dialog" onClick={() => setDialog("hidden")}>
          <span className="meta">Hidden</span>
          <span className="num">{hidden.length}</span>
        </button>
        <span className="grow" />
        <span className="ge1024 qbs">
          <QbPresets qb={qb1} className="only-chain1 flex" />
          <QbPresets qb={qb2} className="only-chain2 flex" />
        </span>
      </div>

      {/* --------------------------------------------------- Board */}
      <main ref={boardRef} className="board" aria-label="Board" data-drawer={drawerShown || undefined}>
        <div
          ref={stageRef}
          id="line-board"
          role="tabpanel"
          aria-label={`${TAB_LABEL[tab]}, ${w}`}
          className="stage"
          data-empty={stageEmpty}
        >
          <Pane
            kind="grad"
            list={gradList}
            order={gradOrder}
            scrollRef={gradScroll}
            narrowed={narrowedBoth || risk}
            toggle={<Toggle on={risk} onChange={setRisk} label={LINE_COPY.AT_RISK_LABEL} tip={LINE_COPY.AT_RISK_TIP} />}
            {...paneProps}
          />

          {/* A labelled section rather than role="separator": a separator's
              children are presentational, and the band's rules and
              countdown are content a screen reader should reach. */}
          <section ref={bandRef} className="band" aria-label="Graduation">
            {/* The square alone marks the node: the panes draw the axis
                it sits on, so no registration arms are needed here. */}
            <div className="axis" aria-hidden>
              <span className="ax">
                <span className="node-sq" />
              </span>
            </div>
            <div className="cells">
              <Tip label={LINE_COPY.BAND_WORD_TIP} side={bandTipUp ? "top" : "bottom"} className="word">
                <span className="display">Graduation</span>
              </Tip>
              <span className="cell a">{LINE_COPY.BAND_SEATED}</span>
              <span className="cell b">{LINE_COPY.BAND_MERIT}</span>
              <span className="cell c" title={LINE_COPY.NO_SEAT_TITLE}>
                {LINE_COPY.NO_SEAT_LABEL}: <span className="meta">{LABELS.NOT_TRACKED}</span>
              </span>
              <span className="grow" />
              <ReconCountdown className="count" />
            </div>
          </section>

          <Pane
            kind="curve"
            list={curveList}
            order={curveOrder}
            scrollRef={curveScroll}
            narrowed={narrowedBoth || minimums}
            toggle={
              <Toggle on={minimums} onChange={setMinimums} label={LINE_COPY.MINIMUMS_LABEL} tip={LINE_COPY.MINIMUMS_TIP} />
            }
            {...paneProps}
          />
        </div>

        <aside className="rail" aria-label="Selected coin">
          {mode === "wide" && sel ? dossierFor(sel, "rail") : <PathLegend />}
        </aside>

        {drawerShown && sel && (
          <aside className="drawer" aria-label="Selected coin">
            {dossierFor(sel, "drawer")}
          </aside>
        )}
      </main>

      {/* -------------------------------------------------- Status */}
      <footer ref={statusRef} className="status">
        <Disclosure variant="cells" className="dsc-cells" />
        <Disclosure variant="line" className="dsc-line" />
        <SimToggle className="simt" />
        <SpotCells className="spot" />
        <span className="grow" />
        <Tip label={keyHelp} side="top" align="end" className="khelp" tipClassName="khtip">
          {/* The shared keys first, as in the tip; L and Enter are this
              page's own and come after the rule. */}
          <span className="meta">J K / B P H S · L ↵</span>
        </Tip>
      </footer>

      <FiltersDialog
        open={dialog}
        onClose={() => setDialog(null)}
        limits={limits}
        onLimits={setLimits}
        tiers={tiers}
        onTiers={setTiers}
        hidden={hidden}
        onRestore={unhide}
        onRestoreAll={unhideAll}
        qb1={qb1}
        qb2={qb2}
      />
    </div>
  );
}
