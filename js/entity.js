// =============================================================
// entity.js - プレイヤー / モンスターのクラス
// =============================================================
import { MONSTERS, SHOPKEEPER, levelStats, EXP_TABLE } from './data.js';
import { randInt } from './rng.js';

// 描画アニメ用の共通フィールド
function initAnim(e, x, y) {
  e.facing = -1;          // 1=右向き, -1=左向き（右向きのとき絵を左右反転）
  e.stepFrame = 0;        // 歩くたびに0/1が切り替わる
  e.movedAt = 0;          // 最後に移動した時刻(ms)
  e.fromX = x;            // 移動補間の起点（renderer が lerp する）
  e.fromY = y;
  e.attackAnim = null;    // 攻撃の踏み込み {dx,dy,start}
  e.hurtAt = 0;           // 被弾した時刻(ms)（点滅用）
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.name = 'レオン';
    this.level = 1;
    this.exp = 0;
    const s = levelStats(1);
    this.maxHp = s.maxHp;
    this.hp = s.maxHp;
    this.maxStr = s.str;        // ちからの上限
    this.str = s.str;           // 現在のちから（毒で下がる）
    this.gold = 0;

    this.maxHunger = 100;
    this.hunger = 100;          // 満腹度

    this.weapon = null;         // 装備中の武器
    this.shield = null;         // 装備中の盾
    this.ring = null;           // 装備中のリング（腕輪）
    this.inventory = [];        // 持ち物

    this.regenAccum = 0;        // HP自然回復の端数
    this.hungerAccum = 0;       // 満腹度減少の端数

    initAnim(this, x, y);
  }

  // 攻撃力 = ちから + 武器power(+強化値)
  get attack() {
    let a = this.str;
    if (this.weapon) a += this.weapon.power + (this.weapon.plus || 0);
    return a;
  }

  // 防御力 = 盾power(+強化値)
  get defense() {
    let d = 0;
    if (this.shield) d += this.shield.power + (this.shield.plus || 0);
    return d;
  }

  hasRing(effect) {
    return !!(this.ring && this.ring.effect === effect);
  }

  isEquipped(item) {
    return item === this.weapon || item === this.shield || item === this.ring;
  }

  unequip(item) {
    if (this.weapon === item) this.weapon = null;
    if (this.shield === item) this.shield = null;
    if (this.ring === item) this.ring = null;
  }

  // 次のレベルに必要な経験値（残り）
  expToNext() {
    const next = EXP_TABLE[this.level];
    if (next === undefined) return 0; // カンスト
    return Math.max(0, next - this.exp);
  }

  // レベルアップ時は「基準値の増えた分」だけ上乗せする（薬で増えた分は消えない）
  gainExp(amount) {
    this.exp += amount;
    const leveledMessages = [];
    while (EXP_TABLE[this.level] !== undefined && this.exp >= EXP_TABLE[this.level]) {
      const before = levelStats(this.level);
      this.level++;
      const after = levelStats(this.level);
      const hpGain = after.maxHp - before.maxHp;
      const strGain = after.str - before.str;
      this.maxHp += hpGain;
      this.hp = Math.min(this.maxHp, this.hp + hpGain);
      this.maxStr += strGain;
      this.str += strGain;
      leveledMessages.push(`レベルが ${this.level} に上がった！`);
    }
    return leveledMessages;
  }
}

export class Monster {
  constructor(def, x, y) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.atk = def.atk;
    this.exp = def.exp;
    this.gold = def.gold;
    this.ai = def.ai;
    this.speed = def.speed || 1;
    this.energy = 0;          // 行動力（speedずつたまり、1で1回行動）
    this.special = def.special || null;
    this.sprite = def.sprite;
    this.color = def.color;

    this.asleep = false;      // 眠っている（モンスターハウス）
    this.peaceful = false;    // 中立（店主）
    this.inHouse = false;     // モンスターハウスの住人
    this.fleeing = false;     // 逃げ回っている（盗んだあと）
    this.stolen = null;       // 盗んだアイテム
    this.stolenGold = 0;      // 盗んだゴールド

    initAnim(this, x, y);
  }
}

// フロアに応じたモンスターを1体生成
export function spawnMonster(floor, x, y) {
  // そのフロアに出現可能なモンスター候補（あまり弱すぎる敵は出ない）
  const pool = MONSTERS.filter(m => m.minFloor <= floor && m.minFloor >= floor - 5);
  const candidates = pool.length ? pool : MONSTERS.filter(m => m.minFloor <= floor);
  const def = candidates[randInt(0, candidates.length - 1)];
  // 深いフロアほど僅かに強化
  const scale = 1 + Math.max(0, floor - def.minFloor) * 0.08;
  const m = new Monster(def, x, y);
  m.maxHp = Math.round(def.hp * scale);
  m.hp = m.maxHp;
  m.atk = Math.round(def.atk * scale);
  return m;
}

// お店の主人
export function createShopkeeper(x, y) {
  const m = new Monster(SHOPKEEPER, x, y);
  m.peaceful = true;
  m.facing = 1;
  return m;
}
