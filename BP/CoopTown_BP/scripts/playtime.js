import {world,system} from '@minecraft/server';

// Total play time per player (book menu マイプロフィール), in seconds, kept on the player.
export const PLAYTIME_KEY='cooptown:playtime';
const STEP_SECONDS=20;
export const playSeconds=player=>{try{const v=player.getDynamicProperty(PLAYTIME_KEY);return Number.isFinite(v)?v:0;}catch{return 0;}};
/** Whether the main job can still be changed for free: the first RULES.freeJobChangeSeconds of play (asked
 *  2026-10-30: change as often as you like in the first 3 hours). */
export const freeJobChange=(player,limit)=>playSeconds(player)<limit;
/** 153000 -> "42時間30分" */
export const playTimeText=s=>`${Math.floor(s/3600)}時間${Math.floor(s%3600/60)}分`;
export function installPlayTime(){
 system.runInterval(()=>{for(const p of world.getAllPlayers())try{p.setDynamicProperty(PLAYTIME_KEY,playSeconds(p)+STEP_SECONDS);}catch{}},STEP_SECONDS*20);
}
