// Static audit of the whole addon: imports, item ids, icons, components, commands, title / daily keys, property keys.
// node audit.mjs <BP> <RP>
import fs from 'fs';import path from 'path';
const BP=process.argv[2],RP=process.argv[3],S=path.join(BP,'scripts');
const files=fs.readdirSync(S).filter(f=>f.endsWith('.js'));
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(S,f),'utf8')]));
const out={};const add=(k,v)=>(out[k]??=[]).push(v);
// A. imports / exports
const exportsOf=f=>{const s=src[f];if(!s)return null;const set=new Set();
 for(const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g))set.add(m[1]);
 for(const m of s.matchAll(/export\s*\{([^}]*)\}(?:\s*from\s*'([^']+)')?/g))for(const n of m[1].split(','))set.add(n.trim().split(/\s+as\s+/).pop());
 for(const m of s.matchAll(/export\s+const\s*\{([^}]*)\}/g))for(const n of m[1].split(','))set.add(n.trim().split(':').pop().trim());
 return set;};
const EX=Object.fromEntries(files.map(f=>[f,exportsOf(f)]));
for(const f of files)for(const m of src[f].matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/([^']+)'/g)){
 const t=m[2];if(!src[t]){add('import: missing file',`${f} -> ${t}`);continue;}
 for(const n of m[1].split(',').map(x=>x.trim().split(/\s+as\s+/)[0]).filter(Boolean))if(!EX[t].has(n))add('import: missing export',`${f}: ${n} from ${t}`);
}
// B. items / entities / blocks defined
const walk=d=>fs.existsSync(d)?fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.json')?[path.join(d,e.name)]:[]):[];
const defined=new Set(),itemJson={};
for(const kind of ['items','entities','blocks'])for(const f of walk(path.join(BP,kind))){try{const j=JSON.parse(fs.readFileSync(f,'utf8'));const root=j['minecraft:item']??j['minecraft:entity']??j['minecraft:block'];const id=root?.description?.identifier;if(id){if(defined.has(id))add('defined twice',id);defined.add(id);if(kind==='items')itemJson[id]={f,root};}}catch(e){add('bad json',f+' '+e.message);}}
const used=new Map();
for(const f of files)for(const m of src[f].matchAll(/['"`](cooptown:[a-z0-9_]+)['"`]/g))if(!used.has(m[1]))used.set(m[1],f);
// C+'name' style
for(const f of files)for(const m of src[f].matchAll(/\bC\+'([a-z0-9_]+)'/g)){const id='cooptown:'+m[1];if(!used.has(id))used.set(id,f);}
const NOT_ITEMS=/^cooptown:(pack|pack_open|pack_at|pins|pin_sel|buffs|potion_cd|meal|ranch|fish_top|.*_key|.*log.*|.*_cd|.*_at|.*_sel|.*state.*|.*prefs.*|title.*|offhand|.*hp.*|.*owner.*|.*mode.*)$/;
for(const [id,f] of used)if(!defined.has(id)&&!NOT_ITEMS.test(id))add('cooptown id not defined (check: item / property / event?)',`${id}  (${f})`);
// C. icons
const tex=JSON.parse(fs.readFileSync(path.join(RP,'textures/item_texture.json'),'utf8')).texture_data;
for(const [id,{root}] of Object.entries(itemJson)){
 const icon=root.components?.['minecraft:icon'];const name=typeof icon==='string'?icon:icon?.textures?.default??icon?.texture;
 if(!name){if(!root.components?.['minecraft:block_placer'])add('item without icon',id);continue;}
 if(name.startsWith('minecraft:')||!tex[name]){if(!tex[name])add('icon not in item_texture.json',`${id} -> ${name}`);continue;}
 const t=tex[name].textures;const p=Array.isArray(t)?t[0]:typeof t==='string'?t:t.path;
 if(!['.png','.tga'].some(e=>fs.existsSync(path.join(RP,p+e))))add('icon png missing',`${id} -> ${p}`);
}
// D. custom components
const registered=new Set([...Object.values(src).join('\n').matchAll(/registerCustomComponent\('([^']+)'/g)].map(m=>m[1]));
for(const [id,{root}] of Object.entries(itemJson))for(const k of Object.keys(root.components??{}))if(k.startsWith('cooptown:')&&!registered.has(k))add('component not registered',`${id}: ${k}`);
// E. commands
const cmd=src['commands.js']??'';const wanted=new Set([...cmd.matchAll(/H\.([a-zA-Z_]+)\?\.\(/g)].map(m=>m[1]));
const provided=new Set();for(const s of Object.values(src))for(const m of s.matchAll(/setCommandHandlers\(\{([\s\S]*?)\}\);?/g))for(const k of m[1].matchAll(/(?:^|[,{\s])([a-zA-Z_]+)\s*:/g))provided.add(k[1]);
for(const w of wanted)if(!provided.has(w))add('command without handler',w);
// F. title keys: who writes them
const all=Object.values(src).join('\n');
const producers=new Set(),prefixes=new Set();
const note=k=>{if(k.includes('${'))prefixes.add(k.split('${')[0]);else producers.add(k);};
for(const m of all.matchAll(/title(?:Track|Seen|Max)\([^,]+,\s*(['`])([^'`]+)\1/g))note(m[2]);
for(const m of all.matchAll(/jobCount\([^,]+,\s*(['`])([^'`]+)\1/g))note('j:'+m[2]);
for(const m of all.matchAll(/(?:adds|tally|maxes)\[?\s*(['`])([a-z_:A-Z0-9${}.]+)\1/g))note(m[2]);
const tc=src['titles-config.js'];
const condKeys=[...tc.matchAll(/\b(c|s|has)\((['`])([^'`]+)\2/g)].map(m=>m[3]).concat([...tc.matchAll(/\bJ\('([^']+)'\)/g)].map(m=>'j:'+m[1]));
const engine=src['game-engine.js']+(src['admin-engine.js']??'')+(src['town-engine.js']??'')+(src['gacha-engine.js']??'');
for(const k of new Set(condKeys)){
 if(producers.has(k)||[...prefixes].some(p=>p&&k.startsWith(p)))continue;
 if(engine.includes(`'${k}'`)||engine.includes(k.split(':')[0]+':'))continue;
 add('title key nobody writes (check)',k);
}
const pending=[...tc.matchAll(/t\('([^']+)','([^']+)'[^\n]*?P\('([^']*)'\)/g)].map(m=>`${m[1]} ${m[2]}（${m[3]}）`);
out['titles still pending (count)']=[String(pending.length)];out['titles still pending']=pending;
// G. job daily keys
const daily=src['job-daily-config.js']??'';
for(const m of daily.matchAll(/key:'([^']+)'/g))if(!producers.has('j:'+m[1])&&![...prefixes].some(p=>('j:'+m[1]).startsWith(p)))add('daily key nobody counts',m[1]);
// H. dynamic property keys used in more than one file
const keyFiles={};for(const f of files)for(const m of src[f].matchAll(/['`](cooptown:[a-z_]+)['`]/g))if(/Property|KEY|_KEY|key/.test(src[f]))(keyFiles[m[1]]??=new Set()).add(f);
// I. entity names in lang
const lang=fs.readFileSync(path.join(RP,'texts/ja_JP.lang'),'utf8');
for(const id of defined)if(fs.existsSync(path.join(BP,'entities',id.replace('cooptown:','')+'.json'))&&!lang.includes(`entity.${id}.name=`))add('entity without ja_JP name',id);
// J. duplicate subscribe-heavy intervals (for review)
const intervals=files.map(f=>[f,(src[f].match(/runInterval\(/g)??[]).length]).filter(([,n])=>n);out['intervals per file']=[intervals.map(([f,n])=>`${f}:${n}`).join(' ')];
for(const [k,v] of Object.entries(out)){console.log(`\n## ${k} (${v.length})`);for(const x of v.slice(0,80))console.log(' '+x);}
