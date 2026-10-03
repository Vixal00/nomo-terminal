"use client";
import { useEffect, useState } from "react";
import { PREVIEW_TRADERS, normalizeTrackedAccount } from "./trader-preview";
import { trackedXProfiles, toggleXNotifications, type XProfile, type XPreferences } from "./social-profile-state";
export type { XProfile } from "./social-profile-state";
export const X_PROFILES: XProfile[] = PREVIEW_TRADERS.slice(0,8).map((trader,index)=>({handle:trader.handle,name:trader.name,address:[0,2,6].includes(index)?trader.address:"",avatar:trader.avatar,fixture:true}));
const X_KEY="nomo.preview.x-profiles.v1";
const SETTINGS_KEY="nomo.x-preferences.v1";
const LEGACY_HIDDEN_KEY="nomo.preview.hidden-x.v1";
const EVENT="nomo-social-profiles";
const handles=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string").map(handle=>(X_PROFILES.find(profile=>`${profile.handle}_preview`===handle)?.handle||handle).toLowerCase()):[];

export function useXProfiles(){
 const [custom,setCustom]=useState<XProfile[]>([]);
 const [preferences,setPreferences]=useState<XPreferences>({removed:[],muted:[]});
 useEffect(()=>{
  const load=()=>{try{
   const saved:unknown=JSON.parse(localStorage.getItem(X_KEY)||"[]");
   setCustom(Array.isArray(saved)?saved.filter((item):item is XProfile=>!!item&&typeof item==='object'&&typeof item.handle==='string'&&/^[a-zA-Z0-9_]{1,15}$/.test(item.handle)&&typeof item.name==='string'&&typeof item.address==='string'&&typeof item.avatar==='string'&&item.avatar.startsWith('/art/coins/')).map(item=>({...item,address:normalizeTrackedAccount(item.address),fixture:X_PROFILES.some(profile=>profile.handle.toLowerCase()===item.handle.toLowerCase())})):[]);
   const settings:unknown=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"null");
   if(settings && typeof settings==="object") setPreferences({removed:handles("removed" in settings?settings.removed:[]),muted:handles("muted" in settings?settings.muted:[])});
   else setPreferences({removed:[],muted:handles(JSON.parse(localStorage.getItem(LEGACY_HIDDEN_KEY)||"[]"))});
  }catch{}};
  load();window.addEventListener(EVENT,load);window.addEventListener('storage',load);
  return()=>{window.removeEventListener(EVENT,load);window.removeEventListener('storage',load);};
 },[]);
 const save=(nextCustom:XProfile[],nextPreferences:XPreferences)=>{
  setCustom(nextCustom);setPreferences(nextPreferences);
  try {localStorage.setItem(X_KEY,JSON.stringify(nextCustom));localStorage.setItem(SETTINGS_KEY,JSON.stringify(nextPreferences));window.dispatchEvent(new Event(EVENT));}catch{}
 };
 const addProfile=(profile:XProfile)=>{
  const handle=profile.handle.toLowerCase();
  const defaults=X_PROFILES.find(item=>item.handle.toLowerCase()===handle);
  const added=defaults?{...profile,avatar:defaults.avatar,fixture:true}:profile;
  save([...custom.filter(item=>item.handle.toLowerCase()!==handle),added],{removed:preferences.removed.filter(item=>item!==handle),muted:preferences.muted.filter(item=>item!==handle)});
 };
 const removeProfile=(profile:XProfile)=>{
  const handle=profile.handle.toLowerCase();
  save(custom.filter(item=>item.handle.toLowerCase()!==handle),{removed:[...new Set([...preferences.removed,handle])],muted:preferences.muted.filter(item=>item!==handle)});
 };
 const toggleNotifications=(profile:XProfile)=>save(custom,{...preferences,muted:toggleXNotifications(preferences.muted,profile.handle)});
 const linkWallet=(profile:XProfile,address:string)=>save([...custom.filter(item=>item.handle.toLowerCase()!==profile.handle.toLowerCase()),{...profile,address}],preferences);
 return {profiles:trackedXProfiles(X_PROFILES,custom,preferences.removed),muted:preferences.muted,addProfile,removeProfile,toggleNotifications,linkWallet};
}
