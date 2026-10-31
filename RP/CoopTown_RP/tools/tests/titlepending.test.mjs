// Titles that were 準備中 and now count (2026-10-30): kills while working, anvil kills, lighting dark tunnels, trial
// vaults, the mining codex, sales of ore / wood / loot. title-hooks.js counts go out through job-count.js (title.track).
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const {__listeners,__players}=await import('@minecraft/server');
const {bindJobCount}=await imp('job-count.js');
const {installTitleHooks}=await imp('title-hooks.js');
const {sellTitleKind}=await imp('npc-sell.js');
const {TITLES,ORE_BLOCKS}=await imp('titles-config.js').then(m=>({TITLES:m.TITLE_GROUPS.flatMap(g=>g.titles),ORE_BLOCKS:m.ORE_BLOCKS}));

const sent=[];bindJobCount({execute:(id,action,a)=>{if(action==='title.track')sent.push(a);}});
installTitleHooks();
const props={};
const dim={id:'minecraft:overworld',getTopmostBlock:({x,z})=>({location:{x,y:80,z}}),getBlock:()=>undefined,getEntities:()=>[],getPlayers:()=>[]};
const player={id:'p1',name:'P',typeId:'minecraft:player',dimension:dim,location:{x:0,y:20,z:0},isValid:true,
 getComponent:()=>undefined,getEffect:()=>undefined,getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>{props[k]=v;}};
__players.push(player);
const fire=(name,ev)=>{for(const f of __listeners[name]??[])f(ev);};
const flush=()=>fire('leave',{player,playerId:player.id});
const total=key=>sent.reduce((a,x)=>a+(x.adds?.[key]??0),0);
const seen=key=>new Set(sent.flatMap(x=>x.sets?.[key]??[]));

// ore broken, then a kill: 採掘中
const ore={typeId:'minecraft:deepslate_iron_ore',dimension:dim,location:{x:1,y:20,z:1}};
fire('beforeBreak',{player,block:ore});fire('afterBreak',{player,block:ore,brokenBlockPermutation:{type:{id:ore.typeId}}});
const zombie={typeId:'minecraft:zombie',dimension:dim,location:{x:2,y:20,z:2},matches:()=>true};
fire('entityDie',{deadEntity:zombie,damageSource:{cause:'entityAttack',damagingEntity:player}});
// a light under a roof, twice in the same cell (one count), once in the open (none)
const place=(id,loc)=>fire('place',{player,block:{typeId:id,location:loc,dimension:dim}});
place('minecraft:torch',{x:3,y:20,z:3});place('minecraft:torch',{x:4,y:21,z:4});
place('minecraft:torch',{x:100,y:79,z:100});
// an anvil dropped on a mob
place('minecraft:anvil',{x:10,y:25,z:10});
fire('entityDie',{deadEntity:{...zombie,location:{x:10.4,y:20,z:10.6}},damageSource:{cause:'anvil'}});
// a trial key on a vault
fire('interact',{player,block:{typeId:'minecraft:vault',location:{x:0,y:0,z:0},dimension:dim},itemStack:{typeId:'minecraft:trial_key'}});
flush();

assert.equal(total('kill_while:mine'),1);
assert.equal(total('lit_dark'),1,'one new dark cell');
assert.equal(total('kill_while:anvil'),1);
assert.equal(total('vault_open'),1);
assert.ok(seen('ore_blocks').has('deepslate_iron_ore'));
assert.equal(ORE_BLOCKS.length,20);
assert.equal(sellTitleKind('raw_iron'),'sell_ore');assert.equal(sellTitleKind('spruce_log'),'sell_wood');assert.equal(sellTitleKind('gunpowder'),'sell_loot');assert.equal(sellTitleKind('bread'),null);
// none of the wired titles is still 準備中
for(const n of ['金属探知機','底引き網漁','安全管理者','博物館','初任給','材木屋','チェーンソー','お小遣い稼ぎ','踏破者','人類未踏','二足の草鞋','バグゼロ','試練の挑戦者','海のゴミ拾い','ADHD（鉱夫）','ADHD（鍛冶師）'])
 assert.ok(!TITLES.find(t=>t.name===n)?.cond?.some(c=>c.pending),n);
console.log('ok');
