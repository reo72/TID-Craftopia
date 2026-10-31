// Graves: on death the player's things go into a grave where they died; only they open it, a page at a time.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');const G=await load('grave.js');
// files: the entity on both sides, its model and name
const ent=JSON.parse(fs.readFileSync(path.join(bp,'entities/grave.json'),'utf8'))['minecraft:entity'];
assert.strictEqual(ent.description.identifier,G.GRAVE);assert.ok(ent.components['minecraft:inventory'].inventory_size>=41);
const cl=JSON.parse(fs.readFileSync(path.join(rp,'entity/grave.entity.json'),'utf8'))['minecraft:client_entity'].description;
assert.strictEqual(cl.identifier,G.GRAVE);assert.ok(fs.existsSync(path.join(rp,cl.textures.default+'.png')));
assert.ok(fs.readFileSync(path.join(rp,'models/entity/cooptown_grave.geo.json'),'utf8').includes(cl.geometry.default));
assert.ok(fs.readFileSync(path.join(rp,'texts/ja_JP.lang'),'utf8').includes('entity.cooptown:grave.name='));

// fakes: containers that stack like the game's, a dimension that spawns entities with containers
class Box{constructor(n){this.size=n;this.s=new Array(n);}getItem(i){return this.s[i];}setItem(i,v){this.s[i]=v;}
 addItem(st){for(let i=0;i<this.size;i++){const t=this.s[i];if(t&&t.isStackableWith(st)&&t.amount<t.maxAmount){const m=Math.min(st.amount,t.maxAmount-t.amount);t.amount+=m;st.amount-=m;if(!st.amount)return undefined;}}
  for(let i=0;i<this.size;i++)if(!this.s[i]){this.s[i]=st;return undefined;}return st;}
 count(){return this.s.filter(Boolean).length;}}
const spawned=[],dropped=[];
const entity=(typeId,loc,size)=>{const p={},c=new Box(size);const e={typeId,id:'e'+spawned.length,location:loc,isValid:true,nameTag:'',dimension:dim,
 getComponent:n=>n==='minecraft:inventory'?{container:c}:undefined,setDynamicProperty:(k,v)=>{p[k]=v;},getDynamicProperty:k=>p[k],remove(){e.isValid=false;},teleport(){}};spawned.push(e);return e;};
const dim={id:'minecraft:overworld',spawnEntity:(t,loc)=>entity(t,loc,t===G.GRAVE?54:27),spawnItem:s=>dropped.push(s),playSound(){},getEntities:()=>[]};
const eq={};const inv=new Box(36);const chat=[];
const player={typeId:'minecraft:player',id:'p1',name:'REO',isValid:true,location:{x:10.7,y:-80,z:-3.2},dimension:dim,isSneaking:false,
 getComponent:n=>n==='minecraft:inventory'?{container:inv}:n==='minecraft:equippable'?{getEquipment:s=>eq[s],setEquipment:(s,v)=>{eq[s]=v;}}:undefined,
 sendMessage:m=>chat.push(String(m)),playSound(){},getHeadLocation:()=>({x:10,y:-79,z:-3}),getViewDirection:()=>({x:0,y:0,z:1})};
srv.__players.push(player);
for(let i=0;i<36;i++)inv.setItem(i,new srv.ItemStack(i===0?'cooptown:guidebook':'minecraft:thing_'+i,i===0?1:10+i));
eq.Head=new srv.ItemStack('minecraft:iron_helmet',1);eq.Offhand=new srv.ItemStack('minecraft:shield',1);

// install: keepInventory on, then the player dies in the void
srv.world.gameRules={};G.installGraves();assert.strictEqual(srv.world.gameRules.keepInventory,true);
for(const f of srv.__listeners.entityDie)f({deadEntity:player});
const grave=spawned.find(e=>e.typeId===G.GRAVE);assert.ok(grave,'a grave');
assert.deepStrictEqual(grave.location,{x:10.5,y:-60,z:-3.5},'raised out of the void, on the block centre');
const gc=grave.getComponent('minecraft:inventory').container;
assert.strictEqual(gc.count(),37,'35 stacks + helmet + shield');assert.strictEqual(inv.count(),1,'the menu book stays');assert.strictEqual(inv.getItem(0).typeId,'cooptown:guidebook');
assert.ok(!eq.Head&&!eq.Offhand);assert.ok(grave.nameTag.includes('REO'));assert.strictEqual(dropped.length,0);
for(const f of srv.__listeners.spawn)f({player,initialSpawn:false});assert.ok(chat.some(m=>m.includes('お墓')&&m.includes('X 10')),'told where');

// someone else cannot open it
const other={id:'p2',name:'other',sendMessage:m=>chat.push('other:'+m)};
let ev={target:grave,player:other,cancel:false};for(const f of srv.__listeners.entityInteract)f(ev);
assert.ok(ev.cancel&&chat.some(m=>m.startsWith('other:')&&m.includes('REOさんのお墓')));assert.strictEqual(gc.count(),37);
// the owner, too far (2026-10-30: only within GRAVE_RULES.reach blocks), is told to come closer
ev={target:grave,player,cancel:false};for(const f of srv.__listeners.entityInteract)f(ev);assert.ok(chat.some(m=>m.includes('近づいて')),'too far');
player.location={x:10.5,y:-59,z:-1.5};
// the owner opens it: a page goes into the box
ev={target:grave,player,cancel:false};for(const f of srv.__listeners.entityInteract)f(ev);assert.ok(ev.cancel);
let box=spawned.at(-1);assert.notStrictEqual(box,grave);const bc=box.getComponent('minecraft:inventory').container;
assert.strictEqual(bc.count(),G.GRAVE_RULES.page);assert.strictEqual(gc.count(),37-G.GRAVE_RULES.page);
// takes two stacks, then opens it again: the rest of the page goes back, the grave keeps the remainder
bc.setItem(0,undefined);bc.setItem(1,undefined);
for(const f of srv.__listeners.entityInteract)f({target:grave,player,cancel:false});
assert.ok(!box.isValid,'the old box is put away');box=spawned.at(-1);const bc2=box.getComponent('minecraft:inventory').container;
assert.strictEqual(bc2.count()+gc.count(),35,'nothing lost');
// empties the box and the grave: on closing, the grave goes away
for(let i=0;i<bc2.size;i++)bc2.setItem(i,undefined);for(let i=0;i<gc.size;i++)gc.setItem(i,undefined);
for(const f of srv.__listeners.entityInteract)f({target:grave,player,cancel:false});
assert.ok(!grave.isValid&&chat.some(m=>m.includes('すべて受け取りました')));
// nothing carried: no grave
const before=spawned.length;for(let i=0;i<36;i++)inv.setItem(i,undefined);
for(const f of srv.__listeners.entityDie)f({deadEntity:player});assert.strictEqual(spawned.filter(e=>e.typeId===G.GRAVE).length,1);assert.strictEqual(spawned.length,before);
console.log('grave ok');
