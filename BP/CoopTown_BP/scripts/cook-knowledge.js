import {ItemStack} from '@minecraft/server';
import {typesOf,ingredientName} from './workbench-config.js';
import {titleTrack,titleSeen} from './job-count.js';

// Cooking recipes are learned (asked 2026-10-30): the campfire's and the smoker's recipes with a 料理人 level
// (food-catalog.js) start unknown, except the simple ones (STARTER: Lv.1 and at most two ingredients). Reaching the
// level makes a recipe researchable: the screen shows it as ？？？ with its main ingredient and how many there are,
// and 研究する asks for the others. The right set teaches it and gives a recipe scroll (COOK_SCROLL) that can be handed
// to another player; a wrong one uses the chosen ingredients (one each) and says how many were right. Recipes without
// a level (the game's own dishes, the first CoopTown dishes) are always known. A cook who had cooked before this came
// in keeps everything their level could already make (migrate, once).
export const KNOWN_KEY='cooptown:cook_known',INIT_KEY='cooptown:cook_known_init';
export const COOK_SCROLL='cooptown:cook_recipe',SCROLL_RECIPE='cooptown:cook_recipe_id',SCROLL_AUTHOR='cooptown:cook_recipe_by';
/** A recipe's ingredients ([[type, count]]): the campfire's inputs, or the smoker's raw food and extras. */
export const inputsOf=r=>r.inputs??[[r.raw,r.rawPer??1],...(r.extra??[])];
export const recipeKey=r=>r.output[0];
/** Known from the start: no level, or Lv.1 with at most two ingredients. */
export const isStarter=r=>!r.level||(r.level<=1&&inputsOf(r).length<=2);
function readKnown(player){try{const v=JSON.parse(player.getDynamicProperty(KNOWN_KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}}
const saveKnown=(player,list)=>{try{player.setDynamicProperty(KNOWN_KEY,JSON.stringify([...new Set(list)]));}catch{}};
/** Once: a player who has cooked before keeps what their level could already make (recipes: every learnable one). */
export function migrateKnown(player,p,recipes){
 try{if(player.getDynamicProperty(INIT_KEY))return;player.setDynamicProperty(INIT_KEY,true);}catch{return;}
 if(!((p?.tally?.['j:cook']??0)>0||(p?.tally?.smoked??0)>0))return;
 const lv=p?.craft?.level??1;
 const kept=recipes.filter(r=>!isStarter(r)&&(r.level??1)<=lv).map(recipeKey),before=readKnown(player);
 saveKnown(player,[...before,...kept]);const added=new Set(kept.filter(k=>!before.includes(k))).size;if(added)titleTrack(player,'cook_learned',added);
}
/** Whether a player knows a recipe. */
export const knows=(player,r)=>isStarter(r)||readKnown(player).includes(recipeKey(r));
/** Learns a recipe; true when it was new. */
export function learn(player,r){
 const list=readKnown(player),k=recipeKey(r);if(isStarter(r)||list.includes(k))return false;
 list.push(k);saveKnown(player,list);titleTrack(player,'cook_learned');return true;
}
/** The research hint: the main ingredient's name and how many ingredients there are. */
export const hintOf=(r,itemName)=>({main:ingredientName(inputsOf(r)[0][0],itemName),count:inputsOf(r).length});
/** How many of the chosen item ids match the recipe's ingredients other than the main one (each used once). */
export function matchCount(r,chosen){
 const rest=inputsOf(r).slice(1).map(([t])=>typesOf(t));let n=0;const left=[...chosen];
 for(const ids of rest){const i=left.findIndex(id=>ids.includes(id));if(i>=0){n++;left.splice(i,1);}}
 return n;
}
/** A scroll that teaches recipe r, written by player. */
export function scrollFor(r,player){
 const s=new ItemStack(COOK_SCROLL,1);
 try{s.setDynamicProperty(SCROLL_RECIPE,recipeKey(r));s.setDynamicProperty(SCROLL_AUTHOR,player.id);s.setLore([`§e${r.name}`,'§7使うと、このレシピを覚えます']);}catch{}
 return s;
}
/** Using a scroll (main.js custom component cooptown:learn_cook): learns its recipe if the player's level allows. */
export function learnCookScroll(player,recipes,level){
 const c=player.getComponent('minecraft:inventory')?.container,slot=player.selectedSlotIndex,item=c?.getItem(slot);
 if(item?.typeId!==COOK_SCROLL)return;
 const key=item.getDynamicProperty(SCROLL_RECIPE),r=recipes.find(x=>recipeKey(x)===key);
 if(!r){player.sendMessage('§cこのレシピは読めません。');return;}
 if((r.level??1)>level){player.sendMessage(`§e${r.name}は料理人 Lv.${r.level}になると覚えられます。`);return;}
 if(!learn(player,r)){player.sendMessage(`§e${r.name}はもう覚えています。`);return;}
 c.setItem(slot,undefined);
 // the writer's title レシピ本出版 (someone else learned from their scroll)
 const by=item.getDynamicProperty(SCROLL_AUTHOR);
 if(typeof by==='string'&&by!==player.id){try{const w=player.dimension.getPlayers().find(x=>x.id===by)??null;if(w)titleSeen(w,'cook_scroll_readers',player.id);}catch{}}
 try{player.playSound('random.levelup',{pitch:1.3,volume:.5});}catch{}
 player.sendMessage(`§a${r.name}のレシピを覚えました。`);
}
/** Research: chosen = the other ingredients' item ids. {ok, right} (right: how many of them were right). */
export function research(player,r,chosen){
 const need=inputsOf(r).length-1,right=matchCount(r,chosen);
 const ok=right===need&&chosen.length===need;
 titleTrack(player,'cook_research');
 if(ok){learn(player,r);titleTrack(player,'cook_found');}
 return {ok,right,need};
}
