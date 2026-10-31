import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {system} from '@minecraft/server';
import {buffLeft,FOCUS_SCALE} from './buffs.js';

// The forging minigame (asked 2026-10-23, the user's mockup; RP tools/build-forge-ui.mjs, form title "ct:forge"):
// three stages 1 加熱 → 2 打撃 → 3 冷却. Each round shows how the metal looks; the strength that matches it (弱く /
// 普通 / 強く; written 打つ: the pixel font has no 叩), chosen within the round's time, scores. 加熱 has 1 round, 打撃 FORGE.hits rounds (the hammers light up),
// 冷却 1 round. The same sign always means the same answer, so players learn them. 中断 gives up (nothing is made).
// The job level and 器用さ (ease 0-1) give more time; 集中薬 a little more. A form cannot tick by itself, so the time
// left shown is the time when the round opened.
export const FORGE={hits:3,baseSeconds:6,easeSeconds:5};
// Button order of the screen (keep in step with build-forge-ui.mjs): state marks, timer, hit count, hint, three
// choices, 中断
export const FORGE_BUTTONS=['state','timer','count','hint','weak','normal','strong','stop'];
export const STAGES=[
 {name:'加熱',choices:['弱火','中火','強火'],ask:'火の強さを選ぼう',
  signs:[['白っぽく光っている',0],['オレンジ色に光っている',1],['暗い赤色をしている',2]]},
 {name:'打撃',choices:['弱く打つ','普通に打つ','強く打つ'],ask:'打つ強さを選ぼう',
  signs:[['形がほとんどできている',0],['金属がやわらかい',1],['金属がまだ固い',2]]},
 {name:'冷却',choices:['ゆっくり冷ます','普通に冷ます','一気に冷ます'],ask:'冷まし方を選ぼう',
  signs:[['急ぐと割れそうだ',0],['形が整っている',1],['刃をしっかり固めたい',2]]}];
/** Seconds a round allows at an ease (0-1) and with / without 集中薬. */
export const roundSeconds=(ease=0,focus=false)=>Math.round((FORGE.baseSeconds+FORGE.easeSeconds*Math.max(0,Math.min(1,ease)))*(focus?FOCUS_SCALE:1)*10)/10;
/** The rounds of a game: [{stage, sign}] (sign index into the stage's signs). */
export function roundsOf(random=Math.random){
 const pick=st=>Math.floor(random()*STAGES[st].signs.length);
 return [{stage:0,sign:pick(0)},...Array.from({length:FORGE.hits},()=>({stage:1,sign:pick(1)})),{stage:2,sign:pick(2)}];
}
/** The form's buttons for a round. hits: rounds of 打撃 done so far; spark: the last hit was right. */
export function forgeButtons({stage,sign},{hits=0,spark=false,seconds}){
 const st=STAGES[stage],marks=`[s${stage+1}]`+(stage>0?'[d1]':'')+(stage>1?'[d2]':'')+Array.from({length:hits},(_,k)=>`[h${k+1}]`).join('')+(spark?'[sp]':'');
 const icon=`[i${stage+1}]`;
 return [marks,`§r${Math.ceil(seconds)}秒`,stage===1?`§r打撃 ${hits} / ${FORGE.hits}`:'',`${st.signs[sign][0]}　${st.ask}`,
  ...st.choices.map(c=>icon+c),'中断'];
}
async function show(player,form){
 for(let busy=0;;busy++){
  const r=await form.show(player);
  if(r.canceled&&r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(res=>system.runTimeout(res,10));continue;}
  return r;
 }
}
/** Plays the game. Resolves to the share of rounds done right (0-1), or null when given up (中断 / closed). */
export async function playForge(player,{ease=0,random=Math.random,now=()=>Date.now()}={}){
 const rounds=roundsOf(random),limit=roundSeconds(ease,buffLeft(player,'focus')>0)*1000;
 let good=0,hits=0,spark=false;
 for(const round of rounds){
  const form=new ActionFormData().title('ct:forge').body('');
  for(const t of forgeButtons(round,{hits,spark,seconds:limit/1000}))form.button(t);
  const start=now(),r=await show(player,form);
  if(r.canceled||r.selection===7)return null;
  const choice=r.selection-4;if(choice<0||choice>2)return null;
  const right=choice===STAGES[round.stage].signs[round.sign][1]&&now()-start<=limit;
  if(right)good++;
  if(round.stage===1){hits++;spark=right;}else spark=false;
  try{player.playSound(round.stage===1?(right?'random.anvil_land':'random.anvil_use'):round.stage===0?'fire.ignite':'random.fizz',{pitch:right?1.2:.8,volume:.6});}catch{}
 }
 return good/rounds.length;
}
