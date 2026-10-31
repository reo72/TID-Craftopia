// The farmer's composter (農家 only, compost-runtime.js). Each player has their own compost (any composter shows
// it; the block itself does not change). Each item put in raises it one level with the vanilla chance; at
// COMPOST_RULES.full levels it is done and gives bone meal. The farmer's craft level adds to the chance and may
// give extra bone meal.
export const COMPOST_JOB='農家';
export const COMPOST_RULES={full:8,chancePerLevel:.01,maxChanceBonus:.2,extraPerLevel:.02,maxExtraChance:.5,amounts:[1,8,64]};
export const COMPOST_TABS=['作物','種','苗木','その他'];
const FLOWERS=/^(dandelion|poppy|blue_orchid|allium|azure_bluet|(red|orange|white|pink)_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|torchflower|pitcher_plant|red_flower|yellow_flower|double_plant)$/;
// vanilla chances, first match wins
const CHANCES=[
 [1,/^(cake|pumpkin_pie)$/],
 [.85,/^(baked_potato|bread|cookie|hay_block|(red|brown)_mushroom_block|nether_wart_block|warped_wart_block|flowering_azalea)$/],
 [.65,/^(apple|azalea|beetroot|big_dripleaf|carrot|cocoa_beans|fern|large_fern|crimson_fungus|warped_fungus|waterlily|lily_pad|melon_block|melon|moss_block|(red|brown)_mushroom|nether_wart|potato|pumpkin|carved_pumpkin|sea_pickle|shroomlight|spore_blossom|wheat|crimson_roots|warped_roots)$/],
 [.65,FLOWERS],
 [.5,/^(cactus|dried_kelp_block|azalea_leaves_flowered|flowering_azalea_leaves|glow_lichen|melon_slice|nether_sprouts|sugar_cane|reeds|tall_grass|twisting_vines|weeping_vines|vine)$/],
 [.3,/_seeds$|_leaves$|_sapling$|^(dried_kelp|glow_berries|short_grass|tallgrass|grass|hanging_roots|kelp|moss_carpet|pink_petals|pitcher_pod|mangrove_propagule|seagrass|small_dripleaf_block|sweet_berries|leaves|leaves2)$/]
];
/** The vanilla compost chance of an item (0-1), or 0 when it cannot be composted. */
export function compostChance(id){
 const name=String(id).replace(/^minecraft:/,'');
 return CHANCES.find(([,re])=>re.test(name))?.[0]??0;
}
const CROPS=/^(wheat|carrot|potato|beetroot|pumpkin|carved_pumpkin|melon_block|melon|melon_slice|apple|(red|brown)_mushroom|sugar_cane|reeds|cocoa_beans|sweet_berries|glow_berries|nether_wart|baked_potato|bread|cookie|cake|pumpkin_pie|hay_block|cactus)$/;
/** The tab of a compostable item: 0 crops, 1 seeds, 2 saplings, 3 other. */
export function compostTab(id){
 const name=String(id).replace(/^minecraft:/,'');
 if(/_seeds$|^pitcher_pod$/.test(name))return 1;
 if(/_sapling$|^(mangrove_propagule|azalea|flowering_azalea)$/.test(name))return 2;
 return CROPS.test(name)?0:3;
}
