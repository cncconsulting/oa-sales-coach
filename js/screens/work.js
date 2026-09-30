import { localDate, localTime } from '../catalog.js';
import { escapeHTML as h, heading, checked, errorAt } from '../ui.js';
import { workedMinutes } from '../records.js';
export function renderWork(ctx, id) {
  const { root,repo,markDirty,finish,notify } = ctx;
  const shifts = repo.snapshot().shifts;
  const editing = id ? shifts.find(s=>s.id===id) : null;
  if (id && !editing) throw new Error('勤務記録が見つかりません。');
  const s = editing || {date:localDate(),storeAlias:'',start:localTime(),end:'',breakMinutes:0,note:''};
  const stores = [...new Set(shifts.map(s=>s.storeAlias))];
  root.innerHTML = `${heading('WORK / 勤務記録',editing?'勤務を編集':'今日の勤務を登録','店舗は「店舗A」などの識別名で記録できます。終了時刻はあとから入力できます。')}
    <form id="work-form" class="card form-card"><div class="form-error" role="alert" tabindex="-1" hidden></div>
    <div class="two-columns"><label class="field">勤務日 <span class="required">必須</span><input name="date" type="date" required value="${h(s.date)}"></label><label class="field">店舗の識別名 <span class="required">必須</span><input name="storeAlias" required maxlength="60" list="stores" placeholder="例：店舗A" value="${h(s.storeAlias)}"><datalist id="stores">${stores.map(v=>`<option value="${h(v)}"></option>`).join('')}</datalist></label></div>
    <div class="two-columns"><label class="field">開始時刻<input name="start" type="time" value="${h(s.start)}"></label><label class="field">終了時刻<input name="end" type="time" value="${h(s.end)}"></label></div>
    <label class="check-line"><input name="nextDay" type="checkbox" ${checked(s.nextDay)}>終了は翌日</label>
    <label class="field">休憩時間（分）<input name="breakMinutes" type="number" inputmode="numeric" min="0" max="1440" step="1" value="${s.breakMinutes}"></label>
    <label class="field">勤務メモ <span class="optional">任意</span><textarea name="note" maxlength="1000" rows="2" placeholder="短いひと言でOK。音声入力も使えます。">${h(s.note)}</textarea></label>
    <p class="muted fine">個人名・顧客情報などは入力しないでください。</p>
    <div class="save-bar"><button class="button" type="submit">${editing?'変更を保存':'勤務を保存'}</button>${editing?'<a href="#work" class="text-link">新しく登録</a>':''}</div></form>
    <section><div class="section-title"><h2>登録済みの勤務</h2></div><div class="record-list">${[...shifts].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{const minutes=workedMinutes(s);return `<a href="#work/${encodeURIComponent(s.id)}" class="record-row"><div><div class="record-meta">${h(s.date)}</div><strong>${h(s.storeAlias)}</strong><span class="muted">${h(s.start)||'開始未入力'}〜${h(s.end)||'終了未入力'}${s.nextDay?'（翌日）':''}${minutes!==null?` · 実働${Math.floor(minutes/60)}時間${minutes%60}分`:''}</span></div><span class="row-arrow">→</span></a>`;}).join('') || '<p class="empty">勤務はまだ登録されていません。</p>'}</div></section>`;
  const form = root.querySelector('form');
  form.addEventListener('input',markDirty);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]'); button.disabled=true;
    try { const data = Object.fromEntries(new FormData(form)); data.nextDay=Boolean(data.nextDay); await repo.saveShift(data,id); finish('#home'); notify('勤務を保存しました'); }
    catch(error) { errorAt(form,error); }
    finally { button.disabled=false; }
  });
}
