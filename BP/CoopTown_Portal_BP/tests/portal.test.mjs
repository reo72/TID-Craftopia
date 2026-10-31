// Both packs with a fake site. Usage: node --import ./register.mjs portal.test.mjs <main BP scripts> <portal BP scripts>
import assert from 'assert';import fs from 'fs';import path from 'path';import {pathToFileURL,fileURLToPath} from 'url';
const [MAIN,PORTAL]=process.argv.slice(2).map(p=>path.resolve(p));
const warnings=[];const warn=console.warn;console.warn=(...a)=>{warnings.push(a.join(' '));warn(...a);};
const srv=await import('@minecraft/server');const net=await import('@minecraft/server-net');
const {tick,world,system,makePlayer,players,resetTimers,resetScriptSubs,resetWorldEvents,__props,startup}=srv;
const TMP=path.join(path.dirname(fileURLToPath(import.meta.url)),'run');
// each "server start" loads the link pack from a fresh copy, so its module state starts empty
function copyPack(n){const d=path.join(TMP,'run'+n);fs.rmSync(d,{recursive:true,force:true});fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(PORTAL))fs.copyFileSync(path.join(PORTAL,f),path.join(d,f));return d;}

// ---- fake site ----
const discord=[];
const site={down:false,rev:0,quests:new Map(),byRequest:new Map(),links:{ABC123:'reo#1'},players:[],bestiary:[],town:[],logs:[],seq:0};
const bump=q=>{q.rev=++site.rev;return q;};
globalThis.__site=(method,p,body,params)=>{
 if(p.startsWith('/api/webhooks/')){discord.push(body);return {status:204};}
 if(site.down)return new Error('connect timeout');
 if(p==='/api/game/link'){if(!site.links[body.code])return {status:404,body:{error:'not_found'}};return {status:200,body:{ok:true,discordUsername:site.links[body.code]}};}
 if(p==='/api/game/players'){site.players.push(...body.players);return {status:200,body:{ok:true}};}
 if(p==='/api/game/bestiary'){site.bestiary.push(...body.entries);return {status:200,body:{ok:true}};}
 if(p==='/api/game/town'){site.town.push(body);return {status:200,body:{ok:true}};}
 if(p==='/api/game/logs'){site.logs.push(...body.events);return {status:200,body:{ok:true}};}
 if(p==='/api/game/quests'&&method==='Get'){const since=Number(params.get('since'));return {status:200,body:{rev:site.rev,quests:[...site.quests.values()].filter(q=>q.rev>since)}};}
 if(p==='/api/game/quests'){if(site.byRequest.has(body.requestId))return {status:200,body:site.byRequest.get(body.requestId)};const q=webCreate(body.ownerXuid,body.reward,body.title,body.item,body.qty);site.byRequest.set(body.requestId,q);return {status:201,body:q};}
 const m=p.match(/^\/api\/game\/quests\/([^/]+)\/status$/);
 if(m){const q=site.quests.get(decodeURIComponent(m[1]));if(!q)return {status:404,body:{error:'not_found'}};return webAction(q,body.action,body.xuid,true);}
 return {status:404};
};
function webCreate(owner,reward,title='丸石を集めて',item='丸石',qty=16){const q=bump({id:'q'+(++site.seq),title,item,qty,reward,ownerXuid:owner,takerXuid:null,status:'open',createdAt:Date.now()});site.quests.set(q.id,q);return q;}
function webAction(q,action,xuid,fromGame=false){
 const same=(action==='accept'&&q.status==='accepted'&&q.takerXuid===xuid)||(action==='cancel'&&q.status==='cancelled')||(action==='complete'&&q.status==='done');
 if(same)return {status:200,body:q};
 if(action==='accept'&&q.status==='open'&&q.ownerXuid!==xuid){q.status='accepted';q.takerXuid=xuid;}
 else if(action==='cancel'&&q.status==='open'&&q.ownerXuid===xuid)q.status='cancelled';
 else if(action==='complete'&&fromGame&&q.status==='accepted'&&q.takerXuid===xuid)q.status='done';
 else return {status:409,body:{error:'conflict'}};
 bump(q);return {status:200,body:q};
}

// ---- main pack (engine + bridge) with an in-memory ledger ----
const {createEngine,newDatabase}=await import(pathToFileURL(path.join(MAIN,'game-engine.js')).href);
let ledger=newDatabase();const taken=[];
const storage={read:()=>ledger,write:d=>{ledger=JSON.parse(JSON.stringify(d));}};
const inventory={plan:(id,take,give)=>({apply(){taken.push({id,take,give});},rollback(){}})};
const bridge=await import(pathToFileURL(path.join(MAIN,'portal-bridge.js')).href);
let game;
async function startServer(n,{withMain=true}={}){
 resetTimers();resetScriptSubs();resetWorldEvents();
 game=createEngine({storage,inventory});
 startup.early=true; // the packs' startup code may not touch the world
 if(withMain)bridge.installPortalBridge({game});
 await import(pathToFileURL(path.join(copyPack(n),'main.js')).href);
}
const coins=id=>ledger.players[id].coins;
const sec=s=>tick(s*20);

await startServer(1);
assert.ok(!warnings.some(w=>w.includes('起動に失敗')),'every part starts: '+warnings.join(' | '));
await tick(1);
const A=makePlayer('-100','Alice',[]),B=makePlayer('-200','Bob');
game.ensure(A.id,A.name);game.ensure(B.id,B.name);
ledger.players[A.id].coins=500;ledger.players[B.id].coins=50;

// 1. link
let ev={message:'!link abc123',sender:A,cancel:false};world.beforeEvents.chatSend.fire(ev);assert.ok(ev.cancel,'chat is hidden');
await sec(1);assert.ok(A.messages.some(m=>m.includes('『reo#1』と連携しました')),A.messages.join('|'));
ev={message:'!link ZZZ999',sender:A,cancel:false};world.beforeEvents.chatSend.fire(ev);await sec(1);assert.ok(A.messages.at(-1).includes('期限切れ'));
site.down=true;ev={message:'!link ABC123',sender:A,cancel:false};world.beforeEvents.chatSend.fire(ev);await sec(1);assert.ok(A.messages.at(-1).includes('接続できません'));site.down=false;
const linkCalls=net.http.log.filter(r=>r.path==='/api/game/link');assert.strictEqual(linkCalls.length,3,'link is never retried automatically');
assert.strictEqual(linkCalls[0].body.code,'ABC123');assert.strictEqual(linkCalls[0].body.xuid,A.id);assert.strictEqual(linkCalls[0].auth,'Bearer test-key');

// 2. players: job/levels/money via scoreboard + tags
game.execute(A.id,'job.select',{job:'木こり'});ledger.players[A.id].title='初めての納品';
await sec(61);
const pa=site.players.filter(p=>p.xuid===A.id).at(-1);
assert.deepStrictEqual(pa.jobs,['lumberjack']);assert.strictEqual(pa.money,500);assert.deepStrictEqual(pa.levels,{player:1,gather:1,mine:1,craft:1});assert.deepStrictEqual(pa.titles,['初めての納品']);assert.strictEqual(pa.online,true);
assert.ok(A.getTags().includes('job_main:lumberjack')&&A.getTags().includes('job:lumberjack'));

// 3. bestiary: met + kills with assist
const cow={typeId:'minecraft:cow',id:'e1'};A.dimension.getEntities=()=>[cow];
await sec(3);
const zombie={typeId:'minecraft:zombie',id:'e2'};
world.afterEvents.entityHurt.fire({hurtEntity:zombie,damageSource:{damagingEntity:B},damage:3});
await sec(2);world.afterEvents.entityDie.fire({deadEntity:zombie,damageSource:{damagingEntity:A,cause:'entityAttack'}});
await sec(21);
const cowA=site.bestiary.find(e=>e.xuid===A.id&&e.mobId==='minecraft:cow');assert.ok(cowA&&cowA.kind==='met');
for(const x of [A.id,B.id]){const z=site.bestiary.filter(e=>e.xuid===x&&e.mobId==='minecraft:zombie').at(-1);assert.ok(z&&z.kind==='killed'&&z.kills===1,'zombie for '+x);}
const before=site.bestiary.length;await sec(21);assert.strictEqual(site.bestiary.length,before,'sent entries are not repeated');

// 4. web quest with reward 100: owner's money -100 once
const q1=webCreate(A.id,100);
await sec(35);assert.strictEqual(coins(A.id),400,'escrow 100');
await sec(65);assert.strictEqual(coins(A.id),400,'escrow only once');

// 5. accepted on the web, delivered in game -> done -> taker +100 once
webAction(site.quests.get(q1.id),'accept',B.id);
await sec(31);assert.ok(B.messages.some(m=>m.includes('受注しました')));
assert.strictEqual(ledger.portal.quests[q1.id].status,'accepted','main pack mirrors the quest');
assert.strictEqual(bridge.questItem('丸石'),'minecraft:cobblestone');
game.execute(B.id,'portal.deliver',{questId:q1.id,item:'minecraft:cobblestone'});
assert.deepStrictEqual(taken.at(-1).take,[['minecraft:cobblestone',16]]);assert.deepStrictEqual(ledger.players[A.id].mail.at(-1),['minecraft:cobblestone',16]);
assert.throws(()=>game.execute(B.id,'portal.deliver',{questId:q1.id,item:'minecraft:cobblestone'}),/納品済み/);
bridge.questDelivered(B,q1.id);
await sec(40);
assert.strictEqual(site.quests.get(q1.id).status,'done');assert.strictEqual(coins(B.id),150,'payout 100');
await sec(65);assert.strictEqual(coins(B.id),150,'payout only once');assert.strictEqual(ledger.portal.quests[q1.id],undefined,'finished quests leave the board');

// 6. owner cancels an open quest -> refund once
const q2=webCreate(A.id,100);await sec(31);assert.strictEqual(coins(A.id),300);
webAction(site.quests.get(q2.id),'cancel',A.id);await sec(31);assert.strictEqual(coins(A.id),400,'refund');await sec(65);assert.strictEqual(coins(A.id),400,'refund once');

// 6b. not enough money -> the link pack cancels it on the site
const q3=webCreate(B.id,99999);await sec(35);assert.strictEqual(site.quests.get(q3.id).status,'cancelled');assert.strictEqual(coins(B.id),150);
// reward 0: no money moves
const q0=webCreate(A.id,0);webAction(site.quests.get(q0.id),'accept',B.id);await sec(31);assert.strictEqual(coins(A.id),400);

// 7. site asleep: the game keeps running, stored sends go out after it wakes up
site.down=true;
bridge.questCreate(A,{title:'鉄を集めて',itemId:'minecraft:iron_ingot',qty:4,reward:50});
await sec(120);assert.strictEqual(coins(A.id),400,'nothing happens while the site is down');
site.down=false;await sec(330);
const q4=[...site.quests.values()].find(q=>q.title==='鉄を集めて');assert.ok(q4,'queued creation reached the site');assert.strictEqual(q4.item,'鉄インゴット');
await sec(35);assert.strictEqual(coins(A.id),350,'escrow after recovery');
assert.strictEqual([...site.quests.values()].filter(q=>q.title==='鉄を集めて').length,1,'created once');

// 8. restart while an order is pending: no double payment
const q5=webCreate(A.id,30);
await startServer(2,{withMain:false});                  // the main pack misses the order...
await sec(35);
assert.strictEqual(coins(A.id),350);
const pendingState=JSON.parse(__props.get('portal:quests')??'{}');assert.strictEqual(pendingState.ops?.[q5.id]?.escrow?.s,'pending');
await startServer(3);                                   // ...and a restart asks again
await sec(15);assert.strictEqual(coins(A.id),320,'escrow done after restart');
await startServer(4);await sec(100);
assert.strictEqual(coins(A.id),320,'no second escrow');assert.strictEqual(coins(B.id),150,'no second payout');
// and the earlier quests are not paid again after a restart that re-reads everything
__props.set('portal:quests',JSON.stringify({...JSON.parse(__props.get('portal:quests')),rev:0}));
await startServer(5);await sec(40);assert.strictEqual(coins(A.id),320);assert.strictEqual(coins(B.id),150);

// town + logs
game.execute(A.id,'town.donate',{item:'minecraft:cobblestone'});await sec(15);
const t=site.town.at(-1);assert.strictEqual(t.level,1);assert.ok(t.deliveries.some(d=>d.item==='丸石'&&d.have===16&&d.need===512));assert.deepStrictEqual(t.facilities,['共同倉庫']);
world.afterEvents.chatSend.fire({sender:A,message:'こんにちは'});await sec(31);assert.ok(site.logs.some(e=>e.type==='chat'&&e.data.message==='こんにちは'));
// leaving player is sent once with online:false
A.isValid=true;world.beforeEvents.playerLeave.fire({player:A});A.isValid=false;await sec(2);
assert.ok(site.players.some(p=>p.xuid===A.id&&p.online===false));
// Discord: game events reach the webhook, without mentions (lines go out every 5 seconds)
await sec(6);
const said=discord.map(m=>m.content).join('\n');
assert.ok(discord.every(m=>Array.isArray(m.allowed_mentions?.parse)&&m.allowed_mentions.parse.length===0),'no mentions');
assert.ok(said.includes('サーバーが起動しました'),'server start');
assert.ok(said.includes('**Alice**：こんにちは'),'chat');
assert.ok(said.includes('新しい依頼「丸石を集めて」'),'new quest');
assert.ok(said.includes('を **Bob** が達成しました'),'quest done');
assert.ok(said.includes('**Alice** が退出しました'),'leave');
assert.ok(discord.every(m=>m.content.length<=2000),'message size');
console.log('DISCORD', discord.length,'posts');
console.log('PORTAL PASS',{requests:net.http.log.length,quests:site.quests.size,queue:JSON.parse(__props.get('portal:queue')??'[]').length});
