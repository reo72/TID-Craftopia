// Playing needs a site link (asked 2026-10-28): a player who has not linked with "!link" stands still at login. They
// cannot move, break, place, use or touch anything and take no damage, and the action bar tells them how to link.
// Chat stays open so "!link CODE" works; a successful link (link.js) frees them at once and is remembered in
// GATE.key, so they are never stopped again. Someone linked before this (or on the site) is found by asking the site
// (GET /api/game/linked, at most every GATE.askMs per player). Admins (the main pack's admin tag) are never stopped, and an admin can
// let someone in by hand with "!linkok NAME" (when the site is down).
// Off when the site is not configured, or with "require_link": false in config/default/variables.json.
import * as mc from '@minecraft/server';
import {variables} from '@minecraft/server-admin';
import {configured,send} from './http.js';
import {load,save} from './store.js';
const {world,system}=mc;

export const GATE={key:'portal:linked',adminTag:'cooptown_admin',everyTicks:40,askMs:30000,
 locks:['Movement','LateralMovement','Jump','Sneak','Mount','Dismount','MoveForward','MoveBackward','MoveLeft','MoveRight']};
let linked=null; // Set of player ids
const ids=()=>linked??=new Set(load(GATE.key,[]));
export function isLinked(id){return ids().has(id);}
export function enabled(){
 let v;try{v=variables.get('require_link');}catch{}
 return v!==false&&configured();
}
const exempt=p=>{try{return p.hasTag(GATE.adminTag);}catch{return false;}};
export const mustLink=p=>enabled()&&!exempt(p)&&!isLinked(p.id);

// input permissions: off while locked, back on when freed
function setInputs(p,on){
 const cat=mc.InputPermissionCategory;if(!cat||!p.inputPermissions)return;
 for(const name of GATE.locks)if(cat[name]!==undefined)try{p.inputPermissions.setPermissionCategory(cat[name],on);}catch{}
}
const locked=new Set();
function lock(p){
 if(!locked.has(p.id)){locked.add(p.id);setInputs(p,false);
  let url;try{url=variables.get('portal_url');}catch{}
  try{p.sendMessage(`§e§lサイトと連携するまで遊べません。§r\n§f1. サイト${url?`（${url}）`:''}に Discord でログイン\n§f2. マイページの「ゲーム連携」でコードを出す\n§f3. チャットに §b!link コード §fと入力`);}catch{}}
 try{p.addEffect('resistance',GATE.everyTicks+20,{amplifier:4,showParticles:false});p.addEffect('saturation',GATE.everyTicks+20,{amplifier:0,showParticles:false});}catch{}
 try{p.onScreenDisplay.setActionBar('§eサイト連携が必要です §7— チャットに §b!link コード');}catch{}
}
function unlock(p){if(locked.delete(p.id))setInputs(p,true);}

/** A player linked (link.js): remembered, and freed if they were stopped. */
export function markLinked(p){
 const s=ids();if(!s.has(p.id)){s.add(p.id);try{save(GATE.key,[...s]);}catch(e){console.warn('[Portal] 連携の記録に失敗しました: '+e);}}
 if(locked.has(p.id)){unlock(p);try{p.sendMessage('§aサイト連携ができました。遊べるようになりました！');p.onScreenDisplay.setActionBar('');}catch{}}
}

// asks the site whether this player is linked already (one question at a time per player)
const asked=new Map();
async function ask(p){
 const now=Date.now();if((asked.get(p.id)??0)>now)return;asked.set(p.id,now+GATE.askMs);
 const {status,data}=await send('GET','/api/game/linked?xuid='+encodeURIComponent(p.id));
 if(status===200&&data?.linked===true&&p.isValid)markLinked(p);
}
export function installGate(){
 system.runInterval(()=>{
  for(const p of world.getAllPlayers()){if(mustLink(p)){lock(p);void ask(p);}else unlock(p);}
 },GATE.everyTicks);
 world.afterEvents.playerLeave?.subscribe(({playerId})=>{locked.delete(playerId);asked.delete(playerId);});
 // nothing can be done while stopped (chat stays open for !link)
 const stop=ev=>{const p=ev.player??ev.source;if(p?.typeId==='minecraft:player'&&locked.has(p.id))ev.cancel=true;};
 for(const name of ['playerBreakBlock','playerPlaceBlock','playerInteractWithBlock','playerInteractWithEntity','itemUse'])
  try{world.beforeEvents[name]?.subscribe(stop);}catch{}
 // !linkok NAME: an admin lets a player in by hand
 world.beforeEvents.chatSend.subscribe(ev=>{
  const m=ev.message.trim().match(/^!linkok\s+(.+)$/i);if(!m)return;ev.cancel=true;
  const admin=ev.sender;
  system.run(()=>{
   if(!exempt(admin)){try{admin.sendMessage('§c!linkok は運営だけが使えます。');}catch{}return;}
   const target=world.getAllPlayers().find(p=>p.name===m[1].trim());
   if(!target){try{admin.sendMessage('§eそのプレイヤーはオンラインではありません。');}catch{}return;}
   markLinked(target);try{admin.sendMessage(`§a${target.name} を連携済みにしました。`);}catch{}
  });
 });
}
