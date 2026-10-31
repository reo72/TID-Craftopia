import {world,system} from '@minecraft/server';
import {CANS,WATER,GROWABLE,growChance,area} from './watering-config.js';
import {skillValue} from './skill-config.js';

// The farmer's watering cans (watering-config.js). Holding use on a crop (or its farmland) repeats the block
// interaction; every WATER.everyTicks one watering covers the can's area: farmland wet, each crop not watered in the
// last WATER.cooldownMs may grow a stage, and is marked so its harvest (quality-runtime.js) rolls a better rank and
// may give one more crop. One watering uses one water (the durability bar); using the can on water fills it.
const marks=new Map(); // "dimension:x,y,z" -> {at, can}
const key=(dim,l)=>`${dim}:${Math.floor(l.x)},${Math.floor(l.y)},${Math.floor(l.z)}`;
/** The can a crop was watered with, if within WATER.markMs (its rank / harvest bonus), else undefined. */
export function wateredWith(dim,loc,now=Date.now()){const m=marks.get(key(dim,loc));return m&&now-m.at<=WATER.markMs?CANS[m.can]:undefined;}
export const clearWatered=(dim,loc)=>marks.delete(key(dim,loc));
/** Marks a crop watered; true when it counts as a new watering (not within the cooldown). */
export function markWatered(dim,loc,can,now=Date.now()){
 const k=key(dim,loc),m=marks.get(k),fresh=!m||now-m.at>=WATER.cooldownMs;
 if(fresh)marks.set(k,{at:now,can});
 return fresh;
}
// forget old marks now and then
const sweep=now=>{for(const [k,m] of marks)if(now-m.at>WATER.markMs)marks.delete(k);};

export function installWatering({game}){
 const lastTick=new Map(),lastNote=new Map(),xpLeft=new Map();
 const farmer=player=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return [p?.job,p?.secondJob].includes(WATER.job)?p:undefined;};
 // a short message, at most every 3 s per player (holding use repeats)
 const note=(player,text)=>{const now=Date.now();if(now-(lastNote.get(player.id)??0)<3000)return;lastNote.set(player.id,now);try{player.sendMessage(text);}catch{}};
 const heldCan=player=>{try{const c=player.getComponent('minecraft:inventory').container,s=c.getItem(player.selectedSlotIndex);return s&&CANS[s.typeId]?{c,s,slot:player.selectedSlotIndex}:undefined;}catch{return undefined;}};
 const allowed=(player,can)=>{
  const p=farmer(player);if(!p){note(player,'§eジョーロは農家専用です。');return;}
  if((p.level??1)<can.level){note(player,`§e${can.name}は職業Lv.${can.level}から使えます。`);return;}
  return p;
 };
 function water(player,block){
  const held=heldCan(player);if(!held)return;
  const can=CANS[held.s.typeId],p=allowed(player,can);if(!p)return;
  const dur=held.s.getComponent('minecraft:durability');
  if(dur&&dur.damage>=dur.maxDurability){note(player,'§e水がありません。水に向けて使うと汲めます。');return;}
  // the crop layer: the block looked at, or the one on the farmland looked at
  const dim=block.dimension,y=block.typeId==='minecraft:farmland'?block.location.y+1:block.location.y;
  if(block.typeId!=='minecraft:farmland'&&!GROWABLE[block.typeId])return;
  const now=Date.now();let wet=0,fresh=0,grown=0;
  for(const [dx,dz] of area(can,skillValue(p,WATER.job,'radius'))){
   const at={x:block.location.x+dx,y,z:block.location.z+dz};
   let crop,soil;try{crop=dim.getBlock(at);soil=dim.getBlock({...at,y:y-1});}catch{continue;}
   if(soil?.typeId==='minecraft:farmland'){try{soil.setPermutation(soil.permutation.withState('moisturized_amount',7));}catch{}wet++;}
   const g=crop&&GROWABLE[crop.typeId];if(!g)continue;
   wet++;
   if(!markWatered(dim.id,at,held.s.typeId,now))continue;
   fresh++;
   try{
    const v=crop.permutation.getState(g[0]);
    if(typeof v==='number'&&v<g[1]&&Math.random()<growChance(can,p.level,skillValue(p,WATER.job,'grow'))){crop.setPermutation(crop.permutation.withState(g[0],v+1));grown++;
     dim.spawnParticle('minecraft:crop_growth_emitter',{x:at.x+.5,y:at.y+.5,z:at.z+.5});}
   }catch{}
   try{dim.spawnParticle('minecraft:water_splash_particle_manual',{x:at.x+.5,y:at.y+.9,z:at.z+.5});}catch{}
  }
  if(!wet)return;
  if(dur){dur.damage=Math.min(dur.maxDurability,dur.damage+1);try{held.c.setItem(held.slot,held.s);}catch{}}
  try{player.playSound('bucket.empty_water',{pitch:1.5,volume:.25});}catch{}
  // job XP: one per WATER.xpPerBlocks new waterings
  if(fresh){const n=(xpLeft.get(player.id)??0)+fresh,xp=Math.floor(n/WATER.xpPerBlocks);xpLeft.set(player.id,n%WATER.xpPerBlocks);
   if(xp)try{game.execute(player.id,'job.earn',{skill:'gather',xp,note:'水やり'});}catch{}}
  if(Math.random()<.02)sweep(now);
 }
 // holding use on a block repeats this; the can never places or tills anything
 world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  if(!ev.itemStack||!CANS[ev.itemStack.typeId])return;
  ev.cancel=true;
  const now=system.currentTick,id=ev.player.id;if(now-(lastTick.get(id)??-99)<WATER.everyTicks)return;lastTick.set(id,now);
  const {player,block}=ev;system.run(()=>water(player,block));
 });
 // using it on water fills it
 world.afterEvents.itemUse.subscribe(({source:player,itemStack})=>{
  if(!itemStack||!CANS[itemStack.typeId])return;
  let hit;try{hit=player.getBlockFromViewDirection({maxDistance:5,includeLiquidBlocks:true});}catch{}
  if(!/^minecraft:(flowing_)?water$/.test(hit?.block?.typeId??''))return;
  const held=heldCan(player);if(!held)return;
  const can=CANS[held.s.typeId];if(!allowed(player,can))return;
  const dur=held.s.getComponent('minecraft:durability');if(!dur||dur.damage===0)return;
  dur.damage=0;try{held.c.setItem(held.slot,held.s);player.playSound('bucket.fill_water',{volume:.6});}catch{}
  note(player,`§b${can.name}に水を汲みました（${can.water}回分）。`);
 });
}
