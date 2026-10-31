import {world,system} from '@minecraft/server';
import {COMMANDS,COUNT_ITEMS} from './rune-commands.js';
import {qualityOf,TIERS} from './quality.js';
import {dateOf,stateOf,dateText,shelfHours,NEAR,EXPIRED} from './freshness.js';
import {SHELF} from './food-config.js';
import {ANIMALS} from './ranch-runtime.js';
import {questFor,countItem} from './hud-info.js';
import {playMinigame} from './minigame.js';

// What the magic commands do in the world (Notion「刻印エンチャント50案」, 動作・悪用対策). Every effect is on the
// wearer, the target of the event, or (support) one other player close by in view; nothing creates items or currency,
// breaks blocks or teleports. Magic damage is dealt as 'magic' without the wearer as the attacker, so it never sets
// off another rune (hit / kill only react to direct melee). Status effects never shorten or remove a stronger one the
// entity already has. A per-player cooldown per command (shared by every rune using it) is kept in a dynamic property,
// so swapping gear, renaming or logging out does not reset it.
const CD_KEY='cooptown:rune_cd',WAYPOINT_KEY='cooptown:rune_waypoint';
const read=(o,k,d={})=>{try{const v=JSON.parse(o.getDynamicProperty(k)??'null');return v??d;}catch{return d;}};
const write=(o,k,v)=>{try{o.setDynamicProperty(k,JSON.stringify(v));}catch{}};
const say=(p,t)=>{try{p.sendMessage(t);}catch{}};
const hud=(p,t)=>{try{p.onScreenDisplay.setTitle(' ',{subtitle:t,fadeInDuration:0,stayDuration:50,fadeOutDuration:10});}catch{say(p,t);}};
const sound=(p,id,pitch=1)=>{try{p.playSound(id,{pitch,volume:.6});}catch{}};
const particle=(dim,id,loc)=>{try{dim.spawnParticle(id,loc);}catch{}};
const ticks=s=>Math.max(1,Math.round(s*20));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const hpOf=e=>{try{return e.getComponent('minecraft:health');}catch{return undefined;}};
const isMonster=e=>{try{return e.matches({families:['monster']});}catch{return false;}};
const BOSSES=new Set(['minecraft:ender_dragon','minecraft:wither','minecraft:warden','minecraft:elder_guardian']);
/** Adds an effect unless the entity already has the same one at least as strong for longer. */
function effect(e,id,seconds,amp=0){
 try{const cur=e.getEffect(id);if(cur&&(cur.amplifier>amp||(cur.amplifier===amp&&cur.duration>=ticks(seconds))))return false;e.addEffect(id,ticks(seconds),{amplifier:amp,showParticles:true});return true;}catch{return false;}
}
const magic=(e,amount)=>{try{e.applyDamage(amount,{cause:'magic'});return true;}catch{return false;}};
const heal=(e,amount)=>{const h=hpOf(e);if(!h||h.currentValue<=0)return 0;const v=Math.min(h.effectiveMax,h.currentValue+amount);const got=v-h.currentValue;h.setCurrentValue(v);return got;};
function push(e,from,strength){
 if(BOSSES.has(e.typeId))return false;
 const dx=e.location.x-from.x,dz=e.location.z-from.z,l=Math.hypot(dx,dz)||1;
 try{e.applyKnockback({x:dx/l*strength*2.5,z:dz/l*strength*2.5},.25);return true;}catch{}
 try{e.applyKnockback(dx/l,dz/l,strength*2.5,.25);return true;}catch{return false;}
}
function enemiesNear(dim,loc,r,n,skip){
 let list=[];try{list=dim.getEntities({location:loc,maxDistance:r,families:['monster']});}catch{}
 return list.filter(e=>e.id!==skip?.id).sort((a,b)=>dist(a.location,loc)-dist(b.location,loc)).slice(0,n);
}
/** The closest other player within r blocks in view (a ray from eye to eye that hits no block), or undefined. */
function allyNear(player,r){
 const eye=player.getHeadLocation();
 return world.getAllPlayers().filter(o=>o.id!==player.id&&o.dimension.id===player.dimension.id&&dist(o.location,player.location)<=r).sort((a,b)=>dist(a.location,player.location)-dist(b.location,player.location))
  .find(o=>{try{const to=o.getHeadLocation(),d={x:to.x-eye.x,y:to.y-eye.y,z:to.z-eye.z},l=Math.hypot(d.x,d.y,d.z)||1;
   const hit=player.dimension.getBlockFromRay(eye,{x:d.x/l,y:d.y/l,z:d.z/l},{maxDistance:l,includePassableBlocks:false});return !hit;}catch{return true;}});
}
const DIRS=['北','北東','東','南東','南','南西','西','北西'];
function direction(from,to){const a=Math.atan2(to.x-from.x,-(to.z-from.z))*180/Math.PI;return DIRS[Math.round(((a+360)%360)/45)%8];}
function lookBlock(player,r=6){try{return player.getBlockFromViewDirection({maxDistance:r})?.block;}catch{return undefined;}}
function lookEntity(player,r=8){try{return player.getEntitiesFromViewDirection({maxDistance:r})?.[0]?.entity;}catch{return undefined;}}
const nameOf=e=>e?.nameTag||String(e?.typeId??'?').replace('minecraft:','');

// ---- the per-player cooldown of each command ----
export function commandReady(player,name,now=Date.now()){return (read(player,CD_KEY)[name]??0)<=now;}
export function startCommand(player,name,now=Date.now()){const cd=read(player,CD_KEY);cd[name]=now+(COMMANDS[name]?.cooldown??10)*1000;
 for(const k of Object.keys(cd))if(cd[k]<now)delete cd[k];write(player,CD_KEY,cd);}

// trail recordings: player id -> {points, until, showing}
const trails=new Map();
system.runInterval(()=>{
 const now=Date.now();
 for(const [id,t] of trails){
  const p=world.getAllPlayers().find(x=>x.id===id);if(!p){trails.delete(id);continue;}
  if(t.recording&&now<t.until&&t.points.length<t.max){const last=t.points.at(-1);if(!last||dist(last,p.location)>3)t.points.push({x:p.location.x,y:p.location.y+.2,z:p.location.z});}
  else if(t.recording){t.recording=false;say(p,`§b[足跡の糸] ${t.points.length}か所を記録しました。もう一度使うと帰り道を表示します。`);}
  if(t.showUntil>now)for(const pt of t.points)particle(p.dimension,'minecraft:villager_happy',pt);
  if(!t.recording&&t.showUntil&&t.showUntil<now)trails.delete(id);
 }
},40);

/** Performs one command call. ctx: {player, event, target (entity or undefined), game, itemName}. Returns a short
 *  note for the chat (or '' when nothing visible happened). */
export function perform(call,ctx){
 const {player,target,game}=ctx,a=call.args.filter(v=>v!=='self'&&v!=='target'&&v!=='ally'),dim=player.dimension;
 const night=()=>{const t=world.getTimeOfDay();return t>=13000&&t<23000;};
 const okTarget=()=>target&&target.isValid&&target.typeId!=='minecraft:player'&&(hpOf(target)?.currentValue??0)>0;
 switch(call.name){
  case 'mark':{if(!okTarget())return '';const h=hpOf(target);hud(player,`§d${nameOf(target)}　HP ${Math.ceil(h.currentValue)} / ${h.effectiveMax}`);return '';}
  case 'ignite':if(okTarget())try{target.setOnFire(Math.min(2,a[0]),true);}catch{}return '';
  case 'calm':try{game.execute(player.id,'rune.stress',{amount:-Math.min(2,Math.round(a[0]))});}catch{}return 'ストレス回復';
  case 'cleanse':try{if(player.getEffect('poison')){player.removeEffect('poison');return '毒を解除';}}catch{}return '';
  // attack
  case 'chill':if(okTarget()&&effect(target,'slowness',a[0]))particle(dim,'minecraft:snowflake_particle',target.location);return '';
  case 'spark':if(okTarget()&&magic(target,a[0])){particle(dim,'minecraft:electric_spark_particle',target.getHeadLocation?.()??target.location);sound(player,'random.orb',1.6);}return '';
  case 'arc':{if(!okTarget())return '';const next=enemiesNear(dim,target.location,a[0],a[1],target).filter(e=>e.id!==player.id);for(const e of next)if(magic(e,a[2]))particle(dim,'minecraft:electric_spark_particle',e.location);return '';}
  case 'gust':if(okTarget()&&isMonster(target))push(target,player.location,a[0]);return '';
  case 'venom':if(okTarget())effect(target,'poison',a[0]);return '';
  case 'weaken':if(okTarget())effect(target,'weakness',a[0]);return '';
  case 'echo':{if(!okTarget())return '';const t=target;system.runTimeout(()=>{try{if(t.isValid&&(hpOf(t)?.currentValue??0)>0&&dist(t.location,player.location)<=4){magic(t,a[0]);particle(t.dimension,'minecraft:crit_emitter',t.location);}}catch{}},ticks(a[1]));return '';}
  case 'moon_strike':if(night()&&okTarget()&&magic(target,a[0]))particle(dim,'minecraft:end_chest',target.location);return '';
  case 'snare_ring':{const at=okTarget()?target.location:player.location;for(const e of enemiesNear(dim,at,a[0],a[1]))effect(e,'slowness',a[2]);particle(dim,'minecraft:snowflake_particle',at);return '';}
  // recovery / support
  case 'heal':{const got=heal(player,a[0]);return got?`HP +${got}`:'';}
  case 'rest_calm':{
   const loc=player.location;let fire=false;
   for(let dx=-3;dx<=3&&!fire;dx++)for(let dy=-1;dy<=1&&!fire;dy++)for(let dz=-3;dz<=3&&!fire;dz++){try{const b=dim.getBlock({x:Math.floor(loc.x)+dx,y:Math.floor(loc.y)+dy,z:Math.floor(loc.z)+dz});if(/campfire/.test(b?.typeId??'')&&b.permutation.getState('extinguished')!==true)fire=true;}catch{}}
   if(!fire){say(player,'§e[穏やかな焚火] 火のついた焚き火のそばで使ってください');return '';}
   const start={...loc};say(player,'§7[穏やかな焚火] 5秒そのまま休んでください…');
   system.runTimeout(()=>{try{if(dist(player.location,start)<.5){game.execute(player.id,'rune.stress',{amount:-Math.min(2,Math.round(a[0]))});say(player,'§a[穏やかな焚火] ひと息つきました（ストレス回復）');}else say(player,'§e[穏やかな焚火] 動いたので休めませんでした');}catch{}},100);
   return '';}
  case 'cleanse_wither':try{if(player.getEffect('wither')){player.removeEffect('wither');return '衰弱を解除';}}catch{}return '';
  case 'mend_over_time':{for(let k=0;k<a[1];k++)system.runTimeout(()=>{try{if(player.isValid)heal(player,a[0]);}catch{}},40*(k+1));return '少しずつ回復';}
  case 'aid':{const o=allyNear(player,4);if(!o){say(player,'§e[救護の灯] 4ブロック以内に見える仲間がいません');return '';}const got=heal(o,a[0]);say(o,`§a${player.name}の救護の灯でHP +${got}`);particle(o.dimension,'minecraft:heart_particle',o.getHeadLocation());return `${o.name}をHP +${got}`;}
  case 'calm_allies':{const near=world.getAllPlayers().filter(o=>o.id!==player.id&&o.dimension.id===dim.id&&dist(o.location,player.location)<=a[0]).slice(0,a[1]);
   for(const o of near){try{game.execute(o.id,'rune.stress',{amount:-Math.min(2,Math.round(a[2]))});say(o,`§a${player.name}の心の輪でストレスが和らぎました`);}catch{}}
   return near.length?`仲間${near.length}人のストレス回復`:'近くに仲間がいません';}
  case 'bandage':{const h=hpOf(player);if(!h||h.currentValue>=h.effectiveMax)return 'HPは満タンです';
   const inv=player.getComponent('minecraft:inventory')?.container;let slot=-1;for(let i=0;inv&&i<inv.size;i++)if(inv.getItem(i)?.typeId==='cooptown:herb_bundle'){slot=i;break;}
   if(slot<0)return '薬草の束がありません';const s=inv.getItem(slot);if(s.amount>1){s.amount--;inv.setItem(slot,s);}else inv.setItem(slot,undefined);return `HP +${heal(player,a[0])}`;}
  // defense / emergency
  case 'ward':effect(player,'absorption',a[0]);return '';
  case 'douse':try{if(player.getComponent('minecraft:onfire')){player.extinguishFire(true);return '消火';}}catch{}return '';
  case 'feather':if(player.isFalling){effect(player,'slow_falling',a[0]);return '';}return '落下中だけ使えます';
  case 'buoy':if(player.isInWater){try{player.applyImpulse({x:0,y:a[0]*2,z:0});}catch{}return '';}return '水中で使います';
  case 'bubble':if(player.isInWater){effect(player,'water_breathing',a[0]);return '';}return '水中で使います';
  case 'haste_step':effect(player,'speed',a[0]);return '';
  case 'unshackle':try{if(player.getEffect('slowness')){player.removeEffect('slowness');return '移動速度低下を解除';}}catch{}return '';
  case 'clear_sight':try{if(player.getEffect('blindness')){player.removeEffect('blindness');return '盲目を解除';}}catch{}return '';
  case 'attacker_hint':if(target)hud(player,`§c${nameOf(target)}　${direction(player.location,target.location)}から攻撃`);return '';
  case 'repel':{const list=enemiesNear(dim,player.location,a[0],a[1]);for(const e of list)push(e,player.location,.4);return list.length?'':'';}
  // exploration / movement
  case 'night_eye':effect(player,'night_vision',a[0]);return '';
  case 'waypoint':{
   if(player.isSneaking){write(player,WAYPOINT_KEY,{dim:dim.id,x:player.location.x,y:player.location.y,z:player.location.z});return '今いる場所を記録しました';}
   const w=read(player,WAYPOINT_KEY,null);if(!w)return 'まだ地点がありません（しゃがんで使うと記録）';if(w.dim!==dim.id)return '記録した地点は別のディメンションです';
   hud(player,`§b帰路の針　${direction(player.location,w)}　${Math.round(dist(player.location,w))}m`);return '';}
  case 'trail':{const t=trails.get(player.id);
   if(t&&!t.recording&&t.points.length){t.showUntil=Date.now()+10000;return '帰り道を10秒表示します';}
   trails.set(player.id,{points:[],max:a[1],until:Date.now()+a[0]*1000,recording:true,showUntil:0});return `${a[0]}秒間、通った道を記録します`;}
  case 'spring':effect(player,'jump_boost',a[0]);return '';
  case 'travel_wind':{if(Date.now()-(ctx.lastFight??0)<5000)return '戦闘中は使えません';effect(player,'speed',a[0]);return '';}
  case 'hazard_hint':{
   const v=player.getViewDirection(),l=Math.hypot(v.x,v.z)||1,dir={x:v.x/l,z:v.z/l};let warn='';
   for(let k=1;k<=a[0]&&!warn;k++){const x=Math.floor(player.location.x+dir.x*k),z=Math.floor(player.location.z+dir.z*k),y=Math.floor(player.location.y);
    try{let drop=0;for(let d=1;d<=5;d++){const b=dim.getBlock({x,y:y-d,z});if(/lava/.test(b?.typeId??'')){warn=`${k}m先に溶岩`;break;}if(b&&!b.isAir&&!b.isLiquid)break;drop=d;}if(!warn&&drop>=4)warn=`${k}m先に大きな段差`;}catch{}}
   hud(player,warn?`§c危険のささやき：${warn}`:'§a危険のささやき：前方に大きな危険は見当たりません');return '';}
  case 'ally_beacon':{const o=world.getAllPlayers().filter(x=>x.id!==player.id&&x.dimension.id===dim.id&&dist(x.location,player.location)<=128).sort((p,q)=>dist(p.location,player.location)-dist(q.location,player.location))[0];
   if(!o)return '同じディメンションの128m以内に仲間がいません';
   for(let k=0;k<a[0];k++)system.runTimeout(()=>{try{particle(o.dimension,'minecraft:totem_particle',{x:o.location.x,y:o.location.y+2.5,z:o.location.z});}catch{}},20*k);
   return `${o.name}：${direction(player.location,o.location)} ${Math.round(dist(player.location,o.location))}m`;}
  case 'rest_hint':{let spots=[];try{spots=game.peek(d=>{const ex=d.players[player.id]?.explored??[];return [...(d.town?.location?[{name:'拠点',...d.town.location}]:[]),...(d.landmarks??[]).filter(l=>ex.includes(l.id)).map(l=>({name:l.name,...l.location}))];});}catch{}
   const here=spots.filter(s=>(s.dimension??'minecraft:overworld')===dim.id).sort((p,q)=>dist(p,player.location)-dist(q,player.location))[0];
   return here?`${here.name}：${direction(player.location,here)} ${Math.round(dist(player.location,here))}m`:'発見済みの名所がこのディメンションにありません';}
  case 'journal_hint':{const e=lookEntity(player);if(!e)return '何も見ていません';let known=false;try{known=!!game.peek(d=>d.players[player.id]?.codex?.[e.typeId]);}catch{}
   return known?`${ctx.itemName?.(e.typeId)??nameOf(e)}：図鑑に登録済み`:'まだ図鑑にない相手です';}
  // daily life / play
  case 'collect_owned':{
   // a dropped item has no owner in the game: only items near the wearer while no other player is within 6 blocks count as theirs
   if(world.getAllPlayers().some(o=>o.id!==player.id&&o.dimension.id===dim.id&&dist(o.location,player.location)<6))return '近くに他の人がいるので拾いません';
   const inv=player.getComponent('minecraft:inventory')?.container;let n=0;
   for(const e of dim.getEntities({location:player.location,maxDistance:a[0],type:'minecraft:item'}).slice(0,a[1])){try{const s=e.getComponent('minecraft:item')?.itemStack;if(!s)continue;const left=inv.addItem(s);if(left&&left.amount===s.amount)continue;e.remove();if(left)dim.spawnItem(left,player.location);n++;}catch{}}
   return n?`${n}スタック拾いました`:'拾える物がありません';}
  case 'count_item':{const id='minecraft:'+a[0];return COUNT_ITEMS.includes(id)?`${ctx.itemName?.(id)??a[0]}：${countItem(player,id)}個`:'';}
  case 'quest_missing':{let p;try{p=game.peek(d=>d.players[player.id]);}catch{}const q=questFor(player,p);if(!q)return '追跡中の依頼がありません';
   return q.have>=q.need?`${q.title}：材料はそろっています`:`${q.title}：${q.goal} あと${q.need-q.have}個`;}
  case 'food_inspect':{const s=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);if(!s||!SHELF[s.typeId])return '食べ物を持ってください';
   const d=dateOf(s),st=stateOf(s),hrs=d?Math.max(0,Math.round((d-Date.now())/3600000)):0;
   return `${ctx.itemName?.(s.typeId)??s.typeId}：品質${TIERS[qualityOf(s)].label}　${st===EXPIRED?'§c期限切れ':`${st===NEAR?'§e期限間近 ':''}残り約${Math.floor(hrs/24)}日${hrs%24}時間（${dateText(d)}まで）`}`;}
  case 'crop_inspect':{const b=lookBlock(player);if(!b)return '作物を見てください';let g;try{g=b.permutation.getState('growth');}catch{}
   if(g===undefined)return `${ctx.itemName?.(b.typeId)??b.typeId}は作物ではありません`;return `${ctx.itemName?.(b.typeId)??b.typeId}：成長 ${g} / 7${g>=7?'（収穫できます）':''}`;}
  case 'ranch_inspect':{const e=target??lookEntity(player);if(!e||!ANIMALS[e.typeId])return '牧場に登録できる動物を見てください';
   // the owner's ranch record (ranch-runtime.js): animals[entity id] = {next: when it can be cared for again}
   const info=read(player,'cooptown:ranch',{}).animals?.[e.id];
   if(!info)return `${ANIMALS[e.typeId]}：あなたの牧場に登録されていません`;const wait=Math.max(0,Math.ceil(((info.next??0)-Date.now())/60000));return `${ANIMALS[e.typeId]}：${wait?`次の世話まで約${wait}分`:'今お世話できます'}`;}
  case 'gear_inspect':{const s=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);if(!s)return '道具を持ってください';
   const d=s.getComponent?.('minecraft:durability');let rune='';try{const r=JSON.parse(s.getDynamicProperty('cooptown:rune')??'null');if(r)rune=`　刻印「${r.name}」${ctx.runeState?.(s)??''}`;}catch{}
   return `${ctx.itemName?.(s.typeId)??s.typeId}：${d?`耐久 ${d.maxDurability-d.damage} / ${d.maxDurability}`:'耐久なし'}${rune}`;}
  case 'fishing_practice':system.run(()=>void playMinigame(player,'fish').then(score=>say(player,`§b[釣り人の拍子] 練習結果 ${Math.round(score*100)}%（報酬なし）`)));return '';
  case 'confetti':for(let k=0;k<a[0]*2;k++)system.runTimeout(()=>{try{const l=player.location;particle(dim,'minecraft:totem_particle',{x:l.x,y:l.y+2,z:l.z});}catch{}},10*k);sound(player,'random.levelup',1.5);return '';
  case 'fanfare':sound(player,'random.levelup',1.2);particle(dim,'minecraft:totem_particle',player.location);return '';
 }
 return '';
}
