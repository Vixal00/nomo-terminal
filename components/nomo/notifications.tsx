"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Bell, Check, Checks, IntersectSquare, Lightning, Star, Wallet, X } from "@phosphor-icons/react";
import "./notifications.css";

type Kind = "Trades" | "Watchlist" | "Wallet" | "Pairs";
const samples: {id: string; kind: Kind; title: string; body: string; detail: string}[] = [
  {id:"watch-nearly",kind:"Watchlist",title:"NEARLY is gaining momentum",body:"Your watchlist, at a glance.",detail:"Keep up with price moves and market activity for your saved tokens."},
  {id:"trade-preview",kind:"Trades",title:"Your quick buy is ready",body:"$25 → NEARLY · Ready to review",detail:"Review the amount and token before placing an order."},
  {id:"wallet-preview",kind:"Wallet",title:"One place for your wallets",body:"NEAR, Solana and Ethereum / EVM",detail:"Find deposit addresses, manage your wallets and send assets from the wallet menu."},
  {id:"pair-preview",kind:"Pairs",title:"Create your first NEAR pair",body:"Token details, artwork and first buy",detail:"Add your token details and artwork, then review your pair draft in Create."},
];
export function NotificationsControl() {
  const [open,setOpen] = useState(false);
  const [position,setPosition] = useState({left:0,top:0});
  const [tab,setTab] = useState<"All"|Kind>("All");
  const [read,setRead] = useState<string[]>([]);
  const [unreadOnly,setUnreadOnly] = useState(false);
  const [expanded,setExpanded] = useState<string|null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {try {const saved:unknown=JSON.parse(localStorage.getItem("nomo.notices.read")||"[]");if(Array.isArray(saved))setRead(saved.filter((item):item is string=>typeof item==="string"));}catch{}},[]);
  const mark = (values:string[]) => {setRead(values);try{localStorage.setItem("nomo.notices.read",JSON.stringify(values));}catch{}};
  const unread=samples.filter(item=>!read.includes(item.id)).length;
  const shown=samples.filter(item=>(tab==="All"||item.kind===tab)&&(!unreadOnly||!read.includes(item.id)||expanded===item.id));
  const close=()=>{setOpen(false);trigger.current?.focus({preventScroll:true});};
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const anchor=trigger.current?.getBoundingClientRect();if(!anchor)return;const viewport=document.documentElement.clientWidth;const width=Math.min(380,viewport-24);setPosition({left:Math.max(12,Math.min(anchor.right-width,viewport-width-12)),top:anchor.bottom+8});};
    place();panel.current?.focus({preventScroll:true});window.addEventListener("resize",place);window.addEventListener("scroll",place,true);return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};
  },[open]);
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();close();}};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};},[open]);
  return <div className="ni-notifications" ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <button ref={trigger} type="button" className="ni-notifications-trigger" aria-label="Notifications" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?`${id}-panel`:undefined} onClick={()=>setOpen(value=>!value)}><Bell size={17}/>{unread>0&&<i/>}</button>
    {open&&<div ref={panel} id={`${id}-panel`} className="ni-notifications-panel" role="dialog" aria-labelledby={`${id}-heading`} tabIndex={-1} style={{left:position.left,top:position.top,maxHeight:`calc(100dvh - ${position.top+12}px)`}}>
      <div className="nn-heading"><h2 id={`${id}-heading`}>Notifications {unread>0&&<small>{unread}</small>}</h2><button className="nn-read" disabled={!unread} onClick={()=>mark(samples.map(item=>item.id))} title="Mark all read"><Checks size={14}/><span>Mark all read</span></button><button className="nn-close" onClick={close} aria-label="Close notifications"><X size={16}/></button></div>
      <div className="nn-tabs" role="group" aria-label="Notification category">{(["All","Trades","Watchlist","Wallet","Pairs"] as const).map(value=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);setExpanded(null);}}>{value}</button>)}</div>
      <div className="nn-subhead"><span>RECENT ACTIVITY</span><button aria-pressed={unreadOnly} onClick={()=>setUnreadOnly(value=>!value)}><i>{unreadOnly&&<Check size={9}/>}</i>Unread only</button></div>
      <div className="nn-list">{shown.map(item=>{const Icon=item.kind==="Trades"?Lightning:item.kind==="Watchlist"?Star:item.kind==="Wallet"?Wallet:IntersectSquare;return <div className="nn-item" key={item.id}><button className="nn-item-button" aria-expanded={expanded===item.id} onClick={()=>{setExpanded(value=>value===item.id?null:item.id);if(!read.includes(item.id))mark([...read,item.id]);}}><span className={`nn-kind nn-kind-${item.kind.toLowerCase()}`}><Icon size={16}/></span><span className="nn-copy"><strong>{item.title}</strong><small>{item.body}</small></span><i className={!read.includes(item.id)?"unread":""}/></button>{expanded===item.id&&<p className="nn-detail">{item.detail}</p>}</div>;})}</div>
      {!shown.length&&<div className="ni-notifications-empty"><Bell size={24}/><p>{unreadOnly?"You're all caught up":"Nothing here yet"}</p></div>}

    </div>}
  </div>;
}
