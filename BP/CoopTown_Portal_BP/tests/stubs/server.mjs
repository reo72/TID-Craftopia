// Minimal @minecraft/server for testing both packs together: shared world properties, scoreboard,
// script events between packs, and a virtual clock driven by tick().
export const clock={tick:0,ms:1760000000000};
const timers=[];let timerId=0;
const at=(delay,fn,every)=>{const t={id:++timerId,due:clock.tick+Math.max(1,delay|0),fn,every};timers.push(t);return t.id;};
// like the game, world calls throw until the first tick after a (re)start
export const startup={early:false};
const guard=name=>{if(startup.early)throw new ReferenceError(`Native function [World::${name}] cannot be used in early execution.`);};
export async function tick(n=1){
 for(let i=0;i<n;i++){
  startup.early=false;clock.tick++;clock.ms+=50;
  for(const t of timers.filter(t=>t.due<=clock.tick)){
   if(t.every)t.due+=t.every;else timers.splice(timers.indexOf(t),1);
   try{t.fn();}catch(e){console.log('timer error',e);}
  }
  await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 }
}
export function resetTimers(){timers.length=0;}
Date.now=()=>clock.ms;

const scriptSubs=[];
export const system={
 run:fn=>at(1,fn),runTimeout:(fn,d)=>at(d??1,fn),runInterval:(fn,d)=>at(d??1,fn,d??1),clearRun:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);},
 sendScriptEvent(id,message){at(1,()=>{for(const s of scriptSubs){const ns=id.split(':')[0];if(!s.ns||s.ns.includes(ns))s.cb({id,message});}});},
 afterEvents:{scriptEventReceive:{subscribe(cb,opts){scriptSubs.push({cb,ns:opts?.namespaces});return cb;}}},
 beforeEvents:{startup:{subscribe(){}}}
};
export function resetScriptSubs(){scriptSubs.length=0;}
const signal=()=>{const subs=[];return {subs,subscribe(cb){subs.push(cb);return cb;},unsubscribe(cb){const i=subs.indexOf(cb);if(i>=0)subs.splice(i,1);},fire(e){for(const s of [...subs])s(e);}};};
const props=new Map(),objectives=new Map();
export const __props=props;
export const players=[];
export const world={
 getDynamicProperty:k=>{guard('getDynamicProperty');return props.get(k);},
 setDynamicProperty:(k,v)=>{guard('setDynamicProperty');if(v===undefined)props.delete(k);else{if(typeof v==='string'&&v.length>32767)throw new Error('property too long '+k);props.set(k,v);}},
 getAllPlayers:()=>{guard('getAllPlayers');return players.filter(p=>p.isValid);},
 scoreboard:{
  getObjective:n=>objectives.get(n),
  addObjective(n){const scores=new Map();const o={id:n,getScore:p=>scores.get(p.id),setScore:(p,v)=>scores.set(p.id,v),scores};objectives.set(n,o);return o;}
 },
 beforeEvents:{chatSend:signal(),playerLeave:signal()},
 afterEvents:{entityHurt:signal(),entityDie:signal(),playerLeave:signal(),playerSpawn:signal(),chatSend:signal(),playerInteractWithBlock:signal()}
};
export function resetWorldEvents(){for(const g of [world.beforeEvents,world.afterEvents])for(const s of Object.values(g))s.subs.length=0;}
export function makePlayer(id,name,entitiesAround=[]){
 const tags=new Set();const p={id,name,typeId:'minecraft:player',isValid:true,messages:[],location:{x:0,y:64,z:0},
  dimension:{id:'minecraft:overworld',getEntities:()=>entitiesAround},
  sendMessage(t){this.messages.push(String(t));},getTags:()=>[...tags],addTag:t=>tags.add(t),removeTag:t=>tags.delete(t),hasTag:t=>tags.has(t)};
 players.push(p);return p;
}
export class ItemStack{constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;}}
export const InputPermissionCategory={Camera:1,Movement:2,LateralMovement:4,Sneak:5,Jump:6,Mount:7,Dismount:8,MoveForward:9,MoveBackward:10,MoveLeft:11,MoveRight:12};
