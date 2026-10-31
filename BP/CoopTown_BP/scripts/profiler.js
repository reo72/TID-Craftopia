import {system,world} from '@minecraft/server';

// Where the script time goes (asked 2026-10-30: "ラグい"). Imported first by main.js, so every timer and event
// handler the other files register is wrapped: each one adds its run time (ms) to a row named by the file and line
// that registered it. /scriptevent cooptown:prof shows the heaviest rows and the server's ticks per second to the
// one who runs it ("reset" starts over). Date.now() counts whole ms, so a row's total is close over many runs.
const rows=new Map(); // "file:line kind" -> {ms, calls, max}
let since=Date.now(),sinceTick=0;
function where(kind){
 const line=String(new Error().stack??'').split('\n').map(s=>/([\w.-]+\.m?js):(\d+)/.exec(s)).find(m=>m&&m[1]!=='profiler.js');
 return (line?line[1]+':'+line[2]:'?')+' '+kind;
}
function wrap(fn,name){
 if(typeof fn!=='function')return fn;
 return function(...a){
  const t=Date.now();
  try{return fn.apply(this,a);}
  finally{const d=Date.now()-t,r=rows.get(name)??{ms:0,calls:0,max:0};r.ms+=d;r.calls++;if(d>r.max)r.max=d;rows.set(name,r);}
 };
}
const proto=o=>o&&Object.getPrototypeOf(o);
const done=new Set();
// patches the method where it is defined (the class prototype in game, the object itself in the tests' stubs), once
function patch(obj,method,kind,fnAt){
 let o=obj;while(o&&o!==Object.prototype&&!Object.prototype.hasOwnProperty.call(o,method))o=proto(o);
 if(!o||o===Object.prototype||done.has(o))return;
 const orig=o[method];if(typeof orig!=='function')return;
 try{o[method]=function(...a){a[fnAt]=wrap(a[fnAt],where(kind));return orig.apply(this,a);};done.add(o);}catch{}
}
patch(system,'runInterval','every',0);
patch(system,'runTimeout','once',0);
for(const [group,events] of [['after',world.afterEvents],['before',world.beforeEvents],['sys',system.afterEvents]]){
 if(!events)continue;
 for(const n of new Set([...Object.getOwnPropertyNames(proto(events)??{}),...Object.keys(events)])){
  if(n==='constructor')continue;
  let sig;try{sig=events[n];}catch{continue;}
  if(sig&&typeof sig==='object')patch(sig,'subscribe',group+':'+n,0);
 }
}
/** The report: ticks per second and the heaviest rows (ms per minute). */
export function profReport(top=12){
 const secs=Math.max(1,(Date.now()-since)/1000),tps=(system.currentTick-sinceTick)/secs;
 const list=[...rows].sort((a,b)=>b[1].ms-a[1].ms).slice(0,top);
 const total=[...rows.values()].reduce((a,r)=>a+r.ms,0);
 return [`§e計測 ${Math.round(secs)}秒  TPS ${tps.toFixed(1)}/20  スクリプト ${(total/secs).toFixed(1)}ms/秒`,
  ...list.map(([k,r])=>`§f${(r.ms/secs*60).toFixed(0)}ms/分 §7(${r.calls}回 最大${r.max}ms) §b${k}`)];
}
export function profReset(){rows.clear();since=Date.now();sinceTick=system.currentTick;}
system.afterEvents?.scriptEventReceive?.subscribe(({id,message,sourceEntity})=>{
 if(id!=='cooptown:prof')return;
 if(/reset/.test(message??'')){profReset();try{sourceEntity?.sendMessage('§7計測をリセットしました。');}catch{}return;}
 const lines=profReport();
 if(sourceEntity?.typeId==='minecraft:player')try{sourceEntity.sendMessage(lines.join('\n'));}catch{}
 console.warn('[CoopTown prof]\n'+lines.join('\n').replace(/§./g,''));
});
system.runTimeout(()=>{since=Date.now();sinceTick=system.currentTick;},1);
