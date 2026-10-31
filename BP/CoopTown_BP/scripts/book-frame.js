import {system} from '@minecraft/server';
import {FOOD_CATALOG} from './food-catalog.js';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {ITEM_ICONS} from './item-icons.js';
import {pageSound} from './prefs.js';

// New book menu (RP: tools/build-book-ui.mjs). A page is an ActionForm titled "ct:book:<page>" whose buttons
// come in a fixed order: the frame's bookmarks first (BOOK_TABS, slots 0-3), then the page's own buttons.
export const BOOK_TABS=[['tab_home','ホーム'],['tab_profile','マイプロフィール'],['tab_settings','設定'],['close','閉じる']];
// what each bookmark leads to (a page returns this to openBook)
export const TAB_TARGET=['home','profile','settings','close'];
export const BOOK_ICON='textures/cooptown/book/icons/',OLD_ICON='textures/cooptown/icons/';
/** An item's icon picture (the HUD log icons), or fallback. */
const CATALOG_IDS=new Set(FOOD_CATALOG.map(e=>e.id)); // the food catalogue's pictures (textures/cooptown/food)
export const itemIcon=(id,fallback=OLD_ICON+'unknown')=>ITEM_ICONS[id]?'textures/cooptown/items/'+ITEM_ICONS[id]:CATALOG_IDS.has(id)?'textures/cooptown/food/'+id.slice(9):fallback;
export const comma=v=>String(Math.max(0,Math.floor(Number(v)||0))).replace(/\B(?=(\d{3})+(?!\d))/g,',');
/** 0..1 -> the 5 % step a bar shows (0, 5, ... 100). */
export const step=r=>Math.min(20,Math.max(0,Math.floor(20*(Number(r)||0))))*5;

// bars compare the whole text ("ct:d_rb|35"), so they get no formatting code
const EXACT=/^ct:(d_qbar|d_rb|d_xpbar|d_qb|d_br|d_jbr|d_cxb|d_vb)\|/;
/** "ct:x|0 G" -> "ct:x|§r0 G": a value that starts with a digit is turned into a number by the UI's string
 *  subtraction (and then not shown); a formatting code in front keeps it text. */
// typographic marks the pixel font lacks become plain ones (2026-10-30: the titles list closed on the page with
// 「I can’t fly.」; ’ is the likely cause)
const PLAIN={'’':"'",'‘':"'",'“':'"','”':'"','→':'＞','←':'＜'};
export const keepText=text=>EXACT.test(text)?text:String(text).replace(/[’‘“”→←]/g,c=>PLAIN[c]).replace(/^(ct:[^|]*\|)(?=.)/,'$1§r');
/** A book page form: the frame's bookmarks, then buttons [[text, icon], ...]. */
export function bookForm(page,buttons=[]){
 const form=new ActionFormData().title('ct:book:'+page).body('');
 for(const [id,label] of BOOK_TABS)form.button(`ct:${id}|${label}`);
 for(const [text,icon] of buttons)form.button(keepText(text),icon);
 return form;
}
const shownPage=new Map();
/** Shows a book page; resolves to the pressed button's index, or undefined when the book was closed. A page-turn
 *  sound plays when the page changes: another page, or another key (pages sharing one layout pass what they show,
 *  e.g. the list page's feature, tab and first row). */
export async function showPage(player,page,buttons,key=page){
 if(shownPage.get(player.id)!==key){shownPage.set(player.id,key);pageSound(player);}
 for(let busy=0;;){
  const r=await bookForm(page,buttons).show(player);
  if(!r.canceled)return r.selection;
  if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(res=>system.runTimeout(res,10));continue;}
  shownPage.delete(player.id);
  return undefined;
 }
}

// jobs: icon picture name (textures/cooptown/book/icons/), the skill each grows (fishing grows gathering)
// 冒険家: the compass (鉱夫 has the miner picture, 木こり the logger one since 2026-10-30)
export const JOB_ICON={'冒険家':'compass','鉱夫':'miner','木こり':'logger','農家':'farmer','鍛冶師':'blacksmith','料理人':'cook','付与術師':'enchanter','釣り師':'fisher','調合師':'alchemist'};
export const JOB_SKILL={'冒険家':'gather','鉱夫':'mine','木こり':'gather','農家':'gather','鍛冶師':'craft','料理人':'craft','付与術師':'craft','釣り師':'gather','調合師':'craft'};
export const SKILL_NAME={gather:'採取',mine:'採掘',craft:'クラフト',fish:'釣り'};
