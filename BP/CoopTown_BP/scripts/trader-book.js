import {ModalFormData} from '@minecraft/server-ui';
import {openGameFeature,game,refreshGame} from './game-runtime.js';
import {runList} from './book-pages.js';
import {noticeDialog,confirmDialog} from './dialog.js';
import {BOOK_ICON,itemIcon} from './book-frame.js';
import {money} from './hud-info.js';
import {ITEM_NAMES} from './game-config.js';
import {merchantGroups,sellable} from './sell-price.js';
import {qualityOf,TIERS} from './quality.js';
import {stateOf,NEAR} from './freshness.js';
import {titleTrack,jobCount} from './job-count.js';
import {sellTitleKind} from './npc-sell.js';
import {TRADER,TRADER_GOODS,normalPrice,buyPrice} from './trader-config.js';

// The 商人 NPC's screen (trader-config.js): 買う (1.5x the normal price) and 売る (asked 2026-10-28: a price for each item
// and rank, sell-price.js: staff's price, else the default). Ranked goods sell too; named, enchanted and worn items
// and expired food do not.
const nameOf=id=>ITEM_NAMES[id]??String(id).replace(/^\w+:/,'');
const card=(label,enabled,icon)=>({label,enabled:!!enabled,icon});
const rankName=g=>(g.tier?`ランク${TIERS[g.tier].label}の`:'')+nameOf(g.id)+(g.near?'（期限間近）':'');
/** What the player can sell here, by item, rank and freshness (sell-price.js merchantGroups), best value first. */
export const sellList=player=>{try{return merchantGroups(player.getComponent('minecraft:inventory').container);}catch{return [];}};
/** Sells n of a group: takes them out of the inventory (only sellable stacks of that rank and freshness) and pays. */
export function sellGroupHere(player,g,n){
 const c=player.getComponent('minecraft:inventory')?.container;let left=n;
 for(let i=0;c&&i<c.size&&left>0;i++){const s=c.getItem(i);if(s?.typeId!==g.id||!sellable(s)||qualityOf(s)!==g.tier||(stateOf(s)===NEAR)!==!!g.near)continue;
  const k=Math.min(left,s.amount);left-=k;if(s.amount===k)c.setItem(i,undefined);else{s.amount-=k;c.setItem(i,s);}}
 const got=n-left;if(!got)throw new Error('売る物がありません。');
 const pay=got*g.price;titleTrack(player,'npc_trade');titleTrack(player,'npc_coins',pay);
 {const k=sellTitleKind(g.id.replace('minecraft:',''));if(k)titleTrack(player,'npc_sell:'+k);if(k==='sell_loot')jobCount(player,'sell_loot',got);} // 初任給 / 材木屋 / お小遣い稼ぎ ...; 冒険家's daily
 return game.execute(player.id,'job.earn',{coins:pay,skill:g.skill,xp:g.skill?Math.max(1,Math.ceil(pay/20)):0,note:`よろず屋に売却 ${rankName(g)}×${got} +${pay}コイン`});
}
async function ask(player,title,max,each){
 const r=await new ModalFormData().title('ct:in|'+title).textField(`個数（1～${max}）　1個 ${each}コイン`,'個数',{defaultValue:'1'}).show(player);
 if(r.canceled)return;const n=Math.floor(Number(r.formValues[0]));
 if(!(n>=1&&n<=max)){await noticeDialog(player,'よろず屋',`1～${max}の数を入れてください。`,{close:'戻る'});return;}
 return n;
}
const startTab=new Map();
export const traderModel={
 start:player=>({tab:startTab.get(player.id)??0}),
 spec(player,{player:p},state){
  if(state.tab===1){
   const list=sellList(player),x=list[state.sel];
   const rows=list.length?list.map(v=>({title:(v.tier?`${TIERS[v.tier].color}[${TIERS[v.tier].label}]§r `:'')+nameOf(v.id)+(v.near?'§e（期限間近）':''),sub:`${v.count}個　1個 ${money(v.price)}`,icon:itemIcon(v.id,BOOK_ICON+'chest')})):[{title:'売れる物がありません',sub:'名前付き・傷あり・期限切れは買い取れません',icon:BOOK_ICON+'chest'}];
   return {left:'よろず屋',right:'買取',tabs:[{label:'買う'},{label:'売る'}],summary:`所持金 ${money(p.coins)}`,rows,
    detail:x?{icon:itemIcon(x.id,BOOK_ICON+'chest'),title:rankName(x),state:`買取 1個 ${money(x.price)}`,text:`ランク${TIERS[x.tier].label}の買取価格です（ランクが高いほど高く売れます）。`+(x.near?'\n期限間近なので少し安くなります。':''),
     infoLabel:'全部売ると',infoValue:money(x.price*x.count),infoIcon:BOOK_ICON+'coins'}:{},
    actions:x?[card('1個売る',true,BOOK_ICON+'coins'),card(`全部売る（${x.count}個）`,true,BOOK_ICON+'coins')]:[],wide:x?{label:'個数を指定して売る',enabled:true}:undefined};
  }
  const id=TRADER_GOODS[state.sel]??TRADER_GOODS[0],each=buyPrice(id);
  return {left:'よろず屋',right:'商品',tabs:[{label:'買う'},{label:'売る'}],summary:`所持金 ${money(p.coins)}`,
   rows:TRADER_GOODS.map(g=>({title:nameOf(g),sub:money(buyPrice(g)),icon:itemIcon(g,BOOK_ICON+'chest')})),
   detail:{icon:itemIcon(id,BOOK_ICON+'chest'),title:nameOf(id),state:'単価 '+money(each),text:`ふつうの値段 ${money(normalPrice(id))} の1.5倍です。\n手帳のショップにある物は、そちらの方が安く買えます。`,infoLabel:'所持金',infoValue:money(p.coins),infoIcon:BOOK_ICON+'coins',info2:`10個で ${money(each*10)}`},
   actions:[card('1個買う',p.coins>=each,BOOK_ICON+'chest'),card('10個買う',p.coins>=each*10,BOOK_ICON+'chest')],wide:{label:'個数を指定して買う',enabled:p.coins>=each}};
 },
 async act(player,{player:p},state,which){
  if(state.tab===1){
   const x=sellList(player)[state.sel];if(!x)return;
   // at most TRADER.maxCount at a time, and the confirmation says so (it showed the whole count before)
   const most=Math.min(x.count,TRADER.maxCount),n=which===0?1:which===1?most:await ask(player,rankName(x)+'を売る',most,x.price);if(!n)return;
   if(n>1&&!await confirmDialog(player,'売却の確認',`${rankName(x)} ×${n}\n受け取り ${money(x.price*n)}`,{ok:'売る'}))return;
   let msg;try{msg='§a'+sellGroupHere(player,x,n);refreshGame(player);}catch(e){msg='§c'+(e.message??e);}
   await noticeDialog(player,'よろず屋',msg,{close:'戻る'});return;
  }
  const id=TRADER_GOODS[state.sel],each=buyPrice(id);
  const n=which===0?1:which===1?10:await ask(player,nameOf(id)+'を買う',TRADER.maxCount,each);if(!n)return;
  if(!await confirmDialog(player,'購入の確認',`${nameOf(id)} ×${n}\n合計 ${money(each*n)}（所持金 ${money(p.coins)}）\n持ち物に空きが必要です。`,{ok:'購入する'}))return;
  await openGameFeature(player,'trader.buy',{item:id,count:n});
 }};
/** Opens the merchant's screen on 買う (0) or 売る (1). */
export function openTrader(player,tab=0){startTab.set(player.id,tab);return runList(player,traderModel);}
