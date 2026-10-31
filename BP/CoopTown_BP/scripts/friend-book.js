import {ModalFormData} from '@minecraft/server-ui';
import {friendApi} from './friend-runtime.js';
import {BOOK_TABS,TAB_TARGET,BOOK_ICON,JOB_ICON,showPage} from './book-frame.js';
import {FRIEND_MAX} from './game-engine.js';
import {titleBadge} from './book-pages.js';
import {partyOf,invite,leave} from './party.js';
import {chooseDialog,noticeDialog} from './dialog.js';

// The book's フレンド page (asked 2026-10-27 with a picture; RP: friendsPage in tools/build-book-ui.mjs): the list on
// the left (search, すべて / オンライン / 申請, four rows a page: face, name and status, job, a talk button), the
// chosen one on the right (a full-figure portrait, name, status, job and level, title, three buttons). Faces and
// portraits are drawn from the job's outfit skin (RP textures/cooptown/skins). 申請: requests received, then the
// online players a request can go to.
export const FRIEND_SLOTS={search:4,tabs:5,rows:8,jobs:12,talk:16,count:20,prev:21,page:22,next:23,portrait:24,name:25,status:26,job:27,title:28,buttons:29,note:32};
const PER=4,HIDE='ct:-|';
const SKIN={'農家':'farmer','釣り師':'fisher','鍛冶師':'smith','料理人':'cook','調合師':'alchemist','付与術師':'enchanter','冒険家':'adventurer','鉱夫':'adventurer','木こり':'adventurer'}; // 鉱夫 / 木こり: the 冒険家 outfit until theirs come
const skinOf=job=>'textures/cooptown/skins/'+(SKIN[job]??'traveler');
const jobIcon=job=>BOOK_ICON+(JOB_ICON[job]??'medal');
const jobName=job=>job&&job!=='未選択'?job:'ニート';
/** The rows of a tab: friends ({kind:'friend', f}), or requests / players to ask. */
export function friendRows(player,tab,query=''){
 const d=friendApi.data(player),on=f=>!!friendApi.online(f.id),q=query.trim().toLowerCase(),match=n=>!q||String(n).toLowerCase().includes(q);
 if(tab===2)return [...d.requests.filter(r=>match(r.name)).map(r=>({kind:'request',r,id:r.id,name:r.name,job:r.job,level:r.level})),
  ...friendApi.addable(player).filter(o=>match(o.name)).map(o=>{const x=d.view?.(o.id);return {kind:'add',o,id:o.id,name:o.name,job:x?.job,level:x?.level};})];
 return d.friends.filter(f=>(tab===0||on(f))&&match(f.name)).sort((a,b)=>Number(on(b))-Number(on(a))||(b.seen??0)-(a.seen??0))
  .map(f=>({kind:'friend',f,id:f.id,name:f.name,job:f.job,level:f.level}));
}
// the party button (party.js; asked 2026-10-28): invite a friend who is online, or leave the party you share
function partyButton(player,f){
 const mine=partyOf(player.id);
 if(mine?.members.some(m=>m.id===f.id))return ['ct:wa|パーティを抜ける',BOOK_ICON+'medal'];
 return friendApi.online(f.id)?['ct:wa|パーティに誘う',BOOK_ICON+'medal']:['ct:wax|パーティ（オフライン）'];
}
async function partyAction(player,f){
 if(partyOf(player.id)?.members.some(m=>m.id===f.id)){await noticeDialog(player,'パーティ',leave(player.id),{close:'戻る'});return;}
 const o=friendApi.online(f.id);if(!o)return;
 try{player.sendMessage(`§7${f.name}さんにパーティの誘いを送りました。`);}catch{}
 const view=friendApi.data(player).view; // the screen shows faces (job outfit) and the inviter's title
 const m=await invite(player,o,id=>view?.(id)??{});try{player.sendMessage(m);}catch{}
}
/** The page's buttons (after the bookmarks) for a state {tab, sel, page, query}. */
export function friendButtons(player,state){
 const d=friendApi.data(player),rows=friendRows(player,state.tab,state.query),pages=Math.max(1,Math.ceil(rows.length/PER));
 state.page=Math.max(0,Math.min(state.page,pages-1));state.sel=Math.max(0,Math.min(state.sel,rows.length-1));
 const shown=rows.slice(state.page*PER,state.page*PER+PER),x=rows[state.sel];
 const on=r=>r.kind==='friend'?!!friendApi.online(r.id):r.kind==='add';
 const status=r=>r.kind==='request'?'§6申請が届いています':on(r)?'§2オンライン':`§8オフライン ${friendApi.ago(r.f?.seen)}`;
 const tabs=['すべて','オンライン',d.requests.length?`申請（${d.requests.length}）`:'申請'];
 const b=[];
 b[0]=['ct:fs|'+(state.query?`検索：${state.query}`:'名前で検索')];
 tabs.forEach((t,i)=>b.push([(i===state.tab?'ct:ts|':'ct:t|')+t]));
 // rows: ct:fr| / ct:frs| online, ct:fo| / ct:fos| offline (the RP draws the green / grey dot before the status)
 for(let k=0;k<PER;k++){const r=shown[k];b.push(r?[(on(r)?'ct:fr':'ct:fo')+(state.page*PER+k===state.sel?'s|':'|')+`${r.name}\n   ${status(r)}`,skinOf(r.job)]:[HIDE]);}
 for(let k=0;k<PER;k++){const r=shown[k];b.push(r?['ct:fj|'+jobName(r.job),jobIcon(r.job)]:[HIDE]);}
 for(let k=0;k<PER;k++){const r=shown[k];b.push(r?.kind==='friend'?['ct:fc|'+(r.f.unread?String(r.f.unread):'')]:[HIDE]);}
 b.push(['ct:d_fn|'+`フレンド ${d.friends.length} / ${FRIEND_MAX}`]);
 b.push([state.page>0?'ct:pp|':HIDE]);b.push(['ct:d_pg|'+`${state.page+1} / ${pages}`]);b.push([state.page<pages-1?'ct:np|':HIDE]);
 if(!x){
  b.push([HIDE],['ct:d_ti|'+(state.tab===2?'申請':'フレンド')],['ct:d_st|'],[HIDE],['ct:d_title|']);
  b.push([state.tab===2?'ct:wax|申請はありません':'ct:wa|フレンドを探す',BOOK_ICON+'compass'],[HIDE],[HIDE]);
  b.push(['ct:d_bd|'+(state.tab===2?'オンラインの人がいると、ここから申請できます。':'「申請」タブから、オンラインの人にフレンド申請を送れます。')]);
  return b;
 }
 b.push(['ct:d_pt|',skinOf(x.job)],['ct:d_ti|'+x.name],['ct:d_st|'+status(x)],['ct:d_jb|'+`${jobName(x.job)} Lv.${x.level??1}`,jobIcon(x.job)],['ct:d_title|'+(x.f?.title??''),x.f?.title?titleBadge(x.f.title):undefined]);
 if(x.kind==='friend')b.push(['ct:wa|'+(x.f.unread?`会話・メール（未読 ${x.f.unread}）`:'会話・メール'),BOOK_ICON+'scroll'],partyButton(player,x.f),['ct:wa|その他（送金・外す）',BOOK_ICON+'coins'],['ct:d_bd|'+friendApi.where(player,x.f)]);
 else if(x.kind==='request')b.push(['ct:wa|承認する',BOOK_ICON+'medal'],['ct:wa|断る',BOOK_ICON+'scroll'],[HIDE],['ct:d_bd|'+`${x.name}からフレンド申請が届いています。`]);
 else b.push([d.friends.length<FRIEND_MAX?'ct:wa|フレンド申請を送る':'ct:wax|フレンドがいっぱいです',BOOK_ICON+'scroll'],[HIDE],[HIDE],['ct:d_bd|オンラインの人です。申請して、相手が承認するとフレンドになります。']);
 return b;
}
/** Runs the page; resolves to where the book goes next ('home' / 'profile' / 'settings' / 'close'). */
export async function openFriendPage(player){
 const state={tab:0,sel:0,page:0,query:''},S=FRIEND_SLOTS,T=BOOK_TABS.length;
 for(;;){
  if(!friendApi.data)return 'home';
  const buttons=friendButtons(player,state);
  const i=await showPage(player,'friends',buttons,`friends|${state.tab}|${state.page}`);
  if(i===undefined)return 'close';
  if(i<T)return TAB_TARGET[i];
  const k=i-T+4,rows=friendRows(player,state.tab,state.query),at=n=>state.page*PER+n;
  if(k===S.search){const r=await new ModalFormData().title('ct:in|'+'フレンドを検索').textField('名前の一部（空で全員）','例：Ha',{defaultValue:state.query}).show(player);if(!r.canceled){state.query=String(r.formValues[0]??'').trim().slice(0,16);state.sel=0;state.page=0;}}
  else if(k>=S.tabs&&k<S.rows){state.tab=k-S.tabs;state.sel=0;state.page=0;}
  else if(k>=S.rows&&k<S.talk){state.sel=at((k-S.rows)%PER);}
  else if(k>=S.talk&&k<S.count){const r=rows[at(k-S.talk)];state.sel=at(k-S.talk);if(r?.kind==='friend')await friendApi.conversation(player,r.id);}
  else if(k===S.prev){state.page--;state.sel=state.page*PER;}
  else if(k===S.next){state.page++;state.sel=state.page*PER;}
  else if(k>=S.buttons&&k<S.note){
   const w=k-S.buttons,x=rows[state.sel];
   if(!x){if(state.tab!==2){state.tab=2;state.sel=0;state.page=0;}continue;}
   if(x.kind==='friend'){if(w===0)await friendApi.conversation(player,x.id);else if(w===1)await partyAction(player,x.f);
    else{const i=await chooseDialog(player,x.name,'',['コインを送る','フレンドを外す'],{back:'戻る'});
     if(i===0)await friendApi.sendCoins(player,x.f);else if(i===1&&await friendApi.removeFriend(player,x.f))state.sel=0;}}
   else if(x.kind==='request')await friendApi.answer(player,x.r,w===0);
   else await friendApi.ask(player,x.o);
  }
 }
}

friendApi.page=openFriendPage; // /cooptown:friends opens the page too
