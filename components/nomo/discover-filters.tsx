"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwise, CaretDown, ChartBar, CurrencyDollar, EyeSlash, MagnifyingGlass, X } from "@phosphor-icons/react";
import { MARKET_CHAINS, type Token } from "./data";
import { MarketChainIcon } from "./brand-icons";
import { parseMarketBound, type MarketFilters } from "./market-filters";
import "./discover-filters.css";

type Props = {
  value: MarketFilters;
  onChange: (value: MarketFilters) => void;
  tokens: Token[];
  time: string;
  hidden: string[];
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function DiscoverFilters({ value, onChange, tokens, time, hidden, onRestore, onRestoreAll, onReset, onClose }: Props) {
  const [popup, setPopup] = useState<"chains" | "hidden" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chainButton = useRef<HTMLButtonElement>(null);
  const hiddenButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!popup) return;
    const outside = (event: PointerEvent) => { if (!root.current?.querySelector(`[data-popup="${popup}"]`)?.contains(event.target as Node)) setPopup(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); (popup === "chains" ? chainButton : hiddenButton).current?.focus(); setPopup(null); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [popup]);
  const update = (field: keyof Omit<MarketFilters, "chains">, text: string) => onChange({ ...value, [field]: text });
  const togglePopup = (next: typeof popup) => setPopup(current => current === next ? null : next);

  return <div ref={root} className="ndf-panel" role="region" aria-label="Market filters">
    <div className="ndf-popover" data-popup="chains">
      <button ref={chainButton} className="ndf-chip ndf-chains" type="button" onClick={() => togglePopup("chains")} aria-expanded={popup === "chains"} aria-controls={`${id}-chains`}>
        <span className="ndf-chain-stack" aria-hidden="true">{value.chains.map(chain => <span key={chain}><MarketChainIcon chain={chain} size={12}/></span>)}</span>
        <span>{value.chains.length === 1 ? value.chains[0] : value.chains.length ? "Chains" : "No chains"}</span><CaretDown size={11}/>
      </button>
      {popup === "chains" && <div id={`${id}-chains`} className="ndf-menu" role="group" aria-label="Filter chains">
        <div className="ndf-menu-heading"><span>Networks</span><button type="button" onClick={() => onChange({ ...value, chains: value.chains.length === MARKET_CHAINS.length ? [] : [...MARKET_CHAINS] })}>{value.chains.length === MARKET_CHAINS.length ? "Clear all" : "Select all"}</button></div>
        {MARKET_CHAINS.map(chain => <label className="ndf-chain-option" key={chain}><input type="checkbox" checked={value.chains.includes(chain)} onChange={() => onChange({ ...value, chains: value.chains.includes(chain) ? value.chains.filter(item => item !== chain) : MARKET_CHAINS.filter(item => item === chain || value.chains.includes(item)) })}/><MarketChainIcon chain={chain} size={15}/><span>{chain}</span><small>{tokens.filter(token => token.chain === chain).length}</small></label>)}
      </div>}
    </div>
    <FilterFields label="Market cap" icon={<CurrencyDollar size={13}/>} fields={[{ name: "minimum", value: value.capMin, onChange: text => update("capMin", text) }, { name: "maximum", value: value.capMax, onChange: text => update("capMax", text) }]} numeric/>
    <FilterFields label={`Volume ${time}`} icon={<ChartBar size={13}/>} fields={[{ name: "minimum", value: value.volumeMin, onChange: text => update("volumeMin", text) }, { name: "maximum", value: value.volumeMax, onChange: text => update("volumeMax", text) }]} numeric/>
    <FilterFields label="Keywords" icon={<MagnifyingGlass size={13}/>} fields={[{ name: "", value: value.keywords, onChange: text => update("keywords", text) }]}/>
    <div className="ndf-popover" data-popup="hidden">
      <button ref={hiddenButton} className="ndf-chip" type="button" aria-expanded={popup === "hidden"} aria-controls={`${id}-hidden`} onClick={() => togglePopup("hidden")}><EyeSlash size={13}/><span>Hidden</span><small>{hidden.length}</small></button>
      {popup === "hidden" && <div id={`${id}-hidden`} className="ndf-menu ndf-hidden-menu" role="group" aria-label="Hidden pairs">
        {hidden.length ? <><ul>{hidden.map(tokenId => <li key={tokenId}><span>{tokens.find(token => token.id === tokenId)?.symbol ?? tokenId}</span><button type="button" onClick={() => onRestore(tokenId)} aria-label={`Restore ${tokens.find(token => token.id === tokenId)?.symbol ?? tokenId}`}>Restore</button></li>)}</ul><button type="button" className="ndf-restore-all" onClick={onRestoreAll}>Restore all pairs</button></> : <p>No hidden pairs. Use the eye beside a token’s buy button to hide it.</p>}
      </div>}
    </div>
    <button className="ndf-reset" type="button" onClick={() => { onReset(); setPopup(null); }}><ArrowCounterClockwise size={12}/>Reset filters</button>
    <button className="ndf-close" type="button" onClick={onClose} aria-label="Close filters"><X size={13}/></button>
  </div>;
}

type Field = { name: string; value: string; onChange: (value: string) => void };
function FilterFields({ label, icon, fields, numeric = false }: { label: string; icon: ReactNode; fields: Field[]; numeric?: boolean }) {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const filled = fields.some(field => field.value.trim());
  const expanded = open || filled;
  const min = numeric ? parseMarketBound(fields[0].value) : null;
  const max = numeric ? parseMarketBound(fields[1].value) : null;
  const reversed = min !== null && max !== null && min > max;
  useEffect(() => { if (open) first.current?.focus(); }, [open]);

  return <div className={`ndf-field${expanded ? " is-expanded" : ""}${reversed ? " has-error" : ""}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { trigger.current?.focus(); setOpen(false); } }}>
    <button ref={trigger} type="button" className="ndf-chip" onClick={() => { if (expanded) first.current?.focus(); else setOpen(true); }} aria-expanded={!!expanded}>{icon}<span>{label}</span></button>
    {expanded && <div className="ndf-inputs">{fields.map((field, index) => {
      const invalid = numeric && (field.value.trim() !== "" && parseMarketBound(field.value) === null || reversed);
      return <input key={field.name} ref={index === 0 ? first : undefined} aria-label={`${label} ${field.name}`.trim()} aria-invalid={invalid || undefined} title={invalid ? reversed ? "Minimum must not exceed maximum." : "Enter an amount such as 25000, 25k or 1.5m." : undefined} className={numeric ? "ndf-bound" : "ndf-keywords"} placeholder={numeric ? index === 0 ? "Min" : "Max" : "Token, name, address"} value={field.value} onChange={event => field.onChange(event.target.value)} autoComplete="off" spellCheck={false}/>;
    })}</div>}
  </div>;
}
