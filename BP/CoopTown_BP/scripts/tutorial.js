import {world,system} from '@minecraft/server';

// The first steps of a job (asked 2026-10-27): the first time a player has a job (main or second), its three basics
// come as titles and chat lines a few seconds apart. Done jobs are kept on the player (TUT_KEY).
export const TUT_KEY='cooptown:tutorial';
export const TUTORIALS={
 '農家':['作物を育てて収穫すると、ランク（D〜S）が付きます','ジョーロで水やりすると育ちが早く、ランクも上がりやすい','飼育台で動物を登録して世話すると、とれる物の質が上がります'],
 '釣り師':['釣り竿で釣ると、リールのミニゲームで魚を釣り上げます','しゃがんで釣り竿を使うと釣り図鑑。餌を選べます','魚籠を持っていると、釣った魚が自動で入ります'],
 '鍛冶師':['溶鉱炉で精錬、金床で鍛造（ミニゲーム）をします','鍛造の点数が高いほど、装備のランクと性能が上がります','鍛冶ハンマーで、仲間の装備をその場で直せます'],
 '料理人':['かまどで料理を作ると、ランク付きの料理になります','食べ物には期限があります。保冷バッグで長持ち','料理人の包丁で動物を倒すと、肉が多くとれます'],
 '調合師':['醸造台でポーションを作ります。大釜の実験で新しいレシピ','ポーションは手帳の称号やデイリーにもつながります','薬草ナイフで草や花から薬草がとれます'],
 '付与術師':['エンチャント台で装備を強化します','ルーンを書いて、装備に特別な効果を刻めます','魔力のルーペで、仲間の装備を鑑定できます'],
 '冒険家':['製図台で毎日の調査依頼を受けて、報告書を出すと報酬がもらえます','強い敵モブ（強い・精鋭・強敵）を倒すと、冒険家はコインと経験値が2倍','地図ピンで場所を3つ記録して、方角と距離を確認できます'],
 '鉱夫':['しゃがんでツルハシで鉱石を掘ると、つながった鉱石をまとめて掘れます（鉱脈掘り）','/cooptown:tanchi か、しゃがんでツルハシを使うと近くの鉱石を探知できます','砥石で鉱石を選別すると、ランクが付きます'],
 '木こり':['しゃがんで斧で原木を切ると、木をまとめて伐れます（一括伐採）','製材台（石切台）で板材・階段・木炭を作れます','木こりの植林袋を持っていると、伐った所に苗木を植えます']};
const doneOf=player=>{try{const v=JSON.parse(player.getDynamicProperty(TUT_KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}};
/** The jobs whose first steps a player still has to see. */
export const pendingTutorials=(p,done)=>[p?.job,p?.secondJob].filter(j=>TUTORIALS[j]&&!done.includes(j));
export function installTutorial({game}){
 const busy=new Set();
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   if(busy.has(player.id))continue;
   let p;try{p=game.peek(d=>d.players[player.id]);}catch{continue;}
   const done=doneOf(player),job=pendingTutorials(p,done)[0];if(!job)continue;
   busy.add(player.id);try{player.setDynamicProperty(TUT_KEY,JSON.stringify([...done,job]));}catch{}
   TUTORIALS[job].forEach((text,i)=>system.runTimeout(()=>{
    try{player.onScreenDisplay.setTitle(`§e${job}のはじめかた ${i+1}/3`,{subtitle:text,fadeInDuration:5,stayDuration:90,fadeOutDuration:10});
     player.sendMessage(`§e【${job}のはじめかた ${i+1}/3】§f${text}`);player.playSound('random.orb',{pitch:1+i*.2,volume:.5});}catch{}
    if(i===2)busy.delete(player.id);
   },40+i*120));
  }
 },100);
}
