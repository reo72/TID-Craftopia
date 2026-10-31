import {skillXpBonus} from './skill-config.js';
import {rollSpecial,FISH_RULE} from './special-config.js';
import {gainStress} from './stress.js';
import {COOP_RULES,FACILITIES} from './cooperation-config.js';
import {MINE_BLOCKS,MINE_RULES} from './mine-config.js';
import {GATHER_BLOCKS,GATHER_ENTITIES,GATHER_RULES} from './gather-config.js';
export function upgradeCooperation(db){
 db.warehouse??={items:{},log:[]};db.market??=[];db.mentorships??=[];db.landmarks??=[];db.communityCodex??={};db.placedWork??={};
 for(const p of Object.values(db.players)){p.skillUnlocks??=[];p.facilities??={};p.loan??={remaining:0,principal:0,total:0,auto:true};p.explored??=[];p.mentorDays??={};p.skillWork??={day:'',counts:{}};}
 return db;
}
export function applyCooperation(action,a,{db,p,id,items,time,day,integer,demand,coins,xp,count,log,allowedItems,random=Math.random}){
 const owner=other=>{demand(db.players[other],'相手の保存データがありません。');return db.players[other];};
 const item=()=>{demand(allowedItems.includes(a.item),'この素材は取り扱えません。');return a.item;};
 const qty=()=>integer(a.amount,1,64);
 // the keeper's box takes any plain item (npc-warehouse.js decides which); stored by its id
 const anyItem=()=>{demand(typeof a.item==='string'&&/^[a-z0-9_]+:[a-z0-9_.]+$/.test(a.item),'このアイテムは取り扱えません。');return a.item;};
 const note=text=>{db.warehouse.log.unshift({name:p.name,text,at:time});db.warehouse.log.length=Math.min(50,db.warehouse.log.length);};
 // Skill XP from gathering/mining. Fractional XP (bamboo, rocks, other jobs, stress) carries over.
 // Placed blocks are filtered out by the runtime (placed-store.js) before these actions.
 const skillWork=(skill,rule,R,title,specialSkill)=>{
  const count=integer(a.count??1,1,64),job=rule.job===undefined?R.job:rule.job,own=!job||[p.job,p.secondJob].includes(job),before=p[skill].level,frac=skill+'Frac';
  p[frac]=(p[frac]??0)+rule.xp*count*(own?1:R.otherJobRate)*(p.stress>=80?.9:1)*(1+skillXpBonus(p,skill));
  const gain=Math.floor(p[frac]+1e-9);p[frac]=Math.max(0,p[frac]-gain);
  if(gain>0){
   xp(p,skill,gain,true);
   p.playerFrac=(p.playerFrac??0)+gain*R.playerXpRate;const pg=Math.floor(p.playerFrac+1e-9);p.playerFrac-=pg;if(pg>0)xp(p,null,pg,true);
   gainStress(p,gain*R.stressPerXp);
  }
  p.stats??={};const counter=skill==='gather'?'gathered':'mined';p.stats[counter]=(Number.isSafeInteger(p.stats[counter])?p.stats[counter]:0)+count; // achievement counter (titles: achievements-config.js)
  // job-only special materials: the runtime drops them at the player (a full inventory can't fail the action)
  const special=[];for(let i=0;i<count;i++)special.push(...rollSpecial(p,specialSkill??skill,a.type,random));
  if(special.length)p.stats.special=(Number.isSafeInteger(p.stats.special)?p.stats.special:0)+special.length;
  return {gain,level:p[skill].level,xp:p[skill].xp,max:p[skill].max,levelUp:p[skill].level>before,special};
 };
 if(action==='gather.work'){const rule=a.entity?GATHER_ENTITIES[a.type]:GATHER_BLOCKS[a.type];demand(rule,'採取の対象外です。');return skillWork('gather',rule,GATHER_RULES,'街の採集家');}
 if(action==='fish.catch'){a={...a,type:'fishing'};return skillWork('gather',FISH_RULE,GATHER_RULES,'','fish');}
 if(action==='mine.work'){const rule=MINE_BLOCKS[a.type];demand(rule,'採掘の対象外です。');return skillWork('mine',rule,MINE_RULES,'頼れる鉱夫');}
 if(action==='warehouse.deposit'){const type=item(),amount=qty();demand((db.warehouse.items[type]??0)+amount<=COOP_RULES.warehouseTypeCap,'この素材の倉庫上限です。');items.take=[[type,amount]];db.warehouse.items[type]=(db.warehouse.items[type]??0)+amount;note(type+' +'+amount);return '共有倉庫へ預けました。';}
 // items already handed over (the keeper's deposit box, npc-warehouse.js): stored without taking from the inventory
 if(action==='warehouse.store'){const type=anyItem(),amount=qty();demand((db.warehouse.items[type]??0)+amount<=COOP_RULES.warehouseTypeCap,'この素材の倉庫上限です。');db.warehouse.items[type]=(db.warehouse.items[type]??0)+amount;if(!a.silent)note(type+' +'+amount);return '共有倉庫へ預けました。';}
 // the keeper's browse box: taken out to show in the box (silent: the box logs what really changed hands)
 if(action==='warehouse.take'){const type=anyItem(),amount=qty();demand((db.warehouse.items[type]??0)>=amount,'共有倉庫の在庫が不足しています。');db.warehouse.items[type]-=amount;if(!a.silent)note(type+' -'+amount);return '';}
 if(action==='warehouse.note'){demand(typeof a.text==='string'&&/^[a-z0-9_]+:[a-z0-9_.]+ [+-]\d+$/.test(a.text),'記録の形式が不正です。');note(a.text);return '';}
 if(action==='warehouse.withdraw'){const type=(db.warehouse.items[a.item]??0)>0?anyItem():item(),amount=qty();demand((db.warehouse.items[type]??0)>=amount,'共有倉庫の在庫が不足しています。');items.give=[[type,amount]];db.warehouse.items[type]-=amount;note(type+' -'+amount);return '共有倉庫から受け取りました。';}
 if(action==='market.list'){demand(p.facilities.stall||db.town.level>=4,'販売許可を取得するか、街をLv.4にしてください。');demand(db.market.filter(q=>q.owner===id).length<COOP_RULES.marketLimit&&db.market.length<100,'出品上限です。');const type=item(),amount=qty(),price=integer(a.price,1,100000);items.take=[[type,amount]];db.market.push({id:++db.sequence,owner:id,name:p.name,item:type,amount,price});return '商品を預かり、市場へ出品しました。';}
 if(action==='market.buy'||action==='market.cancel'){
  const index=db.market.findIndex(q=>q.id===a.id),q=db.market[index];demand(q,'この出品はすでに終了しています。');
  if(action==='market.cancel'){demand(q.owner===id,'自分の出品だけ取消できます。');items.give=[[q.item,q.amount]];}
  else{demand(q.owner!==id,'自分の商品は購入できません。');const seller=owner(q.owner);coins(p,-q.price);coins(seller,q.price,true);seller.savedAt=time;log(seller,'市場売上 '+q.price+'コイン',time);items.give=[[q.item,q.amount]];}
  db.market.splice(index,1);return action==='market.buy'?'購入しました。':'出品を取り消し、商品を返却しました。';
 }
 if(action==='facility.buy'){
  const facility=FACILITIES[a.facility];demand(facility,'設備が見つかりません。');demand(!p.facilities[a.facility],'取得済みです。');
  if(a.finance){demand(p.loan.remaining===0,'前の借入を完済してください。');demand(facility.price<=COOP_RULES.loanBase+p.level*COOP_RULES.loanPerLevel,'現在の借入上限を超えます。');const total=Math.ceil(facility.price*(100+COOP_RULES.interestPercent)/100);p.loan={remaining:total,principal:facility.price,total,auto:true,at:time,facility:a.facility};log(p,'設備融資 '+facility.price+' / 返済総額 '+total,time);}
  else coins(p,-facility.price);
  p.facilities[a.facility]=true;return facility.name+'を取得しました。'+(a.finance?'借入金は設備へ直接支払いました。':'');
 }
 if(action==='loan.repay'){const amount=integer(a.amount,1,Math.max(1,p.loan.remaining));demand(p.loan.remaining>=amount,'借入残高を超えています。');coins(p,-amount);p.loan.remaining-=amount;log(p,'融資返済 '+amount,time);return '返済しました。残り '+p.loan.remaining+'コイン。';}
 if(action==='loan.auto'){p.loan.auto=!p.loan.auto;return '仕事収入からの自動返済を'+(p.loan.auto?'有効':'無効')+'にしました。';}
 if(action==='rest.facility'){demand(p.facilities.rest||db.town.level>=3,'個人休憩設備か街Lv.3が必要です。');demand(time-(p.lastRest??0)>=300000,'休憩設備は5分ごとに使えます。');demand(p.stress>0,'ストレスはありません。');p.stress=Math.max(0,p.stress-20);p.lastRest=time;return '休憩してストレスを20回復しました。';}
 if(action==='supplies.use'){
  const supplies={'cooptown:trail_ration':40,'cooptown:rune_charm':10,'cooptown:expedition_kit':60};demand(supplies[a.item],'使用できない支援品です。');demand(p.stress>0,'今は回復が不要です。');items.take=[[a.item,1]];p.stress=Math.max(0,p.stress-supplies[a.item]);return '支援品を使い、ストレスを回復しました。';
 }
 if(action==='landmark.visit'){const place=db.landmarks.find(v=>v.id===a.id);demand(place,'探索地が見つかりません。');demand(!p.explored.includes(place.id),'この探索地は発見済みです。');p.explored.push(place.id);
  // titles: the first on the server to reach it (人類未踏), every registered place found (空白の地図)
  p.tally??={};if(!place.firstBy){place.firstBy=id;p.tally.landmark_first=(p.tally.landmark_first??0)+1;}
  if(db.landmarks.every(l=>p.explored.includes(l.id)))p.tally.landmarks_all=1;
  xp(p,null,db.town.level>=5?100:50);p.tickets++;count(p,'discover',time);return '探索地「'+place.name+'」を発見しました。ガチャ券1枚を獲得。';}
 if(action==='mentor.invite'){
  demand(p.level<=COOP_RULES.studentMaxLevel,'見習い依頼の申込はLv.10までです。');demand(a.mentor!==id,'自分は指導役に選べません。');const mentor=owner(a.mentor);demand(mentor.level>=COOP_RULES.mentorLevel,'指導役はLv.5以上が必要です。');demand(p.studentDay!==day,'本日の見習い依頼は達成済みです。');db.mentorships=db.mentorships.filter(q=>q.day===day);demand(!db.mentorships.some(q=>q.student===id),'すでに申込があります。');db.mentorships.push({id:++db.sequence,student:id,mentor:a.mentor,day,accepted:false});return '見習い依頼を申し込みました。指導役が手帳から承認できます。';
 }
 if(action==='mentor.accept'||action==='mentor.cancel'||action==='mentor.deliver'){
  const index=db.mentorships.findIndex(q=>q.id===a.id),q=db.mentorships[index];demand(q&&q.day===day,'有効な見習い依頼がありません。');
  if(action==='mentor.cancel'){demand(q.student===id||q.mentor===id,'この依頼は操作できません。');db.mentorships.splice(index,1);return '申込を取り消しました。';}
  if(action==='mentor.accept'){demand(q.mentor===id,'指導役が承認してください。');demand((p.mentorDays[day]??0)<COOP_RULES.mentorDailyLimit,'本日の指導上限です。');q.accepted=true;return '見習い依頼を承認しました。見習いが原木16個を納品すると完了します。';}
  demand(q.student===id&&q.accepted,'指導役の承認が必要です。');const mentor=owner(q.mentor);demand(p.studentDay!==day&&(mentor.mentorDays[day]??0)<COOP_RULES.mentorDailyLimit,'本日の達成上限です。');items.take=[['minecraft:oak_log',16]];p.studentDay=day;mentor.mentorDays={[day]:(mentor.mentorDays[day]??0)+1};coins(p,100,true);coins(mentor,50,true);mentor.stats??={};mentor.stats.mentored=(Number.isSafeInteger(mentor.stats.mentored)?mentor.stats.mentored:0)+1;xp(p,null,60);xp(mentor,null,30);count(p,'quest',time);p.stats.questsCompleted++;mentor.savedAt=time;db.mentorships.splice(index,1);return '見習い依頼を達成しました。見習い100コイン、指導役50コイン。';
 }
 return undefined;
}
