import {system,world} from '@minecraft/server';
import {MAP_GLYPHS} from './map-glyphs.js';
import {PARTY_GLYPHS} from './party-glyphs.js';

// The notification bar at the top middle of the screen (RP build-hud-log.mjs notifyBox, pictures
// textures/cooptown/notify/*). It slides down from above, stays, then slides back up. The text travels as the last
// HUD info line (hud-info.js 'notice'), the kind and the slide frame as hidden marks with the map text
// (minimap.js), so the minimap re-sends while a bar moves (resend()).
// sound: played when the bar starts to slide down (vanilla sound ids; pitch / volume)
export const NOTIFY_KINDS=[
 {id:'info',label:'お知らせ',sound:{id:'note.bell',pitch:1.2,volume:.8}},
 {id:'ok',label:'成功',sound:{id:'random.orb',pitch:1.3,volume:.8}},
 {id:'warn',label:'注意',sound:{id:'note.pling',pitch:.8,volume:.9}},
 {id:'error',label:'エラー',sound:{id:'note.bass',pitch:.6,volume:1}}];
// kinds 5-10: the title banners (asked 2026-10-27, RP textures/cooptown/notify/title_<n>; the text is the title's
// name). Their mark is two of the plain kinds' marks together (RP build-hud-log.mjs RANK_PAIRS).
export const TITLE_KINDS=[
 {rank:'ブロンズ',pair:[1,2],sound:{id:'random.orb',pitch:1.1,volume:.9}},{rank:'シルバー',pair:[1,3],sound:{id:'random.orb',pitch:1.4,volume:.9}},
 {rank:'ゴールド',pair:[1,4],sound:{id:'random.levelup',pitch:1.2,volume:.8}},{rank:'エピック',pair:[2,3],sound:{id:'random.levelup',pitch:.9,volume:.9}},
 {rank:'レジェンド',pair:[2,4],sound:{id:'random.totem',pitch:1.1,volume:.6}},{rank:'アセンデッド',pair:[3,4],sound:{id:'random.totem',pitch:.8,volume:.7}}];
/** The notify kind of a title rank (5-10), or 0. */
export const titleKind=rank=>{const i=TITLE_KINDS.findIndex(t=>t.rank===rank);return i<0?0:5+i;};
export const NOTIFY={frames:6,stayMs:5000,maxSeconds:30,maxText:22,textPx:166};
// Fitting the text (2026-10-28: long title names were cut off at both ends of the banner). Widths in the HUD's
// pixel font at scale 1: printable ASCII 6 px, anything else 10 px (a little more than measured, to stay inside).
// BANNER: each title banner's text area in px (RP tools/title-banners/zones.json w x 236, less a margin) and the
// smaller sizes a long name may use (RP build-hud-log.mjs TITLE.sizes: no mark = 1, ns1, ns2).
export const BANNER={px:[76,76,84,93,89,89],sizes:[['',1],['ns1',.8],['ns2',.65]]};
export const textPx=t=>[...String(t)].reduce((a,c)=>a+(/[\x20-\x7e]/.test(c)?6:10),0);
/** text cut to fit px (with "…"), whole when it fits. */
export function fitText(text,px){
 const t=String(text);if(textPx(t)<=px)return t;
 let out='';for(const c of t){if(textPx(out+c+'…')>px)break;out+=c;}
 return out+'…';
}
/** A title banner's text and size: the largest size it fits at, else the smallest with the text cut. kind 5-10. */
export function fitBanner(text,kind){
 const px=BANNER.px[kind-5]??BANNER.px[0];
 for(const [mark,sc] of BANNER.sizes)if(textPx(text)*sc<=px)return {text:String(text),size:mark};
 // too long even small: the job in brackets goes first ("ハイパードパガキ☆（農民）"), then the end is cut
 const bare=String(text).replace(/（[^（）]*）$/,'');if(bare!==String(text)&&bare)return fitBanner(bare,kind);
 const [mark,sc]=BANNER.sizes.at(-1);return {text:fitText(text,Math.floor(px/sc)),size:mark};
}
const queued=new Map(); // player id -> [bars waiting while one shows]
const shown=new Map(); // player id -> {kind (1-4), text, start (tick), stay (ticks)}
let resend=()=>{};
/** minimap.js hands over its "send the map text again now" (it owns the action bar). */
export function setNotifyResend(fn){resend=fn;}
/** The frame (0-5, 5 = fully down) at tick t, or -1 when the bar is gone. */
export function frameAt(n,t){
 const d=t-n.start,f=NOTIFY.frames-1;
 if(d<0)return -1;
 if(d<=f)return d;                 // sliding down
 if(d<=f+n.stay)return f;          // shown
 const up=d-f-n.stay;              // sliding back up
 return up<=f?f-up:-1;
}
/** Shows a bar to one player. kind: 1 お知らせ, 2 成功, 3 注意, 4 エラー, 5-10 a title banner (TITLE_KINDS). Title
 *  banners wait their turn while another bar shows; plain bars replace it. */
export function notify(player,text,kind=1,seconds=NOTIFY.stayMs/1000){
 const k=Math.max(1,Math.min(4+TITLE_KINDS.length,Math.floor(Number(kind))||1));
 if(k>4){const cur=shown.get(player.id),now=system.currentTick;if(cur&&(now<cur.start||frameAt(cur,now)>=0)){/* showing, or about to */const q=queued.get(player.id)??[];q.push({text,kind:k,seconds});queued.set(player.id,q.slice(-8));return;}}
 const stay=Math.round(Math.max(1,Math.min(NOTIFY.maxSeconds,Number(seconds)||5))*20);
 // the text goes out first (hud-log sends info lines every half second): the bar starts sliding 10 ticks later
 const flat=String(text).replace(/\s*\n\s*/g,' ');
 const fit=k>4?fitBanner(flat,k):{text:fitText(flat.slice(0,NOTIFY.maxText),NOTIFY.textPx),size:''};
 shown.set(player.id,{kind:k,text:fit.text,size:fit.size,start:system.currentTick+10,stay});
}
/** Shows a bar to everyone online. */
export function notifyAll(text,kind,seconds){for(const p of world.getAllPlayers())notify(p,text,kind,seconds);}
/** The bar's text for the HUD info line ('' when none). */
export const noticeText=player=>shown.get(player.id)?.text??'';
/** Hidden marks for the map text: the kind and the frame, or '' when no bar shows. */
export function noticeMarks(player,t=system.currentTick){
 const n=shown.get(player.id);if(!n)return '';
 const f=frameAt(n,t);if(f<0)return '';
 const kinds=n.kind>4?TITLE_KINDS[n.kind-5].pair:[n.kind];
 return kinds.map(k=>MAP_GLYPHS['token:nt'+k]??'').join('')+(MAP_GLYPHS['token:nf'+f]??'')+(n.size?PARTY_GLYPHS['token:'+n.size]??'':'');
}
export function installNotify(){
 // every tick while a bar moves: send the map text again with the next frame; drop finished bars
 system.runInterval(()=>{
  const t=system.currentTick;
  for(const [id,n] of shown){
   const d=t-n.start,f=NOTIFY.frames-1;
   if(d>f+n.stay+f+1){shown.delete(id);const q=queued.get(id);if(q?.length){const p=world.getAllPlayers().find(x=>x.id===id),nx=q.shift();if(p)notify(p,nx.text,nx.kind,nx.seconds);}continue;}
   const moving=(d>=0&&d<=f)||(d>f+n.stay&&d<=f+n.stay+f+1);
   if(d===0){const p=world.getAllPlayers().find(x=>x.id===id),s=n.kind>4?TITLE_KINDS[n.kind-5]?.sound:NOTIFY_KINDS[n.kind-1]?.sound;if(p&&s)try{p.playSound(s.id,{pitch:s.pitch,volume:s.volume});}catch{}}
   if(moving){const p=world.getEntity?.(id)??world.getAllPlayers().find(x=>x.id===id);if(p)try{resend(p);}catch{}}
  }
 },1);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{shown.delete(playerId);queued.delete(playerId);});
 // for trying it out: /scriptevent cooptown:notify 3 本文  (kind 1-4, shown to the one who runs it)
 system.afterEvents?.scriptEventReceive?.subscribe(({id,message,sourceEntity})=>{
  if(id!=='cooptown:notify'||sourceEntity?.typeId!=='minecraft:player')return;
  const m=/^\s*(10|[1-9])?\s*(.*)$/.exec(message??'');notify(sourceEntity,m[2]||'テスト通知',Number(m[1]||1));
 });
}
