import {dialog,noticeDialog} from './dialog.js';
import {SMITH_LEVELS} from './workbench-config.js';
import {qualityOf,TIERS} from './quality.js';
import {SELL_PRICES} from './npc-sell.js';
import {jobCount} from './job-count.js';

// 職人依頼 (commissions, asked 2026-10-23): town people order gear from the smith. Each smith gets COMMISSION.perDay
// orders a day (the same all day, picked by player and day), only for things their job level can make
// (workbench-config.js SMITH_LEVELS) and asking for a quality rank that grows with the level. Handing one in takes an
// item of that kind and at least that rank from the inventory; the reward is coins and craft XP (and a gacha ticket
// for rank A / S orders). Opened by sneaking and using an anvil with an empty hand (anvil-runtime.js).
export const COMMISSION={perDay:3,key:'cooptown:commissions'};
const CLIENTS=['見習い冒険者','街の衛兵','鉱山の親方','農園の主人','旅の商人','漁師の親方','村の鍛冶仲間','騎士団の使い'];
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
const dayKey=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
/** The highest rank an order can ask for at a job level: Lv1-4 D, 5-11 C, 12-19 B, 20-29 A, 30+ S. */
export const maxOrderRank=level=>level>=30?4:level>=20?3:level>=12?2:level>=5?1:0;
/** The day's orders for a player: [{item, rank, coins, xp, tickets, client}] (deterministic). */
export function ordersFor(playerId,level,day=dayKey()){
 const open=Object.entries(SMITH_LEVELS).filter(([,lv])=>lv<=level).map(([id])=>id).sort();
 const out=[],used=new Set();
 for(let k=0;out.length<COMMISSION.perDay&&k<20;k++){
  const h=hash(playerId+'|'+day+'|'+k),item=open[h%open.length];if(!item||used.has(item))continue;used.add(item);
  const rank=Math.min(maxOrderRank(level),(h>>>8)%(maxOrderRank(level)+1)),base=SELL_PRICES[item]?.[0]??Math.max(20,SMITH_LEVELS[item]*8);
  out.push({item,rank,coins:Math.round(base*(1.5+rank*.6)),xp:20+rank*15+SMITH_LEVELS[item],tickets:rank>=3?1:0,client:CLIENTS[(h>>>16)%CLIENTS.length]});
 }
 return out;
}
const readDone=(player,day)=>{try{const v=JSON.parse(player.getDynamicProperty(COMMISSION.key)??'{}');return v.day===day?v.done??[]:[];}catch{return [];}};
const saveDone=(player,day,done)=>{try{player.setDynamicProperty(COMMISSION.key,JSON.stringify({day,done}));}catch{}};
/** Inventory slots holding the ordered item at the rank or better (named items do not count). */
function findItem(player,o){
 const inv=player.getComponent('minecraft:inventory')?.container;if(!inv)return -1;
 for(let i=0;i<inv.size;i++){const s=inv.getItem(i);if(s?.typeId===o.item&&!s.nameTag&&qualityOf(s)>=o.rank)return i;}
 return -1;
}
export async function openCommissions(player,{game,itemName,refreshGame}){
 for(;;){
  let level=1;try{level=refreshGame(player).player.level??1;}catch{}
  const day=dayKey(),orders=ordersFor(player.id,level,day),done=readDone(player,day);
  const label=o=>`${itemName(o.item)} ランク${TIERS[o.rank].label}以上`;
  const i=await dialog(player,{title:'職人依頼',body:`今日の依頼（毎日入れ替わります）　職業Lv.${level}\n手持ちの品から、指定ランク以上の物を1つ渡します。`,
   buttons:[...orders.map((o,k)=>({text:(done.includes(k)?'[済] ':'')+label(o),style:done.includes(k)?'no':findItem(player,o)>=0?'ok':'btn'})),{text:'閉じる',style:'no'}]});
  if(i===undefined||i>=orders.length)return;
  const o=orders[i];
  if(done.includes(i)){await noticeDialog(player,'職人依頼','この依頼は今日はもう納品しました。',{close:'戻る'});continue;}
  const slot=findItem(player,o),reward=`報酬：${o.coins}コイン・クラフト経験値${o.xp}${o.tickets?'・ガチャ券1枚':''}`;
  const j=await dialog(player,{title:o.client+'からの依頼',body:`「${label(o)}を1つ作ってほしい。」\n\n${reward}\n${slot>=0?'§a条件に合う品を持っています':'§c条件に合う品を持っていません（金床で作れます）'}`,
   buttons:[{text:'納品する',style:slot>=0?'ok':'btn'},{text:'戻る',style:'no'}]});
  if(j!==0)continue;
  const at=findItem(player,o);if(at<0){await noticeDialog(player,'職人依頼','条件に合う品がありません。',{close:'戻る'});continue;}
  try{
   const inv=player.getComponent('minecraft:inventory').container,s=inv.getItem(at);
   if(s.amount>1){s.amount--;inv.setItem(at,s);}else inv.setItem(at,undefined);
   const msg=game.execute(player.id,'npc.reward',{coins:o.coins,tickets:o.tickets,skill:'craft',xp:o.xp,note:`職人依頼 ${itemName(o.item)}（ランク${TIERS[o.rank].label}以上）`});
   done.push(i);saveDone(player,day,done);jobCount(player,'commission');refreshGame(player);
   try{player.playSound('random.levelup',{pitch:1.4,volume:.6});}catch{}
   await noticeDialog(player,o.client,`「いい仕事だ、ありがとう！」\n\n${msg}`,{close:'戻る'});
  }catch(e){await noticeDialog(player,'職人依頼',String(e.message??e),{close:'戻る'});}
 }
}
