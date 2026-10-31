import {ITEM_ICONS} from './item-icons.js';
// Icon textures for the workbench grid. Prefer the icons exported from the game (item-icons.js). Vanilla paths come from the built-in resource pack;
// set `icon` on a recipe to override. Unknown items fall back to a category icon.
const ITEM='textures/items/',BLOCK='textures/blocks/';
const MATERIAL={wooden:'wood',stone:'stone',iron:'iron',golden:'gold',diamond:'diamond',leather:'leather'};
const PLANKS={oak:'planks_oak',spruce:'planks_spruce',birch:'planks_birch',jungle:'planks_jungle',acacia:'planks_acacia',dark_oak:'planks_big_oak',mangrove:'mangrove_planks',cherry:'cherry_planks',pale_oak:'pale_oak_planks',bamboo:'bamboo_planks',crimson:'crimson_planks',warped:'warped_planks'};
const DOORS={oak:'door_wood',spruce:'door_spruce',birch:'door_birch',jungle:'door_jungle',acacia:'door_acacia',dark_oak:'door_dark_oak',mangrove:'mangrove_door',cherry:'cherry_door',pale_oak:'pale_oak_door',bamboo:'bamboo_door',crimson:'crimson_door',warped:'warped_door'};
const FIXED={
 bow:ITEM+'bow_standby',arrow:ITEM+'arrow',fishing_rod:ITEM+'fishing_rod_uncast',bucket:ITEM+'bucket_empty',bed:ITEM+'bed_white',campfire:ITEM+'campfire',frame:ITEM+'item_frame',armor_stand:ITEM+'armor_stand',paper:ITEM+'paper',
 cake:ITEM+'cake',golden_apple:ITEM+'apple_golden',brewing_stand:ITEM+'brewing_stand',cauldron:ITEM+'cauldron',minecart:ITEM+'minecart_normal',compass:ITEM+'compass_item',clock:ITEM+'clock_item',repeater:ITEM+'repeater',comparator:ITEM+'comparator',iron_door:ITEM+'door_iron',hopper:ITEM+'hopper',
 chest:BLOCK+'chest_front',furnace:BLOCK+'furnace_front_off',ladder:BLOCK+'ladder',stonecutter_block:BLOCK+'stonecutter2_side',anvil:BLOCK+'anvil_top_damaged_0',smithing_table:BLOCK+'smithing_table_front',iron_bars:BLOCK+'iron_bars',rail:BLOCK+'rail_normal',golden_rail:BLOCK+'rail_golden',
 piston:BLOCK+'piston_side',dispenser:BLOCK+'dispenser_front_horizontal',dropper:BLOCK+'dropper_front_horizontal',observer:BLOCK+'observer_front',blast_furnace:BLOCK+'blast_furnace_front_off',barrel:BLOCK+'barrel_side',cartography_table:BLOCK+'cartography_table_side1',composter:BLOCK+'composter_side',smoker:BLOCK+'smoker_front_off',
 enchanting_table:BLOCK+'enchanting_table_top',bookshelf:BLOCK+'bookshelf',stone_stairs:BLOCK+'cobblestone',cobblestone_slab:BLOCK+'cobblestone',cobblestone_wall:BLOCK+'cobblestone',glass_pane:BLOCK+'glass',iron_block:BLOCK+'iron_block',gold_block:BLOCK+'gold_block',diamond_block:BLOCK+'diamond_block',coal_block:BLOCK+'coal_block',
 shield:'textures/cooptown/icons/swords',bamboo_raft:BLOCK+'bamboo_planks',
 oak_planks:'textures/cooptown/craft/oak_planks',iron_ingot:'textures/cooptown/craft/iron_ingot',hay_block:'textures/cooptown/craft/hay_block',bread:'textures/cooptown/cooperation/bread',book:'textures/cooptown/craft/book',cooked_cod:'textures/cooptown/craft/cooked_cod'
};
export function recipeIcon(r){
 if(r.icon)return r.icon;
 const [id]=r.output;
 if(ITEM_ICONS[id])return 'textures/cooptown/items/'+ITEM_ICONS[id]; // exported from the game by build-item-icons.py
 if(id.startsWith('cooptown:'))return null; // special items: resolved by caller from SPECIAL_TEXTURES
 const name=id.replace('minecraft:','');
 if(FIXED[name])return FIXED[name];
 const tool=name.match(/^(wooden|stone|iron|golden|diamond|leather)_(pickaxe|axe|shovel|hoe|sword|helmet|chestplate|leggings|boots)$/);
 if(tool)return ITEM+MATERIAL[tool[1]]+'_'+tool[2];
 const wood=r.category?.startsWith('wood:')?r.category.slice(5):null;
 if(wood){if(/door$/.test(name))return ITEM+DOORS[wood];return BLOCK+PLANKS[wood];}
 return ITEM+name;
}
