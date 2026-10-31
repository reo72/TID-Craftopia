// 街の発展 on the ledger (rules and data: town-config.js). db.town.build:
//   index: the building under construction (0..4, 5 = all done; town level = index + 1)
//   got: {building: [{kind: n} per stage]}, active / percent: the amount scale (admin), contrib / byBuilding: points
//   done: [{index, at}] finished buildings; trials: town levels waiting for their 街の試練 (not built yet)
import {BUILDINGS,STAGES,KINDS,TOWN_RULES,stageSlots,stageOf,kindFor} from './town-config.js';
export function upgradeTown(db){
 const t=db.town;
 if(!t.build){const level=Math.min(TOWN_RULES.maxLevel,Math.max(1,Math.floor(Number(t.level)||1)));t.build={index:level-1,got:{},active:TOWN_RULES.baseActive,percent:100,contrib:{},byBuilding:{},done:[],trials:[]};t.level=level;}
 const b=t.build;b.got??={};b.contrib??={};b.byBuilding??={};b.done??=[];b.trials??=[];
 return db;
}
const add=(o,k,v)=>{o[k]=(o[k]??0)+v;};
/** Moves on past every finished building; returns the names finished now. */
function settle(db,time){
 const b=db.town.build,finished=[];
 while(b.index<BUILDINGS.length&&stageOf(b,b.index)>=STAGES.length){finished.push(BUILDINGS[b.index].name);b.done.push({index:b.index,at:time});b.index++;b.trials.push(b.index+1);}
 db.town.level=b.index+1;return finished;
}
/** Town actions (game-engine execute): town.build. Returns the message, or undefined for other actions. */
export function applyTown(action,a,{db,p,id,items,time,demand,integer,count,bump}){
 if(action!=='town.build')return;
 const b=db.town.build;
 demand(b.index<BUILDINGS.length,'すべての共有建築が完成しています。');
 // target: the current building's open stage, or the next building's 基礎 (先行納品)
 const ahead=a.target==='next',bi=ahead?b.index+1:b.index;
 demand(bi<BUILDINGS.length,'先行納品できる建築はありません。');
 const si=ahead?0:stageOf(b,bi);
 demand(si<STAGES.length,'この建築は完成しています。');
 demand(!ahead||stageOf(b,bi)===0,'次の建築の基礎は必要量に達しています。');
 demand(Array.isArray(a.items)&&a.items.length>0&&a.items.length<=200,'納品する素材がありません。');
 const slots=Object.fromEntries(stageSlots(b,bi,si).map(v=>[v.kind,v])),taken={},stage=b.got[bi]??=[{},{},{}],got=stage[si];
 let points=0,refused=0,total=0;
 for(const [type,n] of a.items){
  const k=kindFor(bi,type),amount=integer(n,1,100000);demand(k,'この建築では使わない素材です。');
  const s=slots[k],use=Math.min(amount,s.left);refused+=amount-use;if(!use)continue;
  s.left-=use;add(got,k,use);add(taken,type,use);points+=use*KINDS[k].points;total+=use;
 }
 demand(total>0,'この段階ではもう必要ない素材です（超過分は受け付けません）。');
 items.take=Object.entries(taken).map(([type,n])=>[type,n,{exact:true,loose:!!KINDS[kindFor(bi,type)].loose}]);
 for(const [type,n] of Object.entries(taken))add(db.town.materials,type,n);
 db.town.total+=total;add(b.contrib,id,points);add(b.byBuilding[bi]??={},id,points);
 bump(p,'townDonations');bump(p,'townPoints',points);count(p,'town',time);count(p,'deliver',time);p.stats.deliveries++;
 const done=stageOf(b,bi)>si,finished=settle(db,time);
 const lines=[`${BUILDINGS[bi].name}の${STAGES[si][0]}${ahead?'（先行納品）':''}へ${total}個を納品しました。`,`貢献度 +${points}（合計 ${b.contrib[id]}）`];
 if(refused)lines.push(`必要量を超えた${refused}個は受け付けませんでした。`);
 if(done&&!finished.length)lines.push(`§6${BUILDINGS[bi].name}の${STAGES[si][0]}が完成しました！`);
 for(const name of finished)lines.push(`§6${name}が完成しました！ 街 Lv.${db.town.level}`);
 return lines.join('\n');
}
/** Admin: put the town at a level (the building index follows). Deliveries are kept, except that a building from
 * the new one on that was already finished starts over (moving the town back). */
export function setTownLevel(db,level){
 const b=db.town.build;b.index=level-1;db.town.level=level;
 for(let i=b.index;i<BUILDINGS.length;i++)if(stageOf(b,i)>=STAGES.length)delete b.got[i];
}
/** Admin: the current building at stage s: earlier stages filled, stage s and later emptied. */
export function setTownStage(db,s){
 const b=db.town.build,bi=b.index;if(bi>=BUILDINGS.length)throw new Error('すべての共有建築が完成しています。');
 const stage=b.got[bi]=[{},{},{}];
 for(let i=0;i<s;i++)for(const v of stageSlots(b,bi,i))stage[i][v.kind]=v.need;
}
