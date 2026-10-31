import {world,system} from '@minecraft/server';
import {tierLabel} from './mob-variance.js';
import {CODEX} from './game-config.js';

// HP above mobs: a mob that takes damage shows its HP over its head for SHOW_MS ("HP 12 / 20" and a bar of ten
// marks), then its own name (or nothing) comes back. It is done with the name tag, which the game shows over a mob.
// A named mob does not despawn, so the HP tag is always removed again: mobs showing it carry the tag TAG, and any
// left over (the area unloaded before the timer) are cleaned when seen again. Players are left alone.
export const SHOW_MS=5000,TAG='ct_hp';
// The game's death message names the mob by its name tag ("…はHP 12 / 20 ||||にやられた", 2026-10-30). There is no
// event before a death, so: a mob that hurts a player gets its own name back and shows no HP for QUIET_MS, and no HP
// shows on a mob near (LOW_NEAR blocks) a player at LOW_SHARE of their health or less.
export const QUIET_MS=10000,LOW_SHARE=.4,LOW_NEAR=8;
const NAME_KEY='cooptown:own_name';
// the keeper's box, the warehouse vault and the おんぶ seat are not mobs (the box's name is its chest screen's title)
const SKIP=new Set(['minecraft:player','minecraft:armor_stand','minecraft:item','minecraft:xp_orb','minecraft:arrow','minecraft:painting','cooptown:villager','cooptown:deposit_box','cooptown:pack_box','cooptown:warehouse_vault','cooptown:onbu_seat']);
/** The HP text (2026-10-30, asked: "ゾンビ / ❤15/20"): the name line, then a red heart and the HP, green / yellow / red
 *  by the share left. */
export function hpText(hp,max,name=''){
 const share=max>0?Math.max(0,Math.min(1,hp/max)):0,col=share>.5?'§a':share>.25?'§e':'§c';
 return `${name?name+'\n':''}§c❤${col}${Math.ceil(hp)}§7/${Math.ceil(max)}`;
}
// the mob's name: its own name tag, else its Japanese name (the codex's, game-config.js CODEX)
const JP=Object.fromEntries(CODEX.map(([id,name])=>[id,name]));
export const mobName=typeId=>JP[typeId]??String(typeId).replace(/^\w+:/,'');
// the line above the HP: the mob's own name, or its strength (mob-variance.js: 【強い】【精鋭】【強敵】)
const headOf=(e,own)=>{if(typeof own==='string'&&own)return own;const l=tierLabel(e);return (l?`§6【${l}】§f`:'§f')+mobName(e.typeId);};
export function installMobHp(){
 const shown=new Map(); // entity id -> {entity, until}
 const restore=e=>{try{const own=e.getDynamicProperty(NAME_KEY);e.nameTag=typeof own==='string'?own:'';e.setDynamicProperty(NAME_KEY,undefined);e.removeTag(TAG);}catch{}};
 const quiet=new Map(); // mob id -> no HP tag until (ms)
 const nearLowPlayer=e=>{try{return e.dimension.getPlayers({location:e.location,maxDistance:LOW_NEAR}).some(p=>{const h=p.getComponent('minecraft:health');return h&&h.currentValue<=h.effectiveMax*LOW_SHARE;});}catch{return false;}};
 const show=e=>{
  if(!e?.isValid||SKIP.has(e.typeId))return;
  if(Date.now()<(quiet.get(e.id)??0)||nearLowPlayer(e)){if(e.hasTag?.(TAG)){shown.delete(e.id);restore(e);}return;}
  const h=e.getComponent('minecraft:health');if(!h)return;
  if(!e.hasTag(TAG)){try{e.setDynamicProperty(NAME_KEY,e.nameTag??'');e.addTag(TAG);}catch{return;}}
  const own=e.getDynamicProperty(NAME_KEY);
  if(h.currentValue<=0){shown.delete(e.id);restore(e);return;}
  try{e.nameTag=hpText(h.currentValue,h.effectiveMax,headOf(e,own));}catch{}
  shown.set(e.id,{entity:e,until:Date.now()+SHOW_MS});
 };
 world.afterEvents.entityHurt.subscribe(({hurtEntity,damageSource})=>{
  // a mob hurting a player: its own name again, for a while
  const by=damageSource?.damagingEntity;
  if(hurtEntity?.typeId==='minecraft:player'&&by&&!SKIP.has(by.typeId)){quiet.set(by.id,Date.now()+QUIET_MS);if(by.hasTag?.(TAG)){shown.delete(by.id);restore(by);}return;}
  show(hurtEntity);
 });
 // healing (regeneration, a potion) while the tag shows keeps it up to date; then it goes away
 system.runInterval(()=>{
  const now=Date.now();
  for(const [id,s] of shown){
   if(!s.entity.isValid){shown.delete(id);continue;}
   if(now>=s.until||nearLowPlayer(s.entity)){shown.delete(id);restore(s.entity);continue;}
   const h=s.entity.getComponent('minecraft:health');const own=s.entity.getDynamicProperty(NAME_KEY);
   if(h)try{s.entity.nameTag=hpText(h.currentValue,h.effectiveMax,headOf(s.entity,own));}catch{}
  }
 },10);
 system.runInterval(()=>{const now=Date.now();for(const [id,t] of quiet)if(now>=t)quiet.delete(id);},200);
 // HP tags left over from before (unloaded areas, a restart)
 const clean=e=>{if(e.hasTag?.(TAG)&&!shown.has(e.id))restore(e);};
 world.afterEvents.entityLoad?.subscribe(({entity})=>clean(entity));
 system.runInterval(()=>{for(const d of ['overworld','nether','the_end'])try{for(const e of world.getDimension(d).getEntities({tags:[TAG]}))clean(e);}catch{}},200);
}
