import {SHELF,NEAR_SHARE,BUCKET_HOURS} from './food-config.js';

// Food dates (Notion「食べ物・ポーション」): a food gets its date the first time a player holds it (or when it is cooked),
// as one lore line with the date in Japan time: 期限 (fresh), 期限間近 (the last quarter: still fine, sells for less),
// 期限切れ (cannot be eaten, cooked or sold as food; it stays in the inventory and can be composted). The date is a
// fixed time, so it keeps running while the owner is away, and moving or trading the food never resets it. Dates are
// rounded down to BUCKET_HOURS so foods picked up close together still stack (rounding never adds time).
const HOUR=3600000,JST=9*HOUR;
export const FRESH=0,NEAR=1,EXPIRED=2;
const PREFIX=['§7期限 ','§e期限間近 ','§c期限切れ '];
const isDateLine=l=>/期限/.test(l)&&/\d+\/\d+ \d+時/.test(l);
export function dateText(ms){const d=new Date(ms+JST);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${d.getUTCHours()}時`;}
/** The date written on a food (ms), or undefined. now picks the year (dates are within months of now). */
export function dateOf(item,now=Date.now()){
 let lore=[];try{lore=item?.getLore?.()??[];}catch{}
 const m=lore.map(l=>/(\d+)\/(\d+) (\d+)時/.exec(isDateLine(l)?l:'')).find(Boolean);if(!m)return undefined;
 const y=new Date(now+JST).getUTCFullYear();
 return [y-1,y,y+1].map(yy=>Date.UTC(yy,+m[1]-1,+m[2],+m[3])-JST).sort((a,b)=>Math.abs(a-now)-Math.abs(b-now))[0];
}
export const shelfHours=id=>SHELF[id];
/** A lore with its date moved ms later (the bags that keep food, backpack-runtime.js); dates already past at `since`
 *  stay as they are. refresh() fixes the label when the item is next checked. */
export function shiftLore(lore,ms,since,now=Date.now()){
 const i=(lore??[]).findIndex(isDateLine);if(i<0||!ms)return lore; // ms < 0: earlier (/cooptown:debug)
 const m=/(\d+)\/(\d+) (\d+)時/.exec(lore[i]),y=new Date(now+JST).getUTCFullYear();
 const date=[y-1,y,y+1].map(yy=>Date.UTC(yy,+m[1]-1,+m[2],+m[3])-JST).sort((a,b)=>Math.abs(a-now)-Math.abs(b-now))[0];
 if(date<=since)return lore;
 const out=[...lore];out[i]=lore[i].replace(/\d+\/\d+ \d+時/,dateText(date+ms));return out;
}
/** fresh / near / expired for a date and the food's shelf life. */
export function stateAt(date,hours,now=Date.now()){
 if(now>=date)return EXPIRED;
 return date-now<=hours*HOUR*NEAR_SHARE?NEAR:FRESH;
}
/** The share of its shelf life a food has left (0-1); foods without a date or shelf life count as 1. */
export function leftShare(item,now=Date.now()){
 const h=SHELF[item?.typeId],d=h&&dateOf(item,now);if(!h||d===undefined)return 1;
 return Math.max(0,Math.min(1,(d-now)/(h*HOUR)));
}
export function stateOf(item,now=Date.now()){
 const h=SHELF[item?.typeId],d=h&&dateOf(item,now);return h&&d!==undefined?stateAt(d,h,now):FRESH;
}
export const isExpired=(item,now=Date.now())=>stateOf(item,now)===EXPIRED;
const writeLine=(item,date,state)=>{
 let lore=[];try{lore=(item.getLore?.()??[]).filter(l=>!isDateLine(l));}catch{}
 try{item.setLore([...lore,PREFIX[state]+dateText(date)+(state===EXPIRED?'':'まで')]);}catch{}
};
/** Writes a new food's date: now + shelf life x share (cooked food: the freshest share its ingredients had left). */
export function stamp(item,now=Date.now(),share=1){
 const h=SHELF[item?.typeId];if(!h)return item;
 const date=Math.floor((now+h*HOUR*Math.max(0,Math.min(1,share)))/(BUCKET_HOURS*HOUR))*BUCKET_HOURS*HOUR;
 writeLine(item,date,stateAt(date,h,now));return item;
}
/** Keeps a food's line up to date: dates a food that has none, and changes the label when it gets near / expires.
 *  Returns true when the item changed (the caller puts it back). */
export function refresh(item,now=Date.now()){
 const h=SHELF[item?.typeId];if(!h)return false;
 const d=dateOf(item,now);
 if(d===undefined){stamp(item,now);return true;}
 const state=stateAt(d,h,now);let lore=[];try{lore=item.getLore()??[];}catch{}
 if(lore.some(l=>isDateLine(l)&&l.startsWith(PREFIX[state])))return false;
 writeLine(item,d,state);return true;
}
