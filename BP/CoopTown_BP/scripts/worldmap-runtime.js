import {world,system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {MAP_GLYPHS} from './map-glyphs.js';
import {tileFor,openMapSettings} from './minimap.js';
import {keepDigits} from './form-text.js';
import {PLACES} from './hud-info.js';
import {noticeDialog} from './dialog.js';

// The world map (book menu マップ, form title "ct:worldmap"): the whole explored world, per dimension. The world is
// recorded by chunk (16 x 16 blocks): the terrain of a chunk (one tile, sampled once while a player is near) is shared,
// while what each player has explored is their own (fog elsewhere). Markers: towns and the player's base (家),
// today's quests' towns (！), the player's own flags (旗), and the other players online in the same dimension
// (仲間). The map is drawn with the minimap's tile glyphs (map-glyphs.js), cols x rows cells, each ZOOMS[z]
// chunks wide.
export const WM={cols:40,rows:22,unit:8,zooms:[1,2,4,8,16],trackTicks:100,radius:2,maxExplored:6000,maxFlags:8};
export const DIMS=[['minecraft:overworld','オーバーワールド'],['minecraft:nether','ネザー'],['minecraft:the_end','エンド']];
const G=k=>MAP_GLYPHS[k]??MAP_GLYPHS['tile:blank'];
const EXP_KEY='cooptown:wm_explored',PREF_KEY='cooptown:wm_prefs';
const TERRAIN_KEY=(dim,rx,rz)=>`cooptown:wm8:${dim.replace('minecraft:','')}:${rx}:${rz}`; // world property per 64 x 64 map unit region
const active=new Set();
const ck=(x,z)=>`${x},${z}`;
const chunkOf=v=>Math.floor(v/16);
// the map's unit: one tile per 8 x 8 blocks (2 x 2 per chunk); exploring stays by chunk
const unitOf=v=>Math.floor(v/WM.unit);

// ---- terrain: one tile per map unit, kept in world properties by region ----
const regions=new Map();
function region(dim,rx,rz){const k=TERRAIN_KEY(dim,rx,rz);if(!regions.has(k)){let v={};try{v=JSON.parse(world.getDynamicProperty(k)??'{}');}catch{}regions.set(k,v);}return regions.get(k);}
const dirty=new Set();
export function terrainAt(dim,cx,cz){return region(dim,Math.floor(cx/64),Math.floor(cz/64))[ck(cx,cz)];}
function setTerrain(dim,cx,cz,tile){const rx=Math.floor(cx/64),rz=Math.floor(cz/64),r=region(dim,rx,rz);if(r[ck(cx,cz)]===tile)return;r[ck(cx,cz)]=tile;dirty.add(TERRAIN_KEY(dim,rx,rz));}
function flushTerrain(){for(const k of dirty){try{world.setDynamicProperty(k,JSON.stringify(regions.get(k)));}catch{}}dirty.clear();}
// ---- the player's explored chunks and settings ----
function explored(player){try{const v=JSON.parse(player.getDynamicProperty(EXP_KEY)??'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
const saveExplored=(player,v)=>{try{player.setDynamicProperty(EXP_KEY,JSON.stringify(v));}catch{}};
export function prefsOf(player){
 let v={};try{v=JSON.parse(player.getDynamicProperty(PREF_KEY)??'{}');}catch{}
 return {show:{town:true,quest:true,flag:true,mate:true,...(v.show??{})},base:v.base,flags:Array.isArray(v.flags)?v.flags:[],track:!!v.track};
}
const savePrefs=(player,v)=>{try{player.setDynamicProperty(PREF_KEY,JSON.stringify(v));}catch{}};

/** The map text for a view: {dim, cx, cz (centre, in map units), zoom (units per cell)}; known(cx,cz) -> explored;
 *  tile(cx,cz) -> tile key; markers [{x, z (blocks), key}]. Unexplored cells are blank (the parchment shows: fog). */
export function drawWorld({cx,cz,zoom,known,tile,markers=[]}){
 const half={c:Math.floor(WM.cols/2),r:Math.floor(WM.rows/2)},grid=[];
 for(let r=0;r<WM.rows;r++){const row=[];for(let c=0;c<WM.cols;c++){
  const x=cx+(c-half.c)*zoom,z=cz+(r-half.r)*zoom;let t;
  // a cell covers zoom x zoom units: the first explored one shows
  for(let dz=0;dz<zoom&&!t;dz++)for(let dx=0;dx<zoom&&!t;dx++)if(known(x+dx,z+dz))t=tile(x+dx,z+dz)??'void';
  row.push(t?G('tile:'+t):G('tile:blank'));}grid.push(row);}
 for(const m of markers){const c=Math.floor((unitOf(m.x)-cx)/zoom)+half.c,r=Math.floor((unitOf(m.z)-cz)/zoom)+half.r;
  if(r>=0&&c>=0&&r<WM.rows&&c<WM.cols)grid[r][c]=G('marker:'+m.key);}
 return grid.map(r=>r.join('')).join('\n');
}

export function installWorldMap({game}){
 // explore around every player every few seconds; sample terrain for chunks not seen yet (one ray each)
 system.runInterval(()=>{
  const budget={n:120};
  for(const player of world.getAllPlayers())try{track(player,budget);}catch(e){console.warn('[CoopTown] ワールドマップ記録: '+e);}
  flushTerrain();
 },WM.trackTicks);
 // marks the chunks around the player explored and samples terrain not seen yet (budget.n rays at most)
 function track(player,budget){
   const dim=player.dimension.id,ex=explored(player),list=ex[dim]??[],set=new Set(list);let added=false;
   const pcx=chunkOf(player.location.x),pcz=chunkOf(player.location.z);
   for(let dz=-WM.radius;dz<=WM.radius;dz++)for(let dx=-WM.radius;dx<=WM.radius;dx++){
    const x=pcx+dx,z=pcz+dz,k=ck(x,z);
    if(!set.has(k)){set.add(k);list.push(k);added=true;}
    for(let u=0;u<4;u++){const ux=x*2+(u&1),uz=z*2+(u>>1);
    if(budget.n>0&&terrainAt(dim,ux,uz)===undefined){budget.n--;
     try{const bx=ux*WM.unit+4,bz=uz*WM.unit+4;let b;
      if(dim==='minecraft:nether'){b=player.dimension.getBlock({x:bx,y:Math.floor(player.location.y)-1,z:bz});}
      else{try{b=player.dimension.getTopmostBlock({x:bx,z:bz});}catch{}
       if(!b){const top=(player.dimension.heightRange?.max??320)-1;const hit=player.dimension.getBlockFromRay({x:bx+.5,y:top,z:bz+.5},{x:0,y:-1,z:0},{includeLiquidBlocks:true,includePassableBlocks:false,maxDistance:400});b=hit?.block;}}
      if(b)setTerrain(dim,ux,uz,tileFor(b.typeId));}catch{}}}
   }
   if(added){ex[dim]=list.slice(-WM.maxExplored);saveExplored(player,ex);}
 }

 function markersFor(player,dim,prefs){
  const m=[];
  if(prefs.show.town){for(const p of PLACES)if(p.dimension===dim)m.push({x:(p.from.x+p.to.x)/2,z:(p.from.z+p.to.z)/2,key:'landmark'});
   if(prefs.base&&prefs.base.dim===dim)m.push({x:prefs.base.x,z:prefs.base.z,key:'base'});}
  let db={};try{db=game.peek(d=>({town:d.town?.location,landmarks:d.landmarks??[],events:d.events??[]}));}catch{}
  if(prefs.show.town){if(db.town?.dimension===dim)m.push({x:db.town.x,z:db.town.z,key:'landmark'});
   for(const l of db.landmarks??[])if(l.location?.dimension===dim)m.push({x:l.location.x,z:l.location.z,key:'landmark'});}
  if(prefs.show.quest){const now=Date.now();for(const e of db.events??[])if(e.start<=now&&e.end>now&&e.location?.dimension===dim)m.push({x:e.location.x,z:e.location.z,key:'event'});}
  if(prefs.show.flag)for(const f of prefs.flags)if(f.dim===dim)m.push({x:f.x,z:f.z,key:'landmark_found'});
  if(prefs.show.mate)for(const o of world.getAllPlayers())if(o.id!==player.id&&o.dimension.id===dim)m.push({x:o.location.x,z:o.location.z,key:'player'});
  if(player.dimension.id===dim)m.push({x:player.location.x,z:player.location.z,key:'player'});
  return m;
 }
 // Button order of the screen. Must match tools/build-worldmap-ui.mjs in the RP. Marks: [on] chosen tab / shown
 // marker kind, [off] disabled.
 const L={tab:0,help:3,close:4,show:5,track:9,setBase:10,flag:11,minus:12,all:13,plus:14,here:15,up:16,down:17,left:18,right:19,map:20,coords:21,info:22,mini:23,count:24};
 const KINDS=[['town','街・施設'],['quest','依頼'],['flag','目印'],['mate','仲間']];
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  try{track(player,{n:200});flushTerrain();}catch(e){console.warn('[CoopTown] ワールドマップ記録: '+e);}
  const state={dim:Math.max(0,DIMS.findIndex(d=>d[0]===player.dimension.id)),zoom:1,cx:unitOf(player.location.x),cz:unitOf(player.location.z),notice:''};let busy=0;
  try{
   for(;;){
    const prefs=prefsOf(player),[dim,dimName]=DIMS[state.dim],ex=new Set(explored(player)[dim]??[]),zoom=WM.zooms[state.zoom];
    const text=drawWorld({cx:state.cx,cz:state.cz,zoom,known:(x,z)=>ex.has(ck(Math.floor(x/2),Math.floor(z/2))),tile:(x,z)=>terrainAt(dim,x,z),markers:markersFor(player,dim,prefs)});
    const buttons=[];const add=t=>buttons.push(t);
    DIMS.forEach((d,k)=>add((k===state.dim?'[on]':'')+d[1]));
    add('？');add('×');
    KINDS.forEach(([k,label])=>add((prefs.show[k]?'[on]':'')+label));
    add(prefs.base?(prefs.track?'[on]追跡中':'追跡する'):'[off]追跡する');add('ここを拠点にする');add('ここに目印を立てる');
    add('－');add('全体表示');add('＋');add('現在地へ');add('▲');add('▼');add('◀');add('▶');
    add('wm:'+text);
    const px=Math.floor(player.location.x),pz=Math.floor(player.location.z);
    add(`X: ${px}　Z: ${pz}`);
    add(state.notice||`探索 ${ex.size}チャンク
1マス ${zoom*WM.unit}ブロック`+(prefs.base?`\n拠点 X:${Math.floor(prefs.base.x)} Z:${Math.floor(prefs.base.z)}`:'\n拠点：未登録'));
    add('ミニマップ設定');
    state.notice='';
    const form=new ActionFormData().title('ct:worldmap').body('');for(const t of buttons)form.button(keepDigits(t));
    const r=await form.show(player);
    if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(res=>system.runTimeout(res,10));continue;}return;}
    busy=0;const i=r.selection,step=Math.max(1,Math.floor(WM.cols/4))*zoom;
    if(i<L.help){state.dim=i;if(DIMS[i][0]===player.dimension.id){state.cx=unitOf(player.location.x);state.cz=unitOf(player.location.z);}else{state.cx=0;state.cz=0;}}
    else if(i===L.help)await noticeDialog(player,'ワールドマップ','行った場所だけが地図に残ります（霧は自分専用）。\n家：街と拠点　！：依頼の街　旗：自分の目印　矢印：仲間と自分\n▲▼◀▶で動かし、－＋で縮尺を変えます。「ここを拠点にする」で今いる場所が拠点になり、「追跡する」でHUDのミニマップに拠点を出します。',{close:'戻る'});
    else if(i===L.close)return;
    else if(i===L.mini){const r=await openMapSettings(player);if(r?.message)state.notice=r.message;}
    else if(i>=L.show&&i<L.track){const k=KINDS[i-L.show][0];prefs.show[k]=!prefs.show[k];savePrefs(player,prefs);}
    else if(i===L.track){if(prefs.base){prefs.track=!prefs.track;savePrefs(player,prefs);}else state.notice='§c先に拠点を登録してください';}
    else if(i===L.setBase){prefs.base={dim:player.dimension.id,x:player.location.x,z:player.location.z};savePrefs(player,prefs);state.notice='§a今いる場所を拠点にしました';}
    else if(i===L.flag){prefs.flags.push({dim:player.dimension.id,x:player.location.x,z:player.location.z});prefs.flags=prefs.flags.slice(-WM.maxFlags);savePrefs(player,prefs);state.notice=`§a目印を立てました（最大${WM.maxFlags}本、古い順に消えます）`;}
    else if(i===L.minus)state.zoom=Math.min(WM.zooms.length-1,state.zoom+1);
    else if(i===L.plus)state.zoom=Math.max(0,state.zoom-1);
    else if(i===L.all){// fit everything explored
     const pts=[...ex].map(k=>k.split(',').map(v=>Number(v)*2+1));if(pts.length){const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
      state.cx=Math.round((Math.min(...xs)+Math.max(...xs))/2);state.cz=Math.round((Math.min(...zs)+Math.max(...zs))/2);
      const need=Math.max((Math.max(...xs)-Math.min(...xs))/WM.cols,(Math.max(...zs)-Math.min(...zs))/WM.rows);state.zoom=Math.max(0,WM.zooms.findIndex(z=>z>=need));if(state.zoom<0)state.zoom=WM.zooms.length-1;}}
    else if(i===L.here){state.cx=unitOf(player.location.x);state.cz=unitOf(player.location.z);state.dim=Math.max(0,DIMS.findIndex(d=>d[0]===player.dimension.id));}
    else if(i===L.up)state.cz-=step;else if(i===L.down)state.cz+=step;else if(i===L.left)state.cx-=step;else if(i===L.right)state.cx+=step;
   }
  }catch(e){console.warn('[CoopTown] ワールドマップ: '+e);}
  finally{active.delete(player.id);}
 }
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
 return {openWorldMap:player=>open(player)};
}
