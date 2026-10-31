// Mining (採掘) XP. XP reflects how rare the block is; no daily cap.
// tier: pickaxe needed for the block to drop anything (1 wood/gold, 2 stone, 3 iron, 4 diamond/netherite).
// Stone, cobblestone and basalt are left out on purpose: lava+water generators make them endless.
export const MINE_RULES={otherJobRate:.5,playerXpRate:.5,stressPerXp:.1,job:'鉱夫'};
export const PICKAXE_TIERS={wooden:1,golden:1,stone:2,iron:3,diamond:4,netherite:4};

const ORES={coal:[2,3,1],copper:[2,3,2],redstone:[3,4,3],iron:[4,5,2],lapis:[4,5,2],gold:[5,6,3],emerald:[10,12,3],diamond:[10,12,3]};
export const MINE_BLOCKS=Object.fromEntries([
 ...Object.entries(ORES).flatMap(([ore,[xp,deep,tier]])=>[['minecraft:'+ore+'_ore',{xp,tier}],['minecraft:deepslate_'+ore+'_ore',{xp:deep,tier}]]),
 ['minecraft:lit_redstone_ore',{xp:3,tier:3}],['minecraft:lit_deepslate_redstone_ore',{xp:4,tier:3}],
 ['minecraft:quartz_ore',{xp:3,tier:1}],['minecraft:nether_gold_ore',{xp:2,tier:1}],['minecraft:ancient_debris',{xp:20,tier:4}],
 ['minecraft:amethyst_cluster',{xp:3,tier:1}],
 ['minecraft:deepslate',{xp:.2,tier:1}],
 ...['granite','diorite','andesite','tuff','calcite','blackstone','end_stone'].map(b=>['minecraft:'+b,{xp:.1,tier:1}]),
 ['minecraft:netherrack',{xp:.05,tier:1}]
].map(([id,rule])=>[id,{...rule,track:true}]));
export function pickaxeTier(typeId){const m=/^minecraft:(\w+?)_pickaxe$/.exec(typeId??'');return m?PICKAXE_TIERS[m[1]]??0:0;}
