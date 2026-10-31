import * as mc from '@minecraft/server';
import {isPlainItem} from './item-desc.js';
import {offhandEat} from './food-runtime.js';
const {system,world}=mc;
const EquipmentSlot={Mainhand:'Mainhand',Offhand:'Offhand'};

// /cooptown:offhand (or /scriptevent cooptown:offhand): swaps what the player holds with the off hand. The game only
// keeps items allowed in the off hand there (shield, totem, map, arrows, custom items with allow_off_hand ...); for
// anything else the swap is undone and the player is told.
export function swapOffhand(player){
 const eq=player.getComponent('minecraft:equippable');if(!eq)return '持ち物を読めませんでした。';
 const main=eq.getEquipment(EquipmentSlot.Mainhand),off=eq.getEquipment(EquipmentSlot.Offhand);
 if(!main&&!off)return '手に何も持っていません。';
 eq.setEquipment(EquipmentSlot.Offhand,main);
 // emptying the off hand may also be ignored for such items: clear it with the command (else the item would double)
 if(!main&&eq.getEquipment(EquipmentSlot.Offhand)){try{player.runCommand('replaceitem entity @s slot.weapon.offhand 0 air');}catch{}
  if(eq.getEquipment(EquipmentSlot.Offhand))return '§cオフハンドを空にできませんでした。';}
 // items the game does not normally allow there: the replaceitem command puts any item in the off hand, but only
 // the kind and count travel, so items with a name, lore, enchantments or wear are left alone
 if(main&&eq.getEquipment(EquipmentSlot.Offhand)?.typeId!==main.typeId){
  if(!plain(main)){eq.setEquipment(EquipmentSlot.Offhand,off);return '§c名前・説明・エンチャント付きや、使って減った物はオフハンドに移せません。';}
  try{player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 ${main.typeId} ${main.amount}`);}catch{}
  if(eq.getEquipment(EquipmentSlot.Offhand)?.typeId!==main.typeId){eq.setEquipment(EquipmentSlot.Offhand,off);return '§cそのアイテムはオフハンドに持てません。';}
 }
 eq.setEquipment(EquipmentSlot.Mainhand,off);
 return main?'§aオフハンドに移しました。':'§aオフハンドの物を手に戻しました。';
}
/** True when the item is just its kind and count (nothing the replaceitem command would lose). */
function plain(s){
 try{if(s.nameTag)return false;if(s.getLore().length&&!isPlainItem(s))return false;}catch{} // description lore comes back by itself
 try{const en=s.getComponent('minecraft:enchantable');if(en&&en.getEnchantments().length)return false;}catch{}
 try{const d=s.getComponent('minecraft:durability');if(d&&d.damage>0)return false;}catch{}
 try{if(s.getDynamicPropertyIds?.().length)return false;}catch{}
 return true;
}
const run=player=>system.run(()=>{try{player.sendMessage(swapOffhand(player));}catch(e){console.warn('[CoopTown] オフハンド: '+e);}});
system.beforeEvents?.startup?.subscribe(ev=>{
 const reg=ev.customCommandRegistry;if(!reg)return;
 try{
  reg.registerCommand({name:'cooptown:offhand',description:'手に持ったアイテムをオフハンドと入れ替える',permissionLevel:0,cheatsRequired:false},
   origin=>{const p=origin.sourceEntity;if(p?.typeId==='minecraft:player')run(p);return {status:0};});
 }catch(e){console.warn('[CoopTown] コマンド登録: '+e);}
});
system.afterEvents?.scriptEventReceive?.subscribe(({id,sourceEntity})=>{if(id==='cooptown:offhand'&&sourceEntity?.typeId==='minecraft:player')run(sourceEntity);});

// ---- using the off hand like Java edition (as far as a script can): with an empty main hand,
// right click a block = place the off-hand block on that face; sneak + left click (swing) = eat / drink the off-hand item.
// Blocks that do something when clicked (doors, chests, job stations ...) keep their normal use.
const INTERACTIVE=/door|gate|button|lever|chest|barrel|furnace|smoker|table|anvil|_bed$|shulker|hopper|dispenser|dropper|campfire|composter|cauldron|brewing|bell|lectern|loom|grindstone|stonecutter|smithing|cartography|fletching|noteblock|jukebox|beacon|respawn|crafter|hay_block|bookshelf|sign|repeater|comparator|daylight|cake|flower_pot/;
const REPLACEABLE=new Set(['minecraft:short_grass','minecraft:tall_grass','minecraft:fern','minecraft:large_fern','minecraft:snow_layer','minecraft:dead_bush','minecraft:vine','minecraft:seagrass']);
const FACE={Up:[0,1,0],Down:[0,-1,0],North:[0,0,-1],South:[0,0,1],East:[1,0,0],West:[-1,0,0]};
const isCreative=p=>{try{return String(p.getGameMode()).toLowerCase()==='creative';}catch{return false;}};
const offhandOf=p=>{try{return p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Offhand);}catch{return undefined;}};
/** One fewer of the off-hand item (nothing in creative); `convert` (an empty bottle, bowl ...) is given back. */
function useOne(player,convert){
 if(isCreative(player))return;
 const eq=player.getComponent('minecraft:equippable'),s=eq.getEquipment(EquipmentSlot.Offhand);if(!s)return;
 const left=s.amount-1;
 if(left>0){s.amount=left;eq.setEquipment(EquipmentSlot.Offhand,s);}else eq.setEquipment(EquipmentSlot.Offhand,undefined);
 // an item the game does not allow in the off hand (put there with replaceitem) ignores setEquipment: use the command too
 const now=eq.getEquipment(EquipmentSlot.Offhand);
 if((now?.amount??0)!==left)try{player.runCommand(left>0?`replaceitem entity @s slot.weapon.offhand 0 ${s.typeId} ${left}`:'replaceitem entity @s slot.weapon.offhand 0 air');}catch{}
 if(convert)try{const left=player.getComponent('minecraft:inventory').container.addItem(new mc.ItemStack(convert,1));if(left)player.dimension.spawnItem(left,player.location);}catch{}
}
/** The block placed: the item's block with its direction set from the clicked face and where the player looks. */
function permutationFor(id,face,player,faceLocation){
 let perm=mc.BlockPermutation.resolve(id);
 const yaw=((player.getRotation().y%360)+360)%360,look=yaw<45||yaw>=315?'south':yaw<135?'west':yaw<225?'north':'east';
 const tries=[['pillar_axis',face==='Up'||face==='Down'?'y':face==='East'||face==='West'?'x':'z'],
  ['minecraft:cardinal_direction',look],
  ['minecraft:vertical_half',face==='Down'||(face!=='Up'&&faceLocation&&faceLocation.y>0.5)?'top':'bottom'],
  ['minecraft:block_face',face.toLowerCase()==='up'?'up':face.toLowerCase()==='down'?'down':face.toLowerCase()]];
 for(const [k,v] of tries)try{perm=perm.withState(k,v);}catch{}
 return perm;
}
function place(player,block,face,faceLocation,item){
 const [dx,dy,dz]=FACE[face]??[0,1,0],dim=block.dimension,at={x:block.location.x+dx,y:block.location.y+dy,z:block.location.z+dz};
 const target=dim.getBlock(at);if(!target)return;
 if(!(target.isAir||target.isLiquid||REPLACEABLE.has(target.typeId)))return;
 const c={x:at.x+.5,y:at.y+.5,z:at.z+.5};
 if(dim.getEntities({location:c,maxDistance:1.1}).some(e=>e.typeId!=='minecraft:item'&&e.typeId!=='minecraft:xp_orb'))return; // not inside someone
 try{target.setPermutation(permutationFor(item.typeId,face,player,faceLocation));}catch{return;}
 try{dim.playSound('use.stone',c);}catch{}
 useOne(player);
}
world.beforeEvents?.playerInteractWithBlock?.subscribe(ev=>{
 if(ev.itemStack||ev.isFirstEvent===false)return;
 const {player,block}=ev,off=offhandOf(player);if(!off||!mc.BlockTypes?.get(off.typeId))return;
 if(INTERACTIVE.test(block.typeId)||String(player.getGameMode?.()).toLowerCase()==='adventure')return;
 ev.cancel=true;const face=ev.blockFace,fl=ev.faceLocation;
 system.run(()=>{try{place(player,block,face,fl,off);}catch(e){console.warn('[CoopTown] オフハンド設置: '+e);}});
});
const lastEat=new Map();
function eatOffhand(player){
 if(!player?.isSneaking||player.typeId!=='minecraft:player')return;
 const eq=player.getComponent('minecraft:equippable');if(!eq||eq.getEquipment(EquipmentSlot.Mainhand))return;
 const off=eq.getEquipment(EquipmentSlot.Offhand);if(!off||!offhandEat||/backpack/.test(off.typeId))return;
 const now=Date.now();if(now-(lastEat.get(player.id)??0)<1200)return;lastEat.set(player.id,now);
 system.run(()=>{try{
  const r=offhandEat(player,off);
  if(typeof r==='string'){player.sendMessage(r);return;}
  useOne(player,r.convert);try{player.dimension.playSound('random.burp',player.location);}catch{}
 }catch(e){console.warn('[CoopTown] オフハンド飲食: '+e);}});
}
world.afterEvents?.playerSwingStart?.subscribe(({player})=>eatOffhand(player));
world.afterEvents?.entityHitBlock?.subscribe(({damagingEntity})=>eatOffhand(damagingEntity));
