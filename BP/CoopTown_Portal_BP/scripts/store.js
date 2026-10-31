// JSON values kept in world dynamic properties. Values longer than one property holds are split.
import {world} from '@minecraft/server';
const CHUNK=30000;
const parts=raw=>typeof raw==='string'&&raw.startsWith('#chunks:')?Number(raw.slice(8))||0:0;
export function load(key,fallback){
 try{
  const raw=world.getDynamicProperty(key);if(raw===undefined)return fallback;
  const n=parts(raw);if(!n)return JSON.parse(raw);
  let text='';for(let i=0;i<n;i++)text+=world.getDynamicProperty(`${key}#${i}`)??'';
  return JSON.parse(text);
 }catch(e){console.warn(`[Portal] ${key} の読み込みに失敗しました: ${e}`);return fallback;}
}
export function save(key,value){
 const text=JSON.stringify(value),old=parts(world.getDynamicProperty(key));let n=0;
 if(text.length<=CHUNK)world.setDynamicProperty(key,text);
 else{n=Math.ceil(text.length/CHUNK);for(let i=0;i<n;i++)world.setDynamicProperty(`${key}#${i}`,text.slice(i*CHUNK,(i+1)*CHUNK));world.setDynamicProperty(key,'#chunks:'+n);}
 for(let i=n;i<old;i++)world.setDynamicProperty(`${key}#${i}`,undefined);
}
