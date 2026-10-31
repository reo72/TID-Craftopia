// Job dailies (Notion: each job's デイリー). Three a day for the main job, after the common ones on the daily page.
// key: what counts (the job features call 'job.count' with it); target: how many. Tasks that need luck (a rare fish,
// a rare dish) take an easier alternative too (alt: [key, target]) so a day never hangs on luck.
export const JOB_DAILY={
 // 冒険家: exploring and fighting (2026-10-30: mining and woodcutting went to 鉱夫 / 木こり)
 '冒険家':[['異なる敵種を討伐する','kill_kinds',3],['バイオームを訪れる','biome',3],['調査報告書を提出する','report',1],['強い敵モブを倒す','strong_kill',1,['kill_kinds',5]],['討伐品をNPCに売る','sell_loot',5]],
 '鉱夫':[['鉱石を掘る','mine_ore',20],['石材を掘る','mine_stone',64],['砥石で鉱石を選別する','sort_ore',8]],
 '木こり':[['原木を伐る','chop_log',32],['製材台で板材などを作る','saw',16],['木炭を作る','charcoal',8]],
 // 農家 (畜産農家 merged in): crops and animals
 '農家':[['作物を収穫する','harvest',20],['登録動物の世話をする','care',3],['畜産物を集める','product',3]],
 '釣り師':[['釣りをする','fish',5],['レア以上の魚を釣る','rare_fish',1,['fish',12]],['NPCに魚を売る','sell_fish',5]],
 '鍛冶師':[['鉱石を精錬する','smelt',8],['装備を作る','forge',1],['装備を修理する','repair',1],['職人依頼を納品する','commission',1]],
 '料理人':[['料理を作る','cook',4],['ランクB以上の料理を作る','good_dish',1,['cook',10]],['NPCに料理を売る','sell_food',5]],
 '付与術師':[['装備や本にエンチャントする','enchant',1],['刻印を試作する','rune_try',1],['本棚に本を預ける','shelf',1]],
 '調合師':[['ポーションを作る','brew',3],['大釜で実験する','experiment',2],['NPCにポーションを売る','sell_potion',3]]};
export const JOB_COUNT_KEYS=new Set(Object.values(JOB_DAILY).flat().flatMap(t=>[t[1],t[3]?.[0]].filter(Boolean)));
export const JOB_DAILY_REWARD={coins:120,xp:40};
/** Done: the main target, or the alternative. */
export const jobTaskDone=(task,counts)=>(counts['j:'+task[1]]??0)>=task[2]||(task[3]&&(counts['j:'+task[3][0]]??0)>=task[3][1]);
