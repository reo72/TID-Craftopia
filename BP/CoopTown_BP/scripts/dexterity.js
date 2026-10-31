import {buffLeft} from './buffs.js';

// 器用さ (dexterity, asked 2026-10-23): a hand-skill value that grows with handwork and can be raised for a while with
// a potion. It grows with craft XP (forging, repairing, cooking, smoking, brewing...; engine xp(), DEX.rate per XP,
// slower near the top) from DEX.start to DEX.max. 器用さの薬 adds DEX.potion for its time (buff 'dex').
// Effects (kept small): better quality ranks (dexBonus, added to the rank roll's bonus), easier job minigames
// (dexEase), and now and then a repair material saved at the anvil (dexSave).
export const DEX={start:10,max:100,rate:.02,potion:20};
/** Dexterity right now: the saved value plus the potion. */
export function dexOf(player,p){return Math.min(DEX.max+DEX.potion,(p?.dex??DEX.start)+(player&&buffLeft(player,'dex')>0?DEX.potion:0));}
/** Extra chance for the quality roll: up to +0.15 at dexterity 100 (+0.18 with the potion). */
export const dexBonus=dex=>Math.max(0,(dex-DEX.start)/(DEX.max-DEX.start))*.15;
/** Minigame ease from dexterity: 0-0.3 (added to the job level's ease). */
export const dexEase=dex=>Math.max(0,(dex-DEX.start)/(DEX.max-DEX.start))*.3;
/** Chance that one repair material is saved: up to 20 %. */
export const dexSave=dex=>Math.max(0,(dex-DEX.start)/(DEX.max-DEX.start))*.2;
/** Engine side: craft XP grows dexterity (fractions kept). */
export function growDex(p,xp){
 p.dex??=DEX.start;if(p.dex>=DEX.max)return 0;
 p.dexFrac=(p.dexFrac??0)+xp*DEX.rate*(1-.8*p.dex/DEX.max);
 const g=Math.floor(p.dexFrac+1e-9);if(g>0){p.dex=Math.min(DEX.max,p.dex+g);p.dexFrac-=g;}
 return g;
}
/** Runtime: tells a player on the right-hand log when their dexterity went up (checked every 2 seconds). */
export function installDexWatch({game,world,system,pushText}){
 const last=new Map();
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   let dex;try{dex=game.peek(d=>d.players[player.id]?.dex);}catch{}
   if(typeof dex!=='number')continue;
   const was=last.get(player.id);last.set(player.id,dex);
   if(was!==undefined&&dex>was)try{pushText(player,'dex',`§d器用さ +${dex-was}（今 ${dex}）`);}catch{}
  }
 },40);
 world.afterEvents.playerLeave.subscribe(({playerId})=>last.delete(playerId));
}
