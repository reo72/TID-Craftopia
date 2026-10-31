import {upgradeCooperation,applyCooperation} from './cooperation-engine.js';
import {upgradeTown,applyTown} from './town-engine.js';
import {COOP_RULES} from './cooperation-config.js';
import {JOB_DAILY,JOB_COUNT_KEYS,JOB_DAILY_REWARD,jobTaskDone} from './job-daily-config.js';
import {commonDailies,jobDailies} from './daily-plan.js';
import {RULES,JOBS,RENAMED_JOBS,ORDERS,WORKBENCH_RECIPES,recipeTier,recipeXp,DAILY,CODEX,TRADE_ITEMS,ITEM_NAMES,dayKey} from './game-config.js';
import {SKILL_BY_ID,skillLock,skillXpBonus,migrateSkills} from './skill-config.js';
import {gainStress as gainStressRaw,setGuard,GUARD_MAX} from './stress.js';
import {progressXp,progressCoins,progressStress,seasonXp,noteWork,noteBest,afterProgress,applyProgress} from './progress-engine.js';
// やり込み (progress-engine.js): the 平常心 perk on every stress gain here
const gainStress=(p,amount,time)=>gainStressRaw(p,progressStress(p,amount),time);
export const FRIEND_MAX=30,MAIL_KEEP=30;
import {SHOP_ITEMS} from './shop-config.js';
import {WORKBENCH_RULES} from './workbench-config.js';
import {applyAdmin} from './admin-engine.js';
import {awardTitles} from './achievements-config.js';
import {rollSpecial} from './special-config.js';
import {stockOf} from './npc-jobs.js';
import {TRADER,TRADER_GOODS,buyPrice,sellPrice} from './trader-config.js';
import {applyNotice} from './notice-config.js';
import {growDex} from './dexterity.js';
import {applyGacha,gachaState,giveDailyTicket,levelTickets} from './gacha-engine.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const n=x=>Number.isSafeInteger(x)&&x>=0?x:0;
const bump=(p,key,amount=1)=>{p.stats??={};p.stats[key]=n(p.stats[key])+amount;}; // achievement counters
export function demand(ok,message){if(!ok)throw new Error(message);}
export function integer(value,min=1,max=1000000){const x=Number(value);demand(Number.isSafeInteger(x)&&x>=min&&x<=max,`${min}～${max}の整数を入力してください。`);return x;}
// the starter kit (asked 2026-10-30, contents left to us): stone tools, a little food, light, and a bed
export const STARTER_KIT=[['minecraft:stone_sword',1],['minecraft:stone_pickaxe',1],['minecraft:stone_axe',1],['minecraft:stone_shovel',1],
 ['minecraft:leather_helmet',1],['minecraft:leather_chestplate',1],['minecraft:bread',16],['minecraft:torch',16],['minecraft:bed',1],
 ['minecraft:crafting_table',1]],STARTER_COINS=1000;
function fresh(name){return {name,job:'未選択',level:1,xp:0,maxXp:100,coins:0,bank:0,tickets:0,points:0,stress:0,gather:{level:1,xp:0,max:100},mine:{level:1,xp:0,max:100},craft:{level:1,xp:0,max:100},codex:{},claimedCodex:[],orders:{},stats:{questsCompleted:0,deliveries:0},daily:{},history:[],mail:[],guideGiven:false,starterGiven:false};}
function daily(p,now){const day=dayKey(now);if(p.daily.day!==day){p.daily={day,counts:{},claimed:[],bonus:false};p.wealthStart=n(p.coins)+n(p.bank);}return p.daily;}
function count(p,key,now,amount=1){const d=daily(p,now);d.counts[key]=n(d.counts[key])+amount;}
// lifetime counters and seen-sets for the titles (titles-config.js): p.tally {key: n}, p.seen {key: [values]}
const TALLY_KEY=/^[a-zA-Z0-9_:.]{1,48}$/,TALLY_MAX=600,SEEN_MAX=200;
// made:<ns>:<item> (a missing backslash until 2026-10-27) -> made:<item>
function fixMade(p){for(const k of Object.keys(p.tally??{}))if(/^made:\w+:/.test(k)){const to='made:'+k.split(':').pop();p.tally[to]=n(p.tally[to])+n(p.tally[k]);delete p.tally[k];}}
function tally(p,key,amount=1){p.tally??={};if(!TALLY_KEY.test(key)||!(amount>0))return;if(!(key in p.tally)&&Object.keys(p.tally).length>=TALLY_MAX)return;p.tally[key]=n(p.tally[key])+Math.floor(amount);}
function see(p,key,value){p.seen??={};if(!TALLY_KEY.test(key)||typeof value!=='string'||value.length>64)return;const list=p.seen[key]??=[];if(!list.includes(value)&&list.length<SEEN_MAX)list.push(value);}
function coins(p,amount,earned=false){if(earned&&amount>0){amount=progressCoins(p,amount);tally(p,'coins_earned',amount);} // 商売上手, the balance view's earnings
 const repayment=earned&&amount>0&&p.loan?.auto?Math.min(p.loan.remaining,Math.floor(amount*COOP_RULES.autoRepayPercent/100)):0;const net=amount-repayment;demand(Number.isSafeInteger(p.coins+net)&&p.coins+net>=0&&p.coins+net<=RULES.coinCap,'残高が不足しているか、所持金の上限を超えます。');p.coins+=net;if(repayment)p.loan.remaining-=repayment;}
// exact: amount already includes the stress penalty and the skill tree's xp nodes (gathering carries fractions itself)
function xp(p,key,amount,exact=false){amount=exact?amount:Math.max(1,Math.floor(amount*(p.stress>=80?.9:1)*(1+(key?skillXpBonus(p,key):0))));amount=progressXp(p,key,amount);if(key==='craft')growDex(p,amount); // 器用さ grows with handwork (dexterity.js)
 const s=key?p[key]:p,maxField=key?'max':'maxXp';s.xp+=amount;while(s.xp>=s[maxField]&&s.level<100){s.xp-=s[maxField];s.level++;s[maxField]=100+(s.level-1)*50;if(!key)levelTickets(p,s.level);}if(s.level>=100)s.xp=Math.min(s.xp,s[maxField]);}
function reward(p,skill,now,growth=true){if(growth){xp(p,null,60);xp(p,skill,40);}gainStress(p,2,now);count(p,'deliver',now);count(p,'quest',now);p.stats.questsCompleted++;p.stats.deliveries++;}
// site link: done money orders, the site's open quests and which ones were delivered here
const portalData=db=>{db.portal??={};db.portal.ops??={};db.portal.quests??={};db.portal.delivered??={};return db.portal;};
function log(p,text,now){p.history.unshift({at:now,text});p.history.length=Math.min(p.history.length,20);}
// onTitles(id, names): called after a save when a player unlocked achievement titles
export function createEngine({storage,inventory,now=()=>Date.now(),random=Math.random,onTitles}){
 // one prepared copy per saved state (2026-11-01): each read copied and upgraded the whole save, and the HUD reads
 // many times a second per player. Readers must not change it; transact and admin work on their own copy.
 let readFrom,readDone;
 function read(){const data=storage.read();if(storage.stable&&data===readFrom&&readDone)return readDone;demand(data&&data.version===1&&data.players&&data.town&&Array.isArray(data.requests)&&Array.isArray(data.events),'保存形式が不正です。初期化せず運営へ連絡してください。');readDone=migrateAllSkills(renameJobs(upgradeTown(upgradeCooperation(copy(data)))));readFrom=data;return readDone;}
 // the first skill tree kept recipe numbers: dropped (their points come back), written back with the next change
 function migrateAllSkills(db){for(const p of Object.values(db.players))migrateSkills(p);return db;}
 // old job names (料理人・調合師 -> 料理人); written back with the next change
 // 畜産農家 + 農家 merged: a second job equal to the main one is freed
 function renameJobs(db){for(const p of Object.values(db.players)){for(const k of ['job','secondJob'])if(RENAMED_JOBS[p[k]])p[k]=RENAMED_JOBS[p[k]];if(p.secondJob&&p.secondJob===p.job)p.secondJob=null;}return db;}
 function player(db,id){demand(db.players[id],'プレイヤーデータを開き直してください。');return db.players[id];}
 function transact(id,fn){const db=copy(read()),p=player(db,id),changes={take:[],give:[]};daily(p,now());gachaState(p,now());const level0=p.level;const result=fn(db,p,changes);fixMade(p);afterProgress(db,p,id,level0,{coins,tally,time:now()});p.savedAt=now();const titles=awardTitles(p,db);const plan=inventory?.plan(id,changes.take,changes.give);try{plan?.apply();storage.write(db);}catch(e){try{plan?.rollback();}catch(rollbackError){throw new Error('持ち物の復元に失敗しました。操作を止め運営へ連絡してください。 '+rollbackError.message);}throw e;}if(titles.length)try{onTitles?.(id,titles);}catch{}return result;}
 function ensure(id,name,legacy){const existing=read().players[id];if(existing&&existing.name===name)return snapshot(id);const db=copy(read());if(!db.players[id]){const p=fresh(name);if(legacy&&typeof legacy==='object'){p.coins=Math.min(RULES.coinCap,n(legacy.coins));if(JOBS.includes(legacy.job))p.job=legacy.job;for(const k of ['gather','mine','craft'])if(legacy[k])p[k]={level:Math.min(100,Math.max(1,n(legacy[k].level))),xp:n(legacy[k].xp),max:Math.max(100,n(legacy[k].max))};p.level=Math.min(100,Math.max(1,n(legacy.level)));p.maxXp=100+(p.level-1)*50;p.xp=Math.min(n(legacy.xp),p.maxXp);}db.players[id]=p;storage.write(db);}else if(db.players[id].name!==name){db.players[id].name=name;storage.write(db);}return snapshot(id);}
 function snapshot(id){const db=read(),p=copy(player(db,id));daily(p,now());gachaState(p,now());return {player:p,town:copy(db.town),requests:copy(db.requests),events:copy(db.events),warehouse:copy(db.warehouse),market:copy(db.market),mentorships:copy(db.mentorships),landmarks:copy(db.landmarks),communityCodex:copy(db.communityCodex),portal:{quests:copy(db.portal?.quests??{}),delivered:copy(db.portal?.delivered??{})}};}
 function execute(id,action,a={}){return transact(id,(db,p,items)=>{
  const time=now(),day=dayKey(time);let message='完了しました。';
  if(action.startsWith('admin.')){demand(a.isAdmin===true,'運営権限が必要です。');return applyAdmin(action,a,{db,admin:p,time,demand,integer,coins,xp,fresh,jobs:JOBS,coinCap:RULES.coinCap});}
  if(action==='presence'){p.lastSeen=time;return '';}
  const rate=k=>db.settings?.rates?.[k]??1; // admin reward multipliers
  const extension=applyCooperation(action,a,{db,p,id,items,time,day,integer,demand,coins,xp,count,log,allowedItems:TRADE_ITEMS,random});if(extension!==undefined)return extension;
  const built=applyTown(action,a,{db,p,id,items,time,demand,integer,count,bump});if(built!==undefined)return built; // 街の発展 (town-engine.js)
  const progress=applyProgress(action,a,{db,p,id,items,time,demand,integer,coins,tally});if(progress!==undefined)return progress; // やり込み (progress-engine.js)
  const notice=applyNotice(action,a,{db,p,id,items,demand});if(notice!==undefined)return notice; // お知らせ (notice-config.js)
  if(action==='skill.unlock'){
   // a node of the job skill trees (skill-config.js), by its id
   const node=SKILL_BY_ID[a.node];demand(node,'スキルを選んでください。');
   const lock=skillLock(p,node);demand(!lock,lock+'。');
   p.skillUnlocks.push(node.id);message=node.name+'を習得しました（'+node.cost+' SP）。\n'+node.desc;
  }else if(action==='job.select'||action==='job.secondary'){
   demand(JOBS.includes(a.job),'職業を選択してください。');
   if(action==='job.secondary'){demand(p.level>=RULES.secondaryLevel,`第2職業はLv.${RULES.secondaryLevel}で解放します。`);demand(a.job!==p.job,'主職業と別の職業を選んでください。');demand(!p.secondJob,'第2職業は取得済みです。');p.secondJob=a.job;}
   else{demand(a.job!==p.job,'すでに選択している職業です。');demand(a.job!==p.secondJob,'第2職業と同じ職業は選べません。');if(p.job!=='未選択'&&!a.free)coins(p,-RULES.jobChangeCost);p.job=a.job;}
   message=a.job+'を選択しました。';
  }else if(action==='workbench.craft'){
   // Only the crafting-table handler issues this action; the journal no longer crafts.
   const index=integer(a.recipe,0,WORKBENCH_RECIPES.length-1),r=WORKBENCH_RECIPES[index],times=integer(a.count??1,1,WORKBENCH_RULES.maxBatch),tier=recipeTier(r);
   if(tier!=='basic'){
    // job recipes open with the job level (the skill tree no longer holds recipes, 2026-10-28)
    demand([p.job,p.secondJob].includes(r.job),r.job+'の職業が必要です。');demand(p.level>=(r.jobLevel??1),`職業Lv.${r.jobLevel}で作れるようになります。`);demand(p.craft.level>=(r.level??1),'クラフトLv.'+(r.level??1)+'が必要です。');if(r.level)demand(p.facilities.workshop||db.town.level>=2,'専門作業台を取得するか、街をLv.2にしてください。');
   }
   let saved=0,bonus=0;
   if(tier!=='basic')for(let i=0;i<times;i++){if(p.craft.level>=WORKBENCH_RULES.saveLevel&&random()<WORKBENCH_RULES.saveChance)saved++;if(p.craft.level>=WORKBENCH_RULES.bonusLevel&&random()<WORKBENCH_RULES.bonusChance)bonus++;}
   items.take=r.inputs.map(([type,need],i)=>[type,need*times-(i===0?Math.min(saved,need*times):0)]).filter(([,need])=>need>0);
   items.give=[[r.output[0],r.output[1]*(times+bonus)],...(r.extra??[]).map(([type,n])=>[type,n*times])];
   // own-job recipes can turn up the job's special material (special-config.js)
   const specials=[];if(tier!=='basic'&&[p.job,p.secondJob].includes(r.job))for(let i=0;i<times;i++)specials.push(...rollSpecial(p,'craft',r.job,random));
   if(specials.length){bump(p,'special',specials.length);for(const s of specials)items.give.push([s,1]);}
   // XP scales with crafting difficulty (see recipeXp); no daily cap.
   bump(p,'crafts',times);tally(p,'made:'+r.output[0].replace(/^\w+:/,''),r.output[1]*(times+bonus));if(/_planks$/.test(r.output[0]))tally(p,'planks_made',r.output[1]*(times+bonus));
   const gain=recipeXp(r)*times;
   if(gain>0){xp(p,'craft',gain);xp(p,null,Math.max(1,Math.floor(gain/2)));gainStress(p,Math.min(3,times),time);}
   count(p,'craft',time);
   message=`${r.name}を${times}回製作しました。`+(saved?`\n素材節約：${saved}個`:'')+(bonus?`\n追加の完成品：${bonus}回分`:'')+(gain?`\nクラフト経験値 +${gain}`:'\n分解できる品のため経験値なし')+(specials.length?`\n特別な素材を見つけました：${specials.map(s=>ITEM_NAMES[s]??s).join('、')}`:'');
  }else if(action==='quests.accept'||action==='quests.deliver'){
   const i=integer(a.quest,0,ORDERS.length-1),q=ORDERS[i],state=p.orders[i];
   if(action==='quests.accept'){demand(state?.day!==day||state.status!=='done','今日の依頼は達成済みです。');p.orders[i]={day,status:'accepted'};message=q.name+'を受注しました。';}
   else{demand(state?.day===day&&state.status==='accepted','まず依頼を受注してください。');items.take=[[q.item,q.amount,{deliver:q.minRank??0}]];const pay=Math.round(q.coins*rate('quest'));coins(p,pay,true);reward(p,q.skill,time);p.orders[i]={day,status:'done'};p.tickets++;message=`納品完了：${pay}コイン・経験値・ガチャ券1枚。`;}
  }else if(action==='bank.deposit'||action==='bank.withdraw'){
   const amount=integer(a.amount,1,RULES.coinCap);if(action==='bank.deposit'){coins(p,-amount);demand(p.bank+amount<=RULES.coinCap,'預金の上限です。');p.bank+=amount;}else{demand(p.bank>=amount,'預金が不足しています。');p.bank-=amount;coins(p,amount);}message=`${amount}コインを${action.endsWith('deposit')?'預けました':'引き出しました'}。`;log(p,message,time);
  }else if(action==='bank.transfer'){
   demand(a.to!==id,'自分には送金できません。');const target=player(db,a.to),amount=integer(a.amount,1,RULES.coinCap);coins(p,-amount);coins(target,amount);target.savedAt=time;message=target.name+'へ'+amount+'コインを送金しました。';log(p,message,time);log(target,p.name+'から'+amount+'コイン受領',time);
  }else if(action.startsWith('friend.')){
   // friends (friend-runtime.js): p.friends = ids, p.friendRequests = [{from, at}] (requests sent to p)
   p.friends??=[];p.friendRequests??=[];
   const other=player(db,a.id);other.friends??=[];other.friendRequests??=[];
   demand(a.id!==id,'自分とはフレンドになれません。');
   const link=()=>{for(const [x,y] of [[p,a.id],[other,id]]){if(!x.friends.includes(y))x.friends.push(y);x.friendRequests=x.friendRequests.filter(r=>r.from!==(x===p?a.id:id));}};
   if(action==='friend.request'){
    demand(!p.friends.includes(a.id),'もうフレンドです。');demand(p.friends.length<FRIEND_MAX&&other.friends.length<FRIEND_MAX,`フレンドは${FRIEND_MAX}人までです。`);
    if(p.friendRequests.some(r=>r.from===a.id)){link();message=other.name+'とフレンドになりました。';}
    else{demand(!other.friendRequests.some(r=>r.from===id),'申請済みです。相手の承認を待ってください。');demand(other.friendRequests.length<FRIEND_MAX,'相手の申請がいっぱいです。');other.friendRequests.push({from:id,at:time});message=other.name+'にフレンド申請を送りました。';}
   }else if(action==='friend.accept'){demand(p.friendRequests.some(r=>r.from===a.id),'申請が見つかりません。');demand(p.friends.length<FRIEND_MAX,`フレンドは${FRIEND_MAX}人までです。`);link();message=other.name+'とフレンドになりました。';}
   else if(action==='friend.decline'){p.friendRequests=p.friendRequests.filter(r=>r.from!==a.id);message=other.name+'の申請を断りました。';}
   else if(action==='friend.mail'){ // a message to a friend, kept for both (asked 2026-10-27: mail / conversation; works offline)
    demand(p.friends.includes(a.id),'フレンドにだけ送れます。');const text=String(a.text??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,100);demand(text,'メッセージを入れてください。');
    const add=(x,with_,me)=>{x.talk??={};const l=x.talk[with_]??=[];l.push({me,text,at:time});if(l.length>MAIL_KEEP)l.splice(0,l.length-MAIL_KEEP);};
    add(p,a.id,true);add(other,id,false);other.unread??={};other.unread[id]=n(other.unread[id])+1;message='送りました。';
   }else if(action==='friend.read'){p.unread??={};delete p.unread[a.id];message='';}
   else if(action==='friend.remove'){demand(p.friends.includes(a.id),'フレンドではありません。');p.friends=p.friends.filter(x=>x!==a.id);other.friends=other.friends.filter(x=>x!==id);message=other.name+'をフレンドから外しました。';}
   else throw new Error('不明な操作です。');
   other.savedAt=time;
  }else if(action==='gacha.draw'||action==='gacha.claim'){message=applyGacha(action,a,{p,items,time,demand,integer,random,tally});
  }else if(action==='trader.buy'||action==='trader.sell'){ // the 商人 NPC (trader-config.js): buy at 1.5x, sell at 1/3 of the normal price
   const amount=integer(a.count,1,TRADER.maxCount),name=ITEM_NAMES[a.item]??a.item;
   if(action==='trader.buy'){const each=buyPrice(a.item);demand(each>0&&TRADER_GOODS.includes(a.item),'扱っていない品物です。');const cost=each*amount;coins(p,-cost);items.give=[[a.item,amount]];tally(p,'npc_trade');message=`${name}を${amount}個買いました（${cost}コイン）。`;log(p,`商人から購入 ${name}×${amount} -${cost}コイン`,time);}
   else{const each=sellPrice(a.item);demand(each>0,'この品物は買い取れません。');items.take=[[a.item,amount,{exact:true}]];const pay=each*amount;coins(p,pay,true);tally(p,'npc_trade');tally(p,'npc_coins',pay);message=`${name}を${amount}個売りました（+${pay}コイン）。`;log(p,`商人に売却 ${name}×${amount} +${pay}コイン`,time);}
  }else if(action==='shop.buy'){ // server shop (book menu): listed items only, paid from the wallet
   const it=SHOP_ITEMS.find(v=>v.item===a.item);demand(it,'販売していない商品です。');const amount=integer(a.count,1,576),cost=it.price*amount;coins(p,-cost);items.give=[[it.item,amount]];tally(p,'npc_trade');message=`${it.name}を${amount}個購入しました（${cost}コイン）。`;log(p,`購入 ${it.name}×${amount} -${cost}コイン`,time);
  }else if(action==='job.earn'){ // the job features (npc-sell, ranch, explore, fishing, runes): coins and skill XP the runtime worked out
   const pay=integer(a.coins??0,0,100000),gain=seasonXp(p,integer(a.xp??0,0,2000),time),skill=['gather','mine','craft'].includes(a.skill)?a.skill:null;
   if(pay)coins(p,pay,true);if(gain&&skill){xp(p,skill,gain);xp(p,null,Math.ceil(gain/2));}
   if(a.note)log(p,String(a.note).slice(0,60),time);message=[pay?`+${pay}コイン`:'',gain?`経験値 +${gain}`:''].filter(Boolean).join('　')||'完了しました。';
  }else if(action==='rune.stress'){ // RuneScript: calm (-1/-2) or a failed prototype's recoil (+10); never below 0 or above 100
   const d=integer(a.amount,-2,10);if(d>0)gainStress(p,d,time);else p.stress=Math.max(0,p.stress+d);message=d<0?`ストレス ${d}`:`ストレス +${d}`;
  }else if(action==='npc.reward'){ // villagers (npc-runtime.js): a request handed in (item taken here) or a friendship reward
   const pay=integer(a.coins??0,0,10000),t=integer(a.tickets??0,0,10);
   if(a.item!==undefined){demand(typeof a.item==='string'&&/^[a-z0-9_]+:[a-z0-9_]+$/.test(a.item),'品物が不正です。');items.take=[[a.item,integer(a.count,1,256),{deliver:integer(a.minRank??0,0,4)}]];}
   const gain=integer(a.xp??0,0,2000),skill=['gather','mine','craft'].includes(a.skill)?a.skill:null;
   if(pay)coins(p,pay,true);p.tickets+=t;if(gain&&skill){xp(p,skill,gain);xp(p,null,Math.ceil(gain/2));}if(a.note)log(p,String(a.note).slice(0,60),time);
   message=[pay?`+${pay}コイン`:'',t?`ガチャ券 +${t}`:'',gain&&skill?`経験値 +${gain}`:''].filter(Boolean).join('　')||'完了しました。';
  }else if(action==='npc.buy'){ // job villagers' own stock (npc-jobs.js), paid from the wallet
   const it=stockOf(a.role,a.item);demand(it,'その村人は扱っていない品物です。');const amount=integer(a.count,1,576),cost=it.price*amount;
   coins(p,-cost);items.give=[[it.item,amount]];message=`${it.name}を${amount}個購入しました（${cost}コイン）。`;log(p,`村人から購入 ${it.name}×${amount} -${cost}コイン`,time);
  }else if(action==='gacha.exchange'){demand(p.points>=10,'交換ポイントが10必要です。');p.points-=10;items.give=[['minecraft:lantern',4]];message='10ポイントをランタン4個に交換しました。';
  }else if(action==='job.count'){ // job dailies: the job features count their work
   demand(typeof a.key==='string'&&TALLY_KEY.test('j:'+a.key),'対象外です。');const k=integer(a.amount??1,1,1000);if(JOB_COUNT_KEYS.has(a.key))count(p,'j:'+a.key,time,k); // keys outside the dailies (breed, bonemeal...) still count for titles
   tally(p,'j:'+a.key,k);noteWork(db,p,id,'j:'+a.key,k,time);message='';
  }else if(action==='title.track'){ // batched by job-count.js: {adds: {key: n}, sets: {key: [values]}}
   for(const [k,v] of Object.entries(a.adds??{}).slice(0,100)){const x=integer(v,1,100000);tally(p,k,x);noteWork(db,p,id,k,x,time);}
   for(const [k,vs] of Object.entries(a.sets??{}).slice(0,50))for(const v of (Array.isArray(vs)?vs:[]).slice(0,50))see(p,k,v);
   for(const [k,v] of Object.entries(a.maxes??{}).slice(0,20)){const x=integer(v,0,1000000);noteBest(db,p,id,k,x,time,tally);if(TALLY_KEY.test(k)&&x>n(p.tally?.[k]))tally(p,k,x-n(p.tally?.[k]));} // the best so far (the biggest fish)
   message='';
  }else if(action==='title.grant'){ // a title given by the server (the final-day awards, awards.js)
   demand(typeof a.title==='string'&&a.title.length<=40,'称号が不正です。');p.titles??=[];if(!p.titles.includes(a.title))p.titles.push(a.title);message='';
  }else if(action==='daily.claim'&&Number(a.task)>=DAILY.length){
   const d=daily(p,time),tasks=jobDailies(id,d.day,p.job);demand(tasks.length,'職業デイリーがありません。');const i=integer(a.task,DAILY.length,DAILY.length+tasks.length-1),t=tasks[i-DAILY.length];
   demand(!d.claimed.includes(i),'受取済みです。');demand(jobTaskDone(t,d.counts),'まだ目標を達成していません。');d.claimed.push(i);bump(p,'dailies');
   coins(p,JOB_DAILY_REWARD.coins,true);xp(p,JOBS.includes(p.job)?(p.job==='鉱夫'?'mine':['冒険家','木こり','農家','釣り師'].includes(p.job)?'gather':'craft'):null,JOB_DAILY_REWARD.xp);message='職業デイリーの報酬を受け取りました。';
  }else if(action==='daily.claim'){
   const d=daily(p,time),i=integer(a.task,0,DAILY.length-1),[,key,target]=commonDailies(id,d.day)[i];demand(!d.claimed.includes(i),'受取済みです。');demand((d.counts[key]??0)>=target,'まだ目標を達成していません。');d.claimed.push(i);bump(p,'dailies');coins(p,Math.round(RULES.dailyCoins*rate('daily')),true);xp(p,null,RULES.dailyXp);message='デイリー報酬を受け取りました。';
  }else if(action==='daily.bonus'){const d=daily(p,time);demand(d.claimed.length>=3,'3つの報酬を受け取ってください。');demand(!d.bonus,'ボーナスは受取済みです。');d.bonus=true;const bonus=Math.round(RULES.dailyBonus*rate('daily'));coins(p,bonus,true);message=`3達成ボーナス：${bonus}コイン`+(giveDailyTicket(p,time)?'・デイリーチケット1枚。':'。（デイリーチケットは本日の上限です）');
  }else if(action==='codex.discover'){
   demand(CODEX.some(v=>v[0]===a.type),'図鑑の対象外です。');if(!p.codex[a.type]){p.codex[a.type]={at:time,count:1};db.communityCodex[a.type]??={at:time,name:p.name};count(p,'discover',time);xp(p,null,15);message='図鑑に登録しました。';}else{p.codex[a.type].count++;message='登録済みです。';}
  }else if(action==='codex.rewards'){
   const category=a.category,ids=CODEX.filter(v=>v[2]===category).map(v=>v[0]);demand(ids.length&&ids.every(v=>p.codex[v]),'この分類をすべて登録してください。');demand(!p.claimedCodex.includes(category),'報酬は受取済みです。');p.claimedCodex.push(category);coins(p,200,true);p.tickets++;message='図鑑報酬：200コイン・ガチャ券1枚。';
  }else if(action==='request.create'){
   demand(db.requests.filter(q=>q.owner===id).length<5,'自分の掲示依頼は5件までです。');demand(db.requests.length<100,'掲示板が満員です。');demand(TRADE_ITEMS.includes(a.item),'対象外の素材です。');const amount=integer(a.amount,1,64),pay=integer(a.coins,1,100000);coins(p,-pay);const q={id:++db.sequence,owner:id,name:p.name,item:a.item,amount,coins:pay};db.requests.push(q);message='報酬を預かり、依頼を掲示しました。';
  }else if(action==='request.cancel'){
   const index=db.requests.findIndex(q=>q.id===a.id),q=db.requests[index];demand(q&&q.owner===id,'この依頼は取り消せません。');coins(p,q.coins);db.requests.splice(index,1);message='依頼を取り消し、報酬を返却しました。';
  }else if(action==='request.deliver'){
   const index=db.requests.findIndex(q=>q.id===a.id),q=db.requests[index];demand(q&&q.owner!==id,'依頼が終了したか、自分の依頼です。');const owner=player(db,q.owner);demand(owner.mail.length<100,'依頼主の受取箱が満杯です。');items.take=[[q.item,q.amount,{deliver:q.minRank??0}]];owner.mail.push([q.item,q.amount]);owner.savedAt=time;coins(p,q.coins,true);reward(p,'gather',time,false);db.requests.splice(index,1);message='依頼を達成し、'+q.coins+'コインを受け取りました。';
  }else if(action==='portal.deliver'){
   // site quest: the taker hands the items over here; the reward comes when the site marks it done (payout)
   const pd=portalData(db),q=pd.quests[a.questId];
   demand(q&&q.status==='accepted'&&q.takerXuid===id,'この依頼は納品できません。');demand(!pd.delivered[q.id],'納品済みです。サイトへの反映を待っています。');
   demand(typeof a.item==='string'&&ITEM_NAMES[a.item]===q.item,'この依頼の素材が分かりません。');
   const owner=db.players[q.ownerXuid];demand(owner,'依頼主のデータがないため納品できません。');demand(owner.mail.length<100,'依頼主の受取箱が満杯です。');
   items.take=[[a.item,q.qty,{deliver:0}]];owner.mail.push([a.item,q.qty]);owner.savedAt=time;pd.delivered[q.id]=time;reward(p,'gather',time,false);
   message='納品しました。サイトで依頼が完了すると報酬が支払われます。';
  }else if(action==='title.equip'){
   const t=String(a.title??'');p.titles??=[];demand(t===''||p.titles.includes(t),'持っていない称号です。');p.title=t||undefined;message=t?`称号「${t}」を付けました。`:'称号を外しました。';
  }else if(action==='mail.claim'){demand(p.mail.length,'受取箱は空です。');items.give=p.mail;p.mail=[];message='預かり品を受け取りました。';
  }else if(action==='guide.give'){ // the 案内係's starter kit (once; the guidebook too unless it was given before)
   demand(!p.starterGiven,'初期配布は受取済みです。');items.give=[...(p.guideGiven?[]:[['cooptown:guidebook',1]]),...STARTER_KIT];
   p.guideGiven=true;p.starterGiven=true;p.coins+=STARTER_COINS;message=`初期配布を受け取りました。（${STARTER_COINS}コインつき）`;
  }else if(action==='stress.relieve'){ // a meal or a potion: -amount stress (at most 60 at once); guard: {pct, seconds} lowers gains for a while
   const d=integer(a.amount??0,0,60);p.stress=Math.max(0,p.stress-d);let g=false;if(a.guard)g=setGuard(p,Number(a.guard.pct)||0,integer(a.guard.seconds,1,600),time);
   message=(d?`ストレス -${d}`:'')+(g?`${d?'・':''}ストレス増加 -${Math.round(Math.min(GUARD_MAX,a.guard.pct)*100)}%`:'');
  }else if(action==='rest'){demand(p.stress>0,'ストレスはありません。');items.take=[['minecraft:bread',1]];p.stress=Math.max(0,p.stress-20);message='パン1個で休憩しました。ストレス -20。';
  }else if(action==='event.join'){const e=db.events.find(e=>e.id===a.id);demand(e&&e.start<=time&&e.end>time,'開催中のイベントではありません。');demand(!e.participants.includes(id),'参加登録済みです。');e.participants.push(id);tally(p,'event_join');message='イベントへ参加登録しました。';
  }else throw new Error('操作が見つかりません。');
  return message;
 });}
 function admin(isAdmin,fn){demand(isAdmin,'運営権限が必要です。');const db=copy(read());fn(db);storage.write(db);}
 // ---- site link (orders from the link pack, see portal-bridge.js) ----
 /** escrow / payout / refund for a site quest. Runs once per questId+op; repeats return the first result. */
 function portalOp(op,a){
  demand(['escrow','payout','refund'].includes(op),'不明な操作です。');
  const db=copy(read()),pd=portalData(db),key=`${a.questId}:${op}`;
  if(pd.ops[key])return pd.ops[key];
  const p=db.players[a.xuid],amount=n(a.amount),time=now();let result;
  if(!p)result={ok:false,reason:'unknown_player'};
  else if(op==='escrow'){if(p.coins<amount)result={ok:false,reason:'insufficient'};else{coins(p,-amount);log(p,`依頼の報酬${amount}コインを預けました`,time);result={ok:true};}}
  else{try{coins(p,amount,op==='payout');log(p,op==='payout'?`依頼の報酬${amount}コインを受け取りました`:`依頼の報酬${amount}コインが返金されました`,time);result={ok:true};}catch{result={ok:false,reason:'coin_cap'};}}
  if(p)p.savedAt=time;
  pd.ops[key]={...result,at:time};storage.write(db);return pd.ops[key];
 }
 /** Mirror of the site's quests for the in-game board (quest=null with reset clears it). */
 function portalQuest(quest,reset=false){
  const db=copy(read()),pd=portalData(db);
  if(reset)pd.quests={};
  if(quest){if(['done','cancelled'].includes(quest.status))delete pd.quests[quest.id];else pd.quests[quest.id]=quest;}
  storage.write(db);
 }
 function overview(){return copy(read());}
 /** Read-only look at the ledger without copying it (callers must not modify what they get). */
 function peek(fn){return fn(read());}
 return {ensure,snapshot,execute,admin,overview,peek,portalOp,portalQuest};
}
export const newDatabase=()=>({version:1,sequence:0,players:{},town:{level:1,total:0,materials:{},location:null},requests:[],events:[]});
