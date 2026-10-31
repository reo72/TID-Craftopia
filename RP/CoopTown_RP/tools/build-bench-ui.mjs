// Generates ui/cooptown_bench.json: the crafting table screen (form title "ct:bench", the job workbench), drawn as
// the green cutting mat in a wooden frame (pictures: tools/build-bench.py).
// Run: node tools/build-bench-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's workbench-runtime.js): each is a
// slot here with that collection_index, hidden while its text is empty. Marks in a button's text pick its look:
// [on] chosen tab, [sel] chosen recipe, [ng] not enough materials, [lk] locked, [off] craft button disabled.
// Read-only parts (name, status, the 3x3 picture, materials) are buttons too: their text or image is shown.
// Positions are reference px of the finished design (tools/assets/bench2/crafting_table_preview.png, 1672 x 941,
// the same frame as the background picture).
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/bench/',SOLID='textures/cooptown/solid';
const REF={w:1672,h:941},HEIGHT=.88; // the screen's share of the screen height; the width follows the picture
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/REF.w),pc(y/REF.h)],size:[pc(w/REF.w),pc(h/REF.h)]});
const CREAM=[.96,.94,.84],WOOD_INK=[.24,.12,.04];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const MARKS=['[on]','[sel]','[ng]','[lk]','[off]'];
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
const glow=state=>img(SOLID,{layer:6,color:[1,1,.8],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));

// ---- layout (reference px) ----
const L={tabs:{x:300,y:168,w:115,h:55,step:122.5},close:{x:1362,y:100,w:62,h:62},title:{x:692,y:86,w:285,h:66},
 slots:{x:303,y:242,w:185,h:126,dx:197,dy:138},back:{x:287,y:795,w:216,h:67},prev:{x:595,y:796,w:66,h:62},page:{x:665,y:796,w:132,h:62},next:{x:800,y:796,w:66,h:62},
 name:{x:930,y:196,w:470,h:46},state:{x:930,y:246,w:470,h:30},grid:{x:932,y:284,cell:80},arrow:{x:1190,y:378,w:66,h:58},out:{x:1272,y:347,w:118,h:118},
 mats:{x:924,y:552,w:470,head:40,row:40,first:600},craft:[{x:920,y:770,w:230,h:80},{x:1165,y:770,w:243,h:80}]};
const controls=[];let i=0;
// 0-4 tabs: icon and caption on a wooden plate ([on]: the lit plate)
for(let n=0;n<5;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([
 when(`(not ${has('[on]')})`,img(T+'button',{layer:1})),when(has('[on]'),img(T+'button_on',{layer:1})),
 {icon:icon({size:['24%','62%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['8%',0]})},
 {caption:panel([{text:label({scale:1,color:WOOD_INK})}],{size:['64%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-4%',0]})},glow(state)])));
// 5 close
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['56%','56%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 6 back, 7 / 8 page arrows
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.2,color:WOOD_INK})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 9-20 recipe slots (3 x 4): icon above, name below; [sel] the lit card
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'recipe',{layer:1})),when(has('[sel]'),img(T+'recipe_on',{layer:1})),
 {icon:icon({size:['40%','46%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'9%']})},
 {caption:panel([{text:label({scale:.62,anchor:'center'})}],{size:['94%','38%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},
 glow(state),dim('[ng]',.28),dim('[lk]',.5)])));
// 21 / 22 craft buttons ([off]: dimmed)
L.craft.forEach((p,n)=>controls.push(button(['craft_1','craft_all'][n],i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.15,color:WOOD_INK})},glow(state),dim('[off]',.35)]))));
// 23 page number, 24 recipe name, 25 status line
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('sel_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.5,align:'left',anchor:'left_middle'})}]));
controls.push(readout('sel_state',i++,box(L.state.x,L.state.y,L.state.w,L.state.h),[{text:label({scale:.75,align:'left',anchor:'left_middle'})}]));
// 26-34 the 3x3 picture (an ingredient's image per cell), 35 the result's image, 36 its count
for(let k=0;k<9;k++)controls.push(readout('cell_'+k,i++,box(L.grid.x+(k%3)*L.grid.cell,L.grid.y+Math.floor(k/3)*L.grid.cell,L.grid.cell,L.grid.cell),[{icon:icon({size:['70%','70%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('out_icon',i++,box(L.out.x,L.out.y,L.out.w,L.out.h),[{icon:icon({size:['66%','66%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('out_count',i++,box(L.out.x,L.out.y+L.out.h-40,L.out.w-10,36),[{text:label({scale:1,align:'right',anchor:'right_middle'})}]));
// 37-40 materials: image and name, 41-44 carried / needed
for(let k=0;k<4;k++)controls.push(readout('mat_'+k,i++,box(L.mats.x,L.mats.first+k*L.mats.row,320,L.mats.row),[
 {icon:icon({size:['11%','86%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['1%',0]})},
 {name:panel([{text:label({scale:.8,align:'left',anchor:'left_middle'})}],{size:['86%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));
for(let k=0;k<4;k++)controls.push(readout('mat_count_'+k,i++,box(L.mats.x+320,L.mats.first+k*L.mats.row,L.mats.w-334,L.mats.row),[{text:label({scale:.9,align:'right',anchor:'right_middle'})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title plate, the 3x3 frame, arrow, result frame, material headings ----
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...box(L.title.x,L.title.y,L.title.w,L.title.h),layer:3,controls:[{plate:img(T+'button',{layer:1})},{text:text('作業台',{scale:1.6,color:WOOD_INK})}]}},
 ...Array.from({length:9},(_,k)=>({['cell_frame_'+k]:img(T+'slot',{layer:3,...box(L.grid.x+(k%3)*L.grid.cell,L.grid.y+Math.floor(k/3)*L.grid.cell,L.grid.cell,L.grid.cell)})})),
 {arrow:img(T+'arrow',{layer:3,...box(L.arrow.x,L.arrow.y,L.arrow.w,L.arrow.h)})},
 {out_frame:img(T+'slot',{layer:3,...box(L.out.x,L.out.y,L.out.w,L.out.h)})},
 {mats_title:{type:'panel',...box(L.mats.x+6,L.mats.y,200,L.mats.head),layer:3,controls:[{text:text('必要素材',{scale:1.05,align:'left',anchor:'left_middle'})}]}},
 {mats_head:{type:'panel',...box(L.mats.x+L.mats.w-220,L.mats.y,206,L.mats.head),layer:3,controls:[{text:text('所持 / 必要',{scale:.8,align:'right',anchor:'right_middle'})}]}},
 {mats_line:img(SOLID,{layer:3,color:CREAM,alpha:.35,...box(L.mats.x,L.mats.y+L.mats.head+2,L.mats.w,3)})}];

const out={namespace:'cooptown_bench',root:{type:'panel',size:[`${REF.w/REF.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:bench')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:2,controls}}]}};
fs.writeFileSync('ui/cooptown_bench.json',JSON.stringify(out,null,1)+'\n');
console.log('wrote ui/cooptown_bench.json with',BUTTON_COUNT,'slots');
