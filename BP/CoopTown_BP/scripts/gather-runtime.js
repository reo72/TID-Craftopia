import {world,system,ItemStack} from '@minecraft/server';
import {ITEM_NAMES} from './game-config.js';
import {GATHER_BLOCKS,GATHER_ENTITIES,GATHER_RULES} from './gather-config.js';
import {MINE_BLOCKS,pickaxeTier} from './mine-config.js';
import {takePlaced} from './placed-store.js';
import {pushLog,LOG_KINDS} from './hud-log.js';
import {catcherOf,installFishHooks} from './fish-hook.js';
import {titleTrack} from './job-count.js';

// Skill XP events. Gathering: breaking, berry harvesting by hand, shearing sheep. Mining: ores and rocks.
const columns=new Map();
const creative=player=>player.getGameMode()==='Creative';
const dist=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2;
const valid=entity=>typeof entity.isValid==='function'?entity.isValid():entity.isValid;
export function installGather({game,ensure}){
 function award(player,type,count,entity=false,skill='gather'){
  const label=skill==='mine'?'採掘':'採取',color=skill==='mine'?'§b':'§a';
  try{
   ensure(player);
   const r=game.execute(player.id,skill+'.work',{type,count,entity});
   if(r.gain>0)pushLog(player,'xp:'+skill,LOG_KINDS[skill+'Xp'],r.gain);
   if(r.levelUp){player.playSound('random.levelup');pushLog(player,'lv:'+skill+r.level,LOG_KINDS[skill+'Level'],r.level);}
   dropSpecial(player,r.special);
  }catch(e){console.warn(`[CoopTown] ${label}経験値: `+e);}
 }
 // job-only special materials (special-config.js) pop out at the player
 function dropSpecial(player,found){
  for(const id of found??[]){
   try{player.dimension.spawnItem(new ItemStack(id,1),player.location);}catch(e){console.warn('[CoopTown] 特別な素材: '+e);continue;}
   pushLog(player,'special:'+id,LOG_KINDS.special,1,ITEM_NAMES[id]??id);
   try{player.playSound('random.orb');}catch{}
  }
 }
 installFishHooks();
 // Fishing: an item that appears right next to a fishing hook is that hook owner's catch.
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  try{
   if(entity.typeId!=='minecraft:item')return;
   // whose hook landed it (fish-hook.js: remembered hooks, also just after the hook is gone)
   const owner=catcherOf(entity);
   if(!owner||creative(owner))return;
   // junk on the line (the final-day awards' 海のボランティア)
   try{const id=entity.getComponent('minecraft:item')?.itemStack?.typeId??'';if(/^minecraft:(bowl|leather_boots|leather|stick|string|rotten_flesh|bone|ink_sac|tripwire_hook|lily_pad|potion|fishing_rod|bamboo)$/.test(id))titleTrack(owner,'junk_fish');}catch{}
   ensure(owner);const r=game.execute(owner.id,'fish.catch',{});
   if(r.gain>0)pushLog(owner,'xp:gather',LOG_KINDS.gatherXp,r.gain);
   if(r.levelUp){owner.playSound('random.levelup');pushLog(owner,'lv:gather'+r.level,LOG_KINDS.gatherLevel,r.level);}
   dropSpecial(owner,r.special);
  }catch(e){console.warn('[CoopTown] 釣り: '+e);}
 });
 // Mining: only blocks broken with a pickaxe good enough to make them drop.
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation,itemStackBeforeBreak})=>{
  const type=brokenBlockPermutation.type.id,rule=MINE_BLOCKS[type];if(!rule)return;
  try{
   if(takePlaced(block.dimension.id,block.location))return;
   if(creative(player)||pickaxeTier(itemStackBeforeBreak?.typeId)<rule.tier)return;
   award(player,type,1,false,'mine');
  }catch(e){console.warn('[CoopTown] 採掘: '+e);}
 });
 // Sugar cane style columns: everything above the broken block pops without its own event,
 // so record the column before it breaks.
 world.beforeEvents.playerBreakBlock.subscribe(({block,player})=>{
  const type=block.typeId;if(!GATHER_BLOCKS[type]?.stack)return;
  const positions=[];let b=block;
  for(let n=0;n<32&&b?.typeId===type;n++){positions.push({...b.location});b=b.above();}
  columns.set(player.id,{type,positions,bottom:block.below()?.typeId!==type});
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation})=>{
  const type=brokenBlockPermutation.type.id,rule=GATHER_BLOCKS[type];if(!rule)return;
  try{
   const dimension=block.dimension.id;
   if(rule.stack){
    const col=columns.get(player.id);columns.delete(player.id);
    const positions=col?.type===type?col.positions:[block.location];let count=0;
    positions.forEach((pos,n)=>{if(takePlaced(dimension,pos))return;if(n===0&&(col?.bottom??true))return;count++;});
    if(count&&!creative(player))award(player,type,count);
    return;
   }
   if(rule.track&&takePlaced(dimension,block.location))return;
   if(rule.state&&(brokenBlockPermutation.getState(rule.state)??0)<rule.ripe)return;
   if(!creative(player))award(player,type,1);
  }catch(e){console.warn('[CoopTown] 採取: '+e);}
 });
 // Berries picked by using the bush / vine.
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event,rule=GATHER_BLOCKS[block.typeId];
  if(!rule?.interact||event.isFirstEvent===false)return;
  if(event.itemStack?.typeId==='minecraft:bone_meal')return;
  if(rule.state&&(block.permutation.getState(rule.state)??0)<rule.ripe)return;
  const type=block.typeId;system.run(()=>{if(!creative(player))award(player,type,1);});
 });
 // Shearing: count it once the sheep is actually sheared.
 world.beforeEvents.playerInteractWithEntity?.subscribe(({player,target,itemStack})=>{
  const rule=GATHER_ENTITIES[target.typeId];if(!rule||itemStack?.typeId!==rule.tool)return;
  if(target.getComponent('minecraft:is_sheared')||target.getComponent('minecraft:is_baby'))return;
  const type=target.typeId;
  system.runTimeout(()=>{try{if(valid(target)&&target.getComponent('minecraft:is_sheared')&&!creative(player))award(player,type,1,true);}catch{}},2);
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>columns.delete(playerId));
}
