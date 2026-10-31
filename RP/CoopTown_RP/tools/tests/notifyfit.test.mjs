// Notification text fits its bar: every title's banner (alone and as "name：title" for others) and plain bars.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const N=await load('notify.js'),T=await load('titles-config.js'),{PARTY_GLYPHS}=await load('party-glyphs.js');
const zones=JSON.parse(fs.readFileSync(path.join(rp,'tools/title-banners/zones.json'),'utf8'));
Object.values(zones).forEach((z,i)=>assert.ok(N.BANNER.px[i]<=z.w*236,'banner '+(i+1)+' area'));
let small=0,cut=0;
for(const t of T.TITLES){const k=N.titleKind(t.rank);if(!k)continue;
 for(const text of [t.title,'REO722：'+t.title,'abcdefghijklmnop：'+t.title]){
  const f=N.fitBanner(text,k),sc=N.BANNER.sizes.find(s=>s[0]===f.size)[1];
  assert.ok(N.textPx(f.text)*sc<=N.BANNER.px[k-5],`${text} fits`);if(f.size)small++;if(f.text!==text)cut++;
  if(f.text!==text)assert.ok(text.startsWith(f.text.replace(/…$/,'')),f.text);}}
// ドパガキ alone fits at full size; the long ones get smaller first
assert.deepStrictEqual(N.fitBanner('ドパガキ',5),{text:'ドパガキ',size:''});
assert.strictEqual(N.fitBanner('ドパガキ（農民）',5).size,'ns1');
// plain bars: within the text width
assert.ok(N.textPx(N.fitText('お知らせ「とても長いお知らせのタイトルがここに入ります」',N.NOTIFY.textPx))<=N.NOTIFY.textPx);
// the size marks exist and the HUD uses them
const hud=fs.readFileSync(path.join(rp,'ui/hud_screen.json'),'utf8');
for(const m of ['ns1','ns2']){const ch=PARTY_GLYPHS['token:'+m];assert.ok(ch&&(hud.includes(ch)||hud.toLowerCase().includes(JSON.stringify(ch).slice(1,-1).toLowerCase())),m);}
console.log('notify fit ok',small,cut);
