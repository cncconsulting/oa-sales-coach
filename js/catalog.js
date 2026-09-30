// 表示名と保存する値を分離。将来、表示名を変えても過去の記録を集計できます。
export const CATEGORIES = [
  ['refrigerator', '冷蔵庫'], ['washer', '洗濯機'], ['aircon', 'エアコン'],
  ['tv', 'テレビ'], ['bd_av', 'BD・AV'], ['cleaner', '掃除機'],
  ['rice_cooker', '炊飯器'], ['microwave', 'オーブンレンジ'], ['toaster', 'トースター'],
  ['dishwasher', '食洗機'], ['dryer', 'ドライヤー'], ['shaver', 'シェーバー'],
  ['beauty', '美容・健康'], ['phone_fax', '電話・FAX'],
  ['air_care', '空気清浄機・除湿機'], ['other', 'その他']
];
// 旧分類は新規選択に出さず、既存の記録だけ維持します。旧AVにはカメラも含まれます。
export const LEGACY_CATEGORIES = [['cooking', '調理家電（旧分類）'], ['av', 'AV・カメラ（旧分類）']];
export const ALL_CATEGORIES = [...CATEGORIES, ...LEGACY_CATEGORIES];
export const categoryOptions = current => [...CATEGORIES, ...LEGACY_CATEGORIES.filter(([id])=>id===current)];
export const PROPOSALS = [['yes', '提案あり'], ['no', '提案なし']];
export const LEARNING_TYPES = [['knowledge','商品知識'],['comparison','競合比較'],['listening','接客・ヒアリング'],['talk','販売トーク'],['other','その他']];
export const PRIORITIES = [['high','高'],['medium','中'],['low','低']];
export const LEARNING_STATES = [['todo','未着手'],['learning','学習中'],['resolved','解決済み']];
export const OUTCOMES = [
  ['panasonic', 'Panasonic成約'], ['competitor', '他社成約'], ['deferred', '購入見送り'],
  ['considering', '検討・持ち帰り'],
  ['explanation', '商品説明のみ'], ['unknown', '結果不明']
];
export const FACTORS = [ ['improvable', '自分で改善できる要因'], ['external', '外的要因'], ['unclassified', '未分類・確認できず'] ];
export const REASONS = [
  ['needs', 'ニーズの聞き取り', 'improvable'], ['knowledge', '商品知識・説明', 'improvable'],
  ['comparison', '比較・価値の伝え方', 'improvable'], ['proposal', '提案の組み立て', 'improvable'],
  ['closing', '購入への後押し', 'improvable'], ['price', '価格・予算', 'external'],
  ['stock', '在庫・納期', 'external'], ['installation', 'サイズ・設置条件', 'external'],
  ['brand', 'メーカーの指定・好み', 'external'], ['spec', '必要な機能・仕様', 'external'],
  ['timing', '購入時期・家族との相談', 'external'], ['other', 'その他', 'unclassified'],
  ['unknown', '理由を確認できず', 'unclassified']
];
export const label = (list, id) => list.find(x => x[0] === id)?.[1] || '未設定';
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const localTime = (date = new Date()) => `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
export const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
