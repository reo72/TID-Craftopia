// The frying pans: three levels (model, textures, attachables, items, recipes), using one flips and comes back.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');const F=await load('frying-pan.js'),WB=await load('workbench-config.js'),G=await load('game-config.js');
const geo=JSON.parse(fs.readFileSync(path.join(rp,'models/entity/cooptown_frying_pan.geo.json'),'utf8'))['minecraft:geometry'][0];
const names=geo.bones.map(b=>b.name);for(const b of ['rightArm','pan','bone','bone2','bone3'])assert.ok(names.includes(b),b);
const anim=JSON.parse(fs.readFileSync(path.join(rp,'animations/cooptown_frying_pan.animation.json'),'utf8')).animations['animation.cooptown_frying_pan.flip'];
assert.ok(anim.bones.bone3&&anim.animation_length===2.75);assert.strictEqual(F.FLIP.ticks,Math.ceil(anim.animation_length*20));
for(const n of F.PAN_LEVELS){
 for(const id of ['frying_pan_'+n,'frying_pan_'+n+'_flip']){
  assert.ok(fs.existsSync(path.join(bp,'items/frying_pan',id+'.json')),id);
  const a=JSON.parse(fs.readFileSync(path.join(rp,'attachables',id+'.json'),'utf8'))['minecraft:attachable'].description;
  assert.strictEqual(a.textures.default,'textures/cooptown/frying_pan/pan_'+n);assert.strictEqual(!!a.animations.flip,id.endsWith('_flip'));}
 assert.ok(fs.existsSync(path.join(rp,`textures/cooptown/frying_pan/pan_${n}.png`))&&fs.existsSync(path.join(rp,`textures/cooptown/items/frying_pan_${n}.png`)));
 assert.ok(WB.JOB_VANILLA_RECIPES.some(r=>r.output[0]==='cooptown:frying_pan_'+n&&r.job==='料理人'));assert.strictEqual(G.ITEM_NAMES['cooptown:frying_pan_'+n],F.PAN_NAMES[n]);
}
// using: the held pan becomes its twin, then comes back with its name and lore
const pan=new srv.ItemStack('cooptown:frying_pan_2',1);pan.nameTag='愛用';pan.setLore(['x']);
const slots=[pan];const c={size:1,getItem:i=>slots[i],setItem:(i,v)=>{slots[i]=v;}};
const player={id:'p',isValid:true,selectedSlotIndex:0,location:{x:0,y:0,z:0},dimension:{playSound(){},spawnParticle(){}},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:0,y:0,z:1}),getComponent:()=>({container:c})};
srv.__timeouts.length=0;F.useFryingPan(player);assert.strictEqual(slots[0].typeId,'cooptown:frying_pan_2_flip');assert.strictEqual(slots[0].nameTag,'愛用');
F.useFryingPan(player);assert.strictEqual(srv.__timeouts.length,3,'no second flip while flipping');
for(const f of srv.__timeouts.splice(0))f();
assert.strictEqual(slots[0].typeId,'cooptown:frying_pan_2');assert.deepStrictEqual(slots[0].getLore(),['x']);assert.strictEqual(slots[0].getDynamicProperty(F.FLIP.token),undefined);
console.log('FRYING PAN PASS');
