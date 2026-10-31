// ingredient-drops.js (2026-10-30): the new cooking ingredients are found in the world.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const D=await imp('ingredient-drops.js');
const {FOOD_CATALOG}=await imp('food-catalog.js').catch(()=>({}));
const always=()=>0,never=()=>.999;
assert.ok(D.FINDS.wheat&&D.FINDS.oak_leaves&&D.FINDS.sand);
assert.strictEqual(D.findFor('minecraft:wheat',3,false,always),undefined,'unripe crops give nothing');
assert.ok(D.findFor('minecraft:wheat',7,false,always).startsWith('cooptown:'));
assert.strictEqual(D.findFor('minecraft:wheat',7,false,never),undefined);
// a farmer finds vegetables twice as often: .06 misses for others, hits for farmers at .1
const at=v=>()=>v;assert.strictEqual(D.findFor('minecraft:carrots',7,false,at(.1)),undefined);assert.ok(D.findFor('minecraft:carrots',7,true,at(.1)));
assert.strictEqual(D.findFor('minecraft:sand',undefined,false,always),'cooptown:salt');
assert.strictEqual(D.findFor('minecraft:stone',undefined,false,always),undefined);
// every new ingredient has somewhere to be found
const found=new Set(Object.values(D.FINDS).flatMap(f=>f.items));
for(const id of ['rice','tomato','onion','cabbage','cucumber','corn','lemon','grape','strawberry','tea_leaves','coffee_beans','salt','mint','black_pepper','soybeans'])assert.ok(found.has('cooptown:'+id),id);
console.log('ok');
