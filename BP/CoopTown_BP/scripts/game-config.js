import {JOB_SPECIAL_NAMES} from './special-config.js';
import {EXTRA_ITEM_NAMES} from './item-names-extra.js';
import {VANILLA_NAMES} from './vanilla-names.js';
import {CAN_NAMES} from './watering-config.js';
import {TOOL_NAMES} from './job-tools-config.js';
import {PAN_ITEM_NAMES} from './frying-pan.js';
import {DISHES} from './food-config.js';
import {POTIONS} from './potion-config.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {FISH_SPECIES} from './fish-species.js';
import {SPECIAL_NAMES,SPECIAL_RECIPES} from './cooperation-config.js';
import {BASIC_RECIPES,JOB_VANILLA_RECIPES,WORKBENCH_NAMES,WORKBENCH_RULES,MATERIAL_VALUES,GROUP_VALUES,GROUPS} from './workbench-config.js';
// Initial play-test rules. Keep balance changes here, separate from persistence/UI.
export const RULES={secondaryLevel:20,jobChangeCost:100,freeJobChangeSeconds:3*3600,coinCap:1000000000,dailyCoins:100,dailyXp:60,dailyBonus:150,townBatch:16,townCoins:10};
// 調合師 was split off 料理人 (once one job, 料理人・調合師): it comes last so the other jobs keep their numbers
// the jobs of the design (Notion「職業システム」): 冒険家 replaces 木こり and 鉱夫 (2026-10-19), 畜産農家 merged into 農家 (2026-10-20), 付与術師
// is now 付与術師 (was エンチャンター until 2026-10-22); no job (未選択) shows as ニート
export const JOBS=['冒険家','鉱夫','木こり','農家','鍛冶師','料理人','付与術師','釣り師','調合師']; // 鉱夫 / 木こり back as jobs of their own (2026-10-30)
/** Old job names in saved data -> the current ones (game-engine.js renames them when it reads the save). */
export const RENAMED_JOBS={'料理人・調合師':'料理人','エンチャンター':'付与術師','畜産農家':'農家'};
/** How a job shows: 未選択 is ニート. */
export const jobLabel=job=>!job||job==='未選択'?'ニート':job;
export const MATERIALS=[['minecraft:oak_log','オークの原木'],['minecraft:iron_ingot','鉄インゴット'],['minecraft:bread','パン'],['minecraft:cobblestone','丸石'],['minecraft:wheat','小麦'],['minecraft:cod','生のタラ']];
const BASE_NAMES={...SPECIAL_NAMES,...Object.fromEntries([...MATERIALS,['minecraft:oak_planks','オークの板材'],['minecraft:raw_iron','鉄の原石'],['minecraft:coal','石炭'],['minecraft:hay_block','干草の俵'],['minecraft:stick','棒'],['minecraft:iron_pickaxe','鉄のツルハシ'],['minecraft:paper','紙'],['minecraft:leather','革'],['minecraft:book','本'],['minecraft:cooked_cod','焼きタラ'],['minecraft:lantern','ランタン'],['minecraft:painting','絵画'],['minecraft:flower_pot','植木鉢'],['minecraft:poppy','ポピー'],['minecraft:name_tag','名札'],['cooptown:guidebook','メニュー'],['minecraft:lapis_lazuli','ラピスラズリ'],['minecraft:glass_bottle','ガラス瓶']])};
// minRank: the lowest quality taken (quality.js TIERS 0 D ... 4 S; 0 = any), shown on the quest page (2026-10-30)
export const ORDERS=[{name:'街へ木材を届けよう',item:'minecraft:oak_log',amount:32,coins:160,skill:'gather',minRank:1},{name:'鉄インゴットの募集',item:'minecraft:iron_ingot',amount:8,coins:200,skill:'mine',minRank:0},{name:'探索用の料理を届けよう',item:'minecraft:bread',amount:8,minRank:0,coins:120,skill:'craft'}];
// Workbench-only names are for display; the tradable list stays the original material set.
export const ITEM_NAMES={...VANILLA_NAMES,...EXTRA_ITEM_NAMES,...WORKBENCH_NAMES,...BASE_NAMES,...JOB_SPECIAL_NAMES,...CAN_NAMES,...TOOL_NAMES,...PAN_ITEM_NAMES,'cooptown:guidebook_open':'案内手帳','cooptown:admin_book':'運営の手帳','cooptown:recipe_scroll':'レシピの巻物','minecraft:emerald':'エメラルド','minecraft:rotten_flesh':'腐った肉','minecraft:prismarine_crystals':'プリズマリンクリスタル','minecraft:bamboo':'竹','minecraft:ice':'氷','minecraft:torch':'松明','minecraft:bone_meal':'骨粉','minecraft:brick':'レンガ','minecraft:green_dye':'緑の染料','minecraft:blue_dye':'青の染料','minecraft:lime_dye':'黄緑の染料','minecraft:cyan_dye':'水色の染料','minecraft:purple_dye':'紫の染料','minecraft:pink_dye':'ピンクの染料','minecraft:gray_dye':'灰色の染料','minecraft:brown_dye':'茶色の染料','minecraft:yellow_dye':'黄色の染料',
 ...Object.fromEntries(Object.entries(DISHES).map(([k,d])=>['cooptown:'+k,d[0]])),...Object.fromEntries(POTIONS.map(p=>[p.id,p.name])),
 ...Object.fromEntries(FOOD_CATALOG.map(e=>[e.id,e.name])),...Object.fromEntries(FISH_SPECIES.map(s=>[s.id,s.name])),water:'水入り瓶'};
export const TRADE_ITEMS=Object.keys(BASE_NAMES).filter(id=>!['cooptown:guidebook','minecraft:iron_pickaxe'].includes(id));
export const RECIPES=[
 {name:'木材加工',job:'木こり',inputs:[['minecraft:oak_log',4]],output:['minecraft:oak_planks',16]},
 {name:'鉄の精錬',job:'鍛冶師',inputs:[['minecraft:raw_iron',4],['minecraft:coal',1]],output:['minecraft:iron_ingot',4]},
 {name:'干草の俵',job:'農家',reversible:true,inputs:[['minecraft:wheat',9]],output:['minecraft:hay_block',1]},
 {name:'鉄のツルハシ',job:'鍛冶師',inputs:[['minecraft:iron_ingot',3],['minecraft:stick',2]],output:['minecraft:iron_pickaxe',1]},
 {name:'パン作り',job:'料理人',inputs:[['minecraft:wheat',3]],output:['minecraft:bread',1]},
 {name:'本作り',job:'付与術師',inputs:[['minecraft:paper',3],['minecraft:leather',1]],output:['minecraft:book',1]},
 {name:'焼き魚',job:'釣り師',inputs:[['minecraft:cod',4],['minecraft:coal',1]],output:['minecraft:cooked_cod',4]},
 ...SPECIAL_RECIPES
];
// Everything the crafting table offers. RECIPES stay first so journal page indexes (craft_N_0) keep matching.
export const WORKBENCH_RECIPES=[...RECIPES,...JOB_VANILLA_RECIPES,...BASIC_RECIPES];
export const recipeTier=r=>r.level?'special':r.job?'job':'basic';
// Difficulty-based craft XP. Crafted ingredients are valued from the recipe that makes them.
const makers=new Map();for(const r of WORKBENCH_RECIPES)if(!makers.has(r.output[0]))makers.set(r.output[0],r);
const values=new Map();
export function itemValue(type,seen=new Set()){
 if(typeof type!=='string')return GROUP_VALUES[type?.group]??1;
 if(MATERIAL_VALUES[type]!==undefined)return MATERIAL_VALUES[type];
 for(const [g,ids] of Object.entries(GROUPS))if(ids.includes(type))return GROUP_VALUES[g]; // e.g. any planks = 1
 if(values.has(type))return values.get(type);
 const r=makers.get(type);if(!r||seen.has(type))return 1;
 seen.add(type);const v=recipeCost(r,seen)/r.output[1];values.set(type,v);return v;
}
export const recipeCost=(r,seen=new Set())=>r.inputs.reduce((sum,[t,n])=>sum+itemValue(t,new Set(seen))*n,0);
export const recipeXp=r=>r.reversible?0:r.xp??Math.max(1,Math.round(recipeCost(r)*WORKBENCH_RULES.tierMultiplier[recipeTier(r)]/WORKBENCH_RULES.xpDivisor));
export const PRIZES=[{name:'ランタン',item:'minecraft:lantern',amount:2,weight:30},{name:'絵画',item:'minecraft:painting',amount:1,weight:25},{name:'植木鉢',item:'minecraft:flower_pot',amount:2,weight:20},{name:'ポピー',item:'minecraft:poppy',amount:4,weight:15},{name:'名札',item:'minecraft:name_tag',amount:1,weight:8},{name:'称号「街のお宝探し」',title:'街のお宝探し',weight:2}];
/** @type {[string,string,number][]} */
export const DAILY=[['納品する','deliver',1],['クラフト台で製作する','craft',3],['図鑑に新登録','discover',1],['街へ素材を届ける','town',1],['依頼を達成する','quest',1]];
export const CODEX=[['minecraft:sheep','ヒツジ','友好モブ'],['minecraft:cow','ウシ','友好モブ'],['minecraft:chicken','ニワトリ','友好モブ'],['minecraft:wolf','オオカミ','友好モブ'],['minecraft:slime','スライム','敵モブ'],['minecraft:creeper','クリーパー','敵モブ'],['minecraft:cod','タラ','魚'],
 // materials (asked 2026-10-30): registered when one is in the player's items (game-runtime.js)
 ['minecraft:oak_log','オークの原木','素材'],['minecraft:spruce_log','トウヒの原木','素材'],['minecraft:birch_log','シラカバの原木','素材'],['minecraft:jungle_log','ジャングルの原木','素材'],['minecraft:acacia_log','アカシアの原木','素材'],['minecraft:dark_oak_log','ダークオークの原木','素材'],['minecraft:mangrove_log','マングローブの原木','素材'],['minecraft:cherry_log','サクラの原木','素材'],['minecraft:pale_oak_log','ペールオークの原木','素材'],['minecraft:crimson_stem','真紅の幹','素材'],['minecraft:warped_stem','歪んだ幹','素材'],['minecraft:bamboo','竹','素材'],['minecraft:cobblestone','丸石','素材'],['minecraft:deepslate','深層岩','素材'],['minecraft:cobbled_deepslate','深層岩の丸石','素材'],['minecraft:sand','砂','素材'],['minecraft:gravel','砂利','素材'],['minecraft:clay_ball','粘土玉','素材'],['minecraft:flint','火打石','素材'],['minecraft:coal','石炭','素材'],['minecraft:raw_copper','銅の原石','素材'],['minecraft:raw_iron','鉄の原石','素材'],['minecraft:raw_gold','金の原石','素材'],['minecraft:copper_ingot','銅インゴット','素材'],['minecraft:iron_ingot','鉄インゴット','素材'],['minecraft:gold_ingot','金インゴット','素材'],['minecraft:redstone','レッドストーンダスト','素材'],['minecraft:lapis_lazuli','ラピスラズリ','素材'],['minecraft:diamond','ダイヤモンド','素材'],['minecraft:emerald','エメラルド','素材'],['minecraft:amethyst_shard','アメジストの欠片','素材'],['minecraft:quartz','ネザークォーツ','素材'],['minecraft:obsidian','黒曜石','素材'],['minecraft:netherite_scrap','ネザライトの欠片','素材'],['minecraft:netherite_ingot','ネザライトインゴット','素材'],['minecraft:string','糸','素材'],['minecraft:feather','羽根','素材'],['minecraft:leather','革','素材'],['minecraft:bone','骨','素材'],['minecraft:gunpowder','火薬','素材'],['minecraft:slime_ball','スライムボール','素材'],['minecraft:ender_pearl','エンダーパール','素材'],['minecraft:blaze_rod','ブレイズロッド','素材'],['minecraft:ghast_tear','ガストの涙','素材'],['minecraft:spider_eye','クモの目','素材'],['minecraft:rotten_flesh','腐った肉','素材'],['minecraft:ink_sac','イカスミ','素材'],['minecraft:glow_ink_sac','輝くイカスミ','素材'],['minecraft:nautilus_shell','オウムガイの殻','素材'],['minecraft:wheat','小麦','素材'],['minecraft:wheat_seeds','小麦の種','素材'],['minecraft:sugar_cane','サトウキビ','素材'],['minecraft:cactus','サボテン','素材'],['minecraft:pumpkin','カボチャ','素材'],['minecraft:melon_slice','スイカの薄切り','素材'],['minecraft:egg','卵','素材'],['minecraft:white_wool','白色の羊毛','素材'],['minecraft:honeycomb','ハニカム','素材'],
 // every other mob (asked 2026-10-30): friendly and neutral ones are met (6 blocks), hostile ones defeated
 ['minecraft:allay','アレイ','友好モブ'],['minecraft:armadillo','アルマジロ','友好モブ'],['minecraft:axolotl','ウーパールーパー','友好モブ'],['minecraft:bat','コウモリ','友好モブ'],['minecraft:bee','ミツバチ','友好モブ'],['minecraft:camel','ラクダ','友好モブ'],['minecraft:cat','ネコ','友好モブ'],['minecraft:copper_golem','銅ゴーレム','友好モブ'],['minecraft:donkey','ロバ','友好モブ'],['minecraft:dolphin','イルカ','友好モブ'],['minecraft:fox','キツネ','友好モブ'],['minecraft:frog','カエル','友好モブ'],['minecraft:glow_squid','ヒカリイカ','友好モブ'],['minecraft:goat','ヤギ','友好モブ'],['minecraft:happy_ghast','ハッピーガスト','友好モブ'],['minecraft:horse','ウマ','友好モブ'],['minecraft:iron_golem','アイアンゴーレム','友好モブ'],['minecraft:llama','ラマ','友好モブ'],['minecraft:mooshroom','ムーシュルーム','友好モブ'],['minecraft:mule','ラバ','友好モブ'],['minecraft:ocelot','ヤマネコ','友好モブ'],['minecraft:panda','パンダ','友好モブ'],['minecraft:parrot','オウム','友好モブ'],['minecraft:pig','ブタ','友好モブ'],['minecraft:polar_bear','シロクマ','友好モブ'],['minecraft:rabbit','ウサギ','友好モブ'],['minecraft:skeleton_horse','スケルトンホース','友好モブ'],['minecraft:sniffer','スニッファー','友好モブ'],['minecraft:snow_golem','スノーゴーレム','友好モブ'],['minecraft:squid','イカ','友好モブ'],['minecraft:strider','ストライダー','友好モブ'],['minecraft:tadpole','オタマジャクシ','友好モブ'],['minecraft:trader_llama','行商人のラマ','友好モブ'],['minecraft:turtle','カメ','友好モブ'],['minecraft:villager_v2','村人','友好モブ'],['minecraft:wandering_trader','行商人','友好モブ'],['minecraft:blaze','ブレイズ','敵モブ'],['minecraft:bogged','ボグド','敵モブ'],['minecraft:breeze','ブリーズ','敵モブ'],['minecraft:cave_spider','洞窟グモ','敵モブ'],['minecraft:creaking','クリーキング','敵モブ'],['minecraft:drowned','ドラウンド','敵モブ'],['minecraft:elder_guardian','エルダーガーディアン','敵モブ'],['minecraft:ender_dragon','エンダードラゴン','敵モブ'],['minecraft:enderman','エンダーマン','敵モブ'],['minecraft:endermite','エンダーマイト','敵モブ'],['minecraft:evocation_illager','エヴォーカー','敵モブ'],['minecraft:ghast','ガスト','敵モブ'],['minecraft:guardian','ガーディアン','敵モブ'],['minecraft:hoglin','ホグリン','敵モブ'],['minecraft:husk','ハスク','敵モブ'],['minecraft:magma_cube','マグマキューブ','敵モブ'],['minecraft:phantom','ファントム','敵モブ'],['minecraft:piglin','ピグリン','敵モブ'],['minecraft:piglin_brute','ピグリンブルート','敵モブ'],['minecraft:pillager','ピリジャー','敵モブ'],['minecraft:ravager','ラヴェジャー','敵モブ'],['minecraft:shulker','シュルカー','敵モブ'],['minecraft:silverfish','シルバーフィッシュ','敵モブ'],['minecraft:skeleton','スケルトン','敵モブ'],['minecraft:spider','クモ','敵モブ'],['minecraft:stray','ストレイ','敵モブ'],['minecraft:vex','ヴェックス','敵モブ'],['minecraft:vindicator','ヴィンディケーター','敵モブ'],['minecraft:warden','ウォーデン','敵モブ'],['minecraft:witch','ウィッチ','敵モブ'],['minecraft:wither','ウィザー','敵モブ'],['minecraft:wither_skeleton','ウィザースケルトン','敵モブ'],['minecraft:zoglin','ゾグリン','敵モブ'],['minecraft:zombie','ゾンビ','敵モブ'],['minecraft:zombie_pigman','ゾンビピグリン','敵モブ'],['minecraft:zombie_villager_v2','村人ゾンビ','敵モブ'],['minecraft:salmon','サケ','魚'],['minecraft:tropical_fish','熱帯魚','魚'],['minecraft:pufferfish','フグ','魚']];
export const dayKey=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
// the skill trees live in skill-config.js (one per job, 2026-10-28)
export {SKILL_NODES,skillPoints} from './skill-config.js';
