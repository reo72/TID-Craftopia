// daily-plan.js / restart-notice.js / the codex (2026-10-30)
import assert from 'node:assert';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],imp=f=>import(pathToFileURL(BP+'/'+f));
const D=await imp('daily-plan.js'),{DAILY,CODEX}=await imp('game-config.js'),{JOB_COUNT_KEYS}=await imp('job-daily-config.js'),R=await imp('restart-notice.js');
const a=D.commonDailies('playerA','2026-10-30'),b=D.commonDailies('playerB','2026-10-30');
assert.strictEqual(a.length,DAILY.length);assert.deepStrictEqual(a,D.commonDailies('playerA','2026-10-30'),'the same all day');
const ids=Array.from({length:12},(_,i)=>'p'+i),sets=new Set(ids.map(id=>JSON.stringify(D.commonDailies(id,'2026-10-30'))));
assert.ok(sets.size>6,'players get different dailies');
for(const [,key] of D.COMMON_POOL)if(key.startsWith('j:'))assert.ok(JOB_COUNT_KEYS.has(key.slice(2)),key+' is counted');
const j=D.jobDailies('playerA','2026-10-30','釣り師');assert.strictEqual(j.length,3);assert.ok(j.every(t=>t[2]>=1));
// restart notices: 10 / 5 / 1 minutes before 0 / 6 / 12 / 18 (Japan time)
const at=(h,m)=>Date.UTC(2026,9,30,h,m,30)-9*3600000;
assert.strictEqual(R.minutesToRestart(at(5,50)),10);assert.strictEqual(R.minutesToRestart(at(11,55)),5);assert.strictEqual(R.minutesToRestart(at(23,59)),1);assert.strictEqual(R.minutesToRestart(at(9,0)),undefined);
// the codex has every mob
assert.ok(CODEX.filter(v=>v[2]==='敵モブ').length>=30&&CODEX.filter(v=>v[2]==='友好モブ').length>=30);
assert.strictEqual(new Set(CODEX.map(v=>v[0])).size,CODEX.length,'no duplicates');
console.log('ok');
