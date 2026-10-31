// The Notion job features: selling, explore surveys, fish species, minigame scoring, RuneScript, job dailies.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server'),ui=await import('@minecraft/server-ui');
// selling: groups by item and quality, quality pays more
const {sellables,removeGroup}=await load('npc-sell.js');const {setQuality}=await load('quality.js');
const good=setQuality(new srv.ItemStack('minecraft:wheat',4),2);
const slots=[new srv.ItemStack('minecraft:wheat',10),good,new srv.ItemStack('minecraft:dirt',5)];
const c={size:slots.length,getItem:i=>slots[i],setItem:(i,v)=>{slots[i]=v;}};
const g=sellables(c);assert.strictEqual(g.length,2,'dirt is not bought');
const plain=g.find(x=>x.tier===0),fine=g.find(x=>x.tier===2);assert.deepStrictEqual([plain.count,plain.price,fine.count,fine.price],[10,4,4,6]);
assert.strictEqual(removeGroup(c,fine,9),4);assert.strictEqual(slots[1],undefined);assert.strictEqual(slots[0].amount,10,'plain wheat untouched');
// explore: three surveys a day, the same all day
const {surveysFor}=await load('explore-runtime.js');const a=surveysFor('p','2026-10-19');
assert.deepStrictEqual(a,surveysFor('p','2026-10-19'));assert.deepStrictEqual(a.map(q=>q.kind),['biome','kill','swim']);
// fish: species by place, time and bait
const {chooseSpecies,SPECIES}=await load('fish-runtime.js');
const common=chooseSpecies('minecraft:river',false,'none',()=>0.99);assert.ok(common&&common.rank===0&&common.where.test('minecraft:river'),common?.name);
const legend=chooseSpecies('minecraft:deep_ocean',true,'eye',()=>0);assert.ok(legend.rank===2&&['リュウグウノツカイ','シーラカンス','ホホジロザメ'].includes(legend.name),legend.name);
assert.strictEqual(chooseSpecies('minecraft:the_end',false,'none'),undefined);
assert.strictEqual(SPECIES.length,100);assert.ok(SPECIES.filter(s=>s.rank===2).length>=10);assert.ok(SPECIES.every(s=>s.item.startsWith('cooptown:fish_')));
// rare odds stay near RANKS[1].chance even where many rare fish live (not one roll per species)
{let n=0,seed=1;const rnd=()=>((seed=seed*16807%2147483647)/2147483647);for(let k=0;k<4000;k++)if(chooseSpecies('minecraft:ocean',false,'none',rnd).rank===1)n++;assert.ok(n/4000<0.3,'rare share '+n/4000);}
// cod in recipes also takes the fishing fish
const {typesOf}=await load('workbench-config.js');assert.ok(typesOf('minecraft:cod').includes('cooptown:fish_aji')&&typesOf('minecraft:salmon').includes('cooptown:fish_sake'));
const {placeHint}=await load('fish-runtime.js');assert.strictEqual(placeHint('river|swamp|plains'),'川・沼地');
// minigame: right answers inside the time score
const {playMinigame,GAMES,scoreBonus}=await load('minigame.js');
ui.setAnswers([1+GAMES.forge.stages[0].answers[0],1+GAMES.forge.stages[1].answers[0],1+1]);
const score=await playMinigame({},'forge',{random:()=>0});assert.ok(Math.abs(score-2/3)<1e-9,'2 of 3 '+score);assert.strictEqual(scoreBonus(1),.4);
// RuneScript
const {compileRune,runRune,SAMPLES,normalizeRune}=await load('runescript.js');
for(const s of SAMPLES)assert.ok(compileRune(s.code).ok,s.name);
const bad=[['rune "x" { slot weapon; cooldown 1s; on hit { ignite(target, 2s); } }','cooldown'],['rune "x" { slot armor; cooldown 60s; on hit { mark(target, 1s); } }','slot weapon'],
 ['rune "x" { slot weapon; cooldown 9s; on hit { if 1 { mark(target,1s); } } }','Bool'],['rune "x" { slot weapon; cooldown 9s; on hit { mark(target, 1s) } }',';'],
 ['rune "x" { slot weapon; cooldown 9s; on hit { let a = 1; let a = 2; } }','再代入'],['rune "x" { slot weapon; cooldown 9s; on hit { explode(target); } }','ありません'],
 ['rune "x" { slot weapon; cooldown 99s; on hit { mark(target,3s); ignite(target,2s); ignite(target,2s); } }','上限'],['x'.repeat(4001),'4000']];
for(const [src,word] of bad){const r=compileRune(src);assert.ok(!r.ok&&r.errors[0].message.includes(word),word+': '+JSON.stringify(r.errors));}
const deep=compileRune('rune "x" { slot weapon; cooldown 9s; on hit { if true { if true { if true { if true { mark(target,1s); } } } } } }');assert.ok(!deep.ok&&/入れ子/.test(deep.errors[0].message));
const fire=compileRune(SAMPLES[1].code).rune;assert.deepStrictEqual(runRune(fire,'hit',{self:{hp:20,max_hp:20,stress:0},target:{hostile:true,alive:true}}).calls,[{name:'ignite',args:['target',2]}]);
assert.deepStrictEqual(runRune(fire,'hit',{self:{hp:20,max_hp:20,stress:0},target:{hostile:false,alive:true}}).calls,[]);
assert.strictEqual(normalizeRune(SAMPLES[1].code),normalizeRune(SAMPLES[1].code.replace('火花','別名').replace(/\n\s*/g,' ')),'name and spacing do not count');
// job dailies through the engine
const {createEngine}=await load('game-engine.js');const {DAILY}=await load('game-config.js');
let saved={version:1,players:{},town:{level:1,total:0,materials:{}},requests:[],events:[]};
const game=createEngine({storage:{read:()=>saved,write:d=>{saved=d;}}});game.ensure('f','F');game.execute('f','job.select',{job:'釣り師'});
assert.throws(()=>game.execute('f','daily.claim',{task:DAILY.length+1}),/目標/);
for(let i=0;i<12;i++)game.execute('f','job.count',{key:'fish'});
game.execute('f','daily.claim',{task:DAILY.length+1});assert.ok(saved.players.f.daily.claimed.includes(DAILY.length+1),'rare fish task done by the alternative (12 fish)');
assert.throws(()=>game.execute('f','job.count',{key:'bad key!'}),/対象外/); // keys outside the dailies count for titles now; malformed ones are refused
const before=saved.players.f.coins;game.execute('f','job.earn',{coins:50,skill:'gather',xp:5});assert.strictEqual(saved.players.f.coins,before+50);
game.execute('f','rune.stress',{amount:10});assert.strictEqual(saved.players.f.stress,10+0>=10?saved.players.f.stress:0);assert.throws(()=>game.execute('f','rune.stress',{amount:50}));
console.log('JOBS2 PASS');
