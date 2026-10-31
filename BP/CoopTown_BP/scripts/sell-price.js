import {SELL_PRICES,setSellPriceHook} from './npc-sell.js';
import {qualityOf,TIERS} from './quality.js';
import {stateOf,NEAR,EXPIRED} from './freshness.js';
import {NEAR_PRICE} from './food-config.js';
import {sellPrice,buyPrice} from './trader-config.js';
import {SHOP_ITEMS} from './shop-config.js';
import {BUY_BONUS,NPC_JOBS} from './npc-jobs.js';

// What an item sells for (asked 2026-10-28: a price for each item and rank, used by the selling NPCs and shown in the
// description). One table for everyone who buys: the town buyer (the book's 買取), the job villagers (BUY_BONUS more
// for their own kind) and the よろず屋 (anything with a price). Per item and rank (D C B A S): staff's own price
// (admin screen 経済 → 買取価格; saved in db.settings.sellPrices {id: [D, C, B, A, S]}, 0 = not set), else the default:
// the town's price (npc-sell.js SELL_PRICES), or a third of the normal price (trader-config.js), times the rank's
// TIERS price. 期限間近 food sells for NEAR_PRICE of it; expired food and named / enchanted / worn items are not bought.
let overrides=()=>({});
/** game-runtime.js hands over where staff's prices are kept. */
export const setPriceOverrides=fn=>{overrides=fn;};
const JOB_BUYS=new Set(Object.values(NPC_JOBS).flatMap(j=>[...j.buys]));
// No buyer pays as much as the cheapest price the item can be bought for anywhere (the book's shop, a job villager's
// stock, the よろず屋), so buying and selling back never makes coins (2026-10-30: a fishing rod bought from a villager for
// 40 sold to the town for 100). Only plain items (rank D, tier 0: what is bought); staff's own prices are not capped.
const SHOP_BUY=Object.fromEntries(SHOP_ITEMS.map(v=>[v.item,v.price]));
const STOCK_BUY={};for(const j of Object.values(NPC_JOBS))for(const s of j.stock)STOCK_BUY[s.item]=Math.min(STOCK_BUY[s.item]??Infinity,s.price);
/** The cheapest price of one anywhere, or Infinity when it cannot be bought. */
export function cheapestBuy(id){return Math.min(...[SHOP_BUY[id],STOCK_BUY[id],buyPrice(id)].filter(v=>v>0),Infinity);}
/** A buyer's price for one of a rank, held under the cheapest purchase (at least 1). */
export const capResale=(id,p,tier=0)=>{const c=cheapestBuy(id);return tier>0||c===Infinity?p:Math.max(1,Math.min(p,Math.ceil(c)-1));};
export const RANK_COUNT=TIERS.length;
/** The default price of one, by rank (no staff price), or 0. */
export function defaultPrice(id,tier=0){
 const base=SELL_PRICES[id]?.[0]??sellPrice(id);if(!(base>0))return 0;
 return Math.max(1,Math.round(base*(TIERS[tier]?.price??1)));
}
/** The price of one of an item by rank (near: 期限間近), or 0 when nobody buys it. */
export function priceOf(id,tier=0,near=false){
 let own;try{own=overrides()?.[id]?.[tier];}catch{}
 const p=own>0?own:defaultPrice(id,tier);if(!(p>0))return 0;
 const each=Math.max(1,Math.round(p*(near?NEAR_PRICE:1)));
 return own>0?each:capResale(id,each,tier);
}
setSellPriceHook((id,tier,near)=>priceOf(id,tier,near)); // the town buyer and job villagers use this table too
/** Whether a stack can be sold at all (not expired, not named, enchanted or worn). */
export function sellable(item){
 try{if(item.nameTag)return false;}catch{}
 try{const en=item.getComponent('minecraft:enchantable');if(en&&en.getEnchantments().length&&item.typeId!=='minecraft:enchanted_book')return false;}catch{}
 try{const d=item.getComponent('minecraft:durability');if(d&&d.damage>0)return false;}catch{}
 try{if(stateOf(item)===EXPIRED)return false;}catch{}
 return true;
}
/** {each, villager, where} for one of a stack, or undefined when nobody buys it. */
export function sellInfo(item){
 const id=item?.typeId;if(!id||!sellable(item))return undefined;
 let tier=0,near=false;try{tier=qualityOf(item);near=stateOf(item)===NEAR;}catch{}
 const each=priceOf(id,tier,near);if(!(each>0))return undefined;
 const town=!!SELL_PRICES[id];
 return {each,where:town?'town':'trader',villager:JOB_BUYS.has(id)?capResale(id,Math.max(1,Math.round(each*BUY_BONUS)),tier):0};
}
/** The lore line (without a mark), or '' when it does not sell. */
export function priceText(item){
 const s=sellInfo(item);if(!s)return '';
 return `§6売値 ${s.each}コイン`+(s.villager?`§7（村人 ${s.villager}）`:s.where==='trader'?'§7（よろず屋）':'');
}
/** What the よろず屋 buys from a container, by item, rank and freshness: [{key, id, tier, near, count, price, skill}]. */
export function merchantGroups(container){
 const groups=new Map();
 for(let i=0;container&&i<container.size;i++){
  const s=container.getItem(i);if(!s||!sellable(s))continue;
  let tier=0,near=false;try{tier=qualityOf(s);near=stateOf(s)===NEAR;}catch{}
  const price=priceOf(s.typeId,tier,near);if(!(price>0))continue;
  const key=s.typeId+'|'+tier+(near?'|near':'');
  const g=groups.get(key)??{key,id:s.typeId,tier,near,count:0,price,skill:SELL_PRICES[s.typeId]?.[1]};
  g.count+=s.amount;groups.set(key,g);
 }
 return [...groups.values()].sort((a,b)=>b.price*b.count-a.price*a.count);
}
