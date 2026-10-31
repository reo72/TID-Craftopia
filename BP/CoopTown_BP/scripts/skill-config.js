// The skill trees (redesigned 2026-10-28): one tree per job. A node raises one of the job's own numbers a little (the
// harvest, the reeling, the repair...); recipes are no longer learned here (the workbench opens them by the job level).
// Points: 職業Lv (p.level) minus the points spent. Each tree costs SKILL_TREE_COST (46) in all, so one tree is done
// around Lv.46-50 and both jobs' trees by Lv.100. A node works only while its job is the main or second job; learned
// nodes stay learned after a job change. p.skillUnlocks holds node ids (strings); the old recipe numbers are dropped
// when the save is read (migrateSkills), which gives their points back.
// node: id, job, name, desc (short: the journal shows it), cost (SP), level (職業Lv needed), req (node ids needed
// first), effect {key: amount}; the keys each system reads (skillValue):
//  every job  xp: its skills' XP +x (鉱夫 mine, 冒険家 / 木こり / 農家 / 釣り師 gather, the others craft), special: the special
//             material chance x (1 + special) (special-config.js; 調合師 has none)
//  冒険家      hunt: coins for a stronger hostile mob x (1 + hunt) (mob-variance.js)   loot: XP for selling mob
//             loot x (1 + loot)   report: survey report coins and XP x (1 + report)   biome: biome visit XP x (1 + biome)
//  鉱夫        bulk: 鉱脈掘り cap x (1 + bulk)   rank: ore rank bonus + (ore-quality.js)
//  木こり      bulk: 一括伐採 cap x (1 + bulk)   rank: log rank bonus + (ore-quality.js)
//  農家        grow: watering grow chance +   harvest: watered extra-crop chance +   radius: can radius +
//             rank: crop and ranch rank bonus +
//  釣り師      reel: reeling ease +   rare: rare / legend chance x (1 + rare)   big: 特大 chance +   rank: fish rank bonus +
//  鍛冶師      repair: anvil repair per material x (1 + repair)   hammer: smith hammer repair x (1 + hammer)
//             forge: forging time ease +   rank: forged gear rank bonus +
//  料理人      speed: campfire / smoker time x (1 - speed)   rank: dish rank bonus +   knife: cook knife meat chance +
//  付与術師    power: enchant offer bonus levels +   lapis: chance to keep the lapis   levels: chance to keep the XP levels
//  調合師      speed: brewing time x (1 - speed)   rank: brew rank bonus +   herb: herb knife chance x (1 + herb)
const tree=(job,prefix,list)=>list.map(([id,name,desc,cost,level,req,effect])=>({id:prefix+'_'+id,job,name,desc,cost,level,req:req.map(r=>prefix+'_'+r),effect}));
export const SKILL_TREES={
 // 冒険家 (2026-10-30, mining and woodcutting went to 鉱夫 / 木こり): exploring and fighting
 '冒険家':tree('冒険家','adv',[
  ['xp1','探索の心得','採取の経験値 +5%',2,1,[],{xp:.05}],
  ['hunt1','狩りの心得 I','強い敵モブの報酬 +25%',3,5,['xp1'],{hunt:.25}],
  ['report1','調査報告 I','調査報告のコインと経験値 +20%',3,5,['xp1'],{report:.2}],
  ['hunt2','狩りの心得 II','強い敵モブの報酬 +25%',4,10,['hunt1'],{hunt:.25}],
  ['biome','旅の記録','バイオーム訪問の経験値 +50%',4,15,['report1'],{biome:.5}],
  ['loot1','戦利品の目利き','討伐品を売った時の経験値 +50%',5,20,['hunt1'],{loot:.5}],
  ['xp2','熟練の探索者','採取の経験値 +5%',5,25,['biome'],{xp:.05}],
  ['report2','調査報告 II','調査報告のコインと経験値 +30%',6,30,['biome'],{report:.3}],
  ['hunt3','狩りの心得 III','強い敵モブの報酬 +50%',6,35,['hunt2'],{hunt:.5}],
  ['master','伝説の冒険家','強い敵の報酬 +50%・経験値 +10%',8,45,['hunt3','report2'],{hunt:.5,xp:.1}]]),
 '鉱夫':tree('鉱夫','mine',[
  ['xp1','坑道の心得','採掘の経験値 +5%',2,1,[],{xp:.05}],
  ['bulk1','鉱脈掘り I','鉱脈掘りの上限 +25%',3,5,['xp1'],{bulk:.25}],
  ['rank1','鉱石の目利き I','鉱石のランクが上がりやすい',3,5,['xp1'],{rank:.05}],
  ['special1','掘り出し物 I','特別な素材が出やすい（+25%）',4,10,['bulk1'],{special:.25}],
  ['rank2','鉱石の目利き II','鉱石のランクが上がりやすい',4,15,['rank1'],{rank:.05}],
  ['bulk2','鉱脈掘り II','鉱脈掘りの上限 +25%',5,20,['bulk1'],{bulk:.25}],
  ['xp2','熟練の鉱夫','採掘の経験値 +5%',5,25,['rank2'],{xp:.05}],
  ['special2','掘り出し物 II','特別な素材が出やすい（+25%）',6,30,['special1'],{special:.25}],
  ['rank3','鉱石の目利き III','鉱石のランクが上がりやすい',6,35,['rank2'],{rank:.05}],
  ['master','伝説の鉱夫','鉱脈掘りの上限 +50%・経験値 +10%',8,45,['bulk2','special2'],{bulk:.5,xp:.1}]]),
 '木こり':tree('木こり','log',[
  ['xp1','森の心得','採取の経験値 +5%',2,1,[],{xp:.05}],
  ['bulk1','一括伐採 I','一括伐採の上限 +25%',3,5,['xp1'],{bulk:.25}],
  ['rank1','木目の目利き I','原木のランクが上がりやすい',3,5,['xp1'],{rank:.05}],
  ['special1','森の恵み I','特別な素材が出やすい（+25%）',4,10,['bulk1'],{special:.25}],
  ['rank2','木目の目利き II','原木のランクが上がりやすい',4,15,['rank1'],{rank:.05}],
  ['bulk2','一括伐採 II','一括伐採の上限 +25%',5,20,['bulk1'],{bulk:.25}],
  ['xp2','熟練の木こり','採取の経験値 +5%',5,25,['rank2'],{xp:.05}],
  ['special2','森の恵み II','特別な素材が出やすい（+25%）',6,30,['special1'],{special:.25}],
  ['rank3','木目の目利き III','原木のランクが上がりやすい',6,35,['rank2'],{rank:.05}],
  ['master','伝説の木こり','一括伐採の上限 +50%・経験値 +10%',8,45,['bulk2','special2'],{bulk:.5,xp:.1}]]),
 '農家':tree('農家','farm',[
  ['xp1','畑の心得','採取の経験値 +5%',2,1,[],{xp:.05}],
  ['grow1','水やり上手 I','ジョーロで育つ確率 +5%',3,5,['xp1'],{grow:.05}],
  ['rank1','土づくり I','作物・畜産物のランクが上がりやすい',3,5,['xp1'],{rank:.05}],
  ['harvest1','豊作 I','水やりした作物の追加収穫 +5%',4,10,['grow1'],{harvest:.05}],
  ['special1','実りの目 I','特別な素材が出やすい（+25%）',4,15,['rank1'],{special:.25}],
  ['radius','広いジョーロ','ジョーロの範囲が1マス広がる',5,20,['grow1'],{radius:1}],
  ['rank2','土づくり II','作物・畜産物のランクが上がりやすい',5,25,['rank1'],{rank:.05}],
  ['harvest2','豊作 II','水やりした作物の追加収穫 +10%',6,30,['harvest1'],{harvest:.1}],
  ['special2','実りの目 II','特別な素材が出やすい（+25%）',6,35,['special1'],{special:.25}],
  ['master','大地の恵み','育つ確率 +10%・ランク上昇',8,45,['radius','harvest2'],{grow:.1,rank:.05}]]),
 '鍛冶師':tree('鍛冶師','smith',[
  ['xp1','工房の心得','クラフトの経験値 +5%',2,1,[],{xp:.05}],
  ['repair1','手早い修理 I','金床の修理量 +15%',3,5,['xp1'],{repair:.15}],
  ['forge1','鍛造の勘 I','鍛造の制限時間に余裕',3,5,['xp1'],{forge:.1}],
  ['rank1','鍛えの極意 I','装備のランクが上がりやすい',4,10,['forge1'],{rank:.05}],
  ['hammer','ハンマーの冴え','鍛冶ハンマーの修理量 +20%',4,15,['repair1'],{hammer:.2}],
  ['repair2','手早い修理 II','金床の修理量 +15%',5,20,['repair1'],{repair:.15}],
  ['special1','炉の目利き','特別な素材が出やすい（+50%）',5,25,['rank1'],{special:.5}],
  ['forge2','鍛造の勘 II','鍛造の制限時間に余裕',6,30,['forge1'],{forge:.1}],
  ['rank2','鍛えの極意 II','装備のランクが上がりやすい',6,35,['rank1'],{rank:.05}],
  ['master','名工','ランク上昇・修理量 +20%',8,45,['repair2','rank2'],{rank:.05,repair:.2}]]),
 '料理人':tree('料理人','cook',[
  ['xp1','台所の心得','クラフトの経験値 +5%',2,1,[],{xp:.05}],
  ['speed1','手際 I','焚き火・燻製の時間 -10%',3,5,['xp1'],{speed:.1}],
  ['rank1','味の決め手 I','料理のランクが上がりやすい',3,5,['xp1'],{rank:.05}],
  ['knife1','包丁さばき I','包丁で肉が多く取れる（+10%）',4,10,['speed1'],{knife:.1}],
  ['special1','秘伝の味','特別な素材が出やすい（+50%）',4,15,['rank1'],{special:.5}],
  ['speed2','手際 II','焚き火・燻製の時間 -10%',5,20,['speed1'],{speed:.1}],
  ['rank2','味の決め手 II','料理のランクが上がりやすい',5,25,['rank1'],{rank:.05}],
  ['knife2','包丁さばき II','包丁で肉が多く取れる（+10%）',6,30,['knife1'],{knife:.1}],
  ['xp2','料理の探究','クラフトの経験値 +5%',6,35,['rank2'],{xp:.05}],
  ['master','街の料理長','時間 -10%・ランク上昇',8,45,['speed2','rank2'],{speed:.1,rank:.05}]]),
 '付与術師':tree('付与術師','ench',[
  ['xp1','魔導の心得','クラフトの経験値 +5%',2,1,[],{xp:.05}],
  ['power1','魔力の高まり I','エンチャントの候補が強くなる',3,5,['xp1'],{power:1}],
  ['lapis1','ラピス節約 I','15%の確率でラピスを使わない',3,5,['xp1'],{lapis:.15}],
  ['special1','魔力の目 I','特別な素材が出やすい（+25%）',4,10,['power1'],{special:.25}],
  ['levels1','省力の術 I','15%の確率で経験値レベルを使わない',4,15,['lapis1'],{levels:.15}],
  ['power2','魔力の高まり II','エンチャントの候補が強くなる',5,20,['power1'],{power:1}],
  ['lapis2','ラピス節約 II','ラピスを使わない確率 +15%',5,25,['lapis1'],{lapis:.15}],
  ['special2','魔力の目 II','特別な素材が出やすい（+25%）',6,30,['special1'],{special:.25}],
  ['levels2','省力の術 II','経験値レベルを使わない確率 +15%',6,35,['levels1'],{levels:.15}],
  ['master','大魔導師','候補が強くなる・ラピス節約 +20%',8,45,['power2','lapis2'],{power:1,lapis:.2}]]),
 '釣り師':tree('釣り師','fish',[
  ['xp1','水辺の心得','採取の経験値 +5%',2,1,[],{xp:.05}],
  ['reel1','リール捌き I','釣りのミニゲームが楽になる',3,5,['xp1'],{reel:.1}],
  ['rare1','魚影の勘 I','レア・伝説が釣れやすい（+10%）',3,5,['xp1'],{rare:.1}],
  ['rank1','締めの技 I','魚のランクが上がりやすい',4,10,['reel1'],{rank:.05}],
  ['big','大物狙い','特大が釣れる確率 +2%',4,15,['rare1'],{big:.02}],
  ['reel2','リール捌き II','釣りのミニゲームが楽になる',5,20,['reel1'],{reel:.1}],
  ['special1','海の目利き','特別な素材が出やすい（+50%）',5,25,['rare1'],{special:.5}],
  ['rare2','魚影の勘 II','レア・伝説が釣れやすい（+15%）',6,30,['big'],{rare:.15}],
  ['rank2','締めの技 II','魚のランクが上がりやすい',6,35,['rank1'],{rank:.05}],
  ['master','海の主','レア +15%・ミニゲームが楽に',8,45,['reel2','rare2'],{rare:.15,reel:.1}]]),
 '調合師':tree('調合師','brew',[
  ['xp1','調合の心得','クラフトの経験値 +5%',2,1,[],{xp:.05}],
  ['speed1','手早い醸造 I','醸造の時間 -10%',3,5,['xp1'],{speed:.1}],
  ['herb1','薬草採り I','薬草ナイフで薬草が出やすい（+20%）',3,5,['xp1'],{herb:.2}],
  ['rank1','調合の勘 I','薬のランクが上がりやすい',4,10,['speed1'],{rank:.05}],
  ['herb2','薬草採り II','薬草ナイフで薬草が出やすい（+20%）',4,15,['herb1'],{herb:.2}],
  ['speed2','手早い醸造 II','醸造の時間 -10%',5,20,['speed1'],{speed:.1}],
  ['rank2','調合の勘 II','薬のランクが上がりやすい',5,25,['rank1'],{rank:.05}],
  ['xp2','薬学の探究','クラフトの経験値 +5%',6,30,['herb2'],{xp:.05}],
  ['speed3','手早い醸造 III','醸造の時間 -10%',6,35,['speed2'],{speed:.1}],
  ['master','賢者の調合','ランク上昇・薬草 +20%',8,45,['rank2','speed3'],{rank:.05,herb:.2}]])};
export const SKILL_NODES=Object.values(SKILL_TREES).flat();
export const SKILL_BY_ID=Object.fromEntries(SKILL_NODES.map(n=>[n.id,n]));
/** SP one whole tree costs (the same for every job). */
export const SKILL_TREE_COST=SKILL_NODES.filter(n=>n.job==='冒険家').reduce((s,n)=>s+n.cost,0);
/** The skills each job's xp nodes raise. */
export const SKILL_XP_KEYS={'冒険家':['gather'],'鉱夫':['mine'],'木こり':['gather'],'農家':['gather'],'釣り師':['gather'],'鍛冶師':['craft'],'料理人':['craft'],'付与術師':['craft'],'調合師':['craft']};
const learned=p=>Array.isArray(p?.skillUnlocks)?p.skillUnlocks:[];
const active=(p,job)=>!!job&&(p?.job===job||p?.secondJob===job);
/** SP left: 職業Lv minus the points spent. */
export const skillPoints=p=>Math.max(0,(p?.level??1)-learned(p).reduce((sum,id)=>sum+(SKILL_BY_ID[id]?.cost??0),0));
/** The sum of one effect over the learned nodes of a job, while that job is the main or second job (else 0). */
export function skillValue(p,job,key){
 if(!active(p,job))return 0;
 let v=0;for(const id of learned(p)){const n=SKILL_BY_ID[id];if(n?.job===job&&n.effect[key])v+=n.effect[key];}
 return Math.round(v*1000)/1000;
}
/** The XP bonus (fraction) on a skill (gather / mine / craft) from the active jobs' xp nodes. */
export const skillXpBonus=(p,skill)=>[p?.job,p?.secondJob].filter(j=>SKILL_XP_KEYS[j]?.includes(skill)).reduce((s,j)=>s+skillValue(p,j,'xp'),0);
/** Why a node cannot be learned now ('' when it can; '習得済み' when learned). */
export function skillLock(p,node){
 if(learned(p).includes(node.id))return '習得済み';
 if(!active(p,node.job))return node.job+'の職業が必要です';
 if((p.level??1)<node.level)return `職業Lv.${node.level}で習得できます`;
 const miss=node.req.find(r=>!learned(p).includes(r));if(miss)return `先に「${SKILL_BY_ID[miss].name}」が必要です`;
 if(skillPoints(p)<node.cost)return 'スキルポイントが足りません';
 return '';
}
/** Old saves kept recipe numbers (the first tree): they are dropped, which gives their points back. Returns whether anything changed. */
export function migrateSkills(p){
 const before=learned(p),after=[...new Set(before.filter(id=>typeof id==='string'&&SKILL_BY_ID[id]))];
 if(Array.isArray(p.skillUnlocks)&&after.length===before.length)return false;
 p.skillUnlocks=after;return true;
}
