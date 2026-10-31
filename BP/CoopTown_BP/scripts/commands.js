import * as mc from '@minecraft/server';
import {dialog,noticeDialog,chooseDialog,confirmDialog} from './dialog.js';
import {announceAwards} from './awards.js';
import {chestCommand,LOCKABLE,lockAt,mayOpen} from './chest-lock.js';

// Handy commands anyone can use (asked 2026-10-23: no OP needed): custom slash commands /cooptown:<name>, registered at
// startup with permission level 0 (any player) and no cheats. The screens they open are handed over by the modules
// that own them (setCommandHandlers: main.js the book, game-runtime.js the map / friends, fish-runtime.js the log).
// Commands run in a read-only moment, so everything is done in system.run.
const {system,world}=mc;
const H={};
/** The modules hand over what the commands open / read: {menu, map, friends, fishlog, game, itemName}. */
export function setCommandHandlers(h){Object.assign(H,h);}
const say=(p,t)=>{try{p.sendMessage(t);}catch{}};
const DIM={'minecraft:overworld':'地上','minecraft:nether':'ネザー','minecraft:the_end':'ジ・エンド'};
const nameOf=id=>H.itemName?.(id)??String(id).replace(/^\w+:/,'');

// ---- 情報 ----
function me(p){
 let d;try{d=H.game?.peek(db=>db.players[p.id]);}catch{}
 if(!d){say(p,'§eまだデータがありません。');return;}
 say(p,[`§6==== ${p.name} ====`,`§f職業 ${d.job}${d.secondJob?' / '+d.secondJob:''}　Lv.${d.level}（${d.xp}/${d.maxXp}）`,
  `§a採取 Lv.${d.gather?.level??1}　§b採掘 Lv.${d.mine?.level??1}　§6クラフト Lv.${d.craft?.level??1}`,
  `§d器用さ ${d.dex??10}　§fストレス ${Math.round(d.stress??0)}`,`§e所持金 ${d.coins??0} G　銀行 ${d.bank??0} G　ガチャ券 デイリー${d.gacha?.daily??0}・ノーマル${d.tickets??0}・エピック${d.gacha?.epic??0}枚`].join('\n'));
}
function online(p){
 const lines=world.getAllPlayers().map(o=>{let d;try{d=H.game?.peek(db=>db.players[o.id]);}catch{}return `§f${o.name}　§7${d?.job??'？'} Lv.${d?.level??'?'}`;});
 say(p,`§6オンライン ${lines.length}人\n`+lines.join('\n'));
}
function pos(p){
 const l=p.location;world.sendMessage(`§b[座標] ${p.name}：X ${Math.floor(l.x)}  Y ${Math.floor(l.y)}  Z ${Math.floor(l.z)}（${DIM[p.dimension.id]??p.dimension.id}）`);
}
const HELP=[['help','コマンドの一覧'],['me','自分の職業・レベル・器用さ・所持金'],['online','オンラインの人と職業'],['pos','今の座標をチャットで共有'],
 ['sort','持ち物を並べ替える（ホットバー以外）'],['trash','持ち物を選んで捨てる'],['offhand','手の物とオフハンドを入れ替える'],
 ['menu','手帳メニューを開く'],['map','ワールドマップを開く'],['friends','フレンドを開く'],['fishlog','釣り図鑑を開く'],
 ['chest','見ているチェストの鍵の設定（開けられる人の許可）'],['onbu <プレイヤー>','近くの人をおんぶする（相手はしゃがむとおりられる）'],['orosu','おんぶをやめる・おろす']];
const help=p=>say(p,'§6便利コマンド（/cooptown:名前）\n'+HELP.map(([c,t])=>`§f/cooptown:${c}　§7${t}`).join('\n'));

// ---- 持ち物 ----
/** Sorts slots 9-35 (the hotbar stays): stacks of a kind merged, then by kind. */
// sort (asked 2026-10-30: chests too): looking at a chest / barrel / shulker box within 6 blocks sorts that box (when the
// player may open it, chest-lock.js); otherwise the player's own items (not the hotbar)
function sort(p){
 let hit;try{hit=p.getBlockFromViewDirection({maxDistance:6});}catch{}
 const b=hit?.block;
 if(b&&LOCKABLE.test(b.typeId)){
  if(!mayOpen(lockAt(b.dimension,b.location),p)){say(p,'§cこのチェストには鍵がかかっています。');return;}
  const box=b.getComponent('minecraft:inventory')?.container;if(!box){say(p,'§cこの箱は並べ替えられません。');return;}
  say(p,`§aチェストの中を並べ替えました（${sortContainer(box,0)}スタック）。`);return;
 }
 const inv=p.getComponent('minecraft:inventory')?.container;if(!inv)return;
 say(p,`§a持ち物を並べ替えました（${sortContainer(inv,9)}スタック）。`);
}
/** Merges and sorts a container's slots from `from` on (by item id, bigger stacks first). Returns the stack count. */
function sortContainer(inv,from){
 const items=[];for(let i=from;i<inv.size;i++){const s=inv.getItem(i);if(s){items.push(s);inv.setItem(i,undefined);}}
 const merged=[];
 for(const s of items){
  let left=s;
  for(const m of merged){if(!left)break;if(m.amount<m.maxAmount&&m.isStackableWith(left)){const k=Math.min(left.amount,m.maxAmount-m.amount);m.amount+=k;if(left.amount===k)left=undefined;else{left=left.clone();left.amount-=k;}}}
  if(left)merged.push(left);
 }
 merged.sort((a,b)=>a.typeId<b.typeId?-1:a.typeId>b.typeId?1:b.amount-a.amount);
 merged.forEach((s,k)=>inv.setItem(from+k,s));
 return merged.length;
}
async function trash(p){
 const inv=p.getComponent('minecraft:inventory')?.container;if(!inv)return;
 const slots=[];for(let i=0;i<inv.size;i++)if(inv.getItem(i))slots.push(i);
 if(!slots.length){await noticeDialog(p,'ゴミ箱','持ち物がありません。',{close:'閉じる'});return;}
 const k=await chooseDialog(p,'ゴミ箱','捨てる物を選んでください（元に戻せません）。',slots.map(i=>{const s=inv.getItem(i);return `${s.nameTag??nameOf(s.typeId)} ×${s.amount}${i<9?'（ホットバー）':''}`;}),{back:'閉じる'});
 if(k===undefined)return;
 const i=slots[k],s=inv.getItem(i);if(!s)return;
 if(!await confirmDialog(p,'ゴミ箱',`${s.nameTag??nameOf(s.typeId)} ×${s.amount} を捨てます。\n元に戻せません。`,{ok:'捨てる'}))return;
 if(inv.getItem(i)?.typeId===s.typeId){inv.setItem(i,undefined);say(p,`§7${nameOf(s.typeId)} ×${s.amount} を捨てました。`);}
}

// ---- おんぶ ----
// A player cannot be ridden in Bedrock, so the rider sits on an invisible seat (entity cooptown:onbu_seat, BP
// entities/onbu_seat.json) kept on the carrier's back every tick: riding gives the vanilla sitting pose and smooth
// movement. Ends when the rider gets off (sneak, as from any seat), /cooptown:orosu, leaving or being apart.
const rides=new Map(); // rider id -> {carrier id, seat}
const SEAT='cooptown:onbu_seat';
// the seat's place: just behind the carrier's back. Seen by others the seat arrives a tick or two late, which made the
// rider look as if floating behind a running carrier (seen 2026-10-24), so it is put where the carrier will be
// LEAD ticks ahead (their velocity), and a little lower while moving fast.
const LEAD=2;
const backOf=c=>{
 const v=c.getViewDirection(),l=c.location,h=Math.hypot(v.x,v.z)||1;
 let m={x:0,y:0,z:0};try{m=c.getVelocity();}catch{}
 const speed=Math.hypot(m.x,m.z),dy=Math.min(.12,speed*.4);
 return {x:l.x-v.x/h*.3+m.x*LEAD,y:l.y+.95-dy+Math.max(0,m.y)*LEAD,z:l.z-v.z/h*.3+m.z*LEAD};
};
// the one who runs /cooptown:onbu <player> carries that player, no asking (asked 2026-10-23); the rider can always
// get off by sneaking
function onbu(p,targets){
 const t=(targets??[]).find(x=>x?.typeId==='minecraft:player'&&x.id!==p.id);
 if(!t){say(p,'§eおんぶする相手を指定してください：/cooptown:onbu <プレイヤー名>');return;}
 if(rides.has(t.id)){say(p,`§e${t.name} はもうおんぶされています。`);return;}
 if([...rides.values()].some(r=>r.carrier===p.id)){say(p,'§eもう誰かをおんぶしています。/cooptown:orosu でおろします。');return;}
 if(rides.has(p.id)){say(p,'§eおんぶされている間はおんぶできません。');return;}
 if(t.dimension.id!==p.dimension.id||Math.hypot(t.location.x-p.location.x,t.location.y-p.location.y,t.location.z-p.location.z)>8){say(p,`§e${t.name} が近くにいません（8ブロック以内）。`);return;}
 const seat=p.dimension.spawnEntity(SEAT,backOf(p));
 if(!seat.getComponent('minecraft:rideable')?.addRider(t)){try{seat.remove();}catch{}say(p,'§eおんぶできませんでした。');return;}
 rides.set(t.id,{carrier:p.id,seat});say(p,`§a${t.name} をおんぶしました。/cooptown:orosu でおろします。`);say(t,`§a${p.name} におんぶされました。しゃがむとおります。`);
}
function getOff(riderId,reason){
 const ride=rides.get(riderId);if(!ride)return;rides.delete(riderId);
 const players=world.getAllPlayers(),r=players.find(x=>x.id===riderId),c=players.find(x=>x.id===ride.carrier);
 try{ride.seat.getComponent('minecraft:rideable')?.ejectRiders();}catch{}
 try{ride.seat.remove();}catch{}
 try{r?.addEffect('slow_falling',40,{amplifier:0,showParticles:false});}catch{}
 if(reason){say(r,'§7'+reason);say(c,'§7'+reason);}
}
function orosu(p){
 if(rides.has(p.id)){getOff(p.id,'おんぶをやめました。');return;}
 const rider=[...rides].find(([,r])=>r.carrier===p.id)?.[0];if(rider!==undefined){getOff(rider,'おんぶをやめました。');return;}
 say(p,'§7おんぶしていません。');
}
function installRides(){
 system.runInterval?.(()=>{
  for(const [riderId,ride] of rides){
   const players=world.getAllPlayers(),r=players.find(x=>x.id===riderId),c=players.find(x=>x.id===ride.carrier);
   if(!r||!c||!ride.seat.isValid){getOff(riderId,'おんぶが終わりました。');continue;}
   let on=false;try{on=ride.seat.getComponent('minecraft:rideable').getRiders().some(x=>x.id===riderId);}catch{}
   if(!on){getOff(riderId,'おんぶをやめました。');continue;} // got off (sneak)
   if(r.dimension.id!==c.dimension.id){getOff(riderId,'おんぶが終わりました。');continue;}
   try{ride.seat.teleport(backOf(c),{dimension:c.dimension,rotation:c.getRotation(),keepVelocity:false,checkForBlocks:false});}catch{}
  }
 },1);
 world.afterEvents?.playerLeave?.subscribe(({playerId})=>{if(rides.has(playerId))getOff(playerId);const r=[...rides].find(([,x])=>x.carrier===playerId)?.[0];if(r!==undefined)getOff(r,'おんぶが終わりました。');});
 // seats left over from a crash or a restart are removed when seen
 system.runInterval?.(()=>{for(const id of ['overworld','nether','the_end'])try{for(const s of world.getDimension(id).getEntities({type:SEAT}))if(![...rides.values()].some(r=>r.seat.id===s.id))s.remove();}catch{}},200);
}

// ---- registration ----
const COMMANDS={
 help:{run:help,description:'便利コマンドの一覧'},me:{run:me,description:'自分の職業・レベル・器用さ・所持金'},online:{run:online,description:'オンラインの人と職業'},
 pos:{run:pos,description:'今の座標をチャットで共有'},sort:{run:sort,description:'持ち物を並べ替える（チェストを見ながら使うとチェストの中）'},trash:{run:p=>trash(p),description:'持ち物を選んで捨てる'},
 menu:{run:p=>H.menu?.(p),description:'手帳メニューを開く'},map:{run:p=>H.map?.(p),description:'ワールドマップを開く'},
 friends:{run:p=>H.friends?.(p),description:'フレンドを開く'},fishlog:{run:p=>H.fishlog?.(p),description:'釣り図鑑を開く'},fishrank:{run:p=>H.fishrank?.(p),description:'魚のサイズランキング'},
 chest:{run:p=>chestCommand(p),description:'見ているチェストの鍵の設定'},
 tanchi:{run:p=>{const t=H.detect?.(p);if(t)p.sendMessage(t);},description:'鉱石探知（鉱夫・職業Lv.10から）'},
 // staff only: the final-day awards (awards.js); awards_hide keeps the ネタ枠 names hidden
 awards:{run:p=>{if(!p.hasTag('cooptown_admin')){p.sendMessage('§c運営用のコマンドです。');return;}p.sendMessage(announceAwards(H.game));},description:'最終日アワードを発表する（運営）'},
 awards_hide:{run:p=>{if(!p.hasTag('cooptown_admin')){p.sendMessage('§c運営用のコマンドです。');return;}p.sendMessage(announceAwards(H.game,{hideNeta:true}));},description:'最終日アワードを発表する・ネタ枠は名前を伏せる（運営）'},
 debug:{run:p=>H.debug?.(p),description:'テスト用メニュー（運営）'},
 pet:{run:p=>H.pet?.(p),description:'ペットを開く'},bgm:{run:p=>H.bgm?.(p),description:'街のBGMのオン・オフ'},skin:{run:p=>H.skin?.(p),description:'きせかえ（スキン・防具の表示）'},
 onbu:{run:(p,targets)=>onbu(p,targets),description:'近くの人をおんぶする',player:true},orosu:{run:orosu,description:'おんぶをやめる'}};
export const COMMAND_NAMES=Object.keys(COMMANDS);
system.beforeEvents?.startup?.subscribe(ev=>{
 const reg=ev.customCommandRegistry;if(!reg)return;
 for(const [name,c] of Object.entries(COMMANDS)){
  try{
   reg.registerCommand({name:'cooptown:'+name,description:c.description,permissionLevel:0,cheatsRequired:false,
    ...(c.player?{optionalParameters:[{name:'player',type:mc.CustomCommandParamType?.PlayerSelector??'PlayerSelector'}]}:{})},
    (origin,arg)=>{const p=origin.sourceEntity;if(p?.typeId!=='minecraft:player')return {status:1};
     system.run(()=>{try{const r=c.run(p,arg);if(r?.catch)r.catch(e=>console.warn('[CoopTown] /cooptown:'+name+': '+e));}catch(e){console.warn('[CoopTown] /cooptown:'+name+': '+e);}});
     return {status:0};});
  }catch(e){console.warn('[CoopTown] コマンド登録 '+name+': '+e);}
 }
});
installRides();
