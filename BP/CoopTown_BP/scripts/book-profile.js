import {noticeDialog,confirmDialog} from './dialog.js';
import {game,refreshGame} from './game-runtime.js';
import {CODEX} from './game-config.js';
import {mapSettings,saveMapSettings,SIZES} from './minimap.js';
import {prefs,savePrefs,pageSound,DEFAULT_PREFS} from './prefs.js';
import {refreshBgm} from './town-bgm.js';
import {playSeconds,playTimeText} from './playtime.js';
import {runList,titlesModel,codexModel,titleBadge} from './book-pages.js';
import {BOOK_TABS,TAB_TARGET,BOOK_ICON,OLD_ICON,comma,step,showPage,JOB_ICON,JOB_SKILL,SKILL_NAME} from './book-frame.js';

// ---- マイプロフィール (ct:book:profile; RP: PROFILE_SLOTS in build-book-ui.mjs) ----
const HIDE='ct:-|';
const jobLines=(p,job,label)=>{
 if(!job||job==='未選択')return [['ct:d_jb|'+label+'：'+(label==='主職業'?'ニート':'なし')],['ct:d_jx|'+(label==='主職業'?'職業ページで職業を選べます':'Lv.20で第二職業を選べます')],[HIDE]];
 const s=p[JOB_SKILL[job]]??{level:1,xp:0,max:100};
 return [['ct:d_jb|'+`${label}：${job}　Lv.${s.level}`,BOOK_ICON+JOB_ICON[job]],['ct:d_jx|'+`${SKILL_NAME[JOB_SKILL[job]]}経験値　${comma(s.xp)} / ${comma(s.max)}`],['ct:d_jbr|'+step(s.xp/Math.max(1,s.max))]];
};
/** The profile page's buttons for a player and their saved data p. */
export function profileButtons(player,p){
 // the three skills (採掘 / 採取 / クラフト): level, xp and a bar
 const skill=(key,label,icon)=>{const s=p[key]??{level:1,xp:0,max:100};return [['ct:d_cx|'+`${label} Lv.${s.level}\n${comma(s.xp)} / ${comma(s.max)}`,BOOK_ICON+icon],['ct:d_cxb|'+step(s.xp/Math.max(1,s.max))]];};
 return [
  ['ct:d_pn|'+player.name],['ct:d_title|'+(p.title??''),p.title?titleBadge(p.title):undefined],
  ...jobLines(p,p.job,'主職業'),...jobLines(p,p.secondJob,'副職業'),
  ['ct:wa|称号を変更'],
  ['ct:rc|'+`図鑑登録\n${Object.keys(p.codex??{}).length} / ${CODEX.length}`,BOOK_ICON+'encyclopedia'],
  ['ct:rc|'+`依頼達成\n${comma(p.stats?.questsCompleted)} 件`,BOOK_ICON+'scroll'],
  ['ct:rc|'+`デイリー達成\n${comma(p.stats?.dailies)} 回`,BOOK_ICON+'calendar'],
  ['ct:rc|'+`累計プレイ時間\n${playTimeText(playSeconds(player))}`,BOOK_ICON+'clock'],
  ...skill('mine','採掘','miner'),...skill('gather','採取','farmer'),...skill('craft','クラフト','blacksmith'),
  ['ct:act|図鑑を見る',BOOK_ICON+'encyclopedia'],['ct:act|依頼を見る',BOOK_ICON+'scroll']];
}
// slots after the bookmarks (RP PROFILE_SLOTS minus 4)
const P_AT={changeTitle:8,codexButton:19,questButton:20};
/** The profile page; openQuests opens the quest page. Resolves to where to go next. */
export async function openProfilePage(player,{openQuests}){
 while(true){
  refreshGame(player);
  const p=game.snapshot(player.id).player;
  const i=await showPage(player,'profile',profileButtons(player,p));
  if(i===undefined)return 'close';
  if(i<BOOK_TABS.length){if(TAB_TARGET[i]!=='profile')return TAB_TARGET[i];continue;}
  const k=i-BOOK_TABS.length;
  let to='profile';
  if(k===P_AT.changeTitle)to=await runList(player,titlesModel,'list_person');
  else if(k===P_AT.codexButton)to=await runList(player,codexModel,'list_person');
  else if(k===P_AT.questButton)to=await openQuests(player);
  if(to!=='profile'&&to!=='home')return to;
  if(to==='home')return 'home';
 }
}

// ---- 設定 (ct:book:settings; RP: SETTINGS_SLOTS in build-book-ui.mjs) ----
const HUD_ROWS=[['profile','プロフィール\n自分の情報を表示します',BOOK_ICON+'profile'] /* RP tools/build-profile-icon.py */,['wallet','所持金・銀行\nお金の情報を表示します',BOOK_ICON+'coins'],
 ['quest','追跡中の依頼\n進行中の依頼を表示します',BOOK_ICON+'scroll'],['location','バイオーム・座標\n現在地を表示します',BOOK_ICON+'compass']];
const NOTICE_ROWS=[['codex','図鑑の登録通知\n新しく図鑑に登録したとき',BOOK_ICON+'encyclopedia'],['titles','称号の獲得通知\n新しく称号を獲得したとき',BOOK_ICON+'medal'],
 ['events','イベントのお知らせ\nイベントが始まったとき',BOOK_ICON+'lantern']];
const SIZE_LABELS=['小','標準','大'];
/** The settings page's buttons for a player. */
export function settingsButtons(player){
 const pr=prefs(player),size=mapSettings(player).size,on=v=>v?'ct:on|':'ct:off|';
 return [
  ...HUD_ROWS.map(([,t,ic])=>['ct:sr|'+t,ic]),...HUD_ROWS.map(([k])=>[on(pr.hud[k])]),
  ...SIZE_LABELS.map((l,i)=>[(i===size?'ct:ts|':'ct:t|')+l]),
  ...NOTICE_ROWS.map(([,t,ic])=>['ct:sr|'+t,ic]),...NOTICE_ROWS.map(([k])=>[on(pr.notify[k])]),
  ['ct:vd|'],['ct:vu|'],['ct:d_vb|'+step(pr.volume/100)],['ct:d_vv|'+pr.volume+'%'],
  ['ct:act|初期設定に戻す',BOOK_ICON+'clock'],['ct:act|保存する',BOOK_ICON+'medal'],
  ['ct:vd|'],['ct:vu|'],['ct:d_vb|'+step(pr.bgmVolume/100)],[on(pr.bgm)]]; // the town music (town-bgm.js)
}
// slots after the bookmarks (RP SETTINGS_SLOTS minus 4)
const S_AT={hudChecks:4,size:8,noticeChecks:14,volDown:17,volUp:18,reset:21,save:22,bgmDown:23,bgmUp:24,bgmCheck:26};
/** The settings page. Settings apply at once; 保存する confirms and goes home. Resolves to where to go next. */
export async function openSettingsPage(player){
 while(true){
  const i=await showPage(player,'settings',settingsButtons(player));
  if(i===undefined)return 'close';
  if(i<BOOK_TABS.length){if(TAB_TARGET[i]!=='settings')return TAB_TARGET[i];continue;}
  const k=i-BOOK_TABS.length,pr=prefs(player);
  if(k>=S_AT.hudChecks&&k<S_AT.hudChecks+4){const key=HUD_ROWS[k-S_AT.hudChecks][0];pr.hud[key]=!pr.hud[key];savePrefs(player,pr);}
  else if(k>=S_AT.size&&k<S_AT.size+3)saveMapSettings(player,{...mapSettings(player),size:k-S_AT.size});
  else if(k>=S_AT.noticeChecks&&k<S_AT.noticeChecks+3){const key=NOTICE_ROWS[k-S_AT.noticeChecks][0];pr.notify[key]=!pr.notify[key];savePrefs(player,pr);}
  else if(k===S_AT.volDown||k===S_AT.volUp){pr.volume=Math.max(0,Math.min(100,pr.volume+(k===S_AT.volUp?10:-10)));savePrefs(player,pr);pageSound(player);}
  else if(k===S_AT.bgmDown||k===S_AT.bgmUp){pr.bgmVolume=Math.max(0,Math.min(100,pr.bgmVolume+(k===S_AT.bgmUp?10:-10)));savePrefs(player,pr);refreshBgm(player);}
  else if(k===S_AT.bgmCheck){pr.bgm=!pr.bgm;savePrefs(player,pr);refreshBgm(player);}
  else if(k===S_AT.reset){
   if(await confirmDialog(player,'初期設定に戻す','表示・通知・通知音・BGMの設定を最初の状態に戻します。',{ok:'戻す'})){savePrefs(player,DEFAULT_PREFS);saveMapSettings(player,{...mapSettings(player),size:1});refreshBgm(player);}
  }else if(k===S_AT.save){
   return await noticeDialog(player,'設定','設定を保存しました。\n（設定は変更した時点で保存されています）',{close:'ホームへ'})?'home':'close';
  }
 }
}
