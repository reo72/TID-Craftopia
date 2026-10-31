// Armour runes (on hurt) go off on any damage: poison, fire or a fall as well as a hit.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');const RR=await load('rune-runtime.js'),S=await load('runescript.js');
const sample=n=>S.SAMPLES.find(s=>s.name===n);
const item=src=>{const s=new srv.ItemStack('minecraft:iron_chestplate',1);s.setDynamicProperty('cooptown:rune',JSON.stringify({name:'t',src,author:'REO'}));return s;};
const removed=[],msgs=[];
const player={typeId:'minecraft:player',id:'w',name:'W',isValid:true,location:{x:0,y:64,z:0},dimension:{spawnParticle(){},playSound(){}},isInWater:false,isFalling:false,
 getComponent:n=>n==='minecraft:health'?{currentValue:4,effectiveMax:20}:n==='minecraft:equippable'?{getEquipment:s=>s==='Chest'?gear:undefined}:undefined,
 getEffect:id=>id==='poison'?{}:undefined,removeEffect:id=>removed.push(id),sendMessage:m=>msgs.push(String(m)),playSound(){},extinguishFire(){removed.push('fire');return true;}};
let gear=item(sample('浄化の衣').code);
srv.__players.push(player);
RR.installRunes({game:{peek:()=>({}),execute:()=>''},refreshGame:()=>({})});
const hurt=ev=>{for(const f of srv.__listeners.entityHurt??[])f(ev);};
// poison: no attacker
hurt({hurtEntity:player,damageSource:{cause:'magic'}});
assert.ok(removed.includes('poison'),'浄化の衣 went off on poison damage: '+msgs.join(' | '));
console.log('rune hurt ok');
