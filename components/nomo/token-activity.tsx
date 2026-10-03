"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, ClockCounterClockwise, CopySimple, Pause, Play } from "@phosphor-icons/react";
import { compact, money, priceText, type Token } from "./data";
import { createTokenActivity } from "./token-detail-fixtures";
import "./token-activity.css";
import { usePreviewWallet } from "./wallet";
import { createTradeStream, advanceTradeStream, type StreamTrade } from "./token-trade-stream";

const tabs = ["Trades", "Holders", "Top traders", "My activity"] as const;
type ActivityTab = typeof tabs[number];
type TradeFilter = "All" | "Buy" | "Sell";
const dollarText = (value: number) => value < 1000 ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : money(value);

function WalletCopy({ address }: { address: string }) {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const request = useRef(0);
  const alive = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const copy = async () => {
    const current = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    setStatus("copying");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(address);
      if (!alive.current || current !== request.current) return;
      setStatus("copied");
    } catch {
      if (!alive.current || current !== request.current) return;
      setStatus("error");
    }
    timer.current = setTimeout(() => {
      if (alive.current && current === request.current) setStatus("idle");
    }, 1800);
  };
  return <span className="nta-wallet-wrap">
    <button type="button" className={`nta-wallet ${status === "copied" ? "is-copied" : ""}`} onClick={() => void copy()} aria-label={status === "copied" ? "Wallet address copied" : `Copy wallet address ${address}`} aria-busy={status === "copying"}>
      <span>{address.slice(0, 4)}…{address.slice(-4)}</span>
      {status === "copied" ? <Check size={12} weight="bold" aria-hidden="true" /> : <CopySimple size={12} aria-hidden="true" />}
    </button>
    <span className={status === "error" ? "nta-copy-error" : "nta-sr-only"} role="status">{status === "copied" ? "Wallet address copied." : status === "error" ? "Copy failed" : ""}</span>
  </span>;
}

function TokenActivityPanel({ token }: { token: Token }) {
  const wallet = usePreviewWallet();
  const ownTrades = wallet.history.filter(entry => entry.tokenId === token.id && (entry.type === "Buy" || entry.type === "Sell"));
  const [tab, setTab] = useState<ActivityTab>("Trades");
  const [filter, setFilter] = useState<TradeFilter>("All");
  const [stream, setStream] = useState(() => createTradeStream(token, 0));
  const [now, setNow] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const stopped = paused || hovered || focused || scrolled;
  const latestToken = useRef(token);
  latestToken.current = token;
  const id = `token-activity-${token.id}`;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Holdings revalue with the market; completed tape trades retain their prices.
  const [snapshot] = useState(() => ({ ...createTokenActivity(token), price: token.price }));
  useEffect(() => { const at = Date.now(); setNow(at); setStream(createTradeStream(latestToken.current, at)); }, []);
  useEffect(() => {
    if (stopped || tab !== "Trades") return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const at = Date.now(); setNow(at);
      setStream(current => advanceTradeStream(current, latestToken.current, at));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [stopped, tab]);
  const fixtures = useMemo(() => ({
    holders: snapshot.holders.map(holder => ({ ...holder, value: holder.quantity * token.price })),
    traders: snapshot.traders.map(trader => {
      const balance = trader.balance * token.price / snapshot.price;
      return { ...trader, balance, pnl: trader.sold + balance - trader.bought };
    }).sort((a, b) => b.pnl - a.pnl),
  }), [snapshot, token.price]);
  const ownRows: StreamTrade[] = ownTrades.map(entry => ({ id: `own-${entry.id}`, side: entry.type === "Buy" ? "buy" : "sell", amount: entry.value, quantity: entry.amount, price: entry.value / entry.amount, wallet: "You", at: entry.at, own: true }));
  const trades = [...stream.rows, ...ownRows].sort((a, b) => b.at - a.at).filter(trade => filter === "All" || trade.side === filter.toLowerCase()).slice(0, 100);
  const activeIndex = tabs.indexOf(tab);
  const selectTab = (next: ActivityTab) => {
    setTab(next);
    setHovered(false); setFocused(false); setScrolled(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next]);
    tabRefs.current[next]?.focus();
  };

  return <section className="nta-activity" aria-label={`${token.symbol} market activity`}>
    <div className="nta-toolbar">
      <div className="nta-tabs" role="tablist" aria-label="Token activity">
        {tabs.map((name, index) => <button key={name} ref={element => { tabRefs.current[index] = element; }} id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={tab === name} aria-controls={`${id}-panel`} tabIndex={tab === name ? 0 : -1} className={tab === name ? "is-active" : ""} onClick={() => selectTab(name)} onKeyDown={event => onTabKey(event, index)}>{name}</button>)}
      </div>

    </div>
    <div id={`${id}-panel`} className="nta-panel" role="tabpanel" aria-labelledby={`${id}-tab-${activeIndex}`} tabIndex={0}>
      {tab === "Trades" && <>
        <div className="nta-table-toolbar">
          <div className="nta-filter" role="group" aria-label="Filter trades by side">{(["All", "Buy", "Sell"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? "is-active" : ""} onClick={() => { setFilter(value); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}>{value}</button>)}</div>
          <button type="button" className={`nta-stream-control${stopped ? " is-paused" : ""}`} aria-label={paused ? "Resume trade stream" : "Pause trade stream"} aria-pressed={paused} onClick={() => setPaused(!paused)} title="Simulated transactions. Pauses while you hover, focus, or scroll the table.">{stopped ? <Play size={11}/> : <Pause size={11}/>}<span>{paused ? "Paused" : stopped ? "On hold" : "Updating"}</span></button>
        </div>
        <div className="nta-table-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Recent trades table" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }} onScroll={event => setScrolled(event.currentTarget.scrollTop > 4)}>
          <table className="nta-table"><caption className="nta-sr-only">Simulated {token.symbol} transactions and your local wallet trades</caption><thead><tr><th scope="col">Age</th><th scope="col">Type</th><th scope="col">Amount</th><th scope="col">{token.symbol}</th><th scope="col">Price</th><th scope="col">Wallet</th></tr></thead><tbody>
            {trades.map(trade => <tr key={trade.id} className={now - trade.at < 1800 && !stopped ? `nta-arrival is-${trade.side}-arrival` : undefined}>
              <td className="nta-age">{Math.max(0, Math.floor((now - trade.at) / 1000)) < 60 ? `${Math.max(0, Math.floor((now - trade.at) / 1000))}s` : `${Math.floor((now - trade.at) / 60000)}m`} ago</td>
              <td><span className={`nta-side is-${trade.side}`}>{trade.side === "buy" ? <ArrowDownLeft size={11} aria-hidden="true" /> : <ArrowUpRight size={11} aria-hidden="true" />}{trade.side === "buy" ? "Buy" : "Sell"}</span></td>
              <td className={`nta-number is-${trade.side}`}>{dollarText(trade.amount)}</td><td className="nta-number">{compact(trade.quantity)}</td><td className="nta-number nta-price">{priceText(trade.price)}</td><td>{trade.own ? <span className="nta-own-wallet">You</span> : <WalletCopy address={trade.wallet} />}</td>
            </tr>)}
          </tbody></table>
        </div>
      </>}
      {tab === "Holders" && <>
        <div className="nta-table-toolbar"><span className="nta-table-note">{token.holders.toLocaleString("en-US")} holders</span><span className="nta-summary">Top 10 <strong>{token.top10Pct.toFixed(1)}%</strong></span></div>
        <div className="nta-table-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Token holders table"><table className="nta-table nta-holders"><caption className="nta-sr-only">Top ten holders of {token.symbol}</caption><thead><tr><th scope="col">#</th><th scope="col">Wallet</th><th scope="col">Supply held</th><th scope="col">{token.symbol}</th><th scope="col">Value</th></tr></thead><tbody>{fixtures.holders.map((holder, index) => <tr key={holder.wallet}><td className="nta-rank">{index + 1}</td><td><WalletCopy address={holder.wallet} /></td><td><span className="nta-share"><span className="nta-share-track" aria-hidden="true"><span style={{ width: `${holder.share / Math.max(fixtures.holders[0].share, .01) * 100}%` }} /></span><span>{holder.share.toFixed(2)}%</span></span></td><td className="nta-number">{compact(holder.quantity)}</td><td className="nta-number">{dollarText(holder.value)}</td></tr>)}</tbody></table></div>
      </>}
      {tab === "Top traders" && <>
        <div className="nta-table-toolbar"><span className="nta-table-note">Ranked by total PnL</span><span className="nta-summary">Realized + unrealized</span></div>
        <div className="nta-table-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Top traders table"><table className="nta-table nta-traders"><caption className="nta-sr-only">Top traders of {token.symbol}; PnL includes remaining positions</caption><thead><tr><th scope="col">#</th><th scope="col">Wallet</th><th scope="col">Bought</th><th scope="col">Sold</th><th scope="col">PnL</th><th scope="col">Balance</th></tr></thead><tbody>{fixtures.traders.map((trader, index) => <tr key={trader.wallet}><td className="nta-rank">{index + 1}</td><td><WalletCopy address={trader.wallet} /></td><td className="nta-number">{dollarText(trader.bought)}</td><td className="nta-number">{dollarText(trader.sold)}</td><td className={`nta-number ${trader.pnl >= 0 ? "is-buy" : "is-sell"}`}>{trader.pnl >= 0 ? "+" : "−"}{dollarText(Math.abs(trader.pnl))}</td><td className="nta-number">{dollarText(trader.balance)}</td></tr>)}</tbody></table></div>
      </>}
      {tab === "My activity" && (ownTrades.length ? <div className="nta-table-scroll" tabIndex={0} role="region" aria-label="My token activity"><table className="nta-table"><thead><tr><th>Time</th><th>Side</th><th>{token.symbol}</th><th>Value</th><th>P&L</th></tr></thead><tbody>{ownTrades.map(entry=><tr key={entry.id}><td>{new Date(entry.at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</td><td className={entry.type === "Buy" ? "is-buy" : "is-sell"}>{entry.type}</td><td>{compact(entry.amount)}</td><td>{dollarText(entry.value)}</td><td>{entry.pnl === undefined ? "—" : `${entry.pnl >= 0 ? "+" : "−"}${dollarText(Math.abs(entry.pnl))}`}</td></tr>)}</tbody></table></div> : <div className="nta-empty"><span className="nta-empty-icon"><ClockCounterClockwise size={23} weight="light" aria-hidden="true" /></span><h3>No activity yet</h3><p>Your orders will appear here.</p></div>)}
    </div>
  </section>;
}

export function TokenActivity({ token }: { token: Token }) {
  return <TokenActivityPanel key={token.id} token={token} />;
}
