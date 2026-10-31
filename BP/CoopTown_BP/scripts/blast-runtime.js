import {world,system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {BLAST_JOB,BLAST_RULES,BLAST_TABS,BLAST_RECIPES,blastNeeds,blastSeconds} from './blast-config.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {recipeIcon} from './workbench-icons.js';
import {timeText,stock,take,give} from './cook-runtime.js';
import {titleTrack,titleSeen} from './job-count.js';

// The blacksmith's blast furnace (form title "ct:blast"): only the 鍛冶師 job can use a blast furnace. As at the
// smoker, smelting takes the items and runs in real time; the result is handed over the next time the player opens
// a blast furnace, and a chat line says when it is done. Its own queue.
// Button order of the screen. Must match tools/build-blast-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [on] chosen tab / amount, [sel] chosen item, [ng] not enough, [off] disabled; the bar's
// text holds [p1]..[p20], one per lit step.
const PAGE_SIZE=12,STEPS=20;
const L={tab:0,close:3,back:4,prev:5,next:6,slot:7,amount:19,smelt:22,page:23,headIcon:24,headName:25,from:26,to:27,state:28,mat:29,matCount:30,fuel:31,fuelCount:32,time:33,bar:34,count:35};
const KEY='cooptown:blast';
const active=new Set();
// ore blocks have block pictures (the general lookup guesses textures/items/, which they do not have)
const B='textures/blocks/';
const ICONS={'minecraft:iron_ore':B+'iron_ore','minecraft:gold_ore':B+'gold_ore','minecraft:copper_ore':B+'copper_ore',
 'minecraft:deepslate_iron_ore':B+'deepslate/deepslate_iron_ore','minecraft:deepslate_gold_ore':B+'deepslate/deepslate_gold_ore','minecraft:deepslate_copper_ore':B+'deepslate/deepslate_copper_ore',
 'minecraft:nether_gold_ore':B+'nether_gold_ore','minecraft:raw_iron_block':B+'raw_iron_block','minecraft:raw_gold_block':B+'raw_gold_block','minecraft:raw_copper_block':B+'raw_copper_block',
 'minecraft:ancient_debris':B+'ancient_debris_side','minecraft:copper_block':B+'copper_block','minecraft:iron_block':B+'iron_block','minecraft:gold_block':B+'gold_block'};
const iconOf=id=>ICONS[id]??recipeIcon({output:[id,1]});
const itemTexture=type=>{const id=typesOf(type)[0];return id?iconOf(id):undefined;};
const enough=(r,n,have)=>blastNeeds(r,n).every(([t,c])=>have(t)>=c);
function maxBlast(r,have){for(let n=BLAST_RULES.maxBatch;n>0;n--)if(enough(r,n,have))return n;return 0;}
function jobOf(player){try{const v=player.getDynamicProperty(KEY);return typeof v==='string'?JSON.parse(v):undefined;}catch{return undefined;}}
const saveJob=(player,job)=>{try{player.setDynamicProperty(KEY,job?JSON.stringify(job):undefined);}catch{}};
// the job keeps the item's id too, so a change in the recipe list cannot hand over the wrong result
const recipeOfJob=job=>job&&(BLAST_RECIPES[job.r]?.raw===job.raw?BLAST_RECIPES[job.r]:BLAST_RECIPES.find(r=>r.raw===job.raw));

export function installBlastFurnace({refreshGame,itemName}){
 function collect(player,container){
  const job=jobOf(player),r=recipeOfJob(job);
  if(!r||Date.now()<job.end)return '';
  give(player,container,r.output[0],r.output[1]*job.n);
  saveJob(player,undefined);
  jobCount(player,'smelt',job.n);titleTrack(player,'smelt:'+r.output[0].replace('minecraft:',''),r.output[1]*job.n);
  return `§a${itemName(r.output[0])} ×${r.output[1]*job.n} ができあがりました`;
 }
 function render(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  // re-smelting: only the gear the player carries
  const list=BLAST_RECIPES.map((r,i)=>i).filter(i=>BLAST_RECIPES[i].tab===state.tab&&(state.tab!==2||have(BLAST_RECIPES[i].raw)>0));
  const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel))state.sel=shown[0];
  const r=BLAST_RECIPES[state.sel],job=jobOf(player),busy=!!recipeOfJob(job)&&Date.now()<job.end;
  const max=r?maxBlast(r,have):0,n=[1,8,max][state.amount];
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  BLAST_TABS.forEach((t,k)=>add((k===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const i=shown[j];if(i===undefined){add('');continue;}const x=BLAST_RECIPES[i];add((i===state.sel?'[sel]':'')+(maxBlast(x,have)<1?'[ng]':'')+itemName(x.raw),iconOf(x.raw));}
  ['1個','8個','まとめて'].forEach((t,k)=>add((k===state.amount?'[on]':'')+t));
  add((r&&!busy&&n>0&&enough(r,n,have)?'':'[off]')+'精錬する');
  add(`${state.page+1} / ${pages}`);
  add(r?' ':'',r?iconOf(r.output[0]):undefined);
  add(r?itemName(r.output[0]):state.tab===2?'溶かせる装備がありません':'');
  add(r?itemName(r.raw):'',r?iconOf(r.raw):undefined);
  add(r?itemName(r.output[0])+(r.output[1]>1?` ×${r.output[1]}`:''):'',r?iconOf(r.output[0]):undefined);
  if(busy){const c=recipeOfJob(job);add(state.notice||`精錬中：${itemName(c.raw)} ×${job.n}　§e残り ${timeText((job.end-Date.now())/1000)}`);}
  else add(state.notice||(r?(max>0?`§a精錬できます（最大 ${max}個）`:'§c素材が足りません'):''));
  const [[mat,matN],[fuel,fuelN]]=r?blastNeeds(r,Math.max(1,n)):[[],[]];
  add(r?ingredientName(mat,itemName):'',r?itemTexture(mat):undefined);add(r?`${have(mat)>=matN?'§a':'§c'}${have(mat)} §f/ ${matN}`:'');
  add(r?ingredientName(fuel,itemName):'',r?itemTexture(fuel):undefined);add(r?`${have(fuel)>=fuelN?'§a':'§c'}${have(fuel)} §f/ ${fuelN}`:'');
  add(r?'精錬時間 '+timeText(blastSeconds(r,Math.max(1,n))):'');
  if(busy){const done=Math.min(1,(Date.now()-job.start)/Math.max(1,job.end-job.start)),lit=Math.floor(done*STEPS);add(lit?Array.from({length:lit},(_,k)=>`[p${k+1}]`).join(''):'_');}
  else add('_'); // '_': a lone space reads as a number in the RP
  state.notice='';
  return {buttons,shown,n,busy};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:0,page:0,sel:undefined,amount:0,notice:''};let wait=0;
  try{
   const container=player.getComponent('minecraft:inventory')?.container;
   state.notice=collect(player,container);
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:blast').body('');
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
    else if(i>=L.amount&&i<L.smelt)state.amount=i-L.amount;
    else if(i===L.smelt){
     const r=BLAST_RECIPES[state.sel];if(!r)continue;
     if(view.busy){state.notice='§c精錬中です。できあがるまで待ってください';continue;}
     const n=view.n;
     if(n<1||!enough(r,n,stock(container))){state.notice='§c素材が足りません';continue;}
     for(const [t,c] of blastNeeds(r,n))take(container,t,c);
     const start=Date.now();saveJob(player,{r:state.sel,raw:r.raw,n,start,end:start+blastSeconds(r,n)*1000});
     state.notice=`§a${itemName(r.raw)} ×${n} の精錬を始めました`;
    }
   }
  }catch(e){console.warn('[CoopTown] 溶鉱炉: '+e);try{player.sendMessage('§c溶鉱炉を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:blast_furnace'&&block.typeId!=='minecraft:lit_blast_furnace')return;
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(BLAST_JOB)){player.sendMessage('§e溶鉱炉は'+BLAST_JOB+'だけが使えます。');return;}
   void open(player);
  });
 });
 // a chat line when the smelting is done (checked every 2 seconds)
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){const job=jobOf(player),r=recipeOfJob(job);
   if(r&&!job.told&&now>=job.end){saveJob(player,{...job,told:true});try{player.sendMessage(`§6${itemName(r.output[0])} ×${r.output[1]*job.n} ができあがりました。溶鉱炉で受け取ってください。`);}catch{}}}
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
