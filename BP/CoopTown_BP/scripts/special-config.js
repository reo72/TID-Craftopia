import {skillValue} from './skill-config.js';
// Job-only special materials (design doc 3: 特殊素材). Only players with the job (main or second) find
// them, and only from their skill level up. Gathering / mining / fishing: rolled per action and dropped at
// the player; crafting jobs: rolled per craft of their own job's recipes and handed over with the result.
// Names, chances and placeholder pictures are first drafts (pictures: RP textures/item_texture.json).
export const SPECIAL_ITEMS={
 'cooptown:fine_wood':{name:'上質な木材',texture:'textures/blocks/planks_big_oak'},
 'cooptown:ancient_sap':{name:'古木の樹液',texture:'textures/items/honey_bottle'},
 'cooptown:rare_ore':{name:'希少鉱石',texture:'textures/items/raw_gold'},
 'cooptown:shining_crystal':{name:'輝く結晶',texture:'textures/cooptown/materials/shining_crystal'},
 'cooptown:golden_wheat':{name:'黄金の小麦',texture:'textures/cooptown/materials/golden_wheat'},
 'cooptown:mystic_seed':{name:'幻の種',texture:'textures/cooptown/materials/mystic_seed'},
 'cooptown:rare_fish':{name:'珍しい魚',texture:'textures/items/fish_clownfish_raw'},
 'cooptown:deep_pearl':{name:'深海の真珠',texture:'textures/items/ender_pearl'},
 'cooptown:forge_shard':{name:'鍛造の欠片',texture:'textures/items/iron_nugget'},
 'cooptown:secret_spice':{name:'秘伝のスパイス',texture:'textures/cooptown/materials/secret_spice'},
 'cooptown:mana_dust':{name:'魔力の粉',texture:'textures/cooptown/materials/mana_dust'}
};
export const JOB_SPECIAL_NAMES=Object.fromEntries(Object.entries(SPECIAL_ITEMS).map(([id,v])=>[id,v.name]));
const LOG=t=>/_(log|stem)$/.test(t),CROP=t=>['minecraft:wheat','minecraft:carrots','minecraft:potatoes','minecraft:beetroot'].includes(t);
const ORE=t=>/_ore$/.test(t)||t==='minecraft:ancient_debris',DEEP=t=>/^minecraft:deepslate_.*_ore$/.test(t)||t==='minecraft:ancient_debris';
// skill: which work rolls it (gather / mine / fish / craft); from(source): the block type (or 'fishing', or
// the recipe's job for crafting); chance per action; level: the skill level needed
export const SPECIAL_DROPS=[
 {item:'cooptown:fine_wood',job:'木こり',skill:'gather',level:5,chance:.03,from:LOG},
 {item:'cooptown:ancient_sap',job:'木こり',skill:'gather',level:15,chance:.01,from:LOG},
 {item:'cooptown:rare_ore',job:'鉱夫',skill:'mine',level:5,chance:.04,from:ORE},
 {item:'cooptown:shining_crystal',job:'鉱夫',skill:'mine',level:15,chance:.015,from:DEEP},
 {item:'cooptown:golden_wheat',job:'農家',skill:'gather',level:5,chance:.03,from:CROP},
 {item:'cooptown:mystic_seed',job:'農家',skill:'gather',level:15,chance:.01,from:CROP},
 {item:'cooptown:rare_fish',job:'釣り師',skill:'fish',level:5,chance:.05,from:s=>s==='fishing'},
 {item:'cooptown:deep_pearl',job:'釣り師',skill:'fish',level:15,chance:.015,from:s=>s==='fishing'},
 {item:'cooptown:forge_shard',job:'鍛冶師',skill:'craft',level:5,chance:.05,from:s=>s==='鍛冶師'},
 {item:'cooptown:secret_spice',job:'料理人',skill:'craft',level:5,chance:.05,from:s=>s==='料理人'},
 {item:'cooptown:mana_dust',job:'付与術師',skill:'craft',level:5,chance:.05,from:s=>s==='付与術師'}
];
// fishing grows the gathering skill (design doc 4); fishers get the full amount, others half
export const FISH_RULE={xp:6,job:'釣り師'};
const LEVEL_OF={gather:'gather',fish:'gather',mine:'mine',craft:'craft'};
/** Special materials found by this action (item ids). */
export function rollSpecial(p,skill,source,random=Math.random){
 const found=[];
 for(const d of SPECIAL_DROPS){
  if(d.skill!==skill||(p.job!==d.job&&p.secondJob!==d.job))continue;
  if((p[LEVEL_OF[skill]]?.level??1)<d.level||!d.from(source))continue;
  if(random()<d.chance*(1+skillValue(p,d.job,'special')))found.push(d.item); // 目利き nodes (skill-config.js)
 }
 return found;
}
