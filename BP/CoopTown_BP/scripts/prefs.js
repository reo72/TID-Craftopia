import {world,system} from '@minecraft/server';

// Per-player settings from the book menu's 設定 page, kept on the player.
//   hud: which HUD panels show (profile, wallet = money / bank, quest = tracked quest, location = biome / coords)
//   notify: chat notices (codex = new codex entry, titles = title earned, events = an event starts)
//   volume: the book's page sound, 0-100 (0 = silent)
//   bgm / bgmVolume: the first town's music on or off, and its volume 0-100 (town-bgm.js; 2026-10-30, 40 = a bit quieter
//   than before)
// The HUD size is the minimap's size (minimap.js map settings), the only HUD part that has sizes.
export const PREFS_KEY='cooptown:prefs';
export const DEFAULT_PREFS={hud:{profile:true,wallet:true,quest:true,location:true},notify:{codex:true,titles:true,events:true},volume:60,bgm:true,bgmVolume:40};
export function prefs(player){
 let v={};try{v=JSON.parse(player.getDynamicProperty(PREFS_KEY)??'{}');}catch{}
 const bool=(o,d)=>Object.fromEntries(Object.entries(d).map(([k,x])=>[k,typeof o?.[k]==='boolean'?o[k]:x]));
 const pct=(x,d)=>{const n=Number(x);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n/10)*10)):d;};
 return {hud:bool(v.hud,DEFAULT_PREFS.hud),notify:bool(v.notify,DEFAULT_PREFS.notify),volume:pct(v.volume,DEFAULT_PREFS.volume),
  bgm:typeof v.bgm==='boolean'?v.bgm:DEFAULT_PREFS.bgm,bgmVolume:pct(v.bgmVolume,DEFAULT_PREFS.bgmVolume)};
}
export function savePrefs(player,p){try{player.setDynamicProperty(PREFS_KEY,JSON.stringify(p));}catch{}}
/** A chat notice of kind (codex / titles / events), unless the player turned it off. */
export function notify(player,kind,text){if(prefs(player).notify[kind])try{player.sendMessage(text);}catch{}}
/** The book's page sound at the player's volume. */
export function pageSound(player){const v=prefs(player).volume;if(v>0)try{player.playSound('item.book.page_turn',{volume:v/100});}catch{}}

// event start notices: checked every checkTicks against the events known last time
const started=new Set();let ready=false;
export function installEventNotices(game,checkTicks=200){
 system.runInterval(()=>{
  let events=[];try{events=game.peek(d=>d.events??[]);}catch{return;}
  const now=Date.now();
  for(const e of events){
   if(!(e.start<=now&&e.end>now)||started.has(e.id))continue;
   started.add(e.id);
   if(ready)for(const p of world.getAllPlayers())notify(p,'events',`§6イベント「${e.name}」が始まりました！ §7手帳のイベントから参加登録できます。`);
  }
  ready=true; // events already running at startup are not announced
 },checkTicks);
}
