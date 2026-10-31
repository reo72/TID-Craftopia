// Generates ui/cooptown_enchant.json: the enchanting table screen (form title "ct:enchant", エンチャント師 only),
// obsidian and amethyst (pictures: tools/build-enchant.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-enchant-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's enchant-runtime.js): each is a
// slot here with that collection_index, hidden while its text is empty. Marks in a button's text pick its look:
// [on] chosen tab, [sel] chosen item / offer, [ng] offer not affordable, [off] enchant button disabled.
// Positions are measured in the finished design (tools/assets/enchant/enchanting_preview.png, 1672 x 941) and
// moved onto the background picture (1536 x 1024), whose frame sits a little differently (FRAME).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/enchant/',SOLID='textures/cooptown/solid';
const BG={w:1536,h:1024},HEIGHT=.9;
// the frame's gem corners: in the design and in the background picture
const FRAME={ref:{x0:203,y0:85,x1:1472,y1:902},bg:{x0:40,y0:80,x1:1497,y1:985}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
// a box given in design px
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const CREAM=[.94,.91,1],GOLD=[1,.86,.48],RUNE=[.72,.52,1],SOFT=[.78,.74,.9];
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
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>img(SOLID,{layer:6,color:[.85,.7,1],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=(on)=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];

// ---- layout (design px) ----
const L={title:{x:668,y:93,w:340,h:62},close:{x:1365,y:108,w:57,h:55},tabs:{x:275,y:182,w:145,h:60,step:157.5},hint:{x:330,y:262,w:520,h:40},
 slots:{x:352,y:312,w:146,h:108,dx:162.5,dy:119.5},back:{x:280,y:786,w:217,h:60},prev:{x:555,y:788,w:70,h:56},page:{x:630,y:788,w:135,h:56},next:{x:772,y:788,w:70,h:56}, // kept clear of the frame's bottom edge (the background's frame is lower than the design's)
 
 header:{x:940,y:185,w:478,h:95},offers:{x:938,y:297,w:480,h:92,dy:108},cost:{x:938,y:628,w:480,h:142},enchant:{x:940,y:780,w:476,h:68}};
const controls=[];let i=0;
// 0-3 tabs
for(let n=0;n<4;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),
 {icon:icon({size:['22%','56%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['9%',0]})},
 {caption:panel([{text:label({scale:1})}],{size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-5%',0]})},glow(state)])));
// 4 close, 5 back, 6 / 7 page arrows (the wooden square of the workbench set under the close cross)
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img('textures/cooptown/bench/square',{layer:1})},{x:img(T+'close',{layer:2,size:['56%','56%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.15})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 8-19 the player's enchantable items (3 x 4): the item's picture; [sel] the lit frame
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),
 {icon:icon({size:['56%','70%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 20-22 the three offers: book, first enchantment " … ？"; [sel] lit, [ng] dimmed
const O=n=>({x:L.offers.x,y:L.offers.y+n*L.offers.dy,w:L.offers.w,h:L.offers.h});
for(let n=0;n<3;n++){const o=O(n);controls.push(button('offer_'+n,i++,box(o.x,o.y,o.w,o.h),state=>panel([...plate('[sel]'),
 {book:img(T+'book',{layer:3,keep_ratio:true,size:['14%','62%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2.5%',0]})},
 {name:panel([{text:label({scale:.95,align:'left',anchor:'left_middle'})}],{size:['50%','40%'],anchor_from:'top_left',anchor_to:'top_left',offset:['19%','46%']})},
 {split:img(SOLID,{layer:3,color:SOFT,alpha:.6,size:[1,'56%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['71%',0]})},
 {need:panel([{text:text('必要レベル',{scale:.7})}],{size:['26%','36%'],anchor_from:'top_right',anchor_to:'top_right',offset:['-2%','12%']})},
 glow(state),dim('[ng]',.35)])));}
// 23-25 runes over each offer, 26-28 each offer's level
for(let n=0;n<3;n++){const o=O(n);controls.push(readout('rune_'+n,i++,box(o.x+o.w*.19,o.y+o.h*.12,o.w*.5,o.h*.34),[{text:label({scale:.75,color:RUNE,align:'left',anchor:'left_middle'})}]));}
for(let n=0;n<3;n++){const o=O(n);controls.push(readout('cost_'+n,i++,box(o.x+o.w*.72,o.y+o.h*.46,o.w*.26,o.h*.46),[{text:label({scale:1.35})}]));}
// 29 enchant
controls.push(button('enchant',i++,box(L.enchant.x,L.enchant.y,L.enchant.w,L.enchant.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.35})},glow(state),dim('[off]',.45)])));
// 30 page, 31 chosen item's picture, 32 its name, 33 player's level, 34 levels spent, 35 lapis, 36 hint / result line
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.1})}]));
controls.push(readout('item_icon',i++,box(L.header.x+8,L.header.y+8,L.header.h-16,L.header.h-16),[{icon:icon({size:['72%','72%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('item_name',i++,box(L.header.x+L.header.h+14,L.header.y,L.header.w-L.header.h-30,L.header.h),[{text:label({scale:1.3,align:'left',anchor:'left_middle'})}]));
const row=n=>({x:L.cost.x,y:L.cost.y+10+n*42,w:L.cost.w,h:40});
for(const [k,n] of [['my_level',0],['spend',1],['lapis_count',2]]){const r=row(n);controls.push(readout(k,i++,box(r.x+r.w*.55,r.y,r.w*.4,r.h),[{text:label({scale:1,align:'right',anchor:'right_middle'})}]));}
controls.push(readout('hint',i++,box(L.hint.x,L.hint.y,L.hint.w,L.hint.h),[{text:label({scale:.95,color:GOLD})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, the left panel's frame, item header, cost panel and its labels ----
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...box(L.title.x,L.title.y,L.title.w,L.title.h),layer:3,controls:[{plate:img(T+'header',{layer:1})},{text:text('エンチャント',{scale:1.5,color:GOLD})}]}},
 {header:img(T+'header',{layer:2,...box(L.header.x,L.header.y,L.header.w,L.header.h)})},
 {header_box:img(T+'slot',{layer:3,...box(L.header.x+6,L.header.y+6,L.header.h-12,L.header.h-12)})},
 {cost_panel:img(T+'cost_panel',{layer:2,...box(L.cost.x,L.cost.y,L.cost.w,L.cost.h)})},
 ...[['所持レベル',0],['消費',1],['ラピスラズリ',2]].map(([t,n])=>{const r=row(n);return {['cost_label_'+n]:{type:'panel',...box(r.x+(n===2?78:26),r.y,240,r.h),layer:3,controls:[{text:text(t,{scale:.9,align:'left',anchor:'left_middle'})}]}};}),
 {lapis:img(T+'lapis',{layer:3,keep_ratio:true,...box(row(2).x+24,row(2).y+3,44,34)})}];

const out={namespace:'cooptown_enchant',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:enchant')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_enchant.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_enchant.json')){defs.ui_defs.push('ui/cooptown_enchant.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:enchant',ROUTE='enchant@cooptown_enchant.root';
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
console.log('wrote ui/cooptown_enchant.json with',BUTTON_COUNT,'slots and routed',TITLE);
