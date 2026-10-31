// Generates ui/inventory_screen.json: the classic survival inventory (E) and the crafting table screen redrawn as
// the CoopTown parchment panel. Only the look changes: every slot is still the game's own container slot, so
// clicking, dragging, shift-click and the recipe book work as before. Pictures: tools/build-inventory.py.
// The file is merged over the game's inventory_screen.json (namespace crafting): controls named here replace the
// game's, properties merge. Pocket (touch) UI is a different screen and keeps the game's look.
// Run: node tools/build-inventory-ui.mjs   (from the CoopTown_RP folder)
import {pixelFont} from './pixel-font.mjs';
import fs from 'fs';
const T='textures/cooptown/inventory/',SOLID='textures/cooptown/solid';
const INK=[.29,.17,.09],LINE=[.45,.3,.17];
// the panel (UI px; the picture is K times this, build-inventory.py PANEL) and where each part sits in it
const P={w:196,h:190,
 title:{x:24,y:9},              // clear of the corner sprig
 armor:{x:10,y:22},              // 4 slots down
 doll:{x:30,y:22,w:56,h:74},
 offhand:{x:88,y:78},
 craft:{x:106,y:34},             // 2x2 grid; its label above, the arrow and the output to the right
 arrow:{x:145,y:46,w:16,h:11},
 output:{x:165,y:43},
 bench:{x:38,y:27},              // crafting table: 3x3 grid, arrow, 26 px output
 benchArrow:{x:98,y:48,w:20,h:14},
 benchOutput:{x:124,y:41},
 inventory:{x:17,y:102},         // 9x3
 divider:{y:159},
 hotbar:{x:17,y:163}};
const at=(x,y)=>({anchor_from:'top_left',anchor_to:'top_left',offset:[x,y]});
const image=(texture,size,extra={})=>({type:'image',texture,size,keep_ratio:false,...extra}); // keep_ratio off: a 1 px line drew as a dot
const label=(text,extra={})=>({type:'label',text,color:INK,shadow:false,font_scale_factor:1,layer:3,...extra});
const line=(x,y,w,extra={})=>image(SOLID,[w,1],{color:LINE,alpha:.55,layer:2,...at(x,y),...extra});
// container slots: the game's slot images (they switch for locked / selected states) drawn with our slot picture
const FAINT={size:[13,13],alpha:.6};
const SLOT={'$button_ref':'crafting.inventory_container_slot_button','$background_images':'crafting.container_cell_images'};

const out={namespace:'crafting',
 cell_image_classic:{texture:T+'slot'},
 cell_image_normal:{texture:T+'slot'},
 cell_image_selected:{texture:T+'slot_on'},
 // armor / off-hand slots have no background state: always our slot; their empty-slot pictures faint and small
 ct_slot_bg:image(T+'slot',['100%','100%'],{layer:1}),
 armor_overlay_helmet:{texture:T+'empty_helmet',...FAINT},
 armor_overlay_chest:{texture:T+'empty_chest',...FAINT},
 armor_overlay_legs:{texture:T+'empty_legs',...FAINT},
 armor_image_feet:{texture:T+'empty_boots',...FAINT},
 armor_overlay_shield:{texture:T+'empty_shield',...FAINT},

 // ---- the whole screen: the panel is taller and wider than the game's (176 x 166); the recipe book keeps its width
 recipe_inventory_screen_content:{modifications:[{array_name:'controls',operation:'replace',control_name:'content_stack_panel',value:{content_stack_panel:{
  type:'stack_panel',size:[P.w+150,P.h],orientation:'horizontal',controls:[
   {'recipe_book@crafting.recipe_book':{size:['fill','100%'],bindings:[{binding_type:'global',binding_name:'(not #is_survival_layout)',binding_name_override:'#visible'}]}},
   {'center_fold@common.center_fold':{size:[4,P.h],bindings:[{binding_type:'global',binding_name:'#is_recipe_book_layout',binding_name_override:'#visible'}]}},
   {survival_padding:{type:'panel',size:[75,'100%'],bindings:[{binding_type:'global',binding_name:'#is_survival_layout',binding_name_override:'#visible'}]}},
   {'player_inventory@crafting.player_inventory':{bindings:[{binding_type:'global',binding_name:'(not #is_creative_layout)',binding_name_override:'#visible'}]}},
   {toolbar_anchor:{type:'panel',size:[0,'100%'],controls:[{'toolbar_panel@crafting.toolbar_panel':{anchor_from:'top_right',anchor_to:'bottom_right'}}]}}]}}}]},

 // ---- the panel: background, the top half (survival or crafting table), inventory 9x3, hotbar, help sheet
 player_inventory:{size:[P.w,P.h],controls:[
  {panel_bg:image(T+'panel',['100%','100%'],{layer:1})},
  {'inventory_panel_top_half@$top_half_variant':{layer:2}},
  {ct_inventory:{type:'panel',size:[162,54],layer:2,...at(P.inventory.x,P.inventory.y),controls:[
   {inventory_grid:{type:'grid',size:[162,54],grid_dimensions:[9,3],grid_item_template:'common.grid_item_for_inventory',collection_name:'inventory_items',...SLOT}}]}},
  {divider:line(12,P.divider.y,P.w-24)},
  {'hotbar_grid@common.hotbar_grid_template':{layer:2,...at(P.hotbar.x,P.hotbar.y),...SLOT}},
  {'ct_help_sheet@crafting.ct_help_sheet':{}}]},

 // survival (E): title, armor, the player, off hand, 2x2 crafting
 survival_panel_top_half:{size:['100%','100%'],controls:[
  {title:label('インベントリー',at(P.title.x,P.title.y))},
  {title_line:line(P.title.x+66,P.title.y+4,P.w-P.title.x-66-24)},
  {'player_armor_panel@crafting.player_armor_panel':{}},
  {'crafting_panel@crafting.crafting_panel_2x2':{}}]},
 player_armor_panel:{size:['100%','100%'],controls:[
  {player_bg:image(T+'doll_frame',[P.doll.w,P.doll.h],{layer:2,...at(P.doll.x,P.doll.y),controls:[
   {player_renderer_panel:{type:'panel',size:[32,32],offset:[0,-14],controls:[
    {player_renderer:{type:'custom',renderer:'live_player_renderer',property_bag:{'#look_at_cursor':true},animation_reset_name:'screen_animation_reset',
     anims:['@common.screen_exit_size_animation_push','@common.screen_exit_size_animation_pop','@common.screen_entrance_size_animation_push','@common.screen_entrance_size_animation_pop'],
     layer:8,anchor_from:'center',anchor_to:'center'}}]}}]})},
  {armor_grid:{type:'grid',layer:1,size:[18,72],...at(P.armor.x,P.armor.y),grid_dimensions:[1,4],'$item_collection_name':'armor_items',collection_name:'$item_collection_name',controls:[
   ...[['head','helmet','crafting_input_top_left'],['chest','chest','crafting_input_top_left'],['legs','legs','crafting_input_mid_left'],['feet','feet','offhand_items0']].map(([k,o,right],i)=>({[`${k}_grid_item@common.container_item`]:{
    grid_position:[0,i],'$cell_overlay_ref':o==='feet'?'crafting.armor_image_feet':`crafting.armor_overlay_${o}`,'$button_ref':'crafting.no_coalesce_container_slot_button','$background_images':'crafting.ct_slot_bg',
    '$focus_id_binding_type':'none','$focus_id':`armor_item_${k}`,'$focus_override_right_binding_type':'none','$focus_override_right':right}}))]}},
  {offhand_grid:{type:'grid',layer:1,size:[18,18],...at(P.offhand.x,P.offhand.y),grid_dimensions:[1,1],'$item_collection_name':'offhand_items',collection_name:'$item_collection_name',controls:[
   {'offhand_grid_item@common.container_item':{grid_position:[0,0],'$cell_overlay_ref':'crafting.armor_overlay_shield','$button_ref':'crafting.no_coalesce_container_slot_button','$background_images':'crafting.ct_slot_bg',
    '$focus_override_left_binding_type':'none','$focus_override_left':'armor_item_feet'}}]}}]},
 crafting_panel_2x2:{size:['100%','100%'],anchor_from:'top_left',anchor_to:'top_left',controls:[
  {'crafting_label@crafting.crafting_label':{size:[70,10],text_alignment:'center',color:INK,font_type:'unicode',...at(P.craft.x-17,P.craft.y-12)}}, // the game's label (pixelFont only sees type:'label')
  {'crafting_grid_2x2@crafting.crafting_grid_2x2':{...at(P.craft.x,P.craft.y)}},
  {crafting_arrow:image(T+'arrow',[P.arrow.w,P.arrow.h],{layer:3,...at(P.arrow.x,P.arrow.y),
   bindings:[{binding_type:'view',source_control_name:'crafting_panel',resolve_sibling_scope:true,source_property_name:'(not #needs_crafting_table)',target_property_name:'#visible'}]})},
  // a recipe that needs a crafting table: the table's picture in place of the arrow
  {'crafting_table@crafting.item_renderer':{size:[16,16],...at(P.arrow.x,P.arrow.y-3),property_bag:{'#item_id_aux':3801088},
   bindings:[{binding_type:'view',source_control_name:'crafting_panel',resolve_sibling_scope:true,source_property_name:'(#needs_crafting_table)',target_property_name:'#visible'}]}},
  {'survival_crafting_output_grid@crafting.output_grid_2x2':{...at(P.output.x,P.output.y)}}]},

 // crafting table: title, 3x3 crafting, 26 px output
 crafting_panel_top_half:{size:['100%','100%'],controls:[
  {title:label('作業台',at(P.title.x,P.title.y))},
  {title_line:line(P.title.x+36,P.title.y+4,P.w-P.title.x-36-24)},
  {'crafting_grid_3x3@crafting.crafting_grid_3x3':{...at(P.bench.x,P.bench.y)}},
  {crafting_arrow:image(T+'arrow',[P.benchArrow.w,P.benchArrow.h],{layer:3,...at(P.benchArrow.x,P.benchArrow.y)})},
  {'work_bench_output_grid@crafting.output_grid_3x3':{...at(P.benchOutput.x,P.benchOutput.y)}}]},

 // ---- tabs above the panel's right side: recipe book / inventory only (the game's layout toggles), ? and ×
 ct_tab_face:{type:'panel',size:['100%','100%'],controls:[
  {bg:image('$ct_tab_bg',['100%','100%'],{layer:1})},
  {lit:image(SOLID,['100% - 6px','100% - 6px'],{layer:2,color:[1,1,1],alpha:'$ct_lit'})},
  {icon:image('$ct_icon',[16,16],{layer:3,offset:'$ct_icon_offset'})}]},
 'ct_tab_off@crafting.ct_tab_face':{'$ct_tab_bg':T+'tab','$ct_lit':0,'$ct_icon_offset':[0,1]},
 'ct_tab_hover@crafting.ct_tab_face':{'$ct_tab_bg':T+'tab','$ct_lit':.18,'$ct_icon_offset':[0,1]},
 'ct_tab_on@crafting.ct_tab_face':{'$ct_tab_bg':T+'tab_on','$ct_lit':0,'$ct_icon_offset':[0,0]},
 'ct_layout_tab@common.layout_toggle':{size:[28,22],
  '$unchecked_control':'crafting.ct_tab_off','$unchecked_hover_control':'crafting.ct_tab_hover','$checked_control':'crafting.ct_tab_on','$checked_hover_control':'crafting.ct_tab_on',
  '$unchecked_locked_control':'crafting.ct_tab_off','$unchecked_locked_hover_control':'crafting.ct_tab_off','$checked_locked_control':'crafting.ct_tab_on','$checked_locked_hover_control':'crafting.ct_tab_on'},
 'ct_recipe_tab@crafting.ct_layout_tab':{'$ct_icon':T+'icon_recipes','$icon_control':'common.recipe_book_icon','$toggle_group_forced_index':'$recipe_book_layout_index','$focus_id':'recipe_book_layout_toggle',
  '$toggle_binding_type':'global','$toggle_state_binding_name':'#is_recipe_book_layout','$toggle_tts_header_binding_type':'global','$toggle_tts_header':'#recipe_book_layout_toggle_tts'},
 'ct_survival_tab@crafting.ct_layout_tab':{'$ct_icon':T+'icon_chest','$icon_control':'common.inventory_icon','$toggle_group_forced_index':'$survival_layout_index',
  '$toggle_binding_type':'global','$toggle_state_binding_name':'#is_survival_layout','$toggle_tts_header_binding_type':'global','$toggle_tts_header':'#survival_layout_toggle_tts'},
 'ct_creative_tab@crafting.ct_layout_tab':{'$ct_icon':'textures/ui/creative_icon','$icon_control':'common.creative_icon','$toggle_group_forced_index':'$creative_layout_index','$focus_id':'creative_layout_toggle',
  '$toggle_binding_type':'global','$toggle_state_binding_name':'#is_creative_layout','$toggle_tts_header':'craftingScreen.tts.toggle.creative.widelist.layout'},
 // ? and ×: two small buttons on one tab; ? opens our help sheet (a toggle; the sheet watches its state)
 ct_icon_face:{type:'panel',size:['100%','100%'],controls:[
  {lit:image(SOLID,['100% - 2px','100% - 2px'],{layer:1,color:[1,1,1],alpha:'$ct_lit'})},
  {icon:image('$ct_icon',[12,12],{layer:2})}]},
 'ct_icon_off@crafting.ct_icon_face':{'$ct_lit':0},
 'ct_icon_hover@crafting.ct_icon_face':{'$ct_lit':.22},
 'ct_icon_on@crafting.ct_icon_face':{'$ct_lit':.35},
 'ct_help_toggle@common_toggles.light_image_toggle':{size:[16,16],'$toggle_name':'ct_help','$toggle_view_binding_name':'ct_help_state','$ct_icon':T+'icon_help',
  '$toggle_tts_header':'accessibility.tts.button.howtoplay',
  '$unchecked_control':'crafting.ct_icon_off','$unchecked_hover_control':'crafting.ct_icon_hover','$checked_control':'crafting.ct_icon_on','$checked_hover_control':'crafting.ct_icon_on',
  '$unchecked_locked_control':'crafting.ct_icon_off','$unchecked_locked_hover_control':'crafting.ct_icon_off','$checked_locked_control':'crafting.ct_icon_on','$checked_locked_hover_control':'crafting.ct_icon_on'},
 'ct_close_button@common.button':{size:[16,16],'$pressed_button_name':'button.menu_exit','$ct_icon':T+'icon_close',
  controls:[{'default@crafting.ct_icon_off':{}},{'hover@crafting.ct_icon_hover':{}},{'pressed@crafting.ct_icon_on':{}}]},
 toolbar_panel:{size:['100%c',24],controls:[
  // the strip runs 6 px down behind the panel (drawn under it), so the tabs look attached
  {strip:image(T+'frame',['100%c','100% + 6px'],{anchor_from:'top_right',anchor_to:'top_right',offset:[0,1],controls:[
   {tabs:{type:'stack_panel',orientation:'horizontal',ttsSectionContainer:true,ttsIgnoreChildrenEnumeration:true,size:['default',22],anchor_from:'top_middle',anchor_to:'top_middle',offset:[0,2],controls:[
    {left_trigger_anchor:{type:'panel',size:[0,'100%'],bindings:[{binding_name:'#gamepad_helper_visible',binding_name_override:'#visible'}],controls:[
     {'gamepad_helper_left_trigger@common.gamepad_helper_left_trigger':{offset:[3,-2],anchor_from:'left_middle',anchor_to:'right_middle'}}]}},
    {pad_0:{type:'panel',size:[5,0]}},
    {creative_tab_panel:{type:'panel',size:[30,'100%'],bindings:[{binding_type:'global',binding_name:'#is_creative_layout_button_visible',binding_name_override:'#visible'}],controls:[
     {'creative_layout_toggle@crafting.ct_creative_tab':{anchor_from:'top_left',anchor_to:'top_left'}}]}},
    {recipe_tab_panel:{type:'panel',size:[30,'100%'],controls:[{'recipe_book_layout_toggle@crafting.ct_recipe_tab':{anchor_from:'top_left',anchor_to:'top_left'}}]}},
    {survival_tab_panel:{type:'panel',size:[30,'100%'],controls:[{'survival_layout_toggle@crafting.ct_survival_tab':{anchor_from:'top_left',anchor_to:'top_left'}}]}},
    {help_close:{type:'panel',size:[40,'100%'],controls:[
     {bg:image(T+'tab',['100%','100%'],{layer:1})},
     {'ct_help_toggle@crafting.ct_help_toggle':{layer:3,anchor_from:'left_middle',anchor_to:'left_middle',offset:[3,0]}},
     {split:image(SOLID,[1,12],{layer:2,color:LINE,alpha:.7})},
     {close:{type:'panel',size:[16,16],anchor_from:'right_middle',anchor_to:'right_middle',offset:[-3,0],bindings:[{binding_name:'#close_button_visible',binding_name_override:'#visible'}],controls:[
      {'close_button@crafting.ct_close_button':{layer:3}}]}}]}},
    {pad_1:{type:'panel',size:[5,0]}},
    {right_trigger_anchor:{type:'panel',size:[0,'100%'],bindings:[{binding_name:'#gamepad_helper_visible',binding_name_override:'#visible'}],controls:[
     {'gamepad_helper_right_trigger@common.gamepad_helper_right_trigger':{offset:[-2,-2],anchor_from:'right_middle',anchor_to:'left_middle'}}]}}]}}]})}]},

 // ---- help sheet over the panel while ? is on
 ct_help_sheet:image(T+'frame',[P.w-16,P.h-16],{layer:40,anchor_from:'center',anchor_to:'center',
  bindings:[{binding_type:'view',source_control_name:'ct_help_state',source_property_name:'#toggle_state',target_property_name:'#visible'}],controls:[
   {text:label([
    '§lインベントリーの使い方§r',' ',
    '左クリック: つかむ / 置く',
    '右クリック: 半分つかむ / 1個置く',
    'Shift+クリック: まとめて移動',
    'ダブルクリック: 同じ物を集める',' ',
    '左の枠: 防具4つと オフハンド',
    'クラフト: 2×2で作る (作業台は3×3)',' ',
    '本のタブ: レシピブック',
    '箱のタブ: 持ち物だけ表示',
    '? をもう一度押すと 閉じる'].join('\n'),{size:[P.w-36,'default'],font_scale_factor:.8,text_alignment:'left',layer:2,anchor_from:'top_left',anchor_to:'top_left',offset:[10,10]})}]})};

pixelFont(out); // all text in the pixel font (tools/pixel-font.mjs)
fs.writeFileSync('ui/inventory_screen.json',JSON.stringify(out,null,1)+'\n');
console.log('ui/inventory_screen.json');
