// Contract with the site link pack (CoopTown_Portal_BP). The main pack works without it.
//  - Copies job / levels / money / title to scoreboards and tags, because another pack can't read this
//    pack's dynamic properties: lv_player lv_gather lv_mine lv_craft money, job_main:<id> job_sub:<id>
//    job:<id> title:<name>
//  - Runs the money orders portal:escrow / payout / refund (once per questId+op, see game.portalOp) and
//    answers portal:result; announces portal:delivered and portal:town
//  - Keeps a mirror of the site's quests (portal:quest_update / quest_reset) for the in-game board
import {world,system} from '@minecraft/server';
import {ITEM_NAMES} from './game-config.js';
import {TOWN_STAGES} from './cooperation-config.js';

export const JOB_IDS={'冒険家':'adventurer','鉱夫':'miner','木こり':'lumberjack','農家':'farmer','鍛冶師':'blacksmith','料理人':'cook','付与術師':'enchanter','釣り師':'fisher','調合師':'alchemist'};
const SCORES={player:'lv_player',gather:'lv_gather',mine:'lv_mine',craft:'lv_craft',money:'money'};
const TAG_PREFIXES=['job:','job_main:','job_sub:','title:'];
const TOWN_ITEMS=['minecraft:oak_log','minecraft:iron_ingot','minecraft:cobblestone'];
const ONLINE_MS=5*60*1000;
let lastSeen=0;
/** The link pack answered within the last 5 minutes: the board then uses the site's quests. */
export const portalOnline=()=>Date.now()-lastSeen<ONLINE_MS;
const send=(id,data)=>{try{system.sendScriptEvent(id,JSON.stringify(data));}catch(e){console.warn(`[CoopTown] ${id}: ${e}`);}};
const tell=(xuid,text)=>{try{world.getAllPlayers().find(p=>p.id===xuid)?.sendMessage(text);}catch{}};

// ---- scoreboards and tags ----
const objective=name=>world.scoreboard.getObjective(name)??world.scoreboard.addObjective(name,name);
function mirror(game){
 const players=world.getAllPlayers();if(!players.length)return;
 game.peek(db=>{
  for(const player of players){
   const p=db.players[player.id];if(!p)continue;
   try{
    const values={player:p.level,gather:p.gather?.level,mine:p.mine?.level,craft:p.craft?.level,money:p.coins};
    for(const [k,name] of Object.entries(SCORES)){
     const v=Number.isSafeInteger(values[k])?Math.max(0,Math.min(2147483647,values[k])):0,o=objective(name);
     // getScore throws "Failed to resolve identity" for a player who never had a score; setScore creates it
     let current;try{current=player.scoreboardIdentity?o.getScore(player):undefined;}catch{current=undefined;}
     if(current!==v){try{o.setScore(player,v);}catch{player.runCommand(`scoreboard players set @s ${name} ${v}`);}}
    }
    const want=new Set();
    if(JOB_IDS[p.job]){want.add('job_main:'+JOB_IDS[p.job]);want.add('job:'+JOB_IDS[p.job]);}
    if(JOB_IDS[p.secondJob]){want.add('job_sub:'+JOB_IDS[p.secondJob]);want.add('job:'+JOB_IDS[p.secondJob]);}
    if(typeof p.title==='string'&&p.title)want.add('title:'+p.title);
    const have=player.getTags().filter(t=>TAG_PREFIXES.some(x=>t.startsWith(x)));
    for(const t of have)if(!want.has(t))player.removeTag(t);
    for(const t of want)if(!have.includes(t))player.addTag(t);
   }catch(e){console.warn('[CoopTown] スコアボード/タグの書き込みに失敗: '+e);}
  }
 });
}
// ---- town ----
let lastTown='';
function town(game){
 const t=game.peek(db=>{const need=db.town.level*512;return {
  level:db.town.level,
  // the town levels up every 512 items delivered in total; each material shows its share of that goal
  deliveries:TOWN_ITEMS.map(id=>({item:ITEM_NAMES[id]??id,have:db.town.materials?.[id]??0,need})),
  facilities:TOWN_STAGES.filter(s=>s.level<=db.town.level).map(s=>s.name)
 };});
 const text=JSON.stringify(t);if(text===lastTown)return;lastTown=text;send('portal:town',t);
}
// ---- orders from the link pack ----
function receive(game,id,message){
 let m;try{m=JSON.parse(message);}catch{return;}
 lastSeen=Date.now();
 if(['portal:escrow','portal:payout','portal:refund'].includes(id)){
  const op=id.slice(7);let r;
  try{r=game.portalOp(op,m);}catch(e){r={ok:false,reason:String(e.message??e)};}
  send('portal:result',{questId:m.questId,op,ok:r.ok,...(r.reason?{reason:r.reason}:{})});
  if(r.ok&&r.at>Date.now()-5000){ // tell only when it really happened now, not for a repeated order
   const q=game.peek(db=>db.portal?.quests?.[m.questId]),name=q?`「${q.title}」`:'';
   tell(m.xuid,op==='escrow'?`§e依頼${name}の報酬 ${m.amount}コインを預かりました。`:op==='payout'?`§a依頼${name}の報酬 ${m.amount}コインを受け取りました。`:`§a依頼${name}の報酬 ${m.amount}コインが返金されました。`);
  }
 }else if(id==='portal:quest_update'&&m.quest)game.portalQuest(m.quest);
 else if(id==='portal:quest_reset')game.portalQuest(null,true);
}
// ---- used by the in-game board ----
export const questCreate=(player,{title,itemId,qty,reward})=>send('portal:quest_create',{requestId:`${player.id}-${Date.now().toString(36)}-${Math.floor(Math.random()*1e6).toString(36)}`,ownerXuid:player.id,title,item:ITEM_NAMES[itemId]??itemId,qty,reward});
export const questAction=(player,questId,action)=>send('portal:quest_action',{questId,action,xuid:player.id});
export const questDelivered=(player,questId)=>send('portal:delivered',{questId,xuid:player.id});
const ITEM_BY_NAME=Object.fromEntries(Object.entries(ITEM_NAMES).map(([id,name])=>[name,id]));
/** Minecraft item id for a quest's item name (the site uses names like 丸石); undefined if unknown. */
export const questItem=name=>ITEM_BY_NAME[name];

export function installPortalBridge({game}){
 system.afterEvents.scriptEventReceive.subscribe(({id,message})=>{
  if(['portal:escrow','portal:payout','portal:refund','portal:quest_update','portal:quest_reset','portal:status','portal:quest_create_failed'].includes(id))receive(game,id,message);
 },{namespaces:['portal']});
 system.runInterval(()=>{try{mirror(game);}catch(e){console.warn('[CoopTown] '+e);}},100);
 system.runInterval(()=>{try{town(game);}catch(e){console.warn('[CoopTown] '+e);}},200);
}
