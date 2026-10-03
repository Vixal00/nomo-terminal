"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowRight, ArrowSquareOut, ArrowUpRight, CaretDown, Check, Copy, CurrencyEth, Info, Key, Meteor, PaperPlaneTilt, SignOut, User, Wallet, X } from "@phosphor-icons/react";
import { NearIcon, SolanaIcon } from "./brand-icons";
import type { PreviewWallet } from "./wallet";
import { ASSET_PRICES } from "./simulated-wallet";
import "./wallet-menu.css";

type WalletView = "wallets" | "deposit" | "send";
type DepositAsset = "ETH" | "SOL";
type SendAsset = "NEAR" | "USDC" | "NEARLY" | "SIGHT";
type SendReview = { asset: SendAsset; recipient: string; amount: string };

const USERNAME_KEY = "nomo.previewWallet.username";
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const NETWORKS = ["Ethereum", "Base", "Robinhood"] as const;
// Wallet providers are not connected; unavailable addresses are rendered as masked placeholders.
const WALLETS = [
  { name: "NEAR", description: "Trading wallet", icon: "near" },
  { name: "Solana", description: "SOL deposit wallet", icon: "sol" },
  { name: "Ethereum / EVM", description: "Ethereum, Base, Arbitrum, Robinhood", icon: "eth" },
] as const;

function ChainIcon({ chain, size = 15 }: { chain: "near" | "sol" | "eth"; size?: number }) {
  if (chain === "near") return <NearIcon size={size} />;
  if (chain === "sol") return <SolanaIcon size={size} />;
  return <CurrencyEth size={size} aria-hidden="true" />;
}

function validRecipient(value: string) {
  return /^[a-f0-9]{64}$/.test(value) || (value.length <= 64 && /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*\.near$/.test(value));
}

export function WalletMenu({ wallet, onPortfolio }: { wallet: PreviewWallet; onPortfolio?: () => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WalletView>("wallets");
  const [position, setPosition] = useState({ left: 12, top: 64, height: 620 });
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [notice, setNotice] = useState("");
  const [depositAsset, setDepositAsset] = useState<DepositAsset>("ETH");
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>("Ethereum");
  const [sendAsset, setSendAsset] = useState<SendAsset>("NEAR");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sendErrors, setSendErrors] = useState<{ recipient?: string; amount?: string }>({});
  const [review, setReview] = useState<SendReview | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const activeTrigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USERNAME_KEY) || "";
      if (USERNAME_PATTERN.test(stored)) { setUsername(stored); setSavedUsername(stored); }
    } catch {}
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = root.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = document.documentElement.clientWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const panelWidth = Math.min(360, width - 24);
      const top = Math.max(viewportTop + 12, Math.min(anchor.bottom + 8, viewportTop + height - 150));
      setPosition({ left: Math.max(12, Math.min(anchor.right - panelWidth, width - panelWidth - 12)), top, height: Math.max(120, viewportTop + height - top - 12) });
    };
    place();
    panel.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      (activeTrigger.current || trigger.current)?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [view]);

  const close = () => { setOpen(false); (activeTrigger.current || trigger.current)?.focus({ preventScroll: true }); };
  const changeView = (next: WalletView) => { setView(next); setNotice(""); setReview(null); };
  const openMenu = (next: WalletView, source: HTMLButtonElement | null) => {
    activeTrigger.current = source;
    if (open && view === next) { setOpen(false); return; }
    changeView(next);
    setOpen(true);
  };
  const saveUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = username.trim();
    if (!USERNAME_PATTERN.test(next)) { setUsernameError("Use 3–20 letters, numbers, or underscores."); return; }
    setUsernameError("");
    setUsername(next);
    setSavedUsername(next);
    try { localStorage.setItem(USERNAME_KEY, next); setNotice(`@${next} saved on this device.`); }
    catch { setNotice(`@${next} saved for this visit. Device storage is unavailable.`); }
  };
  const balances: Record<SendAsset, number> = { NEAR: wallet.assets.NEAR, USDC: wallet.balance, NEARLY: wallet.tokenBalance("nearly"), SIGHT: wallet.tokenBalance("sight") };
  const available = balances[sendAsset];
  const reviewSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRecipient = recipient.trim();
    const numericAmount = Number(amount);
    const errors: { recipient?: string; amount?: string } = {};
    if (!validRecipient(nextRecipient)) errors.recipient = "Enter a name.near account or a 64-character hex address.";
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount) || !Number.isFinite(numericAmount) || numericAmount <= 0) errors.amount = "Enter an amount greater than zero.";
    else if (numericAmount > available) errors.amount = `Amount exceeds the balance of ${available.toLocaleString("en-US")} ${sendAsset}.`;
    setSendErrors(errors);
    if (Object.keys(errors).length) { setReview(null); return; }
    const result = wallet.execute({type:"Send",asset:sendAsset === "NEARLY" ? "nearly" : sendAsset === "SIGHT" ? "sight" : sendAsset,amount:numericAmount,recipient:nextRecipient});
    if (result.ok) { setReview({asset:sendAsset,recipient:nextRecipient,amount}); setAmount(""); }
    else setSendErrors({amount:result.error});
  };
  const updateSend = () => { setSendErrors({}); setReview(null); };
  const depositNetwork = depositAsset === "ETH" ? network : "Solana";
  const title = view === "wallets" ? "Your wallets" : view === "deposit" ? "Deposit" : "Send";
  const nearBalance = wallet.assets.NEAR.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cash = (wallet.assets.NEAR * ASSET_PRICES.NEAR).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return <div className="nw-wallet" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="nw-trigger" aria-label={wallet.connected ? `Wallet, ${nearBalance} NEAR` : "Open wallet"} aria-haspopup="dialog" aria-expanded={open && view !== "deposit"} aria-controls={open ? `${id}-panel` : undefined} onClick={() => openMenu("wallets", trigger.current)}>
      <NearIcon size={15} />
      {wallet.connected ? <><span className="nw-trigger-balance">{nearBalance} NEAR</span></> : <span>Wallet</span>}
      <CaretDown size={10} aria-hidden="true" />
    </button>

    {open && <div ref={panel} id={`${id}-panel`} className="nw-panel" role="dialog" aria-labelledby={`${id}-title`} tabIndex={-1} style={{ left: position.left, top: position.top, maxHeight: Math.min(684, position.height) }}>
      <div className="nw-panel-head"><h2 id={`${id}-title`}>{title}</h2><button type="button" className="nw-icon-button" aria-label="Close wallet menu" onClick={close}><X size={15} aria-hidden="true" /></button></div>
      {wallet.connected && <div className="nw-tabs" aria-label="Wallet views">
        <button type="button" className={view === "wallets" ? "is-active" : ""} aria-pressed={view === "wallets"} onClick={() => changeView("wallets")}><Wallet size={13} aria-hidden="true" />Wallets</button>
        <button type="button" className={view === "deposit" ? "is-active" : ""} aria-pressed={view === "deposit"} onClick={() => changeView("deposit")}><ArrowDownLeft size={13} aria-hidden="true" />Deposit</button>
        <button type="button" className={view === "send" ? "is-active" : ""} aria-pressed={view === "send"} onClick={() => changeView("send")}><ArrowUpRight size={13} aria-hidden="true" />Send</button>
      </div>}
      <div ref={body} className="nw-panel-body">
        {!wallet.connected ? <div className="nw-signed-out">
          <span className="nw-empty-icon"><Wallet size={22} aria-hidden="true" /></span><h3>Explore your wallet</h3><p>Manage your wallets, deposits, and transfers.</p>
          <button type="button" className="nw-primary" onClick={() => { wallet.connect(); changeView("wallets"); }}>Open wallet<ArrowRight size={14} aria-hidden="true" /></button>
          <button type="button" className="nw-secondary" onClick={() => setNotice("Wallet connection is not available yet.")}><Meteor size={15} aria-hidden="true" />Connect Meteor Wallet</button>
        </div> : view === "wallets" ? <>
          <div className="nw-balance"><div><span>Available balance</span><strong><NearIcon size={20}/>{nearBalance}<small>NEAR</small></strong><span className="nw-balance-usd">${cash}</span></div>{onPortfolio && <button type="button" className="nw-icon-button" aria-label="View portfolio" onClick={() => { close(); onPortfolio(); }}><ArrowUpRight size={16} aria-hidden="true" /></button>}</div>
          <form className="nw-username" onSubmit={saveUsername} noValidate>
            <label htmlFor={`${id}-username`}><User size={13} aria-hidden="true" />Trader username</label>
            <div className="nw-username-row"><div className={`nw-username-input ${usernameError ? "has-error" : ""}`}><span>@</span><input id={`${id}-username`} value={username} onChange={event => { setUsername(event.target.value); setUsernameError(""); }} placeholder="your_username" maxLength={20} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={!!usernameError} aria-describedby={`${id}-username-help`} /></div><button type="submit" className="nw-secondary">{savedUsername ? "Save" : "Create"}</button></div>
            <p id={`${id}-username-help`} className={usernameError ? "nw-error" : "nw-help"}>{usernameError || "3–20 letters, numbers, or underscores. Saved locally."}</p>
          </form>
          <div className="nw-wallet-list">{WALLETS.map(item => <section className="nw-wallet-card" key={item.icon} aria-label={`${item.name} wallet`}>
            <div className="nw-card-heading"><span className={`nw-chain-icon nw-chain-${item.icon}`}><ChainIcon chain={item.icon} /></span><div><h3>{item.name}</h3><p>{item.description}</p></div></div>
            <code className="nw-address" aria-label="Wallet address unavailable">••••••••••••••••••••••••</code>
            <div className="nw-card-actions"><button type="button" className="nw-secondary" disabled aria-label={`Copy ${item.name} address`} title="Connect a wallet to copy its address"><Copy size={12} /><span>Copy address</span></button><button type="button" className="nw-secondary" aria-label={`Export ${item.name} private key`} onClick={() => setNotice("Key export is not available until a wallet provider is connected.")}><Key size={12} aria-hidden="true" />Export key</button></div>
          </section>)}</div>
          <div className="nw-meteor"><div><Meteor size={16} aria-hidden="true" /><div><strong>Use Meteor Wallet</strong><span>Connect your own NEAR wallet.</span></div></div><button type="button" className="nw-secondary" aria-label="Connect Meteor Wallet" onClick={() => setNotice("Wallet connection is not available yet.")}>Connect<ArrowUpRight size={12} aria-hidden="true" /></button></div>
          <button type="button" className="nw-sign-out" onClick={() => { activeTrigger.current = trigger.current; close(); wallet.disconnect(); }}><SignOut size={14} aria-hidden="true" />Sign out</button>
        </> : view === "deposit" ? <>
          <p className="nw-intro">Deposit ETH or SOL, then convert to NEAR in your trading wallet.</p>
          <div className="nw-deposit-assets" aria-label="Deposit asset"><button type="button" className={depositAsset === "ETH" ? "is-active" : ""} aria-pressed={depositAsset === "ETH"} onClick={() => { setDepositAsset("ETH"); setNotice(""); }}><CurrencyEth size={17} aria-hidden="true" /><span>Ethereum<small>ETH</small></span><Check size={13} aria-hidden="true" /></button><button type="button" className={depositAsset === "SOL" ? "is-active" : ""} aria-pressed={depositAsset === "SOL"} onClick={() => { setDepositAsset("SOL"); setNotice(""); }}><SolanaIcon size={16} /><span>Solana<small>SOL</small></span><Check size={13} aria-hidden="true" /></button></div>
          {depositAsset === "ETH" && <div className="nw-network-select"><span>Network</span><div aria-label="ETH deposit network">{NETWORKS.map(item => <button type="button" key={item} className={network === item ? "is-active" : ""} aria-pressed={network === item} onClick={() => { setNetwork(item); setNotice(""); }}>{item}</button>)}</div></div>}
          <section className="nw-deposit-card"><div className="nw-deposit-card-heading"><h3>Fund simulated wallet</h3><span>{depositNetwork}</span></div><p className="nw-deposit-warning"><Info size={12}/>Adds test funds on this device.</p><div className="nw-deposit-actions"><button type="button" className="nw-primary" onClick={() => { const result = wallet.execute({type:"Deposit",asset:depositAsset === "SOL" ? "SOL" : network === "Base" ? "BASE" : network === "Robinhood" ? "ROBINHOOD" : "ETH",amount:depositAsset === "SOL" ? 5 : .25}); setNotice(result.ok ? "Simulated funds added." : result.error); }}>Add {depositAsset === "SOL" ? "5 SOL" : "0.25 ETH"}</button><button type="button" className="nw-secondary" onClick={() => { const result = wallet.execute({type:"Deposit",asset:"USDC",amount:1000}); setNotice(result.ok ? "1,000 simulated USDC added." : result.error); }}>Add 1,000 USDC</button></div></section>
          <div className="nw-network-balances"><span>Balances</span>{(depositAsset === "ETH" ? NETWORKS : ["Solana"]).map(item => <div key={item}><span>{item}</span><strong>{wallet.assets[item === "Solana" ? "SOL" : item === "Base" ? "BASE" : item === "Robinhood" ? "ROBINHOOD" : "ETH"].toLocaleString("en-US")} {depositAsset}</strong></div>)}</div>
          <div className="nw-route"><div className="nw-section-heading"><h3>Deposit route</h3></div><ol><li><span className="nw-route-step">1</span><div><strong>Receive {depositAsset}</strong><span>On {depositNetwork}</span></div></li><li><span className="nw-route-step">2</span><div><strong>Convert through NEAR Intents</strong><span>Quote and network minimum required</span></div></li><li><span className="nw-route-step"><NearIcon size={10} /></span><div><strong>Arrive as NEAR</strong><span>In your trading wallet</span></div></li></ol></div>
        </> : <>
          <p className="nw-intro">Send an asset to a NEAR account.</p>
          <form className="nw-send-form" onSubmit={reviewSend} noValidate>
            <label className="nw-field" htmlFor={`${id}-asset`}><span>Asset</span><div className="nw-select-wrap"><select id={`${id}-asset`} value={sendAsset} onChange={event => { setSendAsset(event.target.value as SendAsset); setAmount(""); updateSend(); }}>{Object.keys(balances).map(asset => <option key={asset} value={asset}>{asset}</option>)}</select><CaretDown size={12} aria-hidden="true" /></div></label>
            <label className="nw-field" htmlFor={`${id}-recipient`}><span>Recipient</span><input id={`${id}-recipient`} value={recipient} onChange={event => { setRecipient(event.target.value); updateSend(); }} placeholder="name.near or 64-character address" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={!!sendErrors.recipient} aria-describedby={sendErrors.recipient ? `${id}-recipient-error` : undefined} />{sendErrors.recipient && <span id={`${id}-recipient-error`} className="nw-error">{sendErrors.recipient}</span>}</label>
            <label className="nw-field" htmlFor={`${id}-amount`}><span>Amount</span><div className={`nw-amount-input ${sendErrors.amount ? "has-error" : ""}`}><input id={`${id}-amount`} value={amount} onChange={event => { setAmount(event.target.value); updateSend(); }} placeholder="0.00" inputMode="decimal" autoComplete="off" aria-invalid={!!sendErrors.amount} aria-describedby={sendErrors.amount ? `${id}-amount-error` : `${id}-send-balance`} /><span>{sendAsset}</span><button type="button" onClick={() => { setAmount(String(available)); updateSend(); }}>Max</button></div><span className="nw-send-balance" id={`${id}-send-balance`}>Balance<strong>{available.toLocaleString("en-US")} {sendAsset}</strong></span>{sendErrors.amount && <span id={`${id}-amount-error`} className="nw-error">{sendErrors.amount}</span>}</label>
            <button type="submit" className="nw-primary"><PaperPlaneTilt size={14} aria-hidden="true" />Send</button>
          </form>
          {review && <div className="nw-send-review" role="status"><div><Info size={14} aria-hidden="true" /><strong>Transfer complete</strong></div><dl><div><dt>Amount</dt><dd>{review.amount} {review.asset}</dd></div><div><dt>Recipient</dt><dd>{review.recipient}</dd></div><div><dt>Network</dt><dd>NEAR</dd></div></dl><p>Sent from your simulated wallet. No on-chain transaction was submitted.</p></div>}

        </>}
      </div>
      {notice && <div className="nw-notice" role="status"><Info size={13} aria-hidden="true" /><span>{notice}</span><button type="button" className="nw-icon-button" aria-label="Dismiss wallet message" onClick={() => setNotice("")}><X size={12} aria-hidden="true" /></button></div>}

    </div>}
  </div>;
}
