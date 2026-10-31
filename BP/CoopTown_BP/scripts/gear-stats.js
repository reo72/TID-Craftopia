import {TIERS} from './quality.js';

// Gear numbers (asked 2026-10-23): Bedrock fixes armour points, attack damage and durability per item kind, so the
// smith's gear carries its own numbers in its lore and scripts apply them (installGearStats):
//  ＋防具 N   (armour)  the wearer's damage taken is reduced by ARMOR_PCT per point of all worn pieces (healed back
//                      right after the hit), at most ARMOR_CAP
//  ＋攻撃 N   (swords / axes)  that much extra damage to what the holder hits
//  ＋耐久 N%  (all gear) chance that a use does not wear the item (its durability is given back)
// The numbers are rolled when the gear is made at the anvil (anvil-runtime.js): the material and the quality rank set
// the range (rank D = the bottom part, S = the top), the forging minigame's score and 器用さ push the roll up.
// The lore is laid out like the food's (food-lore.js): line / explanation / line / numbers, rank / line / maker.
export const GEAR={ARMOR_PCT:.005,ARMOR_CAP:.3};
const MARK='§r§r';
const MAT={leather:['革',4,.5],chainmail:['チェーン',6,1],golden:['金',6,1.5],iron:['鉄',9,2],diamond:['ダイヤ',12,3],netherite:['ネザライト',14,4],
 wooden:['木',3,1],stone:['石',5,1.5]};
const PIECE={helmet:['ヘルメット',.6],chestplate:['鎧',1],leggings:['レギンス',.85],boots:['ブーツ',.5]};
const TOOL={sword:'剣',axe:'斧',pickaxe:'ツルハシ',shovel:'シャベル',hoe:'クワ'};
// share of the material's top value at each rank (D-S): [low, high]
const RANK_RANGE=[[.25,.4],[.35,.5],[.5,.65],[.65,.82],[.82,1]];
const DUR_RANGE=[[3,6],[5,10],[8,15],[12,22],[18,30]];
/** {kind:'armor'|'weapon'|'tool', mat, part, matName, partName} for a vanilla gear id, or undefined. */
export function gearKind(typeId){
 const m=/^minecraft:(\w+?)_(helmet|chestplate|leggings|boots|sword|axe|pickaxe|shovel|hoe)$/.exec(typeId??'');if(!m||!MAT[m[1]])return undefined;
 const [ ,mat,part]=m;
 return {kind:PIECE[part]?'armor':part==='sword'||part==='axe'?'weapon':'tool',mat,part,matName:MAT[mat][0],partName:PIECE[part]?.[0]??TOOL[part]};
}
/** The explanation line of a gear kind. */
export function describeGear(g){
 return g.kind==='armor'?`${g.matName}の${g.partName}で身を守れそうだ`:g.kind==='weapon'?`${g.matName}の${g.partName}でしっかり戦えそうだ`:`${g.matName}の${g.partName}で作業がはかどりそうだ`;
}
const lerp=(r,p)=>r[0]+(r[1]-r[0])*Math.max(0,Math.min(1,p));
/** Rolls the numbers: tier = rank 0-4, score = minigame 0-1, dex = dexterity (10-120). */
export function rollGearStats(typeId,tier,{score=0,dex=10,random=Math.random}={}){
 const g=gearKind(typeId);if(!g)return undefined;
 const t=Math.max(0,Math.min(4,tier|0)),p=.5*random()+.3*score+.2*Math.min(1,Math.max(0,(dex-10)/90));
 const out={};
 if(g.kind==='armor')out.armor=Math.max(1,Math.round(MAT[g.mat][1]*PIECE[g.part][1]*lerp(RANK_RANGE[t],p)*1.6));
 if(g.kind==='weapon')out.attack=Math.max(.5,Math.round(MAT[g.mat][2]*lerp(RANK_RANGE[t],p)*1.5*2)/2);
 out.durability=Math.round(lerp(DUR_RANGE[t],p));
 return out;
}
// the separator is as wide as the widest line (full-width 1, half-width ½), as in food-lore.js
const widthOf=t=>[...String(t).replace(/§./g,'')].reduce((w,ch)=>w+(ch.charCodeAt(0)<0x100||(ch>='ｦ'&&ch<='ﾟ')?.5:1),0);
/** The lore for made gear: the numbers and the rank as given, the maker last. */
export function gearLore(typeId,stats,tier,maker){
 const g=gearKind(typeId);if(!g)return [];
 const T=TIERS[Math.max(0,Math.min(4,tier|0))],m=l=>MARK+l;
 const nums=[...(stats.armor?[`§b＋防具 ${stats.armor}`]:[]),...(stats.attack?[`§c＋攻撃 ${stats.attack}`]:[]),`§a＋耐久 ${stats.durability}%`];
 const body=['§7'+describeGear(g),...nums,`${T.color}ランク：${T.label}`,...(maker?['§8作成者：'+String(maker).slice(0,20)]:[])];
 const SEP='§8'+'ー'.repeat(Math.max(6,Math.ceil(Math.max(...body.map(widthOf)))));
 return [m(SEP),m(body[0]),m(SEP),...nums.map(m),m(body[nums.length+1]),...(maker?[m(SEP),m(body.at(-1))]:[])];
}
/** The numbers written on an item ({armor, attack, durability}; zeros when none). Cached by lore text. */
const cache=new Map();
export function statsOf(item){
 let lore=[];try{lore=item?.getLore?.()??[];}catch{}
 const key=lore.join('\n');if(!key)return {armor:0,attack:0,durability:0};
 let v=cache.get(key);if(v)return v;
 const num=re=>{const l=lore.find(x=>re.test(x.replace(/§./g,'')));return l?Number(re.exec(l.replace(/§./g,''))[1]):0;};
 v={armor:num(/＋防具 (\d+(?:\.\d+)?)/),attack:num(/＋攻撃 (\d+(?:\.\d+)?)/),durability:num(/＋耐久 (\d+)%/)};
 if(cache.size>500)cache.clear();cache.set(key,v);return v;
}
/** Damage share taken off for a total of armour points. */
export const armorReduction=total=>Math.min(GEAR.ARMOR_CAP,total*GEAR.ARMOR_PCT);

/** Runtime: the numbers take effect. */
export function installGearStats({world,system}){
 const slots=['Head','Chest','Legs','Feet'];
 const equip=p=>{try{return p.getComponent('minecraft:equippable');}catch{return undefined;}};
 // a use that wore the item may be given back: durability damage - 1 (needs the item put back in its slot)
 const keep=(holder,slot,chance)=>{
  if(!(chance>0)||Math.random()*100>=chance)return;
  system.run(()=>{try{const eq=equip(holder),s=eq?.getEquipment(slot),d=s?.getComponent('minecraft:durability');if(d&&d.damage>0){d.damage--;eq.setEquipment(slot,s);}}catch{}});
 };
 world.afterEvents.entityHurt.subscribe(({hurtEntity,damage,damageSource})=>{
  try{
   // the wearer: armour points cut the damage (healed back), and each worn piece may keep its durability
   if(hurtEntity?.typeId==='minecraft:player'&&damage>0){
    const eq=equip(hurtEntity);let total=0;
    for(const slot of slots){const s=eq?.getEquipment(slot);if(!s)continue;const st=statsOf(s);total+=st.armor;keep(hurtEntity,slot,st.durability);}
    const cut=damage*armorReduction(total);
    if(cut>0){const h=hurtEntity.getComponent('minecraft:health');if(h&&h.currentValue>0)h.setCurrentValue(Math.min(h.effectiveMax,h.currentValue+cut));}
   }
   // the attacker's weapon: extra damage and maybe kept durability
   const att=damageSource?.damagingEntity;
   // only melee hits (cause entityAttack); the extra damage itself is dealt as magic, so it is not boosted again
   if(att?.typeId==='minecraft:player'&&damageSource.cause==='entityAttack'){
    const s=equip(att)?.getEquipment('Mainhand');if(!s)return;const st=statsOf(s);
    keep(att,'Mainhand',st.durability);
    if(st.attack>0&&hurtEntity.isValid)system.run(()=>{try{if(hurtEntity.isValid)hurtEntity.applyDamage(st.attack,{cause:'magic',damagingEntity:att});}catch{}});
   }
  }catch{}
 });
 // tools: a block broken may keep the tool's durability
 world.afterEvents.playerBreakBlock.subscribe(({player,itemStackAfterBreak})=>{
  if(!itemStackAfterBreak)return;const st=statsOf(itemStackAfterBreak);keep(player,'Mainhand',st.durability);
 });
}
