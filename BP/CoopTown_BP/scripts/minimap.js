import {world,system} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {MAP_GLYPHS} from './map-glyphs.js';
import {dialog} from './dialog.js';
import {PROFILE_JOBS,PROFILE_TITLES,titleRankNumber} from './profile-config.js';
import {questFor,offhandItem} from './hud-info.js';
import {prefs} from './prefs.js';
import {noticeMarks,setNotifyResend} from './notify.js';
import {setHudPayload} from './hud-channel.js';

// Top-right minimap. Each map cell is a glyph (block-top texture / marker) from font page E0; the map
// is sent as an action bar message "ctmap:" + rows, which the RP's hud_screen.json draws top right.
// resendMs: the same map is drawn again only this often (the action bar needed it every second to stay on screen; the
// subtitle stays, and hud-log.js resends it every 2 s anyway)
export const MINIMAP={size:21,zooms:[1,2,4],updateTicks:10,resendMs:30000,lookupBudget:600,cacheLimit:60000,cacheMs:180000,settingsKey:'cooptown:minimap'};
// updateTicks 10 (was 5 until 2026-10-30, "ラグい"): every action bar message rebuilds the whole HUD box on the client
const G=key=>MAP_GLYPHS[key]??MAP_GLYPHS['tile:void'];

// ---- block -> tile ----
const EXACT={
 grass_block:'grass',short_grass:'grass',tall_grass:'grass',fern:'grass',large_fern:'grass',water:'water',flowing_water:'water',lava:'lava',flowing_lava:'lava',
 sand:'sand',red_sand:'red_sand',gravel:'gravel',stone:'stone',cobblestone:'cobblestone',mossy_cobblestone:'mossy',deepslate:'deepslate',cobbled_deepslate:'deepslate',
 dirt:'dirt',coarse_dirt:'coarse_dirt',rooted_dirt:'coarse_dirt',podzol:'podzol',mycelium:'mycelium',mud:'mud',clay:'clay',snow:'snow',snow_layer:'snow',powder_snow:'snow',
 ice:'ice',packed_ice:'packed_ice',blue_ice:'packed_ice',farmland:'farmland',grass_path:'path',dirt_path:'path',moss_block:'moss',moss_carpet:'moss',hay_block:'hay',
 pumpkin:'pumpkin',carved_pumpkin:'pumpkin',melon_block:'melon',cactus:'cactus',netherrack:'netherrack',soul_sand:'soul_sand',soul_soil:'soul_soil',basalt:'basalt',
 polished_basalt:'basalt',blackstone:'blackstone',crimson_nylium:'crimson',warped_nylium:'warped',nether_wart_block:'wart_block',warped_wart_block:'warped',
 glowstone:'glowstone',end_stone:'end_stone',obsidian:'obsidian',crying_obsidian:'obsidian',bedrock:'bedrock',quartz_block:'quartz',iron_block:'iron_block',
 tuff:'tuff',calcite:'calcite',sandstone:'sandstone',red_sandstone:'red_sandstone',stone_bricks:'stone_bricks',stonebrick:'stone_bricks',brick_block:'bricks',bricks:'bricks',
 glass:'glass',kelp:'water',seagrass:'water',lily_pad:'water',bubble_column:'water',cherry_leaves:'cherry_leaves',azalea_leaves:'azalea',flowering_azalea_leaves:'azalea',
 wheat:'crops',carrots:'crops',potatoes:'crops',beetroot:'crops',sweet_berry_bush:'leaves'
};
const PATTERNS=[
 [/spruce_log|spruce_wood/,'log_spruce'],[/birch_log|birch_wood/,'log_birch'],[/dark_oak_log|dark_oak_wood/,'log_dark'],[/_log$|_wood$|_stem$|_hyphae$/,'log'],
 [/spruce_leaves|mangrove_leaves/,'leaves_spruce'],[/birch_leaves/,'leaves_birch'],[/jungle_leaves/,'leaves_jungle'],[/leaves/,'leaves'],
 [/spruce_planks|spruce_(slab|stairs|fence|door|trapdoor)/,'planks_spruce'],[/birch_planks|birch_(slab|stairs|fence)/,'planks_birch'],[/dark_oak_planks|dark_oak_(slab|stairs|fence)/,'planks_dark'],
 [/planks|wooden_|oak_(slab|stairs|fence)|_fence|fence_gate|_door|trapdoor|bookshelf|crafting_table|chest|barrel/,'planks'],
 [/wool|carpet/,'wool'],[/terracotta/,'terracotta'],[/concrete/,'stone_bricks'],[/glass/,'glass'],[/sandstone/,'sandstone'],[/brick/,'stone_bricks'],
 [/deepslate/,'deepslate'],[/blackstone/,'blackstone'],[/basalt/,'basalt'],[/nether/,'netherrack'],[/end_stone|purpur/,'end_stone'],[/quartz/,'quartz'],
 [/ore$/,'stone'],[/cobblestone|stone|andesite|diorite|granite|_slab|_stairs|_wall/,'stone'],
 [/flower|tulip|poppy|dandelion|orchid|allium|bluet|daisy|lilac|rose|peony|sapling|mushroom|bush|vine|sugar_cane|bamboo/,'grass'],
 [/snow/,'snow'],[/ice/,'ice'],[/water|coral|sea_/,'water'],[/lava|magma/,'lava']
];
export function tileFor(typeId){
 if(!typeId)return 'void';
 const name=typeId.replace(/^minecraft:/,'');
 if(EXACT[name])return EXACT[name];
 for(const [re,tile] of PATTERNS)if(re.test(name))return tile;
 return 'stone';
}

// ---- sampling with a cache ----
const cache=new Map();let budget=0;
// Surface: a ray straight down from above the player hits leaves and water surfaces too
// (getTopmostBlock skips them and returns the ground / sea floor). Falls back to getTopmostBlock.
const RAY_ABOVE=32,RAY_DEPTH=96;
function surfaceBlock(dimension,x,z,fromY){
 try{const hit=dimension.getBlockFromRay({x:x+.5,y:fromY,z:z+.5},{x:0,y:-1,z:0},{includeLiquidBlocks:true,includePassableBlocks:true,maxDistance:RAY_DEPTH});if(hit?.block)return hit.block;}catch{}
 return dimension.getTopmostBlock({x,z});
}
function sample(dimension,x,z,sliceY,fromY){
 const key=`${dimension.id}|${x}|${z}|${sliceY??''}`,hit=cache.get(key),now=Date.now();
 if(hit&&now-hit.at<MINIMAP.cacheMs)return hit.tile;
 if(budget<=0)return hit?.tile??'void'; // over budget: show the old value (or nothing) this time
 budget--;
 let tile='void';
 try{
  if(sliceY===undefined)tile=tileFor(surfaceBlock(dimension,x,z,fromY)?.typeId);
  else{const wall=dimension.getBlock({x,y:sliceY,z});tile=wall&&!wall.isAir&&!wall.isLiquid?tileFor(wall.typeId):tileFor(dimension.getBlock({x,y:sliceY-1,z})?.typeId);}
 }catch{tile='void';}
 if(tile==='void'&&hit)tile=hit.tile; // unloaded chunk: keep what we saw before
 cache.delete(key);cache.set(key,{tile,at:now});
 if(cache.size>MINIMAP.cacheLimit)cache.delete(cache.keys().next().value);
 return tile;
}
const OPEN_ABOVE=/leaves|_log$|_wood$|_stem$|vine|bamboo|mushroom_block|snow|glass/;
/** Underground or in the Nether: show the slice at the player's feet instead of the surface. */
function sliceFor(player){
 const {dimension}=player,x=Math.floor(player.location.x),y=Math.floor(player.location.y),z=Math.floor(player.location.z);
 if(dimension.id==='minecraft:nether')return y;
 try{const top=dimension.getTopmostBlock({x,z});if(!top||top.location.y<=y+3)return undefined;
  // under trees is still the surface: only rock/blocks overhead count as underground
  return OPEN_ABOVE.test(top.typeId)?undefined:y;}catch{return undefined;}
}

// ---- settings ----
export const SHAPES=[['square','四角'],['circle','丸']];
// on-screen size; the RP draws one map box per size, picked by the hidden "sizeN" mark
export const SIZES=['小','中','大'];
export function mapSettings(player){
 try{const v=JSON.parse(player.getDynamicProperty(MINIMAP.settingsKey)??'{}');
  return {on:v.on!==false,zoom:MINIMAP.zooms.includes(v.zoom)?v.zoom:1,shape:SHAPES.some(([k])=>k===v.shape)?v.shape:'square',size:[0,1,2].includes(v.size)?v.size:1};}
 catch{return {on:true,zoom:1,shape:'square',size:1};}
}
export function saveMapSettings(player,s){player.setDynamicProperty(MINIMAP.settingsKey,JSON.stringify(s));} // turned off: the next update sends the map-less text
const saveSettings=saveMapSettings;

// ---- drawing ----
const heading=yaw=>Math.round((((yaw+180)%360+360)%360)/45)%8;
/**
 * Builds the map text. markers: [{x,z,key,clamp}] in world coordinates. The centre cell keeps its
 * terrain; the HUD draws your arrow over it, picked by the hidden "dirN" mark at the end. A round map
 * blanks the cells outside the circle and adds the hidden "circle" mark for the round frame.
 */
export function drawMap({cx,cz,zoom,dir,tileAt,markers,shape='square',size=1,night=false}){
 const half=(MINIMAP.size-1)/2,grid=[],round=shape==='circle',inside=(r,c)=>!round||(r-half)**2+(c-half)**2<=(half+.5)**2;
 for(let r=0;r<MINIMAP.size;r++){const row=[];for(let c=0;c<MINIMAP.size;c++)row.push(inside(r,c)?G('tile:'+tileAt(cx+(c-half)*zoom,cz+(r-half)*zoom)):G('tile:blank'));grid.push(row);}
 for(const m of markers){
  let c=Math.round((m.x-cx)/zoom)+half,r=Math.round((m.z-cz)/zoom)+half;
  if(!(r>=0&&c>=0&&r<MINIMAP.size&&c<MINIMAP.size&&inside(r,c))){
   if(!m.clamp)continue;
   // pull the marker back toward the centre until it is on the map edge
   const dr=r-half,dc=c-half,k=round?(half)/Math.max(1e-9,Math.hypot(dr,dc)):half/Math.max(Math.abs(dr),Math.abs(dc));
   r=Math.round(half+dr*k);c=Math.round(half+dc*k);
  }
  if(r===half&&c===half)continue; // the centre shows your arrow
  grid[r][c]=G('marker:'+m.key);
 }
 return 'ctmap:'+grid.map(r=>r.join('')).join('\n')+(night?G('token:night'):'')+G('token:dir'+dir)+(round?G('token:circle'):'')+G('token:size'+size);
}
// sun / moon next to the map (night = 13000-23000 ticks)
const isNight=()=>{try{const t=world.getTimeOfDay();return t>=13000&&t<23000;}catch{return false;}};
/** Hotbar numbers (CoopTown level, XP, stress) as hidden marks. The HUD can only check for one character and
 *  cannot use "or", so every picture gets a character of its own: hb = numbers present; level: lh1 (100+),
 *  lp2 + lt<tens> (10+), lo<ones>; XP: xp<0-10> (10 % steps); stress: bf<i> / bh<i> = bolt i full / half
 *  (one bolt = 10 stress, half from 5). Top-left profile, as bits (few font cells): pj0-3 = job number
 *  (PROFILE_JOBS index + 1), pt0-4 = title number (PROFILE_TITLES index), ptx = wearing a known title.
 *  Tracked quest panel: qx = a quest is tracked, qp0-4 = its progress in 5 % steps (0-20).
 *  hud: the book settings' HUD panels; one turned off adds hp / hw / hq / hl (profile / money / quest / location).
 *  offhand: the off-hand item's id; the hotbar's F box shows its picture: os / ot / oa = shield / totem / arrow. */
export function statTokens({level=1,xp=0,maxXp=100,stress=0,job='',title='',quest=null,hud=null,offhand=''}={}){
 const n=v=>Math.max(0,Math.floor(Number(v))||0),L=Math.min(199,n(level)||1),S=Math.min(100,n(stress));
 let s=G('token:hb');if(L>=100)s+=G('token:lh1');if(L>=10)s+=G('token:lp2')+G('token:lt'+Math.floor(L/10)%10);s+=G('token:lo'+L%10);
 s+=G('token:xp'+Math.min(10,Math.floor(10*n(xp)/Math.max(1,n(maxXp)))));
 for(let i=1;i<=10;i++)if(S>=10*i)s+=G('token:bf'+i);else if(S>=10*i-5)s+=G('token:bh'+i);
 const bits=(v,n,k)=>{for(let b=0;b<n;b++)if(v>>b&1)s+=G('token:'+k+b);};
 bits(PROFILE_JOBS.indexOf(job)+1,4,'pj');
 if(title){s+=G('token:ptx');bits(titleRankNumber(title),3,'pt');} // any title: its name is an info line, pt = its rank (badge)
 if(quest&&quest.need>0){s+=G('token:qx');bits(Math.min(20,Math.floor(20*n(quest.have)/quest.need)),5,'qp');}
 if(hud)for(const [k,mark] of [['profile','hp'],['wallet','hw'],['quest','hq'],['location','hl']])if(hud[k]===false)s+=G('token:'+mark);
 const off={'minecraft:shield':'os','minecraft:totem_of_undying':'ot','minecraft:arrow':'oa'}[offhand];if(off)s+=G('token:'+off);
 return s;
}
// players in the fishing minigame (reel-game.js): the minimap leaves their action bar alone meanwhile
/** The marks a player put on the world map, for the minimap (asked 2026-10-28): their base (kept on the map edge as a
 *  pointer while 追跡する is on) and their flags, as the world map shows them (its show settings 拠点 / 目印 respected).
 *  raw: the world map's saved settings (cooptown:wm_prefs). */
export function worldMapMarks(raw,dim){
 let wm={};try{wm=JSON.parse(raw??'{}')??{};}catch{}
 const show={town:true,flag:true,...(wm.show??{})},out=[];
 if(show.town&&wm.base?.dim===dim)out.push({x:Math.floor(wm.base.x),z:Math.floor(wm.base.z),key:'base',clamp:!!wm.track});
 if(show.flag&&Array.isArray(wm.flags))for(const f of wm.flags)if(f?.dim===dim)out.push({x:Math.floor(f.x),z:Math.floor(f.z),key:'landmark_found'});
 return out;
}
/** Set by game-runtime.js: the party panels' hidden marks for a player (party.js partyMarks). */
export let partyMarksFor=()=>'';
export const setPartyMarks=f=>{partyMarksFor=f;};
export const mapPaused=new Set();
// the last hotbar / profile marks sent to each player: the fishing panel sends them along so those keep showing
export const lastStats=new Map();
export function installMinimap({game}){
 const last=new Map(),base=new Map();
 // base: the last map text without the notification marks, so a moving bar can be re-sent every tick (notify.js)
 // the map text goes with the HUD's subtitle (hud-channel.js / hud-log.js; was the action bar until 2026-11-01, whose
 // controls the game builds again for every message: the whole HUD flickered)
 const sendBar=(player,text,key)=>{setHudPayload(player,text+noticeMarks(player));base.set(player.id,text);last.set(player.id,{key,at:Date.now()});};
 setNotifyResend(player=>{if(mapPaused.has(player.id))return;const t=base.get(player.id);if(t!==undefined)setHudPayload(player,t+noticeMarks(player));});
 system.runInterval(()=>{
  budget=MINIMAP.lookupBudget;
  // a light read-only view of what the map needs (no copy of the whole save every half second)
  let db;try{db=game.peek(d=>({off:d.settings?.minimap===false,town:d.town.location,landmarks:d.landmarks,events:d.events,explored:id=>d.players[id]?.explored??[],stats:id=>{const p=d.players[id];return p&&{level:p.level,xp:p.xp,maxXp:p.maxXp,stress:p.stress,job:p.job,title:p.title,orders:p.orders};}}));}catch{return;}
  const players=world.getAllPlayers(),now=Date.now();
  for(const player of players){
   if(mapPaused.has(player.id)){last.delete(player.id);continue;}
   try{
    // the hotbar's level / XP / stress travel with the map text, so they are sent even with the map off
    const st=db.stats(player.id),s=mapSettings(player),stats=statTokens(st?{...st,quest:questFor(player,st),hud:prefs(player).hud,offhand:offhandItem(player)?.typeId}:undefined)+partyMarksFor(player); // the party panels' marks travel with the stats (party.js)
    lastStats.set(player.id,stats);
    const marks=noticeMarks(player); // the top notification bar's kind and frame (notify.js)
    if(!s.on||db.off){const k='off|'+stats+marks,prev=last.get(player.id);if(prev&&prev.key===k&&now-prev.at<MINIMAP.resendMs)continue;sendBar(player,'ctmap:'+stats,k);continue;}
    const loc=player.location,zoom=s.zoom,cx=Math.floor(loc.x/zoom)*zoom,cz=Math.floor(loc.z/zoom)*zoom,dir=heading(player.getRotation().y);
    const night=isNight();
    const sliceY=sliceFor(player),key=`${player.dimension.id}|${cx}|${cz}|${dir}|${zoom}|${sliceY}|${s.shape}|${s.size}|${night}|${stats}|${marks}`,prev=last.get(player.id);
    if(prev&&prev.key===key&&now-prev.at<MINIMAP.resendMs)continue;
    const dim=player.dimension.id,markers=[];
    if(db.town?.dimension===dim)markers.push({x:db.town.x,z:db.town.z,key:'base',clamp:true});
    // the player's own base and flags from the world map (worldmap-runtime.js)
    markers.push(...worldMapMarks(player.getDynamicProperty('cooptown:wm_prefs'),dim));
    const explored=db.explored(player.id);
    for(const l of db.landmarks)if(l.location?.dimension===dim)markers.push({x:l.location.x,z:l.location.z,key:explored.includes(l.id)?'landmark_found':'landmark'});
    for(const e of db.events)if(e.start<=now&&e.end>now&&e.location?.dimension===dim)markers.push({x:e.location.x,z:e.location.z,key:'event',clamp:true});
    for(const o of players)if(o.id!==player.id&&o.dimension.id===dim)markers.push({x:Math.floor(o.location.x),z:Math.floor(o.location.z),key:'player'});
    const text=drawMap({cx,cz,zoom,dir,markers,shape:s.shape,size:s.size,night,tileAt:(x,z)=>sample(player.dimension,x,z,sliceY,Math.min(player.dimension.heightRange?.max??320,Math.floor(loc.y)+RAY_ABOVE))});
    sendBar(player,text+G('token:mapon')+stats,key);
   }catch(e){console.warn('[CoopTown] ミニマップ: '+e);}
  }
 },MINIMAP.updateTicks);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{last.delete(playerId);base.delete(playerId);});
}
/** Journal "地図" button: minimap on/off and zoom; returns the message to show, if any. */
export async function openMapSettings(player,{locationText}={}){
 const s=mapSettings(player);
 const i=await dialog(player,{title:'地図',body:`ミニマップ：${s.on?'表示中':'非表示'}\n倍率：1マス＝${s.zoom}ブロック\n形：${SHAPES.find(([k])=>k===s.shape)[1]}\nサイズ：${SIZES[s.size]}\n\n${locationText??''}`
  ,buttons:[{text:s.on?'ミニマップを隠す':'ミニマップを表示'},{text:'倍率を変える（1・2・4ブロック）'},{text:'形を変える（四角・丸）'},{text:'サイズを変える（小・中・大）'},{text:'戻る',style:'no'}]});
 if(i===undefined||i===4)return;
 if(i===0){s.on=!s.on;saveSettings(player,s);}
 else if(i===1){s.zoom=MINIMAP.zooms[(MINIMAP.zooms.indexOf(s.zoom)+1)%MINIMAP.zooms.length];saveSettings(player,s);}
 else if(i===2){s.shape=s.shape==='circle'?'square':'circle';saveSettings(player,s);}
 else{s.size=(s.size+1)%SIZES.length;saveSettings(player,s);}
 return {title:'地図',message:s.on?`ミニマップを表示しています（${SHAPES.find(([k])=>k===s.shape)[1]}・1マス＝${s.zoom}ブロック）。`:'ミニマップを隠しました。'};
}
