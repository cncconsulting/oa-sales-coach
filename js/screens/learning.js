import {CATEGORIES,ALL_CATEGORIES,categoryOptions,LEARNING_TYPES,PRIORITIES,LEARNING_STATES,label} from '../catalog.js';
import {escapeHTML as h,heading,choices,selected,errorAt} from '../ui.js';
export function renderLearning(ctx,id,from) {
  const {root,repo,markDirty,finish,notify}=ctx, db=repo.snapshot();
  if (!id) {
    const tasks=[...db.learningTasks].sort((a,b)=>(a.state==='resolved')-(b.state==='resolved') || b.updatedAt.localeCompare(a.updatedAt));
    root.innerHTML=`${heading('LEARNING / 学習課題','接客の疑問を、次の力に。','短い課題名だけでも記録。調べた答えを、あとから追記しましょう。')}<a class="button full" href="#learning/new">＋ 学習課題を記録</a><div class="section-title"><h2>学習課題 ${tasks.length}件</h2><span class="badge">未解決 ${tasks.filter(t=>t.state!=='resolved').length}件</span></div><div class="record-list">${tasks.map(t=>`<a class="record-row" href="#learning/${encodeURIComponent(t.id)}"><div><span class="badge">${label(LEARNING_STATES,t.state)}</span> <span class="record-meta">優先度：${label(PRIORITIES,t.priority)}</span><strong>${h(t.title)}</strong><span class="muted fine">${h(label(ALL_CATEGORIES,t.category))} · ${label(LEARNING_TYPES,t.type)}</span></div><span aria-hidden="true">→</span></a>`).join('')||'<p class="empty">まだ課題はありません。接客記録からも作成できます。</p>'}</div>`;
    return;
  }
  const editing=id==='new'?null:db.learningTasks.find(t=>t.id===id);
  if(id!=='new'&&!editing) throw new Error('学習課題が見つかりません。');
  const source=from?db.encounters.find(e=>e.id===from):null;
  if(from&&!source) throw new Error('関連する接客記録が見つかりません。');
  const task=editing || {title:'',category:source?.products[0]?.category||'other',encounterId:source?.id||'',type:'knowledge',priority:'medium',state:'todo',answer:'',nextAction:''};
  const encounters=[...db.encounters].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  root.innerHTML=`${heading('LEARNING / 学習課題',editing?'学習課題を編集':'学習課題を記録','課題名以外は選択中心。答えや次の行動は空欄でも保存できます。')}<form class="card"><div class="form-error" role="alert" tabindex="-1" hidden></div>
  <label class="field">課題名 <span class="required">必須</span><textarea name="title" rows="2" maxlength="200" required placeholder="例：食洗機の設置条件を確認する">${h(task.title)}</textarea></label>
  <label class="field">商品カテゴリー<select name="category">${categoryOptions(task.category).map(([id,text])=>`<option value="${id}" ${selected(task.category===id)}>${text}</option>`).join('')}</select></label>
  <label class="field">関連する接客記録 <span class="optional">任意</span><select name="encounterId"><option value="">関連付けなし</option>${encounters.map(e=>`<option value="${h(e.id)}" ${selected(task.encounterId===e.id)}>${h(e.date)} ${h(e.time)} · ${h([...new Set(e.products.map(p=>label(ALL_CATEGORIES,p.category)))].join('・'))}</option>`).join('')}</select></label>
  <p><a id="source-link" ${task.encounterId?'':'hidden'} href="#customer/${encodeURIComponent(task.encounterId||'')}">関連する接客を開く →</a></p>
  <fieldset><legend>課題の種類</legend>${choices('type',LEARNING_TYPES,task.type)}</fieldset>
  <fieldset><legend>優先度</legend>${choices('priority',PRIORITIES,task.priority)}</fieldset>
  <fieldset><legend>状態</legend>${choices('state',LEARNING_STATES,task.state)}</fieldset>
  <label class="field">学習した内容・答え <span class="optional">任意</span><textarea name="answer" rows="3" maxlength="2000" placeholder="調べて分かったことを短く。音声入力も使えます。">${h(task.answer)}</textarea></label>
  <label class="field">次回の接客で試すこと <span class="optional">任意</span><textarea name="nextAction" rows="3" maxlength="2000" placeholder="例：設置場所の寸法を最初に確認する">${h(task.nextAction)}</textarea></label>
  <p class="muted fine">キーボードのマイクで音声入力できます。個人名・連絡先は入力しないでください。</p><div class="save-bar"><button type="submit" class="button full">学習課題を保存</button></div></form><a href="#learning">学習課題の一覧へ</a>`;
  const form=root.querySelector('form');form.addEventListener('input',markDirty);form.addEventListener('change',markDirty);
  form.elements.encounterId.addEventListener('change',()=>{const link=root.querySelector('#source-link');link.hidden=!form.elements.encounterId.value;link.href=`#customer/${encodeURIComponent(form.elements.encounterId.value)}`;});
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;try{await repo.saveLearningTask(Object.fromEntries(new FormData(form)),editing?.id);finish('#learning');notify('学習課題を保存しました');}catch(error){errorAt(form,error);}finally{button.disabled=false;}});
}
