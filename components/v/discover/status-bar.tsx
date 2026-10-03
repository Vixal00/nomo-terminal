"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnsemCrest, EthereumMark, SettingsMark, SolanaMark, XMark } from "@/components/marks";
import { CORE_HOTKEYS, SimToggle } from "@/components/trending";
import { cx } from "@/components/ui";
import { X_ACCOUNT } from "@/lib/data";
import { LABELS } from "@/lib/labels";
import { spotStrip } from "@/lib/trending";
import * as fmt from "@/lib/format";
import { COPY } from "./copy";
import { BoltIcon } from "./icons";

/** CORE_HOTKEYS in its own order: iterating the object would put the
 *  digit keys first (integer-like keys always lead). */
const KEY_ORDER = ["j", "k", "/", "Escape", "b", "p", "1", "2", "3", "4", "[", "]", "h", "s"] as const;

const KEY_TEXT: Record<string, string> = {
  j: "J  ↓",
  k: "K  ↑",
  Escape: "Esc",
};

/** The core keys, listed first as every version lists them, then the
 *  two this version adds. */
function KeysHelp() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={root} className="dc-keys" data-hotkeys-inert={open ? "" : undefined}>
      <button
        type="button"
        className={cx("dc-sb-btn dc-sb-icon", open && "is-on")}
        aria-expanded={open}
        aria-controls={id}
        aria-label="Keyboard keys"
        title="Keyboard keys"
        onClick={() => setOpen((o) => !o)}
      >
        <SettingsMark className="h-4 w-4" />
      </button>
      <div id={id} hidden={!open} className="dc-pop dc-keys-pop">
        <p className="dc-pop-title">{COPY.KEYS}</p>
        <dl className="dc-keys-list">
          {KEY_ORDER.map((k) => (
            <div key={k}>
              <dt className="num">{KEY_TEXT[k] ?? k.toUpperCase()}</dt>
              <dd>{CORE_HOTKEYS[k]}</dd>
            </div>
          ))}
          <div>
            <dt className="num">← →</dt>
            <dd>Views, when a view tab has focus</dd>
          </div>
          <div>
            <dt className="num">Enter</dt>
            <dd>Select the focused row</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** The spot strip as the reference sets it: three assets, a mark and a
 *  price each, nothing else inline. The network's own first, then the
 *  other network's, then $ANSEM (no BNB: not an Ansem network). Every
 *  price is spotStrip's fixture, tagged DEMO SPOT once; each one's 24h
 *  change is in its title, as the reference keeps the strip to prices.
 *  Both orders are rendered and the cascade shows the network's, so the
 *  first paint is already right. */
function Spot() {
  const cell = (s: { k: string; usd: number; d: number }) => (
    <span key={s.k} className="dc-spot" title={`${s.k} ${fmt.price(s.usd)}, ${fmt.pct(s.d)} over 24h. ${LABELS.SPOT_TITLE}`}>
      {s.k === "SOL" ? <SolanaMark className="dc-spot-mark" /> : s.k === "ETH" ? <EthereumMark className="dc-spot-mark" /> : <AnsemCrest className="dc-spot-mark" />}
      <span className="sr-only">{s.k} </span>
      <span className="num">{fmt.price(s.usd)}</span>
      <span className="sr-only">, {fmt.pct(s.d)} over 24h</span>
    </span>
  );
  // The two natives swap order by network; $ANSEM is the same on both and
  // is drawn once, outside the swapped sets: its crest's gradient is
  // defined inside the SVG, and a gradient defined under display:none
  // doesn't paint where it is referenced.
  const natives = (chain: 1 | 2) => [spotStrip(chain)[0], spotStrip(chain === 1 ? 2 : 1)[0]].map(cell);
  return (
    <div className="dc-spots">
      <span className="only-chain1 dc-spots-set">{natives(1)}</span>
      <span className="only-chain2 dc-spots-set">{natives(2)}</span>
      {cell(spotStrip(1)[1])}
      <span className="meta dc-spot-tag" title={LABELS.SPOT_TITLE}>
        {LABELS.SPOT_TAG}
      </span>
    </div>
  );
}

/** R6, fixed to the bottom, 49px at 1920. Left, in the reference's
 *  order: the lead pill (the simulation's state and its switch, where
 *  the reference had PRESET 1), the quick-buy size and the keys. Right:
 *  spot, then the three disclosure facts where the reference said
 *  "System is learning" and "Connection is stable", then the one link
 *  that goes somewhere real, as an icon in the reference's end slot.
 *  When space runs out the link goes first, then spot; the disclosures
 *  and the simulation's state never go. (The index calendar is in the
 *  view tabs' right cluster.) */
export function StatusBar({ amt1, amt2, onQuickBuy }: { amt1: string; amt2: string; onQuickBuy: () => void }) {
  return (
    <footer className="dc-status">
      <div className="dc-sb-l">
        <SimToggle className="dc-simpill" />
        <button type="button" className="dc-sb-btn dc-sb-qb" onClick={onQuickBuy} title="Change the quick-buy size in the filter bar">
          <span className="dc-sb-qb-l">Quick Buy</span>
          <BoltIcon className="dc-sb-bolt" />
          <span className="only-chain1 dc-sb-qb-v">
            <span className="num">{amt1}</span>
            <SolanaMark className="dc-sb-mark" />
          </span>
          <span className="only-chain2 dc-sb-qb-v">
            <span className="num">{amt2}</span>
            <EthereumMark className="dc-sb-mark" />
          </span>
        </button>
        <KeysHelp />
      </div>
      <div className="dc-sb-r">
        <Spot />
        <span className="dc-disc dc-disc-a">
          {LABELS.DISCLOSURE[0]}
          <span aria-hidden className="dc-disc-sep">
            ·
          </span>
          {LABELS.DISCLOSURE[2]}
        </span>
        <span className="dc-disc dc-disc-b">{LABELS.DISCLOSURE[1]}</span>
        <a
          className="dc-sb-x"
          href={X_ACCOUNT.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${X_ACCOUNT.value} on X (opens a new tab)`}
          aria-label={`${X_ACCOUNT.value} on X`}
        >
          <XMark className="h-[14px] w-[14px]" />
        </a>
      </div>
    </footer>
  );
}
