import {world,system} from '@minecraft/server';
// Counts work for the job dailies (job-daily-config.js) from anywhere: the job screens call jobCount(player, key, n).
// game-runtime.js hands over the engine at startup (bindJobCount) so the screens need not pass it around.
let engine;
export const bindJobCount=game=>{engine=game;};
export function jobCount(player,key,amount=1){
 if(!engine||!player||!(amount>0))return;
 try{engine.execute(player.id,'job.count',{key,amount:Math.min(1000,Math.floor(amount))});}catch{}
}
// Lifetime counters for the titles (titles-config.js): many small events (a step swum, a block tilled) are added up
// here and saved together every FLUSH_TICKS (one engine action per player), and when a player leaves.
const FLUSH_TICKS=200,pending=new Map(); // player id -> {adds: {key: n}, sets: {key: Set}}
const bufferOf=id=>{let b=pending.get(id);if(!b)pending.set(id,b={adds:{},sets:{},maxes:{}});return b;};
/** Adds to a lifetime counter (title.track). */
export function titleTrack(player,key,amount=1){
 if(!player?.id||!(amount>0))return;const b=bufferOf(player.id);b.adds[key]=(b.adds[key]??0)+amount;
}
/** Adds a value to a seen-set (title.track): a kind of mob, a biome, a death cause... */
export function titleSeen(player,key,value){
 if(!player?.id||value===undefined||value===null)return;const b=bufferOf(player.id);(b.sets[key]??=new Set()).add(String(value));
}
/** Keeps the best value so far (title.track maxes): the biggest fish. */
export function titleMax(player,key,value){
 if(!player?.id||!(value>0))return;const b=bufferOf(player.id);b.maxes[key]=Math.max(b.maxes[key]??0,Math.floor(value));
}
function flush(id){
 const b=pending.get(id);pending.delete(id);if(!engine||!b)return;
 const adds=Object.fromEntries(Object.entries(b.adds).map(([k,v])=>[k,Math.max(1,Math.floor(v))]).filter(([,v])=>v>0));
 const sets=Object.fromEntries(Object.entries(b.sets).map(([k,v])=>[k,[...v]]));
 const maxes=b.maxes??{};
 if(!Object.keys(adds).length&&!Object.keys(sets).length&&!Object.keys(maxes).length)return;
 try{engine.execute(id,'title.track',{adds,sets,maxes});}catch{}
}
system.runInterval(()=>{for(const id of [...pending.keys()])flush(id);},FLUSH_TICKS);
world.beforeEvents.playerLeave?.subscribe(({player})=>{const id=player.id;system.run(()=>flush(id));});
