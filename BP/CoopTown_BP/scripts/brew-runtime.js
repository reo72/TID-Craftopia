import {world,system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {BREW_JOB,BREW_RULES,BREW_TABS,BREW_RECIPES,WATER,MODIFIERS,LIQUIDS,brewNeeds,blazeNeeded,brewSeconds,potionIcon} from './brew-config.js';
import {timeText} from './cook-runtime.js';
import {knownPotions} from './cauldron-runtime.js';
import {recipeIcon} from './workbench-icons.js';
import {ItemStack} from '@minecraft/server';
import {setQuality,rankText} from './quality.js';
import {rankOf,RANKS,BREW_ODDS,rollOdds,oddsText,oddsWith} from './job-rank.js';
import {dexOf,dexBonus,dexSave,dexEase} from './dexterity.js';
import {titleTrack,titleSeen} from './job-count.js';
import {setCreator} from './food-lore.js';
import {skillValue} from './skill-config.js';

// Replaces the brewing stand's screen with the alchemist's (form title "ct:brew"); only the 調合師 job can
// use a brewing stand. Brewing takes the ingredients and runs in real time (also while the screen is closed); the
// potions are handed over the next time the player opens a brewing stand, and a chat line says when they are done.
// Button order of the screen. Must match tools/build-brew-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [on] chosen tab / option, [sel] chosen potion, [ng] not enough, [off] disabled; the
// progress bar's text holds [p1]..[p20], one per lit step.
const PAGE_SIZE=12,ROWS=6,STEPS=20;
const L={tab:0,close:4,back:5,prev:6,next:7,slot:8,mod:20,liq:23,amount:26,brew:29,page:30,icon:31,name:32,state:33,row:34,rowCount:40,time:46,bar:47,count:48};
const KEY='cooptown:brew',BLAZE='minecraft:blaze_powder',WATER_ICON='textures/items/potion_bottle_drinkable';
const ICONS={'minecraft:glistering_melon_slice':'textures/items/melon_speckled','minecraft:fermented_spider_eye':'textures/items/spider_eye_fermented','minecraft:pufferfish':'textures/items/fish_pufferfish_raw',
 'minecraft:redstone':'textures/items/redstone_dust','minecraft:web':'textures/blocks/web','minecraft:slime':'textures/blocks/slime','minecraft:stone':'textures/blocks/stone'};
const active=new Set();
const iconOf=id=>id===WATER?WATER_ICON:ICONS[id]??recipeIcon({output:[id,1]});
/** A bottle of water: a minecraft:potion whose potion component says water (no component: taken as water). */
function isWater(item){
 if(item?.typeId!=='minecraft:potion')return false;
 let c;try{c=item.getComponent('minecraft:potion');}catch{}
 return !c||/(^|:)water$/i.test(String(c.potionEffectType?.id??''));
}
function stock(container){
 const counts={};let water=0;
 for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(!s)continue;if(isWater(s))water+=s.amount;else counts[s.typeId]=(counts[s.typeId]??0)+s.amount;}
 return key=>key===WATER?water:counts[key]??0;
}
function take(container,key,n){
 for(let i=0;i<container.size&&n>0;i++){const s=container.getItem(i);if(!s||(key===WATER?!isWater(s):s.typeId!==key))continue;const used=Math.min(n,s.amount);n-=used;if(s.amount===used)container.setItem(i,undefined);else{s.amount-=used;container.setItem(i,s);}}
}
const potionName=(r,m,l)=>r.custom?r.name:`${r.name}のポーション`+(m===1?'（延長）':m===2?' II':'')+LIQUIDS[l].suffix;
const enough=(r,m,l,n,have)=>brewNeeds(r,m,l,n).every(([k,c])=>have(k)>=c)&&have(BLAZE)>=blazeNeeded(n);
function maxBrew(r,m,l,have){for(let n=BREW_RULES.maxBatch;n>0;n--)if(enough(r,m,l,n,have))return n;return 0;}
/** Whether the player's brewing stand is still brewing (the titles' 調合している最中). */
export function isBrewing(player){const j=jobOf(player);return !!j&&Date.now()<j.end;}
function jobOf(player){try{const v=player.getDynamicProperty(KEY);return typeof v==='string'?JSON.parse(v):undefined;}catch{return undefined;}}
const saveJob=(player,job)=>{try{player.setDynamicProperty(KEY,job?JSON.stringify(job):undefined);}catch{}};

export function installBrewing({refreshGame,itemName}){
 const ingredientName=key=>key===WATER?'水入り瓶':itemName(key);
 function collect(player){
  const job=jobOf(player),r=job&&BREW_RECIPES[job.r];
  if(!r||Date.now()<job.end)return '';
  if(r.custom){ // the alchemist's own potions: items with the quality rolled when brewing started
   const container=player.getComponent('minecraft:inventory')?.container;
   // titles; each potion carries its maker (自分で作ったポーション)
   titleSeen(player,'brewed',r.id.replace('cooptown:potion_',''));if((job.tier??0)>=2)titleTrack(player,'potion_good',job.n);if((job.tier??0)>=4)titleTrack(player,'potion_rank:S',job.n); // titles
   for(let k=0;k<job.n;k++){const s=setCreator(setQuality(new ItemStack(r.id,1),job.tier??0),player.name);const left=container?.addItem(s);if(left)try{player.dimension.spawnItem(left,player.location);}catch{}}
  }else{
  const aux=r.aux[MODIFIERS[job.m].key]??r.aux.normal,item=LIQUIDS[job.l].id.replace('minecraft:','');
  try{player.runCommand(`give @s ${item} ${job.n} ${aux}`);}catch(e){console.warn('[CoopTown] 醸造台: '+e);return '§cポーションを渡せませんでした';}
  }
  saveJob(player,undefined);
  jobCount(player,'brew',job.n);
  return `§a${potionName(r,job.m,job.l)} ×${job.n} ができあがりました`+(r.custom&&job.tier?`（${rankText(job.tier)}§a）`:'');
 }
 function render(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  const list=BREW_RECIPES.map((r,i)=>i).filter(i=>BREW_RECIPES[i].tab===state.tab),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
  state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel))state.sel=shown[0];
  // only potions learned from the experiment cauldron's scrolls can be brewed; the others show as ？？？
  const known=new Set(knownPotions(player)),r=BREW_RECIPES[state.sel],learned=!!r&&known.has(r.name),rankOk=!r?.custom||state.rank>=r.rank;
  if(r?.custom)state.liq=0;
  if(r&&r.aux[MODIFIERS[state.mod].key]===undefined)state.mod=0;
  const job=jobOf(player),busy=job&&BREW_RECIPES[job.r]&&Date.now()<job.end;
  const max=r?maxBrew(r,state.mod,state.liq,have):0,n=[1,3,max][state.amount];
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  BREW_TABS.forEach((t,k)=>add((k===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const i=shown[j];if(i===undefined){add('');continue;}const p=BREW_RECIPES[i],k=known.has(p.name);add((i===state.sel?'[sel]':'')+(!k||maxBrew(p,0,0,have)<1?'[ng]':'')+(k?p.name:'？？？'),k?potionIcon(p,0):'textures/items/potion_bottle_empty');}
  MODIFIERS.forEach((m,k)=>add(r?(k===state.mod?'[on]':'')+(r.aux[m.key]===undefined?'[off]':'')+m.label:''));
  LIQUIDS.forEach((q,k)=>add(r?(k===state.liq?'[on]':'')+(r.custom&&k>0?'[off]':'')+q.label:''));
  ['1個','3個','まとめて'].forEach((t,k)=>add((k===state.amount?'[on]':'')+t));
  add((learned&&rankOk&&!busy&&n>0&&enough(r,state.mod,state.liq,n,have)?'':'[off]')+'調合する');
  add(`${state.page+1} / ${pages}`);
  add(r?' ':'',r?potionIcon(r,state.liq):undefined);
  add(r?(learned?potionName(r,state.mod,state.liq):'？？？のポーション'):'');
  if(busy){const c=BREW_RECIPES[job.r];add(state.notice||`調合中：${c.name} ×${job.n}　§e残り ${timeText((job.end-Date.now())/1000)}`);}
  else add(state.notice||(r?(!learned?'§c大釜の実験でレシピを見つけてください':!rankOk?`§c${RANKS[r.rank]}${BREW_JOB}から作れます`:r.custom&&max>0?`§a最大 ${max}本　${oddsText(BREW_ODDS[state.rank])}`:max>0?`§a作れます（最大 ${max}本）`:'§c材料が足りません'):''));
  const needs=r?brewNeeds(r,state.mod,state.liq,Math.max(1,n)):[];
  for(let k=0;k<ROWS;k++){const m=needs[k];add(m?ingredientName(m[0]):'',m?iconOf(m[0]):undefined);}
  for(let k=0;k<ROWS;k++){const m=needs[k];add(m?`${have(m[0])>=m[1]?'§a':'§c'}${have(m[0])} §f/ ${m[1]}`:'');}
  const fuel=blazeNeeded(Math.max(1,n));
  add(r?`${timeText(brewSeconds(Math.max(1,n)))}　§7燃料 ブレイズパウダー ${have(BLAZE)>=fuel?'§a':'§c'}${have(BLAZE)} §7/ ${fuel}`:'');
  if(busy){const done=Math.min(1,(Date.now()-job.start)/Math.max(1,job.end-job.start)),lit=Math.floor(done*STEPS);add(lit?Array.from({length:lit},(_,k)=>`[p${k+1}]`).join(''):'_');} // '_': a lone space reads as a number in the RP
  else add('_');
  state.notice='';
  return {buttons,shown,n,busy};
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  let lv=1,dex=10,sk={speed:0,rank:0};try{const pp=refreshGame(player).player;lv=pp?.craft?.level??1;dex=dexOf(player,pp);sk={speed:skillValue(pp,BREW_JOB,'speed'),rank:skillValue(pp,BREW_JOB,'rank')};}catch{} // dex: 器用さ (dexterity.js); sk: the skill tree (skill-config.js)
  const state={dex,sk,tab:0,page:0,sel:undefined,mod:0,liq:0,amount:0,notice:'',rank:rankOf(lv)};let wait=0;
  try{
   const container=player.getComponent('minecraft:inventory')?.container;
   state.notice=collect(player);
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:brew').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&wait++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    wait=0;const i=result.selection;
    const got=collect(player);if(got)state.notice=got;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.mod){const v=view.shown[i-L.slot];if(v!==undefined)state.sel=v;}
    else if(i>=L.mod&&i<L.liq){const r=BREW_RECIPES[state.sel];if(r&&r.aux[MODIFIERS[i-L.mod].key]!==undefined)state.mod=i-L.mod;else state.notice='§cこのポーションは'+MODIFIERS[i-L.mod].label+'できません';}
    else if(i>=L.liq&&i<L.amount){if(BREW_RECIPES[state.sel]?.custom&&i>L.liq)state.notice='§cこの薬は飲む形だけです';else state.liq=i-L.liq;}
    else if(i>=L.amount&&i<L.brew)state.amount=i-L.amount;
    else if(i===L.brew){
     const r=BREW_RECIPES[state.sel];if(!r)continue;
     if(!knownPotions(player).includes(r.name)){state.notice='§c大釜の実験でレシピを見つけてください';continue;}
     if(r.custom&&state.rank<r.rank){state.notice=`§c${RANKS[r.rank]}${BREW_JOB}から作れます`;continue;}
     if(view.busy){state.notice='§c調合中です。できあがるまで待ってください';continue;}
     const n=view.n,have=stock(container);
     if(n<1||!enough(r,state.mod,state.liq,n,have)){state.notice='§c材料が足りません';continue;}
     for(const [k,c] of brewNeeds(r,state.mod,state.liq,n))take(container,k,c);
     take(container,BLAZE,blazeNeeded(n));
     const start=Date.now();saveJob(player,{r:state.sel,m:state.mod,l:state.liq,n,start,end:start+brewSeconds(n)*1000*(1-state.sk.speed),...(r.custom?{tier:rollOdds(oddsWith(BREW_ODDS,state.rank,dexBonus(state.dex??10)+state.sk.rank))}:{})});
     state.notice=`§a${potionName(r,state.mod,state.liq)} ×${n} の調合を始めました`;
    }
   }
  }catch(e){console.warn('[CoopTown] 醸造台: '+e);try{player.sendMessage('§c醸造台を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:brewing_stand')return;
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(BREW_JOB)){player.sendMessage('§e醸造台は'+BREW_JOB+'だけが使えます。');return;}
   void open(player);
  });
 });
 // a chat line when the potions are done (checked every 2 seconds)
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){const job=jobOf(player),r=job&&BREW_RECIPES[job.r];
   if(r&&!job.told&&now>=job.end){saveJob(player,{...job,told:true});try{player.sendMessage(`§6${potionName(r,job.m,job.l)} ×${job.n} ができあがりました。醸造台で受け取ってください。`);}catch{}}}
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
