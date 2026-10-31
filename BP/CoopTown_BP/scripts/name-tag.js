import {world,system} from '@minecraft/server';

// The name above each player, as others see it: name / title (when worn; under the name since 2026-10-30) / job and
// CoopTown level.
export const NAME_TAG={checkTicks:20};
/** The name tag text for a player name and their saved data p. */
export function nameTagText(name,p){
 // the job by name: its icon glyph (tried 2026-10-30) took its room in the name tag but was not drawn (chat shows it)
 const job=p?.job&&p.job!=='未選択'?`§b${p.job} `:'§7ニート ';
 const lines=[];
 lines.push(`§f${name}`);
 if(p?.title)lines.push(`§6《${p.title}》`);
 if(p)lines.push(`${job}§eLv.${Math.max(1,Math.floor(Number(p.level)||1))}`);
 return lines.join('\n');
}
export function installNameTags({game}){
 system.runInterval(()=>{
  let get;try{get=id=>game.peek(d=>{const p=d.players[id];return p&&{job:p.job,level:p.level,title:p.title};});}catch{return;}
  for(const player of world.getAllPlayers()){
   try{const text=nameTagText(player.name,get(player.id));if(player.nameTag!==text)player.nameTag=text;}catch{}
  }
 },NAME_TAG.checkTicks);
}
