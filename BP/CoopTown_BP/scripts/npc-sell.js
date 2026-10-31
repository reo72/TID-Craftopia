import {jobCount} from './job-count.js';
import {skillValue} from './skill-config.js';
// 戦利品の目利き (skill-config.js loot): more XP for a 冒険家 selling mob loot
const lootBonus=(player,game)=>{try{return skillValue(game.peek(d=>d.players[player.id]),'冒険家','loot');}catch{return 0;}};
import {qualityOf,TIERS} from './quality.js';
import {stateOf,NEAR,EXPIRED} from './freshness.js';
import {NEAR_PRICE} from './food-config.js';
import {FISH_SPECIES} from './fish-species.js';
import {titleTrack,titleSeen} from './job-count.js';

// Selling to the town (NPC buyer, the book's ショップ → 買取 tab): every job's products have a base price, multiplied by
// the item's quality (quality.js TIERS price). Selling also gives the matching skill a little XP (Notion: NPC sales
// count for the job). Items with enchantments or a name sell at the base price of their kind. Food near its date
// sells for NEAR_PRICE of the price; expired food is not bought (freshness.js).
const M=id=>'minecraft:'+id;
const G='gather',C='craft';
// id -> [base coins, skill]
export const SELL_PRICES=Object.fromEntries([
 // 農家
 ...[['wheat',4],['carrot',4],['potato',4],['beetroot',4],['pumpkin',10],['melon_slice',2],['sugar_cane',3],['cocoa_beans',4],['sweet_berries',3],['apple',6],['bone_meal',3]].map(([k,v])=>[M(k),[v,G]]),
 // 農家（畜産）
 ...[['milk_bucket',20],['egg',4],['white_wool',8],['leather',10],['beef',8],['porkchop',8],['chicken',6],['mutton',7],['rabbit_hide',4],['feather',2]].map(([k,v])=>[M(k),[v,G]]),
 // 釣り師
 ...[['cod',8],['salmon',12],['tropical_fish',20],['pufferfish',15]].map(([k,v])=>[M(k),[v,G]]),
 ...FISH_SPECIES.map(s=>[s.id,[s.price,G]]), // the 100 fishing fish (fish-species.js)
 // 冒険家
 ...[['rotten_flesh',1],['bone',3],['string',3],['spider_eye',4],['gunpowder',6],['ender_pearl',25],['blaze_rod',30],['slime_ball',8],['phantom_membrane',20]].map(([k,v])=>[M(k),[v,G]]),
 // 料理人
 ...[['bread',12],['cooked_beef',16],['cooked_porkchop',16],['cooked_chicken',12],['cooked_mutton',14],['cooked_rabbit',12],['cooked_cod',14],['cooked_salmon',18],
  ['baked_potato',8],['dried_kelp',3],['mushroom_stew',20],['beetroot_soup',20],['rabbit_stew',35],['cookie',4],['pumpkin_pie',25],['cake',60],['golden_carrot',40],['golden_apple',120]].map(([k,v])=>[M(k),[v,C]]),
 // 調合師
 ...[['potion',30],['splash_potion',45],['lingering_potion',70]].map(([k,v])=>[M(k),[v,C]]),
 // 鍛冶師
 ...[['iron_ingot',20],['gold_ingot',25],['copper_ingot',6],
  ...['sword','pickaxe','axe','shovel','hoe'].flatMap(t=>[['iron_'+t,60],['golden_'+t,50],['diamond_'+t,300]]),
  ...['helmet','chestplate','leggings','boots'].flatMap(t=>[['iron_'+t,80],['golden_'+t,70],['diamond_'+t,400]])].map(([k,v])=>[M(k),[v,C]]),
 // 付与術師
 [M('enchanted_book'),[120,C]],[M('book'),[15,C]]
]);
// the price table (sell-price.js: staff's prices per item and rank, else the default below) hooks in here
let priceHook=null;
export const setSellPriceHook=f=>{priceHook=f;};
/** What the player carries that the town buys: [{key, id, tier, count, price (each)}], grouped by item and quality. */
export function sellables(container){
 const groups=new Map();
 for(let i=0;container&&i<container.size;i++){
  const s=container.getItem(i);const base=s&&SELL_PRICES[s.typeId];if(!base)continue;
  const state=stateOf(s);if(state===EXPIRED)continue;
  const tier=qualityOf(s),near=state===NEAR,key=s.typeId+'|'+tier+(near?'|near':'');
  const g=groups.get(key)??{key,id:s.typeId,tier,near,count:0,price:priceHook?.(s.typeId,tier,near)||Math.max(1,Math.round(base[0]*TIERS[tier].price*(near?NEAR_PRICE:1))),skill:base[1]};
  g.count+=s.amount;groups.set(key,g);
 }
 return [...groups.values()].sort((a,b)=>b.price*b.count-a.price*a.count);
}
/** Removes n of a group from the inventory; returns how many were removed. */
export function removeGroup(container,group,n){
 let left=n;
 for(let i=0;i<container.size&&left>0;i++){const s=container.getItem(i);if(s?.typeId!==group.id||qualityOf(s)!==group.tier)continue;const st=stateOf(s);if(st===EXPIRED||(st===NEAR)!==!!group.near)continue;
  const k=Math.min(left,s.amount);left-=k;if(s.amount===k)container.setItem(i,undefined);else{s.amount-=k;container.setItem(i,s);}}
 return n-left;
}
/** The titles' kind of a sale (no daily of their own; the town buyer and the よろず屋 both count): ores and stone
 *  (初任給 ...), wood (材木屋 ...), mob loot (お小遣い稼ぎ ...), else null. id without "minecraft:". */
export function sellTitleKind(id){
 if(/^(coal|raw_(iron|copper|gold)|redstone|lapis_lazuli|diamond|emerald|quartz|amethyst_shard|ancient_debris|netherite_scrap|cobblestone|cobbled_deepslate|stone|deepslate|tuff|andesite|diorite|granite|calcite)$|_ore$/.test(id))return 'sell_ore';
 if(/_(log|wood|planks|stem|hyphae)$|^charcoal$/.test(id))return 'sell_wood';
 if(/^(rotten_flesh|bone|string|spider_eye|gunpowder|ender_pearl|blaze_rod|slime_ball|phantom_membrane|ghast_tear|magma_cream|prismarine_shard|prismarine_crystals|shulker_shell|breeze_rod|armadillo_scute)$/.test(id))return 'sell_loot';
 return null;
}
/** Sells n of a group: removes them and pays through the engine. Returns the engine message. */
export function sellGroup(player,game,group,n,itemName){
 const container=player.getComponent('minecraft:inventory')?.container;
 const got=removeGroup(container,group,n);if(!got)throw new Error('売る物がありません');
 const id=group.id.replace('minecraft:','');
 const kind=/^(potion|splash_potion|lingering_potion)$/.test(id)?'sell_potion':(/^(cod|salmon|tropical_fish|pufferfish)$/.test(id)||id.startsWith('cooptown:fish_'))?'sell_fish':
  /^(wheat|carrot|potato|beetroot|pumpkin|melon_slice|sugar_cane|cocoa_beans|sweet_berries|apple)$/.test(id)?'sell_crop':/^(cooked_|baked_|bread|cookie|cake|pumpkin_pie|.*_stew|.*_soup|golden_carrot|golden_apple|dried_kelp)/.test(id)?'sell_food':null;
 if(kind)jobCount(player,kind,got);
 const loot=sellTitleKind(id)==='sell_loot';if(loot)jobCount(player,'sell_loot',got); // 冒険家's daily (2026-10-30)
 // titles: every sale is an NPC trade; gear and enchanted books count as the smith's / enchanter's work
 const titleKind=kind??sellTitleKind(id)??(/_(sword|axe|pickaxe|shovel|hoe|helmet|chestplate|leggings|boots)$/.test(id)?'sell_gear':id==='enchanted_book'?'sell_book':null);
 titleTrack(player,'npc_trade');titleTrack(player,'npc_coins',got*group.price);if(titleKind)titleTrack(player,'npc_sell:'+titleKind);
 const pay=got*group.price,label=(group.tier?'ランク'+TIERS[group.tier].label+'の':'')+itemName(group.id)+(group.near?'（期限間近）':'');
 return game.execute(player.id,'job.earn',{coins:pay,skill:group.skill,xp:Math.max(1,Math.ceil(pay/20*(loot?1+lootBonus(player,game):1))),note:`買取 ${label}×${got} +${pay}コイン`});
}
