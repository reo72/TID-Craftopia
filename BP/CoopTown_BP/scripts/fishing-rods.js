import {EnchantmentType} from '@minecraft/server';

// The better fishing rods (asked 2026-10-30): the game has no custom fishing item, so each one is a vanilla fishing
// rod with its own name, lore, the vanilla enchantments 入れ食い (lure) / 宝釣り (luck of the sea) and a mark
// (ROD_KEY). The mark makes the reeling minigame easier (ease, added like dexterity's) and rare fish likelier (rare).
// Made by 釣り師 on the workbench's 職業 tab (workbench-config.js ROD_RECIPES, from a plain rod); anyone can use one.
export const ROD_KEY='cooptown:rod_tier';
export const ROD_TIERS={
 mid:{name:'中級者の釣り竿',color:'§b',level:10,lure:1,luck:1,ease:.15,rare:1},
 high:{name:'上級者の釣り竿',color:'§d',level:25,lure:2,luck:2,ease:.3,rare:1.2},
 master:{name:'名人の釣り竿',color:'§6',level:45,lure:3,luck:3,ease:.45,rare:1.5}};
const ROMAN=['','Ⅰ','Ⅱ','Ⅲ'];
/** The tier key of a rod stack, or undefined (a plain rod or not a rod). */
export function rodTier(stack){
 if(stack?.typeId!=='minecraft:fishing_rod')return;
 try{const k=stack.getDynamicProperty(ROD_KEY);return ROD_TIERS[k]?k:undefined;}catch{return;}
}
/** The lore lines of a tier. */
export function rodLore(t){
 return [`§7入れ食い${ROMAN[t.lure]}・宝釣り${ROMAN[t.luck]}`,`§bミニゲームが簡単（+${Math.round(t.ease*100)}%）`,
  ...(t.rare>1?[`§a珍しい魚の確率×${t.rare}`]:[]),`§8釣り師・職業Lv.${t.level}で作れる`];
}
/** Turns a fishing rod stack into a tier rod (returns the stack). */
export function makeRod(stack,key){
 const t=ROD_TIERS[key];if(!t)return stack;
 try{stack.nameTag=t.color+t.name;}catch{}
 try{stack.setLore(rodLore(t));}catch{}
 try{stack.setDynamicProperty(ROD_KEY,key);}catch{}
 const c=stack.getComponent?.('minecraft:enchantable');
 for(const [id,level] of [['lure',t.lure],['luck_of_the_sea',t.luck]])try{c?.addEnchantment({type:new EnchantmentType(id),level});}catch{}
 return stack;
}
/** After a rod recipe: turns count plain new rods in the player's items into that tier. */
export function upgradeNewRods(player,key,count,isPlain){
 const c=player.getComponent('minecraft:inventory')?.container;let left=count;
 for(let i=0;c&&i<c.size&&left>0;i++){
  const s=c.getItem(i);if(s?.typeId!=='minecraft:fishing_rod'||rodTier(s)||!isPlain(s))continue;
  let damaged=false;try{damaged=(s.getComponent('minecraft:durability')?.damage??0)>0;}catch{}if(damaged)continue;
  c.setItem(i,makeRod(s,key));left--;
 }
}
/** The rod the player holds: its tier's {ease, rare}, or none. */
export function heldRod(player){
 let s;try{s=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);}catch{}
 const k=rodTier(s);return k?ROD_TIERS[k]:{ease:0,rare:1};
}
