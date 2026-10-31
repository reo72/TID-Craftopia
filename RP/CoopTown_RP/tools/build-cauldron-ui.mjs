// Generates ui/cooptown_cauldron.json: the alchemist's experiment cauldron (form title "ct:cauldron", 調合師 only),
// black iron in three columns (pictures: tools/build-cauldron.py), and routes the title in ui/server_form.json.
// Run: node tools/build-cauldron-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's cauldron-runtime.js): each is a slot
// here with that collection_index, hidden while its text is empty. Marks: [sel] chosen material, [ng] none carried,
// [off] disabled, [ok] / [no] success / failure; the bar's text holds [p1]..[p20].
// Positions are background px (1672 x 941), laid out after the finished design (tools/assets/cauldron/
// cauldron_preview.png) inside the background's own columns (left 112-540, middle 568-1105, right 1132-1560,
// y 130-770; footer y 800-870).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/cauldron/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.88;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.95,.92,.86],GOLD=[1,.82,.42],SOFT=[.72,.68,.8],DARK=[.22,.12,.03];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[sel]','[ng]','[off]','[ok]','[no]'];
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
const glow=state=>img(SOLID,{layer:6,color:[.9,.8,1],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const dim=(mark,alpha)=>when(has(mark),img(SOLID,{layer:7,color:[0,0,0],alpha}));
const slotFace=state=>panel([when(`(not ${has('[sel]')})`,img(T+'slot',{layer:1})),when(has('[sel]'),img(T+'slot_on',{layer:1})),glow(state)]);

// ---- layout (background px) ----
const L={close:{x:1494,y:30,w:60,h:60},back:{x:124,y:806,w:184,h:58},
 grid:{x:132,y:188,w:125,h:112,dx:133,dy:120},prev:{x:132,y:548,w:46,h:32},page:{x:276,y:548,w:120,h:32},next:{x:494,y:548,w:46,h:32},
 inputs:{x:150,y:634,w:110,h:106,dx:120},
 cauldron:{x:600,y:185,w:470,h:380},bar:{x:650,y:575,w:370,h:30},time:{x:600,y:612,w:470,h:34},experiment:{x:625,y:655,w:420,h:95},
 result:{x:1150,y:185,w:392,h:570},badge:{x:1195,y:215,w:300,h:70},scroll:{x:1255,y:300,w:180,h:190},name:{x:1160,y:500,w:372,h:50},sub:{x:1160,y:550,w:372,h:30},
 receive:{x:1180,y:600,w:330,h:80},note:{x:1160,y:695,w:372,h:40}};
// the bar: step k is a clipping panel k/STEPS wide over the whole fill picture, shown while the text has [pk] (every
// lit step has its mark, so the widest shown wins); one mark per check only - the "[pk] and not [pk+1]" form showed
// a full bar in game
const STEPS=20;
const controls=[];let i=0;
// 0 close, 1 back (in the footer), 2 / 3 material pages
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'back',{layer:1})},{x:img(T+'close',{layer:2,size:['50%','50%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),state=>panel([{bg:img(T+'back',{layer:1})},{text:label({scale:1.2})},glow(state)])));
for(const [k,p,pic] of [['prev',L.prev,'nav_left'],['next',L.next,'nav_right']])
 controls.push(button(k,i++,box(p.x,p.y,p.w,p.h),state=>panel([{bg:img(T+'back',{layer:1})},{arrow:img(T+pic,{layer:2,keep_ratio:true,size:['40%','60%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 4-12 materials (3 x 3): picture and name; [sel] the purple frame, [ng] dimmed
for(let r=0;r<3;r++)for(let c=0;c<3;c++)controls.push(button(`slot_${r}_${c}`,i++,box(L.grid.x+c*L.grid.dx,L.grid.y+r*L.grid.dy,L.grid.w,L.grid.h),state=>panel([
 slotFace(state),{icon:icon({size:['38%','46%'],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,'12%']})},
 {caption:panel([{text:label({scale:.62})}],{size:['94%','28%'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,'-6%']})},dim('[ng]',.45)])));
// 13-15 the three put in (pressing one takes it out again)
for(let k=0;k<3;k++)controls.push(button('input_'+k,i++,box(L.inputs.x+k*L.inputs.dx,L.inputs.y,L.inputs.w,L.inputs.h),state=>panel([
 {bg:img(T+'slot_on',{layer:1})},{icon:icon({size:['56%','56%'],anchor_from:'center',anchor_to:'center'})},glow(state)])));
// 16 experiment, 17 receive / clear away
controls.push(button('experiment',i++,box(L.experiment.x,L.experiment.y,L.experiment.w,L.experiment.h),state=>panel([{bg:img(T+'experiment',{layer:1})},{text:label({scale:1.6})},glow(state),dim('[off]',.45)])));
controls.push(button('receive',i++,box(L.receive.x,L.receive.y,L.receive.w,L.receive.h),state=>panel([{bg:img(T+'receive',{layer:1})},{text:label({scale:1.45,color:DARK})},glow(state),dim('[off]',.45)])));
// 18 bar, 19 time
const inner={x:L.bar.x+8,y:L.bar.y+7,w:L.bar.w-16,h:L.bar.h-14};
controls.push(readout('bar',i++,box(inner.x,inner.y,inner.w,inner.h),Array.from({length:STEPS},(_,k)=>({['step_'+(k+1)]:when(has(`[p${k+1}]`),{type:'panel',clips_children:true,layer:3,
 size:[`${(k+1)*100/STEPS}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle',
 controls:[{fill:img(T+'fill',{layer:3,size:[`${100*STEPS/(k+1)}%`,'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))));
controls.push(readout('time',i++,box(L.time.x,L.time.y,L.time.w,L.time.h),[{text:label({scale:.85})}]));
// 20 success / failure badge, 21 the scroll, 22 result name, 23 its line, 24 note / result line, 25 page
controls.push(readout('badge',i++,box(L.badge.x,L.badge.y,L.badge.w,L.badge.h),[
 {ok:when(has('[ok]'),img(T+'success',{layer:1}))},{no:when(has('[no]'),img(T+'failure',{layer:1}))},{text:label({scale:1.4})}]));
controls.push(readout('scroll',i++,box(L.scroll.x,L.scroll.y,L.scroll.w,L.scroll.h),[{icon:icon({size:['100%','100%'],anchor_from:'center',anchor_to:'center'})}]));
controls.push(readout('result_name',i++,box(L.name.x,L.name.y,L.name.w,L.name.h),[{text:label({scale:1.35})}]));
controls.push(readout('result_sub',i++,box(L.sub.x,L.sub.y,L.sub.w,L.sub.h),[{text:label({scale:.8,color:SOFT})}]));
controls.push(readout('note',i++,box(L.note.x,L.note.y,L.note.w,L.note.h),[{text:label({scale:.7,color:SOFT})}]));
controls.push(readout('page',i++,box(L.page.x,L.page.y,L.page.w,L.page.h),[{text:label({scale:.85})}]));
const BUTTON_COUNT=i;

// ---- fixed parts: background, title, column headings, the cauldron, the result panel, the bar track, the footer steps ----
const heading=(name,t,x,y,w)=>({[name]:{type:'panel',...box(x,y,w,40),layer:3,controls:[{text:text('◇ '+t+' ◇',{scale:1.05})}]}});
const step=(name,t,x,w,pic)=>[{[name]:{type:'panel',...box(x,806,w,58),layer:3,controls:[{text:text(t,{scale:.95,align:'left',anchor:'left_middle'})}]}},
 {[name+'_pic']:img(pic,{layer:3,keep_ratio:true,...box(x+w,810,56,50)})}];
const fixed=[
 {bg:img(T+'background',{layer:1})},
 {title:{type:'panel',...box(545,22,580,86),layer:3,controls:[{text:text('調合師の実験大釜',{scale:1.6,color:GOLD})}]}},
 heading('materials_head','実験に使う素材',130,140,392),heading('inputs_head','投入する素材',130,592,392),
 heading('cauldron_head','素材を組み合わせて発見',580,140,512),heading('result_head','実験結果',1145,140,402),
 ...[0,1,2].map(k=>({['input_frame_'+k]:img(T+'slot',{layer:2,...box(L.inputs.x+k*L.inputs.dx,L.inputs.y,L.inputs.w,L.inputs.h)})})), // empty frames under the inputs
 {cauldron:img(T+'cauldron',{layer:2,keep_ratio:true,...box(L.cauldron.x,L.cauldron.y,L.cauldron.w,L.cauldron.h)})},
 {track:img(T+'track',{layer:2,...box(L.bar.x,L.bar.y,L.bar.w,L.bar.h)})},
 {result_panel:img(T+'result',{layer:2,...box(L.result.x,L.result.y,L.result.w,L.result.h)})},
 ...step('step1','① 実験する',340,200,T+'cauldron'),{arrow1:img(T+'arrow',{layer:3,keep_ratio:true,...box(620,814,50,42)})},
 ...step('step2','② レシピを使って習得',700,300,T+'scroll'),{arrow2:img(T+'arrow',{layer:3,keep_ratio:true,...box(1080,814,50,42)})},
 ...step('step3','③ 醸造台で製作',1160,250,'textures/cooptown/brew/stand')];

const out={namespace:'cooptown_cauldron',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:cauldron')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_cauldron.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_cauldron.json')){defs.ui_defs.push('ui/cooptown_cauldron.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:cauldron',ROUTE='cauldron@cooptown_cauldron.root';
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
console.log('wrote ui/cooptown_cauldron.json with',BUTTON_COUNT,'slots and routed',TITLE);
