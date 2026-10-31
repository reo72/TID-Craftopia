// dynamic-light.js (2026-10-30): a held light puts an invisible light block at the head, moves it, takes it away.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2];const srv=await import('@minecraft/server');
const L=await import(pathToFileURL(BP+'/dynamic-light.js'));
const blocks=new Map(),key=p=>`${p.x},${p.y},${p.z}`;
const dim={id:'minecraft:overworld',getBlock:p=>({get typeId(){return blocks.get(key(p))??'minecraft:air';},setType(t){blocks.set(key(p),t);}})};
srv.world.getDimension=()=>dim;
let held='minecraft:torch';
const player={id:'p',dimension:dim,selectedSlotIndex:0,head:{x:.5,y:65.6,z:.5},getHeadLocation(){return this.head;},
 getComponent:k=>k==='minecraft:inventory'?{container:{getItem:()=>held?{typeId:held}:undefined}}:{getEquipment:()=>undefined}};
srv.__players.length=0;srv.__players.push(player);
L.installDynamicLight();
const tick=()=>{for(const f of srv.__listeners.interval)f();};
tick();assert.strictEqual(blocks.get('0,65,0'),'minecraft:light_block_14','torch light at the head');
player.head={x:3.5,y:65.6,z:.5};tick();assert.strictEqual(blocks.get('0,65,0'),'minecraft:air','the old one goes');assert.strictEqual(blocks.get('3,65,0'),'minecraft:light_block_14');
blocks.set('6,65,0','minecraft:stone');player.head={x:6.5,y:65.6,z:.5};tick();assert.strictEqual(blocks.get('6,65,0'),'minecraft:stone','never replaces a block');assert.strictEqual(blocks.get('6,64,0'),'minecraft:light_block_14','the feet instead');
held='minecraft:lantern';tick();assert.strictEqual(blocks.get('6,64,0'),'minecraft:light_block_15');
held=undefined;tick();assert.strictEqual(blocks.get('6,64,0'),'minecraft:air','gone when put away');
console.log('ok');
