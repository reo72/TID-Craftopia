import {world,system} from '@minecraft/server';
import {ITEM_GLYPHS} from './item-glyphs.js';
import {MAP_GLYPHS} from './map-glyphs.js';
import {ITEM_NAMES,WORKBENCH_RECIPES} from './game-config.js';
import {setHudSender,hudPayload,announcementOf,announcementExpired,forgetHud} from './hud-channel.js';

// The HUD's text, sent as one title (the RP's hud_screen.json, built by tools/build-hud-log.mjs, hides it and reads it
// through global bindings, so nothing is built again when it changes):
//  title    = "ctlog:" + one line per log line (the bottom-right log's text column)
//  subtitle = the payload (hud-channel.js: the minimap rows and the hidden marks, or the fishing marks), always
//             HUD_LOG.payloadRows lines (padded with see-through lines), the info marks (town music, welcome, the
//             announcement) at the end of its last line
//             + "\n" + "ctinf:" + the INFO_LINES of hud-info.js (name, biome, coordinates, money, quest, ... and the
//             two announcement lines), always HUD_LOG.infoLines of them
//             + "\n" + the log's icon column, one line per log line (the RP reads it from the bottom)
// so the RP finds the map from the top, each info line by counting the lines above it, and the icons from the bottom.
// Until 2026-11-01 the map went in the action bar and the info lines were counted from the bottom (the icons came first).
// Every line holds something: an empty line has no height in game, so empty ones get the see-through BLANK character.
// Sent whenever something in it changes, and every resendMs in case another title replaced it (cheap now: the RP
// builds nothing again for a new text).
export const HUD_LOG={prefix:'ctlog:',infoPrefix:'ctinf:',lines:6,lifeMs:5000,mergeMs:2000,checkTicks:10,resendMs:2000,infoLines:22,payloadRows:21,annMark:'§0§1§0§3§r'};
export const LOG_KINDS={pickup:'g',craft:'c',special:'s',text:'x',gatherXp:'G',mineXp:'M',craftXp:'C',gatherLevel:'a',mineLevel:'b',craftLevel:'d'};
const BLANK=MAP_GLYPHS['tile:blank']??' ';
const FORMAT={
 g:n=>`×${n} 取得`,c:n=>`×${n} 製作`,s:n=>`§d×${n} 発見！`,
 x:()=>'',
 G:n=>`§a採取 +${n}`,M:n=>`§b採掘 +${n}`,C:n=>`§6クラフト +${n}`,
 a:n=>`§e採取 Lv.${n} に上がりました`,b:n=>`§e採掘 Lv.${n} に上がりました`,d:n=>`§eクラフト Lv.${n} に上がりました`
};
const RECIPE_NAMES=Object.fromEntries(WORKBENCH_RECIPES.map(r=>[r.output[0],r.name.replace(/（.*）$/,'')]).reverse());
/** Item shown as its icon glyph, or its name when there is no icon. */
export const itemIcon=id=>ITEM_GLYPHS[id]??ITEM_NAMES[id]??RECIPE_NAMES[id]??id.replace(/^minecraft:/,'');
const isGlyph=text=>text.length===1&&[0xE0,0xE1].includes(text.codePointAt(0)>>8);
const logs=new Map();
/** [title, subtitle] (see the top). info: the info lines (none: the panels hide), payload: the minimap / fishing text,
 *  marks: hidden marks to put at the payload's end. */
export function encodeLog(lines,info=[],payload='',marks=''){
 // §r on every line: a colour code carries over the line break in one label (2026-10-30: 取得 under 採取 +12 came out green)
 const text=lines.map(l=>'§r'+(l.text??((l.icon&&!isGlyph(l.icon)?l.icon+' ':'')+FORMAT[l.kind](l.count))));
 const icons=lines.map(l=>l.icon&&isGlyph(l.icon)?l.icon:BLANK);
 const rows=Array.from({length:HUD_LOG.infoLines},(_,i)=>{const t=String(info[i]??'').replace(/\n/g,' ');return t||BLANK;});
 const top=String(payload||'').split('\n').slice(0,HUD_LOG.payloadRows).map(r=>r||BLANK);
 while(top.length<HUD_LOG.payloadRows)top.push(BLANK);
 top[top.length-1]+=marks;
 const infoPart=(info.length?HUD_LOG.infoPrefix:'')+rows.join('\n');
 return [HUD_LOG.prefix+text.join('\n'),top.join('\n')+'\n'+infoPart+(lines.length?'\n'+icons.join('\n'):'')];
}
const sent=new Map(),lastInfo=new Map();let heldUntil=0,infoFor=()=>[],marksFor=()=>'';
/** Kept for old callers: titles now go through announce (hud-channel.js), so nothing needs holding. */
export function holdTitles(ms){heldUntil=Math.max(heldUntil,Date.now()+ms);}
function currentInfo(player){try{return infoFor(player)??[];}catch(e){return [];}}
function currentMarks(player){let m='';try{m=marksFor(player)??'';}catch{}return m+(announcementOf(player)?HUD_LOG.annMark:'');}
function send(player,lines=liveLines(player),info=lastInfo.get(player.id)??currentInfo(player)){
 lastInfo.set(player.id,info);
 const [title,subtitle]=encodeLog(lines,info,hudPayload(player),currentMarks(player));
 try{player.onScreenDisplay.setTitle(title,{subtitle,fadeInDuration:0,stayDuration:lines.length?200:1,fadeOutDuration:0});sent.set(player.id,{at:Date.now(),info:info.join('\n')});}catch{}
}
const liveLines=player=>{const now=Date.now();return (logs.get(player.id)??[]).filter(l=>now-l.at<HUD_LOG.lifeMs);};
// a new payload or announcement goes out at once, with the info lines last read (refreshed every checkTicks)
setHudSender((player,fresh)=>send(player,liveLines(player),fresh?currentInfo(player):undefined));
/** Adds a line; the same key within mergeMs adds to that line's count and moves it to the bottom. */
export function pushLog(player,key,kind,count,icon=''){
 const now=Date.now(),lines=(logs.get(player.id)??[]).filter(l=>now-l.at<HUD_LOG.lifeMs);
 const i=lines.findIndex(l=>l.key===key&&now-l.at<HUD_LOG.mergeMs);
 const line=i>=0?lines.splice(i,1)[0]:{key,kind,count:0,icon};
 line.count+=count;line.at=now;lines.push(line);
 while(lines.length>HUD_LOG.lines)lines.shift();
 logs.set(player.id,lines);send(player,lines);
}
/** A line of plain text (meal and potion results ...); the same key within mergeMs replaces it. */
export function pushText(player,key,text){
 const now=Date.now(),lines=(logs.get(player.id)??[]).filter(l=>now-l.at<HUD_LOG.lifeMs&&!(l.key===key&&now-l.at<HUD_LOG.mergeMs));
 lines.push({key,kind:LOG_KINDS.text,count:1,text:String(text),at:now});
 while(lines.length>HUD_LOG.lines)lines.shift();
 logs.set(player.id,lines);send(player,lines);
}
/** info(player) -> the info lines (hud-info.js infoLines); marks(player) -> hidden marks (hud-info.js infoMarks). */
let fastHud=()=>false;
export const setFastHud=f=>{fastHud=f;};
export function installHudLog({info,marks}={}){
 if(info)infoFor=info;
 if(marks)marksFor=marks;
 let nextRegularTick=0;
 system.runInterval(()=>{
  const now=Date.now(),tick=system.currentTick;
  const regular=tick>=nextRegularTick;
  if(regular)nextRegularTick=tick+HUD_LOG.checkTicks;
  for(const player of world.getAllPlayers()){
   if(!regular&&!fastHud(player))continue;
   const lines=logs.get(player.id)??[];
   const kept=lines.filter(l=>now-l.at<HUD_LOG.lifeMs),expired=kept.length!==lines.length||announcementExpired(player,now);
   if(kept.length!==lines.length){if(kept.length)logs.set(player.id,kept);else logs.delete(player.id);}
   const info=currentInfo(player),last=sent.get(player.id);
   const stale=!last||last.info!==info.join('\n')||now-last.at>=HUD_LOG.resendMs;
   if(expired||(stale&&now>=heldUntil))send(player,kept,info);
  }
 },2);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{logs.delete(playerId);sent.delete(playerId);lastInfo.delete(playerId);forgetHud(playerId);});
}
