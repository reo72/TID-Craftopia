// The enchanting table (付与術師 only, enchant-runtime.js): which enchantments it can roll, on what.
// Vanilla-like: the bookshelves around the table set the three costs (up to 30), the enchantments are random,
// weighted as in vanilla; the enchanter's craft level makes them a little stronger (ENCHANT_RULES).
// Treasure enchantments (mending, frost walker, curses...) never come from the table, as in vanilla.
export const ENCHANT_JOB='付与術師';
export const ENCHANT_RULES={maxShelves:15,bonusPerLevels:5,maxBonus:6,lapis:'minecraft:lapis_lazuli'};
// tabs, in the RP's order (tools/build-enchant-ui.mjs)
export const ENCHANT_TABS=[
 {label:'武器',icon:'textures/cooptown/items/iron_sword',kinds:['sword','bow','crossbow','trident','mace']},
 {label:'道具',icon:'textures/cooptown/items/iron_pickaxe',kinds:['axe','digger','rod','shears']},
 {label:'防具',icon:'textures/cooptown/items/iron_chestplate',kinds:['helmet','chest','legs','boots']},
 {label:'本',icon:'textures/cooptown/items/book',kinds:['book']}];
/** The kind of an item for the table, or undefined (not enchantable here). */
export function kindOf(id){
 const name=String(id).replace(/^minecraft:/,'');
 if(name==='book')return 'book';
 if(/_sword$/.test(name))return 'sword';
 if(/_axe$/.test(name))return 'axe';
 if(/_(pickaxe|shovel|hoe)$/.test(name))return 'digger';
 if(/_helmet$/.test(name))return 'helmet';
 if(/_chestplate$/.test(name))return 'chest';
 if(/_leggings$/.test(name))return 'legs';
 if(/_boots$/.test(name))return 'boots';
 return {bow:'bow',crossbow:'crossbow',trident:'trident',mace:'mace',fishing_rod:'rod',shears:'shears'}[name];
}
// how well an item takes enchantments (vanilla enchantability; higher = stronger and more of them)
export function enchantability(id){
 const name=String(id).replace(/^minecraft:/,''),armor=/_(helmet|chestplate|leggings|boots)$/.test(name);
 const m=/^(wooden|stone|iron|golden|diamond|netherite|leather|chainmail|turtle)_/.exec(name)?.[1];
 if(m)return {wooden:15,stone:5,iron:armor?9:14,golden:armor?25:22,diamond:10,netherite:15,leather:15,chainmail:12,turtle:9}[m];
 return name==='mace'?15:1;
}
const ARMOR=['helmet','chest','legs','boots'],ALL=['sword','axe','digger','bow','crossbow','trident','mace','rod','shears',...ARMOR];
// id (Bedrock enchantment id), Japanese name, max level, vanilla weight, kinds; group: only one per group;
// excl: may not come with these
export const ENCHANTS=[
 {id:'efficiency',name:'効率強化',max:5,weight:10,on:['axe','digger','shears']},
 {id:'silk_touch',name:'シルクタッチ',max:1,weight:1,on:['axe','digger'],group:'loot'},
 {id:'fortune',name:'幸運',max:3,weight:2,on:['axe','digger'],group:'loot'},
 {id:'unbreaking',name:'耐久力',max:3,weight:5,on:ALL},
 {id:'sharpness',name:'ダメージ増加',max:5,weight:10,on:['sword','axe'],group:'damage'},
 {id:'smite',name:'アンデッド特効',max:5,weight:5,on:['sword','axe','mace'],group:'damage'},
 {id:'bane_of_arthropods',name:'虫特効',max:5,weight:5,on:['sword','axe','mace'],group:'damage'},
 {id:'density',name:'重量',max:5,weight:5,on:['mace'],group:'damage'},
 {id:'breach',name:'防具貫通',max:4,weight:2,on:['mace'],group:'damage'},
 {id:'knockback',name:'ノックバック',max:2,weight:5,on:['sword']},
 {id:'fire_aspect',name:'火属性',max:2,weight:2,on:['sword','mace']},
 {id:'looting',name:'ドロップ増加',max:3,weight:2,on:['sword']},
 {id:'power',name:'射撃ダメージ増加',max:5,weight:10,on:['bow']},
 {id:'punch',name:'パンチ',max:2,weight:2,on:['bow']},
 {id:'flame',name:'フレイム',max:1,weight:2,on:['bow']},
 {id:'infinity',name:'無限',max:1,weight:1,on:['bow']},
 {id:'multishot',name:'拡散',max:1,weight:2,on:['crossbow'],group:'bolt'},
 {id:'piercing',name:'貫通',max:4,weight:10,on:['crossbow'],group:'bolt'},
 {id:'quick_charge',name:'高速装填',max:3,weight:5,on:['crossbow']},
 {id:'impaling',name:'水生特効',max:5,weight:2,on:['trident']},
 {id:'riptide',name:'激流',max:3,weight:2,on:['trident'],excl:['loyalty','channeling']},
 {id:'loyalty',name:'忠誠',max:3,weight:5,on:['trident'],excl:['riptide']},
 {id:'channeling',name:'召雷',max:1,weight:1,on:['trident'],excl:['riptide']},
 {id:'luck_of_the_sea',name:'宝釣り',max:3,weight:2,on:['rod']},
 {id:'lure',name:'入れ食い',max:3,weight:2,on:['rod']},
 {id:'protection',name:'ダメージ軽減',max:4,weight:10,on:ARMOR,group:'protection'},
 {id:'fire_protection',name:'火炎耐性',max:4,weight:5,on:ARMOR,group:'protection'},
 {id:'blast_protection',name:'爆発耐性',max:4,weight:2,on:ARMOR,group:'protection'},
 {id:'projectile_protection',name:'飛び道具耐性',max:4,weight:5,on:ARMOR,group:'protection'},
 {id:'respiration',name:'水中呼吸',max:3,weight:2,on:['helmet']},
 {id:'aqua_affinity',name:'水中採掘',max:1,weight:2,on:['helmet']},
 {id:'thorns',name:'棘の鎧',max:3,weight:1,on:['chest']},
 {id:'feather_falling',name:'落下耐性',max:4,weight:5,on:['boots']},
 {id:'depth_strider',name:'水中歩行',max:3,weight:2,on:['boots']}
];
export const ROMAN=['','I','II','III','IV','V'];
// names of the enchantments the table never rolls (they still come on books, e.g. at the anvil)
const TREASURE_NAMES={mending:'修繕',frost_walker:'氷渡り',soul_speed:'ソウルスピード',swift_sneak:'スニーク速度上昇',binding:'束縛の呪い',vanishing:'消滅の呪い',wind_burst:'風爆'};
// one line on what each enchantment does (the enchanter's bookshelf shows it)
export const ENCHANT_DESC={efficiency:'採掘や伐採が速くなる',silk_touch:'ブロックをそのまま回収できる',fortune:'鉱石などのドロップが増える',unbreaking:'耐久値が減りにくくなる',
 sharpness:'攻撃のダメージが増える',smite:'アンデッドへのダメージが増える',bane_of_arthropods:'虫系の敵へのダメージが増える',density:'落下攻撃のダメージが増える',breach:'相手の防具を貫く',
 knockback:'攻撃で相手を吹き飛ばす',fire_aspect:'攻撃で相手を燃やす',looting:'敵のドロップが増える',power:'矢のダメージが増える',punch:'矢で相手を吹き飛ばす',flame:'火のついた矢を放つ',
 infinity:'矢を消費しなくなる',multishot:'矢を3本同時に放つ',piercing:'矢が敵を貫通する',quick_charge:'装填が速くなる',impaling:'水中の生き物へのダメージが増える',
 riptide:'水中や雨の中で突進できる',loyalty:'投げたトライデントが戻ってくる',channeling:'雷雨のとき雷を落とす',luck_of_the_sea:'釣りでお宝が出やすくなる',lure:'魚が早くかかる',
 protection:'あらゆるダメージを減らす',fire_protection:'火のダメージを減らす',blast_protection:'爆発のダメージを減らす',projectile_protection:'飛び道具のダメージを減らす',
 respiration:'水中で長く息が続く',aqua_affinity:'水中で速く掘れる',thorns:'攻撃してきた相手にダメージを返す',feather_falling:'落下ダメージを減らす',depth_strider:'水中を速く歩ける',
 mending:'経験値で装備の耐久値を回復',frost_walker:'水の上を凍らせて歩ける',soul_speed:'ソウルサンドの上を速く歩ける',swift_sneak:'スニーク中に速く歩ける',
 binding:'装備を外せなくなる呪い',vanishing:'死ぬと消えてしまう呪い',wind_burst:'落下攻撃で高く跳ね上がる'};
/** Japanese name of an enchantment id ("minecraft:" optional), with its level in Roman numerals when given. */
export function enchantName(id,level){
 const key=String(id).replace(/^minecraft:/,''),name=ENCHANTS.find(e=>e.id===key)?.name??TREASURE_NAMES[key]??key;
 return level?`${name} ${ROMAN[level]??level}`:name;
}
