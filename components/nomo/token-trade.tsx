"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ArrowDown, Check, GearSix, SlidersHorizontal, Wallet, X } from "@phosphor-icons/react";
import { compact, priceText, type Token } from "./data";
import type { useQuickBuySettings } from "./quick-buy-settings";
import type { PreviewWallet } from "./wallet";
import "./token-trade.css";

type Quote = { side: "Buy" | "Sell"; amount: number; receive: number; minimum: number };
type TokenTradeProps = {
  token: Token;
  wallet: PreviewWallet;
  quickBuy: ReturnType<typeof useQuickBuySettings>;
  onPresets: () => void;
  amountRef: RefObject<HTMLInputElement | null>;
  buyFocusRequest?: number;
};
const dollars = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantity = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 4 });

export function TokenTrade({ token, wallet, quickBuy, onPresets, amountRef, buyFocusRequest }: TokenTradeProps) {
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [sellAmount, setSellAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const settingsRoot = useRef<HTMLDivElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const lastBuyFocusRequest = useRef(buyFocusRequest);
  const buyFocusPending = useRef(false);
  const fieldId = useId();
  const slippageId = useId();
  const holding = wallet.connected ? wallet.tokenBalance(token.id) : 0;
  const available = wallet.connected ? side === "Buy" ? wallet.balance : holding : 0;
  const amount = side === "Buy" ? quickBuy.amount : sellAmount;
  const size = Number(amount);
  const tolerance = Number(slippage);
  const validSlippage = slippage.trim() !== "" && Number.isFinite(tolerance) && tolerance >= .1 && tolerance <= 50;
  const validSize = amount.trim() !== "" && Number.isFinite(size) && size > 0;
  const validPrice = Number.isFinite(token.price) && token.price > 0;
  const overBalance = validSize && size > available;
  const canPreview = wallet.connected && validSize && !overBalance && validSlippage && validPrice;
  const receive = validSize && validPrice ? side === "Buy" ? size / token.price : size * token.price : 0;
  const minimum = receive * (1 - tolerance / 100);
  const setAmount = (value: string) => side === "Buy" ? quickBuy.setAmount(value) : setSellAmount(value);
  const receipt = (value: number) => side === "Buy" ? `${quantity(value)} ${token.symbol}` : dollars(value);
  const hint = !wallet.connected ? "Connect your wallet to set an order." : !validSize ? "Enter an amount greater than zero." : overBalance ? side === "Buy" ? "Amount exceeds the available balance." : holding === 0 ? `No ${token.symbol} in this wallet.` : "Amount exceeds your token balance." : !validSlippage ? "Set slippage between 0.1% and 50%." : !validPrice ? "A price is needed to review this order." : null;

  useEffect(() => {
    setSide("Buy");
    setSellAmount("");
    setQuote(null);
    setSettingsOpen(false);
  }, [token.id]);
  useEffect(() => { setQuote(null); }, [amount, side, slippage, wallet.connected]);
  useEffect(() => {
    if (buyFocusRequest !== undefined && buyFocusRequest !== lastBuyFocusRequest.current) {
      lastBuyFocusRequest.current = buyFocusRequest;
      buyFocusPending.current = true;
      setSide("Buy");
      setQuote(null);
    }
    if (buyFocusPending.current && side === "Buy") {
      buyFocusPending.current = false;
      amountRef.current?.focus();
      amountRef.current?.select();
    }
  }, [buyFocusRequest, side, amountRef]);
  useEffect(() => {
    if (!settingsOpen) return;
    const outside = (event: PointerEvent) => {
      if (!settingsRoot.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSettingsOpen(false); settingsTrigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [settingsOpen]);

  return <section className="nt-trade" aria-label={`Trade ${token.symbol}`}>
    {holding > 0 && <div className="nt-trade-position">
      <div className="nt-trade-position-title"><Wallet size={14}/><span>My position</span></div>
      <div className="nt-trade-position-grid">
        <div><span>Balance</span><strong title={`${quantity(holding)} ${token.symbol}`}>{compact(holding)} <small>{token.symbol}</small></strong></div>
        <div><span>Value</span><strong>{dollars(holding * token.price)}</strong></div>
      </div>
    </div>}

    <form className="nt-trade-form" onSubmit={event => {
      event.preventDefault();
      if (canPreview) setQuote({ side, amount: size, receive, minimum });
    }}>
      <div className="nt-trade-sides" role="group" aria-label="Trade side">
        {(["Buy", "Sell"] as const).map(value => <button key={value} type="button" aria-pressed={side === value} className={side === value ? `is-active is-${value.toLowerCase()}` : ""} onClick={() => setSide(value)}>{value}</button>)}
      </div>
      <div className="nt-trade-order-type"><span>Market order</span><div className="nt-trade-settings" ref={settingsRoot}>
        <button ref={settingsTrigger} type="button" aria-label="Set slippage tolerance" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><GearSix size={13}/><span>{validSlippage ? `${slippage}%` : "Slippage"}</span></button>
        {settingsOpen && <div className="nt-trade-slippage" role="dialog" aria-label="Slippage tolerance">
          <div className="nt-trade-slippage-title"><label htmlFor={slippageId}>Slippage tolerance</label><button type="button" aria-label="Close slippage settings" onClick={() => { setSettingsOpen(false); settingsTrigger.current?.focus(); }}><X size={13}/></button></div>
          <div className="nt-trade-slippage-input"><input autoFocus id={slippageId} type="number" inputMode="decimal" min="0.1" max="50" step="0.1" value={slippage} aria-invalid={!validSlippage} onChange={event => setSlippage(event.target.value)}/><span>%</span></div>
          <p>{validSlippage ? "Used to calculate the minimum amount received." : "Enter a value from 0.1 to 50."}</p>
        </div>}
      </div></div>

      <div className="nt-trade-amount-label"><label htmlFor={fieldId}>Amount</label><span>Available <strong>{side === "Buy" ? dollars(available) : `${compact(available)} ${token.symbol}`}</strong></span></div>
      <div className={`nt-trade-amount ${overBalance ? "has-error" : ""}`}>
        {side === "Buy" && <span className="nt-trade-dollar" aria-hidden="true">$</span>}
        <input ref={amountRef} id={fieldId} aria-label={side === "Buy" ? "Buy amount in dollars" : `Sell amount in ${token.symbol}`} aria-invalid={overBalance || (amount !== "" && !validSize)} aria-describedby={hint ? `${fieldId}-hint` : undefined} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={amount} onChange={event => setAmount(event.target.value)}/>
        {side === "Sell" && <span className="nt-trade-unit">{token.symbol}</span>}
        <button type="button" disabled={!wallet.connected || available <= 0} onClick={() => setAmount(String(available))}>Max</button>
      </div>
      <div className={`nt-trade-amount-presets ${side === "Sell" ? "is-sell" : ""}`} role="group" aria-label={side === "Buy" ? "Buy amount presets" : "Sell percentage"}>
        {side === "Buy" ? <>{quickBuy.presets.map((value, index) => <button type="button" key={index} aria-pressed={quickBuy.activePreset === index} onClick={() => quickBuy.selectPreset(index)}><span>P{index + 1}</span><strong>${compact(value)}</strong></button>)}<button type="button" className="nt-trade-edit-presets" aria-label="Edit quick buy presets" onClick={onPresets}><SlidersHorizontal size={14}/></button></> : [25, 50, 75, 100].map(value => <button type="button" key={value} disabled={holding <= 0} aria-pressed={holding > 0 && size === holding * value / 100} onClick={() => setSellAmount(String(holding * value / 100))}>{value}%</button>)}
      </div>

      <div className="nt-trade-estimate">
        <div><span>Price</span><span>{priceText(token.price)}</span></div>
        <div><span>You receive</span><strong>{receive > 0 ? `≈ ${receipt(receive)}` : "—"}</strong></div>
        <div><span>Minimum received</span><span>{receive > 0 && validSlippage ? receipt(minimum) : "—"}</span></div>
      </div>
      {wallet.connected ? <button className={`nt-trade-submit ${side === "Sell" ? "is-sell" : ""}`} type="submit" disabled={!canPreview}>{side} {token.symbol}</button> : <button className="nt-trade-submit" type="button" onClick={wallet.connect}>Connect wallet</button>}
      {hint && <p id={`${fieldId}-hint`} className={`nt-trade-hint ${overBalance ? "is-error" : ""}`}>{hint}</p>}


      {quote && <div className="nt-trade-confirmation" role="status" aria-live="polite">
        <div className="nt-trade-confirmation-title"><Check size={14}/><strong>Order review</strong><button type="button" aria-label="Dismiss order review" onClick={() => setQuote(null)}><X size={13}/></button></div>
        <div className="nt-trade-confirmation-swap"><span>{quote.side === "Buy" ? dollars(quote.amount) : `${quantity(quote.amount)} ${token.symbol}`}</span><ArrowDown size={12}/><strong>{quote.side === "Buy" ? `${quantity(quote.receive)} ${token.symbol}` : dollars(quote.receive)}</strong></div>
        <div className="nt-trade-confirmation-min"><span>Minimum received</span><span>{quote.side === "Buy" ? `${quantity(quote.minimum)} ${token.symbol}` : dollars(quote.minimum)}</span></div>
        <p>No trade submitted. Estimate excludes fees and price impact.</p>
      </div>}
    </form>
  </section>;
}
