// Generates ui/cooptown_brew.json: the alchemist's brewing stand (form title "ct:brew", 料理人・調合師 only), stone
// and dark wood with amethyst (pictures: tools/build-brew.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-brew-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's brew-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / option, [sel] chosen
// potion, [ng] not enough, [off] disabled; the progress bar's text holds [p1]..[p20], one per lit step.
// Positions are measured in the finished design (tools/assets/brew/brewing_preview.png, 1672 x 940) and moved onto
// the background picture (1672 x 941), whose frame is wider (FRAME).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/brew/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
// the frame's corners (gold plates left / right, stone top / bottom): in the design and in the background picture
const FRAME={ref:{x0:168,y0:55,x1:1505,y1:905},bg:{x0:45,y0:50,x1:1630,y1:903}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
// a box given in design px, and one given in background px
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const boxBG=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.95,.91,.86],GOLDEN=[1,.88,.62];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[on]','[sel]','[ng]','[off]'];
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
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>img(SOLID,{layer:6,color:[.9,.75,1],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=on=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];

// ---- layout (design px) ----
const L={close:{x:1425,y:55,w:68,h:66},tabs:{x:223,y:150,w:145,h:58,step:155},
 slots:{x:230,y:228,w:188,h:128,dx:200,dy:142.3},back:{x:225,y:805,w:200,h:62},prev:{x:515,y:805,w:58,h:58},page:{x:578,y:805,w:135,h:58},next:{x:718,y:805,w:58,h:58},
 header:{x:872,y:150,w:583,h:172},icon:{x:900,y:168,w:125,h:140},name:{x:1050,y:182,w:395,h:60},state:{x:1052,y:258,w:395,h:40},
 mats:{x:875,y:330,w:340,h:252},rows:{x:896,y:372,w:300,h:29,step:31}, // inside the panel's frame
 stand:{x:1232,y:322,w:210,h:150},
 mod:{x:1222,y:478,w:72,h:42,step:76},liq:{x:1222,y:530,w:72,h:42,step:76},
 time:{x:1008,y:598,w:440,h:38},track:{x:885,y:645,w:550,h:30},amounts:[{x:970,y:697,w:150,h:52},{x:1132,y:697,w:148,h:52},{x:1293,y:697,w:150,h:52}],
 brew:{x:875,y:768,w:572,h:92}};
// the bar: step k is a clipping panel k/STEPS wide over the whole fill picture, shown while the text has [pk] (every
// lit step has its mark, so the widest shown wins); one mark per check only - the "[pk] and not [pk+1]" form showed
// a full bar in game
const STEPS=20;
const controls=[];let i=0;
// 0-3 tabs
for(let n=0;n<4;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),{text:label({scale:1.1})},glow(state)])));
// 4 close, 5 back, 6 / 7 page arrows
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['52%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.2})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 8-19 potions (3 x 4): bottle above, name below; [sel] the amethyst frame, [ng] dimmed
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'recipe',{layer:1})),when(has('[sel]'),img(T+'recipe_on',{layer:1})),
 {icon:icon({size:['34%','46%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'9%']})},
 {caption:panel([{text:label({scale:.72})}],{size:['94%','34%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},glow(state),dim('[ng]',.4)])));
// 20-22 normal / long / strong, 23-25 drink / splash / lingering, 26-28 how many ([off]: not for this potion)
for(let n=0;n<3;n++)controls.push(button('mod_'+n,i++,box(L.mod.x+n*L.mod.step,L.mod.y,L.mod.w,L.mod.h),state=>panel([...plate('[on]'),{text:label({scale:.8})},glow(state),dim('[off]',.55)])));
for(let n=0;n<3;n++)controls.push(button('liq_'+n,i++,box(L.liq.x+n*L.liq.step,L.liq.y,L.liq.w,L.liq.h),state=>panel([...plate('[on]'),{text:label({scale:.8})},glow(state)])));
L.amounts.forEach((p,n)=>controls.push(button('amount_'+n,i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),{text:label({scale:1.05})},glow(state)]))));
// 29 brew
controls.push(button('brew',i++,box(L.brew.x,L.brew.y,L.brew.w,L.brew.h),state=>panel([{bg:img(T+'action',{layer:1})},
 {stand:img(T+'stand',{layer:3,keep_ratio:true,size:['10%','70%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['26%',0]})},
 {text:panel([{text:label({scale:1.5})}],{size:['60%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-12%',0]})},glow(state),dim('[off]',.45)])));
// 30 page, 31 potion picture, 32 name, 33 state line (can brew / brewing / result)
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.15})}]));
controls.push(readout('potion_icon',i++,box(L.icon.x,L.icon.y,L.icon.w,L.icon.h),[{icon:icon({size:['86%','86%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('potion_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.15,align:'left',anchor:'left_middle'})}]));
controls.push(readout('state',i++,box(L.state.x,L.state.y,L.state.w,L.state.h),[{text:label({scale:.75,align:'left',anchor:'left_middle'})}]));
// 34-39 ingredients: row, picture and name, 40-45 carried / needed
const row=k=>({x:L.rows.x,y:L.rows.y+k*L.rows.step,w:L.rows.w,h:L.rows.h});
for(let k=0;k<6;k++){const r=row(k);controls.push(readout('row_'+k,i++,box(r.x,r.y,r.w*.72,r.h),[
 {bg:img(T+'row',{layer:1,size:['138.8%','100%'],anchor_from:'top_left',anchor_to:'top_left'})},
 {icon:icon({size:['12%','84%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['3%',0]})},
 {name:panel([{text:label({scale:.72,align:'left',anchor:'left_middle'})}],{size:['80%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));}
for(let k=0;k<6;k++){const r=row(k);controls.push(readout('row_count_'+k,i++,box(r.x+r.w*.72,r.y,r.w*.25,r.h),[{text:label({scale:.75,align:'right',anchor:'right_middle'})}]));}
// 46 time and fuel, 47 progress bar: the longest lit step shows
controls.push(readout('time',i++,box(L.time.x,L.time.y,L.time.w,L.time.h),[{text:label({scale:.85,align:'left',anchor:'left_middle'})}]));
const inner={x:L.track.x+8,y:L.track.y+7,w:L.track.w-16,h:L.track.h-14};
controls.push(readout('bar',i++,box(inner.x,inner.y,inner.w,inner.h),Array.from({length:STEPS},(_,k)=>({['step_'+(k+1)]:when(has(`[p${k+1}]`),{type:'panel',clips_children:true,layer:3,
 size:[`${(k+1)*100/STEPS}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle',
 controls:[{fill:img(T+'fill',{layer:3,size:[`${100*STEPS/(k+1)}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, panels, headings, the stand picture, the progress track ----
const heading=(name,t,x,y,w=200)=>({[name]:{type:'panel',...box(x,y,w,34),layer:3,controls:[{text:text(t,{scale:.95,align:'left',anchor:'left_middle'})}]}});
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...boxBG(655,32,400,85),layer:3,controls:[{text:text('調合師の醸造台',{scale:1.6,color:GOLDEN})}]}},
 {header:img(T+'panel',{layer:2,...box(L.header.x,L.header.y,L.header.w,L.header.h)})},
 {name_line:img(SOLID,{layer:3,color:[.7,.55,.9],alpha:.45,...box(L.name.x+8,L.name.y+L.name.h+8,380,3)})},
 {mats:img(T+'panel',{layer:2,...box(L.mats.x,L.mats.y,L.mats.w,L.mats.h)})},
 heading('mats_head','必要な材料',884,336),
 {stand:img(T+'stand',{layer:3,keep_ratio:true,...box(L.stand.x,L.stand.y,L.stand.w,L.stand.h)})},
 heading('time_head','調合時間',884,600,120),
 {track:img(T+'track',{layer:2,...box(L.track.x,L.track.y,L.track.w,L.track.h)})},
 heading('amount_head','作る数',884,706,90)];

const out={namespace:'cooptown_brew',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:brew')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_brew.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_brew.json')){defs.ui_defs.push('ui/cooptown_brew.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:brew',ROUTE='brew@cooptown_brew.root';
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
console.log('wrote ui/cooptown_brew.json with',BUTTON_COUNT,'slots and routed',TITLE);
