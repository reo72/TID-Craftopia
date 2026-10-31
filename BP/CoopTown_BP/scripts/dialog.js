// Notebook-style dialog (RP: ui/cooptown_dialog.json, built by tools/build-dialog-ui.mjs) used for every
// confirmation, choice and notice instead of the game's standard form.
// The title travels as the first button ("d:t|..."); the others are "d:ok|" (green), "d:btn|" (beige)
// or "d:no|" (brown) + text. Up to 6 buttons use the compact card, more get a scrolling list.
import {system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';

const SMALL_MAX=6;
/** buttons: [{text, style:'ok'|'btn'|'no'}]. Resolves to the chosen index, or undefined when closed. */
export async function dialog(player,{title,body='',buttons}){
 const form=new ActionFormData().title(buttons.length>SMALL_MAX?'ct:dialog_list':'ct:dialog').body(String(body));
 form.button('d:t|'+String(title));
 for(const b of buttons)form.button(`d:${['ok','no'].includes(b.style)?b.style:'btn'}|${b.text}`);
 for(let busy=0;;busy++){
  const r=await form.show(player);
  if(r.canceled){
   if(r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(resolve=>system.runTimeout(resolve,10));continue;}
   return undefined;
  }
  const i=r.selection-1;return i>=0&&i<buttons.length?i:undefined;
 }
}
/** 実行する / キャンセル. True only for 実行する. */
export async function confirmDialog(player,title,body,{ok='実行する',cancel='キャンセル'}={}){
 return await dialog(player,{title,body,buttons:[{text:ok,style:'ok'},{text:cancel,style:'no'}]})===0;
}
/** A list of choices plus 戻る. Resolves to the index of the choice, undefined for 戻る / closed. */
export async function chooseDialog(player,title,body,labels,{back='戻る'}={}){
 const i=await dialog(player,{title,body,buttons:[...labels.map(text=>({text,style:'btn'})),{text:back,style:'no'}]});
 return i===undefined||i===labels.length?undefined:i;
}
/** A message with one button. True when the button was pressed, false when the dialog was closed. */
export async function noticeDialog(player,title,body,{close='閉じる'}={}){
 return await dialog(player,{title,body,buttons:[{text:close,style:'ok'}]})===0;
}
