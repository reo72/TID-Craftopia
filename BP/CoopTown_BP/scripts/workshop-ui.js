import {system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {keepDigits} from './form-text.js';
import {qualityOf} from './quality.js';
import {SORTED} from './workshop-config.js';

// Shared parts of the grindstone (ct:grind) and the stonecutter (ct:saw) screens. Button order: must match the RP's
// tools/job-block-ui.mjs (a slot per button, hidden while its text is empty). Marks: [on] chosen tab / amount, [sel]
// chosen entry, [ng] not enough, [off] disabled.
export const PAGE_SIZE=12;
/** Button indexes for a screen with `tabs` tabs. */
export function workshopLayout(tabs){
 const L={tab:0,close:tabs};let i=tabs+1;
 for(const [k,n] of [['back',1],['prev',1],['next',1],['slot',PAGE_SIZE],['amount',3],['action',1],['page',1],['icon',1],['name',1],['state',1],['row',2],['rowCount',2],['info',1],['sub',1]]){L[k]=i;i+=n;}
 L.count=i;return L;
}
/** A list page: {pages, shown} (state.page is clamped). */
export function pageOf(list,state){
 const pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));state.page=Math.max(0,Math.min(state.page,pages-1));
 return {pages,shown:list.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE)};
}
const sortedLine=s=>{try{return (s.getLore?.()??[]).includes(SORTED);}catch{return false;}};
/** A plain item: rank D and not sorted yet (the ore the grindstone sorts). */
export const plainItem=s=>qualityOf(s)===0&&!sortedLine(s);
/** How many of these ids the container holds (only those passing `ok`). */
export function countIds(container,ids,ok=()=>true){
 let n=0;for(let i=0;container&&i<container.size;i++){const s=container.getItem(i);if(s&&ids.includes(s.typeId)&&ok(s))n+=s.amount;}return n;
}
/** Takes n of these ids (only those passing `ok`); tiers (optional) collects the rank of each one taken. */
export function takeIds(container,ids,n,ok=()=>true,tiers){
 for(let i=0;i<container.size&&n>0;i++){const s=container.getItem(i);if(!s||!ids.includes(s.typeId)||!ok(s))continue;
  const used=Math.min(n,s.amount);n-=used;if(tiers){const q=qualityOf(s);for(let k=0;k<used;k++)tiers.push(q);}
  if(s.amount===used)container.setItem(i,undefined);else{s.amount-=used;container.setItem(i,s);}}
}
/** Puts a stack into the inventory; what does not fit drops at the player. */
export function giveStack(player,container,stack){
 const left=container.addItem(stack);if(left)try{player.dimension.spawnItem(left,player.location);}catch{}
}
/** Shows the screen until it is closed: render(state) gives {buttons: [[text, icon]], ...view}; press(i, view, state)
 *  handles a button (may be async) and returns true to close. */
export async function runWorkshop(player,name,L,state,{render,press,label}){
 let wait=0;
 try{
  while(true){
   const view=render(state),form=new ActionFormData().title('ct:'+name).body('');
   if(view.buttons.length!==L.count)throw new Error(`button count ${view.buttons.length} != ${L.count}`);
   for(const [text,icon] of view.buttons)form.button(keepDigits(text),icon);
   const result=await form.show(player);
   if(result.canceled){if(result.cancelationReason===FormCancelationReason.UserBusy&&wait++<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}return;}
   wait=0;const i=result.selection;
   if(i===L.close||i===L.back)return;
   if(i>=L.tab&&i<L.close){state.tab=i-L.tab;state.page=0;state.sel=undefined;state.amount=0;}
   else if(i===L.prev)state.page=Math.max(0,state.page-1);
   else if(i===L.next)state.page++;
   else if(i>=L.slot&&i<L.slot+PAGE_SIZE){const v=view.shown[i-L.slot];if(v!==undefined)state.sel=v;}
   else if(i>=L.amount&&i<L.amount+3)state.amount=i-L.amount;
   else if(i===L.action&&await press(view,state))return;
  }
 }catch(e){console.warn(`[CoopTown] ${label}: `+e);try{player.sendMessage(`§c${label}を開けませんでした。`);}catch{}}
}
