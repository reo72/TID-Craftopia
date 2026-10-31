import {world,system,ItemStack} from '@minecraft/server';
import {ModalFormData,ActionFormData,FormCancelationReason} from '@minecraft/server-ui';
import {keepDigits} from './form-text.js';
import {itemIcon} from './book-frame.js';
import {ITEM_NAMES} from './game-config.js';
import {jobCount} from './job-count.js';
import {chooseDialog,noticeDialog,confirmDialog} from './dialog.js';
import {compileRune,runRune,normalizeRune,SAMPLES,COMMANDS,EVENTS,LIMITS} from './runescript.js';
import {stock,take} from './cook-runtime.js';
import {perform,commandReady,startCommand} from './rune-effects.js';
import {PART_NAMES} from './runescript.js';
import {titleTrack,titleSeen,titleMax} from './job-count.js';
const STREAK_KEY='cooptown:rune_streak'; // successful 試作 in a row (title バグゼロ)
import {penSave,usePen} from './job-tools.js';

// The RuneScript workshop (Notion: 下書き → 無料の構文チェック → 無料の模擬実行 → 試作実行 → 成功レシピ登録 → 本へ刻印 →
// 装備へ付与): an 付与術師 using the enchanting table while sneaking opens it. The draft is edited line by line
// (a game form has no multi-line box), from a sample or from scratch. The prototype run costs one lapis lazuli, can be
// done every 30 s, and checks everything again plus simulated events: a failure explodes on the maker only (HP -4,
// never below 1, stress +10, sparks and a bang; no blocks, no one else) and keeps the error line. A successful prototype
// registers the rune; inscribing it into a book (book + 2 lapis) puts it on a held weapon / worn armor.
// Runes on gear run on their events through runRune; a broken run stops that rune instead of exploding.
export const RUNE_JOB='付与術師';
export const GEAR_TOTAL=160; // the runes on everything worn and held together
let activateFn;
/** The 支援の護符's use (main.js): runs the player's on activate runes. */
export const activateRunes=player=>activateFn?.(player);
const DRAFT_KEY='cooptown:rune_draft',RUNES_KEY='cooptown:runes',SEEN_KEY='cooptown:rune_seen',ITEM_KEY='cooptown:rune';
const PROTO_MS=30000,FIRST_XP=30;
const active=new Set(),lastProto=new Map(),cooldowns=new Map(),broken=new Set();
const readJson=(o,k,d)=>{try{const v=JSON.parse(o.getDynamicProperty(k)??'null');return v??d;}catch{return d;}};
const writeJson=(o,k,v)=>{try{o.setDynamicProperty(k,JSON.stringify(v));}catch{}};
const fmtErr=e=>`§c${e.line?e.line+'行目：':''}${e.message}`;
// simulated contexts for the prototype run (every branch gets a chance: strong / weak, hostile / not)
const SELF=(hp,stress,more={})=>({hp,max_hp:20,stress,on_fire:false,in_water:false,falling:false,night:false,...more});
const SIMS=[{self:SELF(20,0),target:{hostile:true,alive:true}},{self:SELF(3,60,{on_fire:true,in_water:true,falling:true,night:true}),target:{hostile:false,alive:false}},{self:SELF(10,25,{night:true}),target:{hostile:true,alive:false}}];
export function simulate(rune){
 const log=[];
 for(const [n,ctx] of SIMS.entries())for(const ev of Object.keys(rune.events)){const r=runRune(rune,ev,ctx);
  if(r.error)return {ok:false,error:r.error,log};
  log.push(`模擬${n+1} on ${ev}：${r.calls.length?r.calls.map(c=>`${c.name}(${c.args.join(', ')})`).join(' '):'何も起きない'}`);}
 return {ok:true,log};
}

// ---- the workshop screen's helpers ----
export const RUNE_UI={lines:9,runes:3};
const itemName=id=>ITEM_NAMES[id]??id.replace('minecraft:','');
// strength cap by the maker's craft level (初級 / 中級 / 上級)
export const capFor=lv=>lv>=15?LIMITS.score:lv>=5?70:40;
export const tierName=lv=>lv>=15?'上級':lv>=5?'中級':'初級';
const KW=/^(rune|slot|cooldown|on|if|else|let)$/,VALUE=/^(true|false|self|target|ally|weapon|armor|hit|kill|hurt|activate)$/;
/** One editor line, coloured like a code editor: grey number, pink keywords, cyan values, gold strings, green numbers,
 *  yellow commands, grey comments. */
export function codeLine(n,line){
 const num='§8'+String(n).padStart(2,' ')+'  ';
 const c=line.indexOf('//'),body=c>=0?line.slice(0,c):line,comment=c>=0?'§8'+line.slice(c):'';
 const out=body.replace(/"[^"]*"?|\d+(?:\.\d+)?(?:ms|s)?|[A-Za-z_][A-Za-z0-9_]*|[^\sA-Za-z0-9_"]+/g,t=>
  t[0]==='"'?'§6'+t:/^\d/.test(t)?'§a'+t:KW.test(t)?'§d'+t:VALUE.test(t)?'§b'+t:COMMANDS[t]?'§e'+t:/^[A-Za-z_]/.test(t)?'§f'+t:'§7'+t);
 return num+out+comment;
}
const errText=e=>`${e.line?e.line+'行目 ':''}${e.message}`;
/** The first problem of a compiled draft (syntax, or a strength over the maker's cap), or null. */
export function checkErrors(compiled,cap){
 if(!compiled.ok)return compiled.errors[0];
 if(compiled.rune.score>cap)return {line:0,message:`強度${compiled.rune.score}は上限${cap}を超えています`};
 return null;
}
const scoreOf=src=>{const r=compileRune(src);return r.ok?r.rune.score:0;};
const ACTION={mark:a=>`名前とHPを表示 ${a[1]}秒`,ignite:a=>`炎上 ${a[1]}秒`,calm:a=>`ストレス-${a[1]}`,cleanse:()=>'毒を解除'};
const WHEN={hit:'敵に命中',kill:'敵を倒す',hurt:'ダメージを受ける',activate:'護符を使う'};
/** What the rune does when every check passes, for the simulation box. */
export function simSummary(rune){
 const lines=[];
 for(const ev of Object.keys(rune.events)){const r=runRune(rune,ev,SIMS[0]);const acts=r.calls?.map(c=>ACTION[c.name]?.(c.args)??COMMANDS[c.name]?.label??c.name)??[];
  lines.push(`${WHEN[ev]??ev} ＞ ${acts.length?acts.join('・'):'何も起きない'}`);}
 lines.push(`再発動まで ${rune.cooldown}秒`);return lines.join('\n');
}
/** What a rune can go on: the weapons targetFor takes, or the armour piece its commands ask for. */
export function runeTarget(rune){
 const c=compileRune(rune?.src??'').rune,part=c?.part;
 if((rune?.slot??c?.slot)==='weapon')return '武器（剣・斧・トライデント・メイス）';
 return part?PART_NAMES[part]:'防具（頭・胴・脚・足のどれか）';
}
/** The lore of a 刻印の書 (asked 2026-10-29: show what it goes on and what it does): name, target, effect, maker. */
export function runeLore(rune){
 // what it can do on each event, over all the simulated situations (a condition such as low HP still shows its effect)
 let effect=[];try{const c=compileRune(rune.src);if(c.ok){
  for(const ev of Object.keys(c.rune.events)){const acts=new Set();
   for(const ctx of SIMS){const r=runRune(c.rune,ev,ctx);for(const k of r.calls??[])acts.add(ACTION[k.name]?.(k.args)??COMMANDS[k.name]?.label??k.name);}
   effect.push(`${WHEN[ev]??ev} ＞ ${acts.size?[...acts].join('・'):'条件しだい'}`);}
  effect.push(`再発動まで ${c.rune.cooldown}秒`);}}catch{}
 return [`§d刻印：${rune.name}`,`§7付けられる：§f${runeTarget(rune)}`,...(effect.length?['§7効果：',...effect.map(l=>'§f・'+l)]:[]),`§8作者 ${rune.author}`];
}

export function installRunes({game,refreshGame}){
 // 刻印の書 made before their lore told what they go on and do: brought up to date in the inventory now and then
 system.runInterval(()=>{for(const player of world.getAllPlayers()){const c=player.getComponent('minecraft:inventory')?.container;
  for(let i=0;c&&i<c.size;i++){const it=c.getItem(i);if(it?.typeId!=='minecraft:enchanted_book')continue;
   let d;try{d=JSON.parse(it.getDynamicProperty(ITEM_KEY)??'null');}catch{}if(!d)continue;
   try{if(!(it.getLore()??[]).some(l=>l.includes('付けられる'))){it.setLore(runeLore(d));c.setItem(i,it);}}catch{}}}},200);
 const earn=(player,xp,note)=>{try{game.execute(player.id,'job.earn',{skill:'craft',xp,note});}catch{}};
 const levelOf=player=>{try{return game.peek(d=>d.players[player.id])?.craft?.level??1;}catch{return 1;}};
 // ---- the screen (form title "ct:rune"): an editor on the left, checks in the middle, registered runes on the right ----
 // Button order: must match tools/build-rune-ui.mjs in the RP. Marks: [sel] chosen line / rune, [on] success, [ng]
 // failure, [off] disabled, [g1]..[g10] the strength gauge.
 const L={close:0,back:1,lapis:2,count:3,job:4,draftName:5,line:6,lines:RUNE_UI.lines,up:6+RUNE_UI.lines,down:7+RUNE_UI.lines};
 L.snip=L.down+1;L.edit=L.snip+4;L.add=L.edit+1;L.sample=L.add+1;L.status=L.sample+1;L.strength=L.status+1;L.gauge=L.strength+1;L.tier=L.gauge+1;
 L.sim=L.tier+1;L.check=L.sim+1;L.dry=L.check+1;L.proto=L.dry+1;L.note=L.proto+1;L.rune=L.note+1;L.runes=RUNE_UI.runes;L.more=L.rune+L.runes;
 L.targetIcon=L.more+1;L.targetName=L.targetIcon+1;L.inscribe=L.targetName+1;L.apply=L.inscribe+1;L.count_=L.apply+1;
 const SNIPS=['{ }',';','on hit','if'];
 const indentOf=l=>/^\s*/.exec(l)[0];
 function snippet(lines,at,k){
  const cur=lines[at]??'',ind=indentOf(cur);
  if(k===0){lines[at]=cur.replace(/\s*$/,'')+' {';lines.splice(at+1,0,ind+'}');return at;}
  if(k===1){if(!/;\s*$/.test(cur))lines[at]=cur.replace(/\s*$/,'')+';';return at;}
  if(k===2){lines.splice(at+1,0,'  on hit {','  }');return at+1;}
  lines.splice(at+1,0,ind+'  if target.hostile {',ind+'  }');return at+1;
 }
 // where a rune goes: the weapon in hand, or the armor piece its commands ask for (part), else the first worn piece
 const SLOT_OF={head:'Head',chest:'Chest',legs:'Legs',feet:'Feet'};
 function targetFor(player,rune){
  const slot=rune?.slot,part=compileRune(rune?.src??'').rune?.part;
  const equip=player.getComponent('minecraft:equippable');
  if(part){const it=equip?.getEquipment(SLOT_OF[part]);return it?{slot:SLOT_OF[part],item:it}:undefined;}
  if(slot==='weapon'){const it=equip?.getEquipment('Mainhand');return /_(sword|axe)$|^minecraft:(trident|mace)$/.test(it?.typeId??'')?{slot:'Mainhand',item:it}:undefined;}
  for(const s of ['Chest','Head','Legs','Feet']){const it=equip?.getEquipment(s);if(it)return {slot:s,item:it};}
 }
 const bookOf=(container,name)=>{for(let i=0;container&&i<container.size;i++){const it=container.getItem(i);
  if(it?.typeId==='minecraft:enchanted_book'){try{const d=JSON.parse(it.getDynamicProperty(ITEM_KEY)??'null');if(d&&(!name||d.name===name))return {i,item:it,data:d};}catch{}}}};
 async function editLine(player,lines,at,adding){
  const f=new ModalFormData().title('ct:in|'+(adding?`${at+1}行目の後に追加`:`${at+1}行目を編集`)).textField('コード（1行）','例：  mark(target, 3s);',{defaultValue:adding?indentOf(lines[at]??''):lines[at]??''});
  if(!adding)f.toggle('この行を消す',{defaultValue:false});
  const r=await f.show(player);if(r.canceled)return at;
  const text=String(r.formValues[0]??'');
  if(adding){lines.splice(at+1,0,text);return at+1;}
  if(r.formValues[1]){lines.splice(at,1);return Math.max(0,Math.min(at,lines.length-1));}
  lines[at]=text;return at;
 }
 // the language reference (サンプル → 命令と文法の一覧)
 async function grammar(player){
  const sig=(n,c)=>`${n}(${[...(c.who?[c.who]:[]),...c.args.map((t,i)=>c.max[i]!==undefined?`${t}≤${c.max[i]}`:t)].join(', ')})`;
  const by=ev=>Object.entries(COMMANDS).filter(([,c])=>c.events.includes(ev)).map(([n,c])=>`${sig(n,c)}：${c.label} CD${c.cooldown}s・${c.points(c.max)}点${c.part?'・'+PART_NAMES[c.part]:''}`).join('\n');
  const head=['rune "名前" { slot weapon|armor; cooldown 10s; on イベント { ... } }','let 名前 = 式; if 条件 { } else { } // コメント','値：数・true/false・3s・self/target/ally・"文字"',
   '項目：self.hp max_hp stress on_fire in_water falling night target.hostile alive',`上限：1刻印 初級40／中級70／上級100点・装備全体${GEAR_TOTAL}点`,'','イベントを選ぶと命令の一覧が出ます。'].join('\n');
  const i=await chooseDialog(player,'命令と文法',head,Object.entries(EVENTS).map(([k,v])=>`on ${k}：${v.label}`));
  if(i===undefined)return;const ev=Object.keys(EVENTS)[i];
  await noticeDialog(player,'on '+ev,by(ev)+(ev==='activate'?'\n\n支援の護符（付与術師の協力レシピ）を使うと発動します。':''),{close:'戻る'});
 }
 async function open(player){
  if(active.has(player.id))return;active.add(player.id);
  const st={sel:0,top:0,rune:0,runePage:0,status:null,sim:null,note:''};let busy=0;
  try{
   for(;;){
    const draft=readJson(player,DRAFT_KEY,{lines:SAMPLES[0].code.split('\n'),error:null}),runes=readJson(player,RUNES_KEY,[]);
    const lines=draft.lines.length?draft.lines:[''];st.sel=Math.min(st.sel,lines.length-1);
    if(st.sel<st.top)st.top=st.sel;if(st.sel>=st.top+L.lines)st.top=st.sel-L.lines+1;st.top=Math.max(0,Math.min(st.top,Math.max(0,lines.length-L.lines)));
    const src=lines.join('\n'),name=/rune\s+"([^"]*)"/.exec(src)?.[1]??'名前なし',lv=levelOf(player),cap=capFor(lv);
    const container=player.getComponent('minecraft:inventory')?.container,have=stock(container);
    const compiled=compileRune(src),score=compiled.ok?compiled.rune.score:0;
    st.rune=Math.min(st.rune,Math.max(0,runes.length-1));const rune=runes[st.rune],target=rune?targetFor(player,rune):undefined;
    const b=[];const add=t=>b.push(t);
    add('×');add('戻る');add(`ラピス ${have('minecraft:lapis_lazuli')}`);add(`登録 ${runes.length}/20`);add(`${RUNE_JOB} Lv.${lv}`);add('下書き：'+name);
    for(let k=0;k<L.lines;k++){const n=st.top+k;add(n<lines.length?(n===st.sel?'[sel]':'')+codeLine(n+1,lines[n]):'');}
    add(st.top>0?'▲':'');add(st.top+L.lines<lines.length?'▼':'');
    SNIPS.forEach(t=>add(t));add('行を編集');add('行を追加');add('サンプル');
    add(st.status?(st.status.ok?'[on]':'[ng]')+st.status.text:'構文チェックをしてください');
    add(`強度 ${score} / ${cap}`);const g=Math.min(10,Math.round(score/cap*10));add(g?`[g${g}]_`:'_');add(`${tierName(lv)}・上限${cap}`);
    add(st.sim?(st.sim.ok?'':'[ng]')+st.sim.text:'シミュレーション結果\n模擬実行で動きを確かめます');
    add('構文チェック（無料）');add('模擬実行（無料）');add('試作実行 ラピス1'); // plain spaces: the full-width one shows as a box in the pixel font
    add(st.note||(draft.error?'[ng]前回の失敗：'+fmtErr(draft.error).replace('§c',''):'試作に成功すると登録されます'));
    const pageStart=st.runePage*L.runes;
    for(let k=0;k<L.runes;k++){const r=runes[pageStart+k];add(r?(pageStart+k===st.rune?'[sel]':'')+`${r.name} ・ ${r.slot==='weapon'?'武器':'防具'} ・ ${scoreOf(r.src)}点`:'');}
    add(runes.length>L.runes?'▼':'');
    add(target?'item':'');add(target?itemName(target.item.typeId):rune?(rune.slot==='weapon'?'武器を持つ':'防具を着る'):'未登録');
    add((rune?'':'[off]')+'本へ刻印');add((rune&&target&&bookOf(container,rune.name)?'':'[off]')+'装備へ付与');
    const form=new ActionFormData().title('ct:rune').body('');
    b.forEach((t,k)=>{const text=keepDigits(t);if(k===L.targetIcon&&target)form.button(text,itemIcon(target.item.typeId));else form.button(text);});
    const res=await form.show(player);
    if(res.canceled){if(res.cancelationReason===FormCancelationReason.UserBusy&&busy++<3){await new Promise(r=>system.runTimeout(r,10));continue;}return;}
    busy=0;const i=res.selection;st.note='';
    if(i===L.close||i===L.back)return;
    if(i>=L.line&&i<L.line+L.lines){st.sel=st.top+i-L.line;continue;}
    if(i===L.up){st.top=Math.max(0,st.top-L.lines+1);st.sel=Math.min(st.sel,st.top+L.lines-1);continue;}
    if(i===L.down){st.top=st.top+L.lines-1;st.sel=Math.max(st.sel,st.top);continue;}
    const save=()=>{draft.lines=lines;writeJson(player,DRAFT_KEY,draft);st.status=null;st.sim=null;};
    if(i>=L.snip&&i<L.snip+4){st.sel=snippet(lines,st.sel,i-L.snip);save();}
    else if(i===L.edit){st.sel=await editLine(player,lines,st.sel,false);if(!lines.length)lines.push('');save();}
    else if(i===L.add){st.sel=await editLine(player,lines,st.sel,true);save();}
    else if(i===L.sample){const s=await chooseDialog(player,'サンプル','サンプルを改造しながら覚えましょう。今の下書きは上書きされます。',[...SAMPLES.map(x=>x.name),'§1命令と文法の一覧']);
     if(s===SAMPLES.length){await grammar(player);continue;}
     if(s!==undefined){writeJson(player,DRAFT_KEY,{lines:SAMPLES[s].code.split('\n'),error:null});st.sel=0;st.top=0;st.status=null;st.sim=null;}}
    else if(i===L.check){const e=checkErrors(compiled,cap);st.status=e?{ok:false,text:'構文エラー：'+errText(e)}:{ok:true,text:'構文チェック：問題なし'};if(e?.line)st.sel=e.line-1;}
    else if(i===L.dry){const e=checkErrors(compiled,cap);if(e){st.status={ok:false,text:'構文エラー：'+errText(e)};st.sim={ok:false,text:'シミュレーション結果\n'+errText(e)};}
     else{titleTrack(player,'rune_sim');const s=simulate(compiled.rune);st.sim=s.ok?{ok:true,text:'シミュレーション結果\n'+simSummary(compiled.rune)}:{ok:false,text:'シミュレーション結果\n'+errText(s.error)};}}
    else if(i===L.proto){
     const wait=PROTO_MS-(Date.now()-(lastProto.get(player.id)??0));if(wait>0){st.note=`[ng]あと${Math.ceil(wait/1000)}秒待ってください`;continue;}
     if(have('minecraft:lapis_lazuli')<1){st.note='[ng]ラピスラズリが1個必要です';continue;}
     if(!await confirmDialog(player,'試作実行','ラピスラズリを1個使います。\n失敗すると爆発します（HP-4・ストレス+10、周りは巻き込みません）。',{ok:'試作する'}))continue;
     take(container,'minecraft:lapis_lazuli',1);lastProto.set(player.id,Date.now());jobCount(player,'rune_try');
     const s=compiled.ok?simulate(compiled.rune):null,error=checkErrors(compiled,cap)??(!s.ok?s.error:null);
     if(error){
      // the recoil: the maker only
      try{const hp=player.getComponent('minecraft:health');if(hp)hp.setCurrentValue(Math.max(1,hp.currentValue-4));}catch{}
      try{player.dimension.spawnParticle('minecraft:huge_explosion_emitter',player.location);player.playSound('random.explode');}catch{}
      try{game.execute(player.id,'rune.stress',{amount:10});}catch{}
      draft.error=error;writeJson(player,DRAFT_KEY,draft);if(error.line)st.sel=error.line-1;
      titleTrack(player,'rune_fail');try{player.setDynamicProperty(STREAK_KEY,0);}catch{}st.note='[ng]失敗：HP-4・ストレス+10\n'+errText(error);continue;
     }
     draft.error=null;writeJson(player,DRAFT_KEY,draft);
     titleTrack(player,'rune_made');
     // titles: two events (二足の草鞋), a score of 90+ (満点合格), successes in a row (バグゼロ)
     if(Object.keys(compiled.rune.events??{}).length>=2)titleTrack(player,'rune_multi');if((compiled.rune.score??0)>=90)titleTrack(player,'rune_90');
     {const n=(Number(player.getDynamicProperty(STREAK_KEY))||0)+1;try{player.setDynamicProperty(STREAK_KEY,n);}catch{}titleMax(player,'rune_streak',n);}for(const ev of Object.keys(compiled.rune.events??{}))titleSeen(player,'rune_events',ev);for(const m of src.matchAll(/\b(mark|ignite|calm|cleanse)\s*\(/g))titleSeen(player,'rune_cmds',m[1]); // titles
     const norm=normalizeRune(src),seen=readJson(player,SEEN_KEY,[]),first=!seen.includes(norm);
     if(first){seen.push(norm);writeJson(player,SEEN_KEY,seen.slice(-200));earn(player,FIRST_XP,'刻印の初研究 '+compiled.rune.name);}
     const list=runes.filter(x=>x.name!==compiled.rune.name);list.push({name:compiled.rune.name,src,slot:compiled.rune.slot,author:player.name,ver:1});writeJson(player,RUNES_KEY,list.slice(-20));
     st.rune=Math.min(list.length,20)-1;st.runePage=Math.floor(st.rune/L.runes);
     try{player.playSound('random.levelup');}catch{}
     st.note=`[on]試作成功：「${compiled.rune.name}」を登録${first?`\n初めての研究 クラフト経験値+${FIRST_XP}`:''}`;
    }
    else if(i>=L.rune&&i<L.rune+L.runes){st.rune=pageStart+i-L.rune;}
    else if(i===L.more){st.runePage=(st.runePage+1)%Math.ceil(runes.length/L.runes);st.rune=st.runePage*L.runes;}
    else if(i===L.inscribe&&rune){
     const lapis=2-penSave(player); // 刻印のペン in the inventory: one less (job-tools.js)
     if(have('minecraft:book')<1||have('minecraft:lapis_lazuli')<lapis){st.note=`[ng]本1冊とラピスラズリ${lapis}個が必要です`;continue;}
     take(container,'minecraft:book',1);take(container,'minecraft:lapis_lazuli',lapis);if(lapis<2)usePen(player);
     const book=new ItemStack('minecraft:enchanted_book',1);
     book.setDynamicProperty(ITEM_KEY,JSON.stringify({name:rune.name,src:rune.src,author:rune.author}));
     try{book.nameTag='§d刻印の書：'+rune.name;book.setLore(runeLore(rune));}catch{}
     const left=container.addItem(book);if(left)player.dimension.spawnItem(left,player.location);
     earn(player,5,'刻印の書 '+rune.name);st.note=`[on]「${rune.name}」を本へ刻印しました`;
    }
    else if(i===L.apply&&rune){
     const t=targetFor(player,rune),bk=bookOf(container,rune.name);
     const part=compileRune(rune.src).rune?.part;
     if(!t){st.note='[ng]'+(rune.slot==='weapon'?'武器（剣・斧・トライデント・メイス）を手に持ってください':part?`${PART_NAMES[part]}を着てください`:'防具を着てください');continue;}
     // 装備合計 160: the runes on the other worn / held pieces plus this one
     const eqp=player.getComponent('minecraft:equippable');let total=compileRune(rune.src).rune?.score??0;
     for(const s of ['Head','Chest','Legs','Feet','Mainhand'])if(s!==t.slot){try{const d=JSON.parse(eqp.getEquipment(s)?.getDynamicProperty(ITEM_KEY)??'null');if(d)total+=compileRune(d.src).rune?.score??0;}catch{}}
     if(total>GEAR_TOTAL){st.note=`[ng]装備全体の刻印が${total}点になります（上限${GEAR_TOTAL}点）`;continue;}
     if(!bk){st.note='[ng]先に「本へ刻印」で刻印の書を作ってください';continue;}
     container.setItem(bk.i,undefined);
     const item=t.item;item.setDynamicProperty(ITEM_KEY,JSON.stringify(bk.data));
     let lore=[];try{lore=(item.getLore()??[]).filter(l=>!l.startsWith('§d刻印：')&&!l.startsWith('§7作者 '));}catch{}
     try{item.setLore([...lore,`§d刻印：${rune.name}`,`§7作者 ${rune.author}`]);}catch{}
     player.getComponent('minecraft:equippable').setEquipment(t.slot,item);earn(player,10,'刻印 '+rune.name);
     // titles: 容量ギリギリ (the worn total 140+), 五芒星 (the player's own runes on the weapon and all four armour pieces)
     if(total>=140)titleTrack(player,'rune_gear140');
     {let own=0;for(const s of ['Head','Chest','Legs','Feet','Mainhand']){try{const d=JSON.parse(eqp.getEquipment(s)?.getDynamicProperty(ITEM_KEY)??'null');if(d&&(d.author??rune.author)===player.name)own++;}catch{}}if(own>=5)titleTrack(player,'rune_five');}
     try{player.playSound('random.anvil_use');}catch{}
     st.note=`[on]「${rune.name}」を${itemName(item.typeId)}に付けました`;
    }
   }
  }catch(e){console.warn('[CoopTown] 刻印の工房: '+e);}
  finally{active.delete(player.id);}
 }
 world.beforeEvents.playerInteractWithBlock.subscribe(event=>{
  const {block,player}=event;
  if(block.typeId!=='minecraft:enchanting_table'||!player.isSneaking)return;
  let p;try{p=game.peek(d=>d.players[player.id]);}catch{}
  if(![p?.job,p?.secondJob].includes(RUNE_JOB))return;
  event.cancel=true;if(event.isFirstEvent===false)return;
  system.run(()=>void open(player));
 });
 // ---- runes on gear ----
 // A rune runs on its events: hit / kill from the weapon in hand (direct melee only), hurt from each armor piece
 // (only when an attacker hit the wearer and the wearer is still alive: falls, fire and the prototype recoil do not
 // count), activate from every rune the player wears or holds (or the first runed weapon on the hotbar) when the
 // 支援の護符 is used. A broken run stops that rune; each rune has its own cooldown, each command a per-player one
 // (rune-effects.js).
 const runeOn=item=>{try{const v=item?.getDynamicProperty(ITEM_KEY);if(typeof v!=='string')return undefined;const d=JSON.parse(v),c=compileRune(d.src);return c.ok?{...c.rune,key:d.name+'|'+d.author}:undefined;}catch{return undefined;}};
 const lastFight=new Map();
 const contextOf=(player,target)=>{let hp=20,max=20,stress=0,onFire=false;try{const h=player.getComponent('minecraft:health');hp=h.currentValue;max=h.effectiveMax;}catch{}
  try{stress=game.peek(d=>d.players[player.id])?.stress??0;}catch{}try{onFire=!!player.getComponent('minecraft:onfire');}catch{}
  const t=world.getTimeOfDay();
  let hostile=false,alive=false;try{hostile=!!target&&target.matches?.({families:['monster']});alive=!!target&&target.isValid&&(target.getComponent('minecraft:health')?.currentValue??0)>0;}catch{}
  return {self:{hp,max_hp:max,stress,on_fire:onFire,in_water:!!player.isInWater,falling:!!player.isFalling,night:t>=13000&&t<23000},target:{hostile:!!hostile,alive}};};
 function fire(player,rune,event,target,quiet=false){
  const k=player.id+'|'+rune.key;if(broken.has(k))return false;
  const now=Date.now();if((cooldowns.get(k)??0)>now){if(!quiet)try{player.sendMessage(`§e刻印「${rune.name}」はあと${Math.ceil((cooldowns.get(k)-now)/1000)}秒使えません`);}catch{}return false;}
  const r=runRune(rune,event,contextOf(player,target));
  if(r.error){broken.add(k);try{player.sendMessage(`§c刻印「${rune.name}」が止まりました：${r.error.line}行目 ${r.error.message}`);}catch{}return false;}
  const calls=r.calls.filter(c=>commandReady(player,c.name,now));
  if(!calls.length){if(!quiet&&r.calls.length)try{player.sendMessage(`§e刻印「${rune.name}」の魔法はまだ使えません`);}catch{}return false;}
  cooldowns.set(k,now+rune.cooldown*1000);
  const notes=[];
  for(const c of calls){try{startCommand(player,c.name,now);const n=perform(c,{player,event,target,game,itemName,lastFight:lastFight.get(player.id),runeState});if(n)notes.push(n);}catch(e){console.warn('[CoopTown] 刻印 '+c.name+': '+e);}}
  if(notes.length)try{player.sendMessage(`§d[${rune.name}] §f${notes.join('・')}`);}catch{}
  return true;
 }
 const runeState=item=>{const r=runeOn(item);return r?'（有効）':'（休止：コードが動きません）';};
 world.afterEvents.entityHurt?.subscribe(({hurtEntity,damageSource})=>{
  const attacker=damageSource?.damagingEntity;
  if(attacker?.typeId==='minecraft:player'&&damageSource.cause==='entityAttack'){lastFight.set(attacker.id,Date.now());const rune=runeOn(attacker.getComponent('minecraft:equippable')?.getEquipment('Mainhand'));if(rune?.events.hit)fire(attacker,rune,'hit',hurtEntity,true);}
  // on hurt: any damage to the wearer (2026-10-29: it only ran when a mob or player hit, so poison, fire and falls
  // never set off 浄化の衣 and the like); target = the attacker, or none
  if(hurtEntity?.typeId==='minecraft:player'){
   const from=attacker&&attacker.id!==hurtEntity.id?attacker:undefined;
   if(from)lastFight.set(hurtEntity.id,Date.now());
   let alive=false;try{alive=(hurtEntity.getComponent('minecraft:health')?.currentValue??0)>0;}catch{}
   if(!alive)return;
   const eq=hurtEntity.getComponent('minecraft:equippable');for(const s of ['Head','Chest','Legs','Feet']){const rune=runeOn(eq?.getEquipment(s));if(rune?.events.hurt)fire(hurtEntity,rune,'hurt',from,true);}
  }
 });
 world.afterEvents.entityDie?.subscribe(({deadEntity,damageSource})=>{
  const killer=damageSource?.damagingEntity;if(killer?.typeId!=='minecraft:player'||damageSource.cause!=='entityAttack')return;
  const rune=runeOn(killer.getComponent('minecraft:equippable')?.getEquipment('Mainhand'));if(rune?.events.kill)fire(killer,rune,'kill',deadEntity,true);
 });
 /** 支援の護符 (main.js custom component): every worn / held rune with on activate runs; the target is what the player looks at. */
 function activate(player){
  const eq=player.getComponent('minecraft:equippable'),inv=player.getComponent('minecraft:inventory')?.container;
  const items=['Head','Chest','Legs','Feet','Offhand','Mainhand'].map(s=>{try{return eq?.getEquipment(s);}catch{return undefined;}});
  for(let i=0;inv&&i<9;i++){const it=inv.getItem(i);if(i!==player.selectedSlotIndex&&runeOn(it)?.slot==='weapon'){items.push(it);break;}}
  let target;try{target=player.getEntitiesFromViewDirection({maxDistance:8})?.[0]?.entity;}catch{}
  const seen=new Set();let any=false,ran=false;
  for(const it of items){const rune=runeOn(it);if(!rune?.events.activate||seen.has(rune.key))continue;seen.add(rune.key);any=true;if(fire(player,rune,'activate',target))ran=true;}
  if(!any)try{player.sendMessage('§e支援の護符：on activate の刻印を装備していません');}catch{}
  else if(ran)try{player.playSound('random.orb',{pitch:.8});}catch{}
 }
 world.afterEvents.playerLeave.subscribe(({playerId})=>{active.delete(playerId);lastFight.delete(playerId);});
 activateFn=activate;
 return {activate};
}
