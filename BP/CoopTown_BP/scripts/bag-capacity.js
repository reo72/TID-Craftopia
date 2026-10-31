import {world,system} from '@minecraft/server';
import {chooseDialog,noticeDialog} from './dialog.js';
import {BAGS} from './job-tools-config.js';

// 容量拡張 (asked 2026-10-30): an original enchantment for backpacks and the bags of 27 places (魚籠, 保冷バッグ),
// levels I-III. Each level adds one page of 26 places (backpack-runtime.js pages). It is put on with a 容量拡張の書
// (付与術師's workbench recipe, CAPACITY_RECIPES): using the book picks a bag in the inventory. The level is kept on
// the bag (CAPACITY_KEY) and shown in its lore; a higher book replaces a lower level.
export const CAPACITY_KEY='cooptown:capacity';
export const CAPACITY_BOOKS={'cooptown:capacity_book_1':1,'cooptown:capacity_book_2':2,'cooptown:capacity_book_3':3};
const ROMAN=['','Ⅰ','Ⅱ','Ⅲ'],LORE_MARK='§d容量拡張';
export const CAPACITY_RECIPES=[
 {name:'容量拡張の書 Ⅰ',job:'付与術師',jobLevel:10,output:['cooptown:capacity_book_1',1],inputs:[['minecraft:book',1],['minecraft:lapis_lazuli',8],['minecraft:chest',1]]},
 {name:'容量拡張の書 Ⅱ',job:'付与術師',jobLevel:25,output:['cooptown:capacity_book_2',1],inputs:[['minecraft:book',1],['minecraft:lapis_lazuli',16],['minecraft:ender_pearl',2]]},
 {name:'容量拡張の書 Ⅲ',job:'付与術師',jobLevel:45,output:['cooptown:capacity_book_3',1],inputs:[['minecraft:book',1],['minecraft:lapis_lazuli',32],['minecraft:shulker_shell',2]]}];
const isBackpackId=id=>String(id).startsWith('cooptown:backpack_');
/** Whether an item can take 容量拡張 (backpacks and the bags of 27 places or more). */
export const canExpand=id=>isBackpackId(id)||(BAGS[id]?.places??0)>=27;
/** A bag's 容量拡張 level (0-3). */
export function capacityOf(item){try{const v=Number(item?.getDynamicProperty(CAPACITY_KEY)??0);return v>=1&&v<=3?v:0;}catch{return 0;}}
/** Puts level on a bag item (returns it): the mark and its lore line. */
export function setCapacity(item,level){
 item.setDynamicProperty(CAPACITY_KEY,level);
 let lore=[];try{lore=(item.getLore()??[]).filter(l=>!l.startsWith(LORE_MARK));}catch{}
 try{item.setLore([`${LORE_MARK} ${ROMAN[level]}§7（+${level}ページ）`,...lore]);}catch{}
 return item;
}
const nameOf=s=>s.nameTag||BAGS[s.typeId]?.label||'バックパック';
async function useBook(player,book){
 const level=CAPACITY_BOOKS[book.typeId],c=player.getComponent('minecraft:inventory')?.container;if(!c)return;
 const bags=[];for(let i=0;i<c.size;i++){const s=c.getItem(i);if(s&&canExpand(s.typeId))bags.push(i);}
 const title='容量拡張 '+ROMAN[level];
 if(!bags.length){await noticeDialog(player,title,'持ち物にバックパックか魚籠・保冷バッグがありません。',{close:'閉じる'});return;}
 const k=await chooseDialog(player,title,`どれに付けますか？（1ページ＝26枠ふえます）`,bags.map(i=>{const s=c.getItem(i),n=capacityOf(s);return `${nameOf(s)}${n?`（今：${ROMAN[n]}）`:''}`;}));
 if(k===undefined)return;
 const slot=bags[k],bag=c.getItem(slot);if(!bag||!canExpand(bag.typeId))return;
 // a bag that is open has its things in the box: wait until it is closed
 try{if(bag.getDynamicProperty('cooptown:pack_open')){player.sendMessage('§e開いている袋には付けられません。閉じてからもう一度使ってください。');return;}}catch{}
 if(capacityOf(bag)>=level){player.sendMessage(`§eこの袋はもう容量拡張 ${ROMAN[capacityOf(bag)]} です。`);return;}
 // the book: one used from the selected slot
 const sel=player.selectedSlotIndex,held=c.getItem(sel);if(held?.typeId!==book.typeId)return;
 if(held.amount>1){held.amount--;c.setItem(sel,held);}else c.setItem(sel,undefined);
 c.setItem(slot,setCapacity(bag,level));
 try{player.playSound('random.levelup',{pitch:1.2,volume:.6});}catch{}
 player.sendMessage(`§d${nameOf(bag)}に容量拡張 ${ROMAN[level]} を付けました。§7（+${level}ページ）`);
}
const busy=new Set();
world.afterEvents.itemUse.subscribe(({source,itemStack})=>{
 if(source?.typeId!=='minecraft:player'||!CAPACITY_BOOKS[itemStack?.typeId]||busy.has(source.id))return;
 busy.add(source.id);system.run(async()=>{try{await useBook(source,itemStack);}catch(e){console.warn('[CoopTown] 容量拡張: '+e);}finally{busy.delete(source.id);}});
});
