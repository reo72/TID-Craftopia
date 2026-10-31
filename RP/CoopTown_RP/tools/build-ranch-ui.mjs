// Generates ui/cooptown_ranch.json: the farmer's feeding station (飼育台, BP ranch-runtime.js / ranch-ui.js) on the user's
// mockups (tools/assets/ranch_ui/previews, 1672 x 941; positions below in their px), and routes the titles in
// ui/server_form.json (add-only). Pictures: tools/assets/ranch_ui, cut by tools/import-ranch-assets.py to
// textures/cooptown/ranch/.
// Run: node tools/build-ranch-ui.mjs   (from the CoopTown_RP folder)
//
// Screens (form title -> button order, see ranch-ui.js):
//  ct:ranch       main: 0-4 stat values, 5-8 the four actions ([off] greyed), 9 close
//  ct:ranch_list  list / register (same design): 0 title, 1 count, 2 back, 3 right button, 4 empty note, then per
//                 row three entries: "r|name\nage" (button, icon = the animal), "h|hp" (health), "s|status"
//                 (marks [ok] can be cared for, [wait] clock, [dist] distance, [bonus] bonus star with a small label)
//  ct:ranch_feed  0 back, 1 close, per feed k: 2+5k name, 3+5k material names, 4+5k have / need, 5+5k effect,
//                 6+5k choose ([off])
//  ct:ranch_dlg   0 title, 1 message ([p_<picture>] picks the picture), 2 note box, 3 green button ([solo] centred),
//                 4 grey button
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/ranch/',UI=T+'ui/',IC=T+'icons/',FEED=T+'feed/',SOLID='textures/cooptown/solid';
const pc=v=>(Math.round(v*100000)/1000)+'%';
const boxIn=C=>(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/C.w),pc(y/C.h)],size:[pc(w/C.w),pc(h/C.h)]});
const inner=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[x+'%',y+'%'],size:[w+'%',h+'%']});
const CREAM=[.96,.93,.85],GOLD=[1,.86,.4],GREY=[.72,.72,.7],WHITE=[1,1,1];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_name_override:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const textureBinding={binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const PICTURES={p_growth:FEED+'growth',p_quality:FEED+'quality',p_breed:FEED+'breeding',p_success:IC+'success',p_warning:IC+'warning',
 p_full:IC+'registry',p_care:IC+'care_heart',p_register:IC+'register',p_distant:IC+'distant'};
const MARKS=['r|','h|','s|','[off]','[ok]','[wait]','[dist]','[bonus]','[solo]',...Object.keys(PICTURES).map(p=>`[${p}]`)];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default'],text}={})=>({type:'label',text:text??'#text',font_type:PIXEL_FONT,size,
 anchor_from:anchor,anchor_to:anchor,font_scale_factor:scale,color,shadow:true,localize:false,text_alignment:align,layer:6,
 ...(text?{}:{bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]})});
const textIn=(place,opts)=>({type:'panel',...place,layer:6,controls:[{t:label(opts)}]});
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>state==='hover'?[img(SOLID,{layer:4,color:[1,.95,.7],alpha:.14})]:[];
// button control names must not be normal / hover / pressed (a button called 'normal' could not be pressed in game)
function button(name,index,place,look,extraBindings=[]){
 return {[name+'@common.button']:{...(index===undefined?{}:{collection_index:index}),...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'},...extraBindings],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
// green plate (grey when [off]), optional fixed icon at the left, text in the middle, ">" at the right
const greenLook=({icon,iconBox=[4,12,22,76],scale=1.3,arrow=false}={})=>state=>panel([
 when(`(not ${has('[off]')})`,img(UI+(state==='normal'?'button_normal':'button_pressed'),{layer:1})),
 when(has('[off]'),img(UI+'button_disabled',{layer:1})),
 ...(icon?[img(icon,{layer:3,keep_ratio:true,...inner(...iconBox)})]:[]),
 textIn(icon?inner(27,0,62,100):inner(4,0,92,100),{scale,color:CREAM}),
 ...(arrow?[textIn(inner(90,0,8,100),{scale:1.4,text:'>',color:CREAM})]:[]),
 ...glow(state)]);
const greyLook=({scale=1.2}={})=>state=>panel([img(UI+'button_disabled',{layer:1}),textIn(inner(4,0,92,100),{scale,color:WHITE}),...glow(state)]);
const closeLook=state=>panel([img(UI+'close_button',{layer:1}),...glow(state)]);
const dim={dim:img(SOLID,{color:[0,0,0],alpha:.45,size:['300%','300%'],layer:0})};
const routeRoot=(C,height,title,controls)=>({type:'panel',size:[`${C.w/C.h*100}%y`,height],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view(`(#title_text = '${title}')`,'#visible')],controls:[dim,...controls]});
const collection=(controls)=>({buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}});
const ui={namespace:'cooptown_ranch'};

// ---- main (飼育台) ----
{
 const C={w:1672,h:941},box=boxIn(C);
 const STATS=[['登録',IC+'register'],['近くの動物',T+'animals/cow'],['世話できる',IC+'care_heart'],['生まれた子ども',IC+'births'],['世話した回数',IC+'care_total']];
 const ACTIONS=[IC+'register',IC+'registry',IC+'care_heart',FEED+'growth'];
 const fixed=[
  {frame:img(UI+'main_frame',{layer:1,...box(215,112,1245,728)})},
  {sign:img(UI+'title_sign',{layer:2,...box(500,58,672,116)})},
  {sign_text:textIn(box(560,62,552,108),{scale:2.2,text:'飼育台',color:CREAM})},
  ...STATS.flatMap(([name,tex],k)=>[
   {['stat_bg_'+k]:img(UI+'stat_panel',{layer:2,...box(293+k*220,215,208,212)})},
   {['stat_icon_'+k]:img(tex,{layer:3,keep_ratio:true,...box(343+k*220,236,108,82)})},
   {['stat_name_'+k]:textIn(box(300+k*220,322,194,34),{scale:.78,text:name,color:CREAM})}])];
 const controls=[
  ...STATS.map((_,k)=>readout('stat_'+k,k,box(300+k*220,358,194,52),[{t:label({scale:1.3,color:WHITE})}])),
  ...ACTIONS.map((icon,k)=>button('action_'+k,5+k,box(298+(k%2)*562,458+Math.floor(k/2)*152,540,130),greenLook({icon,arrow:true,scale:1.1}))),
  button('close',9,box(700,764,272,74),greyLook())];
 ui.main=routeRoot(C,'94%','ct:ranch',[...fixed,collection(controls)]);
}

// ---- list / register (牧場の一覧, 登録する動物を選ぶ) ----
{
 const C={w:1672,h:941},box=boxIn(C),ROW=46; // row height in GUI px (the list scrolls)
 const prefixed=p=>`(not ((#form_button_text - '${p}') = #form_button_text))`;
 const fixed=[
  {frame:img(UI+'main_frame',{layer:1,...box(105,40,1462,860)})},
  {sign:img(UI+'title_sign',{layer:2,...box(150,62,960,166)})},
  {count_bg:img(UI+'material_slot',{layer:2,...box(1128,88,360,96)})}];
 const controls=[
  readout('title',0,box(330,92,700,104),[{t:label({scale:2,color:CREAM,align:'left',anchor:'left_middle'})}]),
  readout('count',1,box(1150,90,316,92),[{t:label({scale:1.4,color:WHITE})}]),
  button('back',2,box(175,790,450,92),greyLook({scale:1.3})),
  button('right',3,box(1045,790,450,92),greenLook({scale:1.3})),
  readout('empty',4,box(200,420,1270,120),[{t:label({scale:1.3,color:GREY})}])];
 // one row: the animal_row plate with the picture in its left cell and name / age next to it (pressable)
 const rowFace=state=>panel([
  img(UI+'animal_row',{layer:1}),
  {icon:{type:'image',texture:'#texture',keep_ratio:true,...inner(10.6,14,13.8,72),layer:3,bindings:[textureBinding,view("(not (#texture = ''))",'#visible')]}},
  textIn(inner(27,0,17,100),{scale:.78,align:'left',anchor:'left_middle',color:CREAM}),
  ...(state==='normal'?[]:[img(SOLID,{layer:4,color:[1,.95,.7],alpha:state==='hover'?.08:.14})])]);
 ui.row={type:'panel',size:['100%',ROW],bindings:[textBinding,view(prefixed('r|'),'#visible')],controls:[
  {'row_button@common.button':{size:['100%',ROW-4],anchor_from:'top_middle',anchor_to:'top_middle',$pressed_button_name:'button.form_button_click',
   bindings:[{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
   default_control:'normal',hover_control:'hover',pressed_control:'pressed',
   controls:[{normal:rowFace('normal')},{hover:rowFace('hover')},{pressed:{...rowFace('pressed'),offset:[0,1]}}]}}]};
 // health column: one heart and the numbers
 ui.health={type:'panel',size:['100%',ROW],bindings:[textBinding,view(prefixed('h|'),'#visible')],controls:[
  {heart:img(IC+'care_heart',{layer:3,keep_ratio:true,...inner(0,28,24,40)})},
  {hp:textIn(inner(24,0,76,90),{scale:.95,align:'left',anchor:'left_middle',color:WHITE})}]};
 // status column: [ok] a green "can be cared for" badge, [wait] clock + time, [dist] distance, [bonus] the star
 ui.status={type:'panel',size:['100%',ROW],bindings:[textBinding,view(prefixed('s|'),'#visible')],controls:[
  {ok_badge:when(has('[ok]'),{type:'panel',...inner(0,16,66,64),controls:[{bg:img(UI+'button_normal',{layer:2})},
   {heart:img(IC+'care_heart',{layer:3,keep_ratio:true,...inner(6,18,14,64)})},{t:textIn(inner(20,0,78,100),{scale:.9,color:WHITE})}]})},
  {clock:when(has('[wait]'),img(IC+'cooldown_clock',{layer:3,keep_ratio:true,...inner(1,20,14,60)}))},
  {pin:when(has('[dist]'),img(IC+'distant',{layer:3,keep_ratio:true,...inner(1,24,14,52)}))},
  // ("or" never comes out true in game: one text per mark)
  {wait_text:when(has('[wait]'),textIn(inner(17,0,50,100),{scale:.9,align:'left',anchor:'left_middle',color:CREAM}))},
  {dist_text:when(`(${has('[dist]')} and (not ${has('[wait]')}))`,textIn(inner(17,0,50,100),{scale:.9,align:'left',anchor:'left_middle',color:CREAM}))},
  {star:when(has('[bonus]'),img(IC+'bonus_star',{layer:3,keep_ratio:true,...inner(70,4,26,54)}))},
  {bonus:when(has('[bonus]'),textIn(inner(62,58,42,36),{scale:.6,text:'ボーナス',color:GOLD}))}]};
 const stack=(item,place)=>({type:'stack_panel',orientation:'vertical',...place,factory:{name:'buttons',control_ids:{button:`@cooptown_ranch.${item}`}},
  collection_name:'form_buttons',bindings:[{binding_name:'#form_button_contents',binding_name_override:'#collection_length'}]});
 ui.list_content={type:'panel',size:['100%','100%c'],controls:[
  {rows:stack('row',{size:['100%','100%c'],anchor_from:'top_left',anchor_to:'top_left'})},
  {healths:stack('health',{size:['14%','100%c'],anchor_from:'top_left',anchor_to:'top_left',offset:['44%',0],layer:5})},
  {statuses:stack('status',{size:['31%','100%c'],anchor_from:'top_left',anchor_to:'top_left',offset:['58.5%',0],layer:5})}]};
 const scroll={scroll:{type:'panel',...box(160,222,1352,556),layer:5,controls:[
  {'scrolling_panel@common.scrolling_panel':{size:['100%','100%'],layer:2,'$show_background':false,'$scrolling_content':'cooptown_ranch.list_content',
   '$scroll_size':[5,'100% - 4px'],'$scrolling_pane_size':['100% - 8px','100%'],'$scrolling_pane_offset':[0,0],'$scroll_bar_right_padding_size':[0,0]}}]}};
 ui.list=routeRoot(C,'94%','ct:ranch_list',[...fixed,scroll,collection(controls)]);
}

// ---- feed (飼料を作って与える) ----
{
 const C={w:1672,h:941},box=boxIn(C),BAGS=[FEED+'growth',FEED+'quality',FEED+'breeding'];
 const fixed=[
  {frame:img(UI+'main_frame',{layer:1,...box(175,38,1325,800)})},
  {sign:img(UI+'title_sign',{layer:2,...box(330,40,1010,128)})},
  {sign_text:textIn(box(420,46,830,112),{scale:1.9,text:'飼料を作って与える',color:CREAM})},
  {note:textIn(box(1180,158,290,36),{scale:.8,text:'材料：所持 / 必要',color:GREY})},
  ...BAGS.flatMap((tex,k)=>[
   {['card_'+k]:img(UI+'feed_card',{layer:2,...box(215+k*420,192,408,612)})},
   {['bag_'+k]:img(tex,{layer:3,keep_ratio:true,...box(330+k*420,205,178,150)})},
   {['band_'+k]:img(SOLID,{layer:3,color:[.62,.5,.16],alpha:.95,...box(232+k*420,350,374,62)})},
   {['rule_'+k]:img(SOLID,{layer:3,color:[.55,.45,.3],alpha:.6,...box(250+k*420,560,340,3)})}])];
 const controls=[
  button('back',0,box(200,846,296,80),greyLook()),
  button('close',1,box(1178,846,296,80),greyLook()),
  ...BAGS.flatMap((_,k)=>{const x=215+k*420;return [
   readout('name_'+k,2+5*k,box(x+17,350,374,62),[{t:label({scale:1.5,color:WHITE})}]),
   readout('mats_'+k,3+5*k,box(x+40,422,210,130),[{t:label({scale:.95,color:CREAM,align:'left',anchor:'left_middle'})}]),
   readout('counts_'+k,4+5*k,box(x+250,422,120,130),[{t:label({scale:.95,color:WHITE,align:'right',anchor:'right_middle'})}]),
   readout('effect_'+k,5+5*k,box(x+20,572,368,110),[{t:label({scale:.78,color:CREAM})}]),
   button('choose_'+k,6+5*k,box(x+18,700,372,92),greenLook({scale:1.2}))];})];
 ui.feed=routeRoot(C,'94%','ct:ranch_feed',[...fixed,collection(controls)]);
}

// ---- dialogs (飼料を与える / 世話の完了 / 登録の上限です / 効果のある動物がいませんでした ...) ----
{
 const C={w:820,h:470},box=boxIn(C);
 const fixed=[
  {frame:img(UI+'dialog_frame',{layer:1,...box(0,40,820,430)})},
  {sign:img(UI+'title_sign',{layer:2,...box(105,0,610,104)})}];
 const pictures=Object.entries(PICTURES).map(([m,tex])=>({['pic_'+m]:when(has(`[${m}]`),img(tex,{layer:3,keep_ratio:true,...inner(4,4,92,92)}))}));
 const controls=[
  readout('title',0,box(160,10,500,84),[{t:label({scale:1.15,color:CREAM})}]),
  readout('message',1,box(60,118,700,124),[
   {picture:{type:'panel',...inner(0,0,30,140),layer:3,controls:pictures}},
   {t:textIn(inner(34,0,66,100),{scale:1.15,align:'left',anchor:'left_middle',color:WHITE})}]),
  // the note box only when there is a note
  readout('note',2,box(300,246,440,74),[{bg:img(UI+'material_slot',{layer:2})},{t:label({scale:1,color:CREAM})}]),
  // the green button sits left of the grey one, or in the middle when it is alone ([solo])
  button('ok',3,box(70,340,330,86),greenLook({scale:1.4}),[view(`(not ${has('[solo]')})`,'#visible')]),
  button('ok_solo',3,box(245,340,330,86),greenLook({scale:1.4}),[view(has('[solo]'),'#visible')]),
  button('cancel',4,box(420,340,330,86),greyLook({scale:1.3}))];
 ui.dlg=routeRoot(C,'62%','ct:ranch_dlg',[...fixed,collection(controls)]);
}

fs.writeFileSync('ui/cooptown_ranch.json',JSON.stringify(ui,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_ranch.json')){defs.ui_defs.push('ui/cooptown_ranch.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: hide the vanilla form for the titles and show the screens (add-only, as build-npc-ui.mjs)
const ROUTES=[['ct:ranch','ranch@cooptown_ranch.main'],['ct:ranch_list','ranch_list@cooptown_ranch.list'],['ct:ranch_feed','ranch_feed@cooptown_ranch.feed'],['ct:ranch_dlg','ranch_dlg@cooptown_ranch.dlg']];
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
const vanilla=host[0].vanilla_host.bindings.find(b=>b.target_property_name==='#visible');
const titles=[...new Set([...vanilla.source_property_name.matchAll(/#title_text = '([^']*)'/g)].map(m=>m[1]))];
for(const [t] of ROUTES)if(!titles.includes(t))titles.push(t);
const pair=(op,terms)=>terms.length===1?terms[0]:`(${pair(op,terms.slice(0,terms.length>>1))} ${op} ${pair(op,terms.slice(terms.length>>1))})`;
vanilla.source_property_name=VANILLA_COND; // tools/form-route.mjs
const blocker=host.find(c=>c.vanilla_blocker);
if(blocker)blocker.vanilla_blocker.bindings.find(b=>b.target_property_name==='#visible').source_property_name='(not '+vanilla.source_property_name+')';
for(const [t,route] of ROUTES){
 const ctl={[route]:{layer:100,bindings:[{binding_name:'#title_text'},view(`(#title_text = '${t}')`,'#visible')]}},at=host.findIndex(c=>c[route]);
 if(at>=0)host[at]=ctl;else host.push(ctl);
}
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_ranch.json and routed',ROUTES.map(r=>r[0]).join(', '));
