import {localDate} from '../catalog.js';
import {dailySummary} from '../daily.js';
import {escapeHTML as h,heading,errorAt} from '../ui.js';
export function renderReflection(ctx,date=localDate()) {
  const {root,repo,markDirty,finish,notify}=ctx,db=repo.snapshot(),summary=dailySummary(db,date);
  const reflection=db.reflections.find(r=>r.date===date)||{};
  const metrics=[['接客件数',summary.encounters],['Panasonic提案件数',summary.proposed],['引継ぎ件数',summary.handoff],['Panasonic成約件数',summary.panasonic],['他社成約件数',summary.competitor],['検討・持ち帰り件数',summary.considering]];
  root.innerHTML=`${heading('REFLECTION / 1日の振り返り','今日の経験を、明日につなぐ。','数字は自動集計。気づいたことだけ、短く残しましょう。')}<label class="field">振り返る日付<input id="reflection-date" type="date" value="${h(date)}" required></label>
  <section aria-label="当日の実績" class="stats daily-stats">${metrics.map(([title,n])=>`<div><span>${title}</span><strong>${n}<small>件</small></strong></div>`).join('')}</section>
  <section class="card"><h2>当日の勤務</h2>${summary.shifts.length?`<p>${summary.shifts.length}件 · ${h([...new Set(summary.shifts.map(s=>s.storeAlias))].join(' / '))}</p><p>実働${Math.floor(summary.workedMinutes/60)}時間${summary.workedMinutes%60}分${summary.incompleteShifts?'（時刻入力済みの勤務のみ）':''}</p>${summary.incompleteShifts?`<p class="muted fine">開始・終了時刻が未入力の勤務：${summary.incompleteShifts}件</p>`:''}`:'<p class="muted">この日の勤務記録はありません。</p>'}<a href="#work">勤務記録を確認する →</a></section>
  <p class="muted fine">接客日で集計します。複数商品でも接客は1件です。後から接客結果を更新すると数字も更新されます。提案・引継ぎは重複するため、各件数を足しても接客件数にはなりません。</p>
  ${summary.proposalUnknown||summary.handoffUnknown||summary.unlinked?`<p class="hint">提案有無が未記録：${summary.proposalUnknown}件 ／ 引継ぎ有無が未記録：${summary.handoffUnknown}件。未記録を「あり」に含めません。勤務未設定の接客${summary.unlinked}件も、当日の接客に含めています。</p>`:''}
  <form class="card spaced"><div class="form-error" role="alert" tabindex="-1" hidden></div>${[['success','今日うまくいったこと','例：お客様の使い方を聞いてから提案できた'],['difficulty','今日難しかったこと','例：他社との違いを短く説明できなかった'],['learned','今日学んだこと','例：設置条件の確認が大切だと分かった'],['nextAction','次回試すこと','例：比較ポイントを3つに絞って伝える']].map(([key,title,placeholder])=>`<label class="field">${title} <span class="optional">任意</span><textarea name="${key}" rows="3" maxlength="2000" placeholder="${placeholder}">${h(reflection[key])}</textarea></label>`).join('')}<p class="muted fine">ひと言でもOK。キーボードのマイクで音声入力できます。個人名・連絡先は入力しないでください。</p><div class="save-bar"><button type="submit" class="button full">${reflection.id?'振り返りを更新':'振り返りを保存'}</button></div></form>
  <section><div class="section-title"><h2>保存した振り返り</h2></div><div class="record-list">${[...db.reflections].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<a class="record-row" href="#reflection/${r.date}"><strong>${h(r.date)}</strong><span>確認・追記 →</span></a>`).join('')||'<p class="empty">まだ振り返りはありません。</p>'}</div></section>`;
  root.querySelector('#reflection-date').addEventListener('change',event=>{const chosen=event.target.value;event.target.value=date;if(chosen)location.hash=`#reflection/${chosen}`;});
  const form=root.querySelector('form');form.addEventListener('input',markDirty);
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{await repo.saveReflection({...Object.fromEntries(new FormData(form)),date});finish(`#reflection/${date}`);notify('振り返りを保存しました');}catch(error){errorAt(form,error);}finally{button.disabled=false;}});
}
