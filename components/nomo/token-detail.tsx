"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, Check, CopySimple, Star } from "@phosphor-icons/react";
import { type Token, TIMEFRAMES, changeForTime, compact, money, percent, priceText } from "./data";
import { TokenAvatar } from "./shared";
import { LaunchpadIcon, MarketChainIcon } from "./brand-icons";
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
  const volume = token.volume * share;
  // Authored market simulation: transaction sizes and repeat traders differ by side.
  const marketSeed = [...token.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const buyVolumeShare = .4 + marketSeed % 22 / 100;
  const buyers = Math.min(buys, Math.round(buys * (.4 + marketSeed % 13 / 100)));
  const sellers = Math.min(sells, Math.round(sells * (.48 + marketSeed % 11 / 100)));
  const sharedTraders = Math.round(Math.min(buyers, sellers) * .22);
  const traders = buyers + sellers - sharedTraders;
  return <section className="nt-stats nt-rail-section" aria-label="Market statistics">
    <div className="nt-section-heading"><h2>Market activity</h2><span>{window}</span></div>
    <div className="nt-stat-windows" role="group" aria-label="Statistics timeframe">
      {TIMEFRAMES.map(time => <button type="button" key={time} aria-pressed={window === time} onClick={() => setWindow(time)}><span>{time}</span><strong className={changeForTime(token, time) >= 0 ? "nm-positive" : "nm-negative"}>{percent(changeForTime(token, time))}</strong></button>)}
    </div>
    <div className="nt-stat-breakdown">
      <MarketSplit label="Transactions" total={compact(total)} buyLabel="Buys" sellLabel="Sells" buyValue={compact(buys)} sellValue={compact(sells)} share={buyShare}/>
      <MarketSplit label="Volume" total={money(volume)} buyLabel="Buy volume" sellLabel="Sell volume" buyValue={money(volume * buyVolumeShare)} sellValue={money(volume * (1 - buyVolumeShare))} share={buyVolumeShare}/>
      <MarketSplit label="Traders" total={compact(traders)} buyLabel="Buyers" sellLabel="Sellers" buyValue={compact(buyers)} sellValue={compact(sellers)} share={buyers + sellers ? buyers / (buyers + sellers) : .5}/>
    </div>
    <div className="nt-stat-ratio"><span>Buy / sell ratio</span><strong>{sells ? (buys / sells).toFixed(2) : buys ? "—" : "0.00"}</strong></div>
  </section>;
}

function MarketSplit({ label, total, buyLabel, sellLabel, buyValue, sellValue, share }: { label: string; total: string; buyLabel: string; sellLabel: string; buyValue: string; sellValue: string; share: number }) {
  return <div className="nt-stat-split">
    <div className="nt-stat-total" title={label === "Traders" ? "Unique simulated wallets. A wallet may appear on both sides." : undefined}><span>{label}</span><strong>{total}</strong></div>
    <div className="nt-stat-sides"><div><span>{buyLabel}</span><span>{sellLabel}</span></div><div><strong>{buyValue}</strong><strong>{sellValue}</strong></div><div className="nt-stat-bar" aria-label={`${label}: ${Math.round(share * 100)}% buys, ${Math.round((1 - share) * 100)}% sells`}><i style={{ flex: share }}/><i style={{ flex: 1 - share }}/></div></div>
  </div>;
}

export function TokenDetail({ token, wallet, quickBuy, starred, onStar, onPresets, amountRef, buyFocusRequest }: Props) {
  return <main className="nt-main">
    <div className="nt-breadcrumb"><Link href="/discover/index"><ArrowLeft size={13}/>Discover</Link><span>/</span><strong>{token.symbol}</strong></div>
    <div className="nt-workspace">
      <div className="nt-market">
        <header className="nt-token-header">
          <div className="nt-identity">
            <span className="nt-avatar"><TokenAvatar token={token} variant="square" size={44}/><span className="nt-launchpad" title={token.launchpad}><LaunchpadIcon name={token.launchpad} size={11}/></span></span>
            <div><div className="nt-name"><h1>{token.symbol}</h1><button type="button" className={`nt-star ${starred ? "is-starred" : ""}`} onClick={onStar} aria-pressed={starred} aria-label={`${starred ? "Remove" : "Add"} ${token.symbol} ${starred ? "from" : "to"} watchlist`}><Star size={14} weight={starred ? "fill" : "regular"}/></button><span className="nt-full-name" title={token.name}>{token.name}</span></div><div className="nt-subtitle"><span className="nt-token-age">{token.age}</span><ContractCopy token={token}/><span className="nt-token-origin" title={`${token.chain} · ${token.launchpad}`}><MarketChainIcon chain={token.chain} size={11}/>{token.chain}</span></div></div>
          </div>
          <div className="nt-header-cap" title={`All-time high market cap ${money(token.athMcap)}`}><span>Market cap</span><div><strong>{money(token.mcap)}</strong><small className={token.change24h >= 0 ? "nm-positive" : "nm-negative"}>{percent(token.change24h)}</small></div></div>
          <div className="nt-header-metrics">
            <div><span>Price</span><strong>{priceText(token.price)}</strong></div>
            <div><span>Liquidity</span><strong>{money(token.liquidity)}</strong></div>
            <div><span>24h volume</span><strong>{money(token.volume)}</strong></div>
            <div><span>Total fees</span><strong>{money(token.fees)}</strong></div>
            <div><span>Supply</span><strong>{token.totalSupply >= 1e9 ? `${token.totalSupply / 1e9}B` : compact(token.totalSupply)}</strong></div>
            <div><span>Holders</span><strong>{compact(token.holders)}</strong></div>
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
