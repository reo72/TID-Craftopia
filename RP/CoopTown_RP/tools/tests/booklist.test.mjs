// The new book pages: list models, profile and settings (BP buttons = RP slots), flows through every home card,
// settings toggles and a shop purchase.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const srv=await import('@minecraft/server');const ui=await import('@minecraft/server-ui');
const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const {BOOK_TABS}=await load('book-frame.js');
const pages=await load('book-pages.js');const {listButtons,ROWS}=pages;
const {profileButtons,settingsButtons}=await load('book-profile.js');
const {openBook,HOME_CARDS,HOME2_CARDS}=await load('book.js');
const {game}=await load('game-runtime.js');const {prefs}=await load('prefs.js');
const book=JSON.parse(fs.readFileSync(path.join(rp,'ui/cooptown_book.json'),'utf8'));
const slotsOf=pg=>{const out=[];(function walk(n){if(n&&typeof n==='object'){if(Number.isInteger(n.collection_index)){const b=n.bindings.find(b=>b.target_property_name==='#visible');out.push({i:n.collection_index,prefix:b.source_property_name.match(/- '([^']*)'/)[1]});}
 for(const [k,v] of Object.entries(n))if(k!=='bindings')walk(v);}})({frame:book.frame,page:book[pg]});return out;};
// every non-hidden BP button has a slot with its prefix at its index; hidden ones match no slot
function matches(pg,buttons,label){
 const slots=slotsOf(pg),texts=[...BOOK_TABS.map(([id,l])=>`ct:${id}|${l}`),...buttons.map(b=>b[0])];
 texts.forEach((t,i)=>{const hit=slots.some(s=>s.i===i&&t.startsWith(s.prefix));if(t.startsWith('ct:-|'))assert.ok(!hit,label+': hidden '+i);else assert.ok(hit,label+': no slot for '+i+' '+t);});
 return texts;
}
const props=new Map(),inv=[];
const player={id:'L1',name:'Tester',typeId:'minecraft:player',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getTags:()=>[],hasTag:()=>false,addTag(){},removeTag(){},sendMessage(){},playSound(){},
 getComponent:()=>({container:{size:36,getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;},addItem(it){inv.push(it);},emptySlotsCount:30}}),location:{x:0,y:64,z:0},dimension:{id:'minecraft:overworld',getBiome:()=>({id:'minecraft:plains'})},onScreenDisplay:{setTitle(){},setActionBar(){}}};
srv.__players.length=0;srv.__players.push(player);
const {refreshGame}=await load('game-runtime.js');refreshGame(player);
// list models in several states
const models={daily:pages.dailyModel,codex:pages.codexModel,titles:pages.titlesModel,bank:pages.bankModel,shop:pages.shopModel,events:pages.eventsModel,skills:pages.skillModel,gacha:pages.gachaModel,guide:pages.guideModel};
for(const [name,m] of Object.entries(models))for(const tab of [0,1,2,3])for(const sel of [0,1,7]){
 const snap=game.snapshot(player.id),state={tab,sel,offset:Math.floor(sel/ROWS)*ROWS};
 if(name==='codex'&&tab>3||name==='shop'&&tab>2||name==='events'&&tab>2||name==='gacha'&&tab>2)continue;
 if((name==='daily'||name==='titles'||name==='bank'||name==='skills'||name==='guide')&&tab>0)continue;
 const s=m.spec(player,snap,state);state.sel=Math.max(0,Math.min(state.sel,s.rows.length-1));state.offset=Math.floor(state.sel/ROWS)*ROWS;m.decorate?.(s,snap.player,state);
 matches('list',listButtons({...s,...state}),`${name} tab ${tab} sel ${sel}`);
}
matches('profile',profileButtons(player,game.snapshot(player.id).player),'profile');
matches('settings',settingsButtons(player),'settings');
// the town music row (2026-10-30): on, at 40 %, and its buttons are the page's last four
{const pr=prefs(player);assert.strictEqual(pr.bgm,true);assert.strictEqual(pr.bgmVolume,40);const b=settingsButtons(player);assert.deepStrictEqual(b.slice(-4).map(x=>x[0]),['ct:vd|','ct:vu|','ct:d_vb|40','ct:on|']);}
// pictures used by the book pages exist
for(const x of new Set(JSON.stringify(book).match(/textures\/cooptown\/[a-z_/0-9]+/g)))assert.ok(fs.existsSync(path.join(rp,x+'.png')),x);
const icons=new Set();for(const m of Object.values(models))for(const tab of [0,1,2]){try{const s=m.spec(player,game.snapshot(player.id),{tab,sel:0,offset:0});m.decorate?.(s,game.snapshot(player.id).player,{tab,sel:0,offset:0});for(const r of s.rows)icons.add(r.icon);icons.add(s.detail?.icon);icons.add(s.detail?.infoIcon);}catch{}}
for(const x of [...icons].filter(Boolean))assert.ok(fs.existsSync(path.join(rp,x+'.png')),'icon '+x);
// every home card opens its page and the home bookmark comes back (features with their own dialogs skipped)
const T=BOOK_TABS.length,run=async answers=>{ui.__forms.length=0;ui.setAnswers(answers);await openBook(player);return ui.__forms.map(f=>f.t);};
for(const [k,[id,,,a]] of HOME_CARDS.entries()){const t=await run([T+k,0,3]);assert.deepStrictEqual([t[0],t.at(-1)],['ct:book:home','ct:book:home'],id+': '+t.join(' > '));assert.ok(t[1].startsWith('ct:book:'),id+' opens a book page: '+t[1]);}
for(const [k,[id,,,a]] of HOME2_CARDS.entries()){if(a.feature||a.notice)continue;const t=await run([T+8,T+k,0,3]);assert.ok(t[2].startsWith('ct:book:')&&['ct:book:home','ct:book:home2'].includes(t.at(-1)),id+' (back on a menu page): '+t.join(' > '));}
// bookmarks jump between pages: home -> profile -> settings -> close
assert.deepStrictEqual(await run([1,2,3]),['ct:book:home','ct:book:profile','ct:book:settings']);
// settings: turn the profile HUD off, then 保存する goes home
let t=await run([2,T+4,T+22,1,3]);
assert.strictEqual(prefs(player).hud.profile,false,'HUD profile off');assert.deepStrictEqual(t,['ct:book:home','ct:book:settings','ct:book:settings','ct:dialog','ct:book:home']);
// shop: with money, buy one log (confirm, result) and pay for it
game.execute(player.id,'admin.coins',{isAdmin:true,target:player.id,amount:500});
const before=game.snapshot(player.id).player.coins;
t=await run([T+6,T+30,1,1,3]);
assert.strictEqual(game.snapshot(player.id).player.coins,before-40,'paid 40 for one log: '+t.join(' > '));
console.log('BOOKLIST PASS',Object.keys(models).length,'list models');
