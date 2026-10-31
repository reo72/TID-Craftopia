import {world,system} from '@minecraft/server';
import {isPlaced} from './placed-store.js';
import {MINE_BLOCKS} from './mine-config.js';
import {GATHER_BLOCKS} from './gather-config.js';
import {titleTrack,titleSeen,jobCount} from './job-count.js';
import {pushText} from './hud-log.js';
import {skillValue} from './skill-config.js';

// The miner's and woodcutter's work (design: 鉱夫｜鉱脈掘り・鉱石探知・坑道の安全, 林業｜一括伐採・植林; 鉱夫 and 木こり work
// here). Sneak while breaking with the right tool:
//  鉱脈掘り   a pickaxe on an ore takes the connected ore of the same kind, up to the job level's cap (VEIN);
//  マインオール at Lv.50 as the main job, the same for natural stone / deepslate / gravel (and up to 64 ore), with a cooldown;
//  一括伐採   an axe on a log takes the connected logs of the tree (TREE); at Lv.50 a sapling from the bag is planted.
// Only natural blocks (placed-store.js) and only what the tool can take: each block costs durability (unbreaking
// as usual) and the run stops before the tool would break. Drops are the game's own for the held tool (loot ... mine
// ... mainhand: fortune / silk touch count). XP and the title counts are the same as breaking them one by one.
// 鉱石探知 (/cooptown:tanchi, or sneak + use a pickaxe): the kinds unlocked by level, nearest of each within a radius,
// with a rough direction; a cooldown. 坑道の安全: lava next to the path ahead or a big drop is shown on the HUD log.
export const BULK={job:'鉱夫',treeJob:'木こり',vein:[[50,64],[30,24],[10,8]],tree:[[50,128],[30,48],[10,16]],mineAll:{level:50,cap:64,cooldownMs:8000},
 detect:{radius:10,cooldownMs:60000,kinds:[[10,['coal','iron','copper']],[20,['gold','redstone','lapis']],[30,['diamond','emerald']]]},hazard:{everyTicks:20,noteMs:8000}};
const DETECTED_MS=10*60000;
/** The mining codex's name of an ore block (titles-config.js ORE_BLOCKS): lit_redstone_ore -> redstone_ore. */
export const oreBlock=id=>{const s=short(id).replace(/^lit_/,'');return s==='quartz_ore'?'nether_quartz_ore':s;};
/** How many blocks a level allows ([[level, cap], ...] highest first); 0 below the first. */
export const capFor=(levels,lv)=>levels.find(([l])=>(lv??0)>=l)?.[1]??0;
/** The ore kinds a level can detect. */
export const detectable=lv=>BULK.detect.kinds.filter(([l])=>(lv??0)>=l).flatMap(([,k])=>k);
const short=id=>String(id??'').replace(/^minecraft:/,'');
/** The ore kind of a block id (iron for iron_ore / deepslate_iron_ore / lit_ ... ), else undefined. */
export function oreKind(id){
 const s=short(id).replace(/^lit_/,'');if(s==='ancient_debris')return 'ancient_debris';if(s==='nether_gold_ore')return 'nether_gold';if(s==='quartz_ore'||s==='nether_quartz_ore')return 'quartz';
 const m=/^(?:deepslate_)?(\w+)_ore$/.exec(s);return m?.[1];
}
const MINE_ALL=new Set(['deepslate','granite','diorite','andesite','tuff','calcite','blackstone','end_stone','netherrack','gravel','stone','cobbled_deepslate']);
/** The wood of a log (oak for oak_log); stripped logs and placed wood do not count. */
export const woodOf=id=>{const m=/^(\w+?)_(log|stem)$/.exec(short(id));return m&&!m[1].startsWith('stripped')?m[1]:undefined;};
const SAPLING={oak:'oak_sapling',spruce:'spruce_sapling',birch:'birch_sapling',jungle:'jungle_sapling',acacia:'acacia_sapling',dark_oak:'dark_oak_sapling',cherry:'cherry_sapling',mangrove:'mangrove_propagule',pale_oak:'pale_oak_sapling',crimson:'crimson_fungus',warped:'warped_fungus'};
const N6=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const N26=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)if(x||y||z)N26.push([x,y,z]);
/** The connected blocks matching `same` from a start (not the start), up to cap, nearest first. */
export function connected(getType,start,same,cap,neighbours=N26,maxSteps=4000){
 const key=p=>`${p.x},${p.y},${p.z}`,seen=new Set([key(start)]),queue=[start],out=[];let steps=0;
 while(queue.length&&out.length<cap&&steps++<maxSteps){
  const p=queue.shift();
  for(const [dx,dy,dz] of neighbours){
   const q={x:p.x+dx,y:p.y+dy,z:p.z+dz},k=key(q);if(seen.has(k))continue;seen.add(k);
   if(!same(getType(q)))continue;out.push(q);queue.push(q);if(out.length>=cap)break;
  }
 }
 return out;
}
const dirText=(dx,dz,dy)=>{const ns=Math.abs(dz)>2?(dz<0?'北':'南'):'',ew=Math.abs(dx)>2?(dx>0?'東':'西'):'',ud=dy>2?'上':dy<-2?'下':'';return (ns+ew||'すぐ近く')+(ud?'・'+ud:'');};

export function installBulkHarvest({game}){
 // the miner's work is 鉱夫's, the tree's 木こり's (jobs of their own again 2026-10-30)
 const job=(player,which=BULK.job)=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}if(!p)return;return {main:p.job===which,has:[p.job,p.secondJob].includes(which),level:p.level??1,more:1+skillValue(p,which,'bulk')};}; // more: まとめ掘り (skill-config.js)
 const mineAllAt=new Map(),detectAt=new Map(),hazardAt=new Map();
 const note=(player,key,text)=>{try{pushText(player,key,text);}catch{}};
 // breaks one more block as the player with the held tool; false when the tool cannot take another
 function take(player,dim,p){
  const eq=player.getComponent('minecraft:equippable'),tool=eq?.getEquipment('Mainhand');
  const dur=tool?.getComponent('minecraft:durability');
  if(dur){
   if(dur.damage+1>=dur.maxDurability)return false;
   let unb=0;try{unb=tool.getComponent('minecraft:enchantable')?.getEnchantment('unbreaking')?.level??0;}catch{}
   if(Math.random()<1/(unb+1)){dur.damage++;try{eq.setEquipment('Mainhand',tool);}catch{}}
  }
  try{player.runCommand(`loot spawn ${p.x} ${p.y} ${p.z} mine ${p.x} ${p.y} ${p.z} mainhand`);}catch{}
  try{dim.getBlock(p)?.setType('minecraft:air');}catch{return false;}
  return true;
 }
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation})=>{
  if(!player.isSneaking)return;
  const id=brokenBlockPermutation.type.id,s=short(id),tool=player.getComponent('minecraft:equippable')?.getEquipment('Mainhand')?.typeId??'';
  const ore=oreKind(id),wood=woodOf(id),stone=MINE_ALL.has(s);
  if(!((ore||stone)&&/_pickaxe$/.test(tool))&&!(wood&&/_axe$/.test(tool)))return;
  const j=job(player,wood?BULK.treeJob:BULK.job);if(!j?.has)return;
  const dim=block.dimension,start={...block.location},getType=p=>{try{return dim.getBlock(p)?.typeId;}catch{return undefined;}};
  let cap=0,same,neighbours=N26,kind;
  if(wood){cap=Math.floor(capFor(BULK.tree,j.level)*j.more);same=t=>woodOf(t)===wood;kind='tree';}
  else if(ore){cap=j.main&&j.level>=BULK.mineAll.level?BULK.mineAll.cap:Math.floor(capFor(BULK.vein,j.level)*j.more);same=t=>oreKind(t)===ore;kind='ore';}
  else{ // マインオール: main job at Lv.50, with a cooldown
   if(!(j.main&&j.level>=BULK.mineAll.level))return;
   const left=(mineAllAt.get(player.id)??0)-Date.now();if(left>0){note(player,'bulk',`§7マインオールはあと${Math.ceil(left/1000)}秒`);return;}
   cap=BULK.mineAll.cap;same=t=>short(t)===s;neighbours=N6;kind='stone';
  }
  if(cap<=0)return;
  const found=connected(getType,start,same,cap,neighbours).filter(p=>{try{return !isPlaced(dim.id,p);}catch{return true;}});
  if(!found.length)return;
  if(kind==='stone')mineAllAt.set(player.id,Date.now()+BULK.mineAll.cooldownMs);
  system.run(()=>{
   let n=0;const types={};
   for(const p of found){const t=getType(p);if(!t||!same(t))continue;if(!take(player,dim,p))break;n++;types[t]=(types[t]??0)+1;}
   if(!n)return;
   // XP and the title counts, as if broken one by one
   for(const [t,c] of Object.entries(types)){
    try{if(MINE_BLOCKS[t])game.execute(player.id,'mine.work',{type:t,count:c});else if(GATHER_BLOCKS[t])game.execute(player.id,'gather.work',{type:t,count:c});}catch{}
    const o=oreKind(t),w=woodOf(t);
    if(o){titleTrack(player,'ore:'+o,c);titleSeen(player,'ores',o);titleSeen(player,'ore_blocks',oreBlock(t));jobCount(player,'mine_ore',c);}else if(w){titleTrack(player,'log',c);titleSeen(player,'log_kinds',w);jobCount(player,'chop_log',c);}else if(MINE_ALL.has(short(t))){titleTrack(player,'stone',c);jobCount(player,'mine_stone',c);}
   }
   // titles: 鉱脈掘り / 一括伐採 totals (the first block, broken by hand, counts too); ore the detector showed
   if(kind==='ore')titleTrack(player,'vein_ore',n+1);else if(kind==='tree')titleTrack(player,'bulk_log',n+1);
   for(const p of found)minedDetected(player,dim.id,p);
   note(player,'bulk',kind==='tree'?`§a一括伐採 原木×${n+1}`:kind==='ore'?`§b鉱脈掘り ×${n+1}`:`§bマインオール ×${n+1}`);
   // Lv.50: a sapling from the bag where the tree stood
   if(kind==='tree'&&j.level>=50){
    const sap=SAPLING[wood],ground=dim.getBlock({...start,y:start.y-1});
    if(sap&&/^minecraft:(dirt|grass_block|podzol|coarse_dirt|rooted_dirt|mud|moss_block|crimson_nylium|warped_nylium)$/.test(ground?.typeId??'')&&dim.getBlock(start)?.typeId==='minecraft:air'){
     const c=player.getComponent('minecraft:inventory')?.container;
     for(let i=0;c&&i<c.size;i++){const st=c.getItem(i);if(st?.typeId!=='minecraft:'+sap)continue;
      try{dim.getBlock(start).setType('minecraft:'+sap);if(st.amount>1){st.amount--;c.setItem(i,st);}else c.setItem(i,undefined);titleTrack(player,'sapling');titleSeen(player,'planted',sap);}catch{}break;}
    }
   }
  });
 });
 // ---- 鉱石探知 ----
 // the ore it showed, for the titles 金属探知機 / 人工衛星: mined within DETECTED_MS counts (diamond / emerald = 上位)
 const detected=new Map(); // player id -> {until, at: Map("dim|x|y|z" -> upper)}
 function minedDetected(player,dimId,p){
  const d=detected.get(player.id);if(!d)return;if(Date.now()>d.until){detected.delete(player.id);return;}
  const k=`${dimId}|${p.x}|${p.y}|${p.z}`;if(!d.at.has(k))return;
  titleTrack(player,'detected_ore');if(d.at.get(k))titleTrack(player,'detected_ore_hi');d.at.delete(k);
 }
 world.afterEvents.playerBreakBlock.subscribe(({player,block})=>{if(detected.has(player.id))minedDetected(player,block.dimension.id,block.location);});
 function detect(player){
  const j=job(player);if(!j?.has)return '§e鉱石探知は鉱夫の技です。';
  const kinds=detectable(j.level);if(!kinds.length)return `§e鉱石探知は職業Lv.${BULK.detect.kinds[0][0]}から使えます。`;
  const left=(detectAt.get(player.id)??0)-Date.now();if(left>0)return `§7鉱石探知はあと${Math.ceil(left/1000)}秒で使えます。`;
  detectAt.set(player.id,Date.now()+BULK.detect.cooldownMs);
  const r=BULK.detect.radius,l=player.location,dim=player.dimension,near={},seen=new Map();
  for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++){
   let t;try{t=dim.getBlock({x:Math.floor(l.x)+x,y:Math.floor(l.y)+y,z:Math.floor(l.z)+z})?.typeId;}catch{continue;}
   const k=oreKind(t);if(!k||!kinds.includes(k))continue;const d=x*x+y*y+z*z;
   if(seen.size<300)seen.set(`${dim.id}|${Math.floor(l.x)+x}|${Math.floor(l.y)+y}|${Math.floor(l.z)+z}`,k==='diamond'||k==='emerald');
   if(!near[k]||d<near[k].d)near[k]={d,x,y,z,n:(near[k]?.n??0)+1};else near[k].n++;
  }
  detected.set(player.id,{until:Date.now()+DETECTED_MS,at:seen});
  const NAMES={coal:'石炭',iron:'鉄',copper:'銅',gold:'金',redstone:'レッドストーン',lapis:'ラピスラズリ',diamond:'ダイヤモンド',emerald:'エメラルド'};
  const lines=Object.entries(near).map(([k,v])=>`${NAMES[k]??k} ${v.n}個（${dirText(v.x,v.z,v.y)}）`);
  try{player.playSound('note.chime',{pitch:1.4,volume:.5});}catch{}
  return lines.length?'§b鉱石探知：§r'+lines.join('、'):'§7近くに探知できる鉱石はありません。';
 }
 world.afterEvents.itemUse.subscribe(({source,itemStack})=>{if(source?.isSneaking&&/_pickaxe$/.test(itemStack?.typeId??''))system.run(()=>{try{source.sendMessage(detect(source));}catch{}});});
 // ---- 坑道の安全: lava beside the way ahead, or a drop of 5+ in front ----
 system.runInterval(()=>{
  const now=Date.now();
  for(const player of world.getAllPlayers()){
   try{
    const tool=player.getComponent('minecraft:equippable')?.getEquipment('Mainhand')?.typeId??'';if(!/_pickaxe$/.test(tool))continue;
    if((hazardAt.get(player.id)??0)>now)continue;
    const dir=player.getViewDirection(),l=player.location,dim=player.dimension;
    const fx=Math.abs(dir.x)>=Math.abs(dir.z)?Math.sign(dir.x):0,fz=fx?0:Math.sign(dir.z);if(!fx&&!fz)continue;
    let warn='';
    for(let s=1;s<=3&&!warn;s++)for(let dy=-1;dy<=1&&!warn;dy++)for(const side of [-1,0,1]){
     const p={x:Math.floor(l.x)+fx*s+(fz?side:0),y:Math.floor(l.y)+dy,z:Math.floor(l.z)+fz*s+(fx?side:0)};
     if(/lava$/.test(dim.getBlock(p)?.typeId??'')){warn='§c溶岩が近くにあります！';break;}
    }
    if(!warn){const ahead={x:Math.floor(l.x)+fx,y:Math.floor(l.y)-1,z:Math.floor(l.z)+fz};let drop=0;
     for(let d=0;d<8;d++){const t=dim.getBlock({...ahead,y:ahead.y-d})?.typeId;if(t==='minecraft:air'||t==='minecraft:cave_air')drop++;else break;}
     if(drop>=5)warn=`§e足元の先が${drop}ブロック以上の段差です`;}
    if(warn){hazardAt.set(player.id,now+BULK.hazard.noteMs);note(player,'hazard',warn);}
   }catch{}
  }
 },BULK.hazard.everyTicks);
 return {detect};
}
