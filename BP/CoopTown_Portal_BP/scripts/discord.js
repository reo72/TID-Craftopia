// Game events posted to a Discord channel through a webhook (variables.json "discord_webhook_url").
// Lines are collected and sent together every few seconds (Discord limits how often a webhook may post);
// failed posts are kept and tried again. Mentions are switched off, so chat can't ping @everyone.
// Which events are posted: variables.json "discord_events" (default: all of DISCORD_EVENTS).
import {world,system} from '@minecraft/server';
import {http,HttpRequest,HttpHeader,HttpRequestMethod} from '@minecraft/server-net';
import {variables} from '@minecraft/server-admin';

export const DISCORD_EVENTS=['server','join','leave','death','chat','levelup','quest'];
const FLUSH_TICKS=100,MAX_LEN=1900,MAX_LINES=300;
let buffer=[],sending=false,waitUntil=0;
const names=new Map(); // player id -> name, for quest messages about players who are offline

function setting(name){try{return variables.get(name);}catch{return undefined;}}
function webhook(){const u=setting('discord_webhook_url');return typeof u==='string'&&/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(u)?u:undefined;}
function enabled(kind){const list=setting('discord_events');return (Array.isArray(list)?list:DISCORD_EVENTS).includes(kind);}
/** Discord markdown in names and chat is shown as typed. */
export const esc=text=>String(text).replace(/([\\*_~`|>#\-\[\]()])/g,'\\$1');
export const nameOf=id=>names.get(id)??'?';
/** Queue one line for Discord (dropped when the kind is switched off or no webhook is set). */
export function discordPost(kind,line){
 if(!webhook()||!enabled(kind))return;
 buffer.push(String(line).slice(0,500));
 if(buffer.length>MAX_LINES)buffer.splice(0,buffer.length-MAX_LINES);
}
async function flush(){
 const url=webhook();if(!url||sending||!buffer.length||Date.now()<waitUntil)return;
 let content='',count=0;
 for(const line of buffer){if(content.length+line.length+1>MAX_LEN)break;content+=(count?'\n':'')+line;count++;}
 if(!count){buffer.shift();return;} // a single line longer than a message: drop it
 sending=true;
 try{
  const req=new HttpRequest(url);req.method=HttpRequestMethod.Post;req.timeout=10;
  req.headers=[new HttpHeader('Content-Type','application/json')];
  req.body=JSON.stringify({content,allowed_mentions:{parse:[]}});
  const res=await http.request(req);
  if(res.status>=200&&res.status<300)buffer.splice(0,count);
  else if(res.status===429){let after=5;try{after=Number(JSON.parse(res.body).retry_after)||5;}catch{}waitUntil=Date.now()+after*1000;}
  else if(res.status>=400&&res.status<500){console.warn(`[Portal] Discord への投稿が拒否されました（${res.status}）。discord_webhook_url を確認してください。`);buffer.splice(0,count);}
  else waitUntil=Date.now()+15000;
 }catch{waitUntil=Date.now()+15000;}
 finally{sending=false;}
}
const CAUSES={entityAttack:'倒されました',projectile:'撃たれました',fall:'落下しました',lava:'溶岩に落ちました',fire:'燃えました',fireTick:'燃え尽きました',drowning:'溺れました',suffocation:'窒息しました',starve:'餓死しました',void:'奈落に落ちました',entityExplosion:'爆発に巻き込まれました',blockExplosion:'爆発に巻き込まれました',freezing:'凍えました',lightning:'雷に打たれました',magic:'魔法で倒されました',wither:'衰弱しました',contact:'トゲに刺さりました'};
export function installDiscord(){
 const remember=p=>{try{names.set(p.id,p.name);}catch{}};
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{remember(player);if(initialSpawn)discordPost('join',`📥 **${esc(player.name)}** が参加しました`);});
 world.beforeEvents.playerLeave.subscribe(({player})=>{let name;try{name=player.name;}catch{return;}system.run(()=>discordPost('leave',`📤 **${esc(name)}** が退出しました`));});
 world.afterEvents.chatSend.subscribe(({sender,message})=>{const text=String(message).trim();if(text)discordPost('chat',`💬 **${esc(sender.name)}**：${esc(text.slice(0,300))}`);});
 world.afterEvents.entityDie.subscribe(({deadEntity,damageSource})=>{
  if(deadEntity.typeId!=='minecraft:player')return;
  const k=damageSource.damagingEntity,by=k?(k.typeId==='minecraft:player'?k.name:k.typeId.replace('minecraft:','')):undefined;
  discordPost('death',`💀 **${esc(deadEntity.name)}** が${by?`${esc(by)}に`:''}${CAUSES[damageSource.cause]??'倒れました'}`);
 });
 system.run(()=>{for(const p of world.getAllPlayers())remember(p);}); // world calls are not allowed during startup
 system.runInterval(()=>void flush(),FLUSH_TICKS);
 system.runTimeout(()=>discordPost('server','🟢 サーバーが起動しました'),40);
}
export const rememberName=(id,name)=>{if(id&&name)names.set(id,name);};
