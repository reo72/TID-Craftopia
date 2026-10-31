// Personal bestiary for the site. Friendly mobs are "met" within a few blocks of the player (a few players
// are checked every 2 seconds); hostile mobs are "killed" by the finishing player and anyone who hit them in
// the last 10 seconds. Progress is kept in this pack's own world properties; changes wait in a pending list
// and are sent every 20 seconds (removed only after the site accepted them, so re-sending is harmless).
import {world,system} from '@minecraft/server';
import {CONFIG,FRIENDLY,HOSTILE} from './config.js';
import {send,ok} from './http.js';
import {load,save} from './store.js';

const PENDING='portal:best_pending',key=id=>'portal:best:'+id;
const cache=new Map();
const book=id=>{if(!cache.has(id))cache.set(id,load(key(id),{met:{},kills:{}}));return cache.get(id);}; // kills: mobId -> [firstAt, count]
let pending=null;const pend=()=>pending??=load(PENDING,[]);
function mark(xuid,mobId){const list=pend();if(!list.some(([x,m])=>x===xuid&&m===mobId)){list.push([xuid,mobId]);save(PENDING,list);}}

function met(player,mobId){const b=book(player.id);if(b.met[mobId])return;b.met[mobId]=Date.now();save(key(player.id),b);mark(player.id,mobId);}
function killed(xuid,mobId){const b=book(xuid),k=b.kills[mobId]??[Date.now(),0];k[1]++;b.kills[mobId]=k;save(key(xuid),b);mark(xuid,mobId);}

let turn=0;
function scan(){
 const players=world.getAllPlayers();if(!players.length)return;
 for(let i=0;i<Math.min(CONFIG.bestiaryScanPlayers,players.length);i++){
  const player=players[(turn++)%players.length];
  try{
   const seen=book(player.id).met;
   for(const e of player.dimension.getEntities({location:player.location,maxDistance:CONFIG.bestiaryRadius}))
    if(FRIENDLY.has(e.typeId)&&!seen[e.typeId])met(player,e.typeId);
  }catch{}
 }
}
const hits=new Map(); // mob entity id -> {playerId: time}
function hurt({hurtEntity,damageSource}){
 const attacker=damageSource.damagingEntity;
 if(attacker?.typeId!=='minecraft:player'||!HOSTILE.has(hurtEntity.typeId))return;
 const entry=hits.get(hurtEntity.id)??{};entry[attacker.id]=Date.now();hits.set(hurtEntity.id,entry);
 if(hits.size>500)hits.delete(hits.keys().next().value);
}
function die({deadEntity,damageSource}){
 let type,id;try{type=deadEntity.typeId;id=deadEntity.id;}catch{return;}
 const helpers=hits.get(id)??{};hits.delete(id);
 if(!HOSTILE.has(type))return;
 const credit=new Set(Object.entries(helpers).filter(([,at])=>Date.now()-at<=CONFIG.assistMs).map(([p])=>p));
 const last=damageSource.damagingEntity;if(last?.typeId==='minecraft:player')credit.add(last.id);
 for(const xuid of credit)killed(xuid,type);
}
let sending=false;
async function flush(){
 const list=pend();if(sending||!list.length)return;sending=true;
 try{
  const batch=list.slice(0,CONFIG.bestiaryBatch),entries=[];
  for(const [xuid,mobId] of batch){
   const b=book(xuid);
   if(b.kills[mobId])entries.push({xuid,mobId,kind:'killed',at:b.kills[mobId][0],kills:b.kills[mobId][1]});
   else if(b.met[mobId])entries.push({xuid,mobId,kind:'met',at:b.met[mobId]});
  }
  const {status}=entries.length?await send('POST','/api/game/bestiary',{entries}):{status:200};
  if(ok(status)||status===400){ // 400 can't be fixed by re-sending: drop it (the reason is in the log)
   const done=new Set(batch.map(([x,m])=>x+'|'+m));pending=pend().filter(([x,m])=>!done.has(x+'|'+m));save(PENDING,pending);
  }
 }finally{sending=false;}
}
export function installBestiary(){
 system.runInterval(scan,CONFIG.bestiaryScanTicks);
 world.afterEvents.entityHurt.subscribe(hurt);
 world.afterEvents.entityDie.subscribe(die);
 system.runInterval(()=>void flush(),CONFIG.bestiarySendSec*20);
 world.afterEvents.playerLeave.subscribe(({playerId})=>cache.delete(playerId));
}
