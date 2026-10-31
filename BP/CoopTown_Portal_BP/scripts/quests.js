// Quests from the site. Every 30 seconds the changes since the saved "rev" are fetched. The site never moves
// money: this pack orders the main pack (scriptevent) to hold the reward from the owner (escrow), pay the
// taker (payout) or give it back (refund), and decides from each quest's status which order is due.
//
// Every order is recorded per quest in a world property: once an order is "done" (or "failed") it is never
// sent again, however often the quest arrives. "pending" orders (no answer from the main pack yet) are sent
// again after a minute and after a restart; the main pack runs each questId+op only once.
import {world,system} from '@minecraft/server';
import {CONFIG,TO_MAIN,FROM_MAIN} from './config.js';
import {send,enqueue,onFinished,ok} from './http.js';
import {load,save} from './store.js';
import {discordPost,esc,nameOf} from './discord.js';

const KEY='portal:quests';
let state=null; // {rev, quests:{id:quest}, ops:{id:{escrow,payout,refund:{s,at,reason}, cancelSent, notified}}}
const st=()=>state??=load(KEY,{rev:0,quests:{},ops:{}});
const persist=()=>save(KEY,st());
const toMain=(id,data)=>{try{system.sendScriptEvent(id,JSON.stringify(data));}catch(e){console.warn(`[Portal] ${id} を本体へ送れませんでした: ${e}`);}};
const online=xuid=>world.getAllPlayers().find(p=>p.id===xuid);
const tell=(xuid,text)=>{try{online(xuid)?.sendMessage(text);}catch{}};
const ORDERS={escrow:TO_MAIN.escrow,payout:TO_MAIN.payout,refund:TO_MAIN.refund};

function order(q,op,xuid){
 const o=st().ops[q.id]??={};
 o[op]={s:'pending',at:Date.now(),xuid};
 toMain(ORDERS[op],{questId:q.id,xuid,amount:q.reward});
}
/** Decide from the quest's status and the recorded orders what has to happen next. */
function evaluate(q){
 const o=st().ops[q.id]??={};
 const reward=Number.isSafeInteger(q.reward)&&q.reward>0;
 if(q.status==='accepted'&&!o.notified){
  o.notified=true;
  tell(q.takerXuid,`§a依頼「${q.title}」を受注しました。納品はゲーム内の依頼掲示板から行えます。`);
  tell(q.ownerXuid,`§a依頼「${q.title}」が受注されました。`);
 }
 if(!reward)return; // reward 0: nothing is held, paid or refunded
 if(!o.escrow&&['open','accepted','done'].includes(q.status))return order(q,'escrow',q.ownerXuid);
 if(o.escrow?.s==='failed'){
  if(q.status==='open'&&!o.cancelSent){
   o.cancelSent=true;tell(q.ownerXuid,`§c所持金が足りないため、依頼「${q.title}」を取り消します。`);
   enqueue('status',`/api/game/quests/${encodeURIComponent(q.id)}/status`,{action:'cancel',xuid:q.ownerXuid},{meta:{questId:q.id,xuid:q.ownerXuid,action:'cancel'}});
  }else if(['accepted','done'].includes(q.status)&&!o.warned){o.warned=true;console.warn(`[Portal] 依頼 ${q.id} は報酬を預かれていないまま ${q.status} になりました（支払いは行いません）。`);}
  return;
 }
 if(o.escrow?.s!=='done')return; // still waiting for the owner's money
 if(q.status==='done'&&!o.payout&&q.takerXuid)order(q,'payout',q.takerXuid);
 if(q.status==='cancelled'&&!o.refund)order(q,'refund',q.ownerXuid);
}
function apply(quests,reset=false){
 const s=st();
 if(reset){s.quests={};toMain(TO_MAIN.questReset,{});}
 for(const q of quests){
  if(!q||typeof q.id!=='string')continue;
  const before=s.quests[q.id]?.status;
  if(!reset&&before!==q.status){
   if(q.status==='open'&&!before)discordPost('quest',`📜 新しい依頼「${esc(q.title)}」${esc(q.item)}×${q.qty}／報酬 ${q.reward}コイン（${esc(nameOf(q.ownerXuid))}）`);
   if(q.status==='done')discordPost('quest',`✅ 依頼「${esc(q.title)}」を **${esc(nameOf(q.takerXuid))}** が達成しました`);
  }
  s.quests[q.id]=q;toMain(TO_MAIN.questUpdate,{quest:q});
  evaluate(q);
 }
 // finished quests whose money is settled only need their order record; drop the body after a week
 const week=Date.now()-7*24*3600*1000;
 for(const [id,q] of Object.entries(s.quests)){
  const o=s.ops[id]??{},settled=!(q.reward>0)||o.escrow?.s==='failed'||(q.status==='done'?o.payout&&o.payout.s!=='pending':o.refund&&o.refund.s!=='pending');
  if(['done','cancelled'].includes(q.status)&&settled&&(q.createdAt??0)<week)delete s.quests[id];
 }
 persist();
}
let polling=false;
export async function poll(){
 if(polling)return;polling=true;
 try{
  const s=st(),{status,data}=await send('GET',`/api/game/quests?since=${s.rev}`);
  toMain(TO_MAIN.status,{online:ok(status)});
  if(!ok(status)||!data||!Array.isArray(data.quests))return;
  apply(data.quests,data.reset===true);
  if(Number.isSafeInteger(data.rev)){s.rev=data.rev;persist();}
 }finally{polling=false;}
}
const soon=()=>system.runTimeout(()=>void poll(),40);
function resendPending(force=false){
 const s=st(),now=Date.now();
 for(const [id,o] of Object.entries(s.ops))for(const op of ['escrow','payout','refund']){
  const r=o[op];if(r?.s!=='pending'||(!force&&now-r.at<CONFIG.opRetryMs))continue;
  const q=s.quests[id];if(!q){continue;}
  r.at=now;toMain(ORDERS[op],{questId:id,xuid:r.xuid,amount:q.reward});
 }
 persist();
}
function fromMain(id,message){
 let m;try{m=JSON.parse(message);}catch{return console.warn(`[Portal] ${id} の内容が JSON ではありません`);}
 const s=st();
 if(id===FROM_MAIN.result){
  const o=s.ops[m.questId];const r=o?.[m.op];if(!r)return;
  r.s=m.ok?'done':'failed';r.reason=m.reason;r.at=Date.now();
  if(m.op!=='escrow'&&!m.ok)console.warn(`[Portal] 依頼 ${m.questId} の ${m.op} に失敗：${m.reason??''}`);
  persist();const q=s.quests[m.questId];if(q)evaluate(q),persist();
 }else if(id===FROM_MAIN.delivered){
  enqueue('status',`/api/game/quests/${encodeURIComponent(m.questId)}/status`,{action:'complete',xuid:m.xuid},{meta:{questId:m.questId,xuid:m.xuid,action:'complete'}});
 }else if(id===FROM_MAIN.questCreate){
  enqueue('create','/api/game/quests',{requestId:m.requestId,ownerXuid:m.ownerXuid,title:m.title,item:m.item,qty:m.qty,reward:m.reward},{meta:{xuid:m.ownerXuid,title:m.title}});
 }else if(id===FROM_MAIN.questAction){
  enqueue('status',`/api/game/quests/${encodeURIComponent(m.questId)}/status`,{action:m.action,xuid:m.xuid},{meta:{questId:m.questId,xuid:m.xuid,action:m.action}});
 }
}
export function installQuests(){
 system.afterEvents.scriptEventReceive.subscribe(({id,message})=>{if(Object.values(FROM_MAIN).includes(id)&&id!==FROM_MAIN.town)fromMain(id,message);},{namespaces:['portal']});
 onFinished('create',(entry,{status,data},delivered)=>{
  if(delivered){tell(entry.meta.xuid,`§a依頼「${entry.meta.title}」を掲示しました。`);if(data&&typeof data.id==='string')apply([data]);else soon();}
  else{tell(entry.meta.xuid,`§c依頼「${entry.meta.title}」を掲示できませんでした（内容を確認してください）。`);toMain(TO_MAIN.createFailed,{requestId:entry.body.requestId,xuid:entry.meta.xuid,status});}
 });
 onFinished('status',(entry,{status},delivered)=>{
  const {xuid,action}=entry.meta;
  if(delivered)soon();
  else if(action!=='cancel'||status!==409)tell(xuid,status===404?'§cその依頼は見つかりませんでした。':'§cその操作はできませんでした（すでに受注・終了しているかもしれません）。');
  if(!delivered)soon();
 });
 system.runInterval(()=>void poll(),CONFIG.questsEverySec*20);
 system.runInterval(()=>resendPending(),20*20);
 system.runTimeout(()=>{resendPending(true);void poll();},200); // after a restart: ask again about orders left pending
}
