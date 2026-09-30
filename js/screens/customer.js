import { CATEGORIES, categoryOptions, PROPOSALS, OUTCOMES, REASONS, FACTORS, localDate, localTime, uid } from '../catalog.js';
import { escapeHTML as h, heading, choices, selected, checked, errorAt } from '../ui.js';

function productFields(product,index) {
  return `<div class="product-card" data-product-id="${h(product.id)}" data-index="${index}"><div class="section-title"><h3>${index===0?'1つ目の商品':`${index+1}つ目の商品`}</h3>${index>0?'<button type="button" class="text-link remove-product">この商品を外す</button>':''}</div>
  ${index>0?`<label class="field">商品カテゴリー<select data-field="category" required>${categoryOptions(product.category).map(([id,text])=>`<option value="${id}" ${selected(id===product.category)}>${text}</option>`).join('')}</select></label>`:''}
  <label class="field">提案したPanasonicの型番<input data-field="proposedModel" maxlength="100" value="${h(product.proposedModel)}" placeholder="分かるときだけ入力" autocapitalize="characters"></label>
  <div class="purchase-fields"><p class="field-caption">購入した商品 <span class="optional">未確認なら空欄でOK</span></p>
  <label class="field">購入メーカー<input data-field="purchasedManufacturer" maxlength="100" list="manufacturers" value="${h(product.purchasedManufacturer)}" placeholder="例：Panasonic、他社メーカー名"></label>
  <label class="field">購入した型番<input data-field="purchasedModel" maxlength="100" value="${h(product.purchasedModel)}" placeholder="他社成約の型番もここへ" autocapitalize="characters"></label>
  <label class="field">購入数量<input data-field="quantity" type="number" min="0" max="999" step="1" inputmode="numeric" value="${product.quantity ?? ''}" placeholder="未確認の場合は空欄"></label></div></div>`;
}
export function renderCustomer(ctx,id) {
  const {root,repo,markDirty,finish,notify} = ctx;
  const db=repo.snapshot();
  const editing = id ? db.encounters.find(e=>e.id===id) : null;
  if (id && !editing) throw new Error('接客記録が見つかりません。');
  const todayShifts=db.shifts.filter(s=>s.date===localDate());
  const item=editing || {date:localDate(),time:localTime(),shiftId:todayShifts.length===1?todayShifts[0].id:null,outcome:'',staffHandoff:false,products:[{id:uid(),category:''}],reasons:[],needs:'',note:'',needsFollowUp:false};
  root.innerHTML=`${heading('QUICK RECORD / 接客記録',editing?'接客記録を編集':'接客を、さっと記録。','カテゴリー・提案有無・結果をタップ。型番や理由は、あとから追記できます。')}
  <form id="customer-form"><div class="form-error" role="alert" tabindex="-1" hidden></div>
  ${item.legacyOutcome==='handoff'?'<p class="hint">元の接客結果は「店舗スタッフへ引継ぎ」でした。その履歴を保持しています。最終結果が未確認なら「結果不明」、確認できたら該当する結果を選んでください。</p>':''}
  <section class="card quick-card"><div class="section-title"><h2>簡易登録</h2><span class="badge">タップ中心</span></div>
    <div class="date-summary"><span id="when-label"></span><button type="button" class="text-link" id="change-context">日時・勤務を変更</button></div>
    <div id="context-fields" hidden><div class="two-columns"><label class="field">接客日<input type="date" name="date" value="${h(item.date)}" required></label><label class="field">接客時刻<input type="time" name="time" value="${h(item.time)}" required></label></div><label class="field">勤務<select name="shiftId"></select></label><p class="muted fine">勤務を未設定で保存し、あとから同じ日の勤務に関連付けることもできます。</p></div>
    <fieldset><legend><span class="step">1</span> 商品カテゴリー <span class="required">必須</span></legend>${choices('category',categoryOptions(item.products[0].category),item.products[0].category,'category-grid')}</fieldset>
    <fieldset><legend><span class="step">2</span> Panasonic製品を提案したか <span class="${editing && item.panasonicProposed == null?'optional':'required'}">${editing && item.panasonicProposed == null?'旧記録は未記録のまま保存可':'必須'}</span></legend>${choices('proposal',PROPOSALS,item.panasonicProposed===true?'yes':item.panasonicProposed===false?'no':'')}<p class="muted fine">接客結果とは別に記録します。</p></fieldset>
    <fieldset><legend><span class="step">3</span> 接客結果 <span class="required">必須</span></legend>${choices('outcome',OUTCOMES,item.outcome,'outcome-grid')}<div id="panasonic-quick" class="spaced" ${item.outcome==='panasonic'?'':'hidden'}><label class="field">Panasonic成約の型番 <span class="optional">任意・1つ目の商品</span><input id="quick-model" maxlength="100" value="${h(item.products[0].purchasedModel)}" placeholder="空欄でも保存できます" autocapitalize="characters"></label><p class="muted fine">詳細入力の「購入した型番」と同じ内容です。</p></div><p id="competitor-hint" class="hint" ${item.outcome==='competitor'?'':'hidden'}>他社メーカー・型番は「詳細入力」、他社になった理由は下の「理由を追加」で記録できます。今は未入力でも保存できます。</p></fieldset>
    <fieldset><legend>店舗スタッフへ引継ぎ</legend>${choices('handoff',[['yes','引継ぎあり'],['no','引継ぎなし']],item.staffHandoff===true?'yes':item.staffHandoff===false?'no':'')}<p class="muted fine">${item.staffHandoff==null?'旧記録の引継ぎ有無は未記録です。確認できたら選択してください。':'結果とは別に記録。新規登録は「なし」が初期選択です。'}</p></fieldset>
    <details id="reason-details" ${item.reasons.length?'open':''}><summary>理由を追加 <span class="optional">任意・複数選択</span></summary><p class="muted fine">分類は初期候補です。状況に合わせて選び直せます。分からなければ未分類のままで大丈夫です。</p>${FACTORS.map(([factor,title])=>`<fieldset class="reason-group"><legend>${title}</legend><div class="reason-grid">${REASONS.filter(r=>r[2]===factor).map(([code,text,defaultFactor])=>{const saved=item.reasons.find(r=>r.code===code);return `<div class="reason-item"><label class="choice"><input type="checkbox" name="reason" value="${code}" ${checked(Boolean(saved))}><span>${text}</span></label><label class="factor-control" ${saved?'':'hidden'}><span class="sr-only">${text}の分類</span><select data-factor="${code}" aria-label="${text}の分類">${FACTORS.map(([id,title])=>`<option value="${id}" ${selected(id===(saved?.factor||defaultFactor))}>${title}</option>`).join('')}</select></label></div>`;}).join('')}</div></fieldset>`).join('')}</details>
  </section>
  <details class="card detail-card" id="detail-fields"><summary>詳細入力 <span class="optional">型番・複数商品・メモ</span></summary><div class="detail-content"><p class="muted fine">空欄のまま保存できます。文字入力はキーボードの音声入力も使えます。</p><div id="products">${item.products.map(productFields).join('')}</div><button type="button" class="button secondary full" id="add-product">＋ 別の商品を追加</button><datalist id="manufacturers"><option value="Panasonic"></option><option value="日立"></option><option value="東芝"></option><option value="シャープ"></option><option value="三菱電機"></option><option value="ダイキン"></option><option value="ソニー"></option></datalist>
  <label class="field spaced">お客様のニーズ <span class="optional">任意</span><textarea name="needs" rows="2" maxlength="1000" placeholder="例：お手入れが簡単なものを探していた">${h(item.needs)}</textarea></label>
  <label class="field">理由の補足・次に生かすこと <span class="optional">任意</span><textarea name="note" rows="3" maxlength="1000" placeholder="例：違いを短く説明できるようにしておく">${h(item.note)}</textarea></label><p class="muted fine">個人名・連絡先・非公開の顧客情報は入力しないでください。</p></div></details>
  <label class="check-line followup"><input type="checkbox" name="needsFollowUp" ${checked(item.needsFollowUp)}>あとで追記する目印を付ける</label>
  <div class="save-bar customer-save"><button type="submit" class="button full">${editing?'変更を保存':'この内容で保存'}</button><p>この端末・このブラウザに保存されます</p></div></form>`;
  const form=root.querySelector('form');
  if(editing) {
    root.querySelector('.detail-content').insertAdjacentHTML('afterbegin',`<p><a class="button secondary full" href="#learning/new?from=${encodeURIComponent(editing.id)}">この接客から学習課題を作成</a></p><p class="muted fine">この接客との関連と、1つ目の商品カテゴリーを引き継ぎます。</p>`);
    const related=db.learningTasks.filter(t=>t.encounterId===editing.id);
    if(related.length) root.querySelector('.detail-content').insertAdjacentHTML('afterbegin',`<div class="card"><h3>この接客の学習課題</h3>${related.map(t=>`<p><a href="#learning/${encodeURIComponent(t.id)}">${h(t.title)}</a></p>`).join('')}</div>`);
  }
  // 簡易欄と詳細欄は同じ商品の購入型番です。入力のたびに双方向に同期します。
  const quickModel=root.querySelector('#quick-model');
  const detailModel=root.querySelector('[data-field="purchasedModel"]');
  quickModel.addEventListener('input',()=>{detailModel.value=quickModel.value;});
  detailModel.addEventListener('input',()=>{quickModel.value=detailModel.value;});
  const dateInput=form.elements.date, timeInput=form.elements.time, shiftInput=form.elements.shiftId;
  function updateContext(shiftId) {
    const options=db.shifts.filter(s=>s.date===dateInput.value);
    shiftInput.innerHTML=`<option value="">未設定（あとで関連付け）</option>${options.map(s=>`<option value="${h(s.id)}" ${selected(s.id===shiftId)}>${h(s.storeAlias)}${s.start?` · ${h(s.start)}〜`:''}</option>`).join('')}`;
    updateLabel();
  }
  function updateLabel() {
    const store=db.shifts.find(s=>s.id===shiftInput.value);
    root.querySelector('#when-label').textContent=`${dateInput.value} ${timeInput.value} · ${store?.storeAlias||'勤務未設定'}`;
  }
  updateContext(item.shiftId);
  root.querySelector('#change-context').onclick=()=>{const box=root.querySelector('#context-fields');box.hidden=!box.hidden;};
  dateInput.addEventListener('change',()=>{const shifts=db.shifts.filter(s=>s.date===dateInput.value);updateContext(shifts.length===1?shifts[0].id:'');});
  timeInput.addEventListener('change',updateLabel);shiftInput.addEventListener('change',updateLabel);
  form.addEventListener('input',markDirty);
  form.addEventListener('change', event=>{
    markDirty();
    if(event.target.name==='outcome') {
      root.querySelector('#competitor-hint').hidden=event.target.value!=='competitor';
      root.querySelector('#panasonic-quick').hidden=event.target.value!=='panasonic';
    }
    if(event.target.name==='reason') event.target.closest('.reason-item').querySelector('.factor-control').hidden=!event.target.checked;
  });
  let nextIndex=item.products.length;
  root.querySelector('#add-product').onclick=()=>{
    const category=CATEGORIES.some(([id])=>id===form.elements.category.value)?form.elements.category.value:CATEGORIES[0][0];
    root.querySelector('#products').insertAdjacentHTML('beforeend',productFields({id:uid(),category},nextIndex++));
    markDirty();root.querySelector('#products').lastElementChild.querySelector('select').focus();
  };
  root.querySelector('#products').addEventListener('click',event=>{
    if(event.target.closest('.remove-product')) { if(confirm('この商品の入力を外しますか？ 保存済みの場合は「変更を保存」で反映されます。')) {event.target.closest('.product-card').remove();markDirty();} }
  });
  form.addEventListener('invalid',event=>{event.target.closest('details')?.setAttribute('open','');root.querySelector('#context-fields').hidden=false;},true);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('[type=submit]');button.disabled=true;
    try {
      const values=Object.fromEntries(new FormData(form));
      const products=[...root.querySelectorAll('.product-card')].map((card,index)=>{
        const product={id:card.dataset.productId,category:values.category};
        card.querySelectorAll('[data-field]').forEach(el=>product[el.dataset.field]=el.value);
        return product;
      });
      const reasons=[...form.querySelectorAll('[name=reason]:checked')].map(el=>({code:el.value,factor:form.querySelector(`[data-factor="${el.value}"]`).value}));
      const panasonicProposed=values.proposal==='yes'?true:values.proposal==='no'?false:null;
      const staffHandoff=values.handoff==='yes'?true:values.handoff==='no'?false:null;
      await repo.saveEncounter({...values,panasonicProposed,staffHandoff,products,reasons,needsFollowUp:Boolean(values.needsFollowUp)},id);
      finish('#home');notify(editing?'接客記録を更新しました':'接客を保存しました。おつかれさまでした。');
    } catch(error) {errorAt(form,error);}
    finally {button.disabled=false;}
  });
}
