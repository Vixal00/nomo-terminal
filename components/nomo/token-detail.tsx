"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, Check, CopySimple, Star } from "@phosphor-icons/react";
import { type Token, TIMEFRAMES, changeForTime, compact, money, percent, priceText } from "./data";
import { TokenAvatar } from "./shared";
import { LaunchpadIcon, SolanaIcon } from "./brand-icons";
import { TokenDetails } from "./token-info";
import { type PreviewWallet } from "./wallet";
import { type useQuickBuySettings } from "./quick-buy-settings";
import { TokenChart } from "./token-chart";
import { TokenActivity } from "./token-activity";
import { TokenTrade } from "./token-trade";
import "./token-detail.css";

type Props = {
  token: Token;
  wallet: PreviewWallet;
  quickBuy: ReturnType<typeof useQuickBuySettings>;
  starred: boolean;
  onStar: () => void;
  onPresets: () => void;
  amountRef: RefObject<HTMLInputElement | null>;
  buyFocusRequest: number;
};

function ContractCopy({ token }: { token: Token }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  useEffect(() => {
    setCopied(false); setFailed(false);
    return () => { request.current++; if (timer.current) clearTimeout(timer.current); };
  }, [token.id]);
  const copy = async () => {
    const current = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(token.contract);
      if (request.current !== current) return;
      setCopied(true); setFailed(false);
    } catch {
      if (request.current !== current) return;
      setFailed(true);
    }
    timer.current = setTimeout(() => { setCopied(false); setFailed(false); }, 1800);
  };
  return <button className="nt-contract" type="button" onClick={copy} aria-label={copied ? "Contract address copied" : "Copy token contract address"} title={token.contract}>
    {token.contract.slice(0, 4)}…{token.contract.slice(-4)}
    {copied ? <Check size={12} className="nt-copied"/> : <CopySimple size={12}/>}
    <span className="nt-sr-only" role="status">{copied ? "Address copied" : failed ? "Copy failed. Try again." : ""}</span>
  </button>;
}

function MarketStats({ token }: { token: Token }) {
  const [window, setWindow] = useState("24h");
  const share = { "1m": 1 / 1440, "5m": 5 / 1440, "30m": 1 / 48, "1h": 1 / 24, "24h": 1 }[window] ?? 1;
  const buys = Math.round(token.buys * share);
  const sells = Math.round(token.sells * share);
  const total = buys + sells;
  const buyShare = total ? buys / total : .5;
  return <section className="nt-stats nt-rail-section" aria-label="Market statistics">
    <h2>Market activity</h2>
    <div className="nt-stat-windows" role="group" aria-label="Statistics timeframe">
      {TIMEFRAMES.map(time => <button type="button" key={time} aria-pressed={window === time} onClick={() => setWindow(time)}><span>{time}</span><strong className={changeForTime(token, time) >= 0 ? "nm-positive" : "nm-negative"}>{percent(changeForTime(token, time))}</strong></button>)}
    </div>
    <div className="nt-stat-totals"><div><span>Volume</span><strong>{money(token.volume * share)}</strong></div><div><span>Transactions</span><strong>{compact(total)}</strong></div><div><span>Buy / sell ratio</span><strong>{sells ? (buys / sells).toFixed(2) : buys ? "—" : "0.00"}</strong></div></div>
    <div className="nt-pressure-labels"><span><i/>{compact(buys)} buys</span><span>{compact(sells)} sells<i/></span></div>
    <div className="nt-pressure-track" aria-label={`${Math.round(buyShare * 100)} percent buys`}><span style={{ width: `${buyShare * 100}%` }}/></div>
    <div className="nt-pressure-values"><span>{money(token.volume * share * buyShare)}</span><span>{money(token.volume * share * (1 - buyShare))}</span></div>
  </section>;
}

export function TokenDetail({ token, wallet, quickBuy, starred, onStar, onPresets, amountRef, buyFocusRequest }: Props) {
  return <main className="nt-main">
    <div className="nt-breadcrumb"><Link href="/discover/index"><ArrowLeft size={13}/>Discover</Link><span>/</span><strong>{token.symbol}</strong></div>
    <div className="nt-workspace">
      <div className="nt-market">
        <header className="nt-token-header">
          <div className="nt-identity">
            <span className="nt-avatar"><TokenAvatar token={token} variant="square" size={42}/><span className="nt-launchpad" title={token.launchpad}><LaunchpadIcon name={token.launchpad} size={12}/></span></span>
            <div><div className="nt-name"><h1>{token.symbol}</h1><ContractCopy token={token}/><button type="button" className={`nt-star ${starred ? "is-starred" : ""}`} onClick={onStar} aria-pressed={starred} aria-label={`${starred ? "Remove" : "Add"} ${token.symbol} ${starred ? "from" : "to"} watchlist`}><Star size={15} weight={starred ? "fill" : "regular"}/></button></div><div className="nt-subtitle"><span>{token.name}</span><span>{token.age}</span><span className="nt-network"><SolanaIcon size={10}/>Solana</span></div></div>
          </div>
          <div className="nt-header-metrics">
            <div><span>Price</span><strong>{priceText(token.price)}</strong><small className={token.change24h >= 0 ? "nm-positive" : "nm-negative"}>{percent(token.change24h)} <span>24h</span></small></div>
            <div><span>Market cap</span><strong>{money(token.mcap)}</strong><small>ATH {money(token.athMcap)}</small></div>
            <div><span>Liquidity</span><strong>{money(token.liquidity)}</strong><small>{token.launchpad}</small></div>
            <div><span>Holders</span><strong>{compact(token.holders)}</strong><small>{token.totalSupply >= 1e9 ? `${token.totalSupply / 1e9}B` : compact(token.totalSupply)} supply</small></div>
          </div>
        </header>
        <TokenChart key={token.id} token={token}/>
        <TokenActivity token={token}/>
      </div>
      <aside className="nt-rail" aria-label="Trading and token information">
        <TokenTrade token={token} wallet={wallet} quickBuy={quickBuy} onPresets={onPresets} amountRef={amountRef} buyFocusRequest={buyFocusRequest}/>
        <MarketStats key={token.id} token={token}/>
        <section className="nt-audit nt-rail-section"><TokenDetails token={token}/></section>
        <section className="nt-progress nt-rail-section" aria-label="Launch progress"><div><h2>{token.stage === "Established" ? "Migration complete" : "Bonding curve"}</h2><strong>{token.progress}%</strong></div><div className="nt-progress-track"><span style={{ width: `${token.progress}%` }}/></div><p>{token.stage === "Established" ? `Trading on ${token.launchpad}` : "Progress toward DEX migration"}</p></section>
      </aside>
    </div>
  </main>;
}
