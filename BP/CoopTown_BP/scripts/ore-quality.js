import {world,system,ItemStack} from '@minecraft/server';
import {isPlaced} from './placed-store.js';
import {oreKind,woodOf} from './bulk-harvest.js';
import {rollQuality,setQuality} from './quality.js';
import {GRIND_JOB,SAW_JOB,rankCap} from './workshop-config.js';
import {titleTrack} from './job-count.js';
import {skillValue} from './skill-config.js';

// Ore and log quality (design: 鉱夫｜採掘・鉱石品質, 林業｜木材品質): a 冒険家 (main or second job) breaking a natural ore
// or log by hand rolls a rank with the job level, capped as workshop-config.js rankCap (初級 C, 中級 B = 良質, 上級 S =
// 極上). The drop that comes out at that block in the next ticks is swapped for the same items marked with it (as the
// farmer's crops, quality-runtime.js). Placed blocks never roll. Title counts: ore_good / log_good (B or better = 良質),
// ore_top / log_top and log_top:<wood> (A or better = 極上).
const ORE_DROPS={coal:['coal'],iron:['raw_iron'],copper:['raw_copper'],gold:['raw_gold'],redstone:['redstone'],lapis:['lapis_lazuli'],
 diamond:['diamond'],emerald:['emerald'],quartz:['quartz'],nether_gold:['gold_nugget'],ancient_debris:['ancient_debris']};
const GOOD=2,TOP=3,WINDOW=3;
const pending=[]; // {dimension, x, y, z, ids, tier, until}
const placedNow=new Map(); // player id -> whether the block about to break was placed
/** The item ids a broken ore / log may drop (silk touch: the block itself). */
export function dropsOf(blockId){
 const ore=oreKind(blockId);if(ore)return [...(ORE_DROPS[ore]??[]).map(s=>'minecraft:'+s),blockId];
 return woodOf(blockId)?[blockId]:undefined;
}

export function installOreQuality({game}){
 // ore: 鉱夫, logs: 木こり (2026-10-30)
 const worker=(player,job)=>{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}return p&&[p.job,p.secondJob].includes(job)?p:undefined;};
 world.beforeEvents.playerBreakBlock.subscribe(({player,block})=>{
  if(!dropsOf(block.typeId))return;
  let placed=false;try{placed=isPlaced(block.dimension.id,block.location);}catch{}placedNow.set(player.id,placed);
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,block,brokenBlockPermutation})=>{
  const id=brokenBlockPermutation.type.id,ids=dropsOf(id);if(!ids)return;
  const placed=placedNow.get(player.id);placedNow.delete(player.id);if(placed)return;
  const wood=woodOf(id),job=wood?SAW_JOB:GRIND_JOB,p=worker(player,job);if(!p)return;
  // 鉱石・木目の目利き (skill-config.js rank)
  const lv=p.level??1,tier=Math.min(rankCap(lv),rollQuality(lv,skillValue(p,job,'rank'))),kind=wood?'log':'ore';
  if(tier>=GOOD)titleTrack(player,kind+'_good');
  if(tier>=TOP){titleTrack(player,kind+'_top');if(wood)titleTrack(player,'log_top:'+wood);}
  if(tier)pending.push({dimension:block.dimension.id,x:block.location.x+.5,y:block.location.y+.5,z:block.location.z+.5,ids,tier,until:system.currentTick+WINDOW});
 });
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(!pending.length||entity.typeId!=='minecraft:item')return;
  const now=system.currentTick;for(let i=pending.length-1;i>=0;i--)if(pending[i].until<now)pending.splice(i,1);
  let stack;try{stack=entity.getComponent('minecraft:item')?.itemStack;}catch{}
  if(!stack)return;
  const l=entity.location,hit=pending.find(q=>q.ids.includes(stack.typeId)&&q.dimension===entity.dimension.id&&Math.hypot(q.x-l.x,q.y-l.y,q.z-l.z)<1.6);
  if(!hit)return;
  pending.splice(pending.indexOf(hit),1);
  const marked=setQuality(new ItemStack(stack.typeId,stack.amount),hit.tier);
  const dim=entity.dimension;system.run(()=>{try{entity.remove();dim.spawnItem(marked,l);}catch{}});
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>placedNow.delete(playerId));
}
