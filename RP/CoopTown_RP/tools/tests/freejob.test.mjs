// The first 3 hours of play: the main job changes for free (asked 2026-10-30). game-runtime.js sends free:true then.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const {createEngine,newDatabase}=await load('game-engine.js');
const {RULES}=await load('game-config.js');
const {freeJobChange}=await load('playtime.js');
let db=newDatabase();
const engine=createEngine({storage:{read:()=>db,write:d=>{db=d;}},inventory:{plan:()=>({apply(){},rollback(){}})},random:()=>0.5});
engine.ensure('a','A');db.players.a.coins=500;
engine.execute('a','job.select',{job:'鍛冶師'});assert.strictEqual(db.players.a.coins,500,'the first job is free');
engine.execute('a','job.select',{job:'料理人',free:true});engine.execute('a','job.select',{job:'農家',free:true});
assert.strictEqual(db.players.a.coins,500,'free changes cost nothing');assert.strictEqual(db.players.a.job,'農家');
engine.execute('a','job.select',{job:'釣り師'});assert.strictEqual(db.players.a.coins,500-RULES.jobChangeCost,'after: the usual cost');
const at=s=>({getDynamicProperty:()=>s});
assert.strictEqual(RULES.freeJobChangeSeconds,3*3600);
assert.ok(freeJobChange(at(0),RULES.freeJobChangeSeconds));assert.ok(freeJobChange(at(3*3600-20),RULES.freeJobChangeSeconds));assert.ok(!freeJobChange(at(3*3600),RULES.freeJobChangeSeconds));
console.log('ok');
