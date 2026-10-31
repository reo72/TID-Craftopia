import {world,system} from '@minecraft/server';
import {jobCount} from './job-count.js';
import {chooseDialog,noticeDialog} from './dialog.js';
import {biomeName} from './hud-info.js';
import {dayKey} from './game-config.js';
import {skillValue} from './skill-config.js';

// The adventurer (Notion 冒険家): exploring, defeating mobs and swimming grow the job (gather skill), and the
// cartography table holds the survey work: today's three survey requests, the record of the biomes visited (only
// places the player really went to; nothing unexplored is revealed), and handing in the survey report for the
// finished requests. Biome visits count once a day each; swimming is capped a day so idling in water does not pay.
export const EXPLORE_JOB='冒険家';
export const EXPLORE_RULES={biomeXp:10,swimPerXp:50,swimCap:600,reportCoins:80,reportXp:20,checkTicks:100};
const HOSTILE={'minecraft:zombie':4,'minecraft:husk':4,'minecraft:drowned':4,'minecraft:skeleton':5,'minecraft:stray':5,'minecraft:creeper':6,'minecraft:spider':4,'minecraft:cave_spider':4,
 'minecraft:enderman':8,'minecraft:witch':8,'minecraft:slime':3,'minecraft:phantom':6,'minecraft:pillager':6,'minecraft:blaze':8,'minecraft:magma_cube':4};
const PASSIVE={'minecraft:cow':1,'minecraft:pig':1,'minecraft:sheep':1,'minecraft:chicken':1,'minecraft:rabbit':1};
const MOB_NAMES={'minecraft:zombie':'ゾンビ','minecraft:skeleton':'スケルトン','minecraft:creeper':'クリーパー','minecraft:spider':'クモ','minecraft:enderman':'エンダーマン','minecraft:slime':'スライム','minecraft:drowned':'ドラウンド','minecraft:husk':'ハスク'};
const SURVEY_BIOMES=['minecraft:plains','minecraft:forest','minecraft:desert','minecraft:taiga','minecraft:jungle','minecraft:savanna','minecraft:swampland','minecraft:birch_forest','minecraft:roofed_forest','minecraft:mesa','minecraft:ice_plains','minecraft:cherry_grove','minecraft:river','minecraft:beach','minecraft:ocean'];
const KEY='cooptown:explore';
const active=new Set();
const pick=(list,seed)=>list[Math.abs(seed)%list.length];
const hash=s=>[...String(s)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)|0,2166136261);
/** Today's three survey requests for a player (the same all day). */
export function surveysFor(id,day){
 const h=hash(id+day);
 return [{kind:'biome',target:pick(SURVEY_BIOMES,h),need:1},{kind:'kill',target:pick(Object.keys(MOB_NAMES),h>>3),need:3+Math.abs(h>>7)%4},{kind:'swim',target:'',need:100}];
}
function recordOf(player){
 let r;try{r=JSON.parse(player.getDynamicProperty(KEY)??'{}');}catch{r={};}
 const day=dayKey();
 r.visited??=[];r.kills??={};
 if(r.day!==day){r.day=day;r.today=[];r.swim=0;r.killsToday={};r.claimed=false;r.reqs=surveysFor(player.id,day).map(q=>({...q,have:0}));}
 return r;
}
const saveRecord=(player,r)=>{try{player.setDynamicProperty(KEY,JSON.stringify(r));}catch{}};
const label=q=>q.kind==='biome'?`${biomeName(q.target)}を訪れる`:q.kind==='kill'?`${MOB_NAMES[q.target]}を${q.need}体討伐する`:`${q.need}ブロック泳ぐ`;

export function installExplore({game}){
 const isAdventurer=player=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return [p?.job,p?.secondJob].includes(EXPLORE_JOB);};
 // the skill tree (skill-config.js): 旅の記録 / 調査報告
 const skill=(player,key)=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return skillValue(p,EXPLORE_JOB,key);};
 const earn=(player,xp,coins=0,note)=>{try{return game.execute(player.id,'job.earn',{skill:'gather',xp,coins,note});}catch{return '';}};
 const last=new Map();
 // biome visits and swimming, every few seconds
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   if(!isAdventurer(player))continue;
   const r=recordOf(player);let changed=false;
   let biome='';try{biome=player.dimension.getBiome(player.location)?.id??'';}catch{}
   if(biome&&!r.today.includes(biome)){r.today.push(biome);jobCount(player,'biome');if(!r.visited.includes(biome))r.visited.push(biome);earn(player,Math.round(EXPLORE_RULES.biomeXp*(1+skill(player,'biome'))),0,'訪問 '+biomeName(biome));changed=true;
    for(const q of r.reqs)if(q.kind==='biome'&&q.target===biome)q.have=1;}
   const l=player.location,prev=last.get(player.id);last.set(player.id,{x:l.x,z:l.z});
   let wet=false;try{wet=player.isInWater;}catch{}
   if(prev&&wet&&r.swim<EXPLORE_RULES.swimCap){const d=Math.min(12,Math.hypot(l.x-prev.x,l.z-prev.z));if(d>.3){const before=Math.floor(r.swim/EXPLORE_RULES.swimPerXp);r.swim=Math.min(EXPLORE_RULES.swimCap,r.swim+d);
    if(Math.floor(r.swim/EXPLORE_RULES.swimPerXp)>before)earn(player,1);for(const q of r.reqs)if(q.kind==='swim')q.have=Math.min(q.need,Math.floor(r.swim));changed=true;}}
   if(changed)saveRecord(player,r);
  }
 },EXPLORE_RULES.checkTicks);
 // defeating mobs (the one who dealt the last blow; animals give a little)
 world.afterEvents.entityDie?.subscribe(({deadEntity,damageSource})=>{
  const player=damageSource?.damagingEntity;if(player?.typeId!=='minecraft:player')return;
  const xp=HOSTILE[deadEntity.typeId]??PASSIVE[deadEntity.typeId];if(!xp||!isAdventurer(player))return;
  const r=recordOf(player);r.kills[deadEntity.typeId]=(r.kills[deadEntity.typeId]??0)+1;
  if(HOSTILE[deadEntity.typeId]&&!r.killsToday[deadEntity.typeId]){r.killsToday[deadEntity.typeId]=1;jobCount(player,'kill_kinds');}
  for(const q of r.reqs)if(q.kind==='kill'&&q.target===deadEntity.typeId)q.have=Math.min(q.need,q.have+1);
  saveRecord(player,r);earn(player,xp);
 });
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  try{
   for(;;){
    const r=recordOf(player),done=r.reqs.filter(q=>q.have>=q.need&&!q.done);
    const i=await chooseDialog(player,'製図台','冒険家の調査拠点。訪れた場所だけが地図に残ります。',['今日の調査依頼',`探索の記録（${r.visited.length}地域）`,`調査報告書を提出（${done.length}件）`],{back:'閉じる'});
    if(i===undefined)return;
    if(i===0)await noticeDialog(player,'今日の調査依頼',r.reqs.map(q=>`${q.done?'§7✔ ':q.have>=q.need?'§a● ':'§f○ '}${label(q)}　${Math.min(q.have,q.need)} / ${q.need}`).join('\n')+'\n\n§7終わった依頼は「調査報告書を提出」で報酬になります。',{close:'戻る'});
    else if(i===1){
     const kills=Object.entries(r.kills).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id,n])=>`${MOB_NAMES[id]??id.replace('minecraft:','')} ${n}体`).join('、');
     await noticeDialog(player,'探索の記録',`訪れた地域（${r.visited.length}）：\n${r.visited.map(biomeName).join('、')||'まだありません'}\n\n今日の訪問 ${r.today.length}地域　今日泳いだ距離 ${Math.floor(r.swim)}ブロック\n討伐の記録：${kills||'まだありません'}`,{close:'戻る'});
    }else if(i===2){
     if(!done.length){await noticeDialog(player,'調査報告書','提出できる調査がありません。',{close:'戻る'});continue;}
     for(const q of done)q.done=true;saveRecord(player,r);jobCount(player,'report',done.length);
     const more=1+skill(player,'report'),m=earn(player,Math.round(EXPLORE_RULES.reportXp*done.length*more),Math.round(EXPLORE_RULES.reportCoins*done.length*more),`調査報告 ${done.length}件`);
     await noticeDialog(player,'調査報告書',`${done.length}件の調査を報告しました。\n${m}`,{close:'戻る'});
    }
   }
  }catch(e){console.warn('[CoopTown] 製図台: '+e);}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:cartography_table'||player.isSneaking)return;
  if(!isAdventurer(player))return; // others: the vanilla cartography table
  event.cancel=true;if(event.isFirstEvent===false)return;
  system.run(()=>void open(player));
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>{active.delete(playerId);last.delete(playerId);});
}
