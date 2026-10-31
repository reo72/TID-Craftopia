import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const {createEngine,newDatabase}=await load('game-engine.js');
const {WORKBENCH_RECIPES,recipeTier,RECIPES,ITEM_NAMES}=await load('game-config.js');
const {GROUPS,BASIC_RECIPES,JOB_VANILLA_RECIPES}=await load('workbench-config.js');
let db=newDatabase(),plans=[],rolls=[];
const engine=createEngine({storage:{read:()=>db,write:d=>{db=d;}},inventory:{plan:(id,take,give)=>{plans.push({take,give});return {apply(){},rollback(){}};}},random:()=>rolls.length?rolls.shift():0.99});
engine.ensure('a','A');
const idx=name=>WORKBENCH_RECIPES.findIndex(r=>r.name===name);
// journal indexes unchanged
assert.deepStrictEqual(WORKBENCH_RECIPES.slice(0,RECIPES.length),RECIPES);
const {recipeXp}=await load('game-config.js');
// basic: anyone, now gives difficulty XP, uses group
plans=[];engine.execute('a','workbench.craft',{recipe:idx('チェスト'),count:2});
assert.deepStrictEqual(plans[0].take,[[{group:'planks'},16]]);assert.deepStrictEqual(plans[0].give,[['minecraft:chest',2]]);
assert.strictEqual(recipeXp(WORKBENCH_RECIPES[idx('チェスト')]),2);assert.strictEqual(db.players.a.craft.xp,4);assert.strictEqual(db.players.a.stress,2);
// reversible storage block: no XP
let m=engine.execute('a','workbench.craft',{recipe:idx('鉄ブロック'),count:3});assert.match(m,/経験値なし/);assert.strictEqual(db.players.a.craft.xp,4);
// job recipe rejected without job; old craft action removed
assert.throws(()=>engine.execute('a','workbench.craft',{recipe:idx('鉄の剣'),count:1}),/鍛冶師/);
assert.throws(()=>engine.execute('a','craft',{recipe:0}),/操作が見つかりません/);
// job recipe: difficulty XP, no daily cap
engine.execute('a','job.select',{job:'鍛冶師'});
const sword=recipeXp(WORKBENCH_RECIPES[idx('鉄の剣')]);assert.strictEqual(sword,4);
const before=()=>db.players.a.craft.level*100000+db.players.a.craft.xp;let x0=before();
for(let k=0;k<3;k++)engine.execute('a','workbench.craft',{recipe:idx('鉄の剣'),count:20});
const total=(()=>{let p=db.players.a.craft,sum=p.xp;for(let l=1;l<p.level;l++)sum+=100+(l-1)*50;return sum;})();
assert.strictEqual(total,4+sword*60,'60 crafts all give full XP');
assert.ok(!('craftWork' in db.players.a)||!db.players.a.craftWork,'no daily cap tracking');
// special requires level
// the skill tree no longer holds recipes (skill-config.js, 2026-10-28)
assert.throws(()=>engine.execute('a','workbench.craft',{recipe:idx('道具部品'),count:1}),/クラフトLv.3/);
assert.doesNotThrow(()=>engine.execute('a','workbench.craft',{recipe:idx('鉄のツルハシ'),count:1}),'old tree recipes need no skill');
// saving/bonus at Lv30
db.players.a.craft.level=30;rolls=[0,0];plans=[];
m=engine.execute('a','workbench.craft',{recipe:idx('鉄の剣'),count:1});
assert.deepStrictEqual(plans[0].take,[['minecraft:iron_ingot',1],['minecraft:stick',1]]);assert.deepStrictEqual(plans[0].give,[['minecraft:iron_sword',2]]);
// batch bounds
assert.throws(()=>engine.execute('a','workbench.craft',{recipe:idx('チェスト'),count:65}));
// daily craft counter
assert.ok(db.players.a.daily.counts.craft>=4);
// every non-group input/output has a Japanese name
const missing=new Set();for(const r of WORKBENCH_RECIPES)for(const [t] of [...r.inputs,r.output,...(r.extra??[])])if(typeof t==='string'&&!ITEM_NAMES[t]&&!WORKBENCH_RECIPES.some(x=>x.output[0]===t))missing.add(t);
console.log('recipes: basic',BASIC_RECIPES.length,'job vanilla',JOB_VANILLA_RECIPES.length,'total',WORKBENCH_RECIPES.length);
console.log('inputs without display name:',[...missing].join(' ')||'none');
console.log('ALL PASS');
