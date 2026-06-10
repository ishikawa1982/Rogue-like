// =============================================================
// sprites.js - ドット絵スプライト
//   コード内のピクセルマップからオフスクリーンcanvasを生成しキャッシュ。
//   キャラは32x32（w/h指定）でMOTHER2/EarthBound風。outline:true で
//   塗りの周囲に自動でアウトラインを描き、陰影付きの高精細な見た目にする。
//   アイテム/タイルは16x16（既定サイズ）。
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
    w: 32, h: 32, outline: true,
    palette: { r: '#e8463a', R: '#c22a1f', D: '#6e1d14', s: '#f7c89a', S: '#e0a877', e: '#22202a', m: '#b05a44', b: '#2f6fd8', B: '#2050a8', y: '#ffd24a', p: '#26305f', k: '#d83a3a', w: '#f4f4f4' },
    rows: [
      '................................',
      '...........rrrrrrrrrr...........',
      '.........rrrrrrrrrrrrrr.........',
      '........rrrrrrrrrrrrrrrr........',
      '.......rrrrrrrrrrrrrrrrrr.......',
      '.......rRRRRRRRRRRRRRRRRr.......',
      '.......RRRRRRRRRRRRRRRRRR.......',
      '........ssssssssssssssssDDDD....',
      '........ssssssssssssssss........',
      '........ssseesssssseesss........',
      '........ssseesssssseesss........',
      '........ssssssssssssssss........',
      '........ssssssmmmmssssss........',
      '........ssssssssssssssss........',
      '........sSssssssssssssSs........',
      '.........ssssssssssssss.........',
      '..........ssssssssssss..........',
      '......bbbbbbbbbbbbbbbbbbbb......',
      '......byyyyyyyyyyyyyyyyyyb......',
      '......bbbbbbbbbbbbbbbbbbbb......',
      '......byyyyyyyyyyyyyyyyyyb......',
      '......bbbbbbbbbbbbbbbbbbbb......',
      '......ByyyyyyyyyyyyyyyyyyB......',
      '.......BBBBBBBBBBBBBBBBBB.......',
      '.......ssBBBBBBBBBBBBBBss.......',
      '........pppppppppppppppp........',
      '........pppppppppppppppp........',
      '........pppppp....pppppp........',
      '........ssssss....ssssss........',
      '........ssssss....ssssss........',
      '........kkkkkk....kkkkkk........',
      '........wwwwww....wwwwww........',
    ],
  },

  // ===== うろつきキノコ =====
  kinoko: {
    w: 32, h: 32, outline: true,
    palette: { m: '#e8504a', M: '#b8332c', w: '#fdeaea', t: '#efd9b0', T: '#c9a877', e: '#2a2530', k: '#7a3a34', f: '#d8b888', F: '#b89460' },
    rows: [
      '................................',
      '...........mmmmmmmmmm...........',
      '........mmmmmmmmmmmmmmmm........',
      '......mmmmmmmmmmmmmmmmmmmm......',
      '.....mmmmmmmmmmmmmmmmmmmmmm.....',
      '....mmmmmmmmmmmmmmmmmmmmmmmm....',
      '....mmmmwwwmmmmmmmwwwmmmmmmm....',
      '...mmmmmmmmmmmmmmmmmmmmmmmmmm...',
      '...mmmmwwwwmmmmmmmmmwwwwmmmmm...',
      '...mmmmmmmmmmmmmmmmmmmmmmmmmm...',
      '....MMMMMMMMMMMMMMMMMMMMMMMM....',
      '.....MMMMMMMMMMMMMMMMMMMMMM.....',
      '........kkkkkkkkkkkkkkkk........',
      '..........tttttttttttt..........',
      '..........tteetttteett..........',
      '..........tteetttteett..........',
      '..........tttttttttttt..........',
      '..........ttttmmmmtttt..........',
      '.........tttttttttttttt.........',
      '.........tttttttttttttt.........',
      '.........tTttttttttttTt.........',
      '.........tttttttttttttt.........',
      '..........tttttttttttt..........',
      '..........tttttttttttt..........',
      '..........tTTTTTTTTTTt..........',
      '...........tttttttttt...........',
      '...........ffff..ffff...........',
      '...........ffff..ffff...........',
      '...........FFFF..FFFF...........',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== ゼリーくん =====
  jelly: {
    w: 32, h: 32, outline: true,
    palette: { g: '#46c8b2', G: '#2f9a86', d: '#1f7a68', w: '#c8f4ea', E: '#15201e', m: '#0d4f44' },
    rows: [
      '................................',
      '................................',
      '............gggggggg............',
      '.........gggggggggggggg.........',
      '.......gggggggggggggggggg.......',
      '......gggggggggggggggggggg......',
      '.....wwgggggggggggggggggggg.....',
      '.....wggggggggggggggggggggg.....',
      '....gggggggggggggggggggggggg....',
      '....gggggEEggggggggggEEggggg....',
      '....gggggEEggggggggggEEggggg....',
      '....gggggggggggggggggggggggg....',
      '....ggggggggmmmmmmmmgggggggg....',
      '....gggggggggggggggggggggggg....',
      '...gggggggggggggggggggggggggg...',
      '...gggggggggggggggggggggggggg...',
      '...gggggggggggggggggggggggggg...',
      '...dggggggggggggggggggggggggd...',
      '...gggggggggggggggggggggggggg...',
      '....gggggggggggggggggggggggg....',
      '....GGGGGGGGGGGGGGGGGGGGGGGG....',
      '.....GGGGGGGGGGGGGGGGGGGGGG.....',
      '......dddddddddddddddddddd......',
      '.......gggggggggggggggggg.......',
      '........gggggggggggggggg........',
      '...........gggg..gggg...........',
      '...........GGGG..GGGG...........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== いたずらガラス =====
  crow: {
    w: 32, h: 32, outline: true,
    palette: { k: '#3a3a4c', K: '#26263a', E: '#f4f4f4', P: '#15151e', y: '#f0a838', f: '#c07820' },
    rows: [
      '................................',
      '................................',
      '.............kkkkkk.............',
      '...........kkkkkkkkkk...........',
      '..........kkkkkkkkkkkk..........',
      '..........kkkEEkkkkkk...........',
      '..........kkkEPkkkkkyyyy........',
      '..........kkkkkkkkkkyyy.........',
      '.........kkkkkkkkkkkk...........',
      '........kkkkkkkkkkkkkk..........',
      '.......kkkkkkkkkkkkkkkk.........',
      '......kkkkkkkkkkkkkkkkkk........',
      '......kkkkkkkkkkkkkkkkkk........',
      '.....kkkkkkkkkkkkkkkkkkkk.......',
      '.....kkkkkkkkkkkkkkkkkkkk.......',
      '.....KKKKkkkkkkkkkkkkKKKK.......',
      '......KKKkkkkkkkkkkkkKKK........',
      '.......kkkkkkkkkkkkkkkk.........',
      '........kkkkkkkkkkkkkk..........',
      '.........kkkkkkkkkkkk...........',
      '..........kkkkkkkkkk............',
      '...........kkkkkkkk.............',
      '............kkkkkk..............',
      '...........ff....ff.............',
      '...........ff....ff.............',
      '..........fff....fff............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== みならいコック =====
  cook: {
    w: 32, h: 32, outline: true,
    palette: { w: '#f8f8f8', W: '#d2d2dc', s: '#f7c89a', S: '#e0a877', e: '#2a2530', m: '#b05a44', d: '#3a3a52', k: '#202030', a: '#e8e8ee', P: '#9aa0ac' },
    rows: [
      '................................',
      '..........wwwwwwwwwwww..........',
      '........wwwwwwwwwwwwwwww........',
      '.......wwwwwwwwwwwwwwwwww.......',
      '.......wwwwwwwwwwwwwwwwww.......',
      '........wwwwwwwwwwwwwwww........',
      '.........WWWWWWWWWWWWWW.........',
      '..........ssssssssssss..........',
      '..........sseesssseess..........',
      '..........sseesssseess..........',
      '..........ssssssssssss..........',
      '..........sssssmmsssss..........',
      '...........ssssssssss...........',
      '.........aaaaaaaaaaaaaa.........',
      '........aaaaaaaaaaaaaaaa........',
      '........aaaaaaaaaaaaaaaa........',
      '........aaaaPPPPPPPPaaaa........',
      '........aaaaPPPPPPPPaaaa........',
      '........aaaaPPPPPPPPaaaa........',
      '........saaaaaaaaaaaaaas........',
      '.......sssaaaaaaaaaaaasss.......',
      '.......ss.aaaaaaaaaaaa.ss.......',
      '..........aaaaaaaaaaaa..........',
      '..........dddddddddddd..........',
      '..........dddddddddddd..........',
      '..........dddd..dddd............',
      '..........dddd..dddd............',
      '..........kkkk..kkkk............',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== ツッパリこぞう =====
  punk: {
    w: 32, h: 32, outline: true,
    palette: { h: '#48c848', H: '#2f9a2f', s: '#f7c89a', S: '#e0a877', e: '#2a2530', m: '#b05a44', j: '#3a3a52', J: '#262638', d: '#5a3420', k: '#202020' },
    rows: [
      '................................',
      '..............hhhh..............',
      '............hhhhhhhh............',
      '..........hhhhhhhhhhhh..........',
      '.........hhhhhhhhhhhhhh.........',
      '........hhhHHHhhhhHHHhhh........',
      '........HHHsssssssssssH.........',
      '..........ssssssssssss..........',
      '..........sseesssseess..........',
      '..........sseesssseess..........',
      '..........ssssssssssss..........',
      '..........sssmmmmmssss..........',
      '...........ssssssssss...........',
      '.........jjjjjjjjjjjjjj.........',
      '........jjjjjjjjjjjjjjjj........',
      '........jjjJJJJJJJJJJjjj........',
      '........jjjJJJJJJJJJJjjj........',
      '........sjjJJJJJJJJJJjjs........',
      '.......sssjjjjjjjjjjjjsss.......',
      '.......ss.jjjjjjjjjjjj.ss.......',
      '..........jjjjjjjjjjjj..........',
      '..........dddddddddddd..........',
      '..........dddddddddddd..........',
      '..........dddd..dddd............',
      '..........dddd..dddd............',
      '..........kkkk..kkkk............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== うちゅうじんグレイ =====
  alien: {
    w: 32, h: 32, outline: true,
    palette: { a: '#c6d4d2', A: '#9aacaa', E: '#10204e', b: '#7f9b97' },
    rows: [
      '................................',
      '..........aaaaaaaaaaaa..........',
      '........aaaaaaaaaaaaaaaa........',
      '.......aaaaaaaaaaaaaaaaaa.......',
      '......aaaaaaaaaaaaaaaaaaaa......',
      '......aaaaaaaaaaaaaaaaaaaa......',
      '......aaaEEEEaaaaaaEEEEaaa......',
      '......aaEEEEEEaaaaEEEEEEaa......',
      '......aaaEEEEaaaaaaEEEEaaa......',
      '.......aaaaaaaaaaaaaaaaaa.......',
      '........aaaaaaaaaaaaaaaa........',
      '.........aaaaaaaaaaaaaa.........',
      '..........AAAaaaaaaAAA..........',
      '............aaaaaaaa............',
      '...........aaaaaaaaaa...........',
      '..........aaaaaaaaaaaa..........',
      '.........aaaaaaaaaaaaaa.........',
      '........baaaaaaaaaaaaaab........',
      '.......baaaaaaaaaaaaaaaab.......',
      '.......baaaaaaaaaaaaaaaab.......',
      '........aaaaaaaaaaaaaaaa........',
      '.........aaaaaaaaaaaaaa.........',
      '..........aaaaaaaaaaaa..........',
      '..........aaaaaaaaaaaa..........',
      '..........aaaa..aaaa............',
      '..........aaaa..aaaa............',
      '..........AAAA..AAAA............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== ガラクタロボ =====
  robot: {
    w: 32, h: 32, outline: true,
    palette: { m: '#aab6c6', M: '#7a8696', E: '#e83020', G: '#ffd840', k: '#3a4250', a: '#9aa6b6' },
    rows: [
      '................................',
      '...............k................',
      '..............kkk...............',
      '..............kGk...............',
      '..........mmmmmmmmmmmm..........',
      '..........mmmmmmmmmmmm..........',
      '..........mEEmmmmmmEEm..........',
      '..........mEEmmmmmmEEm..........',
      '..........mmmmmmmmmmmm..........',
      '..........mmmmkkkkmmmm..........',
      '..........MMMMMMMMMMMM..........',
      '........aa.mmmmmmmmmm.aa........',
      '.......aaa.mmmmmmmmmm.aaa.......',
      '.......aa..mGGmmmmGGm..aa.......',
      '...........mmmmmmmmmm...........',
      '..........mmmmmmmmmmmm..........',
      '..........mmmGGGGGGmmm..........',
      '..........mmmmmmmmmmmm..........',
      '..........MMMMMMMMMMMM..........',
      '..........mmmmmmmmmmmm..........',
      '..........MMMMMMMMMMMM..........',
      '..........mmmm..mmmm............',
      '..........mmmm..mmmm............',
      '..........MMMM..MMMM............',
      '.........kkkkk..kkkkk...........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== サイケなトカゲ =====
  lizard: {
    w: 32, h: 32, outline: true,
    palette: { g: '#5ac85a', G: '#3a9a3a', p: '#c050d0', P: '#9a3aa8', E: '#ffe040', e: '#202a20', m: '#1e4e1e' },
    rows: [
      '................................',
      '.........p..........p...........',
      '........ppp........ppp..........',
      '.........gggggggggggg...........',
      '.......gggggggggggggggg.........',
      '......gggggggggggggggggg........',
      '......ggEEEgggggggEEEggg........',
      '......ggEEEgggggggEEEggg........',
      '......gggggggggggggggggg........',
      '.......ggggmmmmmmmgggg..........',
      '......gggggggggggggggggg........',
      '.....gggggggggggggggggggg.......',
      '....ggppgggggggggggggppgg.......',
      '....ggPPgggggggggggggPPgg.......',
      '....gggggggggggggggggggggg......',
      '...ggppgggggggggggggggppgg......',
      '...ggPPgggggggggggggggPPgg......',
      '...gggggggggggggggggggggg.......',
      '....gggggggggggggggggggg........',
      '.....ggppggggggggggggpp.........',
      '......gggggggggggggggg..........',
      '.......gggggggggggggg...........',
      '........gggggggggggg............',
      '.........gggggggggg.............',
      '.......gggg....gggg.............',
      '......gggg......gggg............',
      '......GGGG......GGGG............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
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

// 各スプライトのサイズ（未指定は16x16）
function defW(def) { return def.w || 16; }
function defH(def) { return def.h || 16; }

// ---- 定義の整合性チェック（読み込み時に検証） ----
for (const [key, def] of Object.entries(SPRITE_DEFS)) {
  const w = defW(def), h = defH(def);
  if (def.rows.length !== h) throw new Error(`sprite ${key}: rows=${def.rows.length} expected ${h}`);
  def.rows.forEach((row, i) => {
    if (row.length !== w) throw new Error(`sprite ${key} row${i}: len=${row.length} expected ${w} "${row}"`);
    for (const ch of row) {
      if (ch !== '.' && !(ch in def.palette)) throw new Error(`sprite ${key} row${i}: unknown char "${ch}"`);
    }
  });
}

// ---- スプライト生成＆キャッシュ ----
const spriteCache = new Map();
const OUTLINE = '#1a1410'; // EarthBound風の濃い輪郭線

// 歩行フレーム：脚（下部の列）の片側を1px持ち上げて「片足を上げた」絵を作る。
// side='L' で左半分、'R' で右半分の脚を持ち上げる。
function steppedRows(rows, side, w, h) {
  const grid = rows.map(r => r.split(''));
  const legTop = h - 4;
  const inSide = (x) => (side === 'L' ? x < w / 2 : x >= w / 2);
  for (let x = 0; x < w; x++) {
    if (!inSide(x)) continue;
    for (let y = legTop; y < h; y++) {
      grid[y][x] = y + 1 < h ? rows[y + 1][x] : '.';
    }
  }
  return grid.map(r => r.join(''));
}

function buildSprite(key, tint, frame) {
  const def = SPRITE_DEFS[key];
  const w = defW(def), h = defH(def);
  let rows = def.rows;
  if (frame === 1) rows = steppedRows(rows, 'L', w, h);
  else if (frame === 2) rows = steppedRows(rows, 'R', w, h);

  // 塗りの有無マップ
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.';

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1) 自動アウトライン（塗りの周囲1pxを濃色で囲う）
  if (def.outline) {
    ctx.fillStyle = def.outlineColor || OUTLINE;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (filled(x, y)) continue;
        // 8近傍に塗りがあれば輪郭
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if ((dx || dy) && filled(x + dx, y + dy)) { near = true; break; }
        if (near) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 2) 本体の塗り
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
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

// frame: 0=待機, 1=歩行A(左足上げ), 2=歩行B(右足上げ)
export function getSprite(key, tint = null, frame = 0) {
  const cacheKey = `${key}:${tint || ''}:${frame}`;
  if (!spriteCache.has(cacheKey)) spriteCache.set(cacheKey, buildSprite(key, tint, frame));
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
