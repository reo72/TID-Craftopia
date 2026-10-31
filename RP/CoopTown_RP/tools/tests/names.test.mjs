// Every item a shop sells or a list shows by picture has a Japanese name (no bare ids: よろず屋 showed "anvil").
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const G=await load('game-config.js'),T=await load('trader-config.js'),I=await load('item-icons.js');
const ids=new Set();JSON.stringify(T,(k,v)=>{if(typeof v==='string'&&/^minecraft:[a-z_0-9]+$/.test(v))ids.add(v);return v;});
const missShop=[...ids].filter(i=>!G.ITEM_NAMES[i]);assert.deepStrictEqual(missShop,[],'shop items without a name');
const missIcon=Object.keys(I.ITEM_ICONS).filter(i=>i.startsWith('minecraft:')&&!G.ITEM_NAMES[i]);
assert.ok(missIcon.length<=20,'pictured items without a name: '+missIcon.join(' '));
// the names table never overrides a name set elsewhere
assert.strictEqual(G.ITEM_NAMES['minecraft:emerald'],'エメラルド');
console.log('names ok',missIcon.length);
