"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowsInSimple, ArrowsOutSimple, ArrowUpRight, Broadcast, ChatCircle, PaperPlaneRight, Pause, Play, Users, X } from "@phosphor-icons/react";
import { compact, money, priceText, TOKEN_PORTRAITS, type Token } from "./data";
import { PREVIEW_TRADERS } from "./trader-preview";
import type { LedgerEntry } from "./simulated-wallet";
import "./community-panel.css";

type CommunityTab = "chat" | "feed";
type Message = { id: string; text: string; at: number };
type Activity = { id: string; tokenId: string; trader: number; value: number; amount: number; at: number; own?: boolean };
const MESSAGE_KEY = "nomo.community.messages.v1";
const DRAFT_KEY = "nomo.community.draft";
const ROOM_SAMPLES = [
  { trader: 0, text: "Keeping an eye on new launches this morning." },
  { trader: 1, text: "Same here. The wallet tracker is staying open on my screen." },
  { trader: 3, text: "Watching volume and liquidity before making a move." },
  { trader: 4, text: "Added a few names to my watchlist. Let’s see how they develop." },
];
const elapsed = (at: number, now: number) => {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  return seconds < 5 ? "Just now" : seconds < 60 ? `${seconds}s ago` : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)}h ago` : `${Math.floor(seconds / 86400)}d ago`;
};
const isMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<Message>;
  return typeof message.id === "string" && typeof message.text === "string" && !!message.text.trim() && message.text.length <= 500 && typeof message.at === "number" && Number.isFinite(message.at) && message.at > 0 && message.at <= 8_640_000_000_000_000;
};

export function CommunityPanel({ tokens, history, onSelect }: { tokens: Token[]; history: LedgerEntry[]; onSelect: (token: Token) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState(0.12);
  const [tab, setTab] = useState<CommunityTab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const [now, setNow] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [frozenActivity, setFrozenActivity] = useState<Activity[] | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const chatEnd = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; start: number; next: number; range: number } | null>(null);
  const dragged = useRef(false);
  const latestTokens = useRef(tokens);
  latestTokens.current = tokens;

  useEffect(() => {
    const at = Date.now();
    setNow(at); setStartedAt(at);
    setActivity(latestTokens.current.slice(0, 12).map((token, index) => {
      const value = [23, 68, 125, 42, 16, 250][index % 6];
      return { id: `sample-${index}`, tokenId: token.id, trader: index % 8, value, amount: value / token.price, at: at - (index * 27 + 14) * 1000 };
    }));
    try {
      setOpen(sessionStorage.getItem("nomo.community.open") === "true");
      setTab(sessionStorage.getItem("nomo.community.tab") === "feed" ? "feed" : "chat");
      setExpanded(sessionStorage.getItem("nomo.community.expanded") === "true");
      const savedPosition = sessionStorage.getItem("nomo.community.position");
      if (savedPosition !== null && Number.isFinite(Number(savedPosition))) setPosition(Math.max(0, Math.min(1, Number(savedPosition))));
      setDraft((sessionStorage.getItem(DRAFT_KEY) || "").slice(0, 500));
      const stored: unknown = JSON.parse(localStorage.getItem(MESSAGE_KEY) || "[]");
      if (Array.isArray(stored)) setMessages(stored.filter(isMessage).slice(-100));
    } catch { /* The room also works in memory when storage is unavailable. */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    tabButtons.current[tab === "chat" ? 0 : 1]?.focus();
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 1000);
    return () => window.clearInterval(timer);
    // Focus on opening only; switching tabs must not steal focus from the composer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "feed" || pausedAt !== null || held) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const at = Date.now();
      const index = Math.floor(at / 9000);
      const token = latestTokens.current[index % latestTokens.current.length];
      if (!token) return;
      const value = [18, 45, 120, 32, 250, 75, 9][index % 7];
      setActivity(current => [{ id: `sample-${at}`, tokenId: token.id, trader: index % 8, value, amount: value / token.price, at }, ...current].slice(0, 40));
    }, 9000);
    return () => window.clearInterval(timer);
  }, [open, tab, pausedAt, held]);

  useEffect(() => {
    if (open && tab === "chat" && messages.length) chatEnd.current?.scrollIntoView({ block: "end" });
  }, [messages, open, tab]);

  const changeOpen = (value: boolean) => {
    setOpen(value);
    try { sessionStorage.setItem("nomo.community.open", String(value)); } catch {}
    if (!value) window.requestAnimationFrame(() => trigger.current?.focus());
  };
  const savePosition = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    setPosition(next);
    try { sessionStorage.setItem("nomo.community.position", String(next)); } catch {}
  };
  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const root = event.currentTarget.closest(".nomo");
    const navigationHeight = root?.querySelector(".ni-navigation")?.getBoundingClientRect().height ?? 90;
    const height = open ? panelRef.current?.getBoundingClientRect().height ?? 680 : 48;
    drag.current = { y: event.clientY, start: position, next: position, range: Math.max(1, window.innerHeight - navigationHeight - 46 - height) };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const distance = event.clientY - drag.current.y;
    if (Math.abs(distance) > 4) dragged.current = true;
    if (dragged.current) {
      drag.current.next = Math.max(0, Math.min(1, drag.current.start + distance / drag.current.range));
      setPosition(drag.current.next);
    }
  };
  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (drag.current) savePosition(drag.current.next);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const moveKey = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    savePosition(event.key === "Home" ? 0 : event.key === "End" ? 1 : position + (event.key === "ArrowUp" ? -.05 : .05));
  };
  const positionStyle = { "--nc-position": position } as CSSProperties;
  const changeTab = (value: CommunityTab) => {
    setTab(value); setHeld(false);
    try { sessionStorage.setItem("nomo.community.tab", value); } catch {}
  };
  const changeDraft = (value: string) => {
    setDraft(value);
    try { sessionStorage.setItem(DRAFT_KEY, value); } catch {}
  };
  const send = () => {
    const text = draft.trim();
    if (!text || text.length > 500) return;
    const next = [...messages, { id: crypto.randomUUID(), text, at: Date.now() }].slice(-100);
    setMessages(next); changeDraft("");
    try { localStorage.setItem(MESSAGE_KEY, JSON.stringify(next)); setStorageNote(""); }
    catch { setStorageNote("Storage is unavailable. Messages last for this session only."); }
  };
  const tabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "chat" : event.key === "End" ? "feed" : tab === "chat" ? "feed" : "chat";
    changeTab(next); tabButtons.current[next === "chat" ? 0 : 1]?.focus();
  };
  const ownActivity: Activity[] = history.filter(entry => entry.type === "Buy" && entry.tokenId).map(entry => ({ id: `wallet-${entry.id}`, tokenId: entry.tokenId!, trader: -1, value: entry.value, amount: entry.amount, at: entry.at, own: true }));
  const feed = [...ownActivity, ...activity].sort((a, b) => b.at - a.at).slice(0, 60);
  const visibleFeed = frozenActivity ?? feed;

  return <>
    {!open && <button ref={trigger} type="button" className="nc-toggle" style={positionStyle} aria-label="Open Community" title="Open Community · drag up or down to move" aria-haspopup="dialog" aria-expanded={false} aria-controls="nomo-community" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveKey} onClick={() => { if (!dragged.current) changeOpen(true); dragged.current = false; }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m5-13 4 4-4 4"/></svg></button>}
    {open && <aside ref={panelRef} id="nomo-community" style={positionStyle} className={`nc-panel${expanded ? " is-expanded" : ""}`} role="dialog" aria-modal="false" aria-labelledby="nc-title" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); changeOpen(false); } }}>
      <header className="nc-header"><div className="nc-drag-handle" tabIndex={0} aria-label="Move Community panel up or down" title="Drag up or down to move" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveKey}><Users size={19}/><h2 id="nc-title">Community</h2></div><div>
        <button type="button" className="nc-icon nc-expand" aria-label={expanded ? "Narrow Community panel" : "Expand Community panel"} aria-pressed={expanded} onClick={() => { setExpanded(!expanded); try { sessionStorage.setItem("nomo.community.expanded", String(!expanded)); } catch {} }}>{expanded ? <ArrowsInSimple size={17}/> : <ArrowsOutSimple size={17}/>}</button>
        <button type="button" className="nc-icon" aria-label="Close Community" onClick={() => changeOpen(false)}><X size={19}/></button>
      </div></header>
      <div className="nc-tabs" role="tablist" aria-label="Community view">
        <button ref={node => { tabButtons.current[0] = node; }} type="button" role="tab" id="nc-tab-chat" aria-controls="nc-chat" aria-selected={tab === "chat"} tabIndex={tab === "chat" ? 0 : -1} onKeyDown={tabKey} onClick={() => changeTab("chat")}><ChatCircle size={16}/>Chat</button>
        <button ref={node => { tabButtons.current[1] = node; }} type="button" role="tab" id="nc-tab-feed" aria-controls="nc-feed" aria-selected={tab === "feed"} tabIndex={tab === "feed" ? 0 : -1} onKeyDown={tabKey} onClick={() => changeTab("feed")}><Broadcast size={16}/>Social feed</button>
      </div>
      {tab === "chat" ? <section id="nc-chat" className="nc-content" role="tabpanel" aria-labelledby="nc-tab-chat">
        <div className="nc-messages" role="log" aria-label="Community messages" aria-live="polite">
          {ROOM_SAMPLES.map((sample, index) => {
            const trader = PREVIEW_TRADERS[sample.trader];
            return <article className="nc-message" key={trader.id}><header><span className="nc-message-author"><img src={trader.avatar} width="19" height="19" alt=""/><strong>{trader.name}</strong></span><time>{startedAt ? new Date(startedAt - (5 - index) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</time></header><p>{sample.text}</p></article>;
          })}
          {messages.map(message => <article className="nc-message is-own" key={message.id}><header><span className="nc-message-author"><span className="nc-self-avatar"><img src="/nomo/nomo-n.svg" width="11" height="11" alt=""/></span><strong>You</strong></span><time>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></header><p>{message.text}</p></article>)}
          <div ref={chatEnd}/>
        </div>
        <form className="nc-composer" onSubmit={event => { event.preventDefault(); send(); }}>
          <div className="nc-composer-input"><textarea id="nc-message" aria-label="Chat message" placeholder="Say something…" rows={3} maxLength={500} value={draft} onChange={event => changeDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }}/><div><span>{draft.length}/500</span><button type="submit" disabled={!draft.trim()} aria-label="Send message">Send<PaperPlaneRight size={15}/></button></div></div>
          {storageNote && <p role="status">{storageNote}</p>}
        </form>
      </section> : <section id="nc-feed" className="nc-content" role="tabpanel" aria-labelledby="nc-tab-feed">
        <div className="nc-feed-toolbar"><span><i className={pausedAt !== null ? "is-paused" : ""}/>{pausedAt !== null ? "Feed paused" : "Recent buys"}</span><button type="button" className="nc-icon" aria-label={pausedAt !== null ? "Resume community feed" : "Pause community feed"} aria-pressed={pausedAt !== null} onClick={() => { if (pausedAt !== null) { setPausedAt(null); setFrozenActivity(null); } else { setPausedAt(Date.now()); setFrozenActivity(feed); } }}>{pausedAt !== null ? <Play size={15}/> : <Pause size={15}/>}</button></div>
        <div className="nc-activity" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocusCapture={() => setHeld(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false); }}>
          {visibleFeed.map(entry => {
            const token = tokens.find(item => item.id === entry.tokenId);
            if (!token) return null;
            const trader = PREVIEW_TRADERS[entry.trader];
            return <button type="button" className="nc-trade" key={entry.id} onClick={() => onSelect(token)} aria-label={`${entry.own ? "Your" : trader.name + "’s"} buy of ${token.symbol}, ${money(entry.value)}. Open token`}>
              <span className="nc-trader-avatar">{entry.own ? <span className="nc-self-avatar"><img src="/nomo/nomo-n.svg" width="18" height="18" alt=""/></span> : <img src={trader.avatar} width="38" height="38" alt=""/>}<i><ArrowUpRight size={10} weight="bold"/></i></span>
              <span className="nc-trade-body"><span className="nc-trade-top"><span>{entry.own ? "You" : `@${trader.handle}`}</span><time>{elapsed(entry.at, pausedAt ?? now)}</time></span><span className="nc-trade-value"><span><strong>{money(entry.value)}</strong><small>Buy</small></span><span className="nc-trade-token"><img src={TOKEN_PORTRAITS[token.id] || token.image} width="19" height="19" alt=""/>{token.symbol}</span></span><span className="nc-trade-detail">{compact(entry.amount)} tokens<span>@ {priceText(entry.value / entry.amount)}</span></span></span>
            </button>;
          })}
          {visibleFeed.length === 0 && <p className="nc-feed-empty">Buys will appear here as activity comes in.</p>}
        </div>
      </section>}
    </aside>}
  </>;
}
