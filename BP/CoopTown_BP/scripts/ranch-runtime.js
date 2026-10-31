import {world,system,ItemStack} from '@minecraft/server';
import {jobCount} from './job-count.js';
import {mainButtons,listButtons,listRowAt,listStatus,feedButtons,feedAt,showRanch,ranchDialog,animalIcon} from './ranch-ui.js';
import {rollQuality,setQuality,qualityOf} from './quality.js';
import {stock,take} from './cook-runtime.js';
import {skillValue} from './skill-config.js';

// The farmer's feeding station (Notion 農家, formerly 畜産農家): a 農家 using a hay bale (empty hand or holding feed material)
// opens it. Ranch: register the animals around it that take to players (picked one by one or all; as many as capFor
// the job level); see each one's state and
// when it can be cared for next; care (a short action, no penalty when skipped: no hunger, no deaths); make feed
// (growth feed raises the young at once, quality feed gives a longer care bonus); births next to the player's
// animals are recorded and the young registered. Milk, wool, meat and leather from the player's own cared-for
// animals roll a quality (gather level + care bonus).
// maxCap: the most a farmer can register; capFor(level): how many at a job level (asked 2026-10-23: grows with the
// level, at most 30; Lv1 5, Lv10 10, Lv50 30)
export const RANCH={maxCap:30,radius:10,careMs:20*60000,bonusMs:60*60000,qualityBonusMs:3*60*60000};
export const capFor=level=>Math.min(RANCH.maxCap,5+Math.floor((level??1)/2));
export const RANCH_JOB='農家'; // 畜産農家 was merged into 農家
// every animal that can be bred or tamed by players (asked 2026-10-23: all animals that take to players)
export const ANIMALS={'minecraft:cow':'牛','minecraft:mooshroom':'ムーシュルーム','minecraft:chicken':'ニワトリ','minecraft:sheep':'ヒツジ','minecraft:pig':'ブタ',
 'minecraft:rabbit':'ウサギ','minecraft:goat':'ヤギ','minecraft:horse':'ウマ','minecraft:donkey':'ロバ','minecraft:mule':'ラバ','minecraft:llama':'ラマ',
 'minecraft:camel':'ラクダ','minecraft:wolf':'オオカミ','minecraft:cat':'ネコ','minecraft:ocelot':'ヤマネコ','minecraft:parrot':'オウム','minecraft:fox':'キツネ',
 'minecraft:panda':'パンダ','minecraft:bee':'ミツバチ','minecraft:turtle':'カメ','minecraft:axolotl':'ウーパールーパー','minecraft:frog':'カエル',
 'minecraft:sniffer':'スニッファー','minecraft:armadillo':'アルマジロ','minecraft:strider':'ストライダー','minecraft:hoglin':'ホグリン'};
// feeds: name, materials, effect (pic: the dialog picture, RP textures/cooptown/ranch/feed)
export const FEEDS=[
 {key:'growth',name:'育成用飼料',pic:'growth',inputs:[['minecraft:wheat',4],['minecraft:carrot',2]],text:'子どもがすぐ大人になる'},
 {key:'quality',name:'品質用飼料',pic:'quality',inputs:[['minecraft:wheat',4],['minecraft:beetroot',2],['minecraft:wheat_seeds',4]],text:'3時間 品質ボーナス'},
 {key:'breed',name:'繁殖用飼料',pic:'breed',inputs:[['minecraft:wheat',6],['minecraft:golden_carrot',1]],text:'近くの大人2頭ごとに子ども1頭'}];
const MATERIALS={'minecraft:wheat':'小麦','minecraft:carrot':'ニンジン','minecraft:beetroot':'ビートルート','minecraft:wheat_seeds':'小麦の種','minecraft:golden_carrot':'金のニンジン'};
const KEY='cooptown:ranch',TAG='ranch:';
const active=new Set();
// products: entity -> what drops that gets a quality
const PRODUCTS={'minecraft:cow':['minecraft:beef','minecraft:leather'],'minecraft:mooshroom':['minecraft:beef','minecraft:leather'],'minecraft:rabbit':['minecraft:rabbit','minecraft:rabbit_hide','minecraft:rabbit_foot'],'minecraft:llama':['minecraft:leather'],'minecraft:hoglin':['minecraft:porkchop','minecraft:leather'],'minecraft:sheep':['minecraft:white_wool','minecraft:mutton'],'minecraft:pig':['minecraft:porkchop'],'minecraft:chicken':['minecraft:chicken','minecraft:feather']};

function ranchOf(player){try{const v=JSON.parse(player.getDynamicProperty(KEY)??'{}');return {animals:v.animals??{},births:v.births??0,cared:v.cared??0};}catch{return {animals:{},births:0,cared:0};}}
const saveRanch=(player,r)=>{try{player.setDynamicProperty(KEY,JSON.stringify(r));}catch{}};
const ownerOf=entity=>{try{return entity.getTags().find(t=>t.startsWith(TAG))?.slice(TAG.length);}catch{return undefined;}};
const isBaby=e=>{try{return !!e.getComponent('minecraft:is_baby');}catch{return false;}};
const timeLeft=ms=>{const m=Math.ceil(ms/60000);return m>=60?`${Math.floor(m/60)}時間${m%60?m%60+'分':''}`:`${m}分`;};

/** Set by installRanch: the 飼育ブラシ (job-tools.js) cares for the player's own animals among `entities` that are due.
 *  Returns {cared, mine, wait} (wait: ms until the next of the player's animals here is due). */
export let brushCare=null;
const LEGEND_TAG='ct_legend';
export function installRanch({game,refreshGame}){
 const jobOk=player=>{let p;try{p=refreshGame(player).player;}catch{}return [p?.job,p?.secondJob].includes(RANCH_JOB)?p:undefined;};
 const nearby=(player,center)=>{try{return player.dimension.getEntities({location:center,maxDistance:RANCH.radius}).filter(e=>ANIMALS[e.typeId]);}catch{return [];}};
 const earn=(player,xp,note)=>{try{game.execute(player.id,'job.earn',{skill:'gather',xp,note});}catch{}};
 brushCare=(player,entities)=>{
  const r=ranchOf(player),now=Date.now(),mine=entities.filter(e=>ANIMALS[e.typeId]&&ownerOf(e)===player.id),due=mine.filter(e=>(r.animals[e.id]?.next??0)<=now);
  for(const e of due){const a=r.animals[e.id]??(r.animals[e.id]={type:e.typeId,at:now});a.next=now+RANCH.careMs;a.bonus=Math.max(a.bonus??0,now+RANCH.bonusMs);}
  if(due.length){r.cared+=due.length;saveRanch(player,r);jobCount(player,'care',due.length);earn(player,due.length*3,`ブラッシング ${due.length}頭`);}
  const wait=mine.filter(e=>!due.includes(e)).reduce((m,e)=>Math.min(m,(r.animals[e.id]?.next??now)-now),Infinity);
  return {cared:due.length,mine:mine.length,wait:Number.isFinite(wait)?wait:0};
 };
 const health=e=>{try{const h=e.getComponent('minecraft:health');return `${Math.ceil(h.currentValue)} / ${Math.round(h.effectiveMax)}`;}catch{return '―';}};
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 const named=e=>`${ANIMALS[e.typeId]}${e.nameTag?'「'+e.nameTag+'」':''}`;
 // the screens below return 'close' when the player closed the whole station
 // registering: the unregistered animals near the station, nearest first; pick one at a time (or all), until done
 async function registerPick(player,center,r,max){
  for(;;){
   const loose=nearby(player,center).filter(e=>!ownerOf(e)).sort((a,b)=>dist(a.location,player.location)-dist(b.location,player.location)).slice(0,RANCH.maxCap);
   const count=Object.keys(r.animals).length,room=max-count;
   if(room<=0){await ranchDialog(player,{title:'登録の上限です',pic:'full',text:'登録の上限です。\n職業レベルが上がると増えます。',note:`登録 ${count} / ${max}`});return;}
   if(!loose.length){await ranchDialog(player,{title:'登録',pic:'warning',text:'近くに登録できる動物が\nいません。'});return;}
   const rows=loose.map(e=>({name:named(e),age:isBaby(e)?'子ども':'大人',icon:animalIcon(e.typeId),hp:health(e),status:`[dist]距離\n${Math.round(dist(e.location,player.location))}m`}));
   const sel=await showRanch(player,'list',listButtons({title:'登録する動物を選ぶ',count:`登録 ${count} / ${max}`,right:`全部登録（${Math.min(room,loose.length)}頭）`,rows}));
   if(sel===undefined)return 'close';
   if(sel===2)return;
   const k=listRowAt(sel);if(sel!==3&&k===undefined)continue;
   const pick=sel===3?loose.slice(0,room):[loose[k]];let added=0;
   for(const e of pick){try{if(!e.isValid||ownerOf(e))continue;e.addTag(TAG+player.id);r.animals[e.id]={type:e.typeId,at:Date.now(),next:0};added++;
    e.dimension.spawnParticle('minecraft:villager_happy',{x:e.location.x,y:e.location.y+1,z:e.location.z});}catch{}}
   saveRanch(player,r);
   if(added)try{player.playSound('random.orb',{pitch:1.4,volume:.5});}catch{}
   if(sel===3){await ranchDialog(player,{title:'登録',pic:'register',text:`${added}頭を牧場に\n登録しました。`,ok:'OK'});return;}
  }
 }
 // the list: every registered animal, the ones nearby first; far ones show （遠く）
 async function showList(player,r,mine,max){
  const now=Date.now(),near=new Map(mine.map(e=>[e.id,e]));
  const rows=Object.entries(r.animals).sort(([a],[b])=>(near.has(b)?1:0)-(near.has(a)?1:0)).map(([id,a])=>{const e=near.get(id),ready=(a.next??0)<=now;
   return {name:e?named(e):(ANIMALS[a.type]??a.type),age:e?(isBaby(e)?'子ども':'大人'):'（遠く）',icon:animalIcon(a.type),hp:e?health(e):'―',
    status:listStatus({ready,left:ready?'':timeLeft(a.next-now),bonus:(a.bonus??0)>now})};});
  const sel=await showRanch(player,'list',listButtons({title:'牧場の一覧',count:`登録 ${rows.length} / ${max}`,empty:'まだ登録した動物がいません。',rows}));
  return sel===undefined||sel===3?'close':undefined;
 }
 async function feedMenu(player,r,mine){
  const now=Date.now(),container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
  const sel=await showRanch(player,'feed',feedButtons(FEEDS.map(f=>({name:f.name,effect:f.text,inputs:f.inputs.map(([id,n])=>({name:MATERIALS[id]??id,have:have(id),need:n}))}))));
  if(sel===undefined||sel===1)return 'close';
  const feed=FEEDS[feedAt(sel)];if(!feed)return;
  if(feed.inputs.some(([id,n])=>have(id)<n)){await ranchDialog(player,{title:feed.name,pic:'warning',text:'材料が足りません。'});return;}
  if(!mine.length){await ranchDialog(player,{title:feed.name,pic:'warning',text:'近くに自分の動物が\nいません。'});return;}
  if(!await ranchDialog(player,{title:'飼料を与える',pic:feed.pic,text:`近くの自分の動物${mine.length}頭に\n与えます`,note:feed.name,ok:'与える',cancel:'キャンセル'}))return;
  for(const [id,n] of feed.inputs)take(container,id,n);
  let done=0;
  for(const e of mine){
   try{
    if(feed.key==='growth'&&isBaby(e)){e.triggerEvent('minecraft:ageable_grow_up');done++;}
    else if(feed.key==='quality'){const a=r.animals[e.id];if(a){a.bonus=now+RANCH.qualityBonusMs;done++;}}
   }catch{}
  }
  // breeding feed: every pair of grown animals of a kind has one young next to them (born like a bred one)
  if(feed.key==='breed')for(const type of Object.keys(ANIMALS)){const adults=mine.filter(e=>e.typeId===type&&!isBaby(e));
   for(let k=0;k+1<adults.length;k+=2){try{const l=adults[k].location;adults[k].dimension.spawnEntity(type+'<minecraft:entity_born>',l);done++;}catch{}}}
  saveRanch(player,r);earn(player,done*2,`${feed.name} ${done}頭`);
  await ranchDialog(player,done?{title:feed.name,pic:'success',text:`${done}頭に与えました。`,ok:'OK'}
   :{title:'効果のある動物がいませんでした',pic:'warning',text:'効果のある動物が\nいませんでした'});
 }
 async function open(player,center){
  if(active.has(player.id))return;active.add(player.id);
  try{
   for(;;){
    const r=ranchOf(player),now=Date.now(),near=nearby(player,center),mine=near.filter(e=>ownerOf(e)===player.id);
    const loose=near.filter(e=>!ownerOf(e)),count=Object.keys(r.animals).length,max=capFor(jobOk(player)?.level??1);
    const ready=mine.filter(e=>(r.animals[e.id]?.next??0)<=now);
    const i=await showRanch(player,'main',mainButtons({count,max,near:mine.length,ready:ready.length,births:r.births,cared:r.cared,loose:loose.length}));
    if(i===undefined||i===9)return;
    let next;
    if(i===5)next=await registerPick(player,center,r,max);
    else if(i===6)next=await showList(player,r,mine,max);
    else if(i===7){
     if(!ready.length){await ranchDialog(player,{title:'世話をする',pic:'warning',text:'今は世話できる動物が\nいません。'});continue;}
     for(const e of ready){const a=r.animals[e.id]??(r.animals[e.id]={type:e.typeId,at:now});a.next=now+RANCH.careMs;a.bonus=Math.max(a.bonus??0,now+RANCH.bonusMs);
      try{e.dimension.spawnParticle('minecraft:heart_particle',{x:e.location.x,y:e.location.y+1,z:e.location.z});}catch{}}
     r.cared+=ready.length;saveRanch(player,r);jobCount(player,'care',ready.length);earn(player,ready.length*3,`世話 ${ready.length}頭`);
     await ranchDialog(player,{title:'世話の完了',pic:'success',text:`${ready.length}頭の世話をしました`,note:'1時間 世話ボーナス',ok:'OK'});
    }else if(i===8)next=await feedMenu(player,r,mine);
    if(next==='close')return;
   }
  }catch(e){console.warn('[CoopTown] 飼育台: '+e);}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player,itemStack}=event;
  if(block.typeId!=='minecraft:hay_block'||player.isSneaking)return;
  if(itemStack&&!['minecraft:wheat','minecraft:carrot','minecraft:beetroot','minecraft:wheat_seeds'].includes(itemStack.typeId))return;
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  if(![p?.job,p?.secondJob].includes(RANCH_JOB))return; // others: a plain hay bale
  event.cancel=true;if(event.isFirstEvent===false)return;
  const center={x:block.location.x+.5,y:block.location.y,z:block.location.z+.5};
  system.run(()=>void open(player,center));
 });
 // births next to a player's animals: registered to them and counted
 world.afterEvents.entitySpawn.subscribe(({entity,cause})=>{
  if(cause!=='Born'||!ANIMALS[entity.typeId])return;
  system.run(()=>{try{
   const parent=entity.dimension.getEntities({location:entity.location,maxDistance:4,type:entity.typeId}).find(e=>e.id!==entity.id&&ownerOf(e));
   const owner=parent&&ownerOf(parent),player=owner&&world.getAllPlayers().find(p=>p.id===owner);if(!player)return;
   const r=ranchOf(player);r.births++;jobCount(player,'breed');
   if(Object.keys(r.animals).length<capFor(jobOk(player)?.level??1)){entity.addTag(TAG+owner);r.animals[entity.id]={type:entity.typeId,at:Date.now(),next:0,parent:parent.id};}
   saveRanch(player,r);earn(player,5,`誕生 ${ANIMALS[entity.typeId]}`);
  }catch{}});
 });
 // milk from a player's own cow gets a quality
 world.afterEvents.playerInteractWithEntity?.subscribe(({player,target,itemStack})=>{
  if(target.typeId!=='minecraft:cow'||itemStack?.typeId!=='minecraft:bucket'||ownerOf(target)!==player.id)return;
  const p=jobOk(player);if(!p)return;
  const a=ranchOf(player).animals[target.id],tier=rollQuality(p.gather?.level??1,((a?.bonus??0)>Date.now()?.2:0)+(target.hasTag?.(LEGEND_TAG)?.2:0)+skillValue(p,RANCH_JOB,'rank')); // a legendary animal (legend-runtime.js) +0.2
  system.run(()=>{try{const c=player.getComponent('minecraft:inventory').container,s=c.getItem(player.selectedSlotIndex);
   if(s?.typeId==='minecraft:milk_bucket'&&tier){setQuality(s,tier);c.setItem(player.selectedSlotIndex,s);}earn(player,2,'採乳');jobCount(player,'product');}catch{}});
 });
 // wool, meat and leather dropped by the player's own animals: swapped for marked items
 const pending=[];
 const mark=(entity,player)=>{const p=jobOk(player);if(!p)return;const a=ranchOf(player).animals[entity.id];
  const tier=rollQuality(p.gather?.level??1,((a?.bonus??0)>Date.now()?.2:0)+(entity.hasTag?.(LEGEND_TAG)?.2:0)+skillValue(p,RANCH_JOB,'rank'));if(!tier)return;
  const l=entity.location;pending.push({dim:entity.dimension.id,x:l.x,y:l.y,z:l.z,items:PRODUCTS[entity.typeId]??[],tier,until:system.currentTick+4});};
 world.afterEvents.entityDie?.subscribe(({deadEntity,damageSource})=>{
  const killer=damageSource?.damagingEntity;if(killer?.typeId!=='minecraft:player'||ownerOf(deadEntity)!==killer.id||isBaby(deadEntity))return;
  mark(deadEntity,killer);jobCount(killer,'product');const r=ranchOf(killer);delete r.animals[deadEntity.id];saveRanch(killer,r);
 });
 world.beforeEvents.playerInteractWithEntity?.subscribe(({player,target,itemStack})=>{
  if(target.typeId==='minecraft:sheep'&&itemStack?.typeId==='minecraft:shears'&&ownerOf(target)===player.id)system.run(()=>{mark(target,player);jobCount(player,'product');});
 });
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(!pending.length||entity.typeId!=='minecraft:item')return;
  const now=system.currentTick;for(let i=pending.length-1;i>=0;i--)if(pending[i].until<now)pending.splice(i,1);
  let s;try{s=entity.getComponent('minecraft:item')?.itemStack;}catch{}if(!s||qualityOf(s))return; // a swapped item does not match again
  const l=entity.location,hit=pending.find(q=>q.dim===entity.dimension.id&&q.items.some(id=>s.typeId===id||(id==='minecraft:white_wool'&&s.typeId.endsWith('_wool')))&&Math.hypot(q.x-l.x,q.y-l.y,q.z-l.z)<2.5);
  if(!hit)return;
  const marked=setQuality(new ItemStack(s.typeId,s.amount),hit.tier),dim=entity.dimension;
  system.run(()=>{try{entity.remove();dim.spawnItem(marked,l);}catch{}});
 });
}
