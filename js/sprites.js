// =============================================================
// sprites.js - ドット絵スプライト
//   コード内のピクセルマップからオフスクリーンcanvasを生成しキャッシュ。
//   キャラ・アイテムは32x32（w/h指定）でMOTHER2/EarthBound風。outline:true
//   で塗りの周囲に自動でアウトラインを描き、陰影付きの高精細な見た目にする。
//   タイル(床/通路/壁)も32x32でプロシージャル生成（石畳・レンガ・岩肌）。
// =============================================================

// ---- 色ユーティリティ ----
function darken(hex, f = 0.65) {
  return shade(hex, f);
}

// 明度を係数fで変える（f<1で暗く、f>1で明るく）。255でクランプ。
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
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
    w: 32, h: 32, outline: true, faceChars: 'eo', // 背面では目(e)と口(o)だけ消す。カサ(m)は残す
    palette: { m: '#e8504a', M: '#b8332c', w: '#fdeaea', t: '#efd9b0', T: '#c9a877', e: '#2a2530', o: '#a8302a', k: '#7a3a34', f: '#d8b888', F: '#b89460' },
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
      '..........ttttooootttt..........',
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

  // ===== プレイヤー：横向き（右向きプロファイル。左向きは反転） =====
  player_side: {
    w: 32, h: 32, outline: true,
    palette: { r: '#e8463a', R: '#c22a1f', D: '#6e1d14', s: '#f7c89a', S: '#e0a877', e: '#22202a', m: '#b05a44', b: '#2f6fd8', B: '#2050a8', y: '#ffd24a', p: '#26305f', k: '#d83a3a', w: '#f4f4f4' },
    rows: [
      '................................',
      '................................',
      '...........rrrrrrrr.............',
      '..........rrrrrrrrrr............',
      '.........rrrrrrrrrrrr...........',
      '.........rRRRRRRRRRRr...........',
      '.........RRRRRRRRRRRR...........',
      '..........ssssssssssDDDDD.......',
      '..........ssssssssss............',
      '..........ssssssseess...........',
      '..........ssssssseess...........',
      '..........ssssssssssS...........',
      '..........ssssssmmsss...........',
      '..........ssssssssss............',
      '..........ssssssssss............',
      '...........ssssssss.............',
      '...........ssssssss.............',
      '.........bbbbbbbbbbbb...........',
      '.........byyyyyyyyyyb...........',
      '.........bbbbbbbbbbbb...........',
      '.........byyyyyyyyyyb...........',
      '.........bbbbbbbbbbbb...........',
      '.........byyyyyyyyyyb...........',
      '..........bbbbbbbbbb............',
      '..........ssbbbbbbss............',
      '..........pppppppppp............',
      '..........pppppppppp............',
      '..........ppp...pppp............',
      '..........sss...ssss............',
      '..........sss...ssss............',
      '..........kkk...kkkkk...........',
      '..........www...wwwww...........',
    ],
  },

  // ===== アイテム：バット（武器/着色） =====
  bat: {
    w: 32, h: 32, outline: true,
    palette: { b: 'TINT', B: 'TINT_DARK', h: '#7a4a24', H: '#5a3418' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '.............bbbbbb.............',
      '............bbbbbbbb............',
      '............bbbbBBbb............',
      '............bbbbBBbb............',
      '............bbbbBBbb............',
      '.............bbbBBb.............',
      '.............bbbBBb.............',
      '.............bbbBBb.............',
      '..............bbBb..............',
      '..............bbBb..............',
      '..............bbBb..............',
      '..............bbBb..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '..............hhHh..............',
      '.............hhhHh..............',
      '.............hhHHHh.............',
      '.............hhHHHh.............',
      '..............hhHh..............',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：ぼうし（防具/着色） =====
  hat: {
    w: 32, h: 32, outline: true,
    palette: { c: 'TINT', C: 'TINT_DARK' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.............cccccc.............',
      '...........cccccccccc...........',
      '..........cccccccccccc..........',
      '.........cccccccccccccc.........',
      '........cccccccccccccccc........',
      '........cccccccccccccccc........',
      '.......CCCCCCCCCCCCCCCCCC.......',
      '.......CCCCCCCCCCCCCCCCCCCCCC...',
      '....................CCCCCCCC....',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：くすりビン（着色） =====
  medicine: {
    w: 32, h: 32, outline: true,
    palette: { h: 'TINT', H: 'TINT_DARK', k: '#9a6a2a', K: '#6a4420', g: '#dfe9f0', G: '#b8c8d2', w: '#ffffff' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '..............kkkk..............',
      '..............kkkk..............',
      '..............KKKK..............',
      '.............gggggg.............',
      '.............gggggg.............',
      '...........gggggggggg...........',
      '..........gggggggggggg..........',
      '.........gghhhhhhhhhhgg.........',
      '.........gwhhhhhhhhhhgg.........',
      '.........gghhhhhhhhhhgg.........',
      '.........gghhhhhhhhhhgg.........',
      '.........gghhhhhhhhhhgg.........',
      '.........gghhhhhhhhhhgg.........',
      '.........gghhhhhhhhhhgg.........',
      '..........gghhhhhhhhgg..........',
      '..........gggggggggggg..........',
      '...........GGGGGGGGGG...........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：メモ・チラシ（着色） =====
  memo: {
    w: 32, h: 32, outline: true,
    palette: { w: '#f8f1d8', W: '#cbbd95', l: 'TINT', L: 'TINT_DARK' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......wwllllllllllllllllww......',
      '......wwwwwwwwwwwwwwwwwwww......',
      '......WWWWWWWWWWWWWWWWWWWW......',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：ハンバーガー =====
  burger: {
    w: 32, h: 32, outline: true,
    palette: { u: '#eaa94a', U: '#c8842c', w: '#fff2cc', g: '#5ac038', G: '#3a9a28', p: '#a85828', P: '#7a3c18', c: '#ffd24a' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..........uuuuuuuuuuuu..........',
      '........uuuuuuuuuuuuuuuu........',
      '.......uuwuuuuwuuuuwuuuuu.......',
      '......uuuuuuuuuuuuuuuuuuuu......',
      '......uuuuuuuuuuuuuuuuuuuu......',
      '......gggggggggggggggggggg......',
      '......GGGGGGGGGGGGGGGGGGGG......',
      '......cccccccccccccccccccc......',
      '......pppppppppppppppppppp......',
      '......PPPPPPPPPPPPPPPPPPPP......',
      '......uuuuuuuuuuuuuuuuuuuu......',
      '.......uuuuuuuuuuuuuuuuuu.......',
      '........UUUUUUUUUUUUUUUU........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：ピザ =====
  pizza: {
    w: 32, h: 32, outline: true,
    palette: { c: '#e0a040', C: '#b87828', y: '#f8c84a', Y: '#e0a830', r: '#d83828', R: '#a82820' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '......cccccccccccccccccccc......',
      '......CCCCCCCCCCCCCCCCCCCC......',
      '.......yyyyyyyyyyyyyyyyyy.......',
      '.......yyrryyyyyyyyrryyyy.......',
      '.......yyrryyyyyyyyrryyyy.......',
      '........yyyyyyyyyyyyyyyy........',
      '........yyyyyrryyyyyyyyy........',
      '.........yyyyyyyyyyyyyy.........',
      '..........yyyyyyyyyyyy..........',
      '...........yyyyyyyyyy...........',
      '............yyyyyyyy............',
      '.............yyyyyy.............',
      '..............yyyy..............',
      '...............yy...............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== アイテム：ステッキ（着色） =====
  stick: {
    w: 32, h: 32, outline: true,
    palette: { s: 'TINT', S: 'TINT_DARK', y: '#ffe24a', Y: '#e0b820', w: '#ffffff' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '.......................y........',
      '......................yYy.......',
      '.......................y........',
      '.....................yyyyy......',
      '....................yyYYYyy.....',
      '.....................yyYyy......',
      '......................yYy.......',
      '....................ss..........',
      '...................ss...........',
      '..................ss............',
      '..................sS............',
      '.................ss.............',
      '................ss..............',
      '...............sS...............',
      '...............ss...............',
      '..............ss................',
      '.............sS.................',
      '.............ss.................',
      '............ss..................',
      '...........sS...................',
      '...........ss...................',
      '..........ss....................',
      '.........ss.....................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== ドル（コイン） =====
  coin: {
    w: 32, h: 32, outline: true,
    palette: { y: '#ffd84a', Y: '#c89420', o: '#fff2bf', d: '#9a6e16' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...........yyyyyyyyyy...........',
      '.........yyyyyyyyyyyyyy.........',
      '........yyyyyyyyyyyyyyyy........',
      '........yoyyyydddyyyyyyy........',
      '.......yyyyyyyddyyyyyyyy........',
      '.......yyyyyyyddyyyyyyyy........',
      '......yyyyyydddddddyyyyyy.......',
      '......yyyyyydddyyyyyyyyyy.......',
      '......yyyyyydddddddyyyyyy.......',
      '......yyyyyyyyyyydddyyyyy.......',
      '......yyyyyyydddddddyyyyy.......',
      '.......yyyyyyddyyyyyyyyy........',
      '.......YYyyyyddyyyyyyyY.........',
      '........YYyyydddyyyyYY..........',
      '.........YYYYYYYYYYYY...........',
      '...........YYYYYYYY.............',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
    ],
  },

  // ===== 階段（穴＋はしご） =====
  stairs: {
    w: 32, h: 32, outline: true,
    palette: { K: '#2c2018', k: '#120c08', l: '#caa050', L: '#9a7430', s: '#5a4228' },
    rows: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '........KKKKKKKKKKKKKKKK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KkllllllllllllkK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KkllllllllllllkK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KkllllllllllllkK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KkllllllllllllkK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KkllllllllllllkK........',
      '........KkkkkkkkkkkkkkkK........',
      '........KKKKKKKKKKKKKKKK........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
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

// 背面ビュー用：顔のパーツ（目・口・つば）を取り除き、左右の体色で埋める。
// これで「正面」スプライトから自動的に「後ろ姿」を生成する。
// 顔チャーはスプライトごとに def.faceChars で指定可（既定は目e/E・口m・つばD・瞳P）。
const DEFAULT_FACE = 'eEmPD';
function backRows(rows, w, faceStr) {
  const FACE = new Set((faceStr || DEFAULT_FACE).split(''));
  return rows.map((row) => {
    const a = row.split('');
    for (let x = 0; x < w; x++) {
      if (!FACE.has(a[x])) continue;
      let rep = '.';
      for (let k = x - 1; k >= 0; k--) {
        if (row[k] !== '.' && !FACE.has(row[k])) { rep = row[k]; break; }
      }
      if (rep === '.') for (let k = x + 1; k < w; k++) {
        if (row[k] !== '.' && !FACE.has(row[k])) { rep = row[k]; break; }
      }
      a[x] = rep;
    }
    return a.join('');
  });
}

function buildSprite(key, tint, frame, mode) {
  const def = SPRITE_DEFS[key];
  const w = defW(def), h = defH(def);
  let rows = def.rows;
  if (frame === 1) rows = steppedRows(rows, 'L', w, h);
  else if (frame === 2) rows = steppedRows(rows, 'R', w, h);
  if (mode === 'back') rows = backRows(rows, w, def.faceChars);

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
// mode: null=通常, 'back'=背面（顔を消す）
export function getSprite(key, tint = null, frame = 0, mode = null) {
  const cacheKey = `${key}:${tint || ''}:${frame}:${mode || ''}`;
  if (!spriteCache.has(cacheKey)) spriteCache.set(cacheKey, buildSprite(key, tint, frame, mode));
  return spriteCache.get(cacheKey);
}

// そのキーのスプライト定義が存在するか（向き別スプライトのフォールバック判定に使う）
export function spriteExists(key) {
  return key in SPRITE_DEFS;
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

const TS = 32; // タイルのネイティブ解像度（キャラと同じ32pxドット）

function buildTile(themeIdx, kind) {
  const t = TILE_THEMES[themeIdx];
  const canvas = document.createElement('canvas');
  canvas.width = TS;
  canvas.height = TS;
  const ctx = canvas.getContext('2d');
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };

  if (kind === 'floor' || kind === 'corridor') {
    const base = kind === 'floor' ? t.floor : t.corridor;
    const dark = kind === 'floor' ? t.floorDark : t.corridorDark;
    const hi = shade(base, 1.10);
    const sp = shade(base, 0.86);
    // ベース
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TS, TS);
    // 砂利・斑点（決定的ノイズ）で質感
    for (let y = 0; y < TS; y++) {
      for (let x = 0; x < TS; x++) {
        const r = hash(x * 3 + 1, y * 5 + 2);
        if (r < 0.06) px(x, y, sp);
        else if (r > 0.965) px(x, y, hi);
      }
    }
    // 石畳の目地（32pxを4分割した16/16の格子）＋ベベル
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, TS - 1, TS, 1);
    ctx.fillRect(TS - 1, 0, 1, TS);
    ctx.fillRect(0, 15, TS, 1);
    ctx.fillRect(15, 0, 1, TS);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, TS, 1);
    ctx.fillRect(0, 0, 1, TS);
    ctx.fillRect(0, 16, TS, 1);
    ctx.fillRect(16, 0, 1, TS);

  } else if (kind === 'wallTop') {
    // 岩の上面：ベース＋ごつごつした斑＋上に薄いハイライト
    const base = t.wallTop;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TS, TS);
    const d = shade(base, 0.82), l = shade(base, 1.16);
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const r = hash(x * 7 + 3, y * 11 + 5);
        if (r < 0.12) px(x, y, d);
        else if (r > 0.9) px(x, y, l);
      }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, TS, 2);

  } else if (kind === 'wallFace') {
    // 崖の壁面：レンガ状ブロック＋上端ハイライト＋下端の影
    const base = t.wallFace;
    const mortar = shade(base, 0.6);
    const blkHi = shade(base, 1.14);
    const blkLo = shade(base, 0.8);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TS, TS);
    // レンガ：高さ8、横は段ごとに半ブロックずらす
    const bh = 8, bw = 16;
    for (let y = 0; y < TS; y++) {
      const rowIdx = Math.floor(y / bh);
      const offset = (rowIdx % 2) * (bw / 2);
      for (let x = 0; x < TS; x++) {
        const bx = (x + offset) % bw;
        const localY = y % bh;
        if (localY === 0 || bx === 0) {
          px(x, y, mortar); // 目地
        } else if (localY === 1) {
          px(x, y, blkHi);  // ブロック上面のハイライト
        } else if (localY === bh - 1) {
          px(x, y, blkLo);  // ブロック下面の影
        } else {
          // 軽い斑
          if (hash(x * 13 + 7, y * 17 + 3) < 0.08) px(x, y, blkLo);
        }
      }
    }
    // 崖上端のフチ（明）と最下段の濃い影
    ctx.fillStyle = shade(base, 1.3);
    ctx.fillRect(0, 0, TS, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, TS - 2, TS, 2);
  }
  return canvas;
}

export function getTileTexture(themeIdx, kind) {
  const key = `${themeIdx}:${kind}`;
  if (!tileCache.has(key)) tileCache.set(key, buildTile(themeIdx, kind));
  return tileCache.get(key);
}
