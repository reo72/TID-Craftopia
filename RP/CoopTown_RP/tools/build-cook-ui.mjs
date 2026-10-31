// Generates ui/cooptown_cook.json: the campfire kitchen (form title "ct:cook", 料理人 only), a blackboard in a
// wooden frame with the pot over the fire (pictures: tools/build-cook.py), and routes the title in
// ui/server_form.json (add-only).
// Run: node tools/build-cook-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's cook-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks in a button's text pick its look:
// [on] chosen tab, [sel] chosen dish, [ng] not enough ingredients, [off] cook button disabled; the progress bar's
// text holds [p1]..[p20], one per lit step. Positions are reference px of the finished design
// (tools/assets/cook/kitchen_preview.png, 1672 x 941, the same frame as the background picture).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/cook/',SOLID='textures/cooptown/solid';
const REF={w:1672,h:941},HEIGHT=.88; // the screen's share of the screen height; the width follows the picture
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/REF.w),pc(y/REF.h)],size:[pc(w/REF.w),pc(h/REF.h)]});
const CREAM=[.96,.92,.82],WOOD_INK=[.24,.12,.04],GOLD=[1,.82,.42];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const MARKS=['[on]','[sel]','[ng]','[off]'];
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
// keeps the control's own bindings (a label's text) and adds the visibility
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]}); // §r first: a text that starts with a digit does not show in forms
const text=(t,{scale=1,color=CREAM,align='center',anchor='center'}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5});
const icon=extra=>({type:'image',keep_ratio:true,layer:4,...extra,bindings:[
 {binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}]});
// controls may be given bare (a control with a type): they are named part_<n>
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
// a pressable slot; look(state) draws it (state: normal / hover / pressed)
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
// a read-only slot
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:10,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>img(SOLID,{layer:6,color:[1,.9,.7],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));

// ---- layout (reference px) ----
const L={tabs:{x:280,y:177,w:148,h:55,step:156},close:{x:1392,y:92,w:64,h:62},
 slots:{x:272,y:242,w:200,h:126,dx:214,dy:138.5},back:{x:262,y:805,w:233,h:70},prev:{x:600,y:808,w:64,h:60},page:{x:668,y:808,w:130,h:60},next:{x:803,y:808,w:64,h:60},
 iconBox:{x:942,y:197,w:160,h:160},name:{x:1125,y:197,w:275,h:56},made:{x:1128,y:262,w:270,h:90},
 rows:{x:940,y:446,w:460,h:36,step:37.5},time:{x:948,y:641,w:445,h:40},progress:{x:948,y:688,w:445,h:34},track:{x:955,y:724,w:433,h:32},
 cook:[{x:940,y:780,w:225,h:82},{x:1180,y:780,w:230,h:82}]};
// the bar: step k is a clipping panel k/STEPS wide over the whole fill picture, shown while the text has [pk] (every
// lit step has its mark, so the widest shown wins); one mark per check only - the "[pk] and not [pk+1]" form showed
// a full bar in game
const STEPS=20;
const controls=[];let i=0;
// 0-3 tabs
for(let n=0;n<4;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([
 when(`(not ${has('[on]')})`,img(T+'tab',{layer:1})),when(has('[on]'),img(T+'tab_on',{layer:1})),{text:label({scale:1.1})},glow(state)])));
// 4 close, 5 back, 6 / 7 page arrows
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['56%','56%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.25,color:WOOD_INK})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 8-19 dishes (3 x 4): picture above, name below; [sel] the gold frame
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'recipe',{layer:1})),when(has('[sel]'),img(T+'recipe_on',{layer:1})),
 {icon:icon({size:['40%','48%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'9%']})},
 {caption:panel([{text:label({scale:.7})}],{size:['94%','36%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},
 glow(state),dim('[ng]',.35)])));
// 20 / 21 cook buttons ([off]: dimmed)
L.cook.forEach((p,n)=>controls.push(button(['cook_1','cook_all'][n],i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'cook_button',{layer:1})},{text:label({scale:1.2})},glow(state),dim('[off]',.45)]))));
// 22 page, 23 dish picture, 24 name, 25 "できあがり" + result
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('dish_icon',i++,box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h),[{icon:icon({size:['70%','70%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('dish_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.5,align:'left',anchor:'left_middle'})}]));
controls.push(readout('dish_made',i++,box(L.made.x,L.made.y,L.made.w,L.made.h),[{text:label({scale:1,align:'left',anchor:'left_middle'})}]));
// 26-30 ingredients: row, picture and name, 31-35 carried / needed
const row=k=>({x:L.rows.x,y:L.rows.y+k*L.rows.step,w:L.rows.w,h:L.rows.h});
for(let k=0;k<5;k++){const r=row(k);controls.push(readout('ing_'+k,i++,box(r.x,r.y,r.w*.7,r.h),[
 {bg:img(T+'row',{layer:1,size:['142.8%','100%'],anchor_from:'top_left',anchor_to:'top_left'})},
 {icon:icon({size:['10%','86%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0]})},
 {name:panel([{text:label({scale:.8,align:'left',anchor:'left_middle'})}],{size:['84%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));}
for(let k=0;k<5;k++){const r=row(k);controls.push(readout('ing_count_'+k,i++,box(r.x+r.w*.7,r.y,r.w*.27,r.h),[{text:label({scale:.85,align:'right',anchor:'right_middle'})}]));}
// 36 cooking time, 37 progress line (waiting / cooking / result), 38 progress bar: the longest lit step shows
controls.push(readout('time',i++,box(L.time.x+180,L.time.y,L.time.w-180,L.time.h),[{text:label({scale:.95,align:'right',anchor:'right_middle'})}]));
controls.push(readout('progress',i++,box(L.progress.x,L.progress.y,L.progress.w,L.progress.h),[{text:label({scale:.85,align:'left',anchor:'left_middle'})}]));
const inner={x:L.track.x+7,y:L.track.y+6,w:L.track.w-14,h:L.track.h-12};
controls.push(readout('bar',i++,box(inner.x,inner.y,inner.w,inner.h),Array.from({length:STEPS},(_,k)=>({['step_'+(k+1)]:when(has(`[p${k+1}]`),{type:'panel',clips_children:true,layer:3,
 size:[`${(k+1)*100/STEPS}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle',
 controls:[{fill:img(T+'fill',{layer:3,size:[`${100*STEPS/(k+1)}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))));
const BUTTON_COUNT=i;

// ---- fixed parts: background, sign, the detail panel, headings, lines, the progress track ----
const line=y=>img(SOLID,{layer:3,color:CREAM,alpha:.25,...box(940,y,455,3)});
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {sign:{type:'panel',...box(700,48,395,62),layer:3,controls:[{text:text('焚き火キッチン',{scale:1.9,color:GOLD})}]}},
 {sign_sub:{type:'panel',...box(700,106,395,30),layer:3,controls:[{text:text('―― 料理人 ――',{scale:.9})}]}},
 {detail:img(T+'detail',{layer:2,...box(926,184,486,186)})},
 {icon_box:img(T+'recipe',{layer:3,...box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h)})},
 {line_1:line(378)},
 {need:{type:'panel',...box(948,396,250,44),layer:3,controls:[{text:text('必要なもの',{scale:1.05,align:'left',anchor:'left_middle'})}]}},
 {need_head:{type:'panel',...box(1165,396,230,44),layer:3,controls:[{text:text('所持 / 必要',{scale:.8,align:'right',anchor:'right_middle'})}]}},
 {line_2:line(636)},
 {time_label:{type:'panel',...box(L.time.x,L.time.y,200,L.time.h),layer:3,controls:[{text:text('調理時間',{scale:.95,align:'left',anchor:'left_middle'})}]}},
 {line_3:line(683)},
 {track:img(T+'track',{layer:2,...box(L.track.x,L.track.y,L.track.w,L.track.h)})}];

const out={namespace:'cooptown_cook',root:{type:'panel',size:[`${REF.w/REF.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:cook')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_cook.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_cook.json')){defs.ui_defs.push('ui/cooptown_cook.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:cook',ROUTE='cook@cooptown_cook.root';
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
const vanilla=host[0].vanilla_host.bindings.find(b=>b.target_property_name==='#visible');
const titles=[...new Set([...vanilla.source_property_name.matchAll(/#title_text = '([^']*)'/g)].map(m=>m[1]))];
if(!titles.includes(TITLE))titles.push(TITLE);
// "and" only, two terms at a time (longer chains and "or" do not evaluate in game)
const pair=(op,terms)=>terms.length===1?terms[0]:`(${pair(op,terms.slice(0,terms.length>>1))} ${op} ${pair(op,terms.slice(terms.length>>1))})`;
vanilla.source_property_name=VANILLA_COND; // tools/form-route.mjs
const blocker=host.find(c=>c.vanilla_blocker);
if(blocker)blocker.vanilla_blocker.bindings.find(b=>b.target_property_name==='#visible').source_property_name='(not '+vanilla.source_property_name+')';
const ctl={[ROUTE]:{layer:100,bindings:[{binding_name:'#title_text'},view(`(#title_text = '${TITLE}')`,'#visible')]}},at=host.findIndex(c=>c[ROUTE]);
if(at>=0)host[at]=ctl;else host.push(ctl);
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_cook.json with',BUTTON_COUNT,'slots and routed',TITLE);
