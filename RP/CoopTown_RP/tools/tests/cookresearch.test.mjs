// cook-knowledge.js (2026-10-30): levelled cooking recipes are learned by research or a scroll; simple ones are known.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const srv=await import('@minecraft/server');
const K=await imp('cook-knowledge.js'),{COOK_RECIPES}=await imp('cook-config.js'),{SMOKE_RECIPES}=await imp('smoke-config.js');
const all=[...COOK_RECIPES,...SMOKE_RECIPES];
const props={},inv=[];
const player={id:'c1',name:'C',selectedSlotIndex:0,getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>{props[k]=v;},sendMessage(){},playSound(){},
 dimension:{getPlayers:()=>[]},getComponent:()=>({container:{size:4,getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;}}})};
const bread=COOK_RECIPES.find(r=>r.name==='パン');assert.ok(K.isStarter(bread)&&K.knows(player,bread),'the game dishes are known');
const hard=COOK_RECIPES.find(r=>r.level===10&&K.inputsOf(r).length>=3);assert.ok(hard,'a Lv.10 dish');
assert.ok(!K.knows(player,hard),'starts unknown');
const rest=K.inputsOf(hard).slice(1).map(([t])=>typeof t==='string'?t:'minecraft:x');
// a wrong guess: says how many were right, teaches nothing
let r=K.research(player,hard,['minecraft:dirt']);assert.ok(!r.ok);assert.strictEqual(r.right,0);assert.ok(!K.knows(player,hard));
// the right set teaches it
if(rest.every(t=>t.includes(':')||t==='water')){r=K.research(player,hard,rest);assert.ok(r.ok,'right set');assert.ok(K.knows(player,hard));}
// a scroll teaches another player, at their level
const props2={},inv2=[K.scrollFor(hard,player)];
const p2={...player,id:'c2',getDynamicProperty:k=>props2[k],setDynamicProperty:(k,v)=>{props2[k]=v;},getComponent:()=>({container:{size:4,getItem:i=>inv2[i],setItem:(i,v)=>{inv2[i]=v;}}})};
K.learnCookScroll(p2,all,1);assert.ok(!K.knows(p2,hard),'level too low');assert.ok(inv2[0],'kept');
K.learnCookScroll(p2,all,10);assert.ok(K.knows(p2,hard));assert.strictEqual(inv2[0],undefined,'used up');
// a cook from before keeps what their level could make
const props3={};const p3={...player,id:'c3',getDynamicProperty:k=>props3[k],setDynamicProperty:(k,v)=>{props3[k]=v;}};
K.migrateKnown(p3,{tally:{'j:cook':5},craft:{level:10}},all);assert.ok(K.knows(p3,hard));
const props4={};const p4={...player,id:'c4',getDynamicProperty:k=>props4[k],setDynamicProperty:(k,v)=>{props4[k]=v;}};
K.migrateKnown(p4,{tally:{},craft:{level:10}},all);assert.ok(!K.knows(p4,hard),'a new cook researches');
console.log('ok');
