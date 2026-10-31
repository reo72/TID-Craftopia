import {world,system} from '@minecraft/server';
import {ItemStack} from '@minecraft/server';
import {openCustomBox,PACK_BOX} from './npc-warehouse.js';
import {arrowTo,bearing,turnWord} from './job-tools-config.js';
import {pushText} from './hud-log.js';

// Graves (asked 2026-10-28): when a player dies nothing drops. Their things go into a grave (entity GRAVE, RP
// tools/build-grave.py) where they died, and only they can open it. The world keeps inventories on death
// (gamerule keepInventory, set here), so at death the inventory is still whole: it is moved into the grave, except
// what never leaves a player (KEEP: the menu books). Using the grave opens its contents like a chest (the same box as
// the backpack, npc-warehouse.js openCustomBox), PAGE at a time; what is left in the box goes back into the grave,
// and an empty grave goes away. Experience stays with the player (keepInventory).
export const GRAVE='cooptown:grave';
// reach: the grave opens, and stays open, only within this many blocks (asked 2026-10-30: 5)
// compass: COMPASS is given at the respawn and shows the way to the grave while held; it goes when its owner comes
// within compassGone blocks of the grave (asked 2026-10-30)
export const COMPASS='cooptown:grave_compass',COMPASS_KEY='cooptown:grave_to';
export const GRAVE_RULES={page:27,reach:5,compassGone:5,compassTicks:10,fallbackY:{'minecraft:overworld':-60,'minecraft:nether':5,'minecraft:the_end':5}};
export const KEEP=new Set(['cooptown:guidebook','cooptown:guidebook_open','cooptown:admin_book',COMPASS]);
const OWNER='cooptown:grave_owner',OWNER_NAME='cooptown:grave_name',AT='cooptown:grave_at';
const SLOTS=['Head','Chest','Legs','Feet','Offhand'];
const containerOf=e=>{try{return e.getComponent('minecraft:inventory').container;}catch{return undefined;}};
const give=(player,stack,at)=>{try{const left=player.getComponent('minecraft:inventory').container.addItem(stack);if(left)player.dimension.spawnItem(left,at??player.location);}catch{}};

/** Takes everything a player carries that goes into a grave (inventory, armour, off hand; not KEEP), leaving it empty. */
export function takeBelongings(player){
 const out=[],inv=containerOf(player),eq=(()=>{try{return player.getComponent('minecraft:equippable');}catch{return undefined;}})();
 for(let i=0;inv&&i<inv.size;i++){const s=inv.getItem(i);if(!s||KEEP.has(s.typeId))continue;out.push(s);inv.setItem(i,undefined);}
 for(const slot of SLOTS){let s;try{s=eq?.getEquipment(slot);}catch{}if(!s||KEEP.has(s.typeId))continue;out.push(s);try{eq.setEquipment(slot,undefined);}catch{}}
 return out;
}
/** Where a grave stands: the death spot, raised above the world's floor when they fell out of it. */
export function graveSpot(dimId,loc){
 const floor=GRAVE_RULES.fallbackY[dimId]??-60;
 return {x:Math.floor(loc.x)+.5,y:Math.max(Math.floor(loc.y),floor),z:Math.floor(loc.z)+.5};
}
/** Puts stacks in a grave container; returns those that did not fit. */
export function fillGrave(c,stacks){
 const left=[];for(const s of stacks){const l=c?c.addItem(s):s;if(l)left.push(l);}return left;
}
export const graveLabel=name=>`§7${name}の墓`;

/** A player died: their things go into a new grave. Returns the grave, or undefined when there was nothing. */
export function makeGrave(player,loc,dim){
 const stacks=takeBelongings(player);if(!stacks.length)return undefined;
 const at=graveSpot(dim.id,loc);let grave;
 try{grave=dim.spawnEntity(GRAVE,at);}catch(e){console.warn('[CoopTown] 墓: '+e);stacks.forEach(s=>give(player,s));return undefined;}
 try{grave.setDynamicProperty(OWNER,player.id);grave.setDynamicProperty(OWNER_NAME,player.name);grave.setDynamicProperty(AT,Date.now());grave.nameTag=graveLabel(player.name);}catch{}
 // a grave holds a whole inventory; should anything not fit, it lies on the ground beside it
 for(const s of fillGrave(containerOf(grave),stacks))try{dim.spawnItem(s,at);}catch{}
 return grave;
}
/** Whether a player is within GRAVE_RULES.reach of a grave (same dimension). */
export function nearGrave(player,grave,reach=GRAVE_RULES.reach){
 try{if(!grave.isValid||grave.dimension.id!==player.dimension.id)return false;const a=grave.location,b=player.location;return (a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2<=reach**2;}catch{return false;}
}
/** A compass to a grave at `at` in dimension dimId. */
export function graveCompass(at,dimId){
 const s=new ItemStack(COMPASS,1);
 try{s.setDynamicProperty(COMPASS_KEY,JSON.stringify({x:Math.floor(at.x),y:Math.floor(at.y),z:Math.floor(at.z),dim:dimId}));s.setLore(['§7持っていると、お墓への向きと距離が出ます','§7お墓に着くと消えます']);}catch{}
 return s;
}
const compassTarget=s=>{try{return JSON.parse(s.getDynamicProperty(COMPASS_KEY)??'null');}catch{return null;}};
const DIMS={'minecraft:overworld':'地上','minecraft:nether':'ネザー','minecraft:the_end':'エンド'};
/** The owner opens their grave: up to a page of it goes into the box; what is left there goes back on closing. */
export function openGrave(player,grave){
 const c=containerOf(grave);if(!c)return false;
 const near=()=>nearGrave(player,grave);
 return openCustomBox(player,{type:PACK_BOX,name:'お墓',still:near,
  fill:box=>{let n=0;for(let i=0;i<c.size&&n<GRAVE_RULES.page;i++){const s=c.getItem(i);if(!s)continue;c.setItem(i,undefined);box.setItem(n++,s);}},
  settle:(box,pl)=>{
   const back=[];for(let i=0;box&&i<box.size;i++){const s=box.getItem(i);if(s){box.setItem(i,undefined);back.push(s);}}
   if(grave.isValid){for(const s of fillGrave(c,back))give(pl??player,s,grave.location);}else back.forEach(s=>pl?give(pl,s):player.dimension.spawnItem(s,player.location));
   let rest=0;for(let i=0;grave.isValid&&i<c.size;i++)if(c.getItem(i))rest++;
   if(grave.isValid&&!rest){try{grave.remove();}catch{}try{pl?.sendMessage('§aお墓の中身をすべて受け取りました。');pl?.playSound('random.levelup',{pitch:1.4,volume:.4});}catch{}}
   else if(rest)try{pl?.sendMessage(`§7お墓にまだ${rest}個残っています。もう一度使うと続きを受け取れます。`);}catch{}
  }});
}

export function installGraves(){
 // 墓のコンパス: the way while held (action bar, as the map pin does); gone near the grave
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   const c=(()=>{try{return player.getComponent('minecraft:inventory').container;}catch{return undefined;}})();if(!c)continue;
   for(let i=0;i<c.size;i++){
    const s=c.getItem(i);if(s?.typeId!==COMPASS)continue;const t=compassTarget(s);
    if(!t){c.setItem(i,undefined);continue;}
    const here=t.dim===player.dimension.id,l=player.location,d=Math.hypot(l.x-t.x-.5,l.y-t.y,l.z-t.z-.5);
    if(here&&d<=GRAVE_RULES.compassGone){c.setItem(i,undefined);try{player.sendMessage('§aお墓に着きました。墓のコンパスは消えました。');player.playSound('random.orb',{pitch:1.2,volume:.5});}catch{}continue;}
    if(i===player.selectedSlotIndex)try{pushText(player,'grave',here?`§fお墓 §e${turnWord(l,player.getRotation().y,t)} §f${bearing(l,t)}`:`§eお墓は${DIMS[t.dim]??t.dim}にあります`);}catch{} /* a HUD log line, as the map pin (2026-10-30: the action bar flickered with the minimap) */
   }
  }
 },GRAVE_RULES.compassTicks);
 // inventories stay on death, so the grave can take them whole (and nothing drops for others to pick up)
 system.run(()=>{try{world.gameRules.keepInventory=true;}catch(e){console.warn('[CoopTown] 墓: keepInventory '+e);}});
 const pending=new Map(); // player id -> {loc, dim, at?}: where they died and their grave (the message waits for the respawn)
 world.afterEvents.entityDie.subscribe(({deadEntity:p})=>{
  if(p?.typeId!=='minecraft:player')return;
  let loc,dim;try{loc={...p.location};dim=p.dimension;}catch{return;}
  const d={loc,dim};pending.set(p.id,d);
  system.run(()=>{try{const g=makeGrave(p,loc,dim);if(g)d.at=g.location;}catch(e){console.warn('[CoopTown] 墓: '+e);}});
 });
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{
  const d=pending.get(player.id);if(initialSpawn||!d)return;pending.delete(player.id);
  // the inventory could not be read while dead: it is still with them (keepInventory), so the grave is made now
  if(!d.at)try{const g=makeGrave(player,d.loc,d.dim);if(g)d.at=g.location;}catch(e){console.warn('[CoopTown] 墓: '+e);}
  if(!d.at)return;d.dim=d.dim.id;
  const where={'minecraft:overworld':'地上','minecraft:nether':'ネザー','minecraft:the_end':'エンド'}[d.dim]??d.dim;
  try{player.sendMessage(`§e持ち物はお墓に入っています（${where} X ${Math.floor(d.at.x)} Y ${Math.floor(d.at.y)} Z ${Math.floor(d.at.z)}）。お墓を使うと受け取れます。
§7墓のコンパスを持つと、お墓への向きと距離が出ます。`);}catch{}
  try{const left=player.getComponent('minecraft:inventory').container.addItem(graveCompass(d.at,d.dim));if(left)player.dimension.spawnItem(left,player.location);}catch{}
 });
 // only the owner opens a grave (through the box); anyone else is told whose it is
 world.beforeEvents.playerInteractWithEntity.subscribe(ev=>{
  const g=ev.target;if(g?.typeId!==GRAVE)return;ev.cancel=true;
  const player=ev.player;let owner,name;try{owner=g.getDynamicProperty(OWNER);name=g.getDynamicProperty(OWNER_NAME);}catch{}
  system.run(()=>{try{
   if(owner!==player.id){player.sendMessage(`§e${name??'だれか'}さんのお墓です。本人しか開けられません。`);return;}
   if(!nearGrave(player,g)){player.sendMessage(`§eお墓にもっと近づいてください（${GRAVE_RULES.reach}マス以内）。`);return;}
   if(openGrave(player,g))player.sendMessage('§7お墓を開きました。もう一度タップして中身を受け取ってね（しゃがむと閉じます）。');
  }catch(e){console.warn('[CoopTown] 墓: '+e);}});
 });
}
