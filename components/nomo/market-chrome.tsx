"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Binoculars, ChartLineUp, GearSix, SlidersHorizontal, Star, Wallet } from "@phosphor-icons/react";
import { type Token, money, percent, priceText, TIMEFRAMES, changeForTime } from "./data";
import { TokenAvatar } from "./shared";

export type MarketTickerProps = {
  tokens: readonly Token[];
  onSelect: (token: Token) => void;
  watchlistIds?: readonly string[];
  heldIds?: readonly string[];
  heldPositions?: Readonly<Record<string, number>>;
};

type TickerTime = typeof TIMEFRAMES[number];

export function MarketTicker({ tokens, onSelect, watchlistIds = [], heldIds = [], heldPositions = {} }: MarketTickerProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const original = useRef<HTMLUListElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  const initialOrder = useRef(tokens.map(token => token.id));
  const [source, setSource] = useState<"trending" | "watchlist" | "positions">("trending");
  const [time, setTime] = useState<TickerTime>("24h");
  const [value, setValue] = useState<"mcap" | "price">("mcap");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [motion, setMotion] = useState({ moving: false, duration: 120 });
  const orderedTokens = useMemo(() => {
    const rank = new Map(initialOrder.current.map((id, index) => [id, index]));
    const selected = new Set(source === "positions" ? heldIds : watchlistIds);
    return tokens.filter(token => source === "trending" || selected.has(token.id)).sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
  }, [tokens, source, watchlistIds, heldIds]);
  const tokenIds = orderedTokens.map(token => token.id).join("|");

  useEffect(() => {
    const view = viewport.current;
    const set = original.current;
    if (!view || !set || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = set.getBoundingClientRect().width;
      const moving = width + 12 > view.clientWidth + 1;
      const duration = Math.max(30, Math.round(width / 28));
      setMotion(current => current.moving === moving && current.duration === duration ? current : { moving, duration });
    };
    view.scrollLeft = 0;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(set);
    return () => observer.disconnect();
  }, [tokenIds, source, time, value]);

  useEffect(() => {
    if (!settingsOpen) return;
    const outside = (event: PointerEvent) => {
      if (!controls.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setSettingsOpen(false);
      settingsButton.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!keyboard || !viewport.current) return;
    const view = viewport.current;
    const target = document.activeElement;
    if (!(target instanceof HTMLElement) || !view.contains(target)) return;
    const viewRect = view.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.left < viewRect.left) view.scrollLeft -= viewRect.left - targetRect.left;
    else if (targetRect.right > viewRect.right) view.scrollLeft += targetRect.right - viewRect.right;
  }, [keyboard]);

  const change = (token: Token) => changeForTime(token, time);
  const tickerValue = (token: Token) => source === "positions" ? `$${(token.price * (heldPositions[token.id] || 0)).toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2})}` : value === "mcap" ? money(token.mcap) : priceText(token.price);
  const chip = (token: Token, duplicate: boolean) => <li key={token.id}>
    <button type="button" className="ni-ticker-chip" tabIndex={duplicate ? -1 : 0} onClick={() => onSelect(token)}
      aria-label={`${token.symbol}, ${source === "positions" ? `${tickerValue(token)} held value` : value === "mcap" ? `${money(token.mcap)} market cap` : `${priceText(token.price)} price`}, ${percent(change(token))} over ${time}. View token.`}>
      <TokenAvatar token={token} size={18} variant="square" />
      <strong>{token.symbol}</strong>
      <span className="ni-ticker-value" title={source === "positions" ? "Position value" : undefined}>{tickerValue(token)}</span>
      <span className={change(token) >= 0 ? "nm-positive" : "nm-negative"}>{percent(change(token))}</span>
    </button>
  </li>;

  return <section className={`ni-market-ticker ${keyboard ? "is-keyboard" : ""} ${settingsOpen ? "is-settings-open" : ""}`} aria-label={`Market ticker, ${time} changes`}>
    <div ref={controls} className="ni-ticker-controls" onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSettingsOpen(false);
    }}>
      <button ref={settingsButton} type="button" className={`ni-ticker-mode ${settingsOpen ? "is-on" : ""}`} aria-label="Ticker settings" title="Ticker settings" aria-expanded={settingsOpen} aria-controls={settingsId} onClick={() => setSettingsOpen(open => !open)}><GearSix size={15} aria-hidden="true"/></button>
      <button type="button" className={`ni-ticker-mode ${source === "watchlist" ? "is-on" : ""}`} aria-label="Watchlist ticker" title="Watchlist" aria-pressed={source === "watchlist"} onClick={() => {setSource(current => current === "watchlist" ? "trending" : "watchlist"); setSettingsOpen(false);}}><Star size={15} weight={source === "watchlist" ? "fill" : "regular"} aria-hidden="true"/></button>
      <button type="button" className={`ni-ticker-mode ${source === "trending" ? "is-on" : ""}`} aria-label="Trending ticker" title="Trending" aria-pressed={source === "trending"} onClick={() => {setSource("trending"); setSettingsOpen(false);}}><ChartLineUp size={15} aria-hidden="true"/></button>
      <button type="button" className={`ni-ticker-mode ${source === "positions" ? "is-on" : ""}`} aria-label="Held positions ticker" title="Held positions" aria-pressed={source === "positions"} onClick={() => {setSource(current => current === "positions" ? "trending" : "positions");setSettingsOpen(false);}}><Wallet size={15} weight={source === "positions" ? "fill" : "regular"} aria-hidden="true"/></button>
      {settingsOpen && <div id={settingsId} className="ni-ticker-settings" role="dialog" aria-label="Ticker settings">
        <div><span>Timeframe</span><div role="group" aria-label="Ticker timeframe">{TIMEFRAMES.map(option => <button type="button" key={option} aria-pressed={time === option} onClick={() => setTime(option)}>{option}</button>)}</div></div>
        <div><span>Display</span><div role="group" aria-label="Ticker value">{(["mcap", "price"] as const).map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => setValue(option)}>{option === "mcap" ? "Market cap" : "Price"}</button>)}</div></div>
      </div>}
    </div>
    <div ref={viewport} className="ni-ticker-viewport" data-moving={motion.moving ? "true" : "false"}
      onFocusCapture={event => {if ((event.target as HTMLElement).matches(":focus-visible")) setKeyboard(true);}}
      onBlurCapture={event => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setKeyboard(false);
        if (!window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) event.currentTarget.scrollLeft = 0;
      }}>
      {orderedTokens.length ? <div key={`${source}-${time}-${value}-${tokenIds}`} className="ni-ticker-track" style={{ "--ni-ticker-duration": `${motion.duration}s` } as CSSProperties}>
        <ul ref={original} className="ni-ticker-set" aria-label={`${source === "watchlist" ? "Watchlist" : source === "positions" ? "Held position" : "Trending"} tokens`}>{orderedTokens.map(token => chip(token, false))}</ul>
        <ul className="ni-ticker-set ni-ticker-copy" aria-hidden="true">{orderedTokens.map(token => chip(token, true))}</ul>
      </div> : <span className="ni-ticker-empty">{source === "watchlist" ? "Star a token to add it to your watchlist." : source === "positions" ? "No held positions in this wallet." : "No markets to display"}</span>}
    </div>
  </section>;
}

export type TerminalBarProps = {
  tokens: readonly Token[];
  watchlistCount: number;
  watchlistActive: boolean;
  trackerActive?: boolean;
  activePreset: number | null;
  onPresets: () => void;
  onSettings: () => void;
  onTracker: () => void;
  onWatchlist: () => void;
};

const previewDescription = "Market activity and wallet balances use local sample data. No network connection, orders or transfers.";

export function TerminalBar({ tokens, watchlistCount, watchlistActive, trackerActive, activePreset, onPresets, onSettings, onTracker, onWatchlist }: TerminalBarProps) {
  const volume = tokens.reduce((sum, token) => sum + token.volume, 0);
  return <footer className="ni-terminal-bar" aria-label="Terminal status and shortcuts">
    <div className="ni-terminal-shortcuts">
      <button type="button" onClick={onPresets} title={`Edit presets · ${activePreset == null ? "Custom" : `P${activePreset + 1}`}`} aria-label="Edit quick buy presets"><SlidersHorizontal size={12} aria-hidden="true"/><span>Presets</span></button>
      <button type="button" onClick={onSettings} title="Settings" aria-label="Open settings"><GearSix size={13} aria-hidden="true"/></button>
      <button type="button" onClick={onTracker} title="Tracker" aria-label="Open tracker" aria-pressed={!!trackerActive}><Binoculars size={12} aria-hidden="true"/><span>Tracker</span></button>
      <button type="button" onClick={onWatchlist} title="Watchlist" aria-label="Open watchlist" aria-pressed={watchlistActive}><Star size={12} weight={watchlistActive ? "fill" : "regular"} aria-hidden="true"/><span>Watchlist</span><small>{watchlistCount}</small></button>
    </div>
    <div className="ni-terminal-status">
      <span className="ni-terminal-volume"><span>24h vol</span><strong>{money(volume)}</strong></span>
      <span className="ni-terminal-connection" tabIndex={0} title={previewDescription} aria-label={`Connection status: ${previewDescription}`}><i aria-hidden="true"/><span>Connection</span></span>
    </div>
  </footer>;
}
