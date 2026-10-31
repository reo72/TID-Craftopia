// Parties: invite / join / leave, and what the HUD panels get (text lines and hidden marks), in step with the RP.
import {pathToFileURL} from 'url';import path from 'path';import assert from 'assert';import fs from 'fs';
const dir=process.argv[2],rp=process.argv[3];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const srv=await import('@minecraft/server');
const P=await load('party.js'),H=await load('hud-info.js'),{PARTY_GLYPHS,PARTY_SKINS}=await load('party-glyphs.js');
// RP side: the glyph page, the marks file, the pictures, and the HUD's info line count
assert.ok(fs.existsSync(path.join(rp,'font/glyph_E2.png')));
assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(rp,'tools/party-glyphs.json'),'utf8')),PARTY_GLYPHS);
for(const n of ['member_panel','portrait_frame','title_ribbon','title_medal','heart','hp_track','hp_fill_green','hp_fill_red'])assert.ok(fs.existsSync(path.join(rp,'textures/cooptown/party',n+'.png')),n);
for(const s of PARTY_SKINS)assert.ok(fs.existsSync(path.join(rp,'textures/cooptown/skins',s+'.png')),s);
const hud=fs.readFileSync(path.join(rp,'ui/hud_screen.json'),'utf8');for(const [k,ch] of Object.entries(PARTY_GLYPHS).filter(([k])=>!/_0$/.test(k)||k.includes('pf')))assert.ok(hud.includes(ch)||hud.toLowerCase().includes(JSON.stringify(ch).slice(1,-1).toLowerCase()),'mark used by the HUD');
const src=fs.readFileSync(path.join(rp,'tools/build-hud-log.mjs'),'utf8');assert.ok(src.includes(`lines:${H.INFO_LINES.length},`),'INFO.lines = INFO_LINES');
// invite / join / leave
srv.world.setDynamicProperty(P.PARTY.key,undefined);P.resetParties();
const pl=(id,name,hp=20)=>({id,name,typeId:'minecraft:player',location:{x:0,y:64,z:0},dimension:{id:'minecraft:overworld',getBiome:()=>({id:'minecraft:plains'})},getDynamicProperty:()=>undefined,getComponent:n=>n==='minecraft:health'?{currentValue:hp,effectiveMax:20}:undefined,sendMessage(){}});
const a=pl('a','Alice'),b=pl('b','Bob',5),c=pl('c','Cara'),d=pl('d','Dan'),e=pl('e','Eve');srv.__players.push(a,b,c,d,e);
assert.ok(P.join(a,b).startsWith('§a'));assert.strictEqual(P.partyOf(b.id).leader,'a');
assert.ok(P.inviteBlock(a,b).includes('同じ'));P.join(b,c);P.join(a,d);assert.ok(P.inviteBlock(a,e).includes('4人'));
// the HUD: Alice sees Bob, Cara, Dan
const stats=id=>({b:{title:'森の守り人',job:'農家'},c:{job:'釣り師'}}[id]??{});
let m=P.membersFor(a,stats);assert.deepStrictEqual(m.map(x=>x.name),['Bob','Cara','Dan']);
const t=P.partyText(m);assert.deepStrictEqual([t.p1name,t.p1title,t.p1hp,t.p2title],['Bob','森の守り人','5/20','称号なし']);
const marks=P.partyMarks(m),G=k=>PARTY_GLYPHS['token:'+k];
assert.ok(marks.includes(G('pm1'))&&marks.includes(G('pm3'))&&!marks.includes(G('pf1_0')));
assert.ok(marks.includes(G('pf1_'+PARTY_SKINS.indexOf('farmer')))&&marks.includes(G('ph1_3'))&&marks.includes(G('ph2_10')));
// an offline member: OFF, no HP bar
srv.__players.splice(srv.__players.indexOf(d),1);m=P.membersFor(a,stats);assert.strictEqual(P.partyText(m).p3hp,'OFF');assert.ok(!P.partyMarks(m).includes(G('ph3_10')));
// info lines: party lines come last, blank when there is no member
H.setPartyLines(pl2=>P.partyText(P.membersFor(pl2,stats)));
const lines=H.infoLines(a,{});assert.strictEqual(lines.length,H.INFO_LINES.length);assert.strictEqual(lines[H.INFO_LINES.indexOf('p1name')],'Bob');
// leaving: the leader hands over; a party of one ends
assert.ok(P.leave('a').startsWith('§a'));assert.strictEqual(P.partyOf('b').leader,'b');
P.leave('c');P.leave('d');assert.strictEqual(P.partyOf('b'),undefined);
assert.strictEqual(P.membersFor(b,stats).length,0);assert.strictEqual(P.partyMarks([]),'');
const none=H.infoLines(b,{});assert.notStrictEqual(none[H.INFO_LINES.indexOf('p1name')],'');
console.log('party ok');
// the invitation screen: its buttons in the RP's slot order, routed title, pictures
{
 const P2=await load('party.js');P2.resetParties();srv.world.setDynamicProperty(P2.PARTY.key,undefined);
 const x=pl('x','Haru'),y=pl('y','Sora');P2.join(x,y);
 const b=P2.inviteButtons(x,id=>({x:{title:'森の守り人',job:'農家'},y:{job:'釣り師'}}[id]??{}));
 const S=P2.INVITE_SLOTS;assert.strictEqual(b.length,12);
 assert.deepStrictEqual(b[S.inviter],['pi:in|Haru','textures/cooptown/skins/farmer']);assert.strictEqual(b[S.title][0],'pi:ti|森の守り人');
 assert.strictEqual(b[S.count][0],'pi:cnt|メンバー 2 / 4');assert.deepStrictEqual(b.slice(S.members,S.members+4).map(v=>v[0]),['pi:m|','pi:m|','pi:e|','pi:e|']);
 assert.strictEqual(b[S.members+1][1],'textures/cooptown/skins/fisher');
 assert.deepStrictEqual([b[S.accept][0],b[S.decline][0],b[S.close][0]],['pi:ok|参加する','pi:no|辞退する','pi:x|']);
 const ui=fs.readFileSync(path.join(rp,'tools/build-party-invite-ui.mjs'),'utf8');
 for(const [k,v] of Object.entries(S))assert.ok(ui.includes(`${k}:${v}`),'RP slot '+k);
 assert.ok(fs.readFileSync(path.join(rp,'ui/server_form.json'),'utf8').includes("ct:party_invite"));
 for(const n of ['dialog_frame','header_plate','inviter_frame','portrait_frame','member_empty','title_badge','button_accept','button_decline','button_close'])assert.ok(fs.existsSync(path.join(rp,'textures/cooptown/party_invite',n+'.png')),n);
}
console.log('invite ok');
