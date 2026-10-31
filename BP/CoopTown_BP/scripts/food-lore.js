import {CATALOG_FOOD,FOOD,DISHES,SHELF,mealOf} from './food-config.js';
import {qualityOf,byRank} from './quality.js';
import {ITEM_NAMES} from './game-config.js';
import {FISH_SPECIES} from './fish-species.js';
import {placeHint} from './fish-hint.js';
import {CANS,WATER} from './watering-config.js';
import {TOOLS,toolInfo} from './job-tools-config.js';
import {priceText} from './sell-price.js';

// The food's description in its lore: a one-line explanation, what it restores (hunger / stress, by its quality), its
// meal effect, how long it keeps, and who cooked it. The lines carry MARK so they can be rewritten (the quality may be
// set after them); the quality line stays first and the date line (freshness.js) last. Same food + same quality =
// same lines, so foods still stack; the cook's name makes stacks per cook (like Java's crafted-by).
export const MARK='§r§r',CREATOR='§8作成者：',CATCHER='§8釣った人：';
const isMaker=l=>l.startsWith(CREATOR)||l.startsWith(CATCHER);
// fishing fish (fish-runtime.js) get the same layout: a line about where it lives, then its size and rank (written on
// the fish when caught, kept as they are), quality, date and who caught it
const FISH_BY_ID=Object.fromEntries(FISH_SPECIES.map(s=>[s.id,s]));
const FISH_CAT={'川・湖':'淡水魚','海・沿岸':'海の魚','沖合・回遊':'外洋を旅する回遊魚','熱帯・サンゴ礁':'色あざやかな魚','深海・大物':'深い場所の大物'};
// vanilla raw fish: [explanation, hunger] (non-fishers catch these; fish-runtime.js adds the size and the catcher)
export const VANILLA_FISH={'minecraft:cod':['海でよく釣れる、身近な白身魚。',2],'minecraft:salmon':['川や冷たい海にすむ、身のしまった魚。',2],
 'minecraft:tropical_fish':['暖かい海にすむ、色あざやかな小魚。',1],'minecraft:pufferfish':['毒のある魚。そのまま食べると危険。',1]};
const FISH_STAT=/大きさ \d+cm|^§.(ランク：)?(ふつう|レア|伝説)$/;
const RANK_LINE=/^§.(ランク：)?(ふつう|レア|伝説)$/;
// a fish's rank as "ランク：…" (older catches wrote only "レア" / "伝説"; fish without one are ふつう)
const rankLine=l=>{const m=l&&/(ふつう|レア|伝説)$/.exec(l.replace(/§./g,''));const r=m?.[1]??'ふつう';return (r==='伝説'?'§6':r==='レア'?'§b':'§f')+'ランク：'+r;};
export function describeFish(s){return `${placeHint(s.where)}にすむ${FISH_CAT[s.cat]??'魚'}。`+(s.time?`${s.time==='night'?'夜':'昼'}によく釣れる。`:'');}
const CAT_TEXT={'主食・軽食':'持ち歩きやすい軽食','スープ・主菜':'しっかり食べられる一皿','燻製・保存食':'長持ちする遠征向けの保存食',
 '甘味・お菓子':'心がほっとする甘いおやつ','飲み物':'満腹でも飲める一杯'};
const KIND_TEXT={main:'しっかりおなかにたまる食事',soup:'体があたたまる汁物',sweet:'心がほっとする甘いもの',keep:'長持ちする保存食'};
// vanilla food: hunger points (the item's own nutrition) for the lore
const NUTRITION={bread:5,baked_potato:5,cooked_beef:8,cooked_porkchop:8,cooked_chicken:6,cooked_mutton:6,cooked_rabbit:5,cooked_cod:5,cooked_salmon:6,
 mushroom_stew:6,beetroot_soup:6,rabbit_stew:10,cookie:2,pumpkin_pie:8,honey_bottle:6,apple:4,sweet_berries:2};
let names=id=>ITEM_NAMES[id]??id.replace(/^\w+:/,'');
/** itemName(id) -> display name, for the ingredients in the explanation. */
export function setLoreNames(fn){names=fn;}
const catName=id=>CATALOG_FOOD[id]?.name??FOOD_NAME[id]??names(id);
const FOOD_NAME=Object.fromEntries(Object.entries(DISHES).map(([k,v])=>['cooptown:'+k,v[0]]));
// lines break after 、 when they can, else every `width` characters
const wrap=(text,width=18)=>text.split(/(?<=[、。])/).filter(Boolean).flatMap(part=>{const out=[];for(let i=0;i<part.length;i+=width)out.push(part.slice(i,i+width));return out;});
const CONTAINERS=new Set(['minecraft:glass_bottle','minecraft:bowl','minecraft:bucket','cooptown:cup']);
const INGREDIENT_NAMES={'minecraft:honey_bottle':'ハチミツ','minecraft:milk_bucket':'ミルク','minecraft:sugar':'砂糖','minecraft:egg':'卵','minecraft:wheat':'小麦',
 'minecraft:cocoa_beans':'カカオ豆','minecraft:sweet_berries':'スイートベリー','minecraft:glow_berries':'グロウベリー','minecraft:kelp':'昆布','minecraft:dried_kelp':'乾燥昆布',
 'minecraft:brown_mushroom':'キノコ','minecraft:red_mushroom':'赤いキノコ','minecraft:ice':'氷','minecraft:melon_slice':'スイカ','minecraft:pumpkin':'カボチャ'};
/** The explanation of a food: what it is and what it is made of. */
export function describe(id){
 const c=CATALOG_FOOD[id];
 if(c){
  const ing=(c.ing??[]).filter(([k])=>k!=='water'&&!CONTAINERS.has(k)).map(([k])=>INGREDIENT_NAMES[k]??catName(k)).slice(0,3);
  return (ing.length?ing.join('・')+'で作る、':'')+(CAT_TEXT[c.cat]??'料理')+'。';
 }
 const f=FOOD[id];return f?(KIND_TEXT[f[1]]??'食べ物')+'。':'';
}
// crops (asked 2026-10-25): a line about the crop, what eating it gives (or what it is for) and always its rank, D too
// (quality-runtime.js marks the better ones when a farmer harvests): [explanation, hunger or 0 for not eaten]
export const CROP_INFO={'minecraft:wheat':['パンや料理の材料になる穀物。',0],'minecraft:carrot':['そのままでも食べられる、甘みのある根菜。',3],
 'minecraft:potato':['焼くとほくほくになる芋。',1],'minecraft:beetroot':['スープの材料になる赤い根菜。',1],'minecraft:melon_slice':['みずみずしいスイカのひと切れ。',2],
 'minecraft:pumpkin':['パイや飾りに使える大きな実。',0],'minecraft:sugar_cane':['砂糖や紙の材料になる。',0],'minecraft:sweet_berries':['茂みからとれる甘ずっぱい実。',2],
 'minecraft:cocoa_beans':['クッキーなどの材料になる豆。',0],'minecraft:nether_wart':['ネザーで育つ、ポーションの材料。',0]};
const pct=v=>Math.round(v*100)+'%';
/** Whether an item gets the description lore (inventory scan in food-runtime.js). */
export const hasInfo=id=>!!(CROP_INFO[id]||CANS[id]||TOOLS[id]||FISH_BY_ID[id]||VANILLA_FISH[id]||CATALOG_FOOD[id]||FOOD[id]);
/** The lore parts (without MARK) for a food and quality tier: {desc, stats}; null for things that are not food. */
export function infoParts(id,tier=0){
 const crop=CROP_INFO[id];if(crop)return {desc:wrap(crop[0]).map(l=>'§7'+l),stats:[crop[1]?`§a満腹 +${crop[1]}`:'§7料理やクラフトの材料'],crop:true};
 if(TOOLS[id])return toolInfo(id,wrap); // each job's own tools (job-tools-config.js)
 const can=CANS[id];if(can){const n=can.radius*2+1;return {desc:wrap('農家専用。作物を見ながら長押しで水をまく。水に向けて使うと水を汲める。').map(l=>'§7'+l),
  stats:[`§b範囲 ${n}×${n}　水 ${can.water}回分`,`§a1段階育つ確率 ${pct(can.grow)}〜`,`§6水やり後${WATER.markMs/60000}分の収穫：ランクUP`,`§6豊作（もう1個）${pct(can.harvest)}`,`§8職業Lv.${can.level}から`]};}
 const fish=FISH_BY_ID[id];if(fish)return {desc:wrap(describeFish(fish)).map(l=>'§7'+l),stats:['§a満腹 +2'],fish:true};
 const v=VANILLA_FISH[id];if(v)return {desc:wrap(v[0]).map(l=>'§7'+l),stats:[`§a満腹 +${v[1]}`],fish:true};
 const c=CATALOG_FOOD[id],f=FOOD[id];if(!c&&!f)return null;
 const meal=mealOf(id,tier)??{};
 const hunger=c?byRank(c.h,tier):(NUTRITION[id.replace('minecraft:','')]??DISHES[id.replace('cooptown:','')]?.[1]??0)+(meal.hunger??0);
 const desc=wrap(describe(id)).map(l=>'§7'+l),stats=[`§a満腹 +${hunger}`+(meal.stress?`　§bストレス −${meal.stress}`:'')];
 const e=meal.effect;
 if(e)stats.push('§d効果：'+(e.key==='soup_hp'?'20秒でHP+2（戦闘中は無効）':e.key==='guard'?`ストレス増加 −${Math.round(e.pct*100)}%（${e.seconds}秒）`:`${e.label}（${e.seconds}秒）`));
 if((meal.drink||c?.kind==='drink')&&c?.cat!=='飲み物')stats.push('§3満腹でも飲めます');
 return {desc,stats};
}
/** All the description lines (for tests and checks); [] for things that are not food. */
export function infoLines(id,tier=0){const p=infoParts(id,tier);return p?[...p.desc,...p.stats]:[];}
// the layout (asked): line / explanation / line / restores + effect, quality, date / line / cook
// the separator is as wide as the widest line (full-width characters count 1, half-width ½)
const widthOf=t=>[...String(t).replace(/§./g,'')].reduce((w,ch)=>w+(ch.charCodeAt(0)<0x100||(ch>='ｦ'&&ch<='ﾟ')?.5:1),0);
const sepFor=lines=>'§8'+'ー'.repeat(Math.max(6,Math.ceil(Math.max(...lines.map(widthOf)))));
const isInfo=l=>l.startsWith(MARK);
const isDate=l=>/期限/.test(l)&&/\d+\/\d+ \d+時/.test(l);
/** The food's lore in the layout above; other lines (from elsewhere) are kept at the end. */
function layout(item,lore,creator){
 const p0=infoParts(item?.typeId,qualityOf(item));if(!p0)return lore;
 let pr='';try{pr=priceText(item);}catch{}const p=pr?{...p0,stats:[...p0.stats,pr]}:p0; // the selling price (sell-price.js)
 const q=lore.find(l=>l.includes('品質：'))??(p.crop?'§7品質：D':undefined),d=lore.find(isDate),c=creator??lore.find(isMaker);
 const raw=lore.filter(l=>!isInfo(l)&&FISH_STAT.test(l)); // a fish's rank / size lines
 const kept=p.fish?[rankLine(raw.find(l=>RANK_LINE.test(l))),...raw.filter(l=>!RANK_LINE.test(l))]:raw;
 const other=lore.filter(l=>!isInfo(l)&&l!==q&&l!==d&&!isMaker(l)&&!raw.includes(l));
 const m=l=>MARK+l,SEP=sepFor([...p.desc,...p.stats,...kept,q??'',d??'',c??'']);
 return [m(SEP),...p.desc.map(m),m(SEP),...p.stats.map(m),...kept,...(q?[q]:[]),...(d?[d]:[]),...(c?[m(SEP),c]:[]),...other].slice(0,20);
}
/** Puts the food's lore in the layout; true when the lore changed. */
export function ensureInfo(item){
 let lore=[];try{lore=item.getLore()??[];}catch{return false;}
 const out=layout(item,lore);if(out===lore||(out.length===lore.length&&out.every((l,i)=>l===lore[i])))return false;
 try{item.setLore(out);}catch{return false;}
 return true;
}
/** Writes who made the item (the last part of the layout). */
export function setCreator(item,name,label=CREATOR){
 if(!name)return item;
 let lore=[];try{lore=item.getLore()??[];}catch{return item;}
 const line=label+String(name).slice(0,20),out=layout(item,lore,line);
 try{item.setLore(out===lore?[...lore.filter(l=>!isMaker(l)),line]:out);}catch{}
 return item;
}
