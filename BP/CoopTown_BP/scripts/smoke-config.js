// The cook's smoker (料理人 only, smoke-runtime.js): meat and fish (moved here from the campfire), smoked with a
// waiting time; faster than the campfire and eight at a time, but it burns charcoal or coal (one per FUEL_PER items).
import {FOOD_CATALOG} from './food-catalog.js';
const MEAT=/beef|porkchop|chicken|mutton|rabbit|minced_meat|raw_sausage|jerky|ham|bacon/,FISH=/cod|salmon|fish|kelp/;
export const SMOKE_JOB='料理人';
export const SMOKE_RULES={perRound:8,secondsPerRound:15,fuelPer:4,maxBatch:64,amounts:[1,8,64]};
export const SMOKE_TABS=['肉','魚','その他'];
export const FUEL={group:'fuel'};
const S=(tab,name,raw,cooked)=>({tab,name,output:['minecraft:'+cooked,1],raw:'minecraft:'+raw});
// the CoopTown preserves (food-config.js DISHES): rank = the 料理人 rank needed (job-rank.js), extra = more per item
const K=(tab,name,raw,dish,rank,extra)=>({tab,name,output:['cooptown:'+dish,1],raw:'minecraft:'+raw,rank,...(extra?{extra:extra.map(([id,c])=>['minecraft:'+id,c])}:{})});
export const SMOKE_RECIPES=[
 S(0,'焼き牛肉','beef','cooked_beef'),S(0,'焼き豚肉','porkchop','cooked_porkchop'),S(0,'焼き鳥肉','chicken','cooked_chicken'),
 S(0,'焼き羊肉','mutton','cooked_mutton'),S(0,'焼き兎肉','rabbit','cooked_rabbit'),
 S(1,'焼きダラ','cod','cooked_cod'),S(1,'焼き鮭','salmon','cooked_salmon'),
 S(2,'ベイクドポテト','potato','baked_potato'),S(2,'乾燥ケルプ','kelp','dried_kelp'),
 K(0,'燻製肉','beef','smoked_meat',1),K(1,'燻製魚','cod','smoked_fish',1),
 K(0,'干し肉','beef','dried_meat',2,[['sugar',1]]),K(1,'干し魚','salmon','dried_fish',2,[['kelp',1]]),
 K(2,'瓶詰め保存食','carrot','jar_preserve',2,[['glass_bottle',1],['beetroot',1],['sugar',1]]),
 // the food catalogue's smoked and preserved foods (food-catalog.js): the first ingredient is the one smoked, the
 // rest go in as extras; level: the 料理人's craft level needed; tab: meat / fish / other by the first ingredient
 ...FOOD_CATALOG.filter(e=>e.smoke&&e.ing.length).map(e=>({tab:MEAT.test(e.ing[0][0])?0:FISH.test(e.ing[0][0])?1:2,name:e.name,output:[e.id,e.out],raw:e.ing[0][0],
  ...(e.ing.length>1?{extra:e.ing.slice(1)}:{}),rawPer:e.ing[0][1],level:e.level,ret:e.ret}))
];
/** Ingredients for n of recipe r: [[type, count]] (the raw food, the extras, then the fuel). */
export const smokeNeeds=(r,n)=>[[r.raw,n*(r.rawPer??1)],...(r.extra??[]).map(([id,c])=>[id,c*n]),[FUEL,Math.ceil(Math.max(1,n)/SMOKE_RULES.fuelPer)]];
export const smokeSeconds=n=>SMOKE_RULES.secondsPerRound*Math.ceil(Math.max(1,n)/SMOKE_RULES.perRound);
