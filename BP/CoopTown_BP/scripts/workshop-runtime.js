import {world,system,ItemStack} from '@minecraft/server';
import {WORK_JOB,WORK_JOBS,rankCap,BATCH_LEVEL,MAX_BATCH,SORTED,GRIND_TABS,SORT_ORES,CARE,careAmount,caresFor,careKind,SAW_TABS,SAW_RECIPES,sawNeeds} from './workshop-config.js';
import {workshopLayout,pageOf,plainItem,countIds,takeIds,giveStack,runWorkshop} from './workshop-ui.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {recipeIcon} from './workbench-icons.js';
import {rollQuality,setQuality,rankText,TIERS} from './quality.js';
import {titleTrack,jobCount} from './job-count.js';

// The miner's grindstone (form title "ct:grind") and the woodcutter's stonecutter = 製材台 (form title "ct:saw"), for the
// 冒険家 job (main or second): workshop-config.js has the rules. Other jobs, and a 冒険家 sneaking with an empty hand,
// get the game's own screen. Both work at once (no waiting time); what is made is told on the state line.
const GL=workshopLayout(GRIND_TABS.length),SL=workshopLayout(SAW_TABS.length);
const FLINT_ICON='textures/items/flint';
const active=new Set();
const iconOf=id=>recipeIcon({output:[id,1]})??undefined;
const durabilityOf=item=>{try{return item?.getComponent('minecraft:durability');}catch{return undefined;}};
const amountsLabel=(lv,labels)=>labels.map((t,k)=>k&&lv<BATCH_LEVEL?'[off]'+t:t);
const rankRange=lv=>`ランク${TIERS[0].label}～${TIERS[rankCap(lv)].label}`;

export function installWorkshops({game,itemName}){
 const jobOf=(player,job=WORK_JOB)=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return p&&[p.job,p.secondJob].includes(job)?p:undefined;};
 const nameOf=item=>item.nameTag||itemName(item.typeId);

 // ---- 砥石: 鉱石選別 / 道具の手入れ ----
 function grindRender(player,state){
  const container=player.getComponent('minecraft:inventory')?.container,flint=countIds(container,[CARE.material]);
  const care=state.tab===1;
  const list=care
   ?(()=>{const out=[];for(let i=0;container&&i<container.size;i++){const s=container.getItem(i),d=durabilityOf(s);if(s&&careKind(s.typeId)&&d?.damage>0)out.push(i);}return out;})()
   :SORT_ORES.map((o,i)=>i);
  const {pages,shown}=pageOf(list,state);if(!list.includes(state.sel))state.sel=shown[0];
  const b=[];const add=(text,icon)=>b.push([text,icon]);
  GRIND_TABS.forEach((t,k)=>add((k===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  const haveOre=o=>countIds(container,[o.id],plainItem);
  for(let j=0;j<12;j++){const i=shown[j];if(i===undefined){add('');continue;}
   if(care){const s=container.getItem(i);add((i===state.sel?'[sel]':'')+(flint<1?'[ng]':'')+nameOf(s),iconOf(s.typeId));}
   else{const o=SORT_ORES[i];add((i===state.sel?'[sel]':'')+(haveOre(o)<1?'[ng]':'')+o.name,iconOf(o.id));}}
  amountsLabel(state.lv,care?['1回','2回','満タン']:['1個','8個','まとめて']).forEach((t,k)=>add((k===state.amount?'[on]':'')+t));
  let view;
  if(care){
   const s=state.sel!==undefined?container.getItem(state.sel):undefined,d=durabilityOf(s),max=d?.maxDurability??0,damage=d?.damage??0;
   const times=caresFor(damage,max||1,state.lv,[1,2,Infinity][state.amount]),need=s?Math.max(1,times):0,each=careAmount(max||1,state.lv);
   const gain=Math.min(damage,each*need),ok=!!s&&damage>0&&flint>=need&&(state.amount===0||state.lv>=BATCH_LEVEL);
   add((ok?'':'[off]')+'手入れする');add(`${state.page+1} / ${pages}`);
   add(s?' ':'',s?iconOf(s.typeId):undefined);add(s?nameOf(s):'');
   add(state.notice||(!s?'§7手入れが必要な道具はありません':state.amount&&state.lv<BATCH_LEVEL?`§cまとめての手入れは Lv.${BATCH_LEVEL}から`:flint<need?`§c${CARE.materialName}が足りません`:`§a耐久 ${max-damage} / ${max}　§71回で +${each}`));
   add(s?CARE.materialName:'',s?FLINT_ICON:undefined);add(s?'耐久':'',s?iconOf(s.typeId):undefined);
   add(s?`${flint>=need?'§a':'§c'}${flint} §f/ ${need}`:'');add(s?`§f${max-damage} > §a${max-damage+gain}`:'');
   add(s?`+${gain}`:'');add(s?`費用：${CARE.materialName} ×${need}`:'');
   view={shown,item:s,times:need,gain,ok};
  }else{
   const o=SORT_ORES[state.sel],have=o?haveOre(o):0,n=Math.min(MAX_BATCH,[1,8,have][state.amount]);
   const ok=!!o&&n>0&&have>=n&&(state.amount===0||state.lv>=BATCH_LEVEL);
   add((ok?'':'[off]')+'選別する');add(`${state.page+1} / ${pages}`);
   add(o?' ':'',o?iconOf(o.id):undefined);add(o?.name??'');
   add(state.notice||(!o?'':state.amount&&state.lv<BATCH_LEVEL?`§cまとめて選別は Lv.${BATCH_LEVEL}から`:have>0?`§a選別前の${o.name} ${have}個　§7最高 ${rankText(rankCap(state.lv))}`:`§c選別前の${o.name}がありません`));
   add(o?o.name+'（選別前）':'',o?iconOf(o.id):undefined);add('');
   add(o?`${have>=Math.max(1,n)?'§a':'§c'}${have} §f/ ${Math.max(1,n)}`:'');add('');
   add(o?rankRange(state.lv):'');add(o?'費用：なし（1個ずつ一度だけ）':'');
   view={shown,ore:o,n,ok};
  }
  state.notice='';
  return {buttons:b,...view};
 }
 function grindPress(player,view,state){
  const container=player.getComponent('minecraft:inventory')?.container;
  if(!view.ok){state.notice=state.amount&&state.lv<BATCH_LEVEL?`§cまとめては Lv.${BATCH_LEVEL}から`:'§c今はできません';return;}
  if(state.tab===1){
   const s=container.getItem(state.sel),d=durabilityOf(s);if(!s||!d||!(d.damage>0)){state.notice='§c手入れが必要な道具がありません';return;}
   if(countIds(container,[CARE.material])<view.times){state.notice=`§c${CARE.materialName}が足りません`;return;}
   const gain=Math.min(d.damage,careAmount(d.maxDurability,state.lv)*view.times);
   d.damage=d.damage-gain;container.setItem(state.sel,s);takeIds(container,[CARE.material],view.times);
   titleTrack(player,careKind(s.typeId)==='pick'?'pick_care':'axe_care',view.times);
   try{player.playSound('use.grindstone',{volume:.6});}catch{}
   state.notice=`§a${nameOf(s)} を手入れしました（耐久 +${gain}）`;return;
  }
  const o=view.ore,n=view.n;
  if(countIds(container,[o.id],plainItem)<n){state.notice=`§c選別前の${o.name}が足りません`;return;}
  takeIds(container,[o.id],n,plainItem);
  const cap=rankCap(state.lv),counts=[0,0,0,0,0];for(let k=0;k<n;k++)counts[Math.min(cap,rollQuality(state.lv))]++;
  counts.forEach((c,t)=>{if(!c)return;const stack=new ItemStack(o.id,c);if(t)setQuality(stack,t);else try{stack.setLore([`${TIERS[0].color}品質：${TIERS[0].label}`,SORTED]);}catch{} /* rank D shows its 品質 line too (2026-10-30) */giveStack(player,container,stack);});
  titleTrack(player,'ore_sorted',n);jobCount(player,'sort_ore',n);
  try{player.playSound('use.grindstone',{volume:.6});}catch{}
  state.notice=`§a${o.name} ×${n} を選別：`+counts.map((c,t)=>c?`${TIERS[t].color}${TIERS[t].label}×${c}`:'').filter(Boolean).reverse().join(' ');
 }

 // ---- 製材台: 製材 / 炭焼き ----
 const needName=t=>Array.isArray(t)?itemName(t[0]):ingredientName(t,itemName);
 const needIds=t=>Array.isArray(t)?t:typesOf(t);
 const maxSaw=(r,container)=>{for(let n=MAX_BATCH;n>0;n--)if(sawNeeds(r,n).every(([t,c])=>countIds(container,needIds(t))>=c))return n;return 0;};
 function sawRender(player,state){
  const container=player.getComponent('minecraft:inventory')?.container;
  const list=SAW_RECIPES.map((r,i)=>i).filter(i=>SAW_RECIPES[i].tab===state.tab);
  const {pages,shown}=pageOf(list,state);if(!list.includes(state.sel))state.sel=shown[0];
  const b=[];const add=(text,icon)=>b.push([text,icon]);
  SAW_TABS.forEach((t,k)=>add((k===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<12;j++){const i=shown[j];if(i===undefined){add('');continue;}const r=SAW_RECIPES[i];add((i===state.sel?'[sel]':'')+(maxSaw(r,container)<1?'[ng]':'')+r.name,iconOf(r.output[0]));}
  amountsLabel(state.lv,['1本','8本','まとめて']).forEach((t,k)=>add((k===state.amount?'[on]':'')+t));
  const r=SAW_RECIPES[state.sel],max=r?maxSaw(r,container):0,n=[1,8,max][state.amount];
  const needs=r?sawNeeds(r,Math.max(1,n)):[],ok=!!r&&n>0&&needs.every(([t,c])=>countIds(container,needIds(t))>=c)&&(state.amount===0||state.lv>=BATCH_LEVEL);
  add((ok?'':'[off]')+(r?.charcoal?'炭を焼く':'製材する'));add(`${state.page+1} / ${pages}`);
  add(r?' ':'',r?iconOf(r.output[0]):undefined);add(r?.name??'');
  add(state.notice||(!r?'':state.amount&&state.lv<BATCH_LEVEL?`§cまとめて製材は Lv.${BATCH_LEVEL}から`:max>0?`§a最大 ${max}本ぶん`:'§c材料が足りません'));
  for(let k=0;k<2;k++){const m=needs[k];add(m?needName(m[0]):'',m?iconOf(needIds(m[0])[0]):undefined);}
  for(let k=0;k<2;k++){const m=needs[k];if(!m){add('');continue;}const have=countIds(container,needIds(m[0]));add(`${have>=m[1]?'§a':'§c'}${have} §f/ ${m[1]}`);}
  add(r?`×${r.output[1]*Math.max(1,n)}`:'');add(r?(r.charcoal?'原木1本で木炭1個（板材は燃料）':`原木1本で${r.output[1]}個`):'');
  state.notice='';
  return {buttons:b,shown,recipe:r,n,ok};
 }
 function sawPress(player,view,state){
  const container=player.getComponent('minecraft:inventory')?.container,r=view.recipe,n=view.n;
  if(!view.ok){state.notice=state.amount&&state.lv<BATCH_LEVEL?`§cまとめて製材は Lv.${BATCH_LEVEL}から`:'§c材料が足りません';return;}
  const needs=sawNeeds(r,n);if(!needs.every(([t,c])=>countIds(container,needIds(t))>=c)){state.notice='§c材料が足りません';return;}
  for(const [t,c] of needs)takeIds(container,needIds(t),c); // the rank of a log is used up (design: 品質は消費する)
  let left=r.output[1]*n;while(left>0){const c=Math.min(64,left);left-=c;giveStack(player,container,new ItemStack(r.output[0],c));}
  jobCount(player,r.charcoal?'charcoal':'saw',r.output[1]*n); // 木こり's dailies
  if(r.charcoal)titleTrack(player,'charcoal_made',r.output[1]*n);
  else if(/_planks$/.test(r.output[0]))titleTrack(player,'planks_made',r.output[1]*n);
  try{player.playSound(r.charcoal?'fire.ignite':'use.stonecutter',{volume:.6});}catch{}
  state.notice=`§a${r.name} ×${r.output[1]*n} ができました`;
 }

 const SCREENS={
  'minecraft:grindstone':{name:'grind',L:GL,label:'砥石',render:grindRender,press:grindPress},
  'minecraft:stonecutter_block':{name:'saw',L:SL,label:'製材台',render:sawRender,press:sawPress}};
 async function open(player,screen,p){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:0,page:0,sel:undefined,amount:0,notice:'',lv:p.level??1};
  try{await runWorkshop(player,screen.name,screen.L,state,{label:screen.label,render:s=>screen.render(player,s),press:(view,s)=>{screen.press(player,view,s);}});}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event,screen=SCREENS[block.typeId];if(!screen)return;
  if(player.isSneaking)return; // sneaking: place a block / the game's own screen
  const p=jobOf(player,WORK_JOBS[block.typeId]);if(!p)return; // other jobs: the game's own screen
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>void open(player,screen,p));
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
