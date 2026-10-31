// The alchemist's own potions (Notion「追加ポーション一覧」「ポーション共通ルール」「調合師ランク」): drunk like a potion
// (cooptown:potion_<key>, no hunger), found at the experiment cauldron and brewed at the brewing stand like the
// vanilla ones. rank: the 調合師 rank needed to brew it (job-rank.js). groups: the cooldown groups it uses (all of
// them must be ready, and drinking starts all of them). Values are for 通常; 良質 / 極上 multiply instant amounts and
// times by QUALITY_SCALE (rounded down), never the rates, ranges or cooldowns.
// The added plants of the design (カモミール, ラベンダー, 薬草, ミント) are stood in for by vanilla flowers until they exist:
// oxeye daisy = カモミール, allium = ラベンダー, fern = 薬草. 保温薬 / 避暑薬 wait for a temperature system (not in yet).
const M=id=>'minecraft:'+id;
export const POTION_PREFIX='cooptown:potion_';
export const GROUPS={stress:{label:'ストレス回復',seconds:120},heal:{label:'体力回復',seconds:30},cure:{label:'状態解除',seconds:60},support:{label:'持続支援',seconds:60},
 food:{label:'満腹',seconds:60},warp:{label:'帰還',seconds:300}};
// effects: vanilla effects a potion gives, [id, seconds, amplifier] (EFFECT_NAMES for the log); hunger: food points at
// once; warp: the 帰還の薬 (food-runtime.js warpHome: WARP.waitSeconds standing still, then to the spawn point)
export const EFFECT_NAMES={night_vision:'暗視',speed:'移動速度上昇',haste:'採掘速度上昇',conduit_power:'コンジットパワー',slow_falling:'落下速度低下',
 jump_boost:'跳躍力上昇',regeneration:'再生',resistance:'耐性',slowness:'移動速度低下',invisibility:'透明化'};
export const WARP={waitSeconds:5,moveLimit:1.5};
export const GLOBAL_COOLDOWN=5;
export const QUALITY_SCALE=[1,1.05,1.1,1.15,1.2]; // quality rank D-S
export const STRESS_MAX=60;
export const SENSE_RANGE=12;
// effect fields: stress (instant -), guard {pct, seconds}, heal (HP), cure (effect id), focus / fish / sense / dex (seconds)
const P=(key,name,rank,groups,effect,inputs,tab,color,desc)=>({key,id:POTION_PREFIX+key,name,rank,groups,effect,inputs:inputs.map(M),tab,color,desc});
export const POTIONS=[
 P('calm_s','小さな安らぎの薬',0,['stress'],{stress:15},['oxeye_daisy','sugar'],0,[150,200,230],'ストレス15回復'),
 P('calm_m','安らぎの薬',1,['stress'],{stress:30},['oxeye_daisy','honey_bottle','red_mushroom'],0,[120,170,230],'ストレス30回復'),
 P('calm_l','深い安らぎの薬',2,['stress'],{stress:50},['oxeye_daisy','honey_bottle','amethyst_shard'],0,[90,120,230],'ストレス50回復'),
 P('serene','平静の薬',1,['support'],{guard:{pct:.2,seconds:180}},['oxeye_daisy','allium'],2,[200,150,230],'ストレス増加を20%軽減（180秒）'),
 P('mind','心身調整薬',2,['stress','support'],{stress:20,guard:{pct:.1,seconds:120}},['oxeye_daisy','allium','ghast_tear'],2,[230,140,200],'ストレス20回復＋増加10%軽減（120秒）'),
 P('first_aid','応急薬',0,['heal'],{heal:4},['fern','melon_slice'],0,[230,80,80],'HP4回復（ハート2個）'),
 P('antidote','解毒薬',1,['cure'],{cure:'poison'},['dandelion','sugar_cane','charcoal'],2,[120,200,90],'毒だけを解除'),
 P('focus','集中薬',1,['support'],{focus:180},['carrot','lapis_lazuli'],3,[230,200,80],'職業ミニゲームの入力時間を10%延長（180秒）'),
 P('fish_eye','魚影調査薬',1,['support'],{fish:180},['cod','kelp','sweet_berries'],3,[80,170,220],'今の釣り場で釣れる魚のヒント（180秒）'),
 P('sense','気配察知薬',2,['support'],{sense:120},['glow_ink_sac','amethyst_shard'],3,[90,220,200],'周囲12ブロックの敵の接近を知らせる（120秒）'),
 P('deft','器用さの薬',1,['support'],{dex:180},['rabbit_foot','lapis_lazuli'],3,[240,160,60],'器用さ+20（180秒）。ランクとミニゲームが少し有利に'),
 // the second set (asked 2026-10-28: ten more original potions)
 P('night_eye','夜目の薬',0,['support'],{effects:[['night_vision',300,0]]},['glow_berries','carrot'],1,[70,70,170],'暗視（300秒）'),
 P('swift','俊足の薬',1,['support'],{effects:[['speed',180,0]]},['sugar','feather'],1,[130,220,240],'移動速度上昇（180秒）'),
 P('haste','採掘の薬',1,['support'],{effects:[['haste',180,0]]},['gold_nugget','redstone'],1,[240,210,80],'採掘速度上昇（180秒）'),
 P('diver','潜水の薬',1,['support'],{effects:[['conduit_power',180,0]]},['kelp','prismarine_shard'],2,[60,140,220],'水中で呼吸・視界・採掘が楽に（180秒）'),
 P('feather','羽の薬',1,['support'],{effects:[['slow_falling',120,0],['jump_boost',120,0]]},['feather','phantom_membrane'],2,[235,235,245],'落下速度低下＋跳躍力上昇（120秒）'),
 P('vital','再生の薬',2,['heal'],{effects:[['regeneration',25,0]]},['glistering_melon_slice','sweet_berries','ghast_tear'],0,[240,110,170],'じわじわHP回復（25秒）'),
 P('hearty','満腹の薬',0,['food'],{hunger:8},['bread','honey_bottle'],0,[210,150,80],'満腹度8回復'),
 P('ironwall','鉄壁の薬',2,['support'],{effects:[['resistance',90,0],['slowness',90,0]]},['iron_nugget','magma_cream','brown_mushroom'],2,[150,150,165],'耐性（90秒）。かわりに足が遅くなる'),
 P('shadow','隠密の薬',2,['support'],{effects:[['invisibility',90,0]]},['ink_sac','fermented_spider_eye'],3,[80,60,100],'透明化（90秒）'),
 P('homeward','帰還の薬',2,['warp'],{warp:true},['ender_pearl','chorus_fruit','compass'],3,[170,90,230],'5秒じっとしているとリスポーン地点へ戻る')];
export const potionByKey=Object.fromEntries(POTIONS.map(p=>[p.key,p]));
export const potionById=Object.fromEntries(POTIONS.map(p=>[p.id,p]));
/** The potion's values for a quality: instant amounts and times scaled, rates kept. */
export function effectAt(p,tier){
 const k=QUALITY_SCALE[tier]??1,e=p.effect,out={...e};
 if(e.stress)out.stress=Math.min(STRESS_MAX,Math.floor(e.stress*k));
 if(e.heal)out.heal=Math.floor(e.heal*k);
 if(e.guard)out.guard={pct:e.guard.pct,seconds:Math.floor(e.guard.seconds*k)};
 for(const f of ['focus','fish','sense','dex'])if(e[f])out[f]=Math.floor(e[f]*k);
 if(e.effects)out.effects=e.effects.map(([id,s,a])=>[id,Math.floor(s*k),a]);
 if(e.hunger)out.hunger=Math.min(20,Math.floor(e.hunger*k));
 return out;
}
// the experiment cauldron's combinations for them (cauldron-config.js EXPERIMENTS)
export const POTION_EXPERIMENTS={
 '小さな安らぎの薬':['oxeye_daisy','sugar','melon_slice'],'安らぎの薬':['oxeye_daisy','honey_bottle','brown_mushroom'],'深い安らぎの薬':['oxeye_daisy','honey_bottle','amethyst_shard'],
 '平静の薬':['oxeye_daisy','allium','sugar'],'心身調整薬':['allium','amethyst_shard','ghast_tear'],'応急薬':['fern','melon_slice','sugar'],
 '解毒薬':['dandelion','charcoal','spider_eye'],'集中薬':['carrot','lapis_lazuli','glowstone_dust'],'魚影調査薬':['kelp','pufferfish','lapis_lazuli'],
 '気配察知薬':['glow_ink_sac','amethyst_shard','spider_eye'],'器用さの薬':['rabbit_foot','lapis_lazuli','honey_bottle'],
 '夜目の薬':['glow_berries','carrot','sugar'],'俊足の薬':['sugar','feather','rabbit_foot'],'採掘の薬':['gold_nugget','redstone','glow_berries'],
 '潜水の薬':['kelp','prismarine_shard','pufferfish'],'羽の薬':['feather','phantom_membrane','sugar'],'再生の薬':['glistering_melon_slice','sweet_berries','honey_bottle'],
 '満腹の薬':['bread','honey_bottle','carrot'],'鉄壁の薬':['iron_nugget','magma_cream','amethyst_shard'],'隠密の薬':['ink_sac','fermented_spider_eye','allium'],
 '帰還の薬':['ender_pearl','chorus_fruit','lapis_lazuli']};
