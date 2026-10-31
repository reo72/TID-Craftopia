// fishing hints (fish-runtime.js log, food-lore.js descriptions)
// the log's hint: the first two places of a species' biome pattern, in words
const PLACE=[[/deep/,'深海'],[/warm|lukewarm/,'暖かい海'],[/cold_ocean|frozen_ocean/,'冷たい海'],[/ocean/,'海'],[/beach|shore/,'砂浜'],[/frozen|ice|snowy|cold/,'寒い土地'],
 [/taiga|grove/,'タイガ'],[/jungle/,'ジャングル'],[/mangrove/,'マングローブ'],[/swamp/,'沼地'],[/cherry/,'桜の林'],[/flower/,'花の森'],[/river/,'川'],[/plains|meadow/,'平原'],[/forest|birch/,'森']];
export function placeHint(source){const out=[];for(const part of source.split('|')){const w=PLACE.find(([re])=>re.test(part))?.[1];if(w&&!out.includes(w))out.push(w);if(out.length===2)break;}return out.join('・')||'どこか';}
