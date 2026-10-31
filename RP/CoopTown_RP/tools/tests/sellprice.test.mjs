// The selling price in item descriptions: town buyer by rank / freshness, villager bonus, よろず屋 for the rest.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');
const SP=await load('sell-price.js'),{setQuality}=await load('quality.js'),{SELL_PRICES}=await load('npc-sell.js'),{BUY_BONUS}=await load('npc-jobs.js'),{TIERS}=await load('quality.js');
const {sellPrice}=await load('trader-config.js'),D=await load('item-desc.js'),L=await load('food-lore.js');
const wheat=new srv.ItemStack('minecraft:wheat',3),w=SP.sellInfo(wheat);
assert.strictEqual(w.each,SELL_PRICES['minecraft:wheat'][0]);assert.strictEqual(w.villager,SP.capResale('minecraft:wheat',Math.round(w.each*BUY_BONUS)));
// no buyer pays as much as the cheapest purchase (2026-10-30: buy-and-sell-back loops); ranked items are not capped
assert.ok(w.villager<SP.cheapestBuy('minecraft:wheat'));assert.strictEqual(SP.capResale('minecraft:wheat',99,3),99);
assert.ok(SP.priceOf('minecraft:fishing_rod')<SP.cheapestBuy('minecraft:fishing_rod'),'the fishing rod loop');
const good=setQuality(new srv.ItemStack('minecraft:wheat',1),3);assert.strictEqual(SP.sellInfo(good).each,Math.max(1,Math.round(SELL_PRICES['minecraft:wheat'][0]*TIERS[3].price)),'rank pays more');
assert.ok(SP.priceText(wheat).includes(`売値 ${w.each}コイン`)&&SP.priceText(wheat).includes('村人'));
// not bought by the town: the よろず屋's third, or nothing
const dia=new srv.ItemStack('minecraft:diamond',1);if(sellPrice('minecraft:diamond')>0)assert.ok(SP.priceText(dia).includes('村人'),'the 鉱夫 villager buys diamonds (2026-10-30)');
const nugget=new srv.ItemStack('minecraft:gold_nugget',1);if(sellPrice('minecraft:gold_nugget')>0)assert.ok(SP.priceText(nugget).includes('よろず屋'));
assert.strictEqual(SP.priceText(new srv.ItemStack('minecraft:dirt',1)),'','worth nothing: no line');
// written in the lore, and the item still counts as plain
const s=new srv.ItemStack('minecraft:iron_ingot',1);D.ensureDesc(s);assert.ok(s.getLore().some(l=>l.includes('売値')),s.getLore().join('|'));assert.ok(D.isPlainItem(s));
const c=new srv.ItemStack('minecraft:wheat',1);L.ensureInfo(c);assert.ok(c.getLore().some(l=>l.includes('売値')),c.getLore().join('|'));assert.ok(D.isPlainItem(c));
// staff's prices per item and rank win, everywhere (the town buyer too); 0 = the default
SP.setPriceOverrides(()=>({'minecraft:wheat':[0,0,0,99,0]}));
assert.strictEqual(SP.priceOf('minecraft:wheat',3),99);assert.strictEqual(SP.priceOf('minecraft:wheat',0),SELL_PRICES['minecraft:wheat'][0]);
const {sellables}=await load('npc-sell.js');const inv=[setQuality(new srv.ItemStack('minecraft:wheat',2),3),new srv.ItemStack('minecraft:wheat',5)];
const box={size:inv.length,getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;}};
assert.strictEqual(sellables(box).find(g=>g.tier===3).price,99,'the town buyer uses the table');
// the よろず屋: ranked goods sell, by rank; named ones do not
const named=new srv.ItemStack('minecraft:wheat',1);named.nameTag='x';inv.push(named);box.size=inv.length;
const groups=SP.merchantGroups(box);assert.deepStrictEqual(groups.map(g=>[g.tier,g.count,g.price]).sort(),[[0,5,SELL_PRICES['minecraft:wheat'][0]],[3,2,99]].sort());
SP.setPriceOverrides(()=>({}));
console.log('SELLPRICE PASS');
