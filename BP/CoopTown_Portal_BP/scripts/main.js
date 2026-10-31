// CoopTown site link pack. Separate from the main pack so the game runs without the site; only this pack
// needs the network, the API key and the beta APIs.
import {startQueue,configured} from './http.js';
import {installLink} from './link.js';
import {installGate} from './gate.js';
import {installPlayers} from './players.js';
import {installBestiary} from './bestiary.js';
import {installQuests} from './quests.js';
import {installTown} from './town.js';
import {installLogs} from './logs.js';
import {installDiscord} from './discord.js';

const parts=[['送信キュー',startQueue],['連携',installLink],['連携チェック',installGate],['プレイヤー同期',installPlayers],['図鑑',installBestiary],['依頼',installQuests],['街',installTown],['行動ログ',installLogs],['Discord',installDiscord]];
for(const [name,install] of parts){try{install();}catch(e){console.warn(`[Portal] ${name}の起動に失敗しました: ${e}`);}}
console.warn(`[Portal] サイト連携を開始しました（設定：${configured()?'OK':'portal_url / game_api_key が未設定'}）`);
