import {ACHIEVEMENTS} from './achievements-config.js';
import {JOBS,PRIZES} from './game-config.js';

// Top-left profile (name, job, CoopTown level, title). The RP draws every job name and title as a picture
// (CoopTown_RP/tools/build-profile.py reads these lists), so rebuild the RP after changing them.
export const PROFILE_JOBS=JOBS;
export const PROFILE_TITLES=[...new Set([...ACHIEVEMENTS.map(a=>a.title),...PRIZES.filter(p=>p.title).map(p=>p.title)])];
// the worn title's rank for the HUD badge (3 bits): 1-6 = ブロンズ … アセンデッド, 7 = 特別 (anything else)
import {TITLES,TITLE_RANKS} from './titles-config.js';
export const titleRankNumber=title=>{const t=TITLES.find(x=>x.title===title);const i=t?TITLE_RANKS.indexOf(t.rank):-1;return i>=0?i+1:7;};
// the HUD marks hold 5 bits of title number
export const PROFILE_TITLE_SLOTS=32;
if(PROFILE_TITLES.length>PROFILE_TITLE_SLOTS)throw new Error('profile: too many titles for the HUD marks');
