// 魔力のルーペ picks another player near where you look, never yourself.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const J=await import(pathToFileURL(path.join(dir,'job-tools.js')).href);
const at=(id,x,z)=>({id,location:{x,y:64,z}});
const others=[at('me',0,0),at('ahead',0,-4),at('side',4,0),at('far',0,-20)];
const me={id:'me',location:{x:0,y:64,z:0},getHeadLocation:()=>({x:0,y:65.6,z:0}),getViewDirection:()=>({x:0,y:0,z:-1}),
 dimension:{getPlayers:({maxDistance})=>others.filter(o=>Math.hypot(o.location.x,o.location.z)<=maxDistance)}};
assert.strictEqual(J.inSight(me,J.LUPE.range,J.LUPE.degrees)?.id,'ahead');
me.getViewDirection=()=>({x:1,y:0,z:0});assert.strictEqual(J.inSight(me,J.LUPE.range,J.LUPE.degrees)?.id,'side');
me.getViewDirection=()=>({x:-1,y:0,z:0});assert.strictEqual(J.inSight(me,J.LUPE.range,J.LUPE.degrees),undefined,'nobody that way: not yourself either');
console.log('lupe ok');
