import {world,system,ItemStack} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {WORKBENCH_RECIPES,recipeXp} from './game-config.js';
import {typesOf,ingredientName} from './workbench-config.js';
import {usableRecipes,stock,logCraft,recipeLock,SMITH_JOB} from './workbench-runtime.js';
import {ANVIL_JOB,ANVIL_TABS,anvilTab,repairMaterial,repairPlan,repairPer,bookCost} from './anvil-config.js';
import {enchantName} from './enchant-config.js';
import {recipeIcon} from './workbench-icons.js';
import {SPECIAL_TEXTURES} from './cooperation-config.js';
import {qualityOf,rollQuality,setQuality,rankText} from './quality.js';
import {playMinigame,scoreBonus} from './minigame.js';
import {dexOf,dexBonus,dexSave,dexEase} from './dexterity.js';
import {openCommissions} from './commission.js';
import {playForge} from './forge-game.js';
import {rollGearStats,gearLore} from './gear-stats.js';
import {titleTrack,titleSeen} from './job-count.js';
import {titleMax} from './job-count.js';
import {buffLeft} from './buffs.js';
import {skillValue} from './skill-config.js';

// Replaces the vanilla anvil UI with the blacksmith's anvil (form title "ct:anvil"); only the 鍛冶師 job can use
// an anvil. 修理: pick a worn item, mend it with its material, or put an enchanted book's enchantments on it (the
// "+" slot switches between the material and the books in the inventory). 作成: the smith's recipes (moved here
// from the workbench), made through the workbench's craft action (same XP and job level locks).
// Button order of the screen. Must match tools/build-anvil-ui.mjs in the RP (a slot per button, hidden while its
// text is empty). Marks: [on] chosen tab / mode, [sel] chosen item, [off] button disabled, [ng] not enough;
// durability bars: [dN] = N steps lit (10 in the list, 20 elsewhere), [y] = yellow (under half).
const PAGE_SIZE=12,ROWS=4;
const L={tab:0,close:4,back:5,prev:6,next:7,slot:8,make:20,fix:21,plus:22,action:23,page:24,icon:25,name:26,bar:27,a:28,result:29,afterLabel:30,after:31,row:32,rowCount:36,hint:40,note:41,count:42};
const ANVILS=new Set(['minecraft:anvil','minecraft:chipped_anvil','minecraft:damaged_anvil']);
const XP_ICON='textures/items/experience_bottle',BOOK_ICON='textures/items/book_enchanted';
const active=new Set();

const iconOf=id=>recipeIcon({output:[id,1]})??(SPECIAL_TEXTURES[id]?'textures/cooptown/'+SPECIAL_TEXTURES[id]:undefined);
const itemTexture=type=>{const id=typesOf(type)[0];return id?iconOf(id):undefined;};
/** Durability bar marks for a share left (0-1): '' when nothing is left. */
export const barMarks=(left,steps)=>left<=0?'':`[d${Math.max(1,Math.min(steps,Math.round(left*steps)))}]`+(left<.5?'[y]':'');
const durabilityOf=item=>{try{return item?.getComponent('minecraft:durability');}catch{return undefined;}};
const enchantsOf=item=>{try{return item?.getComponent('minecraft:enchantable')?.getEnchantments()??[];}catch{return [];}};
const creative=player=>{try{return String(player.getGameMode()).toLowerCase()==='creative';}catch{return false;}};
function take(container,type,n){
 const ids=typesOf(type);
 for(let i=0;i<container.size&&n>0;i++){const s=container.getItem(i);if(!s||!ids.includes(s.typeId))continue;const used=Math.min(n,s.amount);n-=used;if(s.amount===used)container.setItem(i,undefined);else{s.amount-=used;container.setItem(i,s);}}
}

export function installAnvil({game,refreshGame,itemName}){
 const nameOf=item=>item.nameTag||itemName(item.typeId);
 const smithRecipes=()=>[...usableRecipes()].filter(i=>WORKBENCH_RECIPES[i].job===SMITH_JOB);
 const booksIn=container=>{const out=[];for(let i=0;i<container.size;i++){const s=container.getItem(i);if(s?.typeId==='minecraft:enchanted_book'&&enchantsOf(s).length)out.push(i);}return out;};
 function render(player,state){
  const {player:p}=refreshGame(player),container=player.getComponent('minecraft:inventory')?.container,have=stock(player);
  const craftLevel=p.craft?.level??1,level=player.level??0,free=creative(player);
  const list=state.mode==='fix'
   ?(()=>{const out=[];for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s&&durabilityOf(s)&&anvilTab(s.typeId)===state.tab)out.push(i);}return out;})()
   :smithRecipes().filter(i=>anvilTab(WORKBENCH_RECIPES[i].output[0])===state.tab);
  const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel)){state.sel=shown[0];state.src=-1;}
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  ANVIL_TABS.forEach((t,n)=>add((n===state.tab?'[on]':'')+t));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const v=shown[j];if(v===undefined){add('');continue;}
   if(state.mode==='fix'){const s=container.getItem(v),d=durabilityOf(s);add((v===state.sel?'[sel]':'')+barMarks(1-d.damage/d.maxDurability,10)+nameOf(s),iconOf(s.typeId));}
   else{const r=WORKBENCH_RECIPES[v];add((v===state.sel?'[sel]':'')+(recipeLock(r,p)||r.inputs.some(([t,n])=>have(t)<n)?'[ng]':'')+r.name,iconOf(r.output[0]));}}
  add((state.mode==='make'?'[on]':'')+'作成');add((state.mode==='fix'?'[on]':'')+'修理');
  const view={buttons,shown};
  const rest=(fields)=>{ // plus, action, page, icon, name, bar, a, result, afterLabel, after, rows x4, counts x4, hint, note
   add(...(fields.plus??['']));add(fields.action);add(`${state.page+1} / ${pages}`);
   add(...(fields.icon??['']));add(fields.name??'');add(fields.bar??'');add(...(fields.a??['']));add(...(fields.result??['']));
   add(fields.afterLabel??'');add(fields.after??'');
   // the cost panel has two bands of two rows: up to two needs get one band each
   const rows=(fields.rows??[]).length<=2?[fields.rows?.[0],undefined,fields.rows?.[1],undefined]:fields.rows;
   for(let k=0;k<ROWS;k++)add(...(rows[k]?.slice(0,2)??['']));
   for(let k=0;k<ROWS;k++)add(rows[k]?.[2]??'');
   add(fields.hint);add(state.notice||fields.note||'');state.notice='';
  };
  if(state.mode==='make'){
   const r=WORKBENCH_RECIPES[state.sel];
   if(!r){rest({action:'[off]作成する',name:'作れるレシピがありません',hint:'レシピを選択'});return view;}
   const lock=recipeLock(r,p),short=r.inputs.some(([t,n])=>have(t)<n);
   rest({action:(lock||short?'[off]':'')+'作成する',icon:[' ',iconOf(r.output[0])],name:r.name+(r.output[1]>1?` ×${r.output[1]}`:''),
    a:[' ',itemTexture(r.inputs[0][0])],plus:r.inputs[1]?[' ',itemTexture(r.inputs[1][0])]:[''],result:[' ',iconOf(r.output[0])],
    rows:r.inputs.slice(0,ROWS).map(([t,n])=>[ingredientName(t,itemName),itemTexture(t),`${have(t)>=n?'§a':'§c'}${have(t)} §f/ ${n}`]),
    hint:'レシピを選択',note:lock?'§c'+lock:short?'§c素材が足りません':`§a作れます§f　クラフト経験値 +${recipeXp(r)}`});
   view.recipe=state.sel;return view;
  }
  const item=state.sel!==undefined?container.getItem(state.sel):undefined,d=durabilityOf(item);
  if(!item||!d){rest({action:'[off]修理する',name:'修理できる装備がありません',hint:'装備を選択',note:'持ち物の装備がここに並びます'});return view;}
  const books=booksIn(container);if(state.src>=0&&!books.includes(state.src))state.src=-1;
  const left=1-d.damage/d.maxDurability,head={icon:[' ',iconOf(item.typeId)],name:nameOf(item),bar:barMarks(left,20)||'_',hint:'装備を選択'};
  const levelRow=cost=>['経験値レベル',XP_ICON,`${free||level>=cost?'§a':'§c'}${free?'∞':level} §f/ ${cost}`];
  view.books=books;
  if(state.src>=0){
   const book=container.getItem(state.src),list2=enchantsOf(book),cost=bookCost(list2,craftLevel),ok=free||level>=cost;
   rest({...head,plus:['[sel] ',BOOK_ICON],action:(ok?'':'[off]')+'本を付ける',a:[' '+barMarks(left,10),iconOf(item.typeId)],result:[' '+barMarks(left,10),iconOf(item.typeId)],
    rows:[['本：'+list2.map(e=>enchantName(e.type?.id??e.type,e.level)).join('、'),BOOK_ICON,'§a1 §f/ 1'],levelRow(cost)],
    note:`本の効果を付けます（耐久は回復しません）　＋で切り替え ${books.indexOf(state.src)+1}/${books.length}`});
   view.plan={book:state.src,cost,ok};return view;
  }
  const mat=repairMaterial(item.typeId),n=mat?have(mat):0,plan=repairPlan(d.damage,d.maxDurability,n,craftLevel,skillValue(p,ANVIL_JOB,'repair'));
  const need=Math.ceil(d.damage/repairPer(d.maxDurability,skillValue(p,ANVIL_JOB,'repair'))),ok=d.damage>0&&plan.units>0&&(free||level>=plan.levels);
  const after=1-plan.after/d.maxDurability;
  rest({...head,plus:mat?[' ',itemTexture(mat)]:[''],action:(ok?'':'[off]')+'修理する',a:[' '+barMarks(left,10),iconOf(item.typeId)],result:[' '+barMarks(after,10),iconOf(item.typeId)],
   afterLabel:'修理後',after:barMarks(after,20)||'_',
   rows:[...(mat?[[ingredientName(mat,itemName),itemTexture(mat),`${n>=need?'§a':'§c'}${n} §f/ ${need}`]]:[]),levelRow(Math.max(plan.levels,d.damage?1:0))],
   note:!mat?'§cこの装備は修理できません':d.damage===0?'耐久は満タンです'+(books.length?'　＋で本に切り替え':''):plan.units<1?'§c素材が足りません':
    '※ 素材と経験値を消費します'+(books.length?'　＋で本に切り替え':'')});
  view.plan={mat,units:plan.units,after:plan.after,cost:plan.levels,ok};
  return view;
 }
 async function act(player,state,view){
  const container=player.getComponent('minecraft:inventory')?.container,free=creative(player);
  if(state.mode==='make'){
   if(view.recipe===undefined)return '';
   // the forging minigame (加熱・打撃・冷却): only adds to the quality chance, a miss still makes the item
   const out0=WORKBENCH_RECIPES[view.recipe].output[0];let bonus=0,forgeScore=0;
   // the forging minigame (forge-game.js: 加熱・打撃・冷却 screen); the job level and 器用さ give more time. 中断 makes nothing
   let gear=false;try{gear=!!new ItemStack(out0,1).getComponent('minecraft:durability');}catch{}
   if(gear){
    let ease=0;try{const pp=refreshGame(player).player;ease=Math.min(1,Math.max(0,((pp.level??1)-1)/49)*.7+dexEase(dexOf(player,pp))+skillValue(pp,ANVIL_JOB,'forge'));}catch{}
    const score=await playForge(player,{ease});
    if(score===null)return '§7鍛造を中断しました（素材は使っていません）';
    bonus=scoreBonus(score);forgeScore=score;titleMax(player,'forge_best',Math.round(score)); // 記録 and the week's contest
   }
   const before=new Set();for(let i=0;i<container.size;i++){const s=container.getItem(i);if(s)before.add(i+':'+s.typeId+':'+s.amount);}
   const message=game.execute(player.id,'workbench.craft',{recipe:view.recipe,count:1});logCraft(player,view.recipe,1,message);
   // gear (anything with durability) made here rolls a quality rank D-S with the smith's craft level
   const out=WORKBENCH_RECIPES[view.recipe].output[0];let tier=0;
   for(let i=0;i<container.size;i++){const s=container.getItem(i);if(s?.typeId!==out||before.has(i+':'+s.typeId+':'+s.amount)||qualityOf(s)||!durabilityOf(s))continue;
    let lv=1,dex=10,sk=0;try{const pp=refreshGame(player).player;lv=pp.craft?.level??1;dex=dexOf(player,pp);sk=skillValue(pp,ANVIL_JOB,'rank');}catch{}
    tier=rollQuality(lv,bonus+dexBonus(dex)+sk); // 器用さ raises the rank a little
    if(tier)setQuality(s,tier,true);
    // its own numbers (gear-stats.js): ＋防具 / ＋攻撃 / ＋耐久 from the rank, the minigame score and 器用さ, in the food-style lore
    const stats=rollGearStats(s.typeId,tier,{score:forgeScore,dex});if(stats)try{s.setLore(gearLore(s.typeId,stats,tier,player.name));}catch{}
    container.setItem(i,s);jobCount(player,'forge');
    {const id=s.typeId.replace('minecraft:',''),part=(/_(sword|axe|helmet|chestplate|leggings|boots)$/.exec(id)??[])[1];titleSeen(player,'forged',id); // titles
     if(part)titleTrack(player,/sword|axe/.test(part)?'forged:weapon':'forged:armor');if(tier>=2){titleTrack(player,'forged_good');if(part)titleSeen(player,'forged_good',part);}
     if(forgeScore>=80)titleTrack(player,'forge_score:80');if(forgeScore>=90)titleTrack(player,'forge_score:90');if(forgeScore!==undefined&&buffLeft(player,'focus')>0)titleTrack(player,'forge_with:focus');}
    break;}
   return '§a'+message.split('\n')[0]+(tier?`（${rankText(tier)}§a）`:'');
  }
  const plan=view.plan,item=container.getItem(state.sel);
  if(!plan||!item)return '';
  if(!plan.ok)throw new Error(plan.book!==undefined?`経験値レベル${plan.cost}が必要です`:'修理できません');
  if(plan.book!==undefined){
   const book=container.getItem(plan.book),target=item.getComponent('minecraft:enchantable');if(!target)throw new Error('この装備には本を付けられません');
   const done=[];
   for(const e of enchantsOf(book)){
    let cur;try{cur=target.getEnchantment(e.type);}catch{}
    let lv=e.level;if(cur){lv=cur.level===e.level?Math.min(e.type.maxLevel??e.level,e.level+1):Math.max(cur.level,e.level);if(lv<=cur.level)continue;try{target.removeEnchantment(e.type);}catch{}}
    const v={type:e.type,level:lv};
    try{if(target.canAddEnchantment(v)){target.addEnchantment(v);done.push(enchantName(e.type?.id??e.type,lv));}else if(cur)target.addEnchantment(cur);}catch{if(cur)try{target.addEnchantment(cur);}catch{}}
   }
   if(!done.length)throw new Error('この本の効果は付けられません（合わない・同じ効果がある）');
   container.setItem(state.sel,item);container.setItem(plan.book,undefined);
   if(!free)player.addLevels(-plan.cost);state.src=-1;
   return '§a本の効果を付けました：'+done.join('、');
  }
  const d=item.getComponent('minecraft:durability');d.damage=plan.after;container.setItem(state.sel,item);
  // 器用さ: now and then one repair material is saved
  let dex=10;try{dex=dexOf(player,refreshGame(player).player);}catch{}
  const saved=plan.units>0&&Math.random()<dexSave(dex)?1:0;
  take(container,plan.mat,plan.units-saved);if(!free)player.addLevels(-plan.cost);
  jobCount(player,'repair');
  return (plan.after===0?'§a修理しました（耐久 満タン）':'§a修理しました')+(saved?'　§e器用さで素材を1つ節約！':'');
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:1,mode:'fix',page:0,sel:undefined,src:-1,notice:''};let busy=0;
  try{
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:anvil').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    busy=0;const i=result.selection;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;state.src=-1;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.make){const v=view.shown[i-L.slot];if(v!==undefined&&v!==state.sel){state.sel=v;state.src=-1;}}
    else if(i===L.make||i===L.fix){const mode=i===L.make?'make':'fix';if(mode!==state.mode){state.mode=mode;state.page=0;state.sel=undefined;state.src=-1;}}
    else if(i===L.plus&&state.mode==='fix'&&view.books?.length){const order=[-1,...view.books];state.src=order[(order.indexOf(state.src)+1)%order.length];}
    else if(i===L.action){try{const message=await act(player,state,view);if(message)state.notice=message;}catch(e){state.notice='§c'+(e.message??e);}}
   }
  }catch(e){console.warn('[CoopTown] 金床: '+e);try{player.sendMessage('§c金床を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(!ANVILS.has(block.typeId))return;
  if(player.isSneaking&&event.itemStack)return; // sneaking with an item places a block instead
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  const sneak=player.isSneaking;
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(ANVIL_JOB)){player.sendMessage('§e金床は'+ANVIL_JOB+'だけが使えます。');return;}
   // sneaking with an empty hand: the day's 職人依頼 (commission.js)
   if(sneak){if(active.has(player.id))return;active.add(player.id);openCommissions(player,{game,itemName,refreshGame}).catch(e=>console.warn('[CoopTown] 職人依頼: '+e)).finally(()=>active.delete(player.id));return;}
   void open(player);
  });
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
