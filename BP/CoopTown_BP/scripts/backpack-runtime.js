import {ItemStack,EnchantmentType} from '@minecraft/server';
import {openCustomBox,PACK_BOX} from './npc-warehouse.js';
import {BAGS} from './job-tools-config.js';
import {shiftLore} from './freshness.js';
import {capacityOf} from './bag-capacity.js';

// The backpack (cooptown:backpack_<colour>, nine colours): PLACES places kept on the backpack item itself (its dynamic
// property), so a backpack can be handed over with what is in it. Anything goes in; an item's name, lore, enchantments,
// wear and potion kind are kept with it and put back when it comes out. A backpack cannot go into a backpack.
// Opened by using the backpack (main.js custom component cooptown:open_backpack): a chest screen, see below.
export const isBackpack=id=>String(id).startsWith('cooptown:backpack_');
// the job bags (job-tools-config.js BAGS: 魚籠, 保冷バッグ, 試験管ホルダー) work the same way, with fewer places or only
// some items allowed, and foods inside keep longer (their dates move on by the time inside x (1 - slow))
export const isBag=id=>isBackpack(id)||!!BAGS[id];
const AT_KEY='cooptown:pack_at',HOUR=3600000;
const PACK_KEY='cooptown:pack',PLACES=27,STACK=64;
const POTIONS=new Set(['minecraft:potion','minecraft:splash_potion','minecraft:lingering_potion']);
const active=new Set();
// pages (a bag with kind.pages > 1, asked 2026-10-30): the box shows PAGE_PLACES of the list at a time; its last place
// holds the page marker (paper named 次のページ). Taking it out turns the page: the shown places go back into their
// page of the list, the next page comes in and the marker goes back (from the cursor or the inventory).
export const PAGE_PLACES=26,PAGE_SLOT=26,PAGE_LORE='§8cooptown:page';
export const isPageMarker=s=>s?.typeId==='minecraft:paper'&&(()=>{try{return (s.getLore()??[]).includes(PAGE_LORE);}catch{return false;}})();
export function pageMarker(page,pages){
 const s=new ItemStack('minecraft:paper',1);
 try{s.nameTag=`§e次のページへ（${page+1} / ${pages}）`;s.setLore(['§7取り出すとページをめくります',PAGE_LORE]);}catch{}
 return s;
}
/** How many pages a bag shows: its kind's, plus one per 容量拡張 level (bag-capacity.js). */
export const pagesOf_=(kind,item)=>(kind?.pages>1?kind.pages:1)+capacityOf(item);
/** How many places a bag has: a paged one PAGE_PLACES a page, else its kind's (a backpack PLACES). */
export const placesOf=(kind,item)=>{const n=pagesOf_(kind,item);return n>1?PAGE_PLACES*n:kind?.places??PLACES;};
/** The list cut into pages of PAGE_PLACES entries. */
export const pagesOf=(list,pages)=>Array.from({length:pages},(_,p)=>list.slice(p*PAGE_PLACES,(p+1)*PAGE_PLACES));
// takes stray page markers off the player (cursor and inventory)
function dropMarkers(player){
 try{const cur=player.getComponent('minecraft:cursor_inventory');if(isPageMarker(cur?.item))cur.clear();}catch{}
 try{const c=player.getComponent('minecraft:inventory')?.container;for(let i=0;c&&i<c.size;i++)if(isPageMarker(c.getItem(i)))c.setItem(i,undefined);}catch{}
}

/** What a backpack item holds: [{id, n, name?, lore?, ench?, dmg?, potion?}] */
export function packOf(item){try{const v=JSON.parse(item?.getDynamicProperty(PACK_KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}
const savePack=(item,list)=>item.setDynamicProperty(PACK_KEY,JSON.stringify(list));
/** An inventory item as a backpack entry (n of it). */
export function entryOf(item,n){
 const e={id:item.typeId,n};
 if(item.nameTag)e.name=item.nameTag;
 try{const lore=item.getLore?.();if(lore?.length)e.lore=lore;}catch{}
 try{const en=item.getComponent('minecraft:enchantable')?.getEnchantments()??[];if(en.length)e.ench=en.map(x=>[String(x.type?.id??x.type).replace(/^minecraft:/,''),x.level]);}catch{}
 try{const d=item.getComponent('minecraft:durability');if(d?.damage)e.dmg=d.damage;}catch{}
 if(POTIONS.has(item.typeId))try{const p=item.getComponent('minecraft:potion');if(p)e.potion={effect:p.potionEffectType?.id,liquid:p.potionLiquidType?.id,modifier:p.potionModifierType?.id};}catch{}
 return e;
}
const plain=e=>!e.name&&!e.lore&&!e.ench&&!e.dmg&&!e.potion;
/** Items for n of an entry (stacked up to the item's own stack size), extras put back on. */
function itemsOf(e,n){
 const out=[];
 while(n>0){
  let s;
  if(e.potion&&ItemStack.createPotion)try{s=ItemStack.createPotion({effect:e.potion.effect,liquid:e.potion.liquid,modifier:e.potion.modifier});}catch{}
  s??=new ItemStack(e.id,1);
  const k=Math.min(n,s.maxAmount??STACK);if(k>1)s.amount=k;n-=k;
  if(e.name)s.nameTag=e.name;
  if(e.lore)try{s.setLore(e.lore);}catch{}
  if(e.ench){const c=s.getComponent('minecraft:enchantable');for(const [id,level] of e.ench)try{c?.addEnchantment({type:new EnchantmentType(id),level});}catch{}}
  if(e.dmg)try{s.getComponent('minecraft:durability').damage=e.dmg;}catch{}
  out.push(s);
 }
 return out;
}
/** How many of an item a place holds at most. */
const capOf=id=>{try{return new ItemStack(id,1).maxAmount??STACK;}catch{return STACK;}};
/** Puts n of an inventory item into the list; returns how many went in. */
export function putIn(list,item,n,places=PLACES){
 const e=entryOf(item,n);let left=n;
 if(plain(e)){const cap=capOf(e.id);for(const x of list){if(!left)break;if(x.id===e.id&&plain(x)&&x.n<cap){const k=Math.min(left,cap-x.n);x.n+=k;left-=k;}}}
 while(left>0&&list.length<places){const k=plain(e)?Math.min(left,capOf(e.id)):left;list.push({...e,n:k});left-=k;}
 return n-left;
}

// ---- opening (asked 2026-10-27: like a chest) ----
// Using the backpack (or sneak + swing while worn) opens the chest-style box of npc-warehouse.js (entity PACK_BOX,
// titled バックパック) in front of the eyes. It stays open only while the player holds that backpack (asked 2026-10-27:
// the selected hotbar slot, or the off hand when opened worn); putting it away closes it (sneaking does not). While it is open the items are in the box and the
// backpack is empty (a crash drops them where the box was instead of copying them); closing writes what is in the box
// back on the backpack, found by TOKEN wherever it went in the inventory. Backpacks put in the box come back out.
const TOKEN='cooptown:pack_open';
/** The stacks a backpack's list puts in the box. */
export const stacksOf=list=>list.flatMap(e=>itemsOf(e,e.n));
/** A box's stacks as a backpack list ({pack}); backpacks are left out ({out}, they go back to the player). */
export function packFromStacks(stacks,kind,places=kind?.places??PLACES){
 const pack=[],out=[];
 for(const s of stacks){if(!s)continue;if(isBag(s.typeId)||pack.length>=places||(kind&&!kind.accepts(s.typeId))){out.push(s);continue;}pack.push(entryOf(s,s.amount));}
 return {pack,out};
}
const give=(player,stack,at)=>{
 try{if(player){const left=player.getComponent('minecraft:inventory').container.addItem(stack);if(left)player.dimension.spawnItem(left,player.location);return;}}catch{}
 try{at?.dimension.spawnItem(stack,at.location);}catch{}
};
// the open backpack wherever it is now: a hotbar / inventory slot or the off hand
function findBag(player,token){
 const c=player.getComponent('minecraft:inventory')?.container;
 for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(isBag(s?.typeId)&&s.getDynamicProperty(TOKEN)===token)return {get:()=>c.getItem(i),set:x=>c.setItem(i,x)};}
 const eq=player.getComponent('minecraft:equippable'),off=eq?.getEquipment('Offhand');
 if(isBag(off?.typeId)&&off.getDynamicProperty(TOKEN)===token)return {get:()=>eq.getEquipment('Offhand'),set:x=>eq.setEquipment('Offhand',x)};
}
function open(player,worn=false,ready=false){
 if(active.has(player.id))return;
 const bag=bagAccess(player,worn),item=bag.get();if(!item)return;
 const kind=BAGS[item.typeId],label=kind?.label??'バックパック',places=placesOf(kind,item),token=`${player.id}:${Date.now()}`;
 const aged=agePack(packOf(item),item.getDynamicProperty(AT_KEY),kind),list=aged.list;
 try{savePack(item,[]);item.setDynamicProperty(TOKEN,token);bag.set(item);}catch(e){console.warn('[CoopTown] バックパック: '+e);return;}
 active.add(player.id);
 const stacks=stacksOf(list);
 // paged bags: the page shown (state.page), the others kept as lists
 const pages=pagesOf_(kind,item),state={page:0,lists:pages>1?pagesOf(list,pages):null,c:null};
 const showPage=c=>{for(let i=0;i<=PAGE_SLOT&&i<c.size;i++)c.setItem(i,undefined);stacksOf(state.lists[state.page]).forEach((s,i)=>{if(i<PAGE_PLACES)c.setItem(i,s);else give(player,s);});c.setItem(PAGE_SLOT,pageMarker(state.page,pages));};
 // the shown places as a page list; what does not belong goes back to the player
 const takePage=c=>{const got=[];for(let i=0;i<c.size;i++){const s=c.getItem(i);if(s&&!isPageMarker(s))got.push(s);}const {pack,out}=packFromStacks(got,kind,PAGE_PLACES);out.forEach(s=>give(player,s));return pack;};
 const turnPage=()=>{const c=state.c;if(!c||isPageMarker(c.getItem(PAGE_SLOT)))return;
  state.lists[state.page]=takePage(c);dropMarkers(player);state.page=(state.page+1)%pages;showPage(c);
  try{player.playSound('item.book.page_turn',{volume:.8});}catch{}};
 // open while that backpack is still held: the selected slot (or the off hand when worn)
 const held=()=>{try{if(worn){const s=player.getComponent('minecraft:equippable')?.getEquipment('Offhand');return s?.getDynamicProperty(TOKEN)===token;}
  const s=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);return s?.getDynamicProperty(TOKEN)===token;}catch{return false;}};
 const before=JSON.stringify(list);
 const opened=openCustomBox(player,{type:PACK_BOX,sneak:false,still:()=>{if(pages>1)try{turnPage();}catch(e){console.warn('[CoopTown] ページ: '+e);}return held();},name:label,sound:!ready, // the chest screen's title (an empty name showed 不明, 2026-10-30)
  fill:c=>{if(pages>1){state.c=c;if(c)showPage(c);return;}stacks.forEach((s,i)=>{if(c&&i<Math.min(c.size,places))c.setItem(i,s);else give(player,s);});},
  settle:(c,pl,box)=>{
   active.delete(player.id);
   // a paged bag: the shown page goes back into its place in the list first
   if(pages>1&&c){state.lists[state.page]=takePage(c);for(let i=0;i<c.size;i++)c.setItem(i,undefined);if(pl)dropMarkers(pl);}
   const got=pages>1?stacksOf(state.lists.flat()):[];for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(s){c.setItem(i,undefined);got.push(s);}}
   let where=pl&&findBag(pl,token);
   // the backpack itself was put in the box: it comes back to the player holding what else was in there
   const inBox=got.findIndex(s=>isBag(s.typeId)&&s.getDynamicProperty(TOKEN)===token);
   if(!where&&inBox>=0&&pl){const b=got.splice(inBox,1)[0];where={get:()=>b,set:x=>give(pl,x,box)};}
   if(!where){got.forEach(s=>give(pl,s,box));try{pl?.sendMessage(`§e${label}が見つからないので、中身を持ち物に戻しました。`);}catch{}return;}
   const {pack,out}=packFromStacks(got,kind,places),b=where.get();
   try{savePack(b,pack);b.setDynamicProperty(TOKEN,undefined);b.setDynamicProperty(AT_KEY,Date.now()-aged.carry);where.set(b);}catch(e){console.warn('[CoopTown] バックパック: '+e);got.forEach(s=>give(pl,s,box));return;}
   out.forEach(s=>give(pl,s,box));
   // made ready on picking it up (below): no word when nothing in it changed
   if(!(ready&&JSON.stringify(pack)===before&&!out.length))try{pl.sendMessage(`§7${label}を閉じました（${pack.length} / ${places}）`+(out.some(s=>isBag(s.typeId))?`\n§e${label}に袋やバックパックは入れられません。`:'')+(kind&&out.some(s=>!isBag(s.typeId))?'\n§e'+kind.refuse:''));}catch{}
  }});
 if(!opened){try{const b=bag.get();savePack(b,list);b.setDynamicProperty(TOKEN,undefined);b.setDynamicProperty(AT_KEY,Date.now()-aged.carry);bag.set(b);}catch{}active.delete(player.id);}
}
/** A bag's list with the food dates moved on for the time since it was last closed (at) x (1 - slow): {list, carry}
 *  (carry: the time not yet counted, under an hour of moving; it is kept for next time). */
export function agePack(list,at,kind,now=Date.now()){
 const gain=kind?.slow&&at?(now-at)*(1-kind.slow):0,hours=Math.floor(gain/HOUR);
 if(!(hours>0))return {list,carry:at&&kind?.slow?Math.max(0,now-at):0};
 return {list:list.map(e=>e.lore?{...e,lore:shiftLore(e.lore,hours*HOUR,at,now)}:e),carry:Math.round((gain-hours*HOUR)/(1-kind.slow))};
}
/** Puts a stack into the first closed bag of a kind in the player's inventory (the fish basket takes the catch);
 *  returns how many went in. */
export function stashInBag(player,stack,bagId){
 const kind=BAGS[bagId];if(!kind?.accepts(stack?.typeId))return 0;
 const c=player.getComponent('minecraft:inventory')?.container;
 for(let i=0;c&&i<c.size;i++){
  const b=c.getItem(i);if(b?.typeId!==bagId||b.getDynamicProperty(TOKEN))continue;
  const aged=agePack(packOf(b),b.getDynamicProperty(AT_KEY),kind),list=aged.list,before=list.length;
  const n=putIn(list,stack,stack.amount,placesOf(kind,b));if(!n)continue;
  try{savePack(b,list);b.setDynamicProperty(AT_KEY,Date.now()-aged.carry);c.setItem(i,b);}catch{continue;}
  return n;
 }
 return 0;
}
/** Opens the backpack the player holds (the item's custom component cooptown:open_backpack, main.js), or wears. */
export const openBackpack=(player,worn=false)=>open(player,worn);
/** One tap to open (asked 2026-10-30: using the backpack and then tapping its box was two): while a bag is held in
 *  the hand its box already stands in front of the eyes (npc-warehouse.js openCustomBox), so the first tap opens the
 *  chest screen. It closes again as soon as the bag is put away, quietly when nothing changed. */
export function installBagReady(world,system){
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   if(active.has(player.id))continue;
   let s;try{s=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);}catch{continue;}
   if(isBag(s?.typeId))open(player,false,true);
  }
 },4);
}
// where the open backpack is: the selected hotbar slot, or the off hand (worn on the back)
function bagAccess(player,worn){
 const container=player.getComponent('minecraft:inventory')?.container;
 if(worn){const eq=player.getComponent('minecraft:equippable');
  return {container,slot:-1,get:()=>{const s=eq?.getEquipment('Offhand');return isBag(s?.typeId)?s:undefined;},set:item=>eq.setEquipment('Offhand',item)};}
 const slot=player.selectedSlotIndex;
 return {container,slot,get:()=>{const s=container?.getItem(slot);return isBag(s?.typeId)?s:undefined;},set:item=>container.setItem(slot,item)};
}
