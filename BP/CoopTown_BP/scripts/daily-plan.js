import {DAILY} from './game-config.js';
import {JOB_DAILY} from './job-daily-config.js';

// Each player's dailies (asked 2026-10-30: different for every player): every day, picked by the player's id and the
// day, so the same all day and for the engine and the book alike. The common ones: COMMON_COUNT of COMMON_POOL (the
// first DAILY.length slots of the claim list, as before); the job ones: JOB_PICK of the main job's pool, their targets
// a little higher or lower for each player. Keys are the engine's daily counts (job.count keys as "j:<key>").
export const COMMON_COUNT=DAILY.length,JOB_PICK=3;
export const COMMON_POOL=[...DAILY,
 ['クラフト台でたくさん製作する','craft',8],['街へ素材を3回届ける','town',3],['釣りをする','j:fish',3],['作物を収穫する','j:harvest',10],
 ['バイオームを訪れる','j:biome',2],['異なる敵種を討伐する','j:kill_kinds',2],['料理を作る','j:cook',2],['依頼を2つ達成する','quest',2]];
const hash=s=>[...String(s)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
/** n of list, picked by seed (no repeats, list order kept). */
function pick(list,n,seed){
 const order=list.map((x,i)=>[hash(seed+'|'+i),i]).sort((a,b)=>a[0]-b[0]).slice(0,n).map(([,i])=>i).sort((a,b)=>a-b);
 return order.map(i=>list[i]);
}
/** A player's common dailies for a day: [[label, key, target], ...] (COMMON_COUNT of them). */
export const commonDailies=(id,day)=>pick(COMMON_POOL,COMMON_COUNT,`c|${id}|${day}`);
/** A player's job dailies for a day (job-daily-config.js format, targets varied 0.8x-1.4x; 1 stays 1). */
export function jobDailies(id,day,job){
 const pool=JOB_DAILY[job]??[];
 return pick(pool,Math.min(JOB_PICK,pool.length),`j|${id}|${day}|${job}`).map((t,k)=>{
  if(t[2]<=1)return t;
  const f=[.8,1,1,1.2,1.4][hash(`t|${id}|${day}|${k}`)%5],target=Math.max(1,Math.round(t[2]*f));
  return [t[0],t[1],target,...t.slice(3)];
 });
}
