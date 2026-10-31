// profiler.js: timers and event handlers registered after it are timed and named by file:line; the report lists them.
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2];
const {system,world,__listeners}=await import('@minecraft/server');
world.afterEvents.playerLeave; // the stub makes signals when first read; the game's exist from the start
const {profReport,profReset}=await import(pathToFileURL(BP+'/profiler.js'));
profReset();
system.runInterval(()=>{const t=Date.now();while(Date.now()-t<15);},1);
world.afterEvents.playerLeave.subscribe(()=>{});
for(const f of __listeners.interval)f();
__listeners.leave.at(-1)({playerId:'x'});
const lines=profReport();
assert.match(lines[0],/TPS/);
const row=lines.find(l=>l.includes('every'));
assert.ok(row&&/profiler\.test\.mjs:\d+ every/.test(row),lines.join('\n'));
assert.ok(lines.some(l=>l.includes('after:playerLeave')),lines.join('\n'));
assert.match(row,/1回 最大1[5-9]ms|1回 最大[2-9]\dms/);
console.log(lines.join('\n'));
