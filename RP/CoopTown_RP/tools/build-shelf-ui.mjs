// Generates ui/cooptown_shelf.json: the enchanter's bookshelf (form title "ct:shelf", エンチャント師 only), oak and
// amethyst (pictures: tools/build-shelf.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-shelf-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's shelf-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [bk] a book, [em] an empty place, [lk] a
// locked place (its text: the level), [sel] chosen, [off] button disabled; the unlock bar holds [p1]..[p20].
// Positions inside the frame are measured in the finished design (tools/assets/shelf/bookshelf_preview.png,
// 1672 x 941) and moved onto the background picture (same size, FRAME); the title, badges, close and footer are
// placed on the background picture itself (boxBG).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/shelf/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
// the frame's purple corners: in the design and in the background picture
const FRAME={ref:{x0:100,y0:172,x1:1580,y1:822},bg:{x0:50,y0:137,x1:1622,y1:828}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const boxBG=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.96,.92,.84],INK=[.27,.15,.07],PURPLE=[.45,.2,.7];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[bk]','[em]','[lk]','[sel]','[off]'];
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
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
const glow=state=>img(SOLID,{layer:6,color:[.9,.8,1],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));

// ---- layout ----
const L={close:{x:1532,y:30,w:72,h:72},back:{x:68,y:838,w:212,h:66},hint:{x:1080,y:842,w:510,h:56},
 level:{x:700,y:120,w:240,h:56},count:{x:952,y:120,w:260,h:56},                        // background px
 shelfTitle:{x:143,y:190,w:390,h:47},slots:{x:168,y:255,w:117,h:110,dx:133.5,dy:132},  // design px from here
 info:{x:1020,y:195,w:535,h:432}, // buttons kept off the parchment's thick bottom edge, texts off the lower panel's
iconBox:{x:1048,y:230,w:170,h:182},name:{x:1238,y:230,w:295,h:58},desc:{x:1238,y:300,w:300,h:56},badge:{x:1238,y:362,w:160,h:48},
 primary:{x:1048,y:428,w:475,h:68},secondary:{x:1048,y:506,w:475,h:68},
 nextPanel:{x:1020,y:632,w:535,h:172},next:{x:1060,y:678,w:460,h:36},bar:{x:1052,y:718,w:470,h:26},current:{x:1060,y:748,w:460,h:28}};
// the bar: step k is a clipping panel k/STEPS wide over the whole fill picture, shown while the text has [pk] (every
// lit step has its mark, so the widest shown wins); one mark per check only - the "[pk] and not [pk+1]" form showed
// a full bar in game
const STEPS=20;
const controls=[];let i=0;
// 0 close, 1 back
controls.push(button('close',i++,boxBG(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['52%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,boxBG(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.25,color:INK})},glow(state)])));
// 2-25 the 24 places (6 x 4): a book, an empty place or a locked one (lock and level)
for(let r=0;r<4;r++)for(let c=0;c<6;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 {plain:when(`((not ${has('[sel]')}) and (not ${has('[lk]')}))`,img(T+'slot',{layer:1}))},
 {lit:when(has('[sel]'),img(T+'slot_on',{layer:1}))},
 {locked:when(has('[lk]'),img(T+'locked',{layer:1}))},
 {book:when(has('[bk]'),img(T+'book',{layer:3,keep_ratio:true,size:['70%','70%'],anchor_from:'center',anchor_to:'center'}))},
 {lock:when(has('[lk]'),img(T+'lock',{layer:3,keep_ratio:true,size:['32%','34%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'16%']}))},
 {level:when(has('[lk]'),panel([{text:label({scale:.8,color:[.8,.78,.88]})}],{size:['100%','30%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-10%']}))},
 glow(state)])));
// 26 take out / put in (purple), 27 switch between the store and the inventory (oak)
controls.push(button('primary',i++,box(L.primary.x,L.primary.y,L.primary.w,L.primary.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.4})},glow(state),dim('[off]',.45)])));
controls.push(button('secondary',i++,box(L.secondary.x,L.secondary.y,L.secondary.w,L.secondary.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.4,color:INK})},glow(state)])));
// 28 / 29 the badges: job level, books kept
for(const [k,p] of [['badge_level',L.level],['badge_count',L.count]])controls.push(readout(k,i++,boxBG(p.x,p.y,p.w,p.h),[{bg:img(T+'badge',{layer:1})},{text:label({scale:1})}]));
// 30 shelf title, 31 book picture, 32 name, 33 what it does, 34 kept / carried
controls.push(readout('shelf_title',i++,box(L.shelfTitle.x,L.shelfTitle.y,L.shelfTitle.w,L.shelfTitle.h),[{bg:img(T+'parchment',{layer:1})},{text:label({scale:1,color:INK})}]));
controls.push(readout('book_icon',i++,box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h),[{icon:icon({size:['74%','74%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('book_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.35,color:INK,align:'left',anchor:'left_middle'})}]));
controls.push(readout('book_desc',i++,box(L.desc.x,L.desc.y,L.desc.w,L.desc.h),[{text:label({scale:.72,color:INK,align:'left',anchor:'top_left'})}]));
controls.push(readout('book_badge',i++,box(L.badge.x,L.badge.y,L.badge.w,L.badge.h),[{bg:img(SOLID,{layer:1,color:[.55,.45,.62],alpha:.35})},{text:label({scale:.9,color:INK})}]));
// 35 next unlock, 36 its bar, 37 places now, 38 hint / result line (footer)
controls.push(readout('next',i++,box(L.next.x,L.next.y,L.next.w,L.next.h),[{text:label({scale:.9,color:INK})}]));
const inner={x:L.bar.x+8,y:L.bar.y+6,w:L.bar.w-16,h:L.bar.h-12};
controls.push(readout('bar',i++,box(inner.x,inner.y,inner.w,inner.h),Array.from({length:STEPS},(_,k)=>({['step_'+(k+1)]:when(has(`[p${k+1}]`),{type:'panel',clips_children:true,layer:3,
 size:[`${(k+1)*100/STEPS}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle',
 controls:[{fill:img(T+'fill',{layer:3,size:[`${100*STEPS/(k+1)}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))));
controls.push(readout('current',i++,box(L.current.x,L.current.y,L.current.w,L.current.h),[{text:label({scale:.8,color:INK})}]));
controls.push(readout('hint',i++,boxBG(L.hint.x,L.hint.y,L.hint.w,L.hint.h),[{text:label({scale:.95,align:'right',anchor:'right_middle'})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, the two parchment panels, the book frame, headings, the bar track ----
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...boxBG(630,30,515,90),layer:3,controls:[{text:text('エンチャント師の本棚',{scale:1.6,color:CREAM})}]}},
 {info:img(T+'parchment',{layer:2,...box(L.info.x,L.info.y,L.info.w,L.info.h)})},
 {icon_box:img(SOLID,{layer:3,color:[.55,.45,.62],alpha:.25,...box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h)})},
 {name_line:img(SOLID,{layer:3,color:PURPLE,alpha:.6,...box(L.name.x,L.name.y+L.name.h+4,285,3)})},
 {next_panel:img(T+'parchment',{layer:2,...box(L.nextPanel.x,L.nextPanel.y,L.nextPanel.w,L.nextPanel.h)})},
 {next_head:{type:'panel',...box(L.nextPanel.x,L.nextPanel.y+10,L.nextPanel.w,34),layer:3,controls:[{text:text('◆ 次の解放 ◆',{scale:1.05,color:INK})}]}},
 {track:img(T+'track',{layer:3,...box(L.bar.x,L.bar.y,L.bar.w,L.bar.h)})}];

const out={namespace:'cooptown_shelf',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:shelf')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_shelf.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_shelf.json')){defs.ui_defs.push('ui/cooptown_shelf.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:shelf',ROUTE='shelf@cooptown_shelf.root';
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
console.log('wrote ui/cooptown_shelf.json with',BUTTON_COUNT,'slots and routed',TITLE);
