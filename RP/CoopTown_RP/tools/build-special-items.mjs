// Item files for the job-only special materials (BP scripts/special-config.js is the list).
// Writes BP items/<name>.json and the RP textures/item_texture.json entries (placeholder vanilla pictures
// until real ones exist: change "texture" in special-config.js and run this again).
// Run from the CoopTown_RP folder: node tools/build-special-items.mjs
import fs from 'fs';import path from 'path';import {pathToFileURL} from 'url';
const BP=path.resolve('../../development_behavior_packs/CoopTown_BP');
const {SPECIAL_ITEMS}=await import(pathToFileURL(path.join(BP,'scripts','special-config.js')).href);
const tex=JSON.parse(fs.readFileSync('textures/item_texture.json','utf8'));
for(const [id,{name,texture}] of Object.entries(SPECIAL_ITEMS)){
 const short=id.split(':')[1],key='cooptown_'+short;
 const item={format_version:'1.21.90','minecraft:item':{description:{identifier:id,menu_category:{category:'items'}},components:{
  'minecraft:display_name':{value:name},'minecraft:icon':{textures:{default:key}},'minecraft:max_stack_size':64}}};
 fs.writeFileSync(path.join(BP,'items',short+'.json'),JSON.stringify(item,null,2)+'\n');
 tex.texture_data[key]={textures:texture};
}
fs.writeFileSync('textures/item_texture.json',JSON.stringify(tex,null,2)+'\n');
console.log('special items:',Object.keys(SPECIAL_ITEMS).length);
