// The miner's and woodcutter's job blocks (design: 鉱夫｜採掘・鉱石品質・選別・道具の手入れ, 林業｜製材・炭焼き・加工レシピ).
// 砥石 belongs to 鉱夫 and 製材台 to 木こり. Numbers are the design's open points (要決定), set here:
//  砥石 (grindstone, grind-runtime.js)  鉱石選別: a plain ore (rank D, not sorted yet) is sorted into a rank, once;
//                                       道具の手入れ: a worn pickaxe or axe gets durability back for a flint.
//  製材台 (stonecutter, saw-runtime.js) 製材: a log into planks / slabs / stairs / fences; 炭焼き: a log into charcoal.
// Ranks (quality.js D-S) follow the design's 通常・良質・極上: 初級 up to C, 中級 (Lv.10) up to B = 良質, 上級 (Lv.30) up
// to S = 極上. 中級 also unlocks まとめて (more than one at a time).
// 砥石 is 鉱夫's, 製材台 木こり's (jobs of their own again 2026-10-30); WORK_JOB stays as the grindstone's
export const GRIND_JOB='鉱夫',SAW_JOB='木こり',WORK_JOB=GRIND_JOB;
export const WORK_JOBS={'minecraft:grindstone':GRIND_JOB,'minecraft:stonecutter_block':SAW_JOB};
export const RANK_CAPS=[[30,4],[10,2],[0,1]];
/** The best rank a job level can give (quality.js index). */
export const rankCap=lv=>RANK_CAPS.find(([l])=>(lv??1)>=l)[1];
export const BATCH_LEVEL=10,MAX_BATCH=64;
export const SORTED='§8選別済み'; // the lore line of a sorted rank-D ore (a ranked one carries its 品質 line)

// ---- 砥石 ----
export const GRIND_TABS=['鉱石選別','道具の手入れ'];
export const SORT_ORES=[['石炭','coal'],['鉄の原石','raw_iron'],['銅の原石','raw_copper'],['金の原石','raw_gold'],['レッドストーン','redstone'],
 ['ラピスラズリ','lapis_lazuli'],['ダイヤモンド','diamond'],['エメラルド','emerald'],['ネザークォーツ','quartz']].map(([name,id])=>({name,id:'minecraft:'+id}));
export const CARE={material:'minecraft:flint',materialName:'火打石',share:.25,perLevel:.005,maxShare:.5};
/** Durability one care gives back: a quarter of the tool, more with the job level (up to half). */
export const careAmount=(max,lv)=>Math.max(1,Math.floor(max*Math.min(CARE.maxShare,CARE.share+(lv??1)*CARE.perLevel)));
/** Cares needed to mend damage fully (at most `times`). */
export const caresFor=(damage,max,lv,times=Infinity)=>Math.min(times,Math.ceil(damage/careAmount(max,lv)));
/** Pickaxes for the miner, axes for the woodcutter. */
export const careKind=id=>/_pickaxe$/.test(id)?'pick':/_axe$/.test(id)?'axe':undefined;

// ---- 製材台 ----
export const WOODS=[['oak','オーク'],['spruce','トウヒ'],['birch','シラカバ'],['jungle','ジャングル'],['acacia','アカシア'],['dark_oak','ダークオーク'],
 ['mangrove','マングローブ'],['cherry','サクラ'],['pale_oak','ペールオーク'],['crimson','真紅'],['warped','歪んだ'],['bamboo','竹']];
const logOf=w=>w==='crimson'||w==='warped'?w+'_stem':w==='bamboo'?'bamboo_block':w+'_log';
/** The log ids a wood accepts (the plain and stripped log). */
export const logIds=w=>['minecraft:'+logOf(w),'minecraft:stripped_'+logOf(w)];
// per log: planks 4 (as crafting), slabs 8, stairs 3 and fences 2 (a little more than crafting them from planks)
export const SAW_PRODUCTS=[['板材','planks',4],['ハーフブロック','slab',8],['階段','stairs',3],['柵','fence',2]];
export const SAW_TABS=['板材','ハーフ','階段','柵','炭焼き'];
export const CHARCOAL={per:1,fuel:{group:'planks'},fuelPer:4}; // a log is one charcoal; one plank burns per 4 logs
export const SAW_RECIPES=[
 ...SAW_PRODUCTS.flatMap(([label,kind,per],tab)=>WOODS.map(([w,name])=>({tab,name:`${name}の${label}`,wood:w,output:['minecraft:'+w+'_'+kind,per]}))),
 // charcoal: the overworld woods (nether stems and bamboo do not burn into charcoal)
 ...WOODS.filter(([w])=>!['crimson','warped','bamboo'].includes(w)).map(([w,name])=>({tab:4,name:`${name}の木炭`,wood:w,output:['minecraft:charcoal',CHARCOAL.per],charcoal:true}))];
/** What n logs of a recipe need: [[ids or group, count, name]]. */
export const sawNeeds=(r,n)=>[[logIds(r.wood),n],...(r.charcoal?[[CHARCOAL.fuel,Math.ceil(Math.max(1,n)/CHARCOAL.fuelPer)]]:[])];
