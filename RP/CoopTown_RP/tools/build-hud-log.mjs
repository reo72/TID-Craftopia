// Generates ui/hud_screen.json: the bottom-right CoopTown log.
// Run: node tools/build-hud-log.mjs   (from the CoopTown_RP folder)
//
// The BP (hud-log.js) sends the log as a title: title = "ctlog:" + the text of each line, subtitle =
// the icon of each line (characters in font/glyph_E1.png / glyph_E0.png, or empty), then "ctinf:" + the info
// panels' text lines (INFO.lines of them: see INFO_LINES in hud-info.js). Icons and text are separate labels
// because the game mis-measures lines that mix icons and text, which breaks right alignment.
// The log box has a fixed width: the icon column is as wide as the longest info line (cut off by a window).
// (This game version cannot cut strings with '%.Ns', so lines are not split into controls.)
import {pixelFont} from './pixel-font.mjs';
import fs from 'fs';
const r2=v=>Math.round(v*100)/100;
// width: the log box's fixed width; line: height of one text line
const BOX={right:4,bottom:4,padX:4,padY:2,alpha:.5,gap:2,line:10,width:140};
// info lines after the log icons in the subtitle (keep in step with INFO_LINES in the BP's hud-info.js)
// heights: each info line's height at font scale 1. In the pixel font (tools/pixel-font.mjs) every line is 10 px,
// measured in game with numbered lines. (In the smooth font, lines with kana / kanji were 15 px and others 10 px,
// which is why the BP still keeps each line of a fixed kind.)
// offCount: the off-hand item's count for the hotbar's F box (its picture comes as a hidden mark, see hotbarStats)
const INFO={lines:20,heights:Array(20).fill(10),name:0,offCount:1,biome:2,coords:3,wallet:4,bank:5,questTitle:6,questGoal:7,questCount:8,notice:9,title:10,
 // the party panels (BP party.js): each member's name, title and HP text
 p1name:11,p1title:12,p1hp:13,p2name:14,p2title:15,p2hp:16,p3name:17,p3title:18,p3hp:19};
// Minimap box. fontScale shrinks the tile glyphs (and line height) together; tune it in game.
// fill: a second copy of the map, shifted right and drawn underneath, shows through the 1-dot gap the
// game leaves between characters (between map tiles).
// extraWidth: the gaps between map tiles come out a little wider than the line height (measured in game)
const MAP={right:4,top:2,pad:3,alpha:.55,fontScale:.28,fill:2,arrow:7,arrowDx:1,extraWidth:8,mapDx:2,north:10,sky:11,frameUp:0}; // mapDx: nudge the map right to centre it in the frame (measured in game)
// hidden marks the BP appends to the map text (written by tools/build-item-icons.py)
const TOKENS={...JSON.parse(fs.readFileSync('tools/map-glyphs.json','utf8')),...JSON.parse(fs.readFileSync('tools/party-glyphs.json','utf8'))}; // party: tools/build-party-hud.py (glyph page E2)
const has=ch=>`(not ((#ab - '${ch}') = #ab))`;
// anchored left: the game does not count the gaps between characters in the label width, so a
// centred label would drift right by half of them
const mapLabel=(dx,layer)=>({type:'label',text:'#text',size:['default','default'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[MAP.pad+MAP.mapDx+dx,0],color:[1,1,1],shadow:false,
 font_scale_factor:MAP.fontScale,text_alignment:'left',localize:false,layer,property_bag:{'#ab':'$actionbar_text'},bindings:[view("(#ab - 'ctmap:')",'#text')]});
// Copy of the vanilla hud_actionbar_text (1.26), kept so ordinary action bar messages look the same.
const VANILLA_ACTIONBAR={type:'image',size:['100%c + 12px','100%c + 5px'],offset:[0,'50%-68px'],texture:'textures/ui/hud_tip_text_background',
 alpha:'@hud.anim_actionbar_text_background_alpha_out',controls:[{actionbar_message:{type:'label',anchor_from:'center',anchor_to:'center',
 color:'$tool_tip_text',enable_profanity_filter:true,layer:31,text:'$actionbar_text',shadow:true,localize:false,alpha:'@hud.anim_actionbar_text_alpha_out'}}]};
const title={binding_name:'#hud_title_text_string',binding_type:'global'};
const subtitle={binding_name:'#hud_subtitle_text_string',binding_type:'global'};
const view=(source,target)=>({binding_type:'view',source_property_name:source,target_property_name:target});
const isLog="(not ((#hud_title_text_string - 'ctlog:') = #hud_title_text_string))";
const hasLines="(not (#hud_title_text_string = 'ctlog:'))";
const hasInfo="(not ((#hud_subtitle_text_string - 'ctinf:') = #hud_subtitle_text_string))";
// one info line (k) through a window of its height: the label is pushed down by the heights of the lines after k
// (plus nudge px, measured in game). The first line is instead shown from the label's top, which needs no
// counting (at scale 1.5 the counted position came out half a line off). y is where a 10 px line would start;
// a taller line's window is centred on that.
const infoBelow=k=>INFO.heights.slice(k+1).reduce((a,b)=>a+b,0);
// INFO_TEXT: dark brown, drawn twice BOLD px apart so it reads heavier (the HUD font has no bold; asked for darker text)
const INFO_TEXT={color:[0.17,0.08,0.03],bold:.5};
// tall: the window is that many lines high, centred on line k (for icons taller than a line); bold: drawn twice
function infoLine(k,{x,y,w,scale=1,color=INFO_TEXT.color,align='left',anchor='top_left',layer=4,nudge=0,tall=1,bold=true}){
 // every line counted from the bottom (2026-10-30: the name was read from the top, where the log's icon lines come
 // first, so a log line put an item icon in place of the name)
 const lh=INFO.heights[k],line=r2(lh*scale),h=r2(line*tall),top=false,side=(top?'top_':'bottom_')+(align==='right'?'right':'left');
 const dy=top?0:r2(infoBelow(k)*scale+nudge+(tall-1)*line/2),dx=align==='right'?-INFO_TEXT.bold:INFO_TEXT.bold;
 const text=ox=>({type:'label',text:'#text',size:['default','default'],anchor_from:side,anchor_to:side,offset:[ox,dy],font_scale_factor:scale,
  color,shadow:false,localize:false,text_alignment:align,bindings:[subtitle,view("(#hud_subtitle_text_string - 'ctinf:')",'#text'),view(hasInfo,'#visible')]});
 return {type:'panel',clips_children:true,anchor_from:anchor,anchor_to:anchor,offset:[x,r2(y-(lh-BOX.line)*scale/2)],size:[w,h],layer,controls:[
  {text:text(0)},...(bold?[{bold:text(dx)}]:[])]};
}
const label=(align,source,bind)=>({type:'label',text:'#text',size:['default','default'],color:[1,1,1],shadow:true,
 text_alignment:align,localize:false,layer:2,bindings:[bind,view(source,'#text')]});

// ---- minimap boxes ----
// Sizes: label font scales. Offsets were tuned in game at 0.28 and scale with the size.
const MAP_SIZES=[.21,.28,.36];
// square frame picture (tools/import-ivy-frame.py prints these): its inner opening, as fractions of the picture.
// The picture is drawn larger than the map box so the opening sits on the map.
const IVY={x0:0.0798,x1:0.9122,y0:0.0996,y1:0.9225},pc=v=>(v*100).toFixed(2)+'%';
// where the map tiles actually are inside the map box (fractions, measured in game at size 中):
// the box has some padding, so the opening is fitted to this area instead of the whole box
const FIT={l:.0301,t:.0312,w:.9337,h:.9502};
const IVY_BOX={w:FIT.w/(IVY.x1-IVY.x0),h:FIT.h/(IVY.y1-IVY.y0)};
IVY_BOX.x=FIT.l-IVY.x0*IVY_BOX.w;IVY_BOX.y=FIT.t-IVY.y0*IVY_BOX.h;
// everything in the map box moves left/down by the frame's right/top overhang, so the frame stays on screen
const SHIFT=[pc(1-(IVY_BOX.x+IVY_BOX.w)),pc(-IVY_BOX.y)];
function mapBox(scale,i){
 const k=scale/MAP.fontScale,px=v=>Math.max(1,Math.round(v*k));
 const label=(dx,layer)=>({type:'label',text:'#text',size:['default','default'],anchor_from:'left_middle',anchor_to:'left_middle',offset:[`${SHIFT[0]} + ${MAP.pad+px(MAP.mapDx)+dx}px`,SHIFT[1]],color:[1,1,1],shadow:false,
  font_scale_factor:scale,text_alignment:'left',localize:false,layer,property_bag:{'#ab':'$actionbar_text'},bindings:[view("(#ab - 'ctmap:')",'#text')]});
 const bag={'#ab':'$actionbar_text'};
 return {type:'panel',size:['100%cm','100%cm'],anchor_from:'top_right',anchor_to:'top_right',offset:[-MAP.right,MAP.top],layer:20,property_bag:bag,
  bindings:[view(`(((not ((#ab - 'ctmap:') = #ab)) and (not (#ab = 'ctmap:'))) and ${has(TOKENS['token:size'+i])})`,'#visible')],
  controls:[
   // square frame: width = its own height (the label's height is measured correctly, its width is not)
   {frame:{type:'panel',size:[`100%y + ${px(MAP.extraWidth)}px`,`100%sm + ${MAP.pad*2}px`],anchor_from:'top_left',anchor_to:'top_left',offset:SHIFT,layer:1,controls:[
    {square:{type:'image',texture:'textures/cooptown/map/frame_ivy',size:[pc(IVY_BOX.w),pc(IVY_BOX.h)],anchor_from:'top_left',anchor_to:'top_left',offset:[pc(IVY_BOX.x),`${pc(IVY_BOX.y)} - ${MAP.frameUp}px`],layer:1,property_bag:bag,bindings:[view(`(not ${has(TOKENS['token:circle'])})`,'#visible')]}},
    {circle:{type:'image',texture:'textures/cooptown/map/frame_circle',size:['100%','100%'],layer:1,property_bag:bag,bindings:[view(has(TOKENS['token:circle']),'#visible')]}},
    // north mark on the top edge, sun / moon in the top-right corner (hidden "night" mark)
    {north:{type:'image',texture:'textures/cooptown/map/north',size:[px(MAP.north),px(MAP.north)],anchor_from:'top_middle',anchor_to:'top_middle',offset:[pc(IVY_BOX.x+IVY_BOX.w/2-.5),`${pc((IVY_BOX.y+FIT.t)/2)} - ${px(MAP.north)/2+MAP.frameUp}px`],layer:6}},
    {sun:{type:'image',texture:'textures/cooptown/map/sun',size:[px(MAP.sky),px(MAP.sky)],anchor_from:'top_right',anchor_to:'top_right',offset:[-1,1],layer:6,property_bag:bag,bindings:[view(`(not ${has(TOKENS['token:night'])})`,'#visible')]}},
    {moon:{type:'image',texture:'textures/cooptown/map/moon',size:[px(MAP.sky),px(MAP.sky)],anchor_from:'top_right',anchor_to:'top_right',offset:[-1,1],layer:6,property_bag:bag,bindings:[view(has(TOKENS['token:night']),'#visible')]}}
   ]}},
   {tiles:label(0,3)},
   {fill:label(px(MAP.fill),2)},
   // your arrow over the centre tile, direction from the hidden "dirN" mark
   ...Array.from({length:8},(_,d)=>({['arrow_'+d]:{type:'image',texture:'textures/cooptown/map/arrow_'+d,size:[px(MAP.arrow),px(MAP.arrow)],anchor_from:'center',anchor_to:'center',
    offset:[`${SHIFT[0]} + ${MAP.arrowDx}px`,SHIFT[1]],layer:5,property_bag:bag,bindings:[view(has(TOKENS['token:dir'+d]),'#visible')]}}))
   ,{location:locationPanel()},{party:partyPanel()}
  ]};
}
// biome / coordinates under the minimap (inside each map box, so it follows the map's size); its top edge sits
// LOCATION.gap below the bottom of the frame picture, which hangs below the map box by (IVY_BOX.h - 1)
const LOCATION={w:104,h:26,gap:2,icon:9,iconX:5,textX:17,biome:{y:3.5,scale:.85},coords:{y:14,scale:.7}};
function locationPanel(){
 const L=LOCATION,P='textures/cooptown/profile/',img=(t,x,y,w,h,layer)=>({type:'image',texture:P+t,keep_ratio:false,anchor_from:'top_left',anchor_to:'top_left',offset:[x,y],size:[w,h],layer});
 // shown unless turned off in the book's settings (hidden mark hl)
 return {type:'panel',size:[L.w,L.h],anchor_from:'bottom_right',anchor_to:'top_right',offset:[0,`${pc(IVY_BOX.h-1)} + ${L.gap}px`],layer:6,
  property_bag:{'#ab':'$actionbar_text'},bindings:[view(`(not ${has(TOKENS['token:hl'])})`,'#visible')],controls:[
  {panel:img('location_panel',0,0,L.w,L.h,0)},
  {leaf:img('biome_leaf',L.iconX,L.biome.y,L.icon,L.icon,1)},
  {biome:infoLine(INFO.biome,{x:L.textX,y:L.biome.y+.5,w:L.w-L.textX-4,scale:L.biome.scale,layer:2})},
  {compass:img('coordinates_compass',L.iconX,14-1,L.icon,L.icon,1)},
  {coords:infoLine(INFO.coords,{x:L.textX,y:L.coords.y,w:L.w-L.textX-3,scale:L.coords.scale,layer:2})}]};
}

// party members under the location box (asked 2026-10-28 with a mockup; pictures: tools/build-party-hud.py): one card
// per member (hidden mark pm<k>), face = their job outfit's skin (pf<k>_<s>, PARTY_SKINS order), name / title / HP
// text = info lines, HP bar in tenths (ph<k>_<n>; red at 3 or less)
// 2026-10-29 screenshot: the name sat on the card's top edge and the HP numbers on its right edge, so everything moved
// inside the wooden border (about 5 px) and the card grew a little taller
const PARTY={w:104,h:40,gap:2,top:LOCATION.h+2,members:3,skins:['traveler','farmer','fisher','smith','cook','alchemist','enchanter','adventurer'],
 frame:{x:5,y:5,s:30},face:{inset:5},name:{x:39,y:7,scale:.7},ribbon:{x:37,y:16,w:60,h:10},medal:{x:36,y:16.5,s:9},title:{x:46,y:18.2,w:48,scale:.55},
 heart:{x:39,y:29,w:6,h:5.5},track:{x:46,y:28,w:28,h:8},fill:{dx:1.6,dy:1.8},hp:{x:75,y:29,w:22,scale:.5}};
function partyPanel(){
 const P=PARTY,T='textures/cooptown/party/',bag={'#ab':'$actionbar_text'};
 const img=(t,x,y,w,h,layer,extra={})=>({type:'image',texture:t,keep_ratio:false,anchor_from:'top_left',anchor_to:'top_left',offset:[x,y],size:[w,h],layer,...extra});
 const shown=mark=>({property_bag:bag,bindings:[view(has(TOKENS['token:'+mark]),'#visible')]});
 const card=k=>{const F=P.frame,fs=F.s-2*P.face.inset,t=P.track,fw=t.w-2*P.fill.dx,fh=t.h-2*P.fill.dy;
  return {type:'panel',size:[P.w,P.h],anchor_from:'top_left',anchor_to:'top_left',offset:[0,(k-1)*(P.h+P.gap)],layer:1,...shown('pm'+k),controls:[
   {bg:img(T+'member_panel',0,0,P.w,P.h,0)},
   ...P.skins.flatMap((s,i)=>[{['face'+i]:img('textures/cooptown/skins/'+s,F.x+P.face.inset,F.y+P.face.inset,fs,fs,1,{uv:[8,8],uv_size:[8,8],...shown(`pf${k}_${i}`)})},
    {['hat'+i]:img('textures/cooptown/skins/'+s,F.x+P.face.inset,F.y+P.face.inset,fs,fs,2,{uv:[40,8],uv_size:[8,8],...shown(`pf${k}_${i}`)})}]),
   {frame:img(T+'portrait_frame',F.x,F.y,F.s,F.s,3)},
   {name:infoLine(INFO[`p${k}name`],{x:P.name.x,y:P.name.y,w:P.w-P.name.x-3,scale:P.name.scale,layer:3})},
   {ribbon:img(T+'title_ribbon',P.ribbon.x,P.ribbon.y,P.ribbon.w,P.ribbon.h,1)},
   {medal:img(T+'title_medal',P.medal.x,P.medal.y,P.medal.s,P.medal.s*.78,2)},
   {title:infoLine(INFO[`p${k}title`],{x:P.title.x,y:P.title.y,w:P.title.w,scale:P.title.scale,color:[1,0.97,0.86],bold:false,layer:3})},
   {heart:img(T+'heart',P.heart.x,P.heart.y,P.heart.w,P.heart.h,1)},
   {track:img(T+'hp_track',t.x,t.y,t.w,t.h,1)},
   ...Array.from({length:10},(_,n)=>({['fill'+(n+1)]:img(T+(n+1<=3?'hp_fill_red':'hp_fill_green'),t.x+P.fill.dx,t.y+P.fill.dy,r2(fw*(n+1)/10),fh,2,shown(`ph${k}_${n+1}`))})),
   {hp:infoLine(INFO[`p${k}hp`],{x:P.hp.x,y:P.hp.y,w:P.hp.w,scale:P.hp.scale,layer:3})}]};};
 // 1 px tall, the cards hanging below it: the map box is as big as its biggest child, and a full-height panel here made
 // it (and the frame drawn from it) grow, so the map no longer filled its frame (2026-10-28 screenshot)
 return {type:'panel',size:[P.w,1],anchor_from:'bottom_right',anchor_to:'top_right',offset:[0,`${pc(IVY_BOX.h-1)} + ${LOCATION.gap+P.top}px`],layer:6,
  controls:Array.from({length:P.members},(_,i)=>({['member'+(i+1)]:card(i+1)}))};
}

// ---- hotbar (tools/build-hotbar.py cuts the pictures from the user's mockup) ----
// Slots, hearts, hunger and armor are the game's own pictures (replaced). Around them: a frame, the Lv box,
// a CoopTown XP bar and a stress panel. Their numbers come with the map text as hidden marks (statTokens in
// minimap.js: L/X/S = level / XP % / stress, 1/2/3 = hundreds/tens/ones digit), so the parts that change
// live in hud_actionbar_text. Positions are UI px from the bottom middle of the screen (y up is negative).
const HB='textures/cooptown/hotbar/';
// the off-hand picture's nudge from the F box's middle (the box picture's opening sits left of its middle)
const OFF_DX=[-3.5,0];
// hearts and hunger moved 22 px outwards to make room for the Lv box
const HEARTS_DX=22;
const at=(x,bottom,w,h)=>({anchor_from:'bottom_middle',anchor_to:'bottom_left',offset:[x,bottom],size:[w,h]});
const img=(name,x,bottom,w,h,extra={})=>({type:'image',texture:HB+name,keep_ratio:false,...at(x,bottom,w,h),...extra});
const PARTS={
 xp:{x:-93,bottom:-22,w:186,h:9}, fill:{x:-91.2,bottom:-24,w:182.6,h:4.7}, // fill: the bar inside the wood row
 bandL:{x:-109-HEARTS_DX,bottom:-31,w:107,h:13}, bandR:{x:2+HEARTS_DX,bottom:-31,w:107,h:13}, lv:{x:-25,bottom:-31,w:50,h:13},
 boxF:{x:-119,bottom:0,w:28,h:23}, boxE:{x:91,bottom:0,w:28,h:23}
};
// stress: 10 lightning icons above the hunger row, filling from the left (as in the final mockup), one per 10 stress
const STRESS_ROW={right:91+HEARTS_DX,bottom:-42,size:9,pitch:8};
const survival={binding_name:'#show_survival_ui',binding_name_override:'#visible'};
// hidden marks: one character per value (see statTokens in minimap.js)
const mark=k=>TOKENS['token:'+k];
const hasMark=k=>has(mark(k));
// joined two at a time in balanced halves, ((a or b) or (c or d))
const join=(op,terms)=>terms.length===1?terms[0]:`(${join(op,terms.slice(0,terms.length>>1))} ${op} ${join(op,terms.slice(terms.length>>1))})`;
const anyOf=terms=>join('or',terms);
const digitImg=(d,cond)=>({type:'image',texture:HB+'digit_'+d,keep_ratio:false,size:['100%','100%'],bindings:[view(cond,'#visible')]});
// level as up to three digit pictures; a place is skipped (stack collapses) when its marks are missing
function levelDigits(x,bottom,h,w){
 const place=(cond,controls)=>({type:'panel',size:[w,h],bindings:[view(cond,'#visible')],controls});
 return {type:'stack_panel',orientation:'horizontal',...at(x,bottom,w*3+2,h),size:['100%c',h],controls:[
  {p1:place(hasMark('lh1'),[{d1:digitImg(1,hasMark('lh1'))}])},
  {p2:place(hasMark('lp2'),Array.from({length:10},(_,d)=>({['d'+d]:digitImg(d,hasMark('lt'+d))})))},
  {p3:{type:'panel',size:[w,h],controls:Array.from({length:10},(_,d)=>({['d'+d]:digitImg(d,hasMark('lo'+d))}))}}
 ]};
}
// XP bar: one image per 10 % step, picked by the xp<k> mark
function xpSteps(texture,x,bottom,w,h){
 return {type:'panel',...at(x,bottom,w,h),controls:Array.from({length:10},(_,i)=>{const k=i+1;
  return {['s'+k]:{type:'image',texture,keep_ratio:false,anchor_from:'left_middle',anchor_to:'left_middle',size:[w*k/10,h],bindings:[view(hasMark('xp'+k),'#visible')]}};})};
}
const P=PARTS;
const hotbarFrame={type:'panel',size:['100%','100%'],layer:30,bindings:[{binding_name:'#hud_visible_centered',binding_name_override:'#visible',binding_type:'global'}],controls:[
 {xp_back:img('xp_back',P.xp.x,P.xp.bottom,P.xp.w,P.xp.h,{layer:1})},
 {band_left:img('band_left',P.bandL.x,P.bandL.bottom,P.bandL.w,P.bandL.h,{layer:2,bindings:[survival]})},
 {band_right:img('band_right',P.bandR.x,P.bandR.bottom,P.bandR.w,P.bandR.h,{layer:2,bindings:[survival]})},
 {lv_plate:img('lv_plate',P.lv.x,P.lv.bottom,P.lv.w,P.lv.h,{layer:3})},
 {box_f:img('box_f',P.boxF.x,P.boxF.bottom,P.boxF.w,P.boxF.h,{layer:1})},
 // the off-hand item's count in the F box (an info line of the subtitle, hud-info.js); its picture: hotbarStats
 {offhand:{type:'panel',...at(P.boxF.x,P.boxF.bottom,P.boxF.w,P.boxF.h),layer:5,controls:[
  {count:infoLine(INFO.offCount,{x:-2,y:-1,w:P.boxF.w-4,scale:.7,anchor:'bottom_right',align:'right',color:[1,1,1],bold:false,layer:2})}]}},
 {box_e:img('box_e',P.boxE.x,P.boxE.bottom,P.boxE.w,P.boxE.h,{layer:1})}
]};
// the changing parts (inside hud_actionbar_text, where the map text is readable)
// icon i (1..10): full / half by its own mark bf<i> / bh<i> (the BP decides from the stress value)
function stressRow(){
 const R=STRESS_ROW,controls=[];
 for(let i=1;i<=10;i++){
  const full=hasMark('bf'+i),halfCond=hasMark('bh'+i);
  controls.push({['bolt'+i]:{type:'panel',...at(R.right-R.size-R.pitch*(10-i),R.bottom,R.size,R.size),controls:[
   {empty:{type:'image',texture:HB+'stress_empty',keep_ratio:false,size:['100%','100%'],layer:1}},
   {half:{type:'image',texture:HB+'stress_half',keep_ratio:false,size:['100%','100%'],layer:2,bindings:[view(halfCond,'#visible')]}},
   {full:{type:'image',texture:HB+'stress_full',keep_ratio:false,size:['100%','100%'],layer:3,bindings:[view(full,'#visible')]}}]}});
 }
 return {type:'panel',size:['100%','100%'],bindings:[survival],controls};
}
const hotbarStats={type:'panel',size:['100%','100%'],layer:40,property_bag:{'#ab':'$actionbar_text'},
 bindings:[view(`((not ((#ab - 'ctmap:') = #ab)) and ${hasMark('hb')})`,'#visible')],controls:[
 {xp_fill:xpSteps(HB+'xp_fill',P.fill.x,P.fill.bottom,P.fill.w,P.fill.h)},
 {lv:levelDigits(P.lv.x+21,P.lv.bottom-3,7,5)},
 {stress_row:stressRow()},
 // the off-hand item's picture in the F box, by its hidden mark (os / ot / oa); OFF_DX centres it (measured in game)
 {offhand:{type:'panel',...at(P.boxF.x,P.boxF.bottom,P.boxF.w,P.boxF.h),controls:[
  {shield:{type:'image',texture:HB+'off_shield',keep_ratio:true,size:['62%','80%'],anchor_from:'center',anchor_to:'center',offset:OFF_DX,bindings:[view(hasMark('os'),'#visible')]}},
  {totem:{type:'image',texture:'textures/cooptown/items/totem_of_undying',keep_ratio:true,size:['62%','80%'],anchor_from:'center',anchor_to:'center',offset:OFF_DX,bindings:[view(hasMark('ot'),'#visible')]}},
  {arrow:{type:'image',texture:'textures/cooptown/items/arrow',keep_ratio:true,size:['62%','80%'],anchor_from:'center',anchor_to:'center',offset:OFF_DX,bindings:[view(hasMark('oa'),'#visible')]}}]}}
]};
// Every control whose bindings read #ab needs its own property bag: a child does not see its parent's bag
// (without it every condition came out true in game: Lv "888", full XP bar, all bolts lit).
function giveBag(node){
 if(Array.isArray(node)){node.forEach(giveBag);return;}
 if(!node||typeof node!=='object')return;
 if(Array.isArray(node.bindings)&&node.bindings.some(b=>String(b.source_property_name??'').includes('#ab')))node.property_bag={...(node.property_bag??{}),'#ab':'$actionbar_text'};
 for(const k in node)if(k!=='bindings')giveBag(node[k]);
}
giveBag(hotbarStats);

// ---- profile (top left; tools/build-profile.py makes the pictures from the user's assets) ----
// Face: the game's own player model in the face frame. Name: an info line of the subtitle (see INFO). Job, CoopTown level and title
// come with the map text as hidden marks (statTokens in minimap.js), job / title numbers as bits.
// Joining three or more checks with "and" did not work in game (only the last one counted), so each bit is
// a panel of its own with a single check, nested: a picture shows only when all panels above it show.
// Job names and titles are pictures (the HUD cannot cut text apart). Positions are UI px inside the plate,
// measured from the user's mockup.
const PF='textures/cooptown/profile/';
const PROFILE=JSON.parse(fs.readFileSync('tools/profile-layout.json','utf8'));
// plate: the mockup's shape (a little taller than the picture)
// doll: size of the model's box and how far it sits right of / below the middle of the face frame. Head and
// shoulders: the game draws the held item outside any clipping, so the model sits behind the plate (plate_cut has
// the opening cut out) and is kept small enough for the hands to stay behind it. Keep plate and frame in step with
// PLATE_HUD / FRAME_IN_PLATE in build-profile.py.
const PRO={left:4,top:4,w:180,h:64,frame:{x:12,y:10,size:44},name:{x:64,y:11,scale:1.5},row:{x:63,y:27,h:13,text:9,gap:3,lvGap:6},
 ribbon:{x:63,y:42,w:106,h:13},medal:{x:60,y:40,size:17},titleText:{x:80,h:8,maxW:84},doll:{size:36,dx:0,dy:8},layer:25};
const shape=k=>PROFILE.shapes[k];
const topLeft=(x,y,w,h)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[x,y],size:[w,h]});
const pimg=(name,x,y,w,h,extra={})=>({type:'image',texture:PF+name,keep_ratio:false,...topLeft(x,y,w,h),...extra});
const full=(cond,controls)=>({type:'panel',size:['100%','100%'],bindings:[view(cond,'#visible')],controls});
// a number held as bits in the marks <k>0, <k>1, ...: a tree of panels, one bit per level; leaf(v) gives the
// controls for number v (or nothing)
function bitTree(k,n,leaf,b=n-1,v=0){
 if(b<0)return leaf(v)??[];
 const zero=bitTree(k,n,leaf,b-1,v),one=bitTree(k,n,leaf,b-1,v|1<<b),out=[];
 if(zero.length)out.push({[k+b+'_0']:full(`(not ${hasMark(k+b)})`,zero)});
 if(one.length)out.push({[k+b+'_1']:full(hasMark(k+b),one)});
 return out;
}
// "Lv." and up to three digits, as a stack (a place collapses when its mark is missing)
function levelStack(x){
 const R=PRO.row,T=R.text,digitW=Math.max(...Array.from({length:10},(_,d)=>shape('digit_'+d)))*T;
 const pic=(name,cond)=>({type:'image',texture:PF+name,keep_ratio:false,size:[r2(shape(name)*T),T],anchor_from:'center',anchor_to:'center',bindings:cond?[view(cond,'#visible')]:undefined});
 const place=(cond,controls)=>({type:'panel',size:[r2(digitW),R.h],bindings:cond?[view(cond,'#visible')]:undefined,controls});
 return {type:'stack_panel',orientation:'horizontal',...topLeft(x,R.y,'100%c',R.h),controls:[
  {lv:{type:'panel',size:[r2(shape('lv')*T),R.h],controls:[{pic:pic('lv')}]}},
  {p1:place(hasMark('lh1'),[{d1:pic('digit_1')}])},
  {p2:place(hasMark('lp2'),Array.from({length:10},(_,d)=>({['d'+d]:pic('digit_'+d,hasMark('lt'+d))})))},
  {p3:place(null,Array.from({length:10},(_,d)=>({['d'+d]:pic('digit_'+d,hasMark('lo'+d))})))}
 ]};
}
// one job: icon, name, then the level right after the name
function jobRow(i){
 const R=PRO.row,nameX=R.x+R.h+R.gap,nameW=shape('job_name_'+i)*R.text;
 return [
  {icon:pimg('job_'+i,R.x,R.y,r2(shape('job_'+i)*R.h),R.h)},
  {name:pimg('job_name_'+i,nameX,r2(R.y+(R.h-R.text)/2),r2(nameW),R.text)},
  {level:levelStack(r2(nameX+nameW+R.lvGap))}];
}
// without a job: the level alone
const noJobRow=()=>[{level:levelStack(PRO.row.x)}];
// the title (asked 2026-10-28: titles outside the old picture list showed nothing): its name as text (info line
// INFO.title) on the ribbon, and its rank's badge (pt bits = rank 1-6 ブロンズ … アセンデッド, 7 = 特別, BP minimap.js)
function profileTitle(){
 const R=PRO.ribbon,M=PRO.medal,T=PRO.titleText,S=r2(M.size*.85); // badge a little smaller than the old medal (asked 2026-10-28)
 const badge=i=>i<1||i>7?undefined:[{badge:{type:'image',texture:'textures/cooptown/titles/rank_'+(i===7?3:i),keep_ratio:true,size:[S,S],anchor_from:'top_left',anchor_to:'top_left',offset:[M.x+1,r2(R.y+R.h/2-S/2)],layer:5}}];
 return full(hasMark('ptx'),[
  {ribbon:pimg('title_ribbon',R.x,R.y,R.w,R.h,{layer:2})},
  ...bitTree('pt',3,badge),
  {text:infoLine(INFO.title,{x:T.x,y:r2(R.y+(R.h-BOX.line*.85)/2),w:T.maxW,scale:.85,color:[1,0.97,0.86],layer:4})}]);
}
// ---- info panels under the profile: money / bank, tracked quest (positions in UI px from the profile's corner) ----
// textDy: how far the money text sits below the panel's middle (tuned on request)
const WALLET={x:0,y:65,w:127,h:17,icon:11,coinX:7,bankX:69,textDx:14,textW:44,scale:.85,textDy:0};
// bar: the progress track; the green fill sits in its empty inner area, one picture per 5 % (qp bits)
const QUEST={x:0,y:83,w:127,h:40,scroll:{x:6,y:8,h:13},title:{x:22,y:9.5,scale:.85},goal:{x:22,y:19,scale:.7},count:{x:84,y:19,w:36,scale:.7},
 bar:{x:8,y:27.5,w:111,h:8.5}};
function walletPanel(){
 const W=WALLET,iy=r2(W.y+(W.h-W.icon)/2),ty=r2(W.y+(W.h-BOX.line*W.scale)/2+.5+W.textDy);
 return {type:'panel',size:['100%','100%'],layer:3,controls:[
  {panel:pimg('wallet_bank_panel',W.x,W.y,W.w,W.h,{layer:0})},
  {coins:pimg('wallet_coins',W.x+W.coinX,iy,r2(shape('wallet_coins')*W.icon),W.icon,{layer:1})},
  {wallet:infoLine(INFO.wallet,{x:W.x+W.coinX+W.textDx,y:ty,w:W.textW,scale:W.scale,layer:2})},
  {vault:pimg('bank_vault',W.x+W.bankX,iy,r2(shape('bank_vault')*W.icon),W.icon,{layer:1})},
  {bank:infoLine(INFO.bank,{x:W.x+W.bankX+W.textDx,y:ty,w:W.textW,scale:W.scale,layer:2})}]};
}
function questPanel(){
 const Q=QUEST,B=Q.bar,inner=PROFILE.track_inner,at=(o)=>[Q.x+o.x,Q.y+o.y];
 const fx=r2(Q.x+B.x+inner.x0*B.w),fy=r2(Q.y+B.y+inner.y0*B.h),fw=(inner.x1-inner.x0)*B.w,fh=r2((inner.y1-inner.y0)*B.h);
 const fill=v=>v>=1&&v<=PROFILE.fill_steps?[{fill:pimg('fill_'+v,fx,fy,r2(fw*v/PROFILE.fill_steps),fh,{layer:3})}]:undefined;
 return {...full(hasMark('qx'),[
  {panel:pimg('quest_panel',Q.x,Q.y,Q.w,Q.h,{layer:0})},
  {scroll:pimg('quest_scroll',...at(Q.scroll),r2(shape('quest_scroll')*Q.scroll.h),Q.scroll.h,{layer:1})},
  {title:infoLine(INFO.questTitle,{x:Q.x+Q.title.x,y:Q.y+Q.title.y,w:Q.w-Q.title.x-4,scale:Q.title.scale,layer:2})},
  {goal:infoLine(INFO.questGoal,{x:Q.x+Q.goal.x,y:Q.y+Q.goal.y,w:Q.count.x-Q.goal.x-2,scale:Q.goal.scale,layer:2})},
  {count:infoLine(INFO.questCount,{x:Q.x+Q.count.x,y:Q.y+Q.count.y,w:Q.count.w,scale:Q.count.scale,align:'right',layer:2})},
  {track:pimg('progress_track',Q.x+B.x,Q.y+B.y,B.w,B.h,{layer:2})},
  ...bitTree('qp',5,fill)]),layer:3};
}
const F=PRO.frame,hole=PROFILE.frame_hole;
const profile={type:'panel',...topLeft(PRO.left,PRO.top,PRO.w,PRO.h),layer:PRO.layer,
 bindings:[view(`((not ((#ab - 'ctmap:') = #ab)) and ${hasMark('hb')})`,'#visible')],controls:[
 // the profile itself, unless turned off in the book's settings (hidden mark hp)
 {profile_part:full(`(not ${hasMark('hp')})`,[
 // the whole plate underneath (seen through the opening behind the model), the cut-out plate over the model
 {plate_back:pimg('plate',0,0,PRO.w,PRO.h,{layer:0})},
 {plate:pimg('plate_cut',0,0,PRO.w,PRO.h,{layer:3})},
 // the player model, clipped to the frame's opening (frame drawn over it)
 {face:{type:'panel',clips_children:true,...topLeft(r2(F.x+hole.x0*F.size),r2(F.y+hole.y0*F.size),r2((hole.x1-hole.x0)*F.size),r2((hole.y1-hole.y0)*F.size)),layer:1,controls:[
  // the inventory's live model (the pause screen's turnable paper_doll_renderer drew nothing in the HUD);
  // facing straight ahead (#look_at_cursor turned it toward the screen centre, lower right: not wanted)
  // drawn under the plate (layer 1 here, plate 3): the plate hides the held item, the opening shows the face
  {player:{type:'custom',renderer:'live_player_renderer',layer:1,
   size:[PRO.doll.size,PRO.doll.size],anchor_from:'center',anchor_to:'center',offset:[PRO.doll.dx,PRO.doll.dy]}}]}},
 {frame:pimg('avatar_frame',F.x,F.y,r2(shape('avatar_frame')*F.size),F.size,{layer:6})},
 {name:infoLine(INFO.name,{x:PRO.name.x,y:PRO.name.y,w:PRO.w-PRO.name.x-6,scale:PRO.name.scale})},
 {row:{type:'panel',size:['100%','100%'],layer:4,controls:bitTree('pj',4,v=>v===0?noJobRow():v<=PROFILE.jobs?jobRow(v):undefined)}},
 {title:{...profileTitle(),layer:3}}])},
 // money / bank and the quest panel, each unless turned off (hw / hq)
 {wallet:full(`(not ${hasMark('hw')})`,[{panel:walletPanel()}])},
 {quest:full(`(not ${hasMark('hq')})`,[{panel:questPanel()}])}
]};
giveBag(profile);
// ---- top notification bar (BP notify.js) ----
// The text is the last info line of the subtitle; the kind (nt1-4) and the slide frame (nf0-5) are hidden marks in the
// action bar text. Each frame is its own copy of the bar, lower by one step (the BP sends frame 0..5 one tick apart to
// slide it in from above the screen, and back to hide it), so no JSON UI animation is needed.
const NOTE={w:220,h:40,top:4,frames:6,textX:46,textW:166,kinds:['info','ok','warn','error']};
const noteFrame=k=>{const y=r2(NOTE.top-(NOTE.frames-1-k)/(NOTE.frames-1)*(NOTE.h+NOTE.top+4));
 return {['frame_'+k]:{type:'panel',size:[NOTE.w,NOTE.h],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,y],layer:60,
  bindings:[view(hasMark('nf'+k),'#visible')],controls:[
   // each kind with its own copy of the text ("or" never came out true in game)
   ...NOTE.kinds.map((kind,i)=>({[kind]:nest(onlyKind(i+1),[
    {bg:{type:'image',texture:'textures/cooptown/notify/'+kind,keep_ratio:false,size:[NOTE.w,NOTE.h],layer:1}},
    {text:infoLine(INFO.notice,{x:NOTE.textX,y:r2((NOTE.h-BOX.line)/2),w:NOTE.textW,layer:3})}])}))]}};};
// the plain bars: their own mark and none of the other three (two marks together = a title banner, below)
const onlyKind=k=>[hasMark('nt'+k),...[1,2,3,4].filter(x=>x!==k).map(x=>`(not ${hasMark('nt'+x)})`)];
// one check per panel, nested (three or more checks joined with "and" did not work in game, see the profile)
const nest=(checks,controls)=>{const [c,...rest]=checks;return {type:'panel',size:['100%','100%'],bindings:[view(c,'#visible')],controls:rest.length?[{inner:nest(rest,controls)}]:controls};};
// title banners (asked 2026-10-27, the user's pictures; tools/build-title-banners.py): a title's rank comes as two of
// the bar marks together (no new font characters: they would push item icons out of the log font), the title's
// name is the notice line, written in the middle of the banner (zones.json: where the rank word was).
const RANK_PAIRS=[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]; // ブロンズ シルバー ゴールド エピック レジェンド アセンデッド (BP notify.js)
const ZONES=JSON.parse(fs.readFileSync('tools/title-banners/zones.json','utf8'));
const TITLE={w:236,top:4,scale:1,sizes:[[null,1],['ns1',.8],['ns2',.65]]}; // sizes: [mark, font scale] of the name (BP notify.js BANNER)
const pairOn=([a,b])=>[hasMark('nt'+a),hasMark('nt'+b)];
// the notice line centred in a box: the whole subtitle, bottom line on the box's bottom, lines centred
const noticeCentre=(scale)=>{const lh=INFO.heights[INFO.notice];
 return {type:'label',text:'#text',size:['default','default'],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,r2(infoBelow(INFO.notice)*scale)],font_scale_factor:scale,
  color:[0.07,0.2,0.09],shadow:false,localize:false,text_alignment:'center',bindings:[subtitle,view("(#hud_subtitle_text_string - 'ctinf:')",'#text'),view(hasInfo,'#visible')]};};
const titleFrame=k=>{
 return {['title_'+k]:{type:'panel',size:['100%','100%'],layer:61,bindings:[view(hasMark('nf'+k),'#visible')],controls:Object.entries(ZONES).map(([n,z])=>{
  const h=r2(TITLE.w/z.aspect),y=r2(TITLE.top-(NOTE.frames-1-k)/(NOTE.frames-1)*(h+TITLE.top+4)),line=r2(BOX.line*TITLE.scale);
  return {['rank_'+n]:{type:'panel',size:[TITLE.w,h],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,y],controls:[{show:nest(pairOn(RANK_PAIRS[n-1]),[
   {bg:{type:'image',texture:'textures/cooptown/notify/title_'+n,keep_ratio:false,size:['100%','100%'],layer:1}},
   // the name in one of three sizes: a long title comes with the mark ns1 / ns2 and is drawn smaller to fit the
   // banner's text area (BP notify.js fitBanner; 2026-10-28: long names were cut off at both ends). Only on the
   // settled frame: the banner slides in blank for a quarter second (2026-10-30, lighter HUD: the action bar's
   // controls are built again for every message, and the names on every frame were a quarter of them)
   ...(k<NOTE.frames-1?[]:TITLE.sizes).map(([mark,sc],i)=>{const ln=r2(BOX.line*sc);return {['title_name'+i]:{type:'panel',clips_children:true,anchor_from:'top_left',anchor_to:'top_left',size:[r2(z.w*TITLE.w),ln],
    offset:[r2(z.x*TITLE.w),r2((z.y+z.h/2)*h-ln/2)],layer:3,bindings:[view(mark?has(TOKENS['token:'+mark]):`(not ${has(TOKENS['token:ns1'])})`,'#visible')],
    // the full size: "not ns1" here and "not ns2" on the inner panel (2026-10-30: one "(not a) and (not b)" check came
    // out true with ns1 on, so the full and the smaller name were drawn over each other)
    controls:mark?nameLabels(sc):[{full:{type:'panel',size:['100%','100%'],bindings:[view(`(not ${has(TOKENS['token:ns2'])})`,'#visible')],controls:nameLabels(sc)}}]}};})])}]}};})}};};
const nameLabels=sc=>[{text:noticeCentre(sc)},{bold:{...noticeCentre(sc),offset:[.5,r2(infoBelow(INFO.notice)*sc)]}}];
const notifyBox={type:'panel',size:['100%','100%'],layer:60,controls:[...Array.from({length:NOTE.frames},(_,k)=>noteFrame(k)),...Array.from({length:NOTE.frames},(_,k)=>titleFrame(k))]};
giveBag(notifyBox);
// vanilla hearts / armor / hunger / bubbles moved outwards; the vanilla XP level number hidden
const CENTERED=JSON.parse(fs.readFileSync('tools/assets/hotbar/vanilla_centered_bottom.json','utf8'));
// dark strips under the heart and hunger rows (the empty icons have margins; the band above has a window)
const track=(x,w)=>({type:'image',texture:'textures/cooptown/solid',color:[0.2,0.12,0.09],keep_ratio:false,size:[w,11],anchor_from:'bottom_left',anchor_to:'bottom_left',offset:[x,-30],layer:0,bindings:[survival]});
CENTERED.controls.unshift({heart_track:track(-1-HEARTS_DX-1,83)},{hunger_track:track(180+HEARTS_DX-81-1,83)});
for(const c of CENTERED.controls){const [k,v]=Object.entries(c)[0];if(!v.offset)continue;
 if(/^heart_rend@/.test(k))v.offset=[v.offset[0]-HEARTS_DX,v.offset[1]];
 if(/^armor_rend@/.test(k))v.offset=[v.offset[0]-HEARTS_DX,v.offset[1]-1];      // just above the band (moved down 2 px on request)
 if(/^hunger_rend@/.test(k))v.offset=[v.offset[0]+HEARTS_DX,v.offset[1]];
 if(/^bubbles_rend_[01]@/.test(k))v.offset=[v.offset[0]+HEARTS_DX,v.offset[1]-10];} // above the stress row

// ---- fishing minigame panel (BP reel-game.js) ----
// The BP sends the action bar "ctfsh:" + the hotbar / profile marks + one character per value (keep in step with
// FISH_UI in reel-game.js): fish place U+0100+k and frame place U+0120+k (k 0-29), catch gauge U+0140+k and line
// tension U+0160+k (k 0-20, 5 % steps), U+0180 = reeling. Each picture checks one character (see the notes on "or").
// Layout measured from the user's mockup (panel 935 x 390 px there = 280 x 117 UI px here, at the screen's bottom middle).
// zones: the green frame in its three sizes (BP reel-game.js REEL.frames, wider with the job level): place marks base, width %
const FUI={scale:1,zones:[{base:0x1C0,pct:24},{base:0x120,pct:30},{base:0x1E0,pct:36}],x0:0x100,f0:0x120,g0:0x140,t0:0x160,hold:0x180,steps:30,gsteps:20,w:280,h:126,bottom:-4,
 track:{x:12,y:26,w:255,h:21,in:3},zone:{w:78,h:17},fish:{w:16,h:10},
 gauges:[{x:7,w:130,icon:'fish_icon',iw:12,ih:8,label:'釣り上げ',fill:'bar_catch'},{x:141,w:131,icon:'hook_bobber_icon',iw:4,ih:12,label:'糸の張り',fill:'bar_tension'}],
 gbox:{y:63,h:17},bar:{dx:21,y:71,w:88,h:6},pct:{dx:114,y:69}};
const ch=c=>String.fromCodePoint(c);
const isFishing="(not ((#ab - 'ctfsh:') = #ab))";
const FS=v=>r2(v*FUI.scale);
const fimg=(name,x,y,w,h,extra={})=>({type:'image',texture:'textures/cooptown/fishing/'+name,keep_ratio:false,size:[FS(w),FS(h)],anchor_from:'top_left',anchor_to:'top_left',offset:[FS(x),FS(y)],...extra});
const ftext=(text,x,y,{scale=1,color=[1,1,1],w=FUI.w,align='center'}={})=>({type:'label',text,size:[FS(w),10],anchor_from:'top_left',anchor_to:'top_left',offset:[FS(x),FS(y)],font_scale_factor:r2(scale*FUI.scale),color,shadow:true,localize:false,text_alignment:align,layer:5});
function fishingBox(){
 const T=FUI.track,inner=T.w-T.in*2,at=(k,w)=>r2(T.x+T.in+k/(FUI.steps-1)*(inner-w)),Z=FUI.zone;
 const zones=FUI.zones.flatMap((v,i)=>{const zw=r2(inner*v.pct/100);return Array.from({length:FUI.steps},(_,k)=>({[`zone_${i}_${k}`]:{type:'panel',size:[FS(zw),FS(30)],anchor_from:'top_left',anchor_to:'top_left',offset:[FS(at(k,zw)),FS(T.y+(T.h-Z.h)/2)],layer:3,
  bindings:[view(has(ch(v.base+k)),'#visible')],controls:[
   {zone:fimg('catch_zone',0,0,zw,Z.h)},
   // the bobber hangs under the frame's middle (as in the mockup)
   {hook:fimg('hook_bobber_icon',r2(zw/2-2.5),Z.h-2,5,13,{layer:1})}]}}));});
 const fish=Array.from({length:FUI.steps},(_,k)=>({['fish_'+k]:fimg('fish_icon',at(k,FUI.fish.w),r2(T.y+(T.h-FUI.fish.h)/2),FUI.fish.w,FUI.fish.h,{layer:5,bindings:[view(has(ch(FUI.x0+k)),'#visible')]})}));
 const B=FUI.bar,P=FUI.pct,gauge=(i,base)=>{const g=FUI.gauges[i],x=g.x;return [
  {['box_'+i]:fimg('gauge_box',x,FUI.gbox.y,g.w,FUI.gbox.h,{layer:1})},
  {['icon_'+i]:fimg(g.icon,r2(x+4+(12-g.iw)/2),r2(FUI.gbox.y+(FUI.gbox.h-g.ih)/2),g.iw,g.ih,{layer:3})},
  {['label_'+i]:ftext(g.label,x+B.dx,FUI.gbox.y+1,{scale:.7,w:80,align:'left'})},
  {['bar_'+i]:fimg('bar_empty',x+B.dx,B.y,B.w,B.h,{layer:2})},
  ...Array.from({length:FUI.gsteps},(_,j)=>{const k=j+1;return {[`fill_${i}_${k}`]:{type:'panel',clips_children:true,size:[FS(B.w*k/FUI.gsteps),FS(B.h)],
   anchor_from:'top_left',anchor_to:'top_left',offset:[FS(x+B.dx),FS(B.y)],layer:3,bindings:[view(has(ch(base+k)),'#visible')],controls:[{img:fimg(g.fill,0,0,B.w,B.h)}]}};}),
  // the percentage: one fixed label per 5 % step, shown by its mark (labels cannot be cut from the action bar text)
  ...Array.from({length:FUI.gsteps+1},(_,k)=>({[`pct_${i}_${k}`]:{...ftext(`${k*5}%`,x+P.dx,P.y,{scale:.8,w:20,align:'left'}),bindings:[view(has(ch(base+k)),'#visible')]}}))];};
 const box={type:'panel',size:[FS(FUI.w),FS(FUI.h)],anchor_from:'bottom_middle',anchor_to:'bottom_middle',offset:[0,FUI.bottom],layer:70,
  bindings:[view(isFishing,'#visible')],controls:[
   {bg:fimg('panel_background',0,0,FUI.w,FUI.h,{layer:0})},
   {sign:fimg('fishing_sign',109,-8,62,11,{layer:6})},
   {sign_text:ftext('FISHING',109,-6,{scale:.8,w:62,color:[.22,.13,.06]})},
   {unknown:fimg('unknown_box',229,3,37,20,{layer:2})},
   {unknown_fish:fimg('fish_silhouette',240,5,15,9,{layer:3})},
   {unknown_text:ftext('？？？',229,14,{scale:.55,w:37,color:[.8,.8,.8]})},
   {title:ftext('魚がかかった！',0,10,{scale:1.1})},
   {track:fimg('tracking_bar_frame',T.x,T.y,T.w,T.h,{layer:1})},
   ...zones,...fish,
   {hint:ftext('魚を緑の枠に入れよう',0,53,{scale:.75,color:[.8,.8,.8]})},
   ...gauge(0,FUI.g0),...gauge(1,FUI.t0),
   // the 巻く button lights up while the player reels (holds sneak); やめる = switch away from the fishing rod
   {reel_off:fimg('reel_button',66,83,103,19,{layer:2,alpha:.7,bindings:[view(`(not ${has(ch(FUI.hold))})`,'#visible')]})},
   {reel_on:fimg('reel_button',66,83,103,19,{layer:2,bindings:[view(has(ch(FUI.hold)),'#visible')]})},
   {reel_icon:fimg('reel_icon',96,88,11,9,{layer:4})},
   {reel_text:ftext('巻く',110,88,{scale:1.1,w:40,align:'left'})},
   {reel_hint:ftext('しゃがみ長押しで巻く・離して緩める',66,106,{scale:.6,w:103,color:[.85,.85,.85]})},
   {quit:fimg('quit_button',175,86,38,17,{layer:2})},
   {quit_text:ftext('やめる',175,90,{scale:.75,w:38})}]};
 giveBag(box);return box;
}
// ---- chat (asked 2026-10-30): the chat slides in at the bottom left like Java edition. From the pack
// "HUDチャット アニメーション" by YuuhaLand (MIT, licence in LICENSE_chat_anim.txt), its "java" subpack with the
// variables filled in. The vanilla chat panel is switched off and this one added to root_panel.
const chatAnim=(type,from,to,next,more={})=>({anim_type:type,easing:'in_quart',duration:.25,from,to,...(next?{next:'@hud.'+next}:{}),...more});
const chatWait=next=>({anim_type:'wait',duration:'$chat_item_lifetime',next:'@hud.'+next});
const CHAT={
 java_anim_chat_bg_alpha_in:chatAnim('alpha',0,.7,'java_anim_chat_bg_alpha_wait'),
 java_anim_chat_bg_alpha_wait:chatWait('java_anim_chat_bg_alpha_out'),
 java_anim_chat_bg_alpha_out:chatAnim('alpha',.7,0),
 java_anim_chat_bg_offset_in:chatAnim('size',['100%',0],['100%','100%c'],'java_anim_chat_bg_offset_wait',{easing:'out_quad'}),
 java_anim_chat_bg_offset_wait:chatWait('java_anim_chat_bg_offset_out'),
 java_anim_chat_bg_offset_out:chatAnim('offset',[0,0],[-50,0],'java_anim_chat_bg_offset_size'),
 java_anim_chat_bg_offset_size:chatAnim('size',['100%','100%c'],['100%',0],null,{easing:'out_quad',duration:.2,destroy_at_end:'chat_grid_item'}),
 java_anim_chat_txt_wait:chatAnim('alpha',0,1,'java_anim_chat_txt_alpha_wait'),
 java_anim_chat_txt_alpha_wait:chatWait('java_anim_chat_txt_alpha_out'),
 java_anim_chat_txt_alpha_out:chatAnim('alpha',1,0),
 chat_panel:{ignored:true},
 cooptown_chat:{type:'panel',clips_children:true,anchor_from:'bottom_left',anchor_to:'bottom_left',size:['40%',128],offset:[0,-60],controls:[
  {stack_panel:{type:'stack_panel',anchor_from:'bottom_left',anchor_to:'bottom_left',
   factory:{name:'chat_item_factory',max_children_size:50,control_ids:{chat_item:'chat_item@hud.cooptown_chat_item'}}}}]},
 cooptown_chat_item:{type:'panel',layer:1,size:['100%-2px','100%c'],anchor_from:'top_left',anchor_to:'top_left',
  bindings:[{binding_name:'(not #on_new_death_screen)',binding_name_override:'#visible'}],
  controls:[{chat_background:{type:'image',texture:'textures/ui/Black',alpha:.7,size:['100%','100%c'],
   anims:['@hud.java_anim_chat_bg_alpha_in','@hud.java_anim_chat_bg_offset_in'],
   controls:[{'chat_text@chat_label':{anchor_from:'top_left',anchor_to:'top_left',offset:[2,0],anims:['@hud.java_anim_chat_txt_wait']}}]}}]}
};
// ---- town music sign (asked 2026-10-30 with the user's pictures; tools/import-bgm-ui.py): the bottom right corner (the
// log box may cover it for a moment), while the first town's music plays (the hidden mark "bgm" in the subtitle's info lines, BP town-bgm.js).
// It sits on root_panel, not in the action bar, so its animations are not started over by every map message:
// the record turns once in 8 s (flip_book over the side-by-side turns), two notes rise 24 px in 2 s and fade, 1 s apart.
// size 32 / note 16 since 2026-10-30 (record a little smaller, notes a little bigger)
const BGM_SIGN={frames:32,frame:64,size:32,note:16,rise:24,right:2,bottom:2}; // the corner (2026-10-30: left of the log box it sat against the hotbar on a narrow screen)
const bgmOn=`(not ((#hud_subtitle_text_string - '${TOKENS['token:bgm']}') = #hud_subtitle_text_string))`;
const noteAnims=k=>({
 [`bgm_note${k}_wait`]:{anim_type:'wait',duration:k===2?1:0.001,next:`@hud.bgm_note${k}_rise`},
 [`bgm_note${k}_rise`]:{anim_type:'offset',easing:'linear',duration:2,from:[0,0],to:[0,-BGM_SIGN.rise],next:`@hud.bgm_note${k}_rise`},
 [`bgm_note${k}_show`]:{anim_type:'wait',duration:k===2?2:1,next:`@hud.bgm_note${k}_fade`},
 [`bgm_note${k}_fade`]:{anim_type:'alpha',easing:'linear',duration:1,from:1,to:0,next:`@hud.bgm_note${k}_back`},
 [`bgm_note${k}_back`]:{anim_type:'alpha',easing:'linear',duration:0.001,from:0,to:1,next:`@hud.bgm_note${k}_fade1`},
 [`bgm_note${k}_fade1`]:{anim_type:'wait',duration:1,next:`@hud.bgm_note${k}_fade`}});
const BGM_ANIMS={bgm_record_turn:{anim_type:'flip_book',initial_uv:[0,0],frame_count:BGM_SIGN.frames,frame_step:BGM_SIGN.frame,fps:BGM_SIGN.frames/8,reversible:false,easing:'linear'},
 ...noteAnims(1),...noteAnims(2)};
// the place is on an outer panel: an offset animation replaces its control's own offset (2026-10-30, seen in game:
// the notes rose from the panel's corner, left of the record)
const bgmNote=(k,texture,x)=>({type:'panel',size:[BGM_SIGN.note,BGM_SIGN.note],anchor_from:'bottom_right',anchor_to:'bottom_right',offset:[x,-(BGM_SIGN.size-4)],
 controls:[{rise:{type:'panel',size:['100%','100%'],anims:[`@hud.bgm_note${k}_wait`],
  controls:[{img:{type:'image',texture,size:['100%','100%'],keep_ratio:true,anims:[`@hud.bgm_note${k}_show`]}}]}}]});
const bgmSign={type:'panel',size:[BGM_SIGN.size,BGM_SIGN.size+BGM_SIGN.rise+BGM_SIGN.note],anchor_from:'bottom_right',anchor_to:'bottom_right',
 offset:[-BGM_SIGN.right,-BGM_SIGN.bottom],layer:20,bindings:[subtitle,view(bgmOn,'#visible')],controls:[
  {record:{type:'image',texture:'textures/cooptown/bgm/record_spin',size:[BGM_SIGN.size,BGM_SIGN.size],uv_size:[BGM_SIGN.frame,BGM_SIGN.frame],
   uv:'@hud.bgm_record_turn',disable_anim_fast_forward:true,anchor_from:'bottom_right',anchor_to:'bottom_right',layer:1}},
  // both rise from the top of the record, side by side, inside the corner
  {note1:bgmNote(1,'textures/cooptown/bgm/note_single',-(BGM_SIGN.size-BGM_SIGN.note))},
  {note2:bgmNote(2,'textures/cooptown/bgm/note_double',0)}]};
const hud={
 namespace:'hud',
 ...CHAT,
 ...BGM_ANIMS,
 cooptown_bgm_sign:bgmSign,
 // Titles starting with "ctlog:" are the log: hide them (and their subtitle) from the normal title.
 hud_title_text:{bindings:[title,view("((#hud_title_text_string - 'ctlog:') = #hud_title_text_string)",'#visible')]},
 root_panel:{modifications:[{array_name:'controls',operation:'insert_back',value:[{'cooptown_chat@hud.cooptown_chat':{}},{'cooptown_bgm_sign@hud.cooptown_bgm_sign':{}},{'cooptown_log@hud.cooptown_log':{}},{'cooptown_hotbar@hud.cooptown_hotbar':{}}]}]},
 cooptown_hotbar:hotbarFrame,
 centered_gui_elements_at_bottom_middle:CENTERED,
 // the vanilla XP level number: the hotbar's Lv box shows the CoopTown level instead
 progress_text_label:{visible:false,bindings:[{binding_name:'#level_number',binding_type:'global'}]},
 cooptown_log:{type:'panel',size:['100%','100%'],layer:20,controls:[{box:{
  type:'panel',size:['100%cm','100%cm'],anchor_from:'bottom_right',anchor_to:'bottom_right',offset:[-BOX.right,-BOX.bottom],
  bindings:[title,view(isLog,'#visible')],
  controls:[{lines_present:{type:'panel',size:['100%cm','100%cm'],bindings:[title,view(hasLines,'#visible')],controls:[
   // background and text are siblings so the text is not drawn with the background's alpha; fixed width
   {background:{type:'image',texture:'textures/ui/Black',alpha:BOX.alpha,size:[BOX.width+BOX.padX*2,`100%sm + ${BOX.padY*2}px`],layer:1}},
   // a window shorter than the icon column by the info lines' heights, showing its top: the info lines after the icons are
   // cut off (and the icon column's width, which is the longest info line's, is cut on the left)
   {window:{type:'panel',clips_children:true,size:[BOX.width,`100%c - ${infoBelow(-1)}px`],anchor_from:'center',anchor_to:'center',layer:2,controls:[
    {columns:{type:'stack_panel',orientation:'horizontal',size:['100%c','100%cm'],anchor_from:'top_right',anchor_to:'top_right',controls:[
     // right-aligned so the icons sit next to the text (each line is only an icon, or only info text)
     {icons:label('right',"(#hud_subtitle_text_string - 'ctinf:')",subtitle)},
     {gap:{type:'panel',size:[BOX.gap,1]}},
     {lines:label('right',"(#hud_title_text_string - 'ctlog:')",title)}
    ]}}]}}
  ]}}]}}]},
 // ---- minimap (top right) ----
 // The game builds hud_actionbar_text for every action bar message, passing $actionbar_text.
 // Messages starting with "ctmap:" are the minimap (minimap.js); anything else keeps the vanilla look.
 // an (empty) image, not a panel: the vanilla definition it merges with has a texture property
 hud_actionbar_text:{type:'image',texture:'textures/cooptown/transparent',size:['100%','100%'],offset:[0,0],alpha:1,controls:[
  {vanilla:{...VANILLA_ACTIONBAR,property_bag:{'#ab':'$actionbar_text'},bindings:[view("(((#ab - 'ctmap:') = #ab) and ((#ab - 'ctfsh:') = #ab))",'#visible')]}},
  // one map box per size (小・中・大), picked by the hidden "sizeN" mark
  ...MAP_SIZES.map((scale,i)=>({['map_'+i]:mapBox(scale,i)})),
  {hotbar_stats:hotbarStats},
  {profile},
  {notify:notifyBox},
  {fishing:fishingBox()}
 ]},
 // the vanilla paper doll (top left while sprinting etc.) would sit on the profile; the profile shows the player instead
 hud_player_renderer:{visible:false}
};
hud.cooptown_town_welcome={"type": "panel", "anchor_from": "center", "anchor_to": "center", "size": ["60%", "66.66666666666667% x"], "layer": 100, "controls": [{"frame_0": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 12], "alpha": 0.0, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§0§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_1": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 11], "alpha": 0.1, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§1§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_2": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 10], "alpha": 0.2, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§2§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_3": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 8], "alpha": 0.3, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§3§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_4": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 7], "alpha": 0.4, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§4§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_5": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 6], "alpha": 0.5, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§5§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_6": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 5], "alpha": 0.6, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§6§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_7": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 4], "alpha": 0.7, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§7§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_8": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 2], "alpha": 0.8, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§8§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_9": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 1], "alpha": 0.9, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§9§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}, {"frame_10": {"type": "panel", "size": ["100%", "100%"], "anchor_from": "center", "anchor_to": "center", "offset": [0, 0], "alpha": 1.0, "bindings": [{"binding_name": "#hud_subtitle_text_string"}, {"binding_type": "view", "source_property_name": "(not ((#hud_subtitle_text_string - '§0§1§0§2§r§a§r') = #hud_subtitle_text_string))", "target_property_name": "#visible"}], "controls": [{"logo": {"type": "image", "texture": "textures/cooptown/town_welcome_logo", "anchor_from": "top_middle", "anchor_to": "top_middle", "size": ["100%", "50%"]}}, {"welcome": {"type": "image", "texture": "textures/cooptown/town_welcome_banner", "anchor_from": "bottom_middle", "anchor_to": "bottom_middle", "size": ["100%", "50%"]}}]}}]};
hud.root_panel.modifications[0].value.push({'cooptown_town_welcome@hud.cooptown_town_welcome':{}});
pixelFont(hud); // all text in the pixel font (tools/pixel-font.mjs)
fs.writeFileSync('ui/hud_screen.json',JSON.stringify(hud,null,1)+'\n');
console.log('wrote ui/hud_screen.json');
