// Every BP script loads (imports resolve, no syntax errors) and installGame runs without throwing.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2];const bad=[];
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort()){try{await import(pathToFileURL(path.join(dir,f)).href);}catch(e){bad.push(f+': '+(e.message??e).split('\n')[0]);}}
assert.deepStrictEqual(bad,[],bad.join('\n'));
const G=await import(pathToFileURL(path.join(dir,'game-runtime.js')).href);
try{G.installGame();}catch(e){assert.fail('installGame: '+e.message);}
console.log('LOADALL PASS',fs.readdirSync(dir).filter(f=>f.endsWith('.js')).length,'modules');
