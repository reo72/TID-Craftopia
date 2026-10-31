import {world,system} from '@minecraft/server';
import {ModalFormData} from '@minecraft/server-ui';
import {chooseDialog,noticeDialog,confirmDialog} from './dialog.js';
import {notify} from './notify.js';

// Friends (book menu フレンド): send a request to someone online, accept / decline requests, and for each friend:
// see if they are online (else when they were last here), the direction and distance when in the same dimension, send
// a short message, send coins (the bank transfer), or remove them. Friends get a chat line when the other one joins,
// and a player joining hears how many requests wait. The list lives in the game data (game-engine.js friend.*).
const DIRS=['北','北東','東','南東','南','南西','西','北西'];
const direction=(from,to)=>DIRS[Math.round(((Math.atan2(to.x-from.x,-(to.z-from.z))*180/Math.PI+360)%360)/45)%8];
const day=t=>{if(!t)return '不明';const d=new Date(t+9*3600000);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
// how long ago: 「3分前」「2時間前」「5日前」
const ago=t=>{if(!t)return '';const m=Math.floor((Date.now()-t)/60000);return m<1?'たった今':m<60?`${m}分前`:m<1440?`${Math.floor(m/60)}時間前`:`${Math.floor(m/1440)}日前`;};
const joinedAt=new Map(); // player id -> when they came in (this session)
/** Filled by installFriends: what the book's フレンド page calls (friend-book.js). */
export const friendApi={};
export function installFriends({game,refreshGame}){
 const online=id=>world.getAllPlayers().find(p=>p.id===id);
 const data=player=>{try{return game.peek(d=>{const me=d.players[player.id]??{};const view=id=>({id,job:d.players[id]?.job,level:d.players[id]?.level,name:d.players[id]?.name??'?',seen:d.players[id]?.lastSeen??d.players[id]?.savedAt,title:d.players[id]?.title,job:d.players[id]?.job,level:d.players[id]?.level,unread:me.unread?.[id]??0,talk:me.talk?.[id]??[]});
  return {view,friends:(me.friends??[]).map(view),requests:(me.friendRequests??[]).map(r=>view(r.from)),coins:me.coins??0,known:id=>!!d.players[id]};});}catch{return {friends:[],requests:[],coins:0,known:()=>false};}};
 const run=(player,action,a)=>{try{const m=game.execute(player.id,action,a);refreshGame(player);return '§a'+m;}catch(e){return '§c'+(e.message??e);}};
 // 会話・メール (asked 2026-10-27): the last messages with a friend and a reply box; works when they are offline (the
 // message waits, game-engine.js friend.mail). Opening it marks them read.
 async function conversation(player,id){
  for(;;){
   const f=data(player).friends.find(x=>x.id===id);if(!f)return;
   if(f.unread)run(player,'friend.read',{id});
   const lines=f.talk.slice(-10).map(m=>`${m.me?'§b自分':'§d'+f.name}§7 ${day(m.at)}§r\n${m.text}`);
   const i=await chooseDialog(player,`${f.name}との会話`,lines.length?lines.join('\n\n'):'まだメッセージはありません。',['メッセージを書く'],{back:'戻る'});
   if(i===undefined)return;
   const r=await new ModalFormData().title('ct:in|'+f.name+'へメッセージ').textField('メッセージ（100文字まで）','例：明日いっしょに探索しよう').show(player);if(r.canceled)continue;
   const text=String(r.formValues[0]??'').trim().slice(0,100);if(!text)continue;
   const m=run(player,'friend.mail',{id,text});if(!m.startsWith('§a')){await noticeDialog(player,'メッセージ',m,{close:'戻る'});continue;}
   const o=online(id);if(o)try{o.sendMessage(`§d[メール] ${player.name}：§f${text}§7（手帳 ＞ フレンドで返信）`);o.playSound('random.orb');}catch{}
  }
 }
 async function friendMenu(player,f){
  for(;;){
   const o=online(f.id),here=o&&o.dimension.id===player.dimension.id;
   const where=(!o?`§7オフライン　最終ログイン ${day(f.seen)}（${ago(f.seen)}）`:`§aオンライン　ログイン中 ${joinedAt.has(f.id)?Math.max(1,Math.round((Date.now()-joinedAt.get(f.id))/60000))+'分':''}`)+`§r\n${f.job??''} Lv.${f.level??1}\n`+(!o?'':here?`${direction(player.location,o.location)}へ${Math.round(Math.hypot(o.location.x-player.location.x,o.location.z-player.location.z))}m`:'別のディメンションにいます');
   const i=await chooseDialog(player,f.name,where,[`会話・メール${f.unread?`（未読 ${f.unread}）`:''}`,'コインを送る','フレンドを外す'],{back:'戻る'});
   if(i===undefined)return;
   if(i===0){await conversation(player,f.id);f=data(player).friends.find(x=>x.id===f.id)??f;continue;}
   else if(i===1)await sendCoins(player,f);
   else if(i===2){if(await removeFriend(player,f))return;}
  }
 }
 async function sendCoins(player,f){
  const have=data(player).coins,o=online(f.id);
  const r=await new ModalFormData().title('ct:in|'+f.name+'へ送金').textField(`送る金額（所持 ${have}コイン）`,'整数',{defaultValue:'100'}).show(player);if(r.canceled)return;
  const amount=Math.floor(Number(r.formValues[0]));if(!(amount>0)){await noticeDialog(player,'送金','金額を正しく入れてください。',{close:'戻る'});return;}
  if(!await confirmDialog(player,'送金の確認',`${f.name}へ${amount}コインを送ります。`,{ok:'送る'}))return;
  await noticeDialog(player,'送金',run(player,'bank.transfer',{to:f.id,amount}),{close:'戻る'});if(o)try{o.sendMessage(`§a${player.name}から${amount}コインが届きました`);}catch{}
 }
 async function removeFriend(player,f){
  if(!await confirmDialog(player,'フレンドを外す',`${f.name}をフレンドから外しますか？`,{ok:'外す'}))return false;
  await noticeDialog(player,'フレンド',run(player,'friend.remove',{id:f.id}),{close:'戻る'});return true;
 }
 async function answer(player,r,accept){
  const m=run(player,accept?'friend.accept':'friend.decline',{id:r.id});await noticeDialog(player,'フレンド',m,{close:'戻る'});
  const o=online(r.id);if(accept&&o&&m.startsWith('§a'))try{o.sendMessage(`§a${player.name}がフレンド申請を承認しました`);}catch{}
 }
 async function ask(player,o){
  const m=run(player,'friend.request',{id:o.id});await noticeDialog(player,'フレンド',m,{close:'戻る'});
  if(m.includes('申請を送りました')||m.includes('フレンドになりました'))try{o.sendMessage(`§e${player.name}からフレンド申請が届きました（手帳 ＞ フレンド）`);}catch{}
 }
 /** Online players a request can go to (not friends yet, known to the game). */
 const addable=player=>{const d=data(player),mine=new Set(d.friends.map(f=>f.id));return world.getAllPlayers().filter(o=>o.id!==player.id&&!mine.has(o.id)&&d.known(o.id));};
 // the book's フレンド page (friend-book.js) uses these
 Object.assign(friendApi,{data,online,conversation,sendCoins,removeFriend,answer,ask,addable,
  where:(player,f)=>{const o=online(f.id),here=o&&o.dimension.id===player.dimension.id;
   return !o?`最終ログイン ${day(f.seen)}（${ago(f.seen)}）`:`ログイン中 ${joinedAt.has(f.id)?Math.max(1,Math.round((Date.now()-joinedAt.get(f.id))/60000))+'分':''}`+(here?`　${direction(player.location,o.location)}へ${Math.round(Math.hypot(o.location.x-player.location.x,o.location.z-player.location.z))}m`:'　別のディメンション');},ago});
 async function requests(player){
  for(;;){
   const {requests:list}=data(player);if(!list.length){await noticeDialog(player,'フレンド申請','届いている申請はありません。',{close:'戻る'});return;}
   const i=await chooseDialog(player,'フレンド申請',`${list.length}件の申請が届いています。`,list.map(r=>r.name),{back:'戻る'});if(i===undefined)return;
   const r=list[i],k=await chooseDialog(player,r.name,`${r.name}からフレンド申請が届いています。`,['承認する','断る'],{back:'戻る'});
   if(k===0){const m=run(player,'friend.accept',{id:r.id});await noticeDialog(player,'フレンド',m,{close:'戻る'});const o=online(r.id);if(o&&m.startsWith('§a'))try{o.sendMessage(`§a${player.name}がフレンド申請を承認しました`);}catch{}}
   else if(k===1)await noticeDialog(player,'フレンド',run(player,'friend.decline',{id:r.id}),{close:'戻る'});
  }
 }
 async function add(player){
  const d=data(player),mine=new Set(d.friends.map(f=>f.id));void mine;
  const list=world.getAllPlayers().filter(o=>o.id!==player.id&&!mine.has(o.id)&&d.known(o.id));
  if(!list.length){await noticeDialog(player,'フレンドを追加','申請できるオンラインの人がいません。',{close:'戻る'});return;}
  const i=await chooseDialog(player,'フレンドを追加','申請する相手を選んでください。',list.map(o=>o.name),{back:'戻る'});if(i===undefined)return;
  const m=run(player,'friend.request',{id:list[i].id});await noticeDialog(player,'フレンド',m,{close:'戻る'});
  if(m.includes('申請を送りました'))try{list[i].sendMessage(`§e${player.name}からフレンド申請が届きました（手帳 ＞ フレンド）`);}catch{}
 }
 async function open(player){
  if(friendApi.page){await friendApi.page(player);return;} // the book's page (friend-book.js)
  for(;;){
   const d=data(player),list=[...d.friends].sort((a,b)=>Number(!!online(b.id))-Number(!!online(a.id)));
   const labels=[...list.map(f=>(online(f.id)?'§a● §r':'§7○ §r')+f.name+(f.unread?`　§c✉${f.unread}`:'')+(online(f.id)?'':`§7　${ago(f.seen)}`)),`申請を確認（${d.requests.length}）`,'フレンドを追加'];
   const i=await chooseDialog(player,'フレンド',`フレンド ${d.friends.length}人（オンライン ${list.filter(f=>online(f.id)).length}人）\n名前を選ぶと、場所の確認・メッセージ・送金ができます。`,labels,{back:'閉じる'});
   if(i===undefined)return;
   if(i<list.length)await friendMenu(player,list[i]);else if(i===list.length)await requests(player);else await add(player);
  }
 }
 // joining: tell the friends online, and the player how many requests wait
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{
  if(!initialSpawn)return;
  system.runTimeout(()=>{try{const d=data(player);
   joinedAt.set(player.id,Date.now());
   for(const f of d.friends){const o=online(f.id);if(o)try{o.sendMessage(`§b[フレンド] ${player.name}が来ました`);}catch{}}
   const unread=d.friends.reduce((a,f)=>a+f.unread,0);if(unread)try{player.sendMessage(`§d[メール] 未読のメッセージが${unread}件あります（手帳 ＞ フレンド）`);notify(player,`未読のメール ${unread}件`,1,6);}catch{}
   if(d.requests.length)player.sendMessage(`§e[フレンド] 申請が${d.requests.length}件届いています（手帳 ＞ フレンド）`);}catch{}},60);
 });
 return {openFriends:player=>open(player)};
}
