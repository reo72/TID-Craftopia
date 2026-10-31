import {FISH_SPECIES} from './fish-species.js';
import {CAN_RECIPES} from './watering-config.js';
import {TOOL_RECIPES} from './job-tools-config.js';
import {CAPACITY_RECIPES} from './bag-capacity.js';
import {PAN_RECIPES} from './frying-pan.js';
// Crafting-table recipes. The vanilla crafting table UI is replaced by the job workbench,
// so every 3x3 recipe players need must be listed here. Edit freely; invalid item ids are
// skipped at runtime with a content-log warning.
// Craft XP per craft = round(material cost x tier multiplier / xpDivisor), at least 1.
// Material cost = sum of ingredient value x amount. Crafted ingredients are valued from their own recipe.
export const WORKBENCH_RULES={xpDivisor:4,tierMultiplier:{basic:1,job:1.5,special:2},maxBatch:64,saveLevel:5,saveChance:.1,bonusLevel:30,bonusChance:.1};

// Value of one raw material (difficulty to obtain). Unlisted raw items count as 1.
export const MATERIAL_VALUES={
 'minecraft:stick':.5,'minecraft:cobblestone':1,'minecraft:stone':1.5,'minecraft:smooth_stone':2,'minecraft:glass':1.5,'minecraft:sugar_cane':1,'minecraft:wheat':1,'minecraft:sugar':1,'minecraft:egg':1,'minecraft:poppy':1,'minecraft:apple':2,
 'minecraft:string':2,'minecraft:feather':2,'minecraft:flint':2,'minecraft:white_wool':2,'minecraft:leather':3,'minecraft:cod':1.5,'minecraft:glass_bottle':1,'minecraft:milk_bucket':6,
 'minecraft:coal':2,'minecraft:raw_iron':4,'minecraft:iron_ingot':5,'minecraft:gold_ingot':6,'minecraft:redstone':3,'minecraft:redstone_torch':4,'minecraft:quartz':3,'minecraft:lapis_lazuli':3,
 'minecraft:diamond':15,'minecraft:obsidian':4,'minecraft:blaze_rod':8
};
export const GROUP_VALUES={planks:1,logs:2,cobble:1,wood_slab:.5};
// Ingredient groups: any listed type can be used. Group names are shown in the UI.
export const GROUPS={
 planks:['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak','bamboo','crimson','warped'].map(v=>'minecraft:'+v+'_planks'),
 logs:['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak'].map(v=>'minecraft:'+v+'_log').concat(['minecraft:crimson_stem','minecraft:warped_stem']),
 cobble:['minecraft:cobblestone','minecraft:cobbled_deepslate','minecraft:blackstone'],
 wood_slab:['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak','bamboo','crimson','warped'].map(v=>'minecraft:'+v+'_slab'),
 mushroom:['minecraft:brown_mushroom','minecraft:red_mushroom'], // campfire kitchen (cook-config.js)
 fuel:['minecraft:charcoal','minecraft:coal'] // smoker (smoke-config.js)
};
export const GROUP_NAMES={planks:'板材（種類自由）',logs:'原木（種類自由）',cobble:'丸石・深層岩の丸石',wood_slab:'木のハーフブロック（種類自由）',mushroom:'キノコ（種類自由）',fuel:'木炭・石炭'};
const g=key=>({group:key});
// a vanilla fish also accepts the fishing fish that count as it (fish-species.js base), so recipes, orders and requests
// that ask for cod / salmon take the 100 fish too
const FISH_OF=FISH_SPECIES.reduce((m,s)=>((m[s.base]??=[s.base]).push(s.id),m),{});
export const typesOf=type=>typeof type==='string'?FISH_OF[type]??[type]:GROUPS[type?.group]??[];
export const ingredientName=(type,itemName)=>typeof type==='string'?itemName(type):GROUP_NAMES[type?.group]??'不明な素材';

const tools=(prefix,label,material)=>[
 {name:label+'のツルハシ',output:['minecraft:'+prefix+'_pickaxe',1],inputs:[[material,3],['minecraft:stick',2]]},
 {name:label+'の斧',output:['minecraft:'+prefix+'_axe',1],inputs:[[material,3],['minecraft:stick',2]]},
 {name:label+'のシャベル',output:['minecraft:'+prefix+'_shovel',1],inputs:[[material,1],['minecraft:stick',2]]},
 {name:label+'のクワ',output:['minecraft:'+prefix+'_hoe',1],inputs:[[material,2],['minecraft:stick',2]]},
 {name:label+'の剣',output:['minecraft:'+prefix+'_sword',1],inputs:[[material,2],['minecraft:stick',1]]}
];
const armor=(prefix,label,material)=>[
 {name:label+'のヘルメット',output:['minecraft:'+prefix+'_helmet',1],inputs:[[material,5]]},
 {name:label+'のチェストプレート',output:['minecraft:'+prefix+'_chestplate',1],inputs:[[material,8]]},
 {name:label+'のレギンス',output:['minecraft:'+prefix+'_leggings',1],inputs:[[material,7]]},
 {name:label+'のブーツ',output:['minecraft:'+prefix+'_boots',1],inputs:[[material,4]]}
];
// Wood building blocks per wood type. Oak uses legacy ids for door/trapdoor/fence gate.
export const WOODS=[['oak','オーク'],['spruce','トウヒ'],['birch','シラカバ'],['jungle','ジャングル'],['acacia','アカシア'],['dark_oak','ダークオーク'],['mangrove','マングローブ'],['cherry','サクラ'],['pale_oak','ペールオーク'],['bamboo','竹'],['crimson','真紅'],['warped','歪んだ']];
const woodSet=([w,label])=>{
 const planks='minecraft:'+w+'_planks',id=s=>'minecraft:'+w+'_'+s;
 const list=[
  {name:label+'の階段',output:[id('stairs'),4],inputs:[[planks,6]]},
  {name:label+'のハーフブロック',output:[id('slab'),6],inputs:[[planks,3]]},
  {name:label+'のフェンス',output:[id('fence'),3],inputs:[[planks,4],['minecraft:stick',2]]},
  {name:label+'のフェンスゲート',output:[w==='oak'?'minecraft:fence_gate':id('fence_gate'),1],inputs:[[planks,2],['minecraft:stick',4]]},
  {name:label+'のドア',output:[w==='oak'?'minecraft:wooden_door':id('door'),3],inputs:[[planks,6]]},
  {name:label+'のトラップドア',output:[w==='oak'?'minecraft:trapdoor':id('trapdoor'),2],inputs:[[planks,6]]},
  {name:label+'の看板',output:[id('sign'),3],inputs:[[planks,6],['minecraft:stick',1]]}
 ];
 if(!['crimson','warped','bamboo'].includes(w))list.push({name:label+'のボート',output:[id('boat'),1],inputs:[[planks,5]]});
 if(w==='bamboo')list.push({name:'竹のいかだ',output:['minecraft:bamboo_raft',1],inputs:[[planks,5]]});
 return list.map(r=>({...r,category:'wood:'+w}));
};

// The workbench's tabs, in the RP's order (tools/build-bench-ui.mjs). Basic recipes go by category (wood: every
// 'wood:<type>', picked by wood type first); the job tab lists the job and special recipes of the player's jobs.
export const BENCH_TABS=[
 {label:'道具',icon:'textures/cooptown/items/wooden_pickaxe',categories:['tools','armor']},
 {label:'建築',icon:'textures/blocks/brick',categories:['wood','stone','blocks']},
 {label:'生活',icon:'textures/cooptown/items/furnace',categories:['storage','misc']},
 {label:'装飾',icon:'textures/cooptown/items/poppy',categories:['decor']},
 {label:'職業',icon:'textures/cooptown/items/anvil',job:true}];
export const BASIC_RECIPES=[
 ...[...tools('wooden','木',g('planks')),...tools('stone','石',g('cobble'))].map(r=>({...r,category:'tools'})),
 ...[
  {name:'弓',output:['minecraft:bow',1],inputs:[['minecraft:stick',3],['minecraft:string',3]]},
  {name:'矢',output:['minecraft:arrow',4],inputs:[['minecraft:flint',1],['minecraft:stick',1],['minecraft:feather',1]]},
  {name:'盾',output:['minecraft:shield',1],inputs:[[g('planks'),6],['minecraft:iron_ingot',1]]},
  {name:'釣り竿',output:['minecraft:fishing_rod',1],inputs:[['minecraft:stick',3],['minecraft:string',2]]},
  {name:'バケツ',output:['minecraft:bucket',1],inputs:[['minecraft:iron_ingot',3]]}
 ].map(r=>({...r,category:'tools'})),
 ...armor('leather','革','minecraft:leather').map(r=>({...r,category:'armor'})),
 ...[
  {name:'チェスト',output:['minecraft:chest',1],inputs:[[g('planks'),8]]},
  {name:'かまど',output:['minecraft:furnace',1],inputs:[[g('cobble'),8]]},
  {name:'ベッド（白）',output:['minecraft:bed',1],inputs:[['minecraft:white_wool',3],[g('planks'),3]]},
  {name:'はしご',output:['minecraft:ladder',3],inputs:[['minecraft:stick',7]]},
  {name:'焚き火',output:['minecraft:campfire',1],inputs:[['minecraft:stick',3],['minecraft:coal',1],[g('logs'),3]]},
  {name:'石切台',output:['minecraft:stonecutter_block',1],inputs:[['minecraft:iron_ingot',1],['minecraft:stone',3]]},
  {name:'額縁',output:['minecraft:frame',1],inputs:[['minecraft:stick',8],['minecraft:leather',1]],category:'decor'},
  {name:'防具立て',output:['minecraft:armor_stand',1],inputs:[['minecraft:stick',6],['minecraft:smooth_stone_slab',1]],category:'decor'}
 ].map(r=>({category:'storage',...r})),
 ...WOODS.flatMap(woodSet),
 ...[
  {name:'丸石の階段',output:['minecraft:stone_stairs',4],inputs:[['minecraft:cobblestone',6]]},
  {name:'丸石のハーフブロック',output:['minecraft:cobblestone_slab',6],inputs:[['minecraft:cobblestone',3]]},
  {name:'丸石の塀',output:['minecraft:cobblestone_wall',6],inputs:[['minecraft:cobblestone',6]]},
  {name:'板ガラス',output:['minecraft:glass_pane',16],inputs:[['minecraft:glass',6]],category:'decor'}
 ].map(r=>({category:'stone',...r})),
 ...[
  {name:'紙',output:['minecraft:paper',3],inputs:[['minecraft:sugar_cane',3]],category:'misc'},
  {name:'鉄ブロック',reversible:true,output:['minecraft:iron_block',1],inputs:[['minecraft:iron_ingot',9]]},
  {name:'金ブロック',reversible:true,output:['minecraft:gold_block',1],inputs:[['minecraft:gold_ingot',9]]},
  {name:'ダイヤモンドブロック',reversible:true,output:['minecraft:diamond_block',1],inputs:[['minecraft:diamond',9]]},
  {name:'石炭ブロック',reversible:true,output:['minecraft:coal_block',1],inputs:[['minecraft:coal',9]]}
 ].map(r=>({category:'blocks',...r})),
 // added with the new workbench (kept last: recipes are saved and crafted by their index)
 ...[
  {name:'植木鉢',output:['minecraft:flower_pot',1],inputs:[['minecraft:brick',3]]},
  {name:'絵画',output:['minecraft:painting',1],inputs:[['minecraft:stick',8],['minecraft:white_wool',1]]},
  {name:'ランタン',output:['minecraft:lantern',1],inputs:[['minecraft:iron_nugget',8],['minecraft:torch',1]]}
 ].map(r=>({...r,category:'decor'})),
 {name:'レンガ',output:['minecraft:brick_block',1],inputs:[['minecraft:brick',4]],category:'stone'},
 // backpacks (backpack-runtime.js), one per colour, in the 生活 tab
 ...[
  {name:'バックパック（緑）',output:['cooptown:backpack_green',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:green_dye',1]],icon:'textures/cooptown/backpack/icon_green'},
  {name:'バックパック（青）',output:['cooptown:backpack_blue',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:blue_dye',1]],icon:'textures/cooptown/backpack/icon_blue'},
  {name:'バックパック（黄緑）',output:['cooptown:backpack_lime',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:lime_dye',1]],icon:'textures/cooptown/backpack/icon_lime'},
  {name:'バックパック（水色）',output:['cooptown:backpack_cyan',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:cyan_dye',1]],icon:'textures/cooptown/backpack/icon_cyan'},
  {name:'バックパック（紫）',output:['cooptown:backpack_purple',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:purple_dye',1]],icon:'textures/cooptown/backpack/icon_purple'},
  {name:'バックパック（ピンク）',output:['cooptown:backpack_pink',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:pink_dye',1]],icon:'textures/cooptown/backpack/icon_pink'},
  {name:'バックパック（灰色）',output:['cooptown:backpack_gray',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:gray_dye',1]],icon:'textures/cooptown/backpack/icon_gray'},
  {name:'バックパック（茶色）',output:['cooptown:backpack_brown',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:brown_dye',1]],icon:'textures/cooptown/backpack/icon_brown'},
  {name:'バックパック（黄色）',output:['cooptown:backpack_yellow',1],inputs:[['minecraft:leather',7],['minecraft:chest',1],['minecraft:yellow_dye',1]],icon:'textures/cooptown/backpack/icon_yellow'}
 ].map(r=>({...r,category:'storage'})),
 // the food catalogue's cup for hot drinks (food-catalog.js); given back after drinking
 {name:'共通カップ',output:['cooptown:cup',1],inputs:[['minecraft:brick',3]],category:'misc',icon:'textures/cooptown/food/cup'}
];

// The smith's anvil recipes open with the job level (asked 2026-10-23): jobLevel = the 職業 Lv needed (engine
// workbench.craft and recipeLock check it). Keyed by the output id; unlisted smith recipes are open from Lv.1.
const M_=id=>'minecraft:'+id;
export const SMITH_LEVELS={
 ...Object.fromEntries(['iron_axe','iron_shovel','iron_hoe','iron_sword'].map(k=>[M_(k),1])),
 [M_('iron_helmet')]:3,[M_('iron_boots')]:3,[M_('iron_leggings')]:5,[M_('iron_chestplate')]:6,
 ...Object.fromEntries(['golden_axe','golden_shovel','golden_hoe','golden_sword','golden_pickaxe'].map(k=>[M_(k),7])),
 ...Object.fromEntries(['golden_helmet','golden_boots','golden_leggings','golden_chestplate'].map(k=>[M_(k),9])),
 ...Object.fromEntries(['diamond_axe','diamond_shovel','diamond_hoe'].map(k=>[M_(k),15])),[M_('diamond_pickaxe')]:18,[M_('diamond_sword')]:18,
 [M_('diamond_helmet')]:20,[M_('diamond_boots')]:20,[M_('diamond_leggings')]:23,[M_('diamond_chestplate')]:25,
 [M_('rail')]:2,[M_('iron_bars')]:2,[M_('iron_door')]:3,[M_('cauldron')]:4,[M_('blast_furnace')]:4,[M_('minecart')]:5,[M_('smithing_table')]:6,
 [M_('golden_rail')]:7,[M_('hopper')]:8,[M_('compass')]:10,[M_('clock')]:10,[M_('piston')]:10,[M_('anvil')]:12,[M_('dispenser')]:12,[M_('dropper')]:12,
 [M_('repeater')]:14,[M_('observer')]:15,[M_('comparator')]:16};
const withJobLevel=r=>SMITH_LEVELS[r.output[0]]?{...r,jobLevel:SMITH_LEVELS[r.output[0]]}:r;
// Job-only vanilla recipes (craft XP). Existing job/special recipes live in game-config.js.
export const JOB_VANILLA_RECIPES=[
 ...[...tools('iron','鉄','minecraft:iron_ingot'),...tools('golden','金','minecraft:gold_ingot'),...tools('diamond','ダイヤモンド','minecraft:diamond'),...armor('iron','鉄','minecraft:iron_ingot'),...armor('golden','金','minecraft:gold_ingot'),...armor('diamond','ダイヤモンド','minecraft:diamond')].filter(r=>r.output[0]!=='minecraft:iron_pickaxe').map(r=>({...r,job:'鍛冶師'})),
 ...[
  {name:'金床',output:['minecraft:anvil',1],inputs:[['minecraft:iron_block',3],['minecraft:iron_ingot',4]]},
  {name:'鍛冶台',output:['minecraft:smithing_table',1],inputs:[['minecraft:iron_ingot',2],[g('planks'),4]]},
  {name:'大釜',output:['minecraft:cauldron',1],inputs:[['minecraft:iron_ingot',7]]},
  {name:'鉄格子',output:['minecraft:iron_bars',16],inputs:[['minecraft:iron_ingot',6]]},
  {name:'鉄のドア',output:['minecraft:iron_door',3],inputs:[['minecraft:iron_ingot',6]]},
  {name:'ホッパー',output:['minecraft:hopper',1],inputs:[['minecraft:iron_ingot',5],['minecraft:chest',1]]},
  {name:'レール',output:['minecraft:rail',16],inputs:[['minecraft:iron_ingot',6],['minecraft:stick',1]]},
  {name:'パワードレール',output:['minecraft:golden_rail',6],inputs:[['minecraft:gold_ingot',6],['minecraft:stick',1],['minecraft:redstone',1]]},
  {name:'トロッコ',output:['minecraft:minecart',1],inputs:[['minecraft:iron_ingot',5]]},
  {name:'コンパス',output:['minecraft:compass',1],inputs:[['minecraft:iron_ingot',4],['minecraft:redstone',1]]},
  {name:'時計',output:['minecraft:clock',1],inputs:[['minecraft:gold_ingot',4],['minecraft:redstone',1]]},
  {name:'ピストン',output:['minecraft:piston',1],inputs:[[g('planks'),3],[g('cobble'),4],['minecraft:iron_ingot',1],['minecraft:redstone',1]]},
  {name:'ディスペンサー',output:['minecraft:dispenser',1],inputs:[['minecraft:cobblestone',7],['minecraft:bow',1],['minecraft:redstone',1]]},
  {name:'ドロッパー',output:['minecraft:dropper',1],inputs:[['minecraft:cobblestone',7],['minecraft:redstone',1]]},
  {name:'オブザーバー',output:['minecraft:observer',1],inputs:[['minecraft:cobblestone',6],['minecraft:redstone',2],['minecraft:quartz',1]]},
  {name:'リピーター',output:['minecraft:repeater',1],inputs:[['minecraft:stone',3],['minecraft:redstone_torch',2],['minecraft:redstone',1]]},
  {name:'コンパレーター',output:['minecraft:comparator',1],inputs:[['minecraft:stone',3],['minecraft:redstone_torch',3],['minecraft:quartz',1]]}
 ].map(r=>({...r,job:'鍛冶師'})),
 {name:'溶鉱炉',job:'鍛冶師',output:['minecraft:blast_furnace',1],inputs:[['minecraft:iron_ingot',5],['minecraft:furnace',1],['minecraft:smooth_stone',3]]},
 {name:'樽',job:'木こり',output:['minecraft:barrel',1],inputs:[[g('planks'),6],[g('wood_slab'),2]]},
 {name:'製図台',job:'冒険家',output:['minecraft:cartography_table',1],inputs:[['minecraft:paper',2],[g('planks'),4]]},
 {name:'コンポスター',job:'農家',output:['minecraft:composter',1],inputs:[[g('wood_slab'),7]]},
 {name:'燻製器',job:'料理人',output:['minecraft:smoker',1],inputs:[[g('logs'),4],['minecraft:furnace',1]]},
 {name:'醸造台',job:'調合師',output:['minecraft:brewing_stand',1],inputs:[['minecraft:blaze_rod',1],[g('cobble'),3]]},
 {name:'ケーキ',job:'料理人',output:['minecraft:cake',1],extra:[['minecraft:bucket',3]],inputs:[['minecraft:milk_bucket',3],['minecraft:sugar',2],['minecraft:egg',1],['minecraft:wheat',3]]},
 {name:'金のリンゴ',job:'料理人',output:['minecraft:golden_apple',1],inputs:[['minecraft:gold_ingot',8],['minecraft:apple',1]]},
 {name:'エンチャント台',job:'付与術師',output:['minecraft:enchanting_table',1],inputs:[['minecraft:book',1],['minecraft:diamond',2],['minecraft:obsidian',4]]},
 {name:'本棚',job:'付与術師',output:['minecraft:bookshelf',1],inputs:[[g('planks'),6],['minecraft:book',3]]},
 ...CAN_RECIPES, // the farmer's watering cans (watering-config.js)
 ...TOOL_RECIPES, // each job's own tools (job-tools-config.js)
 ...CAPACITY_RECIPES, // the 付与術師's 容量拡張の書 (bag-capacity.js)
 ...PAN_RECIPES // the 料理人's frying pans (frying-pan.js)
].map(withJobLevel);

export const WORKBENCH_NAMES={
 ...Object.fromEntries(WOODS.map(([w,label])=>['minecraft:'+w+'_planks',label+'の板材'])),
 'minecraft:string':'糸','minecraft:flint':'火打石','minecraft:feather':'羽根','minecraft:white_wool':'白の羊毛','minecraft:stone':'石','minecraft:smooth_stone':'滑らかな石','minecraft:smooth_stone_slab':'滑らかな石のハーフブロック','minecraft:glass':'ガラス','minecraft:sugar_cane':'サトウキビ','minecraft:gold_ingot':'金インゴット','minecraft:diamond':'ダイヤモンド','minecraft:redstone':'レッドストーン','minecraft:redstone_torch':'レッドストーントーチ','minecraft:quartz':'ネザークォーツ','minecraft:iron_block':'鉄ブロック','minecraft:chest':'チェスト','minecraft:furnace':'かまど','minecraft:bow':'弓','minecraft:blaze_rod':'ブレイズロッド','minecraft:milk_bucket':'牛乳入りバケツ','minecraft:sugar':'砂糖','minecraft:egg':'卵','minecraft:apple':'リンゴ','minecraft:obsidian':'黒曜石','minecraft:bucket':'バケツ','minecraft:cobblestone':'丸石'
};
