import {world,system} from '@minecraft/server';
import {game,openGameFeature} from './game-runtime.js';
import {BOOK_ICON,itemIcon} from './book-frame.js';
import {ITEM_NAMES} from './game-config.js';
import {notify} from './notify.js';
import {noticesFor,unreadFor} from './notice-config.js';

// The book's お知らせ page (notice-config.js) and the call when a player comes in with unread notices.
const date=t=>{const d=new Date(t+9*3600000);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
const peek=fn=>{try{return game.peek(fn);}catch{return undefined;}};
const itemsText=n=>n.items?.length?n.items.map(([id,c])=>`${ITEM_NAMES[id]??id.replace(/^\w+:/,'')} ×${c}`).join('、'):'';
export const noticeModel={
 spec(player,snap,state){
  const list=peek(db=>noticesFor(db,player.id))??[],x=list[state.sel];
  const read=n=>(n.read??[]).includes(player.id),got=n=>(n.claimed??[]).includes(player.id);
  const rows=list.length?list.map(n=>({title:(read(n)?'':'§c● §r')+n.title,sub:`${date(n.at)}${n.to?'　あなたへ':''}${n.items?.length?(got(n)?'　受取済み':'　§6アイテム付き'):''}`,icon:n.items?.length?BOOK_ICON+'chest':BOOK_ICON+'scroll'}))
   :[{title:'お知らせはまだありません',icon:BOOK_ICON+'scroll'}];
  return {left:'お知らせ',right:x?x.title:'',summary:`未読 ${list.filter(n=>!read(n)).length}件`,rows,
   detail:x?{icon:x.items?.length?itemIcon(x.items[0][0],BOOK_ICON+'chest'):BOOK_ICON+'scroll',title:x.title,state:`${date(x.at)}　${x.by}`,text:x.text+(x.items?.length?`\n\n§6添付：${itemsText(x)}`:''),
    infoLabel:x.items?.length?'アイテム':'',infoValue:x.items?.length?(got(x)?'受取済み':'受け取れます'):''}:{},
   actions:x?.items?.length?[{label:got(x)?'受取済み':'アイテムを受け取る',enabled:!got(x),icon:BOOK_ICON+'chest'}]:[]};
 },
 decorate(s,p,state){}, // nothing extra
 pick:async(player,snap,state,r)=>{const n=(peek(db=>noticesFor(db,player.id))??[])[r];if(n&&!(n.read??[]).includes(player.id))try{game.execute(player.id,'notice.read',{id:n.id});}catch{}},
 act:async(player,snap,state)=>{const n=(peek(db=>noticesFor(db,player.id))??[])[state.sel];if(n)await openGameFeature(player,'notice.claim',{id:n.id});}};
/** Coming in: unread notices are shown on the notice bar and in chat. */
export function installNoticeLogin(){
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{
  if(!initialSpawn)return;
  system.runTimeout(()=>{const list=peek(db=>unreadFor(db,player.id))??[];if(!list.length)return;
   try{notify(player,`お知らせ ${list.length}件（手帳で確認）`,1,8);player.sendMessage(`§e[お知らせ] 未読が${list.length}件あります：${list.slice(0,3).map(n=>'「'+n.title+'」').join('')}${list.some(n=>n.items?.length)?' §6アイテム付きあり':''}§7（手帳のホーム ＞ お知らせ）`);}catch{}},100);
 });
}
