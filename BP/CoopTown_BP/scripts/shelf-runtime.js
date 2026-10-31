import {world,system,ItemStack,EnchantmentType} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {enchantName,ENCHANT_DESC} from './enchant-config.js';

// The enchanter's bookshelf (form title "ct:shelf"): only the 付与術師 job, empty-handed or holding a book,
// opens it from a bookshelf. A store of enchanted books for each player (the same at every bookshelf); the
// enchanter's craft level opens more of its 24 places (SHELF_STEPS). Books are kept as their enchantments and made
// again when taken out.
// Button order of the screen. Must match tools/build-shelf-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [bk] a book, [em] an empty place, [lk] a locked place (its text: the level), [sel] chosen,
// [off] button disabled; the unlock bar's text holds [p1]..[p20].
export const SHELF_JOB='付与術師';
// craft level -> places (Lv.1-9: 6, 10-19: 12, 20-29: 18, 30+: 24)
export const SHELF_STEPS=[[1,6],[10,12],[20,18],[30,24]];
const PLACES=24,STEPS=20,KEY='cooptown:shelf';
const L={close:0,back:1,slot:2,primary:26,secondary:27,level:28,count:29,shelfTitle:30,icon:31,name:32,desc:33,badge:34,next:35,bar:36,current:37,hint:38,count_:39};
const BOOK_ICON='textures/cooptown/shelf/book';
const active=new Set();
/** Places open at craft level lv. */
export const placesAt=lv=>SHELF_STEPS.filter(([l])=>lv>=l).at(-1)?.[1]??SHELF_STEPS[0][1];
const bare=id=>String(id?.id??id).replace(/^minecraft:/,'');
function storeOf(player){try{const v=JSON.parse(player.getDynamicProperty(KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}
const saveStore=(player,list)=>{try{player.setDynamicProperty(KEY,JSON.stringify(list));}catch{}};
const enchantsOf=item=>{try{return item?.getComponent('minecraft:enchantable')?.getEnchantments()??[];}catch{return [];}};
/** A book as kept: {e:[[id, level]], name?} */
const keepBook=item=>({e:enchantsOf(item).map(x=>[bare(x.type),x.level]),...(item.nameTag?{name:item.nameTag}:{})});
const titleOf=b=>b.name||(b.e.length?enchantName(b.e[0][0],b.e[0][1])+(b.e.length>1?` ほか${b.e.length-1}`:''):'エンチャントの本');
const descOf=b=>b.e.map(([id,lv])=>b.e.length>1?`${enchantName(id,lv)}：${ENCHANT_DESC[id]??''}`:ENCHANT_DESC[id]??'').join('\n');

export function installShelf({game,refreshGame}){
 function render(player,state){
  const {player:p}=refreshGame(player),lv=p.craft?.level??1,cap=placesAt(lv),store=storeOf(player).slice(0,PLACES);
  const container=player.getComponent('minecraft:inventory')?.container;
  const carried=[];for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s?.typeId==='minecraft:enchanted_book'&&enchantsOf(s).length)carried.push(i);}
  const deposit=state.mode==='deposit';
  if(deposit){if(!carried.includes(state.sel))state.sel=carried[0];}else if(!(state.sel<store.length))state.sel=store.length?0:undefined;
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  add('×');add('戻る');
  for(let k=0;k<PLACES;k++){
   if(deposit){const i=carried[k];add(i===undefined?'[em]':(i===state.sel?'[sel]':'')+'[bk]'+titleOf(keepBook(container.getItem(i))));}
   else if(k>=cap)add('[lk]Lv.'+SHELF_STEPS.find(([,n])=>n>k)[0]);
   else if(k<store.length)add((k===state.sel?'[sel]':'')+'[bk]'+titleOf(store[k]));
   else add('[em]');
  }
  const book=deposit?(state.sel!==undefined?keepBook(container.getItem(state.sel)):undefined):store[state.sel];
  const full=store.length>=cap;
  if(deposit){add((book&&!full?'':'[off]')+'預ける');add('保管庫に戻る');}
  else{add((book?'':'[off]')+'取り出す');add('本を預ける');}
  add(`職業 Lv.${lv}`);add(`保管数 ${store.length} / ${cap}`);
  add(deposit?'持ち物のエンチャント本':'エンチャント本の保管庫');
  add(book?' ':'',book?BOOK_ICON:undefined);
  add(book?titleOf(book):deposit?'預けられる本がありません':'本がありません');
  add(book?descOf(book):'');
  add(book?(deposit?'持ち物':'保管中'):'');
  const next=SHELF_STEPS.find(([l])=>l>lv),prev=[...SHELF_STEPS].reverse().find(([l])=>l<=lv)?.[0]??1;
  add(next?`職業 Lv.${next[0]} → 保管枠 ${next[1]}個`:'すべての保管枠が解放済み');
  const lit=next?Math.floor(STEPS*(lv-prev)/Math.max(1,next[0]-prev)):STEPS;
  add(lit?Array.from({length:lit},(_,k)=>`[p${k+1}]`).join(''):'_'); // '_': a lone space reads as a number in the RP
  add(`現在の保管枠 ${cap}個`);
  add(state.notice||(deposit?(full?'§c保管庫がいっぱいです':'預ける本を選んでください'):'本を選んで取り出す'));
  state.notice='';
  return {buttons,carried,store,cap,book};
 }
 function act(player,state,view){
  const container=player.getComponent('minecraft:inventory')?.container,store=storeOf(player);
  if(state.mode==='deposit'){
   if(state.sel===undefined)return '';
   if(store.length>=view.cap)throw new Error('保管庫がいっぱいです');
   const item=container.getItem(state.sel);if(item?.typeId!=='minecraft:enchanted_book')return '';
   const book=keepBook(item);if(!book.e.length)throw new Error('この本は預けられません');
   store.push(book);saveStore(player,store);
   if(item.amount>1){item.amount--;container.setItem(state.sel,item);}else container.setItem(state.sel,undefined);
   jobCount(player,'shelf');
   return '§a預けました：'+titleOf(book);
  }
  const book=store[state.sel];if(!book)return '';
  const out=new ItemStack('minecraft:enchanted_book',1),ench=out.getComponent('minecraft:enchantable');
  if(!ench)throw new Error('本を作れませんでした');
  for(const [id,level] of book.e)ench.addEnchantment({type:new EnchantmentType(id),level});
  if(book.name)out.nameTag=book.name;
  const left=container.addItem(out);if(left)throw new Error('持ち物がいっぱいです'); // nothing was taken out
  store.splice(state.sel,1);saveStore(player,store);
  return '§a取り出しました：'+titleOf(book);
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={mode:'take',sel:undefined,notice:''};let busy=0;
  try{
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:shelf').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    busy=0;const i=result.selection;
    if(i===L.close||i===L.back)return;
    else if(i>=L.slot&&i<L.primary){const k=i-L.slot;if(state.mode==='deposit'){if(view.carried[k]!==undefined)state.sel=view.carried[k];}else if(k<view.store.length&&k<view.cap)state.sel=k;}
    else if(i===L.primary){try{state.notice=act(player,state,view);if(state.mode==='take')state.sel=undefined;}catch(e){state.notice='§c'+(e.message??e);}}
    else if(i===L.secondary){state.mode=state.mode==='deposit'?'take':'deposit';state.sel=undefined;}
   }
  }catch(e){console.warn('[CoopTown] 本棚: '+e);try{player.sendMessage('§c本棚を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player,itemStack}=event;
  if(block.typeId!=='minecraft:bookshelf'||player.isSneaking)return;
  // only with an empty hand or a book: anything else keeps its use (placing blocks against the shelf)
  if(itemStack&&!['minecraft:book','minecraft:enchanted_book'].includes(itemStack.typeId))return;
  // read only here (no saving in a before-event): the saved data as it is
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  if(![p?.job,p?.secondJob].includes(SHELF_JOB))return; // other jobs: the bookshelf stays a plain block
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>void open(player));
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
