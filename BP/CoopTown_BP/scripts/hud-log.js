import {world,system} from '@minecraft/server';
import {ITEM_GLYPHS} from './item-glyphs.js';
import {ITEM_NAMES,WORKBENCH_RECIPES} from './game-config.js';

// Bottom-right HUD log, sent as a title the RP's hud_screen.json hides and shows in the log box:
// title = "ctlog:" + one line per log line, subtitle = each line's icon glyph (or empty). The RP draws them as two
// columns so the text stays right-aligned. After the icons the subtitle carries the HUD info panels' text:
// "ctinf:" + the INFO_LINES of hud-info.js (name, biome, coordinates, money, quest), one per line; the RP cuts them
// off the icon column and shows each in its panel. Resent when the info changes (checked every checkTicks) and
// every resendMs in case another title replaced it.
export const HUD_LOG={prefix:'ctlog:',infoPrefix:'ctinf:',lines:6,lifeMs:5000,mergeMs:2000,checkTicks:10,resendMs:5000};
export const LOG_KINDS={pickup:'g',craft:'c',special:'s',text:'x',gatherXp:'G',mineXp:'M',craftXp:'C',gatherLevel:'a',mineLevel:'b',craftLevel:'d'};
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
/** [title, subtitle]: text column (an item without an icon gets its name in front), then the icon column with
 *  the info lines after it. */
export function encodeLog(lines,info=[]){
 // §r on every line: a colour code carries over the line break in one label (2026-10-30: 取得 under 採取 +12 came out green)
 const text=lines.map(l=>'§r'+(l.text??((l.icon&&!isGlyph(l.icon)?l.icon+' ':'')+FORMAT[l.kind](l.count))));
 const icons=lines.map(l=>l.icon&&isGlyph(l.icon)?l.icon:'');
 const tail=info.length?HUD_LOG.infoPrefix+info.join('\n'):'';
 return [HUD_LOG.prefix+text.join('\n'),[...(lines.length?[icons.join('\n')]:[]),...(tail?[tail]:[])].join('\n')];
}
const sent=new Map();let heldUntil=0,infoFor=()=>[];
/** Keeps the info refresh from replacing a title on screen (announcements) for ms. */
export function holdTitles(ms){heldUntil=Math.max(heldUntil,Date.now()+ms);}
function currentInfo(player){try{return infoFor(player)??[];}catch(e){return [];}}
function send(player,lines,info=currentInfo(player)){
 const [title,subtitle]=encodeLog(lines,info);
 try{player.onScreenDisplay.setTitle(title,{subtitle,fadeInDuration:0,stayDuration:lines.length?200:1,fadeOutDuration:0});sent.set(player.id,{at:Date.now(),info:info.join('\n')});}catch{}
}
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
/** info(player) -> the info lines (hud-info.js infoLines). */
let fastHud=()=>false;
export const setFastHud=f=>{fastHud=f;};
export function installHudLog({info}={}){
 if(info)infoFor=info;
 let nextRegularTick=0;
 system.runInterval(()=>{
  const now=Date.now(),tick=system.currentTick;
  const regular=tick>=nextRegularTick;
  if(regular)nextRegularTick=tick+HUD_LOG.checkTicks;
  for(const player of world.getAllPlayers()){
   if(!regular&&!fastHud(player))continue;
   const lines=logs.get(player.id)??[];
   const kept=lines.filter(l=>now-l.at<HUD_LOG.lifeMs),expired=kept.length!==lines.length;
   if(expired){if(kept.length)logs.set(player.id,kept);else logs.delete(player.id);}
   const info=currentInfo(player),last=sent.get(player.id);
   const stale=!last||last.info!==info.join('\n')||now-last.at>=HUD_LOG.resendMs;
   if(expired||(stale&&now>=heldUntil))send(player,kept,info);
  }
 },2);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{logs.delete(playerId);sent.delete(playerId);});
}
