import {system} from '@minecraft/server';

// The fishing minigame (asked): keep the fish inside the green frame by reeling, without breaking the line.
// Reeling = holding sneak (forms cannot tell a held button; sneaking can be read every tick, also on phones).
//  holding: the frame moves right, the line tension rises     released: the frame drifts left, the line slackens
//  fish inside the frame: the catch gauge fills               outside: it drains a little
// Success: catch gauge 100 %. Failure: tension 100 % (the line breaks) or the time runs out.
// Common fish move slowly; rare and legendary ones are faster and turn suddenly.
// Drawn every tick on the HUD panel (RP fishingBox) through action bar marks; the minimap pauses its own action bar
// meanwhile (minimap.js mapPaused). Switching away from the fishing rod gives up ('quit').
// Difficulty (asked 2026-10-23): a little harder overall, and easier as the player's job level rises: the frame gets
// wider in three steps (frames, by FRAME_LEVELS), and up to EASE_LEVEL the fish slows, the line tightens slower and
// the gauge fills faster (ease 0-1).
export const REEL={width:100,frame:30,frames:[24,30,36],cells:30,seconds:45,startGauge:25,brake:.25,drawEvery:2,resendTicks:10,
 // per rank: fish speed, chance per tick of a sudden turn, gauge gain inside / loss outside, tension per tick held
 // (2026-10-30, asked "a bit easier": slower fish, fewer turns, faster gauge, slower line, more time, a fuller start)
 ranks:[{speed:.4,turn:.003,gain:1.1,loss:.2,tension:1},{speed:.7,turn:.012,gain:.95,loss:.25,tension:1.1},{speed:.95,turn:.025,gain:.85,loss:.3,tension:1.2}]};
export const FRAME_LEVELS=[10,25],EASE_LEVEL=50;
/** Frame size step (0 narrow, 1, 2 wide) and ease (0-1) for a job level. */
export const frameStep=level=>FRAME_LEVELS.filter(l=>level>=l).length;
export const easeOf=level=>clamp((level-1)/(EASE_LEVEL-1),0,1);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** A new game state for a fish of rank r. */
export function newReel(rank=0,random=Math.random,level=1,extraEase=0){
 const fv=frameStep(level),frame=REEL.frames[fv];
 // extraEase: from 器用さ (dexterity.js dexEase)
 return {rank,level,fv,frame,ease:Math.min(1,easeOf(level)+extraEase),fish:REEL.width*(.3+random()*.4),fishV:0,target:random()*REEL.width,x:(REEL.width-frame)/2,v:0,tension:0,gauge:REEL.startGauge,tick:0,inside:0};
}
/** One tick: held = sneaking. Returns 'win', 'snap', 'timeout' or undefined (still playing). */
export function stepReel(s,held,random=Math.random){
 const B=REEL.ranks[s.rank]??REEL.ranks[0],e=s.ease??0,F=s.frame??REEL.frame;s.tick++;
 const R={...B,speed:B.speed*(1-.25*e),tension:B.tension*(1-.3*e),gain:B.gain*(1+.3*e)};
 // fish: heads for a target that changes now and then; big fish sometimes turn round at once
 if(random()<R.turn||Math.abs(s.target-s.fish)<2)s.target=random()*REEL.width;
 if(s.rank>0&&random()<R.turn){s.fishV=-s.fishV*1.5;}
 s.fishV=clamp(s.fishV+Math.sign(s.target-s.fish)*R.speed*.25,-R.speed*2,R.speed*2);
 s.fish=clamp(s.fish+s.fishV,0,REEL.width);if(s.fish===0||s.fish===REEL.width)s.fishV=0;
 // frame: pushed right while reeling, falls back left when let go. Turning round brakes at once (2026-10-30: from
 // full speed it took about 13 ticks to change direction, which felt like the sneak was late)
 if(held?s.v<0:s.v>0)s.v*=REEL.brake;
 s.v=clamp(s.v+(held?.45:-.45),-3,3);s.x=clamp(s.x+s.v,0,REEL.width-F);if(s.x===0||s.x===REEL.width-F)s.v=0;
 s.tension=clamp(s.tension+(held?R.tension:-3),0,100);
 const inside=s.fish>=s.x&&s.fish<=s.x+F;if(inside)s.inside++;
 s.gauge=clamp(s.gauge+(inside?R.gain:-R.loss),0,100);
 if(s.gauge>=100)return 'win';
 if(s.tension>=100)return 'snap';
 if(s.tick>=REEL.seconds*20)return 'timeout';
}
// the HUD panel (RP build-hud-log.mjs fishingBox, FUI): one character per value after "ctfsh:"
// zones: the frame's place marks for each frame size (narrow / middle / wide)
export const FISH_UI={x0:0x100,f0:0x120,g0:0x140,t0:0x160,hold:0x180,steps:30,gsteps:20,zones:[0x1C0,0x120,0x1E0]};
/** The panel marks for a state: fish place, frame place (0-29), gauge and tension (0-20), reeling. */
export function reelMarks(s,held){
 const U=FISH_UI,c=n=>String.fromCodePoint(n),st=U.steps-1;
 const F=s.frame??REEL.frame,fish=Math.round(s.fish/REEL.width*st),frame=Math.round(s.x/(REEL.width-F)*st);
 return c(U.x0+fish)+c(U.zones[s.fv??1]+frame)+c(U.g0+Math.round(s.gauge/100*U.gsteps))+c(U.t0+Math.round(s.tension/100*U.gsteps))+(held?c(U.hold):'');
}
const bar=(pct,n,on,off='§8')=>{const k=Math.round(pct/100*n);return on+'|'.repeat(k)+off+'|'.repeat(n-k);};
/** The action bar text for a state. */
export function drawReel(s,name='？？？'){
 const n=REEL.cells,cell=REEL.width/n,fishAt=Math.min(n-1,Math.floor(s.fish/cell)),a=Math.floor(s.x/cell),b=Math.min(n-1,Math.floor((s.x+(s.frame??REEL.frame))/cell));
 let track='';for(let i=0;i<n;i++)track+=i===fishAt?'§6§lO§r':(i>=a&&i<=b?'§a|':'§8|');
 const left=Math.max(0,Math.ceil(REEL.seconds-s.tick/20));
 return `§e§l魚がかかった！§r §7${name}  残り${left}秒\n§8[${track}§8]\n§f釣り上げ ${bar(s.gauge,15,'§a')} §f${Math.floor(s.gauge)}%   §f糸の張り ${bar(s.tension,15,s.tension>75?'§c':'§6')} §f${Math.floor(s.tension)}%\n§7しゃがみ長押しで巻く・離して緩める`;
}
/** Plays the game with a player; resolves to {ok, result, score (0-1: time the fish stayed in the frame)}. */
export function playReel(player,rank=0,{name,onStart,onEnd,stats=()=>'',level=1,extraEase=0}={}){
 return new Promise(resolve=>{
  const s=newReel(rank,Math.random,level,extraEase);onStart?.();
  const sound=(id,pitch=1,volume=.6)=>{try{player.playSound(id,{pitch,volume});}catch{}};
  sound('random.splash',1.2,.8); // the bite
  let wasInside=false,lastSplash=0,lastText='',lastSent=0,lastHeld=false;
  // sounds while playing: the reel clicks while reeling (faster on bigger fish), a soft ding when the fish comes into the
  // frame, the line creaks when tension is high, the fish splashes now and then (more often for bigger fish)
  const playSounds=(s,held)=>{
   if(held&&s.tick%3===0)sound('random.click',1.6+s.rank*.1,.25);
   const inside=s.fish>=s.x&&s.fish<=s.x+s.frame;if(inside&&!wasInside)sound('note.hat',1.8,.5);wasInside=inside;
   if(s.tension>75&&s.tick%6===0)sound('random.bow',.5+s.tension/400,.4);
   if(s.tick-lastSplash>[50,35,22][s.rank]&&Math.random()<.08){lastSplash=s.tick;sound('random.splash',1.4,.35);}
   if(s.gauge>=85&&s.tick%10===0)sound('note.pling',1.2+s.gauge/200,.3); // almost landed
  };
  const id=system.runInterval(()=>{
   let r;
   if(!player.isValid){r='timeout';}
   else{
    // 「やめる」: switching away from the fishing rod gives up
    let rod=true;try{rod=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex)?.typeId==='minecraft:fishing_rod';}catch{}
    const held=!!player.isSneaking;r=rod?stepReel(s,held):'quit';
    if(!r)playSounds(s,held);
    // every other tick (the game itself still runs every tick), at once when the sneak key changes: every action bar
    // message rebuilds the whole HUD box on the client, and 20 a second made the game lag behind the key (2026-10-30)
    const text=r?'ctmap:'+stats():'ctfsh:'+stats()+reelMarks(s,held);
    if(r||held!==lastHeld||(s.tick%REEL.drawEvery===0&&text!==lastText)||s.tick-lastSent>=REEL.resendTicks){try{player.onScreenDisplay.setActionBar(text);}catch{}lastText=text;lastSent=s.tick;}
    lastHeld=held;
   }
   if(r){system.clearRun(id);onEnd?.();resolve({ok:r==='win',result:r,score:s.tick?s.inside/s.tick:0});}
  },1);
 });
}
