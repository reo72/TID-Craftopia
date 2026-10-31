import {world,system} from '@minecraft/server';
import {jobCount} from './job-count.js';
import {skillValue} from './skill-config.js';

// Hostile mobs differ one from another (asked 2026-10-30): each one that appears rolls a strength (MOB_TIERS by
// weight) and keeps it as lasting effects (more health, then strength / speed / resistance). The strength is kept on
// the mob (TIER_KEY) so the HP tag shows it (mob-hp.js tierLabel), and whoever defeats a stronger one gets coins.
// Bosses are left as they are.
export const TIER_KEY='cooptown:mob_tier';
// 冒険家 (2026-10-30: the job is exploring and fighting): coins x coins for a stronger mob, its coins as XP
export const ADVENTURER={job:'冒険家',coins:2};
export const MOB_TIERS=[
 {key:'normal',label:'',weight:70,effects:[],coins:0},
 {key:'strong',label:'強い',weight:20,effects:[['health_boost',0]],coins:5},
 {key:'elite',label:'精鋭',weight:8,effects:[['health_boost',2],['strength',0]],coins:15},
 {key:'boss',label:'強敵',weight:2,effects:[['health_boost',4],['strength',1],['speed',0],['resistance',0]],coins:50}];
const LONG=20000000; // ticks: as good as for ever
const BOSSES=new Set(['minecraft:ender_dragon','minecraft:wither','minecraft:warden','minecraft:elder_guardian']);
const isHostile=e=>{try{return e.matches?.({families:['monster']})??false;}catch{return false;}};
/** A strength by weight (random 0-1). */
export function rollTier(random=Math.random){
 let r=random()*MOB_TIERS.reduce((s,t)=>s+t.weight,0);
 for(const t of MOB_TIERS){r-=t.weight;if(r<0)return t;}
 return MOB_TIERS[0];
}
export const tierOf=e=>{try{return MOB_TIERS.find(t=>t.key===e.getDynamicProperty(TIER_KEY));}catch{return undefined;}};
/** The strength's name for the HP tag ('' for an ordinary one). */
export const tierLabel=e=>tierOf(e)?.label??'';
export function applyTier(e,t){
 try{e.setDynamicProperty(TIER_KEY,t.key);}catch{return;}
 for(const [id,amp] of t.effects)try{e.addEffect(id,LONG,{amplifier:amp,showParticles:false});}catch{}
 // the extra health starts full
 if(t.effects.some(([id])=>id==='health_boost'))system.runTimeout(()=>{try{const h=e.getComponent('minecraft:health');h?.setCurrentValue(h.effectiveMax);}catch{}},2);
}
export function installMobVariance({game}){
 world.afterEvents.entitySpawn.subscribe(({entity,cause})=>{
  if(cause==='Loaded'||!entity?.isValid||BOSSES.has(entity.typeId)||!isHostile(entity))return;
  try{if(entity.getDynamicProperty(TIER_KEY)!==undefined)return;}catch{return;}
  applyTier(entity,rollTier());
 });
 // a 冒険家 (main or second job) gets ADVENTURER.coins times the coins (x (1 + 狩りの心得)), skill XP, and the daily count
 world.afterEvents.entityDie.subscribe(({deadEntity,damageSource})=>{
  const t=tierOf(deadEntity),p=damageSource?.damagingEntity;if(!t?.coins||p?.typeId!=='minecraft:player')return;
  let pd;try{pd=game.peek(d=>d.players[p.id]);}catch{}
  const adv=[pd?.job,pd?.secondJob].includes(ADVENTURER.job),coins=Math.round(t.coins*(adv?ADVENTURER.coins*(1+skillValue(pd,ADVENTURER.job,'hunt')):1));
  if(adv)jobCount(p,'strong_kill');
  try{game.execute(p.id,'job.earn',{coins,skill:adv?'gather':undefined,xp:adv?t.coins:0,note:`${t.label}モブを倒した +${coins}コイン`});p.sendMessage(`§6【${t.label}】を倒した！ +${coins}コイン`+(adv?'§a（冒険家ボーナス）':''));}catch{}
 });
}
