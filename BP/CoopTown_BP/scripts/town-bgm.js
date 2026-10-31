import {world,system} from '@minecraft/server';
import {PLACES,setBgmPlaying} from './hud-info.js';
import {prefs,savePrefs} from './prefs.js';

// Town music (asked 2026-10-27): the first town's music for the players in it (the boxes of hud-info.js PLACES
// 最初の町, the ones the biome line shows). The user's track "The City of Light and Water" (2026-10-30; the first 10
// minutes of their mp3) loops for as long as they stay.
// The game cannot change the volume of a sound that is playing, and a long sound did not get quieter with distance
// (2026-10-30, seen in game). So the track is cut into TOWN_BGM.pieces pieces of pieceTicks (RP
// sounds/cooptown/bgm/city/NN.ogg, each a little longer with short fades, so they overlap and cross-fade) and every
// Each previous piece is explicitly stopped before the next to avoid persistent overlap after UI stalls.
// The next piece is played at the volume for where the player is then: the player's setting (prefs.js bgmVolume, the book's
// 設定 page) inside the town, less and less over fade blocks outside it, and nothing after that, when it stops.
// Coming back, it starts again from the beginning. It is played at the player (sounds played from far away were
// never heard). /scriptevent cooptown:bgmtest plays a piece and a game track, for finding out what is wrong.
export const TOWN_BGM={place:'最初の町',pieces:60,pieceTicks:200,fade:96,joinWaitMs:5000,checkTicks:20};
export const bgmSound=name=>'cooptown.town_bgm.'+name;
export const pieceSound=i=>bgmSound('city_'+String(i).padStart(2,'0'));
const boxes=(places=PLACES)=>places.filter(p=>p.name===TOWN_BGM.place);
/** Whether a place is in one of the town's boxes, grown by margin blocks on every side (x / z). */
export function inTown(dim,loc,margin=0,places=PLACES){
 const inside=(v,a,c)=>v>=Math.min(a,c)-margin&&v<=Math.max(a,c)+1+margin;
 return boxes(places).some(b=>b.dimension===dim&&inside(loc.x,b.from.x,b.to.x)&&inside(loc.z,b.from.z,b.to.z));
}
/** How far outside the town a place is (x / z, blocks; 0 inside, Infinity in another dimension). */
export function outside(dim,loc,places=PLACES){
 let best=Infinity;
 for(const b of boxes(places)){
  if(b.dimension!==dim)continue;
  const d=(v,a,c)=>Math.max(Math.min(a,c)-v,0,v-(Math.max(a,c)+1));
  best=Math.min(best,Math.hypot(d(loc.x,b.from.x,b.to.x),d(loc.z,b.from.z,b.to.z)));
 }
 return best;
}
/** The share of the player's volume at a distance outside the town: 1 inside, down to 0 at TOWN_BGM.fade. */
export const fadeAt=d=>Math.max(0,Math.min(1,1-d/TOWN_BGM.fade));
const isOff=player=>{const p=prefs(player);return !p.bgm||p.bgmVolume<=0;};
let refresh=()=>{},installed;
/** The settings page changed the player's music: turned off stops it now; a new volume applies from the next piece. */
export const refreshBgm=player=>refresh(player);
export function installTownBgm({game}){
 if(installed)return installed;
 // timed by the clock, not by ticks (2026-10-31: "sometimes it goes quiet": when the server lagged, the ticks ran
 // slower than the sound, a piece ended before the next began and there was a gap)
 const pieceMs=TOWN_BGM.pieceTicks*50;
 const playing=new Map(); // player id -> {piece (index playing now), next (Date.now() of the next piece)}
 setBgmPlaying(player=>playing.has(player.id)); // the HUD's music sign
 // just logged in: wait a moment first (2026-10-30: logging in inside the town, the sound went out before the
 // player's game was ready and was never heard)
 const joined=new Map(); // player id -> when the music may start (ms)
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{if(initialSpawn){joined.set(player.id,Date.now()+TOWN_BGM.joinWaitMs);playing.delete(player.id);}});
 const sounding=new Map(),testingUntil=new Map();
 const stopSound=(player,id)=>{try{player.runCommand(`stopsound @s ${id}`);}catch{}};
 const stop=player=>{const id=sounding.get(player.id);if(id)stopSound(player,id);sounding.delete(player.id);playing.delete(player.id);};
 // Clear only our own sound IDs, including leftovers from a reload or a paused client.
 const clearTown=player=>{stop(player);for(let i=0;i<TOWN_BGM.pieces;i++)stopSound(player,pieceSound(i));stopSound(player,bgmSound('sweden'));};
 const play=(player,piece,share)=>{
  const old=sounding.get(player.id);if(old)stopSound(player,old);
  sounding.delete(player.id);
  try{const id=pieceSound(piece);player.playSound(id,{volume:prefs(player).bgmVolume/100*share});sounding.set(player.id,id);}
  catch(e){console.warn('[CoopTown] 街のBGM: '+e);}
 };
 refresh=player=>{if(isOff(player))stop(player);};
 // a line in chat when it starts, so it is clear the music was asked for (2026-10-30: "聞こえない")
 const begin=player=>{clearTown(player);play(player,0,1);playing.set(player.id,{piece:0,next:Date.now()+pieceMs});
  try{player.sendMessage('§7♪ 街のBGM（手帳の設定で音量・オンオフ）');}catch{}};
 // starting: every checkTicks; the next piece: on its own tick
 system.runInterval(()=>{
  const now=Date.now(),tick=system.currentTick,check=tick%TOWN_BGM.checkTicks===0;
  for(const player of world.getAllPlayers()){
   if(now<(testingUntil.get(player.id)??0))continue;
   if(isOff(player)){stop(player);continue;}
   const s=playing.get(player.id);
   if(!s){
    if(!check||now<(joined.get(player.id)??0)||isOff(player))continue;
    if(inTown(player.dimension.id,player.location))begin(player);
    continue;
   }
   if(now<s.next)continue;
   const share=fadeAt(outside(player.dimension.id,player.location));
   if(share<=0){stop(player);continue;}
   // a long stall: carry on from now rather than playing the missed pieces in a burst
   s.piece=(s.piece+1)%TOWN_BGM.pieces;s.next=now+pieceMs;play(player,s.piece,share);
  }
 },1);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{playing.delete(playerId);joined.delete(playerId);sounding.delete(playerId);testingUntil.delete(playerId);});
 system.afterEvents?.scriptEventReceive?.subscribe(({id,sourceEntity:p})=>{
  if(id!=='cooptown:bgmtest'||p?.typeId!=='minecraft:player')return;
  clearTown(p);testingUntil.set(p.id,Date.now()+20000);
  try{p.playSound(pieceSound(0),{volume:1});p.sendMessage('§e[BGMテスト] 1. 町の曲の最初の10秒を鳴らしました（10秒後にマイクラの曲）');}catch(e){p.sendMessage('§c[BGMテスト] 1. 失敗：'+e);}
  system.runTimeout(()=>{try{stopSound(p,pieceSound(0));p.playSound(bgmSound('sweden'),{volume:1});p.sendMessage('§e[BGMテスト] 2. マイクラの曲（sweden）を鳴らしました');}catch(e){p.sendMessage('§c[BGMテスト] 2. 失敗：'+e);}},200);
 });
 installed={toggle(player){const pr=prefs(player);pr.bgm=!pr.bgm;savePrefs(player,pr);refresh(player);
  player.sendMessage(pr.bgm?'§a街のBGMをオンにしました。':'§7街のBGMをオフにしました（/cooptown:bgm か手帳の設定でオンに戻せます）。');}};
 return installed;
}
