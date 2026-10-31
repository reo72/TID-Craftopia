import {world} from '@minecraft/server';
import {CODEX_DESC} from './codex-desc.js';
import {ModalFormData} from '@minecraft/server-ui';
import {noticeDialog,confirmDialog} from './dialog.js';
import {game,refreshGame,openGameFeature} from './game-runtime.js';
import {money} from './hud-info.js';
import {RULES,DAILY,CODEX,PRIZES,ITEM_NAMES,dayKey} from './game-config.js';
import {SKILL_TREES,SKILL_BY_ID,SKILL_TREE_COST,skillPoints,skillLock} from './skill-config.js';
import {ACHIEVEMENTS} from './achievements-config.js';
import {SHOP} from './shop-config.js';
import {JOB_DAILY,JOB_DAILY_REWARD,jobTaskDone} from './job-daily-config.js';
import {commonDailies,jobDailies} from './daily-plan.js';
import {sellables,sellGroup} from './npc-sell.js';
import {TIERS} from './quality.js';
import {TITLES,titleProgress,RANK_LEVEL,rankBadge} from './titles-config.js';
import {GACHA,GACHA_KINDS,RARITY_NAMES,DAILY_TICKET_CAP,GACHA_HISTORY,GACHA_CONTENTS,liveRates,prizeList,pityLeft,pct} from './gacha-config.js';
import {ticketsOf} from './gacha-engine.js';
import {BOOK_TABS,TAB_TARGET,BOOK_ICON,OLD_ICON,itemIcon,comma,step,showPage,JOB_ICON} from './book-frame.js';

// The shared list page (RP: listPage in build-book-ui.mjs): tabs, a summary line and five rows on the left, the
// selected row's details, an info box and up to three buttons on the right. Each feature is a model (its spec
// must cope with a selection past its rows: the runner clamps the selection only after the first spec):
//   spec(player, snapshot, state) -> what to show (see listButtons), act(player, snapshot, state, which) for the
//   buttons (which: 0 / 1 = the cards, 2 = the wide button). state = {tab, sel (row number), offset (first row)}.
//   Optional: decorate(spec, p, state) fills the details once the selection is known, tab / pick for clicks.
export const ROWS=5;
const HIDE='ct:-|';
const itemName=id=>ITEM_NAMES[id]??String(id).replace(/^minecraft:/,'');
/** The list page's buttons (in slot order, after the bookmarks) for a spec. */
export function listButtons(s){
 const tabs=s.tabs??[],wide=tabs.length>0&&tabs.length<=2;
 const tab=(t,i)=>[(i===s.tab?'ct:ts|':'ct:t|')+t.label,t.icon];
 const rows=s.rows.slice(s.offset,s.offset+ROWS);
 const d=s.detail??{},card=c=>c?[(c.enabled?'ct:act|':'ct:actx|')+c.label,c.icon]:[HIDE];
 return [
  ...[0,1].map(i=>wide&&tabs[i]?tab(tabs[i],i):[HIDE]),
  ...[0,1,2,3].map(i=>!wide&&tabs[i]?tab(tabs[i],i):[HIDE]),
  [s.summary?'ct:d_sum|'+s.summary:HIDE],
  ...Array.from({length:ROWS},(_,k)=>{const r=rows[k];if(!r)return [HIDE];
   return [(r.locked?'ct:rx|':s.offset+k===s.sel?'ct:rs|':'ct:r|')+r.title+(r.sub?'\n'+r.sub:''),r.icon];}),
  ...Array.from({length:ROWS},(_,k)=>{const r=rows[k];return [r&&r.bar!==undefined&&r.bar!==null?'ct:d_rb|'+step(r.bar):HIDE];}),
  // with more than one page both arrows show: ＜ on the first page goes to the last, ＞ on the last back to the first
  [s.rows.length>ROWS?'ct:pp|':HIDE],[s.rows.length>ROWS?'ct:np|':HIDE],
  ['ct:d_lt|'+s.left],['ct:d_rt|'+s.right],
  [d.icon?'ct:d_ic|':HIDE,d.icon],[d.title?'ct:d_ti|'+d.title:HIDE],[d.state?'ct:d_st|'+d.state:HIDE],[d.text?'ct:d_bd|'+d.text:HIDE],
  [d.bar!==undefined&&d.bar!==null?'ct:d_br|'+step(d.bar):HIDE],[d.barText?'ct:d_bv|'+d.barText:HIDE],
  [d.infoLabel?'ct:d_il|'+d.infoLabel:HIDE],[d.infoValue?'ct:d_iv|'+d.infoValue:HIDE,d.infoIcon],[d.desc?'ct:d_ds|'+d.desc:d.info2?'ct:d_i2|'+d.info2:HIDE],
  card(s.actions?.[0]),card(s.actions?.[1]),
  [s.wide?(s.wide.enabled?'ct:wa|':'ct:wax|')+s.wide.label:HIDE]];
}
/** The offset of the last page of n rows. */
export const lastPage=n=>Math.max(0,Math.floor((n-1)/ROWS)*ROWS);
// slots after the bookmarks (RP LIST_SLOTS minus 4)
const AT={wideTabs:0,tabs:2,rows:7,rowBars:12,prev:17,next:18,cards:30,wide:32};
/** Runs a list model on page (list / list_person / list_settings). Returns 'home' / 'profile' / 'settings' / 'close'. */
export async function runList(player,model,page='list'){
 const state={tab:0,sel:0,offset:0,...(model.start?.(player)??{})};
 while(true){
  refreshGame(player);
  const snap=game.snapshot(player.id),s=model.spec(player,snap,state);
  state.sel=Math.max(0,Math.min(state.sel,s.rows.length-1));
  model.decorate?.(s,snap.player,state);
  const i=await showPage(player,page,listButtons({...s,tab:state.tab,sel:state.sel,offset:state.offset}),`${page}|${s.left}|${state.tab}|${state.offset}`);
  if(i===undefined)return 'close';
  if(i<BOOK_TABS.length)return TAB_TARGET[i];
  const k=i-BOOK_TABS.length;
  if(k<AT.rows){const t=k<AT.tabs?k:k-AT.tabs;if(model.tab)await model.tab(player,snap,state,t);else{state.tab=t;state.sel=0;state.offset=0;}}
  else if(k<AT.prev){const r=state.offset+(k<AT.rowBars?k-AT.rows:k-AT.rowBars);if(s.rows[r]){state.sel=r;if(model.pick&&await model.pick(player,snap,state,r)==='close')return 'close';}}
  else if(k===AT.prev)state.offset=state.offset>0?Math.max(0,state.offset-ROWS):lastPage(s.rows.length);
  else if(k===AT.next)state.offset=state.offset+ROWS<s.rows.length?state.offset+ROWS:0;
  else if(k>=AT.cards){const which=k-AT.cards,a=which<2?s.actions?.[which]:s.wide;
   if(a?.enabled&&model.act&&await model.act(player,snap,state,which)==='close')return 'close';}
 }
}
const cardOf=(label,enabled,icon)=>({label,enabled:!!enabled,icon});
const result=async(player,name,payload)=>{await openGameFeature(player,name,payload);};

// ---- デイリー ----
const DAILY_ICON={deliver:BOOK_ICON+'chest',craft:OLD_ICON+'crafting',discover:BOOK_ICON+'encyclopedia',town:OLD_ICON+'town',quest:BOOK_ICON+'scroll'};
export const dailyModel={
 spec(player,{player:p},state){
  const d=p.daily,v=key=>d.counts?.[key]??0,day=d.day??dayKey();
  // the player's own dailies for today (daily-plan.js)
  const rows=commonDailies(player.id,day).map(([label,key,target],i)=>{const n=Math.min(v(key),target),claimed=d.claimed.includes(i);
   return {title:label,sub:claimed?'受取済み':`${n} / ${target}`,icon:DAILY_ICON[key]??BOOK_ICON+'calendar',bar:claimed?1:n/target,n,target,done:n>=target,claimed};});
  // the main job's own dailies (job-daily-config.js); an alternative goal shows after ／
  jobDailies(player.id,day,p.job).forEach((t,k)=>{const i=DAILY.length+k,n=Math.min(v('j:'+t[1]),t[2]),claimed=d.claimed.includes(i),done=jobTaskDone(t,d.counts??{});
   rows.push({title:`【${p.job}】${t[0]}`,sub:claimed?'受取済み':`${n} / ${t[2]}`+(t[3]?`　／代わりに ${Math.min(v('j:'+t[3][0]),t[3][1])} / ${t[3][1]}`:''),icon:BOOK_ICON+JOB_ICON[p.job],bar:claimed?1:done?1:n/t[2],n,target:t[2],done,claimed,job:true});});
  const r=rows[state.sel]??rows[0],reached=rows.filter(x=>x.done).length;
  return {left:'デイリー',right:'今日の報酬',summary:`今日の達成 ${reached} / ${rows.length}`,rows,
   detail:{icon:r.icon,title:r.title,state:r.claimed?'受取済み':r.done?'達成！受け取れます':'進行中',text:'毎日0時（日本時間）に更新されます。',
    bar:r.bar,barText:r.claimed?'完了':`${r.n} / ${r.target}`,
    infoLabel:'報酬',infoValue:money(r.job?JOB_DAILY_REWARD.coins:RULES.dailyCoins),infoIcon:BOOK_ICON+'coins',info2:`経験値 ×${r.job?JOB_DAILY_REWARD.xp:RULES.dailyXp}`},
   actions:[cardOf(r.claimed?'受取済み':'受け取る',r.done&&!r.claimed,BOOK_ICON+'coins')],
   wide:{label:d.bonus?'3つ達成ボーナス：受取済み':`3つ達成ボーナス（${money(RULES.dailyBonus)}・デイリー券）`,enabled:d.claimed.length>=3&&!d.bonus}};
 },
 act:(player,snap,state,which)=>which===0?result(player,'daily.claim',{task:state.sel}):result(player,'daily.bonus')};

// ---- 図鑑 ----
const CODEX_TABS=['友好モブ','敵モブ','魚','素材'];
const CODEX_ICON={'minecraft:sheep':'sheep','minecraft:cow':'cow','minecraft:chicken':'chicken','minecraft:wolf':'wolf','minecraft:slime':'slime','minecraft:creeper':'creeper','minecraft:cod':'fish'};
// mobs without their own picture show their kind's (2026-10-30: every mob is in the codex)
const KIND_ICON={'友好モブ':'cow','敵モブ':'creeper','魚':'fish'};
const codexIcon=id=>{if(CODEX_ICON[id])return OLD_ICON+CODEX_ICON[id];const kind=CODEX.find(v=>v[0]===id)?.[2];return KIND_ICON[kind]?OLD_ICON+KIND_ICON[kind]:itemIcon(id);};
const CODEX_HINT={'友好モブ':'6ブロック以内で出会うと登録されます。','敵モブ':'倒すと登録されます。','魚':'釣り上げると登録されます。','素材':'持ち物に入れると登録されます。'};
const date=t=>{const d=new Date(t+9*3600000);return `${d.getUTCFullYear()}/${d.getUTCMonth()+1}/${d.getUTCDate()}`;};
export const codexModel={
 spec(player,{player:p},state){
  const cat=CODEX_TABS[state.tab],list=CODEX.filter(v=>v[2]===cat),found=list.filter(([id])=>p.codex[id]).length;
  const rows=list.map(([id,name])=>p.codex[id]?{title:name,sub:'登録 '+date(p.codex[id].at),icon:codexIcon(id)}:{title:'？？？',sub:'未発見',icon:OLD_ICON+'unknown',locked:true});
  const e=list[state.sel],has=e&&p.codex[e[0]],claimed=p.claimedCodex.includes(cat);
  return {left:'探索図鑑',right:cat==='素材'?'素材の記録':cat==='魚'?'魚の記録':'モブの記録',tabs:CODEX_TABS.map(label=>({label})),summary:`発見 ${found} / ${list.length}`,rows,
   detail:e?{icon:has?codexIcon(e[0]):OLD_ICON+'unknown',title:has?e[1]:'？？？',state:has?'発見済み':'未発見',
    text:has?`登録日 ${date(p.codex[e[0]].at)}　出会った回数 ${p.codex[e[0]].count??1}`:CODEX_HINT[cat],
    bar:found/Math.max(1,list.length),barText:`${found} / ${list.length}`,
    // the description (codex-desc.js) where the reward box was (asked 2026-10-30); the reward moved to the wide button
    infoLabel:'説明',desc:has?(CODEX_DESC[e[0].replace(/^\w+:/,'')]??'まだ説明がありません。'):'§7見つけると説明が読めます。'}:{},
   wide:{label:claimed?'達成報酬：受取済み':found<list.length?`全部登録で ${money(200)}・ガチャ券1枚`:'達成報酬を受け取る',enabled:!claimed&&found===list.length&&list.length>0}};
 },
 act:(player,snap,state)=>result(player,'codex.rewards',{category:CODEX_TABS[state.tab]})};

// ---- 称号 ----
// rank and progress (stat, target) per achievement; titles from prizes are 特別
const TITLE_RANK={bronze:['first_job','level_10','gather_5','mine_5','craft_100','quest_10','town_10','codex_10','special_10','mentor_5'],
 silver:['level_30','second_job','gather_500','mine_500','quest_50','codex_friendly','special_100']};
const rankOf=id=>TITLE_RANK.bronze.includes(id)?'ブロンズ':TITLE_RANK.silver.includes(id)?'シルバー':'ゴールド';
const PROGRESS={level_10:p=>[p.level,10],level_30:p=>[p.level,30],level_50:p=>[p.level,50],gather_5:p=>[p.gather?.level,5],mine_5:p=>[p.mine?.level,5],
 gather_500:p=>[p.stats?.gathered,500],mine_500:p=>[p.stats?.mined,500],craft_100:p=>[p.stats?.crafts,100],craft_1000:p=>[p.stats?.crafts,1000],
 special_10:p=>[p.stats?.special,10],special_100:p=>[p.stats?.special,100],quest_10:p=>[p.stats?.questsCompleted,10],quest_50:p=>[p.stats?.questsCompleted,50],
 town_10:p=>[p.stats?.townDonations,10],town_100:p=>[p.stats?.townDonations,100],mentor_5:p=>[p.stats?.mentored,5],codex_10:p=>[Object.keys(p.codex??{}).length,10]};
// the design's titles (titles-config.js): by job; 準備中 ones are shown but cannot be earned yet
export const ALL_TITLES=[...TITLES.map(x=>({id:x.id,title:x.title,hint:x.hint+(x.pending?`（準備中：${x.pending}）`:''),rank:x.rank,cat:x.cat,design:x})),
 ...ACHIEVEMENTS.map(a=>({id:a.id,title:a.title,hint:a.hint,rank:rankOf(a.id),cat:'その他'})),
 ...PRIZES.filter(v=>v.title).map(v=>({id:'prize_'+v.title,title:v.title,hint:'ガチャで手に入る',rank:'特別'}))];
// what a player sees (asked 2026-10-27): the common titles and their own jobs' (main and second), plus any title they
// hold; ゴールド and above keep their conditions secret (？？？？？) until earned
const SECRET_RANKS=new Set(['ゴールド','エピック','レジェンド','アセンデッド']),SECRET='？？？？？';
const hasJob=(p,job)=>p.job===job||p.secondJob===job;
/** The titles a player's list shows. */
export function visibleTitles(p){
 const owned=t=>(p.titles??[]).includes(t.title);
 // titles given by the server (awards, seasons) that are not in the lists show too, as 特別
 const extra=(p.titles??[]).filter(n=>!ALL_TITLES.some(t=>t.title===n)).map(n=>({id:'granted_'+n,title:n,hint:'イベント・季節・アワードで受け取った称号',rank:'特別',cat:'その他'}));
 return [...ALL_TITLES.filter(t=>owned(t)||(t.design?!t.design.job||hasJob(p,t.design.job):t.cat==='その他')),...extra];
}
/** The rank badge of a title by its name (the ribbons: home, profile, friends). */
export const titleBadge=name=>rankBadge(ALL_TITLES.find(t=>t.title===name)?.rank??'特別');
/** Whether a title's conditions are hidden from this player. */
export const isSecret=(t,p)=>!!t.design&&SECRET_RANKS.has(t.rank)&&!(p.titles??[]).includes(t.title);
export const TITLE_TABS=['すべて','獲得済み','未獲得'];
/** The titles of a tab (0 すべて, 1 獲得済み, 2 未獲得). */
export const titlesOfTab=(p,tab=0)=>{const owned=t=>(p.titles??[]).includes(t.title),l=visibleTitles(p);return tab===1?l.filter(owned):tab===2?l.filter(t=>!owned(t)):l;};
export const titlesModel={
 spec(player,{player:p},state={}){
  const owned=t=>(p.titles??[]).includes(t.title),list=titlesOfTab(p,state.tab??0),all=visibleTitles(p);
  const rows=list.map(t=>({title:t.title+(p.title===t.title?'（装備中）':''),sub:`${t.rank}　${t.cat??''}　${isSecret(t,p)?SECRET:t.hint}`,icon:rankBadge(t.rank),locked:!owned(t)}));
  return {left:'称号',right:'称号の詳細',tabs:TITLE_TABS.map(label=>({label})),summary:`獲得 ${all.filter(owned).length} / ${all.length}`,rows,detail:{},actions:[]};
 },
 // rows are drawn first; the detail depends on the selected one
 decorate(s,p,state){
  const t=titlesOfTab(p,state.tab)[state.sel];if(!t){s.detail={title:'該当する称号はありません'};s.actions=[];return s;}
  const have=(p.titles??[]).includes(t.title),worn=p.title===t.title,secret=isSecret(t,p),pr=secret?undefined:t.design?titleProgress(t.design,p):PROGRESS[t.id]?.(p);
  const [n,goal]=pr?[Math.min(Number(pr[0])||0,pr[1]),pr[1]]:[have?1:0,1];
  s.detail={icon:rankBadge(t.rank),title:t.title,state:t.rank+(worn?'　装備中':have?'　獲得済み':'　未獲得'),text:'取得条件：'+(secret?SECRET:t.hint+(t.design?.need?.length&&!t.design.master?`
前提：${t.design.need.map(n=>'「'+n+'」').join('')}`:'')+(t.design?.job?`
${t.design.job}・職業Lv.${RANK_LEVEL[t.rank]}から`:'')),
   bar:have?1:secret?0:n/goal,barText:pr?`${comma(have?goal:n)} / ${comma(goal)}`:have?'達成':secret?SECRET:'未達成'};
  s.actions=[cardOf(worn?'装備中':'装備する',have&&!worn,BOOK_ICON+'medal'),cardOf('外す',worn,OLD_ICON+'title')];
  return s;
 },
 act:(player,{player:p},state,which)=>result(player,'title.equip',{title:which===0?titlesOfTab(p,state.tab)[state.sel]?.title??'':''})};

// ---- 銀行 ----
const histDate=t=>{const d=new Date(t+9*3600000);return `${String(d.getUTCMonth()+1).padStart(2,'0')}/${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
export const bankModel={
 spec(player,{player:p}){
  const rows=(p.history??[]).map(h=>({title:String(h.text),sub:histDate(h.at),icon:/引き出|送金/.test(h.text)?BOOK_ICON+'coins':BOOK_ICON+'vault'}));
  if(!rows.length)rows.push({title:'取引はまだありません',icon:BOOK_ICON+'vault'});
  return {left:'銀行',right:'入出金',summary:`取引履歴（新しい順）`,rows,
   detail:{icon:BOOK_ICON+'vault',title:'銀行残高',state:money(p.bank),text:'預けたお金は銀行で安全に保管されます。',
    infoLabel:'所持金',infoValue:money(p.coins),infoIcon:BOOK_ICON+'coins',info2:'金額は次の画面で入力します'},
   actions:[cardOf('入金する',p.coins>0,BOOK_ICON+'coins'),cardOf('出金する',p.bank>0,BOOK_ICON+'vault')],
   wide:{label:'ほかのプレイヤーへ送金する',enabled:p.coins>0}};
 },
 act:(player,snap,state,which)=>result(player,['bank.deposit','bank.withdraw','bank.transfer'][which],{amount:100})};

// ---- ショップ（サーバーが売る店） ----
// the last tab buys the player's products (npc-sell.js), quality raises the price
const SELL_TAB=SHOP.length;
const sellLabel=(g,itemName)=>(g.tier?'ランク'+TIERS[g.tier].label+'の':'')+itemName(g.id)+(g.near?'（期限間近）':'');
function sellSpec(player,p,state){
 const list=sellables(player.getComponent('minecraft:inventory')?.container),g=list[state.sel];
 const rows=list.map(v=>({title:sellLabel(v,itemName),sub:`${money(v.price)} ×${v.count}`,icon:itemIcon(v.id,BOOK_ICON+'chest')}));
 return {left:'ショップ',right:'買取',tabs:[...SHOP.map(c=>({label:c.name})),{label:'買取'}],summary:`所持金 ${money(p.coins)}`,rows,
  detail:g?{icon:itemIcon(g.id,BOOK_ICON+'chest'),title:sellLabel(g,itemName),state:`買取 ${money(g.price)}／個`+(g.tier?`（ランク${TIERS[g.tier].label}は×${TIERS[g.tier].price}）`:''),
   text:'町の商人が買い取ります。品質が良いほど高く売れます。',infoLabel:'持っている数',infoValue:`${g.count}個`,info2:`全部で ${money(g.price*g.count)}`}
   :{title:'売れる物がありません',text:'作物・畜産物・魚・料理・ポーション・装備などを持ってきてください。'},
  actions:[cardOf('1個売る',!!g,BOOK_ICON+'coins'),cardOf('全部売る',!!g,BOOK_ICON+'coins')],wide:{label:'個数を指定して売る',enabled:!!g}};
}
async function sellAct(player,state,which){
 const g=sellables(player.getComponent('minecraft:inventory')?.container)[state.sel];if(!g)return;
 let count=which===0?1:g.count;
 if(which===2){const r=await new ModalFormData().title('ct:in|'+sellLabel(g,itemName)+'を売る').textField(`個数（1～${g.count}）　単価 ${g.price}コイン`,'個数',{defaultValue:String(g.count)}).show(player);
  if(r.canceled)return;count=Math.floor(Number(r.formValues[0]));if(!(count>=1&&count<=g.count)){await noticeDialog(player,'買取',`1～${g.count}の数を入力してください。`,{close:'戻る'});return;}}
 if(!await confirmDialog(player,'買取の確認',`${sellLabel(g,itemName)} ×${count}\n受け取り ${money(g.price*count)}`,{ok:'売る'}))return;
 try{const m=sellGroup(player,game,g,count,itemName);await noticeDialog(player,'買取',m,{close:'戻る'});}catch(e){await noticeDialog(player,'買取',String(e.message??e),{close:'戻る'});}
}
export const shopModel={
 spec(player,{player:p},state){
  if(state.tab===SELL_TAB)return sellSpec(player,p,state);
  const cat=SHOP[state.tab]??SHOP[0],it=cat.items[state.sel]??cat.items[0];
  const rows=cat.items.map(v=>({title:v.name,sub:money(v.price),icon:itemIcon(v.item,BOOK_ICON+'chest')}));
  return {left:'ショップ',right:'商品の詳細',tabs:[...SHOP.map(c=>({label:c.name})),{label:'買取'}],summary:`所持金 ${money(p.coins)}`,rows,
   detail:{icon:itemIcon(it.item,BOOK_ICON+'chest'),title:it.name,state:'単価 '+money(it.price),text:it.text,
    infoLabel:'所持金',infoValue:money(p.coins),infoIcon:BOOK_ICON+'coins',info2:`10個で ${money(it.price*10)}`},
   actions:[cardOf('1個買う',p.coins>=it.price,BOOK_ICON+'chest'),cardOf('10個買う',p.coins>=it.price*10,BOOK_ICON+'chest')],
   wide:{label:'個数を指定して買う',enabled:p.coins>=it.price}};
 },
 async act(player,{player:p},state,which){
  if(state.tab===SELL_TAB)return sellAct(player,state,which);
  const it=SHOP[state.tab].items[state.sel];let count=which===0?1:10;
  if(which===2){
   const r=await new ModalFormData().title('ct:in|'+it.name+'を買う').textField(`個数（1～${64*9}）　単価 ${it.price}コイン`,'個数',{defaultValue:'1'}).show(player);
   if(r.canceled)return;count=Math.floor(Number(r.formValues[0]));
   if(!(count>=1&&count<=64*9)){await noticeDialog(player,'ショップ','1～576の数を入力してください。',{close:'戻る'});return;}
  }
  if(!await confirmDialog(player,'購入の確認',`${it.name} ×${count}\n合計 ${money(it.price*count)}（所持金 ${money(p.coins)}）\n持ち物に空きが必要です。`,{ok:'購入する'}))return;
  await result(player,'shop.buy',{item:it.item,count});
 }};

// ---- イベント ----
const EVENT_TABS=['開催中','開催予定','終了'];
const eventDate=t=>{const d=new Date(t+9*3600000);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
const eventsIn=(events,tab,now=Date.now())=>(events??[]).filter(e=>tab===0?e.start<=now&&e.end>now:tab===1?e.start>now:e.end<=now);
export const eventsModel={
 spec(player,{player:p,events},state){
  const list=eventsIn(events,state.tab),e=list[state.sel];
  const rows=list.map(v=>({title:v.name,sub:`${eventDate(v.start)} ～ ${eventDate(v.end)}`,icon:BOOK_ICON+'lantern'}));
  if(!rows.length)rows.push({title:'登録されたイベントはありません',sub:'運営が登録するとここに表示されます',icon:BOOK_ICON+'lantern'});
  const joined=e&&(e.participants??[]).includes(player.id);
  return {left:'街のイベント',right:e?.name??'イベント',tabs:EVENT_TABS.map(label=>({label})),summary:`${EVENT_TABS[state.tab]}のイベント ${list.length}件`,rows,
   detail:e?{icon:BOOK_ICON+'lantern',title:e.name,state:EVENT_TABS[state.tab]+(joined?'　参加登録済み':''),text:String(e.description??'').slice(0,60),
    infoLabel:'参加登録',infoValue:`${(e.participants??[]).length}人`,infoIcon:BOOK_ICON+'medal',info2:`${eventDate(e.start)} ～ ${eventDate(e.end)}`}:{},
   actions:e?[cardOf(joined?'登録済み':'参加登録',!joined&&state.tab===0,BOOK_ICON+'medal'),cardOf('会場を確認',true,BOOK_ICON+'compass')]:[]};
 },
 act(player,{events},state,which){
  const e=eventsIn(events,state.tab)[state.sel];if(!e)return;
  return which===0?result(player,'event.join',{id:e.id}):result(player,'events.location',{event:state.sel,tab:state.tab});
 }};

// ---- スキルツリー ----
// One tab per own job (skill-config.js SKILL_TREES). Rows follow the tree: a node comes under the prerequisite it
// hangs from (its deepest one), indented one step per level, so the branches read top to bottom.
function treeRows(job){
 const list=SKILL_TREES[job]??[],depth={},parent={};
 for(const n of list){const d=n.req.map(r=>depth[r]??0);depth[n.id]=n.req.length?1+Math.max(...d):0;parent[n.id]=n.req.length?n.req[d.indexOf(Math.max(...d))]:null;}
 const out=[],walk=id=>{for(const n of list)if(parent[n.id]===id){out.push({node:n,depth:depth[n.id]});walk(n.id);}};
 walk(null);return out;
}
export const skillModel={
 jobs:p=>[p.job,p.secondJob].filter(j=>SKILL_TREES[j]),
 spec(player,{player:p},state){
  const jobs=this.jobs(p),job=jobs[state.tab]??jobs[0];
  if(!job)return {left:'スキルツリー',right:'スキルの詳細',summary:`スキルポイント ${skillPoints(p)} SP`,
   rows:[{title:'職業を選ぶとツリーが開きます',sub:'職業ごとに能力が伸びるスキルがあります',icon:BOOK_ICON+'medal'}],detail:{},actions:[]};
  const tree=treeRows(job),{node:n}=tree[state.sel]??tree[0],lock=skillLock(p,n),done=lock==='習得済み';
  const spent=tree.filter(v=>p.skillUnlocks.includes(v.node.id)).reduce((s,v)=>s+v.node.cost,0);
  const rows=tree.map(({node:v,depth})=>{const l=skillLock(p,v);
   return {title:'　'.repeat(depth)+v.name,sub:`${v.cost} SP　Lv.${v.level}〜　${l||'習得できます'}`,icon:BOOK_ICON+JOB_ICON[job],locked:!!l&&l!=='習得済み'&&l!=='スキルポイントが足りません'};});
  return {left:'スキルツリー',right:'スキルの詳細',tabs:jobs.map(j=>({label:j,icon:BOOK_ICON+JOB_ICON[j]})),
   summary:`スキルポイント ${skillPoints(p)} SP　${job} ${spent} / ${SKILL_TREE_COST} SP`,rows,
   detail:{icon:BOOK_ICON+JOB_ICON[job],title:n.name,state:lock||'習得できます',text:n.desc+(n.req.length?'　前提：'+n.req.map(r=>SKILL_BY_ID[r].name).join('・'):''),
    bar:spent/SKILL_TREE_COST,barText:`${job}のツリー ${spent} / ${SKILL_TREE_COST} SP`,
    infoLabel:'必要なポイント',infoValue:`${n.cost} SP`,infoIcon:BOOK_ICON+'medal',info2:`職業Lv.${n.level}〜　効果は${job}のあいだ働きます`},
   actions:[cardOf(done?'習得済み':'習得する',!lock,BOOK_ICON+'medal')]};
 },
 act(player,{player:p},state){const job=this.jobs(p)[state.tab]??this.jobs(p)[0],t=treeRows(job)[state.sel];if(t)return result(player,'skill.unlock',{node:t.node.id});}};

// ---- ガチャ ----
// One tab per kind (gacha-config.js). The first two rows open the rates / history; the rest are the prizes.
const GACHA_ROWS=2;
export const gachaModel={
 spec(player,{player:p},state){
  const kind=GACHA_KINDS[state.tab]??'daily',g=GACHA[kind],list=prizeList(kind),have=ticketsOf(p,kind),gs=p.gacha??{},pity=gs.pity?.[kind]??{};
  const rows=[{title:'提供割合と天井',sub:Object.entries(liveRates(kind)).map(([r,x])=>`${RARITY_NAMES[r]}${pct(x)}`).join(' ') /* close together: four did not fit the row (2026-10-30) */,icon:BOOK_ICON+'scroll'},
   {title:'ガチャの履歴',sub:`最近の${GACHA_HISTORY}回`,icon:OLD_ICON+'open_book'},
   ...list.map(v=>({title:v.name,sub:`${RARITY_NAMES[v.rarity]}　${pct(v.chance)}`,icon:itemIcon(v.give[0][0],BOOK_ICON+'chest')}))];
  const v=list[state.sel-GACHA_ROWS],left=at=>{const n=pityLeft(kind,pity,at);return n===null?'準備中':`あと${n}回`;};
  const daily=kind==='daily',canClaim=daily&&!gs.claimed&&(gs.got??0)<DAILY_TICKET_CAP;
  return {left:'ガチャ',right:g.name,tabs:GACHA_KINDS.map(k=>({label:GACHA[k].name.replace('ガチャ','')})),
   summary:`券 デイリー${ticketsOf(p,'daily')}　ノーマル${ticketsOf(p,'normal')}　エピック${ticketsOf(p,'epic')}`,rows,
   detail:{icon:BOOK_ICON+'chest',title:g.name,state:`${g.ticket} ${have}枚`,
    text:v?`${v.name}：${GACHA_CONTENTS[v.id]??''}（${pct(v.chance)}）`:kind==='epic'?'レア以上確定・10回以内にエピック以上':'景品と確率は「提供割合と天井」で確認できます',
    infoLabel:'エピック以上の天井',infoValue:left('E'),infoIcon:BOOK_ICON+'medal',
    info2:(g.pity.L?`レジェンドの天井 ${left('L')}`:'')+(daily?`今日の受取 ${gs.got??0}/${DAILY_TICKET_CAP}`:'')},
   actions:[cardOf('1回引く',have>=1,BOOK_ICON+'chest'),cardOf('10回引く',have>=10,BOOK_ICON+'chest')],
   wide:daily?{label:gs.claimed?'今日のチケットは受取済み':'今日のチケットを受け取る',enabled:canClaim}:p.points>=10?{label:'ポイント交換（10pt）',enabled:true}:undefined};
 },
 pick(player,snap,state,row){if(row<GACHA_ROWS)return result(player,row===0?'gacha.rates':'gacha.history',{kind:GACHA_KINDS[state.tab]});},
 act(player,snap,state,which){const kind=GACHA_KINDS[state.tab]??'daily';
  if(which===2)return result(player,kind==='daily'?'gacha.claim':'gacha.exchange');
  return result(player,'gacha.draw',{kind,count:which===0?1:10});}};

// ---- 案内 ----
const GUIDE=[
 ['手帳の使い方','案内手帳を持って使うと、このメニューが開きます。右のしおりでホーム・マイプロフィール・設定に移動できます。'],
 ['街での暮らし','職業を選び、採取・採掘・製作で経験値を集めましょう。依頼やデイリーを達成するとコインがもらえます。'],
 ['仲間と協力','街への納品や掲示板の依頼で、仲間と素材を融通できます。イベントにはみんなで参加しましょう。'],
 ['お金と銀行','コインは銀行に預けられます。ショップでは素材や道具を買えます。'],
 ['困ったときは','うまく動かないときは運営に相談してください。手帳をなくしたら運営が再配布できます。']];
export const guideModel={
 spec(player,snap,state){
  const g=GUIDE[state.sel]??GUIDE[0];
  return {left:'案内',right:g[0],rows:GUIDE.map(([t])=>({title:t,icon:OLD_ICON+'open_book'})),
   detail:{icon:OLD_ICON+'open_book',title:g[0],text:g[1]},actions:[cardOf('くわしく読む',true,OLD_ICON+'open_book')]};
 },
 act:(player,snap,state)=>noticeDialog(player,GUIDE[state.sel][0],GUIDE[state.sel][1],{close:'戻る'}).then(ok=>ok?undefined:'close')};
