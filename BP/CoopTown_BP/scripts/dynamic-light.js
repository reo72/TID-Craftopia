import {world,system} from '@minecraft/server';

// Light from what is held (asked 2026-10-30, "like a shader mod"): Bedrock has no light that moves with a player, so
// while a light (LIGHTS: main hand or off hand) is held, an invisible light block (minecraft:light_block_<level>)
// stands in the air at the player's head, moved along as they walk and taken away when they put the light down or
// leave. Only air is ever replaced, and only our own light block is ever removed. Where the lights stand is kept in
// the world (KEY) so any left after a crash or restart are cleared at start.
export const LIGHTS={'minecraft:torch':14,'minecraft:lantern':15,'minecraft:soul_torch':10,'minecraft:soul_lantern':10,'minecraft:copper_torch':14,
 'minecraft:redstone_torch':7,'minecraft:glowstone':15,'minecraft:sea_lantern':15,'minecraft:shroomlight':15,'minecraft:lit_pumpkin':15,'minecraft:end_rod':14,
 'minecraft:glow_berries':10,'minecraft:lava_bucket':15,'cooptown:miner_lantern':15,'cooptown:master_lantern':15};
export const DYN_LIGHT={everyTicks:2,key:'cooptown:dyn_lights'};
const lightId=level=>'minecraft:light_block_'+Math.max(0,Math.min(15,level));
const isOurLight=id=>/^minecraft:light_block(_\d+)?$/.test(String(id));
/** The brightest light a player holds (main hand or off hand), 0 for none. */
export function heldLight(player){
 let best=0;
 try{const main=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);best=Math.max(best,LIGHTS[main?.typeId]??0);}catch{}
 try{const off=player.getComponent('minecraft:equippable')?.getEquipment('Offhand');best=Math.max(best,LIGHTS[off?.typeId]??0);}catch{}
 return best;
}
export function installDynamicLight(){
 let dirty=false;
 const placed=new Map(); // player id -> {dim, x, y, z, level}
 const save=()=>{if(!dirty)return;try{world.setDynamicProperty(DYN_LIGHT.key,JSON.stringify([...placed.values()]));dirty=false;}catch{}};
 const remove=l=>{try{const b=world.getDimension(l.dim).getBlock(l);if(b&&isOurLight(b.typeId))b.setType('minecraft:air');}catch{}};
 // left over from before (a crash, a restart)
 system.run(()=>{let old=[];try{old=JSON.parse(world.getDynamicProperty(DYN_LIGHT.key)??'[]');}catch{}for(const l of old)remove(l);try{world.setDynamicProperty(DYN_LIGHT.key,'[]');}catch{}});
 const clear=id=>{const l=placed.get(id);if(!l)return;placed.delete(id);remove(l);dirty=true;};
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   const level=heldLight(player),now=placed.get(player.id);
   if(!level){if(now)clear(player.id);continue;}
   let head;try{const h=player.getHeadLocation();head={x:Math.floor(h.x),y:Math.floor(h.y),z:Math.floor(h.z)};}catch{continue;}
   const dim=player.dimension.id;
   if(now&&now.dim===dim&&now.x===head.x&&now.y===head.y&&now.z===head.z&&now.level===level)continue;
   // the head's block, else the feet's: only air (or our light) is used
   let spot;
   for(const p of [head,{...head,y:head.y-1}]){try{const b=player.dimension.getBlock(p);if(b&&(b.typeId==='minecraft:air'||isOurLight(b.typeId))){spot=p;break;}}catch{}}
   if(now)remove(now);placed.delete(player.id);
   if(spot){try{player.dimension.getBlock(spot).setType(lightId(level));placed.set(player.id,{dim,...spot,level});}catch{}}
   dirty=true;
  }
  save();
 },DYN_LIGHT.everyTicks);
 world.beforeEvents.playerLeave.subscribe(({player})=>{const id=player.id;system.run(()=>{clear(id);save();});});
}
