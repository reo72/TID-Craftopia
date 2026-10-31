// The alchemist's brewing stand (調合師 only, brew-runtime.js): vanilla potions, brewed with a waiting time.
// The vanilla steps are folded into one: water bottles + nether wart + the effect's ingredient (+ fermented spider
// eye for the "corrupted" ones), then redstone (long) / glowstone (strong), gunpowder (splash) or dragon's breath
// (lingering). As in vanilla a stand brews three bottles at a time: everything but the water bottles is needed once
// per round of three, and blaze powder fuels BREW_RULES.roundsPerBlaze rounds.
export const BREW_JOB='調合師';
export const BREW_RULES={perRound:3,secondsPerRound:20,roundsPerBlaze:20,maxBatch:64,amounts:[1,3,64]};
export const BREW_TABS=['回復','強化','耐性','その他'];
export const WATER='water_bottle'; // ingredient key for a water bottle (a minecraft:potion holding water)
export const MODIFIERS=[{label:'普通',key:'normal'},{label:'延長',key:'long',item:'minecraft:redstone'},{label:'強化',key:'strong',item:'minecraft:glowstone_dust'}];
export const LIQUIDS=[{label:'飲む',id:'minecraft:potion',suffix:''},{label:'投げ',id:'minecraft:splash_potion',suffix:'（スプラッシュ）',item:'minecraft:gunpowder'},
 {label:'残留',id:'minecraft:lingering_potion',suffix:'（残留）',item:'minecraft:dragon_breath'}];
import {POTIONS} from './potion-config.js';
const FERMENT='minecraft:fermented_spider_eye';
// aux: the potion's data value per modifier (vanilla Bedrock ids, used with /give); icon: textures/items/potion_bottle_<icon>
const P=(tab,name,icon,aux,inputs,extra={})=>({tab,name,icon,aux,inputs,...extra});
export const BREW_RECIPES=[
 P(0,'回復','heal',{normal:21,strong:22},['minecraft:glistering_melon_slice']),
 P(0,'再生','regeneration',{normal:28,long:29,strong:30},['minecraft:ghast_tear']),
 P(0,'タートルマスター','turtleMaster',{normal:37,long:38,strong:39},['minecraft:turtle_helmet']),
 P(1,'力','damageBoost',{normal:31,long:32,strong:33},['minecraft:blaze_powder']),
 P(1,'俊敏','moveSpeed',{normal:14,long:15,strong:16},['minecraft:sugar']),
 P(1,'跳躍','jump',{normal:9,long:10,strong:11},['minecraft:rabbit_foot']),
 P(1,'暗視','nightVision',{normal:5,long:6},['minecraft:golden_carrot']),
 P(1,'透明','invisibility',{normal:7,long:8},['minecraft:golden_carrot',FERMENT]),
 P(1,'低速落下','slowFall',{normal:40,long:41},['minecraft:phantom_membrane']),
 P(2,'耐火','fireResistance',{normal:12,long:13},['minecraft:magma_cream']),
 P(2,'水中呼吸','waterBreathing',{normal:19,long:20},['minecraft:pufferfish']),
 P(3,'毒','poison',{normal:25,long:26,strong:27},['minecraft:spider_eye']),
 P(3,'弱化','weakness',{normal:34,long:35},[FERMENT],{noWart:true}),
 P(3,'鈍化','moveSlowdown',{normal:17,long:18,strong:42},['minecraft:sugar',FERMENT]),
 P(3,'負傷','harm',{normal:23,strong:24},['minecraft:glistering_melon_slice',FERMENT]),
 P(3,'風力チャージ','drinkable',{normal:43},['minecraft:breeze_rod']),
 P(3,'糸巻き','drinkable',{normal:44},['minecraft:web']),
 P(3,'滲出','drinkable',{normal:45},['minecraft:slime']),
 P(3,'虫食い','drinkable',{normal:46},['minecraft:stone']),
 // the alchemist's own potions (potion-config.js): no nether wart, drinkable only, a rank to brew, a quality rolled by rank
 ...POTIONS.map(p=>({tab:p.tab,name:p.name,custom:p.key,id:p.id,rank:p.rank,aux:{normal:0},inputs:p.inputs,noWart:true}))
];
/** Ingredients for n bottles of recipe r with modifier m and liquid l (MODIFIERS / LIQUIDS indexes): [[key, count]]. */
export function brewNeeds(r,m,l,n){
 const rounds=Math.ceil(Math.max(1,n)/BREW_RULES.perRound);
 const list=[[WATER,n]];
 if(!r.noWart)list.push(['minecraft:nether_wart',rounds]);
 for(const id of r.inputs)list.push([id,rounds]);
 if(MODIFIERS[m].item)list.push([MODIFIERS[m].item,rounds]);
 if(LIQUIDS[l].item)list.push([LIQUIDS[l].item,rounds]);
 return list;
}
export const blazeNeeded=n=>Math.ceil(Math.ceil(Math.max(1,n)/BREW_RULES.perRound)/BREW_RULES.roundsPerBlaze);
export const brewSeconds=n=>BREW_RULES.secondsPerRound*Math.ceil(Math.max(1,n)/BREW_RULES.perRound);
/** The potion's picture: drinkable / splash / lingering bottle of its colour. */
export const potionIcon=(r,l)=>r.custom?'textures/cooptown/potions/'+r.custom:'textures/items/potion_bottle_'+(r.icon==='drinkable'?['drinkable','splash','lingering'][l]:(l===1?'splash_':l===2?'lingering_':'')+r.icon);
