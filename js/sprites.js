// =============================================================
// sprites.js - 画像素材（タイルアトラス）の読み込みとスプライト取得
//   素材は Dungeon Crawl Stone Soup の CC0 タイル（assets/tiles.png）。
//   tools/build_assets.py でアトラスと対応表(js/atlas.js)を生成している。
// =============================================================
import { ATLAS, ATLAS_COLS, ATLAS_TILE } from './atlas.js';
import { isKnown, lookOf } from './items.js';

const TS = ATLAS_TILE;
let atlasImage = null;

// アトラス画像を読み込む（ゲーム開始前に await する）
export function loadAtlas(url = 'assets/tiles.png') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { atlasImage = img; resolve(img); };
    img.onerror = () => reject(new Error(`画像素材を 読み込めませんでした: ${url}`));
    img.src = url;
  });
}

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = TS;
  c.height = TS;
  return c;
}

function blit(ctx, key, alpha = 1) {
  const i = ATLAS[key];
  if (i === undefined || !atlasImage) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(atlasImage, (i % ATLAS_COLS) * TS, Math.floor(i / ATLAS_COLS) * TS, TS, TS, 0, 0, TS, TS);
  ctx.globalAlpha = 1;
}

// ---- 1枚タイル（キャンバスにキャッシュ） ----
const spriteCache = new Map();
export function getSprite(key) {
  let c = spriteCache.get(key);
  if (!c) {
    c = newCanvas();
    blit(c.getContext('2d'), key);
    spriteCache.set(key, c);
  }
  return c;
}

// 暗くしたタイル（壁の上面・通路用）
const darkCache = new Map();
function getDarkened(key, amount) {
  const ck = `${key}:${amount}`;
  let c = darkCache.get(ck);
  if (!c) {
    c = newCanvas();
    const ctx = c.getContext('2d');
    blit(ctx, key);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(4,4,12,${amount})`;
    ctx.fillRect(0, 0, TS, TS);
    darkCache.set(ck, c);
  }
  return c;
}

// ---- 主人公：素体＋装備中の武器・盾＋髪を重ねて描く ----
const heroCache = new Map();
export function getHeroSprite(player) {
  const w = player.weapon ? player.weapon.doll : '';
  const s = player.shield ? player.shield.doll : '';
  const key = `${w}|${s}`;
  let c = heroCache.get(key);
  if (!c) {
    c = newCanvas();
    const ctx = c.getContext('2d');
    blit(ctx, 'hero_base');
    if (w) blit(ctx, w);
    if (s) blit(ctx, s);
    blit(ctx, 'hero_hair');
    heroCache.set(key, c);
  }
  return c;
}

// ---- アイテム ----
// 未識別になりうるアイテムは「見た目」タイル。識別済みなら右下に小アイコンを重ねる
function itemBaseKey(item) {
  if (item.sprite) return item.sprite;
  const look = lookOf(item);
  if (look) return `${item.type}_${look}`;
  return 'gold_01';
}

const itemCache = new Map();
export function getItemSprite(item) {
  const base = itemBaseKey(item);
  const icon = item.icon && isKnown(item) ? item.icon : '';
  const key = `${base}|${icon}`;
  let c = itemCache.get(key);
  if (!c) {
    c = newCanvas();
    const ctx = c.getContext('2d');
    blit(ctx, base);
    if (icon) {
      // アイコンは右下に小さく（元の絵がつぶれないように）
      const tmp = getSprite(icon);
      ctx.drawImage(tmp, 0, 0, TS, TS, TS * 0.42, TS * 0.42, TS * 0.62, TS * 0.62);
    }
    itemCache.set(key, c);
  }
  return c;
}

export function getGoldSprite(amount) {
  const key = amount >= 400 ? 'gold_16' : amount >= 150 ? 'gold_10' : amount >= 60 ? 'gold_06' : amount >= 25 ? 'gold_03' : 'gold_01';
  return getSprite(key);
}

const urlCache = new Map();
function toURL(key, canvas) {
  let u = urlCache.get(key);
  if (!u) {
    u = canvas.toDataURL();
    urlCache.set(key, u);
  }
  return u;
}

export function getItemSpriteURL(item) {
  const key = `item:${itemBaseKey(item)}|${item.icon && isKnown(item) ? item.icon : ''}`;
  return toURL(key, getItemSprite(item));
}

export function getSpriteURL(key) {
  return toURL(`spr:${key}`, getSprite(key));
}

export function getHeroSpriteURL(player) {
  const key = `hero:${player.weapon ? player.weapon.doll : ''}|${player.shield ? player.shield.doll : ''}`;
  return toURL(key, getHeroSprite(player));
}

// =============================================================
// タイル（エリアごとに床・壁が変わる）
// =============================================================
export const TILE_THEMES = [
  { // 1〜3F: いにしえの石回廊（あたたかい松明の色）
    mote: ['rgba(235,205,150,', 'rgba(210,180,130,'],
    glow: 'rgba(255,176,88,',
    minimap: { floor: '#8a7058', floorLit: '#b8946c', corridor: '#5a4a3c', corridorLit: '#7a6450' },
  },
  { // 4〜6F: 灰色の地下墓所（青白い霊気）
    mote: ['rgba(190,210,235,', 'rgba(220,230,255,'],
    glow: 'rgba(170,200,255,',
    minimap: { floor: '#5c6478', floorLit: '#8490ac', corridor: '#3c4252', corridorLit: '#566078' },
  },
  { // 7〜9F: 苔むした遺跡（緑のきらめき）
    mote: ['rgba(170,240,140,', 'rgba(220,255,160,'],
    glow: 'rgba(170,255,140,',
    minimap: { floor: '#4a6c48', floorLit: '#6c9c68', corridor: '#34483a', corridorLit: '#4c6650' },
  },
  { // 10〜12F: アルカナの深層（青と紫の魔力）
    mote: ['rgba(130,220,255,', 'rgba(200,150,255,', 'rgba(150,255,240,'],
    glow: 'rgba(120,200,255,',
    minimap: { floor: '#3a4a88', floorLit: '#5a70c0', corridor: '#2a3460', corridorLit: '#3c4a84' },
  },
];

export const TILE_VARIANTS = 4; // 床・壁のバリアント数

export function getTileTexture(themeIdx, kind, variant = 0) {
  const v = variant % TILE_VARIANTS;
  switch (kind) {
    case 'floor': return getSprite(`floor${themeIdx}_${v}`);
    case 'corridor': return getDarkened(`floor${themeIdx}_${v}`, 0.28);
    case 'wallFace': return getSprite(`wall${themeIdx}_${v}`);
    case 'wallTop': return getDarkened(`wall${themeIdx}_${v}`, 0.62);
  }
  return getSprite(`floor${themeIdx}_0`);
}

// 壁の松明（点火済みの4フレーム）
export function getTorchSprite(frame) {
  return getSprite(`torch_${1 + (frame % 4)}`);
}

// 決定的な疑似乱数（座標→0..1）。描画側でも配置決定に使う。
export function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

