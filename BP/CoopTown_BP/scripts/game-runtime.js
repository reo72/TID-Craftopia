import {installTownWelcome} from './town-welcome.js';
import {MINE_BLOCKS} from './mine-config.js';
import {GATHER_BLOCKS} from './gather-config.js';
import {markPlaced,importLegacy} from './placed-store.js';
import {installGather} from './gather-runtime.js';
import {installHudLog} from './hud-log.js';
import {infoLines,setPartyLines} from './hud-info.js';
import {membersFor,partyMarks,partyText} from './party.js';
import {installNameTags} from './name-tag.js';
import {prefs,notify,installEventNotices} from './prefs.js';
import {installPlayTime,freeJobChange,playSeconds,playTimeText} from './playtime.js';
import {installPickupLog} from './pickup-log.js';
import {installAdmin,openAdmin} from './admin-runtime.js';
import {installMinimap,openMapSettings,setPartyMarks} from './minimap.js';
import {runCooperation} from './cooperation-runtime.js';
import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,ModalFormData} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {createEngine,newDatabase,demand,integer} from './game-engine.js';
import {RULES,JOBS,TRADE_ITEMS,ORDERS,RECIPES,DAILY,CODEX,ITEM_NAMES,dayKey} from './game-config.js';
import {SKILL_BY_ID} from './skill-config.js';
import {GACHA,ITEM_ALIASES,gachaRatesText,gachaHistoryText} from './gacha-config.js';
import {ticketsOf} from './gacha-engine.js';
import {showGacha} from './gacha-show.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {installWorkbench} from './workbench-runtime.js';
import {installEnchanting} from './enchant-runtime.js';
import {installCooking} from './cook-runtime.js';
import {installAnvil} from './anvil-runtime.js';
import {installComposter} from './compost-runtime.js';
import {installBrewing} from './brew-runtime.js';
import {installShelf} from './shelf-runtime.js';
import {installSmoker} from './smoke-runtime.js';
import {installBlastFurnace} from './blast-runtime.js';
import {installCauldron} from './cauldron-runtime.js';
import {installQuality} from './quality-runtime.js';
import {installWatering} from './watering.js';
import {installJobTools} from './job-tools.js';
import {installLegends} from './legend-runtime.js';
import {installDungeons} from './dungeon-runtime.js';
import {installTutorial} from './tutorial.js';
import {installExpiryNotice} from './expiry-notice.js';
import {openDebug} from './debug-menu.js';
import {installNoticeLogin} from './notice-book.js';
import {installWardrobe,openWardrobe} from './wardrobe.js';
import {installTownBgm} from './town-bgm.js';
import {installTownRules} from './town-rules.js';
import {installIngredientDrops} from './ingredient-drops.js';
import {installBagReady} from './backpack-runtime.js';
import {installRestartNotice} from './restart-notice.js';
import {installMobVariance} from './mob-variance.js';
import {installDynamicLight} from './dynamic-light.js';
import {installFryingPans} from './frying-pan.js';
import {setPriceOverrides} from './sell-price.js';
import {installPets,openPets} from './pet-runtime.js';
import {installItemDesc,isPlainItem,deliverable} from './item-desc.js';
import {TIERS} from './quality.js';
import {installTitleHooks} from './title-hooks.js';
import {installBulkHarvest} from './bulk-harvest.js';
import {installWorkshops} from './workshop-runtime.js';
import {installOreQuality} from './ore-quality.js';
import {installRanch} from './ranch-runtime.js';
import {installExplore} from './explore-runtime.js';
import {installFishing} from './fish-runtime.js';
import {installRunes} from './rune-runtime.js';
import {bindJobCount} from './job-count.js';
import {installWorldMap} from './worldmap-runtime.js';
import {installFood} from './food-runtime.js';
import {installChat} from './chat-runtime.js';
import {installFriends} from './friend-runtime.js';
import {installNpcs} from './npc-runtime.js';
import {installMobHp} from './mob-hp.js';
import {installCelebrate} from './celebrate.js';
import {confirmDialog,chooseDialog,noticeDialog,dialog} from './dialog.js';
import {ACHIEVEMENTS} from './achievements-config.js';
import {installPortalBridge,portalOnline,questCreate,questAction,questDelivered,questItem} from './portal-bridge.js';
import {installNotify,notifyAll,notify as notifyBar,titleKind} from './notify.js';
import {TITLES} from './titles-config.js';
// エピック and above (asked 2026-10-27): the whole server hears about it, in chat and on the notice bar
export const ANNOUNCE_RANKS=new Set(['エピック','レジェンド','アセンデッド']);
const RANK_COLOR={エピック:'§d',レジェンド:'§6',アセンデッド:'§c'};
export function announceTitles(player,names){
 for(const n of names){const t=TITLES.find(x=>x.title===n);if(!t||!ANNOUNCE_RANKS.has(t.rank))continue;
  try{world.sendMessage(`${RANK_COLOR[t.rank]}【${t.rank}】${player.name}が称号「${n}」を獲得しました！`);}catch{}
  for(const o of world.getAllPlayers())if(o.id!==player.id)try{notifyBar(o,`${player.name}：${n}`,titleKind(t.rank),6);}catch{}}
}
import {installDexWatch} from './dexterity.js';
import {pushText} from './hud-log.js';
import {installGearStats} from './gear-stats.js';
import {setCommandHandlers} from './commands.js';
import {installChestLock} from './chest-lock.js';
import {installGraves} from './grave.js';
let cache,head,worldMap,friends,celebrate;
const CHUNK=7000;
let dirty=false;const FLUSH_TICKS=40;
const storage={stable:true,
 read(){if(cache)return cache;const raw=world.getDynamicProperty('cooptown:ledger_head');if(raw===undefined){head={slot:1,count:0};cache=newDatabase();return cache;}try{if(typeof raw!=='string')throw new Error('head type');head=JSON.parse(raw);demand([0,1].includes(head.slot)&&Number.isInteger(head.count)&&head.count>0&&head.count<=256,'head');let text='';for(let i=0;i<head.count;i++){const part=world.getDynamicProperty(`cooptown:ledger_${head.slot}_${i}`);demand(typeof part==='string','chunk');text+=part;}cache=JSON.parse(text);return cache;}catch{throw new Error('手帳の保存データを読み込めません。上書きせず運営へ連絡してください。');}},
 // lag with many players (2026-11-01): every action wrote the whole save; now the memory copy changes at once and the
 // save is written at most every FLUSH_TICKS (a crash can lose that last moment)
 write(data){this.read();cache=data;dirty=true;},
 flush(){if(!dirty)return;dirty=false;const data=cache,text=JSON.stringify(data),count=Math.ceil(text.length/CHUNK),slot=1-head.slot;demand(count<=256,'保存容量の上限です。運営へ連絡してください。');for(let i=0;i<count;i++)world.setDynamicProperty(`cooptown:ledger_${slot}_${i}`,text.slice(i*CHUNK,(i+1)*CHUNK));const next={slot,count};world.setDynamicProperty('cooptown:ledger_head',JSON.stringify(next));head=next;cache=data;}
};
system.runInterval(()=>{try{storage.flush();}catch(e){console.warn('[CoopTown] 保存: '+e);}},FLUSH_TICKS);
try{system.beforeEvents?.shutdown?.subscribe(()=>{try{storage.flush();}catch{}});}catch{}
const BACKUP_SLOTS=3;
/** Ledger backups for the admin screen. Each slot: cooptown:backup_<n>_meta + _<n>_<i> chunks. */
export const backups={
 list(){const out=[];for(let n=0;n<BACKUP_SLOTS;n++){const raw=world.getDynamicProperty(`cooptown:backup_${n}_meta`);if(typeof raw!=='string')continue;try{out.push({slot:n,...JSON.parse(raw)});}catch{}}return out.sort((a,b)=>b.at-a.at);},
 create(by,label='手動',skip=-1){
  const text=JSON.stringify(storage.read()),count=Math.ceil(text.length/CHUNK);demand(count<=256,'保存容量の上限です。');
  const used=this.list().filter(b=>b.slot!==skip),free=[...Array(BACKUP_SLOTS).keys()].filter(n=>n!==skip&&!used.some(b=>b.slot===n));
  const slot=free.length?free[0]:used.filter(b=>b.slot!==skip).sort((a,b)=>a.at-b.at)[0].slot;
  const old=this.list().find(b=>b.slot===slot);for(let i=0;old&&i<old.count;i++)world.setDynamicProperty(`cooptown:backup_${slot}_${i}`,undefined);
  for(let i=0;i<count;i++)world.setDynamicProperty(`cooptown:backup_${slot}_${i}`,text.slice(i*CHUNK,(i+1)*CHUNK));
  const meta={at:Date.now(),by,label,count,size:text.length};world.setDynamicProperty(`cooptown:backup_${slot}_meta`,JSON.stringify(meta));return {slot,...meta};
 },
 restore(slot,by){
  const meta=this.list().find(b=>b.slot===slot);demand(meta,'バックアップが見つかりません。');let text='';
  for(let i=0;i<meta.count;i++){const part=world.getDynamicProperty(`cooptown:backup_${slot}_${i}`);demand(typeof part==='string','バックアップが壊れています。');text+=part;}
  const data=JSON.parse(text);demand(data&&data.version===1&&data.players,'バックアップの形式が不正です。');
  this.create(by,'復元前の自動保存',slot); // keep the current state before overwriting it
  storage.write(data);return meta;
 },
 usage(){const ids=world.getDynamicPropertyIds();return {bytes:world.getDynamicPropertyTotalByteCount(),placedChunks:ids.filter(k=>k.startsWith('cooptown:placed:')).length,properties:ids.length};}
};
const online=id=>world.getAllPlayers().find(p=>p.id===id);
/** @param {import('@minecraft/server').Container} container @param {[string,number][]} take @param {[string,number][]} give */
// an id the game knows: the given one, else its other spelling (ids renamed between versions, ITEM_ALIASES)
const knownType=type=>{for(const t of [type,...(ITEM_ALIASES[type]??[])]){try{new ItemStack(t,1);return t;}catch{}}return type;};
// take entries: [type, n, opt]: opt.exact = that id only (no group / fish expansion), opt.loose = enchanted or
// described items count too (town deliveries of books and potions), but never named or worn ones
// a rank's name for messages (quality.js TIERS: 0 D ... 4 S)
const rankLabel=r=>'ランク'+(TIERS[r]?.label??'D');
const looseItem=s=>{try{if(s.nameTag)return false;}catch{}try{const d=s.getComponent('minecraft:durability');if(d&&d.damage>0)return false;}catch{}return true;};
export function inventoryPlan(container,take,give){
 demand(container,'持ち物を確認できません。');const before=Array.from({length:container.size},(_,i)=>container.getItem(i)?.clone());const after=before.map(x=>x?.clone());
 for(const [type,quantity,opt] of take){let left=integer(quantity,1,100000);const types=opt?.exact?[type]:typesOf(type);for(let i=0;i<after.length&&left;i++){const item=after[i];if(!item||!types.includes(item.typeId)||!(opt?.deliver!==undefined?deliverable(item,opt.deliver):opt?.loose?looseItem(item):isPlainItem(item)))continue;const used=Math.min(left,item.amount);left-=used;if(item.amount===used)after[i]=undefined;else item.amount-=used;}demand(!left,opt?.deliver!==undefined?`納品できる品が足りません：${ingredientName(type,itemName)} ×${quantity}（${opt.deliver?rankLabel(opt.deliver)+'以上・':''}名前付き・エンチャント付き・傷あり・期限切れは対象外）`:`素材が不足しています：${ingredientName(type,itemName)} ×${quantity}（名前・効果付きの品は対象外）`);}
 for(let [type,quantity] of give){let left=integer(quantity,1,100000);type=knownType(type);const template=new ItemStack(type,1);for(let i=0;i<after.length&&left;i++){const item=after[i];if(item&&(item.isStackableWith(template)||(item.typeId===type&&isPlainItem(item)))){const add=Math.min(left,item.maxAmount-item.amount);item.amount+=add;left-=add;}}
  for(let i=0;i<after.length&&left;i++)if(!after[i]){const add=Math.min(left,template.maxAmount);after[i]=new ItemStack(type,add);left-=add;}demand(!left,'持ち物がいっぱいです。空きを作ってから再度操作してください。');}
 const changed=take.length||give.length;return {apply(){if(changed)after.forEach((item,i)=>container.setItem(i,item));},rollback(){if(changed)before.forEach((item,i)=>container.setItem(i,item));}};
}
export const game=createEngine({storage,inventory:{plan(id,take,give){if(!take.length&&!give.length)return;return inventoryPlan(online(id)?.getComponent('minecraft:inventory')?.container,take,give);}},
 onTitles:(id,names)=>system.run(()=>{const p=online(id);if(!p)return;announceTitles(p,names);if(!prefs(p).notify.titles)return;
  for(const n of names)try{notifyBar(p,n,titleKind(TITLES.find(t=>t.title===n)?.rank??'ゴールド'),6);}catch{} // the rank's banner
  for(const t of names)p.sendMessage(`§6称号「${t}」を獲得しました！ §7手帳の称号から付け替えられます。`);try{p.playSound('random.levelup');}catch{}try{celebrate?.title(p,names);}catch{}})});
const itemName=id=>ITEM_NAMES[id]??id.replace('minecraft:','');
function safeLegacy(player){const raw=player.getDynamicProperty('cooptown:profile');if(raw===undefined)return;try{return JSON.parse(raw);}catch{throw new Error('旧プロフィールの読み込みに失敗しました。自動で初期化しません。');}}
export function refreshGame(player){game.ensure(player.id,player.name,safeLegacy(player));const data=game.snapshot(player.id),p=data.player;try{player.setDynamicProperty('cooptown:profile',JSON.stringify({...p,goal:p.job==='未選択'?'まず職業を選ぼう':'依頼と街への納品に挑戦しよう'}));player.setDynamicProperty('cooptown:progress',JSON.stringify({...p.stats,codexCount:Object.keys(p.codex).length,savedAt:p.savedAt}));player.setDynamicProperty('cooptown:menu_demo',false);}catch(e){console.warn('[CoopTown] 表示キャッシュ更新失敗: '+e);}return data;}
const confirm=(p,title,body)=>confirmDialog(p,title,body);
const choose=(p,title,body,labels)=>chooseDialog(p,title,body,labels);
async function service(player,action,a={}){
 try{
  let state=refreshGame(player),p=state.player,message;
  const cooperative=feature=>runCooperation(player,feature,{game,refreshGame,choose,confirm,ModalFormData,world,integer,demand,itemName});
  if(action==='bank.loan')return await cooperative('facilities');
  if(action.startsWith('cooperation.'))return await cooperative(action.slice(12));
  if(action==='skill.unlock'){const node=SKILL_BY_ID[a.node];demand(node,'スキルを選んでください。');if(!await confirm(player,'スキルを習得',node.name+'（'+node.desc+'）を'+node.cost+' SPで習得します。\n効果は'+node.job+'のあいだ働きます。習得したスキルは職業を変えても残ります。'))return;}
  else if(action==='job.select'||action==='job.secondary'){
   if(action==='job.secondary'){const i=await choose(player,'第二職業',`Lv.${RULES.secondaryLevel}で解放。現在 Lv.${p.level}`,JOBS);if(i===undefined)return;a={job:JOBS[i]};}
   // the first RULES.freeJobChangeSeconds of play: the main job changes for free, as often as wanted
   const free=action==='job.select'&&p.job!=='未選択'&&freeJobChange(player,RULES.freeJobChangeSeconds);if(free)a={...a,free:true};
   const cost=action==='job.select'&&p.job!=='未選択'?(free?`変更費用：無料（最初の${RULES.freeJobChangeSeconds/3600}時間・残り${playTimeText(RULES.freeJobChangeSeconds-playSeconds(player))}）`:`変更費用：${RULES.jobChangeCost}コイン`)+'。育成記録は残ります。':'取得費用：無料';
   if(!await confirm(player,'職業の選択',`${a.job}を選びます。\n${cost}`))return;
  }else if(action.startsWith('bank.')){
   if(action==='bank.history'||action==='bank.loan')return {title:'銀行',message:`所持金 ${p.coins} / 預金 ${p.bank}\n\n`+p.history.map(v=>new Date(v.at+9*3600000).toISOString().slice(0,16).replace('T',' ')+' '+v.text).join('\n')};
   let to;
   if(action==='bank.transfer'){const list=world.getAllPlayers().filter(v=>v.id!==player.id);demand(list.length,'送金できるオンラインの相手がいません。');const i=await choose(player,'送金先','相手を選んでください。',list.map(v=>v.name));if(i===undefined)return;to=list[i];refreshGame(to);}
   const available=action==='bank.withdraw'?p.bank:p.coins,initial=a.all?available:Math.min(Number(a.amount)||100,available);
   const r=await new ModalFormData().title('ct:in|'+'金額を指定').textField(`利用可能：${available}コイン`,'整数',{defaultValue:String(initial)}).show(player);if(r.canceled)return;
   const amount=integer(r.formValues[0],1,RULES.coinCap);if(!await confirm(player,'取引の確認',`${to?to.name+'へ送金':action==='bank.deposit'?'預け入れ':'引き出し'}：${amount}コイン`))return;a={amount,...(to?{to:to.id}:{})};
  }else if(action==='quests.create'){return await board(player);}
  else if(action==='titles.open'){return await titles(player);}
  else if(action==='quests.deliver'){const q=ORDERS[a.quest];demand(q,'依頼を選んでください。');if(!await confirm(player,'納品の確認',`${itemName(q.item)} ×${q.amount}を消費します。\n報酬 ${q.coins}コイン・経験値・ガチャ券1枚`))return;}
  else if(action==='gacha.rates')return {title:'提供割合',message:gachaRatesText(a.kind??'normal')};
  else if(action==='gacha.history')return {title:'ガチャの履歴',message:gachaHistoryText(p)};
  else if(action==='gacha.draw'){const kind=a.kind??'normal',g=GACHA[kind];demand(g,'ガチャの種類を選んでください。');if(!await confirm(player,g.name,`${g.ticket}を${a.count}枚消費します。所持 ${ticketsOf(p,kind)}枚\n持ち物に空きが必要です。`))return;}
  else if(action==='gacha.exchange'){if(!await confirm(player,'ポイント交換','10ポイントを消費し、ランタン4個を受け取ります。'))return;}
  else if(action==='craft.open'||action==='craft.execute')return {title:'クラフト',message:'製作はクラフト台で行います。\n置いてあるクラフト台を使うと職業作業台が開きます。\n\n職業のレシピは職業Lvで作れるようになります。クラフト経験値はクラフト台で製作したときに入ります。'};
  // the town's facilities (the 街の発展 page's wide button; delivering to the shared buildings is town-book.js)
  else if(action==='town.open'){const i=await choose(player,'街の施設',`街 Lv.${state.town.level}
共有建築への納品は手帳の「街の発展」から行います。`,['会場・拠点の場所','運営設定','共有倉庫','プレイヤー市場','設備・融資','協力探索','見習い依頼','街の施設解放','設備で休憩・支援品']);if(i===undefined)return;if(i===0)return locationInfo(state.town.location);if(i===1)return await adminMenu(player);return await cooperative(['warehouse','market','facilities','explore','mentor','town.stages','rest'][i-2]);}
  else if(action==='friend.open')return void await friends?.openFriends(player);
  else if(action==='map.open')return void await worldMap?.openWorldMap(player);
  else if(action==='map.settings')return await openMapSettings(player,{locationText:locationInfo(state.town.location).message});
  else if(action==='bag.open'){const inv=player.getComponent('minecraft:inventory')?.container;const list=[];for(let i=0;inv&&i<inv.size;i++){const it=inv.getItem(i);if(it)list.push(itemName(it.typeId)+' ×'+it.amount);}const i=await choose(player,'持ち物・受取箱',list.join('\n')+`\n\n預かり品 ${p.mail.length}件`,['預かり品を受け取る','パン1個で休憩','共有倉庫','設備で休憩・支援品']);if(i===undefined)return;if(i>=2)return await cooperative(i===2?'warehouse':'rest');action=i===0?'mail.claim':'rest';if(!await confirm(player,'確認',i===0?'預かり品を持ち物へ移します。':'パン1個を消費してストレスを20回復します。'))return;}
  else if(action.startsWith('events.')){
   if(action==='events.manage')return await adminMenu(player);
   const list=eventsFor(state.events,a.tab??0),e=list[a.event??0];demand(e,'該当するイベントはありません。運営が登録すると表示されます。');
   if(action==='events.location')return locationInfo(e.location);
   const i=await choose(player,e.name,`${e.description}\n開始 ${date(e.start)}\n終了 ${date(e.end)}\n参加登録 ${e.participants.length}人`,['参加登録','会場を確認']);if(i===undefined)return;if(i===1)return locationInfo(e.location);action='event.join';a={id:e.id};
  }
  message=game.execute(player.id,action,a);refreshGame(player);return {title:'案内手帳',message};
 }catch(e){return {title:'操作できませんでした',message:String(e.message??e)};}
}
function date(n){return new Date(n+9*3600000).toISOString().slice(0,16).replace('T',' ')+' JST';}
function locationInfo(l){return {title:'場所の案内',message:l?`${l.dimension}\nX ${l.x} / Y ${l.y} / Z ${l.z}\n座標を目印に移動してください。`:'拠点・会場はまだ登録されていません。運営が街の設定から登録できます。'};}
// Site quests (when the link pack is running): posting, accepting and cancelling go to the site; the reward
// is held / paid / refunded by orders from the link pack (portal-bridge.js). Old local requests stay usable.
async function portalBoard(player){
 const s=game.snapshot(player.id),me=player.id;
 const site=Object.values(s.portal.quests).filter(q=>['open','accepted'].includes(q.status)).sort((a,b)=>(b.createdAt??0)-(a.createdAt??0)).slice(0,40);
 const label=q=>`${q.title}（${q.item}×${q.qty}／${q.reward}コイン）${q.status==='accepted'?'受注済み':'受付中'}${q.ownerXuid===me?'・自分の依頼':q.takerXuid===me?'・受注中':''}`;
 const choices=['新しい依頼を出す',...site.map(label),...s.requests.map(q=>`（旧）${q.name}：${itemName(q.item)}×${q.amount} / ${q.coins}コイン`)];
 const i=await choose(player,'依頼掲示板','サイトと共通の依頼です。報酬は掲示されたときに依頼主から預かり、依頼が完了すると受注者へ支払われます。',choices);if(i===undefined)return;
 let message;
 if(i===0){
  const r=await new ModalFormData().title('ct:in|'+'依頼を掲示').dropdown('素材',TRADE_ITEMS.map(itemName)).textField('必要数（1～2304）','16').textField('報酬コイン（0～100000）','100').textField('題名（空欄なら自動）','').show(player);if(r.canceled)return;
  const [materialValue,qty,pay,titleValue]=r.formValues;const id=TRADE_ITEMS[integer(materialValue,0,TRADE_ITEMS.length-1)];demand(id,'素材を選んでください。');
  const amount=integer(qty,1,2304),reward=integer(pay,0,100000),title=(String(titleValue??'').trim()||itemName(id)+'を集めて').slice(0,60);
  demand(s.player.coins>=reward,'所持金が報酬に足りません。');
  if(!await confirm(player,'掲示の確認',`${title}\n${itemName(id)} ×${amount}\n報酬 ${reward}コイン（掲示されたときに預かります）`))return;
  questCreate(player,{title,itemId:id,qty:amount,reward});message='依頼をサイトへ送りました。掲示されると報酬を預かります。';
 }else if(i<=site.length){
  const q=site[i-1],own=q.ownerXuid===me,taker=q.takerXuid===me;
  if(q.status==='open'&&own){if(!await confirm(player,'依頼を取消',`${q.title}\n取り消すと、預かった報酬は返金されます。`))return;questAction(player,q.id,'cancel');message='取り消しをサイトへ送りました。反映されると報酬が返金されます。';}
  else if(q.status==='open'){if(!await confirm(player,'依頼を受注',`${q.title}\n${q.item} ×${q.qty}\n報酬 ${q.reward}コイン`))return;questAction(player,q.id,'accept');message='受注をサイトへ送りました。';}
  else if(taker){
   const item=questItem(q.item);demand(item,'この素材はゲーム内では納品できません。依頼主と相談してください。');
   if(s.portal.delivered[q.id])return {title:'依頼掲示板',message:'納品済みです。サイトで完了すると報酬が支払われます。'};
   if(!await confirm(player,'素材を納品',`${q.title}\n${q.item} ×${q.qty} を持ち物から渡します。\n報酬 ${q.reward}コインはサイトで完了したときに支払われます。`))return;
   message=game.execute(player.id,'portal.deliver',{questId:q.id,item});questDelivered(player,q.id);
  }else message=own?'受注者の納品を待っています。':'ほかのプレイヤーが受注中です。';
 }else{
  const q=s.requests[i-1-site.length],own=q.owner===me;if(!await confirm(player,own?'依頼を取消':'素材を納品',`${itemName(q.item)} ×${q.amount}\n${own?'報酬を返却します。':'持ち物から消費し、報酬 '+q.coins+'コインを受け取ります。'}`))return;message=game.execute(player.id,own?'request.cancel':'request.deliver',{id:q.id});
 }
 refreshGame(player);return {title:'依頼掲示板',message};
}
// Titles: owned ones can be worn; locked achievements show their condition.
async function titles(player){
 const p=game.snapshot(player.id).player,owned=p.titles??[],done=new Set(p.achievements??[]);
 const locked=ACHIEVEMENTS.filter(a=>!done.has(a.id)&&!owned.includes(a.title));
 const buttons=[...owned.map(t=>({text:(t===p.title?'【着用中】':'')+t,style:t===p.title?'ok':'btn'})),...(p.title?[{text:'称号を外す',style:'btn'}]:[]),...locked.map(a=>({text:'？？？　'+a.hint,style:'btn'})),{text:'戻る',style:'no'}];
 const i=await dialog(player,{title:'称号',body:`獲得 ${owned.length}　／　実績 ${done.size} / ${ACHIEVEMENTS.length}\n着用中：${p.title||'なし'}\n\n付けたい称号を選んでください。「？？？」はまだ獲得していない称号の条件です。`,buttons});
 if(i===undefined||i===buttons.length-1)return;
 if(i<owned.length)return {title:'称号',message:game.execute(player.id,'title.equip',{title:owned[i]})};
 if(p.title&&i===owned.length)return {title:'称号',message:game.execute(player.id,'title.equip',{title:''})};
 const a=locked[i-owned.length-(p.title?1:0)];return a?{title:'未獲得の称号',message:`条件：${a.hint}\n\nこの条件を満たすと称号を獲得できます。`}:undefined;
}
async function board(player){
 if(portalOnline())return await portalBoard(player);
 const s=game.snapshot(player.id),choices=['新しい依頼を出す',...s.requests.map(q=>`${q.name}：${itemName(q.item)}×${q.amount} / ${q.coins}コイン`)];
 const i=await choose(player,'プレイヤー依頼','報酬は掲示時に預かります。納品された素材は依頼主の受取箱へ届きます。自分の依頼を選ぶと取消できます。',choices);if(i===undefined)return;
 let message;
 if(i===0){const r=await new ModalFormData().title('ct:in|'+'依頼を掲示').dropdown('素材',TRADE_ITEMS.map(itemName)).textField('必要数（1～64）','16').textField('報酬コイン（1～100000）','100').show(player);if(r.canceled)return;const [materialValue,qty,pay]=r.formValues;const material=integer(materialValue,0,TRADE_ITEMS.length-1);demand(TRADE_ITEMS[material],'素材を選んでください。');const amount=integer(qty,1,64),coins=integer(pay,1,100000);if(!await confirm(player,'掲示の確認',`${itemName(TRADE_ITEMS[material])} ×${amount}\n報酬 ${coins}コインを預けます。`))return;message=game.execute(player.id,'request.create',{item:TRADE_ITEMS[material],amount,coins});}
 else{const q=s.requests[i-1],own=q.owner===player.id;if(!await confirm(player,own?'依頼を取消':'素材を納品',`${itemName(q.item)} ×${q.amount}\n${own?'報酬を返却します。':'持ち物から消費し、報酬 '+q.coins+'コインを受け取ります。'}`))return;message=game.execute(player.id,own?'request.cancel':'request.deliver',{id:q.id});}
 refreshGame(player);return {title:'依頼掲示板',message};
}
// Town / event management moved to the admin screen (admin-runtime.js).
async function adminMenu(player){await openAdmin(player);}
export const eventsFor=(events,tab,time=Date.now())=>events.filter(e=>tab===0?e.start<=time&&e.end>time:tab===1?e.start>time:e.end<=time).sort((a,b)=>a.start-b.start).slice(0,3);
export async function openGameFeature(player,name,payload={}){const response=await service(player,name,payload);if(name==='gacha.draw'&&response?.title==='案内手帳'){await showGacha(player,response.message);return;} /* the chest opening (gacha-show.js); the prizes are already given */if(response?.message)await noticeDialog(player,response.title,response.message,{close:'手帳に戻る'});}
// the codex's 素材 (registered from the player's items)
const MATERIALS=new Set(CODEX.filter(v=>v[2]==='素材').map(v=>v[0]));
// a codex discovery, with a chat notice for a new entry (unless turned off in the book's settings)
function discover(p,type){const m=game.execute(p.id,'codex.discover',{type});if(String(m).startsWith('図鑑に登録'))notify(p,'codex',`§a図鑑に「${CODEX.find(v=>v[0]===type)?.[1]??type}」を登録しました。`);}
export function installGame(){
 installHudLog({info:player=>infoLines(player,game.peek(d=>d.players[player.id]))});installPickupLog();
 installAdmin({game,refreshGame,itemName,backups});
 installMinimap({game});installNameTags({game});installEventNotices(game);installPlayTime();
 installWorkbench({game,refreshGame,itemName});
 installEnchanting({refreshGame,itemName});
 installCooking({refreshGame,itemName});
 installAnvil({game,refreshGame,itemName});
 installComposter({refreshGame,itemName});
 installBrewing({refreshGame,itemName});
 installShelf({game,refreshGame});
 installSmoker({refreshGame,itemName});
 installBlastFurnace({refreshGame,itemName});
 installCauldron({refreshGame,itemName});
 installQuality({game});
 installWatering({game});
 installJobTools({game});
 installLegends();
 installDungeons({game});
 installTutorial({game});
 installExpiryNotice();
 installNoticeLogin();
 installWardrobe();installPets();
 const townBgm=installTownBgm({game});
 installTownRules();installTownWelcome(); // the first town: adventure mode, no hostile mobs, no damage (town-rules.js)
 installIngredientDrops({game}); // the new cooking ingredients found in the world (ingredient-drops.js)
 installFryingPans();
 setPriceOverrides(()=>game.peek(d=>d.settings?.sellPrices??{})); // staff's selling prices (admin 経済 → 買取価格)
 installItemDesc();
 installTitleHooks();
 const bulk=installBulkHarvest({game});
 installWorkshops({game,itemName});installOreQuality({game});
 installRanch({game,refreshGame});
 installExplore({game});
 installFishing({game});
 installRunes({game,refreshGame});
 bindJobCount(game);
 worldMap=installWorldMap({game});
 installFood({game,itemName});
 installChat({game});
 friends=installFriends({game,refreshGame});
 // the screens and data the handy commands use (commands.js)
 setCommandHandlers({bgm:player=>townBgm.toggle(player),debug:player=>openDebug(player,game),pet:player=>openPets(player),skin:player=>openWardrobe(player),game,itemName,map:player=>worldMap?.openWorldMap(player),friends:player=>friends?.openFriends(player),detect:player=>bulk.detect(player)});
 installMobHp();
 installNotify();
 installChestLock();
 installGraves();
 installBagReady(world,system); // a held bag's box stands ready: one tap opens it (backpack-runtime.js)
 installRestartNotice(); // 10 / 5 / 1 minutes before the 0 / 6 / 12 / 18 o'clock restarts (restart-notice.js)
 installMobVariance({game}); // hostile mobs roll a strength (mob-variance.js)
 installDynamicLight(); // a held torch / lantern lights up around the player (dynamic-light.js)
 // party panels under the minimap (party.js): text lines with the HUD info, marks with the map text
 const partyStats=id=>{try{return game.peek(d=>{const p=d.players[id];return {title:p?.title,job:p?.job};});}catch{return {};}};
 setPartyLines(player=>partyText(membersFor(player,partyStats)));
 setPartyMarks(player=>partyMarks(membersFor(player,partyStats)));
 installGearStats({world,system});
 installDexWatch({game,world,system,pushText});
 installNpcs({game,refreshGame,itemName});
 celebrate=installCelebrate({game});
 installPortalBridge({game});
 world.afterEvents.playerLeave.subscribe(({playerId})=>{try{game.execute(playerId,'presence');}catch{}});
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{if(initialSpawn)system.run(()=>{try{refreshGame(player);game.execute(player.id,'presence');if(!game.snapshot(player.id).player.starterGiven)player.sendMessage('§6ようこそ！最初の町の案内係に話しかけると、案内手帳と初期配布がもらえます。'); /* handed over by the 案内係 NPC since 2026-10-30 (npc-runtime.js starterKit) */}catch(e){player.sendMessage('§e案内手帳：'+e.message);}});});
 const hits=new Map();
 world.afterEvents.entityHurt.subscribe(({hurtEntity,damageSource})=>{try{const attacker=damageSource.damagingEntity;if(attacker?.typeId==='minecraft:player'){const entry=hits.get(hurtEntity.id)??{};entry[attacker.id]=Date.now();hits.set(hurtEntity.id,entry);if(hits.size>500)hits.delete(hits.keys().next().value);}}catch{}});
 world.afterEvents.entityDie.subscribe(({deadEntity,damageSource})=>{try{const members=hits.get(deadEntity.id)??{};hits.delete(deadEntity.id);const last=damageSource.damagingEntity;if(last?.typeId==='minecraft:player')members[last.id]=Date.now();if(!CODEX.some(v=>v[0]===deadEntity.typeId&&v[2]==='敵モブ'))return;for(const [id,at] of Object.entries(members)){const p=online(id);if(!p||Date.now()-Number(at)>30000||p.dimension.id!==deadEntity.dimension.id)continue;const d=p.location,b=deadEntity.location;if((d.x-b.x)**2+(d.y-b.y)**2+(d.z-b.z)**2>32**2)continue;refreshGame(p);discover(p,deadEntity.typeId);}}catch(e){console.warn('[CoopTown] 図鑑: '+e);}});
 // Player-placed ores/logs/etc. are remembered per chunk so re-breaking them gives no XP.
 system.run(()=>{try{let keys=[];game.admin(true,db=>{keys=Object.keys(db.placedWork??{});db.placedWork={};});if(keys.length)console.warn('[CoopTown] 設置記録を移行: '+importLegacy(keys)+'件');}catch(e){console.warn('[CoopTown] 設置記録の移行: '+e);}});
 world.afterEvents.playerPlaceBlock.subscribe(({block})=>{if(!MINE_BLOCKS[block.typeId]?.track&&!GATHER_BLOCKS[block.typeId]?.track)return;try{markPlaced(block.dimension.id,block.location);}catch(e){console.warn('[CoopTown] 設置記録: '+e);}});
 installGather({game,ensure:p=>game.ensure(p.id,p.name,safeLegacy(p))});
 // Spread each five-second discovery cycle across ticks; each player is scanned once per cycle.
 const friendlyCodex=new Set(CODEX.filter(v=>['友好モブ','魚'].includes(v[2])).map(v=>v[0]));
 let discoveryQueue=[],discoveryIndex=0,cycleStart=-100;
 system.runInterval(()=>{
  const tick=system.currentTick;
  if(tick-cycleStart>=100){discoveryQueue=world.getAllPlayers();discoveryIndex=0;cycleStart=tick;}
  const target=Math.ceil(discoveryQueue.length*Math.min(100,tick-cycleStart+1)/100);
  while(discoveryIndex<target){const p=discoveryQueue[discoveryIndex++];if(!p?.isValid)continue;
   try{const ready=game.peek(d=>d.players[p.id]?.name===p.name);if(!ready)game.ensure(p.id,p.name,safeLegacy(p));const current=game.peek(d=>({player:{codex:{...d.players[p.id].codex},explored:d.players[p.id].explored??[]},landmarks:d.landmarks})),known=current.player.codex;for(const place of current.landmarks){const l=place.location,v=p.location;if(l.dimension===p.dimension.id&&!current.player.explored.includes(place.id)&&(l.x-v.x)**2+(l.y-v.y)**2+(l.z-v.z)**2<=16**2)game.execute(p.id,'landmark.visit',{id:place.id});}for(const e of p.dimension.getEntities({location:p.location,maxDistance:6})){if(friendlyCodex.has(e.typeId)&&!known[e.typeId]){discover(p,e.typeId);known[e.typeId]=true;}}const inv=p.getComponent('minecraft:inventory')?.container;if(inv)for(let i=0;i<inv.size;i++){const t=inv.getItem(i)?.typeId;if(t&&MATERIALS.has(t)&&!known[t]){discover(p,t);known[t]=true;}}}catch(e){console.warn('[CoopTown] 更新: '+e);}
  }
 },1);
}
