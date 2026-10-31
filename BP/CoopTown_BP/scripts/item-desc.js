import {world,system,BlockTypes} from '@minecraft/server';
import {hasInfo} from './food-lore.js';
import {potionById} from './potion-config.js';
import {priceText} from './sell-price.js';
import {qualityOf} from './quality.js';
import {stateOf,EXPIRED} from './freshness.js';

// Every item's description (asked 2026-10-25): a short explanation in its lore, between separators like the food lore.
// Foods, crops, fish and watering cans keep their own lore (food-lore.js); items another system wrote lore on (the
// smith's gear, recipe scrolls, rune books) are left as they are. Lines carry DESC_MARK so they can be told apart; a
// rank, date or maker line stays after them. Emeralds stay plain (villagers trade them).
// Text: the item's own entry (DESCS), else the first matching rule (RULES, by id), else none: what only repeats the
// item's name (階段, 剣, ...) is not written (2026-11-01), and lines from before go when an item is next looked at.
export const DESC_MARK='§r§9§r';
const M='minecraft:',C='cooptown:';
export const SKIP=new Set([M+'emerald',M+'written_book',M+'writable_book',M+'filled_map',M+'enchanted_book']);
export const DESCS={
 // ---- CoopTown ----
 [C+'guidebook']:'案内手帳。使うと職業・依頼・プロフィールなどのページを開ける。',[C+'guidebook_open']:'案内手帳。使うと職業・依頼・プロフィールなどのページを開ける。',
 [C+'admin_book']:'運営の手帳。運営メンバーが使うと管理画面を開く。',
 [C+'recipe_scroll']:'大釜の実験で見つかったレシピ。使うと醸造台で作れるようになる。',
 [C+'fine_wood']:'木こりが木を切ると、まれに見つかる上質な木材。特別なクラフトの材料。',
 [C+'ancient_sap']:'古い木からまれにとれる、とろりとした樹液。貴重な材料。',
 [C+'rare_ore']:'鉱夫が鉱石を掘ると、まれに見つかる珍しい鉱石。',
 [C+'shining_crystal']:'深い場所の鉱石からまれに出る、光る結晶。',
 [C+'golden_wheat']:'農家が作物を収穫すると、まれに見つかる黄金色の小麦。',
 [C+'mystic_seed']:'農家の収穫でごくまれに見つかる、不思議な種。',
 [C+'rare_fish']:'釣り師がまれに釣り上げる珍しい魚。貴重な材料。',
 [C+'deep_pearl']:'釣り師がごくまれに釣り上げる、深海の真珠。',
 [C+'forge_shard']:'鍛冶師が作業すると、まれに残る鍛造の欠片。',
 [C+'secret_spice']:'料理人が作業すると、まれに生まれる秘伝のスパイス。',
 [C+'mana_dust']:'付与術師が作業すると、まれに集まる魔力の粉。',
 [C+'timber_beam']:'板材から作る補強木材。街の協力作業や道具部品に使う。',
 [C+'refined_ingot']:'鉄と石炭から作る精製金属。街の協力作業や道具部品に使う。',
 [C+'tool_parts']:'補強木材と精製金属から作る道具部品。協力探索セットの材料。',
 [C+'herb_bundle']:'薬草をたばねたもの。街の協力作業に使う。',
 [C+'rune_charm']:'付与術師が作る支援の護符。協力探索セットの材料。',
 [C+'expedition_kit']:'みんなで探索に行くための道具一式。しゃがんで使うと、まわりの仲間と探索戦を始める。街の協力作業にも使う。',
 [C+'fish_oil']:'魚からとれる油。保存食や協力作業の材料。',
 [C+'trail_ration']:'探索に持っていく保存のきく食料。協力作業で使う。',
 [C+'frying_pan_1']:'料理人のフライパン。使うと中の具材をくるっとひっくり返す。殴ると少し痛い。',[C+'frying_pan_2']:'よく手入れされた上等なフライパン。使うと具材を高く返す。',[C+'frying_pan_3']:'名人の使うフライパン。返しも焼き色も一流。',
 [C+'cup']:'温かい飲み物を入れる共通カップ。飲み終わると戻ってくる。',
 // cooking materials (food-catalog.js kind material)
 [C+'rice']:'炊くとごはんになる穀物。',[C+'tomato']:'料理やソースに使う赤い野菜。',[C+'onion']:'炒めると甘くなる野菜。',[C+'cabbage']:'サラダやスープに使う葉野菜。',
 [C+'cucumber']:'みずみずしい夏の野菜。',[C+'corn']:'甘みのある穀物。焼いても煮てもおいしい。',[C+'lemon']:'すっぱい果物。料理や飲み物の香りづけに。',
 [C+'grape']:'ジュースやジャムになる果物。',[C+'strawberry']:'甘ずっぱい赤い果物。お菓子に使う。',[C+'tea_leaves']:'お茶をいれる葉。',[C+'coffee_beans']:'いるとコーヒーになる豆。',
 [C+'salt']:'料理の味を決める基本の調味料。',[C+'mint']:'すっきりした香りのハーブ。',[C+'black_pepper']:'ぴりっとした香辛料。',[C+'soybeans']:'豆腐やしょうゆの材料になる豆。',
 [C+'flour']:'小麦をひいた粉。パンやお菓子の材料。',[C+'bread_dough']:'焼くとパンになる生地。',[C+'fresh_noodles']:'ゆでて使う生の麺。',[C+'cooked_rice']:'炊きあがったごはん。料理の材料。',
 [C+'butter']:'ミルクから作るバター。料理にこくを出す。',[C+'cream']:'ミルクから作るクリーム。お菓子やスープに。',[C+'cheese']:'ミルクを固めたチーズ。',[C+'yogurt']:'ミルクを発酵させたヨーグルト。',
 [C+'cooking_oil']:'炒め物や揚げ物に使う油。',[C+'vinegar']:'すっぱい調味料。保存食や料理に。',[C+'soy_sauce']:'大豆から作る調味料。',[C+'tofu']:'大豆から作るやわらかい食材。',
 [C+'minced_meat']:'細かくした肉。ハンバーグなどの材料。',[C+'raw_sausage']:'焼く前のソーセージ。',[C+'vegetable_stock']:'野菜を煮出しただし。スープの土台。',
 [C+'tomato_sauce']:'トマトを煮詰めたソース。',[C+'cocoa_powder']:'カカオ豆から作る粉。お菓子や飲み物に。',[C+'gelatin']:'ゼリーを固める材料。',
 // ---- vanilla: materials ----
 [M+'stick']:'木の棒。道具や松明の材料。',[M+'string']:'クモからとれる糸。弓や羊毛の材料。',[M+'feather']:'ニワトリの羽根。矢の材料。',[M+'leather']:'牛などからとれる革。防具や本の材料。',
 [M+'bone']:'骨。骨粉にすると植物を早く育てられる。',[M+'bone_meal']:'植物にかけると早く育つ骨粉。',[M+'gunpowder']:'爆発物の材料になる火薬。',[M+'slime_ball']:'ねばねばのスライムボール。粘着ピストンの材料。',
 [M+'ender_pearl']:'投げるとその場所へ瞬間移動できる真珠。',[M+'ender_eye']:'投げると要塞の方向を教えてくれる目。',[M+'blaze_rod']:'ブレイズからとれる棒。醸造台の材料。',[M+'blaze_powder']:'醸造の燃料になる粉。',
 [M+'ghast_tear']:'ガストの涙。薬の材料。',[M+'spider_eye']:'クモの目。食べると毒になる。薬の材料。',[M+'fermented_spider_eye']:'発酵したクモの目。薬の効果を逆にする。',[M+'rotten_flesh']:'腐った肉。食べると空腹になりやすい。',
 [M+'paper']:'サトウキビから作る紙。本や地図の材料。',[M+'book']:'本。本棚やエンチャントに使う。',[M+'flint']:'砂利からとれる火打石。矢や火打石と打ち金の材料。',
 [M+'coal']:'燃料になる石炭。松明の材料にも。',[M+'charcoal']:'原木を焼いて作る木炭。燃料になる。',[M+'diamond']:'とても硬い宝石。最高級の道具や防具の材料。',
 [M+'lapis_lazuli']:'青い鉱石。エンチャントに使う。',[M+'redstone']:'信号を伝えるレッドストーンの粉。回路の材料。',[M+'quartz']:'ネザーでとれる白い水晶。',[M+'amethyst_shard']:'アメジストのかけら。望遠鏡などの材料。',
 [M+'glowstone_dust']:'光る粉。薬を強くする材料にも。',[M+'clay_ball']:'粘土の塊。焼くとレンガになる。',[M+'brick']:'粘土を焼いたレンガ。',[M+'nether_brick']:'ネザーラックを焼いたレンガ。',
 [M+'iron_ingot']:'鉄のインゴット。道具・防具・機械の基本素材。',[M+'gold_ingot']:'金のインゴット。',[M+'copper_ingot']:'銅のインゴット。ジョーロや避雷針の材料。',[M+'netherite_ingot']:'最強の素材。ダイヤ装備を強化できる。',
 [M+'netherite_scrap']:'古代の残骸を溶かしたかけら。ネザライトの材料。',[M+'ancient_debris']:'ネザーの奥深くに眠る、とても硬い残骸。',
 [M+'honeycomb']:'ハチの巣からとれるハニカム。ろうそくや銅のろう引きに。',[M+'ink_sac']:'イカの墨袋。黒い染料や本と羽ペンに。',[M+'glow_ink_sac']:'光るイカの墨袋。看板の文字を光らせる。',
 [M+'nautilus_shell']:'オウムガイの殻。コンジットの材料。',[M+'heart_of_the_sea']:'海の心。コンジットの材料になる宝物。',[M+'prismarine_shard']:'海底神殿の石のかけら。',[M+'prismarine_crystals']:'光るプリズマリンの結晶。',
 [M+'phantom_membrane']:'ファントムの皮膜。エリトラの修理や薬に。',[M+'rabbit_hide']:'ウサギの皮。4つで革になる。',[M+'rabbit_foot']:'幸運のウサギの足。薬の材料。',[M+'shulker_shell']:'シュルカーの殻。シュルカーボックスの材料。',
 [M+'nether_star']:'ウィザーを倒すと手に入る星。ビーコンの材料。',[M+'dragon_breath']:'ドラゴンの息。残留ポーションの材料。',[M+'echo_shard']:'古代都市で見つかる残響のかけら。',[M+'breeze_rod']:'ブリーズからとれる棒。風の材料。',
 [M+'turtle_scute']:'カメの甲羅のかけら。',[M+'scute']:'カメの甲羅のかけら。',[M+'armadillo_scute']:'アルマジロのうろこ。オオカミの鎧の材料。',[M+'wind_charge']:'投げると突風を起こす風の塊。',
 [M+'experience_bottle']:'割ると経験値が出るびん。',[M+'snowball']:'投げて遊べる雪玉。',[M+'egg']:'ニワトリの卵。料理の材料。投げるとたまにヒヨコが出る。',[M+'sugar']:'サトウキビから作る砂糖。お菓子の材料。',
 [M+'wheat_seeds']:'畑に植えると小麦が育つ種。',[M+'beetroot_seeds']:'畑に植えるとビートルートが育つ種。',[M+'melon_seeds']:'植えるとスイカが実る種。',[M+'pumpkin_seeds']:'植えるとカボチャが実る種。',
 [M+'torchflower_seeds']:'植えるとトーチフラワーが咲く種。',[M+'pitcher_pod']:'植えるとウツボカズラが育つさや。',[M+'cocoa_beans']:'ジャングルの木に植えられる豆。',
 [M+'kelp']:'海に生える昆布。乾燥させると食べられる。',[M+'bamboo']:'すぐ伸びる竹。足場の材料。',[M+'cactus']:'砂の上で育つサボテン。触ると痛い。',[M+'vine']:'壁を登れるツタ。',[M+'lily_pad']:'水に浮かぶスイレンの葉。上を歩ける。',
 [M+'glow_berries']:'洞窟のツタに実る光る実。',[M+'chorus_fruit']:'食べるとまわりにワープする果実。',[M+'popped_chorus_fruit']:'焼いたコーラスフルーツ。エンドロッドの材料。',
 [M+'beef']:'生の牛肉。焼くとステーキになる。',[M+'porkchop']:'生の豚肉。焼くとおいしくなる。',[M+'chicken']:'生の鶏肉。焼かずに食べると食中毒に注意。',[M+'mutton']:'生の羊肉。焼くとおいしくなる。',[M+'rabbit']:'生のウサギ肉。焼くとおいしくなる。',
 [M+'poisonous_potato']:'緑がかった毒のあるジャガイモ。',[M+'golden_carrot']:'金で包んだニンジン。とても栄養がある。',[M+'golden_apple']:'金のリンゴ。食べると体を守る効果がつく。',[M+'enchanted_golden_apple']:'魔法の金のリンゴ。とても強い効果がつく。',
 // ---- tools and gear ----
 [M+'bow']:'矢を遠くへ飛ばす弓。',[M+'crossbow']:'矢を強く撃てるクロスボウ。',[M+'arrow']:'弓やクロスボウで撃つ矢。',[M+'trident']:'投げても戦える三叉槍。',[M+'shield']:'攻撃を防げる盾。',[M+'mace']:'高い所から振り下ろすほど強いメイス。',
 [M+'fishing_rod']:'魚を釣る釣り竿。',[M+'shears']:'羊毛を刈ったり葉を集めたりするハサミ。',[M+'flint_and_steel']:'火をつける道具。',[M+'brush']:'怪しい砂を掃いて遺物を掘り出すブラシ。',
 [M+'compass']:'スポーン地点の方向を指す。',[M+'recovery_compass']:'最後に倒れた場所を指すコンパス。',[M+'clock']:'今の時間がわかる時計。',[M+'spyglass']:'遠くを拡大して見られる望遠鏡。',[M+'map']:'使うとまわりの地図になる。',[M+'empty_map']:'使うとまわりの地図になる。',
 [M+'bucket']:'水や溶岩、ミルクをくめるバケツ。',[M+'water_bucket']:'水の入ったバケツ。置くと水が出る。',[M+'lava_bucket']:'溶岩の入ったバケツ。燃料にもなる。',[M+'milk_bucket']:'ミルク。飲むと効果が全部消える。',[M+'powder_snow_bucket']:'粉雪の入ったバケツ。',
 [M+'elytra']:'背中につけて空を滑空できる羽。',[M+'totem_of_undying']:'持っていると一度だけ倒れずにすむお守り。',[M+'saddle']:'ブタやウマに乗るための鞍。',[M+'lead']:'動物をつないで連れて歩けるリード。',[M+'name_tag']:'生き物に名前をつけられる名札。',
 [M+'carrot_on_a_stick']:'ブタに乗って操るための道具。',[M+'warped_fungus_on_a_stick']:'ストライダーを操るための道具。',[M+'goat_horn']:'吹くと遠くまで響く角笛。',[M+'trial_key']:'試練の間の宝箱を開ける鍵。',[M+'ominous_trial_key']:'不吉な宝箱を開ける鍵。',
 [M+'firework_rocket']:'打ち上げ花火。エリトラの加速にも。',[M+'firework_star']:'花火の色や形を決める星。',[M+'turtle_helmet']:'水中で少し長く息ができるカメの甲羅。',[M+'wolf_armor']:'オオカミに着せる鎧。',
 // ---- blocks with a use ----
 [M+'crafting_table']:'作業台。職業ごとのクラフト画面を開く。',[M+'furnace']:'鉱石を溶かしたり食べ物を焼いたりするかまど。',[M+'blast_furnace']:'鉱石を早く溶かす溶鉱炉。',[M+'smoker']:'食べ物を早く焼く燻製器。',
 [M+'chest']:'物をしまえるチェスト。置いた人だけが開けられる（鍵）。',[M+'trapped_chest']:'開けると信号を出すチェスト。',[M+'barrel']:'物をしまえる樽。置いた人だけが開けられる（鍵）。',[M+'ender_chest']:'どこからでも同じ中身にアクセスできるチェスト。',
 [M+'hopper']:'アイテムを吸い込んで隣へ送る装置。',[M+'torch']:'まわりを明るくする松明。',[M+'soul_torch']:'青い炎の松明。',[M+'lantern']:'つるしたり置いたりできるランタン。',[M+'soul_lantern']:'青い炎のランタン。',
 [M+'campfire']:'焚き火。料理人の調理場になる。',[M+'soul_campfire']:'青い炎の焚き火。',[M+'anvil']:'金床。鍛冶師が装備を作ったり直したりする。',[M+'enchanting_table']:'エンチャント台。付与術師が装備に力を込める。',
 [M+'brewing_stand']:'醸造台。調合師が薬を作る。',[M+'cauldron']:'大釜。調合の実験に使う。',[M+'composter']:'コンポスター。植物を入れると骨粉になる。',[M+'grindstone']:'装備を直したりエンチャントを外したりする砥石。',
 [M+'stonecutter']:'石を階段やハーフに切り出す石切台。',[M+'loom']:'旗に模様をつける機織り機。',[M+'cartography_table']:'地図を作ったり広げたりする製図台。',[M+'smithing_table']:'装備を強化する鍛冶台。',[M+'fletching_table']:'矢師の作業台。',
 [M+'lectern']:'本を置いてみんなで読める書見台。',[M+'bell']:'鳴らすと村人が家に戻る鐘。',[M+'jukebox']:'レコードを流すジュークボックス。',[M+'note_block']:'たたくと音が鳴る音ブロック。',[M+'beacon']:'まわりのプレイヤーに効果を与えるビーコン。',
 [M+'bookshelf']:'本棚。エンチャント台のまわりに置くと強くなる。',[M+'chiseled_bookshelf']:'本を1冊ずつしまえる本棚。',[M+'hay_block']:'干し草の俵。農家が使うと飼育台になる。',[M+'scaffolding']:'登り降りできる足場。',[M+'ladder']:'壁につけて登れるはしご。',
 [M+'rail']:'トロッコを走らせるレール。',[M+'powered_rail']:'信号でトロッコを加速させるレール。',[M+'detector_rail']:'トロッコが通ると信号を出すレール。',[M+'activator_rail']:'トロッコに信号を送るレール。',
 [M+'redstone_torch']:'信号を出し続ける松明。',[M+'repeater']:'信号を遅らせたり延ばしたりする。',[M+'comparator']:'信号を比べたり容器の中身を測ったりする。',[M+'piston']:'ブロックを押し出すピストン。',[M+'sticky_piston']:'ブロックを押して引き戻せるピストン。',
 [M+'observer']:'目の前の変化を見つけて信号を出す。',[M+'dispenser']:'信号でアイテムを撃ち出す。',[M+'dropper']:'信号でアイテムを落とす。',[M+'lever']:'信号をオンオフできるレバー。',[M+'tnt']:'火をつけると爆発する。',
 [M+'daylight_detector']:'日の光で信号を出す。',[M+'target']:'当たると信号を出す的。',[M+'tripwire_hook']:'糸と組み合わせる仕掛け。',[M+'crafter']:'信号で自動クラフトする装置。',[M+'lightning_rod']:'雷を引き寄せる避雷針。',
 [M+'item_frame']:'アイテムを飾れる額縁。',[M+'glow_item_frame']:'光る額縁。',[M+'painting']:'壁に飾る絵画。',[M+'armor_stand']:'防具を飾れる防具立て。',[M+'flower_pot']:'花を植えて飾る植木鉢。',[M+'decorated_pot']:'模様のついた飾り壺。',
 [M+'bowl']:'スープを入れるボウル。',[M+'glass_bottle']:'水や薬を入れるびん。',[M+'respawn_anchor']:'ネザーでスポーン地点を決めるアンカー。',[M+'lodestone']:'コンパスの向く先を決める磁石。',[M+'conduit']:'水中で力を与えるコンジット。',
 [M+'end_crystal']:'エンダードラゴンを回復させる結晶。',[M+'dragon_egg']:'エンダードラゴンの卵。',[M+'sponge']:'水を吸いとるスポンジ。',[M+'wet_sponge']:'水を吸ったスポンジ。かまどで乾かせる。',[M+'web']:'動きを遅くするクモの巣。',
 [M+'slime']:'跳ねるスライムブロック。',[M+'honey_block']:'くっつくハチミツブロック。',[M+'cobweb']:'動きを遅くするクモの巣。',[M+'chain']:'つるして飾れる鎖。',[M+'iron_bars']:'窓や檻に使う鉄格子。',
 [M+'sculk_sensor']:'音や振動を感じて信号を出す。',[M+'sculk_catalyst']:'近くで生き物が倒れるとスカルクを広げる。',[M+'sculk_shrieker']:'近づくとウォーデンを呼ぶことがある。',[M+'spawner']:'モンスターが出てくるスポナー。',[M+'trial_spawner']:'試練の間のスポナー。',
 [M+'vault']:'試練の鍵で開ける宝箱。',[M+'heavy_core']:'メイスの材料になる重い核。',[M+'ominous_bottle']:'飲むと不吉な予感がつくびん。',
 // ---- natural blocks ----
 [M+'dirt']:'土。木や草が育つ。',[M+'grass_block']:'草の生えた土。',[M+'coarse_dirt']:'草が生えない粗い土。',[M+'podzol']:'森に多い土。',[M+'mycelium']:'キノコが育ちやすい菌糸の土。',[M+'farmland']:'耕した畑の土。',
 [M+'mud']:'水分を含んだ泥。',[M+'packed_mud']:'泥を固めたブロック。',[M+'moss_block']:'コケのブロック。',[M+'clay']:'粘土ブロック。崩すと粘土玉になる。',[M+'sand']:'砂。焼くとガラスになる。',[M+'red_sand']:'赤い砂。',[M+'gravel']:'砂利。火打石がとれることがある。',
 [M+'cobblestone']:'丸石。かまどや石の道具の材料。',[M+'stone']:'石。焼いた丸石からも作れる。',[M+'obsidian']:'とても硬い黒曜石。ネザーゲートの材料。',[M+'crying_obsidian']:'泣く黒曜石。リスポーンアンカーの材料。',
 [M+'netherrack']:'ネザーの赤い石。',[M+'soul_sand']:'上を歩くと遅くなる砂。',[M+'soul_soil']:'魂の土。',[M+'glowstone']:'光るブロック。',[M+'magma_block']:'上に立つと熱いブロック。',[M+'end_stone']:'エンドの石。',
 [M+'ice']:'氷。滑りやすい。',[M+'packed_ice']:'溶けない氷。',[M+'blue_ice']:'とても滑る青い氷。',[M+'snow']:'積もった雪。',[M+'snow_block']:'雪のブロック。',[M+'sculk']:'古代都市に広がるスカルク。',
 [M+'pumpkin']:'カボチャ。くり抜くとかぶれる。',[M+'carved_pumpkin']:'顔を彫ったカボチャ。',[M+'jack_o_lantern']:'光るジャック・オ・ランタン。',[M+'melon_block']:'スイカ。割るとスイカの薄切りになる。',
 [M+'dried_kelp']:'乾燥させた昆布。すぐ食べられる。',[M+'cake']:'置いてみんなで食べられるケーキ。',[M+'short_grass']:'草。種がとれることがある。',[M+'fern']:'シダ。',
 [M+'glistering_melon_slice']:'金で包んだスイカ。回復の薬の材料。',[M+'magma_cream']:'マグマクリーム。耐火の薬の材料。',[M+'golden_rail']:'信号でトロッコを加速させるレール。',
 [M+'amethyst_cluster']:'育ちきったアメジストの結晶。',[M+'frame']:'アイテムを飾れる額縁。',[M+'sapling']:'植えると木に育つ苗木。',[M+'dried_kelp_block']:'乾燥昆布のブロック。燃料になる。'
};
// [pattern on the id without "minecraft:", text]; the first match wins
export const RULES=[
 [/_pickaxe$/,'石や鉱石を掘るツルハシ。素材が良いほど硬いものを掘れる。'],[/_hoe$/,'土を耕して畑にするクワ。'],
 [/_smithing_template$/,'鍛冶台で装備を強化したり飾ったりするテンプレート。'],[/^music_disc_/,'ジュークボックスで流せるレコード。'],[/^disc_fragment/,'集めるとレコードになるかけら。'],[/_pottery_sherd$/,'模様のついた土器のかけら。飾り壺の材料。'],
 [/_spawn_egg$/,'使うと生き物が出てくる卵。'],
 [/^(splash_|lingering_)?potion$/,'飲む（投げる）と効果が出るポーション。'],[/^tipped_arrow$/,'当たると効果を与える矢。'],[/_bucket$/,'生き物の入ったバケツ。置くと水と一緒に出てくる。'],
 [/^raw_/,'溶かすとインゴットになる原石。'],[/_nugget$/,'金属の小さな粒。9個でインゴットになる。'],[/_ore$/,'鉱石。ツルハシで掘ると素材がとれる。'],
 [/^(iron|gold|diamond|emerald|lapis|redstone|coal|copper|netherite|raw_iron|raw_gold|raw_copper|amethyst)_block$/,'素材をまとめたブロック。'],
 [/^(exposed_|weathered_|oxidized_|waxed_)/,'銅のブロック。時間がたつと色が変わる（ろう引きで止まる）。'],[/copper(?!.*(ingot|sword|axe|shovel|hoe|helmet|chestplate|leggings|boots|armor|spear|nautilus))/,'銅のブロック。時間がたつと色が変わる。'],
 [/_shulker_box$|^shulker_box$|^undyed_shulker_box$/,'中身を入れたまま運べる箱。'],[/(^|_)bed$/,'寝ると夜を飛ばせるベッド。スポーン地点にもなる。'],[/_banner$/,'模様をつけられる旗。'],[/_banner_pattern$/,'旗に模様をつける型紙。'],
 [/_candle$|^candle$/,'火をつけると明かりになるロウソク。'],
 [/_concrete_powder$/,'水に触れると固まってコンクリートになる粉。'],
 [/_pressure_plate$/,'上に乗ると信号を出す感圧板。'],[/_button$/,'押すと少しの間信号を出すボタン。'],
 [/_log$|_wood$|_stem$|_hyphae$/,'木の幹。板材の材料になる。'],[/_leaves$/,'木の葉。苗木がとれることがある。'],
 [/_sapling$|_propagule$/,'植えると木に育つ苗木。'],[/_mushroom$/,'キノコ。シチューの材料。'],[/_head$|_skull$/,'頭の飾り。かぶることもできる。'],
 [/(^|_)(tulip|poppy|dandelion|orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|torchflower|pitcher_plant|pink_petals|flower)/,'花。染料の材料になる。'],
];
const wrap=(text,width=18)=>text.split(/(?<=[、。])/).filter(Boolean).flatMap(part=>{const out=[];for(let i=0;i<part.length;i+=width)out.push(part.slice(i,i+width));return out;});
const widthOf=t=>[...String(t).replace(/§./g,'')].reduce((w,ch)=>w+(ch.charCodeAt(0)<0x100?.5:1),0);
/** The explanation of an item id (isBlock: whether the id is a block, for the last fallback). */
export function describeItem(id,isBlock=false){
 if(DESCS[id])return DESCS[id];
 const p=potionById[id];if(p)return `調合師が醸造台で作る薬。効果：${p.desc}`;
 if(/^minecraft:/.test(id)){const short=id.slice(10);for(const [re,text] of RULES)if(re.test(short))return text;}
 if(/^cooptown:backpack_/.test(id))return 'リュック。使うと中に物をしまえる、持ち歩ける収納。';
 return ''; // nothing worth saying: no description (2026-11-01; was 建築や飾りに使えるブロック / 冒険や作業に使えるアイテム)
}
// lines kept after the description: a rank, a date, the maker
const KEEP=l=>l.includes('品質：')||/期限/.test(l)||/作成者|作った人|釣った人/.test(l);
const mine=l=>l.startsWith(DESC_MARK);
/** The lore an item should have (lore: its lore now), or undefined to leave it (another system's lore). */
const descriptionTemplates=new Map();
function descriptionTemplate(id,isBlock){
 const key=id+'|'+isBlock;if(descriptionTemplates.has(key))return descriptionTemplates.get(key);
 const desc=wrap(describeItem(id,isBlock)).map(l=>'§7'+l),sep='§8'+'ー'.repeat(Math.max(6,Math.ceil(Math.max(...desc.map(widthOf)))));
 const result={desc,sep};if(descriptionTemplates.size>=4096)descriptionTemplates.clear();descriptionTemplates.set(key,result);return result;
}
export function descLore(id,lore,isBlock=false,price=''){
 if(SKIP.has(id)||hasInfo(id))return undefined;
 const foreign=lore.filter(l=>!mine(l)&&!KEEP(l));
 if(foreign.length&&!lore.some(mine))return undefined; // gear, scrolls, rune books: theirs
 const {desc,sep}=descriptionTemplate(id,isBlock),m=l=>DESC_MARK+l;
 if(!desc.length)return [...(price?[m(price)]:[]),...lore.filter(KEEP),...foreign].slice(0,20); // no text: no separators either
 return [m(sep),...desc.map(m),...(price?[m(price)]:[]),m(sep),...lore.filter(KEEP),...foreign].slice(0,20); // price: the selling price (sell-price.js)
}
// a plain item (asked when trading, delivering, crafting): its lore is only descriptions (these, the food / crop
// info lines of food-lore.js, rank D, a plain fish's ランク：ふつう), no name, no enchantment, not worn
const PLAIN_LINE=l=>{const t=l.replace(/§./g,'');return l.startsWith(DESC_MARK)||l.startsWith('§r§r')||t==='品質：D'||t==='ランク：ふつう';};
/** True when an item counts as just its kind (the description lore does not make it special). */
/** Whether a stack can be handed in for a request (2026-10-30: descriptions, ranks and dates no longer stop it): not
 *  renamed, enchanted, worn or past its date, and of rank minRank or better (quality.js TIERS: 0 D ... 4 S). */
export function deliverable(s,minRank=0){
 if(!s)return false;
 try{if(s.nameTag)return false;}catch{}
 try{const en=s.getComponent('minecraft:enchantable');if(en&&en.getEnchantments().length)return false;}catch{}
 try{const d=s.getComponent('minecraft:durability');if(d&&d.damage>0)return false;}catch{}
 try{if(stateOf(s)===EXPIRED)return false;}catch{}
 let r=0;try{r=qualityOf(s)??0;}catch{}
 return r>=minRank;
}
export function isPlainItem(s){
 if(!s)return false;
 try{if(s.nameTag)return false;}catch{}
 let lore=[];try{lore=s.getLore()??[];}catch{}
 if(!lore.every(PLAIN_LINE))return false;
 try{const en=s.getComponent('minecraft:enchantable');if(en&&en.getEnchantments().length)return false;}catch{}
 try{const d=s.getComponent('minecraft:durability');if(d&&d.damage>0)return false;}catch{}
 try{if(s.getDynamicPropertyIds?.().length)return false;}catch{} // a backpack's contents and the like
 return true;
}
const blockKinds=new Map();
const isBlockId=id=>{if(blockKinds.has(id))return blockKinds.get(id);let result=false;try{result=!!BlockTypes.get(id);}catch{}if(blockKinds.size>=4096)blockKinds.clear();blockKinds.set(id,result);return result;};
/** Writes the description on an item; true when its lore changed. */
export function ensureDesc(item){
 if(SKIP.has(item.typeId)||hasInfo(item.typeId))return false;
 let lore=[];try{lore=item.getLore()??[];}catch{return false;}
 if(lore.some(l=>!mine(l)&&!KEEP(l))&&!lore.some(mine))return false;
 let price='';try{price=priceText(item);}catch{}
 const out=descLore(item.typeId,lore,isBlockId(item.typeId),price);
 if(!out||(out.length===lore.length&&out.every((l,i)=>l===lore[i])))return false;
 try{item.setLore(out);}catch{return false;}
 return true;
}
/** Moves each changed slot's stack onto equal stacks with room (items picked up plain land in a new slot first,
 *  then their lore makes them equal to the stack they belong to). */
export function joinStacks(inv,changed){
 for(const i of changed){
  const s=inv.getItem(i);if(!s||s.maxAmount<=1)continue;
  for(let j=0;j<inv.size;j++){
   if(j===i)continue;const t=inv.getItem(j);
   if(!t||t.amount>=t.maxAmount||!t.isStackableWith(s))continue;
   const move=Math.min(s.amount,t.maxAmount-t.amount),rest=s.amount-move;t.amount+=move;
   try{inv.setItem(j,t);if(rest>0){s.amount=rest;inv.setItem(i,s);}else inv.setItem(i,undefined);}catch{}
   if(rest<=0)break;
  }
 }
}
// Bound inventory work per tick rather than scanning every player's full inventory at once.
export function installItemDesc(){
 const progress=new Map();let players=[],cursor=0,nextRefresh=0;
 system.runInterval(()=>{
  const tick=system.currentTick;
  if(tick>=nextRefresh){players=world.getAllPlayers();cursor=players.length?cursor%players.length:0;nextRefresh=tick+20;}
  const count=Math.min(2,players.length);
  for(let n=0;n<count;n++){
   const player=players[cursor++%players.length];if(!player?.isValid)continue;
   let state=progress.get(player.id);if(!state){state={slot:0,ready:0};progress.set(player.id,state);}
   if(tick<state.ready)continue;
   let inv;try{inv=player.getComponent('minecraft:inventory')?.container;}catch{}if(!inv)continue;
   const changed=[],end=Math.min(inv.size,state.slot+12);
   for(let i=state.slot;i<end;i++){try{const stack=inv.getItem(i);if(stack&&ensureDesc(stack)){inv.setItem(i,stack);changed.push(i);}}catch{}}
   if(changed.length)try{joinStacks(inv,changed);}catch{}
   state.slot=end;
   if(end>=inv.size){state.slot=0;state.ready=tick+20;}
  }
 },1);
 world.afterEvents.playerLeave.subscribe(({playerId})=>progress.delete(playerId));
}
