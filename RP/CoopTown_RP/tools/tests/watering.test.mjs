// Watering cans: tiers, area, growth chance, watered marks, recipes, items and pictures.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const imp=f=>import(pathToFileURL(path.join(dir,f)).href);
const C=await imp('watering-config.js'),W=await imp('watering.js'),WB=await imp('workbench-config.js'),G=await imp('game-config.js');
const cans=Object.entries(C.CANS);assert.strictEqual(cans.length,4);
assert.deepStrictEqual(cans.map(([,c])=>C.area(c).length),[1,9,25,49]);
assert.ok(cans.every(([,c],i,a)=>!i||(c.water>a[i-1][1].water&&c.grow>a[i-1][1].grow&&c.rank>a[i-1][1].rank&&c.level>a[i-1][1].level)),'each tier better');
assert.ok(C.growChance(C.CANS['cooptown:watering_can_gold'],100)<=C.WATER.growMax);
assert.ok(C.growChance(C.CANS['cooptown:watering_can_copper'],50)>C.growChance(C.CANS['cooptown:watering_can_copper'],1));
// marks: a new watering, then nothing within the cooldown, then again; the bonus lasts markMs
const loc={x:1.5,y:64,z:-3.2},t0=1e9;
assert.strictEqual(W.markWatered('o',loc,'cooptown:watering_can_iron',t0),true);
assert.strictEqual(W.markWatered('o',loc,'cooptown:watering_can_iron',t0+1000),false);
assert.strictEqual(W.markWatered('o',loc,'cooptown:watering_can_iron',t0+C.WATER.cooldownMs),true);
assert.strictEqual(W.wateredWith('o',{x:1,y:64,z:-4},t0+C.WATER.cooldownMs+10)?.name,'鉄のジョーロ');
assert.strictEqual(W.wateredWith('o',loc,t0+C.WATER.cooldownMs+C.WATER.markMs+1),undefined);
W.clearWatered('o',loc);assert.strictEqual(W.wateredWith('o',loc,t0+C.WATER.cooldownMs+10),undefined);
// recipes: the farmer's job tab, each tier from the one below, opening with the level
for(const [id,c] of cans){
 const r=WB.JOB_VANILLA_RECIPES.find(r=>r.output[0]===id);assert.ok(r,id);assert.strictEqual(r.job,'農家');assert.strictEqual(r.jobLevel??1,c.level);
 assert.strictEqual(G.ITEM_NAMES[id],c.name);
 const item=JSON.parse(fs.readFileSync(path.join(bp,'items',id.split(':')[1]+'.json'),'utf8'))['minecraft:item'];
 assert.strictEqual(item.description.identifier,id);assert.strictEqual(item.components['minecraft:durability'].max_durability,c.water);
 const tex=item.components['minecraft:icon'].textures.default,atlas=JSON.parse(fs.readFileSync(path.join(rp,'textures/item_texture.json'),'utf8'));
 assert.ok(fs.existsSync(path.join(rp,atlas.texture_data[tex].textures+'.png')),tex);
 assert.ok(fs.existsSync(path.join(rp,r.icon+'.png')),r.icon);
}
assert.ok(WB.JOB_VANILLA_RECIPES.find(r=>r.output[0]==='cooptown:watering_can_iron').inputs.some(([t])=>t==='cooptown:watering_can_copper'));
console.log('ok watering');
