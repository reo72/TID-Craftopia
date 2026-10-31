// Talking to the site. send() makes one request; enqueue() stores a send in a world property and keeps
// retrying it until the site answers (the free plan sleeps, so the first requests often fail).
// 400 / 404 / 409 are never retried: sending the same thing again can't fix them.
import {system} from '@minecraft/server';
import {http,HttpRequest,HttpHeader,HttpRequestMethod} from '@minecraft/server-net';
import {secrets,variables} from '@minecraft/server-admin';
import {CONFIG} from './config.js';
import {load,save} from './store.js';

let active=0;const waiting=[];
const acquire=()=>active<CONFIG.maxConcurrent?(active++,Promise.resolve()):new Promise(resolve=>waiting.push(resolve));
const release=()=>{const next=waiting.shift();if(next)next();else active--;}; // the slot passes straight to the next waiter

function settings(){
 let base,key;
 try{base=variables.get('portal_url');}catch{}
 try{key=secrets.get('game_api_key');}catch{}
 return {base:typeof base==='string'?base.replace(/\/+$/,''):undefined,key};
}
export function configured(){const s=settings();return !!(s.base&&s.key);}
let warned=false;

/** One request. Resolves to {status, data}; status 0 means it never reached the site. Never throws. */
export async function send(method,path,body){
 const {base,key}=settings();
 if(!base||!key){if(!warned){warned=true;console.warn('[Portal] variables.json の portal_url か secrets.json の game_api_key がありません。サイト連携は動きません。');}return {status:0,error:'not_configured'};}
 await acquire();
 try{
  const req=new HttpRequest(base+path);
  req.method=method==='GET'?HttpRequestMethod.Get:HttpRequestMethod.Post;
  req.headers=[new HttpHeader('Authorization',key),new HttpHeader('Content-Type','application/json')];
  if(body!==undefined)req.body=JSON.stringify(body);
  req.timeout=CONFIG.timeoutSec;
  const res=await http.request(req);
  let data;try{data=res.body?JSON.parse(res.body):undefined;}catch{data=undefined;}
  if(res.status===401)console.warn('[Portal] 401：API キーがサイトと一致しません（secrets.json の game_api_key を確認）。');
  if(res.status===400)console.warn(`[Portal] 400 ${path}: ${res.body?.slice(0,300)}`);
  return {status:res.status,data};
 }catch(e){return {status:0,error:String(e)};}
 finally{release();}
}
export const ok=status=>status>=200&&status<300;
const FINAL=new Set([400,404,409]);

// ---- stored sends ----
let queue=null;const handlers=new Map(),inFlight=new Set();let seq=0;
const q=()=>queue??=load(CONFIG.queueKey,[]);
const persist=()=>{try{save(CONFIG.queueKey,q());}catch(e){console.warn('[Portal] 送信待ちの保存に失敗: '+e);}};
/** What to do when a stored send of this kind finishes: handler(entry, {status,data}, delivered). */
export function onFinished(kind,handler){handlers.set(kind,handler);}
/** Store a POST and send it as soon as possible. replaceKey: an older unsent entry with the same key is dropped. */
export function enqueue(kind,path,body,{replaceKey,meta}={}){
 const list=q();
 if(replaceKey){const i=list.findIndex(e=>e.replaceKey===replaceKey&&!inFlight.has(e.id));if(i>=0)list.splice(i,1);}
 list.push({id:`${Date.now().toString(36)}-${(seq++).toString(36)}`,kind,path,body,replaceKey,meta,tries:0,next:0});
 while(list.length>CONFIG.queueMax){const i=list.findIndex(e=>e.kind==='logs'&&!inFlight.has(e.id));if(i<0)break;list.splice(i,1);console.warn('[Portal] 送信待ちが多すぎるため、古い行動ログを破棄しました。');}
 persist();pump();
}
function finish(entry,result,delivered){
 const list=q(),i=list.findIndex(e=>e.id===entry.id);if(i>=0)list.splice(i,1);persist();
 try{handlers.get(entry.kind)?.(entry,result,delivered);}catch(e){console.warn(`[Portal] ${entry.kind} の後処理でエラー: ${e}`);}
}
function pump(){
 const now=Date.now();
 for(const entry of q()){
  if(inFlight.size>=CONFIG.maxConcurrent)break;
  if(inFlight.has(entry.id)||entry.next>now)continue;
  inFlight.add(entry.id);
  send('POST',entry.path,entry.body).then(result=>{
   inFlight.delete(entry.id);
   if(ok(result.status))finish(entry,result,true);
   else if(FINAL.has(result.status))finish(entry,result,false);
   else{entry.tries++;entry.next=Date.now()+Math.min(CONFIG.retryMaxMs,CONFIG.retryBaseMs*2**Math.min(entry.tries-1,10));persist();}
  });
 }
}
export function startQueue(){system.runInterval(pump,40);}
export const pendingCount=()=>q().length;
