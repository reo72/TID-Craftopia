// "!link ABC123" in chat links the player to their Discord account on the site.
// The chat message is cancelled so nobody else sees the code. Not retried automatically.
import {world,system} from '@minecraft/server';
import {send} from './http.js';
import {markLinked} from './gate.js';

const tell=(player,text)=>{try{if(player.isValid)player.sendMessage(text);}catch{}};
async function link(player,code){
 tell(player,'§7サイトと連携しています…');
 const {status,data}=await send('POST','/api/game/link',{code,xuid:player.id,gamertag:player.name});
 if(status===200){tell(player,`§aDiscord『${data?.discordUsername??'?'}』と連携しました。サイトを再読み込みしてください。`);if(player.isValid)markLinked(player);}
 else if(status===404)tell(player,'§cコードが違うか期限切れ（10分）です。マイページで新しいコードを出してください。');
 else if(status===409){tell(player,'§cこのプレイヤーは別の Discord と連携済みです。管理者に相談してください。');if(player.isValid)markLinked(player);} // linked on the site already: may play
 else if(status===400)tell(player,'§cコードの形式が正しくありません。マイページに表示されたコードを入力してください。');
 else if(status===401||status===403)tell(player,'§cサイト連携の設定に問題があります。管理者に連絡してください。');
 else tell(player,'§eサイトに接続できません。少し待ってから再入力してください。');
}
export function installLink(){
 world.beforeEvents.chatSend.subscribe(event=>{
  const text=event.message.trim();
  if(!/^!link(\s|$)/i.test(text))return;
  event.cancel=true; // keep the code private
  const player=event.sender,m=text.match(/^!link\s+([A-Za-z0-9]{1,32})$/i);
  system.run(()=>m?void link(player,m[1].toUpperCase()):tell(player,'§e使い方：!link コード（マイページに表示された英数字）'));
 });
}
