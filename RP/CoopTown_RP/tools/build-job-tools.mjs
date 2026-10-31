// Writes the job tools' item files (BP items/job_tools/<name>.json) and their item_texture.json entries from the BP's
// scripts/job-tools-config.js. Pictures: tools/build-job-tools.py. Run from the CoopTown_RP folder:
//   node tools/build-job-tools.mjs
import fs from 'fs';
import path from 'path';
import {pathToFileURL} from 'url';
const BP=path.resolve('../../development_behavior_packs/CoopTown_BP');
const {TOOLS}=await import(pathToFileURL(path.join(BP,'scripts/job-tools-config.js')).href);
const dir=path.join(BP,'items/job_tools');fs.mkdirSync(dir,{recursive:true});
// kinds used by pressing use (main.js custom component cooptown:job_tool)
const USED=new Set(['brush','bag','hammer','whetstone','lupe','pin']);
const HAND=new Set(['brush','hammer','knife','herb','pen','lupe','pin','lantern']);
const textures=JSON.parse(fs.readFileSync('textures/item_texture.json','utf8'));
for(const [id,t] of Object.entries(TOOLS)){
 const short=id.replace('cooptown:','');
 const c={
  'minecraft:display_name':{value:t.name},
  'minecraft:icon':{textures:{default:'cooptown_'+short}},
  'minecraft:max_stack_size':t.stack??1
 };
 if(HAND.has(t.kind))c['minecraft:hand_equipped']=true;
 if(t.offhand||t.kind==='bait')c['minecraft:allow_off_hand']=true;
 if(t.dur)c['minecraft:durability']={max_durability:t.dur,damage_chance:{min:0,max:0}};
 if(t.kind==='knife')c['minecraft:damage']={value:5};
 if(t.kind==='herb')c['minecraft:damage']={value:3};
 if(t.button)c['minecraft:interact_button']=t.button;
 if(USED.has(t.kind)){c['cooptown:job_tool']={};}
 const json={format_version:'1.21.90','minecraft:item':{description:{identifier:id,menu_category:{category:t.kind==='bait'?'items':'equipment'}},components:c}};
 fs.writeFileSync(path.join(dir,short+'.json'),JSON.stringify(json,null,2)+'\n');
 textures.texture_data['cooptown_'+short]={textures:'textures/cooptown/items/'+short};
}
fs.writeFileSync('textures/item_texture.json',JSON.stringify(textures,null,1)+'\n');
console.log('wrote',Object.keys(TOOLS).length,'items');
