// The watering cans as 3D models: every can has an attachable with the model on the right arm, its own texture,
// and the held poses (first and third person).
import path from 'path';import assert from 'assert';import fs from 'fs';import {pathToFileURL} from 'url';
const dir=process.argv[2],rp=process.argv[3];
const W=await import(pathToFileURL(path.join(dir,'watering-config.js')).href);
const geo=JSON.parse(fs.readFileSync(path.join(rp,'models/entity/cooptown_watering_can.geo.json'),'utf8'))['minecraft:geometry'][0];
const names=geo.bones.map(b=>b.name);assert.deepStrictEqual(names.slice(0,2),['rightArm','can']);
for(const b of geo.bones.slice(2))assert.ok(names.includes(b.parent),b.name+' parent');
const anims=JSON.parse(fs.readFileSync(path.join(rp,'animations/cooptown_watering_can.animation.json'),'utf8')).animations;
for(const id of Object.keys(W.CANS)){
 const a=JSON.parse(fs.readFileSync(path.join(rp,'attachables',id.split(':')[1]+'.json'),'utf8'))['minecraft:attachable'].description;
 assert.strictEqual(a.identifier,id);assert.strictEqual(a.geometry.default,geo.description.identifier);
 assert.ok(fs.existsSync(path.join(rp,a.textures.default+'.png')),a.textures.default);
 for(const n of Object.values(a.animations))assert.ok(anims[n],n);
}
console.log('can3d ok');
