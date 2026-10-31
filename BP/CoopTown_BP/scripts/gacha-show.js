import {system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {GACHA_PRIZES,RARITY_NAMES} from './gacha-config.js';
import {itemIcon,BOOK_ICON} from './book-frame.js';

// The chest opening after a gacha draw (asked 2026-10-31, the user's pictures; RP tools/build-gacha-ui.mjs). The draw is
// done and the prizes are given before this shows, so skipping, closing or leaving changes nothing. Form "ct:gacha" plays
// the animation; the button under the chest skips it during SHOW_MS (the form "ct:gacha_end" stands at the end) and
// closes it after.
export const SHOW_MS=3300,GACHA_BUTTONS=['mark','name','prize','best','unused','done',...Array.from({length:10},(_,k)=>'prize'+k)];
const P='ct:gs|',RANK=['C','R','E','L'],COLOR={C:'§0',R:'§1',E:'§5',L:'§6'},MARK={E:'[gE]',L:'[gL]'};
const BY_NAME=Object.fromEntries(Object.entries(RARITY_NAMES).map(([k,v])=>[v,k]));
// prizes without a CoopTown icon: the game's own pictures (checked in the game's texture list, 2026-11-01)
const I='textures/items/',B='textures/blocks/',M='minecraft:';
const VANILLA_ICON={[M+'brick_block']:B+'brick',[M+'stone_bricks']:B+'stonebrick',[M+'lantern']:I+'lantern',[M+'shulker_shell']:I+'shulker_shell',
 [M+'blue_dye']:I+'dye_powder_blue',[M+'green_dye']:I+'dye_powder_green',[M+'red_dye']:I+'dye_powder_red',[M+'purple_dye']:I+'dye_powder_purple',[M+'pink_dye']:I+'dye_powder_pink',
 [M+'white_glazed_terracotta']:B+'glazed_terracotta_white',[M+'quartz_block']:B+'quartz_block_top',[M+'banner']:I+'banner_pattern'};
const ALL_PRIZES=Object.values(GACHA_PRIZES).flatMap(kind=>Object.values(kind).flat());
const prizeByName=name=>ALL_PRIZES.find(v=>v.name===name);
/** A draw's result text (gacha-engine.js): {title, lines: [{rarity, name}]}, in order. */
export function parseDraw(message){
 const [head,...rest]=String(message).split('\n');
 const lines=rest.map(l=>{const [r,...n]=l.split('　');return {rarity:BY_NAME[r]??'C',name:n.join('　')};});
 return {title:head.replace(/ \d+回$/,''),lines};
}
/** The best line: the highest rarity, the first of them. */
export const bestOf=lines=>lines.reduce((a,b)=>RANK.indexOf(b.rarity)>RANK.indexOf(a.rarity)?b:a,lines[0]);
/** The form's buttons [[text, icon]]. */
export function gachaButtons({title,lines}){
 const icon=l=>{for(const [id] of prizeByName(l.name.replace(/（天井）$/,''))?.give??[]){const t=VANILLA_ICON[id]??itemIcon(id,'');if(t)return t;}return BOOK_ICON+'chest';},best=bestOf(lines);
 // each prize: its picture and name (up to ten); a cell without text stays hidden
 return [[P+(MARK[best.rarity]??'[gc]')],[P+title],[P,icon(best)],[P+RARITY_NAMES[best.rarity]],[P],[P],
  ...Array.from({length:10},(_,k)=>{const l=lines[k];return l?[P+COLOR[l.rarity]+l.name.replace(/（天井）$/,''),icon(l)]:[P];})];
}
async function show(player,title,buttons){
 const form=new ActionFormData().title(title).body('');for(const [t,i] of buttons)form.button(t,i);
 for(let busy=0;;busy++){const r=await form.show(player);if(r.canceled&&r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(res=>system.runTimeout(res,10));continue;}return r;}
}
/** Plays the opening for a draw's result text. */
export async function showGacha(player,message){
 const draw=parseDraw(message);if(!draw.lines.length)return;
 const buttons=gachaButtons(draw),rarity=bestOf(draw.lines).rarity,start=Date.now();
 const sound=(id,opt)=>{try{player.playSound(id,opt);}catch{}};
 const timers=[system.runTimeout(()=>sound('random.chestopen',{volume:.8}),40),
  system.runTimeout(()=>sound(rarity==='L'?'random.totem':rarity==='E'?'random.levelup':'random.orb',{volume:.7}),50)];
 const r=await show(player,'ct:gacha',buttons);
 timers.forEach(t=>system.clearRun(t));
 if(!r.canceled&&Date.now()-start<SHOW_MS)await show(player,'ct:gacha_end',buttons);
}
