// Playing needs a site link: unlinked players are stopped, !link frees them, the site's answer frees earlier links,
// admins are never stopped and can let someone in. Usage: node --import ./register.mjs gate.test.mjs <portal scripts>
import assert from 'assert';import path from 'path';import {pathToFileURL} from 'url';
const PORTAL=path.resolve(process.argv[2]);
const srv=await import('@minecraft/server');const admin=await import('@minecraft/server-admin');
const {tick,world,makePlayer}=srv;
const linkedOnSite=new Set(['old']);
globalThis.__site=(method,p,body,params)=>{
 if(p==='/api/game/linked')return {status:200,body:{linked:linkedOnSite.has(params.get('xuid'))}};
 if(p==='/api/game/link'){if(body.code==='GOOD12'){linkedOnSite.add(body.xuid);return {status:200,body:{discordUsername:'Alice'}};}return {status:404,body:{error:'not_found'}};}
 return {status:200,body:{}};
};
const withInputs=p=>{p.inputs={};p.inputPermissions={setPermissionCategory:(c,on)=>{p.inputs[c]=on;}};p.effects=[];p.addEffect=(id)=>p.effects.push(id);
 p.bar='';p.onScreenDisplay={setActionBar:t=>{p.bar=t;}};return p;};
const G=await import(pathToFileURL(path.join(PORTAL,'gate.js')).href);
const L=await import(pathToFileURL(path.join(PORTAL,'link.js')).href);
G.installGate();L.installLink();
const newbie=withInputs(makePlayer('new1','Newbie')),old=withInputs(makePlayer('old','Veteran')),op=withInputs(makePlayer('op','REO722'));op.addTag(G.GATE.adminTag);
await tick(45);
assert.strictEqual(newbie.inputs[2],false,'stopped');assert.ok(newbie.bar.includes('!link'));assert.ok(newbie.messages.some(m=>m.includes('portal.example.test')));
assert.ok(newbie.effects.includes('resistance'));
assert.ok(G.isLinked('old')&&old.inputs[2]!==false,'linked before: the site says so, so not stopped (or freed at once)');
assert.strictEqual(op.inputs[2],undefined,'admins are never stopped');
// a wrong code keeps them stopped, the right one frees them and is remembered
world.beforeEvents.chatSend.fire({message:'!link BAD123',sender:newbie,cancel:false});await tick(5);
assert.strictEqual(newbie.inputs[2],false);
world.beforeEvents.chatSend.fire({message:'!link GOOD12',sender:newbie,cancel:false});await tick(5);
assert.strictEqual(newbie.inputs[2],true,'freed');assert.ok(newbie.messages.some(m=>m.includes('遊べるようになりました')));
assert.ok(JSON.parse(world.getDynamicProperty(G.GATE.key)).includes('new1'));
await tick(45);assert.strictEqual(newbie.inputs[2],true,'stays free');
// an admin lets someone in by hand; others cannot
const guest=withInputs(makePlayer('g1','Guest'));await tick(45);assert.strictEqual(guest.inputs[2],false);
const e1={message:'!linkok Guest',sender:newbie,cancel:false};world.beforeEvents.chatSend.fire(e1);await tick(2);
assert.ok(e1.cancel&&newbie.messages.some(m=>m.includes('運営だけ')));assert.strictEqual(guest.inputs[2],false);
world.beforeEvents.chatSend.fire({message:'!linkok Guest',sender:op,cancel:false});await tick(2);
assert.strictEqual(guest.inputs[2],true);
// switched off in variables.json: nobody is stopped
admin.variables.values.require_link=false;const late=withInputs(makePlayer('l1','Late'));await tick(45);assert.strictEqual(late.inputs[2],undefined);
console.log('gate ok');
