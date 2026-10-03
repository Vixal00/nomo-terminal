"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUpRight, ArrowsLeftRight, Check, Copy, CurrencyCircleDollar, Info, Plus, MagnifyingGlass as Search, Wallet, X } from "@phosphor-icons/react";
import { compact, percent, type Token } from "./data";
import { NearIcon, SolanaIcon } from "./brand-icons";
import { TokenAvatar } from "./shared";
import { TokenChart } from "./token-chart";
import { createTokenActivity } from "./token-detail-fixtures";
import type { PreviewWallet } from "./wallet";
import "./near-pairs.css";
import { TradeToast, type TradeResult } from "./trade-toast";

// Presentation conversion only. This is neither an exchange-rate feed nor a quote.
const NEAR_USD_FIXTURE = 4.70;

const NETWORKS = ["Solana", "Robinhood Chain"] as const;
type PairNetwork = typeof NETWORKS[number];
type TradeSide = "Buy" | "Sell";

const priceInNear = (token: Token) => token.price / NEAR_USD_FIXTURE;
const quantity = (value: number, digits = 4) => value.toLocaleString("en-US", { maximumFractionDigits: digits });
const nearPrice = (value: number) => value > 0 && value < .0000001 ? value.toExponential(3) : value.toLocaleString("en-US", { maximumFractionDigits: value < .0001 ? 9 : 7 });
const validAmount = (value: string) => /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0;
const poolLabel = (token: Token, network: PairNetwork) => token.stage !== "Established" ? "Bonding curve" : network === "Solana" ? `${token.launchpad} pool` : "Robinhood pool";

function NetworkMark({ network, size = 13 }: { network: PairNetwork; size?: number }) {
  return network === "Solana" ? <SolanaIcon size={size} /> : <CurrencyCircleDollar size={size} aria-hidden="true" />;
}

function PairTrade({ token, wallet, network }: { token: Token; wallet: PreviewWallet; network: PairNetwork }) {
  const [side, setSide] = useState<TradeSide>("Buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(3);
  const [result, setResult] = useState<TradeResult | null>(null);
  const dismissResult = useCallback(() => setResult(null), []);
  const [error, setError] = useState("");
  const fieldId = useId();
  const size = validAmount(amount) ? Number(amount) : 0;
  const price = priceInNear(token);
  const holding = wallet.connected ? wallet.tokenBalance(token.id) : 0;
  const gross = side === "Buy" ? size : size * price;
  const fee = gross * .01;
  const receive = side === "Buy" ? (gross - fee) / price : gross - fee;
  const minimum = receive * (1 - slippage / 100);
  const available = side === "Buy" ? wallet.assets.NEAR : holding;
  const insufficient = size > available;
  const receiveUnit = side === "Buy" ? token.symbol : "NEAR";
  const update = (value: string) => { setAmount(value); setResult(null); setError(""); };

  return <section className="np-trade-panel" aria-label={`Trade ${token.symbol} with NEAR`}>
    <form noValidate onSubmit={event => { event.preventDefault(); const outcome = wallet.execute({type:side,token,amount:Number(amount),currency:"NEAR",fee:.01}); setResult({id:Date.now(),status:outcome.ok?"success":"error",title:`${side} ${token.symbol} ${outcome.ok?"successful":"failed"}`,message:outcome.ok?"Your simulated balance and position have been updated.":outcome.error}); }}>
      <div className="np-trade-sides" role="group" aria-label="Trade side">{(["Buy", "Sell"] as const).map(item => <button key={item} type="button" className={side === item ? `is-active is-${item.toLowerCase()}` : ""} aria-pressed={side === item} onClick={() => { setSide(item); update(""); }}>{item}</button>)}</div>
      <div className="np-order-label"><span>Market order</span></div>
      <div className="np-spend-label"><label htmlFor={fieldId}>{side === "Buy" ? "Spend NEAR" : `Sell ${token.symbol}`}</label><span>Balance <strong>{compact(available)} {side === "Buy" ? "NEAR" : token.symbol}</strong></span></div>
      <div className={`np-amount ${error ? "has-error" : ""}`}><input id={fieldId} aria-label={side === "Buy" ? "Spend amount in NEAR" : `Sell amount in ${token.symbol}`} aria-invalid={!!error} aria-describedby={error ? `${fieldId}-error` : undefined} value={amount} onChange={event => update(event.target.value)} placeholder="0.00" inputMode="decimal" autoComplete="off" /><span>{side === "Buy" ? <NearIcon size={15} /> : token.symbol}</span></div>
      <div className="np-amount-presets" role="group" aria-label={side === "Buy" ? "NEAR amount presets" : "Sell percentage presets"}>{side === "Buy" ? [.5, 1, 5, 10].map(value => <button key={value} type="button" aria-pressed={size === value} onClick={() => update(String(value))}>{value} NEAR</button>) : [25, 50, 75, 100].map(value => <button key={value} type="button" disabled={!holding} aria-pressed={holding > 0 && size === holding * value / 100} onClick={() => update(String(holding * value / 100))}>{value}%</button>)}</div>
      <div className="np-slippage"><span>Slippage</span><div role="group" aria-label="Slippage tolerance">{[1, 3, 5, 10].map(value => <button key={value} type="button" aria-pressed={slippage === value} onClick={() => { setSlippage(value); setResult(null); }}>{value}%</button>)}</div></div>
      <dl className="np-quote"><div><dt>Price</dt><dd>{nearPrice(price)} NEAR</dd></div><div><dt>You receive</dt><dd className="np-receive">{size ? `${quantity(receive)} ${receiveUnit}` : "—"}</dd></div><div><dt>Minimum received</dt><dd>{size ? `${quantity(minimum)} ${receiveUnit}` : "—"}</dd></div><div><dt>NOMO fee <span>1%</span></dt><dd>{size ? `${quantity(fee, 6)} NEAR` : "—"}</dd></div><div><dt>Gas</dt><dd>Sponsored</dd></div></dl>
      <button className={`np-primary np-trade-submit ${side === "Sell" ? "is-sell" : ""}`} type="submit">{side} {token.symbol}<ArrowRight size={14} aria-hidden="true" /></button>
      {error && <p className="np-error" id={`${fieldId}-error`} role="alert">{error}</p>}
      <p className="np-trade-note">Quoted in NEAR for {network}. Slippage sets the minimum received.</p>

    </form>
    <TradeToast result={result} onDismiss={dismissResult}/>
  </section>;
}

function PairWallet({ network, wallet }: { network: PairNetwork; wallet: PreviewWallet }) {
  const [direction, setDirection] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");
  const fieldId = useId();
  const source = direction === "add" ? "NEAR" : network;
  const destination = direction === "add" ? network : "NEAR";
  const amountIsValid = validAmount(amount);
  return <section className="np-pair-wallet" aria-label={`${network} trading wallet`}>
    <div className="np-section-title"><h2><Wallet size={14} aria-hidden="true" />{network} trading wallet</h2></div>
    <p className="np-wallet-description">Your NEAR balance and paired tokens on {network}.</p>
    <div className="np-wallet-card"><div className="np-wallet-address"><code aria-label="Wallet address unavailable">••••••••••••••••</code><button type="button" disabled aria-label={`Copy ${network} wallet address`} title="Connect a wallet to copy its address"><Copy size={13} /></button></div><div className="np-wallet-balances"><div><span>Trading balance</span><strong>{quantity(wallet.assets.NEAR)}<small>NEAR</small></strong></div><div><span>Available USDC</span><strong>{quantity(wallet.balance, 2)}<small>USDC</small></strong></div></div></div>
    <div className="np-transfer-tabs" role="group" aria-label="NEAR transfer direction"><button type="button" aria-pressed={direction === "add"} onClick={() => { setDirection("add"); setNotice(""); }}><ArrowDownLeft size={12} aria-hidden="true" />Add NEAR</button><button type="button" aria-pressed={direction === "withdraw"} onClick={() => { setDirection("withdraw"); setNotice(""); }}><ArrowUpRight size={12} aria-hidden="true" />Withdraw</button></div>
    <form noValidate onSubmit={event => { event.preventDefault(); const outcome = wallet.execute(direction === "add" ? {type:"Convert",asset:"USDC",amount:Number(amount)*NEAR_USD_FIXTURE} : {type:"Send",asset:"NEAR",amount:Number(amount),recipient:"external.near"}); setNotice(outcome.ok ? "Transfer completed in your simulated wallet." : outcome.error); }}>
      <label className="np-transfer-amount" htmlFor={fieldId}><span>{direction === "add" ? "From your USDC balance" : `From your ${source} wallet`}<NearIcon size={12} /></span><input id={fieldId} aria-label={`NEAR transfer amount from ${source}`} value={amount} onChange={event => { setAmount(event.target.value); setNotice(""); }} placeholder="0.00" inputMode="decimal" autoComplete="off" /><span>Available {quantity(direction === "add" ? wallet.balance / NEAR_USD_FIXTURE : wallet.assets.NEAR)} NEAR<button type="button" onClick={() => { setAmount(String(direction === "add" ? wallet.balance / NEAR_USD_FIXTURE : wallet.assets.NEAR)); setNotice(""); }}>Max</button></span></label>
      <div className="np-transfer-arrow"><ArrowDown size={12} aria-hidden="true" /></div><div className="np-transfer-destination"><span>To your {destination} wallet<NearIcon size={12} /></span><strong>{amountIsValid ? `${quantity(Number(amount))} NEAR` : "—"}</strong><p>Uses the fixed simulated NEAR rate.</p></div>
      <button type="submit" className="np-secondary np-transfer-submit"><ArrowsLeftRight size={13} aria-hidden="true" />Transfer</button>
    </form>
    {notice && <p className="np-wallet-notice" role="status"><Info size={12} aria-hidden="true" /><span>{notice}</span></p>}
  </section>;
}

function PairTrades({ token }: { token: Token }) {
  const [filter, setFilter] = useState<"All" | "Buy" | "Sell">("All");
  const activity = useMemo(() => createTokenActivity(token), [token]);
  const trades = activity.trades.filter(trade => filter === "All" || trade.side === filter.toLowerCase());
  return <section className="np-trades" aria-label={`${token.symbol} trades`}><div className="np-trades-head"><h2>Recent trades</h2><div role="group" aria-label="Trade history filter">{(["All", "Buy", "Sell"] as const).map(item => <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="np-trades-scroll" tabIndex={0} role="region" aria-label="Scrollable recent trades"><table><thead><tr><th>Time</th><th>Side</th><th>{token.symbol}</th><th>NEAR</th><th>Trader</th></tr></thead><tbody>{trades.map((trade, index) => <tr key={trade.id}><td>{trade.ageSeconds < 60 ? `${trade.ageSeconds}s` : `${Math.floor(trade.ageSeconds / 60)}m`} ago</td><td className={`np-side-${trade.side}`}>{trade.side === "buy" ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}{trade.side}</td><td>{quantity(trade.quantity, 2)}</td><td>{quantity(trade.amount / NEAR_USD_FIXTURE, 3)}</td><td><span className="np-trader-label">trader_{String(activity.trades.indexOf(trade) + 1).padStart(2, "0")}</span></td></tr>)}</tbody></table></div></section>;
}

export function NearPairsWorkspace({ tokens, wallet }: { tokens: Token[]; wallet: PreviewWallet }) {
  const [network, setNetwork] = useState<PairNetwork>("Solana");
  const [selectedId, setSelectedId] = useState(tokens[0]?.id || "");
  const [search, setSearch] = useState("");
  const marketHeader = useRef<HTMLElement>(null);
  const searchId = useId();
  const pairs = tokens.filter((_, index) => network === "Solana" ? index < 14 : index >= 14);
  const selected = pairs.find(token => token.id === selectedId) || pairs[0];
  const needle = search.trim().toLowerCase();
  const visiblePairs = pairs.filter(token => `${token.symbol} ${token.name} ${token.contract}`.toLowerCase().includes(needle));
  const switchNetwork = (next: PairNetwork) => { setNetwork(next); setSearch(""); setSelectedId(""); };
  const selectPair = (token: Token) => {
    setSelectedId(token.id);
    marketHeader.current?.focus({ preventScroll: true });
    marketHeader.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return <main className="np-main">
    <header className="np-page-head"><div><h1>NEAR pairs</h1><p>Explore {network} tokens quoted in NEAR.</p></div><div className="np-page-actions"><div className="np-networks" role="group" aria-label="Pair network">{NETWORKS.map(item => <button type="button" key={item} aria-pressed={network === item} onClick={() => switchNetwork(item)}><NetworkMark network={item} />{item}</button>)}</div><Link className="np-create-link" href="/create"><Plus size={13} aria-hidden="true" />Create a pair</Link></div></header>

    {selected ? <div className="np-workspace"><div className="np-market"><header className="np-selected-header" ref={marketHeader} tabIndex={-1} aria-label={`Selected pair ${selected.symbol} quoted in NEAR`}><div className="np-selected-identity"><TokenAvatar token={selected} size={35} variant="square" /><div><h2>{selected.symbol}<span>/ NEAR</span></h2><p>{selected.name}<span>{poolLabel(selected, network)}</span></p></div></div><div className="np-selected-stats"><div><span>Price</span><strong>{nearPrice(priceInNear(selected))}<small>NEAR</small></strong></div><div><span>Market cap</span><strong>{compact(selected.mcap / NEAR_USD_FIXTURE)}<small>NEAR</small></strong></div><div><span>24h volume</span><strong>{compact(selected.volume / NEAR_USD_FIXTURE)}<small>NEAR</small></strong></div><div><span>24h change</span><strong className={selected.change24h >= 0 ? "np-positive" : "np-negative"}>{percent(selected.change24h)}</strong></div></div></header>
      <TokenChart key={`chart:${network}:${selected.id}`} token={selected} quoteCurrency="NEAR" quoteUsdValue={NEAR_USD_FIXTURE} initialMetric="price" />
      <PairTrades key={`trades:${network}:${selected.id}`} token={selected} />
      <section className="np-pairs-list" aria-label={`${network} NEAR pairs`}><div className="np-list-head"><h2>{pairs.length} NEAR pairs<span>on {network}</span></h2><label className="np-pair-search" htmlFor={searchId}><Search size={13} aria-hidden="true" /><input id={searchId} aria-label="Filter pairs by name, symbol, or address" placeholder="Filter name, symbol, or address" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Clear pair filter" onClick={() => setSearch("")}><X size={12} aria-hidden="true" /></button>}</label></div><div className="np-pair-column-heads"><span>Pair</span><span>Price / market cap</span><span>24h trades</span></div><div className="np-pair-rows">{visiblePairs.map(token => <button className={`np-pair-row ${selected.id === token.id ? "is-selected" : ""}`} key={token.id} type="button" aria-pressed={selected.id === token.id} aria-label={`Select ${token.symbol} NEAR pair`} onClick={() => selectPair(token)}><div className="np-pair-identity"><TokenAvatar token={token} size={31} variant="square" /><div><strong>{token.symbol}<span>{token.name}</span></strong><small>{poolLabel(token, network)}<span>{token.stage}</span></small></div></div><div className="np-pair-value"><strong>{nearPrice(priceInNear(token))}<small>NEAR</small></strong><span>{compact(token.mcap / NEAR_USD_FIXTURE)} NEAR cap</span></div><span className="np-pair-trades">{compact(token.buys + token.sells)}<ArrowUpRight size={13} aria-hidden="true" /></span></button>)}</div>{visiblePairs.length === 0 && <div className="np-empty"><Search size={20} aria-hidden="true" /><h3>No matching pairs</h3><p>Try another name, symbol, or address.</p><button type="button" className="np-secondary" onClick={() => setSearch("")}>Clear filter</button></div>}<p className="np-list-note">Showing {visiblePairs.length} of {pairs.length} pairs.</p></section>
    </div><aside className="np-rail" aria-label="NEAR pair trading"><PairTrade key={`${network}:${selected.id}`} token={selected} wallet={wallet} network={network} /><PairWallet key={network} network={network} wallet={wallet} /></aside></div> : <div className="np-empty"><h2>No pairs on this network</h2><p>Select another network to explore its pairs.</p></div>}
  </main>;
}
