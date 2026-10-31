import {world,system} from '@minecraft/server';
import {titleSeen,titleTrack} from './job-count.js';
import {cheer} from './celebrate.js';

// 伝説の個体 (asked 2026-10-27): now and then an animal appears as a named, golden-glowing one of its kind. The first
// player who comes near finds it: everyone hears, its name and finder go in the server's record (book: やり込み →
// 伝説の個体), and the finder's collection (seen legend_found). A registered one rolls better products (ranch-runtime.js).
export const LEGEND={tag:'ct_legend',chance:.004,findRange:8,key:'cooptown:legends',keep:50,found:'cooptown:legend_found'};
export const LEGEND_KINDS={
 'minecraft:cow':'金毛のウシ「ゴルディ」','minecraft:sheep':'虹の羊毛のヒツジ「レイン」','minecraft:pig':'幸運のブタ「フク」','minecraft:chicken':'黄金卵のニワトリ「コッコ」',
 'minecraft:horse':'白銀のウマ「シルバ」','minecraft:rabbit':'月のウサギ「ルナ」','minecraft:wolf':'森の王オオカミ「ガロ」','minecraft:cat':'招きネコ「マネキ」'};
const short=id=>id.replace('minecraft:','');
/** The server's record: [{name, type, finder, at}] newest first. */
export function legendList(){try{const v=JSON.parse(world.getDynamicProperty(LEGEND.key)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}
/** Whether a fresh animal becomes legendary (random < chance). */
export const rollLegend=(type,random=Math.random)=>!!LEGEND_KINDS[type]&&random()<LEGEND.chance;
export function installLegends(){
 world.afterEvents.entitySpawn?.subscribe(({entity})=>{
  let type;try{type=entity.typeId;}catch{return;}
  if(!rollLegend(type))return;
  system.runTimeout(()=>{try{if(!entity.isValid||entity.nameTag)return;entity.nameTag='§6'+LEGEND_KINDS[type];entity.addTag(LEGEND.tag);}catch{}},5);
 });
 system.runInterval(()=>{
  for(const dim of ['overworld','nether','the_end']){
   let list;try{list=world.getDimension(dim).getEntities({tags:[LEGEND.tag]});}catch{continue;}
   for(const e of list){
    try{const l=e.location;e.dimension.spawnParticle('minecraft:totem_particle',{x:l.x+(Math.random()-.5),y:l.y+1.2,z:l.z+(Math.random()-.5)});}catch{}
    let found;try{found=e.getDynamicProperty(LEGEND.found);}catch{}
    if(found)continue;
    let finder;try{finder=e.dimension.getPlayers({location:e.location,maxDistance:LEGEND.findRange})[0];}catch{}
    if(!finder)continue;
    try{e.setDynamicProperty(LEGEND.found,finder.name);}catch{}
    const name=LEGEND_KINDS[e.typeId]??'伝説の個体';
    const list2=[{name,type:short(e.typeId),finder:finder.name,at:Date.now()},...legendList()].slice(0,LEGEND.keep);
    try{world.setDynamicProperty(LEGEND.key,JSON.stringify(list2));}catch{}
    titleSeen(finder,'legend_found',short(e.typeId));titleTrack(finder,'legend_finds');
    cheer(finder,'big');try{world.sendMessage(`§6${finder.name}が伝説の個体「${name}」を見つけた！`);}catch{}
   }
  }
 },40);
}
