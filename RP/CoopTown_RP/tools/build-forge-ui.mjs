// Generates ui/cooptown_forge.json: the forging minigame (form title "ct:forge", BP forge-game.js), laid out on the
// user's mockup (1672 x 941, positions below in its px), and routes the title in ui/server_form.json (add-only).
// Pictures: tools/assets/forge_ui (the user's set), cut to textures/cooptown/forge/.
// Run: node tools/build-forge-ui.mjs   (from the CoopTown_RP folder)
//
// Buttons in a fixed order (FORGE_BUTTONS in forge-game.js):
//  0 state marks only: [s1]/[s2]/[s3] stage, [d1]/[d2] stages done, [h1]..[h3] hits made (lit hammers), [sp] sparks
//  1 timer text ("12秒")   2 hit count text ("打撃 2 / 3", empty outside 打撃)   3 the sign and the question
//  4-6 the three choices (blue / gold / red; [i1]/[i2]/[i3] = the stage's icon on them)   7 中断
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/forge/',SOLID='textures/cooptown/solid';
const BG={w:1672,h:941},HEIGHT=.92;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.95,.92,.85],GOLD=[1,.8,.3],GREY=[.75,.75,.75];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const MARKS=['[i1]','[i2]','[i3]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:true,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]});
const text=(t,{scale=1,color=CREAM,align='center',anchor='center',size=['default','default']}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:true,localize:false,text_alignment:align,layer:5});
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
// names must not be 'normal' / 'hover' / 'pressed': the button's own state controls have those names, and a button
// called 'normal' could not be pressed in game (seen 2026-10-23)
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const glow=state=>img(SOLID,{layer:6,color:[1,.9,.6],alpha:state==='hover'?.15:state==='pressed'?.25:0});
// relative box inside a parent given in mockup px (parent x, y, w, h)
const inside=(P,x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc((x-P[0])/P[2]),pc((y-P[1])/P[3])],size:[pc(w/P[2]),pc(h/P[3])]});

// ---- layout (mockup px) ----
const FRAME=[230,52,1215,775],TABS=[[380,108,285,72],[665,108,335,72],[985,108,258,72]],TIMER=[1262,105,148,102];
const SCENE=[0,0,BG.w,BG.h];
const STAGES=[['加熱','icon_heat'],['打撃','icon_hit'],['冷却','icon_cool']];
const tab=(k)=>{const [x,y,w,h]=TABS[k],P=TABS[k],s=`[s${k+1}]`,d=`[d${k+1}]`;return [
 {[`tab_off_${k}`]:when(`(not ${has(s)})`,img(T+'tab_off',{layer:1,...box(x,y,w,h)}))},
 {[`tab_on_${k}`]:when(has(s),img(T+'tab_on',{layer:1,...box(x,y,w,h)}))},
 {[`tab_icon_${k}`]:img(T+STAGES[k][1],{layer:3,keep_ratio:true,...box(x+30,y+14,50,44)})},
 {[`tab_text_${k}`]:{type:'panel',...box(x+90,y,w-120,h),layer:4,controls:[{off:when(`(not ${has(s)})`,text(`${k+1}  ${STAGES[k][0]}`,{scale:1.1,color:CREAM,anchor:'left_middle',align:'left'}))},
   {on:when(has(s),text(`${k+1}  ${STAGES[k][0]}`,{scale:1.1,color:GOLD,anchor:'left_middle',align:'left'}))}]}},
 ...(k<2?[{[`tab_check_${k}`]:when(has(d),img(T+'check',{layer:4,keep_ratio:true,...box(x+w-80,y+16,44,38)}))}]:[])];};
const hammers=[0,1,2].flatMap(k=>{const x=665+k*60,y=550,w=46,h=46;return [
 {[`hit_off_${k}`]:when(`(${has('[s2]')} and (not ${has(`[h${k+1}]`)}))`,img(T+'hit_off',{layer:3,keep_ratio:true,...box(x,y,w,h)}))},
 {[`hit_on_${k}`]:when(has(`[h${k+1}]`),img(T+'hit_on',{layer:3,keep_ratio:true,...box(x,y,w,h)}))}];});
const scene=[
 // what lies on the anvil: the glowing ingot while heating, the hot armour while hammering, the cooled one after
 {ingot:when(has('[s1]'),img(T+'icon_heat',{layer:3,keep_ratio:true,...box(720,320,230,150)}))},
 {armor_hot:when(has('[s2]'),img(T+'armor_hot',{layer:3,keep_ratio:true,...box(700,330,220,140)}))},
 {armor_cool:when(has('[s3]'),img(T+'armor_flat',{layer:3,keep_ratio:true,...box(710,320,200,150)}))},
 {hammer:when(has('[s2]'),img(T+'hammer_big',{layer:4,keep_ratio:true,...box(810,180,270,200)}))},
 {sparks:when(has('[sp]'),img(T+'sparks',{layer:5,keep_ratio:true,...box(600,250,420,190)}))},
 {water:when(has('[s3]'),img(T+'icon_cool',{layer:2,keep_ratio:true,...box(1080,330,170,170)}))},
 ...hammers];
const look=(tex,iconScale=1)=>state=>panel([img(T+tex,{layer:1}),glow(state),
 ...[1,2,3].map(k=>({[`icon${k}`]:when(has(`[i${k}]`),img(T+STAGES[k-1][1],{layer:3,keep_ratio:true,size:['22%','80%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['8%',0]}))})),
 {text:{type:'panel',size:['68%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-4%',0],layer:5,controls:[{t:label({scale:1.15,color:CREAM})}]}}]);
const controls=[
 readout('state',0,box(0,0,BG.w,BG.h),[{scene:panel(scene)},...TABS.flatMap((_,k)=>tab(k))]),
 readout('timer',1,box(TIMER[0],TIMER[1]+42,TIMER[2],48),[{t:label({scale:1.5,color:GOLD})}]),
 readout('count',2,box(860,548,160,50),[{t:label({scale:1.05,color:CREAM,align:'left',anchor:'left_middle'})}]),
 readout('hint',3,box(300,618,1070,52),[{t:label({scale:1.15,color:CREAM})}]),
 button('choice_weak',4,box(287,678,305,100),look('btn_weak')),
 button('choice_normal',5,box(605,678,325,100),look('btn_normal')),
 button('choice_strong',6,box(945,678,315,100),look('btn_strong')),
 button('choice_stop',7,box(1290,712,105,68),state=>panel([img(T+'btn_stop',{layer:1}),glow(state),{t:{type:'panel',layer:5,controls:[{l:label({scale:1,color:CREAM})}]}}]))];
const fixed=[
 {shade:img(SOLID,{layer:0,color:[.05,.03,.02],alpha:.55,...box(250,190,1175,410)})},
 {frame:img(T+'main_frame',{layer:1,...box(FRAME[0],FRAME[1],FRAME[2],FRAME[3])})},
 {title_plate:img(T+'count_frame',{layer:2,...box(650,22,375,75)})},
 {title:{type:'panel',...box(650,16,375,75),layer:3,controls:[{t:text('鍛造',{scale:1.55,color:CREAM})}]}},
 {timer_frame:img(T+'timer_frame',{layer:2,...box(TIMER[0],TIMER[1],TIMER[2],TIMER[3])})},
 {timer_head:{type:'panel',...box(TIMER[0],TIMER[1]+12,TIMER[2],32),layer:3,controls:[{t:text('残り',{scale:.85,color:CREAM})}]}},
 {anvil:img(T+'anvil',{layer:2,keep_ratio:true,...box(565,400,490,145)})},
 {count_frame:img(T+'count_frame',{layer:2,...box(638,540,392,65)})}];
const out={namespace:'cooptown_forge',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:forge')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_forge.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_forge.json')){defs.ui_defs.push('ui/cooptown_forge.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: hide the vanilla form for the title and show the screen (add-only, as build-anvil-ui.mjs)
const TITLE='ct:forge',ROUTE='forge@cooptown_forge.root';
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
const vanilla=host[0].vanilla_host.bindings.find(b=>b.target_property_name==='#visible');
const titles=[...new Set([...vanilla.source_property_name.matchAll(/#title_text = '([^']*)'/g)].map(m=>m[1]))];
if(!titles.includes(TITLE))titles.push(TITLE);
const pair=(op,terms)=>terms.length===1?terms[0]:`(${pair(op,terms.slice(0,terms.length>>1))} ${op} ${pair(op,terms.slice(terms.length>>1))})`;
vanilla.source_property_name=VANILLA_COND; // tools/form-route.mjs
const blocker=host.find(c=>c.vanilla_blocker);
if(blocker)blocker.vanilla_blocker.bindings.find(b=>b.target_property_name==='#visible').source_property_name='(not '+vanilla.source_property_name+')';
const ctl={[ROUTE]:{layer:100,bindings:[{binding_name:'#title_text'},view(`(#title_text = '${TITLE}')`,'#visible')]}},at=host.findIndex(c=>c[ROUTE]);
if(at>=0)host[at]=ctl;else host.push(ctl);
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_forge.json and routed',TITLE);
