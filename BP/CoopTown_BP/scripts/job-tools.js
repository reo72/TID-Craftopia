import {world,system,ItemStack} from '@minecraft/server';
import {TOOLS,BRUSH,HAMMER,WHETSTONE,KNIFE,HERB,PIN,LANTERN,PLANTER,PEN,repairMaterial,repairAmount,bearing,arrowTo,turnWord} from './job-tools-config.js';
import {pushText} from './hud-log.js';
import {openBackpack,packOf} from './backpack-runtime.js';
import {brushCare} from './ranch-runtime.js';
import {offhandEat} from './food-runtime.js';
import {woodOf} from './bulk-harvest.js';
import {stock,take} from './cook-runtime.js';
import {chooseDialog,noticeDialog} from './dialog.js';
import {readBuffs,BUFFS_KEY,buffLeft} from './buffs.js';
import {titleTrack,jobCount} from './job-count.js';
import {ITEM_NAMES} from './game-config.js';
import {skillValue} from './skill-config.js';

// Each job's own tools (job-tools-config.js). Using one plays its arm animation (RP animations/cooptown_tools:
// animation.cooptown.tool.<anim>), a sound and particles, then does its work. Passive ones (bait, knife, herb knife,
// rune pen, lantern, planting bag) work from the hand, the off hand or the inventory. Tools wear one durability per use.
let ctx;
const lastNote=new Map(),lastUse=new Map(),hammerAt=new Map();
const note=(player,text)=>{const now=Date.now();if(now-(lastNote.get(player.id)??0)<1500)return;lastNote.set(player.id,now);try{player.sendMessage(text);}catch{}};
const peek=player=>{try{return ctx.game.peek(d=>d.players[player.id]);}catch{return undefined;}};
const hasJob=(p,job)=>!!p&&(p.job===job||p.secondJob===job);
/** The player's record when they may use the tool (job and level), else undefined (with a note when `say`). */
function allowed(player,id,say=true){
 const t=TOOLS[id],p=peek(player);
 if(!hasJob(p,t.job)){if(say)note(player,`§e${t.name}は${t.job}専用です。`);return;}
 if((p.level??1)<t.level){if(say)note(player,`§e${t.name}は職業Lv.${t.level}から使えます。`);return;}
 return p;
}
const earn=(player,skill,xp,what)=>{try{ctx.game.execute(player.id,'job.earn',{skill,xp,note:what});}catch{}};
// ---- the use effects ----
/** The arm animation, a sound and particles at a point (or in front of the player). */
function fx(player,{anim,sound,pitch=1,volume=.7,particle,at,count=1}){
 if(anim)try{player.playAnimation('animation.cooptown.tool.'+anim,{blendOutTime:.15,controller:'cooptown_tool'});}catch{}
 if(sound)try{player.dimension.playSound(sound,player.location,{pitch,volume});}catch{}
 if(particle){
  const v=player.getViewDirection(),h=player.getHeadLocation(),p=at??{x:h.x+v.x*.8,y:h.y+v.y*.8-.3,z:h.z+v.z*.8};
  for(let i=0;i<count;i++)try{player.dimension.spawnParticle(particle,{x:p.x+(Math.random()-.5)*.6,y:p.y+(Math.random()-.5)*.4,z:p.z+(Math.random()-.5)*.6});}catch{}
 }
}
/** One durability off the held tool (selected slot); it breaks at the end. */
function wear(player,id,n=1){
 try{const c=player.getComponent('minecraft:inventory').container,slot=player.selectedSlotIndex,s=c.getItem(slot);if(s?.typeId!==id)return;
  const d=s.getComponent('minecraft:durability');if(!d)return;
  if(d.damage+n>=d.maxDurability){c.setItem(slot,undefined);player.dimension.playSound('random.break',player.location);titleTrack(player,'tools_broken');return;}
  d.damage+=n;c.setItem(slot,s);}catch{}
}
const heldId=player=>{try{return player.getComponent('minecraft:inventory').container.getItem(player.selectedSlotIndex)?.typeId;}catch{return undefined;}};
const offId=player=>{try{return player.getComponent('minecraft:equippable').getEquipment('Offhand')?.typeId;}catch{return undefined;}};
const findInInventory=(player,id)=>{try{const c=player.getComponent('minecraft:inventory').container;for(let i=0;i<c.size;i++){const s=c.getItem(i);if(s?.typeId===id)return {c,i,s};}}catch{}return undefined;};
const looked=(player,dist=5,filter=()=>true)=>{try{return player.getEntitiesFromViewDirection({maxDistance:dist}).map(h=>h.entity).find(e=>e?.isValid&&e.id!==player.id&&filter(e));}catch{return undefined;}};
const nameOf=s=>s?.nameTag||ITEM_NAMES[s?.typeId]||String(s?.typeId??'').replace(/^\w+:/,'');

// ---- 飼育ブラシ ----
function brush(player,id,target){
 const t=TOOLS[id];if(!allowed(player,id))return;
 if(!brushCare){note(player,'§e牧場の準備ができていません。');return;}
 let list;
 if(t.area){try{list=player.dimension.getEntities({location:player.location,maxDistance:t.area});}catch{list=[];}}
 else{target??=looked(player,4,e=>!e.typeId.startsWith('cooptown:')&&e.typeId!=='minecraft:item'&&e.typeId!=='minecraft:player');if(!target){note(player,'§7世話したい動物を見て使ってください。');return;}list=[target];}
 const r=brushCare(player,list);
 const where=e=>({x:e.location.x,y:e.location.y+.9,z:e.location.z});
 fx(player,{anim:'brush',sound:'mob.sheep.shear',pitch:1.6,volume:.4});
 for(const e of list)try{player.dimension.spawnParticle('minecraft:villager_happy',where(e));}catch{}
 if(!r.mine){note(player,'§e自分の登録した動物ではありません（飼育台で登録できます）。');return;}
 if(!r.cared){note(player,`§7まだ毛並みはきれいです。次の世話まで あと${Math.ceil(r.wait/60000)}分`);return;}
 for(const e of list)if(e.isValid)try{player.dimension.spawnParticle('minecraft:heart_particle',where(e));}catch{}
 try{player.dimension.playSound('random.orb',player.location,{pitch:1.4,volume:.5});}catch{}
 wear(player,id);
 note(player,`§aブラッシングで${r.cared}頭の世話をしました（1時間 世話ボーナス）`);
}

// ---- 鍛冶ハンマー ----
function hammer(player,id){
 const p=allowed(player,id);if(!p)return;
 const now=Date.now();if(now-(hammerAt.get(player.id)??0)<HAMMER.cooldownMs){note(player,'§7ハンマーを構え直しています…');return;}
 const self=player.isSneaking,target=self?player:looked(player,HAMMER.reach,e=>e.typeId==='minecraft:player');
 if(!target){note(player,'§7修理する相手を見て使ってください（しゃがむと自分のオフハンド）。');return;}
 const slot=self?'Offhand':'Mainhand',eq=target.getComponent('minecraft:equippable'),gear=eq?.getEquipment(slot),dur=gear?.getComponent('minecraft:durability');
 if(!dur){note(player,self?'§7オフハンドに修理したい道具を持ってください。':`§7${target.name}は修理できる物を持っていません。`);return;}
 if(!dur.damage){note(player,`§7${nameOf(gear)}は傷んでいません。`);return;}
 const t=TOOLS[id],mat=repairMaterial(gear.typeId),inv=player.getComponent('minecraft:inventory').container;
 if(!t.free&&stock(inv)(mat)<1){note(player,`§e修理には${ITEM_NAMES[mat]??mat}が1個必要です。`);return;}
 hammerAt.set(player.id,now);if(!t.free)take(inv,mat,1);
 const fixed=Math.min(dur.damage,Math.round((t.share?Math.max(1,Math.round(dur.maxDurability*t.share)):repairAmount(dur.maxDurability,p.level))*(1+skillValue(p,t.job,'hammer')))); // ハンマーの冴え (skill-config.js)
 dur.damage-=fixed;
 try{eq.setEquipment(slot,gear);}catch{}
 const at={x:target.location.x,y:target.location.y+1.1,z:target.location.z};
 fx(player,{anim:'hammer',sound:'random.anvil_use',pitch:1.2,volume:.6,particle:'minecraft:lava_particle',at,count:4});
 system.runTimeout(()=>{try{player.dimension.spawnParticle('minecraft:critical_hit_emitter',at);player.dimension.playSound('random.anvil_land',at,{pitch:1.6,volume:.3});}catch{}},6);
 wear(player,id);jobCount(player,'repair');earn(player,'craft',HAMMER.xp,'修理');
 titleTrack(player,'repair_points',fixed);if(!self)titleTrack(player,'repair_other');
 note(player,`§a${self?'':target.name+'の'}${nameOf(gear)}を修理しました（耐久 +${fixed}）`);
 if(!self)try{target.sendMessage(`§a${player.name}が${nameOf(gear)}を修理してくれました（耐久 +${fixed}）`);}catch{}
}

// ---- 砥石の欠片（研磨刃） ----
function whetstone(player,id){
 const s=player.getComponent('minecraft:inventory').container.getItem(player.selectedSlotIndex);if(s?.typeId!==id)return;
 const b=readBuffs(player);b[WHETSTONE.buff]=Date.now()+WHETSTONE.seconds*1000;
 try{player.setDynamicProperty(BUFFS_KEY,JSON.stringify(b));}catch{}
 const c=player.getComponent('minecraft:inventory').container;if(s.amount>1){s.amount--;c.setItem(player.selectedSlotIndex,s);}else c.setItem(player.selectedSlotIndex,undefined);
 fx(player,{anim:'rub',sound:'block.grindstone.use',pitch:1.3,volume:.6,particle:'minecraft:critical_hit_emitter',count:3});
 note(player,`§b刃を研ぎました：研磨刃（近接攻撃 +${WHETSTONE.bonus}、${WHETSTONE.seconds/60}分）`);
}

// ---- 魔力のルーペ ----
const SLOTS=[['Mainhand','手'],['Offhand','オフハンド'],['Head','頭'],['Chest','胴'],['Legs','脚'],['Feet','足']];
const ENCH={protection:'ダメージ軽減',sharpness:'ダメージ増加',efficiency:'効率強化',unbreaking:'耐久力',fortune:'幸運',silk_touch:'シルクタッチ',mending:'修繕',looting:'ドロップ増加',
 power:'射撃ダメージ増加',fire_aspect:'火属性',knockback:'ノックバック',feather_falling:'落下耐性',respiration:'水中呼吸',aqua_affinity:'水中採掘',thorns:'棘の鎧',
 depth_strider:'水中歩行',frost_walker:'氷渡り',fire_protection:'火炎耐性',blast_protection:'爆発耐性',projectile_protection:'飛び道具耐性',smite:'アンデッド特効',
 bane_of_arthropods:'虫特効',sweeping:'範囲ダメージ増加',lure:'入れ食い',luck_of_the_sea:'宝釣り',infinity:'無限',punch:'パンチ',flame:'フレイム',swift_sneak:'スニーク速度上昇',soul_speed:'ソウルスピード'};
const ROMAN=['','I','II','III','IV','V'];
export const LUPE={range:6,degrees:25};
/** The nearest other player within range blocks whose direction is within degrees of where player looks. */
export function inSight(player,range,degrees){
 const eye=player.getHeadLocation(),v=player.getViewDirection(),cos=Math.cos(degrees*Math.PI/180);let best,bestD=Infinity;
 for(const o of player.dimension.getPlayers?.({location:player.location,maxDistance:range})??[]){
  if(o.id===player.id)continue;
  const to={x:o.location.x-eye.x,y:o.location.y+1-eye.y,z:o.location.z-eye.z},d=Math.hypot(to.x,to.y,to.z);
  if(!d||d>range+1||(to.x*v.x+to.y*v.y+to.z*v.z)/d<cos)continue;
  if(d<bestD){best=o;bestD=d;}
 }
 return best;
}
async function lupe(player,id){
 if(!allowed(player,id))return;
 // others only (2026-10-29: it showed your own gear, and missed people unless aimed exactly at their hit box): the
 // player looked at, else the nearest one within LUPE.range blocks and LUPE.degrees of where you look
 const target=looked(player,LUPE.range,e=>e.typeId==='minecraft:player')??inSight(player,LUPE.range,LUPE.degrees);
 if(!target){note(player,'§eルーペを向ける相手がいません。近くの人の方を見て使ってください。');return;}
 const eq=target.getComponent('minecraft:equippable'),lines=[];
 for(const [slot,label] of SLOTS){
  const s=eq?.getEquipment(slot);if(!s)continue;
  lines.push(`§l${label}§r：${nameOf(s)}`);
  try{const d=s.getComponent('minecraft:durability');if(d){const left=d.maxDurability-d.damage,pc=left/d.maxDurability;lines.push(`  ${pc<.2?'§c':pc<.5?'§e':'§a'}耐久 ${left} / ${d.maxDurability}`);}}catch{}
  try{for(const e of s.getComponent('minecraft:enchantable')?.getEnchantments()??[]){const k=String(e.type?.id??e.type).replace('minecraft:','');lines.push(`  §bエンチャント：${ENCH[k]??k} ${ROMAN[e.level]??e.level}`);}}catch{}
  try{for(const l of s.getLore()??[])if(/刻印|ルーン|研磨|特性/.test(l))lines.push('  '+l);}catch{}
 }
 fx(player,{anim:'inspect',sound:'item.book.page_turn',pitch:1.2,particle:'minecraft:enchanting_table_particle',count:8,
  at:{x:target.location.x,y:target.location.y+1.2,z:target.location.z}});
 jobCount(player,'appraise');
 await new Promise(r=>system.runTimeout(r,10));
 await noticeDialog(player,`鑑定：${target.name}の装備`,lines.length?lines.join('\n'):'何も装備していません。',{close:'閉じる'});
}

// ---- 地図ピン ----
const pinsOf=s=>{try{const v=JSON.parse(s.getDynamicProperty(PIN.key)??'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const DIM={'minecraft:overworld':'地上','minecraft:nether':'ネザー','minecraft:the_end':'エンド'};
async function pin(player,id){
 if(!allowed(player,id))return;
 const c=player.getComponent('minecraft:inventory').container,slot=player.selectedSlotIndex,s=c.getItem(slot);if(s?.typeId!==id)return;
 fx(player,{anim:'point',sound:'item.book.page_turn',pitch:.9});
 const pins=pinsOf(s),sel=s.getDynamicProperty(PIN.sel)??0,here=player.location;
 const row=(p,i)=>p?`${i===sel?'§2▶ ':''}ピン${i+1}：${p.name}　${p.dim===player.dimension.id?bearing(here,p):DIM[p.dim]??p.dim}`:`ピン${i+1}：§7（空き）`;
 const i=await chooseDialog(player,'地図ピン','手に持つと、選んだピンの方角と距離が上に出ます。',[...Array(PIN.slots)].map((_,k)=>row(pins[k],k)),{back:'閉じる'});
 if(i===undefined)return;
 const acts=pins[i]?['このピンを案内する','ここに付け直す','消す']:['ここにピンを付ける'];
 const a=await chooseDialog(player,`ピン${i+1}`,pins[i]?row(pins[i],i):'今いる場所を記録します。',acts,{back:'戻る'});if(a===undefined)return;
 const now=c.getItem(slot);if(now?.typeId!==id){note(player,'§e地図ピンを持ったまま選んでください。');return;}
 const list=pinsOf(now),act=acts[a];
 if(act==='消す')list[i]=null;
 else if(act!=='このピンを案内する'){const l=player.location;list[i]={x:Math.floor(l.x),y:Math.floor(l.y),z:Math.floor(l.z),dim:player.dimension.id,name:`${Math.floor(l.x)}, ${Math.floor(l.y)}, ${Math.floor(l.z)}`};
  try{player.dimension.spawnParticle('minecraft:villager_happy',{x:l.x,y:l.y+.2,z:l.z});player.playSound('random.orb',{pitch:1.5,volume:.5});}catch{}}
 try{now.setDynamicProperty(PIN.key,JSON.stringify(list));now.setDynamicProperty(PIN.sel,i);c.setItem(slot,now);}catch{}
 note(player,act==='消す'?`§7ピン${i+1}を消しました。`:`§aピン${i+1}を案内します。`);
}
// while held: the way to the chosen pin, as a HUD log line (2026-10-30: on the action bar it fought the minimap's
// own action bar text and the HUD flickered)
function pinHud(player){
 try{const s=player.getComponent('minecraft:inventory').container.getItem(player.selectedSlotIndex);if(s?.typeId!=='cooptown:map_pin')return;
  const i=s.getDynamicProperty(PIN.sel)??0,p=pinsOf(s)[i];
  if(!p){pushText(player,'pin','§7地図ピン：使ってピンを付けよう');return;}
  if(p.dim!==player.dimension.id){pushText(player,'pin',`§eピン${i+1}は${DIM[p.dim]??p.dim}にあります`);return;}
  pushText(player,'pin',`§fピン${i+1} §e${turnWord(player.location,player.getRotation().y,p)} §f${bearing(player.location,p)}`);}catch{}
}

// ---- the bags ----
function bag(player,id){
 const t=TOOLS[id];if(!allowed(player,id))return;
 if(id==='cooptown:potion_holder'&&player.isSneaking){quickDrink(player);return;}
 fx(player,{anim:'bag',sound:'armor.equip_leather',pitch:1.1,volume:.6});
 system.runTimeout(()=>openBackpack(player),4);
}
// the 試験管ホルダー: sneak + use drinks the first potion in it
function quickDrink(player){
 const c=player.getComponent('minecraft:inventory').container,slot=player.selectedSlotIndex,s=c.getItem(slot);
 const list=packOf(s),k=list.findIndex(e=>e.n>0&&!e.potion);if(k<0){note(player,'§7ホルダーに調合師のポーションがありません。');return;}
 const e=list[k];let potion;
 try{potion=new ItemStack(e.id,1);if(e.lore)potion.setLore(e.lore);if(e.name)potion.nameTag=e.name;}catch{return;}
 const r=offhandEat?.(player,potion);if(typeof r==='string'){note(player,r);return;}
 if(e.n>1)e.n--;else list.splice(k,1);
 try{s.setDynamicProperty('cooptown:pack',JSON.stringify(list));c.setItem(slot,s);}catch{}
 if(r?.convert)try{const left=c.addItem(new ItemStack(r.convert,1));if(left)player.dimension.spawnItem(left,player.location);}catch{}
 fx(player,{anim:'drink',sound:'random.drink',particle:'minecraft:villager_happy',count:3});
 note(player,`§aホルダーから${nameOf(potion)}を飲みました（残り ${list.reduce((a,x)=>a+x.n,0)}本）`);
}

/** The rune pen (rune-runtime.js): lapis saved when inscribing, and its wear. */
// the best pen held: 極みの刻印ペン saves both lapis
const bestPen=player=>findInInventory(player,'cooptown:master_pen')??findInInventory(player,'cooptown:rune_pen');
export const penSave=player=>{const f=bestPen(player);return f?TOOLS[f.s.typeId].save??PEN.save:0;};
export function usePen(player){
 const f=bestPen(player);if(!f)return;
 try{const d=f.s.getComponent('minecraft:durability');if(d.damage+1>=d.maxDurability){f.c.setItem(f.i,undefined);player.playSound('random.break');}else{d.damage++;f.c.setItem(f.i,f.s);}
  player.playAnimation('animation.cooptown.tool.write',{blendOutTime:.15,controller:'cooptown_tool'});
  player.dimension.spawnParticle('minecraft:enchanting_table_particle',player.getHeadLocation());}catch{}
}

/** Using a job tool (main.js custom component cooptown:job_tool). */
export function useJobTool(player,item,target){
 const id=item?.typeId,t=TOOLS[id];if(!t)return;
 const now=system.currentTick;if(now-(lastUse.get(player.id)??-99)<5)return;lastUse.set(player.id,now); // the entity event and onUse both fire
 switch(t.kind){
  case 'brush':return brush(player,id,target);
  case 'hammer':return hammer(player,id);
  case 'whetstone':return whetstone(player,id);
  case 'lupe':return void lupe(player,id);
  case 'pin':return void pin(player,id);
  case 'bag':return bag(player,id);
 }
}

export function installJobTools({game}){
 ctx={game};
 // a brush used on an animal: the animal is the target (and nothing else happens, e.g. feeding)
 world.beforeEvents.playerInteractWithEntity?.subscribe(ev=>{
  const id=ev.itemStack?.typeId;if(TOOLS[id]?.kind!=='brush'||ev.target?.typeId?.startsWith('cooptown:'))return;
  ev.cancel=true;const {player,target}=ev;system.run(()=>useJobTool(player,{typeId:id},target));
 });
 // 研磨刃: melee hits deal more
 const extra=new Set();
 world.afterEvents.entityHurt?.subscribe(({hurtEntity,damageSource})=>{
  const a=damageSource.damagingEntity;if(a?.typeId!=='minecraft:player'||damageSource.cause!=='entityAttack'||extra.has(hurtEntity.id))return;
  if(!(buffLeft(a,WHETSTONE.buff)>0))return;
  extra.add(hurtEntity.id);
  try{hurtEntity.applyDamage(WHETSTONE.bonus,{cause:'magic',damagingEntity:a});hurtEntity.dimension.spawnParticle('minecraft:critical_hit_emitter',{x:hurtEntity.location.x,y:hurtEntity.location.y+1,z:hurtEntity.location.z});}catch{}
  extra.delete(hurtEntity.id);
 });
 // 料理人の包丁: more meat from animals a cook kills with it
 world.afterEvents.entityDie?.subscribe(({deadEntity,damageSource})=>{
  const player=damageSource.damagingEntity,knife=player?.typeId==='minecraft:player'?heldId(player):undefined;if(TOOLS[knife]?.kind!=='knife')return;
  const t=TOOLS[knife],meat=KNIFE.meat[deadEntity.typeId],kp=meat&&allowed(player,knife,false);if(!kp)return;
  let at;try{at=deadEntity.location;}catch{return;}
  wear(player,knife);
  if(Math.random()>=(t.chance??KNIFE.chance)+skillValue(kp,t.job,'knife'))return; // 包丁さばき
  const n=t.extra?1+(Math.random()<.5?1:0):1;
  try{player.dimension.spawnItem(new ItemStack(meat,n),at);player.dimension.spawnParticle('minecraft:villager_happy',{x:at.x,y:at.y+.6,z:at.z});player.dimension.playSound('random.pop',at,{pitch:.8});}catch{}
  try{player.playAnimation('animation.cooptown.tool.slice',{blendOutTime:.1,controller:'cooptown_tool'});}catch{}
  titleTrack(player,'knife_meat');
 });
 world.afterEvents.playerBreakBlock?.subscribe(({player,block,brokenBlockPermutation,itemStackBeforeBreak})=>{
  const broken=brokenBlockPermutation.type.id,tool=itemStackBeforeBreak?.typeId;
  // 薬草ナイフ: herbs from grass and flowers
  if(TOOLS[tool]?.kind==='herb'){
   const chance=Math.min(.95,(HERB.flowerIds.test(broken)?HERB.flower:HERB.grassIds.test(broken)?HERB.grass:0)*(TOOLS[tool].mult??1)*(1+skillValue(peek(player),TOOLS[tool].job,'herb'))); // 薬草採り
   if(chance&&allowed(player,tool,false)){
    wear(player,tool);
    try{player.playAnimation('animation.cooptown.tool.slice',{blendOutTime:.1,controller:'cooptown_tool'});}catch{}
    if(Math.random()<chance){const at={x:block.location.x+.5,y:block.location.y+.3,z:block.location.z+.5};
     try{block.dimension.spawnItem(new ItemStack(HERB.item,1),at);block.dimension.spawnParticle('minecraft:villager_happy',at);player.playSound('random.pop',{pitch:1.4,volume:.5});}catch{}
     jobCount(player,'herb');titleTrack(player,'herb_cut');}
   }
  }
  // 植林袋: a sapling where a tree was cut down
  const wood=woodOf(broken);
  if(wood&&findInInventory(player,'cooptown:planting_bag')&&allowed(player,'cooptown:planting_bag',false)){
   const dim=block.dimension,at={...block.location},sapling=PLANTER.sapling(wood);
   let soil;try{soil=dim.getBlock({...at,y:at.y-1})?.typeId;}catch{}
   if(!PLANTER.soil.test(soil??''))return;
   system.runTimeout(()=>{
    try{const b=dim.getBlock(at);if(!b?.isAir)return;
     const inv=player.getComponent('minecraft:inventory')?.container;if(!inv||stock(inv)(sapling)<1){note(player,`§7植林袋：${ITEM_NAMES[sapling]??sapling}がありません。`);return;}
     b.setType(sapling);take(inv,sapling,1);
     dim.spawnParticle('minecraft:villager_happy',{x:at.x+.5,y:at.y+.5,z:at.z+.5});dim.playSound('dig.grass',at,{pitch:1.2});
     titleTrack(player,'replanted');}catch{}
   },10);
  }
 });
 // 鉱夫のカンテラ (held or in the off hand): night vision; 地図ピン (held): the way to the pin
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   const main=heldId(player),off=offId(player);
   if(main==='cooptown:map_pin')pinHud(player);
   const lantern=TOOLS[main]?.kind==='lantern'?main:TOOLS[off]?.kind==='lantern'?off:undefined;
   if(lantern&&allowed(player,lantern,false)){
    try{player.addEffect(LANTERN.effect,LANTERN.seconds*20,{amplifier:0,showParticles:false});if(TOOLS[lantern].haste)player.addEffect('haste',LANTERN.seconds*20,{amplifier:1,showParticles:false});
     const h=player.getHeadLocation();player.dimension.spawnParticle('minecraft:basic_flame_particle',{x:h.x,y:h.y-.6,z:h.z});}catch{}
   }
  }
 },10);
}
