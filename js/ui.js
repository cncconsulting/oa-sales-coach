export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const checked = condition => condition ? 'checked' : '';
export const selected = condition => condition ? 'selected' : '';
export function choices(name, list, value, extra = '') {
  return `<div class="choices ${extra}">${list.map(([id,text]) => `<label class="choice"><input type="radio" name="${name}" value="${id}" aria-label="${escapeHTML(text)}" ${checked(id===value)}><span>${escapeHTML(text)}</span></label>`).join('')}</div>`;
}
export function errorAt(form, error) {
  const box = form.querySelector('.form-error');
  box.textContent = error.message || '保存に失敗しました。'; box.hidden = false; box.focus();
}
export function heading(eyebrow,title,description) { return `<header class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${description}</p></header>`; }
