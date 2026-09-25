// =============================================================
// game.js - ゲーム本体（状態管理・ターン処理・戦闘・AI・お店など）
//   DOM・音に依存しない。画面や音への要求はデータとして積むだけで、
//   描画・再生は main.js / renderer.js / ui.js が行う。
//
//   プレイヤーへの確認・選択は this.request に積む：
//     { kind: 'confirm', text, options: ['はい','いいえ'], resolve(index) }
//     { kind: 'pick', text, items: [...], resolve(item | null) }
//   UIが答えを受け取ったら resolveRequest() を呼ぶ。
// =============================================================
import { Dungeon } from './dungeon.js';
import { Player, spawnMonster, createShopkeeper } from './entity.js';
import {
  TILE, ITEM_TYPE, AREAS, areaIndexForFloor,
  SHOP_CHANCE, MH_CHANCE, MH_MIN_FLOOR, MAX_FLOOR, INVENTORY_MAX,
} from './data.js';
import {
  randomItem, createItem, displayName, describe, identifyKind, isKnown,
  resetKnowledge, itemPrice, sellPrice,
} from './items.js';
import { randInt, choice, chance, shuffle } from './rng.js';
import { GAME_TITLE } from './version.js';

const VISION_RADIUS = 1; // 通路での視界（部屋は全体可視）
const DIRS8 = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    resetKnowledge();
    this.floor = 1;
    this.turn = 0;
    this.startTime = Date.now();
    this.elapsed = 0;
    this.messages = [];
    this.over = false;
    this.won = false;
    this.maxFloor = MAX_FLOOR;
    this.deathCause = '';
    this.request = null;   // プレイヤーへの確認・選択

    // 演出用（描画/音はmain側が消費する。game自体はDOM/音に非依存）
    this.effects = [];     // 視覚エフェクト {type,x,y,start,ttl,...}
    this.soundQueue = [];  // 効果音名のキュー
    this.shake = null;     // 画面ゆれ {start,mag,ttl}
    this.flash = null;     // 画面フラッシュ {start,ttl,color,alpha}
    this.enteredAt = 0;    // フロア進入時刻（アイリスワイプ用）

    this.player = new Player(0, 0);
    // 初期装備とアイテム
    const sword = createItem('shortsword');
    const shield = createItem('buckler');
    const potion = createItem('p_heal');
    identifyKind(potion.id); // 最初から持っている薬はわかっている
    this.player.weapon = sword;
    this.player.shield = shield;
    this.player.inventory.push(sword, shield, potion, createItem('bread'));

    this.buildFloor();
    this.log(`${this.player.name}は ${GAME_TITLE}に 足をふみいれた。`);
    this.log(`〜${AREAS[0].name}〜 ${this.floor}F`);
  }

  // -----------------------------------------------------------
  // フロア構築
  // -----------------------------------------------------------
  buildFloor() {
    this.dungeon = new Dungeon();
    const d = this.dungeon;
    this.monsters = [];
    this.groundItems = [];
    this.visible = this.makeBoolMap();   // 現在見えている
    this.explored = this.makeBoolMap();  // 一度でも見た
    this.shop = null;
    this.house = null;
    this.mapRevealed = false;
    this.wasInShop = false;

    // 部屋の役割決め（階段の部屋にはお店を作らない）
    const stairsRoom = d.roomAt(d.stairs.x, d.stairs.y);
    let free = d.rooms.filter(r => r !== stairsRoom);

    if (chance(SHOP_CHANCE)) {
      const cands = shuffle(free.filter(r => r.w >= 4 && r.h >= 4 && d.entrances(r).length > 0));
      if (cands.length && free.length >= 2) {
        this.setupShop(cands[0]);
        free = free.filter(r => r !== cands[0]);
      }
    }

    // プレイヤー配置（お店・階段の部屋以外）
    const startRoom = choice(free.length ? free : d.rooms);
    const start = d.randomFloor([d.stairs], { rooms: [startRoom] });
    this.player.x = start.x;
    this.player.y = start.y;
    this.player.fromX = start.x; // 前フロアからの移動補間を打ち切る
    this.player.fromY = start.y;

    // モンスターハウス（スタートとお店の部屋以外）
    if (this.floor >= MH_MIN_FLOOR && chance(MH_CHANCE)) {
      const cands = d.rooms.filter(r => r !== startRoom && (!this.shop || r !== this.shop.room));
      if (cands.length) this.setupHouse(choice(cands));
    }

    const avoidRooms = [];
    if (this.shop) avoidRooms.push(this.shop.room);
    if (this.house) avoidRooms.push(this.house.room);

    // モンスター配置
    const monCount = 4 + Math.floor(this.floor * 0.8);
    for (let i = 0; i < monCount; i++) {
      const pos = d.randomFloor([this.player, d.stairs, ...this.monsters], { avoidRooms });
      if (this.monsterAt(pos.x, pos.y) || (pos.x === this.player.x && pos.y === this.player.y)) continue;
      this.monsters.push(spawnMonster(this.floor, pos.x, pos.y));
    }

    // 床落ちアイテム配置
    const itemCount = 3 + randInt(0, 3);
    for (let i = 0; i < itemCount; i++) {
      const pos = d.randomFloor([this.player, d.stairs, ...this.groundItems], { avoidRooms });
      if (!this.itemAt(pos.x, pos.y)) this.groundItems.push({ x: pos.x, y: pos.y, item: randomItem(this.floor) });
    }
    // 落ちているゴールド
    const goldCount = randInt(1, 3);
    for (let i = 0; i < goldCount; i++) {
      const pos = d.randomFloor([this.player, d.stairs, ...this.groundItems], { avoidRooms });
      if (!this.itemAt(pos.x, pos.y)) this.groundItems.push({ x: pos.x, y: pos.y, gold: this.randomGold() });
    }

    this.updateVisibility();
    this.checkShopEntry();
    this.enteredAt = Date.now(); // 描画側がアイリスワイプを掛ける
  }

  randomGold() {
    return randInt(20, 50 + this.floor * 20);
  }

  itemAt(x, y) {
    return this.groundItems.find(g => g.x === x && g.y === y) || null;
  }

  makeBoolMap() {
    return Array.from({ length: this.dungeon ? this.dungeon.h : 36 }, () =>
      Array.from({ length: this.dungeon ? this.dungeon.w : 48 }, () => false)
    );
  }

  // ---- お店 ----
  setupShop(room) {
    const d = this.dungeon;
    const ent = choice(d.entrances(room));
    // 店主は入口のとなり（部屋の中）に立つ。入口そのものはふさがない
    let post = null;
    for (const [dx, dy] of shuffle(DIRS8)) {
      const x = ent.x + dx, y = ent.y + dy;
      if (!d.inRoom(room, x, y) || d.get(x, y) !== TILE.FLOOR) continue;
      if (x === ent.x && y === ent.y) continue;
      post = { x, y };
      break;
    }
    if (!post) post = { x: room.cx, y: room.cy };
    const keeper = createShopkeeper(post.x, post.y);
    keeper.post = post;
    this.monsters.push(keeper);

    // 商品は部屋の内側（ふちを除く）に並べる
    const spots = [];
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        if (d.get(x, y) !== TILE.FLOOR) continue;
        if (x === post.x && y === post.y) continue;
        spots.push({ x, y });
      }
    }
    const count = Math.min(spots.length, randInt(6, 12));
    for (const s of shuffle(spots).slice(0, count)) {
      this.groundItems.push({ x: s.x, y: s.y, item: randomItem(this.floor), shop: true });
    }
    this.shop = { room, keeper, angry: false };
    d.shopRoom = room;
  }

  // 店主が普通に商売している状態か
  shopOpen() {
    return !!(this.shop && !this.shop.angry && this.shop.keeper.hp > 0 && this.monsters.includes(this.shop.keeper));
  }

  inShop(x = this.player.x, y = this.player.y) {
    return !!this.shop && this.dungeon.inRoom(this.shop.room, x, y);
  }

  unpaidItems() {
    return this.player.inventory.filter(i => i.unpaid);
  }

  checkShopEntry() {
    const inside = this.inShop();
    if (inside && !this.wasInShop && this.shopOpen()) {
      this.log('店主「いらっしゃいませ！ 商品の上に乗ると 拾えますよ。」');
      this.log('店主「売りたい物は 床に置いてくださいな。」');
      this.sfx('talk');
    }
    this.wasInShop = inside;
  }

  askPayment() {
    const items = this.unpaidItems();
    const total = items.reduce((s, i) => s + itemPrice(i), 0);
    this.sfx('talk');
    this.request = {
      kind: 'confirm',
      text: `店主「${items.length}点で 合計 ${total}ゴールド に なります。お買い上げですか？」`,
      options: ['はい', 'いいえ'],
      resolve: (i) => {
        if (i !== 0) {
          this.log('店主「では 商品を 置いていってくださいな。」');
          return;
        }
        if (this.player.gold < total) {
          this.log('店主「おや、お金が たりないようですね…」');
          return;
        }
        this.player.gold -= total;
        items.forEach(it => { delete it.unpaid; });
        this.log(`${total}ゴールド はらった。店主「まいどあり！」`);
        this.sfx('buy');
      },
    };
  }

  talkToKeeper() {
    if (this.unpaidItems().length) {
      this.askPayment();
    } else {
      this.log('店主「いらっしゃいませ！ ゆっくり 見ていってくださいな。」');
      this.sfx('talk');
    }
  }

  // 代金を払わずにお店の外に出たら泥棒
  checkTheft() {
    if (!this.shopOpen() || this.inShop()) return;
    const unpaid = this.unpaidItems();
    if (!unpaid.length) return;
    unpaid.forEach(it => { delete it.unpaid; });
    const k = this.shop.keeper;
    this.shop.angry = true;
    k.peaceful = false;
    k.energy = 0;
    this.log('店主「どろぼうーっ！！ まちなさーい！」');
    this.addFlash('#ff2020', 0.25, 400);
    this.addShake(6, 400);
    this.sfx('alarm');
  }

  // ---- モンスターハウス ----
  setupHouse(room) {
    const d = this.dungeon;
    const count = Math.max(6, Math.min(6 + this.floor, Math.floor((room.w * room.h) / 4)));
    for (let i = 0; i < count; i++) {
      const pos = d.randomFloor([d.stairs, ...this.monsters], { rooms: [room] });
      if (this.monsterAt(pos.x, pos.y)) continue;
      const m = spawnMonster(this.floor, pos.x, pos.y);
      m.asleep = true;
      m.inHouse = true;
      this.monsters.push(m);
    }
    const itemCount = randInt(3, 6);
    for (let i = 0; i < itemCount; i++) {
      const pos = d.randomFloor([d.stairs, ...this.groundItems], { rooms: [room] });
      if (!this.itemAt(pos.x, pos.y)) this.groundItems.push({ x: pos.x, y: pos.y, item: randomItem(this.floor) });
    }
    for (let i = 0; i < randInt(2, 3); i++) {
      const pos = d.randomFloor([d.stairs, ...this.groundItems], { rooms: [room] });
      if (!this.itemAt(pos.x, pos.y)) this.groundItems.push({ x: pos.x, y: pos.y, gold: this.randomGold() });
    }
    this.house = { room, triggered: false };
    d.houseRoom = room;
  }

  checkHouse() {
    const h = this.house;
    if (!h || h.triggered) return;
    if (!this.dungeon.inRoom(h.room, this.player.x, this.player.y)) return;
    h.triggered = true;
    for (const m of this.monsters) {
      if (m.inHouse) { m.asleep = false; m.energy = 0; }
    }
    this.log('モンスターハウスだ！ 敵が いっせいに 目をさました！');
    this.addFlash('#ff4040', 0.22, 350);
    this.addShake(7, 450);
    this.sfx('alarm');
  }

  houseActive() {
    return !!(this.house && this.house.triggered && this.monsters.some(m => m.inHouse && m.hp > 0));
  }

  // BGMの場面（main.js が曲を切り替える）
  bgmScene() {
    if (this.shop && this.shop.angry && this.monsters.includes(this.shop.keeper)) return 'danger';
    if (this.houseActive()) return 'danger';
    if (this.shopOpen() && this.inShop()) return 'shop';
    return 'dungeon' + areaIndexForFloor(this.floor);
  }

  // -----------------------------------------------------------
  // 可視範囲の更新（部屋にいれば部屋全体＋壁、通路は周囲1マス）
  // -----------------------------------------------------------
  updateVisibility() {
    const d = this.dungeon;
    this.visible = this.makeBoolMap();

    const reveal = (x, y) => {
      if (!d.inBounds(x, y)) return;
      this.visible[y][x] = true;
      this.explored[y][x] = true;
    };

    const room = d.roomAt(this.player.x, this.player.y);
    if (room && d.isRoomFloor(this.player.x, this.player.y)) {
      for (let y = room.y - 1; y <= room.y + room.h; y++) {
        for (let x = room.x - 1; x <= room.x + room.w; x++) {
          reveal(x, y);
        }
      }
    } else {
      for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
        for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
          reveal(this.player.x + dx, this.player.y + dy);
        }
      }
    }
  }

  isVisible(x, y) {
    return !!(this.visible[y] && this.visible[y][x]);
  }

  // -----------------------------------------------------------
  // メッセージログ・演出ヘルパー
  // -----------------------------------------------------------
  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > 100) this.messages.shift();
  }

  addEffect(type, x, y, opts = {}) {
    this.effects.push({ type, x, y, start: Date.now(), ttl: opts.ttl ?? 600, ...opts });
    if (this.effects.length > 200) this.effects.splice(0, this.effects.length - 200);
  }

  sfx(name) {
    this.soundQueue.push(name);
    if (this.soundQueue.length > 64) this.soundQueue.shift();
  }

  addShake(mag, ttl = 280) {
    this.shake = { start: Date.now(), mag, ttl };
  }

  addFlash(color, alpha, ttl = 160) {
    this.flash = { color, alpha, start: Date.now(), ttl };
  }

  // 移動補間の起点を記録してから座標を更新する
  stepTo(e, nx, ny) {
    e.fromX = e.x;
    e.fromY = e.y;
    e.x = nx;
    e.y = ny;
  }

  // ワープ（補間させない）
  warpTo(e, nx, ny) {
    e.x = nx; e.y = ny;
    e.fromX = nx; e.fromY = ny;
  }

  // 横方向に動いたら向きを変える（右向きのとき絵を反転する）
  setDir(e, dx) {
    if (dx !== 0) e.facing = dx;
  }

  lunge(entity, target) {
    entity.attackAnim = {
      dx: Math.sign(target.x - entity.x),
      dy: Math.sign(target.y - entity.y),
      start: Date.now(),
    };
  }

  // -----------------------------------------------------------
  // 確認・選択（UIから答えが返ってくる）
  // -----------------------------------------------------------
  resolveRequest(value) {
    const r = this.request;
    if (!r) return;
    this.request = null;
    r.resolve(value);
  }

  // -----------------------------------------------------------
  // プレイヤーの行動入口。1ターン消費したらtrueを返す
  // -----------------------------------------------------------
  monsterAt(x, y) {
    return this.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
  }

  // 斜め移動で壁の角をすり抜けないか
  diagonalBlocked(x, y, dx, dy) {
    if (dx === 0 || dy === 0) return false;
    const d = this.dungeon;
    return !d.isWalkable(x + dx, y) && !d.isWalkable(x, y + dy);
  }

  busy() {
    return this.over || !!this.request;
  }

  tryMove(dx, dy) {
    if (this.busy()) return false;
    const p = this.player;
    this.setDir(p, dx);
    const nx = p.x + dx;
    const ny = p.y + dy;

    // 攻撃・会話
    const target = this.monsterAt(nx, ny);
    if (target && !this.diagonalBlocked(p.x, p.y, dx, dy)) {
      if (target.peaceful) {
        this.talkToKeeper();
        return false;
      }
      this.playerAttack(target);
      this.endPlayerTurn();
      return true;
    }

    // 移動判定（斜め移動時は壁の角をすり抜けない）
    if (!this.dungeon.isWalkable(nx, ny)) return false;
    if (this.diagonalBlocked(p.x, p.y, dx, dy)) return false;

    // 代金を払わずにお店から出ようとすると店主に呼び止められる
    if (this.shopOpen() && this.inShop() && !this.inShop(nx, ny) && this.unpaidItems().length) {
      this.log('店主「お客さん、お代が まだですよ。」');
      this.askPayment();
      return false;
    }

    this.stepTo(p, nx, ny);
    p.stepFrame ^= 1;
    p.movedAt = Date.now();
    this.addEffect('dust', p.fromX, p.fromY, { ttl: 320 });
    this.sfx('step');
    this.pickupHere();
    this.endPlayerTurn();
    return true;
  }

  // その場で足踏み（休む）
  wait() {
    if (this.busy()) return false;
    this.endPlayerTurn();
    return true;
  }

  // 階段を降りる
  descend() {
    if (this.busy()) return false;
    const p = this.player;
    if (p.x !== this.dungeon.stairs.x || p.y !== this.dungeon.stairs.y) {
      this.log('ここには 階段が ない。');
      return false;
    }
    const prevArea = areaIndexForFloor(this.floor);
    this.floor++;
    if (this.floor > this.maxFloor) {
      this.floor = this.maxFloor;
      this.won = true;
      this.over = true;
      this.sfx('win');
      this.log('迷宮の最深部で 伝説の秘宝『アルカナの宝珠』を 手に入れた！');
      return true;
    }
    this.sfx('stairs');
    this.buildFloor();
    const area = areaIndexForFloor(this.floor);
    if (area !== prevArea) this.log(`〜${AREAS[area].name}〜`);
    this.log(`${this.floor}F に おりた。`);
    return true;
  }

  // 足元のアイテムを拾う
  pickupHere() {
    const p = this.player;
    const idx = this.groundItems.findIndex(g => g.x === p.x && g.y === p.y);
    if (idx === -1) return;
    const g = this.groundItems[idx];
    if (g.gold !== undefined) {
      p.gold += g.gold;
      this.log(`${g.gold}ゴールド 拾った。`);
      this.sfx('coin');
      this.groundItems.splice(idx, 1);
      return;
    }
    if (p.inventory.length >= INVENTORY_MAX) {
      this.log(`${displayName(g.item)}の 上に のった。（持ち物が いっぱい）`);
      return;
    }
    p.inventory.push(g.item);
    this.groundItems.splice(idx, 1);
    if (g.shop && this.shopOpen()) {
      g.item.unpaid = true;
      this.log(`${displayName(g.item)}を 拾った。店主「そちらは ${itemPrice(g.item)}ゴールド です。」`);
    } else {
      this.log(`${displayName(g.item)}を 拾った。`);
    }
    this.sfx('pickup');
  }

  // 近くの空いている床にアイテム/ゴールドを置く（置けなければ false）
  placeNear(x, y, entry) {
    const d = this.dungeon;
    for (let r = 0; r <= 2; r++) {
      const spots = [];
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (!d.isWalkable(nx, ny) || d.get(nx, ny) === TILE.STAIRS) continue;
          if (this.groundItems.some(g => g.x === nx && g.y === ny)) continue;
          spots.push({ x: nx, y: ny });
        }
      }
      if (spots.length) {
        const s = choice(spots);
        this.groundItems.push({ ...entry, x: s.x, y: s.y });
        return true;
      }
    }
    return false;
  }

  // -----------------------------------------------------------
  // 戦闘
  // -----------------------------------------------------------
  calcDamage(atk, def) {
    // 基本ダメージにランダム幅（×0.875〜×1.125）
    const base = Math.max(1, atk - Math.floor(def / 2));
    const dmg = Math.round(base * (0.875 + Math.random() * 0.25));
    return Math.max(1, dmg);
  }

  playerAttack(target) {
    const crit = chance(0.08);
    let atk = this.player.attack;
    if (crit) atk = Math.round(atk * 1.5);
    const dmg = this.calcDamage(atk, 0);
    const sdx = Math.sign(target.x - this.player.x);
    const sdy = Math.sign(target.y - this.player.y);
    this.lunge(this.player, target);
    this.addEffect('slash', target.x, target.y, { crit, dx: sdx, dy: sdy });
    if (crit) this.addFlash('#fff6d8', 0.16, 140);
    this.sfx(crit ? 'crit' : 'hit');
    this.log(`${target.name}に ${dmg}の ダメージ！${crit ? ' 会心の一撃！' : ''}`);
    this.damageMonster(target, dmg, { crit });
  }

  // モンスターにダメージ（どこから受けても共通）
  damageMonster(m, dmg, opts = {}) {
    m.hp -= dmg;
    m.hurtAt = Date.now();
    m.asleep = false;
    this.addEffect('damage', m.x, m.y, { value: dmg, crit: opts.crit, kind: 'enemy', ttl: 700 });
    if (m.hp <= 0) this.killMonster(m);
  }

  killMonster(m) {
    if (!this.monsters.includes(m)) return;
    this.monsters = this.monsters.filter(x => x !== m);
    this.log(`${m.name}を たおした。`);
    this.addEffect('poof', m.x, m.y, { color: m.color, ttl: 450 });
    this.sfx('kill');
    const msgs = this.player.gainExp(m.exp);
    msgs.forEach(msg => this.log(msg));
    if (msgs.length > 0) {
      this.addEffect('levelup', this.player.x, this.player.y, { ttl: 1000 });
      this.addFlash('#ffe24a', 0.18, 300);
      this.sfx('levelup');
    }
    // 盗まれた物を取り返す
    if (m.stolen) {
      if (this.placeNear(m.x, m.y, { item: m.stolen })) this.log(`${displayName(m.stolen)}を 取り返した！`);
    }
    if (m.stolenGold) this.placeNear(m.x, m.y, { gold: m.stolenGold });
    // 店主を倒すと売上金を落とす
    if (this.shop && m === this.shop.keeper) {
      this.placeNear(m.x, m.y, { gold: 1000 + this.floor * 100 });
    } else if (m.gold > 0 && chance(0.5)) {
      this.placeNear(m.x, m.y, { gold: randInt(Math.ceil(m.gold / 3), m.gold) });
    }
  }

  // プレイヤーがダメージを受ける（どこから受けても共通）
  damagePlayer(dmg, cause) {
    const p = this.player;
    p.hp -= dmg;
    p.hurtAt = Date.now();
    this.addEffect('damage', p.x, p.y, { value: dmg, kind: 'player', ttl: 700 });
    this.addShake(Math.min(7, 3 + dmg * 0.2));
    this.sfx('hurt');
    if (p.hp <= 0) {
      p.hp = 0;
      this.gameOver(cause);
    }
  }

  monsterAttack(m) {
    const p = this.player;
    const dmg = this.calcDamage(m.atk, p.defense);
    this.lunge(m, p);
    this.addEffect('slash', p.x, p.y, { dx: Math.sign(p.x - m.x), dy: Math.sign(p.y - m.y) });
    this.log(`${m.name}の こうげき！ ${dmg}の ダメージを うけた。`);
    this.damagePlayer(dmg, `${m.name}に たおされた`);
    if (this.over) return;

    // 攻撃に付いてくる特殊効果
    if (m.special === 'weaken' && chance(0.3) && p.str > 1) {
      p.str -= 1;
      this.log('毒で ちからが 1 さがった！');
      this.sfx('poison');
    } else if (m.special === 'hunger' && chance(0.4) && p.hunger > 0) {
      p.hunger = Math.max(0, p.hunger - 10);
      this.log('生気を すわれて お腹が へった…');
    }
  }

  gameOver(cause = '') {
    this.over = true;
    this.deathCause = cause;
    this.addShake(9, 500);
    this.addFlash('#c81818', 0.28, 450);
    this.sfx('gameover');
    this.log(`${this.player.name}は ちからつきた…`);
    this.log(`${this.floor}Fで ${cause || 'たおれた'}。`);
  }

  // -----------------------------------------------------------
  // ターン終了処理：満腹度・HP回復・モンスター行動
  // -----------------------------------------------------------
  endPlayerTurn() {
    this.turn++;
    this.checkTheft();
    this.checkShopEntry();
    this.checkHouse();
    this.processHunger();
    this.processRegen();
    if (!this.over) this.moveMonsters();
    this.updateVisibility();
    this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
  }

  processHunger() {
    const p = this.player;
    // スタミナリング：減らない / ヒールリング：2倍の速さで減る
    const rate = p.hasRing('stamina') ? 0 : p.hasRing('heal') ? 2 : 1;
    p.hungerAccum += rate;
    while (p.hungerAccum >= 10) { // 10ターンごとに満腹度-1
      p.hungerAccum -= 10;
      if (p.hunger > 0) {
        p.hunger--;
        if (p.hunger === 20) this.log('お腹が へってきた。');
        if (p.hunger === 0) this.log('お腹が ぺこぺこだ！ はやく 何か食べないと…');
      } else {
        p.hp -= 1;
        if (p.hp <= 0) { p.hp = 0; this.gameOver('飢えて たおれた'); }
      }
    }
  }

  processRegen() {
    const p = this.player;
    if (p.hunger <= 0) return; // 空腹時は回復しない
    if (p.hp >= p.maxHp) return;
    const mult = p.hasRing('heal') ? 3 : 1;
    p.regenAccum += (p.maxHp / 150) * mult;
    if (p.regenAccum >= 1) {
      const heal = Math.floor(p.regenAccum);
      p.regenAccum -= heal;
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
  }

  // -----------------------------------------------------------
  // モンスターAI
  // -----------------------------------------------------------
  canSeePlayer(m) {
    // 同じ部屋にいる、または近くにいれば認識
    const d = this.dungeon;
    const mr = d.roomAt(m.x, m.y);
    const pr = d.roomAt(this.player.x, this.player.y);
    if (mr && pr && mr === pr) return true;
    const dist = Math.max(Math.abs(m.x - this.player.x), Math.abs(m.y - this.player.y));
    return dist <= 2;
  }

  moveMonsters() {
    for (const m of [...this.monsters]) {
      if (this.over) break;
      if (m.hp <= 0 || !this.monsters.includes(m)) continue;
      if (m.asleep || m.peaceful) { m.energy = 0; continue; }
      // 行動力がたまった分だけ行動（倍速は2回、鈍足は2ターンに1回）
      m.energy += m.speed;
      while (m.energy >= 1) {
        m.energy -= 1;
        if (this.over || m.hp <= 0 || !this.monsters.includes(m)) break;
        this.actMonster(m);
      }
    }
  }

  actMonster(m) {
    const p = this.player;
    const dist = Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y));

    if (m.special === 'regen' && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + 3);

    // 盗んだあとは逃げ回る
    if (m.fleeing) { this.fleeStep(m); return; }

    // 隣接していれば攻撃（壁の角ごしには攻撃しない）
    const adx = Math.sign(p.x - m.x), ady = Math.sign(p.y - m.y);
    if (dist === 1 && (m.special === 'phase' || !this.diagonalBlocked(m.x, m.y, adx, ady))) {
      this.setDir(m, adx);
      if (m.special === 'steal' && this.trySteal(m)) return;
      this.monsterAttack(m);
      return;
    }

    // 離れた一直線上から 矢・炎
    if (m.special === 'arrow' && dist <= 6 && this.clearLine(m, p) && chance(0.6)) {
      this.shootArrow(m);
      return;
    }
    if (m.special === 'breath' && dist <= 6 && this.clearLine(m, p) && chance(0.4)) {
      this.breathFire(m);
      return;
    }

    // 怒った店主はフロアのどこにいても最短経路で追いかけてくる
    if (this.shop && m === this.shop.keeper) {
      const step = this.pathStep(m, p.x, p.y);
      if (step) { this.moveMonster(m, step[0], step[1]); return; }
    }

    const sees = this.canSeePlayer(m);
    let dx = 0, dy = 0;
    if (m.ai === 'erratic' && chance(0.5)) {
      dx = randInt(-1, 1); dy = randInt(-1, 1);
    } else if (sees) {
      dx = Math.sign(p.x - m.x);
      dy = Math.sign(p.y - m.y);
    } else if (chance(0.4)) {
      dx = randInt(-1, 1); dy = randInt(-1, 1);
    }
    if (dx === 0 && dy === 0) return;
    this.moveMonster(m, dx, dy);
  }

  // モンスターが入れる場所か
  monsterCanEnter(m, x, y) {
    const d = this.dungeon;
    if (x === this.player.x && y === this.player.y) return false;
    if (this.monsterAt(x, y)) return false;
    if (m.special === 'phase') {
      // ゴーストは壁の中も進める（マップの外周は除く）
      return x > 0 && y > 0 && x < d.w - 1 && y < d.h - 1;
    }
    return d.isWalkable(x, y);
  }

  moveMonster(m, dx, dy) {
    this.setDir(m, dx);
    const phase = m.special === 'phase';
    const tryStep = (sx, sy) => {
      if (sx === 0 && sy === 0) return false;
      const nx = m.x + sx, ny = m.y + sy;
      if (!this.monsterCanEnter(m, nx, ny)) return false;
      if (!phase && this.diagonalBlocked(m.x, m.y, sx, sy)) return false;
      this.stepTo(m, nx, ny);
      this.markMoved(m);
      return true;
    };
    if (tryStep(dx, dy)) return;
    // 進めなければ軸を分けて再挑戦
    if (dx !== 0 && dy !== 0) {
      if (tryStep(dx, 0)) return;
      tryStep(0, dy);
    }
  }

  markMoved(m) {
    m.stepFrame ^= 1;
    m.movedAt = Date.now();
  }

  // (tx,ty) への最短経路の1歩目（幅優先探索。他の敵は通れない扱い）
  pathStep(m, tx, ty) {
    const d = this.dungeon;
    const key = (x, y) => y * d.w + x;
    const prev = new Map([[key(m.x, m.y), null]]);
    const queue = [[m.x, m.y]];
    let found = false;
    for (let qi = 0; qi < queue.length; qi++) {
      const [x, y] = queue[qi];
      if (x === tx && y === ty) { found = true; break; }
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (!d.isWalkable(nx, ny) || prev.has(key(nx, ny))) continue;
        if (this.diagonalBlocked(x, y, dx, dy)) continue;
        if (!(nx === tx && ny === ty) && this.monsterAt(nx, ny)) continue;
        prev.set(key(nx, ny), [x, y]);
        queue.push([nx, ny]);
      }
    }
    if (!found) return null;
    let cur = [tx, ty];
    for (;;) {
      const pr = prev.get(key(cur[0], cur[1]));
      if (!pr || (pr[0] === m.x && pr[1] === m.y)) break;
      cur = pr;
    }
    return [cur[0] - m.x, cur[1] - m.y];
  }

  // プレイヤーから一番遠ざかる方向へ逃げる
  fleeStep(m) {
    const p = this.player;
    let best = null, bestD = Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y));
    for (const [dx, dy] of shuffle(DIRS8)) {
      const nx = m.x + dx, ny = m.y + dy;
      if (!this.monsterCanEnter(m, nx, ny) || this.diagonalBlocked(m.x, m.y, dx, dy)) continue;
      const dd = Math.max(Math.abs(nx - p.x), Math.abs(ny - p.y));
      if (dd > bestD) { bestD = dd; best = [dx, dy]; }
    }
    if (best) {
      this.setDir(m, best[0]);
      this.stepTo(m, m.x + best[0], m.y + best[1]);
      this.markMoved(m);
    }
  }

  // ゴブリンシーフ：アイテムかゴールドを盗んでワープ
  trySteal(m) {
    if (m.stolen || m.stolenGold || !chance(0.5)) return false;
    const p = this.player;
    const cands = p.inventory.filter(i => !p.isEquipped(i) && !i.unpaid);
    if (cands.length && (p.gold <= 0 || chance(0.6))) {
      const item = choice(cands);
      p.inventory.splice(p.inventory.indexOf(item), 1);
      m.stolen = item;
      this.log(`${m.name}に ${displayName(item)}を ぬすまれた！`);
    } else if (p.gold > 0) {
      const amount = Math.min(p.gold, randInt(30, 60 + this.floor * 25));
      p.gold -= amount;
      m.stolenGold = amount;
      this.log(`${m.name}に ${amount}ゴールド ぬすまれた！`);
    } else {
      return false;
    }
    this.sfx('steal');
    this.lunge(m, p);
    this.addEffect('poof', m.x, m.y, { color: '#c0a0ff', ttl: 350 });
    const d = this.dungeon;
    const here = d.roomAt(p.x, p.y);
    const pos = d.randomFloor([p, ...this.monsters], { avoidRooms: here ? [here] : [] });
    if (!this.monsterAt(pos.x, pos.y)) this.warpTo(m, pos.x, pos.y);
    m.fleeing = true;
    this.log(`${m.name}は どこかへ ワープした！`);
    return true;
  }

  // m から プレイヤーまで 一直線（8方向）で、間に壁や敵がいないか
  clearLine(m, target) {
    const dx = target.x - m.x, dy = target.y - m.y;
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return false;
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    if (n < 2) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i < n; i++) {
      const x = m.x + sx * i, y = m.y + sy * i;
      if (!this.dungeon.isWalkable(x, y) || this.monsterAt(x, y)) return false;
    }
    return true;
  }

  shootArrow(m) {
    const p = this.player;
    this.setDir(m, Math.sign(p.x - m.x));
    this.addEffect('bolt', m.x, m.y, { tx: p.x, ty: p.y, kind: 'arrow', ttl: 260 });
    this.sfx('arrow');
    if (chance(0.15)) {
      this.log(`${m.name}の 矢は はずれた。`);
      return;
    }
    const dmg = this.calcDamage(m.atk, p.defense);
    this.log(`${m.name}の 矢が 当たった！ ${dmg}の ダメージ。`);
    this.damagePlayer(dmg, `${m.name}の 矢に たおれた`);
  }

  breathFire(m) {
    const p = this.player;
    this.setDir(m, Math.sign(p.x - m.x));
    this.addEffect('bolt', m.x, m.y, { tx: p.x, ty: p.y, kind: 'fire', ttl: 380 });
    this.sfx('fire');
    const dmg = Math.max(5, randInt(14, 20) - Math.floor(p.defense / 3));
    this.log(`${m.name}は 炎を はいた！ ${dmg}の ダメージ！`);
    this.damagePlayer(dmg, `${m.name}の 炎に やかれた`);
  }

  // -----------------------------------------------------------
  // アイテム
  // -----------------------------------------------------------
  // インベントリのメニューに出す行動
  itemActions(item) {
    const p = this.player;
    const acts = [];
    switch (item.type) {
      case ITEM_TYPE.WEAPON:
      case ITEM_TYPE.SHIELD:
      case ITEM_TYPE.RING:
        acts.push(p.isEquipped(item) ? { id: 'unequip', label: 'はずす' } : { id: 'equip', label: '装備する' });
        break;
      case ITEM_TYPE.POTION: acts.push({ id: 'use', label: '飲む' }); break;
      case ITEM_TYPE.SCROLL: acts.push({ id: 'use', label: '読む' }); break;
      case ITEM_TYPE.WAND:   acts.push({ id: 'use', label: '振る' }); break;
      case ITEM_TYPE.FOOD:   acts.push({ id: 'use', label: '食べる' }); break;
      case ITEM_TYPE.POT:
        acts.push({ id: 'insert', label: '入れる' });
        acts.push({ id: 'break', label: '割る' });
        acts.push({ id: 'peek', label: 'のぞく' });
        break;
    }
    const selling = this.shopOpen() && this.inShop() && !item.unpaid;
    acts.push({ id: 'drop', label: item.unpaid ? '棚にもどす' : selling ? '置く（売る）' : '置く' });
    acts.push({ id: 'desc', label: '説明' });
    return acts;
  }

  // メニューで選んだ行動を実行
  doItemAction(item, action) {
    if (this.busy()) return false;
    if (!this.player.inventory.includes(item)) return false;
    if (item.unpaid && action !== 'drop' && action !== 'desc') {
      this.log('店主「お代を いただくまでは 使わないでくださいね。」');
      return false;
    }
    switch (action) {
      case 'equip':
      case 'unequip': return this.toggleEquip(item);
      case 'use': return this.useItem(item);
      case 'insert': return this.beginInsert(item);
      case 'break': return this.breakPot(item);
      case 'peek': return this.peekPot(item);
      case 'drop': return this.dropItem(item);
      case 'desc':
        this.log(`${displayName(item)}：${describe(item)}`);
        return false;
    }
    return false;
  }

  // 装備の付け外し（ターンは消費しない）
  toggleEquip(item) {
    const p = this.player;
    this.sfx('equip');
    if (p.isEquipped(item)) {
      p.unequip(item);
      this.log(`${displayName(item)}を はずした。`);
      return false;
    }
    if (item.type === ITEM_TYPE.WEAPON) p.weapon = item;
    else if (item.type === ITEM_TYPE.SHIELD) p.shield = item;
    else if (item.type === ITEM_TYPE.RING) {
      const wasKnown = isKnown(item);
      const before = displayName(item);
      p.ring = item;
      identifyKind(item.id);
      if (!wasKnown) this.log(`${before}は ${item.name}だった！`);
      if (item.effect === 'sense') this.log('フロアの 敵の気配を 感じる…');
    }
    this.log(`${displayName(item)}を 装備した。`);
    return false;
  }

  // 使ったらその場で消費し、ターンを進める
  useItem(item) {
    switch (item.type) {
      case ITEM_TYPE.POTION: this.removeFromInventory(item); this.drinkPotion(item); break;
      case ITEM_TYPE.FOOD: this.removeFromInventory(item); this.eatFood(item); break;
      case ITEM_TYPE.SCROLL:
        this.removeFromInventory(item);
        if (this.readScroll(item) === 'waiting') return true; // 選択待ち（ターンは選択後に進む）
        break;
      case ITEM_TYPE.WAND:
        if (!this.zapWand(item)) return false;
        break;
      default: return false;
    }
    this.endPlayerTurn();
    return true;
  }

  removeFromInventory(item) {
    const inv = this.player.inventory;
    const i = inv.indexOf(item);
    if (i >= 0) inv.splice(i, 1);
    this.player.unequip(item);
  }

  // 使ったことで種類がわかったらメッセージ
  learn(item, verb) {
    const before = displayName(item);
    const fresh = identifyKind(item.id);
    if (fresh) this.log(`${before}を ${verb}。これは ${item.name}だった！`);
    else this.log(`${item.name}を ${verb}。`);
  }

  drinkPotion(item) {
    const p = this.player;
    this.learn(item, '飲んだ');
    switch (item.effect) {
      case 'heal': {
        if (p.hp >= p.maxHp) {
          const up = item.value >= 100 ? 2 : 1;
          p.maxHp += up; p.hp = p.maxHp;
          this.log(`最大HPが ${up} 増えた。`);
        } else {
          const before = p.hp;
          p.hp = Math.min(p.maxHp, p.hp + item.value);
          this.log(`HPが ${Math.ceil(p.hp - before)} 回復した。`);
        }
        this.addEffect('heal', p.x, p.y, { value: item.value, ttl: 800 });
        this.sfx('heal');
        break;
      }
      case 'life':
        p.maxHp += item.value;
        p.hp += item.value;
        this.log(`最大HPが ${item.value} 増えた！`);
        this.addEffect('heal', p.x, p.y, { value: item.value, ttl: 800 });
        this.sfx('powerup');
        break;
      case 'strength':
        if (p.str < p.maxStr) {
          p.str += 1;
          this.log('ちからが 1 回復した。');
        } else {
          p.maxStr += 1; p.str += 1;
          this.log('ちからの 最大値が 1 上がった！');
        }
        this.addEffect('levelup', p.x, p.y, { ttl: 800, text: 'POWER UP!' });
        this.sfx('powerup');
        break;
      case 'poison': {
        const down = Math.min(item.value, p.str - 1);
        p.str -= down;
        this.log(down > 0 ? `うっ… ちからが ${down} 下がった。` : 'うっ… まずい。');
        this.addEffect('damage', p.x, p.y, { value: down, kind: 'player', ttl: 700 });
        this.sfx('poison');
        break;
      }
      case 'cure':
        if (p.str < p.maxStr) {
          p.str = p.maxStr;
          this.log('ちからが 元に もどった！');
          this.sfx('heal');
        } else {
          this.log('体が すっきりした。');
        }
        this.addEffect('heal', p.x, p.y, { value: 0, ttl: 600, silent: true });
        break;
    }
  }

  eatFood(item) {
    const p = this.player;
    const wasFull = p.hunger >= p.maxHunger;
    p.hunger = Math.min(p.maxHunger, p.hunger + item.value);
    this.log(`${item.name}を 食べた。お腹が ふくれた。`);
    if (wasFull && item.value >= 100 && p.maxHunger < 200) {
      p.maxHunger = Math.min(200, p.maxHunger + 10);
      p.hunger = p.maxHunger;
      this.log('最大満腹度が 10 増えた！');
    }
    this.sfx('eat');
  }

  readScroll(item) {
    const p = this.player;
    this.learn(item, '読んだ');
    this.sfx('scroll');
    switch (item.effect) {
      case 'map': {
        const d = this.dungeon;
        for (let y = 0; y < d.h; y++) {
          for (let x = 0; x < d.w; x++) {
            // 歩ける場所と、それに接する壁を「探索済み」に
            if (d.isWalkable(x, y)) {
              for (const [dx, dy] of [[0, 0], ...DIRS8]) {
                if (d.inBounds(x + dx, y + dy)) this.explored[y + dy][x + dx] = true;
              }
            }
          }
        }
        this.mapRevealed = true;
        this.log('フロアの地図と アイテムの場所が あたまに うかんだ！');
        break;
      }
      case 'identify': {
        const cands = p.inventory.filter(i => !isKnown(i));
        if (!cands.length) {
          this.log('しかし 調べる物が なかった。');
          break;
        }
        this.request = {
          kind: 'pick',
          text: 'どれを 調べますか？',
          items: cands,
          resolve: (target) => {
            const t = target || choice(cands);
            const before = displayName(t);
            identifyKind(t.id);
            this.log(`${before}は ${t.name}だった！`);
            this.sfx('identify');
            this.endPlayerTurn();
          },
        };
        return 'waiting';
      }
      case 'thunder': {
        const dmg = 10 + this.floor;
        let hit = 0;
        for (const m of [...this.monsters]) {
          if (m.peaceful || !this.isVisible(m.x, m.y)) continue;
          hit++;
          this.addEffect('thunder', m.x, m.y, { ttl: 500 });
          this.damageMonster(m, dmg);
        }
        this.addShake(6);
        this.addFlash('#fffbe0', 0.3, 220);
        this.sfx('thunder');
        this.log(hit ? `かみなりが ${hit}体の 敵に 落ちた！` : 'かみなりが 鳴りひびいた。');
        break;
      }
      case 'teleport': {
        const d = this.dungeon;
        const here = d.roomAt(p.x, p.y);
        const pos = d.randomFloor([p, ...this.monsters, d.stairs], { avoidRooms: here ? [here] : [] });
        this.addEffect('poof', p.x, p.y, { color: '#a080ff', ttl: 400 });
        this.warpTo(p, pos.x, pos.y);
        this.addEffect('poof', p.x, p.y, { color: '#a080ff', ttl: 400 });
        this.sfx('warp');
        this.log('体が ふわりと 浮いて、どこかへ ワープした！');
        this.pickupHere();
        break;
      }
      case 'enchant':
        if (p.weapon) {
          p.weapon.plus = (p.weapon.plus || 0) + 1;
          this.log(`${displayName(p.weapon)}が 光りかがやいた！`);
          this.addEffect('levelup', p.x, p.y, { ttl: 800, text: 'WEAPON +1' });
          this.sfx('powerup');
        } else {
          this.log('しかし 武器を 装備していなかった。');
        }
        break;
      case 'protect':
        if (p.shield) {
          p.shield.plus = (p.shield.plus || 0) + 1;
          this.log(`${displayName(p.shield)}が 光りかがやいた！`);
          this.addEffect('levelup', p.x, p.y, { ttl: 800, text: 'SHIELD +1' });
          this.sfx('powerup');
        } else {
          this.log('しかし 盾を 装備していなかった。');
        }
        break;
    }
    return 'done';
  }

  // いちばん近い、見えている敵（中立の店主はのぞく）
  nearestVisibleEnemy() {
    let target = null, best = Infinity;
    for (const m of this.monsters) {
      if (m.peaceful || !this.isVisible(m.x, m.y)) continue;
      const d = Math.max(Math.abs(m.x - this.player.x), Math.abs(m.y - this.player.y));
      if (d < best) { best = d; target = m; }
    }
    return target;
  }

  zapWand(item) {
    const p = this.player;
    if (item.charges <= 0) {
      this.log(`${displayName(item)}を 振った。しかし 何も おこらなかった。`);
      this.sfx('fizzle');
      return true;
    }
    const target = this.nearestVisibleEnemy();
    if (!target) {
      this.log('近くに 敵が いない。');
      return false;
    }
    item.charges--;
    this.setDir(p, Math.sign(target.x - p.x));
    this.addEffect('bolt', p.x, p.y, { tx: target.x, ty: target.y, kind: item.effect === 'lightning' ? 'lightning' : 'magic', ttl: 240 });
    this.learn(item, '振った');
    this.sfx(item.effect === 'lightning' ? 'thunder' : 'zap');
    target.asleep = false;

    switch (item.effect) {
      case 'swap': {
        const px = p.x, py = p.y;
        this.warpTo(p, target.x, target.y);
        this.warpTo(target, px, py);
        this.addEffect('poof', px, py, { color: '#7986cb', ttl: 350 });
        this.addEffect('poof', p.x, p.y, { color: '#7986cb', ttl: 350 });
        this.log(`${target.name}と 場所が 入れかわった！`);
        this.pickupHere();
        break;
      }
      case 'blast': {
        const dx = Math.sign(target.x - p.x);
        const dy = Math.sign(target.y - p.y);
        target.fromX = target.x; target.fromY = target.y; // 吹き飛びをスライド表示
        let hitWall = false;
        for (let i = 0; i < 5; i++) {
          const nx = target.x + dx, ny = target.y + dy;
          if (this.dungeon.isWalkable(nx, ny) && !this.monsterAt(nx, ny) && !(nx === p.x && ny === p.y)) {
            target.x = nx; target.y = ny;
          } else { hitWall = true; break; }
        }
        target.movedAt = Date.now();
        this.log(`${target.name}を ふきとばした！`);
        if (hitWall) this.damageMonster(target, 8 + this.floor);
        break;
      }
      case 'lightning': {
        const dmg = randInt(18, 24);
        this.log(`稲妻が ${target.name}を つらぬいた！`);
        this.addEffect('thunder', target.x, target.y, { ttl: 500 });
        this.damageMonster(target, dmg);
        break;
      }
      case 'warp': {
        const d = this.dungeon;
        const pos = d.randomFloor([p, ...this.monsters], { avoidRooms: [d.roomAt(p.x, p.y)].filter(Boolean) });
        this.addEffect('poof', target.x, target.y, { color: '#a080ff', ttl: 350 });
        this.warpTo(target, pos.x, pos.y);
        this.log(`${target.name}は どこかへ 飛ばされた！`);
        break;
      }
    }
    return true;
  }

  // ---- ポット ----
  beginInsert(pot) {
    const p = this.player;
    if (pot.contents.length >= pot.size) {
      this.log(`${displayName(pot)}には もう 入らない。`);
      return false;
    }
    const cands = p.inventory.filter(i => i !== pot && i.type !== ITEM_TYPE.POT && !p.isEquipped(i) && !i.unpaid);
    if (!cands.length) {
      this.log('入れられる物が ない。（装備中の物や ポットは 入れられない）');
      return false;
    }
    this.request = {
      kind: 'pick',
      text: `${displayName(pot)}に 何を入れますか？`,
      items: cands,
      resolve: (item) => {
        if (!item) return;
        this.putInPot(pot, item);
      },
    };
    return true;
  }

  putInPot(pot, item) {
    const p = this.player;
    if (!p.inventory.includes(pot) || !p.inventory.includes(item)) return;
    const itemName = displayName(item);
    const potName = displayName(pot);
    this.removeFromInventory(item);
    const potWasKnown = isKnown(pot);
    identifyKind(pot.id);
    if (pot.effect === 'analyze') {
      const fresh = identifyKind(item.id);
      pot.contents.push(item);
      this.log(`${itemName}を ${potName}に 入れた。`);
      if (fresh) this.log(`${itemName}は ${item.name}だった！`);
      this.sfx('identify');
    } else {
      const changed = randomItem(this.floor, ['pot']);
      pot.contents.push(changed);
      this.log(`${itemName}を ${potName}に 入れた。`);
      this.log(`ポットの中で ${itemName}が ${displayName(changed)}に 変わった！`);
      this.sfx('pot');
    }
    if (!potWasKnown) this.log(`${potName}は ${pot.name}だった！`);
    this.endPlayerTurn();
  }

  breakPot(pot) {
    const p = this.player;
    const name = displayName(pot);
    this.removeFromInventory(pot);
    this.addEffect('poof', p.x, p.y, { color: '#c89060', ttl: 400 });
    this.sfx('break');
    if (!pot.contents.length) {
      this.log(`${name}を 割った。中は からっぽだった。`);
    } else {
      let lost = 0;
      for (const item of pot.contents) {
        if (!this.placeNear(p.x, p.y, { item })) lost++;
      }
      this.log(`${name}を 割った！ 中身が 飛び出した。`);
      if (lost) this.log(`${lost}個は どこかへ 転がっていった…`);
    }
    this.endPlayerTurn();
    return true;
  }

  peekPot(pot) {
    const name = displayName(pot);
    if (!pot.contents.length) this.log(`${name}の 中は からっぽだ。`);
    else this.log(`${name}の 中身：${pot.contents.map(displayName).join('、')}`);
    return false;
  }

  // 足元に置く（お店の中なら売れる）
  dropItem(item) {
    const p = this.player;
    if (this.dungeon.get(p.x, p.y) === TILE.STAIRS) {
      this.log('階段の上には 置けない。');
      return false;
    }
    if (this.groundItems.some(g => g.x === p.x && g.y === p.y)) {
      this.log('足元には もう 物がある。');
      return false;
    }
    const name = displayName(item);
    this.removeFromInventory(item);
    const entry = { x: p.x, y: p.y, item };
    this.groundItems.push(entry);

    if (item.unpaid) {
      delete item.unpaid;
      entry.shop = true;
      this.log(`${name}を 棚に もどした。`);
      this.endPlayerTurn();
      return true;
    }
    this.log(`${name}を 置いた。`);
    this.endPlayerTurn();

    if (!this.over && this.shopOpen() && this.inShop()) {
      const price = sellPrice(item);
      this.sfx('talk');
      this.request = {
        kind: 'confirm',
        text: `店主「${name}なら ${price}ゴールドで 買い取りましょう。売りますか？」`,
        options: ['売る', 'やめる'],
        resolve: (i) => {
          if (i === 0 && this.groundItems.includes(entry)) {
            entry.shop = true;
            p.gold += price;
            this.log(`${name}を 売った。（+${price}ゴールド）`);
            this.sfx('buy');
          } else {
            this.log('店主「そうですか。また どうぞ。」');
          }
        },
      };
    }
    return true;
  }
}
