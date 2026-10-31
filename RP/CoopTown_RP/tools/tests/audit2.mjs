import fs from 'fs';import path from 'path';import {pathToFileURL} from 'url';
const S=process.argv[2],BP=path.dirname(S);const imp=f=>import(pathToFileURL(path.join(S,f)).href);
const G=await imp('game-config.js'),WB=await imp('workbench-config.js');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const items=new Set(walk(path.join(BP,'items')).map(f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))['minecraft:item'].description.identifier;}catch{return null;}}).filter(Boolean));
const blocks=fs.existsSync(path.join(BP,'blocks'))?new Set(walk(path.join(BP,'blocks')).map(f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))['minecraft:block'].description.identifier;}catch{return null;}})):new Set();
const ok=id=>!id.startsWith('cooptown:')||items.has(id)||blocks.has(id);
const out=(k,v)=>console.log(k+': '+v);
for(const id of items)if(!G.ITEM_NAMES[id])out('no ITEM_NAMES',id);
const recipes=[...(G.WORKBENCH_RECIPES??[]),...(G.RECIPES??[])];
const seen={};
for(const r of recipes){const o=r.output?.[0];if(!o)continue;
 if(!ok(o))out('recipe output undefined',o);
 for(const [i] of r.inputs??[])if(typeof i==='string'&&!ok(i))out('recipe input undefined',`${r.name}: ${i}`);
 const key=o+'|'+(r.job??'');(seen[o]??=[]).push(`${r.name}[${r.job??'共通'}${r.jobLevel?' Lv'+r.jobLevel:''}]`);}
for(const [o,l] of Object.entries(seen))if(l.length>1)out('several recipes for',`${o}: ${l.join(' / ')}`);
const JOBS=new Set(G.JOBS);
for(const f of fs.readdirSync(S).filter(f=>f.endsWith('.js'))){const s=fs.readFileSync(path.join(S,f),'utf8');
 for(const m of s.matchAll(/job:\s*'([^']+)'/g))if(!JOBS.has(m[1]))out('unknown job name',`${f}: ${m[1]}`);}
