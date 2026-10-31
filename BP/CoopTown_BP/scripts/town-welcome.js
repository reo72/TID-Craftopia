import {world,system} from '@minecraft/server';
import {inTown} from './town-bgm.js';
import {setWelcomeVisible} from './hud-info.js';
import {setFastHud} from './hud-log.js';
export const WELCOME_SEEN='cooptown:town_welcome_seen';
// 1 second fade in, 3 seconds hold, 1 second fade out. UI frames use invisible formatting codes.
export function welcomeFrame(elapsed){
 if(elapsed<0||elapsed>=5000)return '';
 const alpha=Math.max(0,Math.min(10,Math.round(Math.min(elapsed/100,(5000-elapsed)/100))));
 return '§0§1§0§2§r§'+alpha.toString(16)+'§r';
}
export function installTownWelcome(){
 const states=new Map();
 const active=p=>{const s=states.get(p.id);return s?.started!==undefined&&Date.now()-s.started<5000;};
 setWelcomeVisible(p=>{const s=states.get(p.id);return s?.started===undefined?'':welcomeFrame(Date.now()-s.started);});
 setFastHud(active);
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{
  if(initialSpawn)states.set(player.id,{ready:Date.now()+5000,seen:player.getDynamicProperty(WELCOME_SEEN)===true});
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>states.delete(playerId));
 system.runInterval(()=>{
  const now=Date.now();
  for(const p of world.getAllPlayers()){
   let s=states.get(p.id);
   if(!s){s={ready:now+5000,seen:p.getDynamicProperty(WELCOME_SEEN)===true};states.set(p.id,s);}
   if(s.seen||now<s.ready||!inTown(p.dimension.id,p.location))continue;
   try{p.setDynamicProperty(WELCOME_SEEN,true);s.seen=true;s.started=now;}
   catch(e){console.warn('[CoopTown] 歓迎表示の保存に失敗: '+e);}
  }
 },10);
}
