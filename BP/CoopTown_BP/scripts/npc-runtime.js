import {world,system} from '@minecraft/server';
import {dialog,noticeDialog,chooseDialog} from './dialog.js';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {ADMIN_RULES} from './admin-engine.js';
import {FOOD_CATALOG} from './food-catalog.js';
import {SELL_PRICES,sellables,sellGroup} from './npc-sell.js';
import {NPC_JOBS,BUY_BONUS,SAME_JOB_BONUS} from './npc-jobs.js';
import {capResale} from './sell-price.js';
import {deliverable} from './item-desc.js';
import {TIERS} from './quality.js';
import {typesOf} from './workbench-config.js';
import {keeperBrowse,openDepositBox,installDepositBoxes} from './npc-warehouse.js';

// Town villagers (entity cooptown:villager, player-shaped, skin = variant; RP entity/villager_npc.entity.json).
// Talking to one opens its menu: 話す (lines by time of day and friendship) / プレゼント / 頼みごと (its own daily
// request) / 街の依頼 (the town orders) / 売買 (the shop). Friendship 3 / 6 / 10 gives a one-time reward.
// Each NPC gets a name and a role the first time it is seen (kept on the entity). Friendship is per player and NPC
// (player dynamic property AFF_KEY): the first talk of each day adds 1, up to AFF_MAX.
// Daily life: by day they wander, at night (NIGHT_FROM..NIGHT_TO ticks) they walk back to where they were spawned
// (minecraft:home + go_home in the entity file); the script only switches the two with the events cooptown:day / night.
export const NPC='cooptown:villager',AFF_KEY='cooptown:npc_aff',AFF_MAX=10,NIGHT_FROM=12500,NIGHT_TO=23500;
const NAMES=['ハルト','ミナ','ソウタ','ユイ','レン','サクラ','カイ','ノア','ヒナ','リク','アオイ','トウマ','メイ','ユウキ','コハル','ダイチ'];
// roles: the three town roles and the job villagers (npc-jobs.js: own shop, buying that job's products, job requests)
// keeper: the shared warehouse's keeper (npc-warehouse.js); guide: hands out the starter kit (asked 2026-10-30). Staff give
// these two (sneak + use), new villagers never get them at random
export const ROLES={resident:'住人',merchant:'商人',client:'依頼人',keeper:'倉庫番',guide:'案内係',...Object.fromEntries(Object.entries(NPC_JOBS).map(([k,v])=>[k,v.job]))};
const ROLE_IDS=Object.keys(ROLES).filter(r=>r!=='keeper'&&r!=='guide');
export const isJob=role=>!!NPC_JOBS[role];
const LINES={
 morning:['おはよう！今日もいい天気だね。','朝ごはんはもう食べた？','早起きは三文の得って言うよね。'],
 noon:['お昼は何を食べようかな。','畑の調子はどう？','街がにぎやかになってきたね。'],
 evening:['そろそろ日が暮れるね。','今日もおつかれさま。','夜はモンスターに気をつけてね。'],
 night:['ふぁ…もう寝る時間だよ。','夜道は危ないよ、早く帰りな。','明日また話そうね。'],
};
const CLOSE=['いつもありがとう、頼りにしてるよ！','君が来てくれるとうれしいな。','この街の自慢の仲間だよ。'];
const pick=a=>a[Math.floor(Math.random()*a.length)];
const dayKey=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export const isNight=t=>t>=NIGHT_FROM&&t<NIGHT_TO;
export function partOfDay(t){return isNight(t)?'night':t<3000||t>=NIGHT_TO?'morning':t<9000?'noon':'evening';}
export function affinityLabel(n){return n>=AFF_MAX?'親友':n>=6?'仲良し':n>=3?'顔なじみ':'はじめまして';}

// what they hold (put in the main hand once; raise ITEM_VERSION to hand out new ones): 商人 an emerald, 依頼人 a book,
// job villagers their tool, 住人 one of RESIDENT_ITEMS chosen by name
const ITEM_VERSION=2,RESIDENT_ITEMS=['bread','poppy','wooden_hoe','fishing_rod','apple','wooden_shovel','dandelion','wheat'];
export function heldItemOf(name,role){
 if(role==='merchant')return 'emerald';if(role==='client')return 'book';if(role==='keeper')return 'chest';if(role==='guide')return 'compass';if(isJob(role))return NPC_JOBS[role].hold;
 let h=0;for(const c of String(name))h=(h*31+c.charCodeAt(0))>>>0;return RESIDENT_ITEMS[h%RESIDENT_ITEMS.length];
}
// 動かない / よく動く (asked 2026-10-28): shop keepers stand at their place (no strolling, cannot be pushed, look at
// players); residents and clients walk around a lot. Staff can set each one (sneak + use: the role menu). The mode
// is kept on the NPC (MOVE_KEY: 'stay' / 'roam', none = by role); MOVE_ON = the mode its components were set for.
export const MOVE_KEY='cooptown:npc_move',ROAMING_ROLES=new Set(['resident','client']);
const MOVE_ON='cooptown:npc_move_on';
/** The movement of an NPC: its own setting, else by role. */
export const moveOf=(role,saved)=>saved==='stay'||saved==='roam'?saved:ROAMING_ROLES.has(role)?'roam':'stay';
function applyMove(e,role){
 const mode=moveOf(role,e.getDynamicProperty(MOVE_KEY));
 if(e.getDynamicProperty(MOVE_ON)!==mode){e.triggerEvent(mode==='stay'?'cooptown:mode_stay':'cooptown:mode_roam');e.setDynamicProperty(MOVE_ON,mode);
  if(mode==='roam'&&isNight(world.getTimeOfDay()))e.triggerEvent('cooptown:night');}
 return mode;
}
function profileOf(e){
 let name=e.getDynamicProperty('cooptown:npc_name'),role=e.getDynamicProperty('cooptown:npc_role');
 if(typeof name!=='string'){name=pick(NAMES);e.setDynamicProperty('cooptown:npc_name',name);}
 if(!ROLES[role]){role=pick(ROLE_IDS);e.setDynamicProperty('cooptown:npc_role',role);}
 // no personal names on show (asked 2026-10-30): the tag and the screens use the role; the saved name only picks a
 // resident's held item
 const p=dress(e,name,role);p.name=ROLES[role];p.move=applyMove(e,role);return p;
}
/** Name tag (the role) and held item for a role (also after staff change the role). */
function dress(e,name,role,force=false){
 name=e.getDynamicProperty('cooptown:npc_name')??name;
 const tag=ROLES[role];if(e.nameTag!==tag)e.nameTag=tag;
 if(force||e.getDynamicProperty('cooptown:npc_item')!==ITEM_VERSION){
  try{e.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${heldItemOf(name,role)}`);e.setDynamicProperty('cooptown:npc_item',ITEM_VERSION);}catch{}
 }
 return {name,role};
}
function affinities(player){try{return JSON.parse(player.getDynamicProperty(AFF_KEY)??'{}');}catch{return {};}}
/** Adds the day's friendship point for this NPC (once a day). Returns the friendship after it. */
export function talkPoint(data,npcId,day){
 const a=entry(data,npcId);
 if(a.day!==day){a.n=Math.min(AFF_MAX,a.n+1);a.day=day;}
 return a.n;
}
const entry=(data,npcId)=>{const a=data[npcId]??={n:0,day:''};a.claimed??=[];return a;};
const save=(player,data)=>{try{player.setDynamicProperty(AFF_KEY,JSON.stringify(data));}catch{}};

// ---- プレゼント: once a day per NPC. Favourite +3, other food / drinks +1, things they dislike -2 (still taken),
// anything else is handed back. Each NPC has three favourites picked from the food catalogue by its name.
const VANILLA_FOOD=['bread','apple','cookie','pumpkin_pie','cake','cooked_beef','cooked_porkchop','cooked_chicken','cooked_mutton','cooked_cod','cooked_salmon','baked_potato','mushroom_stew','beetroot_soup','rabbit_stew','golden_apple','golden_carrot','sweet_berries','melon_slice','carrot','honey_bottle'].map(k=>'minecraft:'+k);
export const DISLIKE=new Set(['minecraft:rotten_flesh','minecraft:spider_eye','minecraft:poisonous_potato','minecraft:pufferfish']);
const DISHES=FOOD_CATALOG.filter(f=>f.kind==='food'||f.kind==='drink');
export const FOODS=new Set([...VANILLA_FOOD,...DISHES.map(f=>f.id)]);
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
export function favouritesOf(name){const h=hash(name),out=[];for(let k=0;out.length<3&&k<12;k++){const f=DISHES[(h+k*977)%DISHES.length];if(f&&!out.includes(f.id))out.push(f.id);}return out;}
/** The friendship change a gift makes: null = not a gift they take. */
export function giftPoints(typeId,name){if(DISLIKE.has(typeId))return -2;if(favouritesOf(name).includes(typeId))return 3;return FOODS.has(typeId)?1:null;}

// ---- 頼みごと: one request per NPC per day (same for every player), picked from REQUESTS by the NPC and the day.
// Reward: the items' town price x1.5 (x2 for 依頼人) in coins, friendship +1, and a gacha ticket from 依頼人.
export const REQUESTS=[['minecraft:wheat',16],['minecraft:carrot',12],['minecraft:potato',12],['minecraft:apple',4],['minecraft:egg',6],
 ['minecraft:cod',4],['minecraft:salmon',3],['minecraft:bread',6],['minecraft:cooked_beef',4],['minecraft:oak_log',16],['minecraft:cobblestone',32],
 ['minecraft:coal',8],['minecraft:iron_ingot',4],['minecraft:white_wool',4],['minecraft:leather',4],['minecraft:sugar_cane',12],['minecraft:pumpkin',3]];
const PRICE={'minecraft:oak_log':3,'minecraft:cobblestone':1,'minecraft:coal':5};
// Job villagers ask for their job's products and also give that job's skill XP; players of the same job get
// SAME_JOB_BONUS more coins and XP.
export function requestOf(npcId,day,role,playerJob){
 const job=NPC_JOBS[role],pool=job?.requests??REQUESTS;
 const [item,count]=pool[hash(npcId+'|'+day)%pool.length];
 const each=SELL_PRICES[item]?.[0]??PRICE[item]??3,client=role==='client',same=!!job&&playerJob===job.job;
 const coins=Math.max(10,Math.round(each*count*(client?2:1.5)*(same?SAME_JOB_BONUS:1)));
 return {item,count,coins,tickets:client?1:0,skill:job?.skill,xp:job?Math.ceil(coins/10):0,same};
}
// ---- 親しさのごほうび: reaching these levels gives the reward once per NPC.
export const AFF_REWARDS=[{at:3,coins:100,tickets:0},{at:6,coins:300,tickets:1},{at:AFF_MAX,coins:1000,tickets:3}];
export function dueRewards(a){return AFF_REWARDS.filter(r=>a.n>=r.at&&!a.claimed.includes(r.at));}

// the book's quest and shop screens, handed over by book.js (it imports the game runtime, so this file cannot import it)
const menus={};
export function setNpcMenus(m){Object.assign(menus,m);}
let ctx={};
// counted the way the hand-in takes them (item-desc.js deliverable: descriptions and ranks are fine, 2026-10-30)
const countOf=(player,typeId,minRank=0)=>{let n=0;const inv=player.getComponent('minecraft:inventory')?.container;for(let i=0;inv&&i<inv.size;i++){const s=inv.getItem(i);if(s&&typesOf(typeId).includes(s.typeId)&&deliverable(s,minRank))n+=s.amount;}return n;};
const nameOf=id=>FOOD_CATALOG.find(f=>f.id===id)?.name??ctx.itemName?.(id)??id;
const affText=n=>`親しさ：${affinityLabel(n)}（${n}/${AFF_MAX}）`;
async function payRewards(player,name,a,data){
 for(const r of dueRewards(a)){
  try{const msg=ctx.game.execute(player.id,'npc.reward',{coins:r.coins,tickets:r.tickets,note:`${name}の親しさ${r.at}のごほうび`});a.claimed.push(r.at);save(player,data);ctx.refreshGame?.(player);
   await noticeDialog(player,name,`「いつもありがとう！これ、受け取って。」\n\n親しさ${r.at}のごほうび：${msg}`,{close:'ありがとう'});}
  catch(err){console.warn('[CoopTown] 村人ごほうび: '+err);}
 }
}
async function giveGift(player,name,npcId,data){
 const a=entry(data,npcId),day=dayKey();
 if(a.gift===day){await noticeDialog(player,name,'「今日はもうもらったよ。また明日ね！」',{close:'戻る'});return;}
 const inv=player.getComponent('minecraft:inventory')?.container,slot=player.selectedSlotIndex,s=inv?.getItem(slot);
 const fav=favouritesOf(name).map(nameOf).join('、');
 if(!s){await noticeDialog(player,name,`渡したい物を手に持ってから選んでね。\n\n§7うわさ：${name}の好物は「${fav}」らしい。`,{close:'戻る'});return;}
 const pts=giftPoints(s.typeId,name);
 if(pts===null){await noticeDialog(player,name,`「${nameOf(s.typeId)}？ごめん、それはいらないかな…」`,{close:'戻る'});return;}
 if(s.amount>1){s.amount--;inv.setItem(slot,s);}else inv.setItem(slot,undefined);
 a.n=Math.max(0,Math.min(AFF_MAX,a.n+pts));a.gift=day;save(player,data);
 const line=pts>=3?'わあっ、大好物なんだ！本当にありがとう！':pts>0?'ありがとう、うれしいな。':'うっ…これはちょっと苦手かも。';
 await noticeDialog(player,name,`「${line}」\n\n${affText(a.n)}（${pts>0?'+':''}${pts}）`,{close:'戻る'});
}
async function doRequest(player,name,role,npcId,data){
 const a=entry(data,npcId),day=dayKey(),q=requestOf(npcId,day,role,playerJob(player)),label=nameOf(q.item);
 if(a.req===day){await noticeDialog(player,name,'「今日のお願いはもう聞いてもらったよ。助かった！」',{close:'戻る'});return;}
 const have=countOf(player,q.item,q.minRank??0),reward=`報酬：${q.coins}コイン${q.tickets?'・ガチャ券'+q.tickets+'枚':''}${q.xp?'・経験値'+q.xp:''}・親しさ+1${q.same?'\n§a同じ職業なので報酬1.5倍！§r':''}`;
 const i=await dialog(player,{title:name+'の頼みごと',body:`「${label}を${q.count}個、持ってきてくれないかな？」\n\n${reward}\n品質：${q.minRank?'ランク'+TIERS[q.minRank].label+'以上':'問わない'}\n持っている数：${have} / ${q.count}`,
  buttons:[{text:have>=q.count?'渡す':`渡す（あと${q.count-have}個）`,style:have>=q.count?'ok':'btn'},{text:'戻る',style:'no'}]});
 if(i!==0)return;
 if(have<q.count){await noticeDialog(player,name,`${label}が足りません（${have} / ${q.count}）。`,{close:'戻る'});return;}
 let msg;try{msg=ctx.game.execute(player.id,'npc.reward',{item:q.item,count:q.count,minRank:q.minRank??0,coins:q.coins,tickets:q.tickets,skill:q.skill,xp:q.xp,note:`${name}の頼みごと ${label}×${q.count}`});}
 catch(err){await noticeDialog(player,name,String(err.message??err),{close:'戻る'});return;}
 a.req=day;a.n=Math.min(AFF_MAX,a.n+1);save(player,data);ctx.refreshGame?.(player);
 await noticeDialog(player,name,`「ありがとう！本当に助かったよ。」\n\n${msg}\n${affText(a.n)}`,{close:'戻る'});
}
const playerJob=player=>{try{return ctx.game.snapshot(player.id).player.job;}catch{return undefined;}};
// ---- the job villager's shop: buy its stock (engine npc.buy) or sell that job's products for BUY_BONUS more
async function jobShop(player,name,role){
 const job=NPC_JOBS[role];
 for(;;){
  let coins=0;try{coins=ctx.game.snapshot(player.id).player.coins;}catch{}
  const i=await dialog(player,{title:`${name}の店（${job.job}）`,body:`所持金 ${coins}コイン\n${job.job}の品物は街の買取より${Math.round((BUY_BONUS-1)*100)}%高く買い取ります。`,
   buttons:[{text:'買う',style:'ok'},{text:'売る',style:'btn'},{text:'戻る',style:'no'}]});
  if(i===0)await jobBuy(player,name,role,coins);else if(i===1)await jobSell(player,name,role);else return;
 }
}
async function jobBuy(player,name,role,coins){
 const stock=NPC_JOBS[role].stock;
 const k=await chooseDialog(player,name+'の店：買う',`所持金 ${coins}コイン`,stock.map(s=>`${s.name}　${s.price}コイン`));
 if(k===undefined)return;const it=stock[k];
 const counts=[1,10,64],j=await dialog(player,{title:it.name,body:`単価 ${it.price}コイン（所持金 ${coins}コイン）\n持ち物に空きが必要です。`,
  buttons:[...counts.map(n=>({text:`${n}個（${it.price*n}コイン）`,style:coins>=it.price*n?'ok':'btn'})),{text:'戻る',style:'no'}]});
 if(j===undefined||j>=counts.length)return;
 try{const msg=ctx.game.execute(player.id,'npc.buy',{role,item:it.item,count:counts[j]});ctx.refreshGame?.(player);await noticeDialog(player,name,`「まいどあり！」\n\n${msg}`,{close:'戻る'});}
 catch(err){await noticeDialog(player,name,String(err.message??err),{close:'戻る'});}
}
async function jobSell(player,name,role){
 const job=NPC_JOBS[role],inv=player.getComponent('minecraft:inventory')?.container;
 const groups=sellables(inv).filter(g=>job.buys.has(g.id)).map(g=>({...g,price:capResale(g.id,Math.max(1,Math.round(g.price*BUY_BONUS)),g.tier)})); // never above a resale of the cheapest purchase (sell-price.js)
 if(!groups.length){await noticeDialog(player,name,`「${job.job}の品物を持ってきてくれたら買い取るよ。」`,{close:'戻る'});return;}
 const k=await chooseDialog(player,name+'の店：売る','売る品物を選んでください（持っている分を全部売ります）。',groups.map(g=>`${nameOf(g.id)} ×${g.count}　${g.price*g.count}コイン`));
 if(k===undefined)return;const g=groups[k];
 try{const msg=sellGroup(player,ctx.game,g,g.count,nameOf);ctx.refreshGame?.(player);await noticeDialog(player,name,`「いい品だね、ありがとう！」\n\n${msg}`,{close:'戻る'});}
 catch(err){await noticeDialog(player,name,String(err.message??err),{close:'戻る'});}
}
// staff (admin tag) sneaking while they right click choose the NPC's role
async function changeRole(player,e,name){
 const ids=Object.keys(ROLES),k=await chooseDialog(player,name+'の役割（運営）','役割を選んでください。',ids.map(r=>ROLES[r]));
 if(k===undefined)return;e.setDynamicProperty('cooptown:npc_role',ids[k]);dress(e,name,ids[k],true);
 const MOVES=[['stay','動かない（その場に立つ）'],['roam','よく動く（歩き回る）'],[undefined,'役割にまかせる']];
 const m=await chooseDialog(player,name+'の動き（運営）',`今：${moveOf(ids[k],e.getDynamicProperty(MOVE_KEY))==='stay'?'動かない':'よく動く'}`,MOVES.map(x=>x[1]));
 if(m!==undefined){e.setDynamicProperty(MOVE_KEY,MOVES[m][0]);applyMove(e,ids[k]);}
 await noticeDialog(player,name,`役割を「${ROLES[ids[k]]}」、動きを「${moveOf(ids[k],e.getDynamicProperty(MOVE_KEY))==='stay'?'動かない':'よく動く'}」にしました。`,{close:'閉じる'});
}
// ---- the conversation screen (asked 2026-10-24; RP tools/build-npc-ui.mjs, form title "ct:npc") ----
// The NPC's portrait (its skin), name and role, what it says (greeting by time of day + a line of its role), and four
// choices by role. Opening it is the day's talk (friendship +1 once a day); 話す gives another line.
export const NPC_BUTTONS=['name','role','say','choice1','choice2','choice3','choice4','close'];
export const ROLE_TITLE={miner:'鉱石商',lumberjack:'材木商',farmer:'農産物商人',fisher:'魚屋',cook:'料理屋',smith:'鍛冶屋',alchemist:'薬屋',enchanter:'付与術の店',adventurer:'冒険者の案内人',
 resident:'街の住人',merchant:'よろず屋',client:'依頼人',keeper:'共有倉庫の倉庫番',guide:'最初の町の案内係'};
const SELL_WORD={miner:'鉱石',lumberjack:'木材',farmer:'作物',fisher:'魚',cook:'料理',smith:'装備',alchemist:'薬',enchanter:'本',adventurer:'戦利品'};
const ROLE_LINE={miner:'掘った鉱石は持っておいで。いい値で買うよ。',lumberjack:'いい木材が入ったら見せておくれ。',farmer:'採れたての野菜も買い取っているよ。',fisher:'釣った魚は高く買い取るよ。',cook:'自慢の料理、食べていくかい？',smith:'いい鉄が入っているよ。',
 alchemist:'薬のことなら任せておくれ。',enchanter:'珍しい本も扱っているよ。',adventurer:'冒険の準備はできているかい？',merchant:'掘り出し物がそろっているよ。',
 client:'ちょっと頼みたいことがあるんだ。',keeper:'みんなの素材を預かっているよ。',guide:'はじめての人には、冒険の道具をまとめて渡しているよ。',resident:'今日もいい日になるといいね。'};
const GREET={morning:'おはよう！',noon:'こんにちは！',evening:'こんばんは！',night:'夜遅くにどうしたんだい？'};
/** The choices for a role: [{key, icon mark, text}] (always four, the last 会話を終える). */
export function npcChoices(role){
 const errand={key:'errand',icon:'[iq]',text:'依頼を受ける'},bye={key:'bye',icon:'[ie]',text:'会話を終える'};
 if(isJob(role))return [{key:'buy',icon:'[is]',text:'商品を見る'},{key:'sell',icon:'[iv]',text:`${SELL_WORD[role]??'品物'}を売る`},errand,bye];
 if(role==='merchant')return [{key:'trader_buy',icon:'[is]',text:'商品を見る'},{key:'trader_sell',icon:'[iv]',text:'品物を売る'},errand,bye]; // trader-book.js: 1.5x / a third
 if(role==='guide')return [{key:'kit',icon:'[iv]',text:'初期配布を受け取る'},{key:'tips',icon:'[iq]',text:'町のことを聞く'},{key:'talk',icon:'[is]',text:'話す'},bye];
 if(role==='keeper')return [{key:'deposit',icon:'[iv]',text:'素材を預ける'},{key:'withdraw',icon:'[is]',text:'素材を受け取る'},{key:'stock',icon:'[iq]',text:'倉庫の中を見る'},bye];
 return [errand,{key:'gift',icon:'[iv]',text:'プレゼントする'},{key:'talk',icon:'[is]',text:'話す'},bye];
}
const variantOf=e=>{try{return e.getComponent('minecraft:variant')?.value??0;}catch{return 0;}};
/** The screen's buttons (NPC_BUTTONS order). */
export function npcButtons({name,role,variant=0,say}){
 const c=npcChoices(role);
 return [`[p${Math.max(0,Math.min(8,variant))+1}]${name}`,ROLE_TITLE[role]??ROLES[role]??'',say,
  ...c.map(x=>x.icon+x.text),'閉じる'];
}
async function showForm(player,buttons){
 const form=new ActionFormData().title('ct:npc').body('');for(const t of buttons)form.button(t);
 for(let busy=0;;busy++){const r=await form.show(player);if(r.canceled&&r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(res=>system.runTimeout(res,10));continue;}return r;}
}
async function errands(player,name,role,npcId,data){
 const labels=['頼みごとを聞く','街の依頼を見る',...(npcChoices(role).some(x=>x.key==='gift')?[]:['プレゼントする'])];
 const k=await chooseDialog(player,name+'への用事','どうする？',labels);
 if(k===0)await doRequest(player,name,role,npcId,data);
 else if(k===1){await menus.quest?.(player);return true;}
 else if(k===2)await giveGift(player,name,npcId,data);
}
// the starter kit (asked 2026-10-30): the 案内係 NPC (role guide) hands it over once per player (game-engine.js STARTER_KIT)
async function starterKit(player,name){
 let given=true;try{given=!!ctx.game.snapshot(player.id).player.starterGiven;}catch{}
 if(given){await noticeDialog(player,name,'「初期配布はもう渡してあるよ。困ったことがあったら、いつでも聞いてね。」',{close:'わかった'});return;}
 let msg;try{msg=ctx.game.execute(player.id,'guide.give');ctx.refreshGame?.(player);}catch(err){await noticeDialog(player,name,'「渡したい物があるんだけど、持ち物がいっぱいみたい。空きを作ってまた話しかけてね。」\n\n'+String(err.message??err),{close:'わかった'});return;}
 try{player.playSound('random.levelup',{pitch:1.4,volume:.5});}catch{}
 await noticeDialog(player,name,`「ようこそ、最初の町へ！これを持っていって。」\n\n${msg}\n§7案内手帳を手に持って使うと、メニューが開きます。`,{close:'ありがとう'});
}
const TIPS=['「案内手帳を手に持って使うと、メニューが開くよ。職業選び・依頼・デイリーはそこから。」',
 '「最初の3時間は、職業を何回でも無料で変えられるよ。いろいろ試してみてね。」',
 '「街の中では戦えないし、敵も出ないよ。外に出るときは準備をしっかりね。」',
 '「死んでしまったら、その場所にお墓ができるよ。墓のコンパスを持つと場所がわかるからね。」',
 '「お店のNPCに話しかけると、品物を売り買いできるよ。依頼人の頼みごとも聞いてあげてね。」'];
async function openNpc(player,e){
 const {name,role}=profileOf(e);
 if(player.isSneaking&&player.hasTag(ADMIN_RULES.tag))return changeRole(player,e,name);
 // opening is the day's talk
 {const data=affinities(player);talkPoint(data,e.id,dayKey());save(player,data);}
 let say=`${GREET[partOfDay(world.getTimeOfDay())]}今日は何を探しているんだい？\n${ROLE_LINE[role]??''}`;
 if(role==='guide')say=`${GREET[partOfDay(world.getTimeOfDay())]}最初の町へようこそ！\n${ROLE_LINE.guide}`;
 for(;;){
  const data=affinities(player),a=entry(data,e.id);
  await payRewards(player,name,a,data);
  const r=await showForm(player,npcButtons({name,role,variant:variantOf(e),say}));
  if(r.canceled||r.selection===7)return;
  const ch=npcChoices(role)[r.selection-3];if(!ch||ch.key==='bye')return;
  if(ch.key==='talk'){const line=a.n>=6&&Math.random()<.5?pick(CLOSE):pick(LINES[partOfDay(world.getTimeOfDay())]);say=`${line}\n§7親しさ：${affinityLabel(a.n)}（${a.n}/${AFF_MAX}）`;}
  else if(ch.key==='kit')await starterKit(player,name);
  else if(ch.key==='tips')say=pick(TIPS);
  else if(ch.key==='gift')await giveGift(player,name,e.id,data);
  else if(ch.key==='errand'){if(await errands(player,name,role,e.id,data))return;}
  else if(ch.key==='buy'){let coins=0;try{coins=ctx.game.snapshot(player.id).player.coins;}catch{}await jobBuy(player,name,role,coins);}
  else if(ch.key==='sell')await jobSell(player,name,role);
  else if(ch.key==='trade'){await menus.trade?.(player);return;}
  else if(ch.key==='trader_buy'||ch.key==='trader_sell'){await menus.trader?.(player,ch.key==='trader_sell'?1:0);return;}
  // depositing: a chest-like box appears; the conversation ends so the player can open it
  else if(ch.key==='deposit'){if(openDepositBox(player,e)){try{player.sendMessage(`§b${name}「どこを見ていても、使う（右クリック）と預け箱が開くよ。入れた物はすぐ倉庫にしまうからね。しゃがむと終わり。」`);}catch{}return;}}
  // looking and taking: the box opens filled with the warehouse; the conversation ends so the player can open it
  else if(ch.key==='withdraw'||ch.key==='stock'){if(await keeperBrowse(player,e,name,ctx)){try{player.sendMessage(`§b${name}「使う（右クリック）と倉庫の箱が開くよ。ほしい物を持っていってね。しゃがむと閉じて、残りは倉庫に戻すよ。」`);}catch{}return;}}
  if(!e.isValid)return;
 }
}
export function installNpcs(c={}){
 ctx=c;
 installDepositBoxes(c);
 const busy=new Set(),talking=new Set();
 // the before event fires for any right click on the NPC; the after event is the fallback for older script versions
 const onInteract=({player,target})=>{
  if(target?.typeId!==NPC||busy.has(player.id))return;
  busy.add(player.id);
  // while the menu is open the NPC stops, faces the player and waves (property cooptown:talking -> RP wave animation)
  system.run(async()=>{
   talking.add(target.id);try{target.triggerEvent('cooptown:talk_start');}catch{}
   try{await openNpc(player,target);}catch(err){console.warn('[CoopTown] 村人: '+err);}
   finally{busy.delete(player.id);talking.delete(target.id);try{if(target.isValid)target.triggerEvent('cooptown:talk_end');}catch{}}
  });
 };
 if(world.beforeEvents.playerInteractWithEntity)world.beforeEvents.playerInteractWithEntity.subscribe(ev=>{if(ev.target?.typeId===NPC){ev.cancel=true;onInteract(ev);}});
 else world.afterEvents.playerInteractWithEntity?.subscribe(onInteract);
 // name tags for new NPCs, and the day / night switch (only when it changes)
 let night;
 system.runInterval(()=>{
  const now=isNight(world.getTimeOfDay()),flip=now!==night;night=now;
  for(const dim of ['overworld','nether','the_end'])for(const e of world.getDimension(dim).getEntities({type:NPC})){
   try{const p=profileOf(e);if(flip&&p.move==='roam')e.triggerEvent(now?'cooptown:night':'cooptown:day');}catch{} // standing NPCs keep still day and night
   try{if(!talking.has(e.id)&&e.getProperty('cooptown:talking'))e.triggerEvent('cooptown:talk_end');}catch{} // left over from a menu that never closed
  }
 },100);
 world.afterEvents.entitySpawn?.subscribe(({entity})=>{if(entity?.typeId===NPC)system.run(()=>{try{const p=profileOf(entity);if(p.move==='roam'&&isNight(world.getTimeOfDay()))entity.triggerEvent('cooptown:night');}catch{}});});
}
