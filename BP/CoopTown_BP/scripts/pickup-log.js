import {world,system} from '@minecraft/server';
import {pushLog,itemIcon,LOG_KINDS} from './hud-log.js';

// Logs items a player picks up. Bedrock has no stable pickup event, so this compares, every few
// ticks, the item entities that vanished near the player with what grew in their inventory.
// Taking items out of chests or crafting does not count (no item entity vanished).
const POLL_TICKS=4,RADIUS=4;
const state=new Map();
function inventoryCounts(player){
 const inv=player.getComponent('minecraft:inventory')?.container,counts={};
 for(let i=0;inv&&i<inv.size;i++){const item=inv.getItem(i);if(item)counts[item.typeId]=(counts[item.typeId]??0)+item.amount;}
 return counts;
}
function nearbyItems(player){
 const items=new Map();
 for(const entity of player.dimension.getEntities({type:'minecraft:item',location:player.location,maxDistance:RADIUS})){
  const stack=entity.getComponent('minecraft:item')?.itemStack;if(stack)items.set(entity.id,{typeId:stack.typeId,amount:stack.amount});
 }
 return items;
}
/** Pure comparison step, exported for tests: returns [[typeId, amount], ...] picked up. */
export function pickedUp(before,after){
 const vanished={};
 for(const [id,item] of before.items)if(!after.items.has(id))vanished[item.typeId]=(vanished[item.typeId]??0)+item.amount;
 const out=[];
 for(const [typeId,amount] of Object.entries(vanished)){const grew=(after.counts[typeId]??0)-(before.counts[typeId]??0);if(grew>0)out.push([typeId,Math.min(grew,amount)]);}
 return out;
}
export function installPickupLog(){
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   try{
    const now={counts:inventoryCounts(player),items:nearbyItems(player)},before=state.get(player.id);
    state.set(player.id,now);
    if(!before)continue;
    for(const [typeId,amount] of pickedUp(before,now)){
     pushLog(player,'pickup:'+typeId,LOG_KINDS.pickup,amount,itemIcon(typeId));
    }
   }catch(e){console.warn('[CoopTown] 取得ログ: '+e);}
  }
 },POLL_TICKS);
 world.afterEvents.playerLeave.subscribe(({playerId})=>state.delete(playerId));
}
