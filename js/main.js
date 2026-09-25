// =============================================================
// main.js - エントリポイント（初期化・入力・ゲームループ・音）
// =============================================================
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { loadAtlas, getSpriteURL, getHeroSpriteURL } from './sprites.js';
import { VERSION, GAME_TITLE, GAME_SUBTITLE } from './version.js';

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const renderer = new Renderer(canvas, minimap);

let game = new Game();
let ui = new UI(game);
let ready = false;   // 画像素材の読み込みが終わったか
let started = false; // タイトル画面を抜けたか

// -------------------------------------------------------------
// 連続描画ループ（アニメ・エフェクト・効果音の消費を毎フレーム行う）
// -------------------------------------------------------------
function loop() {
  const now = Date.now();
  if (game.effects.length) {
    game.effects = game.effects.filter(e => now - e.start < e.ttl);
  }
  if (game.soundQueue.length) {
    const q = game.soundQueue.splice(0);
    for (const n of q) audio.play(n);
  }
  // 場面に合わせてBGMを切り替える
  if (!started) audio.setScene('title');
  else if (game.over) audio.setScene(null);
  else audio.setScene(game.bgmScene());

  if (ready) {
    renderer.render(game, now);
    ui.update();
  }
  checkGameEnd();
  requestAnimationFrame(loop);
}

function checkGameEnd() {
  const overlay = document.getElementById('overlay');
  if (!started || !game.over) {
    overlay.classList.add('hidden');
    return;
  }
  if (!overlay.classList.contains('hidden')) return;
  overlay.classList.remove('hidden');
  const title = document.getElementById('overlay-title');
  const sub = document.getElementById('overlay-sub');
  const detail = document.getElementById('overlay-detail');
  const p = game.player;
  const time = ui.fmtTime(game.elapsed);
  if (game.won) {
    title.textContent = '秘宝を手に入れた！';
    title.style.color = '#ffe24a';
    sub.textContent = `${p.name}は ${GAME_TITLE}を 制覇した！`;
    detail.textContent = `Lv${p.level} / ${game.turn}ターン / ${p.gold}ゴールド / ${time}`;
  } else {
    title.textContent = 'GAME OVER';
    title.style.color = '#ef5350';
    sub.textContent = `${game.floor}Fで ${game.deathCause || '力つきた'}`;
    detail.textContent = `Lv${p.level} / ${game.turn}ターン / ${p.gold}ゴールド / ${time}`;
  }
}

// 移動キーのマッピング（テンキー・矢印・vi風・WASD）
const MOVE_KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  '8': [0, -1], '2': [0, 1], '4': [-1, 0], '6': [1, 0],
  '7': [-1, -1], '9': [1, -1], '1': [-1, 1], '3': [1, 1],
};

// ゲームオーバー後はタイトルへ戻る（次のゲームを用意しておく）
function backToTitle() {
  started = false;
  game = new Game();
  ui.setGame(game);
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
}

// タイトル画面 → ゲーム開始
function startGame() {
  audio.start(); // 最初のユーザー操作で音を有効化
  if (started || !ready) return;
  started = true;
  document.getElementById('title').classList.add('hidden');
  // タイマー基準をリセット（タイトルで見ていた時間を除外）
  game.startTime = Date.now();
  game.enteredAt = Date.now();
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    audio.start();
    updateMuteIcon(audio.toggleMute());
    return;
  }

  // タイトル中は開始のみ
  if (!started) {
    if (e.key === 'Enter' || e.key === ' ') { startGame(); e.preventDefault(); }
    else audio.start();
    return;
  }

  // ゲームオーバー中はタイトルへ
  if (game.over) {
    if (e.key === 'Enter' || e.key === ' ') { backToTitle(); e.preventDefault(); }
    return;
  }

  // ウィンドウ（持ち物・ダイアログ）が開いているとき
  if (ui.blocking) {
    if (ui.handleKey(e)) e.preventDefault();
    return;
  }

  const key = e.key;
  if (MOVE_KEYS[key]) {
    const [dx, dy] = MOVE_KEYS[key];
    game.tryMove(dx, dy);
    e.preventDefault();
  } else if (key === '.' || key === 'Clear' || key === '5') {
    game.wait();                    // 足踏み
  } else if (key === 'Enter' || key === '>') {
    game.descend();                 // 階段を降りる
    e.preventDefault();
  } else if (key === 'i' || key === 'Tab') {
    ui.openInventory();
    e.preventDefault();
  }
});

function updateMuteIcon(muted) {
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

// ---- タッチ操作（スマホ向け方向パッド） ----
function bindTouch() {
  const canAct = () => started && !game.over && !ui.blocking;
  document.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!canAct()) return;
      const [dx, dy] = btn.dataset.dir.split(',').map(Number);
      game.tryMove(dx, dy);
    });
  });
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('btn-wait', () => { if (canAct()) game.wait(); });
  bind('btn-stairs', () => { if (canAct()) game.descend(); });
  bind('btn-inv', () => { if (started && !game.over && !game.request) ui.toggleInventory(); });
  bind('btn-mute', (e) => { e.stopPropagation(); audio.start(); updateMuteIcon(audio.toggleMute()); });
  bind('title', () => startGame());
  bind('overlay', () => { if (game.over) backToTitle(); });
}

// ---- タイトル画面の表示 ----
function buildTitle() {
  document.getElementById('title-logo').textContent = GAME_TITLE;
  document.getElementById('title-sub').textContent = GAME_SUBTITLE;
  document.getElementById('title-version').textContent = `Ver ${VERSION}`;
  document.getElementById('ver-badge').textContent = `Ver ${VERSION}`;
  document.title = `${GAME_TITLE} Ver ${VERSION} - ローグライクRPG`;
}

function buildTitleArt() {
  const art = document.getElementById('title-art');
  if (!art) return;
  art.innerHTML = '';
  const urls = [
    getSpriteURL('mon_slime'), getSpriteURL('mon_goblin'), getHeroSpriteURL(game.player),
    getSpriteURL('mon_skeleton'), getSpriteURL('mon_dragon'),
  ];
  for (const url of urls) {
    const img = new Image();
    img.src = url;
    art.appendChild(img);
  }
}

// ---- 初期化 ----
async function init() {
  buildTitle();
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  bindTouch();
  requestAnimationFrame(loop);
  const startLabel = document.getElementById('title-start');
  try {
    await loadAtlas();
    ready = true;
    buildTitleArt();
    startLabel.textContent = 'PRESS ENTER / TAP TO START';
  } catch (err) {
    startLabel.textContent = `エラー：${err.message}（ページを再読み込みしてください）`;
    console.error(err);
  }
  // デバッグ用フック
  window.__DEBUG = { get game() { return game; }, start: startGame, get ui() { return ui; } };
}

init();
