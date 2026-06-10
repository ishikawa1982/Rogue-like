// =============================================================
// main.js - エントリポイント（初期化・入力・ゲームループ・音）
// =============================================================
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { getSprite } from './sprites.js';

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const renderer = new Renderer(canvas, minimap);

let game = new Game();
let ui = new UI(game);
let started = false; // タイトル画面を抜けたか

// -------------------------------------------------------------
// 連続描画ループ（アニメ・エフェクト・効果音の消費を毎フレーム行う）
// -------------------------------------------------------------
function loop() {
  const now = Date.now();
  // 期限切れエフェクトを掃除
  if (game.effects.length) {
    game.effects = game.effects.filter(e => now - e.start < e.ttl);
  }
  // 効果音キューを消費して再生
  if (game.soundQueue.length) {
    const q = game.soundQueue.splice(0);
    for (const n of q) audio.play(n);
  }
  renderer.render(game, now);
  ui.update();
  checkGameEnd();
  requestAnimationFrame(loop);
}

function checkGameEnd() {
  const overlay = document.getElementById('overlay');
  if (game.over) {
    overlay.classList.remove('hidden');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    if (game.won) {
      title.textContent = 'ダンジョン制覇！';
      title.style.color = '#ffe24a';
      sub.textContent = `${game.floor - 1}F まで踏破 / ${game.turn}ターン / ${game.player.gold}ドル`;
    } else {
      title.textContent = 'GAME OVER';
      title.style.color = '#ef5350';
      sub.textContent = `${game.floor}F で力つきた / Lv${game.player.level} / ${game.turn}ターン`;
    }
  } else {
    overlay.classList.add('hidden');
  }
}

// 移動キーのマッピング（テンキー・矢印・vi風・WASD）
const MOVE_KEYS = {
  ArrowUp:    [0, -1], ArrowDown:  [0, 1], ArrowLeft:  [-1, 0], ArrowRight: [1, 0],
  k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0],
  y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  '8': [0, -1], '2': [0, 1], '4': [-1, 0], '6': [1, 0],
  '7': [-1, -1], '9': [1, -1], '1': [-1, 1], '3': [1, 1],
};

function restart() {
  game = new Game();
  ui = new UI(game);
  document.getElementById('overlay').classList.add('hidden');
}

// タイトル画面 → ゲーム開始
function startGame() {
  if (started) return;
  started = true;
  document.getElementById('title').classList.add('hidden');
  audio.start(); // 最初のユーザー操作で音を有効化
  // タイマー基準をリセット（タイトルで見ていた時間を除外）
  game.startTime = Date.now();
}

window.addEventListener('keydown', (e) => {
  // タイトル中は開始のみ
  if (!started) {
    if (e.key === 'Enter' || e.key === ' ') { startGame(); e.preventDefault(); }
    return;
  }

  // ミュート切り替え
  if (e.key === 'm' || e.key === 'M') {
    updateMuteIcon(audio.toggleMute());
    return;
  }

  // ゲームオーバー中はリスタートのみ
  if (game.over) {
    if (e.key === 'Enter' || e.key === ' ') { restart(); e.preventDefault(); }
    return;
  }

  // 持ち物メニューが開いているとき
  if (ui.invOpen) {
    handleInventoryKey(e);
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
  } else if (key === 'i' || key === 'Tab') {
    ui.toggleInventory();
    e.preventDefault();
  }
});

function handleInventoryKey(e) {
  const key = e.key;
  if (key === 'i' || key === 'Escape' || key === 'Tab') {
    ui.closeInventory();
    e.preventDefault();
  } else if (key === 'ArrowUp' || key === 'k' || key === 'w') {
    ui.moveCursor(-1);
    e.preventDefault();
  } else if (key === 'ArrowDown' || key === 'j' || key === 's') {
    ui.moveCursor(1);
    e.preventDefault();
  } else if (key === 'Enter' || key === ' ') {
    game.useItem(ui.invIndex);
    if (ui.invIndex >= game.player.inventory.length) ui.invIndex = Math.max(0, game.player.inventory.length - 1);
    e.preventDefault();
  } else if (key === 't') {
    game.dropItem(ui.invIndex);
    if (ui.invIndex >= game.player.inventory.length) ui.invIndex = Math.max(0, game.player.inventory.length - 1);
    e.preventDefault();
  }
}

function updateMuteIcon(muted) {
  const btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
}

// ---- タッチ操作（スマホ向け方向パッド） ----
function bindTouch() {
  document.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!started || game.over) return;
      const [dx, dy] = btn.dataset.dir.split(',').map(Number);
      game.tryMove(dx, dy);
    });
  });
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('btn-wait',  () => { if (started && !game.over) game.wait(); });
  bind('btn-stairs',() => { if (started && !game.over) game.descend(); });
  bind('btn-inv',   () => { if (started) ui.toggleInventory(); });
  bind('btn-mute',  () => { audio.start(); updateMuteIcon(audio.toggleMute()); });
  // タイトル / ゲームオーバーをタップ
  bind('title',     () => startGame());
  bind('overlay',   () => { if (game.over) restart(); });
}

// ---- タイトルの飾りスプライトを生成 ----
function buildTitleArt() {
  const art = document.getElementById('title-art');
  if (!art) return;
  const keys = ['kinoko', 'player', 'jelly', 'alien'];
  for (const k of keys) {
    const img = new Image();
    img.src = getSprite(k).toDataURL();
    art.appendChild(img);
  }
}

// ---- 初期化 ----
function init() {
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  bindTouch();
  buildTitleArt();
  requestAnimationFrame(loop);
  // デバッグ用フック
  window.__DEBUG = { get game() { return game; }, start: startGame };
}

init();
