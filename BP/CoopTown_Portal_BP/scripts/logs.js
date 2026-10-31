// Activity log (optional on the site). join / leave / death / chat are collected and sent every 30 seconds
// as one stored batch, so a sleeping site gets them later. Block and container events are not collected
// yet: with 30 players they would be far more traffic than the rest put together.
import {world,system} from '@minecraft/server';
import {CONFIG} from './config.js';
import {enqueue} from './http.js';

const DIMS={'minecraft:overworld':'overworld','minecraft:nether':'nether','minecraft:the_end':'the_end'};
let buffer=[];
const pos=entity=>{try{const l=entity.location;return {x:Math.floor(l.x),y:Math.floor(l.y),z:Math.floor(l.z),dim:DIMS[entity.dimension.id]??'overworld'};}catch{return undefined;}};
function add(type,player,extra={}){
 if(buffer.length>=CONFIG.logsBuffer)buffer.shift();
 const e={type,at:Date.now(),xuid:player.id,gamertag:player.name,...extra};
 buffer.push(e);
}
function flush(){
 while(buffer.length){enqueue('logs','/api/game/logs',{events:buffer.slice(0,500)});buffer=buffer.slice(500);}
}
export function installLogs(){
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{if(initialSpawn)add('join',player,{pos:pos(player)});});
 world.beforeEvents.playerLeave.subscribe(({player})=>{try{add('leave',player,{pos:pos(player)});}catch{}});
 world.afterEvents.chatSend.subscribe(({sender,message})=>{const text=String(message).slice(0,500);if(text)add('chat',sender,{data:{message:text}});});
 world.afterEvents.entityDie.subscribe(({deadEntity,damageSource})=>{
  if(deadEntity.typeId!=='minecraft:player')return;
  const p=pos(deadEntity);if(!p)return;
  const k=damageSource.damagingEntity,killer=k?(k.typeId==='minecraft:player'?k.name:k.typeId):undefined;
  add('death',deadEntity,{pos:p,data:{cause:String(damageSource.cause),...(killer?{killer}:{})}});
 });
 system.runInterval(flush,CONFIG.logsEverySec*20);
}
