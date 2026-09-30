import { createLocalAdapter } from './storage.js';
import { createRepository } from './records.js';
import { renderHome } from './screens/home.js';
import { renderWork } from './screens/work.js';
import { renderCustomer } from './screens/customer.js';
import { renderLearning } from './screens/learning.js';
import { renderReflection } from './screens/reflection.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderHistory } from './screens/history.js';
import { renderData } from './screens/data.js';
import { escapeHTML as h, heading } from './ui.js';

const root=document.querySelector('#main');
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();root.focus();});
let dirty=false, currentHash='', repo, noticeTimer;
function notify(text) {const el=document.querySelector('#notice');el.textContent=text;el.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,5000);}
const ctx={root,get repo(){return repo;},markDirty(){dirty=true;},finish(hash){dirty=false;if(location.hash===hash)render();else location.hash=hash;},notify};
function nav(view) {
  document.querySelector('#nav').innerHTML=[['home','⌂','ホーム'],['customer','＋','接客を記録'],['learning','▤','学習課題'],['reflection','✓','振り返り'],['more','•••','その他']].map(([id,icon,text])=>`<a href="#${id}" ${id===view?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${text}</a>`).join('');
}
function render() {
  const hash=location.hash||'#home';
  if(dirty && hash!==currentHash && !confirm('入力内容はまだ保存されていません。入力を破棄して画面を移動しますか？')) {history.replaceState(null,'',currentHash);return;}
  dirty=false;currentHash=hash;
  const [route,query='']=hash.slice(1).split('?');
  const [view,id]=route.split('/');nav(view);
  try {
    if(view==='home')renderHome(ctx);
    else if(view==='customer')renderCustomer(ctx,id?decodeURIComponent(id):null);
    else if(view==='work')renderWork(ctx,id?decodeURIComponent(id):null);
    else if(view==='records')renderHistory(ctx);
    else if(view==='dashboard')renderDashboard(ctx,id||undefined);
    else if(view==='data')renderData(ctx);
    else if(view==='learning')renderLearning(ctx,id?decodeURIComponent(id):null,new URLSearchParams(query).get('from'));
    else if(view==='reflection')renderReflection(ctx,id||undefined);
    else if(view==='more') root.innerHTML=`${heading('MORE / その他','メニュー','勤務・接客の確認と、学習・振り返り。')}<div class="card"><div class="quick-links"><a class="button secondary" href="#work">勤務記録</a><a class="button secondary" href="#records">過去の記録</a><a class="button secondary" href="#dashboard">月間ダッシュボード</a><a class="button secondary" href="#data">CSV・バックアップ</a><a class="button secondary" href="#learning">学習課題</a><a class="button secondary" href="#reflection">1日の振り返り</a></div></div><p class="storage-note">保存先はこの端末・このブラウザです。自動共有はありません。データ管理から定期的にバックアップを保存してください。</p>`;
    else root.innerHTML=`${heading('NOT FOUND','画面が見つかりません','ホームから操作してください。')}<a class="button" href="#home">ホームへ</a>`;
  } catch(error) {root.innerHTML=`<div class="form-error" role="alert">${h(error.message)}</div><a href="#home">ホームへ戻る</a>`;}
  window.scrollTo({top:0});root.focus({preventScroll:true});
}
window.addEventListener('hashchange',render);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',()=>notify('別のタブで保存領域が変更されました。入力内容を控え、再読み込みしてください。'));
try {repo=createRepository(createLocalAdapter(window.localStorage,navigator.locks));await repo.load();render();}
catch(error){root.innerHTML=`<section class="card"><h1>保存領域を確認してください</h1><p role="alert">${h(error.message)}</p><p>既存の記録は上書きしていません。</p><button class="button" id="reload">再読み込み</button></section>`;document.querySelector('#reload').onclick=()=>location.reload();}
