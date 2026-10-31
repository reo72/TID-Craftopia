// Generates ui/cooptown_saw.json: the woodcutter's 製材台 on the stonecutter (form title "ct:saw", 冒険家 only; BP
// workshop-runtime.js): 製材 (板材・ハーフ・階段・柵) and 炭焼き. Layout and routing: tools/job-block-ui.mjs; pictures:
// tools/build-workshop.py.
// Run: node tools/build-saw-ui.mjs   (from the CoopTown_RP folder)
import {buildJobBlockUI} from './job-block-ui.mjs';
buildJobBlockUI({name:'saw',title:'ct:saw',tabs:5,heading:'木こりの製材台',subheading:'製材・炭焼き',block:'textures/blocks/stonecutter2_side',
 rowsHead:'必要な材料',resultHead:'できる数',accent:[1,.8,.45]});
