// The job skill trees (skill-config.js, 2026-10-28): shape, learning through the engine, old saves, effects, the
// journal page, and that recipes no longer need the tree.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const S=await load('skill-config.js');
const {SKILL_TREES,SKILL_NODES,SKILL_BY_ID,SKILL_TREE_COST,skillPoints,skillValue,skillXpBonus,skillLock,migrateSkills}=S;
const {JOBS,WORKBENCH_RECIPES}=await load('game-config.js');
// ---- shape: every job, 8-12 nodes, known prerequisites listed earlier, about Lv.50 for a whole tree
assert.deepStrictEqual(Object.keys(SKILL_TREES).sort(),[...JOBS].sort());
assert.strictEqual(new Set(SKILL_NODES.map(n=>n.id)).size,SKILL_NODES.length,'unique ids');
for(const [job,list] of Object.entries(SKILL_TREES)){
 assert.ok(list.length>=8&&list.length<=12,job+' size');
 const total=list.reduce((s,n)=>s+n.cost,0);assert.ok(total>=40&&total<=55,job+' total '+total);assert.strictEqual(total,SKILL_TREE_COST);
 list.forEach((n,i)=>{assert.strictEqual(n.job,job);assert.ok(n.desc&&n.name&&Object.keys(n.effect).length,n.id);
  for(const r of n.req){const k=list.findIndex(x=>x.id===r);assert.ok(k>=0&&k<i,n.id+' req '+r);assert.ok(SKILL_BY_ID[r].level<=n.level,n.id+' level after '+r);}});
 assert.ok(list.some(n=>!n.req.length)&&list.filter(n=>n.req.length>1).length>=1,job+' has a root and a joining node');
 assert.ok(Math.max(...list.map(n=>n.level))<=50,job+' all by Lv.50');
}
// ---- the engine: learning by id
const {createEngine,newDatabase}=await load('game-engine.js');
let db=newDatabase();
const engine=createEngine({storage:{read:()=>db,write:d=>{db=d;}},inventory:{plan:()=>({apply(){},rollback(){}})},random:()=>0.99});
engine.ensure('a','A');const P=()=>db.players.a;
assert.throws(()=>engine.execute('a','skill.unlock',{node:'farm_xp1'}),/農家の職業/);
engine.execute('a','job.select',{job:'農家'});
assert.throws(()=>engine.execute('a','skill.unlock',{node:'nope'}),/スキルを選んで/);
assert.throws(()=>engine.execute('a','skill.unlock',{node:'farm_xp1'}),/ポイント/,'Lv.1 = 1 SP, the root costs 2');
P().level=5;
let m=engine.execute('a','skill.unlock',{node:'farm_xp1'});assert.match(m,/畑の心得を習得/);
assert.strictEqual(skillPoints(P()),3);
assert.throws(()=>engine.execute('a','skill.unlock',{node:'farm_xp1'}),/習得済み/);
assert.throws(()=>engine.execute('a','skill.unlock',{node:'farm_harvest1'}),/職業Lv.10/);
P().level=10;
assert.throws(()=>engine.execute('a','skill.unlock',{node:'farm_harvest1'}),/水やり上手 I/,'prerequisite first');
engine.execute('a','skill.unlock',{node:'farm_grow1'});
assert.strictEqual(skillPoints(P()),5);
assert.strictEqual(skillValue(P(),'農家','grow'),.05);assert.strictEqual(skillValue(P(),'農家','harvest'),0);
// a whole tree at Lv.46
P().level=50;for(const n of SKILL_TREES['農家'])if(!P().skillUnlocks.includes(n.id))engine.execute('a','skill.unlock',{node:n.id});
assert.strictEqual(skillPoints(P()),50-SKILL_TREE_COST);
assert.strictEqual(skillValue(P(),'農家','radius'),1);assert.strictEqual(skillValue(P(),'農家','grow'),.15);assert.strictEqual(skillValue(P(),'農家','rank'),.15);
// effects only while the job is held; the nodes stay learned
engine.execute('a','admin.coins',{isAdmin:true,target:'a',amount:500});
engine.execute('a','job.select',{job:'鍛冶師'});
assert.strictEqual(skillValue(P(),'農家','grow'),0,'not a farmer now');assert.strictEqual(P().skillUnlocks.length,10);
assert.strictEqual(skillValue(P(),'鍛冶師','repair'),0);
// ---- xp nodes: craft XP for a smith
engine.execute('a','skill.unlock',{node:'smith_xp1'});
assert.strictEqual(skillXpBonus(P(),'craft'),.05);assert.strictEqual(skillXpBonus(P(),'gather'),0);
P().craft={level:1,xp:0,max:100};P().stress=0;
engine.execute('a','job.earn',{skill:'craft',xp:100,note:'t'});
assert.strictEqual(P().craft.level*1000+P().craft.xp,2000+5,'105 XP: Lv.2 with 5 over');
// ---- old saves: recipe numbers are dropped and their points come back
db.players.b={...JSON.parse(JSON.stringify(P())),name:'B',skillUnlocks:[0,1,3,'smith_xp1',8,'bogus']};
assert.deepStrictEqual(engine.snapshot('b').player.skillUnlocks,['smith_xp1']);
const old={level:20,skillUnlocks:[0,1,2,3,4,5,6,7]};assert.strictEqual(migrateSkills(old),true);assert.deepStrictEqual(old.skillUnlocks,[]);assert.strictEqual(skillPoints(old),20);
assert.strictEqual(migrateSkills(old),false);
const none={level:3};migrateSkills(none);assert.deepStrictEqual(none.skillUnlocks,[]);
// ---- recipes open by the job level only
const {recipeLock}=await load('workbench-runtime.js');
const pick=WORKBENCH_RECIPES.find(r=>r.name==='鉄のツルハシ');
assert.strictEqual(recipeLock(pick,{job:'鍛冶師',level:1,craft:{level:1},skillUnlocks:[]}),'','no tree needed');
// ---- special materials: 目利き
const {rollSpecial}=await load('special-config.js');
const adv={job:'木こり',level:50,gather:{level:50},mine:{level:50},craft:{level:1},skillUnlocks:[]};
const r1=.035;assert.deepStrictEqual(rollSpecial(adv,'gather','minecraft:oak_log',()=>r1),[],'3% without nodes');
adv.skillUnlocks=['log_xp1','log_bulk1','log_special1'];assert.deepStrictEqual(rollSpecial(adv,'gather','minecraft:oak_log',()=>r1),['cooptown:fine_wood'],'3.75% with 森の恵み I');
// ---- the systems' numbers
const W=await load('watering-config.js'),can=W.CANS['cooptown:watering_can_copper'];
assert.strictEqual(W.area(can).length,1);assert.strictEqual(W.area(can,1).length,9);
assert.ok(Math.abs(W.growChance(can,1,.1)-W.growChance(can,1)-.1)<1e-9);
const A=await load('anvil-config.js');
assert.strictEqual(A.repairPer(100),25);assert.strictEqual(A.repairPer(100,.3),32);
assert.ok(A.repairPlan(100,100,1,1,.3).after<A.repairPlan(100,100,1,1).after);
const F=await load('fish-runtime.js');
const sp={size:[10,20]};assert.strictEqual(F.sizeOf(sp,()=>.04).big,false);assert.strictEqual(F.sizeOf(sp,()=>.04,.02).big,true,'大物狙い');
// ---- the journal page: one tab per own job, rows follow the tree
const pages=await load('book-pages.js');
const me={job:'釣り師',secondJob:'農家',level:30,craft:{level:1},skillUnlocks:['fish_xp1','farm_xp1']};
let s=pages.skillModel.spec({},{player:me},{tab:0,sel:0});
assert.deepStrictEqual(s.tabs.map(t=>t.label),['釣り師','農家']);
assert.strictEqual(s.rows.length,SKILL_TREES['釣り師'].length);
assert.strictEqual(s.rows[0].title,'水辺の心得');assert.match(s.rows[0].sub,/習得済み/);assert.strictEqual(s.detail.state,'習得済み');
assert.ok(s.rows.some(r=>r.title.startsWith('　　')),'deeper nodes are indented');
assert.match(s.summary,/スキルポイント 26 SP/);
const order=s.rows.map(r=>r.title.trim());
for(const n of SKILL_TREES['釣り師'])for(const q of n.req)assert.ok(order.indexOf(SKILL_BY_ID[q].name)<order.indexOf(n.name),n.name+' under '+q);
s=pages.skillModel.spec({},{player:me},{tab:0,sel:1});assert.strictEqual(s.actions[0].enabled,true,'next node can be learned');
s=pages.skillModel.spec({},{player:me},{tab:1,sel:0});assert.strictEqual(s.detail.title,'畑の心得');
s=pages.skillModel.spec({},{player:{job:'未選択',level:1,skillUnlocks:[]}},{tab:0,sel:0});assert.strictEqual(s.rows.length,1);assert.deepStrictEqual(s.actions,[]);
assert.strictEqual(skillLock(me,SKILL_BY_ID['adv_xp1']),'冒険家の職業が必要です');
console.log('SKILLTREE PASS',SKILL_NODES.length,'nodes,',SKILL_TREE_COST,'SP per tree');
