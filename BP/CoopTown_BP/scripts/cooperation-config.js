// Adjustable first-pass rules for the adopted cooperative features.
export const COOP_RULES={interestPercent:10,autoRepayPercent:20,loanBase:500,loanPerLevel:100,marketLimit:5,warehouseTypeCap:100000,mentorLevel:5,studentMaxLevel:10,mentorDailyLimit:3};
export const FACILITIES={workshop:{name:'専門作業台',price:600,description:'専門レシピを製作できる個人設備'},rest:{name:'休憩設備',price:300,description:'5分に1回、無料でストレス20回復'},stall:{name:'販売許可',price:300,description:'プレイヤー市場へ商品を出品できる'}};
export const SPECIAL_ITEMS=[
 ['timber_beam','補強木材','beam'],['refined_ingot','精製金属','refined'],['herb_bundle','薬草の束','herbs'],['tool_parts','道具部品','parts'],['trail_ration','探索食','ration'],['rune_charm','支援の護符','charm'],['fish_oil','魚油','oil'],['expedition_kit','協力探索セット','kit']
];
export const SPECIAL_NAMES=Object.fromEntries(SPECIAL_ITEMS.map(([id,name])=>['cooptown:'+id,name]));
export const SPECIAL_TEXTURES=Object.fromEntries(SPECIAL_ITEMS.map(([id,,texture])=>['cooptown:'+id,'cooperation/'+texture]));
export const SPECIAL_RECIPES=[
 {name:'補強木材',job:'木こり',level:3,inputs:[['minecraft:oak_planks',16]],output:['cooptown:timber_beam',2]},
 {name:'精製金属',job:'鍛冶師',level:3,inputs:[['minecraft:iron_ingot',4],['minecraft:coal',1]],output:['cooptown:refined_ingot',2]},
 {name:'薬草の束',job:'農家',level:3,inputs:[['minecraft:wheat',8],['minecraft:poppy',2]],output:['cooptown:herb_bundle',2]},
 {name:'道具部品',job:'鍛冶師',level:3,inputs:[['cooptown:timber_beam',1],['cooptown:refined_ingot',1]],output:['cooptown:tool_parts',2]},
 {name:'探索食',job:'料理人',level:3,inputs:[['cooptown:herb_bundle',1],['cooptown:fish_oil',1]],output:['cooptown:trail_ration',2]},
 {name:'支援の護符',job:'付与術師',level:3,inputs:[['minecraft:paper',4],['minecraft:lapis_lazuli',4]],output:['cooptown:rune_charm',1]},
 {name:'魚油',job:'釣り師',level:3,inputs:[['minecraft:cod',4],['minecraft:glass_bottle',1]],output:['cooptown:fish_oil',2]},
 {name:'協力探索セット',job:'鍛冶師',level:5,inputs:[['cooptown:tool_parts',2],['cooptown:rune_charm',1]],output:['cooptown:expedition_kit',1]}
];
export const TOWN_STAGES=[
 {level:1,name:'共同倉庫',description:'素材を預け、必要な仲間が引き出せる'},
 {level:2,name:'共同作業場',description:'専門作業台未購入でも専門レシピが利用可能'},
 {level:3,name:'共同休憩所',description:'個人設備未購入でも無料休憩が利用可能'},
 {level:4,name:'共同市場',description:'販売許可未購入でも市場へ出品可能'},
 {level:5,name:'探索拠点',description:'探索地への初訪問経験値が増加'}
];
