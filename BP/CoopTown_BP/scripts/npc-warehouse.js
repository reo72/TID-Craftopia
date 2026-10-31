import {world,system,ItemStack} from '@minecraft/server';
import {chooseDialog,noticeDialog} from './dialog.js';
import {TRADE_ITEMS} from './game-config.js';
import {isPlainItem} from './item-desc.js';
import {VAULT,vaultStore,vaultEntries,vaultTake,itemLabel,vaultLog,noteVault} from './warehouse-vault.js';

// The warehouse keeper (倉庫番, asked 2026-10-26): a villager role that runs the shared warehouse (共有倉庫,
// cooperation-engine.js warehouse.deposit / withdraw: plain materials of TRADE_ITEMS, anyone can take them out).
// Deposit picks from what the player carries; withdraw from the stock; amounts are quick choices, done in steps of
// STEP (the engine takes at most 64 at a time).
export const STEP=64;
const ALLOWED=new Set(TRADE_ITEMS);
/** Quick amounts for a count: 1 / 16 / 64 when there are that many, and 全部. [[label, n]] */
export function amountOptions(have){
 const out=[1,16,64].filter(n=>n<have).map(n=>[`${n}個`,n]);
 out.push([`全部（${have}個）`,have]);return out;
}
/** The plain allowed materials a player carries: [[id, count]], most first. */
export function carried(container){
 const counts={};
 for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(!s||!ALLOWED.has(s.typeId)||!isPlainItem(s))continue;counts[s.typeId]=(counts[s.typeId]??0)+s.amount;}
 return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
}
/** The stock with something in it: [[id, count]], most first. */
export const stockOf=warehouse=>Object.entries(warehouse?.items??{}).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
// runs an action n items at a time; resolves to how many went through and the error that stopped it
function inSteps(game,player,action,item,n){
 let done=0,error;
 while(done<n){const k=Math.min(STEP,n-done);try{game.execute(player.id,action,{item,amount:k});done+=k;}catch(e){error=e?.message??String(e);break;}}
 return {done,error};
}
async function pickAmount(player,title,name,have){
 const opts=amountOptions(have),k=await chooseDialog(player,title,`${name}　${have}個`,opts.map(o=>o[0]));
 return k===undefined?undefined:opts[k][1];
}
/** The keeper's three errands: deposit / withdraw / look. */
export async function keeperDeposit(player,name,{game,refreshGame,itemName}){
 const list=carried(player.getComponent('minecraft:inventory')?.container);
 if(!list.length){await noticeDialog(player,name,'預けられる素材を持っていないようだね。\n名前や特別な効果のない素材を預かるよ。',{close:'戻る'});return;}
 const k=await chooseDialog(player,'倉庫に預ける','どれを預ける？　預けた素材はみんなが使えるよ。',list.map(([id,n])=>`${itemName(id)}　×${n}`));if(k===undefined)return;
 const [id,have]=list[k],n=await pickAmount(player,'預ける数',itemName(id),have);if(n===undefined)return;
 const r=inSteps(game,player,'warehouse.deposit',id,n);refreshGame(player);
 try{if(r.done)player.playSound('random.orb',{pitch:1.2,volume:.5});}catch{}
 await noticeDialog(player,name,(r.done?`${itemName(id)}を${r.done}個預かったよ。`:'')+(r.error?`\n§c${r.error}`:''),{close:'戻る'});
}
// everything in the warehouse for lists: the counted materials, then the vault's stacks (kept as they are)
function allStock(refreshGame,player,itemName){
 const counted=stockOf(refreshGame(player).warehouse).map(([id,n])=>({kind:'count',id,n,label:`${itemName(id)}　×${n}`}));
 const kept=vaultEntries().map(e=>({kind:'vault',entry:e,n:e.item.amount,label:`${itemLabel(e.item,itemName)}　×${e.item.amount}`}));
 return [...counted,...kept];
}
export async function keeperWithdraw(player,name,{game,refreshGame,itemName}){
 const list=allStock(refreshGame,player,itemName);
 if(!list.length){await noticeDialog(player,name,'倉庫は今からっぽだよ。',{close:'戻る'});return;}
 const k=await chooseDialog(player,'倉庫から受け取る','どれを持っていく？',list.map(x=>x.label));if(k===undefined)return;
 const x=list[k],n=x.n>1?await pickAmount(player,'受け取る数',x.label,x.n):1;if(n===undefined)return;
 let text;
 if(x.kind==='count'){
  const r=inSteps(game,player,'warehouse.withdraw',x.id,n);refreshGame(player);
  text=(r.done?`${itemName(x.id)}を${r.done}個渡したよ。`:'')+(r.error?`\n§c${r.error}`:'');if(r.done)try{player.playSound('random.pop',{volume:.6});}catch{}
 }else{
  const s=vaultTake(x.entry,n);
  if(!s)text='§cもう誰かが持っていったみたいだ。';
  else{const label=`${itemLabel(s,itemName)}×${s.amount}`;give(player,s);noteVault(player.name,`${label} を受け取った`);text=`${label}を渡したよ。`;try{player.playSound('random.pop',{volume:.6});}catch{}}
 }
 await noticeDialog(player,name,text,{close:'戻る'});
}
/** 倉庫の中を見る / 素材を受け取る: opens the browse box on a page of the warehouse. True when it opened. */
export async function keeperBrowse(player,npc,name,{refreshGame,itemName}){
 const pages=pagesOf(allStock(refreshGame,player,itemName));let page=pages[0]??[];
 if(pages.length>1){const k=await chooseDialog(player,name+'の倉庫',`${pages.length}ページあるよ。どこを開く？`,pages.map((p,i)=>`${i+1}ページ目：${p[0].label.replace(/§./g,'').split('　')[0]} ほか${p.length-1}件`));if(k===undefined)return false;page=pages[k];}
 return openDepositBox(player,npc,'browse',page);
}
export async function keeperLook(player,name,{refreshGame,itemName}){
 const w=refreshGame(player).warehouse,list=allStock(refreshGame,player,itemName);
 const log=[...(w?.log??[]).map(v=>({at:v.at,text:`§7${v.name}§r ${itemName(v.text.split(' ')[0])} ${v.text.split(' ').at(-1)}`})),
  ...vaultLog().map(v=>({at:v.at,text:`§7${v.name}§r ${v.text}`}))].sort((a,b)=>(b.at??0)-(a.at??0)).slice(0,5).map(v=>v.text);
 await noticeDialog(player,name+'の倉庫',(list.length?list.slice(0,20).map(x=>x.label).join('\n')+(list.length>20?`\n…ほか${list.length-20}件`:''):'からっぽ')+
  (log.length?'\n\n§l最近の出し入れ§r\n'+log.join('\n'):''),{close:'戻る'});
}

// ---- the keeper's box (asked 2026-10-26: deposit, look and take like a chest) ----
// The player gets an invisible box (entity BOX, its own 27-slot inventory; RP entity/deposit_box.entity.json) that
// stays right in front of their eyes, so using anything opens it like a chest. Only that player can open it.
// deposit (素材を預ける): what they put in goes to the shared warehouse at once (warehouse.store: plain items, counted);
//  anything else (a name, a rank, enchantments, contents...) is kept as it is in the vault (warehouse-vault.js).
// browse (倉庫の中を見る / 素材を受け取る): the box is filled with one page (PAGE) of the warehouse, the items really taken
//  out (warehouse.take, vaultTake) so no one else can take them meanwhile; they take what they want. When the box goes
//  away, what is left in it goes back (and anything they put in is deposited); the log gets what changed hands.
// The box goes away when they sneak, change dimension or leave it alone (idleMs). Only what does not fit anywhere comes
// back to them.
// other features use the same box with their own entity (title) and code: openCustomBox (the backpack: PACK_BOX)
export const PACK_BOX='cooptown:pack_box';
export const BOX='cooptown:deposit_box',BOX_RULES={idleMs:180000,ahead:1.3,everyTicks:10},PAGE=27;
/** Where the box stands for a player: BOX_RULES.ahead blocks along their view from the eyes, centred on that point. */
export function boxSpot(head,dir){const a=BOX_RULES.ahead;return {x:head.x+dir.x*a,y:head.y+dir.y*a-.5,z:head.z+dir.z*a};}
const spotOf=player=>boxSpot(player.getHeadLocation(),player.getViewDirection());
const OWNER='cooptown:box_owner',MODE='cooptown:box_mode';
const BOX_TYPES=new Set([BOX,PACK_BOX]);
const boxes=new Map(); // player id -> {entity, last, mode, loaded: {counted: {id: n}, kept: {label: n}}}
let boxCtx={}; // {game, refreshGame, itemName}, from installDepositBoxes
/** Whether a stack goes into the counted warehouse (else: the vault, as it is). */
// asked 2026-10-26: any item with only its description goes in (the warehouse keeps kinds and counts; a new item comes
// back with its description again). Kept out: what a kind and count cannot hold (contents, which potion, patterns,
// writing, colour), and anything with a name, a rank, enchantments, wear or a date.
export const KEEP_OUT=/(shulker_box|bundle|^minecraft:(splash_|lingering_)?potion$|tipped_arrow|firework|goat_horn|suspicious_stew|banner$|written_book|writable_book|filled_map|enchanted_book|^minecraft:leather_(helmet|chestplate|leggings|boots|horse_armor)$|^cooptown:backpack_|^cooptown:recipe_scroll$)/;
export const storable=s=>!!s&&!KEEP_OUT.test(s.typeId)&&isPlainItem(s);
/** Splits a box's stacks into what is stored and what goes back: {store: [[id, n]], back: [slot]}. */
export function sortBox(stacks){
 const store=[],back=[];
 stacks.forEach((s,i)=>{if(!s)return;if(storable(s))store.push([i,s.typeId,s.amount]);else back.push(i);});
 return {store,back};
}
/** The warehouse's lines in pages of PAGE. */
export const pagesOf=list=>{const out=[];for(let i=0;i<list.length;i+=PAGE)out.push(list.slice(i,i+PAGE));return out;};
/** What changed hands between two tallies ({key: n} loaded, {key: n} back): {took: [[key, n]], put: [[key, n]]}. */
export function tallyDiff(loaded,back){
 const took=[],put=[];
 for(const k of new Set([...Object.keys(loaded),...Object.keys(back)])){const d=(loaded[k]??0)-(back[k]??0);if(d>0)took.push([k,d]);else if(d<0)put.push([k,-d]);}
 return {took,put};
}
const give=(player,stack)=>{try{const left=player.getComponent('minecraft:inventory').container.addItem(stack);if(left)player.dimension.spawnItem(left,player.location);}catch{}};
const containerOf=e=>{try{return e.getComponent('minecraft:inventory').container;}catch{return undefined;}};
const keptLabel=s=>itemLabel(s,boxCtx.itemName??(id=>id));
/** A box for another feature: type = the entity (its name is the chest screen's title); fill(container) puts the
 *  items in; settle(container, player) takes them out when the box goes away (sneak, dimension, or still() false);
 *  sneak: false keeps it open while sneaking (it closes only by still()).
 *  True when it opened. */
export function openCustomBox(player,{type=PACK_BOX,fill,settle,still,sneak=true,name='',sound=true}){
 const old=boxes.get(player.id);if(old?.entity?.isValid)closeBox(player.id,player,'');
 let box;try{box=player.dimension.spawnEntity(type,spotOf(player));}catch(e){console.warn('[CoopTown] 箱: '+e);return false;}
 try{box.setDynamicProperty(OWNER,player.id);box.setDynamicProperty(MODE,'custom');box.nameTag=name;}catch{}
 boxes.set(player.id,{entity:box,last:Date.now(),mode:'custom',custom:{settle,still,sneak}});
 try{fill?.(containerOf(box));}catch(e){console.warn('[CoopTown] 箱: '+e);}
 if(sound)try{player.playSound('random.chestopen',{volume:.6});}catch{}
 return true;
}
/** Opens a box for a player: mode 'deposit', or 'browse' with the warehouse lines to show (allStock entries). */
export function openDepositBox(player,npc,mode='deposit',lines=[]){
 const old=boxes.get(player.id);if(old?.entity?.isValid)closeBox(player.id,player,'');
 let box;try{box=player.dimension.spawnEntity(BOX,spotOf(player));}catch(e){console.warn('[CoopTown] 預け箱: '+e);return false;}
 try{box.setDynamicProperty(OWNER,player.id);box.setDynamicProperty(MODE,mode);box.nameTag='';}catch{} // no name: the chest screen shows its title (RP texts: 共有倉庫)
 const b={entity:box,last:Date.now(),mode,loaded:{counted:{},kept:{}}};
 boxes.set(player.id,b);
 if(mode==='browse')fill(b,player,lines);
 try{player.playSound('random.chestopen',{volume:.6});}catch{}
 return true;
}
function fill(b,player,lines){
 const c=containerOf(b.entity);let slot=0;
 for(const x of lines){
  if(!c||slot>=c.size)break;
  if(x.kind==='count'){
   let n;try{n=Math.min(x.n,new ItemStack(x.id,1).maxAmount);}catch{continue;}
   try{boxCtx.game.execute(player.id,'warehouse.take',{item:x.id,amount:n,silent:true});}catch{continue;}
   c.setItem(slot++,new ItemStack(x.id,n));b.loaded.counted[x.id]=(b.loaded.counted[x.id]??0)+n;
  }else{
   const s=vaultTake(x.entry,x.entry.item.amount);if(!s)continue;
   c.setItem(slot++,s);const k=keptLabel(s);b.loaded.kept[k]=(b.loaded.kept[k]??0)+s.amount;
  }
 }
}
// puts what is left in a browse box back in the warehouse; returns the tallies of what went back
function putBack(b,ownerId,player){
 const c=containerOf(b.entity),back={counted:{},kept:{}};
 for(let i=0;c&&i<c.size;i++){
  const s=c.getItem(i);if(!s)continue;c.setItem(i,undefined);
  if(storable(s)){try{boxCtx.game.execute(ownerId,'warehouse.store',{item:s.typeId,amount:s.amount,silent:true});back.counted[s.typeId]=(back.counted[s.typeId]??0)+s.amount;continue;}catch{}}
  const k=keptLabel(s),n=s.amount,left=vaultStore(s,b.entity);
  if(left){if(player)give(player,left);else b.entity.dimension.spawnItem(left,b.entity.location);}
  const stored=n-(left?.amount??0);if(stored>0)back.kept[k]=(back.kept[k]??0)+stored;
 }
 return back;
}
function closeBox(id,player,text='§7預け箱を片付けたよ。'){
 const b=boxes.get(id);boxes.delete(id);if(!b?.entity?.isValid)return;
 if(b.mode==='custom'){try{b.custom.settle?.(containerOf(b.entity),player,b.entity);}catch(e){console.warn('[CoopTown] 箱: '+e);}try{b.entity.remove();}catch{}return;}
 if(b.mode==='browse'){
  const back=putBack(b,id,player),{itemName}=boxCtx,name=player?.name??'?';
  const c=tallyDiff(b.loaded.counted,back.counted),k=tallyDiff(b.loaded.kept,back.kept);
  for(const [t,n] of c.took)try{boxCtx.game.execute(id,'warehouse.note',{text:`${t} -${n}`});}catch{}
  for(const [t,n] of c.put)try{boxCtx.game.execute(id,'warehouse.note',{text:`${t} +${n}`});}catch{}
  for(const [l,n] of k.took)noteVault(name,`${l}×${n} を受け取った`);
  for(const [l,n] of k.put)noteVault(name,`${l}×${n} を預けた`);
  const took=[...c.took.map(([t,n])=>`${itemName(t)}×${n}`),...k.took.map(([l,n])=>`${l}×${n}`)];
  const put=[...c.put.map(([t,n])=>`${itemName(t)}×${n}`),...k.put.map(([l,n])=>`${l}×${n}`)];
  try{b.entity.remove();}catch{}
  if(player){try{boxCtx.refreshGame?.(player);}catch{}
   try{player.sendMessage((text?text+'\n':'')+(took.length?'§a受け取った：'+took.join('、'):'§7何も受け取らなかったよ。')+(put.length?'\n§a預けた：'+put.join('、'):''));}catch{}}
  return;
 }
 let returned=0;
 try{const c=containerOf(b.entity);for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(!s)continue;c.setItem(i,undefined);returned+=s.amount;
  if(player)give(player,s);else b.entity.dimension.spawnItem(s,b.entity.location);}}catch{}
 try{b.entity.remove();}catch{}
 if(player&&text)try{player.sendMessage(text+(returned?`（入れたままの${returned}個は返したよ）`:''));}catch{}
}
export function installDepositBoxes(ctx){
 boxCtx=ctx;const {game,refreshGame,itemName}=ctx;
 // only its owner opens a box
 world.beforeEvents.playerInteractWithEntity?.subscribe(ev=>{
  if(ev.target?.typeId===VAULT){ev.cancel=true;return;} // the vault is never opened by hand
  if(!BOX_TYPES.has(ev.target?.typeId))return;
  let owner;try{owner=ev.target.getDynamicProperty(OWNER);}catch{}
  if(owner!==ev.player.id){ev.cancel=true;const pl=ev.player;system.run(()=>{try{pl.sendMessage('§eほかの人の預け箱です。');}catch{}});}
 });
 system.runInterval(()=>{
  const now=Date.now(),online=new Map(world.getAllPlayers().map(p=>[p.id,p]));
  for(const [id,b] of [...boxes]){
   const player=online.get(id);
   if(!player||!b.entity?.isValid){closeBox(id,player);continue;}
   if(b.mode==='deposit'){
    const c=containerOf(b.entity);if(!c){closeBox(id,player);continue;}
    const stacks=[];for(let i=0;i<c.size;i++)stacks.push(c.getItem(i));
    const {store,back}=sortBox(stacks),done={},refused=[];
    for(const [i,type,n] of store){
     try{game.execute(id,'warehouse.store',{item:type,amount:n});c.setItem(i,undefined);done[type]=(done[type]??0)+n;}
     catch(e){refused.push(i);}
    }
    // the rest is kept as it is in the vault (warehouse-vault.js); what does not fit comes back
    const kept=[];let full=false;
    for(const i of [...back,...refused]){const s=c.getItem(i);if(!s)continue;c.setItem(i,undefined);
     const label=`${itemLabel(s,itemName)}×${s.amount}`,left=vaultStore(s,b.entity);
     if(left){give(player,left);full=true;}
     if(!left||left.amount<s.amount){kept.push(label);noteVault(player.name,`${label} を預けた`);}}
    const names=[...Object.entries(done).map(([t,n])=>`${itemName(t)}×${n}`),...kept];
    if(names.length){b.last=now;try{refreshGame(player);player.sendMessage('§a共有倉庫に預けました：'+names.join('、'));player.playSound('random.orb',{pitch:1.3,volume:.4});}catch{}}
    if(full){b.last=now;try{player.sendMessage('§e倉庫がいっぱいか、倉庫の場所が読み込まれていないため、一部を持ち物に戻したよ。');}catch{}}
   }
   if(b.mode==='custom'){if(b.entity.dimension.id!==player.dimension.id||(b.custom.still&&!b.custom.still()))closeBox(id,player);continue;}
   if(b.entity.dimension.id!==player.dimension.id||now-b.last>BOX_RULES.idleMs)closeBox(id,player);
  }
 },BOX_RULES.everyTicks);
 // every tick: the box stays in front of the eyes; sneaking puts it away (a custom box: when still() says so)
 system.runInterval(()=>{
  for(const [id,b] of [...boxes]){
   const player=world.getEntity?.(id)??world.getAllPlayers().find(p=>p.id===id);
   if(!player||!b.entity?.isValid)continue;
   if(b.custom?.still&&!b.custom.still()){closeBox(id,player);continue;}
   // a new sneak closes it: one already held when the box opened (the worn backpack opens with sneak) does not count
   const bySneak=!b.custom||b.custom.sneak;
   if(bySneak&&!player.isSneaking)b.armed=true;
   else if(bySneak&&b.armed){closeBox(id,player,'§7しゃがんだので箱を閉じたよ。');continue;}
   try{b.entity.teleport(spotOf(player));}catch{}
  }
 },1);
 // boxes left from before a restart: a browse box's items go back to the warehouse, a deposit box's drop where it stands
 system.runInterval(()=>{
  const mine=new Set([...boxes.values()].map(b=>b.entity?.id));
  for(const dim of ['overworld','nether','the_end'])for(const type of BOX_TYPES)for(const e of world.getDimension(dim).getEntities({type})){
   if(mine.has(e.id))continue;
   let owner,mode;try{owner=e.getDynamicProperty(OWNER);mode=e.getDynamicProperty(MODE);}catch{}
   if(mode==='browse'&&owner)putBack({entity:e},owner,undefined);
   const c=containerOf(e);for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(s){c.setItem(i,undefined);e.dimension.spawnItem(s,e.location);}}
   try{e.remove();}catch{}
  }
 },200);
}
