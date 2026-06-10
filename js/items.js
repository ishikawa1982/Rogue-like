// =============================================================
// items.js - アイテム生成・効果処理
// =============================================================
import { ITEMS, ITEM_TYPE } from './data.js';
import { randInt, choice, chance } from './rng.js';

// マスターからアイテムインスタンスを複製
export function createItem(id, opts = {}) {
  const def = ITEMS.find(i => i.id === id);
  if (!def) return null;
  const item = { ...def, ...opts };
  // 武器・盾には強化値(plus)を付与可能
  if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) {
    if (item.plus === undefined) item.plus = 0;
  }
  if (item.type === ITEM_TYPE.STAFF && item.charges === undefined) {
    item.charges = def.charges;
  }
  return item;
}

// フロアに応じたランダムアイテムを生成
export function randomItem(floor) {
  // 種別を重み付き抽選
  const roll = Math.random();
  let pool;
  if (roll < 0.18)      pool = ITEMS.filter(i => i.type === ITEM_TYPE.WEAPON);
  else if (roll < 0.34) pool = ITEMS.filter(i => i.type === ITEM_TYPE.SHIELD);
  else if (roll < 0.58) pool = ITEMS.filter(i => i.type === ITEM_TYPE.HERB);
  else if (roll < 0.74) pool = ITEMS.filter(i => i.type === ITEM_TYPE.SCROLL);
  else if (roll < 0.90) pool = ITEMS.filter(i => i.type === ITEM_TYPE.FOOD);
  else                  pool = ITEMS.filter(i => i.type === ITEM_TYPE.STAFF);

  const def = choice(pool);
  const item = createItem(def.id);

  // 武器・盾はたまに強化値付き
  if ((item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) && chance(0.3)) {
    item.plus = randInt(1, 1 + Math.floor(floor / 3));
  }
  return item;
}

// 表示名（未識別なら種別名でぼかす）
export function displayName(item) {
  if (item.unidentified && !item.identified) {
    switch (item.type) {
      case ITEM_TYPE.HERB:   return 'なぞのくすり';
      case ITEM_TYPE.SCROLL: return 'なぞのメモ';
      case ITEM_TYPE.STAFF:  return 'なぞのステッキ';
    }
  }
  let name = item.name;
  if ((item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) && item.plus) {
    name += (item.plus > 0 ? '+' : '') + item.plus;
  }
  if (item.type === ITEM_TYPE.STAFF && item.charges !== undefined) {
    name += `[${item.charges}]`;
  }
  return name;
}
