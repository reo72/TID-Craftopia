// item-desc.js deliverable (2026-10-30): requests take items with descriptions and ranks; renamed / enchanted / worn /
// past-date items and those under the asked rank are not taken. ORDERS carry a minRank.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const srv=await import('@minecraft/server');
const {deliverable}=await imp('item-desc.js');const {setQuality}=await imp('quality.js');const {ORDERS}=await imp('game-config.js');
const plain=new srv.ItemStack('minecraft:oak_log',4);
const desc=new srv.ItemStack('minecraft:oak_log',4);desc.setLore(['§7説明の文章']);
const rankB=setQuality(new srv.ItemStack('minecraft:oak_log',4),2);
const named=new srv.ItemStack('minecraft:oak_log',4);named.nameTag='私の木';
assert.ok(deliverable(plain));assert.ok(deliverable(desc),'a description is fine');assert.ok(deliverable(rankB),'a rank is fine');
assert.ok(!deliverable(named),'renamed is not taken');
assert.ok(deliverable(rankB,2)&&!deliverable(rankB,3),'rank B meets B, not A');assert.ok(!deliverable(plain,1),'rank D does not meet C');
assert.ok(ORDERS.every(q=>Number.isInteger(q.minRank)&&q.minRank>=0&&q.minRank<=4));
console.log('ok');
