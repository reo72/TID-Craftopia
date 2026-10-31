// The enchanting table: every enchantment can come up on each item it is listed for, with legal levels and no
// clashing pair, and only on items vanilla Bedrock allows it on; 刻印の書 tell what they go on and what they do.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const C=await load('enchant-config.js'),R=await load('enchant-runtime.js');
// vanilla Bedrock: what each enchantment may go on (kinds as enchant-config.js kindOf names them)
const VANILLA={efficiency:['axe','digger','shears'],silk_touch:['axe','digger'],fortune:['axe','digger'],unbreaking:'*',sharpness:['sword','axe'],smite:['sword','axe','mace'],
 bane_of_arthropods:['sword','axe','mace'],density:['mace'],breach:['mace'],knockback:['sword'],fire_aspect:['sword','mace'],looting:['sword'],power:['bow'],punch:['bow'],flame:['bow'],
 infinity:['bow'],multishot:['crossbow'],piercing:['crossbow'],quick_charge:['crossbow'],impaling:['trident'],riptide:['trident'],loyalty:['trident'],channeling:['trident'],
 luck_of_the_sea:['rod'],lure:['rod'],protection:['helmet','chest','legs','boots'],fire_protection:['helmet','chest','legs','boots'],blast_protection:['helmet','chest','legs','boots'],
 projectile_protection:['helmet','chest','legs','boots'],respiration:['helmet'],aqua_affinity:['helmet'],thorns:['chest'],feather_falling:['boots'],depth_strider:['boots']};
for(const e of C.ENCHANTS){const v=VANILLA[e.id];assert.ok(v,e.id+' known');if(v!=='*')for(const k of e.on)assert.ok(v.includes(k),`${e.id} on ${k}`);assert.ok(C.ENCHANT_DESC[e.id],e.id+' description');}
// every listed (enchantment, kind) comes up at the table, levels within 1..max, no clashing pair in one offer
const SAMPLE={sword:'minecraft:iron_sword',axe:'minecraft:iron_axe',digger:'minecraft:iron_pickaxe',bow:'minecraft:bow',crossbow:'minecraft:crossbow',trident:'minecraft:trident',mace:'minecraft:mace',
 rod:'minecraft:fishing_rod',shears:'minecraft:shears',helmet:'minecraft:iron_helmet',chest:'minecraft:iron_chestplate',legs:'minecraft:iron_leggings',boots:'minecraft:iron_boots',book:'minecraft:book'};
const seen=new Set();
for(const [kind,id] of Object.entries(SAMPLE)){assert.strictEqual(C.kindOf(id),kind,id);
 for(let seed=1;seed<4000;seed++)for(const o of R.offersFor(id,15,seed,6)){
  for(const e of o.enchants){const d=C.ENCHANTS.find(x=>x.id===e.id);assert.ok(e.level>=1&&e.level<=d.max,`${e.id} ${e.level}`);if(kind!=='book')assert.ok(d.on.includes(kind));seen.add(kind+':'+e.id);}
  for(const a of o.enchants)for(const b of o.enchants)if(a!==b){const x=C.ENCHANTS.find(q=>q.id===a.id),y=C.ENCHANTS.find(q=>q.id===b.id);
   assert.ok(!(x.group&&x.group===y.group)&&!(x.excl??[]).includes(y.id),`${a.id}+${b.id}`);}}}
const missing=C.ENCHANTS.flatMap(e=>e.on.map(k=>k+':'+e.id)).filter(k=>!seen.has(k));assert.deepStrictEqual(missing,[],'never offered');
assert.ok(C.ENCHANTS.every(e=>seen.has('book:'+e.id)),'every enchantment on a book');
console.log('enchant check ok',seen.size);
// 刻印の書: what it goes on and what it does, for each sample rune
{const RR=await load('rune-runtime.js'),S=await load('runescript.js');
 for(const s of S.SAMPLES){const src=s.code;const r={name:'テスト',src,author:'REO722'};const lore=RR.runeLore(r);
  assert.ok(lore.some(l=>l.includes('付けられる')),'target');assert.ok(lore.some(l=>l.includes('効果')),'effect');
  const c=S.compileRune(src).rune;assert.ok(lore.join('').includes(c.slot==='weapon'?'武器':c.part?S.PART_NAMES[c.part]:'防具'));}
 console.log('rune lore ok',S.SAMPLES.length);}
