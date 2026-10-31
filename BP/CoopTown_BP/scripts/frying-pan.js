import {world,system,ItemStack} from '@minecraft/server';

// The frying pans (asked 2026-10-28; 3D model from the user, RP tools/build-frying-pan.py): three levels, made by the
// 料理人 on the workbench. Using one (custom component cooptown:frying_pan) plays the flip: the held pan is swapped for
// its _flip twin (whose attachable plays the animation once) for FLIP.ticks, with a sizzle, a whoosh and a landing.
// The pan keeps its name, lore and dynamic properties; a twin left over (leaving, a crash) turns back on its own.
export const PAN_LEVELS=[1,2,3];
export const PAN_NAMES={1:'フライパン',2:'上等なフライパン',3:'名人のフライパン'};
export const FLIP={ticks:55,token:'cooptown:pan_flip'};
const base=id=>id.replace(/_flip$/,'');
export const isPan=id=>/^cooptown:frying_pan_[123](_flip)?$/.test(String(id));
// the 料理人's recipes (workbench 職業 tab), each level from the one below
const icon=n=>'textures/cooptown/items/frying_pan_'+n;
export const PAN_RECIPES=[
 {name:PAN_NAMES[1],job:'料理人',output:['cooptown:frying_pan_1',1],inputs:[['minecraft:iron_ingot',3],['minecraft:stick',1]],icon:icon(1)},
 {name:PAN_NAMES[2],job:'料理人',jobLevel:20,output:['cooptown:frying_pan_2',1],inputs:[['cooptown:frying_pan_1',1],['minecraft:iron_ingot',4],['minecraft:copper_ingot',4]],icon:icon(2)},
 {name:PAN_NAMES[3],job:'料理人',jobLevel:40,output:['cooptown:frying_pan_3',1],inputs:[['cooptown:frying_pan_2',1],['minecraft:gold_ingot',4],['minecraft:diamond',1]],icon:icon(3)}];
export const PAN_ITEM_NAMES=Object.fromEntries(PAN_LEVELS.flatMap(n=>[['cooptown:frying_pan_'+n,PAN_NAMES[n]],['cooptown:frying_pan_'+n+'_flip',PAN_NAMES[n]]]));
/** A copy of a pan stack as another kind (the twin or back), keeping its name, lore and dynamic properties. */
export function swapped(stack,to){
 const s=new ItemStack(to,1);
 try{if(stack.nameTag)s.nameTag=stack.nameTag;}catch{}
 try{const l=stack.getLore();if(l?.length)s.setLore(l);}catch{}
 try{for(const k of stack.getDynamicPropertyIds?.()??[])s.setDynamicProperty(k,stack.getDynamicProperty(k));}catch{}
 return s;
}
const flipping=new Map(); // player id -> token
const sfx=(player,id,pitch=1,volume=.6)=>{try{player.dimension.playSound(id,player.location,{pitch,volume});}catch{}};
// every slot holding the twin with this token (or any twin when token is undefined) goes back to the pan
function restore(player,token){
 let c;try{c=player.getComponent('minecraft:inventory').container;}catch{return;}
 for(let i=0;i<c.size;i++){const s=c.getItem(i);if(!s||!/_flip$/.test(s.typeId)||!isPan(s.typeId))continue;
  if(token!==undefined&&s.getDynamicProperty(FLIP.token)!==token)continue;
  const b=swapped(s,base(s.typeId));try{b.setDynamicProperty(FLIP.token,undefined);}catch{}c.setItem(i,b);}
}
/** Using a pan: the flip (main.js custom component cooptown:frying_pan). */
export function useFryingPan(player){
 if(flipping.has(player.id))return;
 let c,slot,s;try{c=player.getComponent('minecraft:inventory').container;slot=player.selectedSlotIndex;s=c.getItem(slot);}catch{return;}
 if(!s||!isPan(s.typeId)||/_flip$/.test(s.typeId))return;
 const token=`${player.id}:${system.currentTick}`,twin=swapped(s,s.typeId+'_flip');
 try{twin.setDynamicProperty(FLIP.token,token);c.setItem(slot,twin);}catch{return;}
 flipping.set(player.id,token);
 sfx(player,'block.campfire.crackle',1.2,.8);
 system.runTimeout(()=>sfx(player,'mob.bat.takeoff',1.6,.5),10);   // up it goes (0.5 s)
 system.runTimeout(()=>{sfx(player,'random.pop',.8,.7);           // and lands (1.45 s)
  try{const h=player.getHeadLocation(),v=player.getViewDirection();player.dimension.spawnParticle('minecraft:basic_smoke_particle',{x:h.x+v.x,y:h.y-.3,z:h.z+v.z});}catch{}},29);
 system.runTimeout(()=>{flipping.delete(player.id);try{if(player.isValid)restore(player,token);}catch{}},FLIP.ticks);
}
export function installFryingPans(){
 // twins left over (a crash, leaving mid-flip) turn back into pans
 system.runInterval(()=>{for(const p of world.getAllPlayers())if(!flipping.has(p.id))restore(p);},100);
 world.afterEvents.playerLeave?.subscribe(({playerId})=>flipping.delete(playerId));
}
