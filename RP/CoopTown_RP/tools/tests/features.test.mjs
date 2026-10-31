// Project features: vein mining / tree felling helpers, the final-day awards, fish sizes and the size ranking.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const imp=f=>import(pathToFileURL(path.join(dir,f)).href);
const B=await imp('bulk-harvest.js'),A=await imp('awards.js'),F=await imp('fish-runtime.js');
// levels and kinds
assert.deepStrictEqual([1,9,10,29,30,49,50].map(l=>B.capFor(B.BULK.vein,l)),[0,0,8,8,24,24,64]);
assert.deepStrictEqual([9,10,30,50].map(l=>B.capFor(B.BULK.tree,l)),[0,16,48,128]);
assert.deepStrictEqual(B.detectable(10),['coal','iron','copper']);assert.ok(B.detectable(30).includes('diamond'));assert.deepStrictEqual(B.detectable(5),[]);
assert.strictEqual(B.oreKind('minecraft:deepslate_iron_ore'),'iron');assert.strictEqual(B.oreKind('minecraft:lit_redstone_ore'),'redstone');assert.strictEqual(B.oreKind('minecraft:stone'),undefined);
assert.strictEqual(B.woodOf('minecraft:dark_oak_log'),'dark_oak');assert.strictEqual(B.woodOf('minecraft:stripped_oak_log'),undefined);assert.strictEqual(B.woodOf('minecraft:crimson_stem'),'crimson');
// a vein of 5 iron (one deepslate) with stone around: all found, the cap holds, nothing else taken
const world={'0,0,0':'minecraft:iron_ore','1,0,0':'minecraft:iron_ore','1,1,0':'minecraft:deepslate_iron_ore','2,1,1':'minecraft:iron_ore','5,5,5':'minecraft:iron_ore','0,1,0':'minecraft:stone'};
const get=p=>world[`${p.x},${p.y},${p.z}`];const same=t=>B.oreKind(t)==='iron';
assert.strictEqual(B.connected(get,{x:0,y:0,z:0},same,10).length,3,'connected only (diagonals count)');
assert.strictEqual(B.connected(get,{x:0,y:0,z:0},same,2).length,2,'cap');
// awards: ranking, points, ties by the earlier record
const players={a:{name:'A',savedAt:2,tally:{deaths:5,'j:fish':10,'ore:iron':3,'ore:coal':4}},b:{name:'B',savedAt:1,tally:{deaths:5,'j:fish':20}},c:{name:'C',savedAt:3,tally:{deaths:1}}};
const {results,order}=A.computeAwards(players);
const deaths=results.find(r=>r.name==='一番多く死んだ人');assert.deepStrictEqual(deaths.ranked.map(x=>x.id),['b','a','c'],'tie: earlier first');
assert.strictEqual(results.find(r=>r.name==='一番多く鉱石を掘った人').ranked[0].value,7);
assert.strictEqual(results.find(r=>r.name==='一番多く溶岩で死んだ人').ranked.length,0,'zero does not rank');
assert.strictEqual(order[0].id,'a');assert.strictEqual(order[0].points,13);assert.strictEqual(order[1].points,10);
assert.strictEqual(A.AWARDS.length,29);
// fish sizes: in range unless 特大, 特大 above the range; ranking keeps the top 3
const sp={size:[40,80]};let seq=[.5,.5,.5,.5];const r=()=>seq.shift()??.5;
const normal=F.sizeOf(sp,()=>.5);assert.ok(!normal.big&&normal.size===60);
const big=F.sizeOf(sp,(()=>{const v=[0,1];return ()=>v.shift();})());assert.ok(big.big&&big.size>80&&big.size<=120);
let top=[];for(const [n,s] of [['a',50],['b',70],['c',60],['d',65]]){const x=F.rankCatch(top,n,s,s);top=x.list;}
assert.deepStrictEqual(top.map(x=>x.n),['b','d','c']);assert.strictEqual(F.rankCatch(top,'e',10,1).place,0);
console.log('ok features');
