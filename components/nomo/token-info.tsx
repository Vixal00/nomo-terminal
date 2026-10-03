"use client";

import { CirclesThree, Crosshair, Detective, FileCode, FishSimple, Receipt, Robot, TrendUp, UserGear, UsersThree } from "@phosphor-icons/react";
import { compact as compactNumber, money, type Token } from "./data";
import { DexscreenerIcon, LaunchpadIcon } from "./brand-icons";
import { MetricChip } from "./metric-hover-card";
import { tokenMetricFixtures } from "./token-metric-fixtures";
import "./token-info.css";

// Match the copied Ansem audit bands in lib/trending.ts, including one-decimal rounding.
const signals = [
  {key:"top10Pct",label:"Top 10 holders",icon:UsersThree,description:"Share of supply held by the ten largest holders",warn:25,bad:45},
  {key:"devPct",label:"Dev holdings",icon:UserGear,description:"Share of supply held by the token creator",warn:2,bad:8},
  {key:"snipersPct",label:"Snipers",icon:Crosshair,description:"Share of supply held by wallets classified as early snipers",warn:3,bad:10},
  {key:"bundlersPct",label:"Bundlers",icon:CirclesThree,description:"Share of supply held by bundled buyers",warn:3,bad:10},
] as const;

const percentText = (value:number) => Number.isFinite(value) ? `${Number(value.toFixed(1))}%` : "—";
const extraSignals = [
  {key:"insiders",label:"Insider holdings",icon:Detective,description:"Share of supply held by wallets tagged as insiders",value:(token:Token)=>percentText(token.insidersPct)},
  {key:"phishing",label:"Phishing holdings",icon:FishSimple,description:"Share of supply held by wallets tagged for phishing",value:(token:Token)=>percentText(token.phishingPct)},
  {key:"dex",label:"DEX profile",icon:DexscreenerIcon,description:"Paid token-profile status; payment is not a safety signal",value:(token:Token)=>token.dexPaid?"Paid":"Unpaid"},
  {key:"bots",label:"Bot traders",icon:Robot,description:"Number of holders tagged as trading-bot users",value:(token:Token)=>compactNumber(token.botTraders)},
] as const;

function signalTone(value:number,warn:number,bad:number):"ok"|"warn"|"bad"|"unknown" {
  if (!Number.isFinite(value)) return "unknown";
  const rounded = Number(value.toFixed(1));
  return rounded >= bad ? "bad" : rounded >= warn ? "warn" : "ok";
}

export function TokenSignals({token,compact=false,variant="inline",essential=false}:{token:Token;compact?:boolean;variant?:"inline"|"chips";essential?:boolean}) {
  if (variant === "chips") {
    const audit = tokenMetricFixtures(token);
    const usd = (value:number) => value.toLocaleString("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2});
    const developerCard = <>
      <strong className="nm-metric-heading">{token.devPct === 0 ? "Dev sold all" : "Developer wallet"}</strong>
      <span className="nm-metric-rows">
        <span><span>Dev wallet</span><code>{audit.developer.wallet}</code></span>
        <span><span>Bought</span><strong className="nm-metric-positive">{usd(audit.developer.bought)} <small>/ {audit.developer.buyTxs} txs</small></strong></span>
        <span><span>Sold</span><strong className="nm-metric-negative">{usd(audit.developer.sold)} <small>/ {audit.developer.sellTxs} txs</small></strong></span>
        <span><span>Balance</span><strong>{usd(audit.developer.balance)}</strong></span>
        <span><span>Funding</span><code>{audit.developer.funding}</code></span>
        <span><span>Transfer in</span><strong>{audit.developer.transferSol.toFixed(2)} SOL</strong></span>
        <span><span>Time</span><time>{audit.developer.fundedAt}</time></span>
      </span>
    </>;
    const bundlerCard = <span className="nm-metric-rows">
      <span><span>Bundlers hold</span><strong>{percentText(token.bundlersPct)}</strong></span>
      <span><span>ATH hold</span><strong>{percentText(audit.bundlerAthPct)}</strong></span>
      <span><span>Total bundlers</span><strong>{audit.bundlerCount.toLocaleString("en-US")}</strong></span>
      <span><span>Bundled total</span><strong>{audit.bundledTotalSol.toFixed(2)} SOL</strong></span>
      <span><span>Bundled token</span><strong>{percentText(audit.bundledTokenPct)}</strong></span>
    </span>;
    const riskChips = signals.map(({key,label,icon:Icon,warn,bad})=>{
      const value = token[key];
      const text = percentText(value);
      const content = key === "top10Pct" ? `Top 10 · ${text}` : key === "devPct" ? developerCard : key === "bundlersPct" ? bundlerCard : `Snipers hold ${text}`;
      return <MetricChip key={key} label={`${label}: ${text}`} tone={signalTone(value,warn,bad)} content={content}><Icon size={11} weight="regular" aria-hidden="true"/><strong>{text}</strong></MetricChip>;
    });
    const extraChips = extraSignals.map(({key,label,icon:Icon,value})=>{
      const content = key === "dex" ? (token.dexPaid ? <time>{audit.dexPaidAt}</time> : undefined)
        : key === "bots" ? <span className="nm-metric-description">{token.botTraders.toLocaleString("en-US")} wallets that used Axiom, Padre, Photon, etc. currently hold {percentText(audit.botHoldPct)}.</span>
        : key === "insiders" ? `Insiders hold ${value(token)}` : `Phishing hold ${value(token)}`;
      return <MetricChip key={key} label={`${label}: ${value(token)}`} tone="neutral" content={content}><Icon size={11} weight="regular" aria-hidden="true"/><strong>{value(token)}</strong></MetricChip>;
    });
    if (essential) return <span className="nm-token-signals is-compact is-chips" aria-label={`${token.symbol} token metrics`}><span className="nm-signal-line">{riskChips[0]}{riskChips[1]}{riskChips[2]}</span></span>;
    return <span className="nm-token-signals is-compact is-chips" aria-label={`${token.symbol} token metrics`}>
      <span className="nm-signal-line">{riskChips[0]}{riskChips[1]}{extraChips[0]}{riskChips[3]}</span>
      <span className="nm-signal-line">{extraChips[1]}{riskChips[2]}{extraChips[2]}{extraChips[3]}</span>
    </span>;
  }
  return <span className={`nm-token-signals ${compact?"is-compact":""}`} aria-label={`${token.symbol} holder distribution`}>
    {signals.map(({key,label,icon:Icon,description})=><span key={key} aria-label={`${label}: ${token[key].toFixed(1)}%`} title={`${label} — ${description}: ${token[key].toFixed(1)}%.`}><Icon size={13} weight="bold" aria-hidden="true"/><span className="nm-signal-label">{label}</span><strong>{token[key].toFixed(1)}%</strong></span>)}
  </span>;
}

export function TokenDetails({token}:{token:Token}) {
  return <section className="nm-token-details" aria-label="Token information">
    <h3>Token information <span><LaunchpadIcon name={token.launchpad} size={13}/>{token.launchpad}</span></h3>
    <div className="nm-token-detail-grid">
      {signals.map(({key,label,icon:Icon,description,warn,bad})=><div key={key} title={`${description}.`}><span><Icon size={13} weight="bold" aria-hidden="true"/>{label}</span><strong data-tone={signalTone(token[key],warn,bad)}>{token[key].toFixed(1)}%</strong></div>)}
      {extraSignals.map(({key,label,icon:Icon,description,value})=><div key={key} title={description}><span><Icon size={13} weight="regular" aria-hidden="true"/>{label}</span><strong>{value(token)}</strong></div>)}
      <div><span><TrendUp size={13} weight="bold" aria-hidden="true"/>ATH market cap</span><strong>{money(token.athMcap)}</strong></div><div><span><Receipt size={13} weight="bold" aria-hidden="true"/>Total fees</span><strong>{money(token.fees)}</strong></div>
    </div>
    <div className="nm-token-contract" title="Contract reference"><span><FileCode size={13} weight="bold" aria-hidden="true"/>Contract</span><code>{token.contract.slice(0,4)}…{token.contract.slice(-4)}</code></div>
  </section>;
}
