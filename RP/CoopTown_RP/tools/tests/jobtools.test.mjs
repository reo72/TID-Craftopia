// Each job's own tools: config, items, pictures, recipes, lore, animations, baits, bags (food dates), helpers, titles.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3],bp=path.dirname(dir);const imp=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');
const C=await imp('job-tools-config.js'),G=await imp('game-config.js'),WB=await imp('workbench-config.js'),L=await imp('food-lore.js');
const T=await imp('job-tools.js'),B=await imp('backpack-runtime.js'),F=await imp('fish-runtime.js'),FR=await imp('freshness.js');
const JOBS=['農家','釣り師','鍛冶師','料理人','調合師','付与術師','冒険家','鉱夫','木こり']; // 鉱夫 / 木こり split from 冒険家 (2026-10-30)
const tools=Object.entries(C.TOOLS);assert.strictEqual(tools.length,26); // + the two better fish baskets (2026-10-30)
assert.deepStrictEqual([...new Set(tools.map(([,t])=>t.job))].sort(),[...JOBS].sort(),'every job has tools');
const anims=JSON.parse(fs.readFileSync(path.join(rp,'animations/cooptown_tools.animation.json'),'utf8')).animations;
const tex=JSON.parse(fs.readFileSync(path.join(rp,'textures/item_texture.json'),'utf8')).texture_data;
for(const [id,t] of tools){
 const short=id.replace('cooptown:','');
 const item=JSON.parse(fs.readFileSync(path.join(bp,'items/job_tools',short+'.json'),'utf8'))['minecraft:item'];
 assert.strictEqual(item.description.identifier,id);assert.strictEqual(item.components['minecraft:display_name'].value,t.name);
 assert.ok(tex['cooptown_'+short]&&fs.existsSync(path.join(rp,'textures/cooptown/items',short+'.png')),'picture '+id);
 const r=WB.JOB_VANILLA_RECIPES.find(r=>r.output[0]===id);assert.ok(r,'recipe '+id);assert.strictEqual(r.job,t.job);assert.strictEqual(r.jobLevel??1,t.level);
 assert.ok(r.inputs.every(([i,n])=>i&&n>0));
 assert.strictEqual(G.ITEM_NAMES[id],t.name);
 assert.ok(L.hasInfo(id));const info=L.infoParts(id);assert.ok(info.desc.length&&info.stats.some(s=>s.includes('職業Lv.')),'lore '+id);
 if(t.anim)assert.ok(anims['animation.cooptown.tool.'+t.anim],'animation '+t.anim);
 if(['brush','bag','hammer','whetstone','lupe','pin'].includes(t.kind))assert.ok(item.components['cooptown:job_tool'],'usable '+id);
 if(t.dur)assert.strictEqual(item.components['minecraft:durability'].max_durability,t.dur);
}
for(const a of ['slice','write'])assert.ok(anims['animation.cooptown.tool.'+a]);
assert.ok(fs.readFileSync(path.join(dir,'main.js'),'utf8').includes("registerCustomComponent('cooptown:job_tool'"));
assert.ok(fs.readFileSync(path.join(dir,'game-runtime.js'),'utf8').includes('installJobTools({game})'));
assert.strictEqual(typeof T.useJobTool,'function');assert.strictEqual(typeof T.installJobTools,'function');
// helpers: compass, arrows, repairs
assert.strictEqual(C.bearing({x:0,z:0},{x:0,z:-100}),'北 100m');assert.strictEqual(C.bearing({x:0,z:0},{x:50,z:50}),'南東 71m');assert.strictEqual(C.bearing({x:0,z:0},{x:1,z:0}),'ここ');
assert.strictEqual(C.arrowTo({x:0,z:0},0,{x:0,z:10}),'↑','yaw 0 looks south');assert.strictEqual(C.arrowTo({x:0,z:0},180,{x:0,z:10}),'↓');
assert.strictEqual(C.arrowTo({x:0,z:0},0,{x:-10,z:0}),'→','facing south, west is on the right');
assert.strictEqual(C.repairMaterial('minecraft:diamond_pickaxe'),'minecraft:diamond');assert.strictEqual(C.repairMaterial('minecraft:golden_helmet'),'minecraft:gold_ingot');
assert.strictEqual(C.repairMaterial('minecraft:netherite_sword'),'minecraft:netherite_scrap');assert.strictEqual(C.repairMaterial('minecraft:bow'),'minecraft:stick');
assert.strictEqual(C.repairAmount(1000,1),250);assert.strictEqual(C.repairAmount(1000,30),400);
// baits: the legend lure triples the legendary chance; job baits stand for the vanilla liked baits
assert.ok(Object.values(C.BAIT_ITEMS).every(b=>b.key==='legend'||F.BAITS.some(x=>x.key===b.key)));
{let legends=0,plain=0;const seq=k=>{let i=0;return ()=>((i++*0.618+k)%1);};
 for(let k=0;k<400;k++){const r=k/400;const pick=e=>F.chooseSpecies('minecraft:ocean',true,'legend',()=>r,e)?.rank===2;if(pick({legend:3}))legends++;if(pick({}))plain++;}
 assert.ok(legends>plain,'legend lure: more legendary '+legends+' > '+plain);}
// bags: places and what goes in
const fishId=(await imp('fish-species.js')).FISH_SPECIES[0].id;
assert.ok(B.isBag('cooptown:fish_basket')&&B.isBag('cooptown:backpack_red')&&!B.isBag('minecraft:chest'));
{const kind=C.BAGS['cooptown:fish_basket'];const r=B.packFromStacks([new srv.ItemStack(fishId,3),new srv.ItemStack('minecraft:dirt',5),new srv.ItemStack('cooptown:cool_bag',1)],kind);
 assert.deepStrictEqual(r.pack.map(e=>e.id),[fishId]);assert.deepStrictEqual(r.out.map(s=>s.typeId),['minecraft:dirt','cooptown:cool_bag']);}
{const kind=C.BAGS['cooptown:potion_holder'];const many=Array.from({length:12},()=>new srv.ItemStack('minecraft:potion',1));const r=B.packFromStacks(many,kind);assert.strictEqual(r.pack.length,9);assert.strictEqual(r.out.length,3);}
assert.ok(C.BAGS['cooptown:cool_bag'].accepts('minecraft:beef')&&!C.BAGS['cooptown:cool_bag'].accepts('minecraft:stone'));
// food dates in a cooling bag move on at half speed: 10 hours inside -> the date 5 hours later
{const H=3600000,now=Date.UTC(2026,9,27,3),date=now+20*H,at=now-10*H;
 const line='§7期限 '+FR.dateText(date)+'まで';const kind=C.BAGS['cooptown:cool_bag'];
 const a=B.agePack([{id:'minecraft:beef',n:1,lore:['x',line]},{id:'minecraft:dirt',n:1}],at,kind,now);
 assert.strictEqual(a.list[0].lore[1],'§7期限 '+FR.dateText(date+5*H)+'まで');assert.strictEqual(a.list[0].lore[0],'x');assert.strictEqual(a.carry,0);
 const past=B.agePack([{id:'minecraft:beef',n:1,lore:['§c期限切れ '+FR.dateText(at-H)]}],at,kind,now);assert.ok(past.list[0].lore[0].includes(FR.dateText(at-H)),'already expired stays');
 const short=B.agePack([{id:'minecraft:beef',n:1,lore:[line]}],now-H,kind,now);assert.strictEqual(short.list[0].lore[0],line);assert.strictEqual(short.carry,H,'under an hour carried');
 assert.strictEqual(B.agePack([{id:'x',n:1,lore:[line]}],at,undefined,now).list[0].lore[0],line,'a backpack does not keep food');}
// the bait / repair titles can be earned now
const TC=await imp('titles-config.js');const all=TC.TITLE_GROUPS.flatMap(g=>g.titles??g.list??[]);
const find=n=>JSON.stringify(TC.TITLE_GROUPS).includes(n);assert.ok(find('何でも直す屋'));
const src=fs.readFileSync(path.join(dir,'titles-config.js'),'utf8');
for(const n of ['適材適所','餌代がかさむ','何でも直す屋','大改造'])assert.ok(!new RegExp(`'${n}'[^\\n]*P\\(`).test(src),n+' not pending');
assert.ok(fs.readFileSync(path.join(dir,'rune-runtime.js'),'utf8').includes('penSave(player)'));
console.log('JOBTOOLS PASS');
