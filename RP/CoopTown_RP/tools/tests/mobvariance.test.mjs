// mob-variance.js (2026-10-30): hostile mobs roll a strength, keep it as effects, show it on the HP tag, pay coins.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const srv=await import('@minecraft/server');
const V=await imp('mob-variance.js');
assert.strictEqual(V.MOB_TIERS.reduce((s,t)=>s+t.weight,0),100);
assert.strictEqual(V.rollTier(()=>0).key,'normal');assert.strictEqual(V.rollTier(()=>.999).key,'boss');assert.strictEqual(V.rollTier(()=>.8).key,'strong');
const earned=[];V.installMobVariance({game:{execute:(id,a,x)=>earned.push(x)}});
const mk=(type,fam='monster')=>{const p={},fx=[];return {typeId:type,isValid:true,fx,matches:q=>q.families?.includes(fam),getDynamicProperty:k=>p[k],setDynamicProperty:(k,v)=>{p[k]=v;},addEffect:(id,d,o)=>fx.push([id,o.amplifier]),getComponent:()=>({effectiveMax:30,setCurrentValue(){}})};};
const z=mk('minecraft:zombie');V.applyTier(z,V.MOB_TIERS.find(t=>t.key==='elite'));
assert.strictEqual(V.tierLabel(z),'精鋭');assert.deepStrictEqual(z.fx,[['health_boost',2],['strength',0]]);
const cow=mk('minecraft:cow','animal'),dragon=mk('minecraft:ender_dragon');
for(const f of srv.__listeners.entitySpawn)f({entity:cow,cause:'Spawned'}),f({entity:dragon,cause:'Spawned'});
assert.strictEqual(cow.getDynamicProperty(V.TIER_KEY),undefined);assert.strictEqual(dragon.getDynamicProperty(V.TIER_KEY),undefined,'bosses stay as they are');
const player={id:'p',typeId:'minecraft:player',sendMessage(){}};
for(const f of srv.__listeners.entityDie)f({deadEntity:z,damageSource:{damagingEntity:player}});
assert.ok(earned.some(x=>x.coins===15));
console.log('ok');
