"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { TOKENS, TOKEN_PORTRAITS, changeForTime, type Token, type MarketStage } from "./data";
import { Pause, Play } from "@phosphor-icons/react";
import { useMarketFeed } from "./feed";
import { useFeedMotion } from "./feed-motion";
gsap.registerPlugin(useGSAP);

export function TokenAvatar({token,size=32,variant="coin"}:{token:Token;size?:number;variant?:"coin"|"square"}) {
 const square = variant === "square";
 return <img src={square ? TOKEN_PORTRAITS[token.id] || token.image : token.image} width={size} height={size} alt="" className="nm-avatar" style={{width:size,height:size,background:token.color+"15",borderRadius:square?6:undefined,objectFit:square?"cover":undefined}}/>;
}
export function Sparkline({token,width=96,height=30,filled=false}:{token:Token;width?:number;height?:number;filled?:boolean}) {
 const min=Math.min(...token.points)-3,max=Math.max(...token.points)+3;
 const points=token.points.map((n,i)=>`${(i*width/(token.points.length-1)).toFixed(2)},${(height-((n-min)/(max-min))*(height-4)-2).toFixed(2)}`).join(" ");
 const color=token.change24h>=0 ? "var(--nm-green)" : "var(--nm-red)";
 return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="nm-spark" aria-label={`${token.symbol} price trend`} role="img" preserveAspectRatio="none">
 {filled&&<polygon points={`0,${height} ${points} ${width},${height}`} fill={color} opacity=".06"/>}
 <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
 </svg>;
}
export function ProposalSwitch({current}:{current:"index"|"lens"}) {
 return <div className="nm-proposals" aria-label="Design proposals"><Link href="/" className="nm-back">All designs</Link>{([['index','01 Index'],['lens','02 Lens']] as const).map(([id,label])=><Link key={id} href={`/discover/${id}`} aria-current={current===id?"page":undefined}>{label}</Link>)}</div>;
}
export function useDiscover(){
 const feed=useMarketFeed();
 const [search,setSearch]=useState(""); const [view,setView]=useState("Trending");
 const [time,setTime]=useState("24h"); const [stars,setStars]=useState<string[]>(["nearly","sight"]);
 const [minCap,setMinCap]=useState(0); const [sort,setSort]=useState("trending");
 const [selection,setSelected]=useState<Token>(TOKENS[1]);
 const selected=feed.tokens.find(token=>token.id===selection.id)||selection;
 useEffect(()=>{try {const v=JSON.parse(localStorage.getItem("nomo.watchlist")||"null");if(Array.isArray(v)&&v.every(x=>typeof x==="string"))setStars(v);}catch{}},[]);
 const toggleStar=(id:string)=>setStars(prev=>{const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];try{localStorage.setItem("nomo.watchlist",JSON.stringify(next));}catch{}return next;});
 const rows=useMemo(()=>{
 let a=feed.tokens.filter(t=>(t.name+" "+t.symbol).toLowerCase().includes(search.toLowerCase())&&t.mcap>=minCap);
 if(view==="Watchlist")a=a.filter(t=>stars.includes(t.id));
 if(view==="New pairs")a=a.filter(t=>t.stage==="New");
 if(view==="Graduating")a=a.filter(t=>t.stage==="Graduating");
 if(sort==="mcap")a.sort((a,b)=>b.mcap-a.mcap); if(sort==="volume")a.sort((a,b)=>b.volume-a.volume);
 if(sort==="change")a.sort((a,b)=>changeForTime(b,time)-changeForTime(a,time));
 if(sort==="change24h")a.sort((a,b)=>b.change24h-a.change24h);
 return a;
 },[feed.tokens,search,view,stars,minCap,sort,time]);
 const change=(t:Token)=>changeForTime(t,time);
 return {search,setSearch,view,setView,time,setTime,stars,toggleStar,minCap,setMinCap,sort,setSort,selected,setSelected,rows,change,tokens:feed.tokens,feedTick:feed.tick,feedPaused:feed.paused,setFeedPaused:feed.setPaused,feedRunning:feed.running,feedInteractionProps:feed.interactionProps};
}
export type DiscoverState=ReturnType<typeof useDiscover>;
export function useEntrance(tick=0){const ref=useRef<HTMLDivElement>(null);useFeedMotion(ref,tick);useGSAP(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const targets=ref.current?.querySelectorAll('[data-enter]');if(!targets?.length)return;gsap.fromTo(targets,{opacity:0,y:5},{opacity:1,y:0,duration:.35,stagger:.045,ease:'power2.out',clearProps:'all'});},{scope:ref});return ref;}
export function FeedControl({state}:{state:Pick<DiscoverState,"feedPaused"|"setFeedPaused"|"feedRunning">}){return <button type="button" className={`nm-feed-control ${state.feedRunning?"is-running":""}`} onClick={()=>state.setFeedPaused(!state.feedPaused)} aria-label={state.feedPaused?"Resume simulated market feed":"Pause simulated market feed"} aria-pressed={state.feedPaused} title="Simulated market activity. Updates pause while you hover or focus the market list."><i/><span>{state.feedPaused?"Feed paused":state.feedRunning?"Market feed":"Feed held"}</span>{state.feedPaused?<Play size={11} weight="fill"/>:<Pause size={11} weight="fill"/>}</button>;}
export function Footer({children}:{children?:ReactNode}){return <footer className="nm-footer"><span><i/>Nomo markets</span><span>{children||"NEAR at the center. Every opportunity in view."}</span><span title="Market activity and wallet balances use local sample data. No network connection, orders or transfers.">Connection</span></footer>;}
export const STAGES:MarketStage[]=["New","Graduating","Established"];
