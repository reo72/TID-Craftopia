import {world,system,ItemStack,EnchantmentType} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {jobCount} from './job-count.js';
import {keepDigits} from './form-text.js';
import {ENCHANT_JOB,ENCHANT_RULES,ENCHANT_TABS,ENCHANTS,ROMAN,kindOf,enchantability} from './enchant-config.js';
import {recipeIcon} from './workbench-icons.js';
import {titleTrack,titleSeen} from './job-count.js';
import {skillValue} from './skill-config.js';

// Replaces the vanilla enchanting table UI with the enchanter's screen (form title "ct:enchant"); only the
// 付与術師 job can use the table. Pick an unenchanted item from the inventory, one of three offers, enchant.
// Button order of the screen. Must match tools/build-enchant-ui.mjs in the RP (a slot per button, hidden while its
// text is empty; marks: [on] chosen tab, [sel] chosen item / offer, [ng] offer not affordable, [off] button disabled).
const PAGE_SIZE=12;
const L={tab:0,close:4,back:5,prev:6,next:7,slot:8,offer:20,rune:23,cost:26,enchant:29,page:30,icon:31,name:32,level:33,spend:34,lapis:35,hint:36,count:37};
const SEED_KEY='cooptown:ench_seed';
const active=new Set();

// small seeded random numbers: the offers stay the same until the player enchants (reopening does not reroll)
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const hash=s=>[...String(s)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
const between=(r,a,b)=>a+Math.floor(r()*(b-a+1));
function seedOf(player){
 let s=player.getDynamicProperty?.(SEED_KEY);
 if(!Number.isInteger(s)){s=Math.floor(Math.random()*2**31);try{player.setDynamicProperty(SEED_KEY,s);}catch{}}
 return s;
}
const compatible=(e,list)=>list.every(o=>o.id!==e.id&&!(e.group&&e.group===o.group)&&!(e.excl??[]).includes(o.id)&&!(o.excl??[]).includes(e.id));
/** The three offers for an item: [{cost, enchants:[{id,name,level}]}], vanilla-like.
 *  shelves: bookshelves around the table (0-15); bonus: the enchanter's extra power from craft level. */
export function offersFor(id,shelves,seed,bonus=0){
 const kind=kindOf(id);if(!kind)return [];
 const r=rng(seed^hash(id)),b=Math.min(ENCHANT_RULES.maxShelves,Math.max(0,shelves|0));
 const base=between(r,1,8)+(b>>1)+between(r,0,b);
 const costs=[Math.max(Math.floor(base/3),1),Math.floor(base*2/3)+1,Math.max(base,b*2)];
 const e=enchantability(id),pool=ENCHANTS.filter(x=>kind==='book'?true:x.on.includes(kind));
 return costs.map(cost=>{
  let power=cost+1+between(r,0,e>>2)+between(r,0,e>>2)+bonus;
  power=Math.max(1,Math.round(power*(1+(r()+r()-1)*.15)));
  const pick=[];
  const add=()=>{const can=pool.filter(x=>compatible(x,pick));if(!can.length)return false;
   let w=r()*can.reduce((s,x)=>s+x.weight,0),x=can.find(c=>(w-=c.weight)<0)??can[can.length-1];
   const level=Math.min(x.max,Math.max(1,Math.round(x.max*power/33+.3)));pick.push({...x,level});return true;};
  add();
  // more enchantments: each with a falling chance, as in vanilla ((power + 1) / 50, power halved each time)
  for(let p=power;r()<(p+1)/50&&add();)p>>=1;
  return {cost,enchants:pick.map(({id,name,level})=>({id,name,level}))};
 });
}
/** Bookshelves around the table: the ring two blocks out, at the table's height and one above (max 15). */
export function shelvesAround(block){
 let n=0;
 for(let dy=0;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==2)continue;
  try{if(block.dimension.getBlock({x:block.location.x+dx,y:block.location.y+dy,z:block.location.z+dz})?.typeId==='minecraft:bookshelf')n++;}catch{}
 }
 return Math.min(ENCHANT_RULES.maxShelves,n);
}
const enchantsOf=item=>{try{return item.getComponent('minecraft:enchantable')?.getEnchantments()??[];}catch{return [];}};
const iconOf=id=>recipeIcon({output:[id,1]});
const creative=player=>{try{return String(player.getGameMode()).toLowerCase()==='creative';}catch{return false;}};
function countOf(container,id){let n=0;for(let i=0;i<container.size;i++){const s=container.getItem(i);if(s?.typeId===id)n+=s.amount;}return n;}
function take(container,id,n){for(let i=0;i<container.size&&n>0;i++){const s=container.getItem(i);if(s?.typeId!==id)continue;const used=Math.min(n,s.amount);n-=used;if(s.amount===used)container.setItem(i,undefined);else{s.amount-=used;container.setItem(i,s);}}}
// a run of the enchanting runes (Minecraft's scrambled text, §k), different per offer
const RUNE='abcdefghijklmnopqrstuvwxyz';
const runes=r=>'§k'+Array.from({length:between(r,7,11)},()=>RUNE[Math.floor(r()*RUNE.length)]).join('');

export function installEnchanting({refreshGame,itemName}){
 const nameOf=item=>item.nameTag||itemName(item.typeId);
 function render(player,state){
  const {player:p}=refreshGame(player),container=player.getComponent('minecraft:inventory')?.container;
  const tab=ENCHANT_TABS[state.tab],seed=seedOf(player),bonus=Math.min(ENCHANT_RULES.maxBonus,Math.floor((p.craft?.level??1)/ENCHANT_RULES.bonusPerLevels))+skillValue(p,ENCHANT_JOB,'power'); // 魔力の高まり (skill-config.js) goes past the cap
  const list=[];
  for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s&&tab.kinds.includes(kindOf(s.typeId))&&!enchantsOf(s).length)list.push(i);}
  const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));state.page=Math.min(state.page,pages-1);
  const shown=list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE);
  if(!list.includes(state.sel)){state.sel=shown[0];state.offer=0;}
  const item=state.sel!==undefined?container.getItem(state.sel):undefined;
  const offers=item?offersFor(item.typeId,state.shelves,seed,bonus):[];
  const level=player.level??0,lapis=container?countOf(container,ENCHANT_RULES.lapis):0,free=creative(player);
  const affordable=n=>free||(level>=offers[n].cost&&lapis>=n+1);
  const buttons=[];const add=(text,icon)=>buttons.push([text,icon]);
  ENCHANT_TABS.forEach((t,n)=>add((n===state.tab?'[on]':'')+t.label,t.icon));
  add('×');add('戻る');add(state.page>0?'◀':'');add(state.page<pages-1?'▶':'');
  for(let j=0;j<PAGE_SIZE;j++){const i=shown[j];if(i===undefined){add('');continue;}const s=container.getItem(i);add((i===state.sel?'[sel]':'')+nameOf(s),iconOf(s.typeId));}
  const r=rng(seed^hash('runes'));
  for(let n=0;n<3;n++){const o=offers[n];add(o&&o.enchants.length?(n===state.offer?'[sel]':'')+(affordable(n)?'':'[ng]')+`${o.enchants[0].name} ${ROMAN[o.enchants[0].level]} … ？`:'',o?'textures/cooptown/enchant/book':undefined);}
  for(let n=0;n<3;n++)add(offers[n]?.enchants.length?runes(r):'');
  for(let n=0;n<3;n++)add(offers[n]?.enchants.length?String(offers[n].cost):'');
  const o=offers[state.offer];
  add((o?.enchants.length&&affordable(state.offer)?'':'[off]')+'エンチャントする');
  add(`${state.page+1} / ${pages}`);
  add(item?' ':'',item?iconOf(item.typeId):undefined);
  add(item?nameOf(item):'アイテムがありません');
  add(free?'クリエイティブ':String(level));
  add(o?.enchants.length?`${state.offer+1}レベル`:'-');
  add(`${lapis>=state.offer+1||free?'§f':'§c'}${lapis} §f/ ${state.offer+1}`);
  add(state.notice||(item?`本棚 ${state.shelves}個`+(bonus?`　職業ボーナス +${bonus}`:''):'装備を選択'));
  state.notice='';
  return {buttons,shown,offers,affordable};
 }
 function enchant(player,state,view){
  const container=player.getComponent('minecraft:inventory')?.container,o=view.offers[state.offer];
  if(!container||!o?.enchants.length||state.sel===undefined)return;
  if(!view.affordable(state.offer))throw new Error(`レベル${o.cost}以上とラピスラズリ${state.offer+1}個が必要です`);
  const item=container.getItem(state.sel);if(!item)return;
  const isBook=item.typeId==='minecraft:book',target=isBook?new ItemStack('minecraft:enchanted_book',1):item;
  const ench=target.getComponent('minecraft:enchantable');if(!ench)throw new Error('このアイテムにはエンチャントできません');
  const done=[];
  for(const e of o.enchants){const v={type:new EnchantmentType(e.id),level:e.level};try{if(ench.canAddEnchantment(v)){ench.addEnchantment(v);done.push(e);}}catch{}}
  if(!done.length)throw new Error('このアイテムにはエンチャントできません');
  if(isBook&&item.amount>1){item.amount--;container.setItem(state.sel,item);const left=container.addItem(target);if(left)player.dimension.spawnItem(left,player.location);}
  else container.setItem(state.sel,target);
  // ラピス節約 / 省力の術 (skill-config.js): a chance to keep the lapis / the levels
  const kept=[];
  if(!creative(player)){let ep;try{ep=refreshGame(player).player;}catch{}
   if(Math.random()<skillValue(ep,ENCHANT_JOB,'levels'))kept.push('経験値レベル');else player.addLevels(-(state.offer+1));
   if(Math.random()<skillValue(ep,ENCHANT_JOB,'lapis'))kept.push('ラピスラズリ');else take(container,ENCHANT_RULES.lapis,state.offer+1);}
  try{player.setDynamicProperty(SEED_KEY,Math.floor(Math.random()*2**31));}catch{}
  jobCount(player,'enchant');titleTrack(player,'enchant:'+(isBook?'book':/_(helmet|chestplate|leggings|boots)$/.test(item.typeId)?'armor':'weapon')); // titles
  return '§aエンチャントしました：'+done.map(e=>e.name+' '+ROMAN[e.level]).join('、')+(kept.length?`\n§b${kept.join('と')}を使わずに済みました`:'');
 }
 async function open(player,block){
  if(active.has(player.id))return;active.add(player.id);
  const state={tab:0,page:0,sel:undefined,offer:0,notice:'',shelves:shelvesAround(block)};let busy=0;
  try{
   while(true){
    const view=render(player,state),form=new ActionFormData().title('ct:enchant').body('');
    for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
    const result=await form.show(player);
    if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
    busy=0;const i=result.selection;
    if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;state.offer=0;}
    else if(i===L.close||i===L.back)return;
    else if(i===L.prev)state.page=Math.max(0,state.page-1);
    else if(i===L.next)state.page++;
    else if(i>=L.slot&&i<L.offer){const v=view.shown[i-L.slot];if(v!==undefined&&v!==state.sel){state.sel=v;state.offer=0;}}
    else if(i>=L.offer&&i<L.rune)state.offer=i-L.offer;
    else if(i===L.enchant){try{const message=enchant(player,state,view);if(message){state.notice=message;state.sel=undefined;}}catch(e){state.notice='§c'+(e.message??e);}}
   }
  }catch(e){console.warn('[CoopTown] エンチャント台: '+e);try{player.sendMessage('§cエンチャント台を開けませんでした。');}catch{}}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:enchanting_table')return;
  if(player.isSneaking)return; // sneaking opens the RuneScript workshop (rune-runtime.js), with or without an item in hand
  event.cancel=true;
  if(event.isFirstEvent===false)return; // the event repeats while the button is held
  system.run(()=>{
   let p;try{p=refreshGame(player).player;}catch{}
   if(![p?.job,p?.secondJob].includes(ENCHANT_JOB)){player.sendMessage('§eエンチャント台は'+ENCHANT_JOB+'だけが使えます。');return;}
   void open(player,block);
  });
 });
 world.afterEvents.playerLeave.subscribe(({playerId})=>active.delete(playerId));
}
