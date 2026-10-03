export type XProfile = { handle:string; name:string; address:string; avatar:string; fixture:boolean };
export type XPreferences = { removed:string[]; muted:string[] };
const key = (handle:string) => handle.toLowerCase();

export function trackedXProfiles(defaults:XProfile[], custom:XProfile[], removed:string[]) {
  const excluded=new Set(removed.map(key));
  return [...new Map([...defaults,...custom].map(profile=>[key(profile.handle),profile])).values()].filter(profile=>!excluded.has(key(profile.handle)));
}

export function enabledXProfiles(profiles:XProfile[], muted:string[]) {
  const disabled=new Set(muted.map(key));
  return profiles.filter(profile=>!disabled.has(key(profile.handle)));
}

export function toggleXNotifications(muted:string[], handle:string) {
  return muted.some(item=>key(item)===key(handle)) ? muted.filter(item=>key(item)!==key(handle)) : [...muted,key(handle)];
}
