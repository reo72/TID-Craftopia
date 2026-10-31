import {world,system} from '@minecraft/server';
import {titleTrack,titleSeen,jobCount} from './job-count.js';
import {isPlaced} from './placed-store.js';
import {oreBlock} from './bulk-harvest.js';
import {lineOut,catcherOf} from './fish-hook.js';
import {isBrewing} from './brew-runtime.js';

// What the titles count from the world (titles-config.js): deaths and their causes, kills (bosses for everyone who
// fought them), logins, places, swimming, things owned or worn, and the farming / mining / woodcutting events.
// The job features count their own work (job-count.js titleTrack / titleSeen in each runtime).
const short=id=>String(id??'').replace(/^minecraft:/,'');
const dayKey=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const BOSSES=new Set(['minecraft:ender_dragon','minecraft:wither','minecraft:elder_guardian','minecraft:guardian','minecraft:warden']);
const COUNTED_KILLS=new Set(['minecraft:phantom',...BOSSES]);
const DEATH_CAUSE={entityExplosion:'explosion',blockExplosion:'explosion',fall:'fall',drowning:'drowning'};
const isHostile=e=>{try{return e.matches?.({families:['monster']})??false;}catch{return false;}};
const ORES={coal:'coal',iron:'iron',copper:'copper',gold:'gold',redstone:'redstone',lapis:'lapis',diamond:'diamond',emerald:'emerald',nether_gold:'nether_gold',quartz:'quartz'};
const oreOf=id=>{const m=/^(?:deepslate_|nether_)?(\w+?)_ore$/.exec(short(id));if(short(id)==='nether_quartz_ore')return 'quartz';if(short(id)==='nether_gold_ore')return 'nether_gold';if(short(id)==='ancient_debris')return 'ancient_debris';return m&&ORES[m[1]]?m[1]:undefined;};
// natural stone only, as mining XP counts it (mine-config.js): stone and cobblestone come out of lava generators
const STONES=new Set(['deepslate','granite','diorite','andesite','tuff','calcite','blackstone','end_stone','netherrack']);
const woodOf=id=>{const m=/^(?:stripped_)?(\w+?)_(log|stem|wood|hyphae)$/.exec(short(id));return m?m[1]:undefined;};
const CROP_BLOCKS=/^minecraft:(wheat|carrots|potatoes|beetroot|melon_stem|pumpkin_stem|sweet_berry_bush|cocoa|torchflower_crop|pitcher_crop|nether_wart)$/;
const SAPLING=/^minecraft:(\w+_sapling|mangrove_propagule)$/;
const SAPLING_KEY='cooptown:title_saplings',SAPLING_MAX=200;
// 暗い坑道を照らす (安全管理者 ...): a light placed with blocks above it (not under the sky) in an 8-block cell the player
// has not lit before; the cells are kept per player (LIT_MAX)
const LIGHTS=/^minecraft:(torch|soul_torch|copper_torch|lantern|soul_lantern|copper_lantern|redstone_torch|glowstone|sea_lantern|shroomlight|ochre_froglight|verdant_froglight|pearlescent_froglight)$/;
const LIT_KEY='cooptown:title_lit',LIT_MAX=600,LIT_CELL=8;
// ADHD titles: a kill this soon after breaking ore / stone (採掘中) or a log (伐採中) counts as "while working"
const WORK_MS=5000;
// 金床を落として倒す: an anvil placed this recently, this close (it falls on the mob)
const ANVIL_MS=10000,ANVIL_NEAR=3;
const JUNK=new Set(['bowl','leather','leather_boots','rotten_flesh','stick','string','potion','bone','ink_sac','tripwire_hook','lily_pad','bamboo','fishing_rod']);

export function installTitleHooks(){
 // ---- logins ----
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{
  if(initialSpawn){titleTrack(player,'joined');titleSeen(player,'login_days',dayKey());}
 });
 // ゴミを釣り上げる: a junk item landed by someone's hook
 world.afterEvents.entitySpawn.subscribe(({entity})=>{
  if(entity?.typeId!=='minecraft:item')return;
  let id;try{id=short(entity.getComponent('minecraft:item')?.itemStack?.typeId);}catch{return;}
  if(!JUNK.has(id))return;
  const owner=catcherOf(entity);if(owner?.typeId==='minecraft:player')titleTrack(owner,'fish_junk');
 });
 const lastWork=new Map(),anvils=[]; // player id -> {mine, log} (ms); anvils placed: {id, dim, x, z, at}
 world.afterEvents.playerLeave.subscribe(({playerId})=>lastWork.delete(playerId));
 // ---- deaths, and getting the things back where one fell (再出発) ----
 const fell=new Map(); // player id -> {dim, x, y, z, until}
 world.afterEvents.entityDie.subscribe(({deadEntity:dead,damageSource})=>{
  if(dead?.typeId==='minecraft:player'){
   const cause=String(damageSource?.cause??'');titleTrack(dead,'deaths');if(cause)titleSeen(dead,'death_causes',cause);
   if(DEATH_CAUSE[cause])titleTrack(dead,'death:'+DEATH_CAUSE[cause]);
   if(/^(lava|fire|fireTick)$/.test(cause))titleTrack(dead,'death:fire'); // the awards' マグマダイバー
   if(damageSource?.damagingEntity?.typeId==='minecraft:creeper')titleTrack(dead,'death:creeper');
   try{const l=dead.location;fell.set(dead.id,{dim:dead.dimension.id,x:l.x,y:l.y,z:l.z,until:Date.now()+15*60000});}catch{}
   return;
  }
  // kills: by hand, a hoe, the mob kinds; bosses count for everyone who hurt them
  const killer=damageSource?.damagingEntity;
  if(BOSSES.has(dead?.typeId)&&killer?.typeId==='minecraft:player'){const set=fighters.get(dead.id)??new Set();set.add(killer.id);fighters.set(dead.id,set);}
  if(BOSSES.has(dead?.typeId)){for(const id of fighters.get(dead.id)??[]){const p=world.getEntity?.(id)??world.getAllPlayers().find(x=>x.id===id);if(p)titleTrack(p,'kill:'+short(dead.typeId));}fighters.delete(dead.id);}
  if(String(damageSource?.cause??'')==='anvil'&&!killer){
   const now=Date.now(),l=dead.location,dim=dead.dimension.id;
   const a=anvils.findLast(x=>now-x.at<=ANVIL_MS&&x.dim===dim&&Math.abs(x.x-l.x)<=ANVIL_NEAR&&Math.abs(x.z-l.z)<=ANVIL_NEAR);
   const p=a&&(world.getEntity?.(a.id)??world.getAllPlayers().find(x=>x.id===a.id));if(p)titleTrack(p,'kill_while:anvil');
  }
  if(killer?.typeId!=='minecraft:player')return;
  titleTrack(killer,'kills');
  {const w=lastWork.get(killer.id),now=Date.now();
   if(now-(w?.mine??0)<=WORK_MS)titleTrack(killer,'kill_while:mine');if(now-(w?.log??0)<=WORK_MS)titleTrack(killer,'kill_while:log');
   if(lineOut(killer.id))titleTrack(killer,'kill_while:fish');if(isBrewing(killer))titleTrack(killer,'kill_while:brew');}
  if(COUNTED_KILLS.has(dead.typeId)&&!BOSSES.has(dead.typeId))titleTrack(killer,'kill:'+short(dead.typeId));
  if(isHostile(dead)){titleTrack(killer,'kill_hostile');titleSeen(killer,'kill_kinds',short(dead.typeId));}
  let hand;try{hand=killer.getComponent('minecraft:equippable')?.getEquipment('Mainhand');}catch{}
  if(!hand&&damageSource.cause==='entityAttack')titleTrack(killer,'kill_with:hand');
  else if(/_hoe$/.test(hand?.typeId??''))titleTrack(killer,'kill_with:hoe');
 });
 // who fought a boss; a phantom's hit
 const fighters=new Map(); // boss id -> Set of player ids
 world.afterEvents.entityHurt.subscribe(({hurtEntity:hurt,damageSource})=>{
  const by=damageSource?.damagingEntity;
  if(hurt?.typeId==='minecraft:player'&&by?.typeId==='minecraft:phantom')titleTrack(hurt,'hurt_by:phantom');
  if(BOSSES.has(hurt?.typeId)&&by?.typeId==='minecraft:player'){const set=fighters.get(hurt.id)??new Set();set.add(by.id);fighters.set(hurt.id,set);}
 });
 world.afterEvents.playerDimensionChange?.subscribe(({player,toDimension})=>{if(toDimension?.id==='minecraft:nether')titleTrack(player,'dim:nether');});
 // ---- every 5 seconds: places, owned / worn things, the raid hero, the place one fell ----
 const once=new Map(); // player id -> Set of keys already counted this session
 const first=(p,k)=>{const s=once.get(p.id)??new Set();once.set(p.id,s);if(s.has(k))return false;s.add(k);return true;};
 system.runInterval(()=>{
  const now=Date.now();
  for(const p of world.getAllPlayers()){
   try{const b=p.dimension.getBiome?.(p.location)?.id;if(b)titleSeen(p,'biomes',short(b));}catch{}
   try{if(p.location.y<0&&first(p,'deep'))titleTrack(p,'depth:deepslate');if(p.location.y<-55&&first(p,'bedrock'))titleTrack(p,'depth:bedrock');}catch{}
   try{const inv=p.getComponent('minecraft:inventory')?.container;for(let i=0;inv&&i<inv.size;i++){const id=inv.getItem(i)?.typeId;if((id==='minecraft:elytra'||id==='minecraft:dragon_egg')&&first(p,id))titleTrack(p,'got:'+short(id));}}catch{}
   try{const eq=p.getComponent('minecraft:equippable');if(['Head','Chest','Legs','Feet'].every(s=>/^minecraft:netherite_/.test(eq?.getEquipment(s)?.typeId??''))&&first(p,'netherite'))titleTrack(p,'netherite_set');}catch{}
   try{if(p.getEffect('hero_of_the_village')&&first(p,'hero'))titleTrack(p,'raid_win');}catch{}
   const f=fell.get(p.id);
   if(f){if(now>f.until)fell.delete(p.id);else if(p.dimension.id===f.dim&&Math.hypot(p.location.x-f.x,p.location.y-f.y,p.location.z-f.z)<3){titleTrack(p,'recovered');fell.delete(p.id);}}
  }
 },100);
 world.afterEvents.playerLeave.subscribe(({playerId})=>{once.delete(playerId);fell.delete(playerId);last.delete(playerId);});
 // ---- swimming: metres while swimming (one tick in four) ----
 const last=new Map(),swum=new Map();
 system.runInterval(()=>{
  for(const p of world.getAllPlayers()){
   let l;try{l=p.location;}catch{continue;}
   const before=last.get(p.id);last.set(p.id,{x:l.x,z:l.z});
   let swimming=false,walking=false;try{swimming=p.isSwimming;walking=!swimming&&p.isOnGround&&!p.isGliding&&!p.getComponent('minecraft:riding');}catch{}
   if(!(swimming||walking)||!before)continue;
   const d=Math.hypot(l.x-before.x,l.z-before.z);if(d>2)continue; // a teleport, not a step
   const k=swimming?'swim_m':'walk_m',acc=swimming?swum:walked; // walking: the final-day awards (awards.js)
   const m=(acc.get(p.id)??0)+d;const whole=Math.floor(m);acc.set(p.id,m-whole);if(whole)titleTrack(p,k,whole);
  }
 },4);
 const walked=new Map();
 // ---- for the final-day awards (awards.js): play time, jumps, sleeps, blocks, meals, chat, broken tools ----
 const jumping=new Map(),sleeping=new Map();
 system.runInterval(()=>{for(const p of world.getAllPlayers())titleTrack(p,'play_s',5);},100);
 system.runInterval(()=>{
  for(const p of world.getAllPlayers()){
   let j=false,s=false;try{j=p.isJumping;s=p.isSleeping;}catch{}
   if(j&&!jumping.get(p.id))titleTrack(p,'jumps');jumping.set(p.id,j);
   if(s&&!sleeping.get(p.id))titleTrack(p,'sleeps');sleeping.set(p.id,s);
  }
 },2);
 world.afterEvents.playerPlaceBlock.subscribe(({player,block})=>{
  titleTrack(player,'placed');
  const id=block.typeId,l=block.location,dim=block.dimension;
  if(/^minecraft:(chipped_|damaged_)?anvil$/.test(id)){anvils.push({id:player.id,dim:dim.id,x:l.x+.5,z:l.z+.5,at:Date.now()});while(anvils.length>20)anvils.shift();}
  if(LIGHTS.test(id)&&dim.id==='minecraft:overworld'){
   let roofed=false;try{const top=dim.getTopmostBlock?.({x:l.x,z:l.z});roofed=!!top&&top.location.y>l.y+3;}catch{}
   if(!roofed)return;
   const cell=`${Math.floor(l.x/LIT_CELL)},${Math.floor(l.y/LIT_CELL)},${Math.floor(l.z/LIT_CELL)}`;
   let cells=[];try{cells=JSON.parse(player.getDynamicProperty(LIT_KEY)??'[]');}catch{}
   if(cells.includes(cell))return;
   cells.push(cell);try{player.setDynamicProperty(LIT_KEY,JSON.stringify(cells.slice(-LIT_MAX)));}catch{}
   titleTrack(player,'lit_dark');
  }
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,itemStackBeforeBreak:before,itemStackAfterBreak:after})=>{
  titleTrack(player,'broken');
  try{const d=before?.getComponent('minecraft:durability');if(d&&d.maxDurability>0&&!after&&d.damage>=d.maxDurability-2)titleTrack(player,'tools_broken');}catch{}
 });
 world.afterEvents.itemCompleteUse?.subscribe(({itemStack,source})=>{try{if(source?.typeId==='minecraft:player'&&itemStack?.getComponent('minecraft:food'))titleTrack(source,'eaten');}catch{}});
 world.afterEvents.chatSend?.subscribe(({sender})=>{if(sender)titleTrack(sender,'chat');});
 // ---- curing a zombie villager: the golden apple, then a villager appearing where it was ----
 const curing=new Map(); // zombie id -> {player id, entity, dim, x, y, z, until}
 world.afterEvents.playerInteractWithEntity?.subscribe(({player,target,itemStack,beforeItemStack})=>{
  const used=(beforeItemStack??itemStack)?.typeId;
  if(/^minecraft:zombie_villager(_v2)?$/.test(target?.typeId??'')&&used==='minecraft:golden_apple'){const l=target.location;curing.set(target.id,{player:player.id,entity:target,dim:target.dimension.id,x:l.x,y:l.y,z:l.z,until:Date.now()+10*60000});}
 });
 system.runInterval(()=>{const now=Date.now();for(const [id,c] of curing){if(now>c.until){curing.delete(id);continue;}try{if(c.entity.isValid){const l=c.entity.location;c.x=l.x;c.y=l.y;c.z=l.z;}}catch{}}},40);
 world.afterEvents.entitySpawn.subscribe(({entity,cause})=>{
  const type=entity?.typeId;
  if(/^minecraft:villager(_v2)?$/.test(type??'')&&cause==='Transformed'){
   const l=entity.location;
   for(const [id,c] of curing){if(c.dim===entity.dimension.id&&Math.hypot(l.x-c.x,l.y-c.y,l.z-c.z)<3){const p=world.getEntity?.(c.player)??world.getAllPlayers().find(x=>x.id===c.player);if(p)titleTrack(p,'zombie_cure');curing.delete(id);break;}}
  }
  // breeding: the player nearest a newborn
  if(cause==='Born'&&type){
   let best,bd=10;try{for(const p of entity.dimension.getPlayers({location:entity.location,maxDistance:10})){const d=Math.hypot(p.location.x-entity.location.x,p.location.z-entity.location.z);if(d<bd){bd=d;best=p;}}}catch{}
   if(best){titleTrack(best,'bred');titleSeen(best,'bred',short(type));}
  }
 });
 // ---- farming ----
 world.afterEvents.playerPlaceBlock.subscribe(({player,block})=>{
  const id=block.typeId;
  if(id==='minecraft:wheat')titleTrack(player,'plant:wheat');
  if(id==='minecraft:beehive')titleTrack(player,'place:beehive');
  if(SAPLING.test(id)){titleTrack(player,'sapling');titleSeen(player,'planted',short(id));
   // remembered so the tree it grows into counts (桃栗三年)
   try{const list=JSON.parse(player.getDynamicProperty(SAPLING_KEY)??'[]');list.push([block.dimension.id,block.location.x,block.location.y,block.location.z]);player.setDynamicProperty(SAPLING_KEY,JSON.stringify(list.slice(-SAPLING_MAX)));}catch{}}
 });
 // grown saplings: a log where one was planted
 system.runInterval(()=>{
  for(const p of world.getAllPlayers()){
   let list;try{list=JSON.parse(p.getDynamicProperty(SAPLING_KEY)??'[]');}catch{continue;}if(!list.length)continue;
   const keep=[];let grown=0;
   for(const e of list){let b;try{b=world.getDimension(e[0]).getBlock({x:e[1],y:e[2],z:e[3]});}catch{}
    if(!b){keep.push(e);continue;}if(woodOf(b.typeId))grown++;else if(SAPLING.test(b.typeId))keep.push(e);}
   if(grown)titleTrack(p,'tree_grown',grown);
   if(keep.length!==list.length)try{p.setDynamicProperty(SAPLING_KEY,JSON.stringify(keep));}catch{}
  }
 },600);
 // tilling, bone meal, honey (first press only: holding repeats)
 world.beforeEvents.playerInteractWithBlock.subscribe(ev=>{
  if(ev.isFirstEvent===false)return;
  const {player,block}=ev,item=ev.itemStack?.typeId??'',id=block.typeId,loc={...block.location},dim=block.dimension;
  if(/_hoe$/.test(item)&&/^minecraft:(dirt|grass_block|dirt_path|coarse_dirt|rooted_dirt)$/.test(id))
   system.run(()=>{try{if(dim.getBlock(loc)?.typeId==='minecraft:farmland')titleTrack(player,'till');}catch{}});
  if(item==='minecraft:bone_meal'){if(CROP_BLOCKS.test(id))titleTrack(player,'bonemeal:crop');else if(SAPLING.test(id))titleTrack(player,'bonemeal:sapling');}
  if(/^minecraft:(beehive|bee_nest)$/.test(id)){
   let full=false;try{full=block.permutation.getState('honey_level')>=5;}catch{}
   if(full&&item==='minecraft:glass_bottle'){titleTrack(player,'honey');
    let smoke=false;try{for(let dy=1;dy<=5&&!smoke;dy++){const b=dim.getBlock({...loc,y:loc.y-dy});smoke=/campfire$/.test(b?.typeId??'');}}catch{}
    if(smoke)titleTrack(player,'honey_safe');}
   if(full&&item==='minecraft:shears')titleTrack(player,'honeycomb',3);
  }
  if(id==='minecraft:vault'&&/^minecraft:(ominous_)?trial_key$/.test(item))titleTrack(player,'vault_open');
  if(/^minecraft:cave_vines(_body|_head)?_with_berries$/.test(id))titleSeen(player,'harvested','glow_berries');
 });
 // ---- breaking: crops the farm list leaves out, ores, stone, logs (blocks a player placed do not count) ----
 const placedNow=new Map(); // player id -> whether the block about to break was placed
 world.beforeEvents.playerBreakBlock.subscribe(({player,block})=>{
  const id=block.typeId;if(!(oreOf(id)||STONES.has(short(id))||woodOf(id)||id==='minecraft:gilded_blackstone'))return;
  let placed=false;try{placed=isPlaced(block.dimension.id,block.location);}catch{}placedNow.set(player.id,placed);
 });
 world.afterEvents.playerBreakBlock.subscribe(({player,brokenBlockPermutation})=>{
  const id=brokenBlockPermutation.type.id,s=short(id);
  if(/^(bamboo|kelp|kelp_plant|cactus)$/.test(s))titleSeen(player,'harvested',s==='kelp_plant'?'kelp':s);
  const ore=oreOf(id),wood=woodOf(id),stone=STONES.has(s);
  if(s==='gilded_blackstone'){const placed=placedNow.get(player.id);placedNow.delete(player.id);if(!placed)titleSeen(player,'ore_blocks',s);return;}
  if(!ore&&!wood&&!stone)return;
  const placed=placedNow.get(player.id);placedNow.delete(player.id);if(placed)return;
  if(ore){titleTrack(player,'ore:'+ore);titleSeen(player,'ores',ore);titleSeen(player,'ore_blocks',oreBlock(id));try{if(player.getEffect('haste'))titleTrack(player,'ore_with:haste');}catch{}}
  if(stone)titleTrack(player,'stone');
  // the dailies of 鉱夫 / 木こり (natural blocks only, like the titles)
  if(ore)jobCount(player,'mine_ore');else if(stone)jobCount(player,'mine_stone');if(wood&&!/^stripped_/.test(s))jobCount(player,'chop_log');
  if(ore||stone)(lastWork.get(player.id)??lastWork.set(player.id,{}).get(player.id)).mine=Date.now();
  if(wood)(lastWork.get(player.id)??lastWork.set(player.id,{}).get(player.id)).log=Date.now();
  if(wood&&!/^stripped_/.test(s)){titleTrack(player,'log');titleSeen(player,'log_kinds',wood);}
 });
}
