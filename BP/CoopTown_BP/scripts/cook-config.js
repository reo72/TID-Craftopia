// The campfire kitchen (料理人 only, cook-runtime.js): vanilla dishes, cooked with a waiting time.
// time: seconds for up to PER_ROUND items (like the four spots of a campfire); a batch of n takes
// time x ceil(n / PER_ROUND). Ingredients are taken when cooking starts; the dish is handed over at a campfire
// once it is done. extra: given back with the dish (the cake's milk buckets).
import {FOOD_CATALOG} from './food-catalog.js';
export const COOK_JOB='料理人';
export const COOK_RULES={perRound:4,maxBatch:64};
// meat and fish are smoked at the smoker (smoke-config.js); the campfire keeps the vegetables, pots and sweets
export const COOK_TABS=['主食','主菜','甘味','飲み物'];
const g=key=>({group:key});
const grill=(name,raw,cooked)=>({tab:0,name,output:['minecraft:'+cooked,1],inputs:[['minecraft:'+raw,1]],time:30});
export const COOK_RECIPES=[
 grill('ベイクドポテト','potato','baked_potato'),{...grill('乾燥ケルプ','kelp','dried_kelp'),time:20},
 {tab:1,name:'ウサギシチュー',output:['minecraft:rabbit_stew',1],inputs:[['minecraft:cooked_rabbit',1],['minecraft:carrot',1],['minecraft:baked_potato',1],[g('mushroom'),1],['minecraft:bowl',1]],time:45},
 {tab:1,name:'キノコシチュー',output:['minecraft:mushroom_stew',1],inputs:[['minecraft:red_mushroom',1],['minecraft:brown_mushroom',1],['minecraft:bowl',1]],time:30},
 {tab:1,name:'ビートルートスープ',output:['minecraft:beetroot_soup',1],inputs:[['minecraft:beetroot',6],['minecraft:bowl',1]],time:30},
 {tab:0,name:'パン',output:['minecraft:bread',1],inputs:[['minecraft:wheat',3]],time:20},
 {tab:2,name:'クッキー',output:['minecraft:cookie',8],inputs:[['minecraft:wheat',2],['minecraft:cocoa_beans',1]],time:20},
 {tab:2,name:'パンプキンパイ',output:['minecraft:pumpkin_pie',1],inputs:[['minecraft:pumpkin',1],['minecraft:sugar',1],['minecraft:egg',1]],time:30},
 {tab:2,name:'ケーキ',output:['minecraft:cake',1],inputs:[['minecraft:milk_bucket',3],['minecraft:sugar',2],['minecraft:egg',1],['minecraft:wheat',3]],extra:[['minecraft:bucket',3]],time:60},
 {tab:2,name:'金のニンジン',output:['minecraft:golden_carrot',1],inputs:[['minecraft:gold_nugget',8],['minecraft:carrot',1]],time:40},
 {tab:2,name:'金のリンゴ',output:['minecraft:golden_apple',1],inputs:[['minecraft:gold_ingot',8],['minecraft:apple',1]],time:60},
 // the CoopTown dishes (food-config.js DISHES); rank: the 料理人 rank needed (job-rank.js: 中級 = dishes of several ingredients)
 {tab:1,name:'野菜スープ',output:['cooptown:veg_soup',1],inputs:[['minecraft:carrot',1],['minecraft:potato',1],['minecraft:beetroot',1],['minecraft:bowl',1]],time:30,rank:0},
 {tab:1,name:'肉と野菜のシチュー',output:['cooptown:meat_stew',1],inputs:[['minecraft:cooked_beef',1],['minecraft:carrot',1],['minecraft:potato',1],['minecraft:bowl',1]],time:45,rank:1},
 {tab:0,name:'焼き魚の定食',output:['cooptown:fish_set',1],inputs:[['minecraft:cooked_salmon',1],['minecraft:baked_potato',1],['minecraft:dried_kelp',2]],time:40,rank:1},
 {tab:2,name:'フルーツタルト',output:['cooptown:fruit_tart',2],inputs:[['minecraft:wheat',2],['minecraft:sweet_berries',2],['minecraft:apple',1],['minecraft:sugar',1]],time:40,rank:1}
];
// the food catalogue (food-catalog.js): its campfire foods, drinks and intermediate materials. level: the 料理人's craft
// level needed; extra: containers given back when cooking (honey bottles, milk buckets, the bottle of a hot drink)
COOK_RECIPES.push(...FOOD_CATALOG.filter(e=>e.station&&!e.smoke&&e.ing.length&&e.id!=='cooptown:cup').map(e=>
 ({tab:e.tab??0,name:e.name,output:[e.id,e.out],inputs:e.ing,extra:e.ret,time:20+Math.min(40,e.level),level:e.level})));
/** Seconds to cook n of recipe r. */
export const cookSeconds=(r,n)=>r.time*Math.ceil(Math.max(1,n)/COOK_RULES.perRound);
