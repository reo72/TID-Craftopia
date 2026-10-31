import {dialog} from './dialog.js';
import {buffLeft,FOCUS_SCALE} from './buffs.js';

// Short choice minigames for the job screens (Notion: forging 加熱・打撃・冷却, cooking 火加減・仕上げ, fishing
// 引き上げ). A form cannot move on its own, so each stage shows a sign (how the metal glows, how the pot sounds, how
// the line pulls) and three choices; the one that matches the sign, chosen within STAGE_MS, scores. Missing never
// fails the work: the result only adds to the quality chance. The same sign always means the same answer, so players
// learn them.
export const STAGE_MS=6000;
export const GAMES={
 forge:{title:'鍛造',stages:[
  {name:'加熱',choices:['弱く','ちょうど','強く'],signs:['暗い赤色に光っている','オレンジ色に光っている','白っぽく光っている'],answers:[2,1,0]},
  {name:'打撃',choices:['軽く','しっかり','連打'],signs:['金属がまだ固い','金属がやわらかい','形がほとんどできている'],answers:[1,2,0]},
  {name:'冷却',choices:['水','油','そのまま'],signs:['刃物を作っている','鎧を作っている','急ぐと割れそうだ'],answers:[0,1,2]}]},
 cook:{title:'調理',stages:[
  {name:'火加減',choices:['弱火','中火','強火'],signs:['鍋がぐつぐつ言っている','鍋が静かだ','焦げたにおいがしてきた'],answers:[1,2,0]},
  {name:'仕上げ',choices:['塩をふる','ハーブを添える','そのまま'],signs:['香りが物足りない','味が薄い','いい香りがしている'],answers:[1,0,2]}]},
 fish:{title:'引き上げ',stages:[
  {name:'引き',choices:['竿を立てる','糸をゆるめる','一気に巻く'],signs:['魚が暴れている','糸が切れそうだ','魚が疲れてきた'],answers:[0,1,2]}]}};
/** Plays a minigame; resolves to the share of stages done right (0-1). random picks the signs. */
export async function playMinigame(player,key,{random=Math.random,now=()=>Date.now()}={}){
 const g=GAMES[key];let good=0;
 const limit=STAGE_MS*(buffLeft(player,'focus')?FOCUS_SCALE:1); // 集中薬: a little more time
 for(const [n,st] of g.stages.entries()){
  const sign=Math.floor(random()*st.signs.length),start=now();
  const i=await dialog(player,{title:`${g.title}　${n+1} / ${g.stages.length}：${st.name}`,body:`${st.signs[sign]}\n§7（${Math.round(limit/100)/10}秒以内に選ぶ）`,buttons:st.choices.map(text=>({text,style:'btn'}))});
  if(i===undefined)return good/g.stages.length; // closed: what was done so far
  if(i===st.answers[sign]&&now()-start<=limit)good++;
 }
 return good/g.stages.length;
}
/** A minigame score as a quality bonus (quality.js rollQuality). */
export const scoreBonus=score=>Math.round(score*40)/100;
