// The miner's grindstone (ct:grind) and the woodcutter's 製材台 (ct:saw): 鉱夫 / 木こり only (2026-10-30; 冒険家 before), BP button order = RP slots,
// ore sorting, tool care, sawing, charcoal, the title counts, and ore / log quality at mining.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server'),ui=await import('@minecraft/server-ui');
const {installWorkshops}=await load('workshop-runtime.js');const {workshopLayout}=await load('workshop-ui.js');
const C=await load('workshop-config.js');const {bindJobCount}=await load('job-count.js');const {qualityOf}=await load('quality.js');
const T=await load('titles-config.js');
// config
assert.deepStrictEqual([C.rankCap(1),C.rankCap(10),C.rankCap(29),C.rankCap(30)],[1,2,2,4]);
assert.strictEqual(C.careAmount(100,1),25);assert.strictEqual(C.careAmount(100,50),50);assert.strictEqual(C.caresFor(60,100,1),3);
assert.strictEqual(C.SAW_RECIPES.filter(r=>r.tab===0).length,12,'12 woods on one page');
assert.deepStrictEqual(C.sawNeeds(C.SAW_RECIPES.find(r=>r.charcoal),9),[[['minecraft:oak_log','minecraft:stripped_oak_log'],9],[{group:'planks'},3]]);
// the RP screens: sequential slots matching the BP layout
const names={};
for(const [n,tabs] of [['grind',2],['saw',5]]){
 const j=JSON.parse(fs.readFileSync(path.join(rp,`ui/cooptown_${n}.json`),'utf8'));
 const list=j.root.controls.find(c=>c.buttons).buttons.controls.map(c=>{const k=Object.keys(c)[0];return [k.split('@')[0],c[k].collection_index];});
 assert.ok(list.every(([,i],k)=>i===k),'sequential '+n);assert.strictEqual(list.length,workshopLayout(tabs).count,n+' count');
 assert.ok(!list.some(([k])=>/^(normal|hover|pressed)$/.test(k)));
 const L=workshopLayout(tabs);for(const [k,v] of Object.entries(L))if(k!=='count'&&k!=='tab')assert.strictEqual(list[v][0].replace(/_\d+(_\d+)?$/,'').replace('row_count','rowCount'),k.replace('slot','slot').replace(/^tab$/,'tab'),k);
 names[n]=list;
 const sf=fs.readFileSync(path.join(rp,'ui/server_form.json'),'utf8');assert.ok(sf.includes(`${n}@cooptown_${n}.root`));
 assert.ok(JSON.parse(fs.readFileSync(path.join(rp,'ui/_ui_defs.json'),'utf8')).ui_defs.includes(`ui/cooptown_${n}.json`));
}
const idx=(n,k)=>{const v=names[n].find(([x])=>x===k);assert.ok(v,k);return v[1];};
// a player
const tool=(id,max,damage)=>{const s=new srv.ItemStack(id,1);const d={maxDurability:max,damage};s.getComponent=c=>c==='minecraft:durability'?d:undefined;return s;};
const slots=[new srv.ItemStack('minecraft:raw_iron',10),new srv.ItemStack('minecraft:flint',3),tool('minecraft:iron_pickaxe',250,200),tool('minecraft:iron_axe',250,0),
 new srv.ItemStack('minecraft:oak_log',9),new srv.ItemStack('minecraft:spruce_planks',5),undefined,undefined,undefined,undefined,undefined,undefined];
const container={size:slots.length,getItem:i=>slots[i],setItem:(i,v)=>{slots[i]=v;},addItem:s=>{const k=slots.findIndex(x=>!x);slots[k]=s;}};
const msgs=[];
const player={id:'w1',name:'W',isSneaking:false,sendMessage:m=>msgs.push(m),playSound:()=>{},getComponent:()=>({container}),dimension:{spawnItem:()=>{}},location:{x:0,y:0,z:0}};
srv.__players.push(player);
let p={job:'農家',level:12};
const tracked={};bindJobCount({execute:(id,action,a)=>{if(action==='title.track')for(const [k,v] of Object.entries(a.adds))tracked[k]=(tracked[k]??0)+v;}});
installWorkshops({game:{peek:f=>f({players:{w1:p}})},itemName:id=>id.replace('minecraft:','')});
const fire=type=>{const ev={block:{typeId:type},player,itemStack:undefined,isFirstEvent:true,cancel:false};srv.__listeners.interact.at(-1)(ev);return ev;};
const settle=()=>new Promise(r=>setTimeout(r,20));
// other jobs: the game's own screen
assert.strictEqual(fire('minecraft:grindstone').cancel,false);assert.strictEqual(ui.__forms.length,0);
p={job:'農家',secondJob:'鉱夫',level:12};
// grindstone, sorting: 8 iron of 10, then the care of the pickaxe (axe not worn: not listed)
const g=k=>idx('grind',k);
ui.setAnswers([g('slot_0_1'),g('amount_1'),g('action'),g('tab_1'),g('amount_2'),g('action'),g('close')]);
assert.strictEqual(fire('minecraft:grindstone').cancel,true);await settle();
const f=ui.__forms.filter(x=>x.t==='ct:grind'),lab=(k,n)=>f[k].buttons[g(n)][0].replace(/§r/g,'');
assert.strictEqual(f.length,7);for(const x of f)assert.strictEqual(x.buttons.length,names.grind.length);
assert.match(lab(0,'tab_0'),/^\[on\]鉱石選別/);assert.match(lab(0,'slot_0_0'),/^\[sel\]\[ng\]石炭/);assert.match(lab(1,'slot_0_1'),/^\[sel\]鉄の原石/);
assert.match(lab(2,'row_count_0'),/§a10 §f\/ 8/);assert.match(lab(2,'info'),/ランクD～B/);assert.match(lab(2,'sub'),/費用/);
assert.match(lab(3,'state'),/鉄の原石 ×8 を選別/);
const irons=slots.filter(s=>s?.typeId==='minecraft:raw_iron');assert.strictEqual(irons.reduce((a,s)=>a+s.amount,0),10);
assert.ok(irons.every(s=>qualityOf(s)<=2),'Lv.12 caps at B');assert.strictEqual(irons.filter(s=>!s.getLore().length).reduce((a,s)=>a+s.amount,0),2,'2 left unsorted');
// care tab: only the worn pickaxe
assert.match(lab(4,'slot_0_0'),/^\[sel\]iron_pickaxe/);assert.strictEqual(lab(4,'slot_0_1'),'');
assert.match(lab(5,'row_count_0'),/§c?a?3 §f\/ 3/);assert.match(lab(5,'info'),/^\+/);
assert.match(lab(6,'state'),/手入れしました/);assert.strictEqual(slots[2].getComponent('minecraft:durability').damage,0,"mended fully with 3 flint");
assert.strictEqual(slots[1],undefined,'3 flint used');
// 製材台: oak planks ×1 log (Lv.12: まとめて), then charcoal from 8 logs with 2 planks of fuel
p={job:'鉱夫',secondJob:'木こり',level:12}; // the 製材台 is 木こり's (2026-10-30)
const s=k=>idx('saw',k);
ui.setAnswers([s('action'),s('tab_4'),s('amount_1'),s('action'),s('close')]);
assert.strictEqual(fire('minecraft:stonecutter_block').cancel,true);await settle();
const h=ui.__forms.filter(x=>x.t==='ct:saw'),sl=(k,n)=>h[k].buttons[s(n)][0].replace(/§r/g,'');
assert.strictEqual(h.length,5);assert.match(sl(0,'slot_0_0'),/^\[sel\]オークの板材/);assert.match(sl(0,'info'),/×4/);
assert.match(sl(1,'state'),/オークの板材 ×4 ができました/);assert.match(sl(2,'slot_0_0'),/オークの木炭/);
assert.match(sl(3,'row_count_1'),/§a(5|9) §f\/ 2/);assert.match(sl(4,'state'),/木炭 ×8 ができました/);
const count=id=>slots.filter(x=>x?.typeId===id).reduce((a,x)=>a+x.amount,0);
assert.deepStrictEqual([count('minecraft:oak_log'),count('minecraft:oak_planks'),count('minecraft:charcoal'),count('minecraft:spruce_planks')],[0,2,8,5],'planks fuel: 4 made, 2 burnt');
// below Lv.10 no まとめて
p={job:'木こり',level:3};slots[4]=new srv.ItemStack('minecraft:birch_log',20);
ui.setAnswers([s('slot_0_2'),s('amount_2'),s('action'),s('close')]);fire('minecraft:stonecutter_block');await settle();
const k2=ui.__forms.filter(x=>x.t==='ct:saw').slice(-4);assert.match(k2[2].buttons[s('state')][0],/Lv.10から/);assert.match(k2[3].buttons[s('state')][0],/Lv.10から/);assert.strictEqual(count('minecraft:birch_log'),20);
// sneaking: the game's own screen
player.isSneaking=true;assert.strictEqual(fire('minecraft:grindstone').cancel,false);player.isSneaking=false;
// title counts and conditions
for(const f of srv.__listeners.interval)f();
assert.deepStrictEqual([tracked.ore_sorted,tracked.pick_care,tracked.planks_made,tracked.charcoal_made],[8,3,4,8]);
const byName=n=>T.TITLES.find(x=>(x.cat==='鉱夫'||x.cat==='木こり')&&x.name===n);
for(const n of ['目利き','研ぎ師','銀の斧','炭焼き小屋','A5ランク','吉野杉','樹海','原生林','鑑定団','人間国宝','カーボンニュートラル'])assert.ok(!byName(n).pending,n+' not pending');
assert.ok(T.condOk(byName('目利き').cond[0],{tally:{ore_sorted:1}}));assert.ok(!T.condOk(byName('鑑定団').cond[0],{tally:{ore_sorted:99}}));
const kinds=['oak','spruce','birch','jungle','acacia','dark_oak','cherry','mangrove','pale_oak'];
assert.ok(T.condOk(byName('樹海').cond[0],{tally:Object.fromEntries(kinds.map(w=>['log_top:'+w,1]))}));
assert.ok(!T.condOk(byName('樹海').cond[0],{tally:Object.fromEntries(kinds.slice(1).map(w=>['log_top:'+w,1]))}));
// ore quality at mining: a natural iron ore by a 鉱夫 marks its drop; a placed one does not roll
const {installOreQuality,dropsOf}=await load('ore-quality.js');
assert.deepStrictEqual(dropsOf('minecraft:deepslate_iron_ore'),['minecraft:raw_iron','minecraft:deepslate_iron_ore']);assert.deepStrictEqual(dropsOf('minecraft:oak_log'),['minecraft:oak_log']);assert.strictEqual(dropsOf('minecraft:stone'),undefined);
p={job:'鉱夫',secondJob:'木こり',level:50};installOreQuality({game:{peek:f=>f({players:{w1:p}})}});
const orig=Math.random;Math.random=()=>0; // the best roll
const dim={id:'overworld',spawnItem:(it)=>{dim.out=it;}};
const brk=(id)=>{srv.__listeners.beforeBreak.at(-1)({player,block:{typeId:id,dimension:dim,location:{x:5,y:10,z:5}}});
 srv.__listeners.afterBreak.at(-1)({player,block:{dimension:dim,location:{x:5,y:10,z:5}},brokenBlockPermutation:{type:{id}}});};
brk('minecraft:iron_ore');
const ent={typeId:'minecraft:item',location:{x:5.5,y:10.3,z:5.5},dimension:dim,remove(){this.gone=true;},getComponent:()=>({itemStack:new srv.ItemStack('minecraft:raw_iron',2)})};
srv.__listeners.entitySpawn.at(-1)({entity:ent});assert.ok(ent.gone);assert.strictEqual(qualityOf(dim.out),4);assert.strictEqual(dim.out.amount,2);
brk('minecraft:cherry_log');Math.random=orig;
for(const f of srv.__listeners.interval)f();
assert.deepStrictEqual([tracked.ore_good,tracked.ore_top,tracked.log_top,tracked['log_top:cherry']],[1,1,1,1]);
console.log('WORKSHOP PASS',names.grind.length,names.saw.length,'buttons');
