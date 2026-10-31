import {world,system} from '@minecraft/server';
import {announce} from './hud-channel.js';

// The final-day awards (design: イベント｜最終日イベント): the season's records by category, top five each, points 5-1, the
// most points overall wins the grand prize. Each first place gets the category's commemorative title. Announced by
// staff with /cooptown:awards (titles on screen and chat, one category at a time). Records: the players' lifetime
// counters (p.tally, title-hooks.js and the job features) and stats. 死んで落としたお金 is left out: money is not lost
// on death here. ネタ枠 (show: 'neta') can be announced without names (/cooptown:awards の引数).
const t=(p,k)=>Number.isSafeInteger(p.tally?.[k])?p.tally[k]:0;
const sumOf=(p,re)=>Object.entries(p.tally??{}).reduce((a,[k,v])=>a+(re.test(k)&&Number.isSafeInteger(v)?v:0),0);
const km=m=>`${(m/1000).toFixed(1)}km`,hours=s=>`${Math.floor(s/3600)}時間${Math.floor(s%3600/60)}分`;
export const AWARDS=[
 // 定番
 ['standard','一番多く死んだ人','不死身の反対',p=>t(p,'deaths'),n=>`${n}回`],
 ['standard','一番遠くまで歩いた人','歩く地図',p=>t(p,'walk_m'),km],
 ['standard','一番長くログインしていた人','ここに住んでる',p=>t(p,'play_s'),hours],
 ['standard','一番多くブロックを壊した人','解体業者',p=>t(p,'broken'),n=>`${n}個`],
 ['standard','一番多くブロックを置いた人','大工',p=>t(p,'placed'),n=>`${n}個`],
 ['standard','一番多く食べた人','フードファイター',p=>t(p,'eaten'),n=>`${n}個`],
 ['standard','一番多くモブを倒した人','サーバーの用心棒',p=>t(p,'kills'),n=>`${n}体`],
 ['standard','一番長く泳いだ人','人間イルカ',p=>t(p,'swim_m'),km],
 ['standard','一番多くジャンプした人','バッタ',p=>t(p,'jumps'),n=>`${n}回`],
 ['standard','一番多くデイリーを達成した人','皆勤賞（番外）',p=>Number(p.stats?.dailies)||0,n=>`${n}回`],
 // 職業ネタ
 ['job','一番多く魚を釣った人','漁師町の顔',p=>t(p,'j:fish'),n=>`${n}匹`],
 ['job','一番大きい魚を釣った人','うちのサーバーのヌシ',p=>t(p,'fish_max_cm'),n=>`${n}cm`],
 ['job','一番多く収穫した人','豊作の神様',p=>t(p,'j:harvest'),n=>`${n}回`],
 ['job','一番多く精錬した人','炉の番人',p=>t(p,'j:smelt'),n=>`${n}個`],
 ['job','NPCに一番多く売った人','商売繁盛',p=>t(p,'npc_coins'),n=>`${n}コイン`],
 ['job','一番多くガチャを回した人','沈められた人',p=>t(p,'gacha'),n=>`${n}回`],
 ['job','一番多く料理を作った人','食堂の主',p=>t(p,'j:cook'),n=>`${n}個`],
 ['job','一番多く鉱石を掘った人','鉱山王',p=>sumOf(p,/^ore:/),n=>`${n}個`],
 ['job','一番多く木を伐った人','きこりの泉',p=>t(p,'log'),n=>`${n}本`],
 ['job','一番多く依頼を達成した人','何でも屋',p=>Number(p.stats?.questsCompleted)||0,n=>`${n}回`],
 // ネタ枠
 ['neta','一番多く溶岩で死んだ人','マグマダイバー',p=>t(p,'death:fire'),n=>`${n}回`],
 ['neta','クリーパーに一番愛された人','爆発は芸術だ',p=>t(p,'death:creeper'),n=>`${n}回`],
 ['neta','一番多く動物を繁殖させた人','ブリーダー王',p=>t(p,'bred'),n=>`${n}回`],
 ['neta','一番チャットした人','拡声器',p=>t(p,'chat'),n=>`${n}回`],
 ['neta','一番多く寝た人','眠れる森の住人',p=>t(p,'sleeps'),n=>`${n}回`],
 ['neta','一番多くゴミを釣った人','海のボランティア',p=>t(p,'junk_fish'),n=>`${n}個`],
 ['neta','一番多く落下で死んだ人','重力に負けた人',p=>t(p,'death:fall'),n=>`${n}回`],
 ['neta','一番多く溺れた人','エラ呼吸失敗',p=>t(p,'death:drowning'),n=>`${n}回`],
 ['neta','一番多く道具を壊した人','物を大事にしない人',p=>t(p,'tools_broken'),n=>`${n}個`]
].map(([group,name,title,value,fmt])=>({group,name,title,value,fmt}));
export const POINTS=[5,4,3,2,1];
/** The results: per category the top five [{id, name, value}] (0 does not rank; ties: the earlier saved record first),
 *  and the totals with the order (points, then the count of 1sts, 2nds ...). */
export function computeAwards(players){
 const list=Object.entries(players??{}).map(([id,p])=>({id,p}));
 const totals={};
 const results=AWARDS.map(a=>{
  const ranked=list.map(({id,p})=>({id,name:p.name??'?',value:a.value(p),at:p.savedAt??0})).filter(x=>x.value>0).sort((x,y)=>y.value-x.value||x.at-y.at).slice(0,POINTS.length);
  ranked.forEach((x,i)=>{const r=totals[x.id]??={id:x.id,name:x.name,points:0,places:[0,0,0,0,0]};r.points+=POINTS[i];r.places[i]++;});
  return {...a,ranked};
 });
 const order=Object.values(totals).sort((x,y)=>y.points-x.points||x.places.reduce((d,_,i)=>d||y.places[i]-x.places[i],0));
 return {results,order};
}
/** Announces the awards (titles + chat, one category every `everyTicks`) and gives each first place their title. */
export function announceAwards(game,{everyTicks=160,hideNeta=false}={}){
 let db;try{db=game.peek(d=>d.players);}catch{return 'データを読めませんでした。';}
 const {results,order}=computeAwards(db);
 const say=text=>{try{world.sendMessage(text);}catch{}};
 const title=(main,sub)=>{for(const p of world.getAllPlayers())try{announce(p,main,sub,5000);p.playSound('random.levelup',{pitch:1.2,volume:.6});}catch{}};
 const steps=[()=>{title('§6最終日アワード','シーズンの記録を発表します');say('§6§l===== 最終日アワード =====');}];
 const GROUP={standard:'定番',job:'職業ネタ',neta:'ネタ枠'};
 for(const r of results){
  steps.push(()=>{
   const hidden=hideNeta&&r.group==='neta',name=x=>hidden?'？？？':x.name;
   if(!r.ranked.length){say(`§e【${GROUP[r.group]}】${r.name}：§7記録なし`);return;}
   const top=r.ranked[0];title(`§e${r.name}`,`1位 ${name(top)}（${r.fmt(top.value)}）`);
   say(`§e【${GROUP[r.group]}】${r.name}\n`+r.ranked.map((x,i)=>`§f${i+1}位 ${name(x)}　${r.fmt(x.value)}　§7+${POINTS[i]}pt`).join('\n'));
   try{game.execute(top.id,'title.grant',{title:r.title});}catch{}
   if(order.length)say('§7現在の合計：'+computeRunning(results,results.indexOf(r)).slice(0,3).map(x=>`${x.name} ${x.points}pt`).join(' / '));
  });
 }
 steps.push(()=>{const w=order[0];if(!w){say('§7記録がありませんでした。');return;}
  title('§6豪華賞品は…',`§e${w.name}（${w.points}pt）`);say(`§6§l合計ポイント1位：${w.name}（${w.points}pt）おめでとう！`);});
 steps.forEach((f,i)=>system.runTimeout(()=>{try{f();}catch(e){console.warn('[CoopTown] アワード: '+e);}},i*everyTicks));
 return `§a最終日アワードを発表します（${results.length}部門・約${Math.ceil(steps.length*everyTicks/20/60)}分）。`;
}
// the totals after the first k+1 categories (shown between categories)
function computeRunning(results,k){
 const totals={};for(const r of results.slice(0,k+1))r.ranked.forEach((x,i)=>{(totals[x.id]??={name:x.name,points:0}).points+=POINTS[i];});
 return Object.values(totals).sort((a,b)=>b.points-a.points);
}
