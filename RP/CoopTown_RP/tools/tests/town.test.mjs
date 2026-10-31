// 街の発展: shared buildings (town-config / town-engine), the admin controls, the notebook page and its delivery flow.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server'),ui=await import('@minecraft/server-ui');
const {createEngine,newDatabase}=await load('game-engine.js');
const C=await load('town-config.js');const {BUILDINGS,STAGES,KINDS,needOf,stageSlots,stageOf}=C;

// ---- data matches the design table ----
const sum=b=>Object.values(BUILDINGS[b].needs).reduce((a,n)=>a+n,0);
for(let b=0;b<5;b++)assert.strictEqual(sum(b),10000,BUILDINGS[b].name+' totals 10,000');
assert.deepStrictEqual(BUILDINGS.map(b=>b.name),['時計台','鍛冶屋','商会','船','教会']);
for(const k of Object.keys(KINDS))assert.ok(KINDS[k].items.length&&KINDS[k].points>0,k);
const build0={active:20,percent:100,got:{}};
assert.strictEqual(needOf(build0,0,0,'cobble'),750);assert.strictEqual(needOf(build0,0,1,'cobble'),1000);assert.strictEqual(needOf(build0,0,2,'cobble'),750);
assert.strictEqual(needOf({...build0,active:10},0,0,'cobble'),375,'half the players, half the amount');
assert.strictEqual(needOf({...build0,percent:10},0,0,'gold'),3,'percent scales; at least 1');

// ---- engine ----
let db=newDatabase(),takes=[];
const game=createEngine({storage:{read:()=>db,write:d=>{db=d;}},inventory:{plan:(id,take)=>{takes.push(take);return {apply(){},rollback(){}};}}});
game.ensure('a','Alice');game.ensure('b','Bob');
const A=(action,a)=>game.execute('a','admin.'+action,{isAdmin:true,...a});
A('town.scale',{active:1,percent:100}); // 1/20 of the design: cobble 2500 -> 38 / 50 / 38 per stage
const B=()=>db.town.build;
assert.strictEqual(db.town.level,1);assert.strictEqual(B().index,0);
const slots=()=>stageSlots(B(),B().index,stageOf(B(),B().index));
const coins0=db.players.a.coins;
let m=game.execute('a','town.build',{items:[['minecraft:cobblestone',30],['minecraft:cobbled_deepslate',20],['minecraft:glass',5]]});
assert.match(m,/時計台の基礎へ43個/);assert.match(m,/超えた12個/,'over the need is refused');
assert.deepStrictEqual(takes.at(-1),[['minecraft:cobblestone',30,{exact:true,loose:false}],['minecraft:cobbled_deepslate',8,{exact:true,loose:false}],['minecraft:glass',5,{exact:true,loose:false}]]);
assert.strictEqual(db.players.a.coins,coins0,'no coins for town deliveries');
assert.strictEqual(B().contrib.a,38*1+5*2,'points: cobble 1, glass 2');assert.strictEqual(db.players.a.stats.townPoints,48);assert.strictEqual(db.players.a.stats.townDonations,1);
assert.strictEqual(db.players.a.daily.counts.town,1,'daily 街へ素材を届ける counts');
assert.throws(()=>game.execute('a','town.build',{items:[['minecraft:cobblestone',5]]}),/もう必要ない/,'a full kind takes nothing more');
assert.throws(()=>game.execute('a','town.build',{items:[['minecraft:diamond',5]]}),/使わない素材/);
assert.throws(()=>game.execute('a','town.build',{items:[]}),/素材がありません/);
// 先行納品: the next building's 基礎 only
m=game.execute('b','town.build',{target:'next',items:[['minecraft:coal',100]]});assert.match(m,/鍛冶屋の基礎（先行納品）へ23個/);
assert.strictEqual(B().byBuilding[1].b,23);
// fill the rest of the clock tower stage by stage
const fill=(who,target)=>{const b=B(),bi=target==='next'?b.index+1:b.index,s=target==='next'?0:stageOf(b,bi);
 const items=stageSlots(b,bi,s).filter(v=>v.left).map(v=>[KINDS[v.kind].items[0],v.left]);return game.execute(who,'town.build',{target,items});};
m=fill('b');assert.match(m,/基礎が完成/);assert.strictEqual(stageOf(B(),0),1);
m=fill('b');assert.match(m,/骨組みが完成/);
m=fill('a');assert.match(m,/時計台が完成しました！ 街 Lv.2/);
assert.strictEqual(db.town.level,2);assert.strictEqual(B().index,1);assert.deepStrictEqual(B().trials,[2],'the trial for Lv2 is waiting');assert.strictEqual(B().done[0].index,0);
// pre-delivered foundation is kept for the smithy
assert.strictEqual(stageSlots(B(),1,0).find(v=>v.kind==='coal').got,23);
fill('a','next');assert.strictEqual(stageOf(B(),2),1,'guild foundation done ahead');
assert.throws(()=>game.execute('a','town.build',{target:'next',items:[['minecraft:oak_planks',1]]}),/基礎は必要量に達して/);
// loose kinds (enchanted books, potions) are marked so the inventory takes them
A('town',{level:5});assert.strictEqual(B().index,4);assert.strictEqual(db.town.level,5);
game.execute('a','town.build',{items:[['minecraft:enchanted_book',2]]});assert.deepStrictEqual(takes.at(-1),[['minecraft:enchanted_book',2,{exact:true,loose:true}]]);
// admin: stage and finishing everything
A('town.stage',{stage:2});assert.strictEqual(stageOf(B(),4),2);assert.strictEqual(stageSlots(B(),4,2).every(v=>v.got===0),true);
m=fill('b');assert.match(m,/教会が完成しました！ 街 Lv.6/);assert.strictEqual(db.town.level,6);
assert.throws(()=>game.execute('a','town.build',{items:[['minecraft:glass',1]]}),/すべての共有建築が完成/);
assert.throws(()=>A('town',{level:7}),/1～6/);
A('town',{level:1});assert.strictEqual(B().index,0);assert.strictEqual(db.town.level,1);
assert.deepStrictEqual(C.ranking(B()).map(x=>x.id),C.ranking(B()).sort((x,y)=>y.points-x.points).map(x=>x.id));
// old ledgers: the old level becomes the building index
{const old=newDatabase();old.town.level=3;old.town.total=1100;old.players={};let d=old;const g=createEngine({storage:{read:()=>d,write:x=>{d=x;}}});g.ensure('z','Z');assert.strictEqual(d.town.build.index,2);assert.strictEqual(d.town.level,3);}
// the achievements for points
// points are kept per player for titles / the memorial (no point titles yet: the HUD title pictures would need a rebuild)
assert.ok(db.players.b.stats.townPoints>0);

// ---- notebook page and the real inventory ----
const {game:live,refreshGame}=await load('game-runtime.js');
const {townModel}=await load('town-book.js');const {listButtons}=await load('book-pages.js');
const {openBook,HOME2_CARDS}=await load('book.js');const {BOOK_TABS}=await load('book-frame.js');
const inv=[];const props=new Map();
const player={id:'T1',name:'Taro',typeId:'minecraft:player',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getTags:()=>[],hasTag:()=>false,addTag(){},removeTag(){},sendMessage(){},playSound(){},
 getComponent:()=>({container:{size:36,getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;},addItem(it){inv.push(it);},emptySlotsCount:30}}),location:{x:0,y:64,z:0},dimension:{id:'minecraft:overworld'},onScreenDisplay:{setTitle(){},setActionBar(){}}};
srv.__players.length=0;srv.__players.push(player);refreshGame(player);
live.execute(player.id,'admin.town.scale',{isAdmin:true,active:1,percent:100});
srv.ItemStack.prototype.clone??=function(){return Object.assign(new srv.ItemStack(this.typeId,this.amount),this);}; // the stub has no clone
const named=new srv.ItemStack('minecraft:cobblestone',64);named.nameTag='宝物';
inv[0]=new srv.ItemStack('minecraft:cobblestone',20);inv[1]=named;inv[2]=new srv.ItemStack('minecraft:glass',64);inv[3]=new srv.ItemStack('minecraft:dirt',5);
const book=JSON.parse(fs.readFileSync(path.join(rp,'ui/cooptown_book.json'),'utf8'));
for(const tab of [0,1,2,3])for(const sel of [0,3,9]){const snap=live.snapshot(player.id),state={tab,sel,offset:0},s=townModel.spec(player,snap,state);
 assert.ok(s.rows.length>0,'rows on tab '+tab);for(const x of [s.detail?.icon,...s.rows.map(r=>r.icon)].filter(Boolean))assert.ok(fs.existsSync(path.join(rp,x+'.png')),'icon '+x);
 const buttons=listButtons({...s,tab,sel:Math.min(sel,s.rows.length-1),offset:0});assert.ok(buttons.every(b=>typeof b[0]==='string'));}
let s=townModel.spec(player,live.snapshot(player.id),{tab:0,sel:0,offset:0});
assert.match(s.summary,/街 Lv.1　時計台　基礎 0%/);assert.strictEqual(s.rows[0].title,'丸石');assert.match(s.rows[0].sub,/残り 38/);assert.strictEqual(s.rows[0].have,20,'the named stack is not counted');
// 街の発展 card -> まとめて納品 -> confirm -> result -> close
const T=BOOK_TABS.length,k=HOME2_CARDS.findIndex(c=>c[0]==='town');
ui.__forms.length=0;srv.__chat.length=0;ui.setAnswers([T+8,T+k,T+31,1,1]);await openBook(player);
assert.ok(ui.__forms.some(f=>f.t==='ct:book:list'),'the list page opened');
assert.strictEqual(inv[0],undefined,'20 cobblestone taken');assert.strictEqual(inv[1].amount,64,'named stack kept');assert.strictEqual(inv[2].amount,64-8,'glass: the stage needs 8');assert.strictEqual(inv[3].amount,5);
const st=live.snapshot(player.id).town.build;assert.strictEqual(st.contrib[player.id],20+8*2);
// the last pieces of the stage: the whole server hears it
const left=stageSlots(st,0,0).filter(v=>v.left);inv.length=0;left.forEach((v,i)=>{inv[i]=new srv.ItemStack(KINDS[v.kind].items[0],v.left);});
ui.__forms.length=0;ui.setAnswers([T+8,T+k,T+31,1,1]);await openBook(player);
assert.ok(srv.__chat.some(c=>/時計台の基礎が完成しました（Taroさんの納品で達成）/.test(c)),srv.__chat.join('|'));
s=townModel.spec(player,live.snapshot(player.id),{tab:0,sel:0,offset:0});assert.match(s.right,/骨組み/);
s=townModel.spec(player,live.snapshot(player.id),{tab:3,sel:0,offset:0});assert.match(s.rows[0].title,/1位　Taro/);
// the wide button opens the town facilities (warehouse and so on)
ui.__forms.length=0;ui.setAnswers([T+8,T+k,T+32]);await openBook(player);assert.ok(ui.__forms.some(f=>JSON.stringify(f).includes('街の施設')),'facilities menu');
console.log('town ok');
