// Job ranks (Notion「食べ物・ポーション」): 初級 / 中級 / 上級 by the job's skill level, and the base quality odds a rank
// gives (料理人: cooking, 調合師: brewing). The rank also unlocks recipes. The same level steps as the rune workshop's
// strength caps (rune-runtime.js capFor).
export const RANKS=['初級','中級','上級'];
export const RANK_LEVELS=[1,5,15];
export const rankOf=level=>level>=RANK_LEVELS[2]?2:level>=RANK_LEVELS[1]?1:0;
// [D, C, B, A, S] chances per job rank (初級 / 中級 / 上級); MAX_RANK: the best quality rank each job rank can make
export const COOK_ODDS=[[.7,.3,0,0,0],[.35,.35,.22,.08,0],[.15,.3,.3,.18,.07]];
export const BREW_ODDS=[[.75,.25,0,0,0],[.4,.35,.18,.07,0],[.2,.3,.3,.15,.05]];
export const MAX_RANK=[1,3,4];
/** The odds after the bonus (0-0.5: good ingredients, minigame, dexterity): that share of each rank moves up one,
 *  never above the job rank's MAX_RANK. */
export function oddsWith(table,rank,bonus=0){
 const o=[...table[rank]],up=Math.max(0,Math.min(.5,bonus)),top=MAX_RANK[rank]??4;
 for(let t=top-1;t>=0;t--){const m=o[t]*up;o[t]-=m;o[t+1]+=m;}
 return o;
}
/** Rolls a quality rank (0-4) from odds. */
export function rollOdds(odds,random=Math.random){let r=random();for(let t=0;t<odds.length;t++){if(r<odds[t])return t;r-=odds[t];}return 0;}
export const oddsText=odds=>['D','C','B','A','S'].map((t,k)=>odds[k]>0?`${t}${Math.round(odds[k]*100)}%`:'').filter(Boolean).join('・');
