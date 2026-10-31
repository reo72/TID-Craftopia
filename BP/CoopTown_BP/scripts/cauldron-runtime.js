import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {CAULDRON_JOB,CAULDRON_RULES,KNOWN_KEY,SCROLL_ID,SCROLL_KEY,MATERIALS,EXPERIMENTS,experimentResult} from './cauldron-config.js';
import {recipeIcon} from './workbench-icons.js';
import {timeText,stock,take} from './cook-runtime.js';
import {titleTrack,titleSeen} from './job-count.js';

// The experiment cauldron (form title "ct:cauldron"): only the 調合師 job, empty-handed or holding a material, opens
// it from a cauldron (buckets and bottles keep their use). Three materials go in and are used up; after
// CAULDRON_RULES.seconds the result shows the next time the cauldron is opened: a recipe scroll on success, nothing on
// failure. Using a scroll (learnRecipe, the item's custom component in main.js) teaches the potion for the brewing stand.
// Button order of the screen. Must match tools/build-cauldron-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [sel] chosen material, [ng] none carried, [off] disabled, [ok] / [no] success / failure;
// the bar's text holds [p1]..[p20], one per lit step.
const PAGE_SIZE=9,STEPS=20;
const L={close:0,back:1,prev:2,next:3,slot:4,input:13,experiment:16,receive:17,bar:18,time:19,badge:20,scroll:21,result:22,sub:23,note:24,page:25,count:26};
const JOB_KEY='cooptown:cauldron',SCROLL_ICON='textures/cooptown/cauldron/scroll';
const OPEN_WITH=new Set(MATERIALS);
// research note (Notion: a failure keeps what was tried and gives a hint, and is not a total loss): the player's tried
// combinations with how many materials matched the closest recipe not yet found by them
const NOTE_KEY='cooptown:cauldron_note';
const comboKey=ids=>[...ids].sort().join('|');
function noteOf(player){try{const v=JSON.parse(player.getDynamicProperty(NOTE_KEY)??'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
const saveNote=(player,note)=>{try{player.setDynamicProperty(NOTE_KEY,JSON.stringify(note));}catch{}};
/** How many of three materials belong to the closest recipe the player has not learned (0-3). */
export function closeness(ids,known=[]){let best=0;for(const [name,set] of Object.entries(EXPERIMENTS)){if(known.includes(name))continue;best=Math.max(best,set.filter(x=>ids.includes(x)).length);}return best;}
const active=new Set();
// pictures and names the general lists get wrong or too long for the material cards
const ICONS={'minecraft:fermented_spider_eye':'textures/items/spider_eye_fermented','minecraft:glistering_melon_slice':'textures/items/melon_speckled','minecraft:pufferfish':'textures/items/fish_pufferfish_raw','minecraft:redstone':'textures/items/redstone_dust'};
const SHORT={'minecraft:glowstone_dust':'グロウストーン','minecraft:redstone':'レッドストーン','minecraft:fermented_spider_eye':'発酵クモの目','minecraft:glistering_melon_slice':'きらめくスイカ','minecraft:phantom_membrane':'ファントム膜','minecraft:brown_mushroom':'キノコ'};
const iconOf=id=>ICONS[id]??recipeIcon({output:[id,1]});
function jobOf(player){try{const v=player.getDynamicProperty(JOB_KEY);return typeof v==='string'?JSON.parse(v):undefined;}catch{return undefined;}}
const saveJob=(player,job)=>{try{player.setDynamicProperty(JOB_KEY,job?JSON.stringify(job):undefined);}catch{}};
/** Potion names the player has learned. */
export function knownPotions(player){try{const v=JSON.parse(player.getDynamicProperty(KNOWN_KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}
/** A recipe scroll for a potion. */
export function makeScroll(name,finder){
 const s=new ItemStack(SCROLL_ID,1);
 s.nameTag=`§d${name}のレシピ`;
 try{s.setLore(['§7大釜の実験で見つけたレシピ',...(finder?[`§7発見者：${finder}`]:[]),'§7使うと醸造台で作れるようになる','§7（習得済みなら使っても消えない）']);}catch{}
 s.setDynamicProperty(SCROLL_KEY,name);
 return s;
}
/** Using a scroll: learns its potion and uses the scroll up. */
export function learnRecipe(player){
 const container=player.getComponent('minecraft:inventory')?.container,slot=player.selectedSlotIndex,item=container?.getItem(slot);
 if(item?.typeId!==SCROLL_ID)return;
 const name=item.getDynamicProperty(SCROLL_KEY);
 if(typeof name!=='string'){player.sendMessage('§cこのレシピは読めません。');return;}
 const known=knownPotions(player);
 if(known.includes(name)){player.sendMessage(`§e${name}のポーションはもう覚えています。`);return;}
 known.push(name);try{player.setDynamicProperty(KNOWN_KEY,JSON.stringify(known));}catch{}
 container.setItem(slot,undefined);titleSeen(player,'recipes_learned',name); // titles
 player.sendMessage(`§a${name}のポーションを覚えました。醸造台で作れます。`);
}

export function installCauldron({refreshGame,itemName}){
 function render(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  const pages=Math.ceil(MATERIALS.length/PAGE_SIZE);state.page=Math.min(state.page,pages-1);
  const shown=MATERIALS.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  state.picked=state.picked.filter(id=>have(id)>0);
  const job=jobOf(player),now=Date.now(),busy=!!job&&now<job.end,done=!!job&&now>=job.end;
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const id=shown[j];add(id?(state.picked.includes(id)?'[sel]':'')+(have(id)<1?'[ng]':'')+(SHORT[id]??itemName(id)):'',id?iconOf(id):undefined);}
  const inputs=job?job.set:state.picked;
  for(let k=0;k<CAULDRON_RULES.inputs;k++){const id=inputs[k];add(id?' ':'',id?iconOf(id):undefined);}
  add((!job&&state.picked.length===CAULDRON_RULES.inputs?'':'[off]')+'実験する');
  const note=noteOf(player),known=knownPotions(player),tried=state.picked.length===CAULDRON_RULES.inputs?note[comboKey(state.picked)]:undefined;
  add(done?(job.result?'受け取る':'片付ける'):'[off]受け取る');
  if(busy){const lit=Math.floor(STEPS*(now-job.start)/Math.max(1,job.end-job.start));add(lit?Array.from({length:lit},(_,k)=>`[p${k+1}]`).join(''):'_');}
  else add(done?Array.from({length:STEPS},(_,k)=>`[p${k+1}]`).join(''):'_'); // '_': a lone space reads as a number in the RP
  add(busy?`実験中…　残り ${timeText((job.end-now)/1000)}`:`実験時間 ${timeText(CAULDRON_RULES.seconds)}`);
  add(done?(job.result?'[ok]成功！':'[no]失敗…'):'');
  add(done&&job.result?' ':'',done&&job.result?SCROLL_ICON:undefined);
  add(done?(job.result?`${job.result}のレシピ`:`素材が${job.match??0}つ合っていた`):busy?'実験中…':'素材を3つ選んでください');
  add(done?(job.result?(known.includes(job.result)?'§e習得済みのレシピ（譲渡用）':'レシピアイテムを獲得'):(job.back?`${itemName(job.back)}が1つ戻ってきた`:'研究ノートに記録しました')):busy?'できあがりを待っています':
   tried!==undefined?`§e試し済み：素材が${tried}つ合っていた`:`選んだ素材 ${state.picked.length} / ${CAULDRON_RULES.inputs}`);
  add(state.notice||`研究ノート：試した組み合わせ ${Object.keys(note).length}　発見 ${known.length} / ${Object.keys(EXPERIMENTS).length}`);
  add(`${state.page+1} / ${pages}`);
  state.notice='';
  return {buttons,shown,job,busy,done,have};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={page:0,picked:[],notice:''};let wait=0;
  try{
   const container=player.getComponent('minecraft:inventory')?.container;
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:cauldron').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&wait++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    wait=0;const i=result.selection;
    if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.input){
     const id=view.shown[i-L.slot];if(!id||view.job)continue;
     if(state.picked.includes(id))state.picked=state.picked.filter(x=>x!==id);
     else if(view.have(id)<1)state.notice='§cその素材を持っていません';
     else if(state.picked.length>=CAULDRON_RULES.inputs)state.notice='§c素材は3つまでです（選んだ素材をもう一度押すと外せます）';
     else state.picked.push(id);
    }
    else if(i>=L.input&&i<L.experiment){const k=i-L.input;if(!view.job&&state.picked[k])state.picked.splice(k,1);}
    else if(i===L.experiment){
     if(view.job){state.notice='§c実験中です';continue;}
     if(state.picked.length!==CAULDRON_RULES.inputs){state.notice='§c素材を3つ選んでください';continue;}
     const have=stock(container);if(state.picked.some(id=>have(id)<1)){state.notice='§c素材が足りません';continue;}
     for(const id of state.picked)take(container,id,1);
     const result=experimentResult(state.picked)??null,match=closeness(state.picked,knownPotions(player));
     const note=noteOf(player);note[comboKey(state.picked)]=result?3:match;saveNote(player,note);
     titleSeen(player,'experiment_combos',comboKey(state.picked));if(!result)titleTrack(player,'experiment_fail');else titleSeen(player,'recipes_found',result); // titles
     // a failure gives one of its materials back (the first one put in)
     const start=Date.now();saveJob(player,{set:state.picked,start,end:start+CAULDRON_RULES.seconds*1000,result,match,back:result?undefined:state.picked[0]});
     jobCount(player,'experiment');state.picked=[];state.notice='§a実験を始めました';
    }
    else if(i===L.receive&&view.done){
     if(!view.job.result&&view.job.back){const left=container.addItem(new ItemStack(view.job.back,1));if(left)try{player.dimension.spawnItem(left,player.location);}catch{}}
     if(view.job.result){const left=container.addItem(makeScroll(view.job.result,player.name));if(left)try{player.dimension.spawnItem(left,player.location);}catch{}
      state.notice=`§a${view.job.result}のレシピを受け取りました（使うと覚えます）`;}
     saveJob(player,undefined);
    }
   }
  }catch(e){console.warn('[CoopTown] 大釜: '+e);try{player.sendMessage('§c大釜を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player,itemStack}=event;
  if(block.typeId!=='minecraft:cauldron'||player.isSneaking)return;
  // empty hand or a material only: buckets, bottles and dyes keep the vanilla cauldron use
  if(itemStack&&!OPEN_WITH.has(itemStack.typeId))return;
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(CAULDRON_JOB)){player.sendMessage('§e実験大釜は'+CAULDRON_JOB+'だけが使えます。');return;}
   void open(player);
  });
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
