// The farmer's watering cans (asked 2026-10-24): 農家-only tools. Hold use on crops to water them: a chance to grow a
// stage, the farmland stays wet, and a watered crop harvested within WATER.markMs rolls a better rank and sometimes
// one more crop (豊作). Water runs out (the durability bar is the water left); use it on water to fill it again.
// Three tiers, crafted on the workbench (職業 tab) from the job level: copper 1 x 1, iron 3 x 3, gold 5 x 5.
// radius: blocks around the one looked at; water: how many waterings it holds; grow: the chance a watering grows a
// stage (+ growPerLevel per job level, at most growMax); rank / harvest: the rank bonus and the extra-crop chance.
export const CANS={
 'cooptown:watering_can_copper':{name:'木製のジョーロ',tier:'copper',level:1,radius:0,water:30,grow:.25,rank:.15,harvest:.1},
 'cooptown:watering_can_iron':{name:'鉄のジョーロ',tier:'iron',level:10,radius:1,water:60,grow:.35,rank:.25,harvest:.15},
 'cooptown:watering_can_gold':{name:'金のジョーロ',tier:'gold',level:25,radius:2,water:120,grow:.5,rank:.35,harvest:.2},
 // 極み (asked 2026-10-27): the farmer's top tool, Lv.50
 'cooptown:watering_can_master':{name:'極みのジョーロ',tier:'master',level:50,radius:3,water:250,grow:.6,rank:.45,harvest:.3}};
export const WATER={job:'農家',everyTicks:8,cooldownMs:30000,markMs:30*60000,growPerLevel:.004,growMax:.8,xpPerBlocks:5};
// what a can waters: block -> the state that counts its growth and the ripe value
export const GROWABLE={
 'minecraft:wheat':['growth',7],'minecraft:carrots':['growth',7],'minecraft:potatoes':['growth',7],'minecraft:beetroot':['growth',7],
 'minecraft:melon_stem':['growth',7],'minecraft:pumpkin_stem':['growth',7],'minecraft:sweet_berry_bush':['growth',3],'minecraft:cocoa':['age',2]};
export const CAN_NAMES=Object.fromEntries(Object.entries(CANS).map(([id,c])=>[id,c.name]));
/** The chance one watering grows a crop a stage. */
export const growChance=(can,jobLevel,bonus=0)=>Math.min(WATER.growMax,can.grow+(jobLevel??1)*WATER.growPerLevel+bonus); // bonus: 水やり上手 (skill-config.js)
/** The blocks (x, z offsets) a can waters around the one looked at. */
export function area(can,extra=0){ // extra: 広いジョーロ (skill-config.js)
 const r=can.radius+extra,out=[];for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)out.push([dx,dz]);return out;
}
// workbench recipes (職業 tab): each tier from the one below
const icon=t=>`textures/cooptown/items/watering_can_${t}`;
export const CAN_RECIPES=[
 {name:'木製のジョーロ',job:'農家',output:['cooptown:watering_can_copper',1],inputs:[[{group:'planks'},6],['minecraft:stick',2]],icon:icon('copper')}, // wooden since 2026-10-30 (was copper ×5 + a bucket); the id stays watering_can_copper
 {name:'鉄のジョーロ',job:'農家',jobLevel:CANS['cooptown:watering_can_iron'].level,output:['cooptown:watering_can_iron',1],inputs:[['cooptown:watering_can_copper',1],['minecraft:iron_ingot',5]],icon:icon('iron')},
 {name:'金のジョーロ',job:'農家',jobLevel:CANS['cooptown:watering_can_gold'].level,output:['cooptown:watering_can_gold',1],inputs:[['cooptown:watering_can_iron',1],['minecraft:gold_ingot',5],['minecraft:diamond',1]],icon:icon('gold')},
 {name:'極みのジョーロ',job:'農家',jobLevel:CANS['cooptown:watering_can_master'].level,output:['cooptown:watering_can_master',1],inputs:[['cooptown:watering_can_gold',1],['cooptown:golden_wheat',8],['cooptown:mystic_seed',2],['minecraft:emerald',4]],icon:icon('master')}];
