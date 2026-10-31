import {world,system} from '@minecraft/server';
import {PARTY_GLYPHS,PARTY_SKINS} from './party-glyphs.js';
import {ActionFormData,FormCancelationReason} from '@minecraft/server-ui';

// Parties (asked 2026-10-28 with a HUD mockup): up to PARTY.max players. A friend invites another (friend-runtime.js),
// the invited one says yes, and both see the others under the minimap's location box (RP build-hud-log.mjs
// partyPanel): face (their job outfit), name, title and HP. Kept in the world's dynamic property PARTY.key, so a
// party lasts through leaving and restarts; a party of one ends.
// The HUD gets the members' text as info lines (hud-info.js INFO_LINES p<k>name / title / hp) and the rest as hidden
// marks with the map text (minimap.js; RP tools/build-party-hud.py: pm<k> shown, pf<k>_<skin> face, ph<k>_<n> HP).
export const PARTY={max:4,shown:3,key:'cooptown:parties',inviteSeconds:60};
const SKIN={'農家':'farmer','釣り師':'fisher','鍛冶師':'smith','料理人':'cook','調合師':'alchemist','付与術師':'enchanter','冒険家':'adventurer','鉱夫':'adventurer','木こり':'adventurer'}; // 鉱夫 / 木こり: the 冒険家 outfit until theirs come
export const skinIndex=job=>Math.max(0,PARTY_SKINS.indexOf(SKIN[job]??'traveler'));
const G=k=>PARTY_GLYPHS['token:'+k]??'';

// ---- the parties: {id: {leader, members: [{id, name}]}} ----
let cache=null;
const load=()=>{if(cache)return cache;try{cache=JSON.parse(world.getDynamicProperty(PARTY.key)??'{}')??{};}catch{cache={};}return cache;};
const save=()=>{try{world.setDynamicProperty(PARTY.key,JSON.stringify(cache??{}));}catch(e){console.warn('[CoopTown] パーティ: '+e);}};
/** The party a player is in ({id, leader, members}), or undefined. */
export function partyOf(id){const all=load();for(const [pid,p] of Object.entries(all))if(p.members.some(m=>m.id===id))return {id:pid,...p};return undefined;}
/** Why from cannot invite to (text), or '' when they can. */
export function inviteBlock(from,to){
 if(from.id===to.id)return '自分は誘えません。';
 const a=partyOf(from.id),b=partyOf(to.id);
 if(b&&b.id===a?.id)return 'もう同じパーティです。';
 if(b)return `${to.name}さんは別のパーティに入っています。`;
 if(a&&a.members.length>=PARTY.max)return `パーティは${PARTY.max}人までです。`;
 return '';
}
/** to joins from's party (made now if from has none). Returns the message for from. */
export function join(from,to){
 const why=inviteBlock(from,to);if(why)return '§e'+why;
 const all=load();let p=partyOf(from.id);
 if(!p){const id=`${from.id}:${Date.now()}`;all[id]={leader:from.id,members:[{id:from.id,name:from.name}]};p={id,...all[id]};}
 all[p.id].members.push({id:to.id,name:to.name});save();
 return `§a${to.name}さんがパーティに入りました。`;
}
/** id leaves their party; a party left with one member ends, a leader leaving hands it to the next. */
export function leave(id){
 const all=load(),p=partyOf(id);if(!p)return '§eパーティに入っていません。';
 const left=all[p.id].members.filter(m=>m.id!==id);
 if(left.length<2)delete all[p.id];else all[p.id]={leader:p.leader===id?left[0].id:p.leader,members:left};
 save();return '§aパーティを抜けました。';
}
/** For tests: forget the cached parties. */
export function resetParties(){cache=null;}

// ---- what the HUD shows ----
/** The other members as the panels show them (up to PARTY.shown): {name, title, job, hp, max, online}.
 *  stats(id) -> {title, job} from the game data. */
export function membersFor(player,stats=()=>({})){
 const p=partyOf(player.id);if(!p)return [];
 const online=new Map(world.getAllPlayers().map(o=>[o.id,o]));
 return p.members.filter(m=>m.id!==player.id).slice(0,PARTY.shown).map(m=>{
  const o=online.get(m.id),s=stats(m.id)??{};let hp=0,max=20;
  if(o)try{const h=o.getComponent('minecraft:health');hp=Math.ceil(h.currentValue);max=Math.round(h.effectiveMax);}catch{}
  return {name:o?.name??m.name,title:s.title??'',job:s.job,hp,max,online:!!o};
 });
}
/** Hidden marks for the panels: pm<k>, pf<k>_<skin>, ph<k>_<tenths of HP> (none when offline). */
export function partyMarks(members){
 return members.map((m,i)=>{const k=i+1,n=m.online?Math.max(m.hp>0?1:0,Math.min(10,Math.ceil(10*m.hp/Math.max(1,m.max)))):0;
  return G('pm'+k)+G(`pf${k}_${skinIndex(m.job)}`)+(n?G(`ph${k}_${n}`):'');}).join('');
}
/** The panels' text lines: {p<k>name, p<k>title, p<k>hp}. */
export function partyText(members){
 const v={};
 for(let k=1;k<=PARTY.shown;k++){const m=members[k-1];
  v[`p${k}name`]=m?.name??'';v[`p${k}title`]=m?(m.title||'称号なし'):'';v[`p${k}hp`]=m?(m.online?`${m.hp}/${m.max}`:'OFF'):'';}
 return v;
}

// ---- the invitation screen (RP tools/build-party-invite-ui.mjs; asked 2026-10-28 with a mockup) ----
export const INVITE_SLOTS={inviter:0,title:1,message:2,count:3,members:4,limit:8,accept:9,decline:10,close:11};
export const skinTexture=job=>'textures/cooptown/skins/'+PARTY_SKINS[skinIndex(job)];
/** The screen's buttons for an invitation: [text, image?] in INVITE_SLOTS order. stats(id) -> {title, job}. */
export function inviteButtons(from,stats=()=>({})){
 const p=partyOf(from.id),members=p?p.members:[{id:from.id,name:from.name}],me=stats(from.id)??{};
 const b=[['pi:in|'+from.name,skinTexture(me.job)],['pi:ti|'+(me.title??'')],['pi:msg|'+`${from.name} のパーティに招待されました`],['pi:cnt|'+`メンバー ${members.length} / ${PARTY.max}`]];
 for(let i=0;i<4;i++){const m=members[i];b.push(m?['pi:m|',skinTexture(stats(m.id)?.job)]:['pi:e|']);}
 b.push(['pi:lim|'+`招待の有効期限：${PARTY.inviteSeconds} 秒`],['pi:ok|参加する'],['pi:no|辞退する'],['pi:x|']);
 return b;
}
/** Shows the invitation to `to`: true when they join in time, 'late' after the time limit, false otherwise. */
async function inviteScreen(from,to,stats){
 const form=new ActionFormData().title('ct:party_invite').body('');
 for(const [t,image] of inviteButtons(from,stats))if(image)form.button(t,image);else form.button(t);
 const until=Date.now()+PARTY.inviteSeconds*1000;
 for(let busy=0;;){
  const r=await form.show(to);
  if(r.canceled){if(r.cancelationReason===FormCancelationReason.UserBusy&&busy++<6&&Date.now()<until){await new Promise(res=>system.runTimeout(res,20));continue;}return false;}
  if(r.selection===INVITE_SLOTS.accept)return Date.now()<=until||'late';
  if(r.selection===INVITE_SLOTS.decline||r.selection===INVITE_SLOTS.close)return false;
  // the other slots only show things: the screen comes back
 }
}
/** Asks to (the invitation screen) whether they join from's party. stats(id) -> {title, job} for the screen. */
export async function invite(from,to,stats){
 const why=inviteBlock(from,to);if(why)return '§e'+why;
 try{to.sendMessage(`§b${from.name}さんからパーティの誘いが届きました。`);}catch{}
 const yes=await inviteScreen(from,to,stats);
 if(yes==='late'){try{to.sendMessage('§e招待の有効期限が切れていました。');}catch{}return `§e${to.name}さんの返事が間に合いませんでした。`;}
 if(!yes)return `§e${to.name}さんは誘いを断りました。`;
 const m=join(from,to);
 if(m.startsWith('§a')){const p=partyOf(from.id);for(const x of p?.members??[]){const o=world.getAllPlayers().find(q=>q.id===x.id);if(o&&o.id!==from.id)try{o.sendMessage(m);}catch{}}}
 return m;
}
