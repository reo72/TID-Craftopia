// 刻印言語 RuneScript (Notion「刻印言語 RuneScript・文法・開発手順」): the enchanter's own language for runes.
// Players write variables, conditions, events and the server's magic commands; nothing else runs (no JavaScript, no
// commands). compileRune(source) -> {ok, rune|errors}: tokenizer, parser, type check, limits and score. runRune(rune,
// event, context) -> the command calls to perform (the interpreter stops at the step and call limits).
//
// rune "名前" { slot weapon|armor; cooldown 5s; on hit|kill|hurt { ... } }
// statements: let x = expr;  if expr { ... } else { ... }  command(args);   comments: // to the line end
// values: Number, Bool (true / false), Duration (3s / 500ms), Entity (self / target), String ("...")
// operators: + - * /  == != < > <= >=  && || !   fields: self.hp self.max_hp self.stress target.hostile target.alive

export const LIMITS={source:4000,statements:32,depth:3,calls:2,steps:64,score:100};
// event -> the slot it belongs to (null: either) and what it may refer to. hurt's target is the attacker (absent for
// falls, fire, ...); activate (v0.2: using the 支援の護符) has the creature the wearer looks at as its target, if any.
export const EVENTS={hit:{slot:'weapon',target:true,label:'近接攻撃が当たった'},kill:{slot:'weapon',target:true,label:'近接攻撃で倒した'},
 hurt:{slot:'armor',target:true,label:'防具の装着者がダメージを受けた（target は攻撃者）'},activate:{slot:null,target:true,label:'支援の護符を使った（target は見ている相手）'}};
// the magic commands: rune-commands.js
import {COMMANDS} from './rune-commands.js';
export {COMMANDS};
const FIELDS={self:{hp:'Number',max_hp:'Number',stress:'Number',on_fire:'Bool',in_water:'Bool',falling:'Bool',night:'Bool'},target:{hostile:'Bool',alive:'Bool'}};
const KEYWORDS=new Set(['rune','slot','cooldown','on','if','else','let','true','false','self','target','ally','weapon','armor']);

const S_='String';
export const PART_NAMES={head:'頭防具',chest:'胴防具',legs:'脚防具',feet:'足防具'};
class RuneError extends Error{constructor(line,message){super(message);this.line=line;}}
// ---- tokenizer ----
export function tokenize(src){
 const out=[];let i=0,line=1;
 const err=m=>{throw new RuneError(line,m);};
 while(i<src.length){
  const c=src[i];
  if(c==='\n'){line++;i++;continue;}
  if(/\s/.test(c)){i++;continue;}
  if(src.startsWith('//',i)){while(i<src.length&&src[i]!=='\n')i++;continue;}
  if(c==='"'){let j=i+1;while(j<src.length&&src[j]!=='"'&&src[j]!=='\n')j++;if(src[j]!=='"')err('文字列の " が閉じていません');out.push({t:'str',v:src.slice(i+1,j),line});i=j+1;continue;}
  const num=/^\d+(\.\d+)?(ms|s)?/.exec(src.slice(i));
  if(num){const v=Number(num[0].replace(/ms|s$/,''));out.push(num[2]?{t:'dur',v:num[2]==='ms'?v/1000:v,line}:{t:'num',v,line});i+=num[0].length;continue;}
  const id=/^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
  if(id){out.push({t:KEYWORDS.has(id[0])?id[0]:'id',v:id[0],line});i+=id[0].length;continue;}
  const op=['==','!=','<=','>=','&&','||'].find(o=>src.startsWith(o,i))??('+-*/<>!{}();,.='.includes(c)?c:null);
  if(!op)err(`使えない文字「${c}」があります（識別子は半角英数字と _）`);
  out.push({t:op,v:op,line});i+=op.length;
 }
 out.push({t:'eof',line});return out;
}
// ---- parser ----
export function parse(src){
 const tk=tokenize(src);let p=0;
 const peek=()=>tk[p],next=()=>tk[p++];
 const expect=(t,what)=>{const k=next();if(k.t!==t)throw new RuneError(k.line,`${what??`「${t}」`}が必要です（「${k.v??'ファイルの終わり'}」があります）`);return k;};
 const rune={line:peek().line};expect('rune','最初に rune');rune.name=expect('str','刻印名（"..."）').v;expect('{');
 rune.events={};
 while(peek().t!=='}'){
  const k=next();
  if(k.t==='slot'){const s=next();if(s.t!=='weapon'&&s.t!=='armor')throw new RuneError(s.line,'slot は weapon か armor です');rune.slot=s.t;expect(';','文末の ;');}
  else if(k.t==='cooldown'){const d=expect('dur','時間（例：5s）');rune.cooldown=d.v;expect(';','文末の ;');}
  else if(k.t==='on'){const e=next();if(!EVENTS[e.v])throw new RuneError(e.line,`イベント「${e.v}」はありません（${Object.keys(EVENTS).join(' / ')}）`);if(rune.events[e.v])throw new RuneError(e.line,`on ${e.v} が2つあります`);rune.events[e.v]={line:e.line,body:block(1)};}
  else throw new RuneError(k.line,`「${k.v}」はここに書けません（slot / cooldown / on）`);
 }
 expect('}');if(peek().t!=='eof')throw new RuneError(peek().line,'rune の } の後に何か書かれています');
 return rune;
 function block(depth){
  if(depth>LIMITS.depth+1)throw new RuneError(peek().line,`if の入れ子は${LIMITS.depth}段までです`);
  expect('{');const body=[];
  while(peek().t!=='}'){if(peek().t==='eof')throw new RuneError(peek().line,'} が足りません');body.push(statement(depth));}
  expect('}');return body;
 }
 function statement(depth){
  const k=peek();
  if(k.t==='let'){next();const name=expect('id','変数名');expect('=');const value=expr();expect(';','文末の ;');return {k:'let',name:name.v,value,line:k.line};}
  if(k.t==='if'){next();const cond=expr();const then=block(depth+1);let other=null;if(peek().t==='else'){next();other=peek().t==='if'?[statement(depth)]:block(depth+1);}return {k:'if',cond,then,other,line:k.line};}
  if(k.t==='id'&&tk[p+1].t==='('){next();next();const args=[];if(peek().t!==')'){do args.push(expr());while(peek().t===','&&next());}expect(')');expect(';','文末の ;');return {k:'call',name:k.v,args,line:k.line};}
  throw new RuneError(k.line,`「${k.v??''}」から始まる文は書けません（let / if / 命令(...)）`);
 }
 function expr(){return or();}
 function bin(sub,ops){return ()=>{let l=sub();while(ops.includes(peek().t)){const o=next();l={k:'bin',op:o.t,l,r:sub(),line:o.line};}return l;};}
 function or(){return bin(and,['||'])();}
 function and(){return bin(cmp,['&&'])();}
 function cmp(){return bin(add,['==','!=','<','>','<=','>='])();}
 function add(){return bin(mul,['+','-'])();}
 function mul(){return bin(unary,['*','/'])();}
 function unary(){const k=peek();if(k.t==='!'||k.t==='-'){next();return {k:'un',op:k.t,e:unary(),line:k.line};}return primary();}
 function primary(){
  const k=next();
  if(k.t==='num')return {k:'lit',type:'Number',v:k.v,line:k.line};
  if(k.t==='dur')return {k:'lit',type:'Duration',v:k.v,line:k.line};
  if(k.t==='str')return {k:'lit',type:'String',v:k.v,line:k.line};
  if(k.t==='true'||k.t==='false')return {k:'lit',type:'Bool',v:k.t==='true',line:k.line};
  if(k.t==='ally')return {k:'ent',v:'ally',line:k.line};
  if(k.t==='self'||k.t==='target'){if(peek().t==='.'){next();const f=expect('id','項目名');return {k:'field',of:k.t,name:f.v,line:k.line};}return {k:'ent',v:k.t,line:k.line};}
  if(k.t==='id')return {k:'var',name:k.v,line:k.line};
  if(k.t==='('){const e=expr();expect(')');return e;}
  throw new RuneError(k.line,`式が必要です（「${k.v??'終わり'}」があります）`);
 }
}
// ---- type check, limits, score ----
export function compileRune(src){
 try{
  if(typeof src!=='string'||!src.trim())throw new RuneError(1,'コードが空です');
  if(src.length>LIMITS.source)throw new RuneError(1,`コードは${LIMITS.source}文字までです（${src.length}文字）`);
  const rune=parse(src);
  if(!rune.slot)throw new RuneError(rune.line,'slot weapon; か slot armor; を書いてください');
  if(rune.cooldown===undefined)throw new RuneError(rune.line,'cooldown（例：cooldown 5s;）を書いてください');
  if(!Object.keys(rune.events).length)throw new RuneError(rune.line,'on hit などのイベントがありません');
  let score=0,minCool=0;
  for(const [name,ev] of Object.entries(rune.events)){
   const E=EVENTS[name];if(E.slot&&E.slot!==rune.slot)throw new RuneError(ev.line,`on ${name} は slot ${E.slot} の刻印で使います`);
   let count=0,calls=0;const scope=[new Map()];
   const lookup=n=>{for(let i=scope.length-1;i>=0;i--)if(scope[i].has(n))return scope[i].get(n);return undefined;};
   const typeOf=e=>{
    if(e.k==='lit')return e.type;
    if(e.k==='ent'){if(e.v==='target'&&!E.target)throw new RuneError(e.line,`on ${name} では target は使えません`);return 'Entity';}
    if(e.k==='field'){if(e.of==='target'&&!E.target)throw new RuneError(e.line,`on ${name} では target は使えません`);const t=FIELDS[e.of][e.name];if(!t)throw new RuneError(e.line,`${e.of}.${e.name} という項目はありません（${Object.keys(FIELDS[e.of]).map(f=>e.of+'.'+f).join(' / ')}）`);return t;}
    if(e.k==='var'){const v=lookup(e.name);if(!v)throw new RuneError(e.line,`変数「${e.name}」は let で作られていません`);return v.type;}
    if(e.k==='un'){const t=typeOf(e.e);if(e.op==='!'&&t!=='Bool')throw new RuneError(e.line,'! は Bool に使います');if(e.op==='-'&&t!=='Number')throw new RuneError(e.line,'- は Number に使います');return t;}
    const l=typeOf(e.l),r=typeOf(e.r);
    if(['+','-','*','/'].includes(e.op)){if(l!=='Number'||r!=='Number')throw new RuneError(e.line,`${e.op} は Number どうしで使います（${l} と ${r}）`);return 'Number';}
    if(['&&','||'].includes(e.op)){if(l!=='Bool'||r!=='Bool')throw new RuneError(e.line,`${e.op} は Bool どうしで使います`);return 'Bool';}
    if(['<','>','<=','>='].includes(e.op)){if(l!==r||!['Number','Duration'].includes(l))throw new RuneError(e.line,`${e.op} は同じ種類の数どうしで使います（${l} と ${r}）`);return 'Bool';}
    if(l!==r)throw new RuneError(e.line,`${e.op} の左右の種類が違います（${l} と ${r}）`);return 'Bool';
   };
   const check=(body,depth)=>{
    for(const s of body){
     if(++count>LIMITS.statements)throw new RuneError(s.line,`1つのイベントの文は${LIMITS.statements}個までです`);
     if(s.k==='let'){if(lookup(s.name))throw new RuneError(s.line,`変数「${s.name}」はもうあります（let は再代入できません）`);scope.at(-1).set(s.name,{type:typeOf(s.value)});}
     else if(s.k==='if'){if(depth>=LIMITS.depth)throw new RuneError(s.line,`if の入れ子は${LIMITS.depth}段までです`);if(typeOf(s.cond)!=='Bool')throw new RuneError(s.line,'if の条件は Bool（true / false になる式）にしてください');
      scope.push(new Map());check(s.then,depth+1);scope.pop();if(s.other){scope.push(new Map());check(s.other,depth+1);scope.pop();}}
     else{
      const C=COMMANDS[s.name];if(!C)throw new RuneError(s.line,`命令「${s.name}」はありません（${Object.keys(COMMANDS).join(' / ')}）`);
      if(!C.events.includes(name))throw new RuneError(s.line,`${s.name} は ${C.events.map(e=>'on '+e).join(' / ')} の中だけで使えます`);
      const types=[...(C.who?['Entity']:[]),...C.args],sig=`${s.name}(${[...(C.who?[C.who]:[]),...C.args].join(', ')})`;
      if(s.args.length!==types.length)throw new RuneError(s.line,`${s.name} の引数は${types.length}個です：${sig}`);
      s.args.forEach((a,i)=>{if(a.k==='ent'&&a.v==='ally')return;const t=typeOf(a);if(t!==types[i])throw new RuneError(s.line,`${s.name} の${i+1}番目は ${types[i]} です（${t}）　${sig}`);});
      if(C.who&&(s.args[0].k!=='ent'||s.args[0].v!==C.who))throw new RuneError(s.line,`${s.name} の1番目は ${C.who} です`);
      if(!C.who&&s.args.some(a=>a.k==='ent'))throw new RuneError(s.line,`${s.name} に self / target / ally は書きません：${sig}`);
      if(C.who==='ally'&&!['activate'].includes(name))throw new RuneError(s.line,'ally は on activate で使います');
      const vals=s.args.slice(C.who?1:0);
      vals.forEach((lit,i)=>{const n=i+(C.who?2:1);
       if(lit.k!=='lit')throw new RuneError(s.line,`${s.name} の${n}番目はそのままの値（例：2s）で書いてください（強さを検査するため）`);
       if(C.args[i]===S_){if(C.only&&!C.only.includes(lit.v))throw new RuneError(s.line,`${s.name} に使えるのは ${C.only.slice(0,8).map(v=>'"'+v+'"').join(' / ')}${C.only.length>8?' など':''} です`);return;}
       if(lit.v<=0)throw new RuneError(s.line,`${s.name} の${n}番目は0より大きくしてください`);
       if(C.max[i]!==undefined&&lit.v>C.max[i])throw new RuneError(s.line,`${s.name} の${n}番目は${C.max[i]}${C.args[i]==='Duration'?'秒':''}までです`);});
      if(C.part){if(rune.slot!=='armor')throw new RuneError(s.line,`${s.name} は防具（slot armor）の刻印で使います`);if(rune.part&&rune.part!==C.part)throw new RuneError(s.line,`${s.name} は${PART_NAMES[C.part]}用です（この刻印はもう${PART_NAMES[rune.part]}用です）`);rune.part=C.part;}
      if(++calls>LIMITS.calls*4)throw new RuneError(s.line,'命令が多すぎます');
      score+=C.points(vals.map(a=>a.v));minCool=Math.max(minCool,C.cooldown);
     }
    }
   };
   check(ev.body,0);
  }
  if(rune.cooldown<minCool)throw new RuneError(rune.line,`この命令の組み合わせでは cooldown を${minCool}s以上にしてください`);
  if(score>LIMITS.score)throw new RuneError(rune.line,`強さの合計 ${score} 点が上限 ${LIMITS.score} 点を超えています`);
  return {ok:true,rune:{...rune,score}};
 }catch(e){
  if(e instanceof RuneError)return {ok:false,errors:[{line:e.line,message:e.message}]};
  return {ok:false,errors:[{line:0,message:'検査中にエラー：'+e.message}]};
 }
}
/** Runs an event: context {self:{hp,max_hp,stress}, target:{hostile,alive}}. -> {calls:[{name,args}], error?} */
export function runRune(rune,event,context){
 const ev=rune.events[event];if(!ev)return {calls:[]};
 const calls=[],vars=[new Map()];let steps=0;
 const fail=(line,m)=>{throw new RuneError(line,m);};
 const val=e=>{
  if(++steps>LIMITS.steps)fail(e.line,`実行が${LIMITS.steps}ステップを超えました`);
  if(e.k==='lit')return e.v;if(e.k==='ent')return e.v;
  if(e.k==='field'){const v=context[e.of]?.[e.name];if(v===undefined)fail(e.line,`${e.of}.${e.name} の値がありません`);return v;}
  if(e.k==='var'){for(let i=vars.length-1;i>=0;i--)if(vars[i].has(e.name))return vars[i].get(e.name);fail(e.line,'変数がありません');}
  if(e.k==='un')return e.op==='!'?!val(e.e):-val(e.e);
  if(e.op==='&&')return val(e.l)&&val(e.r);if(e.op==='||')return val(e.l)||val(e.r);
  const l=val(e.l),r=val(e.r);
  switch(e.op){case '+':return l+r;case '-':return l-r;case '*':return l*r;
   case '/':if(r===0)fail(e.line,'0で割りました');return l/r;
   case '==':return l===r;case '!=':return l!==r;case '<':return l<r;case '>':return l>r;case '<=':return l<=r;case '>=':return l>=r;}
 };
 const exec=body=>{for(const s of body){
  if(++steps>LIMITS.steps)fail(s.line,`実行が${LIMITS.steps}ステップを超えました`);
  if(s.k==='let'){const v=val(s.value);if(typeof v==='number'&&!Number.isFinite(v))fail(s.line,'数が有限ではありません');vars.at(-1).set(s.name,v);}
  else if(s.k==='if'){vars.push(new Map());if(val(s.cond))exec(s.then);else if(s.other)exec(s.other);vars.pop();}
  else{if(calls.length>=LIMITS.calls)fail(s.line,`1回の発動で命令は${LIMITS.calls}回までです`);calls.push({name:s.name,args:s.args.map(val)});}
 }};
 try{exec(ev.body);return {calls};}catch(e){return {calls:[],error:{line:e.line,message:e.message}};}
}
/** The code without comments, spacing and its name: the same rune written differently counts as one (first research XP). */
export function normalizeRune(src){
 try{return tokenize(src).filter((t,i,a)=>!(a[i-1]?.t==='rune'&&t.t==='str')).map(t=>t.t==='str'||t.t==='num'||t.t==='dur'||t.t==='id'?t.t+':'+t.v:t.t).join(' ');}catch{return '';}
}
export const SAMPLES=[
 {name:'狩人の印',code:'rune "狩人の印" {\n  slot weapon;\n  cooldown 5s;\n\n  on hit {\n    if target.hostile {\n      mark(target, 3s);\n    }\n  }\n}'},
 {name:'火花',code:'rune "火花" {\n  slot weapon;\n  cooldown 8s;\n\n  on hit {\n    if target.hostile && target.alive {\n      ignite(target, 2s);\n    }\n  }\n}'},
 {name:'凱旋',code:'rune "凱旋" {\n  slot weapon;\n  cooldown 30s;\n\n  on kill {\n    let tired = self.stress >= 20;\n    if target.hostile && tired {\n      calm(self, 2);\n    }\n  }\n}'},
 {name:'浄化の衣',code:'rune "浄化の衣" {\n  slot armor;\n  cooldown 60s;\n\n  on hurt {\n    let ratio = self.hp / self.max_hp;\n    if ratio <= 0.30 {\n      cleanse(self, "poison");\n    }\n  }\n}'},
 // Notion「先に作るおすすめ10個」
 {name:'霜縛り',code:'rune "霜縛り" {\n  slot weapon;\n  cooldown 12s;\n\n  on hit {\n    if target.hostile {\n      chill(target, 2s);\n    }\n  }\n}'},
 {name:'雷紋',code:'rune "雷紋" {\n  slot weapon;\n  cooldown 15s;\n\n  on hit {\n    if target.hostile && target.alive {\n      spark(target, 2);\n    }\n  }\n}'},
 {name:'残響斬',code:'rune "残響斬" {\n  slot weapon;\n  cooldown 15s;\n\n  on hit {\n    if target.hostile {\n      echo(target, 1, 1s);\n    }\n  }\n}'},
 {name:'命のしずく',code:'rune "命のしずく" {\n  slot weapon;\n  cooldown 30s;\n\n  on kill {\n    if self.hp < self.max_hp {\n      heal(self, 2);\n    }\n  }\n}'},
 {name:'消し炭',code:'rune "消し炭" {\n  slot armor;\n  cooldown 25s;\n\n  on hurt {\n    if self.on_fire {\n      douse(self);\n    }\n  }\n}'},
 {name:'帰路の針',code:'rune "帰路の針" {\n  slot armor;\n  cooldown 10s;\n\n  on activate {\n    waypoint(self);\n  }\n}'},
 {name:'救護の灯',code:'rune "救護の灯" {\n  slot weapon;\n  cooldown 45s;\n\n  on activate {\n    aid(ally, 2);\n  }\n}'},
 {name:'足跡の糸',code:'rune "足跡の糸" {\n  slot armor;\n  cooldown 30s;\n\n  on activate {\n    trail(self, 30s, 10);\n  }\n}'},
 {name:'鮮度の目利き',code:'rune "鮮度の目利き" {\n  slot armor;\n  cooldown 10s;\n\n  on activate {\n    food_inspect(self);\n  }\n}'},
 {name:'祝福の紙吹雪',code:'rune "祝福の紙吹雪" {\n  slot armor;\n  cooldown 20s;\n\n  on activate {\n    confetti(self, 2s);\n  }\n}'}
];
