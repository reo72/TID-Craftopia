// A small stand-in for @minecraft/server so the BP scripts load and run under Node (tests only).
// Events: world / system before- and afterEvents accept any event name; what is subscribed is kept in __listeners
// under a short name (interact, beforeBreak, afterBreak, entityInteract, place, leave, spawn, entitySpawn, interval,
// or the event's own name). Tests drive them by calling the stored handlers.
export const __listeners={};
const SHORT={playerInteractWithBlock:'interact',playerBreakBlock:{before:'beforeBreak',after:'afterBreak'},playerInteractWithEntity:'entityInteract',
 playerPlaceBlock:'place',playerLeave:'leave',playerSpawn:'spawn',entitySpawn:'entitySpawn'};
const ev=name=>({subscribe:f=>{(__listeners[name]??=[]).push(f);return f;},unsubscribe:f=>{const l=__listeners[name];if(l){const i=l.indexOf(f);if(i>=0)l.splice(i,1);}}});
const events=side=>new Proxy({},{get:(o,k)=>{if(typeof k!=='string')return undefined;if(!o[k]){const s=SHORT[k];o[k]=ev(typeof s==='object'?s[side]:s??k);}return o[k];}});
export const __props=new Map(),__players=[],__chat=[],__timeouts=[];
const dimension=id=>({id,getEntities:()=>[],getPlayers:()=>[],getBlock:()=>undefined,spawnParticle(){},playSound(){},spawnItem:s=>({id:'item',itemStack:s}),spawnEntity:t=>({typeId:t,id:'e'+Math.random(),addTag(){},hasTag:()=>false,remove(){},isValid:true}),runCommand(){return {successCount:1};},getBiome:()=>({id:'minecraft:plains'})});
const dims={};
export const world={beforeEvents:events('before'),afterEvents:events('after'),
 getDynamicProperty:k=>__props.get(k),setDynamicProperty:(k,v)=>v===undefined?__props.delete(k):__props.set(k,v),
 getDynamicPropertyIds:()=>[...__props.keys()],getDynamicPropertyTotalByteCount:()=>[...__props.values()].reduce((s,v)=>s+String(v).length,0),
 getAllPlayers:()=>__players,getPlayers:()=>__players,sendMessage:m=>__chat.push(String(m)),getTimeOfDay:()=>6000,getAbsoluteTime:()=>6000,getDay:()=>1,
 getDimension:id=>dims[id]??=dimension(id.includes(':')?id:'minecraft:'+id),getEntity:id=>__players.find(p=>p.id===id),playSound(){},playMusic(){},stopMusic(){},
 scoreboard:{getObjective:()=>undefined,addObjective:()=>({setScore(){},getScore:()=>0}),getObjectives:()=>[]}};
export const system={beforeEvents:events('before'),afterEvents:events('after'),currentTick:0,
 run:f=>{f();return 0;},runTimeout:f=>{__timeouts.push(f);return 0;},runInterval:f=>{(__listeners.interval??=[]).push(f);return 0;},clearRun(){},runJob(){return 0;}};
export class EnchantmentType{constructor(id){this.id=id;}}
// ids the tests treat as blocks (a block item's placement)
export const BlockTypes={get:id=>/(_block|planks|stone|_ore|_log|dirt|sand|glass|wool)$/.test(String(id))?{id}:undefined,getAll:()=>[]};
export const CustomCommandParamType={PlayerSelector:'PlayerSelector',String:'String',Integer:'Integer'};
const BAD=new Set(['minecraft:not_an_item','minecraft:bad']);
const STACK1=/(sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|bow|rod|bucket|potion|book_and_quill|shield|totem|backpack|watering_can|cooptown:(?!.*(dust|shard|ore|wood|sap|wheat|seed|fish|pearl|crystal|spice|herb|ingot|beam|parts|kit|ration|oil|charm|bait|whetstone|cup)).*_(tool|bag|knife|hammer|brush|lupe|pen|pin|lantern|basket|holder))/;
export class ItemStack{
 constructor(t,a=1){if(BAD.has(t))throw new Error('bad item '+t);this.typeId=t;this.amount=a;this.maxAmount=STACK1.test(t)?1:64;this._lore=[];this.nameTag=undefined;this._p={};this._c={};}
 getLore(){return [...this._lore];}setLore(l){this._lore=[...(l??[])];}
 setDynamicProperty(k,v){if(v===undefined)delete this._p[k];else this._p[k]=v;}getDynamicProperty(k){return this._p[k];}getDynamicPropertyIds(){return Object.keys(this._p);}
 isStackableWith(o){return !!o&&o.typeId===this.typeId&&JSON.stringify(o._lore)===JSON.stringify(this._lore)&&o.nameTag===this.nameTag;}
 getComponent(n){return this._c[n]??(n==='minecraft:durability'&&this.maxAmount===1&&/(sword|pickaxe|axe|shovel|hoe|helmet|chestplate|leggings|boots|bow|rod|watering_can)/.test(this.typeId)?(this._c[n]={damage:0,maxDurability:250}):n==='minecraft:enchantable'?(this._c[n]={_e:[],getEnchantments(){return this._e;},addEnchantment(e){this._e.push(e);},getEnchantment(id){return this._e.find(x=>(x.type?.id??x.type)===id);}}):undefined);}
 clone(){const s=new ItemStack(this.typeId,this.amount);s._lore=[...this._lore];s.nameTag=this.nameTag;s._p={...this._p};s._c=JSON.parse(JSON.stringify(this._c,(k,v)=>k==='_e'?v:v));return s;}
}
