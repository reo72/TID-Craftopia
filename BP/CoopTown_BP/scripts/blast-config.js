// The blacksmith's blast furnace (鍛冶師 only, blast-runtime.js): ores and raw metal smelted with a waiting time,
// and iron / gold gear melted back into nuggets (re-smelting lists only what the player carries).
// time: seconds per item (vanilla blast furnace: 5 s); fuel: charcoal or coal, one per BLAST_RULES.fuelPer smelts
// (a raw metal block counts as nine). The miner's workbench recipes (iron smelting, the blast furnace) stay as they are.
export const BLAST_JOB='鍛冶師';
export const BLAST_RULES={fuelPer:8,maxBatch:64,amounts:[1,8,64]};
export const BLAST_TABS=['金属','鉱石ブロック','再精錬'];
export const FUEL={group:'fuel'};
const M=id=>'minecraft:'+id;
const B=(tab,raw,out,extra={})=>({tab,raw:M(raw),output:[M(out),1],time:5,weight:1,...extra});
const GEAR=['sword','pickaxe','axe','shovel','hoe','helmet','chestplate','leggings','boots'];
export const BLAST_RECIPES=[
 B(0,'raw_iron','iron_ingot'),B(0,'raw_gold','gold_ingot'),B(0,'raw_copper','copper_ingot'),B(0,'ancient_debris','netherite_scrap',{time:10}),
 B(1,'iron_ore','iron_ingot'),B(1,'gold_ore','gold_ingot'),B(1,'copper_ore','copper_ingot'),
 B(1,'deepslate_iron_ore','iron_ingot'),B(1,'deepslate_gold_ore','gold_ingot'),B(1,'deepslate_copper_ore','copper_ingot'),B(1,'nether_gold_ore','gold_ingot'),
 // a raw block smelts as its nine pieces at once (vanilla cannot smelt them; nine raw = one block)
 B(1,'raw_iron_block','iron_block',{time:45,weight:9}),B(1,'raw_gold_block','gold_block',{time:45,weight:9}),B(1,'raw_copper_block','copper_block',{time:45,weight:9}),
 ...GEAR.map(g=>B(2,'iron_'+g,'iron_nugget')),...GEAR.map(g=>B(2,'golden_'+g,'gold_nugget')),
 ...['helmet','chestplate','leggings','boots'].map(g=>B(2,'chainmail_'+g,'iron_nugget'))
];
/** Ingredients for n of recipe r: [[type, count]] (the item, then the fuel). */
export const blastNeeds=(r,n)=>[[r.raw,n],[FUEL,Math.ceil(Math.max(1,n)*r.weight/BLAST_RULES.fuelPer)]];
export const blastSeconds=(r,n)=>r.time*Math.max(1,n);
