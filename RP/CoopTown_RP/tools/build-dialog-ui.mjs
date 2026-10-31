// Notebook-style dialog for confirmations, choices and notices (BP: scripts/dialog.js).
// The script sends an ActionForm titled "ct:dialog" (up to 6 buttons, sized to its content) or
// "ct:dialog_list" (more buttons, fixed height with a scroll bar). The first button carries the title
// ("d:t|..."), the others "d:ok|", "d:no|" or "d:btn|" + text, which picks the button picture.
// Writes ui/cooptown_dialog.json. Run from the CoopTown_RP folder: node tools/build-dialog-ui.mjs
import {VANILLA_COND} from './form-route.mjs';
import {pixelFont} from './pixel-font.mjs';
import fs from 'fs';
const INK=[0.22,0.09,0.05];
const collection=name=>({binding_type:'collection',binding_collection_name:'form_buttons',binding_name:name,binding_name_override:name});
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const STYLES=[['ok','textures/cooptown/pages/button_confirm',[1,1,1]],['btn','textures/cooptown/pages/button_neutral',INK],['no','textures/cooptown/pages/button_back',[1,1,1]]];
const has=prefix=>`(not ((#form_button_text - '${prefix}') = #form_button_text))`;
// label + the same label half a pixel to the right: the game's Japanese font has no bold
const bold=(name,props)=>[{[name]:props},{[name+'_bold']:{...props,offset:[(props.offset?.[0]??0)+0.5,props.offset?.[1]??0]}}];

function face(state){
 const controls=[];
 for(const [style,texture,color] of STYLES){
  controls.push({['bg_'+style]:{type:'image',texture,size:['100%','100%'],keep_ratio:false,layer:1,bindings:[collection('#form_button_text'),view(has(`d:${style}|`),'#visible')]}});
  controls.push(...bold('text_'+style,{type:'label',text:'#text',color,shadow:false,localize:false,font_scale_factor:1,text_alignment:'center',size:['100% - 16px','default'],layer:3,
   bindings:[collection('#form_button_text'),view(`(#form_button_text - 'd:${style}|')`,'#text'),view(has(`d:${style}|`),'#visible')]}));
 }
 if(state==='hover')controls.push({highlight:{type:'image',texture:'textures/cooptown/solid',size:['100%','100%'],keep_ratio:false,color:[1,0.85,0.4],alpha:0.18,layer:2}});
 if(state==='pressed')controls.push({shade:{type:'image',texture:'textures/cooptown/solid',size:['100%','100%'],keep_ratio:false,color:[0.2,0.08,0],alpha:0.2,layer:2}});
 return {type:'panel',size:['100%','100%'],offset:state==='pressed'?[0,1]:[0,0],controls};
}
const ui={
 namespace:'cooptown_dialog',
 // one row of the button list; the title entry ("d:t|") is hidden, so the stack skips it
 item:{type:'panel',size:['100%',30],bindings:[collection('#form_button_text'),view(`((#form_button_text - 'd:t|') = #form_button_text)`,'#visible')],controls:[
  {'button@common.button':{size:['100%',26],anchor_from:'top_middle',anchor_to:'top_middle','$pressed_button_name':'button.form_button_click',
   bindings:[{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
   default_control:'normal',hover_control:'hover',pressed_control:'pressed',
   controls:[{normal:face('normal')},{hover:face('hover')},{pressed:face('pressed')}]}}]},
 buttons:{type:'stack_panel',orientation:'vertical',size:['100%','100%c'],
  factory:{name:'buttons',control_ids:{button:'@cooptown_dialog.item'}},collection_name:'form_buttons',
  bindings:[{binding_name:'#form_button_contents',binding_name_override:'#collection_length'}]},
 // title (from the first button) and the body text
 head:{type:'stack_panel',orientation:'vertical',size:['100%','100%c'],controls:[
  {title_row:{type:'collection_panel',collection_name:'form_buttons',size:['100%','100%c'],controls:[
   {title_box:{type:'panel',collection_index:0,size:['100%','100%c'],controls:bold('title',{type:'label',text:'#text',color:INK,shadow:false,localize:false,font_scale_factor:1.3,text_alignment:'center',size:['100%','default'],
    bindings:[collection('#form_button_text'),view(`(#form_button_text - 'd:t|')`,'#text')]})}}]}},
  {rule:{type:'panel',size:['100%',9],controls:[{line:{type:'image',texture:'textures/cooptown/solid',color:[0.6,0.35,0.18],alpha:0.6,size:['90%',1],keep_ratio:false}}]}},
  {body:{type:'label',text:'#form_text',color:INK,shadow:false,localize:false,font_scale_factor:1,text_alignment:'left',size:['100%','default'],bindings:[{binding_name:'#form_text'}]}},
  {gap:{type:'panel',size:['100%',10]}}
 ]},
 content:{type:'stack_panel',orientation:'vertical',size:['100%','100%c'],controls:[{'head@cooptown_dialog.head':{}},{'buttons@cooptown_dialog.buttons':{}}]},
 dim:{type:'image',texture:'textures/cooptown/solid',color:[0,0,0],alpha:0.45,size:['300%','300%'],keep_ratio:false,layer:0},
 // up to 6 buttons: the card grows with its content
 small:{type:'panel',size:['100%','100%'],controls:[
  {'dim@cooptown_dialog.dim':{}},
  {box:{type:'panel',size:[240,'100%cm'],max_size:['90%','90%'],anchor_from:'center',anchor_to:'center',layer:5,controls:[
   {background:{type:'image',texture:'textures/cooptown/widgets/tile',keep_ratio:false,size:['100%','100%sm + 28px'],layer:1}},
   {'content@cooptown_dialog.content':{size:['100% - 32px','100%c'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,14],layer:2}}
  ]}}
 ]},
 // many buttons: fixed height, scroll bar
 list:{type:'panel',size:['100%','100%'],controls:[
  {'dim@cooptown_dialog.dim':{}},
  {box:{type:'panel',size:[270,'80%'],anchor_from:'center',anchor_to:'center',layer:5,controls:[
   {background:{type:'image',texture:'textures/cooptown/widgets/tile',keep_ratio:false,size:['100%','100%'],layer:1}},
   {'scrolling_panel@common.scrolling_panel':{size:['100% - 24px','100% - 28px'],anchor_from:'center',anchor_to:'center',layer:2,
    '$show_background':false,'$scrolling_content':'cooptown_dialog.content','$scroll_size':[5,'100% - 4px'],'$scrolling_pane_size':['100% - 8px','100%'],'$scrolling_pane_offset':[0,0],'$scroll_bar_right_padding_size':[0,0]}}
  ]}}
 ]}
};
// ---- input screens (ModalForm titled "ct:in|<title>") ----
// The game's own field controls (text box, dropdown, toggle, slider) are kept and sit on a dark panel
// (their text is light); the card, title and submit button are notebook style.
const isInput="(not ((#title_text - 'ct:in|') = #title_text))";
const submitFace=state=>({type:'panel',size:['100%','100%'],offset:state==='pressed'?[0,1]:[0,0],controls:[
 {bg:{type:'image',texture:'textures/cooptown/pages/button_confirm',size:['100%','100%'],keep_ratio:false,layer:1}},
 ...bold('text',{type:'label',text:'#submit_text',color:[1,1,1],shadow:false,localize:false,text_alignment:'center',layer:3,bindings:[{binding_name:'#submit_text'}]}),
 ...(state==='hover'?[{highlight:{type:'image',texture:'textures/cooptown/solid',size:['100%','100%'],keep_ratio:false,color:[1,0.85,0.4],alpha:0.18,layer:2}}]:[])]});
ui.input_content={type:'stack_panel',orientation:'vertical',size:['100%','100%c'],controls:[
 {title_box:{type:'panel',size:['100%','100%c'],controls:bold('title',{type:'label',text:'#text',color:INK,shadow:false,localize:false,font_scale_factor:1.3,text_alignment:'center',size:['100%','default'],
  bindings:[{binding_name:'#title_text'},view("(#title_text - 'ct:in|')",'#text')]})}},
 {rule:{type:'panel',size:['100%',9],controls:[{line:{type:'image',texture:'textures/cooptown/solid',color:[0.6,0.35,0.18],alpha:0.6,size:['90%',1],keep_ratio:false}}]}},
 {fields:{type:'panel',size:['100%','100%c + 8px'],controls:[
  {back:{type:'image',texture:'textures/cooptown/solid',color:[0.24,0.13,0.07],alpha:0.92,size:['100%','100%'],keep_ratio:false,layer:1}},
  {'generated@server_form.generated_contents':{size:['100% - 10px','100%c'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,4],layer:2}}
 ]}},
 {gap:{type:'panel',size:['100%',8]}},
 {'submit@common.button':{size:['100%',28],'$pressed_button_name':'button.submit_custom_form',default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  bindings:[{binding_name:'#submit_button_visible',binding_name_override:'#visible'}],
  controls:[{normal:submitFace('normal')},{hover:submitFace('hover')},{pressed:submitFace('pressed')}]}}
]};
ui.input={type:'panel',size:['100%','100%'],controls:[
 {'dim@cooptown_dialog.dim':{}},
 {box:{type:'panel',size:[300,'80%'],anchor_from:'center',anchor_to:'center',layer:5,controls:[
  {background:{type:'image',texture:'textures/cooptown/widgets/tile',keep_ratio:false,size:['100%','100%'],layer:1}},
  {'scrolling_panel@common.scrolling_panel':{size:['100% - 24px','100% - 28px'],anchor_from:'center',anchor_to:'center',layer:2,
   '$show_background':false,'$scrolling_content':'cooptown_dialog.input_content','$scroll_size':[5,'100% - 4px'],'$scrolling_pane_size':['100% - 8px','100%'],'$scrolling_pane_offset':[0,0],'$scroll_bar_right_padding_size':[0,0]}}
 ]}}
]};
pixelFont(ui); // all text in the pixel font (tools/pixel-font.mjs)
fs.writeFileSync('ui/cooptown_dialog.json',JSON.stringify(ui,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_dialog.json')){defs.ui_defs.push('ui/cooptown_dialog.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: route the two titles to the dialog and keep the vanilla form hidden for them (add-only)
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
const vanilla=host[0].vanilla_host.bindings.find(b=>b.target_property_name==='#visible');
for(const t of ['ct:dialog','ct:dialog_list'])if(!vanilla.source_property_name.includes(`'${t}'`))vanilla.source_property_name=`(${vanilla.source_property_name} and (not (#title_text = '${t}')))`;
// Rebuild the condition two terms at a time, ((a or b) or c): a longer chain like (a or b or c) does not seem
// to evaluate in game (the stress bolts never lit), which would also leave the vanilla form showing behind
// the custom screens.
{
 const titles=[...new Set([...vanilla.source_property_name.matchAll(/#title_text = '([^']*)'/g)].map(m=>m[1]))];
 // balanced: the two halves joined recursively, so 94 titles nest only ~7 levels deep
 const pair=(op,terms)=>terms.length===1?terms[0]:`(${pair(op,terms.slice(0,terms.length>>1))} ${op} ${pair(op,terms.slice(terms.length>>1))})`;
 // written with "and" only, (not a) and (not b) ...: an "or" never seemed to come out true in game
 vanilla.source_property_name=VANILLA_COND; // tools/form-route.mjs
}
const blocker=host.find(c=>c.vanilla_blocker);
if(blocker)blocker.vanilla_blocker.bindings.find(b=>b.target_property_name==='#visible').source_property_name='(not '+vanilla.source_property_name+')';
for(const [key,root,t] of [['dialog_small','small','ct:dialog'],['dialog_list','list','ct:dialog_list']]){
 const name=`${key}@cooptown_dialog.${root}`;
 if(!host.some(c=>c[name]))host.push({[name]:{layer:100,bindings:[{binding_name:'#title_text'},view(`(#title_text = '${t}')`,'#visible')]}});
}
// input screens: the custom form factory makes a host with the vanilla form (other titles) and ours
const factory=sf.main_screen_content.controls.find(c=>c.server_form_factory).server_form_factory;
factory.control_ids.custom_form='@server_form.cooptown_custom_host';
sf.cooptown_custom_host={type:'panel',size:['100%','100%'],controls:[
 {vanilla_custom:{type:'panel',size:['100%','100%'],bindings:[{binding_name:'#title_text'},view(`(not ${isInput})`,'#visible')],controls:[{'dialog@server_form.custom_form':{}}]}},
 {'notebook_input@cooptown_dialog.input':{bindings:[{binding_name:'#title_text'},view(isInput,'#visible')]}}
]};
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_dialog.json and routed ct:dialog / ct:dialog_list');
