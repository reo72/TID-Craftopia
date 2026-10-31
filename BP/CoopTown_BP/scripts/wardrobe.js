import {world,system} from '@minecraft/server';
import {chooseDialog} from './dialog.js';

// きせかえ (asked 2026-10-27): a player can wear one of the addon's skins over their own (BP entities/player.json property
// cooptown:skin, RP entity/player.entity.json + render_controllers/cooptown_skin; pictures: RP tools/build-skins.py) and
// hide the armour they wear (property cooptown:hide_armor, RP attachables/armor: the armour still protects).
// The choice is also kept on the player (KEY) and put back when they come in.
export const SKINS=['自分のスキン','農家の作業着','釣り師の雨合羽','鍛冶師の前掛け','料理人のコック服','調合師の白衣','付与術師のローブ','冒険家の旅装','旅人の服'];
const KEY='cooptown:wardrobe';
const saved=player=>{try{const v=JSON.parse(player.getDynamicProperty(KEY)??'{}');return {skin:Number(v.skin)||0,hide:!!v.hide};}catch{return {skin:0,hide:false};}};
/** Wears skin (0: the player's own) and shows / hides armour; returns false when the packs are not set up. */
export function applyWardrobe(player,{skin,hide}){
 try{player.setProperty('cooptown:skin',Math.max(0,Math.min(SKINS.length-1,skin|0)));player.setProperty('cooptown:hide_armor',!!hide);}catch{return false;}
 try{player.setDynamicProperty(KEY,JSON.stringify({skin,hide}));}catch{}
 return true;
}
export async function openWardrobe(player){
 for(;;){
  const cur=saved(player);
  const i=await chooseDialog(player,'きせかえ','スキンを選ぶと、すぐに着替えます。\n防具は見えなくなっても、守りの効果はそのままです。',
   [...SKINS.map((s,k)=>(k===cur.skin?'§2▶ ':'')+s),cur.hide?'防具：§c非表示§r（押すと表示）':'防具：§a表示§r（押すと非表示）'],{back:'閉じる'});
  if(i===undefined)return;
  const next=i<SKINS.length?{...cur,skin:i}:{...cur,hide:!cur.hide};
  if(!applyWardrobe(player,next)){player.sendMessage('§cきせかえの準備ができていません（ビヘイビアパックの更新が必要です）。');return;}
  try{player.playSound(i<SKINS.length?'armor.equip_leather':'armor.equip_generic',{volume:.6});player.dimension.spawnParticle('minecraft:villager_happy',{...player.location,y:player.location.y+1});}catch{}
 }
}
export function installWardrobe(){
 world.afterEvents.playerSpawn.subscribe(({player,initialSpawn})=>{if(initialSpawn)system.runTimeout(()=>{const s=saved(player);if(s.skin||s.hide)applyWardrobe(player,s);},20);});
}
