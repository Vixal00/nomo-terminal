"use client";

import { tokenNavigation } from "./token-navigation";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowClockwise, ArrowDown, ArrowsDownUp, CheckCircle, Lightning, MagnifyingGlass, Pause, Play, PlusCircle, RocketLaunch, SlidersHorizontal, Star, UsersThree, X } from "@phosphor-icons/react";
import { compact, money, type Token } from "./data";
import { TokenIdentity } from "./token-identity";
import { TokenSignals } from "./token-info";
import { usePulseFeed } from "./pulse-feed";
import { useFeedMotion } from "./feed-motion";
import "./pulse.css";

type ColumnId = "new" | "graduating" | "migrated";
type SortOrder = "age" | "progress" | "mcap" | "volume" | "change";
type ColumnFilter = { minCap: string; minVolume: string; minHolders: string; maxTop10: string; onlyWatchlist: boolean; onlyPaid: boolean };
type FilterSet = Record<ColumnId, ColumnFilter>;
const EMPTY_FILTER: ColumnFilter = { minCap: "", minVolume: "", minHolders: "", maxTop10: "", onlyWatchlist: false, onlyPaid: false };
const COLUMNS = [
  { id: "new", title: "New pairs", stage: "New", hint: "Fresh launches", sort: "age", icon: PlusCircle },
  { id: "graduating", title: "Graduating", stage: "Graduating", hint: "Approaching migration", sort: "progress", icon: RocketLaunch },
  { id: "migrated", title: "Migrated", stage: "Established", hint: "Established pairs", sort: "age", icon: CheckCircle },
] as const;
const FILTER_KEY = "nomo.pulse.filters.v1";
const ageMinutes = (age: string) => Array.from(age.matchAll(/(\d+)\s*([smhdw])/g)).reduce((sum, match) => sum + Number(match[1]) * ({ s: 1 / 60, m: 1, h: 60, d: 1440, w: 10080 }[match[2]] || 1), 0);
const filterCount = (filter: ColumnFilter) => Object.values(filter).filter(Boolean).length;
const validSavedFilter = (value: unknown): value is ColumnFilter => {
  if (!value || typeof value !== "object") return false;
  const filter = value as Partial<ColumnFilter>;
  return [filter.minCap, filter.minVolume, filter.minHolders, filter.maxTop10].every(item => typeof item === "string" && (item === "" || Number.isFinite(Number(item)) && Number(item) >= 0)) && typeof filter.onlyWatchlist === "boolean" && typeof filter.onlyPaid === "boolean";
};

export type PulseWorkspaceProps = {
  tokens: Token[];
  stars: string[];
  onStar: (id: string) => void;
  onSelect: (token: Token) => void;
  onBuy: (token: Token, amount: string) => void;
  quickAmount: string;
  balance?: number;
  presets: number[];
  activePreset: number | null;
};

export function PulseWorkspace({ tokens, stars, onStar, onSelect, onBuy, quickAmount, balance, presets, activePreset }: PulseWorkspaceProps) {
  const [paused, setPaused] = useState(false);
  const [heldColumns, setHeldColumns] = useState({ new: false, graduating: false, migrated: false });
  const onHold = useCallback((column: ColumnId, held: boolean) => setHeldColumns(previous => previous[column] === held ? previous : { ...previous, [column]: held }), []);
  const feed = usePulseFeed(tokens, paused, { New: heldColumns.new, Graduating: heldColumns.graduating, Established: heldColumns.migrated });
  const [mobileColumn, setMobileColumn] = useState<ColumnId>("new");
  const [filters, setFilters] = useState<FilterSet>({ new: { ...EMPTY_FILTER }, graduating: { ...EMPTY_FILTER }, migrated: { ...EMPTY_FILTER } });
  const [filtering, setFiltering] = useState<ColumnId | null>(null);
  const [draft, setDraft] = useState<ColumnFilter>({ ...EMPTY_FILTER });
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(FILTER_KEY) || "null");
      if (saved && typeof saved === "object") {
        const values = saved as Partial<FilterSet>;
        if (validSavedFilter(values.new) && validSavedFilter(values.graduating) && validSavedFilter(values.migrated)) setFilters(values as FilterSet);
      }
    } catch { /* The default view works without browser storage. */ }
  }, []);
  useEffect(() => { if (filtering) dialog.current?.showModal(); else dialog.current?.close(); }, [filtering]);
  const displayedTokens = feed.tokens;
  const togglePause = () => setPaused(value => !value);
  const saveFilters = (next: FilterSet) => { setFilters(next); try { localStorage.setItem(FILTER_KEY, JSON.stringify(next)); } catch { /* Session filters still apply. */ } };
  const applyFilters = (event: FormEvent) => { event.preventDefault(); if (!filtering) return; saveFilters({ ...filters, [filtering]: { ...draft } }); setFiltering(null); };

  return <main className="npu-main">
    <div className="npu-heading"><div><h1>Pulse</h1></div><div className="npu-heading-actions"><button className={`npu-pause ${paused ? "is-paused" : ""}`} onClick={togglePause} aria-pressed={paused} aria-label={paused ? "Resume Pulse updates" : "Pause Pulse updates"}>{paused ? <Play size={12} weight="fill"/> : <Pause size={12} weight="fill"/>}<span>{paused ? "Resume updates" : "Pause updates"}</span></button></div></div>
    <div className="npu-mobile-tabs" role="group" aria-label="Pulse column">{COLUMNS.map(column => <button key={column.id} aria-pressed={mobileColumn === column.id} onClick={() => setMobileColumn(column.id)}>{column.title}<span>{displayedTokens.filter(token => token.stage === column.stage).length}</span></button>)}</div>
    <div className="npu-board">{COLUMNS.map(column => <PulseColumn key={column.id} column={column} tokens={displayedTokens.filter(token => token.stage === column.stage)} stars={stars} onStar={onStar} onSelect={onSelect} onBuy={onBuy} initialAmount={quickAmount} initialPreset={activePreset} presets={presets} balance={balance} activeMobile={mobileColumn === column.id} paused={paused} tick={feed.tick} generations={feed.generations} arrivals={feed.arrivals} onHold={onHold} filter={filters[column.id]} onFilters={() => { setDraft({ ...filters[column.id] }); setFiltering(column.id); }} onResetFilters={() => saveFilters({ ...filters, [column.id]: { ...EMPTY_FILTER } })}/>)}</div>
    <p className="npu-footnote">Hover or focus a column to hold its order.</p>
    <dialog ref={dialog} className="npu-dialog" aria-labelledby="npu-filter-title" onCancel={() => setFiltering(null)} onClick={event => { if (event.target === event.currentTarget) setFiltering(null); }}><form onSubmit={applyFilters}><header><h2 id="npu-filter-title">{COLUMNS.find(column => column.id === filtering)?.title} filters</h2><button className="npu-icon" type="button" aria-label="Close filters" onClick={() => setFiltering(null)}><X size={16}/></button></header><p>Set the metrics you want to see in this column.</p><div className="npu-filter-fields"><label>Minimum market cap<span>$<input type="number" min="0" step="any" value={draft.minCap} onChange={event => setDraft({ ...draft, minCap: event.target.value })} placeholder="Any" autoFocus/></span></label><label>Minimum 24h volume<span>$<input type="number" min="0" step="any" value={draft.minVolume} onChange={event => setDraft({ ...draft, minVolume: event.target.value })} placeholder="Any"/></span></label><label>Minimum holders<span><UsersThree size={12}/><input type="number" min="0" step="1" value={draft.minHolders} onChange={event => setDraft({ ...draft, minHolders: event.target.value })} placeholder="Any"/></span></label><label>Maximum top 10 holdings<span><input type="number" min="0" max="100" step="any" value={draft.maxTop10} onChange={event => setDraft({ ...draft, maxTop10: event.target.value })} placeholder="Any"/>%</span></label></div><label className="npu-checkbox"><input type="checkbox" checked={draft.onlyWatchlist} onChange={event => setDraft({ ...draft, onlyWatchlist: event.target.checked })}/><span>Only tokens on my watchlist</span><Star size={13}/></label><label className="npu-checkbox"><input type="checkbox" checked={draft.onlyPaid} onChange={event => setDraft({ ...draft, onlyPaid: event.target.checked })}/><span>Paid DEX profile</span></label><footer><button className="npu-button" type="button" onClick={() => setDraft({ ...EMPTY_FILTER })}><ArrowClockwise size={12}/>Reset</button><button className="npu-button npu-primary" type="submit">Apply filters</button></footer></form></dialog>
  </main>;
}

function PulseColumn({ column, tokens, stars, onStar, onSelect, onBuy, initialAmount, initialPreset, presets, balance, activeMobile, paused, tick, generations, arrivals, onHold, filter, onFilters, onResetFilters }: {
  column: typeof COLUMNS[number]; tokens: Token[]; stars: string[]; onStar: (id: string) => void; onSelect: (token: Token) => void; onBuy: (token: Token, amount: string) => void; initialAmount: string; initialPreset: number | null; presets: number[]; balance?: number; activeMobile: boolean; paused: boolean; tick: number; generations: Record<string, number>; arrivals: string[]; onHold: (column: ColumnId, held: boolean) => void; filter: ColumnFilter; onFilters: () => void; onResetFilters: () => void;
}) {
  const [profile, setProfile] = useState<{ preset: number | null; custom: string }>({ preset: initialPreset, custom: initialAmount });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`nomo.pulse.profile.${column.id}`) || "null");
      if (saved && (saved.preset === null || Number.isInteger(saved.preset) && saved.preset >= 0 && saved.preset < 3) && typeof saved.custom === "string") setProfile(saved);
    } catch { /* Use the current settings if storage is unavailable. */ }
  }, [column.id]);
  const saveProfile = (next: typeof profile) => {
    setProfile(next);
    try { localStorage.setItem(`nomo.pulse.profile.${column.id}`, JSON.stringify(next)); } catch {}
  };
  const quickAmount = profile.preset === null ? profile.custom : String(presets[profile.preset]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>(column.sort);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const frozenOrder = useRef<string[] | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useFeedMotion(list, tick);
  const needle = search.trim().toLowerCase().replace(/^\$/, "");
  const rows = tokens.filter(token => `${token.symbol} ${token.name} ${token.contract}`.toLowerCase().includes(needle) && (!filter.minCap || token.mcap >= Number(filter.minCap)) && (!filter.minVolume || token.volume >= Number(filter.minVolume)) && (!filter.minHolders || token.holders >= Number(filter.minHolders)) && (!filter.maxTop10 || token.top10Pct <= Number(filter.maxTop10)) && (!filter.onlyWatchlist || stars.includes(token.id)) && (!filter.onlyPaid || token.dexPaid)).sort((a, b) => sort === "age" ? ageMinutes(a.age) - ageMinutes(b.age) : sort === "progress" ? b.progress - a.progress : sort === "mcap" ? b.mcap - a.mcap : sort === "volume" ? b.volume - a.volume : b.change24h - a.change24h);
  const held = hover || focus || scrolled;
  useEffect(() => { onHold(column.id, held); }, [column.id, held, onHold]);
  if (held && !frozenOrder.current) frozenOrder.current = rows.map(token => token.id);
  if (!held) frozenOrder.current = null;
  const displayed = frozenOrder.current ? [...rows].sort((a, b) => { const aIndex = frozenOrder.current!.indexOf(a.id); const bIndex = frozenOrder.current!.indexOf(b.id); return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex); }) : rows;
  useEffect(() => { if (focus && !list.current?.contains(document.activeElement)) setFocus(false); });
  useEffect(() => { frozenOrder.current = null; }, [filter, sort, search]);
  const Icon = column.icon;
  const amount = Number(quickAmount);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const quickBuyError = !amountValid ? "Enter an amount greater than zero." : balance !== undefined && amount > balance ? "Amount exceeds your available balance." : null;
  const buyValid = !quickBuyError;
  const activeFilters = filterCount(filter);

  return <section className={`npu-column ${activeMobile ? "is-mobile-active" : ""}`} aria-label={column.title}>
    <header className="npu-column-header">
      <div className="npu-column-title"><Icon size={13}/><h2>{column.title}</h2><span className="npu-count">{rows.length}</span></div>
      <div className="npu-column-tools">
        <label className="npu-column-amount"><Lightning size={11} weight="fill"/><span>$</span><input aria-label={`Quick buy amount for ${column.title}`} aria-invalid={!amountValid} type="number" min="0" step="any" value={quickAmount} onChange={event => saveProfile({ preset: null, custom: event.target.value })}/></label>
        <div className="npu-profiles" role="group" aria-label={`${column.title} quick-buy profiles`}>{presets.map((value, index) => <button key={index} title={`P${index + 1} · $${value}`} aria-label={`${column.title} profile ${index + 1}, $${value}`} aria-pressed={profile.preset === index} onClick={() => saveProfile({ preset: index, custom: String(value) })}>P{index + 1}</button>)}</div>
        <label className="npu-search"><MagnifyingGlass size={12}/><input aria-label={`Search ${column.title}`} placeholder="Search" value={search} onChange={event => { frozenOrder.current = null; setSearch(event.target.value); }}/>{search && <button aria-label={`Clear ${column.title} search`} onClick={() => setSearch("")}><X size={11}/></button>}</label>
        <label className="npu-sort" title="Sort column"><ArrowsDownUp size={13}/><select aria-label={`Sort ${column.title}`} value={sort} onChange={event => { frozenOrder.current = null; setSort(event.target.value as SortOrder); }}><option value="age">Newest</option>{column.id !== "migrated" && <option value="progress">Curve</option>}<option value="mcap">Market cap</option><option value="volume">Volume</option><option value="change">24h change</option></select></label>
        <button className={`npu-filter-trigger ${activeFilters ? "is-active" : ""}`} onClick={onFilters} aria-label={`Filter ${column.title}${activeFilters ? `, ${activeFilters} active` : ""}`}><SlidersHorizontal size={13}/>{activeFilters > 0 && <span>{activeFilters}</span>}</button>
      </div>
    </header>
    {quickBuyError && <p className="npu-column-error" id={`npu-buy-error-${column.id}`} role="status">{quickBuyError}</p>}
    <div ref={list} data-feed-scope="pulse" className="npu-token-list" onScroll={event => setScrolled(event.currentTarget.scrollTop > 1)} onPointerEnter={event => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHover(true); }} onPointerLeave={() => setHover(false)} onPointerCancel={() => setHover(false)} onFocusCapture={() => setFocus(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}>
      {displayed.map(token => <article className={`npu-token-card${arrivals.includes(token.id) ? " npu-token-arriving" : ""}`} key={`${token.id}:${generations[token.id] || 0}`} data-feed-id={token.id} data-feed-seq={token.updatedAtTick || 0} data-feed-direction={token.direction || 1} {...tokenNavigation(token, onSelect)} aria-label={`${token.symbol}, ${token.name}`}>
        <TokenIdentity token={token} onSelect={onSelect} variant="pulse" trailing={<button className={`npu-star ${stars.includes(token.id) ? "is-starred" : ""}`} aria-label={`${stars.includes(token.id) ? "Remove" : "Add"} ${token.symbol} ${stars.includes(token.id) ? "from" : "to"} watchlist`} aria-pressed={stars.includes(token.id)} onClick={() => onStar(token.id)}><Star size={14} weight={stars.includes(token.id) ? "fill" : "regular"}/></button>}/>
        <div className="npu-card-rail">
          <button disabled={!buyValid} className="npu-buy" title={quickBuyError || undefined} aria-describedby={quickBuyError ? `npu-buy-error-${column.id}` : undefined} aria-label={`Buy ${token.symbol} for $${amountValid ? amount : 0}`} onClick={() => onBuy(token, quickAmount)}><Lightning size={11} weight="fill"/>${amountValid ? compact(amount) : "—"}</button>
          <div className="npu-card-market">
            <span><small>MC</small><strong className="nm-tick-value">{money(token.mcap)}</strong></span>
            <span className="npu-card-activity"><small title="24-hour volume">V</small><strong className="nm-tick-value">{money(token.volume)}</strong><span className="npu-transactions nm-tick-value" title={`${token.buys.toLocaleString("en-US")} buys / ${token.sells.toLocaleString("en-US")} sells`}><small>TX</small>{compact(token.buys + token.sells)}</span></span>
          </div>
        </div>
        <div className="npu-card-signals"><TokenSignals token={token} compact variant="chips" essential/></div>
        <div className={`npu-migration-progress ${column.id === "migrated" ? "is-complete" : ""}`} role="progressbar" aria-label={`${token.symbol} bonding curve`} aria-valuenow={token.progress} aria-valuemin={0} aria-valuemax={100} title={column.id === "migrated" ? "Migration complete" : `Bonding curve: ${token.progress}%`}><i style={{width:`${Math.min(100, token.progress)}%`}}/></div>
      </article>)}
      {displayed.length === 0 && <div className="npu-empty"><MagnifyingGlass size={20}/><strong>No matching pairs</strong><p>Try another search or adjust this column’s filters.</p><button onClick={() => { setSearch(""); onResetFilters(); }}>Reset this column</button></div>}
    </div>
    <footer className="npu-column-footer"><span>{rows.length} of {tokens.length} pairs</span><span className={`npu-column-state ${paused || held ? "is-held" : ""}`}>{paused ? "Paused" : held ? "Held" : ""}</span><span><ArrowDown size={9}/>{sort === "age" ? "Newest first" : sort === "progress" ? "Closest to migration" : sort === "mcap" ? "Highest market cap" : sort === "volume" ? "Highest volume" : "Highest 24h change"}</span></footer>
  </section>;
}
