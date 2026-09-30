import {compatibleEncounter,workedMinutes} from './records.js';
import {localDate,ALL_CATEGORIES,OUTCOMES,REASONS,FACTORS,LEARNING_STATES,label} from './catalog.js';
export const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const monthOfTask = task => task.createdAt && !Number.isNaN(Date.parse(task.createdAt)) ? localDate(new Date(task.createdAt)).slice(0,7) : '';
export function selectMonth(db,month) {
  if(month && !validMonth(month)) throw new Error('対象月を確認してください。');
  return {...db,shifts:db.shifts.filter(s=>!month||s.date.startsWith(month)),encounters:db.encounters.filter(e=>!month||e.date.startsWith(month)).map(compatibleEncounter),learningTasks:db.learningTasks.filter(t=>!month||monthOfTask(t)===month),reflections:db.reflections.filter(r=>!month||r.date.startsWith(month))};
}
export const percent = (numerator,denominator) => denominator ? `${(numerator/denominator*100).toFixed(1)}%` : '—';
const isPanasonic = name => /^(panasonic|パナソニック)$/i.test((name||'').trim());
function grouped(rows,keys) {
  const counts=new Map();
  for(const row of rows) for(const key of new Set(keys(row))) counts.set(key,(counts.get(key)||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ja'));
}
export function monthlySummary(db,month) {
  const data=selectMonth(db,month),rows=data.encounters;
  const pan=rows.filter(e=>e.outcome==='panasonic'),other=rows.filter(e=>e.outcome==='competitor');
  const nonPan=rows.filter(e=>e.outcome!=='panasonic'),handed=rows.filter(e=>e.staffHandoff===true);
  const minutes=data.shifts.map(workedMinutes);
  return {
    month,total:rows.length,proposed:rows.filter(e=>e.panasonicProposed===true).length,handoff:handed.length,panasonic:pan.length,
    proposedWon:pan.filter(e=>e.panasonicProposed===true).length,
    proposalUnknown:rows.filter(e=>e.panasonicProposed==null).length,handoffUnknown:rows.filter(e=>e.staffHandoff==null).length,
    days:new Set(data.shifts.map(s=>s.date)).size,minutes:minutes.filter(n=>n!==null).reduce((a,b)=>a+b,0),incompleteShifts:minutes.filter(n=>n===null).length,shifts:data.shifts.length,
    outcomes:OUTCOMES.map(([id,text])=>[text,rows.filter(e=>e.outcome===id).length]),
    handoffOutcomes:OUTCOMES.map(([id,text])=>[text,handed.filter(e=>e.outcome===id).length]),
    categories:ALL_CATEGORIES.map(([id,text])=>[text,rows.filter(e=>e.products.some(p=>p.category===id)).length,pan.filter(e=>e.products.some(p=>p.category===id)).length]),
    models:grouped(pan,e=>{const models=e.products.filter(p=>!p.purchasedManufacturer||isPanasonic(p.purchasedManufacturer)).map(p=>(p.purchasedModel||'').trim()).filter(Boolean);return models.length?models:['型番未入力・該当型番なし'];}),
    manufacturers:grouped(other,e=>{const names=e.products.map(p=>(p.purchasedManufacturer||'').trim()).filter(n=>n&&!isPanasonic(n));return names.length?names:['メーカー未入力・該当メーカーなし'];}),
    reasons:grouped(nonPan,e=>(e.reasons||[]).map(r=>label(REASONS,r.code))),
    factors:FACTORS.map(([id,text])=>[text,nonPan.filter(e=>e.reasons.some(r=>r.factor===id)).length]),
    reasonsMissing:nonPan.filter(e=>!e.reasons.length).length,
    learning:LEARNING_STATES.map(([id,text])=>[text,data.learningTasks.filter(t=>t.state===id).length])
  };
}
export function filterEncounters(db,filters) {
  const shifts=new Map(db.shifts.map(s=>[s.id,s]));
  return db.encounters.map(compatibleEncounter).filter(e=>{
    const matchFlag=(value,filter)=>!filter || (filter==='yes'?value===true:filter==='no'?value===false:value==null);
    return (!filters.from||e.date>=filters.from)&&(!filters.to||e.date<=filters.to)&&(!filters.store||(filters.store==='__unset__'?!e.shiftId:shifts.get(e.shiftId)?.storeAlias===filters.store))&&(!filters.category||e.products.some(p=>p.category===filters.category))&&(!filters.outcome||e.outcome===filters.outcome)&&matchFlag(e.panasonicProposed,filters.proposal)&&matchFlag(e.staffHandoff,filters.handoff);
  }).sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}
