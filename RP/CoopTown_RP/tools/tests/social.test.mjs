// 2026-10-27 batch: title announcements, friend mail, the merchant's prices, notices with items, やり込み engine,
// wardrobe / pet files, the made: key fix and job.count keys.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const {createEngine,newDatabase}=await load('game-engine.js');
let db=newDatabase(),clock=Date.UTC(2026,9,27,3);
const game=createEngine({storage:{read:()=>db,write:d=>{db=d;}},now:()=>clock});
game.ensure('a','Aki');game.ensure('b','Ben');
// friend mail: only friends; kept for both; unread until read
assert.throws(()=>game.execute('a','friend.mail',{id:'b',text:'やあ'}),/フレンド/);
game.execute('a','friend.request',{id:'b'});game.execute('b','friend.accept',{id:'a'});
game.execute('a','friend.mail',{id:'b',text:'  こんにちは  '});
assert.deepStrictEqual(db.players.b.talk.a.map(m=>[m.me,m.text]),[[false,'こんにちは']]);assert.strictEqual(db.players.a.talk.b[0].me,true);
assert.strictEqual(db.players.b.unread.a,1);game.execute('b','friend.read',{id:'a'});assert.strictEqual(db.players.b.unread.a,undefined);
for(let i=0;i<40;i++)game.execute('a','friend.mail',{id:'b',text:'m'+i});assert.strictEqual(db.players.a.talk.b.length,30,'kept to 30');
// the merchant: 1.5x to buy, a third to sell
const T=await load('trader-config.js');
const iron=T.normalPrice('minecraft:iron_ingot');assert.ok(iron>0);assert.strictEqual(T.buyPrice('minecraft:iron_ingot'),Math.ceil(iron*1.5));assert.strictEqual(T.sellPrice('minecraft:iron_ingot'),Math.floor(iron/3));
assert.ok(T.TRADER_GOODS.length>20);assert.strictEqual(T.normalPrice('bad id'),0);
db.players.a.coins=0;assert.throws(()=>game.execute('a','trader.buy',{item:T.TRADER_GOODS[0],count:1}),/残高/);
// notices: everyone / one player, items once
const N=await load('notice-config.js');
N.postNotice(db,{by:'staff',title:'メンテ',text:'お詫び',items:[['minecraft:diamond',3]]},clock);N.postNotice(db,{by:'staff',title:'Benだけ',text:'x',to:['b']},clock+1);
assert.deepStrictEqual(N.noticesFor(db,'a').map(n=>n.title),['メンテ']);assert.deepStrictEqual(N.noticesFor(db,'b').map(n=>n.title),['Benだけ','メンテ']);
assert.strictEqual(N.unreadFor(db,'a').length,1);
const id=N.noticesFor(db,'a')[0].id;game.execute('a','notice.claim',{id});assert.throws(()=>game.execute('a','notice.claim',{id}),/受取済み/);
assert.strictEqual(N.unreadFor(db,'a').length,0);
// やり込み: mastery stars, perk, goal, guild, season
const PC=await load('progress-config.js');
db.players.a.level=60;db.players.a.maxXp=99999;game.execute('a','job.earn',{xp:2000,skill:'gather'});
assert.ok(db.players.a.mastery?.xp>0,'mastery fills past Lv.50');db.players.a.mastery.xp=PC.MASTERY.perStar*2;
game.execute('a','mastery.perk',{perk:'coin'});assert.strictEqual(PC.perkRank(db.players.a,'coin'),1);
game.execute('a','job.count',{key:'fish',amount:5});const goal=PC.goalOfWeek(PC.weekOf(clock));
assert.strictEqual(db.goal.week,PC.weekOf(clock));if(goal.key==='j:fish')assert.strictEqual(db.goal.have,5);
game.execute('a','job.count',{key:'breed'});assert.strictEqual(db.players.a.tally['j:breed'],1,'keys outside the dailies count for titles');
assert.throws(()=>game.execute('a','job.count',{key:'bad key!'}),/対象外/);
assert.ok(db.players.a.season?.work>=5);
assert.ok(PC.COLLECTIONS.every(c=>c.total>0));assert.strictEqual(PC.seasonOf(Date.UTC(2026,9,27)).key,'autumn');assert.strictEqual(PC.seasonOf(Date.UTC(2027,0,5)).id,'2026winter');
// made:<item> (the old made:<ns>:<item> merged)
db.players.a.tally['made:minecraft:beehive']=3;game.execute('a','presence');assert.strictEqual(db.players.a.tally['made:beehive'],3);assert.strictEqual(db.players.a.tally['made:minecraft:beehive'],undefined);
// titles: エピック and above are announced
const src=fs.readFileSync(path.join(dir,'game-runtime.js'),'utf8');assert.ok(/ANNOUNCE_RANKS=new Set\(\['エピック','レジェンド','アセンデッド'\]\)/.test(src));
// wardrobe and pets: the packs' files
const player=JSON.parse(fs.readFileSync(path.join(bp,'entities/player.json'),'utf8'))['minecraft:entity'];
assert.strictEqual(player.description.identifier,'minecraft:player');assert.ok(player.description.properties['cooptown:skin']&&player.description.properties['cooptown:hide_armor'].client_sync);
const W=await load('wardrobe.js');assert.strictEqual(player.description.properties['cooptown:skin'].range[1],W.SKINS.length-1);
const pe=JSON.parse(fs.readFileSync(path.join(rp,'entity/player.entity.json'),'utf8'))['minecraft:client_entity'].description;
for(let i=1;i<W.SKINS.length;i++){assert.ok(pe.textures['ct_skin_'+i]);assert.ok(fs.existsSync(path.join(rp,pe.textures['ct_skin_'+i]+'.png')));}
assert.ok(fs.readdirSync(path.join(rp,'attachables/armor')).length>=29);
const cat=JSON.parse(fs.readFileSync(path.join(bp,'entities/cat.json'),'utf8'))['minecraft:entity'];const P=await load('pet-runtime.js');
for(const [b] of P.CAT_BREEDS)assert.ok(cat.events['cooptown:breed_'+b],'cat breed event '+b);
assert.strictEqual(P.canBePet({typeId:'minecraft:zombie'},'a').length>0,true);
console.log('SOCIAL PASS');
// staff give / take titles (admin.title)
{const {createEngine:ce,newDatabase:nd}=await load('game-engine.js');let d2=nd();const g2=ce({storage:{read:()=>d2,write:x=>{d2=x;}}});g2.ensure('s','Staff');g2.ensure('t','Tom');
 assert.throws(()=>g2.execute('s','admin.title',{target:'t',title:'記念'}),/運営/);
 g2.execute('s','admin.title',{target:'t',title:'第1回収穫祭優勝',isAdmin:true});assert.deepStrictEqual(d2.players.t.titles,['第1回収穫祭優勝']);
 assert.throws(()=>g2.execute('s','admin.title',{target:'t',title:'第1回収穫祭優勝',isAdmin:true}),/もう持って/);
 g2.execute('t','title.equip',{title:'第1回収穫祭優勝'});g2.execute('s','admin.title',{target:'t',title:'第1回収穫祭優勝',remove:true,isAdmin:true});
 assert.deepStrictEqual(d2.players.t.titles,[]);assert.strictEqual(d2.players.t.title,undefined);
 console.log('ADMIN TITLE PASS');}
// the book's フレンド page: slots in step with the RP page, buttons for a friend / an empty list
{const FB=await load('friend-book.js'),{friendApi}=await load('friend-runtime.js');
 const src=fs.readFileSync(path.join(rp,'tools/build-book-ui.mjs'),'utf8');const m=/const FRIEND_SLOTS=(\{[^}]*\})/.exec(src);
 assert.deepStrictEqual(Function('return '+m[1])(),FB.FRIEND_SLOTS,'BP / RP slots agree');
 const ui=JSON.parse(fs.readFileSync(path.join(rp,'ui/cooptown_book.json'),'utf8'));assert.ok(ui.friends);
 assert.ok(fs.readFileSync(path.join(rp,'ui/server_form.json'),'utf8').includes("ct:book:friends"));
 const fr=[{id:'h',name:'Haru',job:'農家',level:12,title:'畑の守り人',unread:2,seen:1}];
 Object.assign(friendApi,{data:()=>({friends:fr,requests:[],coins:0,known:()=>true,view:()=>undefined}),online:()=>({}),addable:()=>[],ago:()=>'',where:()=>'ここ'});
 const b=FB.friendButtons({},{tab:0,sel:0,page:0,query:''});assert.strictEqual(b.length,FB.FRIEND_SLOTS.note-4+1);
 assert.ok(b[FB.FRIEND_SLOTS.rows-4][0].startsWith('ct:frs|Haru'));assert.ok(fs.existsSync(path.join(rp,'textures/cooptown/friends/row.json')));assert.strictEqual(b[FB.FRIEND_SLOTS.rows-4][1],'textures/cooptown/skins/farmer');
 assert.strictEqual(b[FB.FRIEND_SLOTS.talk-4][0],'ct:fc|2');assert.strictEqual(b[FB.FRIEND_SLOTS.title-4][0],'ct:d_title|畑の守り人');
 const e=FB.friendButtons({},{tab:1,sel:0,page:0,query:'zz'});assert.strictEqual(e.length,b.length,'same slots when empty');
 console.log('FRIEND PAGE PASS');}
// title rank badges: one picture per rank, used by the list and the ribbons
{const TC=await load('titles-config.js'),BP_=await load('book-pages.js');
 for(const r of TC.TITLE_RANKS){const t=TC.rankBadge(r);assert.ok(fs.existsSync(path.join(rp,t+'.png')),t);}
 assert.strictEqual(TC.rankBadge('特別'),'textures/cooptown/titles/rank_3');
 const epic=TC.TITLES.find(t=>t.rank==='エピック');assert.strictEqual(BP_.titleBadge(epic.title),'textures/cooptown/titles/rank_4');
 const ui=JSON.stringify(JSON.parse(fs.readFileSync(path.join(rp,'ui/cooptown_book.json'),'utf8')));assert.ok(!ui.includes('title_medal'),'ribbons use the badge');
 console.log('RANK BADGE PASS');}
// title banners: kinds 5-10, two plain marks each, waiting their turn
{const N=await load('notify.js'),G=await load('map-glyphs.js');const TC=await load('titles-config.js');
 assert.deepStrictEqual(N.TITLE_KINDS.map(k=>k.rank),TC.TITLE_RANKS);assert.strictEqual(N.titleKind('エピック'),8);assert.strictEqual(N.titleKind('x'),0);
 const srv=await import('@minecraft/server');srv.system.currentTick=0;const pl={id:'pp'};N.notify(pl,'畑の守り人',N.titleKind('ブロンズ'),6);const t=12;
 const m=N.noticeMarks(pl,t);assert.ok(m.includes(G.MAP_GLYPHS['token:nt1'])&&m.includes(G.MAP_GLYPHS['token:nt2'])&&!m.includes(G.MAP_GLYPHS['token:nt3']),'bronze = nt1 + nt2');
 assert.strictEqual(N.noticeText(pl),'畑の守り人');
 N.notify(pl,'二つ目',N.titleKind('レジェンド'),6);assert.strictEqual(N.noticeText(pl),'畑の守り人','the second waits');
 for(let n=1;n<=6;n++)assert.ok(fs.existsSync(path.join(rp,`textures/cooptown/notify/title_${n}.png`)));
 const hud=fs.readFileSync(path.join(rp,'ui/hud_screen.json'),'utf8');assert.ok(hud.includes('textures/cooptown/notify/title_6')&&hud.includes('"title_5"'));
 const src=fs.readFileSync(path.join(rp,'tools/build-hud-log.mjs'),'utf8');const pairs=JSON.parse(/const RANK_PAIRS=(\[[^;]*\]);/.exec(src)[1]);
 assert.deepStrictEqual(pairs,N.TITLE_KINDS.map(k=>k.pair),'BP / RP pairs agree');
 console.log('TITLE BANNER PASS');}
// town music: in / out of the town, the next track, sound events for every track (the game's own files)
{const B=await load('town-bgm.js');const ow='minecraft:overworld';
 // the 最初の町 box of hud-info.js PLACES (x -625..-288, z -191..256)
 assert.ok(B.inTown(ow,{x:-400,z:0}));assert.ok(!B.inTown(ow,{x:-700,z:0}));assert.ok(!B.inTown('minecraft:nether',{x:-400,z:0}));
 assert.ok(B.inTown(ow,{x:-280,z:0}),'the second box (x -286..-254)');assert.ok(!B.inTown(ow,{x:-250,z:0}));assert.ok(!B.inTown(ow,{x:-270,z:-100}));
 // outside the town it gets quieter piece by piece: full inside, none at TOWN_BGM.fade blocks out
 assert.strictEqual(B.outside(ow,{x:-400,z:0}),0);assert.strictEqual(B.outside(ow,{x:-700,z:0}),75);assert.strictEqual(B.outside('minecraft:nether',{x:0,z:0}),Infinity);
 assert.strictEqual(B.fadeAt(0),1);assert.ok(B.fadeAt(B.TOWN_BGM.fade/2)>.4&&B.fadeAt(B.TOWN_BGM.fade/2)<.6);assert.strictEqual(B.fadeAt(B.TOWN_BGM.fade),0);
 // every piece is a defined music sound with its file (RP sounds/cooptown/bgm/city/NN.ogg)
 const defs=JSON.parse(fs.readFileSync(path.join(rp,'sounds/sound_definitions.json'),'utf8')).sound_definitions;
 for(let i=0;i<B.TOWN_BGM.pieces;i++){const d=defs[B.pieceSound(i)];assert.ok(d&&d.category==='music',B.pieceSound(i));assert.ok(fs.existsSync(path.join(rp,d.sounds[0].name+'.ogg')),'piece file '+i);}
 assert.ok(fs.readFileSync(path.join(dir,'commands.js'),'utf8').includes("bgm:{run:p=>H.bgm?.(p)"));
 console.log('TOWN BGM PASS');}
// NPCs: standing (shops) and walking a lot (residents), staff can set each
{const N=await load('npc-runtime.js');
 assert.strictEqual(N.moveOf('merchant'),'stay');assert.strictEqual(N.moveOf('farmer'),'stay');assert.strictEqual(N.moveOf('keeper'),'stay');
 assert.strictEqual(N.moveOf('resident'),'roam');assert.strictEqual(N.moveOf('client'),'roam');
 assert.strictEqual(N.moveOf('merchant','roam'),'roam');assert.strictEqual(N.moveOf('resident','stay'),'stay');
 const e=JSON.parse(fs.readFileSync(path.join(bp,'entities/villager_npc.json'),'utf8'))['minecraft:entity'];
 assert.deepStrictEqual(e.events['cooptown:mode_stay'].remove.component_groups,['cooptown:day','cooptown:night']);assert.ok(e.component_groups['cooptown:stay']&&!e.component_groups['cooptown:stay']['minecraft:behavior.random_stroll']);
 assert.ok(e.component_groups['cooptown:day']['minecraft:behavior.random_stroll'].interval<=20,'roaming NPCs walk often');
 console.log('NPC MOVE PASS');}
