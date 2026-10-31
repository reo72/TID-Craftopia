import './profiler.js'; // first: it times every timer and event handler the other files register
import { system, world, ItemStack } from '@minecraft/server';
import {activateRunes} from './rune-runtime.js';
import { installGame, game } from './game-runtime.js';
import {learnCookScroll} from './cook-knowledge.js';
import {COOK_RECIPES} from './cook-config.js';
import {SMOKE_RECIPES} from './smoke-config.js';
import './offhand.js';
import './bag-capacity.js'; // 容量拡張の書 (use: pick a bag)
import { openAdmin, isAdmin } from './admin-runtime.js';
import { openBook } from './book.js';
import { learnRecipe } from './cauldron-runtime.js';
import { openBackpack, isBackpack } from './backpack-runtime.js';
import {useJobTool} from './job-tools.js';
import {useFryingPan} from './frying-pan.js';
import {useExpeditionKit} from './dungeon-runtime.js';
import {setCommandHandlers} from './commands.js';

// The notebook item opens the book menu (book.js); one menu per player at a time. The 3D book (RP
// tools/build-guidebook.py) is swapped for cooptown:guidebook_open, whose attachable plays the opening animation; the
// menu opens 0.8 s later, and the closed book comes back when the menu closes.
const active = new Set();
const BOOK='cooptown:guidebook',BOOK_OPEN='cooptown:guidebook_open',BOOK_OPEN_TICKS=16;
const inventoryOf=player=>{try{return player.getComponent('minecraft:inventory')?.container;}catch{return undefined;}};
/** Every book of one kind in the inventory becomes the other kind (keeping its name and lore). */
function swapBooks(player,from,to,onlySlot){
 const inv=inventoryOf(player);if(!inv)return false;let done=false;
 for(let i=0;i<inv.size;i++){if(onlySlot!==undefined&&i!==onlySlot)continue;const s=inv.getItem(i);if(s?.typeId!==from)continue;
  const n=new ItemStack(to,1);try{if(s.nameTag)n.nameTag=s.nameTag;const lore=s.getLore();if(lore.length)n.setLore(lore);}catch{}inv.setItem(i,n);done=true;}
 return done;
}
async function openMenu(player) {
 if(active.has(player.id)) return;
 active.add(player.id);
 try {
  if(swapBooks(player,BOOK,BOOK_OPEN,player.selectedSlotIndex))await new Promise(res=>system.runTimeout(res,BOOK_OPEN_TICKS)); // the menu waits 0.8 s for the book to open (asked)
  await openBook(player);
 }
 catch(error) {console.warn('[CoopTown] '+error);try{player.sendMessage('§c手帳を開けませんでした。コンテンツログを確認してください。');}catch{}}
 finally {active.delete(player.id);try{swapBooks(player,BOOK_OPEN,BOOK);}catch{}}
}
// an open book left over (the menu was closed by leaving, a crash, ...) closes again
system.runInterval(()=>{for(const p of world.getAllPlayers())if(!active.has(p.id))swapBooks(p,BOOK_OPEN,BOOK);},100);
system.beforeEvents.startup.subscribe(event=>{
 event.itemComponentRegistry.registerCustomComponent('cooptown:open_menu',{
  onUse:({source})=>{system.run(()=>void openMenu(source));}
 });
 event.itemComponentRegistry.registerCustomComponent('cooptown:open_admin',{
  onUse:({source})=>{system.run(()=>void openAdmin(source));}
 });
 // the 協力探索セット: sneak + use starts a 探索戦 (dungeon-runtime.js)
 event.itemComponentRegistry.registerCustomComponent('cooptown:dungeon',{
  onUse:({source})=>{system.run(()=>useExpeditionKit(source));}
 });
 // the frying pans: using one flips (frying-pan.js)
 event.itemComponentRegistry.registerCustomComponent('cooptown:frying_pan',{
  onUse:({source})=>{system.run(()=>useFryingPan(source));}
 });
 // each job's own tools (job-tools.js): using one
 event.itemComponentRegistry.registerCustomComponent('cooptown:job_tool',{
  onUse:({source,itemStack})=>{const item={typeId:itemStack?.typeId};system.run(()=>useJobTool(source,item));}
 });
 // the backpacks (nine colours): using one opens it
 event.itemComponentRegistry.registerCustomComponent('cooptown:open_backpack',{
  onUse:({source})=>{system.run(()=>openBackpack(source));}
 });
 // the experiment cauldron's recipe scroll: using it learns the potion for the brewing stand
 // the 支援の護符: using it runs the on activate runes of the gear worn / held (rune-runtime.js)
 event.itemComponentRegistry.registerCustomComponent('cooptown:rune_activate',{
  onUse:({source})=>{system.run(()=>activateRunes(source));}
 });
 event.itemComponentRegistry.registerCustomComponent('cooptown:learn_recipe',{
  onUse:({source})=>{system.run(()=>learnRecipe(source));}
 });
 // the cooking recipe scroll (cook-knowledge.js): using it learns its dish, at the 料理人's craft level
 event.itemComponentRegistry.registerCustomComponent('cooptown:learn_cook',{
  onUse:({source})=>{system.run(()=>{let lv=1;try{lv=game.snapshot(source.id).player.craft?.level??1;}catch{}learnCookScroll(source,[...COOK_RECIPES,...SMOKE_RECIPES],lv);});}
 });
});
world.afterEvents.playerLeave.subscribe(({playerId})=>{active.delete(playerId);lastSwing.delete(playerId);lastBag?.delete(playerId);});

// Staff (admin tag) holding the notebook open the admin menu by swinging it (left click). The swing event is used
// when this script API version has it; hitting a block or a mob always works. One open per SWING_MS.
const SWING_MS=1000,lastSwing=new Map();
const holdsBook=player=>{try{return player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex)?.typeId==='cooptown:guidebook';}catch{return false;}};
export function bookSwing(player,now=Date.now()){
 if(player?.typeId!=='minecraft:player'||!isAdmin(player)||!holdsBook(player))return false;
 if(now-(lastSwing.get(player.id)??0)<SWING_MS)return false;
 lastSwing.set(player.id,now);
 system.run(()=>void openAdmin(player));
 return true;
}
// A backpack worn on the back (off hand) opens with a swing while sneaking (one open per SWING_MS).
const lastBag=new Map();
export function backpackSwing(player,now=Date.now()){
 if(player?.typeId!=='minecraft:player'||!player.isSneaking)return false;
 let worn;try{worn=player.getComponent('minecraft:equippable')?.getEquipment('Offhand');}catch{}
 if(!isBackpack(worn?.typeId))return false;
 if(now-(lastBag.get(player.id)??0)<SWING_MS)return false;
 lastBag.set(player.id,now);
 system.run(()=>openBackpack(player,true));
 return true;
}
const onSwing=player=>{if(!backpackSwing(player))bookSwing(player);};
world.afterEvents.playerSwingStart?.subscribe(({player})=>onSwing(player));
world.afterEvents.entityHitBlock.subscribe(({damagingEntity})=>onSwing(damagingEntity));
world.afterEvents.entityHitEntity.subscribe(({damagingEntity})=>onSwing(damagingEntity));
installGame();
setCommandHandlers({menu:player=>openMenu(player)}); // /cooptown:menu (commands.js)
