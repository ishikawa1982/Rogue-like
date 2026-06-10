// =============================================================
// entity.js - プレイヤー / モンスターのクラス
// =============================================================
import { MONSTERS, levelStats, EXP_TABLE } from './data.js';
import { randInt } from './rng.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.name = 'ケン';
    this.facing = 1;            // 1=右向き, -1=左向き（描画用）
    this.level = 1;
    this.exp = 0;
    const s = levelStats(1);
    this.maxHp = s.maxHp;
    this.hp = s.maxHp;
    this.baseStr = s.str;       // 素のちから（草で増減）
    this.str = s.str;
    this.gold = 0;

    this.maxHunger = 100;
    this.hunger = 100;          // 満腹度

    this.weapon = null;         // 装備中の武器アイテム
    this.shield = null;         // 装備中の盾アイテム
    this.inventory = [];        // 所持アイテム配列

    this.regenAccum = 0;        // HP自然回復の端数
    this.hungerAccum = 0;       // 満腹度減少の端数

    // 描画アニメ用
    this.stepFrame = 0;         // 歩行フレームの足（0/1で交互）
    this.movedAt = 0;           // 最後に移動した時刻(ms)
    this.attackAnim = null;     // 攻撃の踏み込み {dx,dy,start}
    this.hurtAt = 0;            // 被弾した時刻(ms)（点滅用）
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

  // 次のレベルに必要な経験値（残り）
  expToNext() {
    const next = EXP_TABLE[this.level];
    if (next === undefined) return 0; // カンスト
    return Math.max(0, next - this.exp);
  }

  gainExp(amount) {
    this.exp += amount;
    const leveledMessages = [];
    while (EXP_TABLE[this.level] !== undefined && this.exp >= EXP_TABLE[this.level]) {
      this.level++;
      const s = levelStats(this.level);
      const hpGain = s.maxHp - this.maxHp;
      this.maxHp = s.maxHp;
      this.hp = Math.min(this.maxHp, this.hp + hpGain);
      this.baseStr = s.str;
      this.recalcStr(0);
      leveledMessages.push(`レベルが ${this.level} に上がった！`);
    }
    return leveledMessages;
  }

  // 草などによるちから補正を反映
  recalcStr(delta) {
    this.baseStr += delta;
    this.str = this.baseStr;
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
    this.sprite = def.sprite;
    this.color = def.color;
    this.facing = 1;
    this.special = def.special;
    this.asleep = false;     // 将来拡張用

    // 描画アニメ用
    this.stepFrame = 0;
    this.movedAt = 0;
    this.attackAnim = null;
    this.hurtAt = 0;
  }
}

// フロアに応じたモンスターを1体生成
export function spawnMonster(floor, x, y) {
  // そのフロアに出現可能なモンスター候補
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
