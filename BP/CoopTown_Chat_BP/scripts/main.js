import {world,system} from '@minecraft/server';

// CoopTown チャット BP: chat lines become "<job icon> name : text". The icon comes from the player's tag
// "ctjobicon:<icon>", which the CoopTown 手帳メニュー BP keeps up to date (scripts/chat-runtime.js); no tag, no icon.
// The chat event is a beta API: the world needs the "Beta APIs" experiment. Commands (/...) are left alone.
const ICON_TAG='ctjobicon:';
const iconOf=player=>{try{return player.getTags().find(t=>t.startsWith(ICON_TAG))?.slice(ICON_TAG.length)??'';}catch{return '';}};
export const chatLine=(name,icon,text)=>`${icon?icon+'　 ':''}${name} §7:§r ${text}`;
world.beforeEvents.chatSend.subscribe(event=>{
 const {sender,message}=event;
 if(!sender||message.startsWith('/'))return;
 event.cancel=true;
 const line=chatLine(sender.name,iconOf(sender),message);
 system.run(()=>{try{world.sendMessage(line);}catch(e){console.warn('[CoopTown チャット] '+e);}});
});
