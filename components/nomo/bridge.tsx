"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, FileText, Info, Wallet } from "@phosphor-icons/react";
import { RobinhoodMark } from "@/components/marks";
import "./bridge.css";
import type { PreviewWallet } from "./wallet";
import type { CashAsset } from "./simulated-wallet";

const NETWORKS = [
  { id: "solana", name: "Solana", symbol: "SOL", icon: "/nomo/icons/solana-circle.svg", rate: 40 },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", icon: "/nomo/icons/ethereum.svg", rate: 800 },
  { id: "base", name: "Base", symbol: "ETH", icon: "/nomo/icons/base.svg", rate: 800 },
  { id: "robinhood", name: "Robinhood Chain", symbol: "ETH", icon: null, rate: 800 },
] as const;

type Network = (typeof NETWORKS)[number];
type Phase = "form" | "review" | "receipt";

// Deliberately fixed examples. No provider, account lookup, quote or transfer is requested.
const NOMO_FEE = 0.01;
const formatAmount = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 8 });

function validDestination(value: string) {
  const address = value.trim();
  if (/^[a-f0-9]{64}$/.test(address)) return true;
  return address.length <= 64 && /^(?:[a-z0-9]+(?:[-_][a-z0-9]+)*\.)+near$/.test(address);
}

function amountError(value: string) {
  if (!value.trim()) return "Enter an amount to send.";
  if (!/^(?:\d+(?:\.\d{0,8})?|\.\d{1,8})$/.test(value.trim())) return "Enter a number with up to 8 decimal places.";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Enter an amount greater than zero.";
  if (numeric > 1_000_000_000) return "Enter an amount below 1 billion.";
  return "";
}

function NetworkIcon({ network, size = 26 }: { network: Network; size?: number }) {
  return network.icon ? <img src={network.icon} width={size} height={size} alt="" /> : (
    <span className="nb-robinhood-icon" style={{ width: size, height: size }}>
      <RobinhoodMark />
    </span>
  );
}

export function BridgeWorkspace({ wallet }: { wallet: PreviewWallet }) {
  const [network, setNetwork] = useState<Network>(NETWORKS[0]);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("demo.near");
  const [attempted, setAttempted] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [walletNotice, setWalletNotice] = useState("");
  const phaseHeading = useRef<HTMLHeadingElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const destinationInput = useRef<HTMLInputElement>(null);

  const sourceAsset: CashAsset = network.id === "solana" ? "SOL" : network.id === "ethereum" ? "ETH" : network.id === "base" ? "BASE" : "ROBINHOOD";
  const available = wallet.assets[sourceAsset];
  const sendError = amountError(amount) || (Number(amount) > available ? "Amount exceeds your available balance." : "");
  const destinationError = !destination.trim() ? "Enter the NEAR address that will receive the funds." : !validDestination(destination) ? "Use a valid .near account or a 64-character lowercase hex address." : "";
  const numericAmount = amountError(amount) ? 0 : Number(amount);
  const gross = numericAmount * network.rate;
  const fee = gross * NOMO_FEE;
  const receive = gross - fee;

  useEffect(() => {
    if (phase !== "form") phaseHeading.current?.focus();
  }, [phase]);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (sendError) { amountInput.current?.focus(); return; }
    if (destinationError) { destinationInput.current?.focus(); return; }
    setWalletNotice("");
    setPhase("review");
  }

  function requestWalletConnection() {
    wallet.connect(); setDestination("demo.near"); setWalletNotice("Using your simulated wallet.");
  }

  return (
    <main className="nb-workspace">
      <div className="nb-title-row">
        <div>
          <h1>Bridge to NEAR</h1>
          <p>Bring your assets over. Find your next opportunity.</p>
        </div>
      </div>

      <div className="nb-layout">
        <section className="nb-panel" aria-label="Bridge form">
          {phase === "form" ? (
            <form onSubmit={review} noValidate>
              <div className="nb-field-heading">
                <h2>From</h2>
                <button type="button" className="nb-wallet-link" onClick={() => requestWalletConnection()}><Wallet size={14} />Use simulated wallet</button>
              </div>
              <div className="nb-networks" role="group" aria-label="Source network">
                {NETWORKS.map((item) => (
                  <button key={item.id} className={`nb-network ${network.id === item.id ? "is-active" : ""}`} type="button" aria-pressed={network.id === item.id} onClick={() => { setNetwork(item); setWalletNotice(""); }}>
                    <NetworkIcon network={item} />
                    <strong>{item.symbol}</strong>
                    <span>{item.name}</span>
                    {network.id === item.id && <Check className="nb-network-check" size={10} weight="bold" />}
                  </button>
                ))}
              </div>

              <div className={`nb-amount-box ${attempted && sendError ? "has-error" : ""}`}>
                <div className="nb-field-heading"><label htmlFor="bridge-send">You send</label><span className="nb-asset"><NetworkIcon network={network} size={19} />{network.symbol}</span></div>
                <input id="bridge-send" ref={amountInput} className="nb-amount-input" inputMode="decimal" autoComplete="off" spellCheck={false} placeholder="0.0" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={attempted && !!sendError} aria-describedby={attempted && sendError ? "bridge-amount-error" : undefined} />
                <span className="nb-amount-caption">Available {formatAmount(available)} {network.symbol}</span>
              </div>
              {attempted && sendError && <p className="nb-error" id="bridge-amount-error">{sendError}</p>}

              <div className="nb-direction" aria-hidden="true"><ArrowDown size={16} /></div>

              <div className="nb-amount-box nb-receive-box">
                <div className="nb-field-heading"><span>You receive</span><span className="nb-asset"><img src="/nomo/icons/near-circle.svg" alt="" width={19} height={19} />NEAR</span></div>
                <output className="nb-receive-amount" aria-live="polite" title="Calculated with fixed example rates. Not an executable quote.">{numericAmount ? formatAmount(receive) : "—"}</output>
                <span className="nb-amount-caption">Includes a 1% Nomo fee</span>
              </div>

              <div className="nb-destination">
                <div className="nb-field-heading"><label htmlFor="bridge-destination">Receive at</label><button className="nb-meteor-link" type="button" onClick={() => requestWalletConnection()}><img src="/nomo/icons/meteor.svg" alt="" width={15} height={15} />Use my address</button></div>
                <input id="bridge-destination" ref={destinationInput} value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="yourname.near or 64-character address" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} aria-invalid={attempted && !!destinationError} aria-describedby={attempted && destinationError ? "bridge-destination-error" : "bridge-address-help"} />
                {attempted && destinationError ? <p className="nb-error" id="bridge-destination-error">{destinationError}</p> : <p className="nb-address-help" id="bridge-address-help">Enter the receiving account on NEAR.</p>}
              </div>

              {walletNotice && <div className="nb-wallet-notice" role="status"><Info size={15} /><p>{walletNotice}</p></div>}
              <button className="nb-primary" type="submit">Review route</button>
            </form>
          ) : (
            <div className="nb-review">
              {phase === "review" ? <button type="button" className="nb-back" onClick={() => setPhase("form")}><ArrowLeft size={14} />Edit details</button> : <div className="nb-receipt-icon"><FileText size={23} /></div>}
              <h2 tabIndex={-1} ref={phaseHeading}>{phase === "review" ? "Review your route" : "Bridge complete"}</h2>
              <p className="nb-review-intro">{phase === "review" ? "Check the destination and amounts before continuing." : "Your simulated balances have been updated. No on-chain transaction was sent."}</p>
              <div className="nb-review-route"><span><NetworkIcon network={network} size={27} /><strong>{network.name}</strong></span><ArrowDown size={15} /><span><img src="/nomo/icons/near-circle.svg" alt="" width={27} height={27} /><strong>NEAR</strong></span></div>
              <dl className="nb-review-details">
                <div><dt>You send</dt><dd>{formatAmount(numericAmount)} {network.symbol}</dd></div>
                <div><dt>You receive</dt><dd>{formatAmount(receive)} NEAR</dd></div>
                <div><dt>Nomo fee (1%)</dt><dd>{formatAmount(fee)} NEAR</dd></div>
                <div><dt>Network fee</dt><dd>Not estimated</dd></div>
                <div className="nb-recipient-row"><dt>Receive at</dt><dd>{destination.trim()}</dd></div>
              </dl>
              {walletNotice && <p className="nb-error" role="status">{walletNotice}</p>}
              {phase === "review" ? <button className="nb-primary" type="button" onClick={() => { const result = wallet.execute({type:"Bridge",asset:sourceAsset,amount:numericAmount,recipient:destination.trim()}); if(result.ok){setWalletNotice("");setPhase("receipt");}else setWalletNotice(result.error); }}>Confirm bridge</button> : <button className="nb-primary" type="button" onClick={() => { setPhase("form"); setAttempted(false); }}>Back to bridge</button>}
            </div>
          )}
        </section>

        <aside className="nb-sidebar" aria-label="Bridge information">
          <section className="nb-meteor-card">
            <div className="nb-meteor-heading"><img src="/nomo/icons/meteor.svg" alt="" width={36} height={36} /><div><h2>Meteor Wallet</h2><span>Recommended</span></div></div>
            <p>A home for your NEAR assets. Use your Meteor account as the receiving address.</p>
            <div className="nb-meteor-actions"><button type="button" onClick={() => { if (phase !== "form") setPhase("form"); requestWalletConnection(); }}>Connect</button><a href="https://meteorwallet.app/" target="_blank" rel="noopener noreferrer">Download<ArrowUpRight size={12} /></a></div>
          </section>

          <section className="nb-route-info">
            <h2>Your route</h2>
            <div className="nb-route-stops"><span><NetworkIcon network={network} size={20} />{network.name}<small>{network.symbol}</small></span><div className="nb-route-path"><span />Conversion<span /></div><span><img src="/nomo/icons/near-circle.svg" alt="" width={20} height={20} />NEAR<small>NEAR</small></span></div>
            <dl><div><dt>Nomo fee</dt><dd>1%</dd></div><div><dt>Exchange rate</dt><dd title="Fixed example rate. Not an executable quote.">1 {network.symbol} = {formatAmount(network.rate)} NEAR</dd></div></dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
