// =============================================================
// items.js - アイテム生成・識別・表示名・価格
//   未識別アイテムは「見た目（あかいポーション等）」がゲームごとに
//   シャッフルされ、同じ種類を1つ識別すると全部わかる。
// =============================================================
import { ITEMS, ITEM_TYPE, ITEM_TYPE_WEIGHTS, LOOK_NAMES, TYPE_LABEL } from './data.js';
import { LOOKS } from './atlas.js';
import { randInt, chance, shuffle } from './rng.js';

// -------------------------------------------------------------
// 識別状態（1ゲームにつき1つ。Game.reset() で作り直す）
// -------------------------------------------------------------
const knowledge = {
  looks: {},        // アイテムid → 見た目キー（例: 'ruby'）
  known: new Set(), // 識別済みのアイテムid
};

export function resetKnowledge() {
  knowledge.looks = {};
  knowledge.known = new Set();
  for (const type of Object.keys(LOOKS)) {
    const looks = shuffle(LOOKS[type]);
    ITEMS.filter(i => i.type === type).forEach((def, i) => {
      knowledge.looks[def.id] = looks[i % looks.length];
    });
  }
}
resetKnowledge();

export function isKnown(item) {
  return !item.unidentified || knowledge.known.has(item.id);
}

// その種類を識別済みにする。新たにわかったら true
export function identifyKind(id) {
  if (knowledge.known.has(id)) return false;
  knowledge.known.add(id);
  return true;
}

// 未識別の見た目キー（見た目が固定のアイテムは null）
export function lookOf(item) {
  return knowledge.looks[item.id] || null;
}

// -------------------------------------------------------------
// 生成
// -------------------------------------------------------------
export function createItem(id, opts = {}) {
  const def = ITEMS.find(i => i.id === id);
  if (!def) return null;
  const item = { ...def, ...opts };
  if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) {
    if (item.plus === undefined) item.plus = 0;
  }
  if (item.type === ITEM_TYPE.WAND && opts.charges === undefined) {
    item.charges = def.charges + randInt(-1, 1);
  }
  if (item.type === ITEM_TYPE.POT) {
    if (item.size === undefined) item.size = randInt(3, 5);
    item.contents = [];
  }
  return item;
}

function weightedPick(list, weightOf) {
  const total = list.reduce((s, x) => s + weightOf(x), 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= weightOf(x);
    if (r < 0) return x;
  }
  return list[list.length - 1];
}

// フロアに応じたランダムアイテム。exclude: 除外する種別の配列
export function randomItem(floor, exclude = []) {
  const types = ITEM_TYPE_WEIGHTS.filter(([t]) => !exclude.includes(t));
  const [type] = weightedPick(types, ([, w]) => w);
  let pool = ITEMS.filter(i => i.type === type && i.minFloor <= floor);
  if (!pool.length) pool = ITEMS.filter(i => i.type === type);
  const def = weightedPick(pool, d => d.weight || 1);
  const item = createItem(def.id);

  // 武器・盾はたまに強化値付き
  if ((item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) && chance(0.3)) {
    item.plus = randInt(1, 1 + Math.floor(floor / 4));
  }
  return item;
}

// -------------------------------------------------------------
// 表示
// -------------------------------------------------------------
export function displayName(item) {
  let name;
  if (!isKnown(item)) {
    const look = lookOf(item);
    name = (LOOK_NAMES[item.type] && LOOK_NAMES[item.type][look]) || `なぞの${TYPE_LABEL[item.type]}`;
  } else {
    name = item.name;
  }
  if ((item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) && item.plus) {
    name += (item.plus > 0 ? '+' : '') + item.plus;
  }
  if (item.type === ITEM_TYPE.WAND && isKnown(item)) {
    name += `[${item.charges}]`;
  }
  if (item.type === ITEM_TYPE.POT) {
    name += `[${item.size - item.contents.length}]`;
  }
  return name;
}

export function describe(item) {
  if (!isKnown(item)) {
    return 'まだ正体がわからない。使ってみるか、アイデンティファイかアナライズポットで調べよう。';
  }
  let text = item.desc || '';
  if (item.type === ITEM_TYPE.WEAPON) text += `（攻撃力 +${item.power + (item.plus || 0)}）`;
  if (item.type === ITEM_TYPE.SHIELD) text += `（防御力 +${item.power + (item.plus || 0)}）`;
  if (item.type === ITEM_TYPE.WAND) text += `（残り${item.charges}回）`;
  return text;
}

// -------------------------------------------------------------
// 価格
// -------------------------------------------------------------
export function itemPrice(item) {
  let p = item.price || 10;
  if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.SHIELD) p += (item.plus || 0) * 100;
  if (item.type === ITEM_TYPE.WAND) p += Math.max(0, item.charges) * 40;
  if (item.type === ITEM_TYPE.POT) p += item.size * 50;
  return Math.max(10, p);
}

export function sellPrice(item) {
  return Math.max(5, Math.floor(itemPrice(item) * 0.4 / 5) * 5);
}

// 種別の表示名
export function typeLabel(item) {
  return TYPE_LABEL[item.type] || '';
}
