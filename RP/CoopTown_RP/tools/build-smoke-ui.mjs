// Generates ui/cooptown_smoke.json: the cook's smoker (form title "ct:smoke", 料理人 only), stone, iron and embers
// (pictures: tools/build-smoke.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-smoke-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's smoke-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / amount, [sel] chosen
// food, [ng] not enough, [off] disabled; the gauge's text holds [g1]..[g8], one per lit cell.
// Positions are measured in the finished design (tools/assets/smoke/smoker_preview.png, 1672 x 941) and moved onto
// the background picture (same size, FRAME: nearly the same frame); the title and close sit on the background (boxBG).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/smoke/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
// the inner panels' outer corners: in the design and in the background picture
const FRAME={ref:{x0:232,y0:165,x1:1452,y1:780},bg:{x0:232,y0:165,x1:1445,y1:765}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const boxBG=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.96,.9,.82],EMBER=[1,.72,.32];
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

// ---- layout (design px) ----
const L={close:{x:1328,y:50,w:76,h:76},tabs:{x:248,y:175,w:197,h:55,step:214},
 slots:{x:245,y:247,w:200,h:118,dx:217,dy:133.5},back:{x:252,y:800,w:200,h:62},prev:{x:497,y:800,w:62,h:60},page:{x:565,y:800,w:140,h:60},next:{x:708,y:800,w:64,h:60},
 detail:{x:930,y:180,w:505,h:132},icon:{x:952,y:190,w:150,h:112},name:{x:1110,y:196,w:320,h:66},state:{x:1112,y:262,w:318,h:34},
 mats:{x:928,y:322,w:515,h:200},rows:[{x:952,y:376,w:478,h:60},{x:952,y:442,w:478,h:60}],smoker:{x:930,y:520,w:255,h:180},
 time:{x:1200,y:566,w:235,h:54},gauge:{x:1200,y:628,w:232,h:40},amounts:[{x:948,y:695,w:150,h:50},{x:1112,y:695,w:150,h:50},{x:1275,y:695,w:160,h:50}],
 action:{x:935,y:758,w:510,h:112}};
// the 8 cells inside the empty gauge (fractions of track.png, measured on the source picture)
const GAUGE={x0:.1046,w:.0926,step:.0993,y0:.22,h:.56};
const controls=[];let i=0;
// 0-2 tabs, 3 close (on the background's top right box), 4 back, 5 / 6 page arrows
for(let n=0;n<3;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),{text:label({scale:1.15})},glow(state)])));
controls.push(button('close',i++,boxBG(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['50%','50%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.2})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 7-18 foods (3 x 4): picture above, name below; [sel] the glowing grill, [ng] dimmed
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'recipe',{layer:1})),when(has('[sel]'),img(T+'recipe_on',{layer:1})),
 {icon:icon({size:['36%','46%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'12%']})},
 {caption:panel([{text:label({scale:.72})}],{size:['90%','26%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},glow(state),dim('[ng]',.4)])));
// 19-21 how many, 22 smoke
L.amounts.forEach((p,n)=>controls.push(button('amount_'+n,i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),{text:label({scale:1.05})},glow(state)]))));
controls.push(button('smoke',i++,box(L.action.x,L.action.y,L.action.w,L.action.h),state=>panel([{bg:img(T+'action',{layer:1})},{text:label({scale:1.8,color:EMBER})},glow(state),dim('[off]',.45)])));
// 23 page, 24 food picture, 25 name, 26 state line (can smoke / smoking / result)
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('food_icon',i++,box(L.icon.x,L.icon.y,L.icon.w,L.icon.h),[{icon:icon({size:['80%','90%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('food_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.5,align:'left',anchor:'left_middle'})}]));
controls.push(readout('state',i++,box(L.state.x,L.state.y,L.state.w,L.state.h),[{text:label({scale:.72,align:'left',anchor:'left_middle'})}]));
// 27-28 ingredients (the raw food, the fuel): row, picture and name, 29-30 carried / needed
for(let k=0;k<2;k++){const r=L.rows[k];controls.push(readout('row_'+k,i++,box(r.x,r.y,r.w*.72,r.h),[
 {bg:img(T+'row',{layer:1,size:['138.8%','100%'],anchor_from:'top_left',anchor_to:'top_left'})},
 {icon:icon({size:['16%','70%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['5%',0]})},
 {name:panel([{text:label({scale:.95,align:'left',anchor:'left_middle'})}],{size:['72%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));}
for(let k=0;k<2;k++){const r=L.rows[k];controls.push(readout('row_count_'+k,i++,box(r.x+r.w*.72,r.y,r.w*.24,r.h),[{text:label({scale:1,align:'right',anchor:'right_middle'})}]));}
// 31 smoking time, 32 the 8-cell gauge
controls.push(readout('time',i++,box(L.time.x,L.time.y,L.time.w,L.time.h),[{text:label({scale:1.7,align:'left',anchor:'left_middle'})}]));
controls.push(readout('gauge',i++,box(L.gauge.x,L.gauge.y,L.gauge.w,L.gauge.h),[{empty:img(T+'track',{layer:2})},
 ...Array.from({length:8},(_,k)=>({['cell_'+(k+1)]:when(has(`[g${k+1}]`),img(T+'cell',{layer:3,size:[pc(GAUGE.w),pc(GAUGE.h)],anchor_from:'top_left',anchor_to:'top_left',offset:[pc(GAUGE.x0+k*GAUGE.step),pc(GAUGE.y0)]}))}))]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, panels, headings, the smoker picture ----
const heading=(name,t,x,y,w=240,scale=1)=>({[name]:{type:'panel',...box(x,y,w,34),layer:3,controls:[{text:text(t,{scale,align:'left',anchor:'left_middle'})}]}});
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...boxBG(400,40,390,62),layer:3,controls:[{text:text('調理師の燻製機',{scale:1.6,align:'left',anchor:'left_middle'})}]}},
 {subtitle:{type:'panel',...boxBG(402,100,390,32),layer:3,controls:[{text:text('燻製・保存食',{scale:.85,color:[.8,.75,.7],align:'left',anchor:'left_middle'})}]}},
 {detail:img(T+'panel',{layer:2,...box(L.detail.x,L.detail.y,L.detail.w,L.detail.h)})},
 {mats:img(T+'panel',{layer:2,...box(L.mats.x,L.mats.y,L.mats.w,L.mats.h)})},
 heading('mats_head','必要な材料',960,330),
 {smoker:img(T+'smoker',{layer:3,keep_ratio:true,...box(L.smoker.x,L.smoker.y,L.smoker.w,L.smoker.h)})},
 heading('time_head','燻製時間',1202,534,200,.95)];

const out={namespace:'cooptown_smoke',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:smoke')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_smoke.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_smoke.json')){defs.ui_defs.push('ui/cooptown_smoke.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:smoke',ROUTE='smoke@cooptown_smoke.root';
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
console.log('wrote ui/cooptown_smoke.json with',BUTTON_COUNT,'slots and routed',TITLE);
