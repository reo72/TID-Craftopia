// book.js homeBadges (2026-10-30): the home cards with something waiting get BADGE at the end of their text, and the
// RP card shows a red "!" for it.
import assert from 'node:assert';import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL} from 'node:url';
const BP=process.argv[2],RP=process.argv[3];const srv=await import('@minecraft/server');
const B=await import(pathToFileURL(BP+'/book.js'));
const {gachaDay}=await import(pathToFileURL(BP+'/gacha-config.js'));
const player={id:'b1',name:'B',getComponent:()=>({container:{size:0,getItem:()=>undefined}})};
const fresh={job:'未選択',level:1,daily:{counts:{},claimed:[]},codex:{},claimedCodex:[],orders:{},skillUnlocks:[],gacha:{}};
let b=B.homeBadges(player,fresh);assert.ok(b.has('gacha'),'the free gacha ticket waits');assert.ok(!b.has('daily'),'nothing done yet');
b=B.homeBadges(player,{...fresh,gacha:{day:gachaDay(),claimed:true},daily:{counts:{},claimed:[0,1,2],bonus:false}});
assert.ok(!b.has('gacha'));assert.ok(b.has('daily'),'the 3-daily bonus waits');
const buttons=B.homeButtons(player,fresh,true);assert.ok(buttons.some(x=>x[0]==='ct:m|ガチャ'+B.BADGE));
const ui=fs.readFileSync(path.join(RP,'ui/cooptown_book.json'),'utf8');assert.ok(ui.includes('cooptown/book/badge')&&ui.includes("- '§c'"),'the RP draws the mark');
console.log('ok');
