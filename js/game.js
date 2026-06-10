// =============================================================
// game.js - ゲーム本体（状態管理・ターン処理・戦闘・AI）
// =============================================================
import { Dungeon } from './dungeon.js';
import { Player, spawnMonster } from './entity.js';
import { TILE, ITEM_TYPE, ITEMS } from './data.js';
import { randomItem, createItem, displayName } from './items.js';
import { randInt, choice, chance } from './rng.js';

const VISION_RADIUS = 1; // 通路での視界（部屋は全体可視）

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.floor = 1;
    this.turn = 0;
    this.startTime = Date.now();
    this.elapsed = 0;
    this.messages = [];
    this.over = false;
    this.won = false;
    this.maxFloor = 12; // クリア階

    // 演出用（描画/音はmain側が消費する。game自体はDOM/音に非依存）
    this.effects = [];     // 視覚エフェクト {type,x,y,start,ttl,...}
    this.soundQueue = [];  // 効果音名のキュー
    this.shake = null;     // 画面ゆれ {start,mag,ttl}

    this.player = new Player(0, 0);
    // 初期装備とアイテム
    const bat = createItem('bat');
    const cap = createItem('cap');
    this.player.weapon = bat;
    this.player.shield = cap;
    this.player.inventory.push(bat, cap, createItem('medicine'), createItem('burger'));

    this.buildFloor();
    this.log(`${this.player.name}は ドキドキ洞窟に やってきた。`);
    this.log(`${this.floor}F に おりたった。`);
  }

  // -----------------------------------------------------------
  // フロア構築
  // -----------------------------------------------------------
  buildFloor() {
    this.dungeon = new Dungeon();
    this.monsters = [];
    this.groundItems = [];
    this.visible = this.makeBoolMap();   // 現在見えている
    this.explored = this.makeBoolMap();  // 一度でも見た

    // プレイヤー配置（階段から離れた部屋）
    const start = this.dungeon.randomFloor([this.dungeon.stairs]);
    this.player.x = start.x;
    this.player.y = start.y;

    // モンスター配置
    const monCount = 4 + Math.floor(this.floor * 0.8);
    for (let i = 0; i < monCount; i++) {
      const pos = this.dungeon.randomFloor([this.player, this.dungeon.stairs, ...this.monsters]);
      this.monsters.push(spawnMonster(this.floor, pos.x, pos.y));
    }

    // 床落ちアイテム配置
    const itemCount = 3 + randInt(0, 3);
    for (let i = 0; i < itemCount; i++) {
      const pos = this.dungeon.randomFloor([this.player, this.dungeon.stairs, ...this.groundItems]);
      const item = randomItem(this.floor);
      this.groundItems.push({ x: pos.x, y: pos.y, item });
    }
    // 落ちているギャラ（ゴールド）
    const goldCount = randInt(1, 3);
    for (let i = 0; i < goldCount; i++) {
      const pos = this.dungeon.randomFloor([this.player, this.dungeon.stairs]);
      this.groundItems.push({ x: pos.x, y: pos.y, gold: randInt(10, 30 + this.floor * 8) });
    }

    this.updateVisibility();
  }

  makeBoolMap() {
    return Array.from({ length: this.dungeon ? this.dungeon.h : 36 }, () =>
      Array.from({ length: this.dungeon ? this.dungeon.w : 48 }, () => false)
    );
  }

  // -----------------------------------------------------------
  // 可視範囲の更新（部屋にいれば部屋全体＋壁、通路は周囲1マス）
  // -----------------------------------------------------------
  updateVisibility() {
    const d = this.dungeon;
    // リセット
    this.visible = this.makeBoolMap();

    const reveal = (x, y) => {
      if (!d.inBounds(x, y)) return;
      this.visible[y][x] = true;
      this.explored[y][x] = true;
    };

    const room = d.roomAt(this.player.x, this.player.y);
    if (room && d.isRoomFloor(this.player.x, this.player.y)) {
      // 部屋全体＋外周1マス（壁）を可視に
      for (let y = room.y - 1; y <= room.y + room.h; y++) {
        for (let x = room.x - 1; x <= room.x + room.w; x++) {
          reveal(x, y);
        }
      }
    } else {
      // 通路：周囲を照らす
      for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
        for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
          reveal(this.player.x + dx, this.player.y + dy);
        }
      }
    }
  }

  // -----------------------------------------------------------
  // メッセージログ
  // -----------------------------------------------------------
  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > 100) this.messages.shift();
  }

  // -----------------------------------------------------------
  // 演出ヘルパー（プレーンなデータを積むだけ。実描画/再生はmain側）
  // -----------------------------------------------------------
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

  // 移動/攻撃の方向から表示向き(dir)を決める。
  //   横・斜め → 'side'（facingで左右反転）、真上 → 'up'、真下 → 'down'
  setDir(e, dx, dy) {
    if (dx !== 0) { e.facing = dx; e.dir = 'side'; }
    else if (dy < 0) e.dir = 'up';
    else if (dy > 0) e.dir = 'down';
  }

  // 攻撃の踏み込みアニメをセット
  lunge(entity, target) {
    entity.attackAnim = {
      dx: Math.sign(target.x - entity.x),
      dy: Math.sign(target.y - entity.y),
      start: Date.now(),
    };
  }

  // -----------------------------------------------------------
  // プレイヤーの行動入口。1ターン消費したらtrueを返す
  // -----------------------------------------------------------
  monsterAt(x, y) {
    return this.monsters.find(m => m.x === x && m.y === y && m.hp > 0);
  }

  tryMove(dx, dy) {
    if (this.over) return false;
    this.setDir(this.player, dx, dy); // 描画用の向き（移動・攻撃とも）
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // 攻撃判定
    const target = this.monsterAt(nx, ny);
    if (target) {
      this.playerAttack(target);
      this.endPlayerTurn();
      return true;
    }

    // 移動判定（斜め移動時は壁の角をすり抜けない）
    if (!this.dungeon.isWalkable(nx, ny)) return false;
    if (dx !== 0 && dy !== 0) {
      if (!this.dungeon.isWalkable(this.player.x + dx, this.player.y) &&
          !this.dungeon.isWalkable(this.player.x, this.player.y + dy)) {
        return false;
      }
    }

    this.player.x = nx;
    this.player.y = ny;
    this.player.stepFrame ^= 1;
    this.player.movedAt = Date.now();
    this.sfx('step');
    this.pickupHere();
    this.endPlayerTurn();
    return true;
  }

  // その場で足踏み（休む）
  wait() {
    if (this.over) return false;
    this.endPlayerTurn();
    return true;
  }

  // 階段を降りる
  descend() {
    if (this.over) return false;
    if (this.player.x === this.dungeon.stairs.x && this.player.y === this.dungeon.stairs.y) {
      this.floor++;
      if (this.floor > this.maxFloor) {
        this.won = true;
        this.over = true;
        this.sfx('win');
        this.log('ダンジョンを 制覇した！おめでとう！');
        return true;
      }
      this.sfx('stairs');
      this.buildFloor();
      this.log(`${this.floor}F に おりた。`);
      return true;
    } else {
      this.log('ここには 階段が ない。');
      return false;
    }
  }

  // 足元のアイテムを拾う
  pickupHere() {
    const idx = this.groundItems.findIndex(g => g.x === this.player.x && g.y === this.player.y);
    if (idx === -1) return;
    const g = this.groundItems[idx];
    if (g.gold !== undefined) {
      this.player.gold += g.gold;
      this.log(`${g.gold} ドルを 拾った。`);
      this.sfx('coin');
      this.groundItems.splice(idx, 1);
    } else {
      if (this.player.inventory.length >= 20) {
        this.log('持ち物が いっぱいだ。');
        return;
      }
      this.player.inventory.push(g.item);
      this.log(`${displayName(g.item)} を 拾った。`);
      this.sfx('pickup');
      this.groundItems.splice(idx, 1);
    }
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
    // 命中率（簡易的に常に当たる＋たまに会心）
    const crit = chance(0.08);
    let atk = this.player.attack;
    if (crit) atk = Math.round(atk * 1.5);
    const dmg = this.calcDamage(atk, 0);
    target.hp -= dmg;
    target.hurtAt = Date.now();
    this.log(`${target.name} に ${dmg} のダメージ！${crit ? '会心の一撃！' : ''}`);

    // 演出
    this.lunge(this.player, target);
    this.addEffect('slash', target.x, target.y, { crit });
    this.addEffect('damage', target.x, target.y, { value: dmg, crit, kind: 'enemy', ttl: 700 });
    this.sfx(crit ? 'crit' : 'hit');

    if (target.hp <= 0) {
      this.killMonster(target);
    }
  }

  killMonster(m) {
    this.log(`${m.name} を たおした。`);
    this.addEffect('poof', m.x, m.y, { color: m.color, ttl: 450 });
    this.sfx('kill');
    const msgs = this.player.gainExp(m.exp);
    msgs.forEach(msg => this.log(msg));
    if (msgs.length > 0) {
      this.addEffect('levelup', this.player.x, this.player.y, { ttl: 1000 });
      this.sfx('levelup');
    }
    // ドルドロップ
    if (m.gold > 0 && chance(0.5)) {
      const g = randInt(1, m.gold);
      this.groundItems.push({ x: m.x, y: m.y, gold: g });
    }
    this.monsters = this.monsters.filter(x => x !== m);
  }

  monsterAttack(m) {
    const dmg = this.calcDamage(m.atk, this.player.defense);
    this.player.hp -= dmg;
    this.player.hurtAt = Date.now();
    this.log(`${m.name} の こうげき！ ${dmg} のダメージを うけた。`);

    // 演出
    this.lunge(m, this.player);
    this.addEffect('slash', this.player.x, this.player.y, {});
    this.addEffect('damage', this.player.x, this.player.y, { value: dmg, kind: 'player', ttl: 700 });
    this.addShake(Math.min(7, 3 + dmg * 0.2));
    this.sfx('hurt');

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver();
    }
  }

  gameOver() {
    this.over = true;
    this.addShake(9, 500);
    this.sfx('gameover');
    this.log(`${this.player.name} は ちからつきた…`);
    this.log(`${this.floor}F で たおれた。`);
  }

  // -----------------------------------------------------------
  // ターン終了処理：満腹度・HP回復・モンスター行動
  // -----------------------------------------------------------
  endPlayerTurn() {
    this.turn++;
    this.processHunger();
    this.processRegen();
    this.moveMonsters();
    this.updateVisibility();
    this.elapsed = Math.floor((Date.now() - this.startTime) / 1000);
  }

  processHunger() {
    const p = this.player;
    p.hungerAccum += 1;
    if (p.hungerAccum >= 10) { // 10ターンごとに満腹度-1
      p.hungerAccum = 0;
      if (p.hunger > 0) {
        p.hunger--;
        if (p.hunger === 0) this.log('お腹が 減って きた！');
      } else {
        // 空腹時はHPが減る
        p.hp -= 1;
        if (p.hp <= 0) { p.hp = 0; this.gameOver(); }
      }
    }
  }

  processRegen() {
    const p = this.player;
    if (p.hunger <= 0) return; // 空腹時は回復しない
    if (p.hp >= p.maxHp) return;
    // maxHpに応じてゆっくり回復
    p.regenAccum += p.maxHp / 150;
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
    // 同じ部屋にいる、または隣接していれば認識
    const d = this.dungeon;
    const mr = d.roomAt(m.x, m.y);
    const pr = d.roomAt(this.player.x, this.player.y);
    if (mr && pr && mr === pr) return true;
    const dist = Math.max(Math.abs(m.x - this.player.x), Math.abs(m.y - this.player.y));
    return dist <= 2;
  }

  moveMonsters() {
    for (const m of this.monsters) {
      if (m.hp <= 0) continue;
      if (this.over) break;
      this.actMonster(m);
    }
  }

  actMonster(m) {
    const p = this.player;
    const dist = Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y));

    // 隣接していれば攻撃（プレイヤーの方を向く）
    if (dist === 1) {
      this.setDir(m, Math.sign(p.x - m.x), Math.sign(p.y - m.y));
      if (m.special === 'burger' && chance(0.4)) {
        this.log(`${m.name}は ハンバーガーの においを ただよわせた！`);
        if (chance(0.5)) {
          this.log('しかし 失敗した。');
        } else {
          this.player.hunger = Math.min(this.player.maxHunger, this.player.hunger + 5);
          this.log('なんだか お腹が ふくれた。');
        }
        return;
      }
      this.monsterAttack(m);
      return;
    }

    const sees = this.canSeePlayer(m);
    let dx = 0, dy = 0;

    if (m.ai === 'erratic' && chance(0.5)) {
      // 不規則移動：ランダム方向
      dx = randInt(-1, 1); dy = randInt(-1, 1);
    } else if (sees) {
      // 追跡：プレイヤー方向へ
      dx = Math.sign(p.x - m.x);
      dy = Math.sign(p.y - m.y);
    } else {
      // 徘徊：たまにランダム移動
      if (chance(0.4)) { dx = randInt(-1, 1); dy = randInt(-1, 1); }
    }

    if (dx === 0 && dy === 0) return;
    this.moveMonster(m, dx, dy);
  }

  moveMonster(m, dx, dy) {
    this.setDir(m, dx, dy); // 描画用の向き
    const nx = m.x + dx;
    const ny = m.y + dy;
    if (!this.dungeon.isWalkable(nx, ny)) {
      // 進めなければ軸を分けて再挑戦
      if (dx !== 0 && this.dungeon.isWalkable(m.x + dx, m.y) && !this.monsterAt(m.x + dx, m.y)) {
        m.x += dx; this.markMoved(m); return;
      }
      if (dy !== 0 && this.dungeon.isWalkable(m.x, m.y + dy) && !this.monsterAt(m.x, m.y + dy)) {
        m.y += dy; this.markMoved(m); return;
      }
      return;
    }
    // プレイヤーや他モンスターがいる場所には移動しない
    if (nx === this.player.x && ny === this.player.y) return;
    if (this.monsterAt(nx, ny)) return;
    m.x = nx;
    m.y = ny;
    this.markMoved(m);
  }

  markMoved(m) {
    m.stepFrame ^= 1;
    m.movedAt = Date.now();
  }

  // -----------------------------------------------------------
  // アイテム使用
  // -----------------------------------------------------------
  useItem(index) {
    const item = this.player.inventory[index];
    if (!item) return false;
    let consumed = false;

    switch (item.type) {
      case ITEM_TYPE.WEAPON:
        this.equipWeapon(item);
        break;
      case ITEM_TYPE.SHIELD:
        this.equipShield(item);
        break;
      case ITEM_TYPE.HERB:
        consumed = this.applyHerb(item);
        break;
      case ITEM_TYPE.SCROLL:
        consumed = this.applyScroll(item);
        break;
      case ITEM_TYPE.FOOD:
        consumed = this.applyFood(item);
        break;
      case ITEM_TYPE.STAFF:
        consumed = this.applyStaff(item);
        break;
    }

    if (consumed) {
      this.player.inventory.splice(index, 1);
    }
    // 装備以外の使用はターン消費
    if (item.type !== ITEM_TYPE.WEAPON && item.type !== ITEM_TYPE.SHIELD) {
      this.endPlayerTurn();
    }
    return true;
  }

  equipWeapon(item) {
    this.sfx('equip');
    if (this.player.weapon === item) {
      this.player.weapon = null;
      this.log(`${displayName(item)} を 外した。`);
    } else {
      this.player.weapon = item;
      this.log(`${displayName(item)} を 装備した。`);
    }
  }

  equipShield(item) {
    this.sfx('equip');
    if (this.player.shield === item) {
      this.player.shield = null;
      this.log(`${displayName(item)} を 外した。`);
    } else {
      this.player.shield = item;
      this.log(`${displayName(item)} を 装備した。`);
    }
  }

  identify(item) {
    item.identified = true;
  }

  applyHerb(item) {
    this.identify(item);
    const p = this.player;
    switch (item.effect) {
      case 'heal':
        p.hp = Math.min(p.maxHp, p.hp + item.value);
        this.log(`${item.name}を 食べた。HPが ${item.value} 回復した。`);
        this.addEffect('heal', p.x, p.y, { value: item.value, ttl: 800 });
        this.sfx('heal');
        break;
      case 'maxhp':
        p.maxHp += item.value;
        p.hp += item.value;
        this.log(`${item.name}を 食べた。最大HPが ${item.value} 増えた。`);
        this.addEffect('heal', p.x, p.y, { value: item.value, ttl: 800 });
        this.sfx('powerup');
        break;
      case 'power':
        p.recalcStr(item.value);
        this.log(`${item.name}を 食べた。ちからが ${item.value} 増えた。`);
        this.addEffect('levelup', p.x, p.y, { ttl: 800, text: 'POWER UP!' });
        this.sfx('powerup');
        break;
      case 'poison':
        p.recalcStr(-item.value);
        this.log(`${item.name}を 食べた。ちからが ${item.value} 減った…`);
        this.addEffect('damage', p.x, p.y, { value: item.value, kind: 'player', ttl: 700 });
        this.sfx('hurt');
        break;
    }
    return true;
  }

  applyScroll(item) {
    this.identify(item);
    switch (item.effect) {
      case 'light':
        // フロア全体を探索済みに
        for (let y = 0; y < this.dungeon.h; y++)
          for (let x = 0; x < this.dungeon.w; x++)
            this.explored[y][x] = true;
        this.log(`${item.name}を 読んだ。フロアの地図が あたまに うかんだ！`);
        break;
      case 'identify': {
        const target = this.player.inventory.find(i => i.unidentified && !i.identified && i !== item);
        if (target) {
          target.identified = true;
          this.log(`${item.name}を 読んだ。${target.name} だと わかった！`);
        } else {
          this.log(`${item.name}を 読んだ。しかし なにも わからなかった。`);
        }
        break;
      }
      case 'quake': {
        // 視界内の敵にダメージ
        let hit = 0;
        for (const m of [...this.monsters]) {
          if (this.visible[m.y] && this.visible[m.y][m.x]) {
            m.hp -= 10;
            m.hurtAt = Date.now();
            hit++;
            this.addEffect('slash', m.x, m.y, {});
            this.addEffect('damage', m.x, m.y, { value: 10, kind: 'enemy', ttl: 700 });
            if (m.hp <= 0) this.killMonster(m);
          }
        }
        this.addShake(6);
        this.log(`${item.name}を 読んだ。かみなりが ${hit}体に おちた！`);
        break;
      }
    }
    this.sfx('scroll');
    return true;
  }

  applyFood(item) {
    const p = this.player;
    p.hunger = Math.min(p.maxHunger, p.hunger + item.value);
    this.log(`${item.name}を 食べた。満腹度が 回復した。`);
    this.sfx('eat');
    return true;
  }

  applyStaff(item) {
    this.identify(item);
    if (item.charges <= 0) {
      this.log(`${item.name}には 何も 起きなかった。`);
      return false;
    }
    // 一番近い視界内のモンスターを対象
    let target = null, best = Infinity;
    for (const m of this.monsters) {
      if (!(this.visible[m.y] && this.visible[m.y][m.x])) continue;
      const d = Math.abs(m.x - this.player.x) + Math.abs(m.y - this.player.y);
      if (d < best) { best = d; target = m; }
    }
    if (!target) {
      this.log(`${item.name}を 振った。しかし 対象が いない。`);
      return false;
    }
    item.charges--;
    this.sfx('staff');
    if (item.effect === 'swap') {
      const px = this.player.x, py = this.player.y;
      this.player.x = target.x; this.player.y = target.y;
      target.x = px; target.y = py;
      this.addEffect('poof', px, py, { color: '#7986cb', ttl: 350 });
      this.addEffect('poof', target.x, target.y, { color: '#7986cb', ttl: 350 });
      this.log(`${item.name}！ ${target.name}と 場所が 入れ替わった。`);
    } else if (item.effect === 'blast') {
      // 直線方向に吹き飛ばす（簡易：3マス押し出し）
      const dx = Math.sign(target.x - this.player.x);
      const dy = Math.sign(target.y - this.player.y);
      for (let i = 0; i < 3; i++) {
        const nx = target.x + dx, ny = target.y + dy;
        if (this.dungeon.isWalkable(nx, ny) && !this.monsterAt(nx, ny)) {
          target.x = nx; target.y = ny;
        } else { target.hp -= 5; break; }
      }
      this.log(`${item.name}！ ${target.name}を 吹き飛ばした。`);
      if (target.hp <= 0) this.killMonster(target);
    }
    return false; // 杖は消費しない（チャージ減のみ）
  }

  // アイテムを投げる（足元の床へ置く＝MVPでは捨てる）
  dropItem(index) {
    const item = this.player.inventory[index];
    if (!item) return false;
    // 装備中なら外す
    if (this.player.weapon === item) this.player.weapon = null;
    if (this.player.shield === item) this.player.shield = null;
    // 足元に既に何かあれば置けない
    if (this.groundItems.some(g => g.x === this.player.x && g.y === this.player.y)) {
      this.log('足元には 置けない。');
      return false;
    }
    this.groundItems.push({ x: this.player.x, y: this.player.y, item });
    this.player.inventory.splice(index, 1);
    this.log(`${displayName(item)} を 置いた。`);
    this.endPlayerTurn();
    return true;
  }
}
