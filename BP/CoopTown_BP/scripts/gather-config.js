// Gathering (採取) XP. XP reflects how hard the thing is to get; no daily cap.
// job: players with this main/second job get full XP, others get otherJobRate. null = everyone full.
// track: remember blocks a player placed so re-breaking them gives nothing.
// state/ripe: only count crops whose block state has reached `ripe`.
// stack: sugar cane style columns; every naturally grown segment counts, the bottom one does not.
// interact: harvested by using the block (berries) instead of breaking it.
export const GATHER_RULES={otherJobRate:.5,playerXpRate:.5,stressPerXp:.1,actionBarSeconds:3};

const LOGS={oak:3,birch:3,spruce:3,jungle:4,acacia:4,dark_oak:4,mangrove:4,cherry:4,pale_oak:5};
const FLOWERS=['dandelion','yellow_flower','poppy','red_flower','blue_orchid','allium','azure_bluet','red_tulip','orange_tulip','white_tulip','pink_tulip','oxeye_daisy','cornflower','lily_of_the_valley','torchflower','pink_petals','sunflower','lilac','rose_bush','peony'];
const SAPLINGS=['oak','spruce','birch','jungle','acacia','dark_oak','cherry','pale_oak'].map(w=>w+'_sapling').concat(['sapling','mangrove_propagule']);

export const GATHER_BLOCKS=Object.fromEntries([
 ...Object.entries(LOGS).map(([w,xp])=>['minecraft:'+w+'_log',{xp,job:'木こり',track:true}]),
 ['minecraft:crimson_stem',{xp:5,job:'木こり',track:true}],['minecraft:warped_stem',{xp:5,job:'木こり',track:true}],
 ...['wheat','carrots','potatoes','beetroot'].map(c=>['minecraft:'+c,{xp:2,job:'農家',state:'growth',ripe:7}]),
 ['minecraft:cocoa',{xp:3,job:'農家',state:'age',ripe:2}],
 ['minecraft:nether_wart',{xp:4,job:'農家',state:'age',ripe:3}],
 ['minecraft:pumpkin',{xp:3,job:'農家',track:true}],['minecraft:melon_block',{xp:3,job:'農家',track:true}],
 ['minecraft:sugar_cane',{xp:1,job:'農家',track:true,stack:true}],['minecraft:cactus',{xp:1,job:'農家',track:true,stack:true}],['minecraft:bamboo',{xp:.5,job:'農家',track:true,stack:true}],
 ['minecraft:sweet_berry_bush',{xp:1,job:'農家',state:'growth',ripe:2,interact:true}],
 ['minecraft:cave_vines_body_with_berries',{xp:1,job:'農家',interact:true}],['minecraft:cave_vines_head_with_berries',{xp:1,job:'農家',interact:true}],
 ...FLOWERS.map(f=>['minecraft:'+f,{xp:1,job:null,track:true}]),
 ...['brown_mushroom','red_mushroom','crimson_fungus','warped_fungus'].map(m=>['minecraft:'+m,{xp:1,job:null,track:true}]),
 ...SAPLINGS.map(s=>['minecraft:'+s,{xp:1,job:null,track:true}])
]);
// Entities harvested with a tool (shears on an unsheared adult sheep).
export const GATHER_ENTITIES={'minecraft:sheep':{xp:2,job:null,tool:'minecraft:shears'}};
