"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CopySimple, UsersThree } from "@phosphor-icons/react";
import { compact, type Token } from "./data";
import { TokenAvatar } from "./shared";
import { LaunchpadIcon, MarketChainIcon } from "./brand-icons";
import "./token-identity.css";

type CopyState = "idle" | "copying" | "success" | "error";

export function TokenIdentity({ token, onSelect, variant = "default", trailing }: { token: Token; onSelect: (token: Token) => void; variant?: "default" | "pulse" | "discover"; trailing?: ReactNode }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [confirmation, setConfirmation] = useState(0);
  const request = useRef(0);
  const alive = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    setCopyState("idle");
    return () => {
      alive.current = false;
      request.current += 1;
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [token.id, token.contract]);

  const copy = async () => {
    const current = ++request.current;
    if (timeout.current) clearTimeout(timeout.current);
    setCopyState("copying");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(token.contract);
      if (!alive.current || current !== request.current) return;
      setCopyState("success");
    } catch {
      if (!alive.current || current !== request.current) return;
      setCopyState("error");
    }
    setConfirmation(value => value + 1);
    timeout.current = setTimeout(() => {
      if (alive.current && current === request.current) setCopyState("idle");
    }, 1800);
  };

  const copied = copyState === "success";
  const failed = copyState === "error";
  const address = token.contract.length > 11 ? `${token.contract.slice(0, 4)}…${token.contract.slice(-4)}` : token.contract;
  const shortAddress = token.contract.length > 7 ? `${token.contract.slice(0, 2)}…${token.contract.slice(-2)}` : token.contract;

  const copyButton = <button type="button" className="ni-token-identity-copy" onClick={event => { event.stopPropagation(); void copy(); }} aria-label={copied ? `${token.symbol} contract address copied` : `Copy ${token.symbol} contract address`} aria-busy={copyState === "copying"}>
    <span className="ni-token-identity-address"><span className="ni-token-identity-address-full">{address}</span><span className="ni-token-identity-address-short">{shortAddress}</span></span>
    <span className="ni-token-identity-copy-icon" aria-hidden="true"><CopySimple className="ni-copy-glyph" size={13} weight="regular"/><Check className="ni-copy-check" size={13} weight="bold"/></span>
  </button>;

  return <div className={`ni-token-identity${variant === "pulse" ? " ni-token-identity--pulse" : ""}`} data-copy-state={copyState}>
    <button type="button" className="ni-token-identity-avatar" onClick={() => onSelect(token)} aria-label={`Open ${token.symbol} details, ${token.chain}, ${token.launchpad}`}>
      <TokenAvatar token={token} size={variant === "pulse" ? 68 : variant === "discover" ? 52 : 36} variant="square" />
      <span className="ni-token-identity-badges" title={`${token.chain} · ${token.launchpad}`} aria-hidden="true"><MarketChainIcon chain={token.chain} size={variant === "discover" ? 13 : 8} /><i/><LaunchpadIcon name={token.launchpad} size={variant === "discover" ? 13 : 8} /></span>
    </button>
    <div className="ni-token-identity-body">
      <div className="ni-token-identity-heading">
        <button type="button" className="ni-token-identity-symbol" onClick={() => onSelect(token)} aria-label={`Open ${token.symbol} details`}>
          <strong>{token.symbol}</strong>
        </button>
        {token.stage === "New" && <span className="ni-token-identity-new" title="New pair" role="img" aria-label="New pair" />}
        {trailing}
        {variant === "pulse" ? <button type="button" className="npu-token-name" onClick={() => onSelect(token)} title={token.name}>{token.name}</button> : copyButton}
      </div>
      {variant === "pulse" ? <>
        <div className="npu-token-address">{copyButton}<span className="ni-token-identity-age">{token.age}</span><span className="npu-token-holders" title="Token holders"><UsersThree size={11}/>{compact(token.holders)}</span></div>
      </> : <button type="button" className="ni-token-identity-name" onClick={() => onSelect(token)} aria-label={`Open ${token.symbol}, ${token.name}`}>
        <span className="ni-token-identity-secondary"><span>{token.name}</span><span className="ni-token-identity-age">{token.age}</span></span>
      </button>}
      {failed && <span key={confirmation} className="ni-token-identity-feedback" aria-hidden="true">Copy failed</span>}
    </div>
    <span className="ni-token-identity-announcement" role="status" aria-live="polite" aria-atomic="true"><span key={confirmation}>{copied ? `${token.symbol} contract address copied.` : failed ? `Could not copy ${token.symbol} contract address. Try again.` : ""}</span></span>
  </div>;
}

export default TokenIdentity;
