// The town gacha (Confluence: TID Craftopia > ガチャ). Three kinds, each with its own ticket, rates and pity.
// A draw picks the rarity first, then one prize of that rarity (all equally likely). Only published prizes are
// drawn: the cosmetics (job clothes, furniture, skins, effects) have no assets yet, so a rarity without prizes is
// left out and the remaining rarities' rates are scaled back to 100% (the design's rule for a staged release).
export const RARITIES=['C','R','E','L'];
export const RARITY_NAMES={C:'コモン',R:'レア',E:'エピック',L:'レジェンド'};
export const GACHA_KINDS=['daily','normal','epic'];
// pity: E = an epic or better within this many draws, L = a legend within this many (0 = none)
export const GACHA={
 daily:{name:'デイリーガチャ',ticket:'デイリーチケット',rates:{C:65,R:25,E:9,L:1},pity:{E:30,L:0}},
 normal:{name:'ノーマルガチャ',ticket:'ノーマルチケット',rates:{C:50,R:32,E:15,L:3},pity:{E:30,L:90}},
 epic:{name:'エピックガチャ',ticket:'エピックチケット',rates:{C:0,R:60,E:35,L:5},pity:{E:10,L:40}}};
export const DAILY_TICKET_CAP=2; // per gacha day: the free one from the menu + one for the daily bonus
export const GACHA_HISTORY=20;
/** The gacha's day (it turns over at 05:00 JST). */
export const gachaDay=(now=Date.now())=>new Date(now+4*3600000).toISOString().slice(0,10);

const set=(id,name,...give)=>({id,name,give});
const m=x=>'minecraft:'+x;
// Material and daily-goods sets (one win = everything listed). The cosmetic slots (D/N-EP, D/N/E-L, E-EP) are
// not here until their assets exist; the epic / legend slots hold 仮の景品 (material sets, *-EX / *-LX) meanwhile.
export const GACHA_PRIZES={
 daily:{
  C:[set('D-C-01','灯り補充',[m('torch'),16]),set('D-C-02','パンの包み',[m('bread'),4]),set('D-C-03','畑の手入れ',[m('bone_meal'),4]),
   set('D-C-04','焚き付け',[m('charcoal'),8]),set('D-C-05','木工の小包',[m('oak_log'),8]),set('D-C-06','石工の小包',[m('cobblestone'),16]),
   set('D-C-07','ひも補充',[m('string'),6]),set('D-C-08','旅のおやつ',[m('apple'),3]),set('D-C-09','工作の材料',[m('stick'),16]),
   set('D-C-10','ガラスの小包',[m('glass'),8])],
  R:[set('D-R-01','小麦の種まきセット',[m('wheat_seeds'),12],[m('bone_meal'),4]),
   set('D-R-02','菜園セット',[m('carrot'),4],[m('potato'),4],[m('beetroot_seeds'),4]),
   set('D-R-03','植林セット',[m('oak_sapling'),4],[m('spruce_sapling'),4]),
   set('D-R-04','養蜂の手入れセット',[m('glass_bottle'),4],[m('shears'),1]),
   set('D-R-05','釣りの準備セット',[m('string'),12],[m('stick'),8]),
   set('D-R-06','坑道の照明セット',[m('torch'),32],[m('ladder'),16]),
   set('D-R-07','牧場の補修セット',[m('oak_fence'),16],[m('fence_gate'),2]),
   set('D-R-08','台所の補充セット',[m('bowl'),8],[m('coal'),8]),
   set('D-R-09','紙仕事セット',[m('paper'),12],[m('ink_sac'),2]),
   set('D-R-10','花壇セット',[m('poppy'),4],[m('dandelion'),4],[m('flower_pot'),2])],
  // 仮の景品 (2026-10-30, until the cosmetics have assets): material sets so the epic / legend rates and the pity work
  E:[set('D-EX-01','鉄の包み（仮）',[m('iron_ingot'),8]),set('D-EX-02','金の包み（仮）',[m('gold_ingot'),6]),set('D-EX-03','ラピスの包み（仮）',[m('lapis_lazuli'),16]),
   set('D-EX-04','エメラルドの包み（仮）',[m('emerald'),3]),set('D-EX-05','経験値の瓶（仮）',[m('experience_bottle'),8]),set('D-EX-06','名札（仮）',[m('name_tag'),1])],
  L:[set('D-LX-01','ダイヤの包み（仮）',[m('diamond'),3]),set('D-LX-02','エメラルドの箱（仮）',[m('emerald'),10])]},
 normal:{
  C:[set('N-C-01','オーク材の小包',[m('oak_log'),16]),set('N-C-02','トウヒ材の小包',[m('spruce_log'),16]),set('N-C-03','シラカバ材の小包',[m('birch_log'),16]),
   set('N-C-04','石材の小包',[m('cobblestone'),32]),set('N-C-05','深層岩の小包',[m('cobbled_deepslate'),32]),set('N-C-06','砂の小包',[m('sand'),24]),
   set('N-C-07','粘土の小包',[m('clay_ball'),16]),set('N-C-08','炭の小包',[m('coal'),12]),set('N-C-09','銅の小包',[m('copper_ingot'),8]),
   set('N-C-10','赤石の小包',[m('redstone'),12])],
  R:[set('N-R-01','鉄素材セット',[m('iron_ingot'),6]),set('N-R-02','金素材セット',[m('gold_ingot'),3]),
   set('N-R-03','染色素材セット',[m('lapis_lazuli'),12],[m('white_dye'),8]),
   set('N-R-04','額縁工作セット',[m('leather'),6],[m('stick'),24]),
   set('N-R-05','ガラス建築セット',[m('glass'),32],[m('glass_pane'),16]),
   set('N-R-06','レンガ建築セット',[m('brick_block'),16]),
   set('N-R-07','石造り建築セット',[m('stone_bricks'),32],[m('stone_brick_stairs'),16]),
   set('N-R-08','羊毛内装セット',[m('white_wool'),16],[m('white_carpet'),8]),
   set('N-R-09','書斎工作セット',[m('paper'),24],[m('leather'),3]),
   set('N-R-10','灯りの内装セット',[m('lantern'),4],[m('chain'),8])],
  E:[set('N-EX-01','ダイヤの小包（仮）',[m('diamond'),2]),set('N-EX-02','エメラルドの包み（仮）',[m('emerald'),6]),set('N-EX-03','経験値の瓶（仮）',[m('experience_bottle'),16]),
   set('N-EX-04','名札セット（仮）',[m('name_tag'),2]),set('N-EX-05','鞍（仮）',[m('saddle'),1]),set('N-EX-06','エンダーパールの包み（仮）',[m('ender_pearl'),8])],
  L:[set('N-LX-01','ダイヤの箱（仮）',[m('diamond'),6]),set('N-LX-02','ネザライトの欠片（仮）',[m('netherite_scrap'),2]),set('N-LX-03','不死のトーテム（仮）',[m('totem_of_undying'),1]),
   set('N-LX-04','シュルカーの殻（仮）',[m('shulker_shell'),2])]},
 epic:{
  C:[],
  R:[set('E-R-01','海色の染色セット',[m('blue_dye'),8],[m('light_blue_dye'),8],[m('white_dye'),8]),
   set('E-R-02','森色の染色セット',[m('green_dye'),8],[m('lime_dye'),8],[m('brown_dye'),8]),
   set('E-R-03','夕焼けの染色セット',[m('red_dye'),8],[m('orange_dye'),8],[m('yellow_dye'),8]),
   set('E-R-04','夜空の染色セット',[m('purple_dye'),8],[m('blue_dye'),8],[m('black_dye'),8]),
   set('E-R-05','花畑の染色セット',[m('pink_dye'),8],[m('magenta_dye'),8],[m('white_dye'),8]),
   set('E-R-06','展示コーナーセット',[m('frame'),8],[m('armor_stand'),2]),
   set('E-R-07','テラコッタ装飾セット',[m('white_glazed_terracotta'),8],[m('blue_glazed_terracotta'),8]),
   set('E-R-08','水晶の内装セット',[m('quartz_block'),16],[m('quartz_pillar'),8]),
   set('E-R-09','花屋の飾りセット',[m('flower_pot'),6],[m('allium'),6],[m('azure_bluet'),6]),
   set('E-R-10','旗飾りセット',[m('banner'),4],[m('yellow_dye'),8],[m('black_dye'),8])],
  E:[set('E-EX-01','ダイヤの包み（仮）',[m('diamond'),4]),set('E-EX-02','エメラルドの箱（仮）',[m('emerald'),12]),set('E-EX-03','ネザライトの欠片（仮）',[m('netherite_scrap'),1]),
   set('E-EX-04','不死のトーテム（仮）',[m('totem_of_undying'),1]),set('E-EX-05','経験値の瓶の箱（仮）',[m('experience_bottle'),32]),set('E-EX-06','金のリンゴの包み（仮）',[m('golden_apple'),4])],
  L:[set('E-LX-01','ネザライトインゴット（仮）',[m('netherite_ingot'),1]),set('E-LX-02','ダイヤの大箱（仮）',[m('diamond'),10]),set('E-LX-03','シュルカーの殻（仮）',[m('shulker_shell'),4]),
   set('E-LX-04','トーテムの箱（仮）',[m('totem_of_undying'),2])]}};
// Item ids that differ between Bedrock versions: the runtime gives the first one the game knows.
export const ITEM_ALIASES={'minecraft:dandelion':['minecraft:yellow_flower'],'minecraft:chain':['minecraft:iron_chain'],
 'minecraft:stone_bricks':['minecraft:stonebrick']};

/** The rarities that can come out now: {rarity: percent} over the rarities with published prizes (sums to 100). */
export function liveRates(kind,prizes=GACHA_PRIZES){
 const g=GACHA[kind],live=RARITIES.filter(r=>g.rates[r]>0&&prizes[kind][r].length),total=live.reduce((s,r)=>s+g.rates[r],0);
 return Object.fromEntries(live.map(r=>[r,g.rates[r]*100/total]));
}
/** Each published prize with its own chance (rarity rate / prizes in it). */
export const prizeList=(kind,prizes=GACHA_PRIZES)=>{const rates=liveRates(kind,prizes);
 return Object.keys(rates).flatMap(r=>prizes[kind][r].map(v=>({...v,rarity:r,chance:rates[r]/prizes[kind][r].length})));};
const rank=r=>RARITIES.indexOf(r);
/** Whether the pity for `at` (E or L) can work now: some rarity at or above it is published. */
export const pityLive=(kind,at,prizes=GACHA_PRIZES)=>GACHA[kind].pity[at]>0&&Object.keys(liveRates(kind,prizes)).some(r=>rank(r)>=rank(at));
/** Draws left until the guarantee (the guaranteed draw counts), or null while it cannot work. */
export function pityLeft(kind,counter,at,prizes=GACHA_PRIZES){return pityLive(kind,at,prizes)?Math.max(1,GACHA[kind].pity[at]-(counter?.[at]??0)):null;}
/**
 * One draw. counter = {E: draws since an epic or better, L: draws since a legend}, updated in place.
 * The draw that reaches a pity count is raised to it (a legend pity wins over the epic one); a better normal
 * result is kept. An epic resets E only, a legend resets both. A counter only runs while its pity can work.
 */
export function drawOnce(kind,counter,random,prizes=GACHA_PRIZES){
 const g=GACHA[kind],rates=liveRates(kind,prizes),live=Object.keys(rates);
 let roll=Math.min(.999999,Math.max(0,random()))*100,rarity=live.find(r=>(roll-=rates[r])<0)??live.at(-1);
 const eOn=pityLive(kind,'E',prizes),lOn=pityLive(kind,'L',prizes);let pity=null;
 const raise=at=>{const to=live.find(r=>rank(r)>=rank(at));if(rank(rarity)<rank(to)){rarity=to;pity=at;}};
 if(lOn&&(counter.L??0)+1>=g.pity.L)raise('L');
 else if(eOn&&(counter.E??0)+1>=g.pity.E)raise('E');
 if(eOn)counter.E=rank(rarity)>=rank('E')?0:(counter.E??0)+1;
 if(lOn)counter.L=rarity==='L'?0:(counter.L??0)+1;
 const pool=prizes[kind][rarity],prize=pool[Math.min(pool.length-1,Math.floor(Math.min(.999999,Math.max(0,random()))*pool.length))];
 return {prize,rarity,pity};
}
// What each set holds, as written on the prize pages (shown in the journal).
export const GACHA_CONTENTS={'D-C-01':'たいまつ×16','D-C-02':'パン×4','D-C-03':'骨粉×4','D-C-04':'木炭×8','D-C-05':'オークの原木×8','D-C-06':'丸石×16','D-C-07':'糸×6','D-C-08':'リンゴ×3','D-C-09':'棒×16','D-C-10':'ガラス×8',
 'D-R-01':'小麦の種×12・骨粉×4','D-R-02':'ニンジン×4・ジャガイモ×4・ビートルートの種×4','D-R-03':'オークの苗木×4・トウヒの苗木×4','D-R-04':'ガラス瓶×4・ハサミ×1','D-R-05':'糸×12・棒×8','D-R-06':'たいまつ×32・はしご×16','D-R-07':'オークのフェンス×16・オークのフェンスゲート×2','D-R-08':'ボウル×8・石炭×8','D-R-09':'紙×12・イカスミ×2','D-R-10':'ポピー×4・タンポポ×4・植木鉢×2',
 'N-C-01':'オークの原木×16','N-C-02':'トウヒの原木×16','N-C-03':'シラカバの原木×16','N-C-04':'丸石×32','N-C-05':'深層岩の丸石×32','N-C-06':'砂×24','N-C-07':'粘土玉×16','N-C-08':'石炭×12','N-C-09':'銅インゴット×8','N-C-10':'レッドストーンダスト×12',
 'N-R-01':'鉄インゴット×6','N-R-02':'金インゴット×3','N-R-03':'ラピスラズリ×12・白色の染料×8','N-R-04':'革×6・棒×24','N-R-05':'ガラス×32・ガラス板×16','N-R-06':'レンガブロック×16','N-R-07':'石レンガ×32・石レンガの階段×16','N-R-08':'白色の羊毛×16・白色のカーペット×8','N-R-09':'紙×24・革×3','N-R-10':'ランタン×4・チェーン×8',
 'E-R-01':'青色の染料×8・水色の染料×8・白色の染料×8','E-R-02':'緑色の染料×8・黄緑色の染料×8・茶色の染料×8','E-R-03':'赤色の染料×8・橙色の染料×8・黄色の染料×8','E-R-04':'紫色の染料×8・青色の染料×8・黒色の染料×8','E-R-05':'桃色の染料×8・赤紫色の染料×8・白色の染料×8',
 'E-R-06':'額縁×8・防具立て×2','E-R-07':'白色の彩釉テラコッタ×8・青色の彩釉テラコッタ×8','E-R-08':'クォーツブロック×16・クォーツの柱×8','E-R-09':'植木鉢×6・アリウム×6・ヒナソウ×6','E-R-10':'白色の旗×4・黄色の染料×8・黒色の染料×8'};
// 仮の景品 (2026-10-30)
Object.assign(GACHA_CONTENTS,{'D-EX-01':'鉄インゴット×8','D-EX-02':'金インゴット×6','D-EX-03':'ラピスラズリ×16','D-EX-04':'エメラルド×3','D-EX-05':'経験値の瓶×8','D-EX-06':'名札×1',
 'D-LX-01':'ダイヤモンド×3','D-LX-02':'エメラルド×10',
 'N-EX-01':'ダイヤモンド×2','N-EX-02':'エメラルド×6','N-EX-03':'経験値の瓶×16','N-EX-04':'名札×2','N-EX-05':'鞍×1','N-EX-06':'エンダーパール×8',
 'N-LX-01':'ダイヤモンド×6','N-LX-02':'ネザライトの欠片×2','N-LX-03':'不死のトーテム×1','N-LX-04':'シュルカーの殻×2',
 'E-EX-01':'ダイヤモンド×4','E-EX-02':'エメラルド×12','E-EX-03':'ネザライトの欠片×1','E-EX-04':'不死のトーテム×1','E-EX-05':'経験値の瓶×32','E-EX-06':'金のリンゴ×4',
 'E-LX-01':'ネザライトインゴット×1','E-LX-02':'ダイヤモンド×10','E-LX-03':'シュルカーの殻×4','E-LX-04':'不死のトーテム×2'});
export const pct=x=>`${Number(x.toFixed(2))}%`;
/** The rates and pity rules for the rates dialog. */
export function gachaRatesText(kind,prizes=GACHA_PRIZES){
 const g=GACHA[kind],rates=liveRates(kind,prizes),off=RARITIES.filter(r=>g.rates[r]>0&&!(r in rates));
 const pity=[g.pity.E?`${g.pity.E}回以内にエピック以上`:'',g.pity.L?`${g.pity.L}回以内にレジェンド`:''].filter(Boolean).join('・');
 return [`${g.name}（${g.ticket}1枚で1回）`,'',...Object.keys(rates).map(r=>`${RARITY_NAMES[r]}　${pct(rates[r])}（${prizes[kind][r].length}種・各${pct(rates[r]/prizes[kind][r].length)}）`),
  ...(off.length?['',`${off.map(r=>RARITY_NAMES[r]).join('・')}の景品は準備中です。公開済みの景品だけで確率を計算しています（設計上の確率 ${RARITIES.filter(r=>g.rates[r]>0).map(r=>`${RARITY_NAMES[r]}${g.rates[r]}%`).join('・')}）。`]:[]),
  '',`天井：${pity}。${off.length?'準備中のレアリティの天井は、景品の公開後に数え始めます。':''}`,'',
  ...prizeList(kind,prizes).map(v=>`${v.id} ${v.name}：${GACHA_CONTENTS[v.id]??''}（${pct(v.chance)}）`)].join('\n');
}
const ALL=Object.values(GACHA_PRIZES).flatMap(k=>Object.values(k).flat());
/** The last draws for the history dialog. */
export function gachaHistoryText(p){
 const h=p.gacha?.history??[];if(!h.length)return 'まだガチャを回していません。';
 const at=t=>new Date(t+9*3600000).toISOString().slice(5,16).replace('T',' ');
 return h.map(v=>`${at(v.at)} ${GACHA[v.kind]?.name??''}　${RARITY_NAMES[v.rarity]} ${ALL.find(x=>x.id===v.id)?.name??v.id}${v.pity?'（天井）':''}`).join('\n');
}
