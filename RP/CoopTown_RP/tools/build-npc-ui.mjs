// Generates ui/cooptown_npc.json: the villager conversation screen (form title "ct:npc", BP npc-runtime.js), laid out on
// the user's reference (tools/assets/npc_ui/reference/dialogue_layout.png, 1672 x 941; positions below in its px), and
// routes the title in ui/server_form.json (add-only). Pictures: tools/assets/npc_ui, cut to textures/cooptown/npc_ui/.
// Run: node tools/build-npc-ui.mjs   (from the CoopTown_RP folder)
//
// Buttons in a fixed order (NPC_BUTTONS in npc-runtime.js):
//  0 the name; [p1]..[p9] = which portrait (the NPC's skin)   1 the role   2 what the NPC says (two lines)
//  3-6 the four choices (2 x 2); [is] shop / [iv] sell / [iq] quest / [ie] exit icon, [off] greyed out   7 close (x)
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/npc_ui/';
const BG={w:1672,h:941},HEIGHT=1;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/BG.w),pc(y/BG.h)],size:[pc(w/BG.w),pc(h/BG.h)]});
const CREAM=[.96,.93,.85],GOLD=[1,.88,.55],GREY=[.78,.78,.78];
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=m=>`(not ((#form_button_text - '${m}') = #form_button_text))`;
const PORTRAITS=Array.from({length:9},(_,k)=>`[p${k+1}]`);
const ICONS=[['[is]','icon_shop'],['[iv]','icon_sell'],['[iq]','icon_quest'],['[ie]','icon_exit']];
const MARKS=[...PORTRAITS,...ICONS.map(i=>i[0]),'[off]'];
const stripped=MARKS.reduce((e,m)=>`(${e} - '${m}')`,'#form_button_text');
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const when=(cond,control)=>({...control,bindings:[...(control.bindings??[textBinding]),view(cond,'#visible')]});
const label=({scale=1,color=CREAM,align='center',anchor='center',size=['100%','default']}={})=>({type:'label',text:'#text',font_type:PIXEL_FONT,size,anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:true,localize:false,text_alignment:align,layer:5,bindings:[textBinding,view(`('§r' + ${stripped})`,'#text')]});
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls:controls.map((c,n)=>c.type?{['part_'+n]:c}:c),...extra});
const shown="(not (#form_button_text = ''))";
const readout=(name,index,place,controls)=>({[name]:{type:'panel',collection_index:index,...place,layer:12,bindings:[textBinding,view(shown,'#visible')],controls}});
// button control names must not be normal / hover / pressed (a button called 'normal' could not be pressed in game)
function button(name,index,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[textBinding,view(shown,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
// a choice: the plate by state (greyed out when [off]), the icon left, the text in the middle
const choiceLook=state=>panel([
 when(`(not ${has('[off]')})`,img(T+(state==='normal'?'button_normal':state==='hover'?'button_selected':'button_pressed'),{layer:1})),
 when(has('[off]'),img(T+'button_disabled',{layer:1})),
 ...ICONS.map(([m,tex])=>({[tex]:when(has(m),img(T+tex,{layer:3,keep_ratio:true,size:['11%','60%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['24%',0]}))})),
 {text:{type:'panel',size:['56%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-10%',0],layer:5,controls:[
  {on:when(`(not ${has('[off]')})`,label({scale:1.25,color:CREAM}))},{dim:when(has('[off]'),label({scale:1.25,color:GREY}))}]}}]);
const closeLook=state=>panel([img(T+'button_close',{layer:1,alpha:state==='normal'?1:.85}),...(state==='hover'?[img(T+'button_close',{layer:2,color:[1,.9,.6],alpha:.25})]:[])]);
const portraits=PORTRAITS.map((m,k)=>({[`portrait_${k+1}`]:when(has(m),img(`${T}portrait_npc${String(k+1).padStart(2,'0')}`,{layer:3,keep_ratio:true,anchor_from:'bottom_middle',anchor_to:'bottom_middle',size:['100%','100%']}))}));
const controls=[
 // the name readout also holds the portrait (one per skin), drawn left of the panel and above it
 readout('name',0,box(0,0,BG.w,BG.h),[
  {portrait:{type:'panel',...box(140,395,270,512),layer:3,controls:portraits}},
  {name_text:{type:'panel',...box(455,486,230,42),layer:6,controls:[{t:label({scale:1.45,color:GOLD,align:'left',anchor:'left_middle'})}]}}]),
 readout('role',1,box(462,522,225,28),[{t:label({scale:.85,color:[.85,.85,.82],align:'left',anchor:'left_middle'})}]),
 readout('say',2,box(490,588,985,84),[{t:label({scale:1.15,color:CREAM,align:'left',anchor:'left_middle'})}]),
 button('choice_1',3,box(440,698,500,82),choiceLook),
 button('choice_2',4,box(955,698,500,82),choiceLook),
 button('choice_3',5,box(440,790,500,82),choiceLook),
 button('choice_4',6,box(955,790,500,82),choiceLook),
 button('choice_close',7,box(1445,493,70,68),closeLook)];
const fixed=[
 {main:img(T+'panel_main',{layer:1,...box(125,463,1423,455)})},
 {name_plate:img(T+'panel_name',{layer:2,...box(425,478,272,94)})},
 {say_plate:img(T+'panel_dialogue',{layer:2,...box(440,573,1062,113)})}];
const out={namespace:'cooptown_npc',root:{type:'panel',size:[`${BG.w/BG.h*100}%y`,pc(HEIGHT)],anchor_from:'center',anchor_to:'center',layer:10,
 bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:npc')",'#visible')],
 controls:[...fixed,{buttons:{type:'collection_panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',collection_name:'form_buttons',layer:4,controls}}]}};
fs.writeFileSync('ui/cooptown_npc.json',JSON.stringify(out,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_npc.json')){defs.ui_defs.push('ui/cooptown_npc.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: hide the vanilla form for the title and show the screen (add-only, as build-anvil-ui.mjs)
const TITLE='ct:npc',ROUTE='npc@cooptown_npc.root';
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
console.log('wrote ui/cooptown_npc.json and routed',TITLE);
