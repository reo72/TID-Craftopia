// Potion buffs a player has (food-runtime.js writes them): key -> end time (ms), kept in a dynamic property.
export const BUFFS_KEY='cooptown:buffs';
export function readBuffs(player){try{const v=JSON.parse(player.getDynamicProperty(BUFFS_KEY)??'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
/** Seconds left of a buff (focus / fish / sense), 0 when none. */
export function buffLeft(player,key,now=Date.now()){const b=readBuffs(player)[key];return b&&b>now?(b-now)/1000:0;}
// 集中薬: job minigames give this much more time to answer
export const FOCUS_SCALE=1.1;
