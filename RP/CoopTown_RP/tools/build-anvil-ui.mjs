// Generates ui/cooptown_anvil.json: the blacksmith's anvil (form title "ct:anvil", 鍛冶師 only), riveted iron
// (pictures: tools/build-anvil.py), and routes the title in ui/server_form.json (add-only).
// Run: node tools/build-anvil-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's anvil-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [on] chosen tab / mode, [sel] chosen,
// [off] button disabled, [ng] not enough; durability bars: [dN] = N steps lit, [y] = the yellow fill.
// Positions are measured in the finished design (tools/assets/anvil/anvil_preview.png, 1672 x 941) and moved
// onto the background picture (same size), whose frame is wider (FRAME).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/anvil/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
// the frame's corner plates: in the design and in the background picture
const FRAME={ref:{x0:222,y0:62,x1:1452,y1:912},bg:{x0:85,y0:75,x1:1588,y1:900}};
const kx=(FRAME.bg.x1-FRAME.bg.x0)/(FRAME.ref.x1-FRAME.ref.x0),ky=(FRAME.bg.y1-FRAME.bg.y0)/(FRAME.ref.y1-FRAME.ref.y0);
const X=x=>FRAME.bg.x0+(x-FRAME.ref.x0)*kx,Y=y=>FRAME.bg.y0+(y-FRAME.ref.y0)*ky;
const pc=v=>(Math.round(v*100000)/1000)+'%';
// a box given in design px, and one given in background px
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(X(x)/BG.w),pc(Y(y)/BG.h)],size:[pc(w*kx/BG.w),pc(h*ky/BG.h)]});
const boxBG=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.94,.9,.84],AMBER=[1,.72,.3],DARK=[.2,.1,.03];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const BARS=Array.from({length:20},(_,k)=>`[d${k+1}]`);
const MARKS=['[on]','[sel]','[off]','[ng]','[y]',...BARS];
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
const glow=state=>img(SOLID,{layer:6,color:[1,.8,.5],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const plate=on=>[when(`(not ${has(on)})`,img(T+'button',{layer:1})),when(has(on),img(T+'button_on',{layer:1}))];
/** A durability bar of steps steps in a box (fractions of the parent): the track and the lit fill ([dN], [y] yellow). */
function bar(steps,place){
 const inset={size:['94%','56%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['3%',0]};
 return panel([{track:img(T+'track',{layer:2})},{fill:panel(Array.from({length:steps},(_,k)=>[
  {[`g${k+1}`]:when(`(${has(`[d${k+1}]`)} and (not ${has('[y]')}))`,img(T+'fill_green',{layer:3,size:[`${(k+1)*100/steps}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'}))},
  {[`y${k+1}`]:when(`(${has(`[d${k+1}]`)} and ${has('[y]')})`,img(T+'fill_yellow',{layer:3,size:[`${(k+1)*100/steps}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'}))}]).flat(),inset)}],place);
}

// ---- layout (design px) ----
const L={close:{x:1380,y:66,w:66,h:62},tabs:{x:283,y:158,w:118,h:55,step:128},hint:{x:300,y:228,w:300,h:42},
 slots:{x:295,y:280,w:158,h:112,dx:171.5,dy:125.7},back:{x:297,y:795,w:165,h:62},prev:{x:512,y:798,w:64,h:58},page:{x:580,y:798,w:130,h:58},next:{x:718,y:798,w:64,h:58},
 iconBox:{x:860,y:160,w:113,h:110},name:{x:993,y:163,w:390,h:52},bar:{x:993,y:228,w:285,h:20},modes:[{x:858,y:290,w:255,h:55},{x:1123,y:290,w:267,h:55}],
 a:{x:870,y:382,w:130,h:122},plus:{x:1020,y:420,w:35,h:45},b:{x:1070,y:398,w:92,h:92},arrow:{x:1178,y:425,w:50,h:40},result:{x:1243,y:382,w:132,h:122},
 afterLabel:{x:880,y:524,w:150,h:34},after:{x:1040,y:532,w:260,h:20},cost:{x:856,y:575,w:535,h:158},rows:{x:868,w:512,h:24,y:[631,655,684,707]}, // two rows in each band of the cost panel (its lines at y 629 / 681)
 
 note:{x:860,y:742,w:530,h:36},action:{x:1055,y:788,w:320,h:72}};
const controls=[];let i=0;
// 0-3 tabs
for(let n=0;n<4;n++)controls.push(button('tab_'+n,i++,box(L.tabs.x+n*L.tabs.step,L.tabs.y,L.tabs.w,L.tabs.h),state=>panel([...plate('[on]'),{text:label({scale:1.1})},glow(state)])));
// 4 close, 5 back, 6 / 7 page arrows
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'square',{layer:1})},{x:img(T+'close',{layer:2,size:['52%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'button',{layer:1})},{text:label({scale:1.2})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'square',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','52%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 8-19 items or recipes (3 x 4): picture and (repair) durability bar; [sel] the amber frame, [ng] dimmed
for(let r=0;r<4;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.slots.x+c*L.slots.dx,L.slots.y+r*L.slots.dy,L.slots.w,L.slots.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),
 {icon:icon({size:['48%','56%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'12%']})},
 {bar:when(has('[d'),bar(10,{size:['56%','9%'],anchor_from:'top_left',anchor_to:'top_left',offset:['22%','80%']}))},
 glow(state),dim('[ng]',.4)])));
// 20 / 21 作成 / 修理
L.modes.forEach((p,n)=>controls.push(button(['mode_make','mode_fix'][n],i++,box(p.x,p.y,p.w,p.h),state=>panel([...plate('[on]'),{text:label({scale:1.15})},glow(state)]))));
// 22 the "+" slot (repair material or book; pressing switches), 23 the action button
controls.push(button('plus_slot',i++,box(L.b.x,L.b.y,L.b.w,L.b.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),{icon:icon({size:['62%','62%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('action',i++,box(L.action.x,L.action.y,L.action.w,L.action.h),state=>panel([{bg:img(T+'button_on',{layer:1})},{text:label({scale:1.35,color:DARK})},glow(state),dim('[off]',.5)])));
// 24 page, 25 chosen picture, 26 name, 27 its durability bar
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:1.1})}]));
controls.push(readout('head_icon',i++,box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h),[{icon:icon({size:['66%','66%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('head_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.35,align:'left',anchor:'left_middle'})}]));
controls.push(readout('head_bar',i++,box(L.bar.x,L.bar.y,L.bar.w,L.bar.h),[{bar:bar(20,{})}]));
// 28 the item before, 29 after (picture and bar), 30 "修理後", 31 its bar
for(const [k,p] of [['before',L.a],['result',L.result]])controls.push(readout(k,i++,box(p.x,p.y,p.w,p.h),[
 {icon:icon({size:['56%','56%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'12%']})},
 {bar:when(has('[d'),bar(10,{size:['64%','8%'],anchor_from:'top_left',anchor_to:'top_left',offset:['18%','81%']}))}])); // bars only where the text has [dN]
controls.push(readout('after_label',i++,box(L.afterLabel.x,L.afterLabel.y,L.afterLabel.w,L.afterLabel.h),[{text:label({scale:1,align:'right',anchor:'right_middle'})}]));
controls.push(readout('after_bar',i++,box(L.after.x,L.after.y,L.after.w,L.after.h),[{bar:bar(20,{})}]));
// 32-35 needed: picture and name, 36-39 carried / needed
const row=k=>({x:L.rows.x,y:L.rows.y[k],w:L.rows.w,h:L.rows.h});
for(let k=0;k<4;k++){const r=row(k);controls.push(readout('row_'+k,i++,box(r.x,r.y,r.w*.72,r.h),[
 {icon:icon({size:['8%','90%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0]})},
 {name:panel([{text:label({scale:.75,align:'left',anchor:'left_middle'})}],{size:['86%','100%'],anchor_from:'right_middle',anchor_to:'right_middle'})}]));}
for(let k=0;k<4;k++){const r=row(k);controls.push(readout('row_count_'+k,i++,box(r.x+r.w*.72,r.y,r.w*.26,r.h),[{text:label({scale:.8,align:'right',anchor:'right_middle'})}]));}
// 40 "装備を選択" / "レシピを選択", 41 note / result line
controls.push(readout('hint',i++,box(L.hint.x,L.hint.y,L.hint.w,L.hint.h),[{text:label({scale:1.1,align:'left',anchor:'left_middle'})}]));
controls.push(readout('note',i++,box(L.note.x,L.note.y,L.note.w,L.note.h),[{text:label({scale:.72,color:[.8,.76,.7],align:'left',anchor:'left_middle'})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, frames, "+" and arrow, cost panel headings ----
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...boxBG(752,58,310,96),layer:3,controls:[{text:text('鍛冶師の金床',{scale:1.6,color:AMBER})}]}},
 {icon_box:img(T+'slot',{layer:2,...box(L.iconBox.x,L.iconBox.y,L.iconBox.w,L.iconBox.h)})},
 {before_box:img(T+'slot',{layer:2,...box(L.a.x,L.a.y,L.a.w,L.a.h)})},
 {result_box:img(T+'slot',{layer:2,...box(L.result.x,L.result.y,L.result.w,L.result.h)})},
 {plus:img(T+'plus',{layer:2,keep_ratio:true,...box(L.plus.x,L.plus.y,L.plus.w,L.plus.h)})},
 {arrow:img(T+'arrow',{layer:2,keep_ratio:true,...box(L.arrow.x,L.arrow.y,L.arrow.w,L.arrow.h)})},
 {cost_panel:img(T+'cost_panel',{layer:2,...box(L.cost.x,L.cost.y,L.cost.w,L.cost.h)})},
 {need:{type:'panel',...box(878,580,220,34),layer:3,controls:[{text:text('必要なもの',{scale:.9,align:'left',anchor:'left_middle'})}]}},
 {need_head:{type:'panel',...box(1170,580,200,34),layer:3,controls:[{text:text('所持 / 必要',{scale:.75,align:'right',anchor:'right_middle'})}]}}];

const out={namespace:'cooptown_anvil',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:anvil')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_anvil.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_anvil.json')){defs.ui_defs.push('ui/cooptown_anvil.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:anvil',ROUTE='anvil@cooptown_anvil.root';
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
console.log('wrote ui/cooptown_anvil.json with',BUTTON_COUNT,'slots and routed',TITLE);
