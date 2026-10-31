import {world,system} from '@minecraft/server';
import {ITEM_GLYPHS} from './item-glyphs.js';
import {JOB_ICON} from './book-frame.js';

// Job icons in chat: the chat itself is rewritten by the separate CoopTown チャット BP (it needs the beta chat event,
// this pack stays on the stable API). Packs cannot read each other's saved data, so this pack puts each player's job
// icon (a text icon on the font pages, tools/build-item-icons.py) on the player as a tag, "ctjobicon:<icon>";
// the chat pack reads it. No job: no tag.
export const ICON_TAG='ctjobicon:';
export const jobIcon=job=>ITEM_GLYPHS['cooptown:job_'+JOB_ICON[job]]??'';
export function installChat({game}){
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   let job;try{job=game.peek(d=>d.players[player.id]?.job);}catch{}
   const want=jobIcon(job)?ICON_TAG+jobIcon(job):'';
   let tags=[];try{tags=player.getTags().filter(t=>t.startsWith(ICON_TAG));}catch{}
   if(tags.length===1&&tags[0]===want)continue;
   for(const t of tags)try{player.removeTag(t);}catch{}
   if(want)try{player.addTag(want);}catch{}
  }
 },40);
}
