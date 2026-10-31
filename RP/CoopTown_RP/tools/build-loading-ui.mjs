// Generates ui/progress_screen.json: the world loading screen in the TID Craftopia style, with animations.
// Pictures: tools/build-loading.py.  Run: node tools/build-loading-ui.mjs   (from the CoopTown_RP folder)
//
// The game merges this file over the vanilla one (namespace "progress"): only the world loading screen's content is
// replaced (world_loading_progress_screen) and the overworld / nether / end loading backgrounds. The bar, the status
// line and the cancel button use the vanilla bindings (#loading_bar_percentage, #progress_text, #cancel_visible,
// button.menu_exit). Animations: the three dots blink in turn, the sprout
// sways, the grass block bobs, and the hints fade one after another.
// Positions are px of the design (1672 x 941). A server's resource pack arrives during loading: the first join to a
// server still shows the vanilla screen unless the pack is installed as a global resource pack.
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/loading/';
const W=1672,H=941;
const pc=v=>(Math.round(v*100000)/1000)+'%';
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(x/W),pc(y/H)],size:[pc(w/W),pc(h/H)]});
const GREEN=[.13,.3,.17],CREAM=[.98,.96,.88],INK=[.2,.2,.15];
const img=(texture,extra={})=>({type:'image',texture,keep_ratio:false,size:['100%','100%'],...extra});
const text=(t,{scale=1,color=INK,align='left',anchor='left_middle',bindings}={})=>({type:'label',text:t,font_type:PIXEL_FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align,layer:6,...(bindings?{bindings}:{})});
const at=(x,y,w,h,control,extra={})=>({type:'panel',...box(x,y,w,h),layer:5,controls:[{c:control}],...extra});
const HINTS=['仲間と役割を分けると、街づくりがはかどります。','手帳のデイリーをこなすと、コインと経験値がもらえます。','職業ごとに専用の作業台が使えます。',
 '品質の高い品ほど、高く売れます。','ワールドマップで行った場所を確かめられます。'];
const HINT_STEP=5; // seconds each hint stays

// ---- animations (namespace "progress") ----
const anims={
 tid_sway_l:{anim_type:'offset',easing:'in_out_sine',duration:1.2,from:[-2,0],to:[2,0],next:'@progress.tid_sway_r'},
 tid_sway_r:{anim_type:'offset',easing:'in_out_sine',duration:1.2,from:[2,0],to:[-2,0],next:'@progress.tid_sway_l'},
 tid_bob_up:{anim_type:'offset',easing:'in_out_sine',duration:.6,from:[0,0],to:[0,-3],next:'@progress.tid_bob_down'},
 tid_bob_down:{anim_type:'offset',easing:'in_out_sine',duration:.6,from:[0,-3],to:[0,0],next:'@progress.tid_bob_up'}};
// dots: each waits its turn, then loops dim -> bright -> dim over 1.2 s
for(let k=0;k<3;k++){
 anims['tid_dot'+k]={anim_type:'wait',duration:.001+k*.4,next:`@progress.tid_dot${k}_on`};
 anims[`tid_dot${k}_on`]={anim_type:'alpha',easing:'linear',duration:.4,from:.25,to:1,next:`@progress.tid_dot${k}_off`};
 anims[`tid_dot${k}_off`]={anim_type:'alpha',easing:'linear',duration:.8,from:1,to:.25,next:`@progress.tid_dot${k}_on`};
}
// hints: hint k waits k steps, then loops fade in / hold / fade out / wait for the others
HINTS.forEach((_,k)=>{
 anims['tid_hint'+k]={anim_type:'alpha',easing:'linear',duration:.001+k*HINT_STEP,from:0,to:0,next:`@progress.tid_hint${k}_in`};
 anims[`tid_hint${k}_in`]={anim_type:'alpha',easing:'linear',duration:.5,from:0,to:1,next:`@progress.tid_hint${k}_hold`};
 anims[`tid_hint${k}_hold`]={anim_type:'alpha',easing:'linear',duration:HINT_STEP-1,from:1,to:1,next:`@progress.tid_hint${k}_out`};
 anims[`tid_hint${k}_out`]={anim_type:'alpha',easing:'linear',duration:.5,from:1,to:0,next:`@progress.tid_hint${k}_rest`};
 anims[`tid_hint${k}_rest`]={anim_type:'alpha',easing:'linear',duration:(HINTS.length-1)*HINT_STEP,from:0,to:0,next:`@progress.tid_hint${k}_in`};
});

const cancelLook=t=>({type:'panel',size:['100%','100%'],controls:[{bg:img(T+t,{layer:1})},{t:text('#cancel_button_text',{scale:1.3,align:'center',anchor:'center',bindings:[{binding_name:'#cancel_button_text'}]})}]});
const controls=[
 // town picture above the panel (a size animation made it shimmer, so it stays still)
 {bg_clip:{type:'panel',...box(0,0,W,708),layer:1,clips_children:true,controls:[{bg:img(T+'background',{layer:1})}]}},
 // title
 {title_bg:img(T+'title_bg',{layer:3,...box(40,28,410,100)})},
 {logo:img(T+'grass',{layer:4,keep_ratio:true,...box(56,34,80,86)})},
 {title:at(156,40,300,52,text('TID Craftopia',{scale:1.9,color:CREAM}))},
 {tagline:at(156,88,300,32,text('仲間とつくる、いつもの世界。',{scale:1,color:CREAM}))},
 // mode tag
 {mode:img(T+'mode',{layer:3,...box(1424,42,195,52)})},
 {mode_text:at(1424,42,195,52,text('協力サバイバル',{scale:1,color:CREAM,align:'center',anchor:'center'}))},
 // hint bar with fading hints
 {hint:img(T+'hint',{layer:3,...box(50,622,622,62)})},
 {hint_book:img(T+'book',{layer:4,keep_ratio:true,...box(62,630,56,46)})},
 ...HINTS.map((h,k)=>({['hint_'+k]:at(132,622,530,62,{...text('ヒント：'+h,{scale:.95,color:CREAM}),alpha:0,anims:[`@progress.tid_hint${k}`]})})),
 // bottom panel
 {panel:img(T+'panel',{layer:2,...box(0,705,W,236)})},
 {head:at(58,738,700,58,text('ワールドに参加中',{scale:2.6,color:GREEN}))},
 {sub:at(60,792,700,32,text('新しい一日が、はじまります。',{scale:1.1}))},
 {sprout:img(T+'sprout',{layer:4,keep_ratio:true,...box(1492,746,32,34),anims:['@progress.tid_sway_l']})},
 ...[0,1,2].map(k=>({['dot'+k]:img(T+'dot'+(k+1),{layer:4,...box(1544+k*28,758,15,15),alpha:.25,anims:['@progress.tid_dot'+k]})})),
 // bar: frame, fill clipped by the loading percentage, grass block at the start
 {bar:img(T+'bar',{layer:3,...box(54,818,1564,40)})},
 {fill:img(T+'fill',{layer:4,...box(60,824,1552,28),clip_direction:'left',clip_pixelperfect:false,bindings:[{binding_name:'#loading_bar_percentage',binding_name_override:'#clip_ratio'}]})},
 {bar_grass:img(T+'grass',{layer:5,keep_ratio:true,...box(30,798,46,52),anims:['@progress.tid_bob_up']})},
 // status line (vanilla) and cancel
 {status:at(58,870,900,36,text('#progress_text',{scale:1.05,bindings:[{binding_name:'#progress_text'}]}))},
 {'cancel@common.button':{...box(1428,868,190,50),layer:10,$pressed_button_name:'button.menu_exit',default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:cancelLook('cancel')},{hover:cancelLook('cancel_hover')},{pressed:{...cancelLook('cancel_pressed'),offset:[0,1]}}],
  bindings:[{binding_name:'#cancel_visible',binding_name_override:'#visible'}]}}];

const content={type:'panel',size:['100%','100%'],layer:3,controls:[{tid_loading:{type:'panel',size:['100%','100%'],controls}},{'popup_dialog_factory@progress.popup_dialog_factory':{}}]};
const out={namespace:'progress',...anims,tid_loading_content:content,
 'world_loading_progress_screen@progress_screen':{$screen_content:'progress.tid_loading_content'},
 'world_loading_screen_background@common.dirt_background':{tiled_scale:[2,2],alpha:0}};
fs.writeFileSync('ui/progress_screen.json',JSON.stringify(out,null,1)+'\n');
console.log('wrote ui/progress_screen.json');
