import {world,system} from '@minecraft/server';
import {notifyAll} from './notify.js';

// The server restarts at 0:00, 6:00, 12:00 and 18:00 (Japan time; asked 2026-10-30). Everyone online gets the top
// notification bar (notify.js, kind 3 注意 with its sound) and a chat line RESTART.before minutes ahead.
export const RESTART={hours:[0,6,12,18],before:[10,5,1],checkTicks:20};
const JST=9*3600000;
/** Minutes to the next restart at ms (Japan time), or undefined when more than an hour away. */
export function minutesToRestart(ms=Date.now()){
 const d=new Date(ms+JST),now=d.getUTCHours()*60+d.getUTCMinutes();
 const next=Math.min(...RESTART.hours.map(h=>{let t=h*60-now;if(t<=0)t+=24*60;return t;}));
 return next<=60?next:undefined;
}
export function installRestartNotice(){
 const said=new Set(); // "<restart time>|<minutes>" already announced
 system.runInterval(()=>{
  const ms=Date.now(),left=minutesToRestart(ms);
  if(!RESTART.before.includes(left))return;
  const key=`${Math.floor((ms+left*60000)/60000)}|${left}`;if(said.has(key))return;said.add(key);
  if(said.size>20)said.delete(said.values().next().value);
  const text=left===1?'1分後にサーバーを再起動します':`${left}分後にサーバーを再起動します`;
  try{notifyAll(text,3,8);}catch{}
  try{world.sendMessage(`§e[お知らせ] ${text}。${left===1?'安全な場所で待ってください。':'作業を区切っておいてください。'}`);}catch{}
 },RESTART.checkTicks);
}
