// Generates ui/cooptown_admin.json: the admin (運営) screen, form title "ct:admin", drawn as the staff ledger: the
// guide book's open book (textures/cooptown/book) with index tabs for the sections along its top edge, the list on the
// left page and the details and actions on the right page. Positions are px of a 1459 x 978 canvas (the book is
// 1459 x 888, drawn 90 px down to leave room for the tabs).
// Run: node tools/build-admin-ui.mjs   (from the CoopTown_RP folder)
// Button order must match ADMIN_LAYOUT in the BP's admin-runtime.js.
// Markers in a button label pick its look: [on] current section, [warn] red, [ok] green, [off] greyed.
import {VANILLA_COND} from './form-route.mjs';
import {pixelFont} from './pixel-font.mjs';
import fs from 'fs';
const B='textures/cooptown/book/',P='textures/cooptown/pages/',SOLID='textures/cooptown/solid';
const W=1459,H=978,TOP=90;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const textBinding={binding_name:'#form_button_text',binding_name_override:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const textureBinding={binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'};
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[on]','[warn]','[ok]','[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const showIf=cond=>[textBinding,view(cond,'#visible')];
const INK=[.22,.09,.05],MUTED=[.45,.32,.2],CREAM=[1,.96,.86],WHITE=[1,1,1];
const img=(texture,layer,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],layer,...extra});
const inner=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[x+'%',y+'%'],size:[w+'%',h+'%']});

function label({align='center',scale=1,color=INK,shadow=false,pad=0,layer=5,anchor}={}){
 const center=align==='center';
 return {type:'label',text:'#text',color,shadow,font_size:'normal',font_scale_factor:scale,text_alignment:align,localize:false,layer,
  ...(center?{size:['100%','default'],anchor_from:anchor??'center',anchor_to:anchor??'center',offset:[0,0]}
   :{size:[`100% - ${pad*2}%`,'default'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[pad+'%',0]}),
  bindings:[textBinding,view(stripped,'#text')]};
}
const icon=(place,layer=4)=>({type:'image',texture:'#texture',keep_ratio:true,...place,layer,bindings:[textureBinding,view("(not (#texture = ''))",'#visible')]});
// a form button; look(state) gives its face for 'normal' / 'hover' / 'pressed'
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,'$pressed_button_name':'button.form_button_click',layer:10,
  bindings:[textBinding,view("(not (#form_button_text = ''))",'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const face=controls=>({type:'panel',size:['100%','100%'],controls});
const glow=(state,layer=6)=>state==='normal'?[]:[{glow:img(SOLID,layer,{color:WHITE,alpha:state==='hover'?.12:.2})}];
// index tab: brown, red for the open section; the icon above a small name
const tabLook=state=>face([
 {plain:{...img(B+'tab',1),bindings:showIf(`(not ${has('[on]')})`)}},
 {open:{...img(B+'tab_selected',1),bindings:showIf(has('[on]'))}},
 {icon:icon(inner(30,12,40,42))},
 {text:{type:'panel',...inner(0,58,100,30),layer:5,controls:[{t:label({scale:.62,color:CREAM,shadow:true})}]}},
 ...glow(state)]);
// list row: a parchment strip (green while pointed at), the icon at the left
const rowLook=state=>face([
 {strip:img(B+(state==='normal'?'button_wide':'button_wide_selected'),1)},
 {icon:icon(inner(2,12,7,76))},
 {text:{type:'panel',...inner(10,0,88,100),layer:5,controls:[{t:label({align:'left',scale:.72})}]}}]);
// small brown buttons (back, page arrows)
const navLook=state=>face([{bg:img(P+'button_back',1)},{t:label({scale:.85,color:CREAM,shadow:true})},...glow(state)]);
// actions: blue, green [ok], red [warn], grey [off]
const actionLook=state=>face([
 {plain:{...img(P+'button_action',1),bindings:showIf(`(((not ${has('[ok]')}) and (not ${has('[warn]')})) and (not ${has('[off]')}))`)}},
 {ok:{...img(P+'button_confirm',1),bindings:showIf(has('[ok]'))}},
 {warn:{...img(P+'button_neutral',1,{color:[1,.42,.36]}),bindings:showIf(has('[warn]'))}},
 {off:{...img(P+'button_disabled',1),bindings:showIf(has('[off]'))}},
 {text:{type:'panel',...inner(6,0,88,100),layer:5,controls:[{t:label({scale:.78,color:WHITE,shadow:true})}]}},
 ...glow(state)]);
const closeLook=state=>face([img(B+'close',1),...glow(state,2)]);
function readout(name,index,place,opts={}){
 return {[name]:{type:'panel',collection_index:index,...place,layer:10,bindings:showIf("(not (#form_button_text = ''))"),controls:[{text:label(opts)}]}};
}

// ---- layout (slots in ADMIN_LAYOUT order) ----
const controls=[];let i=0;
const TAB=(n)=>box(70+n*153,6,145,100);
for(let n=0;n<8;n++)controls.push(button('section_'+n,i++,TAB(n+1),tabLook)); // 0-7, after 概要
controls.push(button('home',i++,TAB(0),tabLook));                             // 8
controls.push(button('back',i++,box(575,TOP+48,115,46),navLook));              // 9
controls.push(button('close',i++,box(1378,TOP+6,72,70),closeLook));            // 10
for(let n=0;n<8;n++)controls.push(button('row_'+n,i++,box(88,TOP+142+n*76,604,68),rowLook)); // 11-18
controls.push(button('prev',i++,box(88,TOP+756,90,48),navLook));               // 19
controls.push(button('next',i++,box(602,TOP+756,90,48),navLook));              // 20
for(let n=0;n<6;n++)controls.push(button('action_'+n,i++,box(782+(n%2)*310,TOP+578+Math.floor(n/2)*76,300,66),actionLook)); // 21-26
controls.push(readout('title',i++,box(112,TOP+44,455,52),{align:'left',scale:1.3}));
controls.push(readout('crumb',i++,box(112,TOP+96,578,34),{align:'left',scale:.72,color:MUTED}));
controls.push(readout('page',i++,box(190,TOP+756,400,48),{scale:.8,color:MUTED}));
controls.push(readout('status',i++,box(785,TOP+44,580,44),{align:'left',scale:.8}));
// detail: multi-line text on the right page, top-left aligned
controls.push({detail:{type:'panel',collection_index:i++,...box(790,TOP+108,600,450),layer:10,bindings:showIf("(not (#form_button_text = ''))"),
 controls:[{text:{type:'label',text:'#text',color:INK,shadow:false,font_size:'normal',font_scale_factor:.76,text_alignment:'left',localize:false,layer:5,
  size:['100%','default'],anchor_from:'top_left',anchor_to:'top_left',bindings:[textBinding,view(stripped,'#text')]}}]}});
const BUTTON_COUNT=i;

const rule=(x,y,w)=>({type:'image',texture:SOLID,keep_ratio:false,color:MUTED,alpha:.55,layer:3,...box(x,y,w,3)});
const out={namespace:'cooptown_admin',root:{type:'panel',size:[`${W/H*100}%y`,'94%'],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:admin')",'#visible')],
 controls:[
  {book:img(B+'book',2,box(0,TOP,1459,888))},
  {rule_left:rule(95,TOP+132,595)},
  {rule_right:rule(785,TOP+92,600)},
  {rule_actions:rule(785,TOP+564,600)},
  {brand:{type:'label',text:'運営の手帳',color:MUTED,font_scale_factor:.7,localize:false,layer:3,text_alignment:'right',...box(1100,TOP+790,280,30)}},
  {buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}
 ]}};
pixelFont(out); // all text in the pixel font (tools/pixel-font.mjs)
fs.writeFileSync('ui/cooptown_admin.json',JSON.stringify(out,null,1)+'\n');
// register the screen and route the "ct:admin" title to it
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));if(!defs.ui_defs.includes('ui/cooptown_admin.json'))defs.ui_defs.push('ui/cooptown_admin.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host;
// add-only: other tools also edit this condition (journal pages), so never rewrite it
const cond=host.controls[0].vanilla_host.bindings[1];
cond.source_property_name=VANILLA_COND; // tools/form-route.mjs
if(!host.controls.some(c=>c['admin@cooptown_admin.root']))host.controls.push({'admin@cooptown_admin.root':{}});
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_admin.json with',BUTTON_COUNT,'slots');
