// The blacksmith's anvil (鍛冶師 only, anvil-runtime.js): repair, enchanted books, and the smith's recipes.
// Repair as in vanilla: one repair material mends a quarter of the item's durability (only as many as needed are
// used); each material costs one experience level, less with the smith's craft level (ANVIL_RULES).
// Items without a vanilla repair material (bow, shears...) get one here so the smith can mend them.
export const ANVIL_JOB='鍛冶師';
export const ANVIL_RULES={repairShare:4,levelsPerMaterial:1,discountPerLevels:10,bookLevelsPerLevel:2,maxCost:39};
export const ANVIL_TABS=['武器','道具','防具','その他'];
/** The tab of an item or recipe result: 0 weapon, 1 tool, 2 armor, 3 other. */
export function anvilTab(id){
 const name=String(id).replace(/^minecraft:/,'');
 if(/_sword$|^(bow|crossbow|trident|mace)$/.test(name))return 0;
 if(/_(pickaxe|axe|shovel|hoe)$|^(shears|fishing_rod|flint_and_steel|brush|carrot_on_a_stick|warped_fungus_on_a_stick)$/.test(name))return 1;
 if(/_(helmet|chestplate|leggings|boots)$|^(shield|elytra)$/.test(name))return 2;
 return 3;
}
const PLANKS={group:'planks'},COBBLE={group:'cobble'};
/** The repair material of an item (an id or an ingredient group), or undefined. */
export function repairMaterial(id){
 const name=String(id).replace(/^minecraft:/,'');
 const m=/^(wooden|stone|iron|golden|diamond|netherite|leather|chainmail)_/.exec(name)?.[1];
 if(m)return {wooden:PLANKS,stone:COBBLE,iron:'minecraft:iron_ingot',golden:'minecraft:gold_ingot',diamond:'minecraft:diamond',netherite:'minecraft:netherite_ingot',leather:'minecraft:leather',chainmail:'minecraft:iron_ingot'}[m];
 return {turtle_helmet:'minecraft:turtle_scute',elytra:'minecraft:phantom_membrane',shield:PLANKS,mace:'minecraft:breeze_rod',
  bow:'minecraft:string',crossbow:'minecraft:string',fishing_rod:'minecraft:string',carrot_on_a_stick:'minecraft:string',warped_fungus_on_a_stick:'minecraft:string',
  shears:'minecraft:iron_ingot',flint_and_steel:'minecraft:iron_ingot',brush:'minecraft:copper_ingot',trident:'minecraft:prismarine_shard'}[name];
}
/** Durability one material repairs; bonus: the skill tree's 手早い修理 (skill-config.js). */
export const repairPer=(max,bonus=0)=>Math.max(1,Math.floor(max/ANVIL_RULES.repairShare*(1+bonus)));
/** Repair plan for durability damage/max with have materials: {units, after (damage left), levels}. */
export function repairPlan(damage,max,have,craftLevel=1,bonus=0){
 const per=repairPer(max,bonus),units=Math.min(Math.ceil(damage/per),Math.max(0,have|0));
 const discount=Math.floor(craftLevel/ANVIL_RULES.discountPerLevels);
 return {units,after:Math.max(0,damage-units*per),levels:units?Math.max(1,units*ANVIL_RULES.levelsPerMaterial-discount):0};
}
/** Levels to put a book's enchantments ([{level}]) on an item. */
export function bookCost(enchants,craftLevel=1){
 const sum=enchants.reduce((s,e)=>s+e.level*ANVIL_RULES.bookLevelsPerLevel,0);
 return Math.min(ANVIL_RULES.maxCost,Math.max(1,sum-Math.floor(craftLevel/ANVIL_RULES.discountPerLevels)));
}
