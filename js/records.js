import { ALL_CATEGORIES, OUTCOMES, FACTORS, REASONS, LEARNING_TYPES, PRIORITIES, LEARNING_STATES, uid } from './catalog.js';
const member = (list, value) => list.some(x => x[0] === value);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
// 読み込み時は表示用に変換するだけ。未編集の旧記録を一括で上書きしません。
export function compatibleEncounter(record) {
  if (record.outcome === 'handoff') return { ...record, outcome: 'unknown', staffHandoff: true, legacyOutcome: 'handoff' };
  return { ...record, staffHandoff: record.staffHandoff ?? null };
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
const validTime = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function normalizeShift(input) {
  if (!validDate(input.date)) throw new Error('勤務日を入力してください。');
  if (!clean(input.storeAlias, 60)) throw new Error('店舗の識別名を入力してください。');
  if (input.start && !validTime(input.start) || input.end && !validTime(input.end)) throw new Error('勤務時刻を確認してください。');
  if (input.end && !input.start) throw new Error('終了時刻を記録する場合は開始時刻も入力してください。');
  const breakMinutes = Number(input.breakMinutes || 0);
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 1440) throw new Error('休憩は0〜1440分の整数で入力してください。');
  const result = { date: input.date, storeAlias: clean(input.storeAlias,60), start: input.start || '', end: input.end || '', nextDay: Boolean(input.nextDay), breakMinutes, note: clean(input.note) };
  if (result.start && result.end && workedMinutes(result) < 0) throw new Error('終了時刻と休憩時間を確認してください。翌日終了の場合はチェックを付けてください。');
  return result;
}
export function workedMinutes(shift) {
  if (!shift.start || !shift.end) return null;
  const minutes = time => Number(time.slice(0,2))*60 + Number(time.slice(3));
  return minutes(shift.end) - minutes(shift.start) + (shift.nextDay ? 1440 : 0) - shift.breakMinutes;
}
export function normalizeEncounter(input, shifts, { allowUnknownProposal = false, allowUnknownHandoff = false } = {}) {
  if (!validDate(input.date) || !validTime(input.time)) throw new Error('接客した日付と時刻を確認してください。');
  if (!member(OUTCOMES, input.outcome)) throw new Error('接客結果を選んでください。');
  const staffHandoff = input.staffHandoff ?? null;
  if (typeof staffHandoff !== 'boolean' && !(allowUnknownHandoff && staffHandoff === null)) throw new Error('店舗スタッフへの引継ぎ「あり」または「なし」を選んでください。');
  const panasonicProposed = input.panasonicProposed ?? null;
  if (typeof panasonicProposed !== 'boolean' && !(allowUnknownProposal && panasonicProposed === null)) throw new Error('Panasonic製品の「提案あり」または「提案なし」を選んでください。');
  if (!Array.isArray(input.products) || !input.products.length) throw new Error('商品カテゴリーを選んでください。');
  if (input.shiftId && !shifts.some(s => s.id === input.shiftId && s.date === input.date)) throw new Error('接客日と同じ日の勤務を選んでください。');
  const products = input.products.map(p => {
    if (!member(ALL_CATEGORIES, p.category)) throw new Error('すべての商品のカテゴリーを選んでください。');
    const quantity = p.quantity === '' || p.quantity == null ? null : Number(p.quantity);
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)) throw new Error('購入数量は0〜999の整数で入力してください。分からない場合は空欄にできます。');
    return { id: p.id || uid(), category: p.category, proposedModel: clean(p.proposedModel,100), purchasedManufacturer: clean(p.purchasedManufacturer,100), purchasedModel: clean(p.purchasedModel,100), quantity };
  });
  const seen = new Set();
  const reasons = (input.reasons || []).map(r => {
    if (!member(REASONS,r.code) || !member(FACTORS,r.factor) || seen.has(r.code)) throw new Error('理由の選択を確認してください。');
    seen.add(r.code);
    return { code: r.code, factor: r.factor };
  });
  return { date: input.date, time: input.time, shiftId: input.shiftId || null, outcome: input.outcome, panasonicProposed, staffHandoff, products, reasons, needs: clean(input.needs), note: clean(input.note), needsFollowUp: Boolean(input.needsFollowUp) };
}
export function createRepository(adapter) {
  let db;
  const snapshot = () => ({ ...structuredClone(db), encounters: db.encounters.map(e=>compatibleEncounter(structuredClone(e))) });
  async function put(collection, value, id) {
    if (!db) throw new Error('保存データをまだ読み込んでいません。');
    const next = structuredClone(db);
    const index = id ? next[collection].findIndex(x => x.id === id) : -1;
    if (id && index < 0) throw new Error('編集する記録が見つかりません。');
    const now = new Date().toISOString();
    const record = { ...value, id: id || uid(), createdAt: index >= 0 ? next[collection][index].createdAt : now, updatedAt: now };
    if (index >= 0) next[collection][index] = record;
    else next[collection].push(record);
    // 保存が成功するまで画面が参照するデータを変更しません。
    db = await adapter.save(next);
    return structuredClone(record);
  }
  return {
    async load() { db = await adapter.load(); return snapshot(); },
    snapshot,
    exportData() { return structuredClone(db); },
    async restoreData(data) { db=await adapter.restore(data);return snapshot(); },
    async recoveryData() { return adapter.recovery(); },
    async saveLearningTask(input,id=null) {
      const title=clean(input.title,200);
      if (!title) throw new Error('課題名を入力してください。');
      if (!member(ALL_CATEGORIES,input.category)) throw new Error('商品カテゴリーを選んでください。');
      if (!member(LEARNING_TYPES,input.type) || !member(PRIORITIES,input.priority) || !member(LEARNING_STATES,input.state)) throw new Error('課題の種類・優先度・状態を確認してください。');
      const encounterId=input.encounterId || null;
      if (encounterId && !db.encounters.some(e=>e.id===encounterId)) throw new Error('関連する接客記録が見つかりません。');
      return put('learningTasks',{title,category:input.category,encounterId,type:input.type,priority:input.priority,state:input.state,answer:clean(input.answer,2000),nextAction:clean(input.nextAction,2000)},id);
    },
    async saveReflection(input) {
      if (!validDate(input.date)) throw new Error('振り返りの日付を確認してください。');
      const value={date:input.date};
      for(const key of ['success','difficulty','learned','nextAction']) value[key]=clean(input[key],2000);
      // 日付ごとに1件。数値は複製せず、元の勤務・接客記録から毎回集計します。
      return put('reflections',value,db.reflections.find(r=>r.date===input.date)?.id || null);
    },
    async saveShift(input, id = null) {
      const value = normalizeShift(input);
      if (id && db.encounters.some(e => e.shiftId === id && e.date !== value.date)) throw new Error('接客記録がある勤務の日付は変更できません。先に接客記録の勤務との関連を外してください。');
      return put('shifts', value, id);
    },
    async saveEncounter(input, id = null) {
      const previous = id ? db.encounters.find(e=>e.id===id) : null;
      const allowUnknownProposal = Boolean(previous && previous.panasonicProposed == null);
      const compatiblePrevious = previous ? compatibleEncounter(previous) : null;
      const allowUnknownHandoff = Boolean(compatiblePrevious && compatiblePrevious.staffHandoff == null);
      const value = normalizeEncounter(input,db.shifts,{allowUnknownProposal,allowUnknownHandoff});
      if (compatiblePrevious?.legacyOutcome === 'handoff') value.legacyOutcome = 'handoff';
      return put('encounters', value,id);
    }
  };
}
