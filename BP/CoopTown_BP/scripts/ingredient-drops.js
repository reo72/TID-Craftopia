import {world,system,ItemStack} from '@minecraft/server';
import {isPlaced} from './placed-store.js';

// The new cooking ingredients (food-catalog.js 新食材) found in the world, not only bought (asked 2026-10-30; before,
// the book's shop and the よろず屋 were the only way). A player breaking (or picking, for berries) a natural block of a
// FINDS kind may find one beside it: ripe crops give vegetables (twice as often for farmers), leaves fruit and spices,
// grass mint, sand salt. Placed blocks give nothing (placed-store.js), so placing and breaking again does not pay.
const C='cooptown:';
const VEG=[C+'tomato',C+'onion',C+'cabbage',C+'cucumber',C+'corn',C+'soybeans',C+'rice'];
// block id (without minecraft:) -> {chance, items (one at random), ripe: growth state needed, farmer: chance x2 for 農家}
export const FINDS={
 ...Object.fromEntries(['wheat','carrots','potatoes','beetroot'].map(b=>[b,{chance:.06,items:VEG,ripe:7,farmer:true}])),
 sweet_berry_bush:{chance:.1,items:[C+'strawberry'],ripe:2,farmer:true},
 ...Object.fromEntries(['oak_leaves','birch_leaves','cherry_leaves'].map(b=>[b,{chance:.02,items:[C+'lemon']}])),
 jungle_leaves:{chance:.03,items:[C+'coffee_beans',C+'black_pepper']},
 ...Object.fromEntries(['azalea_leaves','azalea_leaves_flowered','flowering_azalea_leaves'].map(b=>[b,{chance:.04,items:[C+'tea_leaves']}])),
 vine:{chance:.05,items:[C+'grape']},
 ...Object.fromEntries(['short_grass','tall_grass','fern','large_fern'].map(b=>[b,{chance:.02,items:[C+'mint']}])),
 ...Object.fromEntries(['sand','red_sand'].map(b=>[b,{chance:.02,items:[C+'salt']}]))};
export const FARMER='農家';
/** What a broken / picked block gives (an item id or undefined). growth: its growth state; farmer: the player is one. */
export function findFor(blockId,growth,farmer,random=Math.random){
 const f=FINDS[String(blockId).replace(/^minecraft:/,'')];if(!f)return undefined;
 if(f.ripe!==undefined&&!((growth??0)>=f.ripe))return undefined;
 if(random()>=f.chance*(f.farmer&&farmer?2:1))return undefined;
 return f.items[Math.floor(random()*f.items.length)%f.items.length];
}
export function installIngredientDrops({game}){
 const isFarmer=player=>{try{const p=game.peek(d=>d.players[player.id]);return [p?.job,p?.secondJob].includes(FARMER);}catch{return false;}};
 const drop=(player,id,dim,at)=>{try{dim.spawnItem(new ItemStack(id,1),{x:at.x+.5,y:at.y+.5,z:at.z+.5});player.playSound('random.orb',{pitch:1.6,volume:.3});}catch{}};
 const growthOf=perm=>{try{return perm.getState('growth');}catch{return undefined;}};
 // placed or not is read before the block goes
 const placed=new Map();
 world.beforeEvents.playerBreakBlock.subscribe(({player,block})=>{
  if(!FINDS[block.typeId.replace(/^minecraft:/,'')])return;
  let p=false;try{p=isPlaced(block.dimension.id,block.location);}catch{}placed.set(player.id,p);
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation:perm})=>{
  const id=perm.type.id;if(!FINDS[id.replace(/^minecraft:/,'')])return;
  const p=placed.get(player.id);placed.delete(player.id);if(p)return;
  const got=findFor(id,growthOf(perm),isFarmer(player));if(got)drop(player,got,block.dimension,block.location);
 });
 // berries are picked by using the bush
 world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  if(ev.isFirstEvent===false||ev.block.typeId!=='minecraft:sweet_berry_bush')return;
  const {player,block}=ev,g=growthOf(block.permutation),dim=block.dimension,at={...block.location};
  const got=findFor(block.typeId,g,isFarmer(player));if(got)system.run(()=>drop(player,got,dim,at));
 });
}
