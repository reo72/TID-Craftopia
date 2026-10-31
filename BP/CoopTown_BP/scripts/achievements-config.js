// Achievement titles (design doc 5: 職業別の称号). Each entry is checked after every action; when its test
// passes for the first time the title is added to p.titles (owned) and announced. Numbers are first drafts.
// Counters live in p.stats: crafts, gathered, mined, townDonations, questsCompleted, deliveries, mentored, special.
import {CODEX} from './game-config.js';
import {awardDesignTitles} from './titles-config.js';

const stat=(p,k)=>Number.isSafeInteger(p.stats?.[k])?p.stats[k]:0;
const codexOf=category=>CODEX.filter(v=>v[2]===category).map(v=>v[0]);
const registered=(p,ids)=>ids.filter(id=>p.codex?.[id]).length;
const hasJob=(p,job)=>p.job===job||p.secondJob===job;

export const ACHIEVEMENTS=[
 // growth
 {id:'first_job',title:'新米',hint:'職業を選ぶ',test:p=>p.job&&p.job!=='未選択'},
 {id:'level_10',title:'一人前',hint:'プレイヤーLv.10になる',test:p=>p.level>=10},
 {id:'level_30',title:'熟練者',hint:'プレイヤーLv.30になる',test:p=>p.level>=30},
 {id:'level_50',title:'達人',hint:'プレイヤーLv.50になる',test:p=>p.level>=50},
 {id:'second_job',title:'二刀流',hint:'第2職業を取得する',test:p=>!!p.secondJob},
 // work
 {id:'gather_5',title:'街の採集家',hint:'採取Lv.5になる',test:p=>p.gather?.level>=5},
 {id:'mine_5',title:'頼れる鉱夫',hint:'採掘Lv.5になる',test:p=>p.mine?.level>=5},
 {id:'gather_500',title:'採取名人',hint:'採取を500回する',test:p=>stat(p,'gathered')>=500},
 {id:'mine_500',title:'採掘名人',hint:'採掘を500回する',test:p=>stat(p,'mined')>=500},
 {id:'craft_100',title:'職人見習い',hint:'クラフト台で100回製作する',test:p=>stat(p,'crafts')>=100},
 {id:'craft_1000',title:'名工',hint:'クラフト台で1000回製作する',test:p=>stat(p,'crafts')>=1000},
 {id:'special_10',title:'目利き',hint:'職業の特別な素材を10個見つける',test:p=>stat(p,'special')>=10},
 {id:'special_100',title:'秘宝の探求者',hint:'職業の特別な素材を100個見つける',test:p=>stat(p,'special')>=100},
 // cooperation
 {id:'quest_10',title:'頼れる人',hint:'依頼を10回達成する',test:p=>stat(p,'questsCompleted')>=10},
 {id:'quest_50',title:'街の便利屋',hint:'依頼を50回達成する',test:p=>stat(p,'questsCompleted')>=50},
 {id:'town_10',title:'街づくりの一員',hint:'街へ10回納品する',test:p=>stat(p,'townDonations')>=10},
 {id:'town_100',title:'街の礎',hint:'街へ100回納品する',test:p=>stat(p,'townDonations')>=100},
 {id:'mentor_5',title:'よき先輩',hint:'見習いを5回指導する',test:p=>stat(p,'mentored')>=5},
 // codex
 {id:'codex_10',title:'図鑑の入門者',hint:'図鑑を10種類登録する',test:p=>Object.keys(p.codex??{}).length>=10},
 {id:'codex_friendly',title:'動物博士',hint:'友好モブをすべて登録する',test:p=>{const ids=codexOf('友好モブ');return ids.length&&registered(p,ids)===ids.length;}},
 {id:'codex_hostile',title:'討伐の名手',hint:'敵モブをすべて登録する',test:p=>{const ids=codexOf('敵モブ');return ids.length&&registered(p,ids)===ids.length;}},
 // job masters: the job plus its main skill at Lv.20
 {id:'master_lumberjack',title:'森の守り手',hint:'木こりで採取Lv.20になる',test:p=>hasJob(p,'木こり')&&p.gather?.level>=20},
 {id:'master_miner',title:'鉱脈の主',hint:'鉱夫で採掘Lv.20になる',test:p=>hasJob(p,'鉱夫')&&p.mine?.level>=20},
 {id:'master_farmer',title:'豊穣の担い手',hint:'農家で採取Lv.20になる',test:p=>hasJob(p,'農家')&&p.gather?.level>=20},
 {id:'master_smith',title:'鉄の匠',hint:'鍛冶師でクラフトLv.20になる',test:p=>hasJob(p,'鍛冶師')&&p.craft?.level>=20},
 {id:'master_cook',title:'食卓の魔術師',hint:'料理人でクラフトLv.20になる',test:p=>hasJob(p,'料理人')&&p.craft?.level>=20},
 {id:'master_enchanter',title:'魔導の探究者',hint:'付与術師でクラフトLv.20になる',test:p=>hasJob(p,'付与術師')&&p.craft?.level>=20},
 {id:'master_fisher',title:'海の申し子',hint:'釣り師で採取Lv.20になる',test:p=>hasJob(p,'釣り師')&&p.gather?.level>=20}
];

/** Adds titles whose condition is met for the first time. Returns the new titles (names). */
export function awardTitles(p,db){
 p.achievements??=[];p.titles??=[];
 if(typeof p.title==='string'&&p.title&&!p.titles.includes(p.title))p.titles.push(p.title); // worn before the list existed
 const fresh=[];
 for(const a of ACHIEVEMENTS){
  if(p.achievements.includes(a.id))continue;
  let ok=false;try{ok=!!a.test(p);}catch{}
  if(!ok)continue;
  p.achievements.push(a.id);
  if(!p.titles.includes(a.title))p.titles.push(a.title);
  fresh.push(a.title);
 }
 fresh.push(...awardDesignTitles(p,db)); // the design's titles (titles-config.js)
 if(!p.title&&fresh.length)p.title=fresh[0]; // the first title is worn right away
 return fresh;
}
