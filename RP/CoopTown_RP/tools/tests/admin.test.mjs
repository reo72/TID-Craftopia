import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server'),ui=await import('@minecraft/server-ui');
const {createEngine,newDatabase}=await load('game-engine.js');
const {installAdmin,openAdmin,ADMIN_LAYOUT,SECTIONS,buildForm}=await load('admin-runtime.js');

// ---- engine ----
let db=newDatabase(),clock=Date.UTC(2026,9,16,3);
const game=createEngine({storage:{read:()=>db,write:d=>{db=d;}},now:()=>clock});
game.ensure('admin','Admin');game.ensure('bob','Bob');
const A=(action,a)=>game.execute('admin','admin.'+action,{isAdmin:true,...a});
assert.throws(()=>game.execute('admin','admin.coins',{target:'bob',amount:5}),/運営権限/,'needs isAdmin');
assert.match(A('coins',{target:'bob',amount:500,reason:'補填'}),/\+500/);assert.strictEqual(db.players.bob.coins,500);
assert.throws(()=>A('coins',{target:'bob',amount:-9999}),/不足/);
A('coins',{target:'bob',amount:-200});assert.strictEqual(db.players.bob.coins,300);
A('level',{target:'bob',skill:'mine',level:10});assert.strictEqual(db.players.bob.mine.level,10);assert.strictEqual(db.players.bob.mine.max,550);
A('xp',{target:'bob',skill:'player',amount:150});assert.strictEqual(db.players.bob.level,2);
A('job',{target:'bob',job:'冒険家',second:'鍛冶師'});assert.strictEqual(db.players.bob.secondJob,'鍛冶師');
assert.throws(()=>A('job',{target:'bob',job:'冒険家',second:'冒険家'}),/第2職業/);
db.players.bob.stress=70;A('stress',{target:'bob'});assert.strictEqual(db.players.bob.stress,0);
A('tickets',{target:'bob',amount:3});assert.strictEqual(db.players.bob.tickets,3);
A('reset',{target:'bob',scope:'job'});assert.strictEqual(db.players.bob.job,'未選択');assert.strictEqual(db.players.bob.secondJob,undefined);
A('town',{level:3});assert.strictEqual(db.town.level,3);assert.strictEqual(db.town.build.index,2);
// rates apply to rewards
A('rates',{quest:2,daily:1,town:0.5});assert.deepStrictEqual(db.settings.rates,{quest:2,daily:1,town:0.5});
assert.throws(()=>A('rates',{quest:20,daily:1,town:1}),/倍率/);
// market / request cancel return items and coins
db.market.push({id:900,owner:'bob',name:'Bob',item:'minecraft:diamond',amount:3,price:50});A('market.cancel',{id:900});
assert.deepStrictEqual(db.players.bob.mail.at(-1),['minecraft:diamond',3]);assert.strictEqual(db.market.length,0);
db.requests.push({id:901,owner:'bob',name:'Bob',item:'minecraft:oak_log',amount:5,coins:70});const before=db.players.bob.coins;A('request.cancel',{id:901});assert.strictEqual(db.players.bob.coins,before+70);
// events
A('event.add',{name:'収穫祭',description:'x',delay:0,duration:2,location:{dimension:'minecraft:overworld',x:1,y:2,z:3}});const ev=db.events[0];ev.participants.push('bob');
A('event.reward',{id:ev.id,coins:100,tickets:2});assert.strictEqual(db.players.bob.tickets,5);
A('landmark.add',{name:'遺跡',location:{dimension:'minecraft:overworld',x:0,y:0,z:0}});A('landmark.remove',{id:db.landmarks[0].id});assert.strictEqual(db.landmarks.length,0);
// log, presence, starting wealth
assert.ok(db.adminLog.length>=14);assert.strictEqual(db.adminLog.at(-1).reason,'補填');assert.strictEqual(db.adminLog[0].by,'Admin');
game.execute('bob','presence');assert.strictEqual(db.players.bob.lastSeen,clock);
clock+=86400000;game.execute('bob','presence');assert.strictEqual(db.players.bob.wealthStart,db.players.bob.coins+db.players.bob.bank,'wealth at start of day');
A('reset',{target:'bob',scope:'all'});assert.strictEqual(db.players.bob.coins,0);assert.strictEqual(db.players.bob.guideGiven,true);
console.log('ADMIN ENGINE PASS log',db.adminLog.length);

// ---- screens ----
const uiJson=JSON.parse(fs.readFileSync(path.join(rp,'ui/cooptown_admin.json'),'utf8'));
const names=uiJson.root.controls.find(c=>c.buttons).buttons.controls.map(c=>{const k=Object.keys(c)[0];return [k.split('@')[0],c[k].collection_index];});
assert.ok(names.every(([,i],n)=>i===n));assert.strictEqual(names.length,ADMIN_LAYOUT.total);
const idx=n=>names.find(([k])=>k===n)[1];
for(const [k,v] of Object.entries({home:'home',back:'back',close:'close',rows:'row_0',prev:'prev',next:'next',actions:'action_0',readouts:'title'}))assert.strictEqual(ADMIN_LAYOUT[k],idx(v),k);
assert.strictEqual(idx('section_0'),ADMIN_LAYOUT.sections);
const tags=new Set(['cooptown_admin']);const inv=[];const chat=[];
const admin={id:'admin',name:'Admin',dimension:{id:'minecraft:overworld'},location:{x:10.5,y:64,z:-3.2},hasTag:t=>tags.has(t),addTag:t=>tags.add(t),removeTag:t=>tags.delete(t),sendMessage:m=>chat.push(m),
 onScreenDisplay:{setTitle(){}},getComponent:()=>({container:{addItem:i=>inv.push(i)}})};
const bobTags=new Set();const bob={id:'bob',name:'Bob',hasTag:t=>bobTags.has(t),addTag:t=>bobTags.add(t),removeTag:t=>bobTags.delete(t),onScreenDisplay:{setTitle(){}},getComponent:()=>({container:{addItem(){}}})};
srv.__players.push(admin,bob);
const backupsMade=[];
installAdmin({game,refreshGame:()=>{},itemName:id=>id.replace('minecraft:',''),backups:{list:()=>backupsMade,create:by=>{const b={slot:backupsMade.length,at:clock,by,label:'手動',count:1,size:2048};backupsMade.push(b);return b;},restore:()=>{},usage:()=>({bytes:4096,placedChunks:2,properties:9})}});
const sec=k=>ADMIN_LAYOUT.sections+SECTIONS.findIndex(s=>s[0]===k);
ui.setAnswers([
 sec('players'),idx('row_1'),            // players -> Bob (offline-sorted second? whichever)
 idx('action_0'),['250','テスト'],        // coins +250
 idx('action_3'),idx('action_0'),        // stress 0 -> confirm execute
 idx('back'),
 sec('economy'),idx('action_0'),['1','1.5','1',''], // rates
 sec('town'),idx('action_1'),['北の遺跡'],     // add landmark here
 sec('events'),idx('action_0'),['祭り','説明','0','2'],idx('row_0'),idx('action_0'),['10','1',''],
 sec('notice'),idx('action_0'),['こんばんは'],
 sec('records'),idx('action_0'),
 sec('admins'),idx('row_1'),idx('action_0'),idx('action_0'),
 sec('market'),idx('home'),idx('close')
]);
await openAdmin(admin);
const forms=ui.__forms.filter(f=>f.t==='ct:admin');
for(const f of forms)assert.strictEqual(f.buttons.length,ADMIN_LAYOUT.total,'every screen sends all buttons');
const statuses=forms.map(f=>f.buttons[ADMIN_LAYOUT.readouts+3][0]).filter(Boolean);
assert.ok(!statuses.some(s=>s.includes('§c')),'no error status: '+statuses.filter(s=>s.includes('§c')));
assert.ok(db.events.some(e=>e.name==='祭り'));assert.ok(db.landmarks.some(l=>l.name==='北の遺跡'&&l.location.x===10));
assert.strictEqual(db.settings.rates.daily,1.5);assert.ok(srv.__chat.some(m=>m.includes('こんばんは')));
assert.ok(bobTags.has('cooptown_admin'),'Bob promoted');assert.strictEqual(inv[0]?.typeId,'cooptown:admin_book');
assert.strictEqual(backupsMade.length,1);
assert.ok(db.adminLog.some(l=>l.text.startsWith('お知らせ')));
const titles=forms.map(f=>f.buttons[ADMIN_LAYOUT.readouts][0].replace('§l',''));
console.log('screens visited:',[...new Set(titles)].join(' / '));
// non-admin cannot open
const stranger={...bob,id:'x',hasTag:()=>false,sendMessage:m=>chat.push(m)};const n=ui.__forms.length;await openAdmin(stranger);assert.strictEqual(ui.__forms.length,n);
// rendering: sidebar highlight + pages
const many={section:'players',title:'t',rows:Array.from({length:20},(_,i)=>({text:'r'+i})),actions:[{text:'a',mark:'[warn]'}]};
const b=buildForm(many,{page:1,canBack:true});assert.strictEqual(b.pages,3);assert.match(b.buttons[ADMIN_LAYOUT.sections][0],/\[on\]/);assert.strictEqual(b.buttons[ADMIN_LAYOUT.rows][0],'§rr8');assert.match(b.buttons[ADMIN_LAYOUT.actions][0],/\[warn\]a/);
console.log('ADMIN UI PASS forms',forms.length);
