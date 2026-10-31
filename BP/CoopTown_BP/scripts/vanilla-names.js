// Japanese names for vanilla items that the other tables (game-config.js ITEM_NAMES) leave out, so a shop or a list
// never shows a bare id (asked 2026-10-28: よろず屋 showed "anvil"). Names follow the game's own Japanese. Lowest
// priority: any name set elsewhere wins.
const M='minecraft:';
const WOODS={oak:'オーク',spruce:'トウヒ',birch:'シラカバ',jungle:'ジャングル',acacia:'アカシア',dark_oak:'ダークオーク',mangrove:'マングローブ',
 cherry:'サクラ',pale_oak:'ペールオーク',bamboo:'竹',crimson:'真紅',warped:'歪んだ'};
const WOOD_PARTS={stairs:'の階段',slab:'のハーフブロック',fence:'のフェンス',fence_gate:'のフェンスゲート',door:'のドア',trapdoor:'のトラップドア',sign:'の看板',boat:'のボート'};
const COLORS={white:'白色',orange:'橙色',magenta:'赤紫色',light_blue:'空色',yellow:'黄色',lime:'黄緑色',pink:'桃色',gray:'灰色',light_gray:'薄灰色',
 cyan:'青緑色',purple:'紫色',blue:'青色',brown:'茶色',green:'緑色',red:'赤色',black:'黒色'};
const TIERS={wooden:'木',stone:'石',iron:'鉄',golden:'金',diamond:'ダイヤモンド',netherite:'ネザライト'};
const TOOLS={pickaxe:'のツルハシ',axe:'の斧',shovel:'のシャベル',hoe:'のクワ',sword:'の剣'};
const ARMOR_TIERS={leather:'革',chainmail:'チェーン',iron:'鉄',golden:'金',diamond:'ダイヤモンド',netherite:'ネザライト'};
const ARMOR={helmet:'のヘルメット',chestplate:'のチェストプレート',leggings:'のレギンス',boots:'のブーツ'};
const ARMOR_LEATHER={helmet:'の帽子',chestplate:'の上着',leggings:'のズボン',boots:'のブーツ'};
const names={};
for(const [w,n] of Object.entries(WOODS)){
 for(const [p,s] of Object.entries(WOOD_PARTS))names[`${w}_${p}`]=n+s;
 names[`${w}_log`]=n+'の原木';names[`${w}_planks`]=n+'の板材';names[`${w}_sapling`]=n+'の苗木';
}
Object.assign(names,{crimson_stem:'真紅の幹',warped_stem:'歪んだ幹',bamboo_raft:'竹のいかだ',bamboo_boat:'竹のいかだ',fence_gate:'オークのフェンスゲート',
 wooden_door:'オークのドア',trapdoor:'オークのトラップドア',crimson_boat:undefined,warped_boat:undefined});
for(const [c,n] of Object.entries(COLORS)){names[c+'_wool']=n+'の羊毛';names[c+'_dye']=n+'の染料';names[c+'_bed']=n+'のベッド';names[c+'_carpet']=n+'のカーペット';}
for(const [t,n] of Object.entries(TIERS))for(const [k,s] of Object.entries(TOOLS))names[`${t}_${k}`]=n+s;
for(const [t,n] of Object.entries(ARMOR_TIERS))for(const [k,s] of Object.entries(t==='leather'?ARMOR_LEATHER:ARMOR))names[`${t}_${k}`]=n+s;
Object.assign(names,{
 anvil:'金床',arrow:'矢',bookshelf:'本棚',experience_bottle:'エンチャントの瓶',fishing_rod:'釣り竿',shears:'ハサミ',shield:'盾',
 crafting_table:'作業台',rail:'レール',golden_rail:'パワードレール',minecart:'トロッコ',compass:'コンパス',clock:'時計',
 carrots:'ニンジン',potatoes:'ジャガイモ',cocoa:'カカオ豆',sweet_berry_bush:'スイートベリー',cave_vines_body_with_berries:'光るベリー',cave_vines_head_with_berries:'光るベリー',
 dandelion:'タンポポ',yellow_flower:'タンポポ',red_flower:'ポピー',poppy:'ポピー',blue_orchid:'ヒスイラン',allium:'アリウム',azure_bluet:'ヒナソウ',
 red_tulip:'赤色のチューリップ',orange_tulip:'橙色のチューリップ',white_tulip:'白色のチューリップ',pink_tulip:'桃色のチューリップ',oxeye_daisy:'フランスギク',
 cornflower:'ヤグルマギク',lily_of_the_valley:'スズラン',torchflower:'トーチフラワー',pink_petals:'ピンクの花びら',sunflower:'ヒマワリ',lilac:'ライラック',
 rose_bush:'バラの低木',peony:'ボタン',crimson_fungus:'真紅のキノコ',warped_fungus:'歪んだキノコ',sapling:'オークの苗木',mangrove_propagule:'マングローブの胎生種子',
 amethyst_cluster:'アメジストの塊',amethyst_shard:'アメジストの欠片',deepslate:'深層岩',cobbled_deepslate:'深層岩の丸石',granite:'花崗岩',diorite:'閃緑岩',
 andesite:'安山岩',tuff:'凝灰岩',calcite:'方解石',blackstone:'ブラックストーン',end_stone:'エンドストーン',netherrack:'ネザーラック',
 dirt:'土',grass_block:'草ブロック',sand:'砂',red_sand:'赤い砂',gravel:'砂利',clay_ball:'粘土玉',clay:'粘土',snowball:'雪玉',fern:'シダ',
 poisonous_potato:'青くなったジャガイモ',bone:'骨',ender_pearl:'エンダーパール',slime_ball:'スライムボール',rabbit_hide:'ウサギの皮',
 ink_sac:'イカスミ',glow_ink_sac:'輝くイカスミ',tropical_fish:'熱帯魚',nautilus_shell:'オウムガイの殻',saddle:'サドル',lead:'リード',
 honeycomb:'ハニカム',honey_bottle:'ハチミツ入りの瓶',mushroom_stew:'キノコシチュー',beetroot_soup:'ビートルートスープ',rabbit_stew:'ウサギシチュー',
 totem_of_undying:'不死のトーテム',golden_apple:'金のリンゴ',enchanted_golden_apple:'エンチャントされた金のリンゴ',
 smithing_table:'鍛冶台',cauldron:'大釜',iron_bars:'鉄格子',iron_door:'鉄のドア',iron_trapdoor:'鉄のトラップドア',hopper:'ホッパー',
 piston:'ピストン',sticky_piston:'粘着ピストン',dispenser:'ディスペンサー',dropper:'ドロッパー',observer:'オブザーバー',repeater:'レッドストーンリピーター',
 comparator:'レッドストーンコンパレーター',blast_furnace:'溶鉱炉',barrel:'樽',cartography_table:'製図台',composter:'コンポスター',smoker:'燻製器',
 brewing_stand:'醸造台',enchanting_table:'エンチャントテーブル',bed:'ベッド',ladder:'はしご',campfire:'焚き火',soul_campfire:'魂の焚き火',
 stonecutter_block:'石切台',stonecutter:'石切台',frame:'額縁',glow_frame:'輝く額縁',armor_stand:'防具立て',stone_stairs:'丸石の階段',
 cobblestone_slab:'丸石のハーフブロック',cobblestone_wall:'丸石の塀',glass_pane:'板ガラス',gold_block:'金ブロック',diamond_block:'ダイヤモンドブロック',
 coal_block:'石炭ブロック',melon_block:'スイカ',emerald_block:'エメラルドブロック',iron_block:'鉄ブロック',lapis_block:'ラピスラズリブロック',
 redstone_block:'レッドストーンブロック',copper_block:'銅ブロック',chest:'チェスト',trapped_chest:'トラップチェスト',ender_chest:'エンダーチェスト',
 furnace:'かまど',torch:'松明',lantern:'ランタン',soul_lantern:'魂のランタン',bucket:'バケツ',water_bucket:'水入りバケツ',lava_bucket:'溶岩入りバケツ',
 milk_bucket:'牛乳入りバケツ',bow:'弓',crossbow:'クロスボウ',trident:'トライデント',spyglass:'望遠鏡',brush:'ブラシ',flint_and_steel:'火打石と打ち金',
 name_tag:'名札',book:'本',writable_book:'本と羽根ペン',map:'白紙の地図',empty_map:'白紙の地図',paper:'紙',feather:'羽根',string:'糸',
 leather:'革',gunpowder:'火薬',glass_bottle:'ガラス瓶',elytra:'エリトラ',firework_rocket:'ロケット花火',cake:'ケーキ',bread:'パン',
 cookie:'クッキー',pumpkin_pie:'パンプキンパイ',golden_carrot:'金のニンジン',glistering_melon_slice:'きらめくスイカの薄切り',
 chorus_fruit:'コーラスフルーツ',prismarine_shard:'プリズマリンの欠片',iron_nugget:'鉄塊',gold_nugget:'金塊',glow_berries:'光るベリー',
 sweet_berries:'スイートベリー',phantom_membrane:'ファントムの皮膜',magma_cream:'マグマクリーム',fermented_spider_eye:'発酵したクモの目',
 spider_eye:'クモの目',ghast_tear:'ガストの涙',blaze_rod:'ブレイズロッド',blaze_powder:'ブレイズパウダー',rabbit_foot:'ウサギの足',
 armadillo_scute:'アルマジロのウロコ',turtle_scute:'カメのウロコ',breeze_rod:'ブリーズロッド',heart_of_the_sea:'海洋の心',
 nether_star:'ネザースター',echo_shard:'残響の欠片',disc_fragment_5:'ディスクの破片'});
export const VANILLA_NAMES=Object.fromEntries(Object.entries(names).filter(([,v])=>v).map(([k,v])=>[M+k,v]));
