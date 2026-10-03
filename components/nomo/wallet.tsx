"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, CaretDown, SignOut, Wallet } from "@phosphor-icons/react";
import { TOKENS, priceText, type Token } from "./data";
import { TokenAvatar } from "./shared";
import { UsdcIcon } from "./brand-icons";

const ACCOUNT = "7xKp…9mQ2";
const CASH = 1250;
const HOLDINGS: Record<string, number> = { nearly: 15000, sight: 50000 };
const STORAGE_KEY = "nomo.previewWallet.connected";

// Local presentation state only. No provider, account, or transaction is connected.
export function usePreviewWallet() {
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    try { setConnected(sessionStorage.getItem(STORAGE_KEY) !== "false"); } catch {}
  }, []);
  const update = useCallback((value: boolean) => {
    setConnected(value);
    try { sessionStorage.setItem(STORAGE_KEY, String(value)); } catch {}
  }, []);
  return {
    connected,
    connect: () => update(true),
    disconnect: () => update(false),
    balance: CASH,
    tokenBalance: (id: string) => HOLDINGS[id] || 0,
  };
}

export type PreviewWallet = ReturnType<typeof usePreviewWallet>;

export function WalletControl({ wallet, variant, onPortfolio }: {
  wallet: PreviewWallet;
  variant: "index" | "lens";
  onPortfolio?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className={`nm-wallet nm-wallet-${variant}`} ref={root}>
    <button ref={trigger} type="button" className={`nm-wallet-trigger ${wallet.connected ? "is-connected" : ""}`} aria-label={wallet.connected ? `Wallet ${ACCOUNT}` : "Connect wallet"} aria-expanded={wallet.connected ? open : undefined} onClick={() => wallet.connected ? setOpen(!open) : wallet.connect()}>
      <Wallet size={16} weight={open ? "fill" : "regular"} />
      {wallet.connected ? <><span className="nm-wallet-cash">${wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span><span className="nm-wallet-account"><i />{ACCOUNT}</span><CaretDown size={11}/></> : <span>Connect wallet</span>}
    </button>
    {open && wallet.connected && <div className="nm-wallet-menu" role="dialog" aria-label="Wallet menu">
      <div className="nm-wallet-menu-head"><span>My wallet</span><span className="nm-wallet-status"><i/>Connected</span></div>
      <div className="nm-wallet-menu-address"><Wallet size={18}/><strong>{ACCOUNT}</strong></div>
      <div className="nm-wallet-menu-balance"><span>Available to trade</span><strong>${wallet.balance.toLocaleString("en-US", {minimumFractionDigits:2})}<small>USDC</small></strong></div>
      {onPortfolio && <button className="nm-wallet-menu-action" type="button" onClick={() => { trigger.current?.focus(); setOpen(false); onPortfolio(); }}>View portfolio<ArrowUpRight size={15}/></button>}
      <button className="nm-wallet-menu-action" type="button" onClick={() => { trigger.current?.focus(); setOpen(false); wallet.disconnect(); }}>Disconnect<SignOut size={15}/></button>

    </div>}
  </div>;
}

export function WalletSummary({ wallet, tokens = TOKENS, avatarVariant = "coin" }: { wallet: PreviewWallet; tokens?: Token[]; avatarVariant?: "coin" | "square" }) {
  const positions = tokens.filter(token => wallet.tokenBalance(token.id) > 0);
  const total = wallet.balance + positions.reduce((sum, token) => sum + wallet.tokenBalance(token.id) * token.price, 0);
  return <div className="nm-wallet-summary">
    <div className="nm-wallet-summary-account"><Wallet size={16}/><span>{ACCOUNT}</span><span>Connected</span></div>
    <div className="nm-wallet-total"><span>Portfolio value</span><strong>${total.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
    <div className="nm-wallet-asset"><UsdcIcon size={30}/><div><strong>USDC</strong><span>Available to trade</span></div><div><strong>${wallet.balance.toLocaleString("en-US", {minimumFractionDigits:2})}</strong><span>{wallet.balance.toLocaleString("en-US")} USDC</span></div></div>
    {positions.map(token => <div className="nm-wallet-asset" key={token.id}><TokenAvatar token={token} size={30} variant={avatarVariant}/><div><strong>{token.symbol}</strong><span>{priceText(token.price)}</span></div><div><strong>${(wallet.tokenBalance(token.id) * token.price).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</strong><span>{wallet.tokenBalance(token.id).toLocaleString("en-US")} {token.symbol}</span></div></div>)}

  </div>;
}
