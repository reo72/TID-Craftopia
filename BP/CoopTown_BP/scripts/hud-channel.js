import {world} from '@minecraft/server';

// What the HUD shows besides the log (asked 2026-11-01: the HUD flickered). The minimap, the hotbar / profile / party
// marks, the top notification bar's marks and the fishing panel used to travel in the action bar. The game builds the
// action bar's controls again for every message (and drops them 3 s after the last one), so every map update rebuilt
// the whole HUD and it flickered. Now they travel in the title's subtitle (hud-log.js), which the RP reads through
// global bindings on controls that stay: a new text only changes what they show.
// This module only keeps the texts; hud-log.js sends them (setHudSender). It imports nothing of the game, so any
// module can use it.
//  - payload: 'ctmap:' + map rows + marks (minimap.js), or 'ctfsh:' + marks (reel-game.js)
//  - announcement: the big text in the middle of the screen (was a vanilla title, which replaced the subtitle and
//    so hid the whole HUD for its duration)
const payloads=new Map(),announcements=new Map();
let sender=()=>{};
/** hud-log.js: send(player, fresh) puts the current texts on screen (fresh: read the info lines again). */
export function setHudSender(fn){sender=fn;}
/** The payload part of a player's subtitle ('' when none yet). */
export const hudPayload=player=>payloads.get(player.id)??'';
/** Sets the payload; sent at once when it changed (force: send even when the same). */
export function setHudPayload(player,text,force=false){
 const t=String(text??'');
 if(!force&&payloads.get(player.id)===t)return;
 payloads.set(player.id,t);
 try{sender(player);}catch(e){console.warn('[CoopTown] HUD: '+e);}
}
const oneLine=t=>String(t??'').replace(/\s*\n\s*/g,' ').trim();
/** Shows a big text (and a smaller one under it) in the middle of the screen for ms. */
export function announce(player,main,sub='',ms=3000){
 announcements.set(player.id,{main:oneLine(main),sub:oneLine(sub),until:Date.now()+Math.max(500,ms)});
 try{sender(player,true);}catch(e){console.warn('[CoopTown] HUD: '+e);}
}
/** The same for everyone online. */
export function announceAll(main,sub='',ms=3000){for(const p of world.getAllPlayers())announce(p,main,sub,ms);}
/** The announcement on screen for a player ({main, sub}), or undefined. Drops it once over. */
export function announcementOf(player,now=Date.now()){
 const a=announcements.get(player.id);if(!a)return undefined;
 if(now>=a.until){announcements.delete(player.id);return undefined;}
 return a;
}
/** Whether an announcement ended since it was sent (hud-log.js resends then). */
export function announcementExpired(player,now=Date.now()){const a=announcements.get(player.id);return !!a&&now>=a.until;}
export function forgetHud(playerId){payloads.delete(playerId);announcements.delete(playerId);}
