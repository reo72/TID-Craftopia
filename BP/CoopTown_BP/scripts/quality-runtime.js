import {world,system,ItemStack} from '@minecraft/server';
import {jobCount} from './job-count.js';
import {rollQuality,setQuality} from './quality.js';
import {wateredWith,clearWatered} from './watering.js';
import {isPlaced} from './placed-store.js';
import {titleTrack,titleSeen} from './job-count.js';
import {titleMax} from './job-count.js';
import {skillValue} from './skill-config.js';

// Farmers' crop quality: a 農家 harvesting a ripe crop rolls a tier (gather level); the crop items that drop from that
// block in the next ticks are swapped for the same items marked with it (seeds stay plain). A crop watered with a
// watering can (watering.js) rolls with its rank bonus and may give one more crop (豊作).
// Every crop (asked 2026-10-25): field crops when ripe; pumpkin / melon and sugar cane only when they grew (not placed
// by a player: placed-store.js); sweet berries picked from a ripe bush. D needs no mark (food-lore.js shows it).
// state / ripe: the block state that must have reached ripe; natural: not player-placed; column: sugar cane style
// (everything above the broken block drops too); berry: picked by using the bush.
export const CROPS={
 'minecraft:wheat':{item:'minecraft:wheat',state:'growth',ripe:7},'minecraft:carrots':{item:'minecraft:carrot',state:'growth',ripe:7},
 'minecraft:potatoes':{item:'minecraft:potato',state:'growth',ripe:7},'minecraft:beetroot':{item:'minecraft:beetroot',state:'growth',ripe:7},
 'minecraft:cocoa':{item:'minecraft:cocoa_beans',state:'age',ripe:2},'minecraft:nether_wart':{item:'minecraft:nether_wart',state:'age',ripe:3},
 'minecraft:pumpkin':{item:'minecraft:pumpkin',natural:true},'minecraft:melon_block':{item:'minecraft:melon_slice',natural:true},
 'minecraft:sugar_cane':{item:'minecraft:sugar_cane',column:true},
 'minecraft:sweet_berry_bush':{item:'minecraft:sweet_berries',state:'growth',ripe:2,berry:true}};
/** Whether a broken / picked crop block counts as a harvest (ripe, grown). */
export function harvestable(rule,permutationState,placed=false){
 if(!rule)return false;
 if(rule.natural||rule.column)return !placed;
 return (permutationState??0)>=rule.ripe;
}
const FARM_JOB='農家';
const pending=[]; // {dimension, x, y, z, item, tier, until}
const before=new Map(); // player id -> {placed: Set of "x,y,z"} recorded before the break (placed-store is taken after)
const pos=({x,y,z})=>`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function installQuality({game}){
 const farmer=player=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return [p?.job,p?.secondJob].includes(FARM_JOB)?p:undefined;};
 // one harvest at a block: roll, then mark the drop there (and maybe one more crop when watered)
 const harvestedAt=new Map(); // player id -> Set of "x,y,z" they harvested (二期作)
 function harvest(player,p,dim,l,item){
  titleSeen(player,'harvested',item.replace('minecraft:',''));
  {const k=pos(l),set=harvestedAt.get(player.id)??new Set();if(set.has(k))titleTrack(player,'double_crop');set.add(k);if(set.size>500)set.delete(set.values().next().value);harvestedAt.set(player.id,set);}
  const watered=wateredWith(dim.id,l);clearWatered(dim.id,l);
  const tier=rollQuality(p.gather?.level??1,(watered?.rank??0)+skillValue(p,FARM_JOB,'rank')); // 土づくり (skill-config.js)titleMax(player,'crop_best',tier+1); // 記録 (progress-config.js RECORDS)
  // the extra crop comes after the swap window, so it is not taken for the harvest drop
  if(watered&&Math.random()<watered.harvest+skillValue(p,FARM_JOB,'harvest')){ // 豊作const at={x:Math.floor(l.x)+.5,y:Math.floor(l.y)+.5,z:Math.floor(l.z)+.5};
   system.runTimeout(()=>{try{dim.spawnItem(setQuality(new ItemStack(item,1),tier),at);player.playSound('random.orb',{pitch:1.6,volume:.4});}catch{}},5);}
  if(tier)pending.push({dimension:dim.id,x:Math.floor(l.x)+.5,y:Math.floor(l.y)+.5,z:Math.floor(l.z)+.5,item,tier,until:system.currentTick+3});
 }
 // before the break: which of the blocks (the column for sugar cane) a player placed
 world.beforeEvents.playerBreakBlock.subscribe(({block,player})=>{
  const rule=CROPS[block.typeId];if(!rule||!(rule.natural||rule.column))return;
  const placed=new Set(),column=[];
  try{let b=block;for(let n=0;n<(rule.column?32:1)&&b?.typeId===block.typeId;n++){column.push({...b.location});if(isPlaced(block.dimension.id,b.location))placed.add(pos(b.location));b=b.above();}}catch{}
  before.set(player.id,{type:block.typeId,placed,column,bottom:block.below()?.typeId!==block.typeId});
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation})=>{
  const type=brokenBlockPermutation.type.id,rule=CROPS[type];if(!rule||rule.berry)return;
  const rec=before.get(player.id);before.delete(player.id);
  const p=farmer(player);if(!p)return;
  if(rule.column){
   // the cane above the bottom one (the bottom one is usually replanted, like gather-runtime.js counts it)
   const col=rec?.type===type?rec.column:[block.location];let n=0;
   col.forEach((at,k)=>{if(rec?.placed.has(pos(at))||(k===0&&(rec?.bottom??true)))return;harvest(player,p,block.dimension,at,rule.item);n++;});
   if(n)jobCount(player,'harvest');
   return;
  }
  let state;try{state=rule.state?brokenBlockPermutation.getState(rule.state):undefined;}catch{return;}
  if(!harvestable(rule,state,rec?.placed.has(pos(block.location))))return;
  jobCount(player,'harvest');
  harvest(player,p,block.dimension,block.location,rule.item);
 });
 // sweet berries: using a ripe bush picks them
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event,rule=CROPS[block.typeId];if(!rule?.berry||event.isFirstEvent===false)return;
  if(event.itemStack?.typeId==='minecraft:bone_meal')return;
  let state;try{state=block.permutation.getState(rule.state);}catch{return;}
  if(!harvestable(rule,state))return;
  const dim=block.dimension,l={...block.location};
  system.run(()=>{const p=farmer(player);if(!p)return;jobCount(player,'harvest');harvest(player,p,dim,l,rule.item);});
 });
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(!pending.length||entity.typeId!=='minecraft:item')return;
  const now=system.currentTick;for(let i=pending.length-1;i>=0;i--)if(pending[i].until<now)pending.splice(i,1);
  let stack;try{stack=entity.getComponent('minecraft:item')?.itemStack;}catch{}
  if(!stack)return;
  const l=entity.location,hit=pending.find(q=>q.item===stack.typeId&&q.dimension===entity.dimension.id&&Math.hypot(q.x-l.x,q.y-l.y,q.z-l.z)<1.6);
  if(!hit)return;
  pending.splice(pending.indexOf(hit),1); // one drop per harvest (and the swapped item does not match again)
  const marked=setQuality(new ItemStack(stack.typeId,stack.amount),hit.tier);
  const dim=entity.dimension;system.run(()=>{try{entity.remove();dim.spawnItem(marked,l);}catch{}});
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>before.delete(playerId));
}
