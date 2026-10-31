// Generates ui/cooptown_worldmap.json: the world map (form title "ct:worldmap", book menu マップ), and routes the
// title in ui/server_form.json (add-only). Pictures: tools/build-worldmap.py.
// Run: node tools/build-worldmap-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's worldmap-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / shown marker kind /
// tracking, [off] disabled. The map slot's text is "wm:" + the glyph rows (map-glyphs, drawn with the default font
// like the HUD minimap; MAP_SCALE sets the glyph size).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/worldmap/',SOLID='textures/cooptown/solid';
const W=1600,H=900,HEIGHT=.9,MAP_SCALE=.72;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const CREAM=[.96,.91,.8],INK=[.27,.15,.06],PAPER=[.86,.78,.6],DARK=[.2,.13,.07];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[on]','[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]});
const text=(t,{scale=1,color=CREAM,align='center',anchor='center'}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:5});
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const readout=(name,index,place,controls,extra={})=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls,...extra}});
const glow=state=>img(SOLID,{layer:6,color:[1,1,.8],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const square=pic=>state=>panel([{bg:img(T+pic,{layer:1,keep_ratio:true})},glow(state)]);
const wide=(scale=1.1)=>state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale,color:CREAM})},glow(state),dim('[off]',.45)]);

// ---- layout (px of a 1600 x 900 screen) ----
const MAP={x:30,y:200,w:1150,h:600};
const L={tabs:{x:40,y:118,w:220,h:72,step:232},help:{x:1425,y:22,w:66,h:66},close:{x:1503,y:22,w:66,h:66},
 side:{x:1198,y:118,w:376,h:690},toggles:{x:1236,y:200,w:320,h:56,step:62},
 info:{x:1252,y:496,w:296,h:100},track:{x:1226,y:598,w:320,h:62},setBase:{x:1226,y:668,w:320,h:58},flag:{x:1226,y:734,w:320,h:58},
 coords:{x:40,y:822,w:360,h:60},minus:{x:560,y:815,w:72,h:72},all:{x:642,y:815,w:220,h:72},plus:{x:872,y:815,w:72,h:72},here:{x:954,y:815,w:220,h:72},
 mini:{x:1226,y:822,w:320,h:62}};
const controls=[];let i=0;
// 0-2 dimension tabs
for(let n=0;n<3;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([
 when(`(not ${has('[on]')})`,img(T+'tab',{layer:1})),when(has('[on]'),img(T+'tab_on',{layer:1})),{text:label({scale:1.05,color:INK})},glow(state)])));
// 3 help, 4 close
controls.push(button('help',i++,box(L.help.x,L.help.y,L.help.w,L.help.h),square('help')));
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),square('close')));
// 5-8 marker kinds: checkbox, marker picture, name
const small=(pic,x)=>img(T+pic,{layer:2,keep_ratio:true,size:['16%','80%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[x,0]});
['house','quest','flag','player'].forEach((pic,n)=>controls.push(button('show_'+n,i++,box(L.toggles.x,L.toggles.y+n*L.toggles.step,L.toggles.w,L.toggles.h),state=>panel([
 when(has('[on]'),small('check_on','2%')),when(`(not ${has('[on]')})`,small('check_off','2%')),{pic:small(pic,'22%')},
 {text:panel([{text:label({scale:1.05,color:INK,align:'left',anchor:'left_middle'})}],{size:['58%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})},glow(state)]))));
// 9 track, 10 set base, 11 flag
controls.push(button('track',i++,box(L.track.x,L.track.y,L.track.w,L.track.h),state=>panel([{bg:img(T+'button',{layer:1})},
 when(has('[on]'),img(SOLID,{layer:2,color:[.3,.8,.3],alpha:.25})),{text:label({scale:1.15,color:CREAM})},glow(state),dim('[off]',.45)])));
controls.push(button('set_base',i++,box(L.setBase.x,L.setBase.y,L.setBase.w,L.setBase.h),wide(.95)));
controls.push(button('flag',i++,box(L.flag.x,L.flag.y,L.flag.w,L.flag.h),wide(.95)));
// 12 zoom out, 13 fit all, 14 zoom in, 15 to me
controls.push(button('minus',i++,box(L.minus.x,L.minus.y,L.minus.w,L.minus.h),square('minus')));
controls.push(button('all',i++,box(L.all.x,L.all.y,L.all.w,L.all.h),wide()));
controls.push(button('plus',i++,box(L.plus.x,L.plus.y,L.plus.w,L.plus.h),square('plus')));
controls.push(button('here',i++,box(L.here.x,L.here.y,L.here.w,L.here.h),wide()));
// 16-19 pan arrows over the map edges
const arrow=state=>panel([{bg:img(SOLID,{layer:1,color:DARK,alpha:state==='normal'?.45:.7})},{text:label({scale:1.2,color:CREAM})}]);
const AW=70,AH=46;
for(const [k,x,y] of [['up',MAP.x+MAP.w/2-AW/2,MAP.y+24],['down',MAP.x+MAP.w/2-AW/2,MAP.y+MAP.h-24-AH],['left',MAP.x+24,MAP.y+MAP.h/2-AH/2],['right',MAP.x+MAP.w-24-AW,MAP.y+MAP.h/2-AH/2]])
 controls.push(button('pan_'+k,i++,box(x,y,AW,AH),arrow));
// 20 the map (glyph rows, default font), 21 coordinates, 22 info, 23 minimap settings
// The game leaves a gap between glyphs; a second copy of the rows, shifted right by the gap (GAP_FILL, of the map
// box) and drawn under the first, fills it with the colour of the tile on its left.
const GAP_FILL=['0.35%',0];
const mapRows=(layer,offset=[0,0])=>({type:'label',text:'#text',size:['default','default'],anchor_from:'center',anchor_to:'center',offset,
 font_scale_factor:MAP_SCALE,color:[1,1,1],shadow:false,localize:false,text_alignment:'left',layer,bindings:[textBinding,view("(#form_button_text - 'wm:')",'#text')]});
controls.push(readout('map',i++,box(MAP.x+40,MAP.y+36,MAP.w-80,MAP.h-72),[{fill:mapRows(2,GAP_FILL)},{rows:mapRows(3)}],{clips_children:true,layer:8}));
controls.push(readout('coords',i++,box(L.coords.x,L.coords.y,L.coords.w,L.coords.h),[{bg:img(SOLID,{layer:1,color:DARK,alpha:.55})},{text:label({scale:1.1})}]));
controls.push(readout('info',i++,box(L.info.x,L.info.y,L.info.w,L.info.h),[{text:label({scale:.8,color:INK,align:'left',anchor:'top_left'})}]));
controls.push(button('mini',i++,box(L.mini.x,L.mini.y,L.mini.w,L.mini.h),wide(.95)));
const BUTTON_COUNT=i;

// ---- fixed parts ----
const heading=(name,t,y)=>({[name]:{type:'panel',...box(1198,y,376,40),layer:3,controls:[{text:text(t,{scale:1.2,color:INK})}]}});
const fixed=[
 {bg:img(SOLID,{layer:0,color:DARK,alpha:.94})},
 {header:img(T+'header',{layer:1,...box(0,0,W,108)})},
 {map_icon:img(T+'map',{layer:2,keep_ratio:true,...box(40,18,90,72)})},
 {title:{type:'panel',...box(140,18,500,72),layer:3,controls:[{text:text('ワールドマップ',{scale:1.7,color:INK,align:'left',anchor:'left_middle'})}]}},
 {map_paper:img(SOLID,{layer:1,color:PAPER,...box(MAP.x+30,MAP.y+30,MAP.w-60,MAP.h-60)})},
 {map_frame:img(T+'viewport',{layer:9,...box(MAP.x,MAP.y,MAP.w,MAP.h)})},
 {side:img(T+'sidebar',{layer:1,...box(L.side.x,L.side.y,L.side.w,L.side.h)})},
 heading('show_head','表示',150),heading('base_head','拠点',454)];

const out={namespace:'cooptown_worldmap',root:{type:'panel',size:[`${W/H*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:worldmap')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_worldmap.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_worldmap.json')){defs.ui_defs.push('ui/cooptown_worldmap.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:worldmap',ROUTE='worldmap@cooptown_worldmap.root';
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
console.log('wrote ui/cooptown_worldmap.json with',BUTTON_COUNT,'slots and routed',TITLE);
