// Foods (Notion「食べ物・ポーション」): shelf life (real hours from when the food is first held), and what eating gives:
// H = hunger points (vanilla foods keep their own), S = stress recovery, kind = the dish's role (soup / main / sweet /
// keep), which picks the extra effect of the better qualities. Foods not listed have no shelf life (special foods such
// as golden apples, potions, and anything not decided yet: nothing gets a short life by default).
import {FOOD_CATALOG} from './food-catalog.js';
import {FISH_SPECIES} from './fish-species.js';
import {byRank,RANK_POS} from './quality.js';
const M=id=>'minecraft:'+id,C=id=>'cooptown:'+id;
const list=(ids,hours)=>ids.map(id=>[M(id),hours]);
export const SHELF=Object.fromEntries([
 ...list(['beef','porkchop','chicken','mutton','rabbit','cod','salmon','tropical_fish','pufferfish','milk_bucket'],48),
 ...FISH_SPECIES.map(s=>[s.id,48]), // the 100 fishing fish keep like raw fish
 // more raw foods and ingredients: mushrooms, kelp, chorus fruit, pumpkins and melons
 ...list(['brown_mushroom','red_mushroom','kelp'],96),...list(['chorus_fruit'],120),
 ...list(['pumpkin','melon_block'],240),...list(['dried_kelp'],72),...list(['suspicious_stew'],48),
 ...list(['egg'],96),
 ...list(['wheat','carrot','potato','beetroot','apple','melon_slice','sweet_berries','glow_berries','bread','baked_potato'],120),
 ...list(['cooked_beef','cooked_porkchop','cooked_chicken','cooked_mutton','cooked_rabbit','cooked_cod','cooked_salmon'],72),
 ...list(['mushroom_stew','beetroot_soup','rabbit_stew'],48),
 ...list(['cookie','pumpkin_pie'],96),
 ...list(['honey_bottle'],720),
 [C('veg_soup'),48],[C('meat_stew'),48],[C('fish_set'),72],[C('fruit_tart'),72],
 [C('smoked_meat'),168],[C('smoked_fish'),168],[C('dried_meat'),336],[C('dried_fish'),336],[C('jar_preserve'),720],
 // the food catalogue (food-catalog.js): every food, drink and material with a shelf life (0 = none: salt, the cup)
 ...FOOD_CATALOG.filter(e=>e.hours>0).map(e=>[e.id,e.hours])]);
export const NEAR_SHARE=.25;      // the last quarter of the shelf life is 期限間近
export const NEAR_PRICE=.8;       // what the town pays for a food near its date
export const BUCKET_HOURS=3;      // dates are rounded down to 3 hours, so foods picked up close together still stack
// eating: [S, kind]; vanilla foods keep their own hunger points (H) and effects
export const FOOD={
 [M('bread')]:[2,'main'],[M('baked_potato')]:[2,'main'],[M('cooked_beef')]:[2,'main'],[M('cooked_porkchop')]:[2,'main'],[M('cooked_chicken')]:[2,'main'],
 [M('cooked_mutton')]:[2,'main'],[M('cooked_rabbit')]:[2,'main'],[M('cooked_cod')]:[2,'main'],[M('cooked_salmon')]:[2,'main'],
 [M('mushroom_stew')]:[3,'soup'],[M('beetroot_soup')]:[3,'soup'],[M('rabbit_stew')]:[4,'soup'],
 [M('cookie')]:[3,'sweet'],[M('pumpkin_pie')]:[6,'sweet'],[M('honey_bottle')]:[2,'sweet'],[M('apple')]:[1,'sweet'],[M('sweet_berries')]:[1,'sweet'],
 [C('veg_soup')]:[4,'soup'],[C('meat_stew')]:[3,'soup'],[C('fish_set')]:[3,'main'],[C('fruit_tart')]:[8,'sweet'],
 [C('smoked_meat')]:[1,'keep'],[C('smoked_fish')]:[1,'keep'],[C('dried_meat')]:[0,'keep'],[C('dried_fish')]:[0,'keep'],[C('jar_preserve')]:[2,'keep']};
// the CoopTown dishes: [name, hunger points H, saturation modifier, container given back, use animation]
export const DISHES={
 veg_soup:['野菜スープ',6,.6,'minecraft:bowl','drink'],meat_stew:['肉と野菜のシチュー',10,.8,'minecraft:bowl','drink'],fish_set:['焼き魚の定食',8,.8,null,'eat'],
 fruit_tart:['フルーツタルト',5,.5,null,'eat'],smoked_meat:['燻製肉',8,.8,null,'eat'],
 smoked_fish:['燻製魚',7,.7,null,'eat'],dried_meat:['干し肉',5,.6,null,'eat'],dried_fish:['干し魚',5,.6,null,'eat'],jar_preserve:['瓶詰め保存食',6,.7,'minecraft:glass_bottle','eat']};
// the catalogue's foods and drinks by id (H / S per quality come from it)
export const CATALOG_FOOD=Object.fromEntries(FOOD_CATALOG.filter(e=>e.kind==='food'||e.kind==='drink').map(e=>[e.id,e]));
export const MEAL_STRESS_COOLDOWN=30; // seconds: stress recovery from any food or drink (catalogue rules)
export const SOUP_HP={total:2,seconds:20,combatMs:10000}; // the soup effect: HP 2 over 20 s, only out of combat
/** What a quality adds when eaten: stress recovery S, extra hunger points, and the meal effect (one at a time). */
export function mealOf(id,tier){
 const c=CATALOG_FOOD[id];
 if(c){return {stress:byRank(c.s,tier),hunger:Math.max(0,byRank(c.h,tier)-(c.h?.[0]??0)),effect:c.hp?{key:'soup_hp',label:'汁物の回復',seconds:SOUP_HP.seconds}:null,drink:c.kind==='drink'};}
 const f=FOOD[id];if(!f)return undefined;
 // ranks: x = the old tier position (D 0, B 1, S 2); A and S get the strong effects
 const x=RANK_POS[Math.max(0,Math.min(4,tier|0))],strong=tier>=3;
 const [s,kind]=f,stress=s+(s?Math.round(x*Math.max(1,Math.ceil(s/4))):0),hunger=Math.round(x);
 const effect=tier===0?null:kind==='soup'?{key:'regen',label:'継続回復',seconds:strong?10:6}
  :kind==='sweet'?{key:'guard',label:'ストレス増加軽減',pct:strong?.15:.1,seconds:120}
  :kind==='keep'&&strong?{key:'speed',label:'移動補助',seconds:30}
  :kind==='main'&&strong?{key:'regen',label:'継続回復',seconds:6}:null;
 return {stress,hunger,effect};
}
