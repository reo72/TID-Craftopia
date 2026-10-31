// The magic commands of 刻印言語 (Notion「刻印エンチャント50案」): what each takes, where it works, and what it costs.
// who: the entity its first argument must be (target / self / ally; none: no entity argument). args: the argument
// types after it. max: the largest value of each of those (the table's maximum; a bigger one is refused). only:
// allowed strings. events: where it can be written. cooldown: the lowest rune cooldown (s) it allows; it is also
// shared per player across runes (rune-effects.js). points: its score (the table's price; the first four keep
// their v0.1 formula). part: the armor piece the rune must go on (head / chest / legs / feet).
// The effects themselves are in rune-effects.js; runescript.js only checks and runs the code.
const C=(who,args,max,events,cooldown,points,label,extra={})=>({who,args,max,events,cooldown,points:typeof points==='number'?()=>points:points,label,...extra});
const N='Number',D='Duration',S='String';
export const COUNT_ITEMS=['minecraft:iron_ingot','minecraft:gold_ingot','minecraft:copper_ingot','minecraft:coal','minecraft:diamond','minecraft:emerald','minecraft:lapis_lazuli',
 'minecraft:redstone','minecraft:oak_log','minecraft:cobblestone','minecraft:wheat','minecraft:carrot','minecraft:potato','minecraft:bread','minecraft:arrow','minecraft:torch'];
export const COMMANDS={
 // v0.1
 mark:C('target',[D],[3],['hit'],5,a=>10*a[0],'敵名と残りHPを表示'),
 ignite:C('target',[D],[2],['hit'],8,a=>20*a[0],'敵を燃やす'),
 calm:C('self',[N],[2],['kill'],30,a=>15*a[0],'ストレスを減らす'),
 cleanse:C('self',[S],[],['hurt'],60,60,'毒を解除する',{only:['poison']}),
 // attack
 chill:C('target',[D],[2],['hit'],12,35,'敵に移動速度低下I'),
 spark:C('target',[N],[2],['hit'],15,45,'敵に魔法の追加ダメージ'),
 arc:C('target',[N,N,N],[3,1,2],['hit'],20,60,'近くの別の敵1体に魔法ダメージ（範囲・数・ダメージ）'),
 gust:C('target',[N],[.4],['hit'],12,30,'敵を小さく押し返す'),
 venom:C('target',[D],[3],['hit'],20,45,'敵に毒I'),
 weaken:C('target',[D],[3],['hit'],20,40,'敵に弱体化I'),
 echo:C('target',[N,D],[1,1],['hit'],15,35,'少し後に追撃（ダメージ・遅れ）'),
 moon_strike:C('target',[N],[2],['hit'],15,45,'夜だけ魔法の追撃'),
 snare_ring:C('target',[N,N,D],[3,3,2],['hit'],25,85,'周りの敵に移動速度低下I（範囲・数・時間）'),
 // recovery / support
 heal:C('self',[N],[2],['kill','hurt'],30,55,'自分のHPを回復'),
 rest_calm:C('self',[N],[2],['activate'],60,45,'焚き火のそばで静止するとストレス回復'),
 cleanse_wither:C('self',[],[],['hurt'],75,70,'衰弱だけを解除'),
 mend_over_time:C('self',[N,N],[1,2],['kill'],40,60,'少しずつ回復（1回の量・回数）'),
 aid:C('ally',[N],[2],['activate'],45,65,'近くの仲間1人のHPを回復'),
 calm_allies:C(null,[N,N,N],[4,2,1],['activate'],60,60,'周りの仲間のストレスを回復（範囲・人数・量）'),
 bandage:C('self',[N],[3],['activate'],45,60,'薬草の束1個で自分を回復'),
 // defense / emergency
 ward:C('self',[D],[4],['hurt'],45,70,'衝撃吸収I'),
 douse:C('self',[],[],['hurt'],25,35,'燃えていたら消火'),
 feather:C('self',[D],[2],['activate'],25,45,'落下中だけ低速落下',{part:'feet'}),
 buoy:C('self',[N],[.25],['activate'],25,35,'水中で上向きに浮かぶ',{part:'head'}),
 bubble:C('self',[D],[4],['activate'],30,45,'水中で水中呼吸',{part:'head'}),
 haste_step:C('self',[D],[3],['hurt'],25,35,'被弾後に速度上昇I',{part:'feet'}),
 unshackle:C('self',[],[],['activate'],45,50,'移動速度低下だけを解除',{part:'legs'}),
 clear_sight:C('self',[],[],['activate'],60,55,'盲目だけを解除',{part:'head'}),
 attacker_hint:C('self',[D],[3],['hurt'],15,30,'攻撃者の種類と方向を表示',{part:'chest'}),
 repel:C('self',[N,N],[3,2],['activate'],35,65,'周りの敵を押し返す（範囲・数）'),
 // exploration / movement
 night_eye:C('self',[D],[8],['activate'],30,35,'暗視',{part:'head'}),
 waypoint:C('self',[],[],['activate'],10,25,'記録した地点の方向と距離（しゃがんで使うと記録）'),
 trail:C('self',[D,N],[30,10],['activate'],30,40,'通った道を記録し、次に使うと帰り道を表示',{part:'feet'}),
 spring:C('self',[D],[3],['activate'],20,30,'跳躍力上昇I',{part:'feet'}),
 travel_wind:C('self',[D],[5],['activate'],25,40,'戦っていない時だけ速度上昇I',{part:'feet'}),
 hazard_hint:C('self',[N],[3],['activate'],10,25,'前方の溶岩・大きな段差を警告',{part:'head'}),
 ally_beacon:C('ally',[D],[5],['activate'],20,30,'仲間1人の位置に目印'),
 rest_hint:C('self',[],[],['activate'],20,25,'発見済みの名所・拠点の方向'),
 journal_hint:C('self',[],[],['activate'],10,20,'見ている相手を図鑑で調べる',{part:'head'}),
 // daily life / play
 collect_owned:C('self',[N,N],[2,3],['activate'],15,35,'近くの落とし物を拾う（範囲・スタック数）'),
 count_item:C('self',[S],[],['activate'],10,15,'持ち物の素材1種類の数',{only:COUNT_ITEMS.map(id=>id.replace('minecraft:',''))}),
 quest_missing:C('self',[],[],['activate'],10,20,'追跡中の依頼の不足分'),
 food_inspect:C('self',[],[],['activate'],10,20,'手持ちの食べ物の品質と期限',{part:'head'}),
 crop_inspect:C('self',[],[],['activate'],10,20,'見ている作物の育ち具合',{part:'head'}),
 ranch_inspect:C('target',[],[],['activate'],10,20,'見ている家畜の世話の状態',{part:'head'}),
 gear_inspect:C('self',[],[],['activate'],10,15,'手持ちの道具の耐久と刻印'),
 fishing_practice:C('self',[],[],['activate'],15,20,'釣りミニゲームの練習（報酬なし）'),
 confetti:C('self',[D],[2],['activate'],20,15,'紙吹雪の演出'),
 fanfare:C('self',[],[],['kill'],15,15,'討伐の祝福音と星')};
