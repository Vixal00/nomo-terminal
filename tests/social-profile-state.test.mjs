import test from 'node:test';
import assert from 'node:assert/strict';
import {trackedXProfiles,enabledXProfiles,toggleXNotifications} from '../components/nomo/social-profile-state.ts';
const profile=(handle,fixture=true)=>({handle,name:handle,address:`${handle}.near`,avatar:'/art/coins/p77.webp',fixture});

test('removed default and custom accounts stay out when saved preferences are restored',()=>{
  const preferences=JSON.parse(JSON.stringify({removed:['Northstar','custom']}));
  assert.deepEqual(trackedXProfiles([profile('northstar'),profile('moss')],[profile('custom',false)],preferences.removed).map(item=>item.handle),['moss']);
});

test('notification switches control feed inclusion independently of linked wallets',()=>{
  const profiles=[profile('northstar'),{...profile('custom',false),address:''}];
  const muted=toggleXNotifications([],'Northstar');
  assert.deepEqual(enabledXProfiles(profiles,muted).map(item=>item.handle),['custom']);
  assert.deepEqual(enabledXProfiles(profiles,toggleXNotifications(muted,'NORTHSTAR')),profiles);
});

test('re-adding an account produces one identity even if its handle casing changes',()=>{
  const result=trackedXProfiles([profile('northstar')],[profile('Northstar',false)],[]);
  assert.equal(result.length,1);
});
