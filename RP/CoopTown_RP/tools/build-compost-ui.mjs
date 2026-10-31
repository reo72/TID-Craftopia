// Generates ui/cooptown_compost.json: the farmer's composter (form title "ct:compost", 農家 only), a farm frame of
// oak and soil (pictures: tools/build-compost.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-compost-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's compost-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / amount, [sel] chosen
// item, [off] button disabled; the gauge's text holds [g1]..[g8], one per filled level.
// Positions are measured in the finished design (tools/assets/compost/composter_preview.png, 1672 x 941) and moved
// onto the background picture (same size), whose frame sits a little differently (FRAME).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/compost/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
// the frame's outer corners: in the design and in the background picture
const FRAME={ref:{x0:222,y0:88,x1:1455,y1:905},bg:{x0:148,y0:95,x1:1527,y1:892}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
// a box given in design px, and one given in background px
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const boxBG=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.96,.91,.8],INK=[.27,.15,.06],WHITE=[1,1,.96];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[on]','[sel]','[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
// keeps the control's own bindings (a label's text) and adds the visibility
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]}); // §r first: a text that starts with a digit does not show in forms
// a label whose colour follows the [on] mark (cream on the green plate, ink on the oak one)
const plateLabel=scale=>[{on_text:when(has('[on]'),label({scale,color:WHITE}))},{off_text:when(`(not ${has('[on]')})`,label({scale,color:INK}))}];
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
const glow=state=>img(SOLID,{layer:6,color:[1,1,.8],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=on=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];

// ---- layout (design px) ----
const L={close:{x:1362,y:45,w:70,h:70},tabs:{x:278,y:150,w:133,h:58,step:145},
 slots:{x:274,y:273,w:172,h:112,dx:186,dy:125.5}, // a little narrower than the design: the background's middle post is wider
 back:{x:278,y:798,w:148,h:62},prev:{x:490,y:800,w:62,h:58},page:{x:560,y:800,w:130,h:58},next:{x:700,y:800,w:62,h:58},
 info:{x:878,y:148,w:530,h:145},icon:{x:900,y:160,w:120,h:120},name:{x:1052,y:166,w:340,h:56},count:{x:1052,y:226,w:350,h:44},
 amountPanel:{x:878,y:305,w:530,h:125},amounts:[{x:895,y:360,w:150,h:57},{x:1060,y:360,w:155,h:57},{x:1227,y:360,w:170,h:57}],
 statePanel:{x:878,y:445,w:530,h:230},compost:{x:905,y:500,w:150,h:160},state:{x:1100,y:518,w:290,h:40},gauge:{x:1097,y:566,w:275,h:32},note:{x:1075,y:624,w:330,h:40},
 put:{x:897,y:690,w:500,h:72},collect:{x:897,y:778,w:500,h:80}};
// the 8 cells inside the empty gauge (fractions of gauge.png, measured by build-compost.py's source)
const GAUGE={x0:.041,w:.107,step:.1152,y0:.24,h:.52};
const controls=[];let i=0;
// 0-3 tabs
for(let n=0;n<4;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),...plateLabel(1.1),glow(state)])));
// 4 close, 5 back, 6 / 7 page arrows
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['52%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.2,color:INK})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 8-19 compostable items carried (3 x 4): picture above, name below; [sel] the green card
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),
 {icon:icon({size:['36%','46%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'10%']})},
 {caption:panel([{text:label({scale:.7,color:WHITE})}],{size:['94%','34%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},glow(state)])));
// 20-22 how many: 1 / 8 / all
L.amounts.forEach((p,n)=>controls.push(button('amount_'+n,i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),...plateLabel(1.05),glow(state)]))));
// 23 put in (green), 24 take bone meal (oak, bone meal picture)
controls.push(button('put',i++,box(L.put.x,L.put.y,L.put.w,L.put.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.4,color:INK})},glow(state),dim('[off]',.45)])));
controls.push(button('collect',i++,box(L.collect.x,L.collect.y,L.collect.w,L.collect.h),state=>panel([{bg:img(T+'button',{layer:1})},
 {bone:img(T+'bone_meal',{layer:3,keep_ratio:true,size:['14%','76%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['17%',0]})},
 {text:panel([{text:label({scale:1.3,color:INK})}],{size:['70%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-4%',0]})},glow(state),dim('[off]',.45)])));
// 25 page, 26 item picture, 27 name, 28 carried / chance, 29 compost state, 30 gauge, 31 note / result line
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('item_icon',i++,box(L.icon.x,L.icon.y,L.icon.w,L.icon.h),[{icon:icon({size:['86%','86%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('item_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.55,align:'left',anchor:'left_middle'})}]));
controls.push(readout('item_count',i++,box(L.count.x,L.count.y,L.count.w,L.count.h),[{text:label({scale:.9,align:'left',anchor:'left_middle'})}]));
controls.push(readout('state',i++,box(L.state.x,L.state.y,L.state.w,L.state.h),[{text:label({scale:1.15,align:'left',anchor:'left_middle'})}]));
controls.push(readout('gauge',i++,box(L.gauge.x,L.gauge.y,L.gauge.w,L.gauge.h),[{empty:img(T+'gauge',{layer:2})},
 ...Array.from({length:8},(_,k)=>({['cell_'+(k+1)]:when(has(`[g${k+1}]`),img(T+'cell',{layer:3,size:[pc(GAUGE.w),pc(GAUGE.h)],anchor_from:'top_left',anchor_to:'top_left',offset:[pc(GAUGE.x0+k*GAUGE.step),pc(GAUGE.y0)]}))}))]));
controls.push(readout('note',i++,box(L.note.x,L.note.y,L.note.w,L.note.h),[{text:label({scale:.75,align:'left',anchor:'left_middle'})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, the three panels, headings, the composter picture ----
const heading=(name,t,x,y)=>({[name]:{type:'panel',...box(x,y,260,34),layer:3,controls:[{text:text(t,{scale:1.05,align:'left',anchor:'left_middle'})}]}});
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...boxBG(670,36,475,100),layer:3,controls:[{text:text('農家のコンポスター',{scale:1.6,color:INK})}]}},
 heading('materials','投入する素材',280,228),
 {info:img(T+'panel',{layer:2,...box(L.info.x,L.info.y,L.info.w,L.info.h)})},
 {amount_panel:img(T+'panel',{layer:2,...box(L.amountPanel.x,L.amountPanel.y,L.amountPanel.w,L.amountPanel.h)})},
 heading('amount_head','投入数',893,312),
 {state_panel:img(T+'panel',{layer:2,...box(L.statePanel.x,L.statePanel.y,L.statePanel.w,L.statePanel.h)})},
 heading('state_head','堆肥の状態',893,452),
 {compost:img(T+'compost',{layer:3,keep_ratio:true,...box(L.compost.x,L.compost.y,L.compost.w,L.compost.h)})}];

const out={namespace:'cooptown_compost',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:compost')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_compost.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_compost.json')){defs.ui_defs.push('ui/cooptown_compost.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:compost',ROUTE='compost@cooptown_compost.root';
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
console.log('wrote ui/cooptown_compost.json with',BUTTON_COUNT,'slots and routed',TITLE);
