import {selectMonth} from './analytics.js';
import {ALL_CATEGORIES,OUTCOMES,REASONS,FACTORS,LEARNING_TYPES,PRIORITIES,LEARNING_STATES,label} from './catalog.js';
import {workedMinutes} from './records.js';
const flag=v=>v===true?'あり':v===false?'なし':'未記録';
// 引用符・改行を保持し、表計算ソフトの数式として実行される文字列を無害化します。
export function csvCell(value) {let text=String(value??'');if(/^[\s\uFEFF]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return `"${text.replaceAll('"','""')}"`;}
export const toCSV = rows => '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
export function createCSV(db,month,kind) {
  const data=selectMonth(db,month),stores=new Map(db.shifts.map(s=>[s.id,s.storeAlias]));let rows;
  if(kind==='shifts')rows=[['勤務ID','勤務日','店舗','開始','終了','翌日終了','休憩分','実働分','メモ','作成日時','更新日時'],...data.shifts.map(s=>[s.id,s.date,s.storeAlias,s.start,s.end,s.nextDay?'はい':'いいえ',s.breakMinutes,workedMinutes(s),s.note,s.createdAt,s.updatedAt])];
  else if(kind==='encounters')rows=[['接客ID','接客日','時刻','勤務ID','店舗','カテゴリー','Panasonic提案','店舗引継ぎ','接客結果','理由と要因','ニーズ','補足','追記待ち','旧結果','作成日時','更新日時'],...data.encounters.map(e=>[e.id,e.date,e.time,e.shiftId,stores.get(e.shiftId)||'未設定',[...new Set(e.products.map(p=>label(ALL_CATEGORIES,p.category)))].join('／'),flag(e.panasonicProposed),flag(e.staffHandoff),label(OUTCOMES,e.outcome),e.reasons.map(r=>`${label(REASONS,r.code)}［${label(FACTORS,r.factor)}］`).join('／'),e.needs,e.note,e.needsFollowUp?'はい':'いいえ',e.legacyOutcome||'',e.createdAt,e.updatedAt])];
  else if(kind==='products')rows=[['接客ID','接客日','商品ID','カテゴリー','提案型番','購入メーカー','購入型番','購入数量','接客全体の結果'],...data.encounters.flatMap(e=>e.products.map(p=>[e.id,e.date,p.id,label(ALL_CATEGORIES,p.category),p.proposedModel,p.purchasedManufacturer,p.purchasedModel,p.quantity,label(OUTCOMES,e.outcome)]))];
  else if(kind==='learningTasks')rows=[['課題ID','課題名','カテゴリー','関連接客ID','種類','優先度','状態','学習内容・答え','次回試すこと','作成日時','更新日時'],...data.learningTasks.map(t=>[t.id,t.title,label(ALL_CATEGORIES,t.category),t.encounterId,label(LEARNING_TYPES,t.type),label(PRIORITIES,t.priority),label(LEARNING_STATES,t.state),t.answer,t.nextAction,t.createdAt,t.updatedAt])];
  else if(kind==='reflections')rows=[['振り返りID','日付','うまくいったこと','難しかったこと','学んだこと','次回試すこと','作成日時','更新日時'],...data.reflections.map(r=>[r.id,r.date,r.success,r.difficulty,r.learned,r.nextAction,r.createdAt,r.updatedAt])];
  else throw new Error('出力する記録の種類を選んでください。');
  return toCSV(rows);
}
export function downloadFile(text,filename,type) {
  const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
