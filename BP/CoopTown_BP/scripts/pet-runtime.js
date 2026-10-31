import {world,system} from '@minecraft/server';
import {ModalFormData} from '@minecraft/server-ui';
import {chooseDialog,noticeDialog,confirmDialog} from './dialog.js';
import {titleTrack} from './job-count.js';

// ペット (asked 2026-10-27): a player makes an animal their pet (up to PET.max): it gets a name, never despawns, takes
// no harm, follows its owner (teleporting when far behind) or stays, and can be called back. Looks: a cat's breed
// (BP entities/cat.json events cooptown:breed_<name>), a wolf's collar or a sheep's wool colour. Kept on the player
// (KEY: [{id, type, name, follow}]) and on the animal (tag PET.tag, OWNER).
export const PET={max:3,tag:'ct_pet',follow:10,check:20,range:6};
const KEY='cooptown:pets',OWNER='cooptown:pet_owner';
export const PET_TYPES={'minecraft:wolf':'イヌ','minecraft:cat':'ネコ','minecraft:parrot':'オウム','minecraft:rabbit':'ウサギ','minecraft:fox':'キツネ','minecraft:pig':'ブタ',
 'minecraft:sheep':'ヒツジ','minecraft:cow':'ウシ','minecraft:chicken':'ニワトリ','minecraft:horse':'ウマ','minecraft:donkey':'ロバ','minecraft:llama':'ラマ','minecraft:axolotl':'ウーパールーパー',
 'minecraft:frog':'カエル','minecraft:goat':'ヤギ','minecraft:camel':'ラクダ','minecraft:armadillo':'アルマジロ','minecraft:ocelot':'ヤマネコ','minecraft:panda':'パンダ','minecraft:turtle':'カメ','minecraft:bee':'ミツバチ'};
export const CAT_BREEDS=[['tabby','トラ'],['tuxedo','ハチワレ'],['red','茶トラ'],['siamese','シャム'],['british','ブリティッシュ'],['calico','三毛'],['persian','ペルシャ'],['ragdoll','ラグドール'],['white','白'],['jellie','ジェリー'],['black','黒']];
export const COLORS=['白','オレンジ','赤紫','空色','黄','黄緑','ピンク','灰','薄灰','水色','紫','青','茶','緑','赤','黒'];
const petsOf=player=>{try{const v=JSON.parse(player.getDynamicProperty(KEY)??'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const savePets=(player,list)=>{try{player.setDynamicProperty(KEY,JSON.stringify(list));}catch{}};
const entityOf=id=>{try{const e=world.getEntity(id);return e?.isValid?e:undefined;}catch{return undefined;}};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const near=(player,e)=>{const l=player.location,v=player.getViewDirection();return {x:l.x-v.x*1.5,y:l.y,z:l.z-v.z*1.5};};
/** Whether an entity can become this player's pet: a listed animal, not someone's pet already. */
export function canBePet(e,playerId){
 if(!PET_TYPES[e?.typeId])return '動物（イヌ・ネコなど）を見て選んでください。';
 let owner;try{owner=e.getDynamicProperty(OWNER);}catch{}
 if(owner&&owner!==playerId)return 'ほかの人のペットです。';if(owner===playerId)return 'もうペットです。';
 try{const t=e.getComponent('minecraft:tameable');if(t?.isTamed&&t.tamedToPlayerId&&t.tamedToPlayerId!==playerId)return 'ほかの人になついています。';}catch{}
 return '';
}
async function register(player){
 const list=petsOf(player);if(list.length>=PET.max){await noticeDialog(player,'ペット',`ペットは${PET.max}匹までです。`,{close:'戻る'});return;}
 let e;try{e=player.getEntitiesFromViewDirection({maxDistance:PET.range}).map(h=>h.entity).find(x=>PET_TYPES[x?.typeId]);}catch{}
 e??=player.dimension.getEntities({location:player.location,maxDistance:4}).filter(x=>PET_TYPES[x.typeId]&&!canBePet(x,player.id)).sort((a,b)=>dist(a.location,player.location)-dist(b.location,player.location))[0];
 const why=e?canBePet(e,player.id):'近くに動物がいません。動物の近くで、その動物を見て選んでください。';if(why){await noticeDialog(player,'ペット',why,{close:'戻る'});return;}
 const r=await new ModalFormData().title('ct:in|'+'ペットの名前').textField(`${PET_TYPES[e.typeId]}の名前（12文字まで）`,'例：ポチ',{defaultValue:e.nameTag||''}).show(player);if(r.canceled)return;
 const name=String(r.formValues[0]??'').trim().slice(0,12)||PET_TYPES[e.typeId];
 if(!e.isValid){await noticeDialog(player,'ペット','動物が見つかりませんでした。',{close:'戻る'});return;}
 try{e.setDynamicProperty(OWNER,player.id);e.addTag(PET.tag);e.nameTag=name;}catch{}
 try{const t=e.getComponent('minecraft:tameable');if(t&&!t.isTamed)t.tame(player);}catch{}
 list.push({id:e.id,type:e.typeId,name,follow:true});savePets(player,list);titleTrack(player,'pet_made');
 try{e.dimension.spawnParticle('minecraft:heart_particle',{x:e.location.x,y:e.location.y+1,z:e.location.z});player.playSound('random.levelup',{pitch:1.4,volume:.6});}catch{}
 await noticeDialog(player,'ペット',`${name}があなたのペットになりました！\nついて来て、けがをしません。`,{close:'OK'});
}
async function looks(player,pet,e){
 if(pet.type==='minecraft:cat'){const k=await chooseDialog(player,pet.name+'の見た目','ネコの種類を選んでください。',CAT_BREEDS.map(b=>b[1]),{back:'戻る'});if(k===undefined)return;
  try{e.triggerEvent('cooptown:breed_'+CAT_BREEDS[k][0]);}catch{await noticeDialog(player,'ペット','見た目を変えられませんでした（ビヘイビアパックの更新が必要です）。',{close:'戻る'});return;}}
 else if(['minecraft:wolf','minecraft:sheep'].includes(pet.type)){const k=await chooseDialog(player,pet.name+'の見た目',pet.type==='minecraft:wolf'?'首輪の色を選んでください。':'毛の色を選んでください。',COLORS,{back:'戻る'});if(k===undefined)return;
  try{e.getComponent('minecraft:color').value=k;}catch{await noticeDialog(player,'ペット','色を変えられませんでした。',{close:'戻る'});return;}}
 else{await noticeDialog(player,'ペット','この動物は見た目を変えられません（ネコ・イヌ・ヒツジが変えられます）。',{close:'戻る'});return;}
 try{e.dimension.spawnParticle('minecraft:villager_happy',{x:e.location.x,y:e.location.y+1,z:e.location.z});player.playSound('random.pop');}catch{}
}
async function petMenu(player,k){
 for(;;){
  const list=petsOf(player),pet=list[k];if(!pet)return;const e=entityOf(pet.id);
  const where=!e?'§7見つかりません（遠くにいるか、読み込まれていません）':e.dimension.id!==player.dimension.id?'§e別のディメンションにいます':`§a${Math.round(dist(e.location,player.location))}m先`;
  const i=await chooseDialog(player,pet.name,`${PET_TYPES[pet.type]??pet.type}　${where}§r\n${pet.follow?'ついて来ます':'待っています'}`,['呼ぶ',pet.follow?'ここで待たせる':'ついて来させる','見た目を変える','名前を変える','ペットをやめる'],{back:'戻る'});
  if(i===undefined)return;
  if(i===0){if(!e){await noticeDialog(player,'ペット',`${pet.name}が見つかりません。いた場所に行くと見つかります。`,{close:'戻る'});continue;}
   try{e.teleport(near(player,e),{dimension:player.dimension});e.dimension.spawnParticle('minecraft:heart_particle',{...e.location,y:e.location.y+1});player.playSound('random.pop');}catch{}}
  else if(i===1){pet.follow=!pet.follow;savePets(player,list);}
  else if(i===2){if(!e){await noticeDialog(player,'ペット','近くにいるときに変えられます。',{close:'戻る'});continue;}await looks(player,pet,e);}
  else if(i===3){const r=await new ModalFormData().title('ct:in|'+'名前を変える').textField('新しい名前（12文字まで）','例：タマ',{defaultValue:pet.name}).show(player);if(r.canceled)continue;
   pet.name=String(r.formValues[0]??'').trim().slice(0,12)||pet.name;savePets(player,list);if(e)try{e.nameTag=pet.name;}catch{}}
  else if(i===4){if(!await confirmDialog(player,'ペットをやめる',`${pet.name}をペットから外しますか？（ふつうの動物に戻ります）`,{ok:'外す'}))continue;
   if(e)try{e.setDynamicProperty(OWNER,undefined);e.removeTag(PET.tag);}catch{}list.splice(k,1);savePets(player,list);return;}
 }
}
export async function openPets(player){
 for(;;){
  const list=petsOf(player);
  const i=await chooseDialog(player,'ペット',`ペット ${list.length} / ${PET.max}\n動物を見ながら「ペットにする」を押すと登録できます。`,[...list.map(p=>`${p.name}（${PET_TYPES[p.type]??''}）${entityOf(p.id)?'':'§7 見つかりません'}`),'ペットにする'],{back:'閉じる'});
  if(i===undefined)return;
  if(i<list.length)await petMenu(player,i);else await register(player);
 }
}
export function installPets(){
 system.runInterval(()=>{
  for(const player of world.getAllPlayers()){
   for(const pet of petsOf(player)){
    const e=entityOf(pet.id);if(!e)continue;
    try{e.addEffect('resistance',60,{amplifier:4,showParticles:false});e.addEffect('fire_resistance',60,{amplifier:0,showParticles:false});}catch{}
    if(!pet.follow)continue;
    const far=e.dimension.id!==player.dimension.id||dist(e.location,player.location)>PET.follow;
    if(far&&player.isOnGround!==false)try{e.teleport(near(player,e),{dimension:player.dimension});}catch{}
   }
  }
 },PET.check);
}
