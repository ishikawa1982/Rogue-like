// =============================================================
// test/sim.js - ヘッドレス簡易シミュレーション（実行時エラー検出）
//   ブラウザ無しで game.js のロジックを多数ターン回して破綻がないか検証する。
//   後半は お店・モンスターハウス・ポット・リングなどの個別シナリオ。
// =============================================================
import { Game } from '../js/game.js';
import { createItem, displayName, isKnown } from '../js/items.js';
import { randInt, choice } from '../js/rng.js';
import { TILE, INVENTORY_MAX, MONSTERS, ITEMS } from '../js/data.js';
import { ATLAS, LOOKS } from '../js/atlas.js';
import { Monster } from '../js/entity.js';

let errors = 0;
const stats = { floors: 0, descents: 0, kills: 0, actions: 0, shops: 0, houses: 0, requests: 0, wins: 0, deaths: 0 };

function assert(cond, msg) {
  if (!cond) { console.error('  ✗ ' + msg); errors++; }
}

function checkInvariants(g, where = '') {
  const p = g.player;
  const at = where ? `[${where}] ` : '';
  assert(p.hp >= 0, `${at}HPが負`);
  assert(p.hp <= p.maxHp + 0.01, `${at}HP超過 ${p.hp}/${p.maxHp}`);
  assert(p.hunger >= 0 && p.hunger <= p.maxHunger, `${at}満腹度範囲外 ${p.hunger}/${p.maxHunger}`);
  assert(p.str >= 1 && p.str <= p.maxStr, `${at}ちから範囲外 ${p.str}/${p.maxStr}`);
  assert(p.gold >= 0, `${at}ゴールドが負`);
  assert(p.inventory.length <= INVENTORY_MAX, `${at}持ち物超過 ${p.inventory.length}`);
  assert(g.dungeon.isWalkable(p.x, p.y), `${at}プレイヤーが壁の中`);
  for (const eq of [p.weapon, p.shield, p.ring]) {
    if (eq) assert(p.inventory.includes(eq), `${at}装備品が持ち物にない ${eq.name}`);
  }
  const seen = new Set([`${p.x},${p.y}`]);
  for (const m of g.monsters) {
    if (m.special !== 'phase') {
      assert(g.dungeon.isWalkable(m.x, m.y), `${at}モンスター(${m.name})が壁の中 (${m.x},${m.y})`);
    } else {
      assert(g.dungeon.inBounds(m.x, m.y), `${at}ゴーストがマップ外`);
    }
    const k = `${m.x},${m.y}`;
    assert(!seen.has(k), `${at}モンスター(${m.name})が重なっている (${k})`);
    seen.add(k);
    assert(m.hp > 0, `${at}HP0のモンスターが残っている ${m.name}`);
  }
  // 未払いの商品を持っているのは、営業中のお店の中だけ
  if (p.inventory.some(i => i.unpaid)) {
    assert(g.shopOpen() && g.inShop(), `${at}お店の外で未払い品を持っている`);
  }
  for (const it of p.inventory) {
    if (it.type === 'pot') assert(it.contents.length <= it.size, `${at}ポットの容量超過`);
  }
  // 床のアイテムは1マス1つ・歩ける場所
  const gs = new Set();
  for (const gi of g.groundItems) {
    const k = `${gi.x},${gi.y}`;
    assert(!gs.has(k), `${at}床アイテムが重なっている (${k})`);
    gs.add(k);
    assert(g.dungeon.isWalkable(gi.x, gi.y), `${at}床アイテムが壁の中 (${k})`);
  }
}

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];

// 確認・選択にランダムに答える
function answerRequest(g) {
  const r = g.request;
  if (!r) return;
  stats.requests++;
  if (r.kind === 'confirm') g.resolveRequest(randInt(0, r.options.length - 1));
  else g.resolveRequest(randInt(0, 3) === 0 ? null : choice(r.items));
}

// ---------------------------------------------------------------
// 1) 自動プレイ（階段へ向かいつつ、ランダムにアイテムを使う）
// ---------------------------------------------------------------
// 階段への最短経路の1歩目（BFS）。敵がいるマスは通れない扱い
function stepToward(g, tx, ty) {
  const d = g.dungeon;
  const p = g.player;
  const key = (x, y) => y * d.w + x;
  const prev = new Map([[key(p.x, p.y), null]]);
  const q = [[p.x, p.y]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!d.isWalkable(nx, ny) || prev.has(key(nx, ny))) continue;
      if (g.diagonalBlocked(x, y, dx, dy)) continue;
      prev.set(key(nx, ny), [x, y]);
      q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  let cur = [tx, ty];
  while (true) {
    const pr = prev.get(key(cur[0], cur[1]));
    if (!pr || (pr[0] === p.x && pr[1] === p.y)) break;
    cur = pr;
  }
  return [cur[0] - p.x, cur[1] - p.y];
}

let lastDungeon = null;
for (let run = 0; run < 60; run++) {
  const g = new Game();
  for (let t = 0; t < 1500 && !g.over; t++) {
    if (g.dungeon !== lastDungeon) {
      lastDungeon = g.dungeon;
      stats.floors++;
      if (g.shop) stats.shops++;
      if (g.house) stats.houses++;
    }
    if (g.request) { answerRequest(g); checkInvariants(g, 'request'); continue; }

    const p = g.player;
    if (p.x === g.dungeon.stairs.x && p.y === g.dungeon.stairs.y) {
      const f = g.floor;
      g.descend();
      if (g.floor > f) stats.descents++;
      checkInvariants(g, 'descend');
      continue;
    }

    // ときどきアイテムのメニュー行動をランダムに実行
    if (p.inventory.length > 0 && randInt(0, 14) === 0) {
      const item = choice(p.inventory);
      const act = choice(g.itemActions(item));
      g.doItemAction(item, act.id);
      stats.actions++;
      checkInvariants(g, `action:${act.id}`);
      continue;
    }

    // 隣の敵を攻撃 → 階段へ → ランダム
    const adj = g.monsters.find(m => !m.peaceful && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) === 1);
    let dir = adj ? [Math.sign(adj.x - p.x), Math.sign(adj.y - p.y)] : null;
    if (!dir && randInt(0, 4) > 0) dir = stepToward(g, g.dungeon.stairs.x, g.dungeon.stairs.y);
    if (!dir) dir = DIRS[randInt(0, 7)];
    const before = g.monsters.length;
    const moved = g.tryMove(dir[0], dir[1]);
    if (!moved && !g.request) g.wait();
    if (g.monsters.length < before) stats.kills += before - g.monsters.length;
    checkInvariants(g, 'move');
  }
  if (g.won) stats.wins++;
  if (g.over && !g.won) stats.deaths++;
}

// ---------------------------------------------------------------
// 2) 個別シナリオ
// ---------------------------------------------------------------
// 指定条件のフロアになるまで作り直す
function gameWith(pred, floor = 5) {
  for (let i = 0; i < 400; i++) {
    const g = new Game();
    g.floor = floor;
    g.buildFloor();
    if (pred(g)) return g;
  }
  throw new Error('条件に合うフロアを作れませんでした');
}

function clearMonsters(g, keepKeeper = true) {
  g.monsters = g.monsters.filter(m => keepKeeper && m.peaceful);
}

// お店：買い物・支払い
{
  const g = gameWith(g => !!g.shop);
  clearMonsters(g);
  const shopItem = g.groundItems.find(x => x.shop);
  g.warpTo(g.player, shopItem.x, shopItem.y);
  g.player.gold = 99999;
  g.pickupHere();
  const item = g.player.inventory[g.player.inventory.length - 1];
  assert(item.unpaid === true, 'お店の商品を拾うと未払いになる');
  g.askPayment();
  assert(g.request && g.request.kind === 'confirm', '支払いの確認が出る');
  const goldBefore = g.player.gold;
  g.resolveRequest(0);
  assert(!item.unpaid, '支払うと未払いが消える');
  assert(g.player.gold < goldBefore, '支払うとゴールドが減る');
  checkInvariants(g, 'shop-pay');
}

// お店：未払いのまま出ようとすると呼び止められる
{
  const g = gameWith(g => !!g.shop && g.dungeon.entrances(g.shop.room).length > 0);
  clearMonsters(g);
  const ent = g.dungeon.entrances(g.shop.room).find(e => !g.monsterAt(e.x, e.y));
  if (ent) {
    const shopItem = g.groundItems.find(x => x.shop);
    const it = shopItem.item;
    g.groundItems.splice(g.groundItems.indexOf(shopItem), 1);
    it.unpaid = true;
    g.player.inventory.push(it);
    g.warpTo(g.player, ent.x, ent.y);
    const moved = g.tryMove(ent.ox - ent.x, ent.oy - ent.y);
    assert(!moved && g.inShop(), '未払いだとお店から出られない');
    assert(g.request && g.request.kind === 'confirm', '呼び止められて支払い確認が出る');
    g.resolveRequest(1);
    checkInvariants(g, 'shop-block');
  }
}

// お店：テレポートで泥棒すると店主が怒る
{
  const g = gameWith(g => !!g.shop);
  clearMonsters(g);
  const shopItem = g.groundItems.find(x => x.shop);
  g.warpTo(g.player, shopItem.x, shopItem.y);
  g.pickupHere();
  const stolen = g.player.inventory[g.player.inventory.length - 1];
  const scroll = createItem('s_teleport');
  g.player.inventory.push(scroll);
  g.doItemAction(scroll, 'use');
  assert(!g.inShop(), 'テレポートでお店の外に出る');
  assert(g.shop.angry && !g.shop.keeper.peaceful, '泥棒すると店主が怒る');
  assert(!stolen.unpaid, '盗んだ商品は自分の物になる');
  assert(g.bgmScene() === 'danger', '泥棒後は危険BGM');
  const k = g.shop.keeper;
  const dist = () => Math.max(Math.abs(k.x - g.player.x), Math.abs(k.y - g.player.y));
  const d0 = dist();
  g.player.hp = g.player.maxHp = 99999;
  for (let i = 0; i < 3; i++) g.wait();
  assert(dist() < d0 || dist() === 1, `怒った店主が追いかけてくる (${d0}→${dist()})`);
  checkInvariants(g, 'shop-theft');
}

// お店：売却
{
  const g = gameWith(g => !!g.shop);
  clearMonsters(g);
  const d = g.dungeon;
  const r = g.shop.room;
  let spot = null;
  for (let y = r.y; y < r.y + r.h && !spot; y++) {
    for (let x = r.x; x < r.x + r.w && !spot; x++) {
      if (d.get(x, y) === TILE.FLOOR && !g.monsterAt(x, y) && !g.groundItems.some(gi => gi.x === x && gi.y === y)) spot = { x, y };
    }
  }
  if (spot) {
    g.warpTo(g.player, spot.x, spot.y);
    const sword = createItem('greatsword');
    g.player.inventory.push(sword);
    const goldBefore = g.player.gold;
    g.doItemAction(sword, 'drop');
    assert(g.request && g.request.kind === 'confirm', 'お店で置くと売却の確認が出る');
    g.resolveRequest(0);
    assert(g.player.gold > goldBefore, '売るとゴールドが増える');
    const entry = g.groundItems.find(gi => gi.item === sword);
    assert(entry && entry.shop, '売った物はお店の商品になる');
    checkInvariants(g, 'shop-sell');
  }
}

// モンスターハウス：入ると目覚める
{
  const g = gameWith(g => !!g.house, 6);
  const room = g.house.room;
  const sleepers = g.monsters.filter(m => m.inHouse);
  assert(sleepers.length >= 6, `モンスターハウスに敵が6体以上いる (${sleepers.length})`);
  assert(sleepers.every(m => m.asleep), 'モンスターハウスの敵は眠っている');
  // 部屋の空いている床にワープして1ターン
  let spot = null;
  for (let y = room.y; y < room.y + room.h && !spot; y++) {
    for (let x = room.x; x < room.x + room.w && !spot; x++) {
      if (g.dungeon.isWalkable(x, y) && !g.monsterAt(x, y)) spot = { x, y };
    }
  }
  g.player.hp = g.player.maxHp = 9999;
  g.warpTo(g.player, spot.x, spot.y);
  g.wait();
  assert(g.house.triggered, 'モンスターハウスが発動する');
  assert(g.monsters.filter(m => m.inHouse).every(m => !m.asleep), '全員目覚める');
  assert(g.bgmScene() === 'danger', 'モンスターハウス中は危険BGM');
  checkInvariants(g, 'house');
}

// ポット：アナライズ（識別）・チェンジ（変化）・割る
{
  const g = new Game();
  clearMonsters(g, false);
  const pot = createItem('pot_analyze');
  const potion = createItem('p_life');
  g.player.inventory.push(pot, potion);
  assert(!isKnown(potion), 'ライフポーションは最初は未識別');
  g.doItemAction(pot, 'insert');
  assert(g.request && g.request.kind === 'pick', '入れる物を選ぶ');
  g.resolveRequest(potion);
  assert(isKnown(potion), 'アナライズポットに入れると識別される');
  assert(isKnown(pot), 'ポット自体も識別される');
  assert(pot.contents.length === 1 && !g.player.inventory.includes(potion), '中身が1つ入る');

  const cpot = createItem('pot_change');
  const bread = createItem('bread');
  g.player.inventory.push(cpot, bread);
  g.doItemAction(cpot, 'insert');
  g.resolveRequest(bread);
  assert(cpot.contents.length === 1 && cpot.contents[0] !== bread, 'チェンジポットに入れると別の物になる');
  assert(cpot.contents[0].type !== 'pot', 'チェンジポットからポットは出ない');

  const groundBefore = g.groundItems.length;
  g.doItemAction(pot, 'break');
  assert(!g.player.inventory.includes(pot), '割るとポットがなくなる');
  assert(g.groundItems.length === groundBefore + 1, '割ると中身が床に出る');
  checkInvariants(g, 'pot');
}

// ポット：容量いっぱい・装備中は入れられない
{
  const g = new Game();
  const pot = createItem('pot_analyze', { size: 1 });
  pot.contents = [createItem('apple')];
  g.player.inventory.push(pot);
  g.doItemAction(pot, 'insert');
  assert(!g.request, '容量いっぱいなら選択は出ない');
  const pot2 = createItem('pot_analyze');
  g.player.inventory.push(pot2);
  g.doItemAction(pot2, 'insert');
  assert(g.request && !g.request.items.includes(g.player.weapon), '装備中の武器は入れられない');
  g.resolveRequest(null);
}

// リング：スタミナ（満腹度が減らない）・ヒール（回復が速い）
{
  const g = new Game();
  clearMonsters(g, false);
  const ring = createItem('r_stamina');
  g.player.inventory.push(ring);
  g.doItemAction(ring, 'equip');
  assert(g.player.ring === ring && isKnown(ring), 'リングを装備すると識別される');
  const h = g.player.hunger;
  for (let i = 0; i < 100; i++) g.wait();
  assert(g.player.hunger === h, 'スタミナリングで満腹度が減らない');

  const g2 = new Game();
  clearMonsters(g2, false);
  const heal = createItem('r_heal');
  g2.player.inventory.push(heal);
  g2.doItemAction(heal, 'equip');
  g2.player.hp = 1;
  for (let i = 0; i < 20; i++) g2.wait();
  const g3 = new Game();
  clearMonsters(g3, false);
  g3.player.hp = 1;
  for (let i = 0; i < 20; i++) g3.wait();
  assert(g2.player.hp > g3.player.hp, 'ヒールリングでHP回復が速い');
}

// 識別：同じ種類は1つわかると全部わかる
{
  const g = new Game();
  clearMonsters(g, false);
  const a = createItem('s_map');
  const b = createItem('s_map');
  g.player.inventory.push(a, b);
  const unknownName = displayName(b);
  g.doItemAction(a, 'use');
  assert(isKnown(b) && displayName(b) !== unknownName, '読んだ巻物と同じ種類は識別される');
  assert(g.mapRevealed, 'マップスクロールで地図がわかる');
}

// ゴブリンシーフ：盗んで逃げ、倒すと取り返せる
{
  const g = new Game();
  clearMonsters(g, false);
  const def = MONSTERS.find(m => m.id === 'goblin');
  let ok = false;
  for (let i = 0; i < 50 && !ok; i++) {
    const thief = new Monster(def, g.player.x + 1, g.player.y);
    if (!g.dungeon.isWalkable(thief.x, thief.y)) { thief.x = g.player.x - 1; }
    if (!g.dungeon.isWalkable(thief.x, thief.y)) break;
    g.monsters = [thief];
    g.player.gold = 500;
    if (g.trySteal(thief)) {
      ok = true;
      assert(thief.fleeing, '盗んだら逃げる');
      assert(thief.stolen || thief.stolenGold > 0, '何かを盗んでいる');
      const groundBefore = g.groundItems.length;
      g.damageMonster(thief, 999);
      assert(g.groundItems.length > groundBefore, '倒すと盗まれた物を落とす');
    }
  }
  assert(ok, 'ゴブリンシーフが盗みを行う');
  checkInvariants(g, 'thief');
}

// 素材：データが参照するアトラスのキーがすべてある
{
  for (const m of MONSTERS) assert(m.sprite in ATLAS, `モンスターの絵がない ${m.sprite}`);
  for (const it of ITEMS) {
    if (it.sprite) assert(it.sprite in ATLAS, `アイテムの絵がない ${it.sprite}`);
    if (it.doll) assert(it.doll in ATLAS, `装備の重ね絵がない ${it.doll}`);
    if (it.icon) assert(it.icon in ATLAS, `識別アイコンがない ${it.icon}`);
  }
  for (const [type, looks] of Object.entries(LOOKS)) {
    for (const l of looks) assert(`${type}_${l}` in ATLAS, `見た目の絵がない ${type}_${l}`);
    const kinds = ITEMS.filter(i => i.type === type).length;
    assert(looks.length >= kinds, `${type}の見た目が種類数より少ない`);
  }
  for (let t = 0; t < 4; t++) {
    for (let v = 0; v < 4; v++) {
      assert(`floor${t}_${v}` in ATLAS && `wall${t}_${v}` in ATLAS, `床・壁タイルがない theme${t}`);
    }
  }
}

console.log('--- シミュレーション結果 ---');
console.log(`フロア踏破回数   : ${stats.descents}`);
console.log(`撃破モンスター   : ${stats.kills}`);
console.log(`アイテム行動     : ${stats.actions}`);
console.log(`確認・選択の応答 : ${stats.requests}`);
console.log(`お店の出現       : ${stats.shops} / ${stats.floors}フロア`);
console.log(`モンスターハウス : ${stats.houses} / ${stats.floors}フロア`);
console.log(`クリア / 死亡    : ${stats.wins} / ${stats.deaths}`);
console.log(`検出エラー       : ${errors}`);

if (errors > 0) {
  console.error('\n❌ 不変条件の違反あり');
  process.exit(1);
} else {
  console.log('\n✅ 全シミュレーション正常終了（実行時エラー・不変条件違反なし）');
}
