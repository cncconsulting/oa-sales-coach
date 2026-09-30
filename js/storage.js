import {validateDatabase} from './backup-validation.js';
export const STORAGE_KEY = 'oa-sales-coach.v1';
export const RECOVERY_KEY = 'oa-sales-coach.before-restore.v1';
export const emptyDatabase = () => ({ schemaVersion: 1, revision: 0, shifts: [], encounters: [], learningTasks: [], reflections: [], settings: {} });

// 画面はlocalStorageを直接操作しません。このアダプターを将来のクラウド版と交換します。
export function createLocalAdapter(storage, locks = null) {
  let knownRevision = null;
  function read() {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { throw new Error('ブラウザの保存領域を利用できません。通常モードと保存設定を確認してください。'); }
    if (raw === null) return emptyDatabase();
    try {
      const db = JSON.parse(raw);
      if (db.schemaVersion !== 1 || !Number.isInteger(db.revision) || !Array.isArray(db.shifts) || !Array.isArray(db.encounters)) throw new Error();
      if (![...db.shifts, ...db.encounters].every(x => x && typeof x.id === 'string')) throw new Error();
      for (const key of ['learningTasks','reflections']) {
        if (db[key] === undefined) db[key] = [];
        if (!Array.isArray(db[key]) || !db[key].every(x=>x && typeof x.id==='string')) throw new Error();
      }
      if(db.settings===undefined)db.settings={};
      return db;
    } catch { throw new Error('保存データを読み取れません。データは上書きしていません。ブラウザのデータを削除せず、サポートを依頼してください。'); }
  }
  return {
    async recovery() {
      const raw=storage.getItem(RECOVERY_KEY);
      return raw===null?null:validateDatabase(JSON.parse(raw));
    },
    async restore(data) {
      const validated=validateDatabase(data);
      const commit=()=>{
        const current=read();
        if(knownRevision===null||current.revision!==knownRevision)throw new Error('別のタブで更新されました。再読み込みして復元をやり直してください。');
        const next={...validated,revision:current.revision+1};
        try {storage.setItem(RECOVERY_KEY,JSON.stringify(current));}
        catch {throw new Error('復元前データを退避できないため中止しました。現在のデータは変更していません。');}
        try {storage.setItem(STORAGE_KEY,JSON.stringify(next));}
        catch {throw new Error('復元データを保存できません。現在のデータは変更していません。');}
        knownRevision=next.revision;return next;
      };
      return locks?locks.request(STORAGE_KEY,commit):commit();
    },
    async load() {
      const db = read(); knownRevision = db.revision;
      return structuredClone(db);
    },
    async save(next) {
      const commit = () => {
        const current = read();
        if (knownRevision === null || current.revision !== knownRevision) throw new Error('別のタブで記録が更新されました。入力内容を控えてから再読み込みしてください。');
        const db = { ...structuredClone(next), schemaVersion: 1, revision: current.revision + 1 };
        try { storage.setItem(STORAGE_KEY, JSON.stringify(db)); }
        catch { throw new Error('保存できませんでした。保存容量またはブラウザの設定を確認してください。入力内容はこの画面に残っています。'); }
        knownRevision = db.revision;
        return db;
      };
      return locks ? locks.request(STORAGE_KEY, commit) : commit();
    }
  };
}
