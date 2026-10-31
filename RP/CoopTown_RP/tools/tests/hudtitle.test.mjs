// The HUD profile's title: any worn title shows (its name as info line 10, its rank as 3 bits for the badge).
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const H=await load('hud-info.js'),M=await load('minimap.js'),P=await load('profile-config.js'),G=await load('map-glyphs.js'),TC=await load('titles-config.js');
assert.strictEqual(H.INFO_LINES.indexOf('title'),10); // the party lines come after it (party.test.mjs)
const src=fs.readFileSync(path.join(rp,'tools/build-hud-log.mjs'),'utf8');assert.ok(/title:10,/.test(src)&&new RegExp('lines:'+H.INFO_LINES.length+',').test(src),'RP INFO in step with the BP');
const newbie=TC.TITLES.find(t=>t.title==='新入生');assert.ok(newbie);
assert.strictEqual(P.titleRankNumber('新入生'),TC.TITLE_RANKS.indexOf(newbie.rank)+1);assert.strictEqual(P.titleRankNumber('運営がくれた称号'),7);
const tok=k=>G.MAP_GLYPHS['token:'+k];
const s=M.statTokens({title:'新入生'});assert.ok(s.includes(tok('ptx')));
const r=P.titleRankNumber('新入生');for(let b=0;b<3;b++)assert.strictEqual(s.includes(tok('pt'+b)),!!(r>>b&1),'bit '+b);
assert.ok(!M.statTokens({}).includes(tok('ptx')),'no title: no ribbon');
const hud=fs.readFileSync(path.join(rp,'ui/hud_screen.json'),'utf8');assert.ok(hud.includes('textures/cooptown/titles/rank_1'));
console.log('HUD TITLE PASS');
