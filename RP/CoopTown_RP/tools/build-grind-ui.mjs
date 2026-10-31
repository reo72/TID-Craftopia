// Generates ui/cooptown_grind.json: the miner's grindstone (form title "ct:grind", 冒険家 only; BP workshop-runtime.js):
// 鉱石選別 and 道具の手入れ. Layout and routing: tools/job-block-ui.mjs; pictures: tools/build-workshop.py.
// Run: node tools/build-grind-ui.mjs   (from the CoopTown_RP folder)
import {buildJobBlockUI} from './job-block-ui.mjs';
buildJobBlockUI({name:'grind',title:'ct:grind',tabs:2,heading:'鉱夫の砥石',subheading:'鉱石選別・道具の手入れ',block:'textures/blocks/grindstone_side',
 rowsHead:'材料',resultHead:'結果',accent:[.62,.86,1]});
