import {world,system} from '@minecraft/server';
import {refresh,isExpired,stateOf,NEAR} from './freshness.js';
import {ensureInfo,setLoreNames,hasInfo} from './food-lore.js';
import {joinStacks} from './item-desc.js';
import {CATALOG_FOOD,FOOD,SHELF,mealOf,MEAL_STRESS_COOLDOWN,SOUP_HP} from './food-config.js';
import {qualityOf} from './quality.js';
import {pushText} from './hud-log.js';
import {potionById,effectAt,GROUPS,GLOBAL_COOLDOWN,SENSE_RANGE,EFFECT_NAMES,WARP} from './potion-config.js';
import {SPECIES} from './fish-runtime.js';
import {BUFFS_KEY,buffLeft} from './buffs.js';
import {titleTrack,titleSeen} from './job-count.js';

// Food and potions in use (Notion「食べ物・ポーション」):
// - dates: every few seconds the foods in each player's inventory get their date, and the label changes when one gets
//   near its date or expires (freshness.js). Expired food cannot be eaten.
// - eating: a meal recovers stress (food-config.js mealOf), the better qualities add hunger and one meal effect at a
//   time (a new meal effect replaces the old one; the chat says so).
// - the alchemist's potions (potion-config.js): drinking checks the cooldowns (5 s for all, plus each group's) and
//   that the potion would do something; then it applies its effect and starts the cooldowns. Cooldowns are kept in
//   the player's dynamic properties, so they survive logging out and dying.
const COOL_KEY='cooptown:potion_cd',MEAL_KEY='cooptown:meal';
const read=(p,k)=>{try{const v=JSON.parse(p.getDynamicProperty(k)??'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
const write=(p,k,v)=>{try{p.setDynamicProperty(k,JSON.stringify(v));}catch{}};
/** Why a potion cannot be drunk now (text), or '' when it can. cool: the cooldown record; state: {hp, maxHp, stress,
 *  poisoned, hunger}. */
export function blockReason(p,cool,state,now=Date.now()){
 const wait=k=>Math.max(0,Math.ceil(((cool[k]??0)-now)/1000));
 if(wait('global'))return `少し待ってください（あと${wait('global')}秒）`;
 for(const g of p.groups)if(wait(g))return `${GROUPS[g].label}の薬はあと${wait(g)}秒使えません`;
 const e=p.effect,useful=(e.stress&&state.stress>0)||(e.heal&&state.hp<state.maxHp)||(e.cure&&state.poisoned)||(e.hunger&&(state.hunger??0)<20)||e.guard||e.focus||e.fish||e.sense||e.dex||e.effects||e.warp;
 if(!useful)return e.heal?'HPは満タンです':e.cure?'毒にかかっていません':e.hunger?'おなかがいっぱいです':'ストレスはありません';
 return '';
}
/** Set by installFood: eats / drinks an item held in the off hand (see below). */
export let offhandEat=null;
export function installFood({game,itemName}){
 if(itemName)setLoreNames(itemName);
 const stressOf=player=>{try{return game.peek(d=>d.players[player.id]?.stress??0);}catch{return 0;}};
 const hungerOf=player=>{try{return player.getComponent('minecraft:player.hunger').currentValue;}catch{return 0;}};
 const tell=(player,text)=>system.run(()=>{try{player.sendMessage(text);}catch{}});
 // what a meal or a potion did goes to the log on the right (hud-log.js), one line each
 const hud=(player,lines)=>system.run(()=>{lines.forEach((t,i)=>{try{pushText(player,'meal'+i,t);}catch{}});});
 // dates: the inventories, and the food / crop lore, every second
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){
   const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)continue;
   const changed=[];
   for(let i=0;i<inv.size;i++){const s=inv.getItem(i);if(!s||!(SHELF[s.typeId]||hasInfo(s.typeId)))continue;try{const a=refresh(s,now),b=ensureInfo(s);if(a||b){inv.setItem(i,s);changed.push(i);}}catch{}}
   joinStacks(inv,changed); // a crop / food picked up joins its stack once it has its lore
  }
 },20);
 world.beforeEvents.itemUse?.subscribe(event=>{
  const {itemStack:item,source:player}=event;if(!item||player?.typeId!=='minecraft:player')return;
  if(SHELF[item.typeId]&&isExpired(item)){event.cancel=true;tell(player,'§c期限切れの食べ物は食べられません。コンポスターなどで処分してください。');return;}
  const p=potionById[item.typeId];if(!p)return;
  let hp=20,maxHp=20,poisoned=false;try{const h=player.getComponent('minecraft:health');hp=h.currentValue;maxHp=h.effectiveMax;}catch{}
  try{poisoned=!!player.getEffect('poison');}catch{}
  const why=blockReason(p,read(player,COOL_KEY),{hp,maxHp,stress:stressOf(player),poisoned,hunger:hungerOf(player)});
  if(why){event.cancel=true;tell(player,'§e'+why);}
 });
 world.afterEvents.itemCompleteUse?.subscribe(({itemStack:item,source:player})=>{
  if(!item||player?.typeId!=='minecraft:player')return;
  const p=potionById[item.typeId];if(p){drink(player,p,qualityOf(item),item);return;}
  const meal=mealOf(item.typeId,qualityOf(item));if(meal)eat(player,item,meal);
 });
 // eating / drinking from the off hand (offhand.js): the same checks and effects as using the item, plus the item's own
 // hunger (its food component). Returns a message when it cannot be used, or {convert} (what is left, e.g. a bottle).
 offhandEat=(player,item)=>{
  const food=item.getComponent?.('minecraft:food'),p=potionById[item.typeId];
  if(!food&&!p)return 'オフハンドの物は食べられません。';
  if(SHELF[item.typeId]&&isExpired(item))return '§c期限切れの食べ物は食べられません。';
  if(p){
   let hp=20,maxHp=20,poisoned=false;try{const h=player.getComponent('minecraft:health');hp=h.currentValue;maxHp=h.effectiveMax;}catch{}
   try{poisoned=!!player.getEffect('poison');}catch{}
   const why=blockReason(p,read(player,COOL_KEY),{hp,maxHp,stress:stressOf(player),poisoned,hunger:hungerOf(player)});if(why)return '§e'+why;
  }
  if(food&&!food.canAlwaysEat){let full=false;try{full=player.getComponent('minecraft:player.hunger').currentValue>=20;}catch{}if(full)return 'おなかがいっぱいです。';}
  if(food?.nutrition>0)try{player.addEffect('saturation',1,{amplifier:food.nutrition-1,showParticles:false});}catch{}
  if(p)drink(player,p,qualityOf(item),item);else{const meal=mealOf(item.typeId,qualityOf(item));if(meal)eat(player,item,meal);}
  return {convert:food?.usingConvertsTo??(p?'minecraft:glass_bottle':undefined)};
 };
 // the soup effect: HP 1 at 10 s and 1 at 20 s, only if the player has not fought in the last 10 s; fighting ends it
 function soupHp(player){
  const id=player.id,start=Date.now(),steps=SOUP_HP.total;
  for(let k=1;k<=steps;k++)system.runTimeout(()=>{
   if(!player.isValid)return;const meal=read(player,MEAL_KEY);if(meal.key!=='soup_hp')return;
   const fought=lastCombat.get(id)??0;if(fought>start-SOUP_HP.combatMs&&fought>start){write(player,MEAL_KEY,{});return;}
   if(Date.now()-fought<SOUP_HP.combatMs)return;
   try{const h=player.getComponent('minecraft:health');if(h.currentValue>0)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+1));}catch{}
  },Math.round(SOUP_HP.seconds/steps*k*20));
 }
 function eat(player,item,meal){
  if(Date.now()-(lastCombat.get(player.id)??0)<SOUP_HP.combatMs)titleTrack(player,'heal_in_combat'); // titles
  const notes=[];
  if(meal.hunger)try{player.addEffect('saturation',1,{amplifier:meal.hunger-1,showParticles:false});}catch{}
  const e=meal.effect;
  if(e){
   const old=read(player,MEAL_KEY),now=Date.now();
   if(old.key&&old.until>now&&old.key!==e.key)notes.push(`§7食事効果「${old.label}」を「${e.label}」に置き換えました`);
   write(player,MEAL_KEY,{key:e.key,label:e.label,until:now+e.seconds*1000});
   if(e.key==='regen')try{player.addEffect('regeneration',e.seconds*20,{amplifier:0,showParticles:false});}catch{}
   if(e.key==='speed')try{player.addEffect('speed',e.seconds*20,{amplifier:0,showParticles:false});}catch{}
   if(e.key==='soup_hp')soupHp(player);
  }
  // stress recovery from food and drink shares one cooldown (the catalogue's 30 s); hunger is restored anyway
  const ready=read(player,MEAL_KEY+'_s').until??0,nowMs=Date.now();
  if(meal.stress&&ready>nowMs){notes.push(`§7ストレス回復はあと${Math.ceil((ready-nowMs)/1000)}秒後に使えます`);meal={...meal,stress:0};}
  else if(meal.stress)write(player,MEAL_KEY+'_s',{until:nowMs+MEAL_STRESS_COOLDOWN*1000});
  if(meal.stress||e?.key==='guard'){try{const m=game.execute(player.id,'stress.relieve',{amount:meal.stress,...(e?.key==='guard'?{guard:{pct:e.pct,seconds:e.seconds}}:{})});if(m)notes.push('§a'+m);}catch{}}
  if(stateOf(item)===NEAR)notes.push('§7（期限間近の食べ物でした）');
  if(notes.length)hud(player,notes);
 }
 function drink(player,p,tier,item){
  // titles: a potion the drinker made (its maker line), healing while fighting
  try{if((item?.getLore?.()??[]).some(l=>l.replace(/§./g,'')==='作成者：'+player.name))titleTrack(player,'drink_own');}catch{}
  if(Date.now()-(lastCombat.get(player.id)??0)<SOUP_HP.combatMs)titleTrack(player,'heal_in_combat');
  const now=Date.now(),e=effectAt(p,tier),cool=read(player,COOL_KEY);
  cool.global=now+GLOBAL_COOLDOWN*1000;for(const g of p.groups)cool[g]=now+GROUPS[g].seconds*1000;write(player,COOL_KEY,cool);
  const notes=[];
  if(e.stress||e.guard){try{const m=game.execute(player.id,'stress.relieve',{amount:e.stress??0,...(e.guard?{guard:e.guard}:{})});if(m)notes.push(m);}catch{}}
  if(e.heal)try{const h=player.getComponent('minecraft:health');h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+e.heal));notes.push(`HP +${e.heal}`);}catch{}
  if(e.cure)try{player.removeEffect(e.cure);notes.push('毒が消えました');}catch{}
  const buffs=read(player,BUFFS_KEY);
  for(const [k,label] of [['focus','集中'],['fish','魚影調査'],['sense','気配察知'],['dex','器用さ+20']])if(e[k]){buffs[k]=Math.max(buffs[k]??0,now+e[k]*1000);notes.push(`${label} ${e[k]}秒`);}
  write(player,BUFFS_KEY,buffs);
  for(const [id,sec,amp] of e.effects??[])try{player.addEffect(id,sec*20,{amplifier:amp});notes.push(`${EFFECT_NAMES[id]??id} ${sec}秒`);}catch{}
  if(e.hunger)try{player.addEffect('saturation',1,{amplifier:e.hunger-1,showParticles:false});notes.push(`満腹度 +${e.hunger}`);}catch{}
  if(e.warp){warpHome(player);notes.push(`${WARP.waitSeconds}秒じっとしていてください`);}
  if(e.fish)notes.push(fishHint(player));
  hud(player,[`§b${p.name}`,...notes]);
 }
 // 帰還の薬: after WARP.waitSeconds standing still (moving more than WARP.moveLimit or changing dimension calls it
 // off), to the player's spawn point (their bed), else the world's spawn (its top block)
 function warpHome(player){
  const from={...player.location},dim=player.dimension.id;
  for(let k=1;k<WARP.waitSeconds;k++)system.runTimeout(()=>{try{if(player.isValid)player.dimension.spawnParticle('minecraft:portal_reverse_particle',player.location);}catch{}},k*20);
  system.runTimeout(()=>{
   if(!player.isValid)return;
   const at=player.location,moved=Math.hypot(at.x-from.x,at.y-from.y,at.z-from.z);
   if(player.dimension.id!==dim||moved>WARP.moveLimit){try{player.sendMessage('§e動いたので帰還を中止しました。');}catch{}return;}
   let to,toDim;
   try{const sp=player.getSpawnPoint?.();if(sp){to={x:sp.x+.5,y:sp.y,z:sp.z+.5};toDim=sp.dimension;}}catch{}
   if(!to)try{const w=world.getDefaultSpawnLocation(),ov=world.getDimension('overworld');let y=w.y;
    if(y>1000)y=(ov.getTopmostBlock?.({x:w.x,z:w.z})?.location.y??100)+1;to={x:w.x+.5,y,z:w.z+.5};toDim=ov;}catch{}
   if(!to){try{player.sendMessage('§e戻る場所が見つかりませんでした。');}catch{}return;}
   try{player.teleport(to,{dimension:toDim});player.playSound('mob.endermen.portal',{pitch:1.2,volume:.6});player.sendMessage('§aリスポーン地点に戻りました。');}catch(e){try{player.sendMessage('§e帰還できませんでした：'+e);}catch{}}
  },WARP.waitSeconds*20);
 }
 // 魚影調査: the species this water can give now; ones not caught yet stay ？？？ (the log is not filled in)
 function fishHint(player){
  let biome='';try{biome=player.dimension.getBiome(player.location)?.id??'';}catch{}
  const t=world.getTimeOfDay(),night=t>=13000&&t<23000,caught=new Set(Object.keys(read(player,'cooptown:fishlog').caught??{}));
  const here=SPECIES.filter(s=>s.where.test(biome)&&(!s.time||(s.time==='night')===night));
  return here.length?'\n§7この釣り場：'+here.map(s=>caught.has(s.name)?s.name:'？？？').join('・'):'\n§7この釣り場では魚の気配がない';
 }
 // 気配察知: a warning when a monster comes within SENSE_RANGE (at most every 5 seconds), never its position
 const warned=new Map(),lastCombat=new Map();
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){
   if(!buffLeft(player,'sense',now)||(warned.get(player.id)??0)>now)continue;
   let n=0;try{n=player.dimension.getEntities({location:player.location,maxDistance:SENSE_RANGE,families:['monster']}).length;}catch{}
   if(n){warned.set(player.id,now+5000);try{player.sendMessage('§c[気配察知] 近くに敵の気配がします');player.playSound('note.bass',{pitch:.6});}catch{}}
  }
 },20);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{warned.delete(playerId);lastCombat.delete(playerId);});
 // fighting (dealing or taking damage) for the soup effect
 world.afterEvents.entityHurt?.subscribe(({hurtEntity,damageSource})=>{const a=damageSource?.damagingEntity,now=Date.now();
  if(hurtEntity?.typeId==='minecraft:player')lastCombat.set(hurtEntity.id,now);if(a?.typeId==='minecraft:player')lastCombat.set(a.id,now);});
}
