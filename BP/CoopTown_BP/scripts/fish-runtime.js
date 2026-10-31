import {world,system,ItemStack} from '@minecraft/server';
import {jobCount} from './job-count.js';
import {chooseDialog,noticeDialog} from './dialog.js';
import {setQuality} from './quality.js';
import {take,stock} from './cook-runtime.js';
import {rollQuality} from './quality.js';
import {playReel} from './reel-game.js';
import {mapPaused,lastStats} from './minimap.js';
import {FISH_SPECIES} from './fish-species.js';
import {placeHint} from './fish-hint.js';
import {catcherOf,installFishHooks} from './fish-hook.js';
import {pushLog,pushText,LOG_KINDS} from './hud-log.js';
import {stamp} from './freshness.js';
import {ensureInfo,setCreator,CATCHER} from './food-lore.js';
import {dexOf,dexEase} from './dexterity.js';
import {setCommandHandlers} from './commands.js';
import {titleTrack,titleSeen} from './job-count.js';
import {buffLeft} from './buffs.js';
import {titleMax} from './job-count.js';
import {stashInBag} from './backpack-runtime.js';
import {cheer} from './celebrate.js';
import {BAIT_ITEMS} from './job-tools-config.js';
import {skillValue} from './skill-config.js';
import {heldRod} from './fishing-rods.js';
// the job bait held in the off hand, used up one per catch: {id, key, rare, legend} or undefined
function offhandBait(player){
 try{const eq=player.getComponent('minecraft:equippable'),s=eq?.getEquipment('Offhand'),b=s&&BAIT_ITEMS[s.typeId];if(!b)return undefined;
  const d=b.reusable&&s.getComponent('minecraft:durability');
  if(d){if(d.damage+1>=d.maxDurability){eq.setEquipment('Offhand',undefined);player.playSound('random.break');}else{d.damage++;eq.setEquipment('Offhand',s);}}
  else if(s.amount>1){s.amount--;eq.setEquipment('Offhand',s);}else eq.setEquipment('Offhand',undefined);
  return {id:s.typeId,...b};}catch{return undefined;}
}
export {placeHint};

// The fisher (Notion 釣り師): a fish a 釣り師 lands becomes one of the species below, chosen by where (biome), when
// (day / night) and the bait in use; each has a size, and the rare ones a grade. Legendary fish appear only under
// their own conditions. The fishing log (図鑑) shows every species with a hint, the ones caught, and the biggest of
// each; it also picks the bait. Opened by using a fishing rod while sneaking.
export const FISH_JOB='釣り師';
export const BAITS=[
 {key:'none',name:'餌なし'},
 {key:'seeds',name:'小麦の種',item:'minecraft:wheat_seeds',likes:'川や平野の魚'},
 {key:'worm',name:'腐った肉',item:'minecraft:rotten_flesh',likes:'夜の大物'},
 {key:'berry',name:'グロウベリー',item:'minecraft:glow_berries',likes:'色鮮やかな魚'},
 {key:'eye',name:'クモの目',item:'minecraft:spider_eye',likes:'深い海の魚'}];
// the 100 species (fish-species.js, generated from the fish set): each is its own item (cooptown:fish_<id>) with
// its picture; where = a pattern on the biome id, time = 'day' / 'night' / any, bait = the bait it likes
export const SPECIES=FISH_SPECIES.map(s=>({...s,item:s.id,where:new RegExp(s.where)}));
export const RANKS=[{label:'',chance:1},{label:'レア',chance:.18,xp:8},{label:'伝説',chance:.025,xp:40}];
const KEY='cooptown:fishlog';
const FISH=new Set(['minecraft:cod','minecraft:salmon','minecraft:tropical_fish','minecraft:pufferfish']); // what the hook lands (vanilla)
const active=new Set();
// vanilla fish caught by non-fishers: size range (cm) and name for the log
const VANILLA_SIZE={'minecraft:cod':[20,60],'minecraft:salmon':[30,80],'minecraft:tropical_fish':[5,15],'minecraft:pufferfish':[10,30]};
const itemLabel={'minecraft:cod':'タラ','minecraft:salmon':'サケ','minecraft:tropical_fish':'熱帯魚','minecraft:pufferfish':'フグ'};

/** The species a catch becomes: first the rank (legendary RANKS[2].chance, rare RANKS[1].chance; the liked bait
 *  makes its rank twice as likely when such a fish lives here), then a species of that rank living here and now
 *  (the liked bait four times as likely). Undefined when nothing lives here. */
export function chooseSpecies(biome,night,bait,random=Math.random,extra={}){
 const fits=SPECIES.filter(s=>s.where.test(biome)&&(!s.time||(s.time==='night')===night));
 if(!fits.length)return undefined;
 const of=r=>fits.filter(s=>s.rank===r),pick=list=>{const w=list.map(s=>s.bait===bait?4:1);let r=random()*w.reduce((a,b)=>a+b,0);return list[w.findIndex(x=>(r-=x)<0)]??list[0];};
 for(const r of [2,1]){const list=of(r);if(!list.length)continue;const boost=(list.some(s=>s.bait===bait)?2:1)*(extra.rare??1)*(r===2?extra.legend??1:1);if(random()<RANKS[r].chance*boost)return pick(list);}
 const common=of(0);return pick(common.length?common:fits);
}
// sizes (design: 釣り｜魚の種類・出現条件・サイズ・ランク): most near the middle of the species' range, and now and then
// (FISH_SIZE.bigChance) an extra large one (特大) above the range, up to bigMax times its top; 特大 is announced
export const FISH_SIZE={bigChance:.03,bigMax:1.5,rankTop:3,rankKey:'cooptown:fish_top'};
export function sizeOf(s,random=Math.random,bigBonus=0){ // bigBonus: 大物狙い (skill-config.js)
 const [lo,hi]=s.size;
 if(random()<FISH_SIZE.bigChance+bigBonus)return {size:Math.round(hi*(1.05+(FISH_SIZE.bigMax-1.05)*random())),big:true};
 const bell=(random()+random()+random())/3; // around the middle
 return {size:Math.round(lo+(hi-lo)*bell),big:false};
}
/** The size ranking with a new catch: the species' top FISH_SIZE.rankTop ({n, s, at}); the place (1..) or 0. */
export function rankCatch(top,name,size,at=Date.now()){
 const list=[...(top??[]),{n:name,s:size,at}].sort((a,b)=>b.s-a.s||a.at-b.at).slice(0,FISH_SIZE.rankTop);
 return {list,place:list.findIndex(x=>x.at===at&&x.n===name&&x.s===size)+1};
}
const readTop=()=>{try{return JSON.parse(world.getDynamicProperty(FISH_SIZE.rankKey)??'{}');}catch{return {};}};
function logOf(player){try{const v=JSON.parse(player.getDynamicProperty(KEY)??'{}');return {bait:v.bait??'none',caught:v.caught??{}};}catch{return {bait:'none',caught:{}};}}
const saveLog=(player,l)=>{try{player.setDynamicProperty(KEY,JSON.stringify(l));}catch{}};
const night=()=>{try{const t=world.getTimeOfDay();return t>=13000&&t<23000;}catch{return false;}};

export function installFishing({game}){
 installFishHooks();
 const isFisher=player=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return [p?.job,p?.secondJob].includes(FISH_JOB);};
 const swapped=new Set();
 // a landed fish (an item next to the hook) becomes a species
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(entity.typeId!=='minecraft:item'||swapped.delete(entity.id))return;
  let stack;try{stack=entity.getComponent('minecraft:item')?.itemStack;}catch{}
  if(!stack||!FISH.has(stack.typeId)||stack.nameTag)return;
  // whose hook landed it (fish-hook.js: remembered hooks, also just after the hook is gone)
  const owner=catcherOf(entity);
  if(owner?.typeId!=='minecraft:player')return;
  // non-fishers keep the vanilla fish, now with a size and the food-style lore (food-lore.js VANILLA_FISH)
  if(!isFisher(owner)){
   const range=VANILLA_SIZE[stack.typeId],size=Math.round(range[0]+(range[1]-range[0])*Math.pow(Math.random(),1.6)),dim=entity.dimension;
   system.run(()=>{try{entity.remove();}catch{}
    try{const fish=new ItemStack(stack.typeId,stack.amount);fish.setLore([`§f大きさ ${size}cm`]);stamp(fish);ensureInfo(fish);setCreator(fish,owner.name,CATCHER);
     const left=owner.getComponent('minecraft:inventory')?.container?.addItem(fish);if(left){const e=dim.spawnItem(left,owner.location);swapped.add(e.id);}
     pushText(owner,'fish',`§f${itemLabel[stack.typeId]} ${size}cm`);}catch(e){console.warn('[CoopTown] 釣り: '+e);}});
   return;
  }
  const log=logOf(owner),bait=BAITS.find(b=>b.key===log.bait)??BAITS[0];
  let biome='';try{biome=owner.dimension.getBiome(owner.location)?.id??'';}catch{}
  // bait is used up one per catch; without it the bait is ignored
  const container=owner.getComponent('minecraft:inventory')?.container;
  // a job bait in the off hand (job-tools-config.js BAIT_ITEMS) comes first; then the bait picked in the log
  const job=offhandBait(owner);
  const baitOn=!job&&bait.item&&stock(container)(bait.item)>0;if(baitOn)take(container,bait.item,1);
  const usedKey=job?job.key:baitOn?bait.key:'none';if(job||baitOn)titleSeen(owner,'bait_used',job?job.id:bait.key);
  // the skill tree (skill-config.js): 魚影の勘 makes rare / legendary fish likelier, 大物狙い 特大
  let fp;try{fp=game.peek(d=>d.players[owner.id]);}catch{}
  const rod=heldRod(owner); // a better rod (fishing-rods.js): rare fish likelier, easier reeling
  const species=chooseSpecies(biome,night(),usedKey,Math.random,{...(job??{}),rare:(job?.rare??1)*(1+skillValue(fp,FISH_JOB,'rare'))*rod.rare});if(!species)return;
  if(species.bait&&species.bait===usedKey)titleSeen(owner,'bait_liked',usedKey);
  const rolled=sizeOf(species,Math.random,skillValue(fp,FISH_JOB,'big')),size=rolled.size,l=entity.location,dim=entity.dimension;
  system.run(async()=>{try{entity.remove();}catch{}
  // every catch is landed with the reeling minigame (reel-game.js); keeping the fish in the frame longer raises the
  // quality chance. A broken line or running out of time loses the fish (the bait is gone).
  let lv=1,jobLevel=1,dex=10,reelSk=0,rankSk=0;try{const pd=game.peek(d=>d.players[owner.id]);lv=pd?.gather?.level??1;jobLevel=pd?.level??1;dex=dexOf(owner,pd);reelSk=skillValue(pd,FISH_JOB,'reel');rankSk=skillValue(pd,FISH_JOB,'rank');}catch{} // jobLevel: the job's level makes the reeling easier
  const game_=await playReel(owner,species.rank,{onStart:()=>mapPaused.add(owner.id),onEnd:()=>mapPaused.delete(owner.id),stats:()=>lastStats.get(owner.id)??'',level:jobLevel,extraEase:dexEase(dex)+reelSk+rod.ease});
  if(!game_.ok){try{pushText(owner,'fish',game_.result==='snap'?'§c糸が切れた…逃げられた':game_.result==='quit'?'§7釣りをやめた':'§7時間切れ…逃げられた');owner.playSound('random.break');}catch{}return;}
  try{owner.playSound('random.orb');}catch{}
  const tier=rollQuality(lv,Math.min(.3,game_.score*.3)+rankSk);titleMax(owner,'reel_best',Math.round(game_.score*100)); // 記録 and the week's contest
  const fish=new ItemStack(species.item,1); // the species' own item (its name and picture)
  try{fish.setLore([`§f大きさ ${size}cm`,...(species.rank?[`${species.rank===2?'§6':'§b'}${RANKS[species.rank].label}`]:[])]);}catch{}
  setQuality(fish,tier);stamp(fish);ensureInfo(fish);setCreator(fish,owner.name,CATCHER); // the food-style lore (food-lore.js)
  jobCount(owner,'fish');if(species.rank)jobCount(owner,'rare_fish');
  const rec=log.caught[species.name]??{n:0,max:0};rec.n++;const record=size>rec.max;rec.max=Math.max(rec.max,size);log.caught[species.name]=rec;saveLog(owner,log);
  // titles (titles-config.js): species, legends, own size records, where and when, rank S, the rod, 魚影調査薬
  titleSeen(owner,'fish_species',species.id);if(species.rank===2)titleSeen(owner,'fish_legend',species.id);if(record&&rec.n>1)titleSeen(owner,'fish_records',species.id);
  if(tier>=4)titleTrack(owner,'fish_rank:S');titleMax(owner,'fish_max_cm',size); // the awards' biggest fish
  // 特大 and the size ranking (fishers' own catches only)
  if(rolled.big){try{cheer(owner,'medium','§6特大！');world.sendMessage(`§6${owner.name}が特大の${species.name}（${size}cm）を釣り上げた！`);}catch{}}
  {const all=readTop(),r=rankCatch(all[species.id],owner.name,size);if(r.place){all[species.id]=r.list;try{world.setDynamicProperty(FISH_SIZE.rankKey,JSON.stringify(all));}catch{}
   try{owner.sendMessage(`§b${species.name}のサイズランキング ${r.place}位（${size}cm）`);}catch{}}}
  try{titleSeen(owner,'fish_biomes',String(owner.dimension.getBiome(owner.location)?.id??'').replace('minecraft:',''));}catch{}
  {const t=world.getTimeOfDay();titleSeen(owner,'fish_times',t>=12500&&t<23500?'night':t<3000||t>=23500?'morning':t<9000?'noon':'evening');}
  try{const rod=owner.getComponent('minecraft:equippable')?.getEquipment('Mainhand');if(rod?.getComponent('minecraft:enchantable')?.getEnchantment('lure'))titleTrack(owner,'fish_with:lure');}catch{}
  try{if(buffLeft(owner,'fish')>0)titleTrack(owner,'fish_with:fish_eye');}catch{}
  if(species.rank)try{game.execute(owner.id,'job.earn',{skill:'gather',xp:RANKS[species.rank].xp,note:`${species.name} ${size}cm`});pushLog(owner,'xp:gather',LOG_KINDS.gatherXp,RANKS[species.rank].xp);}catch{}
  // straight into the inventory (the hook's catch was taken away; after the minigame it would land far off)
  try{const basket=['cooptown:fish_basket_master','cooptown:fish_basket_mid','cooptown:fish_basket'].reduce((n,id)=>n||stashInBag(owner,fish,id),0); // a fish basket in the inventory takes it
   const left=basket?undefined:owner.getComponent('minecraft:inventory')?.container?.addItem(fish);if(left){const e=dim.spawnItem(left,owner.location);swapped.add(e.id);}
   if(basket)try{owner.playSound('random.pop',{pitch:.8,volume:.5});pushText(owner,'basket','§7魚籠に入れました');}catch{}
   // the catch goes to the log on the right (hud-log.js), like the XP
   pushText(owner,'fish',`${species.rank===2?'§6伝説！':species.rank?'§bレア！':'§f'}${species.name} ${size}cm`+(record?' §a自己ベスト':''));
   if(species.rank===2)cheer(owner,'big');else if(species.rank)cheer(owner,'small');}catch{}
  });
 });
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  try{
   for(;;){
    const log=logOf(player),found=SPECIES.filter(s=>log.caught[s.name]).length,bait=BAITS.find(b=>b.key===log.bait)??BAITS[0];
    const i=await chooseDialog(player,'釣り図鑑',`発見 ${found} / ${SPECIES.length}　今の餌：${bait.name}`,['魚の一覧','餌を選ぶ'],{back:'閉じる'});
    if(i===undefined)return;
    if(i===0){
     // 100 species: pick a group (the fish set's categories) first
     const cats=[...new Set(SPECIES.map(s=>s.cat))];
     const c=await chooseDialog(player,'魚の一覧','見たい分類を選んでください。',cats.map(k=>{const list=SPECIES.filter(s=>s.cat===k);return `${k}　${list.filter(s=>log.caught[s.name]).length} / ${list.length}`;}));
     if(c===undefined)continue;
     const lines=SPECIES.filter(s=>s.cat===cats[c]).map(s=>{const got=log.caught[s.name];const tag=['','§b[レア]','§6[伝説]'][s.rank];
      if(got)return `${tag}§f${s.name}　${got.n}匹　最大 ${got.max}cm`;
      const when=s.time==='day'?'昼':s.time==='night'?'夜':'';
      return `${tag}§7？？？　ヒント：${placeHint(s.where.source)}${when?'の'+when:''}${s.bait?'・'+BAITS.find(b=>b.key===s.bait).name+'が好き':''}`;});
     await noticeDialog(player,cats[c],lines.join('\n'),{close:'戻る'});
    }else{
     const b=await chooseDialog(player,'餌を選ぶ','餌は釣れるたびに1個使います（持っていないときは餌なし）。\n'+BAITS.slice(1).map(x=>`${x.name}：${x.likes}`).join('\n'),BAITS.map(x=>x.name));
     if(b!==undefined){log.bait=BAITS[b].key;saveLog(player,log);}
    }
   }
  }catch(e){console.warn('[CoopTown] 釣り図鑑: '+e);}
  finally{active.delete(player.id);}
 }
 // the fishing log: using a fishing rod while sneaking
 world.beforeEvents.itemUse?.subscribe(event=>{
  const {source:player,itemStack}=event;
  if(itemStack?.typeId!=='minecraft:fishing_rod'||!player.isSneaking||!isFisher(player))return;
  event.cancel=true;system.run(()=>void open(player));
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
 // /cooptown:fishlog (commands.js)
 setCommandHandlers({fishlog:player=>isFisher(player)?open(player):player.sendMessage('§e釣り図鑑は'+FISH_JOB+'だけが使えます。'),
  // /cooptown:fishrank: each species' biggest three (anyone can look)
  fishrank:async player=>{
   const all=readTop(),list=FISH_SPECIES.filter(s=>all[s.id]?.length);
   if(!list.length){await noticeDialog(player,'サイズランキング','まだ記録がありません。',{close:'閉じる'});return;}
   const k=await chooseDialog(player,'サイズランキング','魚を選ぶと上位3人が見られます。',list.map(s=>`${s.name}　1位 ${all[s.id][0].n} ${all[s.id][0].s}cm`));if(k===undefined)return;
   const s=list[k];await noticeDialog(player,s.name+'のサイズランキング',all[s.id].map((x,i)=>`${i+1}位 ${x.n}　${x.s}cm`).join('\n'),{close:'閉じる'});}});
}
