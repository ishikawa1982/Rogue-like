// =============================================================
// data.js - ゲーム内のマスターデータ（モンスター・アイテム定義）
// =============================================================

// タイル種別
export const TILE = {
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  STAIRS: 3,
};

// アイテム種別
export const ITEM_TYPE = {
  WEAPON: 'weapon',   // 武器
  SHIELD: 'shield',   // 盾
  HERB: 'herb',       // 草
  SCROLL: 'scroll',   // 巻物
  FOOD: 'food',       // 食料（おにぎり）
  STAFF: 'staff',     // 杖
};

// -------------------------------------------------------------
// モンスター定義
//   level: 出現する最小フロア
//   hp, atk: ステータス
//   exp: 倒したときの経験値
//   gold: 倒したときに落とすギャラ（最大値、0〜goldの乱数）
//   ai: 'chase'(追跡) / 'erratic'(不規則) / 'special'(特殊)
//   glyph/color: 表示用
// -------------------------------------------------------------
export const MONSTERS = [
  { id: 'mamuru',   name: 'マムル',       minFloor: 1, hp: 7,   atk: 2,  exp: 2,   gold: 5,   ai: 'chase',   glyph: 'M', color: '#6ad26a' },
  { id: 'slime',    name: 'スライム',     minFloor: 1, hp: 9,   atk: 3,  exp: 3,   gold: 6,   ai: 'chase',   glyph: 'S', color: '#4fc3f7' },
  { id: 'bat',      name: 'おおコウモリ', minFloor: 2, hp: 12,  atk: 4,  exp: 5,   gold: 8,   ai: 'erratic', glyph: 'B', color: '#b39ddb' },
  { id: 'nigiri',   name: 'にぎり見習い', minFloor: 3, hp: 14,  atk: 5,  exp: 7,   gold: 10,  ai: 'special', glyph: 'N', color: '#ffd54f', special: 'nigiri' },
  { id: 'goblin',   name: 'ゴブリン',     minFloor: 4, hp: 20,  atk: 7,  exp: 10,  gold: 15,  ai: 'chase',   glyph: 'G', color: '#a1887f' },
  { id: 'wizard',   name: 'グレートウィザード', minFloor: 6, hp: 24, atk: 9, exp: 14, gold: 20, ai: 'chase', glyph: 'W', color: '#ce93d8' },
  { id: 'ironhead', name: 'アイアンヘッド', minFloor: 8, hp: 35, atk: 12, exp: 22, gold: 30, ai: 'chase', glyph: 'I', color: '#90a4ae' },
  { id: 'dragon',   name: 'りゅう',       minFloor: 10, hp: 60, atk: 18, exp: 45, gold: 60, ai: 'chase', glyph: 'D', color: '#ef5350' },
];

// -------------------------------------------------------------
// アイテム定義
// -------------------------------------------------------------
export const ITEMS = [
  // --- 武器（power=ちから補正） ---
  { id: 'kobou',      name: 'こん棒',       type: ITEM_TYPE.WEAPON, power: 2,  glyph: ')', color: '#bcaaa4' },
  { id: 'copper',     name: '銅の剣',       type: ITEM_TYPE.WEAPON, power: 4,  glyph: ')', color: '#d7905a' },
  { id: 'iron_axe',   name: '鉄の斧',       type: ITEM_TYPE.WEAPON, power: 6,  glyph: ')', color: '#cfd8dc' },
  { id: 'primal_axe', name: '原始の斧',     type: ITEM_TYPE.WEAPON, power: 8,  glyph: ')', color: '#ffb74d' },

  // --- 盾（power=防御補正） ---
  { id: 'wood_shield',  name: '木の盾',     type: ITEM_TYPE.SHIELD, power: 2, glyph: '[', color: '#a1887f' },
  { id: 'bronze_shield',name: '青銅の盾',   type: ITEM_TYPE.SHIELD, power: 4, glyph: '[', color: '#c69c6d' },
  { id: 'iron_shield',  name: '鉄の盾',     type: ITEM_TYPE.SHIELD, power: 6, glyph: '[', color: '#cfd8dc' },
  { id: 'dragon_shield',name: 'ドラゴンシールド', type: ITEM_TYPE.SHIELD, power: 9, glyph: '[', color: '#ef9a9a' },

  // --- 草（使うと効果。effectで分岐） ---
  { id: 'herb',       name: '薬草',         type: ITEM_TYPE.HERB, effect: 'heal',   value: 25, glyph: '"', color: '#81c784', unidentified: true },
  { id: 'life_herb',  name: '命の草',       type: ITEM_TYPE.HERB, effect: 'maxhp',  value: 5,  glyph: '"', color: '#aed581', unidentified: true },
  { id: 'power_herb', name: 'ちからの草',   type: ITEM_TYPE.HERB, effect: 'power',  value: 1,  glyph: '"', color: '#ffb74d', unidentified: true },
  { id: 'poison_herb',name: 'どく草',       type: ITEM_TYPE.HERB, effect: 'poison', value: 3,  glyph: '"', color: '#9575cd', unidentified: true },

  // --- 巻物 ---
  { id: 'scroll_light', name: 'あかりの巻物', type: ITEM_TYPE.SCROLL, effect: 'light',  glyph: '?', color: '#fff176', unidentified: true },
  { id: 'scroll_id',    name: '識別の巻物',  type: ITEM_TYPE.SCROLL, effect: 'identify',glyph: '?', color: '#4dd0e1', unidentified: true },
  { id: 'scroll_quake', name: '地雷の巻物',  type: ITEM_TYPE.SCROLL, effect: 'quake',  glyph: '?', color: '#ff8a65', unidentified: true },

  // --- 食料 ---
  { id: 'onigiri',     name: 'おにぎり',     type: ITEM_TYPE.FOOD, value: 50,  glyph: '*', color: '#fff8e1' },
  { id: 'big_onigiri', name: '大きいおにぎり', type: ITEM_TYPE.FOOD, value: 100, glyph: '*', color: '#ffe082' },

  // --- 杖 ---
  { id: 'staff_swap',  name: '場所がえの杖', type: ITEM_TYPE.STAFF, effect: 'swap',  charges: 4, glyph: '/', color: '#7986cb', unidentified: true },
  { id: 'staff_blast', name: 'ふきとばしの杖', type: ITEM_TYPE.STAFF, effect: 'blast', charges: 5, glyph: '/', color: '#4fc3f7', unidentified: true },
];

// レベルアップに必要な経験値テーブル（インデックス=レベル）
export const EXP_TABLE = [
  0, 5, 14, 30, 56, 109, 185, 305, 470, 720, 1080, 1530, 2130, 2880, 3800, 5000,
];

// 経験値からそのレベルで増えるHP・ちから
export function levelStats(level) {
  return {
    maxHp: 30 + (level - 1) * 8,   // Lv1=30, 以降+8
    str:   8 + Math.floor((level - 1) / 2), // 2レベルごとに+1
  };
}
