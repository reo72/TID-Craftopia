import {world,system,ItemStack} from '@minecraft/server';
import {titleTrack} from './job-count.js';
import {cheer} from './celebrate.js';

// 探索戦 (asked 2026-10-27, the dungeon idea): using a 協力探索セット (sneak + use) starts a fight at that spot for the
// players within DUNGEON.party blocks: DUNGEON.waves of monsters come one after another around the spot; clearing the
// last wave in time gives everyone who stayed coins, job XP and rare materials. Leaving the area, everyone falling or
// running out of time ends it (the monsters left are removed). One fight per player every cooldownMs.
export const DUNGEON={party:12,area:32,radius:7,seconds:300,cooldownMs:10*60000,tag:'ct_dgn',
 waves:[[['minecraft:zombie',3],['minecraft:skeleton',2]],[['minecraft:zombie',3],['minecraft:spider',2],['minecraft:skeleton',2]],[['minecraft:vindicator',1],['minecraft:husk',3],['minecraft:stray',2]]],
 reward:{coins:250,xp:80},loot:[['cooptown:rare_ore',1],['cooptown:shining_crystal',1],['cooptown:fine_wood',2],['cooptown:forge_shard',2],['cooptown:mana_dust',2],['minecraft:diamond',1],['minecraft:emerald',3]]};
/** Spots on a ring around the center for a wave's monsters. */
export function ringSpots(center,n,radius=DUNGEON.radius){return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return {x:center.x+Math.cos(a)*radius,y:center.y,z:center.z+Math.sin(a)*radius};});}
const runs=new Map(),last=new Map();let ctx;
const msg=(players,text)=>{for(const p of players)try{p.sendMessage(text);}catch{}};
const title=(players,main,sub)=>{for(const p of players)try{p.onScreenDisplay.setTitle(main,{subtitle:sub,fadeInDuration:5,stayDuration:40,fadeOutDuration:10});}catch{}};
function startDungeon(player){
 if(runs.size&&[...runs.values()].some(r=>r.party.some(p=>p.id===player.id))){player.sendMessage('§e探索戦の最中です。');return;}
 const now=Date.now(),wait=(last.get(player.id)??0)+DUNGEON.cooldownMs-now;if(wait>0){player.sendMessage(`§e次の探索戦まで あと${Math.ceil(wait/60000)}分`);return;}
 const c=player.getComponent('minecraft:inventory').container,s=c.getItem(player.selectedSlotIndex);if(s?.typeId!=='cooptown:expedition_kit')return;
 if(s.amount>1){s.amount--;c.setItem(player.selectedSlotIndex,s);}else c.setItem(player.selectedSlotIndex,undefined);
 const center={...player.location},dim=player.dimension;
 let party;try{party=dim.getPlayers({location:center,maxDistance:DUNGEON.party});}catch{party=[player];}
 const id=`${player.id}:${now}`,run={id,center,dim,party,wave:-1,start:now,mobs:[]};runs.set(id,run);
 for(const p of party)last.set(p.id,now);
 title(party,'§c探索戦','§f全'+DUNGEON.waves.length+'波を倒せ！');msg(party,`§c探索戦が始まりました（${party.map(p=>p.name).join('、')}）。${DUNGEON.seconds/60}分以内に全${DUNGEON.waves.length}波を倒そう！`);
 try{dim.playSound('raid.horn',center,{volume:2});}catch{}
 nextWave(run);
}
function nextWave(run){
 run.wave++;const w=DUNGEON.waves[run.wave];
 if(!w){finish(run,true);return;}
 const list=w.flatMap(([t,n])=>Array(n).fill(t)),spots=ringSpots(run.center,list.length);run.mobs=[];
 list.forEach((t,i)=>{try{const e=run.dim.spawnEntity(t,spots[i]);e.addTag(DUNGEON.tag);run.mobs.push(e);run.dim.spawnParticle('minecraft:huge_explosion_emitter',spots[i]);}catch{}});
 title(run.party,`§c第${run.wave+1}波`,`§f${list.length}体`);
}
function finish(run,won){
 runs.delete(run.id);
 for(const e of run.mobs)try{if(e.isValid)e.remove();}catch{}
 const here=run.party.filter(p=>{try{return p.isValid&&p.dimension.id===run.dim.id&&Math.hypot(p.location.x-run.center.x,p.location.z-run.center.z)<=DUNGEON.area;}catch{return false;}});
 if(!won){msg(run.party,'§7探索戦は失敗しました。');return;}
 const secs=Math.round((Date.now()-run.start)/1000);
 for(const p of here){
  try{ctx.game.execute(p.id,'job.earn',{coins:DUNGEON.reward.coins,xp:DUNGEON.reward.xp,skill:'gather',note:`探索戦クリア ${secs}秒`});}catch{}
  const [item,n]=DUNGEON.loot[Math.floor(Math.random()*DUNGEON.loot.length)];
  try{const left=p.getComponent('minecraft:inventory').container.addItem(new ItemStack(item,n));if(left)p.dimension.spawnItem(left,p.location);}catch{}
  titleTrack(p,'dungeon_clear');
  cheer(p,'medium',`§a探索戦クリア！ ${secs}秒`);
 }
 msg(run.party,`§a探索戦クリア！（${secs}秒）報酬：${DUNGEON.reward.coins}コイン・経験値・珍しい素材`);
}
export function installDungeons({game}){
 ctx={game};
 system.runInterval(()=>{
  for(const run of [...runs.values()]){
   run.mobs=run.mobs.filter(e=>{try{return e.isValid&&e.getComponent('minecraft:health')?.currentValue>0;}catch{return false;}});
   const alive=run.party.filter(p=>{try{return p.isValid&&p.dimension.id===run.dim.id&&Math.hypot(p.location.x-run.center.x,p.location.z-run.center.z)<=DUNGEON.area;}catch{return false;}});
   if(!alive.length){finish(run,false);continue;}
   if(Date.now()-run.start>DUNGEON.seconds*1000){msg(run.party,'§c時間切れ…');finish(run,false);continue;}
   if(!run.mobs.length)nextWave(run);
   else for(const p of alive)try{p.onScreenDisplay.setActionBar(`§c探索戦 第${run.wave+1}波　残り${run.mobs.length}体　§f${Math.max(0,Math.ceil(DUNGEON.seconds-(Date.now()-run.start)/1000))}秒`);}catch{}
  }
 },20);
 // monsters of a fight that ended while unloaded are cleared when they come back
 world.afterEvents.entityLoad?.subscribe(({entity})=>{try{if(entity.hasTag(DUNGEON.tag)&&![...runs.values()].some(r=>r.mobs.some(m=>m.id===entity.id)))entity.remove();}catch{}});
}
export const resetDungeonCooldown=id=>last.delete(id);
export const useExpeditionKit=player=>{if(player.isSneaking)startDungeon(player);else player.sendMessage('§7しゃがんで使うと探索戦を始めます（まわりの仲間も参加）。');};
