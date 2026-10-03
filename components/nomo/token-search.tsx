"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowElbowDownLeft, ClockCounterClockwise, MagnifyingGlass, X } from "@phosphor-icons/react";
import { money, percent, type Token } from "./data";
import { TokenAvatar } from "./shared";
import "./token-search.css";

type SearchTab = "Trending" | "Watchlist" | "Recent";
export function TokenSearch({ open, onClose, tokens, stars, onSelect }: { open: boolean; onClose: () => void; tokens: Token[]; stars: string[]; onSelect: (token: Token) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("Trending");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const id = useId();
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("nomo.search.recent") || "[]"); if (Array.isArray(saved)) setRecent(saved.filter((value): value is string => typeof value === "string").slice(0, 8)); } catch {}
  }, []);
  useEffect(() => {
    if (open) { setQuery(""); setActive(0); dialog.current?.showModal(); input.current?.focus(); }
    else dialog.current?.close();
  }, [open]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return tokens.map(token => ({ token, rank: token.symbol.toLowerCase() === q ? 0 : token.symbol.toLowerCase().startsWith(q) ? 1 : token.name.toLowerCase().startsWith(q) ? 2 : `${token.symbol} ${token.name}`.toLowerCase().includes(q) ? 3 : q.length >= 4 && token.contract.toLowerCase().includes(q) ? 4 : 9 })).filter(item => item.rank < 9).sort((a,b) => a.rank-b.rank).map(item => item.token).slice(0,8);
    if (tab === "Recent") return recent.map(value => tokens.find(token => token.id === value)).filter((token): token is Token => !!token);
    if (tab === "Watchlist") return tokens.filter(token => stars.includes(token.id)).slice(0,8);
    return [...tokens].sort((a,b) => b.volume-a.volume).slice(0,8);
  }, [query, tab, recent, tokens, stars]);
  useEffect(() => {if(open && results[active]) document.getElementById(`${id}-${results[active].id}`)?.scrollIntoView({block:"nearest"});}, [active, open, query, tab, id]);
  const select = (token: Token) => {
    const next = [token.id, ...recent.filter(value => value !== token.id)].slice(0,8);
    setRecent(next); try {localStorage.setItem("nomo.search.recent", JSON.stringify(next));} catch {}
    onClose(); onSelect(token);
  };
  return <dialog ref={dialog} className="ns-dialog" aria-labelledby={`${id}-title`} onCancel={onClose} onClick={event => {const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))onClose();}}>
    <div className="ns-header"><h2 id={`${id}-title`}>Find your next move</h2><button type="button" onClick={onClose} aria-label="Close token search"><X size={17}/></button></div>
    <div className="ns-field"><MagnifyingGlass size={19}/><input ref={input} value={query} placeholder="Search by name, ticker or address" aria-label="Search by name, ticker or address" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={results[active] ? `${id}-${results[active].id}` : undefined} onChange={event => {setQuery(event.target.value);setActive(0);}} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {event.preventDefault();if(results.length) setActive(value => (value + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);}
      if (event.key === "Enter" && results[active]) {event.preventDefault(); select(results[active]);}
    }}/>{query && <button type="button" aria-label="Clear token search" onClick={() => {setQuery("");setActive(0);input.current?.focus();}}><X size={14}/></button>}</div>
    <div className="ns-tabs" role="group" aria-label="Search view">{(["Trending","Watchlist","Recent"] as SearchTab[]).map(value => <button key={value} aria-pressed={tab === value} onClick={() => {setTab(value);setActive(0);setQuery("");}}>{value === "Recent" && <ClockCounterClockwise size={13}/>} {value}</button>)}{tab === "Recent" && recent.length > 0 && <button className="ns-clear" onClick={() => {setRecent([]);try{localStorage.removeItem("nomo.search.recent");}catch{}}}>Clear</button>}</div>
    <div className="ns-labels"><span>{query ? `${results.length} results` : tab === "Trending" ? "Popular tokens" : tab === "Recent" ? "Recently viewed" : "Your saved tokens"}</span><span>Market cap / 24h</span></div>
    <div className="ns-results" id={`${id}-results`} role="listbox" aria-label="Token results">{results.map((token, index) => <button type="button" key={token.id} id={`${id}-${token.id}`} role="option" tabIndex={-1} aria-selected={active === index} className="ns-result" onMouseEnter={() => setActive(index)} onClick={() => select(token)}><TokenAvatar token={token} variant="square" size={34}/><span className="ns-identity"><strong>{token.symbol}<small>{token.age}</small></strong><span>{token.name}<i>·</i>{token.contract.slice(0,4)}…{token.contract.slice(-4)}</span></span><span className="ns-values"><strong>{money(token.mcap)}</strong><small className={token.change24h>=0 ? "nm-positive" : "nm-negative"}>{percent(token.change24h)}</small></span><ArrowElbowDownLeft size={14} className="ns-enter"/></button>)}</div>
    {!results.length && <div className="ns-empty"><MagnifyingGlass size={24}/><strong>{query ? "No tokens found" : tab === "Recent" ? "Your next discovery starts here" : "Your watchlist is empty"}</strong><p>{query ? "Try a token name, ticker or full contract address." : tab === "Recent" ? "Tokens you open from search will appear here." : "Star a token in Discover to save it here."}</p></div>}
    <div className="ns-footer"><span>↑ ↓ to browse <i>↵ to open</i></span><span>Esc to close</span></div>
  </dialog>;
}
