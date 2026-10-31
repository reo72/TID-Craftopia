import {system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {noticeDialog,chooseDialog} from './dialog.js';
import {game,refreshGame,openGameFeature} from './game-runtime.js';
import {runList,dailyModel,codexModel,titlesModel,bankModel,shopModel,eventsModel,skillModel,gachaModel,guideModel,titleBadge} from './book-pages.js';
import {openProfilePage,openSettingsPage} from './book-profile.js';
import {townModel} from './town-book.js';
import {progressModel,progressReady} from './progress-book.js';
import {commonDailies,jobDailies,COMMON_COUNT} from './daily-plan.js';
import {jobTaskDone} from './job-daily-config.js';
import {SKILL_NODES,skillPoints,skillLock} from './skill-config.js';
import {gachaDay} from './gacha-config.js';
import {friendApi} from './friend-runtime.js';
import {CODEX} from './game-config.js';
import {openTrader} from './trader-book.js';
import {noticeModel} from './notice-book.js';
import {openFriendPage} from './friend-book.js';
import {unreadFor} from './notice-config.js';
import {money,questFor,countItem,trackedIndex,TRACK_KEY} from './hud-info.js';
import {PROFILE_JOBS} from './profile-config.js';
import {RULES,ORDERS,ITEM_NAMES,dayKey} from './game-config.js';
import {TIERS} from './quality.js';
import {freeJobChange} from './playtime.js';
import {SPECIAL_DROPS,SPECIAL_ITEMS} from './special-config.js';
import {BOOK_TABS,TAB_TARGET,BOOK_ICON,OLD_ICON,bookForm,showPage,comma,JOB_ICON,JOB_SKILL,SKILL_NAME} from './book-frame.js';
import {setNpcMenus} from './npc-runtime.js';

// The book menu's home, job and quest pages (the frame: book-frame.js, the list pages: book-pages.js).
export {BOOK_TABS,bookForm} from './book-frame.js';
// home menu cards (right page, grid order): [id, caption, icon, what it opens]: a book page (book), a list page
// model (list), another page (to), a game feature (feature: its own dialogs) or a notice.
export const HOME_CARDS=[
 ['job','職業',BOOK_ICON+'miner',{book:'job'}],['quests','依頼',BOOK_ICON+'scroll',{book:'quests'}],
 ['daily','デイリー',BOOK_ICON+'calendar',{list:dailyModel}],['codex','図鑑',BOOK_ICON+'encyclopedia',{list:codexModel}],
 ['titles','称号',BOOK_ICON+'medal',{list:titlesModel}],['bank','銀行',BOOK_ICON+'vault',{list:bankModel}],
 ['shop','ショップ',BOOK_ICON+'chest',{list:shopModel}],['events','イベント',BOOK_ICON+'lantern',{list:eventsModel}]];
// second menu page (the arrow under the right page): the other features
const SAVE_NOTE='ゲームの進行は操作ごとに自動で保存されます。\n設定は変更した時点で保存されます。\n\nワールドの保存やバックアップは運営が行います。';
export const HOME2_CARDS=[
 ['craft','スキルツリー',OLD_ICON+'skill_tree',{list:skillModel}],['gacha','ガチャ',OLD_ICON+'ticket',{list:gachaModel}],
 ['town','街の発展',OLD_ICON+'town',{list:townModel}],['map','地図',OLD_ICON+'map',{feature:'map.open'}],
 ['friend','フレンド','textures/cooptown/pause/i_people',{book:'friends'}],['guide','案内',OLD_ICON+'open_book',{list:guideModel}],
 ['progress','やり込み',BOOK_ICON+'medal',{list:progressModel}], // was マイプロフィール (the same as the profile tab); やり込み: progress-book.js
['save','保存について',OLD_ICON+'save',{notice:['保存について',SAVE_NOTE]}]];
// home slots after the cards (RP: HOME_SLOTS in build-book-ui.mjs)
export const HOME_DATA=['arrow','name','job','title','wallet','bank','qtitle','qgoal','qcount','qbar','notice'];
const NOTICES=5;

// the home cards' red "!" (asked 2026-10-30): the card's text ends with BADGE (an invisible colour code; RP
// build-book-ui.mjs card shows the mark when it is there)
export const BADGE='§c';
/** The home cards with something waiting: a reward to take or something to look at. Set of card ids. */
export function homeBadges(player,p){
 const out=new Set(),safe=(id,f)=>{try{if(f())out.add(id);}catch{}};
 // デイリー: a finished one not taken, or the bonus
 safe('daily',()=>{const d=p.daily??{counts:{},claimed:[]},day=d.day??dayKey();
  return commonDailies(player.id,day).some(([,k,t],i)=>(d.counts?.[k]??0)>=t&&!d.claimed.includes(i))||
   jobDailies(player.id,day,p.job).some((t,k)=>jobTaskDone(t,d.counts??{})&&!d.claimed.includes(COMMON_COUNT+k))||(d.claimed.length>=3&&!d.bonus);});
 // 依頼: an accepted order today with enough to hand in
 safe('quests',()=>{const day=dayKey();return ORDERS.some((q,i)=>p.orders?.[i]?.day===day&&p.orders[i].status==='accepted'&&countItem(player,q.item,q.minRank??0)>=q.amount);});
 // 図鑑: a whole category found, its reward not taken
 safe('codex',()=>[...new Set(CODEX.map(v=>v[2]))].some(cat=>!p.claimedCodex?.includes(cat)&&CODEX.filter(v=>v[2]===cat).every(v=>p.codex?.[v[0]])));
 // ガチャ: today's free ticket
 safe('gacha',()=>p.gacha?.day!==gachaDay()||!p.gacha?.claimed);
 // スキルツリー: points and a node that can be learned now
 safe('craft',()=>skillPoints(p)>0&&SKILL_NODES.some(n=>!(p.skillUnlocks??[]).includes(n.id)&&!skillLock(p,n)));
 // フレンド: requests or unread mail
 safe('friend',()=>{const d=friendApi.data?.(player);return !!d&&(d.requests.length>0||d.friends.some(f=>f.unread));});
 // やり込み
 safe('progress',()=>progressReady(player,p));
 return out;
}
/** The home page's buttons for player data p (saved CoopTown data) and page 1 or 2. */
export function homeButtons(player,p,second=false){
 const cards=second?HOME2_CARDS:HOME_CARDS;
 const job=p?.job&&p.job!=='未選択'?p.job:'ニート',jobIndex=PROFILE_JOBS.indexOf(p?.job);
 const q=questFor(player,p);
 const bar=q?Math.min(20,Math.floor(20*q.have/Math.max(1,q.need)))*5:0;
 return [
  ...(badges=>cards.map(([id,label,icon])=>['ct:m|'+label+(badges.has(id)?BADGE:''),icon]))(homeBadges(player,p??{})),
  [second?'ct:prev|':'ct:next|'],
  ['ct:d_name|'+player.name],
  ['ct:d_job|'+`${job}　Lv.${Math.max(1,Math.floor(Number(p?.level)||1))}`,jobIndex>=0?`textures/cooptown/profile/job_${jobIndex+1}`:undefined],
  ['ct:d_title|'+(p?.title??''),p?.title?titleBadge(p.title):undefined],
  ['ct:d_wallet|'+money(p?.coins)],['ct:d_bank|'+money(p?.bank)],
  ['ct:d_qtitle|'+(q?q.title:'追跡中の依頼はありません')],['ct:d_qgoal|'+(q?q.goal:'')],['ct:d_qcount|'+(q?`${q.have} / ${q.need}`:'')],
  ['ct:d_qbar|'+bar],
  ['ct:notice|'+(()=>{let n=0;try{n=game.peek(db=>unreadFor(db,player.id).length);}catch{}return n?`お知らせ（未読 ${n}）`:'お知らせを見る';})()]];
}
function notices(){
 const date=t=>{const d=new Date(t+9*3600000);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
 const rows=game.peek(d=>(d.adminLog??[]).filter(l=>String(l.text).startsWith('お知らせ')).slice(0,NOTICES).map(l=>({at:l.at,text:String(l.text).replace(/^お知らせ[^：]*：/,'')})));
 return rows.length?rows.map(r=>`§7${date(r.at)}§r\n${r.text}`).join('\n\n'):'お知らせはまだありません。';
}
// ---- job page (ct:book:job; RP: JOB_SLOTS in build-book-ui.mjs) ----
// right page order (the last one is the full-width card)
export const JOB_ORDER=['冒険家','鉱夫','木こり','農家','釣り師','料理人','調合師','付与術師','鍛冶師'];
// the page has 9 job cards (RP JOB_SLOTS; 9 since 鉱夫 / 木こり came back 2026-10-30): unused cards get an empty text and hide
const JOB_CARDS=9;
const JOB_FEATURE={
 '冒険家':'各地を探索し、モブの討伐や調査で素材と発見を街へ持ち帰る。強い敵ほど多くの報酬が入ります。',
 '鉱夫':'地下を掘って鉱石と石材を街へ届ける。鉱脈掘り・鉱石探知・砥石での選別が得意です。',
 '木こり':'木を伐って原木・板材・木炭を街へ届ける。一括伐採・植林・製材台での加工が得意です。',
 '農家':'作物と動物を育てる。収穫・堆肥・飼育台（干草の俵）での世話や繁殖で採取の経験値が入ります。',
 '鍛冶師':'道具や防具の製作が得意。クラフト台の製作で経験値が入ります。',
 '料理人':'料理が得意。焚き火キッチンで料理を作れます。クラフト台の製作で経験値が入ります。',
 '調合師':'ポーションの調合が得意。醸造台でポーションを作れます。クラフト台の製作で経験値が入ります。',
 '付与術師':'装備や本に効果を付与し、エンチャント本を保管・研究する。エンチャント台と本棚が使えます。',
 '釣り師':'魚釣りが得意。釣りをすると採取の経験値が入ります。'};
/** The job page's buttons for saved data p while showing job `shown`. */
export function jobButtons(p,shown){
 const skill=JOB_SKILL[shown],s=p?.[skill]??{level:1,xp:0,max:100};
 const specials=SPECIAL_DROPS.filter(d=>d.job===shown).map(d=>`${SPECIAL_ITEMS[d.item]?.name??d.item}（${SKILL_NAME[d.skill]??d.skill} Lv.${d.level}〜）`);
 const action=shown===p?.job?'ct:actx|選択中の職業です':shown===p?.secondJob?'ct:actx|第二職業に設定済みです':'ct:act|この職業にする';
 return [
  ...JOB_ORDER.map(j=>[(j===shown?'ct:js|':'ct:j|')+j.replace('・','・\n'),BOOK_ICON+JOB_ICON[j]]), // 料理人・調合師 in two lines on its card
  ...Array.from({length:JOB_CARDS-JOB_ORDER.length},()=>['']),
  [action],
  ['ct:d_jicon|',BOOK_ICON+JOB_ICON[shown]],['ct:d_jname|'+shown],['ct:d_jlv|Lv.'+Math.max(1,Number(s.level)||1)],
  ['ct:d_xpl|'+SKILL_NAME[skill]+'経験値'],['ct:d_xpv|'+`${comma(s.xp)} / ${comma(s.max)}`],
  ['ct:d_xpbar|'+Math.min(20,Math.floor(20*(Number(s.xp)||0)/Math.max(1,Number(s.max)||1)))*5],
  ['ct:d_feat|'+JOB_FEATURE[shown]],['ct:d_special|'+(specials.join('\n')||'なし')],
  ['ct:d_now|'+`現在の職業：${p?.job&&p.job!=='未選択'?p.job:'ニート'}　第二職業：${p?.secondJob||'なし'}`]];
}
/** Becoming `job`: the main job, or (from Lv.RULES.secondaryLevel) the second one. */
async function chooseJob(player,p,job){
 if(!p?.job||p.job==='未選択'){await openGameFeature(player,'job.select',{job});return;}
 const options=[[`主職業にする（${freeJobChange(player,RULES.freeJobChangeSeconds)?'無料':RULES.jobChangeCost+'コイン'}）`,'job.select']];
 if((Number(p.level)||1)>=RULES.secondaryLevel&&!p.secondJob)options.push(['第二職業にする','job.secondary']);
 // one choice: straight to the job service (it asks for confirmation itself)
 const i=options.length>1?await chooseDialog(player,job,'主職業にするか、第二職業にするか選んでください。',options.map(o=>o[0])):0;
 if(i!==undefined)await openGameFeature(player,options[i][1],{job});
}
/** The job page. Returns where to go next: 'home' / 'profile' / 'settings' / 'close'. */
export async function openJobPage(player){
 let shown;
 for(let busy=0;;){
  refreshGame(player);
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  shown??=JOB_ORDER.includes(p?.job)?p.job:JOB_ORDER[0];
  const r=await bookForm('job',jobButtons(p,shown)).show(player);
  if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(res=>system.runTimeout(res,10));continue;}return 'close';}
  busy=0;
  const i=r.selection,t=BOOK_TABS.length;
  if(i<t)return TAB_TARGET[i];
  if(i<t+JOB_CARDS){if(JOB_ORDER[i-t])shown=JOB_ORDER[i-t];continue;}
  if(i===t+JOB_CARDS&&shown!==p?.job&&shown!==p?.secondJob)await chooseJob(player,p,shown);
 }
}
// ---- quest page (ct:book:quests; RP: QUEST_SLOTS in build-book-ui.mjs) ----
// Tabs: today's town orders (ORDERS) and the board (players' and site requests, opened as before).
export const QUEST_TABS=[['town','街の依頼','textures/cooptown/book/home'],['board','掲示板',BOOK_ICON+'scroll']];
const pct=(have,need)=>Math.min(20,Math.floor(20*have/Math.max(1,need)))*5;
/** The quest page's buttons for player, saved data p and the selected order. */
export function questButtons(player,p,sel){
 const day=dayKey(),state=i=>p?.orders?.[i]?.day===day?p.orders[i].status:'none';
 const info=ORDERS.map((q,i)=>{const done=state(i)==='done',have=done?q.amount:Math.min(q.amount,countItem(player,q.item,q.minRank??0));
  // the quality asked for (2026-10-30: ORDERS minRank, quality.js TIERS)
  return {q,done,have,goal:(ITEM_NAMES[q.item]??q.item.replace(/^minecraft:/,''))+'を納品'+(q.minRank?`（${TIERS[q.minRank].label}以上）`:'') /* short: the row's count sits on its right (2026-10-30) */,state:state(i)};});
 const s=info[sel],tracked=questFor(player,p)?.index;
 const track=s.state!=='accepted'?'ct:actx|追跡する':tracked===sel?'ct:actx|追跡中':'ct:act|追跡する';
 const main=s.state==='none'?'ct:act|受注する':s.done?'ct:actx|本日達成済み':s.have>=s.q.amount?'ct:act|納品する':'ct:actx|納品する';
 const percent=Math.floor(1000*s.have/Math.max(1,s.q.amount))/10;
 return [
  ...QUEST_TABS.map(([id,label,icon],i)=>[(i===0?'ct:ts|':'ct:t|')+label,icon]),
  ...info.map((x,i)=>[(i===sel?'ct:qs|':'ct:q|')+x.q.name+'\n'+(x.done?'本日達成済み':`${x.goal}　${x.have} / ${x.q.amount}`),BOOK_ICON+'scroll']),
  ...info.map(x=>['ct:d_rb|'+pct(x.have,x.q.amount)]),
  [track,BOOK_ICON+'compass'],[main,BOOK_ICON+(s.state==='none'?'scroll':'chest')],
  ['ct:d_qt|'+s.q.name],['ct:d_qg|'+s.goal],['ct:d_qc|'+`${s.have} / ${s.q.amount}`],['ct:d_qb|'+pct(s.have,s.q.amount)],
  ['ct:d_qp|'+percent+'%'],['ct:d_qr|'+money(s.q.coins)]];
}
const setTrack=(player,i)=>{try{player.setDynamicProperty(TRACK_KEY,i);}catch{}};
/** The quest page. Returns where to go next: 'home' / 'profile' / 'settings' / 'close'. */
export async function openQuestPage(player){
 let sel;
 for(let busy=0;;){
  refreshGame(player);
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  sel??=questFor(player,p)?.index??0;
  const r=await bookForm('quests',questButtons(player,p,sel)).show(player);
  if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(res=>system.runTimeout(res,10));continue;}return 'close';}
  busy=0;
  const i=r.selection-BOOK_TABS.length,n=ORDERS.length;
  if(i<0)return TAB_TARGET[r.selection];
  const status=p?.orders?.[sel]?.day===dayKey()?p.orders[sel].status:'none';
  if(i===1)await openGameFeature(player,'quests.create');          // board tab: the board as before
  else if(i>=2&&i<2+2*n)sel=(i-2)%n;                               // a row or its bar
  else if(i===2+2*n&&status==='accepted')setTrack(player,sel);       // 追跡する
  else if(i===3+2*n){                                              // 受注する / 納品する
   if(status==='none'){
    await openGameFeature(player,'quests.accept',{quest:sel});
    // nothing tracked yet (or the tracked order is no longer open): track the new one
    const pref=trackedIndex(player);
    if(pref===undefined||questFor(player,game.peek(d=>d.players[player.id]))?.index!==pref)setTrack(player,sel);
   }else if(status==='accepted')await openGameFeature(player,'quests.deliver',{quest:sel});
  }
 }
}
const BOOK_PAGES={job:openJobPage,quests:openQuestPage,friends:openFriendPage}; // friends: friend-book.js
/** Runs what a card opens; resolves to where to go next ('home' to stay on the home page). */
async function openCard(player,action){
 if(action.book)return BOOK_PAGES[action.book](player);
 if(action.list)return runList(player,action.list);
 if(action.to)return action.to;
 if(action.feature){await openGameFeature(player,action.feature);return 'home';}
 if(action.notice)return await noticeDialog(player,action.notice[0],action.notice[1],{close:'戻る'})?'home':'close';
 return 'home';
}
/** The home page (both menu pages); resolves to where to go next: 'profile' / 'settings' / 'close'. */
async function homePage(player){
 let second=false;
 while(true){
  refreshGame(player);
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  const cards=second?HOME2_CARDS:HOME_CARDS;
  const i=await showPage(player,second?'home2':'home',homeButtons(player,p,second));
  if(i===undefined)return 'close';
  const t=BOOK_TABS.length;
  let to='home';
  if(i<t)to=TAB_TARGET[i];
  else if(i<t+cards.length)to=await openCard(player,cards[i-t][3]);
  else if(i===t+cards.length)second=!second;            // arrow
  else if(i===t+cards.length+HOME_DATA.indexOf('notice'))to=await runList(player,noticeModel)==='close'?'close':'home'; // notice-book.js
  if(to!=='home')return to;
 }
}
/** The notebook menu: home, then wherever the bookmarks and pages lead until the book is closed. */
setNpcMenus({quest:player=>openQuestPage(player),trade:player=>runList(player,shopModel),trader:(player,tab)=>openTrader(player,tab)}); // the villagers' 依頼 / 売買 buttons
export async function openBook(player){
 const pages={home:homePage,profile:pl=>openProfilePage(pl,{openQuests:openQuestPage}),settings:openSettingsPage};
 for(let next='home';next!=='close';)next=await (pages[next]??homePage)(player)??'close';
}
