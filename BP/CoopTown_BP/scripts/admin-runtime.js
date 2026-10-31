import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,ModalFormData,FormCancelationReason} from '@minecraft/server-ui';
import {ADMIN_RULES,SKILLS} from './admin-engine.js';
import {JOBS} from './game-config.js';
import {BUILDINGS,STAGES,KINDS,TOWN_RULES,stageOf,stageSlots,buildingRatio,ranking} from './town-config.js';
import {ITEM_ICONS} from './item-icons.js';
import {announce} from './hud-channel.js';
import {notify,notifyAll,NOTIFY,NOTIFY_KINDS} from './notify.js';
import {postNotice,NOTICE} from './notice-config.js';
import {priceOf} from './sell-price.js';
import {TITLES} from './titles-config.js';
import {ACHIEVEMENTS} from './achievements-config.js';

// Admin (運営) screen. One generic layout (RP: tools/build-admin-ui.mjs, title "ct:admin") is filled
// by "views": {section,title,crumb,detail,rows:[{text,icon,go}],actions:[{text,mark,go}]}.
// go(ctx) may return {push:{id,args}}, {pop:n}, {status:text} or nothing.
export const ADMIN_LAYOUT={sections:0,home:8,back:9,close:10,rows:11,prev:19,next:20,actions:21,readouts:27,rowCount:8,actionCount:6,total:32};
export const SECTIONS=[['players','プレイヤー','skin'],['economy','経済','coins'],['town','街','town'],['market','市場・依頼','scroll'],['events','イベント','festival'],['notice','お知らせ','lantern'],['records','記録・保存','save'],['admins','権限','title']];
const ICON=name=>'textures/cooptown/icons/'+name;
const itemTexture=id=>ITEM_ICONS[id]?'textures/cooptown/items/'+ITEM_ICONS[id]:undefined;
const date=t=>t?new Date(t+9*3600000).toISOString().slice(5,16).replace('T',' '):'—';
const num=v=>Number(v??0).toLocaleString('en-US');
let deps;
const active=new Set();
export const isAdmin=player=>player.hasTag(ADMIN_RULES.tag);
export const isOwner=player=>ADMIN_RULES.owners.some(n=>n.toLowerCase()===String(player.name).toLowerCase());
function keepOwners(){for(const p of world.getAllPlayers())try{if(isOwner(p)&&!p.hasTag(ADMIN_RULES.tag))p.addTag(ADMIN_RULES.tag);}catch{}}
export function installAdmin(d){
 deps=d;world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
 world.afterEvents.playerSpawn.subscribe(({player})=>{try{if(isOwner(player)&&!player.hasTag(ADMIN_RULES.tag))player.addTag(ADMIN_RULES.tag);}catch{}});
 system.runInterval(keepOwners,100); // put the tag back even if a command removed it
}

// ---- helpers ----
const online=()=>new Map(world.getAllPlayers().map(p=>[p.id,p]));
function act(ctx,action,args={}){
 try{
  const message=deps.game.execute(ctx.player.id,'admin.'+action,{...args,isAdmin:isAdmin(ctx.player)});
  const target=args.target&&ctx.online.get(args.target);if(target)try{deps.refreshGame(target);}catch{}
  return {status:'§a'+message};
 }catch(e){return {status:'§c'+(e.message??e)};}
}
const note=(ctx,text,targetName='')=>act(ctx,'note',{text,targetName});
async function ask(player,title,fields){
 const form=new ModalFormData().title('ct:in|'+title);
 for(const f of fields){
  if(f.options)form.dropdown(f.label,f.options,{defaultValueIndex:f.value??0});
  else form.textField(f.label,f.placeholder??'',{defaultValue:f.value===undefined?'':String(f.value)});
 }
 form.submitButton('決定');
 const r=await form.show(player);return r.canceled?undefined:r.formValues;
}
const confirm=(title,text,run,danger=false)=>({push:{id:'confirm',args:{title,text,run,danger}}});
const reasonField={label:'理由（記録に残ります）',placeholder:'例：不具合の補填'};
const location=player=>({dimension:player.dimension.id,...Object.fromEntries(Object.entries(player.location).map(([k,v])=>[k,Math.floor(v)]))});
const where=l=>l?`${l.dimension.replace('minecraft:','')} ${l.x}, ${l.y}, ${l.z}`:'未登録';
function wealth(p){return (p.coins??0)+(p.bank??0);}
function todayGain(p){return p.daily?.day===new Date(Date.now()+9*3600000).toISOString().slice(0,10)&&p.wealthStart!==undefined?wealth(p)-p.wealthStart:0;}
function warnings(db){return Object.entries(db.players).map(([id,p])=>({id,p,gain:todayGain(p)})).filter(w=>w.gain>=ADMIN_RULES.warnGainPerDay).sort((a,b)=>b.gain-a.gain);}

// ---- views ----
const V={};
// the ledger's limit (game-runtime.js: 256 chunks of 7000 characters)
const LEDGER_MAX=256*7000;
V.home=({db,online:on})=>{
 const players=Object.values(db.players),money=players.reduce((s,p)=>s+wealth(p),0),warn=warnings(db),now=Date.now();
 return {section:'home',title:'概要',crumb:'サーバー全体の状態',
  detail:`参加者 ${players.length}人（オンライン ${on.size}人）\nお金の総量 ${num(money)}コイン\n街 Lv.${db.town.level}（累計納品 ${num(db.town.total)}）\n開催中のイベント ${db.events.filter(e=>e.start<=now&&e.end>now).length}件\n市場 ${db.market.length}件 / 依頼 ${db.requests.length}件\n\n${warn.length?'§c急に増えた人 '+warn.length+'人§r':'警告はありません'}`,
  rows:[...warn.map(w=>({text:`§c! §r${w.p.name}  本日 +${num(w.gain)}コイン`,icon:ICON('coins'),go:()=>({push:{id:'player',args:{id:w.id}}})})),
   ...(db.adminLog??[]).slice(0,8).map(l=>({text:`§7${date(l.at)}§r ${l.by}：${l.text}${l.target?' ＞ '+l.target:''}`}))],
  actions:[{text:db.settings?.minimap===false?'ミニマップを有効に':'ミニマップを無効に',mark:db.settings?.minimap===false?'[ok]':'',go:ctx=>act(ctx,'minimap',{on:db.settings?.minimap===false})}]};
};
V.players=({db,online:on})=>{
 const list=Object.entries(db.players).sort(([a,pa],[b,pb])=>Number(on.has(b))-Number(on.has(a))||(pb.lastSeen??0)-(pa.lastSeen??0));
 return {section:'players',title:'プレイヤー',crumb:`${list.length}人　§a[オン]§7 オンライン　[オフ] オフライン`,
  detail:'名前を選ぶと詳細と変更ができます。\n\nオフラインの人も変更できます。\n持ち物にアイテムを渡す操作はオンラインのときだけです。',
  rows:list.map(([id,p])=>({text:`${on.has(id)?'§a[オン]':'§7[オフ]'}§r ${p.name}  §7Lv.${p.level}  ${p.job}${p.secondJob?' / '+p.secondJob:''}`,icon:ICON('skin'),go:()=>({push:{id:'player',args:{id}}})}))};
};
V.player=({db,online:on,player},{id})=>{
 const p=db.players[id];if(!p)return {section:'players',title:'見つかりません',crumb:'',detail:'このプレイヤーのデータはありません。',rows:[],actions:[]};
 const target={target:id},skills=SKILLS.slice(1).map(([k,l])=>`${l} Lv.${p[k].level}（${num(p[k].xp)} / ${num(p[k].max)}）`).join('\n');
 return {section:'players',title:p.name,crumb:`プレイヤー ＞ ${p.name}`,
  detail:`${on.has(id)?'§aオンライン§r':'§7オフライン§r'}　最終 ${date(p.lastSeen)}\n職業 ${p.job}${p.secondJob?' / '+p.secondJob:''}\n全体 Lv.${p.level}（${num(p.xp)} / ${num(p.maxXp)}）\n${skills}\n\n所持金 ${num(p.coins)}　預金 ${num(p.bank)}\n借入残高 ${num(p.loan?.remaining)}　本日 ${todayGain(p)>=0?'+':''}${num(todayGain(p))}\nガチャ券 デイリー${p.gacha?.daily??0}・ノーマル${p.tickets}・エピック${p.gacha?.epic??0}　交換pt ${p.points}　ストレス ${p.stress}\n依頼達成 ${p.stats?.questsCompleted??0}　納品 ${p.stats?.deliveries??0}\n受取箱 ${p.mail?.length??0}件${p.title?'\n称号 '+p.title:''}`,
  rows:[],
  actions:[
   {text:'所持金',go:async ctx=>{const v=await ask(player,'所持金を変更',[{label:`今 ${num(p.coins)}コイン。増やす数（減らすときは -）`,placeholder:'例：500 / -200'},reasonField]);return v?act(ctx,'coins',{...target,amount:v[0],reason:v[1]}):undefined;}},
   {text:'経験値・Lv',go:async ctx=>{const v=await ask(player,'経験値・Lvを変更',[{label:'スキル',options:SKILLS.map(s=>s[1])},{label:'操作',options:['経験値を足す','Lvを設定']},{label:'数',placeholder:'例：100 / 10'},reasonField]);if(!v)return;
    return act(ctx,v[1]===0?'xp':'level',{...target,skill:SKILLS[v[0]][0],amount:v[2],level:v[2],reason:v[3]});}},
   {text:'職業',go:async ctx=>{const mains=['未選択',...JOBS],seconds=['なし',...JOBS];const v=await ask(player,'職業を変更',[{label:'主職業',options:mains,value:Math.max(0,mains.indexOf(p.job))},{label:'第2職業',options:seconds,value:Math.max(0,seconds.indexOf(p.secondJob??'なし'))},reasonField]);if(!v)return;
    return act(ctx,'job',{...target,job:mains[v[0]],second:v[1]?seconds[v[1]]:'',reason:v[2]});}},
   {text:'ストレス0',go:()=>confirm('ストレスを0にする',`${p.name}のストレス（今 ${p.stress}）を0にします。`,ctx=>act(ctx,'stress',target))},
   {text:'ガチャ券',go:async ctx=>{const v=await ask(player,'ガチャ券を配る',[{label:'枚数（1～1000）',placeholder:'例：3'},{label:'種類（デイリー／ノーマル／エピック。空欄はノーマル）',placeholder:'ノーマル'},reasonField]);return v?act(ctx,'tickets',{...target,amount:v[0],kind:v[1],reason:v[2]}):undefined;}},
   {text:'その他',go:()=>({push:{id:'playerMore',args:{id}}})}
  ]};
};
// 称号 of one player: the ones held (choose one to take it away), give one from the lists (by category) or by name
const TITLE_CATS=()=>{const cats=[...new Set(TITLES.map(t=>t.cat))];return [...cats.map(c=>[c,TITLES.filter(t=>t.cat===c).map(t=>[t.title,t.rank])]),['実績',ACHIEVEMENTS.map(a=>[a.title,'実績'])]];};
V.playerTitles=({db,player,online:on},{id})=>{
 const p=db.players[id],target={target:id},held=p?.titles??[];
 const tell=(name,give)=>{const o=on.get(id);if(o)try{o.sendMessage(give?`§6運営から称号「${name}」を受け取りました！ §7手帳の称号から付けられます。`:`§7称号「${name}」が外されました。`);}catch{}};
 return {section:'players',title:'称号',crumb:`プレイヤー ＞ ${p?.name} ＞ 称号（選ぶと外す）`,detail:`持っている称号 ${held.length}個${p?.title?`
装備中：${p.title}`:''}

一覧から：職業などの分類を選んでから称号を選びます。
名前で：イベントの記念など、一覧にない称号も付けられます。`,
  rows:held.map(n=>({text:(p.title===n?'§e[装備中] §r':'')+n,icon:ICON('title'),go:()=>confirm('称号を外す',`${p.name}から称号「${n}」を外します。`,ctx=>{const r=act(ctx,'title',{...target,title:n,remove:true});if(r.status.startsWith('§a'))tell(n,false);return r;},true)})),
  actions:[
   {text:'一覧から付与',go:async ctx=>{const cats=TITLE_CATS();const c=await ask(player,'称号の分類',[{label:'分類',options:cats.map(([k,l])=>`${k}（${l.length}）`)}]);if(!c)return;
    const list=cats[Number(c[0])][1].filter(([n])=>!held.includes(n));if(!list.length)return {status:'§eこの分類の称号は全部持っています。'};
    const v=await ask(player,'付与する称号',[{label:'称号',options:list.map(([n,r])=>`${n}（${r}）`)},reasonField]);if(!v)return;
    const name=list[Number(v[0])][0],r=act(ctx,'title',{...target,title:name,reason:v[1]});if(r.status.startsWith('§a'))tell(name,true);return r;}},
   {text:'名前で付与',go:async ctx=>{const v=await ask(player,'称号を名前で付与',[{label:'称号の名前（40文字以内）',placeholder:'例：第1回収穫祭優勝'},reasonField]);if(!v||!String(v[0]).trim())return;
    const name=String(v[0]).trim(),r=act(ctx,'title',{...target,title:name,reason:v[1]});if(r.status.startsWith('§a'))tell(name,true);return r;}}]};
};
V.playerMore=({db,online:on},{id})=>{
 const p=db.players[id],target={target:id};
 return {section:'players',title:'その他の操作',crumb:`プレイヤー ＞ ${p?.name} ＞ その他`,detail:'初期化は元に戻せません。\n必要なら先に「記録・保存」でバックアップを作ってください。',
  rows:[
   {text:'案内手帳を渡す（オンラインのみ）',icon:ICON('open_book'),go:ctx=>{const t=on.get(id);if(!t)return {status:'§cオフラインのため渡せません。'};t.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack('cooptown:guidebook',1));note(ctx,'案内手帳を再配布',p.name);return {status:'§a案内手帳を渡しました。'};}},
   {text:`受取箱を見る（${p?.mail?.length??0}件）`,icon:ICON('chest'),go:()=>({push:{id:'mailbox',args:{id}}})},
   {text:`称号の付与・外す（${p?.titles?.length??0}個）`,icon:ICON('title'),go:()=>({push:{id:'playerTitles',args:{id}}})},
   {text:'§c職業だけ初期化',icon:ICON('tools'),go:()=>confirm('職業を初期化',`${p.name}の主職業と第2職業を「未選択」に戻します。\nLvや所持金はそのままです。`,ctx=>act(ctx,'reset',{...target,scope:'job'}),true)},
   {text:'§cデータを全部初期化',icon:ICON('unknown'),go:()=>confirm('データを全部初期化',`${p.name}の職業・Lv・所持金・預金・図鑑などを全部初期状態に戻します。\n元に戻せません。`,ctx=>act(ctx,'reset',{...target,scope:'all'}),true)}
  ]};
};
V.mailbox=({db,itemName},{id})=>{const p=db.players[id];return {section:'players',title:'受取箱',crumb:`プレイヤー ＞ ${p?.name} ＞ 受取箱`,detail:'依頼の納品物や、取り消された出品が入ります。\n本人が「持ち物・受取箱」から受け取ります。',
 rows:(p?.mail??[]).map(([item,n])=>({text:`${itemName(item)} ×${n}`,icon:itemTexture(item)}))};};
V.confirm=(ctx,{title,text,run,danger})=>({title,crumb:'確認',detail:text,rows:[],
 actions:[{text:'実行する',mark:danger?'[warn]':'[ok]',go:async c=>{const r=await run(c);return {pop:1,status:r?.status}; }},{text:'やめる',go:()=>({pop:1})}]});
V.economy=({db,player})=>{
 const players=Object.values(db.players),money=players.reduce((s,p)=>s+wealth(p),0),loans=players.reduce((s,p)=>s+(p.loan?.remaining??0),0),rates=db.settings?.rates??{quest:1,daily:1,town:1};
 const warn=warnings(db),top=Object.entries(db.players).sort(([,a],[,b])=>wealth(b)-wealth(a)).slice(0,10);
 return {section:'economy',title:'経済',crumb:`警告 ${warn.length}人　上位10人`,
  detail:`お金の総量 ${num(money)}\n　所持 ${num(players.reduce((s,p)=>s+(p.coins??0),0))} / 預金 ${num(players.reduce((s,p)=>s+(p.bank??0),0))}\n1人あたり ${num(Math.round(money/Math.max(1,players.length)))}\n借入残高の合計 ${num(loans)}\n\n報酬倍率\n　依頼 ×${rates.quest}　デイリー ×${rates.daily}\n　街への納品 ×${rates.town}\n\n1日に ${num(ADMIN_RULES.warnGainPerDay)} 以上増えた人を警告します。`,
  rows:[...warn.map(w=>({text:`§c! §r${w.p.name}  本日 +${num(w.gain)}`,icon:ICON('coins'),go:()=>({push:{id:'player',args:{id:w.id}}})})),
   ...top.map(([id,p],i)=>({text:`${i+1}. ${p.name}  ${num(wealth(p))}コイン`,icon:ICON('reward_coins'),go:()=>({push:{id:'player',args:{id}}})}))],
  actions:[{text:'報酬倍率',go:async ctx=>{const v=await ask(player,'報酬倍率（0～10）',[{label:'依頼の報酬',value:rates.quest},{label:'デイリーの報酬',value:rates.daily},{label:'街への納品の報酬',value:rates.town},reasonField]);return v?act(ctx,'rates',{quest:v[0],daily:v[1],town:v[2],reason:v[3]}):undefined;}},
   {text:'職業バランス',go:()=>({push:{id:'balance'}})},
   {text:'買取価格',go:()=>({push:{id:'sellPrices'}})},
   {text:'更新',go:()=>({status:'§a最新の状態にしました。'})}]};
};
// 職業バランス (asked 2026-10-27): per main job, what its players earn per hour played (coins earned, job level), so
// a job far ahead or behind shows. Earnings: p.tally.coins_earned (game-engine.js), play time: p.tally.play_s.
// 買取価格 (asked 2026-10-28): staff set what an item sells for, per rank (D C B A S) or for all ranks; 0 puts the
// default back. Used by every buyer and the price line in descriptions (sell-price.js). db.settings.sellPrices
// {id: [D, C, B, A, S]} (0 = default).
const RANK_LABELS=['D','C','B','A','S'];
async function setSellPrice(ctx,player,db,id){
 if(!id){const held=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
  const v=await ask(player,'買取価格を設定するアイテム',[{label:'アイテムID（空なら手に持っている物）',placeholder:'例：minecraft:wheat',value:held?.typeId??''}]);if(!v)return;
  id=String(v[0]||held?.typeId||'').trim();if(!id)return {status:'§cアイテムを持つか、IDを入れてください。'};if(!id.includes(':'))id='minecraft:'+id;
  try{new ItemStack(id,1);}catch{return {status:`§cアイテムID「${id}」が見つかりません。`};}}
 const now=RANK_LABELS.map((r,i)=>`${r} ${num(priceOf(id,i))}`).join('　');
 const v=await ask(player,`${deps.itemName(id)}の買取価格`,[{label:`今：${now}`,options:['全ランクまとめて',...RANK_LABELS.map(r=>'ランク'+r)]},{label:'1個の値段（0で初期値に戻す）',placeholder:'例：12',value:''},reasonField]);if(!v)return;
 const price=Math.floor(Number(v[1]));if(!(price>=0&&price<=1000000))return {status:'§c値段は0～1000000で入れてください。'};
 const which=Number(v[0]);
 try{deps.game.admin(isAdmin(player),d=>{d.settings??={};const t=d.settings.sellPrices??={};const row=t[id]??=[0,0,0,0,0];
  if(which===0)for(let i=0;i<row.length;i++)row[i]=price;else row[which-1]=price;
  if(row.every(x=>!x))delete t[id];});}catch(e){return {status:'§c'+(e.message??e)};}
 note(ctx,`買取価格 ${deps.itemName(id)} ${which===0?'全ランク':'ランク'+RANK_LABELS[which-1]} ${price?price+'コイン':'初期値'}`);
 return {status:`§a${deps.itemName(id)}の買取価格を変えました。`};
}
V.sellPrices=({db,player})=>{const t=db.settings?.sellPrices??{};
 return {section:'economy',title:'買取価格',crumb:'経済 ＞ 買取価格（選ぶと変更）',
  detail:'アイテムとランク（D C B A S）ごとの買取価格。よろず屋・手帳の買取・職業の村人の全部に効きます。\n説明文の「売値」も同じ値段になります。\n0にすると初期値（ランクで上がる）に戻ります。',
  rows:Object.entries(t).map(([id,row])=>({text:`${deps.itemName(id)}  ${row.map((p,i)=>`${RANK_LABELS[i]}:${p?num(p):'-'}`).join(' ')}`,icon:itemTexture(id),go:ctx=>setSellPrice(ctx,player,db,id)})),
  actions:[{text:'値段を設定',mark:'[ok]',go:ctx=>setSellPrice(ctx,player,db)}]};
};
export function jobBalance(db){
 return JOBS.map(job=>{const list=Object.values(db.players).filter(p=>p.job===job);const hours=list.reduce((a,p)=>a+(Number(p.tally?.play_s)||0),0)/3600;
  const earned=list.reduce((a,p)=>a+(Number(p.tally?.coins_earned)||0),0),lv=list.reduce((a,p)=>a+(p.level??1),0);
  return {job,players:list.length,perHour:hours>0?Math.round(earned/hours):0,hours:Math.round(hours*10)/10,level:list.length?Math.round(lv/list.length*10)/10:0};});
}
V.balance=({db})=>{const rows=jobBalance(db),avg=rows.filter(r=>r.hours>=1).reduce((a,r,_,l)=>a+r.perHour/l.length,0);
 return {section:'economy',title:'職業バランス',crumb:'経済 ＞ 職業バランス（主職業ごと）',
  detail:`1時間あたりに稼いだコイン（遊んだ時間の合計が1時間以上の職業の平均 ${num(Math.round(avg))}）。
平均の1.5倍以上は§c高§r、0.5倍以下は§9低§rと表示します。
記録は2026-10-27から。`,
  rows:rows.map(r=>({text:`${r.job}  ${r.players}人  ${num(r.perHour)}/時  平均Lv.${r.level}  ${r.hours}時間`+(avg&&r.hours>=1?(r.perHour>=avg*1.5?'  §c高':r.perHour<=avg*.5?'  §9低':''):''),icon:ICON('coins')}))};};
V.town=({db,player,itemName})=>({section:'town',title:'街',crumb:`探索地 ${db.landmarks.length}か所（選ぶと削除）`,
 detail:`街 Lv.${db.town.level}　${townLine(db.town.build)}
累計納品 ${num(db.town.total)}個

拠点 ${where(db.town.location)}`,
 rows:db.landmarks.map(l=>({text:`${l.name}  §7${where(l.location)}`,icon:ICON('map'),go:()=>confirm('探索地を削除',`「${l.name}」を削除します。\n削除後に同じ場所を登録しても別の探索地になります。`,ctx=>act(ctx,'landmark.remove',{id:l.id}),true)})),
 actions:[
  {text:'拠点をここに',go:()=>confirm('拠点を登録',`今いる場所（${where(location(player))}）を街の拠点にします。`,ctx=>act(ctx,'location',{location:location(player)}))},
  {text:'探索地を追加',go:async ctx=>{const v=await ask(player,'探索地を追加（今いる場所）',[{label:'探索地の名前（30文字以内）',placeholder:'例：古い遺跡'}]);return v?act(ctx,'landmark.add',{name:v[0],location:location(player)}):undefined;}},
  {text:'街の発展',go:()=>({push:{id:'townBuild'}})},
  {text:'倉庫の中身',go:()=>({push:{id:'warehouse'}})},
  {text:'倉庫の履歴',go:()=>({push:{id:'warehouseLog'}})}
 ]});
// 街の発展 (town-config.js / town-engine.js): the stage under construction, the level, the stage and the amounts
const townLine=b=>b.index>=BUILDINGS.length?'共有建築はすべて完成':`建設中：${BUILDINGS[b.index].name}　${STAGES[Math.min(2,stageOf(b,b.index))][0]}（${Math.floor(100*buildingRatio(b,b.index))}%）`;
V.townBuild=({db,player})=>{
 const b=db.town.build,bi=b.index,s=bi<BUILDINGS.length?stageOf(b,bi):0,top=ranking(b).slice(0,5);
 return {section:'town',title:'街の発展',crumb:'街 ＞ 街の発展（今の段階の素材）',
  detail:`街 Lv.${db.town.level}　${townLine(b)}\n必要量：アクティブ${b.active}人・${b.percent}%（基準${TOWN_RULES.baseActive}人）\n試練待ち：${b.trials.length?b.trials.map(l=>'Lv.'+l).join('・'):'なし'}\n貢献度上位：${top.map(x=>`${db.players[x.id]?.name??'?'} ${num(x.points)}`).join('、')||'なし'}`,
  rows:bi<BUILDINGS.length?stageSlots(b,bi,s).map(v=>({text:`${v.name}  §7${num(v.got)} / ${num(v.need)}`,icon:itemTexture(KINDS[v.kind].items[0])})):[],
  actions:[
   {text:'街Lvを設定',go:async ctx=>{const v=await ask(player,'街Lvを設定',[{label:`今 Lv.${db.town.level}。新しいLv（1～${TOWN_RULES.maxLevel}）。Lvの数-1個の建築が完成扱い`,value:db.town.level},reasonField]);return v?act(ctx,'town',{level:v[0],reason:v[1]}):undefined;}},
   {text:'段階を設定',go:async ctx=>{if(bi>=BUILDINGS.length)return {status:'§cすべて完成しています。'};const v=await ask(player,BUILDINGS[bi].name+'の段階',[{label:'選んだ段階より前は完了扱い、選んだ段階から後の納品分は0になります',options:STAGES.map(x=>x[0]),value:Math.min(2,s)},reasonField]);return v?act(ctx,'town.stage',{stage:v[0],reason:v[1]}):undefined;}},
   {text:'必要量を調整',go:async ctx=>{const v=await ask(player,'必要量の調整',[{label:`アクティブ人数（基準${TOWN_RULES.baseActive}人で設計の個数）`,value:b.active},{label:'倍率（%）',value:b.percent},reasonField]);return v?act(ctx,'town.scale',{active:v[0],percent:v[1],reason:v[2]}):undefined;}}
  ]};
};
V.warehouse=({db,itemName})=>({section:'town',title:'共有倉庫の中身',crumb:'街 ＞ 共有倉庫',detail:'公共の素材です。誰でも預け入れ・引き出しができます。\n不審な引き出しは「倉庫の履歴」で確認できます。',
 rows:Object.entries(db.warehouse?.items??{}).filter(([,n])=>n>0).sort(([,a],[,b])=>b-a).map(([id,n])=>({text:`${itemName(id)} ×${num(n)}`,icon:itemTexture(id)}))});
V.warehouseLog=({db,itemName})=>({section:'town',title:'共有倉庫の履歴',crumb:'街 ＞ 共有倉庫 ＞ 履歴（新しい順・最大50件）',detail:'＋は預け入れ、－は引き出しです。',
 rows:(db.warehouse?.log??[]).map(l=>{const [id,change]=l.text.split(' ');return {text:`§7${date(l.at)}§r ${l.name}  ${itemName(id)} ${change}`,icon:itemTexture(id)};})});
V.market=({db,itemName})=>({section:'market',title:'市場・依頼',crumb:`出品 ${db.market.length}件　依頼 ${db.requests.length}件（選ぶと強制取消）`,
 detail:'不適切な出品や依頼を取り消せます。\n\n出品の品物は出品者の受取箱へ、\n依頼の報酬は依頼主へ返します。',
 rows:[...db.market.map(q=>({text:`§b[市場]§r ${q.name}  ${itemName(q.item)}×${q.amount}  ${num(q.price)}コイン`,icon:itemTexture(q.item),go:()=>confirm('出品を取り消す',`${q.name}の出品\n${itemName(q.item)} ×${q.amount}（${num(q.price)}コイン）\n\n品物は出品者の受取箱へ返します。`,ctx=>act(ctx,'market.cancel',{id:q.id}),true)})),
  ...db.requests.map(q=>({text:`§e[依頼]§r ${q.name}  ${itemName(q.item)}×${q.amount}  報酬${num(q.coins)}`,icon:itemTexture(q.item),go:()=>confirm('依頼を取り消す',`${q.name}の依頼\n${itemName(q.item)} ×${q.amount}（報酬 ${num(q.coins)}コイン）\n\n報酬は依頼主へ返します。`,ctx=>act(ctx,'request.cancel',{id:q.id}),true)}))]});
V.events=({db,player})=>{const now=Date.now(),state=e=>e.start>now?'§e予定':e.end>now?'§a開催中':'§7終了';
 return {section:'events',title:'イベント',crumb:`${db.events.length}件（最大20件）`,detail:'イベントを選ぶと、参加者の確認・報酬の配布・削除ができます。\n\n登録すると、今いる場所が会場になります。',
  rows:[...db.events].sort((a,b)=>a.start-b.start).map(e=>({text:`${state(e)}§r ${e.name}  §7${date(e.start)}～  ${e.participants.length}人`,icon:ICON('festival'),go:()=>({push:{id:'event',args:{id:e.id}}})})),
  actions:[{text:'イベントを登録',go:async ctx=>{const v=await ask(player,'イベントを登録（今いる場所が会場）',[{label:'名前（30文字以内）',placeholder:'例：収穫祭'},{label:'説明（200文字以内）',placeholder:'例：街の広場に集まろう'},{label:'開始まで（時間、0～720）',value:0},{label:'開催時間（時間、1～168）',value:2}]);
   return v?act(ctx,'event.add',{name:v[0],description:v[1],delay:v[2],duration:v[3],location:location(player)}):undefined;}}]};};
V.event=({db,player},{id})=>{const e=db.events.find(x=>x.id===id);if(!e)return {section:'events',title:'見つかりません',crumb:'',detail:'このイベントは削除されました。',rows:[]};
 return {section:'events',title:e.name,crumb:`イベント ＞ ${e.name}`,detail:`${e.description||'（説明なし）'}\n\n開始 ${date(e.start)}\n終了 ${date(e.end)}\n会場 ${where(e.location)}\n参加登録 ${e.participants.length}人`,
  rows:e.participants.map(pid=>({text:db.players[pid]?.name??'（不明）',icon:ICON('skin')})),
  actions:[{text:'報酬を配る',go:async ctx=>{const v=await ask(player,`参加者 ${e.participants.length}人に報酬を配る`,[{label:'1人あたりのコイン',value:0},{label:'1人あたりのガチャ券',value:1},reasonField]);return v?act(ctx,'event.reward',{id,coins:v[0],tickets:v[1],reason:v[2]}):undefined;}},
   {text:'削除',mark:'[warn]',go:()=>confirm('イベントを削除',`「${e.name}」を削除します。\n参加登録も消えます。`,async ctx=>{const r=act(ctx,'event.remove',{id});return r;},true)}]};};
// お知らせ in the book (notice-config.js): to everyone or to chosen players (all known players, online first), with up
// to two items by id (or the item in the staff member's hand). Unread notices show when a player comes in.
async function postFlow(ctx,player,db,personal){
 let to=null;
 if(personal){const list=Object.entries(db.players).sort(([a],[b])=>Number(ctx.online.has(b))-Number(ctx.online.has(a)));
  const v=await ask(player,'送る相手',[{label:'相手',options:list.map(([id,p])=>(ctx.online.has(id)?'● ':'')+p.name)}]);if(!v)return;to=[list[Number(v[0])][0]];}
 const held=player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
 const v=await ask(player,personal?'個人にお知らせを送る':'お知らせを投稿',[{label:'題名（30文字以内）',placeholder:'例：メンテナンスのお詫び'},{label:'本文（300文字以内）',placeholder:'例：お詫びにダイヤを配ります。'},
  {label:'添付1：アイテムID（空なら添付なし）',placeholder:'例：minecraft:diamond',value:''},{label:'添付1の個数',value:1},
  {label:'添付2：アイテムID',placeholder:'例：cooptown:rare_ore',value:''},{label:'添付2の個数',value:1},
  {label:held?`手に持っている「${held.typeId}」×${held.amount}も添付`:'（手に何も持っていません）',options:['添付しない','添付する']}]);
 if(!v||!String(v[0]).trim())return {status:'§c題名を入れてください。'};
 const items=[];
 for(const [idx,cnt] of [[2,3],[4,5]]){const id=String(v[idx]??'').trim();if(!id)continue;const full=id.includes(':')?id:'minecraft:'+id;
  try{new ItemStack(full,1);}catch{return {status:`§cアイテムID「${full}」が見つかりません。`};}
  const n=Math.floor(Number(v[cnt]));if(!(n>=1&&n<=NOTICE.maxAmount))return {status:`§c個数は1～${NOTICE.maxAmount}です。`};items.push([full,n]);}
 if(Number(v[6])===1&&held)items.push([held.typeId,held.amount]);
 let n;try{deps.game.admin(isAdmin(player),d=>{n=postNotice(d,{by:player.name,title:v[0],text:v[1],to,items});});}catch(e){return {status:'§c'+(e.message??e)};}
 const targets=to?world.getAllPlayers().filter(p=>to.includes(p.id)):world.getAllPlayers();
 for(const p of targets)try{notify(p,`お知らせ「${n.title}」`,1,6);p.sendMessage(`§e[お知らせ] 「${n.title}」が届きました${items.length?' §6アイテム付き':''}§7（手帳 ＞ お知らせ）`);}catch{}
 note(ctx,`お知らせ（手帳${to?'・個人':''}）：${n.title}${items.length?'（添付 '+items.length+'）':''}`,to?db.players[to[0]]?.name:'');
 return {status:`§aお知らせを送りました${to?'（'+db.players[to[0]]?.name+'）':''}。`};
}
V.notice=({db,player})=>({section:'notice',title:'お知らせ',crumb:'全員に送る（最近のお知らせ）',detail:'通知バー：画面の上から通知が下りてきます。\nチャット：全員のチャット欄に出ます。\n画面中央：全員の画面中央に大きく出ます（約5秒）。',
 rows:(db.adminLog??[]).filter(l=>l.text.startsWith('お知らせ')).map(l=>({text:`§7${date(l.at)}§r ${l.text.replace(/^お知らせ[^：]*：/,'')}`,icon:ICON('lantern')})),
 actions:[
  {text:'チャットで送る',go:async ctx=>{const v=await ask(player,'チャットで全員に送る',[{label:'内容（120文字以内）',placeholder:'例：今夜20時から収穫祭！'}]);if(!v||!String(v[0]).trim())return;const t=String(v[0]).trim().slice(0,120);world.sendMessage('§6[お知らせ]§r '+t);return note(ctx,'お知らせ（チャット）：'+t);}},
  {text:'通知バーで出す',go:async ctx=>{const v=await ask(player,'画面上の通知バーで全員に表示',[{label:'種類',options:NOTIFY_KINDS.map(k=>k.label)},{label:`内容（${NOTIFY.maxText}文字以内）`,placeholder:'例：20時から収穫祭！'},{label:'表示する秒数（1～30）',value:5}]);
   if(!v||!String(v[1]).trim())return;const t=String(v[1]).trim().slice(0,NOTIFY.maxText);notifyAll(t,Number(v[0])+1,Number(v[2])||5);return note(ctx,`お知らせ（通知バー・${NOTIFY_KINDS[v[0]]?.label}）：`+t);}},
  {text:'画面中央に出す',go:async ctx=>{const v=await ask(player,'画面中央に全員へ表示',[{label:'大きい文字（30文字以内）',placeholder:'例：収穫祭 開催！'},{label:'小さい文字（60文字以内）',placeholder:'例：広場に集まろう'}]);if(!v||!String(v[0]).trim())return;
   const t=String(v[0]).trim().slice(0,30),sub=String(v[1]??'').trim().slice(0,60);for(const p of world.getAllPlayers())announce(p,t,sub,6500);return note(ctx,'お知らせ（画面中央）：'+t);}},
  {text:'お知らせを投稿（手帳）',go:ctx=>postFlow(ctx,player,db,false)},
  {text:'個人に送る（アイテム付き可）',go:ctx=>postFlow(ctx,player,db,true)}
 ]});
V.records=({db,player})=>{const usage=deps.backups.usage(),list=deps.backups.list(),ledger=JSON.stringify(db).length,share=ledger/LEDGER_MAX;
 return {section:'records',title:'記録・保存',crumb:`運営の操作の記録（新しい順・最大${ADMIN_RULES.logLimit}件）`,
  detail:`${share>=.7?'§c':''}ゲームデータ ${num(Math.round(ledger/1024))}KB / ${num(Math.round(LEDGER_MAX/1024))}KB（${Math.round(share*100)}%）${share>=.7?'　容量に注意':''}§r
保存データ ${num(Math.round(usage.bytes/1024))}KB\n　項目数 ${num(usage.properties)}\n　置いたブロックの記録 ${num(usage.placedChunks)}チャンク\n\nバックアップ（最大3つ）\n${list.map(b=>`　${date(b.at)} ${b.by}\n　　${b.label}・${num(Math.round(b.size/1024))}KB`).join('\n')||'　まだありません'}`,
  rows:(db.adminLog??[]).map(l=>({text:`§7${date(l.at)}§r ${l.by}：${l.text}${l.target?' ＞ '+l.target:''}${l.reason?' §7('+l.reason+')':''}`})),
  actions:[{text:'バックアップを作る',mark:'[ok]',go:ctx=>{try{const b=deps.backups.create(player.name);note(ctx,'バックアップを作成');return {status:`§aバックアップを作りました（${num(Math.round(b.size/1024))}KB）。`};}catch(e){return {status:'§c'+(e.message??e)};}}},
   {text:'復元する',mark:'[warn]',go:()=>({push:{id:'restore'}})}]};};
V.restore=()=>({section:'records',title:'バックアップから復元',crumb:'記録・保存 ＞ 復元（選ぶと確認）',
 detail:'選んだ時点のデータに全体を戻します。\nその後の進行（お金・Lv・街・市場など）は消えます。\n\n復元の直前に、今の状態を自動でバックアップします。\n持ち物の中身は戻りません。',
 rows:deps.backups.list().map(b=>({text:`${date(b.at)}  ${b.by}  §7${b.label}`,icon:ICON('save'),go:()=>confirm('バックアップから復元',`${date(b.at)} の状態（${b.by}・${b.label}）に戻します。\n\n本当に実行しますか？`,ctx=>{try{deps.backups.restore(b.slot,ctx.player.name);for(const p of world.getAllPlayers())try{deps.refreshGame(p);}catch{}note(ctx,'バックアップから復元 '+date(b.at));return {status:'§a復元しました。'};}catch(e){return {status:'§c'+(e.message??e)};}},true)}))});
V.admins=({online:on,player})=>({section:'admins',title:'権限',crumb:'オンラインの人（選ぶと付け外し）',
 detail:`運営は「${ADMIN_RULES.tag}」タグを持つ人です。\n付け外しはオンラインの人だけできます。\n\n最初の1人はコマンドで付けます：\n/tag <名前> add ${ADMIN_RULES.tag}`,
 rows:[...on.values()].map(p=>({text:`${isAdmin(p)?'§a[運営]':'§7[一般]'}§r ${p.name}`,icon:ICON(isAdmin(p)?'title':'skin'),go:()=>{
  if(p.id===player.id)return {status:'§c自分の権限は外せません。'};
  if(isOwner(p))return {status:'§c'+p.name+'はオーナーのため、運営から外せません。'};
  const give=!isAdmin(p);return confirm(give?'運営にする':'運営から外す',`${p.name}を${give?'運営にします。\n管理者画面のすべての操作ができるようになります。':'運営から外します。'}`,ctx=>{try{give?p.addTag(ADMIN_RULES.tag):p.removeTag(ADMIN_RULES.tag);}catch(e){return {status:'§c'+(e.message??e)};}return note(ctx,give?'運営に追加':'運営から削除',p.name);},!give);}})),
 actions:[{text:'運営の手帳を受け取る',go:()=>{player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack('cooptown:admin_book',1));return {status:'§a運営の手帳を渡しました。'};}}]});

// ---- rendering ----
const L=ADMIN_LAYOUT;
export function buildForm(view,{page=0,canBack=false,status=''}={}){
 const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
 for(const [key,label,icon] of SECTIONS)add('§l'+(view.section===key?'[on]':'')+label,ICON(icon));
 add('§l'+(view.section==='home'?'[on]':'')+'概要',ICON('journal'));
 add(canBack?'§l戻る':'');add('§l×');
 const rows=view.rows??[],pages=Math.max(1,Math.ceil(rows.length/L.rowCount)),p=Math.min(page,pages-1),shown=rows.slice(p*L.rowCount,(p+1)*L.rowCount);
 for(let i=0;i<L.rowCount;i++){const r=shown[i];add(r?'§r'+r.text:'',r?.icon);}
 add(p>0?'§l＜':'');add(p<pages-1?'§l＞':'');
 const actions=view.actions??[];
 for(let i=0;i<L.actionCount;i++){const a=actions[i];add(a?'§l'+(a.mark??'')+a.text:'');}
 add('§l'+view.title);add('§r'+(view.crumb??''));add(pages>1?`§r${p+1} / ${pages}ページ`:'');add(status?'§r'+status:'');add(view.detail?'§r'+view.detail:'');
 return {buttons,shown,actions,page:p,pages};
}
export async function openAdmin(player){
 if(!isAdmin(player)){player.sendMessage(`§c運営用です。「${ADMIN_RULES.tag}」タグを持つ人だけが使えます。`);return;}
 if(active.has(player.id))return;active.add(player.id);
 const nav=[{id:'home',args:{},page:0}];let status='',busy=0,lastSection='home';
 try{
  while(true){
   const cur=nav.at(-1),ctx={player,db:deps.game.overview(),online:online(),itemName:deps.itemName,section:undefined};
   const view=V[cur.id](ctx,cur.args??{});if(view.section)lastSection=view.section;else view.section=lastSection;ctx.section=view.section;
   const built=buildForm(view,{page:cur.page,canBack:nav.length>1,status});cur.page=built.page;status='';
   const form=new ActionFormData().title('ct:admin').body('');for(const [t,i] of built.buttons)form.button(t,i);
   const r=await form.show(player);
   if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(res=>system.runTimeout(res,10));continue;}return;}
   busy=0;const i=r.selection;let result;
   if(!isAdmin(player))return;
   if(i<L.home){nav.length=0;nav.push({id:SECTIONS[i-L.sections][0],args:{},page:0});continue;}
   if(i===L.home){nav.length=0;nav.push({id:'home',args:{},page:0});continue;}
   if(i===L.back){if(nav.length>1)nav.pop();continue;}
   if(i===L.close)return;
   if(i>=L.rows&&i<L.prev)result=await built.shown[i-L.rows]?.go?.(ctx);
   else if(i===L.prev)cur.page=Math.max(0,cur.page-1);
   else if(i===L.next)cur.page++;
   else if(i>=L.actions&&i<L.actions+L.actionCount)result=await built.actions[i-L.actions]?.go?.(ctx);
   if(result?.push)nav.push({...result.push,page:0});
   if(result?.pop)nav.length=Math.max(1,nav.length-result.pop);
   if(result?.status)status=result.status;
  }
 }catch(e){console.warn('[CoopTown] 運営画面: '+e);try{player.sendMessage('§c運営画面でエラーが起きました: '+(e.message??e));}catch{}}
 finally{active.delete(player.id);}
}
