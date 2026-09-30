import { localDate, label, ALL_CATEGORIES, OUTCOMES } from '../catalog.js';
import { escapeHTML as h, heading } from '../ui.js';
export function encounterList(records) {
  if (!records.length) return '<div class="empty"><span class="empty-icon">＋</span><h3>ここから、今日の一歩を。</h3><p>保存した接客がここに並びます。<br>忙しいときは簡易登録だけで大丈夫です。</p></div>';
  return `<div class="record-list">${records.map(e => `<a class="record-row" href="#customer/${encodeURIComponent(e.id)}"><div><div class="record-meta">${h(e.date)} · ${h(e.time)} ${e.needsFollowUp ? '<span class="badge amber">あとで追記</span>' : ''}</div><strong>${h([...new Set(e.products.map(p => label(ALL_CATEGORIES,p.category)))].join('・'))}</strong><span class="result ${e.outcome === 'panasonic' ? 'positive' : ''}">${h(label(OUTCOMES,e.outcome))}</span> ${e.staffHandoff===true ? '<span class="badge">引継ぎあり</span>' : e.staffHandoff==null ? '<span class="badge">引継ぎ未記録</span>' : ''}</div><span class="row-arrow" aria-hidden="true">→</span><span class="sr-only">詳細を編集</span></a>`).join('')}</div>`;
}
export function renderHome({root,repo}) {
  const db = repo.snapshot();
  const today = localDate();
  const encounters = db.encounters.filter(e => e.date === today);
  const shifts = db.shifts.filter(s => s.date === today);
  const recent = [...db.encounters].sort((a,b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0,5);
  const dateLabel = new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
  root.innerHTML = `${heading('TODAY / 今日の活動','今日の接客を、次の自信に。',h(dateLabel))}
    <section class="hero"><div><span class="pill">店頭で、さっと記録</span><h2>気づきを忘れる前に。</h2><p>カテゴリー・提案有無・結果を選んで保存。<br>詳しい内容は、あとから追記できます。</p></div><a class="button hero-button" href="#customer">＋ 接客を記録</a><small>簡易登録の目標：30秒〜1分</small></section>
    <section class="stats" aria-label="今日の実績"><div><span>接客件数</span><strong>${encounters.length}<small>件</small></strong></div><div><span>Panasonic成約</span><strong>${encounters.filter(e => e.outcome==='panasonic').length}<small>件</small></strong></div><div><span>あとで追記</span><strong>${db.encounters.filter(e=>e.needsFollowUp).length}<small>件</small></strong><small class="muted">全期間</small></div></section>
    <section class="card"><h2>学んで、次の接客へ</h2><p class="muted fine">未解決の学習課題：${db.learningTasks.filter(t=>t.state!=='resolved').length}件 ／ 今日の振り返り：${db.reflections.some(r=>r.date===today)?'記録済み':'未記録'}</p><div class="quick-links spaced"><a class="button secondary" href="#learning">学習課題を開く</a><a class="button secondary" href="#reflection">1日の振り返り</a></div></section>
    <section class="card shift-summary"><div><p class="eyebrow">今日の勤務</p><h2>${shifts.length ? h(shifts.map(s=>s.storeAlias).join(' / ')) : '勤務を登録しましょう'}</h2><p class="muted">${shifts.length ? '接客記録と勤務を関連付けられます。' : '先に勤務を登録すると、接客入力がスムーズです。'}</p></div><a class="button secondary" href="#work">${shifts.length ? '確認・編集' : '＋ 勤務を登録'}</a></section>
    <section class="card"><div class="quick-links"><a class="button secondary" href="#dashboard">月間ダッシュボード</a><a class="button secondary" href="#records">過去の記録を探す</a><a class="button secondary" href="#data">CSV・バックアップ</a></div></section><section><div class="section-title"><h2>最近の接客</h2><a href="#records">すべて見る →</a></div>${encounterList(recent)}</section>
    <p class="storage-note">● このブラウザに保存 · 端末間の自動共有なし<br>ブラウザのデータ削除で記録が消えます。データ管理から定期的にバックアップを保存してください。</p>`;
}
export function renderRecords({root,repo}) {
  const records = [...repo.snapshot().encounters].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  root.innerHTML = `${heading('RECORDS / 記録の確認','保存した接客','記録をタップして、型番や理由を追記できます。検索・月間分析は今後追加予定です。')}<div class="section-title"><p>${records.length}件の記録</p><a class="button small" href="#customer">＋ 接客を記録</a></div>${encounterList(records)}`;
}
