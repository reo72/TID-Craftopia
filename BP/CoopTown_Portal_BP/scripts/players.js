// Every 60 seconds: job / levels / money / titles of everyone online, read from the scoreboards and tags
// the main pack writes. A player who leaves is sent once more with online:false.
import {world,system} from '@minecraft/server';
import {CONFIG,SCORES,TAGS,JOB_IDS} from './config.js';
import {send,enqueue} from './http.js';
import {discordPost,esc,rememberName} from './discord.js';

const score=(player,name)=>{
 try{const v=world.scoreboard.getObjective(name)?.getScore(player);return Number.isSafeInteger(v)&&v>=0?v:0;}catch{return 0;}
};
export function playerInfo(player){
 const tags=player.getTags(),job=prefix=>tags.find(t=>t.startsWith(prefix))?.slice(prefix.length);
 const jobs=[job(TAGS.main),job(TAGS.sub)].filter((v,i,a)=>v&&JOB_IDS.includes(v)&&a.indexOf(v)===i).slice(0,2);
 return {
  xuid:player.id,gamertag:player.name,jobs,
  levels:{player:score(player,SCORES.player),gather:score(player,SCORES.gather),mine:score(player,SCORES.mine),craft:score(player,SCORES.craft)},
  money:score(player,SCORES.money),
  titles:tags.filter(t=>t.startsWith(TAGS.title)).map(t=>t.slice(TAGS.title.length)).filter(Boolean),
  online:true
 };
}
const lastLevel=new Map(); // xuid -> player level seen in the previous round (for the Discord level-up line)
async function sync(){
 const players=world.getAllPlayers().map(p=>{try{return playerInfo(p);}catch{return undefined;}}).filter(Boolean);
 for(const p of players){
  rememberName(p.xuid,p.gamertag);
  const before=lastLevel.get(p.xuid);lastLevel.set(p.xuid,p.levels.player);
  if(before>0&&p.levels.player>before)discordPost('levelup',`⭐ **${esc(p.gamertag)}** がレベル${p.levels.player}になりました`);
 }
 if(players.length)await send('POST','/api/game/players',{players}); // not stored: the next round sends fresh values
}
export function installPlayers(){
 // read while the player still exists, send after
 world.beforeEvents.playerLeave.subscribe(({player})=>{
  let info;try{info={...playerInfo(player),online:false};}catch{return;}
  system.run(()=>enqueue('players','/api/game/players',{players:[info]},{replaceKey:'leave:'+info.xuid}));
 });
 system.runInterval(()=>void sync(),CONFIG.playersEverySec*20);
 system.runTimeout(()=>void sync(),200);
}
