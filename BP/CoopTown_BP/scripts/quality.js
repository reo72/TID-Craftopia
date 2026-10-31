import {EnchantmentType} from '@minecraft/server';

// Quality ranks (asked 2026-10-23, replacing 通常 / 良質 / 極上): every product (crops, animal products, fish, dishes,
// potions, the smith's gear) is rank D / C / B / A / S, index 0-4. A ranked item carries one lore line "品質：B" (so it
// does not stack with plain ones); no line = D. Lines written before the change still read: 良質 = B, 極上 / 名品 = A.
// The job's level (and dexterity, ingredients, minigames as bonus) raises the chance of the better ranks.
// price: what selling pays compared with D.
export const TIERS=[
 {key:'D',label:'D',color:'§7',price:1},
 {key:'C',label:'C',color:'§f',price:1.2},
 {key:'B',label:'B',color:'§a',price:1.5},
 {key:'A',label:'A',color:'§b',price:2},
 {key:'S',label:'S',color:'§6',price:3}];
export const TOP=TIERS.length-1;
const TAG='品質：';
/** "ランクB" (for messages). */
export const rankText=t=>`${TIERS[t]?.color??''}ランク${TIERS[t]?.label??'D'}`;
// values given per old tier [通常, 良質, 極上] (food tables, catalogue h / s) read for a rank: D=通常, B=良質,
// S=極上, C and A in between (rounded)
export const RANK_POS=[0,.5,1,1.5,2];
export function byRank(arr,t){
 if(!Array.isArray(arr)||!arr.length)return 0;
 const x=RANK_POS[Math.max(0,Math.min(TOP,t|0))],i=Math.min(arr.length-1,Math.floor(x)),j=Math.min(arr.length-1,i+1);
 return Math.round((arr[i]??0)+((arr[j]??0)-(arr[i]??0))*(x-i));
}
/** The rank index (0-4) of an item, from its lore. */
export function qualityOf(item){
 let lore=[];try{lore=item?.getLore?.()??[];}catch{}
 // the smith's gear writes its rank as "ランク：B" (gear-stats.js); fish use "ランク：レア" for rarity, not a letter
 const gear=lore.map(l=>/^ランク：([DCBAS])$/.exec(l.replace(/§./g,'')))
  .find(Boolean);if(gear)return TIERS.findIndex(t=>t.label===gear[1]);
 const line=lore.find(l=>l.includes(TAG));if(!line)return 0;
 const v=line.replace(/§./g,'').split(TAG)[1]?.trim()??'';
 const i=TIERS.findIndex(t=>t.label===v);if(i>=0)return i;
 return /極上|名品/.test(v)?3:/良質/.test(v)?2:0;
}
/** Rolls a rank: level = the job's skill level (1-100), bonus = extra chance (0-1: dexterity, ingredients, minigames). */
export function rollQuality(level,bonus=0,random=Math.random){
 const b=Math.max(0,bonus);
 const S=Math.min(.05,level*.0004+b*.06),A=Math.min(.14,level*.0015+b*.15),B=Math.min(.3,.04+level*.004+b*.3),C=Math.min(.4,.18+level*.004+b*.2);
 const r=random();return r<S?4:r<S+A?3:r<S+A+B?2:r<S+A+B+C?1:0;
}
/** Marks an item with a rank (returns the same item). gear: add the smith's bonuses (unbreaking from C up, and from A
 *  up sharpness / protection / efficiency). */
export function setQuality(item,tier,gear=false){
 if(!tier)return item;
 const t=TIERS[Math.min(TOP,tier)];
 let lore=[];try{lore=(item.getLore?.()??[]).filter(l=>!l.includes(TAG));}catch{}
 try{item.setLore([`${t.color}${TAG}${t.label}`,...lore]);}catch{}
 if(gear){
  const ench=item.getComponent?.('minecraft:enchantable');
  const add=(id,level)=>{if(!level)return;try{const v={type:new EnchantmentType(id),level};if(ench?.canAddEnchantment(v))ench.addEnchantment(v);}catch{}};
  add('unbreaking',[0,1,1,2,3][tier]);
  const id=String(item.typeId);add(/_(sword|axe)$/.test(id)?'sharpness':/_(helmet|chestplate|leggings|boots)$/.test(id)?'protection':'efficiency',[0,0,0,1,2][tier]);
 }
 return item;
}
/** The chance bonus good ingredients give a dish: their average rank (S = 1), at most 0.5. */
export const ingredientBonus=tiers=>tiers.length?Math.min(.5,tiers.reduce((s,t)=>s+t,0)/tiers.length/TOP*.5):0;
