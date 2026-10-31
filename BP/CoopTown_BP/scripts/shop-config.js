// Server shop (book menu ショップ): what the server sells, by category. Prices are first drafts (coins).
// The engine action 'shop.buy' only sells what is listed here.
export const SHOP=[
 {name:'素材',items:[
  {item:'minecraft:oak_log',name:'オークの原木',price:40,text:'建築や製作に使う基本の木材です。'},
  {item:'minecraft:cobblestone',name:'丸石',price:10,text:'建築に使う石材です。'},
  {item:'minecraft:coal',name:'石炭',price:30,text:'精錬や松明の材料になります。'},
  {item:'minecraft:iron_ingot',name:'鉄インゴット',price:120,text:'道具や防具の材料になる金属です。'},
  {item:'minecraft:glass',name:'ガラス',price:20,text:'窓や装飾に使えます。'},
  {item:'minecraft:white_wool',name:'白色の羊毛',price:25,text:'ベッドや装飾に使えます。'}]},
 {name:'食料',items:[
  {item:'minecraft:bread',name:'パン',price:60,text:'手軽に空腹を回復できます。'},
  {item:'minecraft:wheat',name:'小麦',price:20,text:'パンやケーキの材料です。'},
  {item:'minecraft:apple',name:'リンゴ',price:40,text:'少し空腹を回復します。'},
  {item:'minecraft:carrot',name:'ニンジン',price:30,text:'植えると育てられます。'},
  {item:'minecraft:cooked_beef',name:'ステーキ',price:90,text:'空腹を大きく回復します。'},
  // the food catalogue's new ingredients (growing them comes later)
  {item:'cooptown:rice',name:'米',price:30,text:'炊いてご飯や料理に使います。'},
  {item:'cooptown:tomato',name:'トマト',price:25,text:'ソースやサラダの材料です。'},
  {item:'cooptown:onion',name:'タマネギ',price:20,text:'だしや炒め物の材料です。'},
  {item:'cooptown:cabbage',name:'キャベツ',price:25,text:'サラダや煮込みの材料です。'},
  {item:'cooptown:cucumber',name:'キュウリ',price:20,text:'サラダや漬物の材料です。'},
  {item:'cooptown:corn',name:'トウモロコシ',price:25,text:'焼いたりスープにしたりできます。'},
  {item:'cooptown:lemon',name:'レモン',price:30,text:'飲み物やお菓子の香りづけに。'},
  {item:'cooptown:grape',name:'ブドウ',price:30,text:'ジュースやレーズンの材料です。'},
  {item:'cooptown:strawberry',name:'イチゴ',price:35,text:'お菓子や飲み物の材料です。'},
  {item:'cooptown:tea_leaves',name:'茶葉',price:40,text:'お茶をいれる材料です。'},
  {item:'cooptown:coffee_beans',name:'コーヒー豆',price:50,text:'コーヒーの材料です。'},
  {item:'cooptown:salt',name:'塩',price:10,text:'多くの料理の味つけに使います（期限なし）。'},
  {item:'cooptown:mint',name:'ミント',price:25,text:'飲み物やお菓子に使います。'},
  {item:'cooptown:black_pepper',name:'黒こしょう',price:40,text:'肉料理の味つけに使います。'},
  {item:'cooptown:soybeans',name:'大豆',price:25,text:'豆腐やしょうゆの材料です。'}]},
 {name:'道具',items:[
  {item:'minecraft:torch',name:'松明',price:5,text:'暗い場所を照らします。'},
  {item:'minecraft:fishing_rod',name:'釣り竿',price:300,text:'釣りに使う道具です。'},
  {item:'minecraft:iron_pickaxe',name:'鉄のツルハシ',price:500,text:'鉄以上の鉱石を掘れます。'},
  {item:'minecraft:iron_axe',name:'鉄の斧',price:450,text:'木を素早く切れます。'},
  {item:'minecraft:shears',name:'ハサミ',price:200,text:'羊毛や葉を集められます。'}]}];
export const SHOP_ITEMS=SHOP.flatMap(c=>c.items);
