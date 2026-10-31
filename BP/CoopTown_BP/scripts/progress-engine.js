import {MASTERY,PERKS,perkRank,perkMul,starsOf,starsFree,APPRENTICE,COLLECTIONS,COLLECTION_STEPS,collectionHave,GOAL_REWARD,goalOfWeek,
 guildOrder,GUILD_REWARD,seasonOf,SEASON_RULES,CONTESTS,CONTEST_TOP,weekOf} from './progress-config.js';

// The saved side of やり込み (progress-config.js). game-engine.js calls the hooks below from its own xp / coins /
// title.track / job.count, and applyProgress for the actions. db keys: goal {week, key, have, by: {id: n}, claimed: [id]},
// guilds {job: {week, item, need, have, by, claimed}}, contests {week, best: {key: {id: [score, name]}}, last}.
const num=x=>Number.isSafeInteger(x)&&x>=0?x:0;
// ---- hooks ----
/** Job XP: mastery past MASTERY.level, the apprentice bonus; skill XP: the 熟練の技 perk. Returns the amount to add. */
export function progressXp(p,key,amount){
 if(key)return Math.max(1,Math.floor(amount*perkMul(p,'xp')));
 if(p.master)amount=Math.floor(amount*(1+APPRENTICE.xpBonus));
 if((p.level??1)>=MASTERY.level){p.mastery??={xp:0,perks:{}};p.mastery.xp=num(p.mastery.xp)+amount;}
 return amount;
}
/** Coins earned (not transfers): the 商売上手 perk. */
export const progressCoins=(p,amount)=>Math.floor(amount*perkMul(p,'coin'));
/** Stress gained: the 平常心 perk (fractions rounded by chance). */
export function progressStress(p,amount,random=Math.random){const x=amount*(2-perkMul(p,'calm'));const f=Math.floor(x);return f+(random()<x-f?1:0);}
/** The season's jobs get more job XP (job.earn). */
export function seasonXp(p,gain,time){const s=seasonOf(time);return s.jobs.includes(p.job)||s.jobs.includes(p.secondJob)?Math.floor(gain*(1+SEASON_RULES.xpBonus)):gain;}
/** A counted piece of work: the week's server goal, the season's work, the week's contests (maxes). */
export function noteWork(db,p,id,key,amount,time){
 const w=weekOf(time),g=goalOfWeek(w);
 if(db.goal?.week!==w)db.goal={week:w,key:g.key,have:0,by:{},claimed:[]};
 if(key===db.goal.key){db.goal.have=num(db.goal.have)+amount;db.goal.by[id]=num(db.goal.by[id])+amount;}
 if(/^j:/.test(key)){const s=seasonOf(time);p.season??={};if(p.season.id!==s.id)p.season={id:s.id,work:0,claimed:false};p.season.work=num(p.season.work)+amount;}
}
export function noteBest(db,p,id,key,value,time,tally){
 if(!CONTESTS.some(c=>c.key===key))return;
 const w=weekOf(time);db.contests??={};
 if(db.contests.week!==w){
  if(db.contests.best){db.contests.last={week:db.contests.week,best:db.contests.best};
   // last week's winners (each contest's first) get a win counted
   for(const k of Object.keys(db.contests.best)){const top=Object.entries(db.contests.best[k]).sort((a,b)=>b[1][0]-a[1][0])[0];const wp=top&&db.players[top[0]];if(wp)tally?.(wp,'contest_win');}}
  db.contests.week=w;db.contests.best={};}
 const b=db.contests.best[key]??={};if(value>(b[id]?.[0]??0))b[id]=[value,p.name];
}
/** After a change: apprentice milestones / graduation, the mastery-star record. */
export function afterProgress(db,p,id,levelBefore,{coins,tally,time}){
 if((p.level??1)>=MASTERY.level){const st=starsOf(p);if(st>num(p.tally?.mastery_stars))tally(p,'mastery_stars',st-num(p.tally?.mastery_stars));}
 if(!p.master||p.level===levelBefore)return;
 const m=db.players[p.master];if(!m){p.master=undefined;return;}
 for(const lv of APPRENTICE.milestones)if(levelBefore<lv&&p.level>=lv){
  try{coins(m,APPRENTICE.milestoneCoins,true);}catch{}tally(m,'apprentice_lv');m.savedAt=time;
  (m.history??=[]).unshift({at:time,text:`弟子の${p.name}がLv.${lv}になりました（+${APPRENTICE.milestoneCoins}コイン）`});m.history.length=Math.min(m.history.length,20);
 }
 if(p.level>=APPRENTICE.graduate){tally(m,'graduated');tally(p,'graduated_self');m.apprentices=(m.apprentices??[]).filter(x=>x!==id);p.master=undefined;p.graduatedFrom=m.name;}
}
// ---- actions ----
export function applyProgress(action,a,{db,p,id,items,time,demand,integer,coins,tally}){
 if(action==='mastery.perk'){
  const perk=PERKS.find(x=>x.key===a.perk);demand(perk,'その特典はありません。');demand(starsFree(p)>0,'使える星がありません。');
  demand(perkRank(p,perk.key)<MASTERY.maxRank,'この特典は最大です。');p.mastery.perks[perk.key]=perkRank(p,perk.key)+1;
  return `${perk.name}をRank ${p.mastery.perks[perk.key]}にしました。`;
 }
 if(action==='apprentice.ask'){ // the apprentice asks a master
  const m=db.players[a.master];demand(m&&a.master!==id,'その人は選べません。');demand(!p.master,'すでに師匠がいます。');
  demand((p.level??1)<=APPRENTICE.maxLevel,`弟子になれるのは職業Lv.${APPRENTICE.maxLevel}までです。`);
  demand((m.level??1)>=APPRENTICE.masterLevel,`師匠は職業Lv.${APPRENTICE.masterLevel}以上が必要です。`);
  demand(p.job!=='未選択'&&[m.job,m.secondJob].includes(p.job),'同じ職業の人に頼んでください。');
  p.masterAsk=a.master;return `${m.name}に弟子入りを頼みました。相手が手帳で受け入れると師弟になります。`;
 }
 if(action==='apprentice.accept'){
  const s=db.players[a.id];demand(s&&s.masterAsk===id,'頼まれていません。');demand(!s.master,'その人にはもう師匠がいます。');
  p.apprentices=(p.apprentices??[]).filter(x=>db.players[x]?.master===id);demand(p.apprentices.length<APPRENTICE.maxApprentices,`弟子は${APPRENTICE.maxApprentices}人までです。`);
  s.master=id;s.masterAsk=undefined;s.savedAt=time;p.apprentices.push(a.id);tally(p,'apprentice_taken');return `${s.name}を弟子にしました。`;
 }
 if(action==='apprentice.leave'){
  demand(p.master||p.masterAsk,'師匠はいません。');const m=db.players[p.master];if(m){m.apprentices=(m.apprentices??[]).filter(x=>x!==id);m.savedAt=time;}
  p.master=undefined;p.masterAsk=undefined;return '師弟をやめました。';
 }
 if(action==='collection.claim'){
  const c=COLLECTIONS.find(x=>x.key===a.key);demand(c,'その図鑑はありません。');p.collections??={};
  const step=num(p.collections[c.key]),s=COLLECTION_STEPS[step];demand(s,'報酬はすべて受取済みです。');
  demand(collectionHave(p,c)>=Math.ceil(c.total*s.at),'まだ集まっていません。');
  p.collections[c.key]=step+1;coins(p,s.coins,true);p.tickets=num(p.tickets)+s.tickets;tally(p,'collection_step');if(s.at>=1)tally(p,'collection_done');
  return `${c.name}図鑑の報酬：${s.coins}コイン・ガチャ券${s.tickets}枚`;
 }
 if(action==='goal.claim'){
  const w=weekOf(time),g=db.goal;demand(g&&g.week===w,'今週の目標はまだ始まっていません。');const goal=goalOfWeek(w);
  demand(num(g.have)>=goal.target,'まだ目標に届いていません。');demand(num(g.by?.[id])>=GOAL_REWARD.minShare,'今週の目標に参加していません。');
  demand(!g.claimed.includes(id),'受取済みです。');g.claimed.push(id);coins(p,GOAL_REWARD.coins,true);p.tickets=num(p.tickets)+GOAL_REWARD.tickets;tally(p,'goal_done');
  return `サーバー目標達成の報酬：${GOAL_REWARD.coins}コイン・ガチャ券${GOAL_REWARD.tickets}枚`;
 }
 if(action==='guild.deliver'||action==='guild.claim'){
  const job=p.job,w=weekOf(time),o=guildOrder(job,w);demand(o,'職業を選んでください。');
  db.guilds??={};let gd=db.guilds[job];if(gd?.week!==w)gd=db.guilds[job]={week:w,item:o.item,need:o.need,have:0,by:{},claimed:[]};
  if(action==='guild.deliver'){
   demand(gd.have<gd.need,'今週のギルド依頼は達成済みです。');const n=Math.min(integer(a.amount,1,2304),gd.need-gd.have);
   items.take=[[gd.item,n,{deliver:0}]];gd.have+=n;gd.by[id]=num(gd.by[id])+n;tally(p,'guild_items',n);
   return `ギルド依頼に${n}個納品しました（${gd.have} / ${gd.need}）。`;
  }
  demand(gd.have>=gd.need,'まだ依頼が終わっていません。');demand(num(gd.by[id])>0,'今週は納品していません。');demand(!gd.claimed.includes(id),'受取済みです。');
  const share=gd.by[id]/gd.need,pay=Math.max(100,Math.round(GUILD_REWARD.coins*Math.min(1,share*3)));
  gd.claimed.push(id);coins(p,pay,true);p.tickets=num(p.tickets)+GUILD_REWARD.tickets;tally(p,'guild_done');
  return `ギルド依頼の報酬：${pay}コイン・ガチャ券${GUILD_REWARD.tickets}枚`;
 }
 if(action==='season.claim'){
  const s=seasonOf(time);demand(p.season?.id===s.id&&num(p.season.work)>=SEASON_RULES.titleWork,`この季節に職業の作業を${SEASON_RULES.titleWork}回すると受け取れます。`);
  demand(!p.season.claimed,'受取済みです。');p.season.claimed=true;p.titles??=[];if(!p.titles.includes(s.title))p.titles.push(s.title);tally(p,'season_title');
  coins(p,500,true);return `称号「${s.title}」と500コインを受け取りました。`;
 }
 return undefined;
}
/** The week's contest table for a key: [[name, score]] best first. */
export const contestTop=(db,key,last=false)=>Object.values((last?db.contests?.last?.best:db.contests?.best)?.[key]??{}).sort((a,b)=>b[0]-a[0]).slice(0,CONTEST_TOP).map(([s,n])=>[n,s]);
