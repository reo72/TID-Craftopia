import {world,system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {SMOKE_JOB,SMOKE_RULES,SMOKE_TABS,SMOKE_RECIPES,smokeNeeds,smokeSeconds} from './smoke-config.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {recipeIcon} from './workbench-icons.js';
import {timeText,stock,take,give,researchDish} from './cook-runtime.js';
import {knows,hintOf,migrateKnown} from './cook-knowledge.js';
import {COOK_RECIPES} from './cook-config.js';
import {rollQuality,ingredientBonus,rankText} from './quality.js';
import {rankOf,RANKS,COOK_ODDS,oddsWith,rollOdds,oddsText} from './job-rank.js';
import {DISHES} from './food-config.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {playMinigame,scoreBonus} from './minigame.js';
import {dexOf,dexBonus,dexSave,dexEase} from './dexterity.js';
import {titleTrack,titleSeen} from './job-count.js';
import {skillValue} from './skill-config.js';

// The cook's smoker (form title "ct:smoke"): only the 料理人 job can use a smoker. As at the campfire, smoking takes
// the ingredients and runs in real time; the food is handed over the next time the player opens a smoker, and a chat
// line says when it is done. Its own queue, so the campfire and the smoker can work at the same time.
// Button order of the screen. Must match tools/build-smoke-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [on] chosen tab / amount, [sel] chosen food, [ng] not enough, [off] disabled; the gauge's
// text holds [g1]..[g8], one per lit cell.
const PAGE_SIZE=12,ROWS=2,CELLS=8;
const L={tab:0,close:3,back:4,prev:5,next:6,slot:7,amount:19,smoke:22,page:23,icon:24,name:25,state:26,row:27,rowCount:29,time:31,gauge:32,count:33};
const KEY='cooptown:smoke';
const active=new Set();
const CATALOG_IDS=new Set(FOOD_CATALOG.map(e=>e.id));
const iconOf=id=>id==='water'?'textures/items/potion_bottle_drinkable':CATALOG_IDS.has(id)?'textures/cooptown/food/'+id.slice(9):id.startsWith('cooptown:')&&DISHES[id.slice(9)]?'textures/cooptown/dishes/'+id.slice(9):recipeIcon({output:[id,1]});
const itemTexture=type=>{const id=typesOf(type)[0];return id?iconOf(id):undefined;};
const enough=(r,n,have)=>smokeNeeds(r,n).every(([t,c])=>have(t)>=c);
function maxSmoke(r,have){for(let n=SMOKE_RULES.maxBatch;n>0;n--)if(enough(r,n,have))return n;return 0;}
function jobOf(player){try{const v=player.getDynamicProperty(KEY);return typeof v==='string'?JSON.parse(v):undefined;}catch{return undefined;}}
const saveJob=(player,job)=>{try{player.setDynamicProperty(KEY,job?JSON.stringify(job):undefined);}catch{}};
// the job keeps the food's id too, so a change in the recipe list cannot hand over the wrong food
const recipeOfJob=job=>job&&(SMOKE_RECIPES[job.r]?.output[0]===job.id?SMOKE_RECIPES[job.r]:SMOKE_RECIPES.find(r=>r.output[0]===job.id));

export function installSmoker({refreshGame,itemName}){
 function collect(player,container){
  const job=jobOf(player),r=recipeOfJob(job);
  if(!r||Date.now()<job.end)return '';
  give(player,container,r.output[0],r.output[1]*job.n,job.tier??0,job.share??1);
  for(const [id,c] of r.ret??[])give(player,container,id,c*job.n); // honey bottles and the like come back
  saveJob(player,undefined);
  jobCount(player,'cook',job.n);if((job.tier??0)>=2)jobCount(player,'good_dish'); // B or better
  titleTrack(player,'smoked');titleSeen(player,'dishes',r.output[0].replace(/^\w+:/,''));if((job.tier??0)>=4)titleTrack(player,'dish_rank:S'); // titles
  return `§a${r.name} ×${r.output[1]*job.n} ができあがりました`+(job.tier?`（${rankText(job.tier)}§a）`:'');
 }
 function render(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  const list=SMOKE_RECIPES.map((r,i)=>i).filter(i=>SMOKE_RECIPES[i].tab===state.tab),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel))state.sel=shown[0];
  const r=SMOKE_RECIPES[state.sel],job=jobOf(player),busy=!!recipeOfJob(job)&&Date.now()<job.end;
  const max=r?maxSmoke(r,have):0,n=[1,8,max][state.amount];
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  SMOKE_TABS.forEach((t,k)=>add((k===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  // recipes not learned yet (cook-knowledge.js): ？？？ until researched
  for(let j=0;j<PAGE_SIZE;j++){const i=shown[j];if(i===undefined){add('');continue;}const x=SMOKE_RECIPES[i],k=knows(player,x);add((i===state.sel?'[sel]':'')+(!k||maxSmoke(x,have)<1?'[ng]':'')+(k?x.name:'？？？'),k?iconOf(x.output[0]):'textures/cooptown/icons/unknown');}
  const known=!r||knows(player,r);
  ['1個','8個','まとめて'].forEach((t,k)=>add((k===state.amount?'[on]':'')+t));
  if(known)add((r&&!busy&&n>0&&enough(r,n,have)?'':'[off]')+'燻製する');else add((busy||state.lv<(r.level??1)?'[off]':'')+'研究する');
  add(`${state.page+1} / ${pages}`);
  add(r?' ':'',r?(known?iconOf(r.output[0]):'textures/cooptown/icons/unknown'):undefined);
  add(r?(known?r.name:'？？？（未研究のレシピ）'):'');
  if(r&&!known&&!busy){const h=hintOf(r,itemName);add(state.notice||(state.lv<(r.level??1)?`§c${SMOKE_JOB} Lv.${r.level}から研究できます`:`§f研究で覚えるレシピ　§7主な材料：${h.main}・材料は全部で${h.count}種類`));}
  else if(busy){const c=recipeOfJob(job);add(state.notice||`燻製中：${c.name} ×${job.n}　§e残り ${timeText((job.end-Date.now())/1000)}`);}
  else add(state.notice||(r?(state.lv<(r.level??1)?`§c${SMOKE_JOB} Lv.${r.level}から作れます`:state.rank<(r.rank??0)?`§c${RANKS[r.rank]}${SMOKE_JOB}から作れます`:max>0?`§a最大 ${max}個　§7${oddsText(COOK_ODDS[state.rank])}`:'§c材料が足りません'):''));
  // the screen has two rows (the raw food and the fuel): a preserve's extra ingredients are listed under the time
  const all=r?smokeNeeds(r,Math.max(1,n)):[],needs=all.length>2?[all[0],all[all.length-1]]:all,extras=all.slice(1,-1);
  for(let k=0;k<ROWS;k++){const m=needs[k];add(m?ingredientName(m[0],itemName):'',m?itemTexture(m[0]):undefined);}
  for(let k=0;k<ROWS;k++){const m=needs[k];add(m?`${have(m[0])>=m[1]?'§a':'§c'}${have(m[0])} §f/ ${m[1]}`:'');}
  add(r?timeText(smokeSeconds(Math.max(1,n)))+(extras.length?'　§7追加 '+extras.map(([t,c])=>`${ingredientName(t,itemName)}${have(t)>=c?'§a':'§c'}${have(t)}/${c}§7`).join('・'):''):'');
  if(busy){const done=Math.min(1,(Date.now()-job.start)/Math.max(1,job.end-job.start)),lit=Math.floor(done*CELLS);add(lit?Array.from({length:lit},(_,k)=>`[g${k+1}]`).join(''):'_');}
  else add('_'); // '_': a lone space reads as a number in the RP
  state.notice='';
  return {buttons,shown,n,busy};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  let lv=1,dex=10,sk={speed:0,rank:0};try{const pp=refreshGame(player).player;lv=pp.craft?.level??1;dex=dexOf(player,pp);sk={speed:skillValue(pp,SMOKE_JOB,'speed'),rank:skillValue(pp,SMOKE_JOB,'rank')};}catch{} // dex: 器用さ (dexterity.js); sk: the skill tree (skill-config.js)
  try{migrateKnown(player,refreshGame(player).player,[...COOK_RECIPES,...SMOKE_RECIPES]);}catch{}
  const state={dex,sk,tab:0,page:0,sel:undefined,amount:0,notice:'',rank:rankOf(lv),lv};let wait=0;
  try{
   const container=player.getComponent('minecraft:inventory')?.container;
   state.notice=collect(player,container);
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:smoke').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&wait++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    wait=0;const i=result.selection;
    const got=collect(player,container);if(got)state.notice=got;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.amount){const v=view.shown[i-L.slot];if(v!==undefined)state.sel=v;}
    else if(i>=L.amount&&i<L.smoke)state.amount=i-L.amount;
    else if(i===L.smoke){
     const r=SMOKE_RECIPES[state.sel];if(!r)continue;
     if(view.busy){state.notice='§c燻製中です。できあがるまで待ってください';continue;}
     if(!knows(player,r)){state.notice=await researchDish(player,container,r,state,itemName);continue;}
     if(state.lv<(r.level??1)){state.notice=`§c${SMOKE_JOB} Lv.${r.level}から作れます`;continue;}
     if(state.rank<(r.rank??0)){state.notice=`§c${RANKS[r.rank]}${SMOKE_JOB}から作れます`;continue;}
     const n=view.n;
     if(n<1||!enough(r,n,stock(container))){state.notice='§c材料が足りません';continue;}
     const score=await playMinigame(player,'cook');
     if(!enough(r,n,stock(container))){state.notice='§c材料が足りません';continue;}
     const tiers=[],shares=[],needs=smokeNeeds(r,n);needs.forEach(([t,c],k)=>take(container,t,c,k===0?tiers:undefined,k<needs.length-1?shares:undefined));
     const odds=oddsWith(COOK_ODDS,state.rank,ingredientBonus(tiers)+scoreBonus(score)+dexBonus(state.dex??10)+state.sk.rank),share=shares.length?Math.min(...shares):1;
     const start=Date.now();saveJob(player,{r:state.sel,id:r.output[0],n,start,end:start+smokeSeconds(n)*1000*(1-state.sk.speed),tier:rollOdds(odds),share});
     state.notice=`§a${r.name} ×${n} の燻製を始めました`;
    }
   }
  }catch(e){console.warn('[CoopTown] 燻製機: '+e);try{player.sendMessage('§c燻製機を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:smoker'&&block.typeId!=='minecraft:lit_smoker')return;
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(SMOKE_JOB)){player.sendMessage('§e燻製器は'+SMOKE_JOB+'だけが使えます。');return;}
   void open(player);
  });
 });
 // a chat line when the food is done (checked every 2 seconds)
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){const job=jobOf(player),r=recipeOfJob(job);
   if(r&&!job.told&&now>=job.end){saveJob(player,{...job,told:true});try{player.sendMessage(`§6${r.name} ×${r.output[1]*job.n} ができあがりました。燻製器で受け取ってください。`);}catch{}}}
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
