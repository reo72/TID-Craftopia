import {FISH_SPECIES} from './fish-species.js';
import {POTIONS} from './potion-config.js';
import {COOK_RECIPES} from './cook-config.js';
import {SMOKE_RECIPES} from './smoke-config.js';

// やり込み (asked 2026-10-27): mastery after the job level, apprentices, collections, records and rankings, the
// weekly server goal, job guild orders, seasons and the weekly contests. Pure data and helpers (progress-engine.js
// keeps the saved state, progress-book.js shows it).
const DAY=86400000,JST=9*3600000;
/** The week number (weeks start Monday 0:00 JST). */
export const weekOf=t=>Math.floor((t+JST-4*DAY)/(7*DAY));
/** The season of a time (JST months): spring 3-5, summer 6-8, autumn 9-11, winter 12-2; id like 2026autumn. */
export function seasonOf(t){const d=new Date(t+JST),m=d.getUTCMonth()+1,y=d.getUTCFullYear();
 const k=m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';return {key:k,id:(k==='winter'&&m<=2?y-1:y)+k,...SEASONS[k]};}

// ---- マスタリー: job XP after MASTERY.level fills stars; each star buys one rank of a perk ----
export const MASTERY={level:50,perStar:5000,maxRank:5};
export const PERKS=[
 {key:'coin',name:'商売上手',per:.02,text:r=>`稼いだコイン +${r*2}%`},
 {key:'xp',name:'熟練の技',per:.02,text:r=>`採取・採掘・クラフト経験値 +${r*2}%`},
 {key:'luck',name:'幸運の星',per:.04,text:r=>`レアな魚・特別な素材の確率 +${r*4}%`},
 {key:'calm',name:'平常心',per:.04,text:r=>`ストレスのたまり方 −${r*4}%`}];
export const perkRank=(p,key)=>Math.max(0,Math.min(MASTERY.maxRank,Number(p?.mastery?.perks?.[key])||0));
export const perkMul=(p,key)=>1+perkRank(p,key)*(PERKS.find(x=>x.key===key)?.per??0);
export const starsOf=p=>Math.floor((Number(p?.mastery?.xp)||0)/MASTERY.perStar);
export const starsFree=p=>starsOf(p)-PERKS.reduce((a,x)=>a+perkRank(p,x.key),0);

// ---- 弟子: a master (job Lv.30+) and an apprentice (Lv.20 or lower, the same job) ----
export const APPRENTICE={masterLevel:30,maxLevel:20,graduate:30,maxApprentices:3,xpBonus:.1,milestones:[10,20,30],milestoneCoins:300};

// ---- コレクション: seen-sets (p.seen) against their totals; a reward at half and at all ----
export const COLLECTIONS=[
 {key:'fish_species',name:'魚',total:FISH_SPECIES.length,icon:'fisher'},
 {key:'brewed',name:'ポーション',total:POTIONS.length,icon:'alchemist'},
 {key:'dishes',name:'料理',total:new Set([...COOK_RECIPES,...SMOKE_RECIPES].map(r=>String(r.output?.[0]??r.out??r.id))).size,icon:'cook'},
 {key:'harvested',name:'作物',total:14,icon:'farmer'},
 {key:'bred',name:'動物の繁殖',total:25,icon:'leaf'},
 {key:'biomes',name:'バイオーム',total:40,icon:'compass'},
 {key:'forged',name:'鍛造した装備',total:27,icon:'blacksmith'},
 {key:'legend_found',name:'伝説の個体',total:8,icon:'medal'}];
export const COLLECTION_STEPS=[{at:.5,coins:300,tickets:1},{at:1,coins:1000,tickets:3}];
export const collectionHave=(p,c)=>Math.min(c.total,(p?.seen?.[c.key]??[]).length);

// ---- 記録: personal bests (p.tally, kept as maxes) and the server's top 3 ----
export const RECORDS=[
 {key:'fish_max_cm',name:'一番大きい魚',unit:'cm'},
 {key:'forge_best',name:'鍛造ミニゲームの最高点',unit:'点'},
 {key:'reel_best',name:'リールの最高点',unit:'点'},
 {key:'cook_best',name:'料理の最高ランク',unit:'',fmt:v=>['D','C','B','A','S'][Math.max(0,Math.min(4,v-1))]??'-'},
 {key:'crop_best',name:'作物の最高ランク',unit:'',fmt:v=>['D','C','B','A','S'][Math.max(0,Math.min(4,v-1))]??'-'},
 {key:'dungeon_clear',name:'探索戦のクリア回数',unit:'回'},
 {key:'mastery_stars',name:'マスタリーの星',unit:'個'}];
export const recordText=(r,v)=>v?(r.fmt?r.fmt(v):`${v}${r.unit}`):'記録なし';

// ---- 週替わりのサーバー目標: everyone's work together; done: all who helped can claim ----
export const GOALS=[
 {key:'j:fish',name:'みんなで魚を釣ろう',target:1000,unit:'匹'},
 {key:'j:harvest',name:'みんなで収穫しよう',target:3000,unit:'回'},
 {key:'log',name:'みんなで木を伐ろう',target:5000,unit:'本'},
 {key:'j:cook',name:'みんなで料理を作ろう',target:800,unit:'個'},
 {key:'j:smelt',name:'みんなで精錬しよう',target:2000,unit:'個'},
 {key:'kills',name:'みんなでモブを倒そう',target:2000,unit:'体'},
 {key:'walk_m',name:'みんなで歩こう',target:500000,unit:'m'}];
export const GOAL_REWARD={coins:500,tickets:2,minShare:1,xpBonus:.1};
export const goalOfWeek=w=>GOALS[((w%GOALS.length)+GOALS.length)%GOALS.length];

// ---- ギルド依頼: one big order per job and week; members deliver, rewards by share ----
export const GUILD_ORDERS={
 '農家':[['minecraft:wheat',1500],['minecraft:carrot',1200],['minecraft:potato',1200]],
 '釣り師':[['minecraft:cod',300],['minecraft:salmon',300],['cooptown:fish_oil',150]],
 '鍛冶師':[['minecraft:iron_ingot',800],['minecraft:gold_ingot',400],['cooptown:refined_ingot',200]],
 '料理人':[['minecraft:bread',600],['minecraft:cooked_beef',400],['minecraft:baked_potato',600]],
 '調合師':[['cooptown:herb_bundle',200],['minecraft:glass_bottle',400],['minecraft:nether_wart',300]],
 '付与術師':[['minecraft:lapis_lazuli',600],['minecraft:book',300],['minecraft:experience_bottle',150]],
 '冒険家':[['minecraft:rotten_flesh',1500],['minecraft:bone',1000],['minecraft:string',800]],
 '鉱夫':[['minecraft:cobblestone',4000],['minecraft:coal',1200],['minecraft:raw_iron',800]],
 '木こり':[['minecraft:oak_log',2000],['minecraft:spruce_log',1500],['minecraft:charcoal',600]]};
export const GUILD_REWARD={coins:1500,tickets:3,perItemXp:.2};
export const guildOrder=(job,w)=>{const l=GUILD_ORDERS[job];if(!l)return undefined;const [item,need]=l[((w%l.length)+l.length)%l.length];return {item,need};};

// ---- 季節: a season's jobs get more job XP; working in a season earns its title ----
export const SEASONS={
 spring:{name:'春',jobs:['農家','調合師'],title:'春の働き者'},
 summer:{name:'夏',jobs:['釣り師','冒険家'],title:'夏の働き者'},
 autumn:{name:'秋',jobs:['料理人','農家','木こり'],title:'秋の働き者'},
 winter:{name:'冬',jobs:['鍛冶師','付与術師','鉱夫'],title:'冬の働き者'}};
export const SEASON_RULES={xpBonus:.1,titleWork:300};

// ---- 週間大会: the week's best minigame scores (title.track maxes) ----
export const CONTESTS=[{key:'reel_best',name:'釣りのリール'},{key:'forge_best',name:'鍛造'},{key:'cook_best',name:'料理のランク'}];
export const CONTEST_TOP=5;
