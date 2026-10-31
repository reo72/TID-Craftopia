// 街の発展 (Confluence TID Craftopia > 世界進行: 街レベルの全体設計 / 共有建築の材料と納品ルール). The town starts at Lv1
// and gains a level for each of the five shared buildings finished in order (Lv6 after the church). Each building
// has three stages (基礎 30% / 骨組み 40% / 仕上げ 30% of every material). Deliveries are shared (no personal quota)
// and give no coins: each item adds its points to the giver's contribution (titles, the memorial's names).
// All amounts are first drafts for BASE_ACTIVE active players; the admin screen scales them (active players, %).
import {DISHES} from './food-config.js';
import {POTIONS} from './potion-config.js';
import {FISH_SPECIES} from './fish-species.js';
import {GROUPS} from './workbench-config.js';
const M='minecraft:';
const COLORS=['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
const WOODS=['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak'];
export const TOWN_RULES={baseActive:20,maxLevel:6,topList:20};
export const STAGES=[['基礎',.3],['骨組み',.4],['仕上げ',.3]];
// material kinds: name, accepted item ids, points per item, loose (the item may carry enchantments / lore: books, potions)
export const KINDS={
 cobble:{name:'丸石',items:[M+'cobblestone',M+'cobbled_deepslate'],points:1},
 stone_bricks:{name:'石レンガ',items:['stone_bricks','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks','deepslate_bricks'].map(v=>M+v),points:1},
 logs:{name:'原木',items:[...GROUPS.logs,...WOODS.map(v=>M+'stripped_'+v+'_log')],points:1},
 planks:{name:'板材',items:GROUPS.planks,points:1},
 sand:{name:'砂',items:[M+'sand',M+'red_sand'],points:1},
 bricks:{name:'レンガ',items:[M+'brick_block',M+'brick'],points:1},
 coal:{name:'石炭',items:[M+'coal',M+'charcoal'],points:1},
 wool:{name:'羊毛',items:COLORS.map(c=>M+c+'_wool'),points:1},
 crops:{name:'小麦などの作物',items:['wheat','carrot','potato','beetroot','melon_slice','pumpkin','sugar_cane'].map(v=>M+v),points:1},
 fish:{name:'魚',items:[M+'cod',M+'salmon',M+'tropical_fish',M+'pufferfish',...FISH_SPECIES.map(s=>s.id)],points:1},
 string:{name:'糸',items:[M+'string'],points:1},
 polished:{name:'磨かれた石',items:['smooth_stone','polished_andesite','polished_diorite','polished_granite','polished_deepslate'].map(v=>M+v),points:1},
 copper_block:{name:'銅ブロック',items:[M+'copper_block',M+'waxed_copper'],points:2},
 glass:{name:'ガラス',items:[M+'glass',M+'glass_pane'],points:2},
 iron:{name:'鉄インゴット',items:[M+'iron_ingot'],points:3},
 copper:{name:'銅インゴット',items:[M+'copper_ingot'],points:2},
 gold:{name:'金インゴット',items:[M+'gold_ingot'],points:5},
 light:{name:'松明・ランタン',items:['torch','lantern','soul_torch','soul_lantern'].map(v=>M+v),points:2},
 lantern:{name:'ランタン',items:[M+'lantern',M+'soul_lantern'],points:3},
 furnace:{name:'かまど・高炉',items:[M+'furnace',M+'blast_furnace',M+'smoker'],points:4},
 dish:{name:'料理',items:[...Object.keys(DISHES).map(k=>'cooptown:'+k),...['bread','cooked_beef','cooked_porkchop','cooked_chicken','cooked_mutton','cooked_cod','cooked_salmon','baked_potato','pumpkin_pie','cookie','mushroom_stew','rabbit_stew','beetroot_soup'].map(v=>M+v)],points:4},
 paper:{name:'紙・本',items:[M+'paper',M+'book'],points:2},
 sign:{name:'看板・額縁',items:[...WOODS.map(v=>M+v+'_sign'),M+'bamboo_sign',M+'crimson_sign',M+'warped_sign',M+'frame',M+'glow_frame'],points:2},
 chain:{name:'鎖',items:[M+'chain',M+'iron_chain'],points:3},
 // the potion kind is not told apart by item id yet: any drinkable vanilla potion counts (要確認)
 breathing:{name:'水中呼吸ポーション',items:[M+'potion'],points:6,loose:true},
 stained:{name:'色付きガラス',items:COLORS.map(c=>M+c+'_stained_glass'),points:3},
 potion:{name:'ポーション',items:[M+'potion',M+'splash_potion',M+'lingering_potion',...POTIONS.map(p=>p.id)],points:6,loose:true},
 diamond:{name:'ダイヤモンド',items:[M+'diamond'],points:10},
 ench_book:{name:'エンチャント本',items:[M+'enchanted_book'],points:10,loose:true}
};
// the five buildings in order: base materials (85%) then job items (15%), totals for the whole building
export const BUILDINGS=[
 {id:'clock',name:'時計台',jobs:'鉱夫・木こり',unlock:'共有倉庫',trial:'エルダーガーディアン（海）',finish:'時計が動き出す',
  needs:{cobble:2500,stone_bricks:2000,logs:1500,planks:1500,sand:1000,glass:500,iron:400,copper:300,gold:100,light:200}},
 {id:'smithy',name:'鍛冶屋',jobs:'鉱夫・鍛冶師',unlock:'装備の強化・修理',trial:'ピグリンブルート（炎）',finish:'炉に火が入る',
  needs:{cobble:2500,stone_bricks:1500,bricks:1500,logs:1500,coal:1500,iron:800,glass:300,furnace:100,light:300}},
 {id:'guild',name:'商会',jobs:'農家・料理人',unlock:'取引所・依頼掲示板',trial:'ウィザー（骸）',finish:'市場が開く',
  needs:{planks:2500,logs:1500,wool:1500,crops:1500,stone_bricks:1500,glass:500,dish:500,paper:300,sign:200}},
 {id:'ship',name:'船',jobs:'木こり・釣り師',unlock:'遠征拠点（ネザー・エンド・探索図鑑）',trial:'エンダードラゴン（空）',finish:'帆が張られる',
  needs:{logs:3000,planks:2000,wool:1500,fish:1500,string:500,iron:500,lantern:400,chain:300,breathing:300}},
 {id:'church',name:'教会',jobs:'エンチャンター・調合師',unlock:'封印の聖堂・記念碑',trial:'最終戦：ウォーデン',finish:'鐘が鳴る',
  needs:{stone_bricks:3000,polished:2000,copper_block:1500,glass:1000,logs:1000,stained:600,gold:400,potion:300,diamond:100,ench_book:100}}
];
/** The scale for amounts: active players over the base, times the admin's percent. */
export const scaleOf=build=>(Number(build?.active)||TOWN_RULES.baseActive)/TOWN_RULES.baseActive*(Number(build?.percent)||100)/100;
/** Needed amount of kind k at stage s of building b (at least 1). */
export function needOf(build,b,s,k){
 const base=BUILDINGS[b]?.needs[k];if(!base)return 0;
 return Math.max(1,Math.round(base*STAGES[s][1]*scaleOf(build)));
}
/** [{kind, name, need, got, left, points}] for a building's stage. */
export function stageSlots(build,b,s){
 const got=build?.got?.[b]?.[s]??{};
 return Object.keys(BUILDINGS[b]?.needs??{}).map(k=>{const need=needOf(build,b,s,k),g=Math.min(need,got[k]??0);return {kind:k,name:KINDS[k].name,need,got:g,left:need-g,points:KINDS[k].points};});
}
export const stageFull=(build,b,s)=>stageSlots(build,b,s).every(v=>v.left<=0);
/** The first unfinished stage of building b (3 = finished). */
export function stageOf(build,b){let s=0;while(s<STAGES.length&&stageFull(build,b,s))s++;return s;}
/** Progress of a stage / a building as 0..1. */
export function stageRatio(build,b,s){const v=stageSlots(build,b,s),need=v.reduce((a,x)=>a+x.need,0);return need?v.reduce((a,x)=>a+x.got,0)/need:0;}
export function buildingRatio(build,b){return STAGES.reduce((a,[,share],s)=>a+share*stageRatio(build,b,s),0);}
/** The kind that accepts an item id among a building's needs, or undefined. */
export const kindFor=(b,id)=>Object.keys(BUILDINGS[b]?.needs??{}).find(k=>KINDS[k].items.includes(id));
/** Contributors sorted by points: [{id, points}] (all buildings, or one building b). */
export function ranking(build,b){
 const src=b===undefined?build?.contrib??{}:build?.byBuilding?.[b]??{};
 return Object.entries(src).filter(([,v])=>v>0).map(([id,points])=>({id,points})).sort((x,y)=>y.points-x.points);
}
