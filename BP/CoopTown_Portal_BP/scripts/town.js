// The main pack announces town changes (scriptevent portal:town); only the newest unsent state is kept.
import {system} from '@minecraft/server';
import {FROM_MAIN} from './config.js';
import {enqueue} from './http.js';

export function installTown(){
 system.afterEvents.scriptEventReceive.subscribe(({id,message})=>{
  if(id!==FROM_MAIN.town)return;
  let t;try{t=JSON.parse(message);}catch{return console.warn('[Portal] portal:town の内容が JSON ではありません');}
  const level=Number.isSafeInteger(t.level)&&t.level>=0?t.level:0;
  const deliveries=(Array.isArray(t.deliveries)?t.deliveries:[]).map(d=>({item:String(d.item),have:Math.max(0,Math.floor(d.have)||0),need:Math.max(0,Math.floor(d.need)||0)}));
  const facilities=(Array.isArray(t.facilities)?t.facilities:[]).map(String);
  enqueue('town','/api/game/town',{level,deliveries,facilities},{replaceKey:'town'});
 },{namespaces:['portal']});
}
