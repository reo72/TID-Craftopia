import {SHOP_ITEMS} from './shop-config.js';
import {NPC_JOBS} from './npc-jobs.js';
import {SELL_PRICES} from './npc-sell.js';
import {itemValue,TRADE_ITEMS,ITEM_NAMES} from './game-config.js';

// The 商人 (よろず屋) NPC's trade (asked 2026-10-27): anything with a normal price can be bought for 1.5 times it and
// sold for a third of it. Normal price: the server shop's price, else a job villager's, else the town buyer's, else
// the item's material value (game-config.js itemValue, from its recipe).
export const TRADER={buy:1.5,sell:1/3,maxCount:576};
const SHOP_PRICE=Object.fromEntries(SHOP_ITEMS.map(v=>[v.item,v.price]));
const STOCK_PRICE=Object.fromEntries(Object.values(NPC_JOBS).flatMap(j=>j.stock.map(s=>[s.item,s.price])));
/** The normal price of one (a whole number, at least 1), or 0 when it is not traded. */
export function normalPrice(id){
 if(typeof id!=='string'||!/^[a-z0-9_]+:[a-z0-9_]+$/.test(id))return 0;
 const v=SHOP_PRICE[id]??STOCK_PRICE[id]??SELL_PRICES[id]?.[0]??(ITEM_NAMES[id]?itemValue(id):0);
 return v>0?Math.max(1,Math.round(v)):0;
}
export const buyPrice=id=>{const v=normalPrice(id);return v?Math.ceil(v*TRADER.buy):0;};
export const sellPrice=id=>Math.floor(normalPrice(id)*TRADER.sell);
/** What the merchant sells: the shop's, the job villagers' and the tradable materials, by name. */
export const TRADER_GOODS=[...new Set([...SHOP_ITEMS.map(v=>v.item),...Object.keys(STOCK_PRICE),...TRADE_ITEMS])]
 .filter(id=>buyPrice(id)>0&&!id.startsWith('cooptown:guidebook')).sort((a,b)=>String(ITEM_NAMES[a]??a).localeCompare(String(ITEM_NAMES[b]??b),'ja'));
