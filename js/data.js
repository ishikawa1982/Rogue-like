// =============================================================
// data.js - ゲーム内のマスターデータ（モンスター・アイテム定義）
//   MOTHER2風の世界観：現代風でちょっとヘンな敵やアイテムたち
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
  WEAPON: 'weapon',   // ぶき
  SHIELD: 'shield',   // ぼうし（防具）
  HERB: 'herb',       // くすり
  SCROLL: 'scroll',   // メモ・チラシ
  FOOD: 'food',       // たべもの
  STAFF: 'staff',     // ステッキ
};

// -------------------------------------------------------------
// モンスター定義
//   minFloor: 出現する最小フロア
//   hp, atk: ステータス
//   exp: 倒したときの経験値
//   gold: 倒したときに落とすドル（最大値、0〜goldの乱数）
//   ai: 'chase'(追跡) / 'erratic'(不規則) / 'special'(特殊)
//   sprite: スプライトキー / color: ミニマップ等の表示色
// -------------------------------------------------------------
export const MONSTERS = [
  { id: 'kinoko', name: 'うろつきキノコ',   minFloor: 1,  hp: 7,  atk: 2,  exp: 2,  gold: 5,  ai: 'chase',   sprite: 'kinoko', color: '#e85048' },
  { id: 'jelly',  name: 'ゼリーくん',       minFloor: 1,  hp: 9,  atk: 3,  exp: 3,  gold: 6,  ai: 'chase',   sprite: 'jelly',  color: '#48c8b0' },
  { id: 'crow',   name: 'いたずらガラス',   minFloor: 2,  hp: 12, atk: 4,  exp: 5,  gold: 8,  ai: 'erratic', sprite: 'crow',   color: '#9090a8' },
  { id: 'cook',   name: 'みならいコック',   minFloor: 3,  hp: 14, atk: 5,  exp: 7,  gold: 10, ai: 'special', sprite: 'cook',   color: '#f8f8f8', special: 'burger' },
  { id: 'punk',   name: 'ツッパリこぞう',   minFloor: 4,  hp: 20, atk: 7,  exp: 10, gold: 15, ai: 'chase',   sprite: 'punk',   color: '#40c840' },
  { id: 'alien',  name: 'うちゅうじんグレイ', minFloor: 6, hp: 24, atk: 9,  exp: 14, gold: 20, ai: 'chase',   sprite: 'alien',  color: '#c0d0d0' },
  { id: 'robot',  name: 'ガラクタロボ',     minFloor: 8,  hp: 35, atk: 12, exp: 22, gold: 30, ai: 'chase',   sprite: 'robot',  color: '#a8b4c4' },
  { id: 'lizard', name: 'サイケなトカゲ',   minFloor: 10, hp: 60, atk: 18, exp: 45, gold: 60, ai: 'chase',   sprite: 'lizard', color: '#c050d0' },
];

// -------------------------------------------------------------
// アイテム定義
// -------------------------------------------------------------
export const ITEMS = [
  // --- ぶき（power=こうげき補正） ---
  { id: 'bat',     name: 'バット',       type: ITEM_TYPE.WEAPON, power: 2, glyph: ')', color: '#d8a050' },
  { id: 'frypan',  name: 'フライパン',   type: ITEM_TYPE.WEAPON, power: 4, glyph: ')', color: '#b8bcc8' },
  { id: 'yoyo',    name: 'ヨーヨー',     type: ITEM_TYPE.WEAPON, power: 6, glyph: ')', color: '#e85048' },
  { id: 'starbat', name: 'スターバット', type: ITEM_TYPE.WEAPON, power: 8, glyph: ')', color: '#ffd848' },

  // --- ぼうし（power=ぼうぎょ補正） ---
  { id: 'cap',      name: 'やきゅうぼう',   type: ITEM_TYPE.SHIELD, power: 2, glyph: '[', color: '#3878e0' },
  { id: 'helmet',   name: 'ヘルメット',     type: ITEM_TYPE.SHIELD, power: 4, glyph: '[', color: '#e8b838' },
  { id: 'metalcap', name: 'メタルキャップ', type: ITEM_TYPE.SHIELD, power: 6, glyph: '[', color: '#aab4c4' },
  { id: 'starcap',  name: 'スターキャップ', type: ITEM_TYPE.SHIELD, power: 9, glyph: '[', color: '#e84878' },

  // --- くすり（使うと効果。effectで分岐） ---
  { id: 'medicine',  name: 'キズぐすり',     type: ITEM_TYPE.HERB, effect: 'heal',   value: 25, glyph: '"', color: '#58c038', unidentified: true },
  { id: 'pudding',   name: 'いのちのプリン', type: ITEM_TYPE.HERB, effect: 'maxhp',  value: 5,  glyph: '"', color: '#f8c848', unidentified: true },
  { id: 'protein',   name: 'プロテイン',     type: ITEM_TYPE.HERB, effect: 'power',  value: 1,  glyph: '"', color: '#e88838', unidentified: true },
  { id: 'badbanana', name: 'くさったバナナ', type: ITEM_TYPE.HERB, effect: 'poison', value: 3,  glyph: '"', color: '#9868d8', unidentified: true },

  // --- メモ・チラシ ---
  { id: 'flyer_map',     name: 'ちずのチラシ',   type: ITEM_TYPE.SCROLL, effect: 'light',    glyph: '?', color: '#e89038', unidentified: true },
  { id: 'flyer_know',    name: 'ものしりメモ',   type: ITEM_TYPE.SCROLL, effect: 'identify', glyph: '?', color: '#48a8e8', unidentified: true },
  { id: 'flyer_thunder', name: 'かみなりのチラシ', type: ITEM_TYPE.SCROLL, effect: 'quake',  glyph: '?', color: '#e8d038', unidentified: true },

  // --- たべもの ---
  { id: 'burger', name: 'ハンバーガー', type: ITEM_TYPE.FOOD, value: 50,  glyph: '*', color: '#e8a848' },
  { id: 'pizza',  name: 'ピザ',         type: ITEM_TYPE.FOOD, value: 100, glyph: '*', color: '#f8c848' },

  // --- ステッキ ---
  { id: 'stick_swap',  name: 'いれかえステッキ',   type: ITEM_TYPE.STAFF, effect: 'swap',  charges: 4, glyph: '/', color: '#7986cb', unidentified: true },
  { id: 'stick_blast', name: 'ふっとばしステッキ', type: ITEM_TYPE.STAFF, effect: 'blast', charges: 5, glyph: '/', color: '#4fc3f7', unidentified: true },
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
