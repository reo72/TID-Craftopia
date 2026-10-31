// Every CoopTown UI draws its text in the bitmap (pixel) font: Minecraft-style blocky letters, Japanese too,
// whatever the player's smooth-font setting. The UI builders run their finished tree through pixelFont().
// Labels that are not text are skipped: the minimap's tile rows (map glyphs, tuned to the default font).
export const PIXEL_FONT='unicode';
const isMapTiles=n=>(n.bindings??[]).some(b=>String(b.source_property_name??'').includes("'ctmap:'"));
/** Sets font_type on every label in a UI tree (labels that already name a font keep it). Returns the tree. */
export function pixelFont(node){
 if(Array.isArray(node)){node.forEach(pixelFont);return node;}
 if(!node||typeof node!=='object')return node;
 if(node.type==='label'&&!node.font_type&&!isMapTiles(node))node.font_type=PIXEL_FONT;
 for(const [k,v] of Object.entries(node))if(k!=='bindings')pixelFont(v);
 return node;
}
