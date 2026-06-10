// =============================================================
// main.js - エントリポイント（初期化・入力処理・ゲームループ）
// =============================================================
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const renderer = new Renderer(canvas, minimap);

let game = new Game();
let ui = new UI(game);

function draw() {
  renderer.render(game);
  ui.update();
  checkGameEnd();
}

function checkGameEnd() {
  const overlay = document.getElementById('overlay');
  if (game.over) {
    overlay.classList.remove('hidden');
    const title = document.getElementById('overlay-title');
    const sub = document.getElementById('overlay-sub');
    if (game.won) {
      title.textContent = 'ダンジョン制覇！';
      title.style.color = '#ffd54f';
      sub.textContent = `${game.floor - 1}F まで踏破 / ${game.turn}ターン / ${game.player.gold}ギャラ`;
    } else {
      title.textContent = 'GAME OVER';
      title.style.color = '#ef5350';
      sub.textContent = `${game.floor}F で力尽きた / Lv${game.player.level} / ${game.turn}ターン`;
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
  draw();
}

window.addEventListener('keydown', (e) => {
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
  let acted = false;

  if (MOVE_KEYS[key]) {
    const [dx, dy] = MOVE_KEYS[key];
    acted = game.tryMove(dx, dy);
    e.preventDefault();
  } else if (key === '.' || key === 'Clear' || key === '5') {
    acted = game.wait();            // 足踏み
  } else if (key === 'Enter' || key === '>') {
    acted = game.descend();         // 階段を降りる
  } else if (key === 'i' || key === 'Tab') {
    ui.toggleInventory();
    e.preventDefault();
  }

  if (acted || ui.invOpen) draw();
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
    // 使用・装備
    game.useItem(ui.invIndex);
    if (ui.invIndex >= game.player.inventory.length) ui.invIndex = Math.max(0, game.player.inventory.length - 1);
    // 装備系はメニューを開いたまま、消費系は閉じる
    e.preventDefault();
    draw();
  } else if (key === 't') {
    // 置く（捨てる）
    game.dropItem(ui.invIndex);
    if (ui.invIndex >= game.player.inventory.length) ui.invIndex = Math.max(0, game.player.inventory.length - 1);
    ui.renderInventory();
    e.preventDefault();
    draw();
  }
  draw();
}

// ---- タッチ操作（スマホ向け方向パッド） ----
function bindTouch() {
  document.querySelectorAll('[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (game.over) return;
      const [dx, dy] = btn.dataset.dir.split(',').map(Number);
      if (game.tryMove(dx, dy)) draw();
    });
  });
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('btn-wait',  () => { if (!game.over && game.wait()) draw(); });
  bind('btn-stairs',() => { if (!game.over && game.descend()) draw(); });
  bind('btn-inv',   () => { ui.toggleInventory(); draw(); });
  bind('overlay',   () => { if (game.over) restart(); });
}

// ---- 初期化 ----
function init() {
  renderer.resize();
  window.addEventListener('resize', () => { renderer.resize(); draw(); });
  bindTouch();
  draw();
  // デバッグ用フック（コンソールから状態を触れる）
  window.__DEBUG = { get game() { return game; }, draw };
}

init();
