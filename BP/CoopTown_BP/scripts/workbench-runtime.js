import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {keepDigits} from './form-text.js';
import {WORKBENCH_RECIPES,recipeTier,recipeXp} from './game-config.js';
import {BENCH_TABS,WOODS,WORKBENCH_RULES,typesOf,ingredientName} from './workbench-config.js';
import {gridOf} from './workbench-shapes.js';
import {SPECIAL_TEXTURES} from './cooperation-config.js';
import {recipeIcon} from './workbench-icons.js';
import {isPlainItem} from './item-desc.js';
import {pushLog,itemIcon,LOG_KINDS} from './hud-log.js';
import {upgradeNewRods} from './fishing-rods.js';

// Replaces the vanilla crafting table UI with the job workbench.
const active=new Set();
let usable;
/** Recipe indexes whose item ids exist in this game version (checked once, after startup). */
export function usableRecipes(){
 if(usable)return usable;
 const ok=new Map(),valid=id=>{if(!ok.has(id)){try{new ItemStack(id,1);ok.set(id,true);}catch{ok.set(id,false);}}return ok.get(id);};
 usable=new Set();const skipped=[];
 WORKBENCH_RECIPES.forEach((r,i)=>{const ids=[r.output[0],...(r.extra??[]).map(v=>v[0]),...r.inputs.filter(([t])=>typeof t==='string').map(([t])=>t)];if(ids.every(valid))usable.add(i);else skipped.push(r.name);});
 if(skipped.length)console.warn('[CoopTown] 作業台：存在しないアイテムIDのため非表示 '+skipped.join('、'));
 return usable;
}
export function stock(player){
 const inv=player.getComponent('minecraft:inventory')?.container,counts={};
 for(let i=0;inv&&i<inv.size;i++){const item=inv.getItem(i);if(item&&isPlainItem(item))counts[item.typeId]=(counts[item.typeId]??0)+item.amount;}
 return type=>typesOf(type).reduce((sum,id)=>sum+(counts[id]??0),0);
}
const maxTimes=(r,have)=>Math.min(WORKBENCH_RULES.maxBatch,...r.inputs.map(([t,n])=>Math.floor(have(t)/n)));
// Button order of the "ct:bench" screen. Must match tools/build-bench-ui.mjs in the RP (it draws a slot per button,
// hidden while its text is empty; marks in the text pick its look: [on] [sel] [ng] [lk] [off]).
const PAGE_SIZE=12,MATS=4;
const L={tab:0,close:5,back:6,prev:7,next:8,slot:9,craft:21,page:23,name:24,state:25,cell:26,out:35,outCount:36,mat:37,matCount:41,count:45};
const iconOf=r=>recipeIcon(r)??(SPECIAL_TEXTURES[r.output[0]]?'textures/cooptown/'+SPECIAL_TEXTURES[r.output[0]]:undefined);
const itemTexture=type=>{const id=typesOf(type)[0];return id?iconOf({output:[id,1]}):undefined;};
// Crafted items and craft XP go to the HUD log (bonus outputs are read from the result message).
export function logCraft(player,index,count,message){
 const r=WORKBENCH_RECIPES[index],bonus=Number(/追加の完成品：(\d+)/.exec(message)?.[1]??0);
 pushLog(player,'craft:'+index,LOG_KINDS.craft,r.output[1]*(count+bonus),itemIcon(r.output[0]));
 if(r.rodTier)upgradeNewRods(player,r.rodTier,r.output[1]*(count+bonus),isPlainItem); // a better fishing rod (fishing-rods.js)
 const gain=Number(/クラフト経験値 \+(\d+)/.exec(message)?.[1]??0);
 if(gain>0)pushLog(player,'xp:craft',LOG_KINDS.craftXp,gain);
}
// job recipes open with the job level (the skill tree no longer holds recipes: skill-config.js)
/** Why player data p cannot make recipe r yet ('' when it can). */
export const recipeLock=(r,p)=>recipeTier(r)==='basic'?'':(p.level??1)<(r.jobLevel??1)?`職業Lv.${r.jobLevel}で作れるようになります`:![p.job,p.secondJob].includes(r.job)?r.job+'の職業が必要です':p.craft.level<(r.level??1)?'クラフトLv.'+r.level+'が必要です':'';
// 鍛冶師 recipes are made at the anvil (anvil-runtime.js), not here
export const SMITH_JOB='鍛冶師';
export function installWorkbench({game,refreshGame,itemName}){
 const locked=recipeLock;
 /** The entries of the current tab: recipe indexes, and in 建築 the wood types first ({wood, label, icon}). */
 function entriesFor(state,p){
  const tab=BENCH_TABS[state.tab],all=[...usableRecipes()];
  if(tab.job){const jobs=[p.job,p.secondJob].filter(Boolean);return all.filter(i=>recipeTier(WORKBENCH_RECIPES[i])!=='basic'&&jobs.includes(WORKBENCH_RECIPES[i].job)&&WORKBENCH_RECIPES[i].job!==SMITH_JOB);}
  const basic=all.filter(i=>recipeTier(WORKBENCH_RECIPES[i])==='basic'),cat=i=>WORKBENCH_RECIPES[i].category.split(':')[0];
  if(state.wood)return basic.filter(i=>WORKBENCH_RECIPES[i].category==='wood:'+state.wood);
  const woods=tab.categories.includes('wood')?WOODS.map(([w,label])=>({wood:w,label:label+'の木材',first:basic.find(i=>WORKBENCH_RECIPES[i].category==='wood:'+w)})).filter(v=>v.first!==undefined).map(v=>({...v,icon:recipeIcon({output:['minecraft:'+v.wood+'_planks',1],category:'wood:'+v.wood})})):[];
  return [...woods,...basic.filter(i=>cat(i)!=='wood'&&tab.categories.includes(cat(i)))];
 }
 function render(player,state){
  const {player:p}=refreshGame(player),have=stock(player),list=entriesFor(state,p),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE),recipes=shown.filter(v=>typeof v==='number');
  if(!list.includes(state.sel))state.sel=recipes[0];
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  BENCH_TABS.forEach((t,n)=>add((n===state.tab?'[on]':'')+t.label,t.icon));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const v=shown[j];
   if(v===undefined)add('');
   else if(typeof v==='object')add(v.label,v.icon);
   else{const r=WORKBENCH_RECIPES[v];add((v===state.sel?'[sel]':'')+(locked(r,p)?'[lk]':maxTimes(r,have)<1?'[ng]':'')+r.name,iconOf(r));}}
  const r=WORKBENCH_RECIPES[state.sel];
  if(!r){
   add('');add('');add(`${state.page+1} / ${pages}`);add(list.length?'木の種類を選んでください':'レシピがありません');
   add(list.length?'§f選んだ木の階段・フェンス・ドアなどが並びます':BENCH_TABS[state.tab].job&&p.job==='未選択'?'§f手帳で職業を選ぶと、その職業のレシピが並びます':'');
   for(let k=L.cell;k<L.count;k++)add('');
   return {buttons,shown};
  }
  const max=maxTimes(r,have),lock=locked(r,p),off=lock||max<1?'[off]':'';
  add(off+'1個作成');add(off+'まとめて作成');
  add(`${state.page+1} / ${pages}`);
  add(r.name);
  const gain=recipeXp(r);
  add(state.notice||(lock?'§c'+lock:max>0?`§a作れます（最大 ${max}回）`+(gain?`§f　経験値 ${gain}/回`:''):'§c素材が足りません'));
  for(const i of gridOf(r))add(i<0?'':' ',i<0?undefined:itemTexture(r.inputs[i][0]));
  add(' ',iconOf(r));add(r.output[1]>1?String(r.output[1]):'');
  const mats=r.inputs.slice(0,MATS);
  for(let k=0;k<MATS;k++){const m=mats[k];add(m?ingredientName(m[0],itemName):'',m?itemTexture(m[0]):undefined);}
  for(let k=0;k<MATS;k++){const m=mats[k];add(m?`${have(m[0])>=m[1]?'§a':'§c'}${have(m[0])} §f/ ${m[1]}`:'');}
  state.notice='';
  return {buttons,shown,max};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:0,page:0,sel:undefined,wood:undefined,notice:''};let busy=0;
  try{
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:bench').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    busy=0;const i=result.selection;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;state.wood=undefined;}
    else if(i===L.close)return;
    else if(i===L.back){if(!state.wood)return;state.wood=undefined;state.page=0;state.sel=undefined;}
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.craft){const v=view.shown[i-L.slot];if(typeof v==='object'){state.wood=v.wood;state.page=0;state.sel=undefined;}else if(v!==undefined)state.sel=v;}
    else if((i===L.craft||i===L.craft+1)&&state.sel!==undefined){
     const count=i===L.craft?1:Math.max(1,view.max??1);
     try{const message=game.execute(player.id,'workbench.craft',{recipe:state.sel,count});state.notice='§a'+message.split('\n')[0];logCraft(player,state.sel,count,message);}
     catch(e){state.notice='§c'+(e.message??e);}
    }
   }
  }catch(e){console.warn('[CoopTown] 作業台: '+e);try{player.sendMessage('§c作業台を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event,type=block.typeId;
  if(type!=='minecraft:crafting_table'&&type!=='minecraft:crafter')return;
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  if(type==='minecraft:crafter'){system.run(()=>player.sendMessage('§e自動作業台は使えません。クラフト台を使ってください。'));return;}
  system.run(()=>void open(player));
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
