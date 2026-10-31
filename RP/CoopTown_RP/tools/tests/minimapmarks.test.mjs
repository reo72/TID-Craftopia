// The world map's own marks (base, flags) show on the minimap, as the world map's show settings say.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const M=await load('minimap.js'),{MAP_GLYPHS}=await load('map-glyphs.js');
const wm={base:{dim:'minecraft:overworld',x:8.7,z:-3.2},flags:[{dim:'minecraft:overworld',x:4,z:6,name:'a'},{dim:'minecraft:nether',x:0,z:0}],track:false};
let m=M.worldMapMarks(JSON.stringify(wm),'minecraft:overworld');
assert.deepStrictEqual(m,[{x:8,z:-4,key:'base',clamp:false},{x:4,z:6,key:'landmark_found'}]);
assert.strictEqual(M.worldMapMarks(JSON.stringify({...wm,track:true}),'minecraft:overworld')[0].clamp,true,'tracked base stays on the edge');
assert.deepStrictEqual(M.worldMapMarks(JSON.stringify({...wm,show:{flag:false,town:false}}),'minecraft:overworld'),[],'hidden on the world map, hidden here');
assert.deepStrictEqual(M.worldMapMarks(undefined,'minecraft:overworld'),[]);assert.deepStrictEqual(M.worldMapMarks('{bad','minecraft:overworld'),[]);
// on the map: the flag in range shows; the untracked base out of range does not
const text=M.drawMap({cx:0,cz:0,zoom:1,dir:0,tileAt:()=>'grass',markers:m});
assert.ok(text.includes(MAP_GLYPHS['marker:landmark_found']));assert.ok(text.includes(MAP_GLYPHS['marker:base']),'base 8 blocks away is on the 21-cell map');
const far=M.drawMap({cx:0,cz:0,zoom:1,dir:0,tileAt:()=>'grass',markers:[{x:500,z:0,key:'base',clamp:false}]});assert.ok(!far.includes(MAP_GLYPHS['marker:base']));
console.log('minimap marks ok');
