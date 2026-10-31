// Generates ui/cooptown_gacha.json: the chest opening after a gacha draw (BP gacha-show.js), with the user's pictures
// (tools/import-gacha-ui.py) and the timing of their notes. Form title "ct:gacha" plays it; "ct:gacha_end" is the same
// screen at its end (the skip button: a running animation cannot be jumped, so the form is shown again).
// Positions in px of a 1672 x 941 screen. Run: node tools/build-gacha-ui.mjs   (from the CoopTown_RP folder)
//
// Buttons (GACHA_BUTTONS in gacha-show.js): 0 the rarity mark [gc] / [gE] / [gL]   1 the gacha's name   2 the prize icon
// (the button's image)   3 the best rarity's name   4 unused   5 the button under the chest   6-15 the prizes: picture and name
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/gacha_ui/',NS='cooptown_gacha',BG={w:1672,h:941};
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const INK=[.2,.11,.05],CREAM=[.98,.93,.8];
// ---- timed steps: each list of steps is a chain of animations in the namespace ----
const anims={};let serial=0;
function chain(steps){
 const first=serial;
 steps.forEach((s,i)=>{const [kind,...v]=s,next=i<steps.length-1?{next:`@${NS}.a${first+i+1}`}:{};
  anims['a'+(first+i)]=kind==='wait'?{anim_type:'wait',duration:v[0],...next}
   :{anim_type:kind,easing:'linear',from:v[0],to:v[1],duration:v[2],...next};});
 serial+=steps.length;return `@${NS}.a${first}`;
}
const fade=(steps)=>chain(steps.map(s=>s[0]==='wait'?s:['alpha',...s]));
const label=({scale=1,color=INK,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5});
const textOf=prefix=>[textBinding,view(`('§r' + (#form_button_text - '${prefix}'))`,'#text')];
const LATE=3.3; // the result comes up
// the rarity's flash after the blue one: one mark is always sent, so each picture checks only its own
const accent=(tex,mark,played)=>({['glow_'+tex]:{type:'image',texture:T+'glow_'+tex,keep_ratio:false,layer:6,size:['100%','100%'],
 bindings:[textBinding,view(has(mark),'#visible')],alpha:played?0:0,
 ...(played?{anims:[fade([['wait',1.4],[0,1,.4],['wait',.2],[1,0,.5]]),chain([['wait',1.8],['size',['70%','70%'],['130%','130%'],.7]])]}:{})}});
// the prizes on the panel, two across and five down (2026-10-31: pictures instead of a list), each coming up in turn
const CELL={x:1070,y:268,w:185,h:102};
const iconBindings=[{binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}];
const prizeCells=played=>Array.from({length:10},(_,k)=>{
 const pop=()=>played?{alpha:0,anims:[fade([['wait',LATE+k*.08],[0,1,.25]])]}:{};
 return {['cell_'+k]:{type:'panel',collection_index:6+k,...box(CELL.x+(k%2)*CELL.w,CELL.y+Math.floor(k/2)*CELL.h,CELL.w,CELL.h),layer:6,
  bindings:[textBinding,view("(not (#form_button_text = 'ct:gs|'))",'#visible')],controls:[
  {icon:{type:'image',keep_ratio:true,size:['100%','62%'],anchor_from:'top_middle',anchor_to:'top_middle',layer:7,bindings:iconBindings,...pop()}},
  {name:{...label({scale:.8,anchor:'bottom_middle'}),layer:7,bindings:textOf('ct:gs|'),...pop()}}]}};});
function screen(title,played){
 const shake=[...Array(5)].flatMap(()=>[['offset',[0,0],[-2,0],.05],['offset',[-2,0],[2,0],.1],['offset',[2,0],[0,0],.05]]);
 const open=played?{alpha:0,anims:[fade([['wait',2],[0,1,.05]])]}:{alpha:1};
 const chest=[
  ...(played?[{chest_closed:{type:'image',texture:T+'chest_closed',keep_ratio:false,size:['100%','100%'],layer:3,alpha:0,anims:[fade([[0,1,.4],['wait',1.4],[1,0,.05]])]}},
   {chest_half:{type:'image',texture:T+'chest_half',keep_ratio:false,size:['100%','100%'],layer:4,alpha:0,anims:[fade([['wait',1.8],[0,1,.05],['wait',.15],[1,0,.05]])]}}]:[]),
  {chest_open:{type:'image',texture:T+'chest_open',keep_ratio:false,size:['100%','100%'],layer:5,...open}}];
 const appear=played?{alpha:0,anims:[fade([['wait',LATE],[0,1,.4]])]}:{};
 const parts=[
  {dim:{type:'image',texture:'textures/ui/Black',keep_ratio:false,size:['100%','100%'],alpha:.6,layer:0}},
  {frame:{type:'image',texture:T+'screen_frame',keep_ratio:false,size:['100%','100%'],layer:1}},
  {magic_circle:{type:'image',texture:T+'magic_circle',keep_ratio:false,...box(220,500,500,333),layer:2,...(played?{alpha:0,anims:[fade([[0,.8,.8]])]}:{alpha:.8})}},
  {stage:{type:'panel',...box(250,215,440,440),layer:3,controls:[{shaker:{type:'panel',size:['100%','100%'],...(played?{anims:[chain([['wait',.4],...shake])]}:{}),controls:chest}}]}},
  {reward_panel:{type:'image',texture:T+'reward_panel',keep_ratio:false,...box(960,40,580,861),layer:2,...appear}},
  {rarity_badge:{type:'image',texture:T+'rarity_badge',keep_ratio:false,...box(1030,110,440,147),layer:3,...appear}},
  {title_plate:{type:'image',texture:T+'title_plate',keep_ratio:false,...box(235,20,470,188),layer:3}},
  // the button's look stays outside the button: a hover state would run its own copy of the timing
  {button_skip:{type:'image',texture:T+'button_skip',keep_ratio:false,...box(270,785,400,134),layer:3,...(played?{anims:[fade([['wait',LATE],[1,0,.2]])]}:{visible:false})}},
  {skip_text:{type:'panel',...box(270,785,400,134),layer:5,controls:[{t:{...label({scale:1.2,color:CREAM,size:['default','default']}),text:'スキップ',...(played?{anims:[fade([['wait',LATE],[1,0,.2]])]}:{visible:false})}}]}},
  {button_green:{type:'image',texture:T+'button_green',keep_ratio:false,...box(270,772,400,160),layer:3,...appear}},
  {ok_text:{type:'panel',...box(270,772,400,160),layer:5,controls:[{t:{...label({scale:1.3,color:CREAM,size:['default','default']}),text:'受け取る',...appear}}]}}];
 const slots=[
  {mark:{type:'panel',collection_index:0,...box(100,65,740,740),layer:6,controls:[
   ...(played?[{glow_blue:{type:'image',texture:T+'glow_blue',keep_ratio:false,size:['100%','100%'],layer:6,alpha:0,anims:[fade([['wait',.4],[0,.9,1],[.9,0,.4]]),chain([['wait',.4],['size',['50%','50%'],['100%','100%'],1]])]}},
    accent('blue','[gc]',true),accent('purple','[gE]',true),accent('gold','[gL]',true)]:[])]}},
  {name:{type:'panel',collection_index:1,...box(235,20,470,188),layer:6,controls:[{t:{...label({scale:1.25}),bindings:textOf('ct:gs|')}}]}},
  {prize:{type:'panel',collection_index:2,...box(395,290,150,150),layer:7,controls:[{icon:{type:'image',keep_ratio:true,size:['100%','100%'],layer:7,
   bindings:[{binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
    {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}],
   ...(played?{alpha:0,anims:[fade([['wait',2.5],[0,1,.3]]),chain([['wait',2.5],['offset',[0,20],[0,0],.8]])]}:{})}}]}},
  {best:{type:'panel',collection_index:3,...box(1030,110,440,147),layer:6,controls:[{t:{...label({scale:1.25,color:CREAM}),...appear,bindings:textOf('ct:gs|')}}]}},
  ...prizeCells(played),
  {'done@common.button':{collection_index:5,...box(270,772,400,160),$pressed_button_name:'button.form_button_click',layer:10,
   bindings:[{binding_type:'collection_details',binding_collection_name:'form_buttons'}],default_control:'normal_look',hover_control:'hover_look',pressed_control:'pressed_look',
   controls:[{normal_look:{type:'panel',size:['100%','100%']}},{hover_look:{type:'image',texture:T+'button_green',keep_ratio:false,size:['100%','100%'],alpha:.15}},{pressed_look:{type:'panel',size:['100%','100%']}}]}}];
 return {type:'panel',size:[`${BG.w/BG.h*100}%y`,'100%'],anchor_from:'center',anchor_to:'center',layer:10,
  bindings:[{binding_name:'#title_text'},view(`(#title_text = '${title}')`,'#visible')],
  controls:[...parts,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls:slots}}]};
}
const out={namespace:NS,root:screen('ct:gacha',true),root_end:screen('ct:gacha_end',false),...anims};
fs.writeFileSync('ui/cooptown_gacha.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_gacha.json')){defs.ui_defs.push('ui/cooptown_gacha.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: show the screens for their titles (the game's own form already hides for every "ct:" title)
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
for(const [route,title] of [[`gacha@${NS}.root`,'ct:gacha'],[`gacha_end@${NS}.root_end`,'ct:gacha_end']]){
 const ctl={[route]:{layer:100}},at=host.findIndex(c=>c[route]);if(at>=0)host[at]=ctl;else host.push(ctl);
}
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_gacha.json,',Object.keys(anims).length,'timed steps');
