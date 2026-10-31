// town-rules.js and the grave compass (2026-10-30): in the first town non-staff players go adventure, deal no damage,
// and hostile mobs do not spawn; a grave compass shows the way and goes near the grave.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const srv=await import('@minecraft/server');
const {installTownRules,ruled,TOWN_RULES}=await imp('town-rules.js');
const G=await imp('grave.js');
const {ADMIN_RULES}=await imp('admin-runtime.js').catch(()=>({}));
const ow={id:'minecraft:overworld'};
const mkPlayer=(id,loc,tags=[])=>{const t=new Set(tags),cmds=[],fx=[];let gm='survival';const inv=[];
 return {id,name:id,typeId:'minecraft:player',dimension:ow,location:loc,cmds,fx,inv,selectedSlotIndex:0,
  hasTag:x=>t.has(x),addTag:x=>t.add(x),removeTag:x=>t.delete(x),getGameMode:()=>gm,runCommand:c=>{cmds.push(c);const m=/^gamemode (\w+)/.exec(c);if(m)gm=m[1];},
  addEffect:(e)=>fx.push(e),removeEffect(){},sendMessage(){},playSound(){},getRotation:()=>({x:0,y:0}),onScreenDisplay:{setActionBar(t){this.last=t;}},
  getComponent:k=>k==='minecraft:inventory'?{container:{size:4,getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;},addItem:s=>{inv.push(s);}}}:undefined};};
const town={x:-400,y:70,z:0},out={x:-800,y:70,z:0};
const p=mkPlayer('a',town),staff=mkPlayer('s',town,[ADMIN_RULES?.tag??'cooptown_admin']);
srv.__players.length=0;srv.__players.push(p,staff);
installTownRules();
assert.ok(ruled(p));assert.ok(!ruled(staff),'staff are free');
const tick=()=>{for(const f of srv.__listeners.interval)f();};
tick();
assert.strictEqual(p.getGameMode(),'adventure');assert.ok(p.fx.includes('weakness'));assert.strictEqual(staff.getGameMode(),'survival');
p.location=out;tick();assert.strictEqual(p.getGameMode(),'survival','back to survival outside');
// a hostile mob appearing in the town is removed; a cow is not
let removed=0;const mob=(fam,loc)=>({isValid:true,dimension:ow,location:loc,matches:q=>q.families?.includes(fam),remove(){removed++;}});
for(const f of srv.__listeners.entitySpawn)f({entity:mob('monster',town),cause:'Spawned'});
for(const f of srv.__listeners.entitySpawn)f({entity:mob('cow',town),cause:'Spawned'});
for(const f of srv.__listeners.entitySpawn)f({entity:mob('monster',out),cause:'Spawned'});
assert.strictEqual(removed,1);
// damage dealt by a ruled player is given back
p.location=town;let hp=10;const target={getComponent:()=>({currentValue:hp,effectiveMax:20,setCurrentValue:v=>{hp=v;}})};
for(const f of srv.__listeners.entityHurt)f({hurtEntity:target,damage:4,damageSource:{damagingEntity:p}});
assert.strictEqual(hp,14);
// grave compass: kept on death, gone near the grave
assert.ok(G.KEEP.has(G.COMPASS));assert.strictEqual(G.GRAVE_RULES.reach,5);
const c=G.graveCompass({x:100,y:64,z:100},'minecraft:overworld');assert.strictEqual(c.typeId,G.COMPASS);
console.log('ok');
