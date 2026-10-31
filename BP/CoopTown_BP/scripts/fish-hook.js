import {world,system} from '@minecraft/server';

// Who caught an item: fishing hooks are remembered from the moment they are cast (owner = the projectile owner, or
// the nearest player holding a fishing rod), and their last place is kept for a few ticks after they disappear,
// because the catch item can appear after the hook is already gone. fish-runtime.js and gather-runtime.js use
// catcherOf(item entity) instead of looking for a live hook.
const hooks=new Map();  // hook id -> {entity, owner, loc, dim}
const recent=[];        // hooks gone: {owner, loc, dim, tick}
const KEEP_TICKS=10,NEAR=3;
const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2;
function rodHolder(dimension,location){
 try{return dimension.getPlayers({location,maxDistance:32}).filter(p=>p.getComponent('minecraft:inventory')?.container?.getItem(p.selectedSlotIndex)?.typeId==='minecraft:fishing_rod')
  .sort((a,b)=>d2(a.location,location)-d2(b.location,location))[0];}catch{return undefined;}
}
function ownerOf(hook){
 let o;try{o=hook.getComponent('minecraft:projectile')?.owner;}catch{}
 return o?.typeId==='minecraft:player'?o:rodHolder(hook.dimension,hook.location);
}
/** The player whose hook landed this item, or undefined. */
export function catcherOf(item){
 const at=item.location,dim=item.dimension.id;
 for(const h of hooks.values()){if(!h.entity.isValid)continue;let loc;try{loc=h.entity.location;}catch{continue;}if(h.dim===dim&&d2(loc,at)<=NEAR*NEAR)return h.owner??ownerOf(h.entity);}
 const now=system.currentTick;
 for(let i=recent.length-1;i>=0;i--){const r=recent[i];if(now-r.tick>KEEP_TICKS)break;if(r.dim===dim&&d2(r.loc,at)<=NEAR*NEAR)return r.owner;}
 // last resort: a live hook found by search (older behaviour)
 try{const hook=item.dimension.getEntities({type:'minecraft:fishing_hook',location:at,maxDistance:NEAR})[0];if(hook)return ownerOf(hook);}catch{}
 return undefined;
}
/** Whether a player (by id; any player when left out) has a fishing line out now: the titles' 釣り糸を垂らしたまま. */
export function lineOut(id){
 for(const h of hooks.values()){if(!h.entity.isValid)continue;if(id===undefined||h.owner?.id===id)return true;}
 return false;
}
let installed=false;
export function installFishHooks(){
 if(installed)return;installed=true;
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(entity?.typeId!=='minecraft:fishing_hook')return;
  hooks.set(entity.id,{entity,owner:ownerOf(entity),loc:entity.location,dim:entity.dimension.id});
 });
 const gone=(h)=>{recent.push({owner:h.owner,loc:h.loc,dim:h.dim,tick:system.currentTick});while(recent.length>50)recent.shift();};
 world.beforeEvents.entityRemove?.subscribe(({removedEntity})=>{
  const h=hooks.get(removedEntity?.id);if(!h)return;
  try{h.loc=removedEntity.location;}catch{}
  gone(h);hooks.delete(removedEntity.id);
 });
 // keep each hook's place fresh; hooks that vanished without the remove event are kept as recent too
 system.runInterval(()=>{
  for(const [id,h] of hooks){
   if(!h.entity.isValid){gone(h);hooks.delete(id);continue;}
   try{h.loc=h.entity.location;if(!h.owner)h.owner=ownerOf(h.entity);}catch{}
  }
 },1);
}
