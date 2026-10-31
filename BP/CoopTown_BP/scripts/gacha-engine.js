// The gacha's ledger side (rules in gacha-config.js). p.gacha = {daily, epic (tickets), pity: {kind: {E, L}},
// day, got (daily tickets received that gacha day), claimed (the free one taken), history: [{at, kind, id, rarity, pity}]}.
// Normal tickets stay in p.tickets: everything that used to give a gacha ticket (quests, codex, villagers, admin)
// now gives a normal ticket, and the tickets players already had count as normal tickets.
import {GACHA,GACHA_KINDS,RARITY_NAMES,DAILY_TICKET_CAP,GACHA_HISTORY,gachaDay,drawOnce} from './gacha-config.js';
export function gachaState(p,now){
 const g=p.gacha??={};g.daily??=0;g.epic??=0;g.pity??={};for(const k of GACHA_KINDS)g.pity[k]??={};g.history??=[];
 const day=gachaDay(now);if(g.day!==day){g.day=day;g.got=0;g.claimed=false;}
 return g;
}
export const ticketsOf=(p,kind)=>kind==='normal'?p.tickets??0:p.gacha?.[kind]??0;
export function addTickets(p,kind,n){if(kind==='normal'){p.tickets=(p.tickets??0)+n;return;}p.gacha??={};p.gacha[kind]=(p.gacha[kind]??0)+n;}
/** A daily ticket within the day's cap; false when the cap is reached. */
export function giveDailyTicket(p,now){const g=gachaState(p,now);if(g.got>=DAILY_TICKET_CAP)return false;g.got++;g.daily++;return true;}
/** Level milestones: a normal ticket every 5 levels, an epic ticket every 20. */
export function levelTickets(p,level){if(level%5===0)addTickets(p,'normal',1);if(level%20===0)addTickets(p,'epic',1);}

export function applyGacha(action,a,{p,items,time,demand,integer,random,tally}){
 if(action==='gacha.claim'){
  const g=gachaState(p,time);demand(!g.claimed,'今日のデイリーチケットは受取済みです。朝5時に更新されます。');
  demand(giveDailyTicket(p,time),`デイリーチケットは1日${DAILY_TICKET_CAP}枚までです。`);g.claimed=true;
  return 'デイリーチケットを1枚受け取りました。';
 }
 if(action==='gacha.draw'){
  const kind=a.kind??'normal';demand(GACHA_KINDS.includes(kind),'ガチャの種類を選んでください。');
  const amount=integer(a.count,1,10);demand(amount===1||amount===10,'1回または10回を選んでください。');
  const g=gachaState(p,time),info=GACHA[kind];demand(ticketsOf(p,kind)>=amount,`${info.ticket}が足りません。`);
  addTickets(p,kind,-amount);tally(p,'gacha',amount);
  const lines=[],give=new Map();
  for(let i=0;i<amount;i++){
   const r=drawOnce(kind,g.pity[kind],random);
   for(const [id,n] of r.prize.give)give.set(id,(give.get(id)??0)+n);
   lines.push(`${RARITY_NAMES[r.rarity]}　${r.prize.name}${r.pity?'（天井）':''}`);
   g.history.unshift({at:time,kind,id:r.prize.id,rarity:r.rarity,pity:!!r.pity});
  }
  g.history.length=Math.min(g.history.length,GACHA_HISTORY);
  items.give.push(...give);
  return `${info.name} ${amount}回\n`+lines.join('\n');
 }
}
