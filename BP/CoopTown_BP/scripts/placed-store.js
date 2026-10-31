import {world} from '@minecraft/server';
// Positions of blocks players placed, kept per chunk in world dynamic properties so the
// main ledger is not rewritten for every placement. Each chunk keeps its newest entries.
const CHUNK_LIMIT=1500;
const cache=new Map();
const keyOf=(dimension,x,z)=>`cooptown:placed:${dimension}:${Math.floor(x/16)}:${Math.floor(z/16)}`;
const posOf=(x,y,z)=>`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
function load(key){
 if(cache.has(key))return cache.get(key);
 let list=[];const raw=world.getDynamicProperty(key);
 if(typeof raw==='string'){try{const v=JSON.parse(raw);if(Array.isArray(v))list=v;}catch{}}
 const set=new Set(list);cache.set(key,set);return set;
}
function save(key,set){
 if(!set.size){world.setDynamicProperty(key,undefined);return;}
 world.setDynamicProperty(key,JSON.stringify([...set]));
}
export function markPlaced(dimension,{x,y,z}){
 const key=keyOf(dimension,x,z),set=load(key),pos=posOf(x,y,z);
 set.delete(pos);set.add(pos); // newest last
 while(set.size>CHUNK_LIMIT)set.delete(set.values().next().value);
 save(key,set);
}
/** True if the block at this position was placed by a player; the record is removed. */
export function takePlaced(dimension,{x,y,z}){
 const key=keyOf(dimension,x,z),set=load(key),pos=posOf(x,y,z);
 if(!set.delete(pos))return false;
 save(key,set);return true;
}
/** True if a player placed the block at this position (the record stays). */
export function isPlaced(dimension,{x,y,z}){return load(keyOf(dimension,x,z)).has(posOf(x,y,z));}
/** Moves the old ledger format ("dimension:x,y,z" keys) into the chunk store. */
export function importLegacy(keys){
 let moved=0;
 for(const k of keys){const cut=k.lastIndexOf(':');const [x,y,z]=k.slice(cut+1).split(',').map(Number);if([x,y,z].every(Number.isFinite)){markPlaced(k.slice(0,cut),{x,y,z});moved++;}}
 return moved;
}
