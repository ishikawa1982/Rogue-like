// =============================================================
// test/sim.js - ヘッドレス簡易シミュレーション（実行時エラー検出）
//   ブラウザ無しでgame.jsのロジックを多数ターン回して破綻がないか検証する。
// =============================================================
import { Game } from '../js/game.js';
import { randInt } from '../js/rng.js';
import { displayName } from '../js/items.js';

let errors = 0;
let descents = 0;
let kills = 0;
let itemsUsed = 0;
const startMsgs = new Set();

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); errors++; }
}

function checkInvariants(g) {
  assert(g.player.hp >= 0, 'HPが負');
  assert(g.player.hp <= g.player.maxHp + 0.01, `HP超過 ${g.player.hp}/${g.player.maxHp}`);
  assert(g.player.hunger >= 0 && g.player.hunger <= g.player.maxHunger, '満腹度範囲外');
  assert(g.dungeon.isWalkable(g.player.x, g.player.y), 'プレイヤーが壁の中');
  for (const m of g.monsters) {
    assert(g.dungeon.isWalkable(m.x, m.y), `モンスター(${m.name})が壁の中 (${m.x},${m.y})`);
  }
}

const DIRS = [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];

// 複数回ゲームを走らせる
for (let run = 0; run < 30; run++) {
  const g = new Game();
  let killBefore = 0;

  for (let t = 0; t < 400 && !g.over; t++) {
    const before = g.monsters.length;

    // 階段の上なら降りる
    if (g.player.x === g.dungeon.stairs.x && g.player.y === g.dungeon.stairs.y) {
      const f = g.floor; g.descend();
      if (g.floor > f) descents++;
      continue;
    }

    // たまにアイテムを使う
    if (g.player.inventory.length > 0 && randInt(0, 12) === 0) {
      g.useItem(randInt(0, g.player.inventory.length - 1));
      itemsUsed++;
      checkInvariants(g);
      continue;
    }

    // 階段方向 or ランダムに移動
    let dx, dy;
    if (randInt(0, 2) === 0) {
      dx = Math.sign(g.dungeon.stairs.x - g.player.x);
      dy = Math.sign(g.dungeon.stairs.y - g.player.y);
      if (dx === 0 && dy === 0) { const d = DIRS[randInt(0, 7)]; dx = d[0]; dy = d[1]; }
    } else {
      const d = DIRS[randInt(0, 7)];
      dx = d[0]; dy = d[1];
    }
    const moved = g.tryMove(dx, dy);
    if (!moved) g.wait();

    if (g.monsters.length < before) kills += (before - g.monsters.length);
    checkInvariants(g);
  }
  g.messages.slice(0, 1).forEach(m => startMsgs.add(m));
}

console.log('--- シミュレーション結果 ---');
console.log(`フロア踏破回数 : ${descents}`);
console.log(`撃破モンスター : ${kills}`);
console.log(`使用アイテム   : ${itemsUsed}`);
console.log(`検出エラー     : ${errors}`);

if (errors > 0) {
  console.error('\n❌ 不変条件の違反あり');
  process.exit(1);
} else {
  console.log('\n✅ 全シミュレーション正常終了（実行時エラー・不変条件違反なし）');
}
