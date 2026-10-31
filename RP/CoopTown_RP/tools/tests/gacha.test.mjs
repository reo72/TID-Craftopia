// Gacha: three kinds, live rates over published prizes, pity per kind (boundary, resets, 10-pull), daily tickets.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const C=await load('gacha-config.js');const {createEngine,newDatabase}=await load('game-engine.js');
const {GACHA,GACHA_PRIZES,liveRates,prizeList,drawOnce,pityLeft,gachaDay}=C;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

// design rates sum to 100
for(const k of C.GACHA_KINDS)assert.strictEqual(Object.values(GACHA[k].rates).reduce((s,x)=>s+x,0),100);
// every rarity has prizes (2026-10-30: 仮の景品 in the epic / legend slots) -> the design's rates and working pity
assert.deepStrictEqual(liveRates('daily'),{C:65,R:25,E:9,L:1});assert.deepStrictEqual(liveRates('normal'),{C:50,R:32,E:15,L:3});assert.deepStrictEqual(liveRates('epic'),{R:60,E:35,L:5});
for(const k of C.GACHA_KINDS){const l=prizeList(k);near(l.reduce((s,v)=>s+v.chance,0),100);assert.ok(l.every(v=>v.give.length&&v.give.every(([id,n])=>/^minecraft:[a-z_]+$/.test(id)&&n>0)));assert.ok(l.every(v=>C.GACHA_CONTENTS[v.id]));}
assert.strictEqual(pityLeft('daily',{},'E'),30);assert.strictEqual(pityLeft('daily',{},'L'),null,'daily: no legend pity');
assert.strictEqual(pityLeft('normal',{},'L'),90);assert.strictEqual(pityLeft('epic',{},'E'),10);assert.strictEqual(pityLeft('epic',{},'L'),40);
{let cnt={},hit;for(let i=0;i<30;i++){const d=drawOnce('daily',cnt,()=>0);if(d.pity)hit=i;}assert.strictEqual(hit,29,'the 30th daily draw is raised to epic');}

// full design table (as if every slot were published): 10 dummy prizes per rarity
const dummy=k=>Object.fromEntries(C.RARITIES.map(x=>[x,GACHA[k].rates[x]?Array.from({length:10},(_,i)=>({id:`${k}-${x}-${i}`,name:x+i,give:[['minecraft:stone',1]]})):[]]));
const FULL=Object.fromEntries(C.GACHA_KINDS.map(k=>[k,dummy(k)]));
assert.deepStrictEqual(liveRates('daily',FULL),{C:65,R:25,E:9,L:1});
assert.deepStrictEqual(liveRates('normal',FULL),{C:50,R:32,E:15,L:3});
assert.deepStrictEqual(liveRates('epic',FULL),{R:60,E:35,L:5});
near(prizeList('normal',FULL).find(v=>v.rarity==='L').chance,0.3);
// roll mapping: 0 -> C, just under 65 -> C, 65 -> R, 99.5 -> L (daily)
const one=(k,x,c={})=>drawOnce(k,c,(()=>{let q=[x,0];return ()=>q.shift()??0;})(),FULL);
assert.strictEqual(one('daily',0).rarity,'C');assert.strictEqual(one('daily',.6499).rarity,'C');assert.strictEqual(one('daily',.65).rarity,'R');
assert.strictEqual(one('daily',.90).rarity,'E');assert.strictEqual(one('daily',.995).rarity,'L');assert.strictEqual(one('epic',0).rarity,'R');
// rarity's prize is uniform: second random picks the slot
assert.strictEqual(drawOnce('daily',{},(()=>{let q=[0,.95];return ()=>q.shift();})(),FULL).prize.id,'daily-C-9');

// pity boundaries with all-common rolls
const run=(k,n,c={})=>{const out=[];for(let i=0;i<n;i++)out.push(drawOnce(k,c,()=>0,FULL));return {out,c};};
let {out,c}=run('daily',30);assert.ok(out.slice(0,29).every(v=>v.rarity==='C'));assert.strictEqual(out[29].rarity,'E');assert.strictEqual(out[29].pity,'E');assert.deepStrictEqual(c,{E:0});
({out,c}=run('normal',90));
assert.deepStrictEqual(out.map((v,i)=>v.pity?i+1:0).filter(Boolean),[30,60,90]);assert.strictEqual(out[89].rarity,'L');assert.deepStrictEqual(c,{E:0,L:0});
assert.strictEqual(out[29].rarity,'E');
({out,c}=run('epic',40));assert.deepStrictEqual(out.map((v,i)=>v.pity?i+1:0).filter(Boolean),[10,20,30,40]);assert.strictEqual(out[39].rarity,'L');assert.strictEqual(out[0].rarity,'R');
// both due at once -> legend
c={E:29,L:89};assert.strictEqual(drawOnce('normal',c,()=>0,FULL).rarity,'L');assert.deepStrictEqual(c,{E:0,L:0});
// a natural epic resets E only; a natural legend resets both; a natural legend on the E pity draw keeps legend
c={E:5,L:50};assert.strictEqual(drawOnce('normal',c,()=>.9,FULL).rarity,'E');assert.deepStrictEqual(c,{E:0,L:51});
c={E:5,L:50};assert.strictEqual(drawOnce('normal',c,()=>.99,FULL).rarity,'L');assert.deepStrictEqual(c,{E:0,L:0});
c={E:29,L:3};const nat=drawOnce('normal',c,()=>.99,FULL);assert.strictEqual(nat.rarity,'L');assert.strictEqual(nat.pity,null);
assert.strictEqual(pityLeft('normal',{E:29,L:80},'E',FULL),1);assert.strictEqual(pityLeft('normal',{E:29,L:80},'L',FULL),10);assert.strictEqual(pityLeft('daily',{},'L',FULL),null);
// statistical check of the live table
{let seq=0;const rnd=()=>((seq=(seq*1103515245+12345)%2147483648)/2147483648);const n={C:0,R:0,E:0,L:0};const cc={};for(let i=0;i<20000;i++)n[drawOnce('normal',cc,rnd).rarity]++;
 assert.ok(Math.abs(n.C/20000-.5)<0.02,JSON.stringify(n));assert.ok(n.E/20000>=.14&&n.L/20000>=.025,JSON.stringify(n));} // pity lifts E / L a little above 15 % / 3 %

// engine: tickets, daily claim (05:00 JST), cap, 10-pull, history
let db=newDatabase(),plans=[],t=Date.UTC(2026,9,27,0,0); // 09:00 JST
const g=createEngine({storage:{read:()=>db,write:d=>{db=d;}},inventory:{plan:(id,take,give)=>{plans.push(give);return {apply(){},rollback(){}};}},now:()=>t,random:()=>0});
g.ensure('a','A');db.players.a.tickets=12; // old gacha tickets -> normal tickets
assert.throws(()=>g.execute('a','gacha.draw',{kind:'daily',count:1}),/デイリーチケットが足りません/);
g.execute('a','gacha.claim');assert.strictEqual(db.players.a.gacha.daily,1);assert.throws(()=>g.execute('a','gacha.claim'),/受取済み/);
db.players.a.daily.claimed=[0,1,2];assert.match(g.execute('a','daily.bonus'),/デイリーチケット1枚/);assert.strictEqual(db.players.a.gacha.daily,2);assert.strictEqual(db.players.a.tickets,12);
assert.match(g.execute('a','gacha.draw',{kind:'daily',count:1}),/デイリーガチャ 1回\nコモン　灯り補充/);assert.deepStrictEqual(plans.at(-1),[['minecraft:torch',16]]);
// day turns at 05:00 JST: 04:59 JST next day still the same gacha day, 05:00 new
assert.strictEqual(gachaDay(Date.UTC(2026,9,27,19,59)),gachaDay(t));assert.notStrictEqual(gachaDay(Date.UTC(2026,9,27,20,0)),gachaDay(t));
t=Date.UTC(2026,9,27,19,59);assert.throws(()=>g.execute('a','gacha.claim'),/受取済み/);
t=Date.UTC(2026,9,27,20,0);g.execute('a','gacha.claim');assert.strictEqual(db.players.a.gacha.daily,2);
// cap of 2 per gacha day: the bonus first, then the free one, then nothing more
db.players.a.gacha.got=2;db.players.a.gacha.claimed=false;assert.throws(()=>g.execute('a','gacha.claim'),/1日2枚まで/);
// 10-pull normal: needs 10, merges the items, keeps the history (max 20)
assert.match(g.execute('a','gacha.draw',{kind:'normal',count:10}),/ノーマルガチャ 10回/);assert.strictEqual(db.players.a.tickets,2);
assert.deepStrictEqual(plans.at(-1),[['minecraft:oak_log',160]]);assert.strictEqual(db.players.a.gacha.history.length,11);
assert.throws(()=>g.execute('a','gacha.draw',{kind:'normal',count:10}),/ノーマルチケットが足りません/);
assert.throws(()=>g.execute('a','gacha.draw',{kind:'bogus',count:1}),/種類/);
assert.throws(()=>g.execute('a','gacha.draw',{kind:'epic',count:3}),/1回または10回/);
assert.strictEqual(db.players.a.tally.gacha,11);
// level milestones: normal every 5, epic every 20
g.execute('a','admin.tickets',{isAdmin:true,target:'a',amount:1,kind:'エピック'});assert.strictEqual(db.players.a.gacha.epic,1);
db.players.a.level=19;db.players.a.xp=db.players.a.maxXp-1;g.execute('a','job.earn',{xp:2,skill:'gather'});
assert.strictEqual(db.players.a.level,20);assert.strictEqual(db.players.a.gacha.epic,2);
// a 10-pull of epic with all-rare rolls: 9 rares, then the pity's epic on the 10th
db.players.a.gacha.epic=10;g.execute('a','gacha.draw',{kind:'epic',count:10});assert.strictEqual(db.players.a.gacha.epic,0);assert.strictEqual(db.players.a.gacha.history.length,20);
{const h=db.players.a.gacha.history.slice(0,10);assert.ok(h.every(v=>v.kind==='epic'));assert.strictEqual(h.filter(v=>v.rarity==='R').length,9);assert.strictEqual(h.filter(v=>v.rarity==='E').length,1);}
console.log('ok gacha');
