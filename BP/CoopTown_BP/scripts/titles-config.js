// The titles of the design (Confluence 称号 folder, read 2026-10-27): ランク概要, 共通, and one page per job (農家・畜産,
// 釣り師, 鍛冶師, 料理人, 調合師, 付与術師, 冒険家（狩人）, 鉱夫, 林業). Numbers and names are the doc's (some marked 仮 there).
// Ranks: ブロンズ / シルバー / ゴールド / エピック / レジェンド / アセンデッド; a job's title of a rank needs the job (main or
// second) and its job level (RANK_LEVEL). 共通 titles need no job.
// Conditions read the player's lifetime counters p.tally and seen-sets p.seen (game-engine.js title.track / job.count /
// workbench.craft ..., filled by title-hooks.js and the job features through job-count.js), the codex and the level.
// A title whose system is not in the game yet is 準備中 (pending: shown, not earnable). マイスター (a rank's every
// earnable title of the job) and アセンデッド (使徒: the first player on the server only; 極めし者: after them) are built
// from the lists. When two titles share a name, the job is added: 見習い卒業（農家）.
import {CODEX} from './game-config.js';
import {FISH_SPECIES} from './fish-species.js';
import {COOK_RECIPES} from './cook-config.js';
import {SMOKE_RECIPES} from './smoke-config.js';
import {isStarter} from './cook-knowledge.js';
// the cooking recipes that have to be learned (cook-knowledge.js), for 料理の鉄人
const COOK_LEARNABLE=[...COOK_RECIPES,...SMOKE_RECIPES].filter(r=>!isStarter(r)).length;

export const TITLE_RANKS=['ブロンズ','シルバー','ゴールド','エピック','レジェンド','アセンデッド'];
// the rank badges (asked 2026-10-27, the user's pictures; RP tools/build-title-ranks.py); 特別 (server-given) shows gold
export const RANK_BADGE=Object.fromEntries([...TITLE_RANKS.map((r,i)=>[r,`textures/cooptown/titles/rank_${i+1}`]),['特別','textures/cooptown/titles/rank_3']]);
export const rankBadge=rank=>RANK_BADGE[rank]??RANK_BADGE['特別'];
export const RANK_LEVEL={ブロンズ:1,シルバー:5,ゴールド:15,エピック:30,レジェンド:45,アセンデッド:50};
const nextRank=r=>TITLE_RANKS[TITLE_RANKS.indexOf(r)+1];
// ---- conditions ----
const c=(key,n=1)=>({c:key,n}); // lifetime counter p.tally[key] >= n
const s=(key,n)=>({s:key,n}); // seen-set p.seen[key] has n values
const has=(key,...v)=>({has:key,v}); // seen-set holds all of these
const sum=(keys,n)=>({sum:keys,n}); // counters together >= n
const lv=n=>({lv:n}); // job level
const codex=(cat,n)=>({codex:cat,n}); // codex entries of a category (n: number, 'all' every one)
const fn=f=>({fn:f}); // anything else (p) => bool
const P=(why='')=>({pending:why||'仕組みの準備中'});
const J=k=>'j:'+k; // the job features' counts (job-count.js jobCount), lifetime
const STACK=64;
// breedable animals (ノアの箱舟), saplings (SDGsの申し子), crops of 狩りから稲作へ / 水陸両用農家, ores
const BREEDABLE=['cow','sheep','pig','chicken','horse','donkey','mule','llama','cat','wolf','rabbit','fox','panda','bee','turtle','axolotl','frog','goat','camel','sniffer','armadillo','hoglin','strider','mooshroom','ocelot'];
const SAPLINGS=['oak_sapling','spruce_sapling','birch_sapling','jungle_sapling','acacia_sapling','dark_oak_sapling','cherry_sapling','mangrove_propagule','pale_oak_sapling'];
// the 9 tree kinds of 樹海 / 原生林 (the overworld woods; ore-quality.js counts log_top:<wood>)
const TREE_KINDS=SAPLINGS.map(x=>x.replace(/_(sapling|propagule)$/,''));
// the 20 ore blocks of the mining codex (採掘図鑑; title-hooks.js / bulk-harvest.js record them as seen 'ore_blocks')
export const ORE_BLOCKS=[...['coal','iron','copper','gold','redstone','lapis','diamond','emerald'].flatMap(k=>[k+'_ore','deepslate_'+k+'_ore']),'nether_gold_ore','nether_quartz_ore','ancient_debris','gilded_blackstone'];
const LEGEND_FISH=FISH_SPECIES.filter(f=>f.rank===2).map(f=>f.id);
const FISH_ALL=FISH_SPECIES.length;

// ---- the lists: [rank, name, hint, conditions (one or a list), options {need: [names], x: exclusive group}] ----
const t=(rank,name,hint,cond,opt={})=>({rank,name,hint,cond:cond?(Array.isArray(cond)?cond:[cond]):[],...opt});
// ドパガキ系 (共通: from bronze to epic each needs the one before; the counts add up), ADHD (epic) and ドーパミン渇望症
function dopa(label,key,steps,act,adhd){
 const total=steps.reduce((a,x,i)=>[...a,(a[i-1]??0)+x],[]);
 const nm=['ドパガキ','ハイパードパガキ☆','short2倍速系民','デジタルデトックス冷笑系大学生'].map(x=>`${x}（${label}）`);
 return [
  t('ブロンズ',nm[0],act(steps[0],true),key?c(key,total[0]):P()),
  t('シルバー',nm[1],`「${nm[0]}」を入手＋${act(steps[1])}`,key?c(key,total[1]):P(),{need:[nm[0]]}),
  t('ゴールド',nm[2],`「${nm[1]}」を入手＋${act(steps[2])}`,key?c(key,total[2]):P(),{need:[nm[1]]}),
  t('エピック',nm[3],`「${nm[2]}」を入手＋${act(steps[3])}`,key?c(key,total[3]):P(),{need:[nm[2]]}),
  t('エピック',`ADHD（${label}）`,adhd[0],adhd[1]??P()),
  t('レジェンド',`ドーパミン渇望症（${label}）`,`「${nm[3]}」と「ADHD（${label}）」を入手`,[],{need:[nm[3],`ADHD（${label}）`]})];
}
const apprentice=t('ブロンズ','見習い卒業','職業レベルが5になる',lv(5));
const stacks=n=>n%STACK===0&&n>=STACK?`${n/STACK}スタック`:`${n}個`;

export const TITLE_GROUPS=[
 {cat:'共通',titles:[
  t('ブロンズ','堀大輔','ファントムに攻撃される',c('hurt_by:phantom')),
  t('ブロンズ','新入生','初めてサーバーに参加する',c('joined')),
  t('ブロンズ','初めての殺生','初めてモブを倒す',c('kills')),
  t('ブロンズ','死に戻り','初めて死亡する',c('deaths')),
  t('ブロンズ','爆発オチ','爆発によって死亡する',c('death:explosion')),
  t('ブロンズ','I can’t fly.','落下によって死亡する',c('death:fall')),
  t('ブロンズ','溺れる者は藁をも掴む','溺死する',c('death:drowning')),
  t('ブロンズ','マイクロスリープは睡眠','ファントムを倒す',c('kill:phantom')),
  t('ブロンズ','再出発','死亡後、自分の持ち物を死亡地点で回収する',c('recovered')),
  t('シルバー','常連','ログイン数が7日を超える',s('login_days',8)),
  t('シルバー','EMT','累計10回死亡する',c('deaths',10)),
  t('シルバー','掛け持ち大学生','2つの職業でLv.5を達成する',fn(p=>!!p.secondJob&&p.level>=5)),
  t('ゴールド','高須幹弥','ファントムを100体累計撃破する',c('kill:phantom',100)),
  t('ゴールド','試練の挑戦者','トライアルチャンバーの試練を突破する（試練の鍵で宝箱を開ける）',c('vault_open')),
  t('ゴールド','惨害の爪痕','エンシェントシティ（古代都市）に到達する',has('biomes','deep_dark')),
  t('ゴールド','地獄へようこそ','ネザーに到達する',c('dim:nether')),
  t('ゴールド','死に方の百貨店','5種類以上の死に方で死亡する',s('death_causes',5)),
  t('ゴールド','皆勤賞','ログイン数14日を突破する',s('login_days',15)),
  t('ゴールド','バイオハザード','ゾンビ村人を治療する',c('zombie_cure')),
  t('ゴールド','街の功労者','運営主催のイベントに累計5回参加する',c('event_join',5)),
  t('ゴールド','村のヒーロー','村の襲撃（レイド）に勝利する',c('raid_win')),
  t('エピック','竜殺し','エンダードラゴンを討伐（戦闘に参加した者のみ）',c('kill:ender_dragon')),
  t('エピック','死王殺し','ウィザーを討伐（戦闘に参加した者のみ）',c('kill:wither')),
  t('エピック','空の旅人','エリトラを入手',c('got:elytra')),
  t('エピック','黒騎士','ネザライトの装備を一式揃えて着用する',c('netherite_set')),
  t('エピック','竜の卵','エンドラの卵を入手する',c('got:dragon_egg')),
  t('エピック','守護者の天敵','エルダーガーディアン、ガーディアンを討伐（戦闘に参加した者のみ）',[c('kill:elder_guardian'),c('kill:guardian')]),
  t('エピック','ノーデス','ログイン日数が累計15日になる間に、一度も死亡しない',fn(p=>(p.seen?.login_days?.length??0)>=15&&!(p.tally?.deaths>0))),
  t('レジェンド','鎮魂者','ウォーデンを討伐（戦闘に参加した者のみ）',c('kill:warden')),
  t('レジェンド','英雄','エンドラ、ウィザー、エルダーガーディアン、ウォーデンを討伐する',[c('kill:ender_dragon'),c('kill:wither'),c('kill:elder_guardian'),c('kill:warden')]),
  t('レジェンド','サーバーの古老','ログイン日数が累計50日を突破する',s('login_days',51))]},

 // やり込み (asked 2026-10-27, progress-config.js): for everyone, hard ones at the top
 {cat:'やり込み',titles:[
  t('シルバー','師匠','弟子を1人とる',c('apprentice_taken')),
  t('シルバー','コレクター','コレクションの報酬を5回受け取る',c('collection_step',5)),
  t('ゴールド','みんなの力','サーバー目標の報酬を5回受け取る',c('goal_done',5)),
  t('ゴールド','四季折々','季節の称号を4つ受け取る',c('season_title',4)),
  t('ゴールド','探索隊','探索戦を10回クリアする',c('dungeon_clear',10)),
  t('エピック','名伯楽','弟子を3人卒業させる',c('graduated',3)),
  t('エピック','ギルドの柱','ギルド依頼の報酬を10回受け取る',c('guild_done',10)),
  t('エピック','週間王者','週間大会で3回優勝する',c('contest_win',3)),
  t('エピック','伝説の目撃者','伝説の個体を3回見つける',c('legend_finds',3)),
  t('レジェンド','博物館の館長','コレクションを4つコンプリートする',c('collection_done',4)),
  t('レジェンド','攻略王','探索戦を100回クリアする',c('dungeon_clear',100)),
  t('レジェンド','星を継ぐ者','マスタリーの星を20個集める',c('mastery_stars',20)),
  t('アセンデッド','頂を越えし者','マスタリーの星20個・コレクション8つコンプリート・週間大会で10回優勝',[c('mastery_stars',20),c('collection_done',8),c('contest_win',10)])]},

 {cat:'農家',job:'農家',label:'農民',god:'豊穣',master:'農学',titles:[
  t('ブロンズ','未来への投資家','小麦の種をまく',c('plant:wheat')),
  t('ブロンズ','小作人','作物を1スタック収穫する（種類は問わない）',c(J('harvest'),STACK)),
  t('ブロンズ','はじめの一歩','土を40マス以上クワで耕す',c('till',40)),
  t('ブロンズ','ペーパーブリーダー','初めて動物を繁殖させる',c('bred')),
  t('ブロンズ','偽善者','他のメンバーに作物を渡す（自分で収穫した作物のみ）',P('アイテムの受け渡しの記録')),
  t('ブロンズ','自営業','NPCと初めて取引する',c('npc_trade')),
  t('ブロンズ','ミツバチの友','焚火を使って、ハチを怒らせずにはちみつを入手する',c('honey_safe')),
  apprentice,
  t('シルバー','狩りから稲作へ','小麦、人参、じゃがいも、ビートルート、かぼちゃ、スイカの6種を全て収穫する',has('harvested','wheat','carrot','potato','beetroot','pumpkin','melon_slice'),{need:['未来への投資家']}),
  t('シルバー','地主','土を500マス以上クワで耕す',c('till',500),{need:['はじめの一歩']}),
  t('シルバー','一人前','作物を5スタック収穫する（種類は問わない）',c(J('harvest'),STACK*5),{need:['小作人']}),
  t('シルバー','JA職員','NPCと10回取引する',c('npc_trade',10),{need:['自営業']}),
  t('シルバー','酪農家','牛、羊、豚、鶏の4種を全て繁殖させる',has('bred','cow','sheep','pig','chicken'),{need:['ペーパーブリーダー']}),
  t('シルバー','慈善事業','他のメンバーに作物を合計2スタック渡す',P('アイテムの受け渡しの記録'),{need:['偽善者']}),
  t('シルバー','二期作','同じ畑で収穫→再植え付け→再収穫を行う',c('double_crop')),
  t('シルバー','プーさん愛好家','巣箱を5個以上設置して、ハチミツを採取する',[c('place:beehive',5),c('honey')]),
  t('ゴールド','農地改革の敵','700マス以上クワで耕す',c('till',700),{need:['地主']}),
  t('ゴールド','食料自給率100%','作物を15スタック収穫する',c(J('harvest'),STACK*15),{need:['一人前']}),
  t('ゴールド','ゴールドブリーダー','馬、ロバ、猫、狼の4種を繁殖させる',has('bred','horse','donkey','cat','wolf'),{need:['酪農家']}),
  t('ゴールド','女王蜂','ハニカムを1スタック手に入れ、ハニーブロックを16個作る',[c('honeycomb',STACK),c('made:honey_block',16)],{need:['プーさん愛好家']}),
  t('ゴールド','冥界の耕作者','ネザーウォートを初めて収穫する',has('harvested','nether_wart')),
  t('ゴールド','水陸両用農家','サトウキビ、竹、ココアビーンズ、ケルプ、サボテン、スイートベリー、グロウベリーを収穫する',has('harvested','sugar_cane','bamboo','cocoa_beans','kelp','cactus','sweet_berries','glow_berries'),{need:['狩りから稲作へ']}),
  t('ゴールド','JA支店長','NPCと30回取引する',c('npc_trade',30),{need:['JA職員']}),
  t('ゴールド','NPO','他のメンバーに作物を合計10スタック渡す',P('アイテムの受け渡しの記録'),{need:['慈善事業']}),
  t('エピック','歩く登記簿','1500マス以上クワで耕す',c('till',1500),{need:['農地改革の敵']}),
  t('エピック','プー あくまのくまさん','巣箱を20個作成し、ハニカムを2スタック集める',[c('made:beehive',20),c('honeycomb',STACK*2)],{need:['女王蜂']}),
  t('エピック','ビン腕バイヤー','NPCと50回取引する',c('npc_trade',50),{need:['JA支店長']}),
  t('エピック','SDGsの申し子','全種類の苗木を植える',has('planted',...SAPLINGS),{need:['水陸両用農家']}),
  t('レジェンド','ノアの箱舟','繁殖できる全ての動物を繁殖させる',has('bred',...BREEDABLE),{need:['ゴールドブリーダー']}),
  t('レジェンド','サーバーの母','作物を30スタック収穫する',c(J('harvest'),STACK*30),{need:['食料自給率100%']}),
  t('レジェンド','デメテリア','他のメンバーに作物を15スタック渡す',P('アイテムの受け渡しの記録'),{need:['NPO']}),
  ...dopa('農民','bonemeal:crop',[1,STACK*2,STACK*5,STACK*10],(n,first)=>first?'骨粉を使って作物を成長させる':`骨粉を${stacks(n)}使って作物を成長させる`,['クワでモブを10匹倒す',c('kill_with:hoe',10)])]},

 {cat:'釣り師',job:'釣り師',god:'海皇',master:'釣り',titles:[
  t('ブロンズ','ボウズ回避','魚を初めて釣り上げる',c(J('fish'))),
  t('ブロンズ','趣味は釣りです','魚を20匹釣る',c(J('fish'),20)),
  t('ブロンズ','小学生の自由研究','図鑑に5種類登録する',s('fish_species',5)),
  t('ブロンズ','出張釣り','3種類のバイオームで魚を釣る',s('fish_biomes',3)),
  t('ブロンズ','夜勤','夜の時間帯に魚を釣る',has('fish_times','night')),
  t('ブロンズ','おすそ分け','他のメンバーに魚を渡す（自分で釣った魚のみ）',P('アイテムの受け渡しの記録')),
  t('ブロンズ','初水揚げ','NPCに魚を初めて売る',c('npc_sell:sell_fish')),
  t('ブロンズ','海のゴミ拾い','ゴミを釣り上げる',c('fish_junk')),
  apprentice,
  t('シルバー','太公望','魚を150匹釣る',c(J('fish'),150),{need:['趣味は釣りです']}),
  t('シルバー','魚博士','図鑑に20種類登録する',s('fish_species',20),{need:['小学生の自由研究']}),
  t('シルバー','全国行脚','10種類のバイオームで魚を釣る',s('fish_biomes',10),{need:['出張釣り']}),
  t('シルバー','昼夜逆転','朝・昼・夕・夜のすべての時間帯で魚を釣る',has('fish_times','morning','noon','evening','night'),{need:['夜勤']}),
  t('シルバー','適材適所','魚種ごとの得意な餌を3種類使って、それぞれ魚を釣る',s('bait_liked',3)),
  t('シルバー','炊き出し','魚を合計2スタック渡す',P('アイテムの受け渡しの記録'),{need:['おすそ分け']}),
  t('シルバー','漁協職員','自分で釣った魚をNPCに10回売る',c('npc_sell:sell_fish',10),{need:['初水揚げ']}),
  t('ゴールド','釣りバカ','魚を500匹釣る',c(J('fish'),500),{need:['太公望']}),
  t('ゴールド','世界一周','20種類のバイオームで魚を釣る',s('fish_biomes',20),{need:['全国行脚']}),
  t('ゴールド','持ってる男','レア以上の魚を10匹釣る',c(J('rare_fish'),10)),
  t('ゴールド','釣果自慢','5種類の魚で自己最大サイズを更新する',s('fish_records',5),{need:['魚博士']}),
  t('ゴールド','餌代がかさむ','魚種別の餌を全種類使う（8種類）',s('bait_used',8),{need:['適材適所']}),
  t('ゴールド','探知機','魚影調査薬を使って魚を釣る',c('fish_with:fish_eye')),
  t('ゴールド','フードバンク','魚を合計10スタック渡す',P('アイテムの受け渡しの記録'),{need:['炊き出し']}),
  t('ゴールド','漁協組合長','NPCに30回売る',c('npc_sell:sell_fish',30),{need:['漁協職員']}),
  t('エピック','海の主','伝説魚を初めて釣り上げる',s('fish_legend',1),{need:['持ってる男']}),
  t('エピック','歩く水族館',`図鑑を6割（${Math.ceil(FISH_ALL*.6)}種類）まで埋める`,s('fish_species',Math.ceil(FISH_ALL*.6)),{need:['魚博士']}),
  t('エピック','ギネス記録','15種類の魚で自己最大サイズを更新する',s('fish_records',15),{need:['釣果自慢']}),
  t('エピック','遠洋漁業','魚を1000匹釣る',c(J('fish'),1000),{need:['釣りバカ']}),
  t('エピック','水産庁長官','NPCに50回売る',c('npc_sell:sell_fish',50),{need:['漁協組合長']}),
  t('レジェンド','竜宮城',`伝説魚を全種類（${LEGEND_FISH.length}種類）釣り上げる`,has('fish_legend',...LEGEND_FISH),{need:['海の主']}),
  t('レジェンド','海洋学者',`図鑑を全て（${FISH_ALL}種類）埋める`,s('fish_species',FISH_ALL),{need:['歩く水族館']}),
  t('レジェンド','一本釣りの名人','ランクSの魚を50匹釣る',c('fish_rank:S',50),{need:['ギネス記録']}),
  t('レジェンド','恵比寿様','魚を他のメンバーに15スタック渡す',P('アイテムの受け渡しの記録'),{need:['フードバンク']}),
  ...dopa('釣り師','fish_with:lure',[1,50,200,500],(n,first)=>first?'入れ食いの釣り竿で魚を釣る':`入れ食いの釣り竿で魚を${n}匹釣る`,['釣り糸を垂らしたまま、モブを10匹倒す',c('kill_while:fish',10)])]},

 {cat:'鍛冶師',job:'鍛冶師',god:'焔神',master:'鍛冶',ascendedExtra:P('名品の仕組み'),titles:[
  t('ブロンズ','鍛冶師デビュー','作った物（武器防具）をNPCに初めて販売する',c('npc_sell:sell_gear')),
  t('ブロンズ','傷だらけの手','金床で装備を修理する',c(J('repair'))),
  t('ブロンズ','矛盾','武器と防具をそれぞれ1つ以上作る',[c('forged:weapon'),c('forged:armor')]),
  apprentice,
  t('ブロンズ','着火マン','溶鉱炉で初めてインゴットを完成させる',c(J('smelt'))),
  t('ブロンズ','金に目がくらむ','金を精錬して受け取る',c('smelt:gold_ingot'),{need:['着火マン']}),
  t('ブロンズ','全身鉄づくめ','鉄の剣と鉄の防具4部位をそれぞれ作る',has('forged','iron_sword','iron_helmet','iron_chestplate','iron_leggings','iron_boots'),{need:['矛盾']}),
  t('ブロンズ','もったいないおばけ','金属端材を再利用する',P('金属端材')),
  t('ブロンズ','大量生産社会','鉄インゴットを64個精錬する',c('smelt:iron_ingot',64),{need:['着火マン']}),
  t('ブロンズ','素振り','鍛造の練習モードを1回最後までやる',P('練習モード')),
  t('シルバー','ブラック企業','精錬でインゴット5スタック（320個）分を完成させる',c(J('smelt'),320),{need:['大量生産社会']}),
  t('シルバー','何でも直す屋','鍛冶ハンマーで他プレイヤーの装備を修理する（5回）',c('repair_other',5),{need:['傷だらけの手']}),
  t('シルバー','町工場','武器・防具を合計30個作る',c(J('forge'),30),{need:['全身鉄づくめ']}),
  t('シルバー','錬金術師（自称）','専用合金を初めて作る',P('専用合金'),{need:['金に目がくらむ']}),
  t('シルバー','攻撃は最大の防御','武器特化を選ぶ',P('特化の選択'),{x:'smith_spec'}),
  t('シルバー','備えあれば憂いなし','防具特化を選ぶ',P('特化の選択'),{x:'smith_spec'}),
  t('ゴールド','ちょっといい鉄','良質品（ランクB以上）を初めて作る',c('forged_good'),{need:['町工場']}),
  t('ゴールド','会心の一撃','鍛造ミニゲームで80点以上を出す',c('forge_score:80'),{need:['ちょっといい鉄']}),
  t('ゴールド','リフォーム業者','鍛冶特性の3種類を、それぞれ装備に付ける',P('鍛冶特性'),{need:['錬金術師（自称）']}),
  t('ゴールド','大改造','鍛冶ハンマーの修理で回復した耐久の合計が3000に達する',c('repair_points',3000),{need:['何でも直す屋']}),
  t('ゴールド','24時間営業','精錬で15スタック分を完成させる',c(J('smelt'),STACK*15),{need:['ブラック企業']}),
  t('ゴールド','専門医','特化した側の良質品を20個作る',P('特化の選択')),
  t('エピック','国宝級','名品を初めて作る',P('名品'),{need:['ちょっといい鉄']}),
  t('エピック','老舗の暖簾','銘を刻んだ名品を作る',P('名品と銘'),{need:['国宝級']}),
  t('エピック','フルオーダーメイド','良質以上の剣と防具4部位を揃えて作る',has('forged_good','sword','helmet','chestplate','leggings','boots'),{need:['リフォーム業者']}),
  t('エピック','親方','職人依頼を完了する（10回）',c(J('commission'),10),{need:['何でも直す屋']}),
  t('エピック','鉄は国家なり','精錬で40スタック分を完成させる',c(J('smelt'),STACK*40),{need:['24時間営業']}),
  t('レジェンド','国立博物館','名品を5種類（剣と防具4部位）全て作る',P('名品'),{need:['老舗の暖簾']}),
  t('レジェンド','寡黙な職人','ミニゲームで90点以上を10回出す',c('forge_score:90',10),{need:['会心の一撃']}),
  t('レジェンド','名刺代わり','自分の銘入りの名品を、5人以上の別のプレイヤーに納品する',P('名品と銘'),{need:['親方']}),
  t('レジェンド','炉火の名匠','職人依頼を完了する（100回）',c(J('commission'),100),{need:['親方']}),
  ...dopa('鍛冶師','forge_with:focus',[1,30,100,300],(n,first)=>first?'集中薬を使って、鍛造ミニゲームに挑戦する':`集中薬を使って、鍛造を${n}回行う`,['金床を落として、モブを10匹倒す',c('kill_while:anvil',10)])]},

 {cat:'料理人',job:'料理人',god:'竈神',master:'料理',titles:[
  t('ブロンズ','男の料理','焚火で料理を初めて完成させる',c(J('cook'))),
  t('ブロンズ','一汁三菜','スープ・主菜・お菓子をそれぞれ1つ以上作る',has('cooked_cat','スープ・主菜','甘味・お菓子'),{need:['男の料理']}),
  t('ブロンズ','胃袋をつかむ','他のメンバーに料理を渡す',P('アイテムの受け渡しの記録')),
  t('ブロンズ','レシピ帳','料理の研究で、新しいレシピを初めて発見する',c('cook_found')),
  t('ブロンズ','地産地消','農家の作物、畜産の肉、釣り師の魚を、それぞれ使って料理を作る',P('素材の出どころの記録')),
  t('ブロンズ','冷蔵庫の奥','期限切れの食品を初めて再資源化する',c('recycle_expired')),
  t('ブロンズ','開店祝い','NPCに料理を初めて売る',c('npc_sell:sell_food')),
  apprentice,
  t('シルバー','おふくろの味','料理を合計20個他のメンバーに渡す',P('アイテムの受け渡しの記録'),{need:['胃袋をつかむ']}),
  t('シルバー','いぶし銀','燻製器で燻製を初めて作る',c('smoked')),
  t('シルバー','ひと手間','良質の料理（ランクB以上）を初めて作る',c(J('good_dish')),{need:['一汁三菜']}),
  t('シルバー','家庭科の成績5','料理の研究で、新しいレシピを5種類発見する',c('cook_found',5),{need:['レシピ帳']}),
  t('シルバー','得意料理は何ですか','異なる料理を10種類作る',s('dishes',10)),
  t('シルバー','ワンオペ','料理を100個完成させる',c(J('cook'),100)),
  t('シルバー','社員食堂','街の食堂へ定食セットを10回納品する',P('街の食堂'),{need:['開店祝い']}),
  t('シルバー','遠征食','干し肉か干し魚を作る',fn(p=>(p.seen?.dishes??[]).some(d=>/dried_(meat|fish)$/.test(d)))),
  t('ゴールド','ランチタイムの戦場','料理を300個完成させる',c(J('cook'),300),{need:['ワンオペ']}),
  t('ゴールド','メニュー表が分厚い','異なる料理を25種類作る',s('dishes',25),{need:['得意料理は何ですか']}),
  t('ゴールド','一流シェフの手','良質の料理を30個作る',c(J('good_dish'),30),{need:['ひと手間']}),
  t('ゴールド','料理研究家','料理の研究で、新しいレシピを20種類発見する',c('cook_found',20),{need:['家庭科の成績5']}),
  t('ゴールド','子ども食堂','料理を合計100個渡す',P('アイテムの受け渡しの記録'),{need:['おふくろの味']}),
  t('ゴールド','大衆食堂の大将','街の食堂へ30回納品する',P('街の食堂'),{need:['社員食堂']}),
  t('エピック','極上の一皿','極上の料理（ランクS）を初めて作る',c('dish_rank:S'),{need:['一流シェフの手']}),
  t('エピック','宴会部長','宴会料理を初めて作る',P('宴会料理')),
  t('エピック','レシピ本出版','自分の料理のレシピを、5人以上の別のプレイヤーが覚える',s('cook_scroll_readers',5),{need:['料理研究家']}),
  t('エピック','老舗料亭の女将','街の食堂へ50回納品する',P('街の食堂'),{need:['大衆食堂の大将']}),
  t('エピック','防災備蓄','瓶詰め保存食を作る',has('dishes','jar_preserve'),{need:['遠征食']}),
  t('エピック','テキ屋','祭りの屋台依頼を完了する',P('祭りの屋台依頼')),
  t('レジェンド','ミシュラン三ツ星','極上の料理を、5人以上の別のプレイヤーに渡す',P('アイテムの受け渡しの記録'),{need:['極上の一皿']}),
  t('レジェンド','料理の鉄人','焚き火と燻製機の全レシピを覚える',c('cook_learned',COOK_LEARNABLE),{need:['レシピ本出版']}),
  t('レジェンド','給食のおばちゃん','料理を合計300個渡す',P('アイテムの受け渡しの記録'),{need:['子ども食堂']}),
  t('レジェンド','全国大会優勝','料理品評会で優勝する',P('料理品評会'),{need:['テキ屋']}),
  ...dopa('料理人',undefined,[1,STACK*2,STACK*5,STACK*10],(n,first)=>first?'溶岩バケツを燃料にして、料理を完成させる':`溶岩バケツを燃料にして、料理を${stacks(n)}完成させる`,['かまどで調理している最中に、モブを10匹倒す'])]},

 {cat:'調合師',job:'調合師',god:'霊薬',master:'調合',titles:[
  t('ブロンズ','理科の実験','大釜でレシピの実験を初めて行う',c(J('experiment'))),
  t('ブロンズ','失敗は成功のもと','実験に失敗して、研究ノートに記録を初めて残す',c('experiment_fail')),
  t('ブロンズ','処方箋','新しいレシピを初めて発見する',s('recipes_found')),
  t('ブロンズ','お薬手帳','レシピを3種類習得する',s('recipes_learned',3),{need:['処方箋']}),
  t('ブロンズ','調剤薬局','醸造台でポーションを初めて製作する',c(J('brew'))),
  t('ブロンズ','常備薬','応急薬と小さな安らぎの薬を、それぞれ作る',has('brewed','first_aid','calm_s'),{need:['調剤薬局']}),
  t('ブロンズ','ハーブティー','農家の薬草を使ってポーションを作る',P('追加植物')),
  t('ブロンズ','往診','遠征用ポーションセットを初めて納品する',P('ポーションセットの納品')),
  t('ブロンズ','薬局開業','NPCにポーションを初めて売る',c('npc_sell:sell_potion')),
  apprentice,
  t('シルバー','試行錯誤','異なる材料の組み合わせを30通り試す',s('experiment_combos',30),{need:['理科の実験']}),
  t('シルバー','野口英世への道','新しいレシピを5種類発見する',s('recipes_found',5),{need:['処方箋']}),
  t('シルバー','薬学部','レシピを10種類習得する',s('recipes_learned',10),{need:['お薬手帳']}),
  t('シルバー','薬剤師免許','ポーションを100個製作する',c(J('brew'),100),{need:['調剤薬局']}),
  t('シルバー','救急箱','応急薬・解毒薬・安らぎの薬・平静の薬を、それぞれ作る',has('brewed','first_aid','antidote','calm_m','serene'),{need:['常備薬']}),
  t('シルバー','特効薬','良質のポーション（ランクB以上）を初めて作る',c('potion_good'),{need:['調剤薬局']}),
  t('シルバー','薬草園','農家の薬草を5種類使う',P('追加植物'),{need:['ハーブティー']}),
  t('シルバー','訪問看護','ポーションセットを5回納品する',P('ポーションセットの納品'),{need:['往診']}),
  t('シルバー','受験生の味方','集中薬を料理人・鍛冶師へ5回納品する',P('ポーションの納品'),{need:['往診']}),
  t('シルバー','卸問屋','ポーションをNPCに10回売る',c('npc_sell:sell_potion',10),{need:['薬局開業']}),
  t('ゴールド','製薬会社','新しいレシピを20種類発見する',s('recipes_found',20),{need:['野口英世への道']}),
  t('ゴールド','薬学博士','レシピを25種類習得する',s('recipes_learned',25),{need:['薬学部']}),
  t('ゴールド','ドラッグストア','ポーションを300個製作する',c(J('brew'),300),{need:['薬剤師免許']}),
  t('ゴールド','名医','良質のポーションを30個作る',c('potion_good',30),{need:['特効薬']}),
  t('ゴールド','植物学者','追加植物の全種類を使う',P('追加植物'),{need:['薬草園']}),
  t('ゴールド','総合病院','ポーションセットを20回納品する',P('ポーションセットの納品'),{need:['訪問看護']}),
  t('ゴールド','薬問屋の主','ポーションをNPCに30回売る',c('npc_sell:sell_potion',30),{need:['卸問屋']}),
  t('ゴールド','釣具屋の相棒','魚影調査薬を釣り師へ10回納品する',P('ポーションの納品'),{need:['往診']}),
  t('エピック','ノーベル賞','新しいレシピを50種類発見する',s('recipes_found',50),{need:['製薬会社']}),
  t('エピック','製薬工場','ポーションを1000個製作する',c(J('brew'),1000),{need:['ドラッグストア']}),
  t('エピック','奇跡の薬','極上のポーション（ランクS）を初めて作る',c('potion_rank:S'),{need:['名医']}),
  t('エピック','カクテル','複合効果のポーションを作る',has('brewed','mind'),{need:['薬学博士']}),
  t('エピック','防犯ブザー','気配察知薬を作る',has('brewed','sense')),
  t('エピック','研究所の所長','研究依頼を10回完了する',P('研究依頼')),
  t('エピック','救命救急センター','ポーションセットを50回納品する',P('ポーションセットの納品'),{need:['総合病院']}),
  t('エピック','医薬品商社','ポーションをNPCに50回売る',c('npc_sell:sell_potion',50),{need:['薬問屋の主']}),
  t('レジェンド','賢者の石','全レシピを習得する',P('レシピ数の確定'),{need:['ノーベル賞']}),
  t('レジェンド','名薬師','極上のポーションを50個作る',c('potion_rank:S',50),{need:['奇跡の薬']}),
  t('レジェンド','パンデミックの英雄','ポーションセットを100回納品する',P('ポーションセットの納品'),{need:['救命救急センター']}),
  t('レジェンド','世界の薬箱','ポーションを3000個製作する',c(J('brew'),3000),{need:['製薬工場']}),
  ...dopa('調合師','drink_own',[1,30,100,300],(n,first)=>first?'自分で作ったポーションを自分で飲む':`自分で作ったポーションを${n}回飲む`,['醸造台で調合している最中に、モブを10匹倒す',c('kill_while:brew',10)])]},

 {cat:'付与術師',job:'付与術師',label:'エンチャント師',god:'賢神',master:'刻印',titles:[
  t('ブロンズ','Hello World','試作実行を成功させて、魔法のレシピを初めて登録する',c('rune_made')),
  t('ブロンズ','付け焼き刃','武器にエンチャントを付与する',c('enchant:weapon')),
  t('ブロンズ','重ね着','防具にエンチャントを付与する',c('enchant:armor')),
  t('ブロンズ','本の虫','本にエンチャントを付与する',c('enchant:book')),
  t('ブロンズ','予行演習','素材不要の模擬実行を初めて行う',c('rune_sim')),
  t('ブロンズ','積ん読','本棚にエンチャント本を10冊保管する',c(J('shelf'),10)),
  t('ブロンズ','訪問販売','製作品をNPCに初めて売る',c('npc_sell:sell_book')),
  apprentice,
  t('シルバー','写経','本にエンチャントを30回付与する',c('enchant:book',30),{need:['本の虫']}),
  t('シルバー','魔剣量産工場','武器にエンチャントを20回付与する',c('enchant:weapon',20),{need:['付け焼き刃']}),
  t('シルバー','加護の衣','防具にエンチャントを20回付与する',c('enchant:armor',20),{need:['重ね着']}),
  t('シルバー','ベータ版','魔法のレシピを5つ登録する',c('rune_made',5),{need:['Hello World']}),
  t('シルバー','イベント駆動','攻撃時・討伐時・被弾時の3種類のイベントで、それぞれ魔法を登録する',has('rune_events','hit','kill','hurt'),{need:['Hello World']}),
  t('シルバー','バグ取り','試作実行を10回成功させる',c(J('rune_try'),10),{need:['予行演習']}),
  t('シルバー','ビブリオマニア','本棚にエンチャント本を50冊保管する',c(J('shelf'),50),{need:['積ん読']}),
  t('シルバー','通販番組','製作品をNPCに10回売る',c('npc_sell:sell_book',10),{need:['訪問販売']}),
  t('シルバー','受託開発','他のプレイヤーから依頼された本を5回製作する',P('本の依頼')),
  t('シルバー','先手必勝','武器特化を選ぶ',P('特化の選択'),{x:'ench_spec'}),
  t('シルバー','後の先','防具特化を選ぶ',P('特化の選択'),{x:'ench_spec'}),
  t('ゴールド','武器庫','武器にエンチャントを100回付与する',c('enchant:weapon',100),{need:['魔剣量産工場']}),
  t('ゴールド','衣装部屋','防具にエンチャントを100回付与する',c('enchant:armor',100),{need:['加護の衣']}),
  t('ゴールド','正式リリース','魔法のレシピを20個登録する',c('rune_made',20),{need:['ベータ版']}),
  t('ゴールド','フルスタック','mark・ignite・calm・cleanseの4つの命令を、それぞれ使った魔法を登録する',has('rune_cmds','mark','ignite','calm','cleanse'),{need:['イベント駆動']}),
  t('ゴールド','テスト駆動','試作実行を50回成功させる',c(J('rune_try'),50),{need:['バグ取り']}),
  t('ゴールド','図書館','本棚にエンチャント本を200冊保管する',c(J('shelf'),200),{need:['ビブリオマニア']}),
  t('ゴールド','外商','製作品をNPCに30回売る',c('npc_sell:sell_book',30),{need:['通販番組']}),
  t('ゴールド','SIer','他のプレイヤーから依頼された本を20回製作する',P('本の依頼'),{need:['受託開発']}),
  t('ゴールド','スペシャリスト','特化した側の装備にエンチャントを50回付与する',P('特化の選択')),
  t('エピック','大型アップデート','魔法のレシピを50個登録する',c('rune_made',50),{need:['正式リリース']}),
  t('エピック','品質保証','試作実行を100回成功させる',c(J('rune_try'),100),{need:['テスト駆動']}),
  t('エピック','元請け','他のプレイヤーから依頼された本を50回製作する',P('本の依頼'),{need:['SIer']}),
  t('エピック','総合商社','製作品をNPCに50回売る',c('npc_sell:sell_book',50),{need:['外商']}),
  t('エピック','バベルの図書館','本棚にエンチャント本を500冊保管する',c(J('shelf'),500),{need:['図書館']}),
  t('エピック','二足の草鞋','2つのイベントを持つ魔法を登録する',c('rune_multi')),
  t('エピック','満点合格','スコア90点以上の魔法を登録する',c('rune_90')),
  t('エピック','研究室の教授','研究依頼を10回完了する',P('研究依頼')),
  t('エピック','容量ギリギリ','装備全体の魔法合計が140以上の状態で有効にする',c('rune_gear140')),
  t('レジェンド','OSS開発者','自分が研究したレシピの本を、10人以上の別のプレイヤーに渡す',P('本の譲渡の記録'),{need:['大型アップデート']}),
  t('レジェンド','バグゼロ','試作実行を連続で30回成功させる',c('rune_streak',30),{need:['品質保証']}),
  t('レジェンド','五芒星','武器と防具4部位の5つ全てに、自作の魔法を付ける',c('rune_five')),
  t('レジェンド','業界のドン','他のプレイヤーから依頼された本を100回製作する',P('本の依頼'),{need:['元請け']}),
  ...dopa('エンチャント師','rune_fail',[1,10,30,100],(n,first)=>first?'魔法の実験で、失敗の爆発を起こす':`魔法の実験で、失敗の爆発を${n}回起こす`,['魔法の実験を始めたまま、モブを10匹倒す'])]},

 {cat:'冒険家',job:'冒険家',god:'闘神',master:'冒険',titles:[
  t('ブロンズ','履歴書は白紙','製図台で調査依頼を初めて受注する',c(J('report'))),
  t('ブロンズ','ひのきの棒','敵モブを初めて討伐する',c('kill_hostile')),
  t('ブロンズ','ご近所さん','3種類のバイオームを訪れる',s('biomes',3)),
  t('ブロンズ','金槌卒業','泳いで100m移動する',c('swim_m',100)),
  t('ブロンズ','動物ウォッチャー','友好モブを5種類観察する（図鑑）',codex('友好モブ',5)),
  t('ブロンズ','お小遣い稼ぎ','討伐で得た品をNPCに初めて売る',c('npc_sell:sell_loot')),
  t('ブロンズ','出前','素材セットを初めて納品する',P('素材セットの納品')),
  t('ブロンズ','迷子防止','製図台で調査報告を初めて提出する',c(J('report'))),
  apprentice,
  t('シルバー','修学旅行','10種類のバイオームを訪れる',s('biomes',10),{need:['ご近所さん']}),
  t('シルバー','遠泳部','泳いで合計1km移動する',c('swim_m',1000),{need:['金槌卒業']}),
  t('シルバー','狩猟免許','異なる敵モブを10種類討伐する',s('kill_kinds',10),{need:['ひのきの棒']}),
  t('シルバー','害獣駆除業者','敵モブを100体討伐する',c('kill_hostile',100),{need:['ひのきの棒']}),
  t('シルバー','野鳥の会','友好モブを10種類観察する（図鑑）',codex('友好モブ',10),{need:['動物ウォッチャー']}),
  t('シルバー','国勢調査員','調査依頼を10回完了する',c(J('report'),10),{need:['履歴書は白紙']}),
  t('シルバー','古物商','自分で討伐して得た品をNPCに10回売る',c('npc_sell:sell_loot',10),{need:['お小遣い稼ぎ']}),
  t('シルバー','宅配便','素材セットを5回納品する',P('素材セットの納品'),{need:['出前']}),
  t('シルバー','近づかないと始まらない','近距型を選ぶ',P('近距型・遠距型の選択'),{x:'adv_style'}),
  t('シルバー','遠くから失礼します','遠距型を選ぶ',P('近距型・遠距型の選択'),{x:'adv_style'}),
  t('ゴールド','放浪者','25種類のバイオームを訪れる',s('biomes',25),{need:['修学旅行']}),
  t('ゴールド','渡海者','泳いで合計5km移動する',c('swim_m',5000),{need:['遠泳部']}),
  t('ゴールド','マタギ','異なる敵モブを25種類討伐する',s('kill_kinds',25),{need:['狩猟免許']}),
  t('ゴールド','衛兵','敵モブを500体討伐する',c('kill_hostile',500),{need:['害獣駆除業者']}),
  t('ゴールド','森の賢者','全ての友好モブを観察する（図鑑）',codex('友好モブ','all'),{need:['野鳥の会']}),
  t('ゴールド','地図職人','調査依頼を30回完了する',c(J('report'),30),{need:['国勢調査員']}),
  t('ゴールド','目利き','自分で討伐して得た品をNPCに30回売る',c('npc_sell:sell_loot',30),{need:['古物商']}),
  t('ゴールド','補給線','素材セットを20回納品する',P('素材セットの納品'),{need:['宅配便']}),
  t('ゴールド','一騎当千','近接武器で敵モブを300体討伐する',P('近距型・遠距型の選択'),{x:'adv_style2'}),
  t('ゴールド','百発百中','弓で敵モブを300体討伐する',P('近距型・遠距型の選択'),{x:'adv_style2'}),
  t('エピック','伊能忠敬','調査依頼を100回完了する',c(J('report'),100),{need:['地図職人']}),
  t('エピック','掃討者','敵モブを2000体討伐する',c('kill_hostile',2000),{need:['衛兵']}),
  t('エピック','行商王','自分で討伐して得た品をNPCに50回売る',c('npc_sell:sell_loot',50),{need:['目利き']}),
  t('エピック','大動脈','素材セットを50回納品する',P('素材セットの納品'),{need:['補給線']}),
  t('エピック','踏破者','探索地（名所）を20か所発見する',fn(p=>(p.explored?.length??0)>=20)),
  t('エピック','巨人殺し','強敵の討伐依頼を初めて完了する',P('強敵の討伐依頼')),
  t('エピック','大洋横断','泳いで合計20km移動する',c('swim_m',20000),{need:['渡海者']}),
  t('エピック','剣豪','近接武器で強敵を10体討伐する',P('強敵'),{x:'adv_style3'}),
  t('エピック','神射手','弓で強敵を10体討伐する',P('強敵'),{x:'adv_style3'}),
  t('レジェンド','空白の地図','登録されている探索地を全て発見する',c('landmarks_all'),{need:['踏破者']}),
  t('レジェンド','災厄の狩人','強敵を全種類討伐する',P('強敵'),{need:['巨人殺し']}),
  t('レジェンド','一人軍隊','敵モブを5000体討伐する',c('kill_hostile',5000),{need:['掃討者']}),
  t('レジェンド','人類未踏','サーバー内で最初に探索地へ到達する（3か所）',c('landmark_first',3),{need:['踏破者']}),
  t('レジェンド','剣聖','近接武器で強敵を30体討伐する',P('強敵'),{x:'adv_style4'}),
  t('レジェンド','弓聖','弓で強敵を30体討伐する',P('強敵'),{x:'adv_style4'}),
  ...dopa('冒険家','heal_in_combat',[1,20,60,150],(n,first)=>first?'戦闘中に、ポーションか食べ物で回復する':`戦闘中に回復を${n}回行う`,['素手でモブを10匹倒す',c('kill_with:hand',10)])]},

 {cat:'鉱夫',job:'鉱夫',label:'鉱夫',god:'地母',master:'採掘',titles:[
  t('ブロンズ','黒いダイヤ','石炭鉱石を初めて採掘する',c('ore:coal')),
  t('ブロンズ','鉄人','鉄鉱石を初めて採掘する',c('ore:iron')),
  t('ブロンズ','十円玉','銅鉱石を初めて採掘する',c('ore:copper')),
  t('ブロンズ','石の上にも三年','石材を1スタック採掘する',c('stone',STACK)),
  t('ブロンズ','目利き','砥石で鉱石を初めて選別する',c('ore_sorted')),
  t('ブロンズ','研ぎ師','砥石でつるはしを初めて手入れする',c('pick_care')),
  t('ブロンズ','初出荷','鍛冶師向けの鉱石セットを初めて納品する',P('鉱石セットの納品')),
  t('ブロンズ','初任給','鉱石をNPCに初めて売る',c('npc_sell:sell_ore')),
  t('ブロンズ','地質学入門','鉱石を5種類掘る',s('ores',5)),
  apprentice,
  t('シルバー','石炭王','石炭を500個採掘する',c('ore:coal',500),{need:['黒いダイヤ']}),
  t('シルバー','鉄鋼所','鉄鉱石を300個採掘する',c('ore:iron',300),{need:['鉄人']}),
  t('シルバー','造幣局','銅鉱石を300個採掘する',c('ore:copper',300),{need:['十円玉']}),
  t('シルバー','石工','石材を1000個採掘する',c('stone',1000),{need:['石の上にも三年']}),
  t('シルバー','鑑定団','鉱石を100個選別する',c('ore_sorted',100),{need:['目利き']}),
  t('シルバー','研磨工場','つるはしを30回手入れする',c('pick_care',30),{need:['研ぎ師']}),
  t('シルバー','定期便','鍛冶師向けの鉱石セットを5回納品する',P('鉱石セットの納品'),{need:['初出荷']}),
  t('シルバー','月給取り','鉱石をNPCに20回売る',c('npc_sell:sell_ore',20),{need:['初任給']}),
  t('シルバー','地質調査員','鉱石を10種類掘る',s('ores',10),{need:['地質学入門']}),
  t('シルバー','安全管理者','暗い坑道を、新しく10か所照らす',c('lit_dark',10)),
  t('シルバー','地下鉄','深層岩の層まで掘り進む',c('depth:deepslate')),
  t('ゴールド','炭鉱の町','石炭を2000個採掘する',c('ore:coal',2000),{need:['石炭王']}),
  t('ゴールド','重工業','鉄鉱石を1000個採掘する',c('ore:iron',1000),{need:['鉄鋼所']}),
  t('ゴールド','電線工場','銅鉱石を1000個採掘する',c('ore:copper',1000),{need:['造幣局']}),
  t('ゴールド','採石場','異なる層の石材をそろえる調査依頼を5回完了する',P('石材の調査依頼'),{need:['石工']}),
  t('ゴールド','A5ランク','良質の鉱石を50個採掘する',c('ore_good',50),{need:['鑑定団']}),
  t('ゴールド','刃物の町','つるはしを100回手入れする',c('pick_care',100),{need:['研磨工場']}),
  t('ゴールド','資源商社','鍛冶師向けの鉱石セットを20回納品する',P('鉱石セットの納品'),{need:['定期便']}),
  t('ゴールド','ゴールドラッシュ','金鉱石を200個採掘する',c('ore:gold',200),{need:['月給取り']}),
  t('ゴールド','宝石商','ラピスラズリ鉱石を300個採掘する',c('ore:lapis',300),{need:['地質調査員']}),
  t('ゴールド','博物館','採掘図鑑に鉱石を20種類登録する',s('ore_blocks',20),{need:['地質調査員']}),
  t('ゴールド','金属探知機','鉱石探知で見つけた鉱石を30個採掘する',c('detected_ore',30),{need:['地下鉄']}),
  t('ゴールド','地底旅行','岩盤の近くまで掘り進む',c('depth:bedrock'),{need:['地下鉄']}),
  t('ゴールド','夜景スポット','暗い坑道を、新しく50か所照らす',c('lit_dark',50),{need:['安全管理者']}),
  t('ゴールド','底引き網漁','鉱脈掘りで鉱石を合計500個採掘する',c('vein_ore',500),{need:['石炭王']}),
  t('エピック','エネルギー革命','石炭を5000個採掘する',c('ore:coal',5000),{need:['炭鉱の町']}),
  t('エピック','鉄は国家なり','鉄鉱石を5000個採掘する',c('ore:iron',5000),{need:['重工業']}),
  t('エピック','送電網','銅鉱石を3000個採掘する',c('ore:copper',3000),{need:['電線工場']}),
  t('エピック','万里の長城','石材を10000個採掘する',c('stone',10000),{need:['採石場']}),
  t('エピック','霜降り','極上の鉱石を30個採掘する',c('ore_top',30),{need:['A5ランク']}),
  t('エピック','人間国宝','つるはしを300回手入れする',c('pick_care',300),{need:['刃物の町']}),
  t('エピック','特命','希少資源の特別依頼を5回完了する',P('特別依頼'),{need:['資源商社']}),
  t('エピック','財閥','鉱石・石材をNPCに200回売る',c('npc_sell:sell_ore',200),{need:['ゴールドラッシュ']}),
  t('エピック','給料3か月分','ダイヤモンド鉱石を100個採掘する',c('ore:diamond',100),{need:['宝石商']}),
  t('エピック','国立博物館','採掘図鑑の鉱石を全種類登録する',has('ore_blocks',...ORE_BLOCKS),{need:['博物館']}),
  t('エピック','考古学者','未鑑定鉱物を10個鑑定して図鑑に登録する',P('未鑑定鉱物'),{need:['博物館']}),
  t('エピック','人工衛星','上位鉱石の探知で見つけた鉱石を30個採掘する',c('detected_ore_hi',30),{need:['金属探知機']}),
  t('エピック','夜景100選','暗い坑道を、新しく100か所照らす',c('lit_dark',100),{need:['夜景スポット']}),
  t('エピック','シールド工法','鉱脈掘りで鉱石を合計5000個採掘する',c('vein_ore',5000),{need:['底引き網漁']}),
  t('レジェンド','産業革命','石炭と鉄鉱石をあわせて10000個採掘する',sum(['ore:coal','ore:iron'],10000),{need:['エネルギー革命','鉄は国家なり']}),
  t('レジェンド','電力会社','銅鉱石とレッドストーン鉱石をあわせて5000個採掘する',sum(['ore:copper','ore:redstone'],5000),{need:['送電網']}),
  t('レジェンド','ピラミッド','石材を30000個採掘する',c('stone',30000),{need:['万里の長城']}),
  t('レジェンド','黒毛和牛','極上の鉱石を100個採掘する',c('ore_top',100),{need:['霜降り']}),
  t('レジェンド','ダイヤモンド王','ダイヤモンド鉱石を500個採掘する',c('ore:diamond',500),{need:['給料3か月分']}),
  t('レジェンド','経団連','希少資源の特別依頼をあわせて15回完了する',P('特別依頼'),{need:['財閥','特命']}),
  t('レジェンド','世界遺産','未鑑定鉱物を全種類鑑定する',P('未鑑定鉱物'),{need:['国立博物館','考古学者']}),
  t('レジェンド','不夜城','暗い坑道を、新しく300か所照らす',c('lit_dark',300),{need:['夜景100選']}),
  t('レジェンド','地底回廊','鉱脈掘りで鉱石を合計10000個採掘する',c('vein_ore',10000),{need:['シールド工法']}),
  ...dopa('鉱夫','ore_with:haste',[1,50,200,500],(n,first)=>first?'ヘイスト効果を受けた状態で鉱石を採掘する':`ヘイスト効果を受けた状態で鉱石を${n}個採掘する`,['採掘している最中に、モブを10匹倒す',c('kill_while:mine',10)])]},

 {cat:'木こり',job:'木こり',label:'木こり',god:'世界樹',master:'林業',titles:[
  t('ブロンズ','金の斧','成長した木の原木を初めて手作業で伐採する',c('log')),
  t('ブロンズ','植樹祭','苗木を初めて植える',c('sapling')),
  t('ブロンズ','桃栗三年','自分で植えた木の成長を初めて確認する',c('tree_grown')),
  t('ブロンズ','割り箸','板材を初めて作る',c('planks_made')),
  t('ブロンズ','炭焼き小屋','木炭を初めて作る',c('charcoal_made')),
  t('ブロンズ','材木屋','原木・板材・木炭を初めてNPCに売る',c('npc_sell:sell_wood')),
  t('ブロンズ','銀の斧','斧を初めて手入れする',c('axe_care')),
  t('ブロンズ','棟上げ','建築用の木材セットを初めて納品する',P('木材セットの納品')),
  t('ブロンズ','樹木医の卵','3種類の木を伐採する',s('log_kinds',3)),
  apprentice,
  t('シルバー','杉林','原木を300本伐採する',c('log',300),{need:['金の斧']}),
  t('シルバー','里山保全','苗木を30本植える',c('sapling',30),{need:['植樹祭']}),
  t('シルバー','柿八年','自分で植えた木の成長を15本確認する',c('tree_grown',15),{need:['桃栗三年']}),
  t('シルバー','割り箸工場','板材を200個作る',c('planks_made',200),{need:['割り箸']}),
  t('シルバー','備長炭','木炭を100個作る',c('charcoal_made',100),{need:['炭焼き小屋']}),
  t('シルバー','材木問屋','原木・板材・木炭をNPCに20回売る',c('npc_sell:sell_wood',20),{need:['材木屋']}),
  t('シルバー','刃物屋','斧を30回手入れする',c('axe_care',30),{need:['銀の斧']}),
  t('シルバー','工務店','建築用の木材セットを5回納品する',P('木材セットの納品'),{need:['棟上げ']}),
  t('シルバー','樹木医','6種類の木を伐採する',s('log_kinds',6),{need:['樹木医の卵']}),
  t('シルバー','燃料屋','鍛冶師・料理人向けの木炭を5回納品する',P('木炭の納品'),{need:['炭焼き小屋']}),
  t('ゴールド','森林組合','原木を1000本伐採する',c('log',1000),{need:['杉林']}),
  t('ゴールド','グリーンベルト','苗木を100本植える',c('sapling',100),{need:['里山保全']}),
  t('ゴールド','百年の計','自分で植えた木の成長を50本確認する',c('tree_grown',50),{need:['柿八年']}),
  t('ゴールド','製材所','板材を1000個作る',c('planks_made',1000),{need:['割り箸工場']}),
  t('ゴールド','炭の里','木炭を500個作る',c('charcoal_made',500),{need:['備長炭']}),
  t('ゴールド','木材商社','原木・板材・木炭をNPCに50回売る',c('npc_sell:sell_wood',50),{need:['材木問屋']}),
  t('ゴールド','鍛冶屋の相棒','斧を100回手入れする',c('axe_care',100),{need:['刃物屋']}),
  t('ゴールド','ゼネコン','建築用の木材セットを20回納品する',P('木材セットの納品'),{need:['工務店']}),
  t('ゴールド','森林官','9種類全ての木を伐採する',s('log_kinds',9),{need:['樹木医']}),
  t('ゴールド','ガソリンスタンド','鍛冶師・料理人向けの木炭を20回納品する',P('木炭の納品'),{need:['燃料屋']}),
  t('ゴールド','チェーンソー','一括伐採で原木を合計300本伐採する',c('bulk_log',300),{need:['杉林']}),
  t('ゴールド','吉野杉','良質の原木を50本伐採する',c('log_good',50),{need:['杉林']}),
  t('エピック','林業大国','原木を3000本伐採する',c('log',3000),{need:['森林組合']}),
  t('エピック','アマゾン','苗木を300本植える',c('sapling',300),{need:['グリーンベルト']}),
  t('エピック','屋久杉','自分で植えた木の成長を150本確認する',c('tree_grown',150),{need:['百年の計']}),
  t('エピック','木材コンビナート','板材を3000個作る',c('planks_made',3000),{need:['製材所']}),
  t('エピック','炭の都','木炭を1500個作る',c('charcoal_made',1500),{need:['炭の里']}),
  t('エピック','木材取引所','原木・板材・木炭をNPCに100回売る',c('npc_sell:sell_wood',100),{need:['木材商社']}),
  t('エピック','道具は一生もの','斧を300回手入れする',c('axe_care',300),{need:['鍛冶屋の相棒']}),
  t('エピック','スカイツリー','街の大型建築向けの納品を5回完了する',P('大型建築の納品'),{need:['ゼネコン']}),
  t('エピック','樹海','9種類の樹種すべてで、極上の原木を1本ずつ伐採する',fn(p=>TREE_KINDS.every(w=>(p.tally?.['log_top:'+w]??0)>=1)),{need:['森林官']}),
  t('エピック','石油王','鍛冶師・料理人向けの木炭を50回納品する',P('木炭の納品'),{need:['ガソリンスタンド']}),
  t('エピック','ブルドーザー','一括伐採で原木を合計1500本伐採する',c('bulk_log',1500),{need:['チェーンソー']}),
  t('エピック','檜舞台','極上の原木を30本伐採する',c('log_top',30),{need:['吉野杉']}),
  t('レジェンド','フィンランド','原木を10000本伐採する',c('log',10000),{need:['林業大国']}),
  t('レジェンド','地球の肺','苗木を1000本植える',c('sapling',1000),{need:['アマゾン']}),
  t('レジェンド','縄文杉','自分で植えた木の成長を500本確認する',c('tree_grown',500),{need:['屋久杉']}),
  t('レジェンド','ウッドショック','板材を10000個作る',c('planks_made',10000),{need:['木材コンビナート']}),
  t('レジェンド','カーボンニュートラル','木炭を5000個作る',c('charcoal_made',5000),{need:['炭の都']}),
  t('レジェンド','棟梁','街の大型建築向けの納品をあわせて15回完了する',P('大型建築の納品'),{need:['スカイツリー']}),
  t('レジェンド','法隆寺','極上の原木を100本伐採する',c('log_top',100),{need:['檜舞台']}),
  t('レジェンド','原生林','9種類の樹種それぞれで、極上の原木を10本ずつ伐採する',fn(p=>TREE_KINDS.every(w=>(p.tally?.['log_top:'+w]??0)>=10)),{need:['樹海']}),
  t('レジェンド','産油国','鍛冶師・料理人向けの木炭を100回納品する',P('木炭の納品'),{need:['石油王']}),
  ...dopa('木こり','bonemeal:sapling',[1,50,200,500],(n,first)=>first?'骨粉を使って、苗木を成長させる':`骨粉を使って、苗木を${n}本成長させる`,['原木を伐採している最中に、モブを10匹倒す',c('kill_while:log',10)])]}
];

// ---- building the final list ----
function build(){
 const out=[];
 for(const g of TITLE_GROUPS){
  const label=g.label??g.cat,list=g.titles.map(x=>({...x,cat:g.cat,job:g.job}));
  // マイスター: every earnable title of a rank (one of an exclusive pair), the rank above
  if(g.job)for(const r of ['ブロンズ','シルバー','ゴールド','エピック']){
   const of=list.filter(x=>x.rank===r&&!x.cond.some(k=>k.pending)&&!x.x).map(x=>x.name);
   list.push({rank:nextRank(r),name:`${r}マイスター（${label}）`,hint:`${r}の称号を全て入手する`,cond:[],need:of,cat:g.cat,job:g.job,master:true});
  }
  // アセンデッド: every legend and every マイスター + Lv.50; 使徒 for the first player only, 極めし者 after
  if(g.god){
   const legends=list.filter(x=>(x.rank==='レジェンド'&&!x.cond.some(k=>k.pending)&&!x.x)||x.master).map(x=>x.name);
   const extra=g.ascendedExtra?[g.ascendedExtra]:[];
   list.push({rank:'アセンデッド',name:`${g.god}の使徒`,hint:'サーバーで最初に、レジェンドの称号とマイスターを全て入手＋職業レベル50',cond:[lv(50),...extra],need:legends,cat:g.cat,job:g.job,first:true});
   list.push({rank:'アセンデッド',name:`${g.master}を極めし者`,hint:`「${g.god}の使徒」と同じ条件を達成する（2人目以降）`,cond:[lv(50),...extra,{firstTaken:`${g.god}の使徒`}],need:legends,cat:g.cat,job:g.job});
  }
  out.push(...list);
 }
 // the same name in two groups (or an older title): the group's name is added
 const count={};for(const x of out)count[x.name]=(count[x.name]??0)+1;
 const label=x=>TITLE_GROUPS.find(g=>g.cat===x.cat)?.label??x.cat;
 const display=new Map();
 for(const x of out){const dup=count[x.name]>1||OLD_NAMES.has(x.name);x.title=dup&&!/（.+）$/.test(x.name)?`${x.name}（${label(x)}）`:x.name;display.set(`${x.cat}|${x.name}`,x.title);}
 for(const x of out){x.id=`t:${x.cat}:${x.name}`;x.need=(x.need??[]).map(n=>display.get(`${x.cat}|${n}`)??n);x.pending=x.cond.find(k=>k.pending)?.pending;}
 return out;
}
// titles that existed before (achievements-config.js) keep their names; the new ones with the same name get the job
const OLD_NAMES=new Set(['新米','一人前','熟練者','達人','二刀流','街の採集家','頼れる鉱夫','採取名人','採掘名人','職人見習い','名工','目利き','秘宝の探求者','頼れる人','街の便利屋','街づくりの一員','街の礎','よき先輩','図鑑の入門者','動物博士','討伐の名手','森の守り手','鉱脈の主','豊穣の担い手','鉄の匠','食卓の魔術師','魔導の探究者','海の申し子']);
export const TITLES=build();
const byTitle=new Map(TITLES.map(x=>[x.title,x]));

// ---- checking ----
const tallyOf=(p,k)=>Number.isSafeInteger(p.tally?.[k])?p.tally[k]:0;
const seenOf=(p,k)=>Array.isArray(p.seen?.[k])?p.seen[k]:[];
const codexCount=(p,cat)=>CODEX.filter(v=>v[2]===cat&&p.codex?.[v[0]]).length;
/** Whether one condition holds. */
export function condOk(k,p,db){
 if(k.pending)return false;
 if(k.c)return tallyOf(p,k.c)>=k.n;
 if(k.s)return seenOf(p,k.s).length>=k.n;
 if(k.has)return k.v.every(v=>seenOf(p,k.has).includes(v));
 if(k.sum)return k.sum.reduce((a,x)=>a+tallyOf(p,x),0)>=k.n;
 if(k.lv)return (p.level??1)>=k.lv;
 if(k.codex)return k.n==='all'?codexCount(p,k.codex)>=CODEX.filter(v=>v[2]===k.codex).length:codexCount(p,k.codex)>=k.n;
 if(k.firstTaken){const by=db?.titleFirst?.[byTitle.get(k.firstTaken)?.id];return !!by&&by!==p.id;}
 if(k.fn){try{return !!k.fn(p);}catch{return false;}}
 return false;
}
const hasJob=(p,job)=>p.job===job||p.secondJob===job;
/** Whether a player can have a title now (not looking at whether they already do). */
export function titleOk(x,p,db){
 if(x.pending)return false;
 if(x.job&&!hasJob(p,x.job))return false;
 if(x.job&&(p.level??1)<(RANK_LEVEL[x.rank]??1))return false;
 if(x.need.some(n=>!(p.titles??[]).includes(n)))return false;
 if(x.first){const by=db?.titleFirst?.[x.id];if(by&&by!==p.id)return false;}
 return x.cond.every(k=>condOk(k,p,db));
}
/** Progress for the book: [now, goal] for the first counting condition, or undefined. */
export function titleProgress(x,p){
 const k=x.cond.find(k=>k.c||k.s||k.sum||k.has||k.codex);if(!k)return undefined;
 if(k.c)return [tallyOf(p,k.c),k.n];
 if(k.s)return [seenOf(p,k.s).length,k.n];
 if(k.sum)return [k.sum.reduce((a,y)=>a+tallyOf(p,y),0),k.n];
 if(k.has)return [k.v.filter(v=>seenOf(p,k.has).includes(v)).length,k.v.length];
 if(k.codex){const all=CODEX.filter(v=>v[2]===k.codex).length;return [codexCount(p,k.codex),k.n==='all'?all:k.n];}
}
/** New titles (the engine calls this after every action, achievements-config.js awardTitles). Returns their names. */
export function awardDesignTitles(p,db){
 p.titles??=[];p.achievements??=[];const fresh=[];
 // a title can open the next one (need): go round until nothing new
 for(let round=0;round<6;round++){
  let added=false;
  for(const x of TITLES){
   if(p.achievements.includes(x.id)||!titleOk(x,p,db))continue;
   p.achievements.push(x.id);if(!p.titles.includes(x.title))p.titles.push(x.title);fresh.push(x.title);added=true;
   if(x.first&&db){db.titleFirst??={};db.titleFirst[x.id]??=p.id;}
  }
  if(!added)break;
 }
 return fresh;
}
