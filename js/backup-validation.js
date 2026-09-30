import {ALL_CATEGORIES,OUTCOMES,REASONS,FACTORS,LEARNING_TYPES,LEARNING_STATES,PRIORITIES} from './catalog.js';
const fail = message => {throw new Error(`バックアップを復元できません：${message}`);};
const obj = v => v!==null&&typeof v==='object'&&!Array.isArray(v);
const string = (v,max,required=false) => typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0);
const member = (list,v) => list.some(x=>x[0]===v);
const date = v => typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T12:00:00Z`))&&new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)===v;
const time = v => typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const flag = v => v===undefined||v===null||typeof v==='boolean';
function textFields(row,keys,max=1000) {for(const key of keys) if(row[key]!==undefined&&!string(row[key],max)) fail(`${key}の文字列が不正です。`);}
function noUnsafeKeys(value) {if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(['__proto__','prototype','constructor'].includes(key))fail('使用できない設定項目があります。');noUnsafeKeys(value[key]);}}
export function validateDatabase(value) {
  if(!obj(value)||value.schemaVersion!==1)fail('未対応のデータ形式です。');
  if(!Number.isInteger(value.revision)||value.revision<0)fail('保存番号が不正です。');
  const db=structuredClone(value);noUnsafeKeys(db);
  for(const key of ['shifts','encounters','learningTasks','reflections']) {
    if(db[key]===undefined&&['learningTasks','reflections'].includes(key))db[key]=[];
    if(!Array.isArray(db[key])||db[key].length>100000)fail(`${key}の一覧が不正です。`);
    const ids=new Set();
    for(const row of db[key]) {
      if(!obj(row)||!string(row.id,200,true)||ids.has(row.id))fail(`${key}のIDが不正または重複しています。`);ids.add(row.id);
      for(const field of ['createdAt','updatedAt']) if(row[field]!==undefined&&(!string(row[field],100)||Number.isNaN(Date.parse(row[field]))))fail('作成・更新日時が不正です。');
    }
  }
  if(db.settings===undefined)db.settings={};
  if(!obj(db.settings))fail('設定が不正です。');
  for(const s of db.shifts) {
    if(!date(s.date)||!string(s.storeAlias,60,true)||!Number.isInteger(s.breakMinutes)||s.breakMinutes<0||s.breakMinutes>1440||typeof s.nextDay!=='boolean')fail('勤務記録の項目が不正です。');
    if(typeof s.start!=='string'||typeof s.end!=='string'||s.start&&!time(s.start)||s.end&&(!time(s.end)||!s.start))fail('勤務時刻が不正です。');
    if(s.start&&s.end){const m=t=>Number(t.slice(0,2))*60+Number(t.slice(3));if(m(s.end)-m(s.start)+(s.nextDay?1440:0)-s.breakMinutes<0)fail('勤務時間が不正です。');}
    textFields(s,['note']);
  }
  const shifts=new Map(db.shifts.map(s=>[s.id,s]));
  for(const e of db.encounters) {
    if(!date(e.date)||!time(e.time)||!(member(OUTCOMES,e.outcome)||e.outcome==='handoff')||!flag(e.panasonicProposed)||!flag(e.staffHandoff)||!flag(e.needsFollowUp))fail('接客記録の項目が不正です。');
    if(e.shiftId!=null&&(!string(e.shiftId,200,true)||shifts.get(e.shiftId)?.date!==e.date))fail('接客と勤務の関連が不正です。');
    if(e.legacyOutcome!==undefined&&e.legacyOutcome!=='handoff')fail('旧分類が不正です。');
    if(!Array.isArray(e.products)||!e.products.length||e.products.length>1000)fail('商品明細が不正です。');
    const ids=new Set();
    for(const p of e.products) {
      if(!obj(p)||!string(p.id,200,true)||ids.has(p.id)||!member(ALL_CATEGORIES,p.category))fail('商品明細のID・カテゴリーが不正です。');ids.add(p.id);
      if(p.quantity!=null&&(!Number.isInteger(p.quantity)||p.quantity<0||p.quantity>999))fail('購入数量が不正です。');
      textFields(p,['proposedModel','purchasedManufacturer','purchasedModel'],100);
    }
    if(!Array.isArray(e.reasons))fail('理由の一覧が不正です。');
    const codes=new Set();for(const r of e.reasons){if(!obj(r)||!member(REASONS,r.code)||!member(FACTORS,r.factor)||codes.has(r.code))fail('理由・要因分類が不正です。');codes.add(r.code);}
    textFields(e,['needs','note']);
  }
  const encounters=new Set(db.encounters.map(e=>e.id));
  for(const t of db.learningTasks) {
    if(!string(t.title,200,true)||!member(ALL_CATEGORIES,t.category)||!member(LEARNING_TYPES,t.type)||!member(PRIORITIES,t.priority)||!member(LEARNING_STATES,t.state))fail('学習課題が不正です。');
    if(t.encounterId!=null&&!encounters.has(t.encounterId))fail('課題と接客の関連が不正です。');
    textFields(t,['answer','nextAction'],2000);
  }
  const days=new Set();for(const r of db.reflections){if(!date(r.date)||days.has(r.date))fail('振り返りの日付が不正または重複しています。');days.add(r.date);textFields(r,['success','difficulty','learned','nextAction'],2000);}
  return db;
}
export const backupCounts = db => ({勤務:db.shifts.length,接客:db.encounters.length,商品明細:db.encounters.reduce((n,e)=>n+e.products.length,0),学習課題:db.learningTasks.length,振り返り:db.reflections.length,設定項目:Object.keys(db.settings||{}).length});
export function makeBackup(db) {return JSON.stringify({format:'oa-sales-coach-backup',backupVersion:1,exportedAt:new Date().toISOString(),data:db},null,2);}
export function parseBackup(text) {
  if(new TextEncoder().encode(text).length>10*1024*1024)fail('ファイルは10MB以内にしてください。');
  let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('JSON形式ではありません。');}
  if(value?.format==='oa-sales-coach-backup'){if(value.backupVersion!==1)fail('未対応のバックアップ版です。');return validateDatabase(value.data);}
  return validateDatabase(value);
}
