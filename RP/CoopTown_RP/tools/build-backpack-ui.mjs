// Generates ui/cooptown_backpack.json: the backpack (form title "ct:backpack"), leather and canvas (pictures:
// tools/build-backpack.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-backpack-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's backpack-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [sel] chosen, [em] an empty place, [on]
// chosen amount, [off] disabled. A place's text is its count (blank for one).
// Positions are background px (1672 x 941), after the finished design (tools/assets/backpack/backpack_preview.png),
// inside the background's own parts (canvas 205-975, leather pocket 1020-1475, y 180-845; header 445-1460, y 45-160).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/backpack/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.98,.93,.84],DARK=[.25,.13,.04];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[sel]','[em]','[on]','[off]'];
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
const glow=state=>img(SOLID,{layer:6,color:[1,.9,.6],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=on=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];
// an item place: frame ([sel] the gold one), the item's picture and its count at the bottom right
const place=state=>panel([when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),
 {icon:when(`(not ${has('[em]')})`,icon({size:['64%','64%'],anchor_from:'center',anchor_to:'center'}))},
 {count:panel([{text:label({scale:1,align:'right',anchor:'bottom_right'})}],{size:['86%','40%'],anchor_from:'bottom_right',anchor_to:'bottom_right',offset:['-8%','-8%']})},glow(state)]);

// ---- layout (background px) ----
const L={close:{x:1356,y:60,w:84,h:84},capacity:{x:1000,y:75,w:236,h:64},
 gridTitle:{x:230,y:195,w:260,h:52},grid:{x:232,y:262,w:112,h:112,dx:120,dy:118},back:{x:232,y:752,w:220,h:72},
 prev:{x:640,y:760,w:60,h:56},page:{x:705,y:760,w:110,h:56},next:{x:820,y:760,w:60,h:56},
 selTitle:{x:1040,y:195,w:290,h:52},pocket:{x:1040,y:255,w:415,h:170},selIcon:{x:1055,y:270,w:140,h:140},selName:{x:1205,y:280,w:240,h:50},selCount:{x:1205,y:335,w:240,h:70},
 amounts:[{x:1040,y:440,w:130,h:60},{x:1180,y:440,w:130,h:60},{x:1320,y:440,w:135,h:60}],take:{x:1040,y:510,w:415,h:78},
 depTitle:{x:1040,y:608,w:300,h:52},depSlot:{x:1048,y:670,w:130,h:130},deposit:{x:1195,y:690,w:260,h:90},hint:{x:1040,y:806,w:415,h:32}};
const controls=[];let i=0;
// 0 close, 1 back, 2 / 3 pages (choosing from the inventory)
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['50%','50%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'leather',{layer:1})},{text:label({scale:1.3})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 4-27 the 24 places (6 x 4)
for(let r=0;r<4;r++)for(let c=0;c<6;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.grid.x+c*L.grid.dx,L.grid.y+r*L.grid.dy,L.grid.w,L.grid.h),place));
// 28 capacity, 29 grid title, 30 chosen picture, 31 name, 32 count
controls.push(readout('capacity',i++,box(L.capacity.x,L.capacity.y,L.capacity.w,L.capacity.h),[{bg:img(T+'plaque',{layer:1})},{text:label({scale:1.05})}]));
controls.push(readout('grid_title',i++,box(L.gridTitle.x,L.gridTitle.y,L.gridTitle.w,L.gridTitle.h),[{bg:img(T+'plaque',{layer:1})},{text:label({scale:1.05})}]));
controls.push(readout('sel_icon',i++,box(L.selIcon.x,L.selIcon.y,L.selIcon.w,L.selIcon.h),[{bg:img(T+'slot',{layer:1})},{icon:icon({size:['66%','66%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('sel_name',i++,box(L.selName.x,L.selName.y,L.selName.w,L.selName.h),[{text:label({scale:.95,align:'left',anchor:'left_middle'})}]));
controls.push(readout('sel_count',i++,box(L.selCount.x,L.selCount.y,L.selCount.w,L.selCount.h),[{text:label({scale:2,align:'left',anchor:'left_middle'})}]));
// 33-35 amount (1 / half / all), 36 take out
L.amounts.forEach((p,n)=>controls.push(button('amount_'+n,i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),
 {on_text:when(has('[on]'),label({scale:1.05,color:DARK}))},{off_text:when(`(not ${has('[on]')})`,label({scale:1.05}))},glow(state)]))));
controls.push(button('take',i++,box(L.take.x,L.take.y,L.take.w,L.take.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.45,color:DARK})},glow(state),dim('[off]',.45)])));
// 37 the item to put in (pressing it lists the inventory), 38 put in, 39 hint / result line, 40 page
controls.push(button('deposit_slot',i++,box(L.depSlot.x,L.depSlot.y,L.depSlot.w,L.depSlot.h),place));
controls.push(button('deposit',i++,box(L.deposit.x,L.deposit.y,L.deposit.w,L.deposit.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.45,color:DARK})},glow(state),dim('[off]',.45)])));
controls.push(readout('hint',i++,box(L.hint.x,L.hint.y,L.hint.w,L.hint.h),[{text:label({scale:.7})}]));
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.1})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, the bag picture and title, the pockets and headings ----
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {bag:img(T+'icon',{layer:3,keep_ratio:true,...box(470,58,92,92)})},
 {title:{type:'panel',...box(570,52,420,104),layer:3,controls:[{text:text('バックパック',{scale:1.9,align:'left',anchor:'left_middle'})}]}},
 {sel_head:{type:'panel',...box(L.selTitle.x,L.selTitle.y,L.selTitle.w,L.selTitle.h),layer:3,controls:[{plaque:img(T+'plaque',{layer:1})},{text:text('選択中のアイテム',{scale:1})}]}},
 {pocket:img(T+'pocket',{layer:2,...box(L.pocket.x,L.pocket.y,L.pocket.w,L.pocket.h)})},
 {dep_head:{type:'panel',...box(L.depTitle.x,L.depTitle.y,L.depTitle.w,L.depTitle.h),layer:3,controls:[{plaque:img(T+'plaque',{layer:1})},{text:text('持ち物から預ける',{scale:1})}]}}];

const out={namespace:'cooptown_backpack',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:backpack')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_backpack.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_backpack.json')){defs.ui_defs.push('ui/cooptown_backpack.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:backpack',ROUTE='backpack@cooptown_backpack.root';
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
console.log('wrote ui/cooptown_backpack.json with',BUTTON_COUNT,'slots and routed',TITLE);
