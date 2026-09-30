import { compatibleEncounter, workedMinutes, validDate } from './records.js';
export function dailySummary(db,date) {
  if (!validDate(date)) throw new Error('日付を確認してください。');
  const encounters=db.encounters.filter(e=>e.date===date).map(compatibleEncounter);
  const shifts=db.shifts.filter(s=>s.date===date);
  const minutes=shifts.map(workedMinutes);
  return {
    encounters:encounters.length,
    proposed:encounters.filter(e=>e.panasonicProposed===true).length,
    handoff:encounters.filter(e=>e.staffHandoff===true).length,
    panasonic:encounters.filter(e=>e.outcome==='panasonic').length,
    competitor:encounters.filter(e=>e.outcome==='competitor').length,
    considering:encounters.filter(e=>e.outcome==='considering').length,
    proposalUnknown:encounters.filter(e=>e.panasonicProposed==null).length,
    handoffUnknown:encounters.filter(e=>e.staffHandoff==null).length,
    unlinked:encounters.filter(e=>!e.shiftId).length,
    shifts, workedMinutes:minutes.filter(m=>m!==null).reduce((a,b)=>a+b,0),
    incompleteShifts:minutes.filter(m=>m===null).length
  };
}
