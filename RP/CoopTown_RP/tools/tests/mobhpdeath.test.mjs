// mob-hp.js (2026-10-30): a mob that hurts a player drops its HP tag (the death message names it by the tag), and no HP
// shows next to a player low on health.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2];
const {__listeners}=await import('@minecraft/server');
const {installMobHp}=await import(pathToFileURL(BP+'/mob-hp.js'));
installMobHp();
let playerHp=20;
const player={id:'p',typeId:'minecraft:player',getComponent:()=>({currentValue:playerHp,effectiveMax:20})};
const mk=id=>{const tags=new Set(),props={};return {id,typeId:'minecraft:zombie',isValid:true,nameTag:'',location:{x:0,y:0,z:0},
 dimension:{getPlayers:()=>[player]},getComponent:()=>({currentValue:10,effectiveMax:20}),hasTag:t=>tags.has(t),addTag:t=>tags.add(t),removeTag:t=>tags.delete(t),
 getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>{props[k]=v;}};};
const hurt=ev=>{for(const f of __listeners.entityHurt)f(ev);};
const z=mk('z1');
hurt({hurtEntity:z,damageSource:{damagingEntity:player}});assert.match(z.nameTag,/❤.*10/,'shows when hit');
hurt({hurtEntity:player,damageSource:{damagingEntity:z}});assert.strictEqual(z.nameTag,'','its own name back after it hits a player');
hurt({hurtEntity:z,damageSource:{damagingEntity:player}});assert.strictEqual(z.nameTag,'','quiet for a while');
const z2=mk('z2');playerHp=6;
hurt({hurtEntity:z2,damageSource:{damagingEntity:player}});assert.strictEqual(z2.nameTag,'','none next to a player low on health');
playerHp=20;hurt({hurtEntity:z2,damageSource:{damagingEntity:player}});assert.match(z2.nameTag,/❤/);
console.log('ok');
