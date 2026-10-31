import {COOP_RULES,FACILITIES,TOWN_STAGES} from './cooperation-config.js';
import {TRADE_ITEMS,dayKey} from './game-config.js';
export async function runCooperation(player,feature,ctx){
 const {game,refreshGame,choose,confirm,ModalFormData,world,integer,demand,itemName}=ctx;
 const s=refreshGame(player),p=s.player;
 const execute=(name,a)=>{const message=game.execute(player.id,name,a);refreshGame(player);return {title:'協力サーバー',message};};
 const amount=async(label,max=64)=>{const r=await new ModalFormData().title('ct:in|'+'数量を入力').textField(label,'1～'+max).show(player);if(r.canceled)return;return integer(r.formValues[0],1,max);};
 const selection=async(title,body,entries)=>choose(player,title,body,entries);
 if(feature==='warehouse'){
  const i=await selection('共有倉庫','公共の素材です。預けた素材はほかの参加者も引き出せます。\n'+Object.entries(s.warehouse.items).filter(([,n])=>n>0).map(([id,n])=>itemName(id)+' ×'+n).join('\n'),['素材を預ける','素材を引き出す','利用履歴']);if(i===undefined)return;
  if(i===2)return {title:'共有倉庫の履歴',message:s.warehouse.log.map(v=>v.name+' '+itemName(v.text.split(' ')[0])+' '+v.text.split(' ').at(-1)).join('\n')||'利用履歴はありません。'};
  const ids=i===0?TRADE_ITEMS:Object.keys(s.warehouse.items).filter(id=>s.warehouse.items[id]>0);demand(ids.length,'倉庫は空です。');const j=await selection('素材を選択',i===0?'名前や特殊効果のない素材が対象です。':'受け取る素材を選んでください。',ids.map(itemName));if(j===undefined)return;const n=await amount(itemName(ids[j]));if(n===undefined)return;if(!await confirm(player,'共有倉庫',`${itemName(ids[j])} ×${n}を${i===0?'公共倉庫へ預けます':'受け取ります'}。`))return;return execute(i===0?'warehouse.deposit':'warehouse.withdraw',{item:ids[j],amount:n});
 }
 if(feature==='market'){
  const i=await selection('プレイヤー市場',`所持金 ${p.coins}コイン\n出品には販売許可、または街Lv.4が必要です。`,['商品を出品する',...s.market.map(q=>`${q.name}：${itemName(q.item)}×${q.amount} / ${q.price}コイン`)]);if(i===undefined)return;
  if(i===0){const ids=TRADE_ITEMS;const r=await new ModalFormData().title('ct:in|'+'出品する').dropdown('商品',ids.map(itemName)).textField('数量（1～64）','16').textField('合計価格（1～100000コイン）','100').show(player);if(r.canceled)return;const [index,n,pay]=r.formValues,item=ids[integer(index,0,ids.length-1)],qty=integer(n,1,64),price=integer(pay,1,100000);if(!await confirm(player,'出品の確認',`${itemName(item)} ×${qty}\n合計 ${price}コイン\n商品を預かります。`))return;return execute('market.list',{item,amount:qty,price});}
  const q=s.market[i-1],own=q.owner===player.id;if(!await confirm(player,own?'出品の取消':'購入の確認',`${itemName(q.item)} ×${q.amount}\n${own?'商品を返却します。':q.price+'コインを支払います。'}`))return;return execute(own?'market.cancel':'market.buy',{id:q.id});
 }
 if(feature==='facilities'){
  const options=Object.values(FACILITIES).map(f=>`${f.name} ${f.price}コイン`);const i=await selection('設備・融資',`所持金 ${p.coins}コイン\n借入残高 ${p.loan.remaining}コイン\n仕事収入からの自動返済 ${p.loan.auto?'ON':'OFF'}\n融資は設備代へ直接支払い。固定利息${COOP_RULES.interestPercent}%、時間経過で利息は増えません。`,[...options,'手動返済','自動返済を切り替える']);if(i===undefined)return;
  if(i===3){const n=await amount('返済するコイン',Math.max(1,p.loan.remaining));if(n===undefined)return;if(!await confirm(player,'返済',n+'コインを返済します。'))return;return execute('loan.repay',{amount:n});}
  if(i===4)return execute('loan.auto',{});
  const key=Object.keys(FACILITIES)[i],f=FACILITIES[key],total=Math.ceil(f.price*(100+COOP_RULES.interestPercent)/100);const method=await selection(f.name,f.description+`\n現金価格 ${f.price}コイン\n融資元金 ${f.price} / 返済総額 ${total}コイン\n借入上限 ${COOP_RULES.loanBase+p.level*COOP_RULES.loanPerLevel}\n返済方法：手動 または仕事収入の${COOP_RULES.autoRepayPercent}%\n未返済の借入がある場合は追加借入不可。`,['所持金で購入','融資で購入']);if(method===undefined)return;if(!await confirm(player,'取得の確認',f.name+(method===1?`を融資で取得。返済総額 ${total}コインです。`:`を${f.price}コインで購入します。`)))return;return execute('facility.buy',{facility:key,finance:method===1});
 }
 if(feature==='rest'){
  const ids=['cooptown:trail_ration','cooptown:rune_charm','cooptown:expedition_kit'];const i=await selection('休憩と支援品',`ストレス ${p.stress} / 100\n80以上では仕事の経験値が10%低下。行動制限はありません。`,['設備で休憩（-20 / 5分ごと）',...ids.map((id,i)=>itemName(id)+'を1個使う（-'+[40,10,60][i]+'）')]);if(i===undefined)return;if(!await confirm(player,'休憩',i===0?'設備で休憩します。':itemName(ids[i-1])+'を1個消費します。'))return;return execute(i===0?'rest.facility':'supplies.use',i===0?{}:{item:ids[i-1]});
 }
 if(feature==='town.stages')return {title:'街の施設解放',message:`街 Lv.${s.town.level} / 累計納品 ${s.town.total}個\n\n`+TOWN_STAGES.map(v=>(s.town.level>=v.level?'解放済み':'未解放')+' Lv.'+v.level+' '+v.name+'\n'+v.description).join('\n\n')+'\n\n施設の建物はプレイヤーが建築します。設備の利用権が街レベルで解放されます。'};
 if(feature==='explore'){
  const i=await selection('協力探索',`登録した探索地へ近づくと初訪問を記録します。\n初回は経験値とガチャ券1枚。\n街の図鑑 ${Object.keys(s.communityCodex).length}種類。`,['街の図鑑を見る',...s.landmarks.map(v=>(p.explored.includes(v.id)?'発見済み ':'未発見 ')+v.name)]);if(i===undefined)return;if(i===0)return {title:'街の図鑑',message:Object.entries(s.communityCodex).map(([id,r])=>id.replace('minecraft:','')+'：初発見 '+r.name).join('\n')||'まだ発見がありません。'};const place=s.landmarks[i-1];return {title:place.name,message:`${place.location.dimension}\nX ${place.location.x} / Y ${place.location.y} / Z ${place.location.z}\n16ブロック以内で発見。仲間と一緒に訪問できます。`};
 }
 if(feature==='mentor'){
  const relevant=s.mentorships.filter(q=>q.day===dayKey()&&(q.student===player.id||q.mentor===player.id));const i=await selection('見習い依頼',`見習いはLv.${COOP_RULES.studentMaxLevel}以下、指導役はLv.${COOP_RULES.mentorLevel}以上。\n承認後に見習いが原木16個を納品。\n見習い100コイン・経験値60、指導役50コイン・経験値30。\n見習い1日1回、指導役1日3回。`,['指導役へ申し込む',...relevant.map(q=>(q.student===player.id?'自分の申込':'指導の依頼')+' / '+(q.accepted?'承認済み':'未承認'))]);if(i===undefined)return;
  if(i===0){const candidates=world.getAllPlayers().filter(v=>v.id!==player.id);demand(candidates.length,'オンラインの相手がいません。');const j=await selection('指導役を選ぶ','相手が手帳の見習い依頼から承認する必要があります。',candidates.map(v=>v.name));if(j===undefined)return;refreshGame(candidates[j]);return execute('mentor.invite',{mentor:candidates[j].id});}
  const q=relevant[i-1],student=q.student===player.id;const j=await selection('見習い依頼を操作',student?'承認済みなら原木16個を納品できます。':'指導を引き受ける場合は承認してください。',[student?'原木16個を納品':'承認する','取り消す']);if(j===undefined)return;if(!await confirm(player,'確認',j===1?'この申込を取り消します。':student?'原木16個を消費して完了します。':'この見習い依頼を承認します。'))return;return execute(j===1?'mentor.cancel':student?'mentor.deliver':'mentor.accept',{id:q.id});
 }
 return {title:'案内手帳',message:'この項目は見つかりません。'};
}
