import {world} from '@minecraft/server';
import {noticeDialog,confirmDialog} from './dialog.js';
import {game,refreshGame,openGameFeature} from './game-runtime.js';
import {BOOK_ICON,OLD_ICON,itemIcon,comma} from './book-frame.js';
import {isPlainItem} from './item-desc.js';
import {BUILDINGS,STAGES,KINDS,TOWN_RULES,stageSlots,stageOf,stageRatio,buildingRatio,ranking,kindFor} from './town-config.js';

// The notebook's 街の発展 page (book list page, see book-pages.js runList). Tabs: the stage under construction,
// 先行納品 (the next building's 基礎), the five buildings and the contribution ranking. Delivering takes the
// matching items from the inventory (only what the stage still needs; the engine refuses the rest).
const TABS=['建設中','先行納品','建築一覧','貢献度'];
const pct=r=>Math.floor(100*r)+'%';
// items of a kind the player carries: {id: n} (plain ones; books and potions may carry enchantments / lore)
function carried(player,kinds){
 const inv=player.getComponent('minecraft:inventory')?.container,out={};
 for(let i=0;inv&&i<inv.size;i++){const it=inv.getItem(i);if(!it)continue;
  const k=kinds.find(k=>KINDS[k].items.includes(it.typeId));if(!k)continue;
  let named=false;try{named=!!it.nameTag;}catch{}
  if(KINDS[k].loose?named:!isPlainItem(it))continue;
  out[it.typeId]=(out[it.typeId]??0)+it.amount;}
 return out;
}
const haveOf=(have,k)=>KINDS[k].items.reduce((a,id)=>a+(have[id]??0),0);
// the building / stage a tab delivers to, or undefined
function targetOf(build,tab){
 const bi=build.index;if(bi>=BUILDINGS.length)return;
 if(tab===0)return {b:bi,s:stageOf(build,bi),target:'current'};
 if(tab===1&&bi+1<BUILDINGS.length&&stageOf(build,bi+1)===0)return {b:bi+1,s:0,target:'next'};
}
const names=()=>game.peek(db=>Object.fromEntries(Object.entries(db.players).map(([id,p])=>[id,p.name])));

export const townModel={
 spec(player,{town},state){
  const build=town.build,bi=build.index,done=bi>=BUILDINGS.length;
  const head=`街 Lv.${town.level}`+(done?'　すべて完成':`　${BUILDINGS[bi].name}`);
  const base={left:'街の発展',tabs:TABS.map(label=>({label})),actions:[],wide:{label:'街の施設（倉庫・市場・休憩など）',enabled:true}};
  if(state.tab<=1){
   const t=targetOf(build,state.tab);
   if(!t)return {...base,right:'納品',summary:head,rows:[{title:state.tab===1?'先行納品できる建築はありません':'すべての共有建築が完成しました',sub:state.tab===1?'次の建築の基礎が満たされたか、最後の建築です':'',icon:OLD_ICON+'town',locked:true}],detail:{}};
   const slots=stageSlots(build,t.b,t.s),have=carried(player,slots.map(v=>v.kind)),ratio=stageRatio(build,t.b,t.s);
   const rows=slots.map(v=>({title:v.name,sub:v.left?`残り ${comma(v.left)}　（${comma(v.got)} / ${comma(v.need)}）`:'必要量に達しました',icon:itemIcon(KINDS[v.kind].items[0],OLD_ICON+'chest'),bar:v.got/v.need,slot:v,have:haveOf(have,v.kind)}));
   const r=rows[Math.min(state.sel,rows.length-1)],v=r.slot,any=rows.some(x=>x.have>0&&x.slot.left>0);
   return {...base,right:`${BUILDINGS[t.b].name}　${STAGES[t.s][0]}`,summary:`${head}　${STAGES[t.s][0]} ${pct(ratio)}`,rows,
    detail:{icon:r.icon,title:v.name,state:v.left?`残り ${comma(v.left)}個`:'必要量に達しました',
     text:`持ち物に ${comma(r.have)}個　1個で貢献度 ${v.points}\n`+(state.tab===1?'次の建築の「基礎」だけ先に納品できます。':`段階：基礎30%→骨組み40%→仕上げ30%`)+'\n必要量を超えた分は受け付けません。',
     bar:v.got/v.need,barText:`${comma(v.got)} / ${comma(v.need)}`,infoLabel:'あなたの貢献度',infoValue:comma(build.contrib?.[player.id]??0),infoIcon:BOOK_ICON+'medal',info2:'通貨の報酬はありません'},
    actions:[{label:'この素材を納品',enabled:r.have>0&&v.left>0,icon:BOOK_ICON+'chest'},{label:'まとめて納品',enabled:any,icon:OLD_ICON+'town'}],t};
  }
  if(state.tab===2){
   const rows=BUILDINGS.map((x,i)=>{const s=stageOf(build,i),r=buildingRatio(build,i);
    return {title:`${i+1}. ${x.name}`,sub:i<bi?'完成':i===bi?`建設中：${STAGES[Math.min(2,s)][0]}（${pct(r)}）`:r>0?`未着工（先行納品 ${pct(r)}）`:'未着工',icon:OLD_ICON+'town',bar:i<bi?1:r,locked:i>bi+1};});
   const x=BUILDINGS[state.sel]??BUILDINGS[0],i=BUILDINGS.indexOf(x),fin=build.done.find(d=>d.index===i);
   return {...base,right:'共有建築',summary:head,rows,
    detail:{icon:OLD_ICON+'town',title:x.name,state:i<bi?'完成':i===bi?'建設中':'未着工',
     text:`完成すると 街 Lv.${i+2}：${x.unlock}\n活躍する職業：${x.jobs}\n完成の合図：${x.finish}`+(fin?`\n完成日 ${new Date(fin.at+9*3600000).toISOString().slice(0,10)}`:''),
     bar:i<bi?1:buildingRatio(build,i),barText:STAGES.map(([n],s)=>`${n} ${pct(stageRatio(build,i,s))}`).join('　'),infoLabel:'街の試練',infoValue:x.trial}};
  }
  const nm=names(),top=ranking(build).slice(0,TOWN_RULES.topList),mine=ranking(build).findIndex(x=>x.id===player.id);
  const rows=top.length?top.map((x,k)=>({title:`${k+1}位　${nm[x.id]??'？'}`,sub:`貢献度 ${comma(x.points)}`,icon:BOOK_ICON+'medal',id:x.id})):[{title:'まだ納品した人はいません',sub:'',icon:BOOK_ICON+'medal',locked:true}];
  const r=rows[Math.min(state.sel,rows.length-1)];
  return {...base,right:'貢献度',summary:`あなた ${comma(build.contrib?.[player.id]??0)}`+(mine>=0?`（${mine+1}位）`:''),rows,
   detail:r.id?{icon:BOOK_ICON+'medal',title:nm[r.id]??'？',state:r.sub,
    text:BUILDINGS.map((x,i)=>build.byBuilding?.[i]?.[r.id]?`${x.name} ${comma(build.byBuilding[i][r.id])}`:'').filter(Boolean).join('　')+'\n貢献度は称号と記念碑の名前表示に使われます。'}:{}};
 },
 async act(player,snap,state,which){
  if(which===2){await openGameFeature(player,'town.open');return;}
  const s=this.spec(player,snap,state),t=s.t;if(!t)return;
  const slots=which===0?[s.rows[Math.min(state.sel,s.rows.length-1)].slot]:s.rows.map(r=>r.slot);
  const have=carried(player,slots.map(v=>v.kind)),list=[];
  for(const v of slots){let left=v.left;for(const id of KINDS[v.kind].items){const n=Math.min(left,have[id]??0);if(n>0){list.push([id,n]);left-=n;}}}
  if(!list.length)return void await noticeDialog(player,'街の発展','納品できる素材を持っていません。',{close:'戻る'});
  const lines=slots.map(v=>{const n=list.filter(([id])=>kindFor(t.b,id)===v.kind).reduce((a,[,n])=>a+n,0);return n?`${v.name} ×${comma(n)}`:'';}).filter(Boolean);
  if(!await confirmDialog(player,'街へ納品',`${BUILDINGS[t.b].name}の${STAGES[t.s][0]}へ納品します。\n${lines.join('\n')}\n\n持ち物から消費します。通貨の報酬はありません。`))return;
  const before=snap.town.build;let message;
  try{message=game.execute(player.id,'town.build',{target:t.target,items:list});refreshGame(player);}
  catch(e){return void await noticeDialog(player,'納品できませんでした',String(e.message??e),{close:'戻る'});}
  announce(player,before,game.snapshot(player.id).town);
  await noticeDialog(player,'街の発展',message,{close:'戻る'});
 }
};
// a finished stage or building is told to everyone
function announce(player,before,town){
 const after=town.build;
 const say=text=>{try{world.sendMessage(text);}catch{}};
 const sound=id=>{for(const p of world.getAllPlayers())try{p.playSound(id);}catch{}};
 if(after.index>before.index){for(let i=before.index;i<after.index;i++)say(`§6【街の発展】${BUILDINGS[i].name}が完成しました！ 街 Lv.${i+2}（${BUILDINGS[i].finish}）`);sound('random.levelup');return;}
 const bi=after.index;if(bi>=BUILDINGS.length)return;
 const s0=stageOf(before,bi),s1=stageOf(after,bi);
 if(s1>s0){say(`§e【街の発展】${BUILDINGS[bi].name}の${STAGES[s0][0]}が完成しました（${player.name}さんの納品で達成）`);sound('random.orb');}
 if(bi+1<BUILDINGS.length&&stageOf(before,bi+1)===0&&stageOf(after,bi+1)>0)say(`§e【街の発展】次の${BUILDINGS[bi+1].name}の基礎が先行納品で揃いました`);
}
