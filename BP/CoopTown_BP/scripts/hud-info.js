import {MAP_GLYPHS} from './map-glyphs.js';
import {PARTY_GLYPHS} from './party-glyphs.js';
import {deliverable} from './item-desc.js';
import {ORDERS,ITEM_NAMES,dayKey} from './game-config.js';
import {noticeText} from './notify.js';

// Text for the HUD info panels: profile name, biome / coordinates (under the minimap), money / bank and the tracked
// quest (under the profile). hud-log.js sends these lines after the log icons in the title's subtitle; the RP
// (build-hud-log.mjs) shows each through a one-line window, counted from the last line, so keep the order.
// offCount: the off-hand item's count for the hotbar's F box (empty for 1; the picture itself comes as a hidden mark
// with the map text, see statTokens in minimap.js)
export const INFO_LINES=['name','offCount','biome','coords','wallet','bank','questTitle','questGoal','questCount','notice','title', // title: the worn title on the profile's ribbon
 'p1name','p1title','p1hp','p2name','p2title','p2hp','p3name','p3title','p3hp']; // the party panels (party.js partyText)
// lines that may have no value: they get a see-through character instead (an empty line has no height in game,
// which moved the F box's window up onto the name line)
const MAY_BE_EMPTY=new Set(['offCount','notice','title','p1name','p1title','p1hp','p2name','p2title','p2hp','p3name','p3title','p3hp']); // notice: the top notification bar's text (notify.js)
const BLANK=MAP_GLYPHS['tile:blank'];
// line check: true starts every line with its number ("[3]12,480 G") to see in game which line each panel shows
export const INFO_DEBUG=false;

// biome ids (Bedrock names, some differ from Java) -> Japanese; first match wins, unknown ids show as they are
const BIOMES=[
 [/cherry/,'桜の林'],[/pale_garden/,'ペールガーデン'],[/bamboo/,'竹林'],[/jungle/,'ジャングル'],[/mangrove/,'マングローブの沼地'],[/swamp/,'沼地'],
 [/mushroom/,'キノコ島'],[/deep_dark/,'ディープダーク'],[/lush_caves/,'繁茂した洞窟'],[/dripstone/,'鍾乳洞'],
 [/crimson/,'真紅の森'],[/warped/,'歪んだ森'],[/soul_?sand/,'ソウルサンドの谷'],[/basalt/,'玄武岩デルタ'],[/hell|nether/,'ネザーの荒地'],[/the_end|^end/,'ジ・エンド'],
 [/frozen_ocean/,'凍った海'],[/warm_ocean|lukewarm/,'暖かい海'],[/cold_ocean/,'冷たい海'],[/ocean/,'海'],[/frozen_river/,'凍った川'],[/river/,'川'],
 [/stone_beach|stony_shore/,'石だらけの海岸'],[/cold_beach|snowy_beach/,'雪の砂浜'],[/beach/,'砂浜'],[/desert/,'砂漠'],[/mesa|badlands/,'荒野'],[/savanna/,'サバンナ'],
 [/jagged_peaks/,'尖った山頂'],[/frozen_peaks/,'凍った山頂'],[/stony_peaks/,'石だらけの山頂'],[/snowy_slopes/,'雪の斜面'],[/grove/,'林'],[/meadow/,'草地'],
 [/extreme_hills|windswept/,'吹きさらしの丘'],[/ice_plains_spikes|ice_spikes/,'樹氷'],[/ice_plains|snowy_plains|ice_mountains/,'雪原'],
 [/cold_taiga|snowy_taiga/,'雪のタイガ'],[/mega_taiga|old_growth/,'巨大樹のタイガ'],[/taiga/,'タイガ'],[/roofed_forest|dark_forest/,'暗い森'],
 [/birch/,'シラカバの森'],[/flower_forest/,'花の森'],[/forest/,'森'],[/sunflower/,'ヒマワリ平原'],[/plains/,'平原']
];
export function biomeName(id){
 if(!id)return '';
 const name=String(id).replace(/^minecraft:/,'');
 for(const [re,ja] of BIOMES)if(re.test(name))return ja;
 return name;
}
// Line heights: in game a line with kana or kanji is 15 px tall, any other line 10 px (full-width Ｇ ／ do not
// count), and the RP finds a line by adding up the heights of the lines below it (INFO.heights in
// build-hud-log.mjs). So each line keeps a fixed kind: JAPANESE lines always hold kana/kanji ("なし" when empty),
// the others are ASCII only ("-" when empty).
const KANA_KANJI=/[぀-ヿ㐀-鿿]/;
const JAPANESE=new Set(['biome','questTitle','questGoal']);
/** 12480 -> "12,480 G" */
export const money=v=>String(Math.max(0,Math.floor(Number(v)||0))).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' G';
export const coords=({x,y,z})=>`X:${Math.floor(x)} Y:${Math.floor(y)} Z:${Math.floor(z)}`; // compact: the pixel font is wide
/** How many of an item the player carries (inventory only). With minRank: only what a request takes (item-desc.js
 *  deliverable: that rank or better, not renamed / enchanted / worn / past its date). */
export function countItem(player,id,minRank){
 let n=0;
 try{const c=player.getComponent('minecraft:inventory')?.container;if(!c)return 0;
  for(let i=0;i<c.size;i++){const s=c.getItem(i);if(s?.typeId===id&&(minRank===undefined||deliverable(s,minRank)))n+=s.amount;}}catch{}
 return n;
}
/** The tracked daily order: the one the player chose to track (prefer, an ORDERS index) while it is accepted
 *  today, else the first accepted one. {index, title, goal, have, need}, or null. have = how many of the item the
 *  player carries (orders are delivered all at once, so there is no saved progress). */
export function trackedQuest(p,count,now=Date.now(),prefer){
 const day=dayKey(now),accepted=i=>ORDERS[i]&&p?.orders?.[i]?.day===day&&p.orders[i].status==='accepted';
 const keys=Object.keys(p?.orders??{}).map(Number).sort((a,b)=>a-b);
 const i=accepted(prefer)?Number(prefer):keys.find(accepted);
 if(i===undefined)return null;
 const q=ORDERS[i];
 return {index:i,title:q.name,goal:(ITEM_NAMES[q.item]??q.item.replace(/^minecraft:/,''))+'を納品',have:Math.min(q.amount,Math.max(0,count(q.item,q.minRank??0)|0)),need:q.amount};
}
// the order a player tracks (book menu "追跡する"), kept on the player
export const TRACK_KEY='cooptown:track';
export const trackedIndex=player=>{try{const v=player.getDynamicProperty?.(TRACK_KEY);return Number.isInteger(v)?v:undefined;}catch{return undefined;}};
/** The tracked quest for a player and their saved data p. */
export const questFor=(player,p)=>p?trackedQuest(p,(id,minRank=0)=>countItem(player,id,minRank),Date.now(),trackedIndex(player)):null;
/** The item in the player's off hand, or undefined. */
export function offhandItem(player){try{return player.getComponent('minecraft:equippable')?.getEquipment('Offhand')??undefined;}catch{return undefined;}}
// Named places shown instead of the biome name while the player is inside the box (both corners included). A place
// may have several boxes (the same name).
export const PLACES=[
 {name:'最初の町',dimension:'minecraft:overworld',from:{x:-625,y:63,z:-191},to:{x:-288,y:170,z:256}},
 {name:'最初の町',dimension:'minecraft:overworld',from:{x:-286,y:62,z:-46},to:{x:-254,y:100,z:235}}]; // added 2026-10-30
/** The named place a location is in, or undefined. */
export function placeAt(dimension,{x,y,z}){
 const inRange=(v,a,b)=>v>=Math.min(a,b)&&v<=Math.max(a,b)+1; // +1: the whole far block counts
 return PLACES.find(p=>p.dimension===dimension&&inRange(x,p.from.x,p.to.x)&&inRange(y,p.from.y,p.to.y)&&inRange(z,p.from.z,p.to.z))?.name;
}
// biome lookups are cached per 4x4 column area (getBiome is not free)
const biomeCache=new Map();
function biomeAt(player){
 const l=player.location,key=`${player.dimension.id}|${Math.floor(l.x/4)}|${Math.floor(l.y/8)}|${Math.floor(l.z/4)}`;
 if(biomeCache.has(key))return biomeCache.get(key);
 let id='';try{id=player.dimension.getBiome(l)?.id??'';}catch{}
 if(biomeCache.size>5000)biomeCache.clear();
 biomeCache.set(key,id);return id;
}
/** The info lines (INFO_LINES order) for a player and their saved data p, each of its fixed kind (see above), so
 *  the line count and heights stay fixed. The name is the first line: no window counts past it. */
/** Set by party.js users (game-runtime.js): the party panels' lines for a player ({p1name, ...}). */
export let partyLines=()=>({});
export const setPartyLines=f=>{partyLines=f;};
/** Set by town-bgm.js: whether the town music plays for a player. Then the name line carries the hidden mark "bgm"
 *  and the RP shows the music sign (build-hud-log.mjs bgmSign; 2026-10-30). */
export let bgmPlaying=()=>false;
export const setBgmPlaying=f=>{bgmPlaying=f;};
export let welcomeVisible=()=>false;
export const setWelcomeVisible=f=>{welcomeVisible=f;};
export function infoLines(player,p){
 const q=questFor(player,p);
 const off=offhandItem(player);
 const v={name:player.name+(welcomeVisible(player)||'')+(bgmPlaying(player)?PARTY_GLYPHS['token:bgm']??'':''),offCount:off&&off.amount>1?String(off.amount):'',biome:placeAt(player.dimension.id,player.location)??biomeName(biomeAt(player)),coords:coords(player.location),wallet:money(p?.coins),bank:money(p?.bank),
  questTitle:q?.title,questGoal:q?.goal,questCount:q&&`${q.have} / ${q.need}`,notice:noticeText(player),title:p?.title??'',...partyLines(player)};
 return INFO_LINES.map((k,i)=>{
  let t=String(v[k]??'').replace(/\s*\n\s*/g,' ').trim();
  if(JAPANESE.has(k))t=!t?'なし':KANA_KANJI.test(t)?t:t+'（不明）'; // e.g. a biome missing from BIOMES
  else if(MAY_BE_EMPTY.has(k))t=t||BLANK;
  else if(k!=='name')t=t||'-';
  return (INFO_DEBUG?`[${i}]`:'')+t;
 });
}
