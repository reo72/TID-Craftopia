import {world,system} from '@minecraft/server';

// Fireworks for achievements: when a player gets a title or a level (the player level or a skill: 採掘 / 採取 /
// クラフト), a few rockets of light rise over them and burst, with the firework sounds, and the players nearby get a
// chat line. Only particles and sounds: nothing is hurt or set on fire. Levels are watched every 2 seconds (they rise
// in many places in the game engine), titles come from the engine's onTitles.
export const NEAR=32;
const SKILLS=[['level','Lv'],['mine','採掘'],['gather','採取'],['craft','クラフト']];
const BURSTS={title:['minecraft:totem_particle','minecraft:villager_happy'],level:['minecraft:totem_particle','minecraft:electric_spark_particle']};
/** The levels a saved player has: {level, mine, gather, craft}. */
export const levelsOf=p=>Object.fromEntries(SKILLS.map(([k])=>[k,k==='level'?(p?.level??1):(p?.[k]?.level??1)]));
/** What went up between two level records: [[key, new level]]. */
export const levelUps=(before,after)=>SKILLS.map(([k])=>k).filter(k=>before&&after[k]>before[k]).map(k=>[k,after[k]]);
export function fireworks(player,kind='level',rockets=3){
 const dim=player.dimension,base=player.location;
 for(let r=0;r<rockets;r++){
  const off={x:(Math.random()-.5)*4,z:(Math.random()-.5)*4},start=r*12;
  // the rocket's trail rising, then the burst in a ring and the bang
  for(let k=0;k<8;k++)system.runTimeout(()=>{try{dim.spawnParticle('minecraft:basic_flame_particle',{x:base.x+off.x,y:base.y+1+k*.9,z:base.z+off.z});}catch{}},start+k);
  system.runTimeout(()=>{
   const top={x:base.x+off.x,y:base.y+9,z:base.z+off.z};
   try{dim.playSound('firework.blast',top,{volume:2});dim.playSound('firework.twinkle',top,{volume:1.5});}catch{}
   for(let a=0;a<12;a++){const t=a/12*Math.PI*2;for(const [i,id] of BURSTS[kind].entries())try{dim.spawnParticle(id,{x:top.x+Math.cos(t)*(1.5+i),y:top.y+Math.sin(t)*.8,z:top.z+Math.sin(t)*(1.5+i)});}catch{}}
  },start+8);
  system.runTimeout(()=>{try{dim.playSound('firework.launch',{x:base.x+off.x,y:base.y+1,z:base.z+off.z});}catch{}},start);
 }
}
function tellNearby(player,text){
 for(const o of world.getAllPlayers())if(o.dimension.id===player.dimension.id&&Math.hypot(o.location.x-player.location.x,o.location.z-player.location.z)<=NEAR)try{o.sendMessage(text);}catch{}
}
export function installCelebrate({game}){
 const seen=new Map();
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   let p;try{p=game.peek(d=>d.players[player.id]);}catch{}if(!p)continue;
   const now=levelsOf(p),ups=levelUps(seen.get(player.id),now);seen.set(player.id,now);
   if(!ups.length)continue;
   fireworks(player,'level',Math.min(5,2+ups.length));
   const label=([k,v])=>(k==='level'?'':SKILLS.find(s=>s[0]===k)[1]+' ')+'Lv.'+v;
   tellNearby(player,`§e${player.name}が ${ups.map(label).join('・')} になりました！`);
  }
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>seen.delete(playerId));
 return {title:(player,names)=>{fireworks(player,'title',4);tellNearby(player,`§6${player.name}が称号「${names.join('」「')}」を獲得しました！`);}};
}

// One way to celebrate everywhere (asked 2026-10-27: the effects of each system were each their own): small (a
// pling and sparkles, the player only), medium (the level-up sound and totem sparkles, title text) and big
// (fireworks and a chat line to everyone near). text: what happened.
export const CHEER={small:{sound:'random.orb',pitch:1.4,particle:'minecraft:villager_happy',n:6},
 medium:{sound:'random.levelup',pitch:1.1,particle:'minecraft:totem_particle',n:14},big:{sound:'random.totem',pitch:1,particle:'minecraft:totem_particle',n:24}};
export function cheer(player,level='small',text=''){
 const c=CHEER[level]??CHEER.small;
 try{player.playSound(c.sound,{pitch:c.pitch,volume:.7});}catch{}
 const l=player.location;for(let i=0;i<c.n;i++)try{player.dimension.spawnParticle(c.particle,{x:l.x+(Math.random()-.5)*1.4,y:l.y+.5+Math.random()*1.6,z:l.z+(Math.random()-.5)*1.4});}catch{}
 if(level==='small'){if(text)try{player.onScreenDisplay.setActionBar(text);}catch{}return;}
 if(level==='medium'){if(text)try{player.onScreenDisplay.setTitle('§r',{subtitle:text,fadeInDuration:5,stayDuration:40,fadeOutDuration:10});}catch{}return;}
 fireworks(player,'title',3);if(text)tellNearby(player,text);
}
