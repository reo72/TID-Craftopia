// The 3x3 picture on the workbench's detail side: where each ingredient goes, as in the vanilla crafting table.
// A shape is up to 3 rows of up to 3 characters; a digit is the index of the ingredient in the recipe's inputs, a
// space an empty cell. A shape is used only when its counts match the recipe's amounts (CoopTown changed some
// recipes); otherwise, and for CoopTown's own recipes, the ingredients fill the cells in order.
const TOOLS={pickaxe:['000',' 1 ',' 1 '],axe:['00 ','01 ',' 1 '],shovel:[' 0 ',' 1 ',' 1 '],hoe:['00 ',' 1 ',' 1 '],sword:[' 0 ',' 0 ',' 1 '],
 helmet:['000','0 0'],chestplate:['0 0','000','000'],leggings:['000','0 0','0 0'],boots:['0 0','0 0']};
const FULL=['000','000','000'],RING=['000','0 0','000'],SIX=['000','000'];
const SHAPES={
 bow:[' 01','0 1',' 01'],arrow:[' 0 ',' 1 ',' 2 '],shield:['010','000',' 0 '],fishing_rod:['  0',' 01','0 1'],bucket:['0 0',' 0 '],
 chest:RING,furnace:RING,bed:['000','111'],ladder:['0 0','000','0 0'],campfire:[' 0 ','010','222'],stonecutter_block:[' 0 ','111'],
 frame:['000','010','000'],armor_stand:['000',' 0 ','010'],stone_stairs:['0  ','00 ','000'],cobblestone_slab:['000'],cobblestone_wall:SIX,glass_pane:SIX,
 paper:['000'],iron_block:FULL,gold_block:FULL,diamond_block:FULL,coal_block:FULL,hay_block:FULL,bread:['000'],
 anvil:['000',' 1 ','111'],smithing_table:['00','11','11'],cauldron:['0 0','0 0','000'],iron_bars:SIX,iron_door:['00','00','00'],hopper:['0 0','010',' 0 '],
 rail:['0 0','010','0 0'],golden_rail:['0 0','010','020'],minecart:['0 0','000'],compass:[' 0 ','010',' 0 '],clock:[' 0 ','010',' 0 '],
 piston:['000','121','131'],dispenser:['000','010','020'],dropper:['000','0 0','010'],observer:['000','112','000'],repeater:['121','000'],comparator:[' 1 ','121','000'],
 blast_furnace:['000','010','222'],barrel:['010','0 0','010'],cartography_table:['00','11','11'],composter:['0 0','0 0','000'],smoker:[' 0 ','010',' 0 '],
 brewing_stand:[' 0 ','111'],cake:['000','121','333'],golden_apple:['000','010','000'],enchanting_table:[' 0 ','121','222'],bookshelf:['000','111','000'],
 flower_pot:['0 0',' 0 '],
 // backpacks: leather around the chest, the dye below
 ...Object.fromEntries(['green','blue','lime','cyan','purple','pink','gray','brown','yellow'].map(c=>['cooptown:backpack_'+c,['000','010','020']])),
 painting:['000','010','000'],lantern:['000','010','000'],brick_block:['00','00']
};
// wood building blocks by the end of their id
const WOOD=[[/_stairs$/,['0  ','00 ','000']],[/_slab$/,['000']],[/fence_gate$/,['101','101']],[/_fence$/,['010','010']],[/trapdoor$/,SIX],[/door$/,['00','00','00']],
 [/_sign$/,['000','000',' 1 ']],[/_(boat|raft)$/,['0 0','000']]];
function shapeFor(id){
 const name=id.replace(/^minecraft:/,'');
 if(SHAPES[name])return SHAPES[name];
 const tool=/_(pickaxe|axe|shovel|hoe|sword|helmet|chestplate|leggings|boots)$/.exec(name);
 if(tool)return TOOLS[tool[1]];
 return WOOD.find(([re])=>re.test(name))?.[1];
}
const fits=(rows,r)=>r.inputs.every(([,n],i)=>rows.join('').split('').filter(c=>c===String(i)).length===n)&&!/[^ 0-9]|[4-9]/.test(rows.join(''))&&
 rows.join('').replace(/ /g,'').split('').every(c=>Number(c)<r.inputs.length);
/** The 9 cells (top row first) of recipe r: the input index in each cell, or -1 for an empty cell. */
export function gridOf(r){
 const rows=shapeFor(r.output[0]);
 if(rows&&fits(rows,r))return [0,1,2].flatMap(y=>[0,1,2].map(x=>{const c=rows[y]?.[x];return c&&c!==' '?Number(c):-1;}));
 const cells=[];
 r.inputs.forEach(([,n],i)=>{for(let k=0;k<n&&cells.length<9;k++)cells.push(i);});
 while(cells.length<9)cells.push(-1);
 return cells;
}
