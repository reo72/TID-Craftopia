// Generates ui/pause_screen.json: the pause screen (ESC) in the TID Craftopia style. Pictures: tools/build-pause.py.
// Run: node tools/build-pause-ui.mjs   (from the CoopTown_RP folder)
//
// Only the vanilla element "pause_screen_content" (namespace "pause") is replaced; the game merges this file over the
// vanilla one, so every other pause element stays. The buttons are plain common.button controls that send the vanilla
// pause actions ($pressed_button_name), so they behave as the vanilla ones. The doll is the vanilla skin viewer
// (pause.skin_viewer_panel). Scripts cannot send text to this screen: the player's name comes from the game
// (#playername); job, title and the online count of the design are left out.
// Positions are px of the design (1672 x 941).
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/pause/';
const W=1672,H=941;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const GREEN=[.17,.29,.2],INK=[.25,.22,.16],GREY=[.5,.5,.45],CREAM=[.98,.96,.88];
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const pic=(name,x,y,w,h,extra={})=>img(T+name,{layer:4,keep_ratio:true,...box(x,y,w,h),...extra});
const text=(t,{scale=1,color=INK,align='left',anchor='left_middle',bindings}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:6,...(bindings?{bindings}:{})});
const at=(x,y,w,h,control,layer=5)=>({type:'panel',...box(x,y,w,h),layer,controls:[{c:control}]});
// a part of a button, placed in fractions of the button
const inside=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x),pc(y)],size:[pc(w),pc(h)]});
let n=0;
// the turnable doll: the vanilla skin viewer without its name tag (the name is shown above it)
const doll={type:'input_panel',size:['100%','100%'],gesture_tracking_button:'button.turn_doll',
 button_mappings:[{from_button_id:'button.menu_select',to_button_id:'button.turn_doll',mapping_type:'pressed',button_up_right_of_first_refusal:true}],
 controls:[{paper_doll:{type:'custom',renderer:'paper_doll_renderer',camera_tilt_degrees:-10,starting_rotation:30,layer:2,anchor_from:'bottom_middle',anchor_to:'bottom_middle',
  rotation:'gesture_x',size:['100%','100%'],use_selected_skin:false,bindings:[{binding_name:'#paper_doll_skin'},
  {binding_type:'view',source_control_name:'viewer_panel',source_property_name:'#gesture_delta_source',target_property_name:'#gesture_delta_source'},
  {binding_type:'view',source_control_name:'viewer_panel',source_property_name:'#gesture_mouse_delta_x',target_property_name:'#gesture_mouse_delta_x'}]}}]};
function button(action,place,states,parts){
 const look=s=>({type:'panel',size:['100%','100%'],controls:[{bg:img(T+states[s],{layer:1})},...parts.map((p,k)=>({['p'+k]:p}))]});
 return {[`b${n++}@common.button`]:{...place,layer:10,$pressed_button_name:action,
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look(0)},{hover:look(1)},{pressed:{...look(2),offset:[0,1]}}]}};
}
const STATES={big:['big','big_hover','big_pressed'],tile:['tile','tile_hover','tile_pressed'],wide:['wide','wide_hover','wide_pressed'],square:['square','square_hover','square_pressed'],dress:['dress','dress','dress']};
const iconAt=(name,x,y,w,h)=>img(T+name,{layer:3,keep_ratio:true,...inside(x,y,w,h)});
const label=(t,x,y,w,h,opt)=>({type:'panel',layer:4,...inside(x,y,w,h),controls:[{t:text(t,opt)}]});
// a menu tile: icon, title, arrow
const tile=(action,x,y,w,h,icon,title)=>button(action,box(x,y,w,h),STATES.tile,[
 iconAt('i_'+icon,.08,.22,.2,.5),label(title,.33,.2,.55,.5,{scale:1.7,color:INK}),iconAt('i_next',.86,.38,.06,.22)]);

const controls=[
 {frame:img(T+'frame',{layer:1,...box(155,88,1365,790)})},
 {header:img(T+'header',{layer:2,...box(165,96,1347,62)})},
 {logo:pic('i_grass',200,101,52,50)},
 {title:at(268,100,260,52,text('TID Craftopia',{scale:1.7,color:GREEN}))},
 {sep:img('textures/cooptown/solid',{layer:3,color:GREEN,alpha:.35,...box(515,110,2,32)})},
 {tagline:at(540,104,420,44,text('仲間とつくる、いつもの世界。',{scale:1,color:INK}))},
 {dot:img('textures/cooptown/solid',{layer:4,color:[.3,.75,.3],...box(1232,119,14,14)})},
 {status:at(1256,104,160,44,text('サーバー接続中',{scale:1,color:INK}))},
 button('button.menu_continue',box(1446,101,50,48),STATES.square,[iconAt('i_close',.25,.25,.5,.5)]),
 // player side
 {panel:img(T+'panel',{layer:2,...box(178,180,342,672)})},
 {player_head:at(178,200,342,28,text('PLAYER',{scale:.9,color:GREY,align:'center',anchor:'center'}))},
 {player_name:at(178,228,342,46,text('#playername',{scale:1.7,color:INK,align:'center',anchor:'center',bindings:[{binding_name:'#playername'}]}))},
 {stand:pic('i_grass',258,520,184,140,{layer:3})},
 {doll:{type:'panel',...box(195,282,310,280),layer:5,controls:[{viewer_panel:doll}]}},
 // the panel picture's two plates: the first holds a line, the dressing room button covers the second
 {plate1:at(218,686,263,60,text('TID Craftopia の住人',{scale:1,align:'center',anchor:'center'}))},
 button('button.to_profile_or_skins_screen',box(214,754,271,64),STATES.dress,[iconAt('i_shirt',.1,.18,.16,.64),label('更衣室',.33,.15,.5,.7,{scale:1.4}),iconAt('i_next',.86,.33,.06,.34)]),
 // menu
 button('button.menu_continue',box(542,182,953,203),STATES.big,[iconAt('i_play',.07,.2,.12,.6),
  label('ゲームに戻る',.21,.15,.6,.45,{scale:2.8,color:CREAM}),label('冒険の続きをはじめよう',.215,.58,.6,.25,{scale:1.1,color:CREAM})]),
 tile('button.menu_settings',542,400,452,152,'gear','設定'),
 tile('button.menu_store',1010,400,485,152,'chest','追加コンテンツ'),
 tile('button.menu_how_to_play',542,568,452,152,'book','遊び方'),
 tile('button.screenshot',1010,568,485,152,'camera','スクリーンショット'),
 button('button.menu_quit',box(544,736,950,78),STATES.wide,[iconAt('i_door',.36,.12,.05,.76),label('セーブして終了',.43,.15,.4,.7,{scale:1.5}),iconAt('i_next',.955,.33,.02,.34)]),
 // footer
 {globe:pic('i_globe',548,830,28,28)},
 {mode:at(584,824,300,40,text('協力サバイバル',{scale:1}))},
 {key:img(T+'key',{layer:3,...box(1352,828,56,32)})},
 {key_text:at(1352,828,56,32,text('ESC',{scale:.9,color:INK,align:'center',anchor:'center'}))},
 {back_text:at(1418,824,80,40,text('で戻る',{scale:1}))}];

const out={namespace:'pause',pause_screen_content:{type:'panel',size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',layer:1,
 controls:[{tid_menu:{type:'panel',size:[`${W/H*100}%y`,'100%'],anchor_from:'center',anchor_to:'center',controls}}]}};
fs.writeFileSync('ui/pause_screen.json',JSON.stringify(out,null,1)+'\n');
console.log('wrote ui/pause_screen.json with',n,'buttons');
