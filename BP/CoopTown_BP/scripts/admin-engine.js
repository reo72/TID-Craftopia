// Admin (運営) operations on the ledger. Called from game-engine execute() with the engine's helpers;
// every operation is written to db.adminLog (who, when, what, target, reason).
// owners: gamertags that always have the admin tag (given on join and every 5 seconds; can't be removed)
import {BUILDINGS,STAGES,TOWN_RULES} from './town-config.js';
import {GACHA} from './gacha-config.js';
import {addTickets} from './gacha-engine.js';
// the ticket kind typed in the admin form (blank = normal)
const TICKET_KINDS={'':'normal',daily:'daily',normal:'normal',epic:'epic','デイリー':'daily','ノーマル':'normal','エピック':'epic'};
import {setTownLevel,setTownStage} from './town-engine.js';
export const ADMIN_RULES={tag:'cooptown_admin',owners:['REO722'],logLimit:200,warnGainPerDay:5000,maxRate:10};
export const SKILLS=[['player','全体'],['gather','採取'],['mine','採掘'],['craft','クラフト']];

export function applyAdmin(action,a,{db,admin,time,demand,integer,coins,xp,fresh,jobs,coinCap}){
 db.adminLog??=[];
 const reason=String(a.reason??'').trim().slice(0,60);
 const note=(text,target='')=>{db.adminLog.unshift({at:time,by:admin.name,target,text,reason});if(db.adminLog.length>ADMIN_RULES.logLimit)db.adminLog.length=ADMIN_RULES.logLimit;};
 const target=()=>{const t=db.players[a.target];demand(t,'プレイヤーが見つかりません。');t.savedAt=time;return t;};
 const skill=()=>{demand(SKILLS.some(([k])=>k===a.skill),'スキルを選んでください。');return a.skill==='player'?null:a.skill;};
 const skillName=()=>SKILLS.find(([k])=>k===a.skill)[1];
 const text=(value,max,label)=>{const v=String(value??'').trim();demand(v.length>0&&v.length<=max,`${label}は1～${max}文字です。`);return v;};
 const listed=(list,label)=>{const i=list.findIndex(q=>q.id===a.id);demand(i>=0,`この${label}はすでにありません。`);return [i,list[i]];};
 switch(action){
  case 'admin.coins':{const t=target(),amount=integer(a.amount,-coinCap,coinCap);demand(amount!==0,'0以外の数を入力してください。');coins(t,amount);const s=(amount>0?'+':'')+amount;note('所持金 '+s,t.name);return `${t.name}の所持金を${s}しました。`;}
  case 'admin.xp':{const t=target(),key=skill(),amount=integer(a.amount,1,1000000);xp(t,key,amount,true);note(`${skillName()}経験値 +${amount}`,t.name);return `${t.name}の${skillName()}経験値を+${amount}しました。`;}
  case 'admin.level':{const t=target(),key=skill(),level=integer(a.level,1,100),s=key?t[key]:t;s.level=level;s.xp=0;s[key?'max':'maxXp']=100+(level-1)*50;note(`${skillName()} Lv.${level} に設定`,t.name);return `${t.name}の${skillName()}をLv.${level}にしました。`;}
  case 'admin.job':{const t=target();demand(a.job==='未選択'||jobs.includes(a.job),'職業を選んでください。');demand(!a.second||(jobs.includes(a.second)&&a.second!==a.job&&a.job!=='未選択'),'第2職業は主職業と別の職業にしてください。');t.job=a.job;if(a.second)t.secondJob=a.second;else delete t.secondJob;note(`職業 ${a.job}${a.second?' / '+a.second:''}`,t.name);return `${t.name}の職業を変更しました。`;}
  // 称号 (asked 2026-10-27): staff give or take away a title (any name up to 40 characters); a removed one is unequipped
  case 'admin.title':{const t=target(),name=text(a.title,40,'称号');t.titles??=[];
   if(a.remove){demand(t.titles.includes(name),'その称号は持っていません。');t.titles=t.titles.filter(x=>x!==name);if(t.title===name)t.title=undefined;note(`称号を外す「${name}」`,t.name);return `${t.name}から称号「${name}」を外しました。`;}
   demand(!t.titles.includes(name),'もう持っている称号です。');t.titles.push(name);note(`称号を付与「${name}」`,t.name);return `${t.name}に称号「${name}」を付与しました。`;}
  case 'admin.stress':{const t=target();t.stress=0;t.stressFrac=0;note('ストレスを0に',t.name);return `${t.name}のストレスを0にしました。`;}
  case 'admin.tickets':{const t=target(),amount=integer(a.amount,1,1000),kind=TICKET_KINDS[String(a.kind??'').trim()]??'normal',label=GACHA[kind].ticket;addTickets(t,kind,amount);note(`${label} +${amount}`,t.name);return `${t.name}に${label}を${amount}枚配りました。`;}
  case 'admin.reset':{const t=target();
   if(a.scope==='job'){t.job='未選択';delete t.secondJob;note('職業を初期化',t.name);return `${t.name}の職業を初期化しました。`;}
   demand(a.scope==='all','初期化の範囲を選んでください。');db.players[a.target]={...fresh(t.name),guideGiven:true,savedAt:time};note('データを全部初期化',t.name);return `${t.name}のデータを初期化しました。`;}
  // 街の発展 (town-engine.js): the level picks the building under construction; deliveries so far are kept
  case 'admin.town':{const level=integer(a.level,1,TOWN_RULES.maxLevel);setTownLevel(db,level);note(`街 Lv.${level} に設定`);return `街をLv.${level}にしました。`+(level<=BUILDINGS.length?`建設中：${BUILDINGS[level-1].name}`:'すべて完成');}
  case 'admin.town.stage':{const s=integer(a.stage,0,STAGES.length-1);setTownStage(db,s);const name=BUILDINGS[db.town.build.index].name;note(`${name}を${STAGES[s][0]}の段階に設定`);return `${name}を「${STAGES[s][0]}」の段階にしました（それより前は完了扱い、以降の納品分は0）。`;}
  case 'admin.town.scale':{const active=integer(a.active,1,200),percent=integer(a.percent,1,1000);Object.assign(db.town.build,{active,percent});note(`街の必要量 アクティブ${active}人・${percent}%`);return `必要量をアクティブ${active}人・${percent}%で計算します。`;}
  case 'admin.location':{db.town.location=a.location;note('街の拠点を登録');return '現在地を街の拠点にしました。';}
  case 'admin.landmark.add':{const name=text(a.name,30,'探索地名');demand(db.landmarks.length<20,'探索地は20か所までです。');db.landmarks.push({id:++db.sequence,name,location:a.location});note('探索地を登録 '+name);return `探索地「${name}」を登録しました。`;}
  case 'admin.landmark.remove':{const [i,q]=listed(db.landmarks,'探索地');db.landmarks.splice(i,1);note('探索地を削除 '+q.name);return `探索地「${q.name}」を削除しました。`;}
  case 'admin.market.cancel':{const [i,q]=listed(db.market,'出品');const owner=db.players[q.owner];demand(owner,'出品者のデータがありません。');owner.mail.push([q.item,q.amount]);owner.savedAt=time;db.market.splice(i,1);note(`出品を取消（${q.item.replace('minecraft:','')}×${q.amount}は受取箱へ）`,q.name);return '出品を取り消し、品物を出品者の受取箱へ返しました。';}
  case 'admin.request.cancel':{const [i,q]=listed(db.requests,'依頼');const owner=db.players[q.owner];demand(owner,'依頼主のデータがありません。');coins(owner,q.coins);owner.savedAt=time;db.requests.splice(i,1);note(`依頼を取消（報酬${q.coins}コインを返却）`,q.name);return '依頼を取り消し、報酬を依頼主へ返しました。';}
  case 'admin.event.add':{const name=text(a.name,30,'イベント名'),description=String(a.description??'').slice(0,200);const start=time+integer(a.delay,0,720)*3600000,end=start+integer(a.duration,1,168)*3600000;demand(db.events.length<20,'イベントは20件までです。終了したものを削除してください。');db.events.push({id:++db.sequence,name,description,start,end,location:a.location,participants:[]});note('イベントを登録 '+name);return `イベント「${name}」を登録しました。`;}
  case 'admin.event.remove':{const [i,q]=listed(db.events,'イベント');db.events.splice(i,1);note('イベントを削除 '+q.name);return `イベント「${q.name}」を削除しました。`;}
  case 'admin.event.reward':{const [,e]=listed(db.events,'イベント'),amount=integer(a.coins??0,0,100000),tickets=integer(a.tickets??0,0,100);demand(amount||tickets,'コインかガチャ券を入力してください。');let n=0;
   for(const pid of e.participants){const pp=db.players[pid];if(!pp)continue;if(amount)coins(pp,amount,true);pp.tickets+=tickets;pp.savedAt=time;n++;}
   note(`イベント報酬 ${e.name}：${amount}コイン・券${tickets}枚 ×${n}人`);return `${n}人に報酬を配りました。`;}
  case 'admin.rates':{const rates={};for(const k of ['quest','daily','town']){const v=Number(a[k]);demand(Number.isFinite(v)&&v>=0&&v<=ADMIN_RULES.maxRate,`倍率は0～${ADMIN_RULES.maxRate}です。`);rates[k]=Math.round(v*10)/10;}db.settings={...db.settings,rates};note(`報酬倍率 依頼×${rates.quest} デイリー×${rates.daily} 納品×${rates.town}`);return '報酬倍率を変更しました。';}
  case 'admin.minimap':{db.settings={...db.settings,minimap:a.on!==false};note('ミニマップを全体で'+(a.on!==false?'有効':'無効')+'に');return 'ミニマップを全体で'+(a.on!==false?'有効':'無効')+'にしました。';}
  case 'admin.note':{note(text(a.text,120,'記録'),String(a.targetName??''));return '';}
 }
 demand(false,'運営の操作が見つかりません。');
}
