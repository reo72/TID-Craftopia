import {world,ItemStack} from '@minecraft/server';
import {chooseDialog,noticeDialog} from './dialog.js';
import {TOOLS} from './job-tools-config.js';
import {CANS} from './watering-config.js';
import {shiftLore} from './freshness.js';
import {MASTERY,goalOfWeek,weekOf} from './progress-config.js';
import {LEGEND,LEGEND_KINDS} from './legend-runtime.js';
import {resetDungeonCooldown} from './dungeon-runtime.js';

// /cooptown:debug (staff, tag cooptown_admin; asked 2026-10-27): quick ways to try the systems in game without
// playing them up: the job tools, a job level, food dates, cooldowns, a legendary animal, mastery stars, the goal.
const HOUR=3600000;
const give=(player,id,n=1)=>{try{const left=player.getComponent('minecraft:inventory').container.addItem(new ItemStack(id,n));if(left)player.dimension.spawnItem(left,player.location);}catch(e){player.sendMessage('§c'+id+': '+e);}};
export async function openDebug(player,game){
 if(!player.hasTag('cooptown_admin')){player.sendMessage('§c運営用のコマンドです。');return;}
 const items=['職業の専門道具を全部もらう','職業Lvを50にする','職業Lvを1にする','持ち物の食べ物の期限を24時間進める','クールダウンを全部リセット','伝説の個体を出す','マスタリーの星を1つ足す','今週のサーバー目標を達成にする','ガチャ券を10枚もらう'];
 const i=await chooseDialog(player,'テスト用メニュー','運営のテスト用です。本番のプレイヤーには使わないでください。',items,{back:'閉じる'});
 if(i===undefined)return;
 const edit=fn=>game.admin(true,db=>{const p=db.players[player.id];if(p){fn(p,db);p.savedAt=Date.now();}});
 let done='完了しました。';
 try{
  if(i===0){for(const id of [...Object.keys(TOOLS),...Object.keys(CANS)])give(player,id,TOOLS[id]?.stack?8:1);done=`${Object.keys(TOOLS).length+Object.keys(CANS).length}種類を渡しました。`;}
  else if(i===1||i===2){const lv=i===1?50:1;edit(p=>{p.level=lv;p.xp=0;p.maxXp=100+(lv-1)*50;});done=`職業Lv.${lv}にしました。`;}
  else if(i===3){const c=player.getComponent('minecraft:inventory').container;let n=0;
   for(let k=0;k<c.size;k++){const s=c.getItem(k);if(!s)continue;const lore=s.getLore(),out=shiftLore(lore,-24*HOUR,-Infinity);if(out!==lore){s.setLore(out);c.setItem(k,s);n++;}}
   done=`${n}個の期限を24時間進めました（ラベルは1秒以内に更新）。`;}
  else if(i===4){for(const k of ['cooptown:potion_cd','cooptown:buffs'])try{player.setDynamicProperty(k,undefined);}catch{}resetDungeonCooldown(player.id);done='ポーション・バフ・探索戦のクールダウンを消しました。';}
  else if(i===5){const types=Object.keys(LEGEND_KINDS),t=types[Math.floor(Math.random()*types.length)];const e=player.dimension.spawnEntity(t,{x:player.location.x+3,y:player.location.y,z:player.location.z});
   e.nameTag='§6'+LEGEND_KINDS[t];e.addTag(LEGEND.tag);done=`${LEGEND_KINDS[t]}を出しました（近づくと発見）。`;}
  else if(i===6){edit(p=>{if((p.level??1)<MASTERY.level){p.level=MASTERY.level;p.maxXp=100+(MASTERY.level-1)*50;}p.mastery??={xp:0,perks:{}};p.mastery.xp=(Number(p.mastery.xp)||0)+MASTERY.perStar;});done='星を1つ足しました。';}
  else if(i===7){const w=weekOf(Date.now()),g=goalOfWeek(w);game.admin(true,db=>{if(db.goal?.week!==w)db.goal={week:w,key:g.key,have:0,by:{},claimed:[]};db.goal.have=g.target;db.goal.by[player.id]=Math.max(1,db.goal.by[player.id]??0);});done=`「${g.name}」を達成にしました。`;}
  else if(i===8){edit(p=>{p.tickets=(p.tickets??0)+10;});done='ガチャ券を10枚足しました。';}
 }catch(e){done='§c'+(e.message??e);}
 await noticeDialog(player,'テスト用メニュー',done,{close:'OK'});
}
