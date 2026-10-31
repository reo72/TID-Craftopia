// The feeding station's screens (RP tools/build-ranch-ui.mjs, ui/cooptown_ranch.json): each is an ActionForm whose title
// picks the screen and whose buttons, in a fixed order, fill it. Marks in a button's text pick how it looks.
import {system} from '@minecraft/server';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';

export const RANCH_TITLES={main:'ct:ranch',list:'ct:ranch_list',feed:'ct:ranch_feed',dlg:'ct:ranch_dlg'};
export const animalIcon=type=>'textures/cooptown/ranch/animals/'+String(type).replace('minecraft:','');
const off=on=>on?'':'[off]';

/** Main screen: 0-4 stats, 5-8 actions (greyed when there is nothing to do), 9 close. */
export function mainButtons({count,max,near,ready,births,cared,loose}){
 return [`${count} / ${max}`,`${near}頭`,`${ready}頭`,`${births}頭`,`${cared}回`,
  off(loose)+`近くの動物を登録\n（${loose}頭）`,'牧場の一覧',off(ready)+`世話をする\n（${ready}頭）`,'飼料を作って与える','閉じる'].map(t=>[t]);
}
export const LIST_ROWS_AT=5,FEED_AT=2,FEED_SLOTS=5;
/** The feed whose choose button a feed-screen selection is, or undefined. */
export const feedAt=selection=>selection>=FEED_AT&&(selection-FEED_AT)%FEED_SLOTS===FEED_SLOTS-1?(selection-FEED_AT-(FEED_SLOTS-1))/FEED_SLOTS:undefined;
/** List / register screen. rows: [{name, age, icon, hp, status}] (status already marked, see listStatus). */
export function listButtons({title,count,back='戻る',right='閉じる',empty='',rows}){
 const b=[[title],[count],[back],[right],[rows.length?'':empty]];
 for(const r of rows)b.push([`r|${r.name}\n${r.age}`,r.icon],[`h|${r.hp}`],[`s|${r.status}`]);
 return b;
}
/** The row a list selection points at, or undefined (header buttons). */
export const listRowAt=selection=>selection>=LIST_ROWS_AT&&(selection-LIST_ROWS_AT)%3===0?(selection-LIST_ROWS_AT)/3:undefined;
/** Status column text: can be cared for, or the time left; [bonus] while the care bonus lasts. */
export function listStatus({ready,left,bonus}){
 return (ready?'[ok]世話できる':`[wait]次の世話まで\n${left}`)+(bonus?'[bonus]':'');
}
/** Feed screen: 0 back, 1 close, per feed: name, material names, have / need (red when short), effect, choose. */
export function feedButtons(feeds){
 const b=[['戻る'],['閉じる']];
 for(const f of feeds){
  const ok=f.inputs.every(i=>i.have>=i.need);
  b.push([f.name],[f.inputs.map(i=>i.name).join('\n')],[f.inputs.map(i=>`${i.have>=i.need?'§a':'§c'}${i.have}§r / ${i.need}`).join('\n')],[f.effect],[ok?'選ぶ':'[off]材料が足りません']);
 }
 return b;
}
/** Dialog: title, picture + message, note box (optional), green button, grey button (optional). */
export function dlgButtons({title,pic='success',text,note='',ok='閉じる',cancel=''}){
 return [[title],[`[p_${pic}]`+text],[note],[(cancel?'':'[solo]')+ok],[cancel]];
}
/** Shows a screen (a RANCH_TITLES key); resolves to the pressed button index, undefined when closed. Retries while the player is busy. */
export async function showRanch(player,screen,buttons){
 const form=new ActionFormData().title(RANCH_TITLES[screen]).body('');for(const [t,icon] of buttons)form.button(t,icon);
 for(let busy=0;;busy++){
  const r=await form.show(player);
  if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy<3){await new Promise(res=>system.runTimeout(res,10));continue;}return undefined;}
  return r.selection;
 }
}
/** A dialog; true when the green button was pressed. */
export async function ranchDialog(player,opts){return await showRanch(player,'dlg',dlgButtons(opts))===3;}
