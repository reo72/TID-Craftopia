// The ten added potions: items and pictures, unique cauldron combinations, quality scaling, and drinking them.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');
const P=await load('potion-config.js'),C=await load('cauldron-config.js'),B=await load('brew-config.js'),G=await load('game-config.js'),F=await load('food-runtime.js');
const NEW=['night_eye','swift','haste','diver','feather','vital','hearty','ironwall','shadow','homeward'];
for(const k of NEW){const p=P.potionByKey[k];assert.ok(p,k);
 assert.ok(fs.existsSync(path.join(bp,'items','potion_'+k+'.json')),k+' item');assert.ok(fs.existsSync(path.join(rp,'textures/cooptown/potions',k+'.png')),k+' picture');
 assert.strictEqual(G.ITEM_NAMES[p.id],p.name);assert.ok(B.BREW_RECIPES.some(r=>r.custom===k),k+' brewable');
 assert.strictEqual(C.experimentResult(P.POTION_EXPERIMENTS[p.name].map(i=>'minecraft:'+i)),p.name,k+' found at the cauldron');
 for(const g of p.groups)assert.ok(P.GROUPS[g],g);
 for(const [id] of p.effect.effects??[])assert.ok(P.EFFECT_NAMES[id],id);}
assert.strictEqual(P.POTIONS.length,21);
// every cauldron combination is its own, and uses only the cauldron's materials
const seen=new Map(),mats=new Set(C.MATERIALS);
for(const [n,l] of Object.entries(C.EXPERIMENTS)){const k=[...l].sort().join('|');assert.ok(!seen.has(k),`${n} = ${seen.get(k)}`);seen.set(k,n);for(const i of l)assert.ok(mats.has(i),n+' '+i);}
// quality: effect times and hunger grow, amplifiers do not
const e=P.effectAt(P.potionByKey.ironwall,4);assert.deepStrictEqual(e.effects,[['resistance',108,0],['slowness',108,0]]);
assert.strictEqual(P.effectAt(P.potionByKey.hearty,4).hunger,9);
// when they can be drunk
const cool={},st={hp:20,maxHp:20,stress:0,poisoned:false,hunger:20};
assert.strictEqual(F.blockReason(P.potionByKey.hearty,cool,st),'おなかがいっぱいです');
assert.strictEqual(F.blockReason(P.potionByKey.hearty,cool,{...st,hunger:10}),'');
for(const k of ['night_eye','shadow','homeward'])assert.strictEqual(F.blockReason(P.potionByKey[k],cool,st),'',k);
assert.ok(F.blockReason(P.potionByKey.homeward,{warp:Date.now()+60000},st).includes('帰還'));

// drinking: effects are given; the 帰還の薬 takes them to their spawn point after standing still
const props={},effects=[],tps=[],msgs=[];
const player={typeId:'minecraft:player',id:'pp',name:'REO',isValid:true,location:{x:0,y:64,z:0},dimension:{id:'minecraft:overworld',spawnParticle(){},getBiome:()=>({id:'plains'})},
 getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>{props[k]=v;},getLore:()=>[],sendMessage:m=>msgs.push(String(m)),playSound(){},getEffect:()=>undefined,
 addEffect:(id,t,o)=>effects.push([id,t,o?.amplifier??0]),teleport:(to,o)=>tps.push(to),getSpawnPoint:()=>({x:100,y:70,z:-20,dimension:{id:'minecraft:overworld'}}),
 getComponent:n=>n==='minecraft:health'?{currentValue:20,effectiveMax:20,setCurrentValue(){}}:n==='minecraft:player.hunger'?{currentValue:5}:undefined};
srv.__players.push(player);
F.installFood({game:{peek:()=>0,execute:()=>''},itemName:id=>id});
const use=k=>{const it=new srv.ItemStack(P.potionByKey[k].id,1);for(const f of srv.__listeners.itemCompleteUse)f({itemStack:it,source:player});};
use('ironwall');assert.ok(effects.some(x=>x[0]==='resistance'&&x[1]===1800)&&effects.some(x=>x[0]==='slowness'));
use('hearty');assert.ok(effects.some(x=>x[0]==='saturation'&&x[2]===7));
srv.__timeouts.length=0;use('homeward');srv.__timeouts.splice(0).forEach(f=>f());
assert.deepStrictEqual(tps.at(-1),{x:100.5,y:70,z:-19.5});
// moving calls it off
const before=tps.length;use('homeward');player.location={x:5,y:64,z:0};srv.__timeouts.splice(0).forEach(f=>f());
assert.strictEqual(tps.length,before);assert.ok(msgs.some(m=>m.includes('中止')));
console.log('potions2 ok');
