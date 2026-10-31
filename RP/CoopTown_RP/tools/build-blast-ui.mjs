// Generates ui/cooptown_blast.json: the blacksmith's blast furnace (form title "ct:blast", 鍛冶師 only), riveted iron
// with glowing vents (pictures: tools/build-blast.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-blast-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's blast-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / amount, [sel] chosen
// item, [ng] not enough, [off] disabled; the bar's text holds [p1]..[p20], one per lit step.
// Positions are px of the finished design (tools/assets/blast/blast_preview.webp, 1672 x 941), which has the same
// frame as the background picture.
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/blast/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.95,.92,.86],AMBER=[1,.74,.32];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[on]','[sel]','[ng]','[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
// keeps the control's own bindings (a label's text) and adds the visibility
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]});
const text=(t,{scale=1,color=CREAM,align='center',anchor='center'}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5});
const icon=extra=>({type:'image',keep_ratio:true,layer:4,...extra,bindings:[
 {binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}]});
// controls may be given bare (a control with a type): they are named part_<n>
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>img(SOLID,{layer:6,color:[1,.8,.5],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=on=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];
// a label whose colour follows the [on] mark (amber on the chosen plate - a dark plate with an amber rim -, cream otherwise)
const plateLabel=scale=>[{on_text:when(has('[on]'),label({scale,color:AMBER}))},{off_text:when(`(not ${has('[on]')})`,label({scale}))}];

// ---- layout (px) ----
const L={close:{x:1350,y:28,w:60,h:60},tabs:{x:210,y:128,w:195,h:60,step:207.5},
 slots:{x:213,y:208,w:188,h:130,dx:206,dy:144.3},back:{x:207,y:800,w:228,h:72},prev:{x:527,y:808,w:56,h:58},page:{x:590,y:808,w:105,h:58},next:{x:700,y:808,w:56,h:58},
 header:{x:897,y:140,w:552,h:96},headName:{x:910,y:146,w:400,h:52},state:{x:910,y:198,w:400,h:30},headIcon:{x:1318,y:150,w:110,h:78},
 from:{x:938,y:252,w:142,h:138},to:{x:1253,y:252,w:156,h:138},arrow:{x:1122,y:292,w:88,h:58},
 mat:{x:887,y:420,w:295,h:142},fuel:{x:887,y:574,w:295,h:136},furnace:{x:1196,y:402,w:270,h:216},time:{x:1196,y:620,w:270,h:32},bar:{x:1200,y:656,w:260,h:34},
 amounts:[{x:890,y:718,w:182,h:56},{x:1087,y:718,w:182,h:56},{x:1283,y:718,w:182,h:56}],action:{x:890,y:785,w:572,h:96}};
// the bar: step k is a clipping panel k/STEPS wide over the whole fill picture, shown while the text has [pk] (every
// lit step has its mark, so the widest shown wins); one mark per check only - the "[pk] and not [pk+1]" form showed
// a full bar in game
const STEPS=20;
const controls=[];let i=0;
// 0-2 tabs, 3 close (on the top right stud), 4 back, 5 / 6 page arrows
for(let n=0;n<3;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),...plateLabel(1.15),glow(state)])));
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['50%','50%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.3})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 7-18 items (3 x 4): picture above, name below; [sel] the amber frame, [ng] dimmed
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),
 {icon:icon({size:['38%','48%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'10%']})},
 {caption:panel([{text:label({scale:.72})}],{size:['94%','28%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},glow(state),dim('[ng]',.4)])));
// 19-21 how many, 22 smelt
L.amounts.forEach((p,n)=>controls.push(button('amount_'+n,i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),...plateLabel(1.1),glow(state)]))));
controls.push(button('smelt',i++,box(L.action.x,L.action.y,L.action.w,L.action.h),state=>panel([{bg:img(T+'action',{layer:1})},{text:label({scale:1.7})},glow(state),dim('[off]',.45)]))); // the design's button: dark with a glowing rim, light text
// 23 page, 24 result picture (header), 25 result name, 26 / 27 from -> to (picture and name), 28 state line
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('head_icon',i++,box(L.headIcon.x,L.headIcon.y,L.headIcon.w,L.headIcon.h),[{icon:icon({size:['90%','90%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('head_name',i++,box(L.headName.x,L.headName.y,L.headName.w,L.headName.h),[{text:label({scale:1.55})}]));
for(const [k,p] of [['from',L.from],['to',L.to]])controls.push(readout(k,i++,box(p.x,p.y,p.w,p.h),[
 {icon:icon({size:['50%','52%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'10%']})},
 {name:panel([{text:label({scale:.75})}],{size:['96%','26%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})}]));
controls.push(readout('state',i++,box(L.state.x,L.state.y,L.state.w,L.state.h),[{text:label({scale:.72})}]));
// 29 / 30 the material (picture, name) and carried / needed, 31 / 32 the fuel the same
const row=(p,dy)=>({x:p.x+16,y:p.y+dy,w:p.w-32,h:52});
for(const [k,p] of [['mat',L.mat],['fuel',L.fuel]]){const r=row(p,52);
 controls.push(readout(k,i++,box(r.x,r.y,r.w*.62,r.h),[{icon:icon({size:['30%','90%'],anchor_from:'left_middle',anchor_to:'left_middle'})},
  {name:panel([{text:label({scale:.8,align:'left',anchor:'left_middle'})}],{size:['68%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));
 controls.push(readout(k+'_count',i++,box(r.x+r.w*.62,r.y,r.w*.38,r.h),[{text:label({scale:.9,align:'right',anchor:'right_middle'})}]));}
// 33 time, 34 bar: the longest lit step shows
controls.push(readout('time',i++,box(L.time.x,L.time.y,L.time.w,L.time.h),[{text:label({scale:.85})}]));
const inner={x:L.bar.x+9,y:L.bar.y+8,w:L.bar.w-18,h:L.bar.h-16};
controls.push(readout('bar',i++,box(inner.x,inner.y,inner.w,inner.h),Array.from({length:STEPS},(_,k)=>({['step_'+(k+1)]:when(has(`[p${k+1}]`),{type:'panel',clips_children:true,layer:3,
 size:[`${(k+1)*100/STEPS}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle',
 controls:[{fill:img(T+'fill',{layer:3,size:[`${100*STEPS/(k+1)}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, header, the from / to frames and arrow, the two panels, the furnace ----
const heading=(name,t,x,y)=>({[name]:{type:'panel',...box(x,y,240,34),layer:3,controls:[{text:text(t,{scale:.95,align:'left',anchor:'left_middle'})}]}});
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...box(545,22,590,82),layer:3,controls:[{text:text('鍛冶師の溶鉱炉',{scale:1.7})}]}},
 {header:img(T+'header',{layer:2,...box(L.header.x,L.header.y,L.header.w,L.header.h)})},
 {from_box:img(T+'slot',{layer:2,...box(L.from.x,L.from.y,L.from.w,L.from.h)})},
 {to_box:img(T+'slot',{layer:2,...box(L.to.x,L.to.y,L.to.w,L.to.h)})},
 {arrow:img(T+'arrow',{layer:2,keep_ratio:true,...box(L.arrow.x,L.arrow.y,L.arrow.w,L.arrow.h)})},
 {mat_panel:img(T+'panel',{layer:2,...box(L.mat.x,L.mat.y,L.mat.w,L.mat.h)})},heading('mat_head','必要な素材',905,428),
 {fuel_panel:img(T+'panel',{layer:2,...box(L.fuel.x,L.fuel.y,L.fuel.w,L.fuel.h)})},heading('fuel_head','燃料',905,582),
 {furnace:img(T+'furnace',{layer:2,keep_ratio:true,...box(L.furnace.x,L.furnace.y,L.furnace.w,L.furnace.h)})},
 {track:img(T+'track',{layer:2,...box(L.bar.x,L.bar.y,L.bar.w,L.bar.h)})}];

const out={namespace:'cooptown_blast',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:blast')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_blast.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_blast.json')){defs.ui_defs.push('ui/cooptown_blast.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:blast',ROUTE='blast@cooptown_blast.root';
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
console.log('wrote ui/cooptown_blast.json with',BUTTON_COUNT,'slots and routed',TITLE);
