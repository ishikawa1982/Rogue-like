// =============================================================
// sprites.js - ドット絵スプライト（16x16ピクセルマップ）
//   スーファミ風のドット絵をコード内で定義し、オフスクリーン
//   キャンバスに描画してキャッシュする。MOTHER2風の世界観。
// =============================================================

// ---- 色ユーティリティ ----
function darken(hex, f = 0.65) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 255) * f);
  const g = Math.floor(((n >> 8) & 255) * f);
  const b = Math.floor((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

// ---- スプライト定義（rows: 16文字×16行, palette: 文字→色） ----
// 'T' = 装備色などで動的に着色（TINT）、'U' = その暗色（TINT_DARK）
export const SPRITE_DEFS = {
  // ===== プレイヤー：赤い帽子の少年 =====
  player: {
    palette: { c: '#e84030', C: '#b02820', s: '#f8c896', e: '#202020', b: '#3858d8', d: '#283068', k: '#503020' },
    rows: [
      '................',
      '.....cccccc.....',
      '....cccccccc....',
      '...cccccccccc...',
      '..CCCCCCCCCCCC..',
      '....ssssssss....',
      '....sessssse....',
      '....ssssssss....',
      '.....ssssss.....',
      '....bbbbbbbb....',
      '...bbbbbbbbbb...',
      '...sbbbbbbbbs...',
      '....dddddddd....',
      '....dd....dd....',
      '....ss....ss....',
      '....kk....kk....',
    ],
  },

  // ===== うろつきキノコ =====
  kinoko: {
    palette: { m: '#e85048', w: '#ffffff', M: '#a83028', t: '#f0d8b0', e: '#303030', T: '#c8a878' },
    rows: [
      '................',
      '.....mmmmmm.....',
      '...mmmmmmmmmm...',
      '..mmwwmmmmwwmm..',
      '..mmwwmmmmwwmm..',
      '..mmmmmmmmmmmm..',
      '...MMMMMMMMMM...',
      '....tttttttt....',
      '....tettttet....',
      '....tttttttt....',
      '.....tttttt.....',
      '.....tttttt.....',
      '....tttttttt....',
      '....tt....tt....',
      '....TT....TT....',
      '................',
    ],
  },

  // ===== ゼリーくん =====
  jelly: {
    palette: { g: '#48c8b0', G: '#2f9a86', e: '#202020', m: '#0d6b5b', w: '#b8f0e4' },
    rows: [
      '................',
      '................',
      '......gggg......',
      '....gggggggg....',
      '...gwwggggggg...',
      '..gwwggggggggg..',
      '..ggeggggggegg..',
      '..gggggggggggg..',
      '..gggmmmmmmggg..',
      '.gggggggggggggg.',
      '.gggggggggggggg.',
      '.GGGGGGGGGGGGGG.',
      '..GG.GGGGGG.GG..',
      '................',
      '................',
      '................',
    ],
  },

  // ===== いたずらガラス =====
  crow: {
    palette: { k: '#383848', E: '#f0f0f0', y: '#f0a020', f: '#c07818' },
    rows: [
      '................',
      '......kkk.......',
      '.....kkkkk......',
      '.....kEkkk......',
      '.....kkkkyy.....',
      '....kkkkkk......',
      '...kkkkkkkk.....',
      '..kkkkkkkkkk....',
      '..kkkkkkkkkkk...',
      '...kkkkkkkkkk...',
      '....kkkkkkkkk...',
      '.....kkkkkkk....',
      '......kkkk......',
      '.....ff..ff.....',
      '................',
      '................',
    ],
  },

  // ===== みならいコック =====
  cook: {
    palette: { w: '#f8f8f8', W: '#d0d0d8', s: '#f8c896', e: '#202020', m: '#c05030', d: '#404060', k: '#202030' },
    rows: [
      '.....wwwwww.....',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '.....WWWWWW.....',
      '....ssssssss....',
      '....sessssse....',
      '....ssssssss....',
      '.....ssmmss.....',
      '....wwwwwwww....',
      '...wwwwwwwwww...',
      '...swwwwwwwws...',
      '....wwwwwwww....',
      '....dd....dd....',
      '....dd....dd....',
      '....kk....kk....',
      '................',
    ],
  },

  // ===== ツッパリこぞう =====
  punk: {
    palette: { h: '#40c840', s: '#f8c896', e: '#202020', m: '#c05030', j: '#383850', d: '#603820', k: '#202020' },
    rows: [
      '.......hh.......',
      '......hhhh......',
      '......hhhh......',
      '....ssssssss....',
      '....sessssse....',
      '....ssssssss....',
      '.....ssmmss.....',
      '....jjjjjjjj....',
      '...jjjjjjjjjj...',
      '...sjjjjjjjjs...',
      '....jjjjjjjj....',
      '....dd....dd....',
      '....dd....dd....',
      '....kk....kk....',
      '................',
      '................',
    ],
  },

  // ===== うちゅうじんグレイ =====
  alien: {
    palette: { a: '#c0d0d0', E: '#182860' },
    rows: [
      '................',
      '.....aaaaaa.....',
      '....aaaaaaaa....',
      '...aaaaaaaaaa...',
      '...aEEaaaaEEa...',
      '...aEEaaaaEEa...',
      '...aaaaaaaaaa...',
      '....aaaaaaaa....',
      '.....aaaaaa.....',
      '......aaaa......',
      '....aaaaaaaa....',
      '...aaaaaaaaaa...',
      '..aa.aaaaaa.aa..',
      '.....aa..aa.....',
      '....aaa..aaa....',
      '................',
    ],
  },

  // ===== ガラクタロボ =====
  robot: {
    palette: { m: '#a8b4c4', M: '#788494', E: '#e83020', G: '#ffd840', k: '#404858' },
    rows: [
      '....mmmmmmmm....',
      '....mEmmmmEm....',
      '....mmmmmmmm....',
      '....MMMMMMMM....',
      '......kkkk......',
      '..mmmmmmmmmmmm..',
      '..mGGmmmmmmGGm..',
      '..mmmmmmmmmmmm..',
      '..MMMMMMMMMMMM..',
      '..mm.mmmmmm.mm..',
      '.....mm..mm.....',
      '.....mm..mm.....',
      '....MMM..MMM....',
      '................',
      '................',
      '................',
    ],
  },

  // ===== サイケなトカゲ =====
  lizard: {
    palette: { g: '#58c858', G: '#3a9a3a', p: '#c050d0', E: '#ffe040', m: '#205820' },
    rows: [
      '.....pp..pp.....',
      '.....gggggg.....',
      '....gggggggg....',
      '....gEggggEg....',
      '....gggggggg....',
      '.....gmmmmg.....',
      '....gggggggg....',
      '...gggggggggg...',
      '..pggggggggggp..',
      '..pggggggggggp..',
      '...gggggggggg...',
      '....gggggggg....',
      '....gg.gg.gg....',
      '....GG....GG....',
      '................',
      '................',
    ],
  },

  // ===== アイテム：バット（武器/着色） =====
  bat: {
    palette: { b: 'TINT', h: '#6a4420' },
    rows: [
      '............bb..',
      '...........bbbb.',
      '..........bbbbb.',
      '.........bbbbb..',
      '........bbbbb...',
      '.......bbbbb....',
      '......bbbbb.....',
      '.....bbbbb......',
      '....bbbbb.......',
      '...bbbbb........',
      '....bbbb........',
      '...hhh..........',
      '..hhh...........',
      '.hhh............',
      '.hh.............',
      '................',
    ],
  },

  // ===== アイテム：ぼうし（防具/着色） =====
  hat: {
    palette: { c: 'TINT', C: 'TINT_DARK' },
    rows: [
      '................',
      '................',
      '................',
      '......cccc......',
      '....cccccccc....',
      '...cccccccccc...',
      '...cccccccccc...',
      '..CCCCCCCCCCCC..',
      '..CCCCCCCCCCCC..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== アイテム：くすりビン（着色） =====
  medicine: {
    palette: { h: 'TINT', k: '#909098', w: '#f8f8f8' },
    rows: [
      '................',
      '................',
      '......kkkk......',
      '......kkkk......',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhwwwwhh....',
      '....hhwwwwhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== アイテム：メモ・チラシ（着色） =====
  memo: {
    palette: { w: '#f8f0d8', W: '#c8b890', l: 'TINT' },
    rows: [
      '................',
      '................',
      '...wwwwwwwwww...',
      '...wwwwwwwwww...',
      '...wllllllllw...',
      '...wwwwwwwwww...',
      '...wllllllllw...',
      '...wwwwwwwwww...',
      '...wllllllllw...',
      '...wwwwwwwwww...',
      '...wwwwwwwwww...',
      '...WWWWWWWWWW...',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== アイテム：ハンバーガー =====
  burger: {
    palette: { b: '#e8a848', w: '#fff8e0', g: '#58c038', m: '#7a4018', B: '#d09038' },
    rows: [
      '................',
      '................',
      '................',
      '.....bbbbbb.....',
      '....bbwbbwbb....',
      '...bbbbbbbbbb...',
      '...gggggggggg...',
      '...mmmmmmmmmm...',
      '...mmmmmmmmmm...',
      '...BBBBBBBBBB...',
      '....BBBBBBBB....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== アイテム：ピザ =====
  pizza: {
    palette: { c: '#c87830', y: '#f8c848', r: '#d03828' },
    rows: [
      '................',
      '................',
      '...cccccccccc...',
      '...yyyyyyyyyy...',
      '....yyryyryy....',
      '....yyyyyyyy....',
      '.....yyryyy.....',
      '.....yyyyyy.....',
      '......yyyy......',
      '......yyyy......',
      '.......yy.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== アイテム：ステッキ（着色） =====
  stick: {
    palette: { s: 'TINT', y: '#ffe040' },
    rows: [
      '...........yy...',
      '..........yyyy..',
      '...........yy...',
      '..........ss....',
      '.........ss.....',
      '........ss......',
      '.......ss.......',
      '......ss........',
      '.....ss.........',
      '....ss..........',
      '...ss...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== ドル（コイン） =====
  coin: {
    palette: { y: '#ffd848', Y: '#c89820', w: '#fff0b0' },
    rows: [
      '................',
      '................',
      '................',
      '.....yyyyyy.....',
      '....yyyyyyyy....',
      '...yywyyyyyyy...',
      '...ywyyyyyyyy...',
      '...yyyyyyyyyy...',
      '...yyyyyyyyyy...',
      '...YyyyyyyyyY...',
      '....YYYYYYYY....',
      '.....YYYYYY.....',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // ===== 階段（穴＋はしご） =====
  stairs: {
    palette: { K: '#3a2a20', k: '#181018', l: '#b88848' },
    rows: [
      '................',
      '................',
      '................',
      '....KKKKKKKK....',
      '...KkkkkkkkkK...',
      '..KkklkkkklkkK..',
      '..KkkllllllkkK..',
      '..KkklkkkklkkK..',
      '..KkkllllllkkK..',
      '...KkklkklkkK...',
      '....KKKKKKKK....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
};

// ---- 定義の整合性チェック（読み込み時に検証） ----
for (const [key, def] of Object.entries(SPRITE_DEFS)) {
  if (def.rows.length !== 16) throw new Error(`sprite ${key}: rows=${def.rows.length}`);
  def.rows.forEach((row, i) => {
    if (row.length !== 16) throw new Error(`sprite ${key} row${i}: len=${row.length} "${row}"`);
    for (const ch of row) {
      if (ch !== '.' && !(ch in def.palette)) throw new Error(`sprite ${key} row${i}: unknown char "${ch}"`);
    }
  });
}

// ---- スプライト生成＆キャッシュ ----
const spriteCache = new Map();

function buildSprite(key, tint) {
  const def = SPRITE_DEFS[key];
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = def.rows[y][x];
      if (ch === '.') continue;
      let color = def.palette[ch];
      if (color === 'TINT') color = tint || '#c0c0c0';
      else if (color === 'TINT_DARK') color = darken(tint || '#c0c0c0');
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function getSprite(key, tint = null) {
  const cacheKey = `${key}:${tint || ''}`;
  if (!spriteCache.has(cacheKey)) spriteCache.set(cacheKey, buildSprite(key, tint));
  return spriteCache.get(cacheKey);
}

// アイテム→スプライト（種別ごとのアイコンを装備色で着色）
import { ITEM_TYPE } from './data.js';

export function getItemSprite(item) {
  switch (item.type) {
    case ITEM_TYPE.WEAPON: return getSprite('bat', item.color);
    case ITEM_TYPE.SHIELD: return getSprite('hat', item.color);
    case ITEM_TYPE.HERB:   return getSprite('medicine', item.color);
    case ITEM_TYPE.SCROLL: return getSprite('memo', item.color);
    case ITEM_TYPE.FOOD:   return getSprite(item.id === 'pizza' ? 'pizza' : 'burger');
    case ITEM_TYPE.STAFF:  return getSprite('stick', item.color);
    default: return getSprite('coin');
  }
}

const urlCache = new Map();
export function getItemSpriteURL(item) {
  const key = `${item.type}:${item.id}:${item.color}`;
  if (!urlCache.has(key)) urlCache.set(key, getItemSprite(item).toDataURL());
  return urlCache.get(key);
}

// =============================================================
// タイルテクスチャ（フロア深度でパレットが変わる：洞窟→青→サイケ）
// =============================================================
export const TILE_THEMES = [
  { // 1〜4F: 茶色の洞窟
    floor: '#b08858', floorDark: '#9c7848', corridor: '#8a6840', corridorDark: '#7a5c38',
    wallTop: '#6a4a30', wallFace: '#54382a', wallHi: '#8a644040', wallEdge: '#86603e', crack: '#442c20',
  },
  { // 5〜8F: 青い鉱窟
    floor: '#7888a8', floorDark: '#687894', corridor: '#5c6a88', corridorDark: '#505e78',
    wallTop: '#3c4868', wallFace: '#2e3850', wallHi: '#56648840', wallEdge: '#525f80', crack: '#242c40',
  },
  { // 9〜12F: サイケな紫
    floor: '#9868a8', floorDark: '#885894', corridor: '#7a5088', corridorDark: '#6a4478',
    wallTop: '#523060', wallFace: '#3e2348', wallHi: '#70459040', wallEdge: '#6a4080', crack: '#2e1838',
  },
];

export function themeForFloor(floor) {
  return Math.min(TILE_THEMES.length - 1, Math.floor((floor - 1) / 4));
}

const tileCache = new Map();

// 決定的な疑似乱数（座標→0..1）
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function buildTile(themeIdx, kind) {
  const t = TILE_THEMES[themeIdx];
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  if (kind === 'floor' || kind === 'corridor') {
    const base = kind === 'floor' ? t.floor : t.corridor;
    const dark = kind === 'floor' ? t.floorDark : t.corridorDark;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = dark;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        // 斜めの細かい模様＋ランダムな砂利
        if ((x + y) % 8 === 0 && hash(x, y) < 0.3) ctx.fillRect(x, y, 1, 1);
        else if (hash(x * 3 + 1, y * 5 + 2) < 0.05) ctx.fillRect(x, y, 1, 1);
      }
    }
    // タイルの目地（うっすら）
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
  } else if (kind === 'wallTop') {
    ctx.fillStyle = t.wallTop;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = t.wallEdge;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        if (hash(x * 7 + 3, y * 11 + 5) < 0.10) ctx.fillRect(x, y, 1, 1);
  } else if (kind === 'wallFace') {
    // 崖の壁面：上端ハイライト＋縦のヒビ
    ctx.fillStyle = t.wallFace;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = t.wallEdge;
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = t.crack;
    for (let y = 2; y < 16; y++)
      for (let x = 0; x < 16; x++)
        if (hash(x * 13 + 7, Math.floor(y / 3) * 17) < 0.08) ctx.fillRect(x, y, 1, 2);
    ctx.fillRect(0, 14, 16, 2);
  }
  return canvas;
}

export function getTileTexture(themeIdx, kind) {
  const key = `${themeIdx}:${kind}`;
  if (!tileCache.has(key)) tileCache.set(key, buildTile(themeIdx, kind));
  return tileCache.get(key);
}
