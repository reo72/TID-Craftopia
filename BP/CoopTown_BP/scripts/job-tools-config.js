import {FISH_SPECIES} from './fish-species.js';
import {SHELF} from './food-config.js';
import {potionById} from './potion-config.js';
import {ROD_TIERS} from './fishing-rods.js';
// what each better rod takes (one plain rod each: tier rods are never used up as materials)
const ROD_INPUTS={mid:[['minecraft:fishing_rod',1],['minecraft:iron_ingot',3],['minecraft:string',4]],
 high:[['minecraft:fishing_rod',1],['minecraft:gold_ingot',3],['minecraft:diamond',1],['minecraft:string',4]],
 master:[['minecraft:fishing_rod',1],['minecraft:diamond',3],['minecraft:emerald',4],['minecraft:string',4]]};

// Each job's own tools (asked 2026-10-27, like the farmer's watering cans): job-only, crafted on the workbench (職業
// tab) from a job level, with their own use effects (job-tools.js): an arm animation (RP animations/cooptown_tools),
// particles and a sound. kind: what using it does (job-tools.js); dur: uses (durability); stack: stack size.
// anim: the RP animation played on use (animation.cooptown.tool.<anim>).
const C='cooptown:';
export const TOOLS={
 // ---- 農家 ----
 [C+'animal_brush']:{name:'飼育ブラシ',job:'農家',level:1,kind:'brush',dur:64,anim:'brush',button:'ブラッシング',
  desc:'登録した自分の動物に使うと、ブラッシングで世話ができる（飼育台に行かなくてよい）。',stats:['§b1頭ずつ世話','§a世話ボーナス 1時間']},
 [C+'animal_brush_gold']:{name:'金の飼育ブラシ',job:'農家',level:25,kind:'brush',dur:160,area:5,anim:'brush',button:'ブラッシング',
  desc:'まわりにいる自分の動物をまとめてブラッシングして世話する。',stats:['§b半径5ブロックの動物をまとめて','§a世話ボーナス 1時間']},
 // ---- 釣り師 ----
 [C+'bait_river']:{name:'川の練り餌',job:'釣り師',level:1,kind:'bait',stack:64,
  desc:'オフハンドに持って釣ると使われる練り餌。川や平野の魚が釣れやすい。',stats:['§b種の餌と同じ好み＋レア確率×1.5','§7釣れるたびに1個']},
 [C+'bait_sea']:{name:'海の練り餌',job:'釣り師',level:5,kind:'bait',stack:64,
  desc:'オフハンドに持って釣ると使われる練り餌。深い海の魚が釣れやすい。',stats:['§bクモの目と同じ好み＋レア確率×1.5','§7釣れるたびに1個']},
 [C+'bait_night']:{name:'夜釣りの餌',job:'釣り師',level:10,kind:'bait',stack:64,
  desc:'オフハンドに持って釣ると使われる餌。夜の大物が釣れやすい。',stats:['§b腐った肉と同じ好み＋レア確率×1.5','§7釣れるたびに1個']},
 [C+'bait_legend']:{name:'伝説の擬似餌',job:'釣り師',level:30,kind:'bait',stack:16,
  desc:'光る特製のルアー。オフハンドに持って釣ると、伝説の魚がかかりやすくなる。',stats:['§6伝説の魚の確率×3','§7釣れるたびに1個']},
 [C+'fish_basket']:{name:'魚籠',job:'釣り師',level:10,kind:'bag',anim:'bag',button:'魚籠を開く',
  desc:'魚だけを入れておける籠。持ち物にあると、釣った魚が自動で入る。中の魚は傷みにくい。',stats:['§b27枠・魚のみ','§a中の魚の期限の進みが半分']},
 // the better baskets (asked 2026-10-30, like the rods): the same 27 places, the fish inside keep longer
 [C+'fish_basket_mid']:{name:'中級者の魚籠',job:'釣り師',level:25,kind:'bag',anim:'bag',button:'魚籠を開く',
  desc:'目の細かい丈夫な魚籠。持ち物にあると、釣った魚が自動で入る。中の魚がとても傷みにくい。',stats:['§b2ページ（52枠）・魚のみ','§a中の魚の期限の進みが4分の1']},
 [C+'fish_basket_master']:{name:'名人の魚籠',job:'釣り師',level:45,kind:'bag',anim:'bag',button:'魚籠を開く',
  desc:'名人が使う特製の魚籠。持ち物にあると、釣った魚が自動で入る。中の魚はほとんど傷まない。',stats:['§b3ページ（78枠）・魚のみ','§a中の魚の期限の進みが10分の1']},
 // ---- 鍛冶師 ----
 [C+'smith_hammer']:{name:'鍛冶ハンマー',job:'鍛冶師',level:10,kind:'hammer',dur:128,anim:'hammer',button:'修理する',
  desc:'相手を見て使うと、その人が手に持っている道具をその場で修理する。しゃがんで使うと自分のオフハンドの物を修理。',stats:['§b耐久 25%回復（Lv30から40%）','§7材料のインゴットなどを1個使う']},
 [C+'whetstone']:{name:'砥石の欠片',job:'鍛冶師',level:5,kind:'whetstone',stack:16,anim:'rub',button:'刃を研ぐ',
  desc:'使うと手に持った武器を研いで、しばらく攻撃が強くなる（研磨刃）。誰でも使える。',stats:['§c研磨刃：近接攻撃 +2（3分）','§7職業に関係なく使える']},
 // ---- 料理人 ----
 [C+'cook_knife']:{name:'料理人の包丁',job:'料理人',level:5,kind:'knife',dur:250,anim:'slice',
  desc:'料理人がこれで動物を倒すと、肉が多くとれる。',stats:['§a肉 +1（50%）','§7料理人のみ効果']},
 [C+'cool_bag']:{name:'保冷バッグ',job:'料理人',level:10,kind:'bag',anim:'bag',button:'保冷バッグを開く',
  desc:'食べ物だけを入れておけるバッグ。中の食べ物は傷みにくい。',stats:['§b27枠・期限のある食べ物のみ','§a中の期限の進みが半分']},
 // ---- 調合師 ----
 [C+'herb_knife']:{name:'薬草ナイフ',job:'調合師',level:1,kind:'herb',dur:200,anim:'slice',
  desc:'草や花をこれで刈ると、薬草の束がとれることがある。',stats:['§a草 10%・花 35%で薬草の束','§7調合師のみ効果']},
 [C+'potion_holder']:{name:'試験管ホルダー',job:'調合師',level:10,kind:'bag',anim:'drink',button:'ホルダーを開く',
  desc:'ポーションを9本まで差しておけるホルダー。しゃがんで使うと、1本目をすぐ飲む。',stats:['§b9枠・ポーションのみ','§aしゃがんで使う：1本目を飲む']},
 // ---- 付与術師 ----
 [C+'mana_lupe']:{name:'魔力のルーペ',job:'付与術師',level:1,kind:'lupe',anim:'inspect',button:'鑑定する',
  desc:'相手を見て使うと、その人の装備を鑑定する（エンチャント・ルーン・耐久）。しゃがんで使うと自分の装備。',stats:['§d装備・エンチャント・ルーン・耐久を表示']},
 [C+'rune_pen']:{name:'刻印のペン',job:'付与術師',level:10,kind:'pen',dur:64,anim:'write',
  desc:'持ち物にあると、ルーンを本に書き込むときのラピスラズリが1個少なくてすむ。',stats:['§b書き込み：ラピス 2→1','§7書き込むたびに耐久1']},
 // ---- 冒険家 ----
 [C+'map_pin']:{name:'地図ピン',job:'冒険家',level:5,kind:'pin',anim:'point',button:'ピンを使う',
  desc:'今いる場所を3つまで記録できる。手に持つと、選んだピンの方角と距離が出る。',stats:['§b記録 3か所','§a手に持つと方角と距離']},
 [C+'miner_lantern']:{name:'鉱夫のカンテラ',job:'鉱夫',level:10,kind:'lantern',offhand:true,
  desc:'オフハンド（または手）に持つと、暗い場所でもよく見える。',stats:['§e持っている間 暗視','§7鉱夫のみ効果']},
 // ---- 極み (asked 2026-10-27: each job's top tool, Lv.50, from the rare materials) ----
 [C+'bait_master']:{name:'主の擬似餌',job:'釣り師',level:50,kind:'bait',dur:64,master:true,
  desc:'何度でも使える名人のルアー。オフハンドに持って釣ると、レアと伝説の魚がかかりやすい。',stats:['§6伝説×3・レア×2','§7釣れるたびに耐久1']},
 [C+'master_hammer']:{name:'極みの鍛冶ハンマー',job:'鍛冶師',level:50,kind:'hammer',dur:512,share:.6,free:true,master:true,anim:'hammer',button:'修理する',
  desc:'名工のハンマー。材料なしで、相手が手に持つ道具を大きく修理する。しゃがむと自分のオフハンド。',stats:['§b耐久 60%回復','§a材料いらず']},
 [C+'master_knife']:{name:'極みの包丁',job:'料理人',level:50,kind:'knife',dur:1000,extra:2,chance:1,master:true,anim:'slice',
  desc:'名料理人の包丁。動物を倒すと、肉が必ず多くとれる。',stats:['§a肉 +1〜2（必ず）','§7料理人のみ効果']},
 [C+'master_herb_knife']:{name:'極みの薬草ナイフ',job:'調合師',level:50,kind:'herb',dur:800,mult:2.5,master:true,anim:'slice',
  desc:'名薬師のナイフ。草や花から薬草がよくとれる。',stats:['§a薬草の確率×2.5','§7調合師のみ効果']},
 [C+'master_pen']:{name:'極みの刻印ペン',job:'付与術師',level:50,kind:'pen',dur:256,save:2,master:true,anim:'write',
  desc:'持ち物にあると、ルーンを本に書き込むときにラピスラズリがいらない。',stats:['§b書き込み：ラピス 2→0','§7書き込むたびに耐久1']},
 [C+'master_lantern']:{name:'極みのカンテラ',job:'鉱夫',level:50,kind:'lantern',offhand:true,haste:true,master:true,
  desc:'オフハンド（または手）に持つと、暗視に加えて採掘が速くなる。',stats:['§e暗視＋採掘速度上昇','§7鉱夫のみ効果']},
 [C+'planting_bag']:{name:'木こりの植林袋',job:'木こり',level:30,kind:'planter',
  desc:'持ち物にあると、木を伐った跡に同じ木の苗木を自動で植える（持ち物の苗木を使う）。',stats:['§a伐採後に自動で植林','§7苗木は持ち物から1本']}
};
export const TOOL_NAMES=Object.fromEntries(Object.entries(TOOLS).map(([id,t])=>[id,t.name]));
export const isJobTool=id=>!!TOOLS[id];
/** The description lore parts for a tool ({desc, stats}), like food-lore.js infoParts. */
export const toolInfo=(id,wrap=s=>[s])=>{const t=TOOLS[id];if(!t)return null;
 return {desc:wrap(t.desc).map(l=>'§7'+l),stats:[...t.stats,`§8${t.job}・職業Lv.${t.level}から`]};};

// how each one works
export const BRUSH={radius:5,xp:3};
// baits (the off hand): the liked-bait key it stands for (fish-runtime.js BAITS) and the rare / legendary boosts
export const BAIT_ITEMS={[C+'bait_master']:{key:'legend',rare:2,legend:3,reusable:true},[C+'bait_river']:{key:'seeds',rare:1.5},[C+'bait_sea']:{key:'eye',rare:1.5},[C+'bait_night']:{key:'worm',rare:1.5},[C+'bait_legend']:{key:'legend',rare:1,legend:3}};
export const HAMMER={share:.25,shareHigh:.4,highLevel:30,cooldownMs:3000,reach:5,xp:4};
// what a repair uses: the gear's material (by id) -> the item spent
const MATERIAL=[[/netherite/,'minecraft:netherite_scrap'],[/diamond/,'minecraft:diamond'],[/golden|gold/,'minecraft:gold_ingot'],[/iron|chainmail|shears|flint_and_steel|shield/,'minecraft:iron_ingot'],
 [/stone/,'minecraft:cobblestone'],[/wooden|bow|fishing_rod|crossbow/,'minecraft:stick'],[/leather/,'minecraft:leather'],[/turtle/,'minecraft:turtle_scute'],[/trident/,'minecraft:prismarine_shard'],[/mace/,'minecraft:breeze_rod']];
export const repairMaterial=id=>MATERIAL.find(([re])=>re.test(id))?.[1]??'minecraft:iron_ingot';
/** How much a hammer blow repairs (durability points). */
export const repairAmount=(max,level)=>Math.max(1,Math.round(max*((level??1)>=HAMMER.highLevel?HAMMER.shareHigh:HAMMER.share)));
export const WHETSTONE={buff:'sharp',seconds:180,bonus:2};
export const KNIFE={chance:.5,meat:{'minecraft:cow':'minecraft:beef','minecraft:mooshroom':'minecraft:beef','minecraft:pig':'minecraft:porkchop','minecraft:chicken':'minecraft:chicken',
 'minecraft:sheep':'minecraft:mutton','minecraft:rabbit':'minecraft:rabbit','minecraft:hoglin':'minecraft:porkchop','minecraft:salmon':'minecraft:salmon','minecraft:cod':'minecraft:cod'}};
export const HERB={item:C+'herb_bundle',grass:.1,flower:.35,
 grassIds:/^minecraft:(short_grass|tall_grass|grass|fern|large_fern|tallgrass|double_plant)$/,
 flowerIds:/^minecraft:(dandelion|poppy|blue_orchid|allium|azure_bluet|\w+_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|torchflower|pink_petals|red_flower|yellow_flower)$/};
export const PIN={slots:3,key:'cooptown:pins',sel:'cooptown:pin_sel'};
export const LANTERN={effect:'night_vision',seconds:12};
export const PLANTER={sapling:w=>w==='crimson'||w==='warped'?`minecraft:${w}_fungus`:w==='mangrove'?'minecraft:mangrove_propagule':`minecraft:${w}_sapling`,
 soil:/^minecraft:(dirt|grass_block|grass|podzol|coarse_dirt|rooted_dirt|mud|moss_block|mycelium|crimson_nylium|warped_nylium|muddy_mangrove_roots)$/};
export const PEN={save:1};

// the bags (backpack-runtime.js): places, what goes in, how much slower food dates run inside (0.5: half);
// pages: the box shows PAGE_PLACES (26) at a time and its last place turns the page (asked 2026-10-30)
const FISH_IDS=new Set([...FISH_SPECIES.map(s=>s.id),'minecraft:cod','minecraft:salmon','minecraft:tropical_fish','minecraft:pufferfish','minecraft:cooked_cod','minecraft:cooked_salmon',C+'rare_fish']);
const VANILLA_POTIONS=new Set(['minecraft:potion','minecraft:splash_potion','minecraft:lingering_potion']);
export const BAGS={
 [C+'fish_basket']:{label:'魚籠',places:27,accepts:id=>FISH_IDS.has(id),slow:.5,refuse:'魚籠には魚だけ入れられます。'},
 [C+'fish_basket_mid']:{label:'中級者の魚籠',places:52,pages:2,accepts:id=>FISH_IDS.has(id),slow:.25,refuse:'魚籠には魚だけ入れられます。'},
 [C+'fish_basket_master']:{label:'名人の魚籠',places:78,pages:3,accepts:id=>FISH_IDS.has(id),slow:.1,refuse:'魚籠には魚だけ入れられます。'},
 [C+'cool_bag']:{label:'保冷バッグ',places:27,accepts:id=>!!SHELF[id],slow:.5,refuse:'保冷バッグには期限のある食べ物だけ入れられます。'},
 [C+'potion_holder']:{label:'試験管ホルダー',places:9,accepts:id=>!!potionById[id]||VANILLA_POTIONS.has(id),slow:0,refuse:'試験管ホルダーにはポーションだけ入れられます。'}};

/** Compass text from one point to another: 「北東 123m」 (Minecraft: -z is north, +x east). */
export function bearing(from,to){
 const dx=to.x-from.x,dz=to.z-from.z,dist=Math.round(Math.hypot(dx,dz));
 if(dist<2)return 'ここ';
 const deg=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;
 return `${['北','北東','東','南東','南','南西','西','北西'][Math.round(deg/45)%8]} ${dist}m`;
}
/** arrowTo in words, for the HUD log's font (it has no arrows): まっすぐ / 右ななめ前 / 右 / 右うしろ / うしろ ... */
export function turnWord(from,yaw,to){
 const a=arrowTo(from,yaw,to);return {'↑':'まっすぐ','↓':'うしろ','↗':'右ななめ前','→':'右','↘':'右うしろ','↖':'左ななめ前','←':'左','↙':'左うしろ'}[a]??'';
}
/** Which way to turn to face a point, from the player's yaw (Minecraft yaw: 0 south, 90 west): an arrow. */
export function arrowTo(from,yaw,to){
 const want=Math.atan2(-(to.x-from.x),to.z-from.z)*180/Math.PI;
 const d=((want-yaw)%360+540)%360-180; // -180..180, + is to the right
 return Math.abs(d)<22.5?'↑':Math.abs(d)>157.5?'↓':d>0?(d<67.5?'↗':d<112.5?'→':'↘'):(d>-67.5?'↖':d>-112.5?'←':'↙');
}

// workbench recipes (職業 tab)
const icon=id=>`textures/cooptown/items/${id.replace(C,'')}`;
const R=(id,inputs,n=1)=>({name:TOOLS[id].name,job:TOOLS[id].job,jobLevel:TOOLS[id].level>1?TOOLS[id].level:undefined,output:[id,n],inputs,icon:icon(id)});
export const TOOL_RECIPES=[
 R(C+'animal_brush',[['minecraft:stick',1],['minecraft:wheat',3],['minecraft:string',2]]),
 R(C+'animal_brush_gold',[[C+'animal_brush',1],['minecraft:gold_ingot',4]]),
 R(C+'bait_river',[['minecraft:wheat_seeds',8],['minecraft:bread',1]],8),
 R(C+'bait_sea',[['minecraft:kelp',4],['minecraft:spider_eye',1]],8),
 R(C+'bait_night',[['minecraft:rotten_flesh',4],['minecraft:glowstone_dust',1]],8),
 R(C+'bait_legend',[['minecraft:gold_nugget',4],['minecraft:prismarine_crystals',2],[C+'rare_fish',1]],2),
 R(C+'fish_basket',[['minecraft:bamboo',8],['minecraft:string',4]]),
 R(C+'fish_basket_mid',[['minecraft:bamboo',16],['minecraft:string',8],['minecraft:iron_ingot',2],['minecraft:ice',4]]),
 R(C+'fish_basket_master',[['minecraft:bamboo',16],['minecraft:string',8],['minecraft:gold_ingot',4],['minecraft:packed_ice',4],['minecraft:prismarine_crystals',4]]),
 // the better fishing rods (fishing-rods.js): a plain rod made into a tier after crafting (workbench-runtime.js)
 ...Object.entries(ROD_TIERS).map(([k,t])=>({name:t.name,job:'釣り師',jobLevel:t.level,output:['minecraft:fishing_rod',1],rodTier:k,inputs:ROD_INPUTS[k]})),
 R(C+'smith_hammer',[['minecraft:iron_ingot',5],['minecraft:stick',2]]),
 R(C+'whetstone',[['minecraft:flint',2],['minecraft:smooth_stone',1]],4),
 R(C+'cook_knife',[['minecraft:iron_ingot',2],['minecraft:stick',1]]),
 R(C+'cool_bag',[['minecraft:leather',4],['minecraft:white_wool',2],['minecraft:ice',2]]),
 R(C+'herb_knife',[['minecraft:iron_ingot',1],['minecraft:flint',1],['minecraft:stick',1]]),
 R(C+'potion_holder',[['minecraft:glass_bottle',3],['minecraft:stick',3],['minecraft:leather',2]]),
 R(C+'mana_lupe',[['minecraft:glass',1],['minecraft:gold_ingot',2],['minecraft:lapis_lazuli',2]]),
 R(C+'rune_pen',[['minecraft:feather',1],['minecraft:lapis_lazuli',4],['minecraft:gold_nugget',2]]),
 R(C+'map_pin',[['minecraft:paper',2],['minecraft:iron_nugget',3],['minecraft:redstone',1]]),
 R(C+'miner_lantern',[['minecraft:iron_ingot',4],['minecraft:torch',2],['minecraft:glass',1]]),
 R(C+'planting_bag',[['minecraft:leather',3],['minecraft:string',2],['minecraft:bone_meal',4]]),
 R(C+'bait_master',[[C+'bait_legend',4],[C+'deep_pearl',1],[C+'rare_fish',3]]),
 R(C+'master_hammer',[[C+'smith_hammer',1],[C+'forge_shard',8],['minecraft:netherite_ingot',1]]),
 R(C+'master_knife',[[C+'cook_knife',1],[C+'secret_spice',8],['minecraft:diamond',2]]),
 R(C+'master_herb_knife',[[C+'herb_knife',1],[C+'herb_bundle',32],['minecraft:diamond',2]]),
 R(C+'master_pen',[[C+'rune_pen',1],[C+'mana_dust',8],[C+'shining_crystal',2]]),
 R(C+'master_lantern',[[C+'miner_lantern',1],[C+'rare_ore',6],[C+'shining_crystal',2]])
].map(r=>{if(r.jobLevel===undefined)delete r.jobLevel;return r;});
