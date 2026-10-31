// Generates ui/cooptown_rune.json: the rune workshop 刻印の工房 (form title "ct:rune", 付与術師, sneak + enchanting
// table), and routes the title in ui/server_form.json (add-only). Pictures: tools/build-rune.py.
// Run: node tools/build-rune-ui.mjs   (from the CoopTown_RP folder)
//
// The screen is an ActionForm whose buttons come in a fixed order (L in the BP's rune-runtime.js): each is a slot here
// with that collection_index, hidden while its text is empty. Marks: [sel] chosen line / rune, [on] success, [ng]
// failure, [off] disabled; the gauge's text holds one of [g1]..[g10]. Code lines come coloured by the BP (§ codes).
// Positions are px of the design (tools/assets/rune/preview.jpg and the frame picture, 1672 x 941).
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/rune/',SOLID='textures/cooptown/solid';
const W=1672,H=941,HEIGHT=.9;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const CREAM=[.96,.91,.8],GOLD=[1,.84,.45],WHITE=[1,1,1],DIM=[.75,.7,.85],RED=[1,.42,.38],GREEN=[.55,1,.6],BG=[.09,.07,.16];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[sel]','[on]','[ng]','[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
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
const readout=(name,index,place,controls,extra={})=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra}});
const glow=state=>img(SOLID,{layer:6,color:[1,1,.9],alpha:state==='hover'?.12:state==='pressed'?.22:0});
const pic=(name,x,y,w,h)=>img(T+name,{layer:3,keep_ratio:true,...box(x,y,w,h)});
const left=(x,w)=>({size:[pc(w),'100%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[pc(x),0]});
// a plate button: oak / purple (selected) / grey (disabled), optional icon on the left
const plate=({on=false,scale=1.1,iconName,color=CREAM}={})=>state=>panel([
 when(`(not ${has('[off]')})`,img(T+(on?'button_on':'button'),{layer:1})),when(has('[off]'),img(T+'button_off',{layer:1})),
 ...(iconName?[{icon:img(T+iconName,{layer:3,keep_ratio:true,...left(.07,.14)})}]:[]),
 {text:panel([{text:label({scale,color})}],iconName?left(.18,.78):{})},glow(state),when(has('[off]'),img(SOLID,{layer:7,color:[0,0,0],alpha:.35}))]);

// ---- layout (design px) ----
const CODE={x:110,y:248,w:570,h:37,step:40};
const L={close:{x:1503,y:96,w:60,h:56},back:{x:90,y:835,w:172,h:56},
 lapis:{x:685,y:100,w:190,h:48},count:{x:900,y:100,w:210,h:48},job:{x:1128,y:100,w:330,h:48},draftName:{x:120,y:185,w:560,h:50},
 up:{x:640,y:250,w:38,h:34},down:{x:640,y:578,w:38,h:34},
 snips:[{x:115,y:632,w:128},{x:258,y:632,w:124},{x:396,y:632,w:138},{x:547,y:632,w:133}],snipH:64,
 row2:[{x:115,y:717,w:183,icon:'scroll'},{x:312,y:717,w:180,icon:null},{x:506,y:717,w:175,icon:'document'}],row2H:72,
 status:{x:733,y:250,w:382,h:62},strength:{x:752,y:322,w:300,h:34},gauge:{x:735,y:352,w:380,h:30},tier:{x:870,y:380,w:230,h:28},
 sim:{x:733,y:418,w:382,h:112},check:{x:733,y:545,w:382,h:56},dry:{x:733,y:612,w:382,h:56},proto:{x:733,y:678,w:382,h:58},note:{x:735,y:745,w:380,h:64},
 runes:{x:1163,y:248,w:405,h:50,step:56},more:{x:1520,y:192,w:46,h:40},
 slot:{x:1180,y:432,w:120,h:115},targetName:{x:1316,y:484,w:248,h:62},inscribe:{x:1163,y:635,w:405,h:82},apply:{x:1163,y:730,w:405,h:66}};
const controls=[];let i=0;
// 0 close, 1 back
controls.push(button('close',i++,box(L.close.x,L.close.y,L.close.w,L.close.h),state=>panel([{bg:img(T+'close',{layer:1,keep_ratio:true})},glow(state)])));
controls.push(button('back',i++,box(L.back.x,L.back.y,L.back.w,L.back.h),plate({iconName:'back',scale:1.2})));
// 2-4 header readouts (icons are fixed parts)
for(const k of ['lapis','count','job'])controls.push(readout(k,i++,box(L[k].x+52,L[k].y,L[k].w-52,L[k].h),[{text:label({scale:1.2,align:'left',anchor:'left_middle'})}]));
// 5 draft name
controls.push(readout('draft_name',i++,box(L.draftName.x+70,L.draftName.y,L.draftName.w-70,L.draftName.h),[{text:label({scale:1.5,color:GOLD,align:'left',anchor:'left_middle'})}]));
// 6-14 code lines (click = select)
for(let k=0;k<9;k++)controls.push(button('line_'+k,i++,box(CODE.x,CODE.y+k*CODE.step,CODE.w,CODE.h),state=>panel([
 when(has('[sel]'),img(SOLID,{layer:1,color:[.36,.28,.62],alpha:.55})),when(has('[sel]'),img(SOLID,{layer:2,color:GOLD,alpha:.9,size:['0.5%','80%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['11%',0]})),
 {text:label({scale:1.15,color:WHITE,align:'left',anchor:'left_middle'})},{hover:img(SOLID,{layer:1,color:[1,1,1],alpha:state==='normal'?0:.06})}],{clips_children:true})));
// 15 / 16 scroll
for(const k of ['up','down'])controls.push(button(k,i++,box(L[k].x,L[k].y,L[k].w,L[k].h),state=>panel([{bg:img(SOLID,{layer:1,color:[.3,.25,.45],alpha:state==='normal'?.7:.95})},{text:label({scale:1,color:CREAM})}])));
// 17-20 snippets, 21 edit line, 22 add line, 23 sample
L.snips.forEach((p,n)=>controls.push(button('snip_'+n,i++,box(p.x,L.snips[0].y,p.w,L.snipH),plate({scale:1.25}))));
L.row2.forEach((p,n)=>controls.push(button(['edit','add','sample'][n],i++,box(p.x,p.y,p.w,L.row2H),p.icon?plate({iconName:p.icon,scale:1.1}):plate({scale:1.1}))));
// 24 syntax status (green plate on success, red on failure)
controls.push(readout('status',i++,box(L.status.x,L.status.y,L.status.w,L.status.h),[
 when(has('[on]'),img(T+'status_ok',{layer:1})),when(has('[ng]'),img(SOLID,{layer:1,color:[.45,.08,.1],alpha:.85})),
 when(`(not ${has('[on]')})`,panel([{x:when(`(not ${has('[ng]')})`,img(SOLID,{layer:1,color:BG,alpha:.7}))}])),
 when(has('[on]'),img(T+'check',{layer:3,keep_ratio:true,...left(.05,.1)})),
 {text:panel([{on:when(has('[on]'),label({scale:1.15,color:GREEN}))},{ng:when(`(not ${has('[on]')})`,label({scale:.75,color:RED}))}],left(.16,.82))}]));
// 25 strength, 26 gauge, 27 tier
controls.push(readout('strength',i++,box(L.strength.x,L.strength.y,L.strength.w,L.strength.h),[{text:label({scale:1.3,align:'left',anchor:'left_middle'})}]));
const G={x0:.059,w:.881,y0:.19,h:.377};
controls.push(readout('gauge',i++,box(L.gauge.x,L.gauge.y,L.gauge.w,L.gauge.h),[{track:img(T+'gauge',{layer:2})},
 ...Array.from({length:10},(_,k)=>({['fill_'+(k+1)]:when(has(`[g${k+1}]`),{type:'panel',layer:3,size:[pc(G.w*(k+1)/10),pc(G.h)],anchor_from:'top_left',anchor_to:'top_left',offset:[pc(G.x0),pc(G.y0)],clips_children:true,
  controls:[{pic:img(T+'gauge_fill',{size:[pc(10/(k+1)),'100%'],anchor_from:'left_middle',anchor_to:'left_middle'})}]})}))]));
controls.push(readout('tier',i++,box(L.tier.x,L.tier.y,L.tier.w,L.tier.h),[{text:label({scale:.85,color:DIM,align:'right',anchor:'right_middle'})}]));
// 28 simulation box
controls.push(readout('sim',i++,box(L.sim.x,L.sim.y,L.sim.w,L.sim.h),[{bg:img(SOLID,{layer:1,color:BG,alpha:.75})},
 {border:img(SOLID,{layer:2,color:[.45,.38,.6],alpha:.6,size:['100%','2%'],anchor_from:'top_middle',anchor_to:'top_middle'})},
 when(`(not ${has('[ng]')})`,img(T+'flame',{layer:3,keep_ratio:true,size:['12%','45%'],anchor_from:'top_left',anchor_to:'top_left',offset:['3%','10%']})),
 when(has('[ng]'),img(T+'explosion',{layer:3,keep_ratio:true,size:['12%','45%'],anchor_from:'top_left',anchor_to:'top_left',offset:['3%','10%']})),
 {text:panel([{text:label({scale:.8,align:'left',anchor:'top_left'})}],{size:['82%','88%'],anchor_from:'top_left',anchor_to:'top_left',offset:['17%','8%']})}]));
// 29 check, 30 dry run, 31 prototype (purple)
controls.push(button('check',i++,box(L.check.x,L.check.y,L.check.w,L.check.h),plate({iconName:'check',scale:.95})));
controls.push(button('dry',i++,box(L.dry.x,L.dry.y,L.dry.w,L.dry.h),plate({iconName:'play',scale:.95})));
controls.push(button('proto',i++,box(L.proto.x,L.proto.y,L.proto.w,L.proto.h),plate({on:true,iconName:'lapis',scale:.95,color:WHITE})));
// 32 note / result line
controls.push(readout('note',i++,box(L.note.x,L.note.y,L.note.w,L.note.h),[
 when(has('[ng]'),img(T+'explosion',{layer:3,keep_ratio:true,...left(0,.12)})),when(has('[on]'),img(T+'check',{layer:3,keep_ratio:true,...left(0,.12)})),
 {text:panel([{ng:when(has('[ng]'),label({scale:.78,color:RED,align:'left',anchor:'left_middle'}))},{on:when(has('[on]'),label({scale:.78,color:GREEN,align:'left',anchor:'left_middle'}))},
  {plain:when(`(not ${has('[ng]')})`,panel([{x:when(`(not ${has('[on]')})`,label({scale:.75,color:DIM,align:'left',anchor:'left_middle'}))}]))}],left(.15,.85))}]));
// 33-35 registered runes, 36 next page
for(let k=0;k<3;k++)controls.push(button('rune_'+k,i++,box(L.runes.x,L.runes.y+k*L.runes.step,L.runes.w,L.runes.h),state=>panel([
 when(`(not ${has('[sel]')})`,img(T+'button',{layer:1})),when(has('[sel]'),img(T+'button_on',{layer:1})),
 {book:img(T+'book_enchanted',{layer:3,keep_ratio:true,...left(.04,.12)})},{text:panel([{text:label({scale:.95,color:WHITE,align:'left',anchor:'left_middle'})}],left(.19,.78))},glow(state)])));
controls.push(button('more',i++,box(L.more.x,L.more.y,L.more.w,L.more.h),state=>panel([{bg:img(SOLID,{layer:1,color:[.3,.25,.45],alpha:state==='normal'?.7:.95})},{text:label({scale:1,color:CREAM})}])));
// 37 target equipment picture, 38 its name
controls.push(readout('target_icon',i++,box(L.slot.x+18,L.slot.y+16,L.slot.w-36,L.slot.h-32),[{icon:icon({size:['100%','100%'],anchor_from:'center',anchor_to:'center'})}],{layer:14}));
controls.push(readout('target_name',i++,box(L.targetName.x,L.targetName.y,L.targetName.w,L.targetName.h),[{text:label({scale:1.25,color:GOLD,align:'left',anchor:'left_middle'})}]));
// 39 inscribe into a book (purple, large), 40 apply to gear
controls.push(button('inscribe',i++,box(L.inscribe.x,L.inscribe.y,L.inscribe.w,L.inscribe.h),plate({on:true,iconName:'book_enchanted',scale:1.6,color:WHITE})));
controls.push(button('apply',i++,box(L.apply.x,L.apply.y,L.apply.w,L.apply.h),plate({iconName:'anvil',scale:1.3})));
const BUTTON_COUNT=i;

// ---- fixed parts ----
const t=(name,s,x,y,w,h,opt={})=>({[name]:{type:'panel',...box(x,y,w,h),layer:3,controls:[{text:text(s,{align:'left',anchor:'left_middle',...opt})}]}});
const steps=[['document','書く'],['check','検査'],['play','試作'],['save','登録'],['book_enchanted','刻印']];
const fixed=[
 {bg:img(SOLID,{layer:0,color:BG,alpha:.96,...box(70,70,1535,782)})},
 {frame:img(T+'frame',{layer:1})},
 {header:img(T+'header',{layer:1,...box(95,82,1495,82)})},
 {logo:pic('book_enchanted',118,88,90,72)},t('title','刻印の工房',225,92,280,64,{scale:1.9,color:GOLD}),
 {lapis_icon:pic('lapis',L.lapis.x,L.lapis.y+4,44,40)},{count_icon:pic('book_plain',L.count.x,L.count.y+4,44,40)},{job_icon:pic('crystal',L.job.x,L.job.y+4,44,40)},
 {editor:img(T+'panel_editor',{layer:1,...box(100,175,598,450)})},{draft_icon:pic('document',122,190,46,42)},
 {code_bg:img(SOLID,{layer:2,color:[.06,.05,.11],alpha:.9,...box(108,244,576,372)})},
 {gutter:img(SOLID,{layer:2,color:[.12,.1,.2],alpha:.9,...box(108,244,60,372)})},
 {middle:img(T+'panel',{layer:1,...box(713,175,420,642)})},{mid_icon:pic('crystal',740,188,46,44)},t('mid_title','検査と試作',800,185,300,50,{scale:1.5,color:GOLD}),
 {right:img(T+'panel',{layer:1,...box(1148,175,432,642)})},{right_icon:pic('book_enchanted',1170,188,52,44)},t('right_title','登録した刻印',1236,185,280,50,{scale:1.5,color:GOLD}),
 {target_box:img(SOLID,{layer:2,color:BG,alpha:.75,...box(1163,418,405,148)})},{slot:img(T+'slot',{layer:3,...box(L.slot.x,L.slot.y,L.slot.w,L.slot.h)})},
 t('target_head','対象装備：',1316,440,248,40,{scale:1.1,color:CREAM}),
 t('need','必要：',1170,580,90,40,{scale:1.1}),{need_book:pic('book_plain',1255,580,40,38)},t('need_book_n','本 1 ・',1300,580,90,40,{scale:1.1}),
 {need_lapis:pic('lapis',1395,580,40,38)},t('need_lapis_n','ラピス 2',1440,580,120,40,{scale:1.1}),
 {steps_bg:img(SOLID,{layer:2,color:BG,alpha:.8,...box(820,838,760,52)})},
 ...steps.flatMap(([p,s],k)=>[{['step_icon_'+k]:pic(p,838+k*150,846,36,36)},t('step_'+k,s+(k<4?' ＞':''),880+k*150,840,110,48,{scale:.9,color:CREAM})])];

const out={namespace:'cooptown_rune',root:{type:'panel',size:[`${W/H*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:rune')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_rune.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_rune.json')){defs.ui_defs.push('ui/cooptown_rune.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the title and show the screen (add-only, as build-book-ui.mjs)
const TITLE='ct:rune',ROUTE='rune@cooptown_rune.root';
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
console.log('wrote ui/cooptown_rune.json with',BUTTON_COUNT,'slots and routed',TITLE);
