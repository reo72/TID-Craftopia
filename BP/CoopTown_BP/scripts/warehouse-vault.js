import {world} from '@minecraft/server';
import {qualityOf,TIERS} from './quality.js';

// The shared warehouse's vault (asked 2026-10-26: keep items as they are). Items the counted warehouse cannot hold
// (a name, a rank, enchantments, wear, contents, which potion...) are kept as the items themselves in hidden
// storage entities (VAULT, VAULT_SLOTS slots each, up to VAULT_MAX) at one place: where the first keeper took one.
// A ticking area keeps that place loaded, so any keeper can reach it. The place: world property AT_KEY; a log of
// what went in and out: LOG_KEY (newest first, LOG_MAX).
// The vault entities cannot be hurt or opened; a /kill on them would lose their items (they are private: no drops).
export const VAULT='cooptown:warehouse_vault',VAULT_SLOTS=54,VAULT_MAX=10,AT_KEY='cooptown:vault_at',LOG_KEY='cooptown:vault_log',LOG_MAX=30;
const N_KEY='cooptown:vault_n';
export function vaultHome(){try{return JSON.parse(world.getDynamicProperty(AT_KEY)??'null');}catch{return null;}}
const loaded=h=>{try{return !!world.getDimension(h.dim).getBlock({x:h.x,y:h.y,z:h.z});}catch{return false;}};
/** The vault's place, set at `near` (an entity) the first time; undefined when it is not loaded right now. */
function home(near){
 let h=vaultHome();
 if(!h&&near){
  const l=near.location;h={dim:near.dimension.id,x:Math.floor(l.x),y:Math.floor(l.y),z:Math.floor(l.z)};
  world.setDynamicProperty(AT_KEY,JSON.stringify(h));
  try{world.getDimension(h.dim).runCommand(`tickingarea add circle ${h.x} ${h.y} ${h.z} 1 cooptown_vault true`);}catch(e){console.warn('[CoopTown] 倉庫の常時読み込み: '+e);}
 }
 return h&&loaded(h)?h:undefined;
}
/** The vault entities in order (empty when the place is not loaded). */
export function vaults(){
 const h=vaultHome();if(!h||!loaded(h))return [];
 try{return world.getDimension(h.dim).getEntities({type:VAULT}).sort((a,b)=>(a.getDynamicProperty(N_KEY)??0)-(b.getDynamicProperty(N_KEY)??0));}catch{return [];}
}
const containerOf=e=>{try{return e.getComponent('minecraft:inventory').container;}catch{return undefined;}};
/** Puts a stack in the vault. Returns what did not fit (the whole stack when the vault cannot be reached). */
export function vaultStore(stack,near){
 const h=home(near);if(!h)return stack;
 let left=stack;const list=vaults();
 for(const v of list){const c=containerOf(v);if(!c)continue;left=c.addItem(left);if(!left)return undefined;}
 for(let n=list.length;n<VAULT_MAX&&left;n++){
  let v;try{v=world.getDimension(h.dim).spawnEntity(VAULT,{x:h.x+.5,y:h.y,z:h.z+.5});v.setDynamicProperty(N_KEY,n);}catch(e){console.warn('[CoopTown] 倉庫: '+e);break;}
  left=containerOf(v)?.addItem(left)??left;
 }
 return left;
}
/** Every stack in the vault: [{vault, slot, item}]. */
export function vaultEntries(){
 const out=[];
 for(const v of vaults()){const c=containerOf(v);for(let i=0;c&&i<c.size;i++){const s=c.getItem(i);if(s)out.push({vault:v,slot:i,item:s});}}
 return out;
}
/** Takes up to `amount` from an entry; the stack taken (all its data kept), or undefined when it is gone. */
export function vaultTake(entry,amount){
 const c=containerOf(entry.vault),s=c?.getItem(entry.slot);if(!s||s.typeId!==entry.item.typeId)return undefined;
 const n=Math.max(1,Math.min(amount,s.amount)),out=s.clone();out.amount=n;
 if(n>=s.amount)c.setItem(entry.slot,undefined);else{s.amount-=n;c.setItem(entry.slot,s);}
 return out;
}
/** A stack's label for lists: 「name」 kind (rank) [enchanted] — itemName(id) gives the kind. */
export function itemLabel(s,itemName){
 const t=qualityOf(s);let ench=false;try{ench=(s.getComponent('minecraft:enchantable')?.getEnchantments().length??0)>0;}catch{}
 let worn='';try{const d=s.getComponent('minecraft:durability');if(d&&d.damage>0)worn=`（耐久 ${d.maxDurability-d.damage}/${d.maxDurability}）`;}catch{}
 return `${s.nameTag?`「${s.nameTag}」`:''}${itemName(s.typeId)}${t?`${TIERS[t].color}（ランク${TIERS[t].label}）§r`:''}${ench?'§d（エンチャント）§r':''}${worn}`;
}
export function vaultLog(){try{return JSON.parse(world.getDynamicProperty(LOG_KEY)??'[]');}catch{return [];}}
export function noteVault(name,text){
 const log=vaultLog();log.unshift({name,text,at:Date.now()});log.length=Math.min(LOG_MAX,log.length);
 try{world.setDynamicProperty(LOG_KEY,JSON.stringify(log));}catch{}
}
