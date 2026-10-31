// The alchemist's experiment cauldron (調合師 only, cauldron-runtime.js): put three materials in; the right three
// make a recipe scroll for a potion, using the scroll teaches it, and only learned potions can be brewed at the
// brewing stand (brew-runtime.js). Every potion has to be found this way. The combinations are CoopTown's own (not
// the vanilla brewing ingredients); a wrong one uses up the materials and gives nothing.
export const CAULDRON_JOB='調合師';
export const CAULDRON_RULES={seconds:10,inputs:3};
export const KNOWN_KEY='cooptown:brew_known';  // player dynamic property: JSON list of learned potion names
export const SCROLL_ID='cooptown:recipe_scroll',SCROLL_KEY='cooptown:recipe'; // the scroll's own dynamic property: the potion name
import {POTION_EXPERIMENTS} from './potion-config.js';
const M=id=>'minecraft:'+id;
// the materials the cauldron takes (the list shows them in this order, nine to a page)
export const MATERIALS=['nether_wart','sugar','spider_eye','fermented_spider_eye','glowstone_dust','redstone','blaze_powder','ghast_tear','magma_cream',
 'golden_carrot','rabbit_foot','phantom_membrane','pufferfish','glistering_melon_slice','brown_mushroom',
 // for the alchemist's own potions (potion-config.js POTION_EXPERIMENTS)
 'oxeye_daisy','allium','fern','dandelion','honey_bottle','amethyst_shard','melon_slice','charcoal','carrot','lapis_lazuli','kelp','glow_ink_sac',
 'glow_berries','feather','gold_nugget','prismarine_shard','sweet_berries','bread','iron_nugget','ink_sac','ender_pearl','chorus_fruit'].map(M);
const [NW,SU,SE,FE,GL,RS,BP,GT,MC,GC,RF,PM,PF,GM,MU]=MATERIALS;
// potion name (BREW_RECIPES name) -> its three materials (order does not matter)
export const EXPERIMENTS={
 '回復':[GM,GT,SU],'再生':[GT,NW,GC],'タートルマスター':[PF,GL,MC],'力':[BP,RS,NW],'俊敏':[SU,RF,GL],'跳躍':[RF,PM,NW],
 '暗視':[GC,GL,SE],'透明':[GC,FE,PM],'低速落下':[PM,SU,GT],'耐火':[MC,BP,GM],'水中呼吸':[PF,NW,SU],'毒':[SE,MU,NW],
 '弱化':[FE,MU,BP],'鈍化':[FE,SU,RS],'負傷':[FE,GM,SE],'風力チャージ':[BP,PM,RS],'糸巻き':[SE,RF,MU],'滲出':[MC,MU,GT],'虫食い':[MU,RS,PF],
 ...Object.fromEntries(Object.entries(POTION_EXPERIMENTS).map(([name,ids])=>[name,ids.map(M)]))};
/** The potion three materials make, or undefined. */
export function experimentResult(ids){
 const key=[...ids].sort().join('|');
 return Object.keys(EXPERIMENTS).find(name=>[...EXPERIMENTS[name]].sort().join('|')===key);
}
