// The book's 称号 page: tabs (すべて / 獲得済み / 未獲得), every row reachable, the arrows wrap round.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const BP=await load('book-pages.js');
const all=BP.visibleTitles({job:'冒険家',titles:[]});
const p={job:'冒険家',secondJob:'料理人',titles:[all[0].title,all[7].title],title:all[0].title,stats:{}};
const s0=BP.titlesModel.spec({},{player:p},{tab:0}),s1=BP.titlesModel.spec({},{player:p},{tab:1}),s2=BP.titlesModel.spec({},{player:p},{tab:2});
assert.deepStrictEqual(s0.tabs.map(t=>t.label),BP.TITLE_TABS);
assert.strictEqual(s1.rows.length,2);assert.strictEqual(s0.rows.length,s1.rows.length+s2.rows.length);
assert.ok(s0.summary.startsWith('獲得 2 /'),'the summary counts all, whatever the tab');
// every row of every tab gets its detail
for(const tab of [0,1,2]){const n=BP.titlesOfTab(p,tab).length;for(let sel=0;sel<n;sel++){const s=BP.titlesModel.spec({},{player:p},{tab});BP.titlesModel.decorate(s,p,{tab,sel});assert.ok(s.detail.title,`${tab}/${sel}`);}}
// an empty tab does not break
const e=BP.titlesModel.spec({},{player:{...p,titles:[]}},{tab:1});BP.titlesModel.decorate(e,{...p,titles:[]},{tab:1,sel:0});assert.ok(e.detail.title);
// arrows: both shown with more than one page; the last page's offset
const b=BP.listButtons({...s0,tab:0,sel:0,offset:0});assert.ok(b.some(x=>x[0]==='ct:pp|')&&b.some(x=>x[0]==='ct:np|'));
assert.strictEqual(BP.lastPage(263),260);assert.strictEqual(BP.lastPage(5),0);assert.strictEqual(BP.lastPage(6),5);
const one=BP.listButtons({...s1,tab:1,sel:0,offset:0});assert.ok(!one.some(x=>x[0]==='ct:pp|'||x[0]==='ct:np|'),'one page: no arrows');
console.log('titles page ok',s0.rows.length);
