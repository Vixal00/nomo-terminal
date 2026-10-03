"use client";
import { useEffect, useState } from "react";
import { PREVIEW_TRADERS, normalizeTrackedAccount } from "./trader-preview";
export type XProfile = { handle: string; name: string; address: string; avatar: string; fixture: boolean };
export const X_PROFILES: XProfile[] = PREVIEW_TRADERS.slice(0,8).map(trader=>({handle:trader.handle,name:trader.name,address:trader.address,avatar:trader.avatar,fixture:true}));
export const X_KEY="nomo.preview.x-profiles.v1";
export const HIDDEN_X_KEY="nomo.preview.hidden-x.v1";
export const FOLLOW_X_KEY="nomo.preview.followed-x.v1";
const EVENT="nomo-social-profiles";
export function saveSocialPreference(key:string,value:unknown){
 try {localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event(EVENT));}catch{}
}
export function useXProfiles(){
 const [profiles,setProfiles]=useState<XProfile[]>(X_PROFILES);
 const [hidden,setHidden]=useState<string[]>([]);
 const [followedX,setFollowedX]=useState<string[]>([]);
 useEffect(()=>{
  const load=()=>{try{
   const saved:unknown=JSON.parse(localStorage.getItem(X_KEY)||"[]");
   const custom=Array.isArray(saved)?saved.filter((item):item is XProfile=>!!item&&typeof item==='object'&&typeof item.handle==='string'&&/^[a-zA-Z0-9_]{1,15}$/.test(item.handle)&&typeof item.name==='string'&&typeof item.address==='string'&&typeof item.avatar==='string'&&item.avatar.startsWith('/art/coins/')).map(item=>({...item,address:normalizeTrackedAccount(item.address),fixture:false})):[];
   const unique=new Map([...X_PROFILES,...custom].map(item=>[item.handle.toLowerCase(),item]));
   setProfiles([...unique.values()]);
   const handles=(key:string)=>{const value:unknown=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string').map(handle=>X_PROFILES.find(profile=>`${profile.handle}_preview`===handle)?.handle||handle):[];};
   setHidden(handles(HIDDEN_X_KEY));setFollowedX(handles(FOLLOW_X_KEY));
  }catch{}};
  load();window.addEventListener(EVENT,load);window.addEventListener('storage',load);
  return()=>{window.removeEventListener(EVENT,load);window.removeEventListener('storage',load);};
 },[]);
 return {profiles,setProfiles,hidden,setHidden,followedX,setFollowedX};
}
