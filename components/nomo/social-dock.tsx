"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChatCircle, Heart, MagnifyingGlass, XLogo } from "@phosphor-icons/react";
import { useXProfiles } from "./social-profiles";
import { enabledXProfiles } from "./social-profile-state";
const POSTS = ["Watching the new pairs. Volume is picking up across the board.","Keeping an eye on the launches approaching migration today.","Patience pays. Waiting for volume to confirm the next move.","A busy session on NEAR. Which launches are on your watchlist?", "Tracking the wallets behind today’s strongest moves.","New names on the radar. Doing the research before taking a position."];
export function SocialDock(){
 const {profiles,muted}=useXProfiles();
 const [tab,setTab]=useState<'tweets'|'creators'>('tweets');
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const creators=enabledXProfiles(profiles,muted);
 const selectedCreator=creators.some(profile=>profile.handle===selected)?selected:"";
 const matches=(text:string)=>text.toLowerCase().includes(query.trim().toLowerCase().replace(/^@/,''));
 const tweets=creators.filter(profile=>profile.fixture&&(!selectedCreator||profile.handle===selectedCreator)).flatMap((profile,index)=>[0,1].map(round=>({profile,minutes:2+index*4+round*32,text:POSTS[(index+round*2)%POSTS.length],id:`${profile.handle}-${round}`,likes:12+index*17+round*8}))).filter(post=>matches(`${post.profile.name} ${post.profile.handle} ${post.text}`)).sort((a,b)=>a.minutes-b.minutes);
 return <>
  <div className="ntd-tracker-tabs" role="group" aria-label="Social view"><button aria-pressed={tab==='tweets'} className={tab==='tweets'?'is-active':''} onClick={()=>setTab('tweets')}>Tweets</button><button aria-pressed={tab==='creators'} className={tab==='creators'?'is-active':''} onClick={()=>setTab('creators')}>Creators<span>{creators.length}</span></button><Link href="/trackers?tab=x" aria-label="Manage tracked X accounts" title="Manage in Trackers / X"><ArrowUpRight size={14}/></Link></div>
  <label className="ntd-search"><MagnifyingGlass size={13}/><input aria-label="Search social feed" placeholder={tab==='tweets'?'Search tweets':'Search creators'} value={query} onChange={event=>setQuery(event.target.value)}/></label>
  {tab==='tweets'&&<div className="ntd-wallet-filter"><label htmlFor="social-creator">Creator</label><select id="social-creator" value={selectedCreator} onChange={event=>setSelected(event.target.value)}><option value="">All creators</option>{creators.map(profile=><option key={profile.handle} value={profile.handle}>@{profile.handle}</option>)}</select></div>}
  <div className="ntd-scroll">
   {tab==='tweets'?tweets.map(post=><article key={post.id} className="ntd-social-post"><header><img src={post.profile.avatar} alt="" width={30} height={30}/><div><strong>{post.profile.name}</strong><span>@{post.profile.handle}</span></div><time>{post.minutes}m</time><XLogo size={12}/></header><p>{post.text}</p><footer><span><ChatCircle size={12}/>{Math.floor(post.likes/6)}</span><span><Heart size={12}/>{post.likes}</span></footer></article>):creators.filter(profile=>matches(`${profile.name} ${profile.handle}`)).map(profile=><button className="ntd-social-creator" key={profile.handle} onClick={()=>{setSelected(profile.handle);setTab('tweets');setQuery('');}}><img src={profile.avatar} alt="" width={32} height={32}/><span><strong>{profile.name}</strong><small>@{profile.handle}</small></span><ArrowUpRight size={13}/></button>)}
   {(tab==='tweets'&&!tweets.length||tab==='creators'&&!creators.filter(profile=>matches(`${profile.name} ${profile.handle}`)).length)&&<div className="ntd-empty"><XLogo size={22}/><strong>{creators.length?'No tweets in this view':'Add your first account'}</strong><p>{creators.length?'Posts from added accounts will appear when an X feed is connected.':'Add creators in Trackers → X to keep their posts here.'}</p><Link href="/trackers?tab=x">Manage creators<ArrowUpRight size={12}/></Link></div>}
  </div>
  <div className="ntd-footer"><span title="Illustrative posts from fictional fixture creators. Added X accounts are saved locally; no X API is connected.">Tracking {creators.length} accounts</span><Link href="/trackers?tab=x">Manage</Link></div>
 </>;
}
