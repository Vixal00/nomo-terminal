"use client";

import { tokenNavigation } from "./token-navigation";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, ArrowsDownUp, Bell, BellRinging, Check, ClockCounterClockwise, Copy, MagnifyingGlass, Star, Trash, Wallet, X, XLogo } from "@phosphor-icons/react";
import { TIMEFRAMES, TOKEN_PORTRAITS, changeForTime, money, percent, priceText, type Token } from "./data";
import { PREVIEW_TRADES, activityAge, nearAmount, shortAccount, signedNear, traderForWallet, useTrackedWallets } from "./trader-preview";
import { trackedWalletKey } from "./tracked-wallets";
import { TrackedWalletAvatar } from "./tracked-wallet-avatar";
import "./terminal-dock.css";
import { SocialDock } from "./social-dock";

type DockProps = {
  kind: "watchlist" | "tracker" | "social";
  tokens: Token[];
  stars: string[];
  onStar: (id: string) => void;
  onSelect: (token: Token) => void;
  onClose: () => void;
};
type PriceAlert = { tokenId: string; direction: "above" | "below"; target: number };
type AlertHistory = PriceAlert & { id: string; symbol: string; price: number; at: number };
const ALERT_KEY = "nomo.preview.watchlist-alerts.v1";
const HISTORY_KEY = "nomo.preview.watchlist-alert-history.v1";

function isAlert(value: unknown): value is PriceAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Partial<PriceAlert>;
  return typeof alert.tokenId === "string" && (alert.direction === "above" || alert.direction === "below") && typeof alert.target === "number" && Number.isFinite(alert.target) && alert.target > 0;
}

function isAlertHistory(value: unknown): value is AlertHistory {
  if (!isAlert(value)) return false;
  const entry = value as Partial<AlertHistory>;
  return typeof entry.id === "string" && typeof entry.symbol === "string" && typeof entry.price === "number" && Number.isFinite(entry.price) && typeof entry.at === "number" && entry.at >= 0 && entry.at <= 8_640_000_000_000_000;
}

function crossed(alert: PriceAlert, token?: Token) {
  return !!token && (alert.direction === "above" ? token.price >= alert.target : token.price <= alert.target);
}

function useDockCopy() {
  const [copied, setCopied] = useState("");
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async (value: string, name: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setStatus(`${name} address copied.`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(""), 1800);
    } catch { setStatus("Could not copy the address. Please try again."); }
  };
  return { copied, status, setStatus, copy };
}

export function TerminalDock({ kind, tokens, stars, onStar, onSelect, onClose }: DockProps) {
  return <aside className="ntd-dock" aria-label={kind === "watchlist" ? "Watchlist panel" : kind === "social" ? "Social panel" : "Wallet tracker panel"}>
    <header className="ntd-header">
      <div>{kind === "watchlist" ? <Star size={15} /> : kind === "social" ? <XLogo size={15} /> : <Wallet size={15} />}<h2>{kind === "watchlist" ? "Watchlist" : kind === "social" ? "Social" : "Wallet tracker"}</h2>{kind === "watchlist" && <span className="ntd-count">{stars.length}</span>}</div>
      <button className="ntd-icon" type="button" onClick={onClose} aria-label={`Close ${kind === "watchlist" ? "watchlist" : kind === "social" ? "social" : "wallet tracker"}`}><X size={15} /></button>
    </header>
    {kind === "watchlist" ? <WatchlistDock tokens={tokens} stars={stars} onStar={onStar} onSelect={onSelect} /> : kind === "social" ? <SocialDock/> : <TrackerDock tokens={tokens} onSelect={onSelect} />}
  </aside>;
}

function WatchlistDock({ tokens, stars, onStar, onSelect }: Pick<DockProps, "tokens" | "stars" | "onStar" | "onSelect">) {
  const [timeframe, setTimeframe] = useState<string>("24h");
  const [view, setView] = useState<"tokens" | "history">("tokens");
  const [sort, setSort] = useState<{ key: "mcap" | "volume"; direction: 1 | -1 }>({ key: "mcap", direction: -1 });
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const holding = useRef(new Set<string>());
  const targetInput = useRef<HTMLInputElement>(null);
  const { copied, status, setStatus, copy } = useDockCopy();
  const watched = useMemo(() => tokens.filter(token => stars.includes(token.id)).sort((a, b) => (a[sort.key] - b[sort.key]) * sort.direction), [tokens, stars, sort]);
  const editing = tokens.find(token => token.id === editingId);

  useEffect(() => {
    try {
      const storedAlerts: unknown = JSON.parse(localStorage.getItem(ALERT_KEY) || "[]");
      const storedHistory: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(storedAlerts)) {
        const valid = storedAlerts.filter(isAlert);
        setAlerts(valid);
        // Reopening does not replay conditions that were already true.
        holding.current = new Set(valid.filter(alert => crossed(alert, tokensRef.current.find(token => token.id === alert.tokenId))).map(alert => alert.tokenId));
      }
      if (Array.isArray(storedHistory)) setHistory(storedHistory.filter(isAlertHistory).slice(0, 40));
    } catch { /* The dock works without browser storage. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(ALERT_KEY, JSON.stringify(alerts)); localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* Keep local state when storage is unavailable. */ }
  }, [alerts, history, ready]);

  useEffect(() => {
    if (!ready) return;
    const triggered: AlertHistory[] = [];
    for (const alert of alerts) {
      const token = tokens.find(item => item.id === alert.tokenId);
      if (!stars.includes(alert.tokenId) || !crossed(alert, token)) { holding.current.delete(alert.tokenId); continue; }
      if (holding.current.has(alert.tokenId) || !token) continue;
      holding.current.add(alert.tokenId);
      const at = Date.now();
      triggered.push({ ...alert, id: `${alert.tokenId}-${at}`, symbol: token.symbol, price: token.price, at });
    }
    if (triggered.length) setHistory(previous => [...triggered, ...previous].slice(0, 40));
  }, [tokens, alerts, ready, stars]);

  useEffect(() => { if (editingId) targetInput.current?.focus(); }, [editingId]);

  function editAlert(token: Token) {
    const existing = alerts.find(alert => alert.tokenId === token.id);
    setEditingId(token.id);
    setDirection(existing?.direction || "above");
    setTarget(String(existing?.target ?? Number((token.price * 1.05).toPrecision(6))));
    setError("");
  }

  function saveAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(target);
    if (!editing || !target.trim() || !Number.isFinite(value) || value <= 0) { setError("Enter a price greater than zero."); return; }
    holding.current.delete(editing.id);
    setAlerts(previous => [...previous.filter(alert => alert.tokenId !== editing.id), { tokenId: editing.id, direction, target: value }]);
    setStatus(`${editing.symbol} price alert saved.`);
    setEditingId(null);
  }

  const cycleSort = (key: "mcap" | "volume") => setSort(previous => ({ key, direction: previous.key === key ? previous.direction === -1 ? 1 : -1 : -1 }));

  return <>
    <div className="ntd-toolbar">
      <span className="ntd-network"><img src="/nomo/icons/near-circle.svg" alt="" width={13} height={13} />NEAR</span>
      <div className="ntd-periods" role="group" aria-label="Watchlist change timeframe">{TIMEFRAMES.map(time => <button key={time} type="button" className={timeframe === time ? "is-active" : ""} aria-pressed={timeframe === time} onClick={() => { setTimeframe(time); setView("tokens"); setEditingId(null); }}>{time}</button>)}</div>
    </div>
    <div className="ntd-subnav">
      <div><button className={view === "tokens" ? "is-active" : ""} type="button" aria-pressed={view === "tokens"} onClick={() => { setView("tokens"); setEditingId(null); }}>Tokens</button><button className={view === "history" ? "is-active" : ""} type="button" aria-pressed={view === "history"} onClick={() => { setView("history"); setEditingId(null); }}><ClockCounterClockwise size={12} />History{history.length > 0 && <span>{history.length}</span>}</button></div>
    </div>

    <div className="ntd-scroll">
      {editing ? <form className="ntd-alert-editor" onSubmit={saveAlert}>
        <button className="ntd-back" type="button" onClick={() => setEditingId(null)}><ArrowLeft size={12} />Back to tokens</button>
        <div className="ntd-alert-title" title="Price alerts are checked while the watchlist panel is open."><BellRinging size={17} /><h3>{editing.symbol} price alert</h3></div>
        <p>Current price <strong>{priceText(editing.price)}</strong></p>
        <label>Trigger when the price is<select value={direction} onChange={event => setDirection(event.target.value as "above" | "below")}><option value="above">Above or equal to</option><option value="below">Below or equal to</option></select></label>
        <label htmlFor="ntd-alert-target">Price in USD</label>
        <div className="ntd-alert-input"><span>$</span><input id="ntd-alert-target" ref={targetInput} inputMode="decimal" autoComplete="off" value={target} onChange={event => { setTarget(event.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "ntd-alert-error" : undefined} /></div>
        {error && <p className="ntd-error" id="ntd-alert-error">{error}</p>}
        <button className="ntd-primary" type="submit">Save price alert</button>
        {alerts.some(alert => alert.tokenId === editing.id) && <button className="ntd-remove-alert" type="button" onClick={() => { setAlerts(previous => previous.filter(alert => alert.tokenId !== editing.id)); holding.current.delete(editing.id); setStatus(`${editing.symbol} alert removed.`); setEditingId(null); }}>Remove alert</button>}
      </form> : view === "history" ? <div className="ntd-history">
        <div className="ntd-list-heading"><span>Price alert history</span>{history.length > 0 && <button type="button" onClick={() => { setHistory([]); setStatus("Alert history cleared."); }}>Clear</button>}</div>
        {history.length ? history.map(entry => <div className="ntd-history-entry" key={entry.id}><Bell size={13} /><div><strong>{entry.symbol} <span>{entry.direction} {priceText(entry.target)}</span></strong><p>Price {priceText(entry.price)}</p><time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div></div>) : <DockEmpty icon="alert" title="No alerts triggered" description="Set a price alert from a token’s bell. Triggered alerts will appear here." />}
      </div> : <>
        <div className="ntd-list-heading"><span>Sort by</span><div><button type="button" className={sort.key === "mcap" ? "is-active" : ""} aria-label={`Sort by market cap, ${sort.key === "mcap" && sort.direction === -1 ? "lowest" : "highest"} first`} onClick={() => cycleSort("mcap")}>Mcap<ArrowsDownUp size={10} /></button><button type="button" className={sort.key === "volume" ? "is-active" : ""} aria-label={`Sort by volume, ${sort.key === "volume" && sort.direction === -1 ? "lowest" : "highest"} first`} onClick={() => cycleSort("volume")}>Vol 24h<ArrowsDownUp size={10} /></button></div></div>
        {watched.length ? watched.map(token => {
          const change = changeForTime(token, timeframe);
          const alert = alerts.find(item => item.tokenId === token.id);
          return <article className="ntd-token" key={token.id} {...tokenNavigation(token, onSelect)}>
            <div className="ntd-token-top"><button type="button" className="ntd-token-identity" onClick={() => onSelect(token)}><img src={TOKEN_PORTRAITS[token.id] || token.image} width={29} height={29} alt="" /><span><strong>{token.symbol}</strong><small>{token.name}</small></span></button><span className={change >= 0 ? "ntd-positive" : "ntd-negative"}>{percent(change)}</span></div>
            <button type="button" className="ntd-token-stats" aria-label={`Open ${token.symbol} token`} onClick={() => onSelect(token)}><span><small>Mcap</small>{money(token.mcap)}</span><span><small>Vol 24h</small>{money(token.volume)}</span><span><small>Liquidity</small>{money(token.liquidity)}</span></button>
            <div className="ntd-token-bottom"><button type="button" className="ntd-address-copy" title={token.contract} aria-label={`Copy ${token.symbol} contract address`} onClick={() => void copy(token.contract, token.symbol)}>{token.contract.slice(0, 4)}…{token.contract.slice(-4)}{copied === token.contract ? <Check size={11} /> : <Copy size={11} />}</button><div><button type="button" className={`ntd-icon ${alert ? "is-active" : ""}`} onClick={() => editAlert(token)} aria-label={`${alert ? "Edit" : "Set"} ${token.symbol} price alert`} title={alert ? `Price alert ${alert.direction} ${priceText(alert.target)}` : "Set price alert"}><BellRinging size={13} /></button><button type="button" className="ntd-icon ntd-remove" onClick={() => { onStar(token.id); setStatus(`${token.symbol} removed from watchlist.`); }} aria-label={`Remove ${token.symbol} from watchlist`}><Trash size={13} /></button></div></div>
          </article>;
        }) : <DockEmpty icon="watchlist" title="Your watchlist is empty" description="Star a token in the market to keep it here." />}
      </>}
    </div>
    {status && <div className="ntd-footer"><span role="status" aria-live="polite">{status}</span></div>}
  </>;
}

function TrackerDock({ tokens, onSelect }: Pick<DockProps, "tokens" | "onSelect">) {
  const { wallets, saveWallets } = useTrackedWallets();
  const [tab, setTab] = useState<"wallets" | "activity">("wallets");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const { copied, status, setStatus, copy } = useDockCopy();
  const byAddress = useMemo(() => new Map(wallets.filter(wallet=>!wallet.chain || wallet.chain === "NEAR").map(wallet => [wallet.address, wallet])), [wallets]);
  const matches = (value: string) => value.toLowerCase().includes(query.toLowerCase().trim());
  const filteredWallets = wallets.filter(wallet => matches(`${wallet.name} ${wallet.address}`));
  const selectedKey = wallets.some(wallet=>trackedWalletKey(wallet) === selected) ? selected : "";
  const activity = PREVIEW_TRADES.filter(trade => byAddress.get(trade.address)?.trades && (!selectedKey || trackedWalletKey({address:trade.address}) === selectedKey) && matches(`${byAddress.get(trade.address)?.name} ${trade.address} ${trade.token.symbol} ${trade.token.name}`));

  return <>
    <div className="ntd-tracker-tabs" role="group" aria-label="Tracker view"><button type="button" className={tab === "wallets" ? "is-active" : ""} aria-pressed={tab === "wallets"} onClick={() => setTab("wallets")}>Wallets<span>{wallets.length}</span></button><button type="button" className={tab === "activity" ? "is-active" : ""} aria-pressed={tab === "activity"} onClick={() => setTab("activity")}>Activity</button><Link href="/trackers" title="Open full trackers" aria-label="Open full trackers"><ArrowUpRight size={14} /></Link></div>
    <label className="ntd-search"><MagnifyingGlass size={13} /><input placeholder={tab === "wallets" ? "Search wallets" : "Search activity"} aria-label={tab === "wallets" ? "Search tracked wallets" : "Search tracker activity"} value={query} onChange={event => setQuery(event.target.value)} /></label>
    {tab === "activity" && <div className="ntd-wallet-filter"><label htmlFor="ntd-wallet-filter">Wallet</label><select id="ntd-wallet-filter" value={selectedKey} onChange={event => setSelected(event.target.value)}><option value="">All tracked wallets</option>{wallets.map(wallet => <option key={trackedWalletKey(wallet)} value={trackedWalletKey(wallet)}>{wallet.name} · {wallet.chain || "NEAR"}</option>)}</select></div>}
    <div className="ntd-scroll">
      {tab === "wallets" ? <>
        <div className="ntd-list-heading"><span>Tracked wallets</span><span>7d PnL · NEAR</span></div>
        {filteredWallets.length ? filteredWallets.map(wallet => {
          const trader = traderForWallet(wallet.address,wallet.chain);
          return <article className="ntd-tracked-wallet" key={trackedWalletKey(wallet)}>
            <div className="ntd-wallet-top"><button type="button" className="ntd-wallet-identity" onClick={() => { setSelected(trackedWalletKey(wallet)); setQuery(""); setTab("activity"); }}><TrackedWalletAvatar wallet={wallet} size={27}/><span><strong>{wallet.name}</strong><small>{trader ? activityAge(trader.lastMinutes) : "No activity"}</small></span></button><span className={trader ? trader.pnl >= 0 ? "ntd-positive" : "ntd-negative" : "ntd-muted"}>{trader ? signedNear(trader.pnl) : "—"}</span></div>
            <div className="ntd-wallet-bottom"><button type="button" className="ntd-address-copy" title={wallet.address} aria-label={`Copy ${wallet.name} wallet address`} onClick={() => void copy(wallet.address, wallet.name)}>{shortAccount(wallet.address)}{copied === wallet.address ? <Check size={11} /> : <Copy size={11} />}</button><button type="button" className="ntd-icon ntd-remove" aria-label={`Remove ${wallet.name} from trackers`} onClick={() => { saveWallets(wallets.filter(item => trackedWalletKey(item) !== trackedWalletKey(wallet))); setStatus(`${wallet.name} removed from trackers.`); }}><Trash size={13} /></button></div>
          </article>;
        }) : <DockEmpty icon="tracker" title={query ? "No wallets found" : "No tracked wallets"} description={query ? "Try a different name or address." : "Follow a trader or add a wallet in Trackers."} />}
      </> : <>
        <div className="ntd-list-heading"><span>Activity</span><span>Amount · NEAR</span></div>
        {activity.length ? activity.map(trade => {
          const wallet = byAddress.get(trade.address)!;
          const token = tokens.find(item => item.id === trade.token.id) || trade.token;
          return <button type="button" className="ntd-activity" key={trade.id} onClick={() => onSelect(token)} aria-label={`Open ${token.symbol}, ${wallet.name} ${trade.side.toLowerCase()} activity`}><img src={TOKEN_PORTRAITS[token.id] || token.image} width={25} height={25} alt="" /><span className="ntd-activity-info"><strong>{wallet.name} <span className={trade.side === "Buy" ? "ntd-positive" : "ntd-negative"}>{trade.side === "Buy" ? "bought" : "sold"}</span></strong><small>{token.symbol}<span>{activityAge(trade.minutes)}</span></small></span><span className="ntd-activity-amount">{nearAmount(trade.amount)}</span></button>;
        }) : <DockEmpty icon="tracker" title="No activity in this view" description={query ? "Try a different search." : "Enable Trades in Trackers to include wallet activity."} />}
      </>}
    </div>
    <div className="ntd-tracker-link"><Link href="/trackers">Open full trackers<ArrowUpRight size={12} /></Link></div>
    {status && <div className="ntd-footer"><span role="status" aria-live="polite">{status}</span></div>}
  </>;
}

function DockEmpty({ icon, title, description }: { icon: "watchlist" | "tracker" | "alert"; title: string; description: string }) {
  return <div className="ntd-empty">{icon === "watchlist" ? <Star size={24} /> : icon === "alert" ? <Bell size={24} /> : <Wallet size={24} />}<strong>{title}</strong><p>{description}</p></div>;
}
