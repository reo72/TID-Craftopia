// The 手帳's title list: common + own jobs (+ what one holds); ゴールド and above keep their conditions secret until earned.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const B=await import(pathToFileURL(path.join(dir,'book-pages.js')).href);
const p={job:'農家',secondJob:'',titles:['海の主']};
const list=B.visibleTitles(p),cats=new Set(list.map(t=>t.cat));
assert.ok(cats.has('共通')&&cats.has('農家')&&cats.has('その他'));
assert.ok(!cats.has('鍛冶師')&&!cats.has('鉱夫'),'other jobs hidden');
assert.ok(list.some(t=>t.title==='海の主'),'a title one holds stays');
const q={job:'冒険家',secondJob:'釣り師',titles:[]};const qc=new Set(B.visibleTitles(q).map(t=>t.cat));
assert.ok(qc.has('冒険家')&&qc.has('釣り師')&&!qc.has('鉱夫')&&!qc.has('木こり')&&!qc.has('農家'),'second job; 鉱夫 / 木こり are jobs of their own (2026-10-30)');
{const m=new Set(B.visibleTitles({job:'鉱夫',secondJob:'木こり',titles:[]}).map(t=>t.cat));assert.ok(m.has('鉱夫')&&m.has('木こり')&&!m.has('冒険家'));}
const gold=list.find(t=>t.rank==='ゴールド'&&t.cat==='農家'),bronze=list.find(t=>t.rank==='ブロンズ'&&t.cat==='農家');
assert.ok(B.isSecret(gold,p));assert.ok(!B.isSecret(bronze,p));assert.ok(!B.isSecret(gold,{...p,titles:[gold.title]}),'shown once earned');
// the page: rows hide the text, the detail hides conditions and progress
const spec=B.titlesModel.spec(null,{player:p});const row=spec.rows[list.indexOf(gold)];assert.ok(row.sub.includes('？？？？？')&&!row.sub.includes(gold.hint));
const d=B.titlesModel.decorate({},p,{sel:list.indexOf(gold)}).detail;assert.ok(d.text.startsWith('取得条件：？？？？？')&&d.barText==='？？？？？');
assert.ok(B.titlesModel.decorate({},p,{sel:list.indexOf(bronze)}).detail.text.includes(bronze.hint));
console.log('ok titleview',list.length);
