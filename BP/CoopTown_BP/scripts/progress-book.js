import {world} from '@minecraft/server';
import {game,openGameFeature} from './game-runtime.js';
import {runList,visibleTitles} from './book-pages.js';
import {BOOK_ICON,OLD_ICON,comma,itemIcon,JOB_ICON} from './book-frame.js';
import {money} from './hud-info.js';
import {DAILY,ITEM_NAMES} from './game-config.js';
import {JOB_DAILY,jobTaskDone} from './job-daily-config.js';
import {commonDailies,jobDailies} from './daily-plan.js';
import {titleProgress} from './titles-config.js';
import {stateOf,NEAR,EXPIRED} from './freshness.js';
import {MASTERY,PERKS,perkRank,starsOf,starsFree,APPRENTICE,COLLECTIONS,COLLECTION_STEPS,collectionHave,RECORDS,recordText,GOAL_REWARD,goalOfWeek,
 guildOrder,GUILD_REWARD,seasonOf,SEASON_RULES,CONTESTS,weekOf} from './progress-config.js';
import {contestTop} from './progress-engine.js';
import {legendList} from './legend-runtime.js';
import {openPets} from './pet-runtime.js';
import {openWardrobe} from './wardrobe.js';

// やり込み pages of the book (progress-config.js): one home card (やり込み) opens the list below; each row opens its page.
const card=(label,enabled,icon)=>({label,enabled:!!enabled,icon});
const act=async(player,name,payload)=>{await openGameFeature(player,name,payload);};
const peek=fn=>{try{return game.peek(fn);}catch{return undefined;}};
const pct=(a,b)=>b?Math.min(1,a/b):0;

/** Whether a reward waits on the やり込み pages (the home menu's red "!", book.js homeBadges): stars to spend, an
 *  apprentice asking, the week's goal, the season's title, a collection step reached. */
export function progressReady(player,p){
 try{
  if(starsFree(p)>0)return true;
  if(Object.values(peek(db=>db.players)??{}).some(o=>o.masterAsk===player.id))return true;
  const now=Date.now(),w=weekOf(now),g=peek(db=>db.goal),goal=goalOfWeek(w);
  if(g?.week===w&&g.have>=goal.target&&!(g.claimed??[]).includes(player.id)&&(g.by?.[player.id]??0)>0)return true;
  const s=seasonOf(now);if(p.season?.id===s.id&&(p.season.work??0)>=SEASON_RULES.titleWork&&!p.season.claimed)return true;
  return COLLECTIONS.some(c=>{const st=COLLECTION_STEPS[p.collections?.[c.key]??0];return st&&collectionHave(p,c)>=Math.ceil(c.total*st.at);});
 }catch{return false;}
}
// ---- おすすめ（次にやること） ----
function suggestions(player,p){
 const out=[],now=Date.now();
 // dailies ready to claim
 const d=p.daily??{counts:{},claimed:[]},day=d.day,ready=commonDailies(player.id,day).filter(([,k,t],i)=>(d.counts?.[k]??0)>=t&&!d.claimed.includes(i)).length+
  jobDailies(player.id,day,p.job).filter((t,k)=>jobTaskDone(t,d.counts??{})&&!d.claimed.includes(DAILY.length+k)).length;
 if(ready)out.push({title:`デイリー報酬が${ready}つ受け取れます`,sub:'手帳のデイリーから',icon:BOOK_ICON+'calendar',bar:1,why:'達成済みのデイリーの報酬が残っています。'});
 // foods about to go off
 try{const inv=player.getComponent('minecraft:inventory').container;let near=0,gone=0;for(let i=0;i<inv.size;i++){const s=inv.getItem(i);if(!s)continue;const st=stateOf(s,now);if(st===NEAR)near+=s.amount;else if(st===EXPIRED)gone+=s.amount;}
  if(near)out.push({title:`期限間近の食べ物が${near}個あります`,sub:'早めに食べるか料理に',icon:BOOK_ICON+'cook',why:'保冷バッグに入れると期限の進みが半分になります。'});
  if(gone)out.push({title:`期限切れの食べ物が${gone}個あります`,sub:'しゃがんでコンポスターに使うとまとめて堆肥に',icon:BOOK_ICON+'leaf',why:'期限切れは食べられません。'});}catch{}
 // mastery stars to spend, apprentices asking
 if(starsFree(p)>0)out.push({title:`マスタリーの星が${starsFree(p)}個使えます`,sub:'やり込み → マスタリー',icon:BOOK_ICON+'medal',why:'星で永続の特典を強くできます。'});
 const asking=Object.entries(peek(db=>db.players)??{}).filter(([,o])=>o.masterAsk===player.id);
 if(asking.length)out.push({title:`弟子入りの依頼が${asking.length}件あります`,sub:'やり込み → 師弟',icon:BOOK_ICON+'scroll',why:asking.map(([,o])=>o.name).join('、')});
 // the week's goal / guild / season
 const w=weekOf(now),g=peek(db=>db.goal),goal=goalOfWeek(w);
 if(g?.week===w&&g.have>=goal.target&&!(g.claimed??[]).includes(player.id)&&(g.by?.[player.id]??0)>0)out.push({title:'サーバー目標の報酬が受け取れます',sub:goal.name,icon:BOOK_ICON+'chest',bar:1,why:'みんなの目標が達成されました。'});
 const s=seasonOf(now);if(p.season?.id===s.id&&(p.season.work??0)>=SEASON_RULES.titleWork&&!p.season.claimed)out.push({title:`称号「${s.title}」が受け取れます`,sub:'やり込み → 季節',icon:BOOK_ICON+'leaf',bar:1,why:'この季節にたくさん働きました。'});
 // titles that are close
 const near=visibleTitles(p).filter(t=>t.design&&!(p.titles??[]).includes(t.title)).map(t=>({t,pr:titleProgress(t.design,p)})).filter(x=>x.pr&&x.pr[1]>0&&x.pr[0]<x.pr[1]&&x.pr[0]/x.pr[1]>=.5)
  .sort((a,b)=>b.pr[0]/b.pr[1]-a.pr[0]/a.pr[1]).slice(0,5);
 for(const {t,pr} of near)out.push({title:`称号「${t.title}」まであと少し`,sub:`${comma(pr[0])} / ${comma(pr[1])}`,icon:BOOK_ICON+'medal',bar:pr[0]/pr[1],why:t.hint});
 // the job level
 out.push({title:`職業Lv.${p.level??1}　次まで ${comma((p.maxXp??0)-(p.xp??0))}`,sub:p.level>=MASTERY.level?`マスタリー ★${starsOf(p)}`:`Lv.${MASTERY.level}からマスタリーが始まります`,icon:BOOK_ICON+(JOB_ICON[p.job]??'medal'),bar:pct(p.xp??0,p.maxXp??1),why:'職業の作業や依頼で経験値がたまります。'});
 return out;
}
const nextModel={spec(player,{player:p},state){const rows=suggestions(player,p),r=rows[state.sel]??rows[0];
 return {left:'次にやること',right:'くわしく',summary:`おすすめ ${rows.length}件`,rows,detail:r?{icon:r.icon,title:r.title,text:r.why,bar:r.bar,barText:r.sub}:{}};}};

// ---- コレクション ----
const collectionModel={spec(player,{player:p},state){
 const rows=COLLECTIONS.map(c=>{const have=collectionHave(p,c),step=p.collections?.[c.key]??0;return {title:c.name,sub:`${have} / ${c.total}`+(step>=COLLECTION_STEPS.length?'　コンプリート':''),icon:BOOK_ICON+c.icon,bar:pct(have,c.total),c,have,step};});
 const r=rows[state.sel]??rows[0],s=COLLECTION_STEPS[r.step],can=s&&r.have>=Math.ceil(r.c.total*s.at);
 const list=r.c.key==='legend_found'?legendList().slice(0,6).map(x=>`${x.name}（${x.finder}）`).join('\n'):'';
 return {left:'コレクション',right:r.c.name,summary:`コンプリート ${rows.filter(x=>x.step>=COLLECTION_STEPS.length).length} / ${rows.length}`,rows,
  detail:{icon:r.icon,title:r.c.name+'図鑑',state:s?`次の報酬：${Math.round(s.at*100)}%集める`:'すべて受取済み',text:list||'集めた種類が増えると報酬がもらえます。半分と全部の2回。',
   bar:r.bar,barText:`${r.have} / ${r.c.total}`,infoLabel:'報酬',infoValue:s?money(s.coins):'—',infoIcon:BOOK_ICON+'coins',info2:s?`ガチャ券 ×${s.tickets}`:''},
  actions:[card(s?'報酬を受け取る':'受取済み',can,BOOK_ICON+'coins')]};},
 act:(player,snap,state)=>act(player,'collection.claim',{key:COLLECTIONS[state.sel].key})};

// ---- 記録・ランキング ----
const recordModel={spec(player,{player:p},state){
 const all=peek(db=>Object.values(db.players))??[],mine=state.tab===0;
 const rows=RECORDS.map(r=>{const v=Number(p.tally?.[r.key])||0;const top=all.map(o=>[o.name,Number(o.tally?.[r.key])||0]).filter(x=>x[1]>0).sort((a,b)=>r.low?a[1]-b[1]:b[1]-a[1]).slice(0,3);
  return {title:r.name,sub:mine?recordText(r,v):(top.length?`1位 ${top[0][0]}　${recordText(r,top[0][1])}`:'記録なし'),icon:BOOK_ICON+'medal',r,v,top};});
 const x=rows[state.sel]??rows[0];
 return {left:'記録',right:x.r.name,tabs:[{label:'自己ベスト'},{label:'サーバー上位'}],summary:mine?'自分の最高記録':'サーバーの上位3人',rows,
  detail:{icon:BOOK_ICON+'medal',title:x.r.name,state:`自分：${recordText(x.r,x.v)}`,text:x.top.length?x.top.map((t,i)=>`${i+1}位 ${t[0]}　${recordText(x.r,t[1])}`).join('\n'):'まだ記録がありません。'}};}};

// ---- マスタリー ----
const masteryModel={spec(player,{player:p},state){
 const rows=PERKS.map(k=>{const r=perkRank(p,k.key);return {title:`${k.name}　Rank ${r} / ${MASTERY.maxRank}`,sub:k.text(r),icon:BOOK_ICON+'medal',bar:r/MASTERY.maxRank,k,r};});
 const x=rows[state.sel]??rows[0],lv=p.level??1,into=(Number(p.mastery?.xp)||0)%MASTERY.perStar;
 return {left:'マスタリー',right:x.k.name,summary:lv>=MASTERY.level?`★${starsOf(p)}（使える星 ${starsFree(p)}）`:`職業Lv.${MASTERY.level}から`,rows,
  detail:{icon:BOOK_ICON+'medal',title:x.k.name,state:`今：${x.k.text(x.r)}`,text:`次のRank：${x.k.text(Math.min(MASTERY.maxRank,x.r+1))}\n\n職業Lv.${MASTERY.level}を超えると、職業経験値で★がたまります（${comma(MASTERY.perStar)}ごとに1つ）。`,
   bar:lv>=MASTERY.level?into/MASTERY.perStar:pct(lv,MASTERY.level),barText:lv>=MASTERY.level?`次の★まで ${comma(MASTERY.perStar-into)}`:`Lv.${lv} / ${MASTERY.level}`},
  actions:[card('★で強化する',starsFree(p)>0&&x.r<MASTERY.maxRank,BOOK_ICON+'medal')]};},
 act:(player,snap,state)=>act(player,'mastery.perk',{perk:PERKS[state.sel].key})};

// ---- 師弟 ----
const apprenticeModel={spec(player,{player:p},state){
 const db=peek(d=>d.players)??{},rows=[];
 if(p.master)rows.push({title:`師匠：${db[p.master]?.name??'?'}`,sub:`Lv.${APPRENTICE.graduate}で卒業　経験値 +${APPRENTICE.xpBonus*100}%`,icon:BOOK_ICON+'scroll',kind:'leave'});
 for(const a of p.apprentices??[])if(db[a]?.master===player.id)rows.push({title:`弟子：${db[a].name}`,sub:`職業Lv.${db[a].level??1}　${db[a].job}`,icon:BOOK_ICON+'scroll',kind:'info'});
 for(const [id,o] of Object.entries(db))if(o.masterAsk===player.id)rows.push({title:`弟子入りの依頼：${o.name}`,sub:`職業Lv.${o.level??1}　${o.job}`,icon:BOOK_ICON+'scroll',kind:'accept',id});
 if(!p.master&&(p.level??1)<=APPRENTICE.maxLevel)for(const o of world.getAllPlayers()){const x=db[o.id];if(!x||o.id===player.id||(x.level??1)<APPRENTICE.masterLevel||![x.job,x.secondJob].includes(p.job))continue;
  rows.push({title:`${x.name}に弟子入りする`,sub:`${x.job}　職業Lv.${x.level}`+(p.masterAsk===o.id?'　（依頼中）':''),icon:BOOK_ICON+'scroll',kind:'ask',id:o.id});}
 if(!rows.length)rows.push({title:'師弟はいません',sub:`弟子：職業Lv.${APPRENTICE.maxLevel}まで　師匠：Lv.${APPRENTICE.masterLevel}から`,icon:BOOK_ICON+'scroll',kind:'none'});
 const x=rows[state.sel]??rows[0];
 const label={leave:'師弟をやめる',accept:'弟子にする',ask:'弟子入りを頼む'}[x.kind];
 return {left:'師弟',right:'師弟のしくみ',summary:`弟子 ${(p.apprentices??[]).length} / ${APPRENTICE.maxApprentices}`,rows,
  detail:{icon:BOOK_ICON+'scroll',title:x.title,text:`弟子は職業経験値が+${APPRENTICE.xpBonus*100}%。弟子がLv.${APPRENTICE.milestones.join('・')}になるたびに師匠へ${APPRENTICE.milestoneCoins}コイン。Lv.${APPRENTICE.graduate}で卒業です。\n同じ職業で、オンラインの人に頼めます。`},
  actions:label?[card(label,true,BOOK_ICON+'scroll')]:[]};},
 act:async(player,snap,state)=>{const rows=apprenticeModel.spec(player,snap,state).rows,x=rows[state.sel];if(!x)return;
  if(x.kind==='leave')await act(player,'apprentice.leave');else if(x.kind==='accept')await act(player,'apprentice.accept',{id:x.id});else if(x.kind==='ask')await act(player,'apprentice.ask',{master:x.id});}};

// ---- サーバー目標・ギルド・季節・大会 ----
const goalModel={spec(player,{player:p},state){
 const now=Date.now(),w=weekOf(now),goal=goalOfWeek(w),g=peek(db=>db.goal),have=g?.week===w?g.have:0,mine=g?.week===w?g.by?.[player.id]??0:0;
 const top=g?.week===w?Object.entries(g.by??{}).sort((a,b)=>b[1]-a[1]).slice(0,5):[],names=peek(db=>db.players)??{};
 const rows=[{title:goal.name,sub:`${comma(have)} / ${comma(goal.target)}${goal.unit}`,icon:BOOK_ICON+'chest',bar:pct(have,goal.target)},
  ...top.map(([id,n],i)=>({title:`${i+1}位 ${names[id]?.name??'?'}`,sub:`${comma(n)}${goal.unit}`,icon:BOOK_ICON+'medal'}))];
 const done=have>=goal.target,claimed=(g?.claimed??[]).includes(player.id);
 return {left:'サーバー目標',right:'今週の目標',summary:`自分の貢献 ${comma(mine)}${goal.unit}`,rows,
  detail:{icon:BOOK_ICON+'chest',title:goal.name,state:done?'達成！':'挑戦中',text:'毎週月曜に新しい目標になります。少しでも参加した人は、達成したら報酬を受け取れます。',bar:pct(have,goal.target),barText:`${comma(have)} / ${comma(goal.target)}`,
   infoLabel:'報酬',infoValue:money(GOAL_REWARD.coins),infoIcon:BOOK_ICON+'coins',info2:`ガチャ券 ×${GOAL_REWARD.tickets}`},
  actions:[card(claimed?'受取済み':'報酬を受け取る',done&&mine>0&&!claimed,BOOK_ICON+'coins')]};},
 act:player=>act(player,'goal.claim')};
const countItem=(player,id)=>{try{const c=player.getComponent('minecraft:inventory').container;let n=0;for(let i=0;i<c.size;i++){const s=c.getItem(i);if(s?.typeId===id)n+=s.amount;}return n;}catch{return 0;}};
const guildModel={spec(player,{player:p},state){
 const w=weekOf(Date.now()),o=guildOrder(p.job,w);
 if(!o)return {left:'ギルド依頼',right:'',summary:'職業を選ぶと参加できます',rows:[{title:'職業を選んでください',icon:BOOK_ICON+'scroll'}],detail:{}};
 const gd=peek(db=>db.guilds?.[p.job]),cur=gd?.week===w?gd:{have:0,by:{},claimed:[]},names=peek(db=>db.players)??{},have=countItem(player,o.item,0),mine=cur.by?.[player.id]??0;
 const rows=[{title:`${ITEM_NAMES[o.item]??o.item}を${comma(o.need)}個`,sub:`${comma(cur.have)} / ${comma(o.need)}`,icon:itemIcon(o.item),bar:pct(cur.have,o.need)},
  ...Object.entries(cur.by??{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,n],i)=>({title:`${i+1}位 ${names[id]?.name??'?'}`,sub:`${comma(n)}個`,icon:BOOK_ICON+'medal'}))];
 const done=cur.have>=o.need,claimed=(cur.claimed??[]).includes(player.id);
 return {left:`${p.job}ギルド`,right:'今週のギルド依頼',summary:`自分の納品 ${comma(mine)}個　持っている ${comma(have)}個`,rows,
  detail:{icon:itemIcon(o.item),title:`${ITEM_NAMES[o.item]??o.item}の大口注文`,state:done?'達成！':'受付中',text:`同じ職業のみんなで納品します。達成すると、納品した人は量に応じて最大${comma(GUILD_REWARD.coins)}コインとガチャ券${GUILD_REWARD.tickets}枚。`,
   bar:pct(cur.have,o.need),barText:`${comma(cur.have)} / ${comma(o.need)}`},
  actions:[card(`持っている分を納品（${comma(Math.min(have,Math.max(0,o.need-cur.have)))}個）`,!done&&have>0,BOOK_ICON+'chest'),card(claimed?'受取済み':'報酬を受け取る',done&&mine>0&&!claimed,BOOK_ICON+'coins')]};},
 act:async(player,{player:p},state,which)=>{const o=guildOrder(p.job,weekOf(Date.now()));if(!o)return;
  if(which===0){const n=countItem(player,o.item,0);if(n)await act(player,'guild.deliver',{amount:Math.min(n,2304)});}else await act(player,'guild.claim');}};
const seasonModel={spec(player,{player:p},state){
 const s=seasonOf(Date.now()),work=p.season?.id===s.id?p.season.work??0:0,claimed=p.season?.id===s.id&&p.season.claimed;
 const rows=[{title:`今は${s.name}`,sub:`${s.jobs.join('・')}の職業経験値 +${SEASON_RULES.xpBonus*100}%`,icon:BOOK_ICON+'leaf'},
  {title:`称号「${s.title}」`,sub:`職業の作業 ${comma(work)} / ${SEASON_RULES.titleWork}`,icon:BOOK_ICON+'medal',bar:pct(work,SEASON_RULES.titleWork)}];
 return {left:'季節',right:s.name,summary:'季節は3か月ごとに変わります',rows,
  detail:{icon:BOOK_ICON+'leaf',title:`${s.name}のボーナス`,text:`春：農家・調合師　夏：釣り師・冒険家\n秋：料理人・農家・木こり　冬：鍛冶師・付与術師・鉱夫\n\nこの季節のうちに職業の作業を${SEASON_RULES.titleWork}回すると、季節の称号と500コイン。`,bar:pct(work,SEASON_RULES.titleWork),barText:`${comma(work)} / ${SEASON_RULES.titleWork}`},
  actions:[card(claimed?'受取済み':'称号を受け取る',work>=SEASON_RULES.titleWork&&!claimed,BOOK_ICON+'medal')]};},
 act:player=>act(player,'season.claim')};
const contestModel={spec(player,{player:p},state){
 const last=state.tab===1,rows=CONTESTS.map(c=>{const top=peek(db=>contestTop(db,c.key,last))??[];return {title:c.name,sub:top.length?`1位 ${top[0][0]}　${top[0][1]}`:'記録なし',icon:BOOK_ICON+'medal',top,c};});
 const x=rows[state.sel]??rows[0];
 return {left:'週間大会',right:x.c.name,tabs:[{label:'今週'},{label:'先週'}],summary:'ミニゲームの週間ハイスコア',rows,
  detail:{icon:BOOK_ICON+'medal',title:x.c.name,text:(x.top.length?x.top.map((t,i)=>`${i+1}位 ${t[0]}　${t[1]}`).join('\n'):'まだ記録がありません。')+'\n\n毎週月曜に締め切り。1位は「大会優勝」の回数に数えられます。'}};}};
const legendModel={spec(){const list=legendList(),rows=list.length?list.map(x=>({title:x.name,sub:`発見：${x.finder}`,icon:BOOK_ICON+'medal'})):[{title:'まだ見つかっていません',sub:'まれに名前付きの動物が現れます',icon:BOOK_ICON+'medal'}];
 return {left:'伝説の個体',right:'記録',summary:`見つかった数 ${list.length}`,rows,detail:{icon:BOOK_ICON+'medal',title:'伝説の個体',text:'まれに金色に光る名前付きの動物が現れます。近づくと発見したことになり、名前がここに残ります。登録して世話すると、とれる物のランクが上がりやすくなります。'}};}};

// ---- the hub ----
const PAGES=[['次にやること','おすすめと、受け取れる報酬',BOOK_ICON+'compass',nextModel],['コレクション','集めた種類で報酬',BOOK_ICON+'encyclopedia',collectionModel],
 ['記録','自己ベストとサーバー上位',BOOK_ICON+'medal',recordModel],['マスタリー','Lv.50からの★と特典',BOOK_ICON+'medal',masteryModel],
 ['師弟','弟子入り・弟子をとる',BOOK_ICON+'scroll',apprenticeModel],['サーバー目標','今週のみんなの目標',BOOK_ICON+'chest',goalModel],
 ['ギルド依頼','同じ職業の大口注文',BOOK_ICON+'vault',guildModel],['季節','季節のボーナスと称号',BOOK_ICON+'leaf',seasonModel],
 ['週間大会','ミニゲームのハイスコア',BOOK_ICON+'clock',contestModel],['伝説の個体','見つかった名前付きの動物',BOOK_ICON+'lantern',legendModel],
 ['ペット','動物をペットにする・呼ぶ・見た目',BOOK_ICON+'leaf',{open:openPets}],['きせかえ','スキン・防具の表示',BOOK_ICON+'medal',{open:openWardrobe}]];
export const progressModel={
 spec(player,snap,state){const r=PAGES[state.sel]??PAGES[0];
  return {left:'やり込み',right:r[0],summary:'選んで「開く」',rows:PAGES.map(([t,s,icon])=>({title:t,sub:s,icon})),detail:{icon:r[2],title:r[0],text:r[1]},actions:[card('開く',true,r[2])]};},
 pick:(player,snap,state,r)=>openPage(player,PAGES[r][3]),
 act:(player,snap,state)=>openPage(player,PAGES[state.sel][3])};
// a list page, or a feature with its own dialogs (ペット, きせかえ)
async function openPage(player,m){if(m.open){await m.open(player);return;}const res=await runList(player,m);return res==='close'?'close':undefined;}
export const PROGRESS_PAGES=PAGES;
