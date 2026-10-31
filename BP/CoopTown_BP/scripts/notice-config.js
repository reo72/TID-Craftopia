// お知らせ (asked 2026-10-27): staff post notices to everyone or to chosen players, optionally with items; each player
// sees them in the book (お知らせ), hears about unread ones when they come in, and takes the items once.
// db.notices: [{id, at, by, title, text, to (null: everyone, else [player ids]), items [[id, n]], read [ids], claimed [ids]}]
export const NOTICE={keep:60,title:30,text:300,items:4,maxAmount:64*36};
/** The notices a player can see, newest first. */
export const noticesFor=(db,id)=>(db.notices??[]).filter(n=>!n.to||n.to.includes(id)).sort((a,b)=>b.at-a.at);
export const unreadFor=(db,id)=>noticesFor(db,id).filter(n=>!(n.read??[]).includes(id)||(n.items?.length&&!(n.claimed??[]).includes(id)));
/** Adds a notice (staff); returns it. */
export function postNotice(db,{by,title,text,to=null,items=[]},time=Date.now()){
 db.notices??=[];db.noticeSeq=(db.noticeSeq??0)+1;
 const n={id:db.noticeSeq,at:time,by:String(by).slice(0,20),title:String(title).trim().slice(0,NOTICE.title)||'お知らせ',text:String(text??'').trim().slice(0,NOTICE.text),
  to:to&&to.length?[...new Set(to)]:null,items:items.filter(([id,c])=>typeof id==='string'&&c>0).slice(0,NOTICE.items).map(([id,c])=>[id,Math.min(NOTICE.maxAmount,Math.floor(c))]),read:[],claimed:[]};
 db.notices.unshift(n);if(db.notices.length>NOTICE.keep)db.notices.length=NOTICE.keep;return n;
}
/** Engine actions notice.read / notice.claim (game-engine.js). */
export function applyNotice(action,a,{db,p,id,items,demand}){
 if(action!=='notice.read'&&action!=='notice.claim')return undefined;
 const n=noticesFor(db,id).find(x=>x.id===a.id);demand(n,'お知らせが見つかりません。');
 n.read??=[];if(!n.read.includes(id))n.read.push(id);
 if(action==='notice.read')return '';
 demand(n.items?.length,'このお知らせにアイテムはありません。');n.claimed??=[];demand(!n.claimed.includes(id),'受取済みです。');
 n.claimed.push(id);items.give=n.items.map(([i,c])=>[i,c]);return 'アイテムを受け取りました。';
}
