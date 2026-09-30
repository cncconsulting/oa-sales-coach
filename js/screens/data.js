import {localDate} from '../catalog.js';
import {createCSV,downloadFile} from '../export.js';
import {makeBackup,parseBackup,backupCounts} from '../backup-validation.js';
import {heading,escapeHTML as h} from '../ui.js';
export function renderData({root,repo,notify,finish}) {
  const stamp=()=>new Date().toISOString().replaceAll(':','-');
  const backup=(data,prefix)=>downloadFile(makeBackup(data),`${prefix}-${stamp()}.json`,'application/json;charset=utf-8');
  root.innerHTML=`${heading('DATA / データ管理','記録を書き出す・守る。','CSVは確認・分析用、JSONバックアップは復元用です。端末間の自動共有は行いません。')}
  <p id="data-message" role="status" class="hint" hidden></p>
  <section class="card"><h2>CSV出力</h2><label class="field spaced">対象月<input id="csv-month" type="month" value="${localDate().slice(0,7)}"></label><label class="check-line"><input id="all-months" type="checkbox">全期間を出力する</label><label class="field">出力する記録<select id="csv-kind"><option value="shifts">勤務記録</option><option value="encounters">接客記録</option><option value="products">商品明細</option><option value="learningTasks">学習課題</option><option value="reflections">1日の振り返り</option></select></label><button id="download-csv" class="button full">CSVをダウンロード</button><p class="muted fine spaced">勤務は勤務日、接客・商品は接客日、振り返りは対象日、学習課題は作成月で絞ります。UTF-8（BOM付き）形式です。CSVからの復元には対応していません。</p></section>
  <section class="card"><h2>全データのバックアップ</h2><p class="muted">勤務・接客・商品・学習課題・振り返り・保存済み設定をまとめて保存します。</p><button id="download-backup" class="button full spaced">JSONバックアップを保存</button><p class="muted fine">「ファイル」や「ダウンロード」に保存されたことを確認してください。ブラウザ内に残すだけでなく、別の場所にも保管できます。</p></section>
  <section class="card"><h2>バックアップから復元</h2><p>現在の全記録を置き換えます。追加・結合ではありません。</p><label class="field spaced">① JSONファイルを選ぶ<input id="backup-file" type="file" accept=".json,application/json"></label><p class="muted fine">10MB以内。選ぶだけではデータを変更しません。</p><div id="restore-preview" hidden><div id="restore-counts"></div><button id="download-before" class="button secondary full spaced">② 現在のデータを退避ダウンロード</button><label class="check-line"><input id="backup-confirmed" type="checkbox" disabled>退避ファイルが保存されたことを確認しました</label><button id="restore" class="button full" disabled>③ 内容を確認して全データを復元</button><section id="final-confirm" class="hint" role="alertdialog" aria-labelledby="confirm-title" hidden><h3 id="confirm-title">現在の全データを置き換えますか？</h3><p id="confirm-counts"></p><p>追加・結合ではありません。退避ファイルを保存したうえで実行してください。</p><div class="quick-links spaced"><button id="cancel-restore" class="button secondary">キャンセル</button><button id="execute-restore" class="button">復元を実行</button></div></section><p class="muted fine">復元直前のデータをブラウザ内にも1世代分退避します。保存容量が足りない場合は復元を中止します。</p></div></section>
  <section class="card"><h2>直前の復元をやり直したいとき</h2><p class="muted fine">復元前の退避データをダウンロードし、上の復元操作で読み込めます。ブラウザ内の退避は直近1回分のみです。</p><button id="download-recovery" class="button secondary full spaced">復元直前の退避データを取得</button></section>`;
  const message=text=>{const el=root.querySelector('#data-message');el.textContent=text;el.hidden=false;};
  root.querySelector('#all-months').onchange=event=>root.querySelector('#csv-month').disabled=event.target.checked;
  root.querySelector('#download-csv').onclick=()=>{try{const month=root.querySelector('#all-months').checked?'':root.querySelector('#csv-month').value;if(!month&&!root.querySelector('#all-months').checked)throw new Error('対象月を選んでください。');const kind=root.querySelector('#csv-kind').value;downloadFile(createCSV(repo.snapshot(),month,kind),`oa-${kind}-${month||'all'}.csv`,'text/csv;charset=utf-8');message('CSVのダウンロードを開始しました。保存先を確認してください。');}catch(error){message(error.message);}};
  root.querySelector('#download-backup').onclick=()=>{try{backup(repo.exportData(),'oa-backup');message('バックアップのダウンロードを開始しました。保存先を確認してください。');}catch(error){message(error.message);}};
  let candidate=null,version=0,downloaded=false;
  const file=root.querySelector('#backup-file'),restore=root.querySelector('#restore'),confirmed=root.querySelector('#backup-confirmed');
  const countsText=db=>Object.entries(backupCounts(db)).map(([k,n])=>`${k}：${n}件`).join(' ／ ');
  file.onchange=async()=>{
    const token=++version;candidate=null;downloaded=false;confirmed.checked=false;confirmed.disabled=true;restore.disabled=true;root.querySelector('#restore-preview').hidden=true;
    try{const chosen=file.files[0];if(!chosen)return;if(chosen.size>10*1024*1024)throw new Error('ファイルは10MB以内にしてください。');const parsed=parseBackup(await chosen.text());if(token!==version)return;candidate=parsed;root.querySelector('#restore-counts').innerHTML=`<p class="spaced"><strong>復元するファイル</strong><br>${h(chosen.name)}</p><p>${h(countsText(parsed))}</p><p class="spaced"><strong>現在のデータ</strong><br>${h(countsText(repo.snapshot()))}</p><p class="muted fine">設定もファイル内の内容に置き換わります。</p>`;root.querySelector('#restore-preview').hidden=false;message('ファイルの検証が完了しました。件数を確認し、現在データを退避してください。');}
    catch(error){if(token===version)message(error.message);}
  };
  root.querySelector('#download-before').onclick=()=>{try{backup(repo.exportData(),'oa-before-restore');downloaded=true;confirmed.disabled=false;message('退避ダウンロードを開始しました。ファイルが保存されたことを確認してチェックを付けてください。');}catch(error){message(error.message);}};
  confirmed.onchange=()=>restore.disabled=!(candidate&&downloaded&&confirmed.checked);
  const finalPanel=root.querySelector('#final-confirm'),execute=root.querySelector('#execute-restore'),cancel=root.querySelector('#cancel-restore');
  restore.onclick=()=>{
    if(!candidate||!downloaded||!confirmed.checked)return;
    root.querySelector('#confirm-counts').textContent=`復元後：${countsText(candidate)}`;
    finalPanel.hidden=false;file.disabled=true;restore.disabled=true;confirmed.disabled=true;cancel.focus();finalPanel.scrollIntoView({block:'center'});
  };
  cancel.onclick=()=>{finalPanel.hidden=true;file.disabled=false;restore.disabled=false;confirmed.disabled=false;restore.focus();};
  execute.onclick=async()=>{
    if(!candidate||!downloaded||!confirmed.checked||finalPanel.hidden)return;
    execute.disabled=true;cancel.disabled=true;
    restore.disabled=true;file.disabled=true;confirmed.disabled=true;
    try{await repo.restoreData(candidate);finish('#home');notify('バックアップから復元しました。元のデータは復元直前の退避にも残しています。');}
    catch(error){message(error.message);finalPanel.hidden=true;confirmed.disabled=false;restore.disabled=false;}
    finally{file.disabled=false;execute.disabled=false;cancel.disabled=false;}
  };
  root.querySelector('#download-recovery').onclick=async()=>{try{const data=await repo.recoveryData();if(!data)throw new Error('復元直前の退避データはまだありません。');backup(data,'oa-recovery');message('復元直前の退避データをダウンロードしました。保存先を確認してください。');}catch(error){message(error.message);}};
}
