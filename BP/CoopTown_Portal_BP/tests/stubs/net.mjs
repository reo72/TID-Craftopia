// Fake @minecraft/server-net: requests go to globalThis.__site(method, path, body) -> {status, body}.
export const HttpRequestMethod={Get:'Get',Post:'Post'};
export class HttpHeader{constructor(key,value){this.key=key;this.value=value;}}
export class HttpRequest{constructor(uri){this.uri=uri;this.method='Get';this.headers=[];this.body='';this.timeout=10;}}
export const http={
 log:[],
 async request(req){
  const url=new URL(req.uri),body=req.body?JSON.parse(req.body):undefined;
  this.log.push({method:req.method,path:url.pathname+url.search,body,auth:req.headers.find(h=>h.key==='Authorization')?.value});
  await Promise.resolve();
  const r=globalThis.__site(req.method,url.pathname,body,url.searchParams);
  if(r instanceof Error)throw r;
  return {status:r.status,body:r.body===undefined?'':JSON.stringify(r.body),headers:[]};
 }
};
