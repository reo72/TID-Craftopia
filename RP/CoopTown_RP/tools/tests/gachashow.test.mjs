// gacha-show.js (2026-10-31): reading a draw's result text into the chest opening's buttons.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [bp,rp]=process.argv.slice(2);
const S=await import(pathToFileURL(path.join(bp,'gacha-show.js')).href);
const d=S.parseDraw('デイリーガチャ 10回\nコモン　灯り補充\nレジェンド　灯り補充（天井）\nレア　パンの包み');
assert.strictEqual(d.title,'デイリーガチャ');
assert.deepStrictEqual(d.lines.map(l=>l.rarity),['C','L','R']);
assert.strictEqual(S.bestOf(d.lines).rarity,'L');
const b=S.gachaButtons(d);
assert.strictEqual(b.length,S.GACHA_BUTTONS.length);
assert.ok(b[0][0].includes('[gL]'),'gold');assert.ok(b[3][0].endsWith('レジェンド'));
assert.ok(b[2][1]&&!b[2][1].endsWith('chest'),'the best prize has its item icon, 天井 mark or not');
assert.ok(b[7][0].includes('灯り補充')&&!b[7][0].includes('天井')&&b[7][1].includes('torch'),'each prize has its picture');assert.strictEqual(b[9][0],'ct:gs|','a hidden cell');
assert.ok(S.gachaButtons(S.parseDraw('x 1回\nコモン　灯り補充'))[0][0].includes('[gc]'));
// every picture the screen names is in the pack, and every timed step it names exists
const ui=fs.readFileSync(path.join(rp,'ui/cooptown_gacha.json'),'utf8'),json=JSON.parse(ui);
for(const [,tex] of ui.matchAll(/"(textures\/cooptown\/gacha_ui\/\w+)"/g))assert.ok(fs.existsSync(path.join(rp,tex+'.png')),tex);
for(const [,a] of ui.matchAll(/"@cooptown_gacha\.(a\d+)"/g))assert.ok(json[a],a);
