// =============================================================
// ui.js - HUD・メッセージログ・持ち物メニューのDOM更新
// =============================================================
import { ITEM_TYPE } from './data.js';
import { displayName } from './items.js';
import { getItemSpriteURL } from './sprites.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.el = {
      floor: document.getElementById('hud-floor'),
      hp: document.getElementById('hud-hp'),
      hpBar: document.getElementById('hud-hp-bar'),
      hunger: document.getElementById('hud-hunger'),
      hungerBar: document.getElementById('hud-hunger-bar'),
      level: document.getElementById('hud-level'),
      str: document.getElementById('hud-str'),
      exp: document.getElementById('hud-exp'),
      gold: document.getElementById('hud-gold'),
      turn: document.getElementById('hud-turn'),
      time: document.getElementById('hud-time'),
      weapon: document.getElementById('hud-weapon'),
      shield: document.getElementById('hud-shield'),
      log: document.getElementById('log'),
      inventory: document.getElementById('inventory'),
      invList: document.getElementById('inv-list'),
    };
    this.invOpen = false;
    this.invIndex = 0;
  }

  fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  update() {
    const g = this.game;
    const p = g.player;
    this.el.floor.textContent = `${g.floor}F`;
    this.el.hp.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    this.el.hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    this.el.hpBar.style.background = p.hp / p.maxHp > 0.3 ? '#66bb6a' : '#ef5350';
    this.el.hunger.textContent = `${Math.ceil(p.hunger)}/${p.maxHunger}`;
    this.el.hungerBar.style.width = `${(p.hunger / p.maxHunger) * 100}%`;
    this.el.level.textContent = p.level;
    this.el.str.textContent = `${p.str}/${p.baseStr}`;
    this.el.exp.textContent = p.expToNext();
    this.el.gold.textContent = p.gold;
    this.el.turn.textContent = g.turn;
    this.el.time.textContent = this.fmtTime(g.elapsed);
    this.el.weapon.textContent = p.weapon ? displayName(p.weapon) : '素手';
    this.el.shield.textContent = p.shield ? displayName(p.shield) : 'なし';

    this.renderLog();
    if (this.invOpen) this.renderInventory();
  }

  renderLog() {
    const recent = this.game.messages.slice(-4);
    this.el.log.innerHTML = recent
      .map((m, i) => `<div class="log-line${i === recent.length - 1 ? ' log-new' : ''}">${m}</div>`)
      .join('');
  }

  toggleInventory() {
    this.invOpen = !this.invOpen;
    this.invIndex = 0;
    this.el.inventory.classList.toggle('hidden', !this.invOpen);
    if (this.invOpen) this.renderInventory();
  }

  closeInventory() {
    this.invOpen = false;
    this.el.inventory.classList.add('hidden');
  }

  moveCursor(dir) {
    const len = this.game.player.inventory.length;
    if (len === 0) return;
    this.invIndex = (this.invIndex + dir + len) % len;
    this.renderInventory();
  }

  typeLabel(item) {
    switch (item.type) {
      case ITEM_TYPE.WEAPON: return 'ぶき';
      case ITEM_TYPE.SHIELD: return 'ぼうし';
      case ITEM_TYPE.HERB:   return 'くすり';
      case ITEM_TYPE.SCROLL: return 'メモ';
      case ITEM_TYPE.FOOD:   return 'たべもの';
      case ITEM_TYPE.STAFF:  return 'ステッキ';
      default: return '';
    }
  }

  renderInventory() {
    const g = this.game;
    const inv = g.player.inventory;
    if (inv.length === 0) {
      this.el.invList.innerHTML = '<div class="inv-empty">持ち物は からっぽだ</div>';
      return;
    }
    this.el.invList.innerHTML = inv.map((item, i) => {
      const equipped = (g.player.weapon === item || g.player.shield === item) ? ' E' : '';
      const sel = i === this.invIndex ? ' selected' : '';
      return `<div class="inv-item${sel}">
        <img class="inv-icon" src="${getItemSpriteURL(item)}" alt="">
        <span class="inv-type">${this.typeLabel(item)}</span>
        <span class="inv-name">${displayName(item)}<span class="inv-eq">${equipped}</span></span>
      </div>`;
    }).join('');
  }
}
