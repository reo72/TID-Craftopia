import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,ModalFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {COOK_JOB,COOK_RULES,COOK_TABS,COOK_RECIPES,cookSeconds} from './cook-config.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {recipeIcon} from './workbench-icons.js';
import {qualityOf,rollQuality,setQuality,ingredientBonus,rankText} from './quality.js';
import {isExpired,leftShare,shelfHours,stamp} from './freshness.js';
import {ensureInfo,setCreator,infoLines} from './food-lore.js';
const SHELF_OR_FOOD=id=>infoLines(id).length>0; // the cook's name goes on dishes, not on the containers given back
import {rankOf,RANKS,COOK_ODDS,oddsWith,rollOdds,oddsText} from './job-rank.js';
import {DISHES} from './food-config.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {playMinigame,scoreBonus} from './minigame.js';
import {dexOf,dexBonus,dexSave,dexEase} from './dexterity.js';
import {titleTrack,titleSeen} from './job-count.js';
import {titleMax} from './job-count.js';
import {CATALOG_FOOD} from './food-config.js';
import {skillValue} from './skill-config.js';
import {knows,migrateKnown,hintOf,research,scrollFor,inputsOf} from './cook-knowledge.js';
import {SMOKE_RECIPES} from './smoke-config.js';

// The campfire kitchen (form title "ct:cook"): only the 料理人 job can use a campfire. Cooking takes the
// ingredients and runs in real time (also while the screen is closed or the player is away); the dish is handed
// over the next time the player opens a campfire, and a chat line says when it is done.
// Button order of the screen. Must match tools/build-cook-ui.mjs in the RP (a slot per button, hidden while its
// text is empty; marks: [on] chosen tab, [sel] chosen dish, [ng] not enough ingredients, [off] button disabled;
// the progress bar's text holds a mark [p1]..[p20] for each lit step).
const PAGE_SIZE=12,ROWS=5,STEPS=20;
const L={tab:0,close:4,back:5,prev:6,next:7,slot:8,cook:20,page:22,icon:23,name:24,made:25,ing:26,ingCount:31,time:36,progress:37,bar:38,count:39};
const KEY='cooptown:cook';
const CAMPFIRES=new Set(['minecraft:campfire','minecraft:soul_campfire']);
// held items that keep the vanilla campfire use (light, put out, place blocks)
const VANILLA_USE=/_shovel$|^minecraft:(flint_and_steel|fire_charge|water_bucket|splash_potion)$/;
const active=new Set();

const CATALOG_IDS=new Set(FOOD_CATALOG.map(e=>e.id));
const iconOf=id=>id==='water'?'textures/items/potion_bottle_drinkable':CATALOG_IDS.has(id)?'textures/cooptown/food/'+id.slice(9):id.startsWith('cooptown:')&&DISHES[id.slice(9)]?'textures/cooptown/dishes/'+id.slice(9):recipeIcon({output:[id,1]});
// a bottle of water counts as the ingredient 'water' (the catalogue's 水入り瓶): a minecraft:potion that holds water
const keyOf=s=>{if(s.typeId!=='minecraft:potion')return s.typeId;let c;try{c=s.getComponent('minecraft:potion');}catch{}return !c||/(^|:)water$/i.test(String(c.potionEffectType?.id??''))?'water':s.typeId;};
const itemTexture=type=>{const id=typesOf(type)[0];return id?iconOf(id):undefined;};
export const timeText=s=>{s=Math.max(0,Math.ceil(s));return s<60?`${s}秒`:`${Math.floor(s/60)}分`+(s%60?`${s%60}秒`:'');};
export function stock(container){
 const counts={};
 for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s&&!isExpired(s)){const k=keyOf(s);counts[k]=(counts[k]??0)+s.amount;}} // expired food is no ingredient
 return type=>typesOf(type).reduce((sum,id)=>sum+(counts[id]??0),0);
}
/** Takes n of an ingredient (never expired food); tiers (optional) collects the quality of each one taken (quality.js),
 *  shares (optional) the share of shelf life each dated food had left (freshness.js). */
export function take(container,type,n,tiers,shares){
 const ids=typesOf(type);
 for(let i=0;i<container.size&&n>0;i++){const s=container.getItem(i);if(!s||!ids.includes(keyOf(s))||isExpired(s))continue;const used=Math.min(n,s.amount);n-=used;if(tiers){const q=qualityOf(s);for(let k=0;k<used;k++)tiers.push(q);}if(shares&&shelfHours(s.typeId))shares.push(leftShare(s));if(s.amount===used)container.setItem(i,undefined);else{s.amount-=used;container.setItem(i,s);}}
}
/** Gives total of an item, split into stacks (stews stack to 1); what does not fit drops at the player. A food gets
 *  its date: its shelf life x share (the freshest share left among the ingredients that had a date). */
export function give(player,container,id,total,tier=0,share=1){
 while(total>0){
  let stack=new ItemStack(id,1);const n=Math.min(total,stack.maxAmount??64);if(n>1)stack=new ItemStack(id,n);total-=n;setQuality(stack,tier);stamp(stack,Date.now(),share);ensureInfo(stack);if(SHELF_OR_FOOD(id))setCreator(stack,player?.name);
  const left=container.addItem(stack);if(left)try{player.dimension.spawnItem(left,player.location);}catch{}
 }
}
const maxTimes=(r,have)=>Math.min(COOK_RULES.maxBatch,...r.inputs.map(([t,n])=>Math.floor(have(t)/n)));
/** The player's cooking: {r (COOK_RECIPES index), n, start, end (ms), told}, or undefined. */
function jobOf(player){try{const v=player.getDynamicProperty(KEY);return typeof v==='string'?JSON.parse(v):undefined;}catch{return undefined;}}
const saveJob=(player,job)=>{try{player.setDynamicProperty(KEY,job?JSON.stringify(job):undefined);}catch{}};

// 研究する: the player picks the other ingredients; one of the main ingredient and of each pick is used up
const NONE='（選ばない）';
export async function researchDish(player,container,r,state,itemName){
 if(state.lv<(r.level??1))return `§c${COOK_JOB} Lv.${r.level}から研究できます`;
 const main=inputsOf(r)[0][0],have=stock(container);
 if(have(main)<1)return `§c主な材料（${ingredientName(main,itemName)}）が必要です`;
 // what the player carries (not expired), as ingredient keys
 const carried=[];for(let i=0;i<container.size;i++){const s=container.getItem(i);if(!s||isExpired(s))continue;const k=keyOf(s);if(!carried.includes(k))carried.push(k);}
 const names=carried.map(k=>k==='water'?'水入り瓶':itemName(k)),need=inputsOf(r).length-1;
 let picks=[];
 if(need>0){
  const form=new ModalFormData().title('ct:in|料理の研究');
  for(let k=0;k<need;k++)form.dropdown(`材料 ${k+2} / ${need+1}（主な材料：${ingredientName(main,itemName)}）`,[NONE,...names],{defaultValueIndex:0});
  const res=await form.show(player);if(res.canceled)return '研究をやめました';
  picks=res.formValues.map(v=>Number(v)).filter(v=>v>0).map(v=>carried[v-1]);
 }
 // one of each: the main ingredient and the picks
 const counts={};for(const k of [main,...picks])counts[k]=(counts[k]??0)+1;
 for(const [k,n] of Object.entries(counts))if(stock(container)(k)<n)return '§c選んだ材料が足りません';
 for(const [k,n] of Object.entries(counts))take(container,k,n);
 const res=research(player,r,picks);
 try{player.playSound(res.ok?'random.levelup':'random.fizz',{pitch:res.ok?1.3:1,volume:.5});}catch{}
 if(!res.ok)return `§e研究は失敗…　${res.need}種類のうち${res.right}種類が合っていました`;
 jobCount(player,'cook_research');
 const left=container.addItem(scrollFor(r,player));if(left)try{player.dimension.spawnItem(left,player.location);}catch{}
 return `§a研究成功！「${r.name}」を覚えました。§7レシピの巻物（ほかの人に渡せます）を受け取りました`;
}
export function installCooking({refreshGame,itemName}){
 // a finished dish goes into the inventory; returns the notice
 function collect(player,container){
  const job=jobOf(player),r=job&&COOK_RECIPES[job.r];
  if(!r||Date.now()<job.end)return '';
  const tier=job.tier??0;
  give(player,container,r.output[0],r.output[1]*job.n,tier,job.share??1);
  for(const [id,n] of r.extra??[])give(player,container,id,n*job.n);
  saveJob(player,undefined);
  jobCount(player,'cook',job.n);if(tier>=2)jobCount(player,'good_dish'); // B or better
  titleMax(player,'cook_best',tier+1); // 記録 and the week's contest (progress-config.js)
  {const id=r.output[0];titleSeen(player,'dishes',id.replace(/^\w+:/,''));const cat=CATALOG_FOOD?.[id]?.cat;if(cat)titleSeen(player,'cooked_cat',cat);if(tier>=4)titleTrack(player,'dish_rank:S');} // titles
  return `§a${r.name} ×${r.output[1]*job.n} ができあがりました`+(tier?`（${rankText(tier)}§a）`:'');
 }
 function render(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  const list=COOK_RECIPES.map((r,i)=>i).filter(i=>COOK_RECIPES[i].tab===state.tab),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel))state.sel=shown[0];
  const job=jobOf(player),busy=job&&COOK_RECIPES[job.r]&&Date.now()<job.end;
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  COOK_TABS.forEach((t,n)=>add((n===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  // recipes not learned yet (cook-knowledge.js): ？？？ until researched
  for(let j=0;j<PAGE_SIZE;j++){const i=shown[j];if(i===undefined){add('');continue;}const r=COOK_RECIPES[i],k=knows(player,r);add((i===state.sel?'[sel]':'')+(!k||maxTimes(r,have)<1?'[ng]':'')+(k?r.name:'？？？'),k?iconOf(r.output[0]):'textures/cooptown/icons/unknown');}
  const r=COOK_RECIPES[state.sel],known=!r||knows(player,r),max=r&&known?maxTimes(r,have):0,off=busy||max<1?'[off]':'';
  if(known){add(off+'1個調理');add(off+'まとめて調理');}else{add((busy||state.lv<(r.level??1)?'[off]':'')+'研究する');add('[off]まとめて調理');}
  add(`${state.page+1} / ${pages}`);
  if(r&&!known){ // what research has to go on: the main ingredient and how many there are
   const h=hintOf(r,itemName),m=inputsOf(r)[0];
   add(' ','textures/cooptown/icons/unknown');add('？？？（未研究のレシピ）');
   add(state.lv<(r.level??1)?`§c${COOK_JOB} Lv.${r.level}から研究できます`:`§f研究で覚えるレシピ\n§7主な材料：${h.main}\n材料は全部で${h.count}種類`);
   for(let k=0;k<ROWS;k++)add(k===0?ingredientName(m[0],itemName):k<h.count?'？？？':'',k===0?itemTexture(m[0]):undefined);
   for(let k=0;k<ROWS;k++)add(k===0?`${have(m[0])>=1?'§a':'§c'}${have(m[0])} §f/ 1`:'');
   add('§7研究：主な材料と、選んだ材料を1個ずつ使います');
  }else{
  add(r?' ':'',r?iconOf(r.output[0]):undefined);
  add(r?.name??'');
  add(r?(state.lv<(r.level??1)?`§c${COOK_JOB} Lv.${r.level}から作れます`:state.rank<(r.rank??0)?`§c${RANKS[r.rank]}${COOK_JOB}から作れます`:`§fできあがり\n${r.name} ×${r.output[1]}\n§7${oddsText(COOK_ODDS[state.rank])}`):'');
  for(let k=0;k<ROWS;k++){const m=r?.inputs[k];add(m?ingredientName(m[0],itemName):'',m?itemTexture(m[0]):undefined);}
  for(let k=0;k<ROWS;k++){const m=r?.inputs[k];add(m?`${have(m[0])>=m[1]?'§a':'§c'}${have(m[0])} §f/ ${m[1]}`:'');}
  add(r?timeText(cookSeconds(r,1))+(max>1?`§7（まとめて ${timeText(cookSeconds(r,max))}）`:''):'');
  }
  if(busy){
   const c=COOK_RECIPES[job.r],done=Math.min(1,(Date.now()-job.start)/Math.max(1,job.end-job.start)),lit=Math.floor(done*STEPS);
   add(state.notice||`調理中：${c.name} ×${c.output[1]*job.n}　§e残り ${timeText((job.end-Date.now())/1000)}`);
   add(lit?Array.from({length:lit},(_,k)=>`[p${k+1}]`).join(''):'_'); // '_': a lone space reads as a number in the RP (every step showed)
  }else{add(state.notice||'調理待ち');add('_');}
  state.notice='';
  return {buttons,shown,max,busy};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  let lv=1,dex=10,sk={speed:0,rank:0};try{const pp=refreshGame(player).player;lv=pp.craft?.level??1;dex=dexOf(player,pp);sk={speed:skillValue(pp,COOK_JOB,'speed'),rank:skillValue(pp,COOK_JOB,'rank')};}catch{} // dex: 器用さ (dexterity.js); sk: the skill tree (skill-config.js)
  try{migrateKnown(player,refreshGame(player).player,[...COOK_RECIPES,...SMOKE_RECIPES]);}catch{}
  const state={dex,sk,tab:0,page:0,sel:undefined,notice:'',rank:rankOf(lv),lv};let wait=0;
  try{
   const container=player.getComponent('minecraft:inventory')?.container;
   state.notice=collect(player,container);
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:cook').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&wait++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    wait=0;const i=result.selection;
    // a dish that finished while the screen was open
    const got=collect(player,container);if(got)state.notice=got;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.cook){const v=view.shown[i-L.slot];if(v!==undefined)state.sel=v;}
    else if(i===L.cook||i===L.cook+1){
     const r=COOK_RECIPES[state.sel];if(!r)continue;
     if(jobOf(player)&&COOK_RECIPES[jobOf(player).r]){state.notice='§c調理中です。できあがるまで待ってください';continue;}
     if(!knows(player,r)){if(i===L.cook)state.notice=await researchDish(player,container,r,state,itemName);continue;}
     if(state.lv<(r.level??1)){state.notice=`§c${COOK_JOB} Lv.${r.level}から作れます`;continue;}
     if(state.rank<(r.rank??0)){state.notice=`§c${RANKS[r.rank]}${COOK_JOB}から作れます`;continue;}
     const n=i===L.cook?1:view.max;
     if(n<1||maxTimes(r,stock(container))<n){state.notice='§c材料が足りません';continue;}
     const score=await playMinigame(player,'cook'); // 火加減・仕上げ: adds to the dish's quality chance
     if(maxTimes(r,stock(container))<n){state.notice='§c材料が足りません';continue;}
     const tiers=[],shares=[];for(const [t,k] of r.inputs)take(container,t,k*n,tiers,shares);
     // the dish's quality: the cook's rank odds, raised by good ingredients and the minigame (rolled now, shown when done)
     const odds=oddsWith(COOK_ODDS,state.rank,ingredientBonus(tiers)+scoreBonus(score)+dexBonus(state.dex??10)+state.sk.rank),share=shares.length?Math.min(...shares):1;
     const start=Date.now();saveJob(player,{r:state.sel,n,start,end:start+cookSeconds(r,n)*1000*(1-state.sk.speed),tier:rollOdds(odds),share});
     state.notice=`§a${r.name} ×${r.output[1]*n} の調理を始めました`;
    }
   }
  }catch(e){console.warn('[CoopTown] 焚き火キッチン: '+e);try{player.sendMessage('§c焚き火キッチンを開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player,itemStack}=event;
  if(!CAMPFIRES.has(block.typeId))return;
  if(itemStack&&(player.isSneaking||VANILLA_USE.test(itemStack.typeId)))return;
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(COOK_JOB)){player.sendMessage('§e焚き火は料理人だけが使えます。');return;}
   void open(player);
  });
 });
 // a chat line when a dish is done (checked every 2 seconds)
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){const job=jobOf(player),r=job&&COOK_RECIPES[job.r];
   if(r&&!job.told&&now>=job.end){saveJob(player,{...job,told:true});try{player.sendMessage(`§6${r.name} ×${r.output[1]*job.n} ができあがりました。焚き火で受け取ってください。`);}catch{}}}
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
