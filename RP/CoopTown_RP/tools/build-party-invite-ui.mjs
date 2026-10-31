// The party invitation screen (asked 2026-10-28 with a mockup; pictures: tools/import-party-invite.py).
// The BP (party.js inviteScreen) sends an ActionForm titled "ct:party_invite"; its buttons, in this order, carry the
// content (prefix + text, image = a skin for the faces). INVITE_SLOTS: 0 inviter (name; image = their skin), 1 title
// ("" = none), 2 message, 3 member count, 4-7 members (pi:m| with a skin, pi:e| an empty place), 8 time limit,
// 9 参加する, 10 辞退する, 11 close. Keep in step with INVITE_SLOTS in the BP's party.js.
// The card is laid out on a 300 x 300 grid and sized from the screen's height, so it fits any GUI scale.
// Writes ui/cooptown_party.json and routes the title in ui/server_form.json. Run from the CoopTown_RP folder:
//   node tools/build-party-invite-ui.mjs
import {pixelFont} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/party_invite/',W=300,H=300,INK=[0.22,0.09,0.05],SOFT=[0.45,0.32,0.2],LIGHT=[1,0.97,0.86];
const pc=v=>(v*100).toFixed(2)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const textB={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
const has=prefix=>`(not ((#form_button_text - '${prefix}') = #form_button_text))`;
const img=(name,x,y,w,h,layer,extra={})=>({type:'image',texture:T+name,keep_ratio:false,...box(x,y,w,h),layer,...extra});
const label=(t,{scale=1,color=INK,align='center'}={})=>({type:'label',text:t,size:['100%','default'],anchor_from:'center',anchor_to:'center',
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align});
const staticText=(name,t,x,y,w,h,opts)=>({[name]:{type:'panel',...box(x,y,w,h),layer:4,controls:[{text:label(t,opts)}]}});
// the button's text after its prefix
const caption=(prefix,opts)=>({...label('#text',opts),bindings:[textB,view(`(#form_button_text - '${prefix}')`,'#text')]});
// the button's image shown as a face (a skin's face and hat layers)
const face=layer=>[['face',8],['hat',40]].map(([n,u],i)=>({[n]:{type:'image',keep_ratio:false,size:['100%','100%'],uv:[u,8],uv_size:[8,8],layer:layer+i,bindings:[
 {binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}]}}));
// a slot: the form button with that index, shown when its text starts with prefix
function slot(name,index,prefix,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[{...textB,binding_name_override:'#form_button_text'},view(has(prefix),'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const panel=controls=>({type:'panel',size:['100%','100%'],controls});
const still=controls=>()=>panel(controls);
const glow=state=>state==='normal'?[]:[{glow:{type:'image',texture:'textures/cooptown/solid',size:['92%','80%'],keep_ratio:false,color:[1,0.9,0.5],alpha:.16,layer:4}}];
const MEMBER={y:178,s:34,gap:10};
const memberX=i=>W/2-(4*MEMBER.s+3*MEMBER.gap)/2+i*(MEMBER.s+MEMBER.gap);
const S={inviter:0,title:1,message:2,count:3,members:4,limit:8,accept:9,decline:10,close:11};
const slots=[
 slot('inviter',S.inviter,'pi:in|',box(60,74,56,56),still([{frame:img('portrait_frame',0,0,W,H,3,{size:['100%','100%'],offset:[0,0]})},
  {face:{type:'panel',size:['78%','78%'],anchor_from:'center',anchor_to:'center',layer:1,controls:face(1)}}])),
 slot('name',S.inviter,'pi:in|',box(124,76,128,26),still([{t:caption('pi:in|',{scale:1.6,align:'left'})}])),
 slot('title',S.title,'pi:ti|',box(124,104,128,26),still([{bg:{type:'image',texture:T+'title_badge',keep_ratio:false,size:['100%','100%'],layer:1}},
  {t:{...caption('pi:ti|',{scale:.95,color:LIGHT}),layer:3}}])),
 slot('message',S.message,'pi:msg|',box(30,146,240,16),still([{t:caption('pi:msg|',{scale:1})}])),
 slot('count',S.count,'pi:cnt|',box(100,163,100,14),still([{t:caption('pi:cnt|',{scale:.95,color:SOFT})}])),
 ...[0,1,2,3].flatMap(i=>[
  slot('member'+i,S.members+i,'pi:m|',box(memberX(i),MEMBER.y,MEMBER.s,MEMBER.s),still([{frame:{type:'image',texture:T+'portrait_frame',keep_ratio:false,size:['100%','100%'],layer:3}},
   {face:{type:'panel',size:['76%','76%'],anchor_from:'center',anchor_to:'center',layer:1,controls:face(1)}}])),
  slot('empty'+i,S.members+i,'pi:e|',box(memberX(i),MEMBER.y,MEMBER.s,MEMBER.s),still([{bg:{type:'image',texture:T+'member_empty',keep_ratio:false,size:['100%','100%'],layer:1}}]))]),
 slot('limit',S.limit,'pi:lim|',box(40,218,220,14),still([{t:caption('pi:lim|',{scale:.85,color:SOFT})}])),
 slot('accept',S.accept,'pi:ok|',box(28,238,118,38),state=>panel([{bg:{type:'image',texture:T+'button_accept',keep_ratio:false,size:['100%','100%'],layer:1}},
  {icon:{type:'image',texture:T+'icon_check',keep_ratio:true,size:['18%','46%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['12%',0],layer:2}},
  {t:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-6%',0],layer:3,controls:[{t:caption('pi:ok|',{scale:1.3,color:LIGHT})}]}},...glow(state)])),
 slot('decline',S.decline,'pi:no|',box(154,238,118,38),state=>panel([{bg:{type:'image',texture:T+'button_decline',keep_ratio:false,size:['100%','100%'],layer:1}},
  {icon:{type:'image',texture:T+'icon_cross',keep_ratio:true,size:['16%','42%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['12%',0],layer:2}},
  {t:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-6%',0],layer:3,controls:[{t:caption('pi:no|',{scale:1.3,color:LIGHT})}]}},...glow(state)])),
 slot('close',S.close,'pi:x|',box(258,18,26,25),state=>panel([{bg:{type:'image',texture:T+'button_close',keep_ratio:false,size:['100%','100%'],layer:1}},...glow(state)]))];
const card={type:'panel',size:['103.4%y','90%'],anchor_from:'center',anchor_to:'center',layer:5,controls:[
 {frame:img('dialog_frame',6,10,288,286,1)},
 {header:img('header_plate',62,0,176,44,3)},
 {party_icon:img('icon_party',80,12,26,18,4)},
 staticText('heading','パーティへの招待',110,10,120,22,{scale:1.35,color:LIGHT}),
 staticText('ask','一緒に冒険しませんか？',60,48,180,18,{scale:1.15}),
 {rule_l:img('divider',26,56,40,3,3)},{rule_r:img('divider',234,56,40,3,3)},
 {inviter_box:img('inviter_frame',40,68,220,74,2)},
 staticText('who','招待者',60,128,56,12,{scale:.75,color:SOFT}),
 {rule2_l:img('divider',40,169,64,2,3)},{rule2_r:img('divider',196,169,64,2,3)},
 {buttons:{type:'collection_panel',size:['100%','100%'],collection_name:'form_buttons',layer:6,controls:slots}}]};
const ui={namespace:'cooptown_party',invite:{type:'panel',size:['100%','100%'],controls:[
 {dim:{type:'image',texture:'textures/cooptown/solid',color:[0,0,0],alpha:.45,size:['300%','300%'],keep_ratio:false,layer:0}},{card}]}};
pixelFont(ui);
fs.writeFileSync('ui/cooptown_party.json',JSON.stringify(ui,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_party.json')){defs.ui_defs.push('ui/cooptown_party.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}
// server_form: show the screen for its title (the vanilla form already stays hidden for every "ct:" title)
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls,name='party_invite@cooptown_party.invite';
const ctl={[name]:{layer:100,bindings:[{binding_name:'#title_text'},view("(#title_text = 'ct:party_invite')",'#visible')]}};
const i=host.findIndex(c=>c[name]);if(i>=0)host[i]=ctl;else host.push(ctl);
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_party.json and routed ct:party_invite');
