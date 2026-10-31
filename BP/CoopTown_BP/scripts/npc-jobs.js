import {FISH_SPECIES} from './fish-species.js';
// Job villagers (npc-runtime.js): each job NPC sells its own stock (engine action npc.buy checks prices against
// NPC_STOCK), buys that job's products for BUY_BONUS more than the town buyer (npc-sell.js prices), and has its own
// daily requests that also give the job's skill XP. Players of the same job get SAME_JOB_BONUS more reward.
const M=id=>id.includes(':')?id:'minecraft:'+id;
export const BUY_BONUS=1.2,SAME_JOB_BONUS=1.5;
// key: role id. job: the game's job name (game-config.js JOBS). hold: what the NPC holds. skill: request XP goes here.
export const NPC_JOBS={
 farmer:{job:'農家',hold:'wooden_hoe',skill:'gather',
  stock:[['wheat_seeds','小麦の種',2],['beetroot_seeds','ビートルートの種',2],['pumpkin_seeds','カボチャの種',6],['melon_seeds','スイカの種',6],['bone_meal','骨粉',4],['iron_hoe','鉄のクワ',60]],
  buys:['wheat','carrot','potato','beetroot','pumpkin','melon_slice','sugar_cane','cocoa_beans','sweet_berries','apple','milk_bucket','egg','white_wool','leather','beef','porkchop','chicken','mutton','feather'],
  requests:[['wheat',24],['carrot',16],['potato',16],['beetroot',16],['pumpkin',4],['egg',8],['white_wool',6],['leather',6]]},
 fisher:{job:'釣り師',hold:'fishing_rod',skill:'gather',
  stock:[['fishing_rod','釣り竿',40],['string','糸',4],['bucket','バケツ',30],['oak_boat','オークのボート',25]],
  buys:['cod','salmon','tropical_fish','pufferfish'],
  requests:[['cod',8],['salmon',5],['tropical_fish',2],['pufferfish',2]]},
 cook:{job:'料理人',hold:'bread',skill:'craft',
  stock:[['bowl','ボウル',3],['sugar','砂糖',4],['egg','卵',5],['milk_bucket','ミルク入りバケツ',25],['wheat','小麦',5]],
  buys:['bread','cooked_beef','cooked_porkchop','cooked_chicken','cooked_mutton','cooked_rabbit','cooked_cod','cooked_salmon','baked_potato','dried_kelp','mushroom_stew','beetroot_soup','rabbit_stew','cookie','pumpkin_pie','cake','golden_carrot'],
  requests:[['bread',8],['cooked_beef',6],['baked_potato',10],['cookie',16],['pumpkin_pie',3],['mushroom_stew',3],['cake',1]]},
 smith:{job:'鍛冶師',hold:'iron_pickaxe',skill:'craft',
  stock:[['coal','石炭',6],['iron_ingot','鉄インゴット',30],['stone_pickaxe','石のツルハシ',15],['iron_pickaxe','鉄のツルハシ',90],['anvil','金床',350]],
  buys:['iron_ingot','gold_ingot','copper_ingot','iron_sword','iron_pickaxe','iron_axe','iron_shovel','iron_helmet','iron_chestplate','iron_leggings','iron_boots','diamond_sword','diamond_pickaxe'],
  requests:[['iron_ingot',8],['gold_ingot',4],['copper_ingot',16],['iron_pickaxe',1],['iron_sword',1],['iron_helmet',1]]},
 alchemist:{job:'調合師',hold:'glass_bottle',skill:'craft',
  stock:[['glass_bottle','ガラス瓶',3],['nether_wart','ネザーウォート',12],['blaze_powder','ブレイズパウダー',30],['glistering_melon_slice','きらめくスイカ',25],['spider_eye','クモの目',8]],
  buys:['potion','splash_potion','lingering_potion','spider_eye','gunpowder','blaze_rod'],
  requests:[['potion',3],['splash_potion',2],['spider_eye',6],['gunpowder',6],['glass_bottle',8]]},
 enchanter:{job:'付与術師',hold:'enchanted_book',skill:'craft',
  stock:[['lapis_lazuli','ラピスラズリ',10],['book','本',15],['bookshelf','本棚',60],['experience_bottle','エンチャントの瓶',40]],
  buys:['enchanted_book','book'],
  requests:[['book',6],['lapis_lazuli',16],['enchanted_book',1]]},
 // 鉱夫 / 木こり (2026-10-30, jobs of their own again)
 miner:{job:'鉱夫',hold:'iron_pickaxe',skill:'mine',
  stock:[['torch','松明',2],['iron_pickaxe','鉄のツルハシ',70],['ladder','はしご',3],['flint','火打石',4]],
  buys:['coal','raw_iron','raw_copper','raw_gold','redstone','lapis_lazuli','diamond','emerald','quartz','amethyst_shard','cobblestone','cobbled_deepslate'],
  requests:[['coal',32],['raw_iron',16],['raw_copper',24],['cobblestone',64],['redstone',16],['lapis_lazuli',12]]},
 lumberjack:{job:'木こり',hold:'iron_axe',skill:'gather',
  stock:[['oak_sapling','オークの苗木',4],['spruce_sapling','トウヒの苗木',4],['birch_sapling','シラカバの苗木',4],['iron_axe','鉄の斧',70],['bone_meal','骨粉',4]],
  buys:['oak_log','spruce_log','birch_log','jungle_log','acacia_log','dark_oak_log','mangrove_log','cherry_log','charcoal','stick'],
  requests:[['oak_log',32],['spruce_log',24],['birch_log',24],['charcoal',16],['oak_planks',64]]},
 adventurer:{job:'冒険家',hold:'iron_sword',skill:'gather',
  stock:[['torch','松明',2],['arrow','矢',3],['bow','弓',40],['shield','盾',45],['cooked_beef','ステーキ',18]],
  buys:['rotten_flesh','bone','string','spider_eye','gunpowder','ender_pearl','blaze_rod','slime_ball','phantom_membrane'],
  requests:[['rotten_flesh',16],['bone',12],['string',10],['gunpowder',6],['ender_pearl',2],['slime_ball',4]]},
};
NPC_JOBS.fisher.buys.push(...FISH_SPECIES.map(s=>s.id)); // the 100 fishing fish
for(const v of Object.values(NPC_JOBS)){v.stock=v.stock.map(([id,name,price])=>({item:M(id),name,price}));v.buys=new Set(v.buys.map(M));v.requests=v.requests.map(([id,n])=>[M(id),n]);}
/** The stock entry a job NPC sells, or undefined. */
export const stockOf=(role,item)=>NPC_JOBS[role]?.stock.find(s=>s.item===item);
