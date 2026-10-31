// Sample buttons of the book's フレンド page for RP tools/preview-ui.py: node --import ./register.mjs friend_preview.mjs <BP scripts> <out json>
import {pathToFileURL} from 'url';import path from 'path';import fs from 'fs';
const dir=process.argv[2];const load=f=>import(pathToFileURL(path.join(dir,f)).href);
const {friendApi}=await load('friend-runtime.js');const {friendButtons}=await load('friend-book.js');const {BOOK_TABS}=await load('book-frame.js');
const H=3600000,now=Date.now();
const friends=[{id:'h',name:'Haru',job:'農家',level:12,title:'畑の守り人',unread:2,seen:now},{id:'s',name:'Sora',job:'釣り師',level:8,seen:now},{id:'y',name:'Yuki',job:'鍛冶師',level:20,seen:now},{id:'r',name:'Ren',job:'冒険家',level:5,seen:now-5*H}];
Object.assign(friendApi,{data:()=>({friends,requests:[{id:'k',name:'Kai',job:'料理人'}],coins:100,known:()=>true,view:()=>undefined}),online:id=>id!=='r'?{id}:undefined,addable:()=>[],ago:()=>'5時間前',
 where:(p,f)=>f.id==='r'?'最終ログイン 10/27 9:00（5時間前）':'ログイン中 35分　北東へ42m'});
const buttons=[...BOOK_TABS.map(([id,l])=>[`ct:${id}|${l}`,null]),...friendButtons({name:'me'},{tab:0,sel:0,page:0,query:''}).map(([t,i])=>[t,i??null])];
fs.writeFileSync(process.argv[3],JSON.stringify({title:'ct:book:friends',buttons}));console.log('buttons',buttons.length);
