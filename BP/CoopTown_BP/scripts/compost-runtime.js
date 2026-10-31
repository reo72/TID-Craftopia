import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {COMPOST_JOB,COMPOST_RULES,COMPOST_TABS,compostChance,compostTab} from './compost-config.js';
import {isExpired} from './freshness.js';
import {titleTrack} from './job-count.js';
import {recipeIcon} from './workbench-icons.js';

// Replaces the composter's use with the farmer's screen (form title "ct:compost"); only the 農家 job can use a
// composter. The compost belongs to the player (kept on the player, the same at every composter).
// Button order of the screen. Must match tools/build-compost-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [on] chosen tab / amount, [sel] chosen item, [off] button disabled; the gauge's text
// holds [g1]..[g8], one per filled level.
const PAGE_SIZE=12;
const L={tab:0,close:4,back:5,prev:6,next:7,slot:8,amount:20,put:23,collect:24,page:25,icon:26,name:27,count:28,state:29,gauge:30,note:31,count_:32};
const KEY='cooptown:compost';
const active=new Set();
const iconOf=id=>recipeIcon({output:[id,1]});
const levelOf=player=>{try{const v=player.getDynamicProperty(KEY);return Number.isInteger(v)?Math.max(0,Math.min(COMPOST_RULES.full,v)):0;}catch{return 0;}};
const setLevel=(player,v)=>{try{player.setDynamicProperty(KEY,v);}catch{}};

/** Every expired food in the inventory goes in: removed, 1 bone meal per EXPIRED_PER (at least 1). Returns how many. */
export const EXPIRED_PER=4;
export function compostExpired(player,block){
 const c=player.getComponent('minecraft:inventory')?.container;let n=0;
 for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(s&&isExpired(s)){n+=s.amount;c.setItem(i,undefined);}}
 if(!n)return 0;
 const meal=Math.max(1,Math.floor(n/EXPIRED_PER));try{const left=c.addItem(new ItemStack('minecraft:bone_meal',meal));if(left)player.dimension.spawnItem(left,player.location);}catch{}
 try{const l=block?.location??player.location;player.dimension.spawnParticle('minecraft:crop_growth_emitter',{x:l.x+.5,y:l.y+1,z:l.z+.5});player.playSound('block.composter.fill_success');}catch{}
 try{player.sendMessage(`§a期限切れの食べ物${n}個を堆肥にしました（骨粉 ×${meal}）`);}catch{}
 titleTrack(player,'composted_expired',n);return n;
}
export function installComposter({refreshGame,itemName}){
 const bonusOf=p=>{const lv=p?.craft?.level??1;return {chance:Math.min(COMPOST_RULES.maxChanceBonus,lv*COMPOST_RULES.chancePerLevel),extra:Math.min(COMPOST_RULES.maxExtraChance,lv*COMPOST_RULES.extraPerLevel)};};
 function render(player,state){
  const {player:p}=refreshGame(player),container=player.getComponent('minecraft:inventory')?.container,bonus=bonusOf(p);
  // one entry per kind of item carried: {id, n}
  const counts=new Map();
  for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s&&compostChance(s.typeId)>0&&compostTab(s.typeId)===state.tab)counts.set(s.typeId,(counts.get(s.typeId)??0)+s.amount);}
  const list=[...counts.keys()],pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel))state.sel=shown[0];
  const level=levelOf(player),done=level>=COMPOST_RULES.full;
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  COMPOST_TABS.forEach((t,n)=>add((n===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const id=shown[j];add(id?(id===state.sel?'[sel]':'')+itemName(id):'',id?iconOf(id):undefined);}
  ['1個','8個','まとめて'].forEach((t,n)=>add((n===state.amount?'[on]':'')+t));
  add((state.sel&&!done?'':'[off]')+'投入する');
  add((done?'':'[off]')+'骨粉を受け取る');
  add(`${state.page+1} / ${pages}`);
  const id=state.sel,chance=id?Math.min(1,compostChance(id)+bonus.chance):0;
  add(id?' ':'',id?iconOf(id):undefined);
  add(id?itemName(id):'素材がありません');
  add(id?`所持数 ${counts.get(id)}個　§7堆肥になる確率 ${Math.round(chance*100)}%`:'');
  add(done?'§a完成！':level?'発酵中':'からっぽ');
  add(level?Array.from({length:level},(_,k)=>`[g${k+1}]`).join(''):'_'); // '_': a lone space reads as a number in the RP
  add(state.notice||(done?'骨粉を受け取ってください。':id?'有機物を投入して堆肥を作ろう。':'持ち物に堆肥にできる物がありません。'));
  state.notice='';
  return {buttons,shown,chance,counts,bonus};
 }
 function put(player,state,view){
  const container=player.getComponent('minecraft:inventory')?.container,id=state.sel;if(!container||!id)return '';
  let level=levelOf(player);if(level>=COMPOST_RULES.full)throw new Error('堆肥ができています。先に骨粉を受け取ってください');
  const want=Math.min(COMPOST_RULES.amounts[state.amount],view.counts.get(id)??0);
  let used=0,rose=0;
  for(let i=0;i<container.size&&used<want&&level<COMPOST_RULES.full;i++){
   const s=container.getItem(i);if(s?.typeId!==id)continue;
   if(isExpired(s))titleTrack(player,'recycle_expired'); // titles: 冷蔵庫の奥
   while(s.amount>0&&used<want&&level<COMPOST_RULES.full){s.amount--;used++;if(Math.random()<view.chance){level++;rose++;}if(s.amount===0)break;}
   container.setItem(i,s.amount>0?s:undefined);
  }
  setLevel(player,level);
  return `§a${itemName(id)}を${used}個入れました（堆肥 +${rose}）`+(level>=COMPOST_RULES.full?'　§e堆肥ができました！':'');
 }
 function collect(player,view){
  const container=player.getComponent('minecraft:inventory')?.container;
  if(levelOf(player)<COMPOST_RULES.full)throw new Error('まだ堆肥ができていません');
  const n=1+(Math.random()<view.bonus.extra?1:0);
  const left=container.addItem(new ItemStack('minecraft:bone_meal',n));if(left)try{player.dimension.spawnItem(left,player.location);}catch{}
  setLevel(player,0);
  jobCount(player,'bonemeal');
  return `§a骨粉を${n}個受け取りました`+(n>1?'（農家ボーナス）':'');
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:0,page:0,sel:undefined,amount:0,notice:''};let busy=0;
  try{
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:compost').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    busy=0;const i=result.selection;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.amount){const id=view.shown[i-L.slot];if(id)state.sel=id;}
    else if(i>=L.amount&&i<L.put)state.amount=i-L.amount;
    else if(i===L.put||i===L.collect){try{state.notice=i===L.put?put(player,state,view):collect(player,view);}catch(e){state.notice='§c'+(e.message??e);}}
   }
  }catch(e){console.warn('[CoopTown] コンポスター: '+e);try{player.sendMessage('§cコンポスターを開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:composter')return;
  // sneaking with an expired food (anyone, asked 2026-10-27): every expired food carried goes in at once, 1 bone meal per 4
  if(player.isSneaking&&event.itemStack&&isExpired(event.itemStack)){event.cancel=true;if(event.isFirstEvent===false)return;system.run(()=>compostExpired(player,block));return;}
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(COMPOST_JOB)){player.sendMessage('§eコンポスターは'+COMPOST_JOB+'だけが使えます。');return;}
   void open(player);
  });
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
