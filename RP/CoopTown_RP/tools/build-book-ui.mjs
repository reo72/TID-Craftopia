// Generates ui/cooptown_book.json: the shared frame of the new book menu (tools/build-book.py makes the pictures)
// and its pages (home / home2 so far), and routes their form titles in ui/server_form.json (add-only).
// Run: node tools/build-book-ui.mjs   (from the CoopTown_RP folder)
//
// Every book page is an ActionForm whose title picks the page ("ct:book:<page>"). Its buttons come in a fixed
// order, and each slot is a control with that collection_index, shown only when the button text starts with its
// prefix (as in the old journal):
//   0 "ct:tab_home|"  1 "ct:tab_profile|"  2 "ct:tab_settings|"  3 "ct:close|"   (the frame's bookmarks)
//   4... the page's own buttons, e.g. "ct:m|職業" (text after the prefix is the caption, the button image the icon).
// Positions are fractions of the book picture, measured from the user's finished page images
// (tools/assets/book/reference/), where the book spans x 152-1522, y 83-900 of 1672 x 941.
import {VANILLA_COND} from './form-route.mjs';
import {PIXEL_FONT} from './pixel-font.mjs';
import fs from 'fs';
const LAYOUT=JSON.parse(fs.readFileSync('tools/book-layout.json','utf8')),shape=k=>LAYOUT.shapes[k];
const B='textures/cooptown/book/';
const REF={x:152,y:83,w:1370,h:817};
const fx=x=>(x-REF.x)/REF.w,fy=y=>(y-REF.y)/REF.h,fw=w=>w/REF.w,fh=h=>h/REF.h;
const pc=v=>(Math.round(v*100000)/1000)+'%';
// book: share of the screen height; the width follows the picture's shape
const BOOK={height:.8};
// text colours: darkened on request (were [0.24,0.13,0.06] / [0.28,0.18,0.1] / green [0.12,0.32,0.08])
const INK=[0.12,0.06,0.02];
// right edge bookmarks (reference px): close, then home / profile / settings
const CLOSE={x:1497,y:97,w:60,h:60};
const TABS=[['tab_home','home',182],['tab_profile','person',290],['tab_settings','settings',398]];
const TAB={x:1500,w:75,h:90,icon:.46};
// page areas (reference px) and title / page number rows
const PAGE={left:{x:235,y:195,w:555,h:625,title:513,number:511},right:{x:885,y:195,w:555,h:625,title:1165,number:1159},titleY:160,numberY:846};

const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const box=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[pc(fx(x)),pc(fy(y))],size:[pc(fw(w)),pc(fh(h))]});
const img=(texture,extra={})=>({type:'image',texture:B+texture,keep_ratio:false,size:['100%','100%'],...extra});
// FONT: the bitmap (pixel) font for every label, Minecraft-style blocky letters (Japanese too), whatever the
// player's smooth-font setting (asked for; other values: 'default' follows the setting, 'smooth', 'MinecraftTen')
const FONT=PIXEL_FONT;
const text=(t,{scale=1,color=INK,align='center',anchor='center'}={})=>({type:'label',text:t,font_type:FONT,size:['default','default'],anchor_from:anchor,anchor_to:anchor,
 font_scale_factor:scale,color,shadow:false,localize:false,text_alignment:align});
// a form button in slot index, shown when its text starts with prefix; look(state) draws it (state: normal / hover / pressed)
function slot(name,index,prefix,place,look){
 return {[name+'@common.button']:{collection_index:index,...place,$pressed_button_name:'button.form_button_click',layer:10,
  bindings:[{binding_name:'#form_button_text',binding_name_override:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'},
   view(`(not ((#form_button_text - '${prefix}') = #form_button_text))`,'#visible'),{binding_type:'collection_details',binding_collection_name:'form_buttons'}],
  default_control:'normal',hover_control:'hover',pressed_control:'pressed',
  controls:[{normal:look('normal')},{hover:look('hover')},{pressed:{...look('pressed'),offset:[0,1]}}]}};
}
const panel=(controls,extra={})=>({type:'panel',size:['100%','100%'],controls,...extra});
// the button's own text after the prefix, and its image (the icon the BP gives the button)
const caption=(prefix,opts)=>({...text('#text',opts),bindings:[{binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'},
 view(`(#form_button_text - '${prefix}')`,'#text')]});
const icon=extra=>({type:'image',keep_ratio:true,...extra,bindings:[
 {binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}]});

// ---- the frame: book, page titles and numbers, bookmarks; $left_title / $right_title / $tab set per page ----
function bookmark([id,iconName,y],index){
 return slot(id,index,`ct:${id}|`,box(TAB.x,y,TAB.w,TAB.h),state=>panel([
  {tab:img('tab',{layer:1,ignored:`($tab = '${iconName}')`})},
  {tab_selected:img('tab_selected',{layer:1,ignored:`(not ($tab = '${iconName}'))`})},
  {glow:img('tab_selected',{layer:2,alpha:.35,ignored:state==='normal'})},
  {icon:{type:'image',texture:B+iconName,keep_ratio:true,size:[pc(TAB.icon),pc(TAB.icon)],anchor_from:'center',anchor_to:'center',layer:3}}]));
}
const titleRow=(side,variable)=>{const P=PAGE[side],w=480;
 return {[side+'_title']:{type:'panel',...box(P.title-w/2,PAGE.titleY-22,w,44),layer:3,controls:[
  {line_l:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['24%',1],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0]}},
  {line_r:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['24%',1],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-2%',0]}},
  {text:text(variable,{scale:1.25})}]}};
};
const pageNumber=(side,n)=>({[side+'_number']:{type:'panel',...box(PAGE[side].number-40,PAGE.numberY-14,80,28),layer:3,controls:[{text:text(n,{scale:.8,color:[0.28,0.18,0.1]})}]}});
// where the book sits on screen; pages put their own parts in a panel with the same place
const bookPlace={size:[`${shape('book')*100}%y`,pc(BOOK.height)],anchor_from:'center',anchor_to:'center'};
const frame={type:'panel',...bookPlace,
 '$left_title|default':'','$right_title|default':'','$tab|default':'home',controls:[
 {book:img('book',{layer:1})},
 titleRow('left','$left_title'),titleRow('right','$right_title'),
 pageNumber('left','01'),pageNumber('right','02'),
 {bookmarks:{type:'collection_panel',size:['100%','100%'],collection_name:'form_buttons',layer:4,controls:[
  ...TABS.map(bookmark),
  slot('close',3,'ct:close|',box(CLOSE.x,CLOSE.y,CLOSE.w,CLOSE.h),state=>panel([{icon:img('close',{layer:1})},{glow:img('close',{layer:2,alpha:.3,color:[1,1,1],ignored:state==='normal'})}]))]}}
]};

// ---- page parts ----
// a card button (icon left, caption right): the home menu's 2 x 4 grid
function card(index,prefix,x,y,w,h){
 return slot('card_'+index,index,prefix,box(x,y,w,h),state=>panel([
  {bg:img(state==='normal'?'button_card':'button_card_selected',{layer:1})},
  {icon:icon({size:['30%','58%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['10%',0],layer:2})},
  {caption:{type:'panel',size:['54%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-4%',0],layer:3,controls:[{text:caption(prefix,{scale:1.25})}]}},
  // something waiting there (a reward to take, something to look at): the button text ends with BADGE (an invisible
  // colour code) and a red "!" shows at the card's top right corner (asked 2026-10-30; BP book.js homeBadges)
  {badge:{type:'image',texture:B+'badge',keep_ratio:true,size:['100%y','34%'],anchor_from:'top_right',anchor_to:'top_right',offset:[3,-3],layer:6,
   bindings:[textBinding,view(`(not ((#form_button_text - '${BADGE}') = #form_button_text))`,'#visible')]}}]));
}
const BADGE='§c';
// the right page's 2 x 4 grid of cards, slots from first
function cardGrid(first,prefix){
 const P=PAGE.right,gap=20,w=(P.w-gap)/2,h=(P.h-3*gap)/4,out=[];
 for(let i=0;i<8;i++)out.push(card(first+i,prefix,P.x+(i%2)*(w+gap),P.y+Math.floor(i/2)*(h+gap),w,h));
 return out;
}

// ---- home (ct:book:home / ct:book:home2) ----
// Slots after the bookmarks: 4-11 menu cards "ct:m|", 12 the next / previous menu page arrow, then data shown on the
// left page, each a button whose text after the prefix is the value: 13 name, 14 job line (button image = job icon),
// 15 title (empty = no ribbon), 16 money, 17 bank, 18-20 tracked quest title / goal / count, 21 its bar
// ("ct:d_qbar|<percent in 5s>"), 22 the notices button. Keep in step with HOME_SLOTS in the BP's book.js.
const HOME_SLOTS={cards:4,arrow:12,name:13,job:14,title:15,wallet:16,bank:17,qtitle:18,qgoal:19,qcount:20,qbar:21,notice:22};
const P_='textures/cooptown/profile/',PROFILE=JSON.parse(fs.readFileSync('tools/profile-layout.json','utf8'));
const SOFT=[0.28,0.18,0.1];
// a button used only to carry a value: drawn the same in every state, not highlighted
const still=controls=>()=>panel(controls);
// the player in a frame box (reference px). paper_doll_renderer with the selected skin: the player's skin, standing,
// fitted into the control like the game's own skin viewers (seen in game 2026-10-18). Not hud_player_renderer: it
// does draw in a form (armor and held item too) but, being the HUD's paper doll, fades out after a few seconds, and
// its size did not follow the control simply (a 63 px control drew ~2x its width, a 108 px one ~2.8x).
const dollIn=(x,y,w,h)=>({type:'panel',...box(x,y,w,h),layer:5,controls:[{model:{type:'custom',renderer:'paper_doll_renderer',use_selected_skin:true,
 camera_tilt_degrees:-5,starting_rotation:0,size:['100%','100%'],anchor_from:'center',anchor_to:'center',layer:6}}]});
// head and chest close up: the doll drawn BUST times as tall as the box from its top, the rest cut off by a clipping
// panel (enable_scissor_test, as the game's own skin-pack previews)
const BUST=2.6; // 2.2 asked a little bigger
// the doll stands on the control's bottom (seen in game: from the box's top only the hair showed, at 3/4 down), so the
// control is moved up until the head is at the box's top
const BUST_SHIFT='-73%'; // keeps the head where it was: the doll fills ~2/3 of the control, standing on its bottom
const dollBust=(x,y,w,h)=>({type:'panel',...box(x,y,w,h),layer:5,clips_children:true,controls:[{model:{type:'custom',renderer:'paper_doll_renderer',use_selected_skin:true,
 camera_tilt_degrees:-5,starting_rotation:0,enable_scissor_test:true,size:['100%',`${BUST*100}%`],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,BUST_SHIFT],layer:6}}]});
function dataText(index,prefix,x,y,w,h,opts={}){
 const {align='left'}=opts,side=align==='right'?'right_middle':align==='center'?'center':'left_middle'; // centred text sits in the middle of its box
 return slot('d'+index,index,prefix,box(x,y,w,h),still([{text:{...caption(prefix,{...opts,anchor:side,align}),layer:3}}]));
}
const staticText=(name,t,x,y,w,h,opts={})=>({[name]:{type:'panel',...box(x,y,w,h),layer:3,controls:[{text:text(t,{scale:.85,color:SOFT,anchor:'left_middle',align:'left',...opts})}]}});
const pimg=(name,x,y,w,h,layer=2)=>({type:'image',texture:P_+name,keep_ratio:false,...box(x,y,w,h),layer});
const bimg=(name,x,y,w,h,layer=2)=>({type:'image',texture:B+name,keep_ratio:false,...box(x,y,w,h),layer});
const textBinding={binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'};
function homeLeft(){
 const S=HOME_SLOTS,hole=PROFILE.frame_hole,F={x:268,y:216,w:150,h:144},T=PROFILE.track_inner;
 const fill=k=>({['f'+k]:{type:'image',texture:P_+'fill_'+k,keep_ratio:false,anchor_from:'left_middle',anchor_to:'left_middle',
  size:[pc((T.x1-T.x0)*k/PROFILE.fill_steps),pc(T.y1-T.y0)],offset:[pc(T.x0),0],layer:3,
  bindings:[textBinding,view(`(#form_button_text = 'ct:d_qbar|${k*5}')`,'#visible')]}});
 const statics=[
  {profile_bg:bimg('button_row',240,198,545,180,1)},
  {avatar_frame:pimg('avatar_frame',F.x,F.y,F.w,F.h,4)},
  {wallet_bg:bimg('button_card',240,400,265,112,1)},{bank_bg:bimg('button_card',518,400,265,112,1)},
  {coins:bimg('icons/coins',258,425,62,62)},{vault:bimg('icons/vault',536,425,62,62)},
  staticText('wallet_label','所持金',340,418,150,30),staticText('bank_label','銀行',618,418,150,30),
  {rule:{type:'image',texture:'textures/cooptown/solid',color:SOFT,alpha:.4,...box(240,532,545,2),layer:2}},
  {quest_bg:bimg('button_row',243,552,540,186,1)},
  {scroll:bimg('icons/scroll',268,578,100,92)},
  staticText('quest_label','追跡中の依頼',395,568,300,30)];
 const slots=[
  // the face frame shows the player, close up
  {face:dollBust(F.x+hole.x0*F.w+4,F.y+hole.y0*F.h+4,(hole.x1-hole.x0)*F.w-8,(hole.y1-hole.y0)*F.h-8)}, // head and chest (asked)
  dataText(S.name,'ct:d_name|',452,218,320,48,{scale:1.6}),
  slot('d_job',S.job,'ct:d_job|',box(452,266,320,44),still([
   {icon:icon({size:['13%','90%'],anchor_from:'left_middle',anchor_to:'left_middle',layer:3})},
   {text:{type:'panel',size:['85%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:d_job|',{scale:1.25,anchor:'left_middle',align:'left'})}]}}])),
  slot('d_title',S.title,'ct:d_title|',box(458,316,296,46),still([
   {ribbon:{type:'panel',size:['100%','100%'],bindings:[textBinding,view("(not (#form_button_text = 'ct:d_title|'))",'#visible')],controls:[
    {bg:{type:'image',texture:P_+'title_ribbon',keep_ratio:false,size:['100%','100%'],layer:2}},
    {medal:icon({size:['17%','125%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['-5%',0],layer:4})}, // the title's rank badge (button image; BP titles-config.js rankBadge)
    {text:{...caption('ct:d_title|',{scale:1.05,color:[1,0.97,0.86]}),layer:5}}]}}])),
  dataText(S.wallet,'ct:d_wallet|',340,450,160,46,{scale:1.3}),
  dataText(S.bank,'ct:d_bank|',618,450,160,46,{scale:1.3}),
  dataText(S.qtitle,'ct:d_qtitle|',395,600,370,42,{scale:1.25}),
  dataText(S.qgoal,'ct:d_qgoal|',395,644,250,36,{scale:1}),
  dataText(S.qcount,'ct:d_qcount|',640,644,125,36,{scale:1,align:'right'}),
  slot('d_qbar',S.qbar,'ct:d_qbar|',box(272,690,490,28),still([{track:{type:'image',texture:P_+'progress_track',keep_ratio:false,size:['100%','100%'],layer:2}},
   ...Array.from({length:PROFILE.fill_steps},(_,i)=>fill(i+1))])),
  slot('notice',S.notice,'ct:notice|',box(250,750,525,58),state=>panel([{bg:img(state==='normal'?'button_wide':'button_wide_selected',{layer:1})},
   {text:{...caption('ct:notice|',{scale:1.05,color:SOFT}),layer:3}},{more:{...text('＞',{scale:.9,color:SOFT,anchor:'right_middle'}),offset:['-5%',0],layer:3}}]))];
 return {statics,slots};
}
// the button under the right page: to the second menu page (next) and back (prev). A framed square button
// (2026-10-30: the bare "＞" was hard to notice), at the page's outer corner.
function arrowSlot(index,dir){
 const next=dir==='next',x=next?1380:885; // symbol only (asked 2026-10-30 after seeing the worded one)
 return slot('arrow',index,`ct:${dir}|`,box(x,822,60,52),state=>panel([{bg:img(state==='normal'?'button_square':'button_square_selected',{layer:1})},
  {text:{...text(next?'＞':'＜',{scale:1.5,color:state==='normal'?SOFT:[0.12,0.32,0.08]}),layer:3}}]));
}
function homePage(rightTitle,dir){
 const {statics,slots}=homeLeft();
 return {type:'panel',size:['100%','100%'],controls:[
  {'frame@cooptown_book.frame':{'$left_title':'冒険者の記録','$right_title':rightTitle,'$tab':'home'}},
  {page:{type:'panel',...bookPlace,controls:[...statics,
   {buttons:{type:'collection_panel',size:['100%','100%'],collection_name:'form_buttons',layer:4,controls:[...cardGrid(HOME_SLOTS.cards,'ct:m|'),arrowSlot(HOME_SLOTS.arrow,dir),...slots]}}]}}]};
}
const home=homePage('サーバーメニュー','next'),home2=homePage('その他のメニュー','prev');

// ---- shared page parts ----
// a 5 % step bar in a slot: the button text "<prefix><percent>" shows the matching fill picture
function barSlot(name,index,prefix,x,y,w,h){
 const T=PROFILE.track_inner;
 const fill=k=>({['f'+k]:{type:'image',texture:P_+'fill_'+k,keep_ratio:false,anchor_from:'left_middle',anchor_to:'left_middle',
  size:[pc((T.x1-T.x0)*k/PROFILE.fill_steps),pc(T.y1-T.y0)],offset:[pc(T.x0),0],layer:3,
  bindings:[textBinding,view(`(#form_button_text = '${prefix}${k*5}')`,'#visible')]}});
 return slot(name,index,prefix,box(x,y,w,h),still([{track:{type:'image',texture:P_+'progress_track',keep_ratio:false,size:['100%','100%'],layer:2}},
  ...Array.from({length:PROFILE.fill_steps},(_,i)=>fill(i+1))]));
}
// a value that wraps over several lines inside its box (top left)
function wrapText(index,prefix,x,y,w,h,opts={}){
 return slot('w'+index,index,prefix,box(x,y,w,h),still([{text:{...caption(prefix,{...opts,anchor:'top_left',align:'left'}),size:['100%','default'],layer:3}}]));
}
// a card (icon + caption) in two looks: prefix = normal, selPrefix = selected (green)
function pickCard(index,prefix,selPrefix,x,y,w,h,bg='button_card',iconW='26%',scale=1.2){
 const look=(sel)=>state=>panel([
  {bg:img(sel||state!=='normal'?bg+'_selected':bg,{layer:1})},
  {icon:icon({size:[iconW,'62%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['8%',0],layer:2})},
  {caption:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-2%',0],layer:3,controls:[{text:caption(sel?selPrefix:prefix,{scale})}]}}]);
 return [slot('card_'+index,index,prefix,box(x,y,w,h),look(false)),slot('card_sel_'+index,index,selPrefix,box(x,y,w,h),look(true))];
}
// a square picture card with its name under it as "＜ name ＞" (the job list, asked 2026-10-30): prefix = normal,
// selPrefix = selected (green square). The name sits below the square, inside the same button.
function squareCard(index,prefix,selPrefix,x,y,w,h,side,scale=1){
 // side: the square's size in layout px, as shares of the button (sizes in a button are % of it)
 const sw=pc(side/w),sh=pc(side/h),iw=pc(side*.7/w),ih=pc(side*.7/h),io=pc(side*.15/h);
 const look=(sel)=>state=>panel([
  {bg:img(sel||state!=='normal'?'button_square_selected':'button_square',{size:[sw,sh],anchor_from:'top_middle',anchor_to:'top_middle',layer:1})},
  {icon:icon({size:[iw,ih],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,io],layer:2})},
  {name:{...text('#text',{scale,anchor:'bottom_middle'}),layer:3,bindings:[{binding_name:'#form_button_text',binding_type:'collection',binding_collection_name:'form_buttons'},
   view(`('＜ ' + (#form_button_text - '${sel?selPrefix:prefix}') + ' ＞')`,'#text')]}}]);
 return [slot('card_'+index,index,prefix,box(x,y,w,h),look(false)),slot('card_sel_'+index,index,selPrefix,box(x,y,w,h),look(true))];
}
// the wide action button under a page: enabled (green) or disabled (plain, soft text)
function actionButton(index,x,y,w,h){
 return [slot('act',index,'ct:act|',box(x,y,w,h),state=>panel([{bg:img('button_wide_selected',{layer:1,alpha:state==='normal'?1:.85})},
   {text:{...caption('ct:act|',{scale:1.25,color:[0.12,0.25,0.08]}),layer:3}}])),
  slot('act_off',index,'ct:actx|',box(x,y,w,h),still([{bg:img('button_wide',{layer:1,alpha:.8})},{text:{...caption('ct:actx|',{scale:1.2,color:SOFT}),layer:3}}]))];
}
const page=(left,right,tab,statics,slots)=>({type:'panel',size:['100%','100%'],controls:[
 {'frame@cooptown_book.frame':{'$left_title':left,'$right_title':right,'$tab':tab}},
 {page:{type:'panel',...bookPlace,controls:[...statics,
  {buttons:{type:'collection_panel',size:['100%','100%'],collection_name:'form_buttons',layer:4,controls:slots}}]}}]});

// ---- job (ct:book:job) ----
// Slots: 4-12 the jobs (JOB_ORDER in the BP's book.js), "ct:j|" or "ct:js|" (the one shown on the left), 13 the
// action button ("ct:act|" / "ct:actx|" disabled), then data: 14 job icon (button image), 15 job name, 16 skill
// level, 17 xp label, 18 xp value, 19 xp bar, 20 features, 21 special materials, 22 current jobs line.
// Keep in step with JOB_SLOTS in book.js.
const JOB_SLOTS={jobs:4,action:13,icon:14,name:15,level:16,xpLabel:17,xpValue:18,xpBar:19,feature:20,special:21,now:22};
function jobPage(){
 // 9 jobs (鉱夫 / 木こり back 2026-10-30): three rows of three cards (two columns of four before)
 const S=JOB_SLOTS,cw=176,ch=160,grid=[0,1,2].flatMap(r=>[0,1,2].map(c=>[890+c*(cw+10),222+r*(ch+10)]));
 const statics=[
  {feature_bg:bimg('button_row',245,486,535,150,1)},{special_bg:bimg('button_row',245,652,535,150,1)},
  staticText('feature_label','職業の特徴',270,500,300,28),staticText('special_label','特別な素材',270,666,300,28)];
 const slots=[
  // a big square picture and the name under it (2026-10-30; was a wide card with a small icon)
  ...grid.flatMap(([x,y],i)=>squareCard(S.jobs+i,'ct:j|','ct:js|',x,y,cw,ch,122,.95)),
  ...actionButton(S.action,895,742,537,70),
  slot('d_icon',S.icon,'ct:d_jicon|',box(262,222,213,210),still([{bg:img('button_square_selected',{layer:1})},{icon:icon({size:['70%','70%'],anchor_from:'center',anchor_to:'center',layer:2})}])),
  dataText(S.name,'ct:d_jname|',505,228,265,56,{scale:2}),
  dataText(S.level,'ct:d_jlv|',505,286,265,56,{scale:2}),
  dataText(S.xpLabel,'ct:d_xpl|',500,362,160,30,{scale:.9,color:SOFT}),
  dataText(S.xpValue,'ct:d_xpv|',640,362,122,30,{scale:.9,align:'right'}),
  barSlot('d_xpbar',S.xpBar,'ct:d_xpbar|',498,398,264,28),
  wrapText(S.feature,'ct:d_feat|',290,540,470,85,{scale:1.05}),
  wrapText(S.special,'ct:d_special|',290,706,470,90,{scale:.95}),
  dataText(S.now,'ct:d_now|',248,808,530,30,{scale:.85,color:SOFT})];
 return page('職業','職業一覧','home',statics,slots);
}
const job=jobPage();

// ---- quests (ct:book:quests) ----
// Slots: 4-5 tabs ("ct:t|" / "ct:ts|" selected), 6-8 the quest rows ("ct:q|" / "ct:qs|": title, line break, goal and
// count), 9-11 their bars ("ct:d_rb|<percent>", pressing one picks its row too), 12 track button and 13 accept /
// deliver button (card-shaped, "ct:act|" / "ct:actx|" disabled), then data: 14 title, 15 goal, 16 count, 17 bar,
// 18 percent, 19 reward. Keep in step with QUEST_SLOTS in the BP's book.js.
const QUEST_SLOTS={tabs:4,rows:6,rowBars:9,track:12,main:13,title:14,goal:15,count:16,bar:17,percent:18,reward:19};
// a card-shaped action: enabled (green) or disabled (plain, soft text)
function cardAction(index,x,y,w,h,scale=1.25){
 return [slot('ca_'+index,index,'ct:act|',box(x,y,w,h),state=>panel([{bg:img('button_card_selected',{layer:1,alpha:state==='normal'?1:.85})},
   {icon:icon({size:['24%','46%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['10%',0],layer:2})},
   {text:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-3%',0],layer:3,controls:[{text:caption('ct:act|',{scale,color:[0.12,0.25,0.08]})}]}}])),
  slot('cx_'+index,index,'ct:actx|',box(x,y,w,h),still([{bg:img('button_card',{layer:1,alpha:.75})},
   {icon:icon({size:['24%','46%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['10%',0],layer:2,alpha:.5})},
   {text:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-3%',0],layer:3,controls:[{text:caption('ct:actx|',{scale:Math.round(scale*92)/100,color:SOFT})}]}}]))];
}
// a quest row: scroll icon, two-line caption (title / goal and count), '＞'
function questRow(index,x,y,w,h){
 const look=sel=>state=>panel([
  {bg:img(sel||state!=='normal'?'button_row_selected':'button_row',{layer:1})},
  {icon:icon({size:['20%','62%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['4%','-8%'],layer:2})},
  {caption:{type:'panel',size:['66%','60%'],anchor_from:'top_left',anchor_to:'top_left',offset:['30%','14%'],layer:3,controls:[{text:caption(sel?'ct:qs|':'ct:q|',{scale:1.15,anchor:'top_left',align:'left'})}]}},
  {more:{...text('＞',{scale:1.2,color:SOFT,anchor:'right_middle'}),offset:['-4%','-6%'],layer:3}}]);
 return [slot('row_'+index,index,'ct:q|',box(x,y,w,h),look(false)),slot('row_sel_'+index,index,'ct:qs|',box(x,y,w,h),look(true))];
}
function questPage(){
 const S=QUEST_SLOTS,rows=[303,470,637];
 const statics=[
  {detail_bg:bimg('button_row',890,215,550,250,1)},
  {reward_bg:bimg('button_row',912,520,500,130,1)},
  {reward_label:{type:'panel',...box(1080,488,160,36),layer:3,controls:[{text:text('報酬',{scale:1,color:SOFT})}]}},
  {reward_coins:bimg('icons/coins',1020,553,72,72)},
  {scroll_big:{type:'image',texture:B+'button_square',keep_ratio:false,...box(915,235,157,155),layer:2}},
  {scroll:bimg('icons/scroll',935,255,117,115,3)}];
 const slots=[
  ...pickCard(S.tabs,'ct:t|','ct:ts|',232,202,278,75,'button_row','20%',1.1),
  ...pickCard(S.tabs+1,'ct:t|','ct:ts|',518,202,280,75,'button_row','20%',1.1),
  ...rows.flatMap((y,i)=>questRow(S.rows+i,235,y,558,152)),
  ...rows.map((y,i)=>barSlot('rb'+i,S.rowBars+i,'ct:d_rb|',403,y+112,324,22)),
  ...cardAction(S.track,898,675,256,100),
  ...cardAction(S.main,1170,675,256,100),
  dataText(S.title,'ct:d_qt|',1095,250,335,60,{scale:1.4}), // quest names up to ~11 characters fit
  dataText(S.goal,'ct:d_qg|',1095,328,230,48,{scale:1.05}),
  dataText(S.count,'ct:d_qc|',1310,328,115,48,{scale:1.05,align:'right'}),
  barSlot('d_qbar2',S.bar,'ct:d_qb|',915,410,415,30),
  dataText(S.percent,'ct:d_qp|',1338,408,96,34,{scale:1.05,align:'right'}),
  dataText(S.reward,'ct:d_qr|',1110,565,260,56,{scale:1.8})];
 return page('依頼','依頼の詳細','home',statics,slots);
}
const quests=questPage();

// ---- the shared list page (ct:book:list / list_person / list_settings: the same page with that bookmark red) ----
// Used by daily, codex, titles, bank, shop, events, skill tree, gacha and guide (book.js listButtons()).
// A slot whose button text matches none of its prefixes draws nothing (the BP sends "ct:-|" to hide one).
// Slots: 4-5 two wide tabs or 6-9 four narrow tabs ("ct:t|" / "ct:ts|" selected), 10 summary line, 11-15 rows
// ("ct:r|" / "ct:rs|" selected / "ct:rx|" locked: title, line break, sub line; button image = icon), 16-20 their bars
// ("ct:d_rb|<percent>"), 21-22 previous / next five rows ("ct:pp|" / "ct:np|"), 23-24 page titles, then the right
// page: 25 icon (button image), 26 name, 27 state, 28 text, 29 bar, 30 bar value, 31 info label, 32 info value
// (button image = its icon), 33 info second line, 34-35 card buttons ("ct:act|" / "ct:actx|" disabled), 36 wide
// button ("ct:wa|" / "ct:wax|"). Keep in step with LIST_SLOTS in book.js.
const LIST_SLOTS={wideTabs:4,tabs:6,summary:10,rows:11,rowBars:16,prev:21,next:22,leftTitle:23,rightTitle:24,icon:25,name:26,state:27,text:28,bar:29,barValue:30,infoLabel:31,infoValue:32,info2:33,cards:34,wide:36};
const ROWS=5,ROW={x:235,y:330,w:558,h:86,gap:8};
// a list row: icon, two-line caption (title / sub line); selected = green, locked = faded
function listRow(index,x,y,w,h){
 const look=kind=>state=>panel([
  {bg:img(kind==='sel'||(kind==='row'&&state!=='normal')?'button_row_selected':'button_row',{layer:1,alpha:kind==='locked'?.6:1})},
  {icon:icon({size:['13%','70%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['3%',0],layer:2,alpha:kind==='locked'?.35:1})},
  {caption:{type:'panel',size:['78%','80%'],anchor_from:'top_left',anchor_to:'top_left',offset:['19%','10%'],layer:3,
   controls:[{text:caption({row:'ct:r|',sel:'ct:rs|',locked:'ct:rx|'}[kind],{scale:.95,anchor:'top_left',align:'left',color:kind==='locked'?SOFT:INK})}]}}]);
 return [slot('lr_'+index,index,'ct:r|',box(x,y,w,h),look('row')),slot('lr_sel_'+index,index,'ct:rs|',box(x,y,w,h),look('sel')),
  slot('lr_lock_'+index,index,'ct:rx|',box(x,y,w,h),look('locked'))];
}
// a page title carried by a button (the shared page has no fixed titles)
function titleSlot(index,prefix,side){
 const P=PAGE[side],w=480;
 return slot('title_'+side,index,prefix,box(P.title-w/2,PAGE.titleY-22,w,44),still([
  {line_l:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['24%',1],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0]}},
  {line_r:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['24%',1],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-2%',0]}},
  {text:caption(prefix,{scale:1.25})}]));
}
function arrow(index,prefix,x,t){
 return slot('ar_'+index,index,prefix,box(x,812,56,46),state=>panel([{text:{...text(t,{scale:1.5,color:state==='normal'?SOFT:[0.12,0.32,0.08]}),layer:3}}]));
}
function listPage(tab){
 const S=LIST_SLOTS,rowY=k=>ROW.y+k*(ROW.h+ROW.gap),tabW=(566-3*8)/4;
 const statics=[
  {detail_bg:bimg('button_row',890,205,550,265,1)},
  {icon_box:{type:'image',texture:B+'button_square',keep_ratio:false,...box(915,225,150,150),layer:2}},
  {info_bg:bimg('button_row',912,508,500,140,1)}];
 const slots=[
  ...pickCard(S.wideTabs,'ct:t|','ct:ts|',232,202,278,72,'button_row','20%',1.05),
  ...pickCard(S.wideTabs+1,'ct:t|','ct:ts|',518,202,280,72,'button_row','20%',1.05),
  ...[0,1,2,3].flatMap(i=>pickCard(S.tabs+i,'ct:t|','ct:ts|',232+i*(tabW+8),202,tabW,72,'button_card','0%',.8)),
  dataText(S.summary,'ct:d_sum|',240,282,550,40,{scale:1.05,align:'center'}),
  ...Array.from({length:ROWS},(_,k)=>listRow(S.rows+k,ROW.x,rowY(k),ROW.w,ROW.h)).flat(),
  ...Array.from({length:ROWS},(_,k)=>barSlot('lb'+k,S.rowBars+k,'ct:d_rb|',ROW.x+150,rowY(k)+60,380,16)),
  arrow(S.prev,'ct:pp|',236,'＜'),arrow(S.next,'ct:np|',738,'＞'),
  titleSlot(S.leftTitle,'ct:d_lt|','left'),titleSlot(S.rightTitle,'ct:d_rt|','right'),
  slot('d_icon',S.icon,'ct:d_ic|',box(930,240,120,120),still([{icon:icon({size:['100%','100%'],anchor_from:'center',anchor_to:'center',layer:3})}])),
  dataText(S.name,'ct:d_ti|',1085,228,345,58,{scale:1.45}),
  dataText(S.state,'ct:d_st|',1085,288,345,40,{scale:1,color:[0.12,0.32,0.08]}),
  wrapText(S.text,'ct:d_bd|',1085,332,345,60,{scale:.85}),
  barSlot('d_bar',S.bar,'ct:d_br|',915,398,405,28),
  dataText(S.barValue,'ct:d_bv|',1325,394,108,36,{scale:.95,align:'right'}),
  dataText(S.infoLabel,'ct:d_il|',1012,472,300,34,{scale:1,color:SOFT,align:'center'}),
  slot('d_info',S.infoValue,'ct:d_iv|',box(940,528,450,76),still([{icon:icon({size:['16%','90%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['8%',0],layer:2})},
   {text:{type:'panel',size:['70%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:d_iv|',{scale:1.5,anchor:'left_middle',align:'left'})}]}}])),
  dataText(S.info2,'ct:d_i2|',960,598,405,32,{scale:.9,color:SOFT,align:'center'}), // inside the frame, clear of its corners (2026-10-28 screenshot)
  // a longer text in the info2 slot (the codex's description, 2026-10-30): fills the info box's place, wrapped
  wrapText(S.info2,'ct:d_ds|',935,540,465,110,{scale:.95}),
  ...cardAction(S.cards,898,660,256,92),...cardAction(S.cards+1,1170,660,256,92),
  slot('wa',S.wide,'ct:wa|',box(895,766,537,60),state=>panel([{bg:img('button_wide_selected',{layer:1,alpha:state==='normal'?1:.85})},{text:{...caption('ct:wa|',{scale:1.15,color:[0.12,0.25,0.08]}),layer:3}}])),
  slot('wax',S.wide,'ct:wax|',box(895,766,537,60),still([{bg:img('button_wide',{layer:1,alpha:.75})},{text:{...caption('ct:wax|',{scale:1.1,color:SOFT}),layer:3}}]))];
 return page('','',tab,statics,slots);
}
const list=listPage('home'),list_person=listPage('person'),list_settings=listPage('settings');

// ---- my profile (ct:book:profile) ----
// Slots: 4 name, 5 title (empty = no ribbon), 6-8 main job line (button image = icon) / xp line / bar, 9-11 the same
// for the second job, 12 "称号を変更", 13-16 record cards ("label, line break, value"; image = icon), 17-22 skill
// rows (採掘 / 採取 / クラフト: "label Lv, line break, xp / max" + bar), 23-24 buttons (codex / quests).
// Keep in step with PROFILE_SLOTS in book-pages.js.
const PROFILE_SLOTS={name:4,title:5,main:6,second:9,changeTitle:12,records:13,codex:17,buttons:23};
// a record card (icon left, two-line caption) that cannot be pressed
function recordCard(index,prefix,x,y,w,h){
 return slot('rec_'+index,index,prefix,box(x,y,w,h),still([{bg:img('button_card',{layer:1})},
  {icon:icon({size:['28%','56%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['6%',0],layer:2})},
  // the caption starts right of the icon (it overlapped the icon)
  {text:{type:'panel',size:['56%','80%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-3%',0],layer:3,controls:[{text:caption(prefix,{scale:.88,anchor:'left_middle',align:'left'})}]}}]));
}
// a job block: icon, "主職業：…　Lv", xp line, bar
function jobBlock(first,y){
 return [
  slot('job_'+first,first,'ct:d_jb|',box(262,y+18,95,95),still([{icon:icon({size:['100%','100%'],layer:3})}])),
  dataText(first,'ct:d_jb|',380,y+14,390,44,{scale:1.15}),
  dataText(first+1,'ct:d_jx|',380,y+56,390,34,{scale:.9,color:SOFT}),
  barSlot('jbar_'+first,first+2,'ct:d_jbr|',380,y+92,375,22)];
}
function profilePage(){
 const S=PROFILE_SLOTS;
 const statics=[
  // a tall frame with the player in it (see the doll in the slots)
  {doll_bg:{type:'image',texture:B+'button_square',keep_ratio:false,...box(258,215,200,250),layer:1}},
  {doll_frame:pimg('avatar_frame',252,209,212,262,4)},
  {main_bg:bimg('button_row',243,482,537,132,1)},{second_bg:bimg('button_row',243,624,537,132,1)},
  {codex_bg:bimg('button_row',885,512,555,232,1)},
  {codex_label:{type:'panel',...box(1040,520,240,36),layer:3,controls:[{text:text('スキルレベル',{scale:1,color:SOFT})}]}}];
 const record=(i,x,y)=>recordCard(S.records+i,'ct:rc|',x,y,262,124);
 const codexRow=(i,y)=>[
  slot('cx_'+i,S.codex+2*i,'ct:d_cx|',box(905,y,200,60),still([{icon:icon({size:['28%','80%'],anchor_from:'left_middle',anchor_to:'left_middle',layer:2})},
   {text:{type:'panel',size:['66%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:d_cx|',{scale:.95,anchor:'left_middle',align:'left'})}]}}])),
  barSlot('cxb_'+i,S.codex+2*i+1,'ct:d_cxb|',1108,y+20,302,20)];
 const slots=[
  // the player (dollIn)
  {doll:dollIn(260,180,196,240)}, // the doll stands on the box's bottom: taller box = bigger, bottom raised = higher (asked: bigger, higher)
  dataText(S.name,'ct:d_pn|',490,226,290,64,{scale:2}),
  slot('p_title',S.title,'ct:d_title|',box(492,312,268,52),still([
   {ribbon:{type:'panel',size:['100%','100%'],bindings:[textBinding,view("(not (#form_button_text = 'ct:d_title|'))",'#visible')],controls:[
    {bg:{type:'image',texture:P_+'title_ribbon',keep_ratio:false,size:['100%','100%'],layer:2}},
    {medal:icon({size:['17%','125%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['-5%',0],layer:4})}, // the title's rank badge (button image; BP titles-config.js rankBadge)
    {text:{...caption('ct:d_title|',{scale:1.05,color:[1,0.97,0.86]}),layer:5}}]}}])),
  ...jobBlock(S.main,482),...jobBlock(S.second,624),
  slot('change_title',S.changeTitle,'ct:wa|',box(243,768,537,58),state=>panel([{bg:img(state==='normal'?'button_wide':'button_wide_selected',{layer:1})},
   {text:{...caption('ct:wa|',{scale:1.1,color:SOFT}),layer:3}},{more:{...text('＞',{scale:.9,color:SOFT,anchor:'right_middle'}),offset:['-5%',0],layer:3}}])),
  record(0,893,218),record(1,1172,218),record(2,893,360),record(3,1172,360),
  ...codexRow(0,556),...codexRow(1,616),...codexRow(2,676),
  ...cardAction(S.buttons,885,757,268,70),...cardAction(S.buttons+1,1168,757,270,70)];
 return page('マイプロフィール','冒険の記録','person',statics,slots);
}
const profile=profilePage();

// ---- settings (ct:book:settings) ----
// Slots: 4-7 HUD panel rows ("title, line break, description"; image = icon), 8-11 their checks ("ct:on|" / "ct:off|"),
// 12-14 HUD size (minimap size; "ct:t|" / "ct:ts|"), 15-17 notice rows, 18-20 their checks, 21-22 volume down / up,
// 23 volume bar, 24 volume value, 25 reset, 26 save, 27 / 28 town music volume down / up, 29 its bar, 30 its ON / OFF.
// Keep in step with SETTINGS_SLOTS in book-pages.js.
const SETTINGS_SLOTS={hudRows:4,hudChecks:8,size:12,noticeRows:15,noticeChecks:18,volDown:21,volUp:22,volBar:23,volValue:24,reset:25,save:26,bgmDown:27,bgmUp:28,bgmBar:29,bgmCheck:30};
function check(index,x,y){
 const look=on=>state=>panel([{bg:img(on?'button_square_selected':'button_square',{layer:1,alpha:state==='normal'?1:.85})},
  // ON / OFF in letters: symbols like a check mark may be missing from the game font
  {mark:{...text(on?'ON':'OFF',{scale:1.05,color:on?[0.12,0.3,0.08]:[0.28,0.18,0.1]}),layer:3}}]);
 return [slot('on_'+index,index,'ct:on|',box(x,y,70,62),look(true)),slot('off_'+index,index,'ct:off|',box(x,y,70,62),look(false))];
}
// a settings row (icon, title, small description) that cannot be pressed
function settingRow(index,x,y,w,h){
 return slot('sr_'+index,index,'ct:sr|',box(x,y,w,h),still([
  {icon:icon({size:['16%','70%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0],layer:2})},
  {text:{type:'panel',size:['80%','86%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:sr|',{scale:.95,anchor:'left_middle',align:'left'})}]}}]));
}
function settingsPage(){
 const S=SETTINGS_SLOTS,hudY=[205,308,411,514],noteY=[258,344,430];
 const statics=[
  ...hudY.map((y,i)=>({['hud_bg'+i]:bimg('button_row',243,y,537,96,1)})),
  {size_label:{type:'panel',...box(380,622,260,34),layer:3,controls:[{text:text('HUDサイズ（ミニマップ）',{scale:.95,color:SOFT})}]}},
  {size_note:{type:'panel',...box(330,736,360,30),layer:3,controls:[{text:text('自分の画面にのみ反映',{scale:.8,color:SOFT})}]}},
  {notice_bg:bimg('button_row',885,222,555,296,1)},
  {notice_label:{type:'panel',...box(1060,190,200,34),layer:3,controls:[{text:text('通知設定',{scale:.95,color:SOFT})}]}},
  // 2026-10-30: the town music (BP town-bgm.js) in place of the "how to open the menu" note: on / off and its volume
  {bgm_bg:bimg('button_row',885,526,555,96,1)},
  {bgm_label:{type:'panel',...box(905,544,95,60),layer:3,controls:[{text:text('BGM',{scale:1,anchor:'left_middle',align:'left'})}]}},
  {sound_bg:bimg('button_row',885,632,555,96,1)},
  {sound_label:{type:'panel',...box(905,650,95,60),layer:3,controls:[{text:text('通知音',{scale:1,anchor:'left_middle',align:'left'})}]}}];
 const slots=[
  ...hudY.map((y,i)=>settingRow(S.hudRows+i,258,y+8,420,84)),
  ...hudY.flatMap((y,i)=>check(S.hudChecks+i,690,y+19)),
  ...[0,1,2].flatMap(i=>pickCard(S.size+i,'ct:t|','ct:ts|',258+i*175,668,160,58,'button_card','0%',1.05)),
  ...noteY.map((y,i)=>settingRow(S.noticeRows+i,900,y,430,80)),
  ...noteY.flatMap((y,i)=>check(S.noticeChecks+i,1350,y+9)),
  // asked 2026-10-27: the value was cut off at the page's edge; the row is laid out inside its box (885-1440)
  slot('vol_down',S.volDown,'ct:vd|',box(1000,650,52,60),state=>panel([{text:{...text('－',{scale:1.5,color:state==='normal'?SOFT:INK}),layer:3}}])),
  barSlot('vol_bar',S.volBar,'ct:d_vb|',1056,666,202,26),
  slot('vol_up',S.volUp,'ct:vu|',box(1262,650,52,60),state=>panel([{text:{...text('＋',{scale:1.5,color:state==='normal'?SOFT:INK}),layer:3}}])),
  dataText(S.volValue,'ct:d_vv|',1318,656,100,46,{scale:1,align:'right'}),
  slot('bgm_down',S.bgmDown,'ct:vd|',box(1000,544,52,60),state=>panel([{text:{...text('－',{scale:1.5,color:state==='normal'?SOFT:INK}),layer:3}}])),
  barSlot('bgm_bar',S.bgmBar,'ct:d_vb|',1056,560,170,26),
  slot('bgm_up',S.bgmUp,'ct:vu|',box(1230,544,52,60),state=>panel([{text:{...text('＋',{scale:1.5,color:state==='normal'?SOFT:INK}),layer:3}}])),
  ...check(S.bgmCheck,1352,543),
  ...cardAction(S.reset,893,742,257,72,1.05),...cardAction(S.save,1168,742,262,72,1.05)]; // smaller text: 初期設定に戻す ran out of its button
 return page('表示設定','通知・操作','settings',statics,slots);
}
const settings=settingsPage();

// ---- friends (ct:book:friends; asked 2026-10-27 with a picture: the list on the left, the friend on the right) ----
// Slots: 4 search bar ("ct:fs|"), 5-7 tabs ("ct:t|" / "ct:ts|"), 8-11 rows ("ct:fr|" / "ct:frs|" selected: name, line
// break, status; image = a skin, its face is shown), 12-15 their job tags ("ct:fj|"; image = job icon), 16-19 their
// talk buttons ("ct:fc|" + unread count), 20 friend count, 21 / 23 previous / next ("ct:pp|" / "ct:np|"), 22 page
// ("ct:d_pg|"), then the right page: 24 portrait ("ct:d_pt|"; image = a skin, drawn front on), 25 name, 26 status,
// 27 job line (image = job icon), 28 title ribbon ("ct:d_title|", empty = none), 29-31 wide buttons ("ct:wa|" /
// "ct:wax|"; image = icon), 32 note. Keep in step with FRIEND_SLOTS in the BP's friend-book.js.
const FRIEND_SLOTS={search:4,tabs:5,rows:8,jobs:12,talk:16,count:20,prev:21,page:22,next:23,portrait:24,name:25,status:26,job:27,title:28,buttons:29,note:32};
// a part of a skin (pixels on the 64 x 64 texture) placed in a figure of gw x gh skin pixels
const skinPart=(name,u,v,w,h,gx,gy,gw,gh,layer)=>({[name]:{type:'image',keep_ratio:false,uv:[u,v],uv_size:[w,h],anchor_from:'top_left',anchor_to:'top_left',
 size:[pc(w/gw),pc(h/gh)],offset:[pc(gx/gw),pc(gy/gh)],layer,bindings:[
 {binding_name:'#form_button_texture',binding_name_override:'#texture',binding_type:'collection',binding_collection_name:'form_buttons'},
 {binding_name:'#form_button_texture_file_system',binding_name_override:'#texture_file_system',binding_type:'collection',binding_collection_name:'form_buttons'}]}});
const face=layer=>[skinPart('face',8,8,8,8,0,0,8,8,layer),skinPart('hat',40,8,8,8,0,0,8,8,layer+1)];
const figure=layer=>[ // front view, 16 x 32 skin pixels
 skinPart('head',8,8,8,8,4,0,16,32,layer),skinPart('hat',40,8,8,8,4,0,16,32,layer+1),
 skinPart('body',20,20,8,12,4,8,16,32,layer),skinPart('jacket',20,36,8,12,4,8,16,32,layer+1),
 skinPart('rarm',44,20,4,12,0,8,16,32,layer),skinPart('rsleeve',44,36,4,12,0,8,16,32,layer+1),
 skinPart('larm',36,52,4,12,12,8,16,32,layer),skinPart('lsleeve',52,52,4,12,12,8,16,32,layer+1),
 skinPart('rleg',4,20,4,12,4,20,16,32,layer),skinPart('rpants',4,36,4,12,4,20,16,32,layer+1),
 skinPart('lleg',20,52,4,12,8,20,16,32,layer),skinPart('lpants',4,52,4,12,8,20,16,32,layer+1)];
const FROW={x:238,y:342,w:552,h:100,gap:10};
// the user's pictures (tools/import-friends-ui.py): frames stretch by their nineslice .json
const FT='textures/cooptown/friends/';
const fimg=(name,extra={})=>({type:'image',texture:FT+name,keep_ratio:false,size:['100%','100%'],...extra});
// a friend row: face, name and status (online / offline dot), selected = green. Prefixes: ct:fr| / ct:frs| online,
// ct:fo| / ct:fos| offline.
function friendRow(index,y){
 const look=(sel,on)=>state=>panel([
  {bg:fimg(sel||state!=='normal'?'row_selected':'row',{layer:1})},
  {avatar_bg:{type:'image',texture:B+'button_square',keep_ratio:false,size:['15%','76%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['3%',0],layer:2}},
  {avatar:{type:'panel',size:['11.4%','58%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['4.8%',0],layer:3,controls:face(3)}},
  {dot:fimg(on?'i_online':'i_offline',{size:['4%','22%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['21.5%','18%'],layer:4})},
  {caption:{type:'panel',size:['38%','84%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['21%',0],layer:4,controls:[{text:caption({fr:'ct:fr|',frs:'ct:frs|',fo:'ct:fo|',fos:'ct:fos|'}[(on?'fr':'fo')+(sel?'s':'')],{scale:1.05,anchor:'left_middle',align:'left'})}]}},
  {divider:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.25,size:[1,'56%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['61%',0],layer:2}}]);
 const at=box(FROW.x,y,FROW.w,FROW.h);
 return [slot('fr_'+index,index,'ct:fr|',at,look(false,true)),slot('frs_'+index,index,'ct:frs|',at,look(true,true)),
  slot('fo_'+index,index,'ct:fo|',at,look(false,false)),slot('fos_'+index,index,'ct:fos|',at,look(true,false))];
}
// a tab with its picture (すべて / オンライン / 申請)
function friendTab(index,icon,x,y,w,h){
 const look=sel=>state=>panel([{bg:fimg(sel||state!=='normal'?'button_selected':'button',{layer:1})},
  // the online dot is a bare circle, drawn smaller than the framed badges so it stays off the label (2026-10-28 screenshot)
  {icon:fimg(icon,{keep_ratio:true,size:icon==='i_online'?['12%','40%']:['24%','62%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[icon==='i_online'?'10%':'7%',0],layer:2})},
  {text:{type:'panel',size:['64%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-3%',0],layer:3,controls:[{text:caption(sel?'ct:ts|':'ct:t|',{scale:.9})}]}}]);
 return [slot('ft_'+index,index,'ct:t|',box(x,y,w,h),look(false)),slot('fts_'+index,index,'ct:ts|',box(x,y,w,h),look(true))];
}
// a fixed page title like the frame's (this page carries its own)
function titleRowText(side,t){const P=PAGE[side],w=480;return {type:'panel',...box(P.title-w/2,PAGE.titleY-22,w,44),layer:3,controls:[
 {line_l:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['22%',1],anchor_from:'left_middle',anchor_to:'left_middle',offset:['2%',0]}},
 {line_r:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.55,size:['22%',1],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-2%',0]}},
 {text:text(t,{scale:1.25})}]};}
function friendsPage(){
 const S=FRIEND_SLOTS,rowY=k=>FROW.y+k*(FROW.h+FROW.gap),tabW=(552-2*10)/3;
 // the portrait is a little shorter than the frame's picture so the note fits above the buttons (2026-10-28 screenshot)
 const statics=[{portrait_frame:{...fimg('portrait'),...box(893,203,285,298),layer:4}},
  {info_line:{type:'image',texture:'textures/cooptown/solid',color:INK,alpha:.35,...box(1195,348,240,2),layer:2}}];
 const slots=[
  slot('fs',S.search,'ct:fs|',box(238,200,552,58),state=>panel([{bg:fimg('search',{layer:1,alpha:state==='normal'?1:.85})},
   {glass:fimg('i_search',{keep_ratio:true,size:['8%','76%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['3%',0],layer:3})},
   {text:{type:'panel',size:['82%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:fs|',{scale:1,color:SOFT,anchor:'left_middle',align:'left'})}]}}])),
  ...['i_friends','i_online','i_add_friend'].flatMap((ic,i)=>friendTab(S.tabs+i,ic,238+i*(tabW+10),270,tabW,60)),
  ...[0,1,2,3].flatMap(k=>friendRow(S.rows+k,rowY(k))),
  ...[0,1,2,3].map(k=>slot('fj_'+k,S.jobs+k,'ct:fj|',box(FROW.x+345,rowY(k)+16,130,68),still([
   {icon:icon({size:['36%','70%'],anchor_from:'left_middle',anchor_to:'left_middle',layer:5})},
   {text:{type:'panel',size:['62%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:5,controls:[{text:caption('ct:fj|',{scale:.95,anchor:'left_middle',align:'left'})}]}}]))),
  ...[0,1,2,3].map(k=>slot('fc_'+k,S.talk+k,'ct:fc|',box(FROW.x+474,rowY(k)+18,70,64),state=>panel([
   {bg:fimg('i_chat',{keep_ratio:true,layer:5,alpha:state==='normal'?1:.85})},
   {count:{type:'panel',size:['46%','42%'],anchor_from:'top_right',anchor_to:'top_right',offset:['8%','-12%'],layer:7,controls:[{text:caption('ct:fc|',{scale:.85,color:[0.75,0.12,0.1]})}]}}]))),
  dataText(S.count,'ct:d_fn|',292,800,290,40,{scale:1}), // right of the corner flourish
  slot('fp',S.prev,'ct:pp|',box(592,794,52,52),state=>panel([{bg:fimg('previous',{layer:1,alpha:state==='normal'?1:.8})}])),
  dataText(S.page,'ct:d_pg|',648,800,76,40,{scale:.95,align:'center'}),
  slot('fn',S.next,'ct:np|',box(728,794,52,52),state=>panel([{bg:fimg('next',{layer:1,alpha:state==='normal'?1:.8})}])),
  slot('pt',S.portrait,'ct:d_pt|',box(968,217,135,270),still([{fig:{type:'panel',size:['100%','100%'],controls:figure(3)}}])),
  dataText(S.name,'ct:d_ti|',1195,232,245,60,{scale:1.6}),
  dataText(S.status,'ct:d_st|',1195,292,245,44,{scale:1.05,color:[0.12,0.45,0.1]}),
  slot('fjob',S.job,'ct:d_jb|',box(1195,362,245,62),still([{icon:icon({size:['24%','86%'],anchor_from:'left_middle',anchor_to:'left_middle',layer:3})},
   {text:{type:'panel',size:['72%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',layer:3,controls:[{text:caption('ct:d_jb|',{scale:1.1,anchor:'left_middle',align:'left'})}]}}])),
  slot('ftitle',S.title,'ct:d_title|',box(1196,438,240,60),still([
   {ribbon:{type:'panel',size:['100%','100%'],bindings:[textBinding,view("(not (#form_button_text = 'ct:d_title|'))",'#visible')],controls:[
    {bg:fimg('title_ribbon',{layer:2})},
    {medal:icon({size:['24%','115%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['-3%',0],layer:4})}, // the title's rank badge over the ribbon's medal
    {text:{type:'panel',size:['72%','100%'],anchor_from:'right_middle',anchor_to:'right_middle',offset:['-2%',0],layer:5,controls:[{text:caption('ct:d_title|',{scale:.95,color:[1,0.97,0.86]})}]}}]}}])),
  ...[0,1,2].flatMap(i=>{const y=562+i*92;return [
   slot('fw_'+i,S.buttons+i,'ct:wa|',box(895,y,537,80),state=>panel([{bg:fimg(state==='normal'?'button':'button_pressed',{layer:1})},
    {icon:icon({size:['12%','60%'],anchor_from:'left_middle',anchor_to:'left_middle',offset:['14%',0],layer:2})},
    {text:{...caption('ct:wa|',{scale:1.2}),layer:3}}])),
   slot('fwx_'+i,S.buttons+i,'ct:wax|',box(895,y,537,80),still([{bg:fimg('button_disabled',{layer:1})},
    {text:{...caption('ct:wax|',{scale:1.1,color:SOFT}),layer:3}}]))];}),
  wrapText(S.note,'ct:d_bd|',900,506,530,50,{scale:.8,color:SOFT})];
 return page('フレンド一覧','フレンド情報','person',statics,slots);
}
const BOOK_ICONS=B+'icons/';
const friends=friendsPage();

const ui={namespace:'cooptown_book',frame,home,home2,job,quests,list,list_person,list_settings,profile,settings,friends};
fs.writeFileSync('ui/cooptown_book.json',JSON.stringify(ui,null,1)+'\n');
const defs=JSON.parse(fs.readFileSync('ui/_ui_defs.json','utf8'));
if(!defs.ui_defs.includes('ui/cooptown_book.json')){defs.ui_defs.push('ui/cooptown_book.json');fs.writeFileSync('ui/_ui_defs.json',JSON.stringify(defs,null,2)+'\n');}

// server_form: hide the vanilla form for the book titles and show the page (add-only, as build-dialog-ui.mjs)
const ROUTES=[['book_home','home','ct:book:home'],['book_home2','home2','ct:book:home2'],['book_job','job','ct:book:job'],['book_quests','quests','ct:book:quests'],['book_list','list','ct:book:list'],['book_list_person','list_person','ct:book:list_person'],['book_list_settings','list_settings','ct:book:list_settings'],['book_profile','profile','ct:book:profile'],['book_settings','settings','ct:book:settings'],['book_friends','friends','ct:book:friends']];
// routes of earlier builds, taken out again
const RETIRED=[['book_preview','preview','ct:book:preview']];
const sf=JSON.parse(fs.readFileSync('ui/server_form.json','utf8')),host=sf.cooptown_form_host.controls;
const vanilla=host[0].vanilla_host.bindings.find(b=>b.target_property_name==='#visible');
const titles=[...new Set([...vanilla.source_property_name.matchAll(/#title_text = '([^']*)'/g)].map(m=>m[1]))].filter(t=>!RETIRED.some(r=>r[2]===t));
for(const [key,root] of RETIRED){const i=host.findIndex(c=>c[`${key}@cooptown_book.${root}`]);if(i>=0)host.splice(i,1);}
for(const [,,t] of ROUTES)if(!titles.includes(t))titles.push(t);
const pair=(op,terms)=>terms.length===1?terms[0]:`(${pair(op,terms.slice(0,terms.length>>1))} ${op} ${pair(op,terms.slice(terms.length>>1))})`;
vanilla.source_property_name=VANILLA_COND; // tools/form-route.mjs
const blocker=host.find(c=>c.vanilla_blocker);
if(blocker)blocker.vanilla_blocker.bindings.find(b=>b.target_property_name==='#visible').source_property_name='(not '+vanilla.source_property_name+')';
for(const [key,root,t] of ROUTES){
 const name=`${key}@cooptown_book.${root}`;
 const i=host.findIndex(c=>c[name]),ctl={[name]:{layer:100,bindings:[{binding_name:'#title_text'},view(`(#title_text = '${t}')`,'#visible')]}};
 if(i>=0)host[i]=ctl;else host.push(ctl);
}
fs.writeFileSync('ui/server_form.json',JSON.stringify(sf,null,2)+'\n');
console.log('wrote ui/cooptown_book.json and routed',ROUTES.map(r=>r[2]).join(', '));
