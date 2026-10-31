import {world,system} from '@minecraft/server';
import {stateOf,NEAR,EXPIRED} from './freshness.js';

// Food date warnings (asked 2026-10-27): when more foods in the inventory have become 期限間近 (or 期限切れ) than at the
// last check, the player is told once above the hotbar and in chat, with what to do.
export const EXPIRY_NOTICE={everyTicks:200};
/** {near, expired} counts of a container's foods. */
export function countDates(container,now=Date.now()){
 const out={near:0,expired:0};
 for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(!s)continue;const st=stateOf(s,now);if(st===NEAR)out.near+=s.amount;else if(st===EXPIRED)out.expired+=s.amount;}
 return out;
}
export function installExpiryNotice(){
 const last=new Map();
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   let c;try{c=player.getComponent('minecraft:inventory').container;}catch{continue;}
   const now=countDates(c),before=last.get(player.id);last.set(player.id,now);
   if(!before)continue;
   if(now.expired>before.expired)try{player.sendMessage(`§c食べ物が期限切れになりました（${now.expired}個）。§7しゃがんでコンポスターに使うと、まとめて堆肥にできます。`);}catch{}
   else if(now.near>before.near)try{player.onScreenDisplay.setActionBar(`§e期限間近の食べ物があります（${now.near}個）`);player.sendMessage(`§e期限間近の食べ物が${now.near}個あります。§7早めに食べるか、保冷バッグに入れましょう。`);}catch{}
  }
 },EXPIRY_NOTICE.everyTicks);
 world.afterEvents.playerLeave.subscribe(({playerId})=>last.delete(playerId));
}
