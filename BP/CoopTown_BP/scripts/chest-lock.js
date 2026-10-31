import {world,system,ItemStack} from '@minecraft/server';
import {dialog,noticeDialog,chooseDialog,confirmDialog} from './dialog.js';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';

// Chest locks (asked 2026-10-24): a chest, trapped chest, barrel or shulker box a player places is theirs. Only the
// owner and the players they allow can open it; only the owner can break it; explosions leave it. The ways round it
// are closed: a chest placed next to someone else's (it would join into a double chest) and a hopper placed where it
// would pull from someone else's container are taken back. Staff (admin tag) can open everything.
// Settings: sneak and use your own container with an empty hand, or look at it and type /cooptown:chest:
// allow / disallow players, or let everyone open it. Containers placed before this have no owner; their user can
// claim them there.
// Kept per chunk in world dynamic properties (like placed-store.js): key LOCK.prefix + dimension:cx:cz,
// value {"x,y,z": {o: owner id, n: owner name, a: [allowed ids], an: {id: name}, open: everyone}}.
export const LOCK={prefix:'cooptown:lock:',admin:'cooptown_admin'};
export const LOCKABLE=/^minecraft:(chest|trapped_chest|barrel|[a-z_]*shulker_box)$/;
const cache=new Map();
const keyOf=(dim,x,z)=>`${LOCK.prefix}${dim}:${Math.floor(x/16)}:${Math.floor(z/16)}`;
const posOf=({x,y,z})=>`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
function load(key){
 if(cache.has(key))return cache.get(key);
 let v={};try{const raw=world.getDynamicProperty(key);if(typeof raw==='string')v=JSON.parse(raw)??{};}catch{}
 cache.set(key,v);return v;
}
function store(key,v){try{world.setDynamicProperty(key,Object.keys(v).length?JSON.stringify(v):undefined);}catch(e){console.warn('[CoopTown] 鍵の保存: '+e);}}
/** The lock on a block ({o, n, a, an, open}) or undefined. */
export function lockAt(dim,loc){return load(keyOf(dim,loc.x,loc.z))[posOf(loc)];}
export function setLock(dim,loc,lock){const k=keyOf(dim,loc.x,loc.z),v=load(k);if(lock)v[posOf(loc)]=lock;else delete v[posOf(loc)];store(k,v);}
const isAdmin=p=>{try{return p.hasTag(LOCK.admin);}catch{return false;}};
/** Whether a player may open a locked container. */
export function mayOpen(lock,player){return !lock||lock.open||lock.o===player.id||(lock.a??[]).includes(player.id)||isAdmin(player);}
const SIDES=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
const at=(b,[dx,dy,dz])=>({x:b.location.x+dx,y:b.location.y+dy,z:b.location.z+dz});
// a hopper pulls from the block above it and pushes into the block it faces (sides and below)
const NEAR6=[[0,1,0],[0,-1,0],...SIDES];

// the settings screen (RP tools/build-lock-ui.mjs, form title "ct:lock"); buttons in LOCK_BUTTONS order
export const LOCK_BUTTONS=['title','owner','info','add','remove','open','exit','close'];
/** The screen's buttons for a lock and the names allowed. */
export function lockButtons(lock,allowed){
 const who=lock.open?'誰でも開けられます':allowed.length?allowed.slice(0,6).join('、')+(allowed.length>6?` ほか${allowed.length-6}人`:''):'自分だけ';
 return [(lock.open?'[op]':'[lk]')+'チェストの鍵','持ち主：'+lock.n,`開けられる人：${who}\n§7しゃがんで素手で使うか /cooptown:chest でこの画面を開けます`,
  '[ia]開けられる人を追加',(allowed.length?'':'[off]')+'[ir]開けられる人を外す',lock.open?'[ic]許可した人だけにする':'[io]みんなに開放する','[ie]閉じる','閉じる'];
}
async function showLock(player,buttons){
 const form=new ActionFormData().title('ct:lock').body('');for(const t of buttons)form.button(t);
 for(let busy=0;;busy++){const r=await form.show(player);if(r.canceled&&r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(res=>system.runTimeout(res,10));continue;}return r;}
}
async function settings(player,block){
 const dim=block.dimension.id,loc=block.location;let lock=lockAt(dim,loc);
 if(!lock){
  if(!await confirmDialog(player,'鍵','このチェストにはまだ持ち主がいません。\n自分の物にして鍵をかけますか？',{ok:'自分の物にする'}))return;
  lock={o:player.id,n:player.name,a:[],an:{}};setLock(dim,loc,lock);await noticeDialog(player,'鍵','鍵をかけました。',{close:'閉じる'});return;
 }
 if(lock.o!==player.id&&!isAdmin(player)){await noticeDialog(player,'鍵',`${lock.n} のチェストです。`,{close:'閉じる'});return;}
 for(;;){
  lock=lockAt(dim,loc);if(!lock)return;
  const allowed=(lock.a??[]).map(id=>lock.an?.[id]??'（不明）');
  const r=await showLock(player,lockButtons(lock,allowed));
  if(r.canceled||r.selection===7||r.selection===6)return;
  const i=r.selection-3;if(i<0||i>2)return;
  if(i===0){
   const others=world.getAllPlayers().filter(p=>p.id!==lock.o&&!(lock.a??[]).includes(p.id));
   if(!others.length){await noticeDialog(player,'鍵','追加できるオンラインの人がいません。',{close:'戻る'});continue;}
   const k=await chooseDialog(player,'開けられる人を追加','オンラインの人から選んでください。',others.map(p=>p.name));if(k===undefined)continue;
   const p=others[k];lock.a=[...(lock.a??[]),p.id];lock.an={...(lock.an??{}),[p.id]:p.name};setLock(dim,loc,lock);
   try{p.sendMessage(`§a${lock.n} のチェストを開けられるようになりました。`);}catch{}
  }else if(i===1){
   if(!(lock.a??[]).length){await noticeDialog(player,'鍵','許可した人はいません。',{close:'戻る'});continue;}
   const k=await chooseDialog(player,'開けられる人を外す','外す人を選んでください。',allowed);if(k===undefined)continue;
   const id=lock.a[k];lock.a=lock.a.filter(x=>x!==id);delete lock.an?.[id];setLock(dim,loc,lock);
  }else{lock.open=!lock.open;setLock(dim,loc,lock);}
 }
}
/** /cooptown:chest: the settings of the container the player looks at. */
export function chestCommand(player){
 let hit;try{hit=player.getBlockFromViewDirection({maxDistance:6});}catch{}
 const b=hit?.block;if(!b||!LOCKABLE.test(b.typeId)){player.sendMessage('§eチェストを見ながら使ってください。');return;}
 void settings(player,b);
}
export function installChestLock(){
 const deny=(player,text)=>system.run(()=>{try{player.sendMessage('§c'+text);player.playSound('random.door_close',{pitch:.8,volume:.6});}catch{}});
 // opening: owner, allowed, everyone-open or staff; sneaking with an empty hand opens the settings instead
 world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  const {block,player}=ev;if(!LOCKABLE.test(block.typeId))return;
  const lock=lockAt(block.dimension.id,block.location);
  if(player.isSneaking&&!ev.itemStack){ev.cancel=true;if(ev.isFirstEvent!==false)system.run(()=>void settings(player,block));return;}
  if(!mayOpen(lock,player)){ev.cancel=true;if(ev.isFirstEvent!==false)deny(player,`${lock.n} のチェストです（鍵がかかっています）。`);}
 });
 // breaking: only the owner (staff too); the lock goes with it
 world.beforeEvents.playerBreakBlock.subscribe(ev=>{
  const {block,player}=ev;if(!LOCKABLE.test(block.typeId))return;
  const lock=lockAt(block.dimension.id,block.location);if(!lock)return;
  if(lock.o!==player.id&&!isAdmin(player)){ev.cancel=true;deny(player,`${lock.n} のチェストは壊せません。`);return;}
  const dim=block.dimension.id,loc={...block.location};system.run(()=>setLock(dim,loc,undefined));
 });
 // explosions leave locked containers
 world.beforeEvents.explosion?.subscribe(ev=>{
  try{const blocks=ev.getImpactedBlocks();const keep=blocks.filter(b=>!(LOCKABLE.test(b.typeId)&&lockAt(b.dimension.id,b.location)));if(keep.length!==blocks.length)ev.setImpactedBlocks(keep);}catch{}
 });
 // placing: a new container is the placer's; one next to someone else's container, or a hopper touching one, is taken back
 world.afterEvents.playerPlaceBlock.subscribe(({block,player})=>{
  try{
   const dim=block.dimension;
   const others=list=>list.map(d=>dim.getBlock(at(block,d))).filter(b=>b&&LOCKABLE.test(b.typeId)).map(b=>lockAt(dim.id,b.location)).filter(l=>l&&!mayOpen(l,player));
   if(LOCKABLE.test(block.typeId)){
    const chest=/chest$/.test(block.typeId),blocked=chest?others(SIDES):[];
    if(blocked.length){takeBack(player,block,`${blocked[0].n} のチェストの隣には置けません。`);return;}
    setLock(dim.id,block.location,{o:player.id,n:player.name,a:[],an:{}});
   }else if(block.typeId==='minecraft:hopper'||block.typeId==='minecraft:hopper_minecart'){
    const blocked=others(NEAR6);if(blocked.length)takeBack(player,block,`${blocked[0].n} のチェストにつながるホッパーは置けません。`);
   }
  }catch(e){console.warn('[CoopTown] 鍵: '+e);}
 });
 function takeBack(player,block,text){
  const id=block.typeId;
  system.run(()=>{try{block.setType('minecraft:air');if(String(player.getGameMode?.()).toLowerCase()!=='creative'){const left=player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack(id,1));if(left)player.dimension.spawnItem(left,player.location);}}catch{}});
  deny(player,text);
 }
}
