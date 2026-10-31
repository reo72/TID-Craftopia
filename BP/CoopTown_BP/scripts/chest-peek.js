import {world,system} from '@minecraft/server';
import {dialog} from './dialog.js';
import {ITEM_NAMES} from './game-config.js';
import {lockAt} from './chest-lock.js';

// Staff peek (asked 2026-11-01): staff (admin tag) see what is in the container they look at without opening it, so
// the lid does not move and nobody nearby can tell. The contents are read by script and shown in a dialog; the block
// itself is never interacted with. View only: nothing is taken or moved.
// Ways to open: /cooptown:peek (any game mode), or in spectator mode press sneak while looking at a container.
export const PEEK={tag:'cooptown_admin',range:48,sneakCooldownMs:1000,pollTicks:2};
const say=(p,t)=>{try{p.sendMessage(t);}catch{}};
const isStaff=p=>{try{return p.hasTag(PEEK.tag);}catch{return false;}};
const isSpectator=p=>{try{return String(p.getGameMode()).toLowerCase()==='spectator';}catch{return false;}};
const nameOf=id=>ITEM_NAMES[id]??String(id).replace(/^minecraft:/,'');
const DIM={'minecraft:overworld':'地上','minecraft:nether':'ネザー','minecraft:the_end':'ジ・エンド'};

/** The container block the player looks at (any block with an inventory: chest, barrel, shulker box, hopper ...). */
export function lookedContainer(player,range=PEEK.range){
 let hit;try{hit=player.getBlockFromViewDirection({maxDistance:range,includePassableBlocks:false});}catch{}
 const block=hit?.block;if(!block)return undefined;
 let box;try{box=block.getComponent('minecraft:inventory')?.container;}catch{}
 return box?{block,box}:undefined;
}
/** One stack as a line: name (renamed: the custom name and the item's own name) ×count. */
export function stackLine(s){
 const base=nameOf(s.typeId);
 return `${s.nameTag?`${s.nameTag}§r（${base}）`:base} ×${s.amount}`;
}
function stackDetail(s,slot){
 const lines=[`スロット ${slot+1}`,`アイテム：${nameOf(s.typeId)}（${s.typeId}）`,`個数：${s.amount}`];
 if(s.nameTag)lines.push(`名前：${s.nameTag}`);
 try{const d=s.getComponent('minecraft:durability');if(d)lines.push(`耐久：${d.maxDurability-d.damage} / ${d.maxDurability}`);}catch{}
 try{const en=s.getComponent('minecraft:enchantable')?.getEnchantments()??[];if(en.length)lines.push('エンチャント：'+en.map(e=>`${String(e.type?.id??e.type).replace(/^minecraft:/,'')} ${e.level}`).join('、'));}catch{}
 try{const lore=s.getLore();if(lore.length)lines.push('説明：',...lore);}catch{}
 return lines.join('\n');
}
const open=new Set();
/** Shows the contents of the looked-at container to a staff member. Returns false when there was nothing to show. */
export async function peekChest(player){
 if(!isStaff(player)){say(player,'§c運営用のコマンドです。');return false;}
 if(open.has(player.id))return false;
 const first=lookedContainer(player);
 if(!first){say(player,'§e見ている先にチェストなどの入れ物がありません（'+PEEK.range+'ブロック以内）。');return false;}
 const {block}=first,where={...block.location},dim=block.dimension;
 open.add(player.id);
 try{
  for(;;){
   // read again each time (更新): the block may have changed meanwhile
   let b,box;try{b=dim.getBlock(where);box=b?.getComponent('minecraft:inventory')?.container;}catch{}
   if(!box){say(player,'§eその入れ物はもうありません。');return true;}
   const slots=[];for(let i=0;i<box.size;i++){const s=box.getItem(i);if(s)slots.push([i,s]);}
   const lock=lockAt(dim.id,where);
   const body=[`${nameOf(b.typeId)}　${DIM[dim.id]??dim.id} ${where.x}, ${where.y}, ${where.z}`,
    `持ち主：${lock?.n??'なし'}${lock?.open?'（誰でも開ける）':''}`,
    `使用中 ${slots.length} / ${box.size} スロット`,'','§7（開けずに見ているので、ふたは動きません）'].join('\n');
   const buttons=[{text:'更新',style:'ok'},...slots.map(([i,s])=>({text:`${i+1}. ${stackLine(s)}`,style:'btn'})),{text:'閉じる',style:'no'}];
   const k=await dialog(player,{title:'中身を見る（運営）',body,buttons});
   if(k===undefined||k===buttons.length-1)return true;
   if(k===0)continue;
   const [slot,s]=slots[k-1];
   const back=await dialog(player,{title:'中身を見る（運営）',body:stackDetail(s,slot),buttons:[{text:'戻る',style:'no'}]});
   if(back===undefined)return true;
  }
 }finally{open.delete(player.id);}
}
// spectator staff: the moment sneak is pressed while looking at a container opens the peek (one per sneakCooldownMs)
const wasSneaking=new Map(),lastPeek=new Map();
system.runInterval(()=>{
 for(const p of world.getAllPlayers()){
  if(!isStaff(p)){wasSneaking.delete(p.id);continue;}
  let now=false;try{now=p.isSneaking;}catch{}
  const before=wasSneaking.get(p.id)??false;wasSneaking.set(p.id,now);
  if(!now||before||open.has(p.id)||!isSpectator(p))continue;
  const t=Date.now();if(t-(lastPeek.get(p.id)??0)<PEEK.sneakCooldownMs)continue;
  if(!lookedContainer(p))continue; // sneak is also how a spectator flies down: only a container in view opens it
  lastPeek.set(p.id,t);
  peekChest(p).catch(e=>console.warn('[CoopTown] のぞき見: '+e));
 }
},PEEK.pollTicks);
world.afterEvents.playerLeave.subscribe(({playerId})=>{wasSneaking.delete(playerId);lastPeek.delete(playerId);open.delete(playerId);});
