import {world,system} from '@minecraft/server';
import {inTown} from './town-bgm.js';
import {isAdmin} from './admin-runtime.js';

// Rules inside the first town (asked 2026-10-30; the boxes of hud-info.js PLACES 最初の町, as for its music):
//  - players other than staff (admin-runtime.js isAdmin) are in adventure mode there, and back in survival outside
//    (only those the town switched, marked with ADV_TAG; creative / spectator players are left alone);
//  - hostile mobs do not spawn there (removed as they appear);
//  - players other than staff deal no damage there: weakness strong enough for any hand or weapon, and what still
//    gets through (arrows, tridents) is healed back at once.
export const TOWN_RULES={checkTicks:10,weaknessTicks:40,advTag:'ct_town_adv'};
const mode=player=>{try{return String(player.getGameMode()).toLowerCase();}catch{return '';}};
const setMode=(player,m)=>{try{player.runCommand(`gamemode ${m} @s`);}catch(e){console.warn('[CoopTown] 町のルール: '+e);}};
const isHostile=e=>{try{return e.matches?.({families:['monster']})??false;}catch{return false;}};
/** Whether the town rules apply to a player here (in the town and not staff). */
export const ruled=player=>{try{return !isAdmin(player)&&inTown(player.dimension.id,player.location);}catch{return false;}};
export function installTownRules(){
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   const inside=ruled(player),tagged=player.hasTag(TOWN_RULES.advTag),m=mode(player);
   if(inside){
    if(m==='survival'){setMode(player,'adventure');try{player.addTag(TOWN_RULES.advTag);}catch{}}
    try{player.addEffect('weakness',TOWN_RULES.weaknessTicks,{amplifier:255,showParticles:false});}catch{}
   }else if(tagged){
    if(m==='adventure')setMode(player,'survival');
    try{player.removeTag(TOWN_RULES.advTag);player.removeEffect('weakness');}catch{}
   }
  }
 },TOWN_RULES.checkTicks);
 // no hostile mobs in the town
 world.afterEvents.entitySpawn.subscribe(({entity,cause})=>{
  if(cause==='Loaded'||!entity?.isValid||!isHostile(entity))return;
  try{if(inTown(entity.dimension.id,entity.location))entity.remove();}catch{}
 });
 // damage a ruled player still deals (a bow, a trident): given back
 world.afterEvents.entityHurt.subscribe(({hurtEntity,damage,damageSource})=>{
  const by=damageSource?.damagingEntity;if(by?.typeId!=='minecraft:player'||!(damage>0)||!ruled(by))return;
  try{const h=hurtEntity.getComponent('minecraft:health');if(h&&h.currentValue>0)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+damage));}catch{}
 });
}
