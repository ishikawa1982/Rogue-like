// =============================================================
// ui.js - HUD・メッセージログ・持ち物メニュー・確認ダイアログ
//   画面のウィンドウは次の順に重なる：
//     持ち物一覧 → 行動メニュー（使う/置く…） → ダイアログ（確認・選択）
//   ダイアログは game.request があるとき自動で開く。
// =============================================================
import { displayName, describe, itemPrice, sellPrice, typeLabel } from './items.js';
import { getItemSpriteURL } from './sprites.js';
import { AREAS, areaIndexForFloor, INVENTORY_MAX } from './data.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = {
      area: $('hud-area'),
      floor: $('hud-floor'),
      hp: $('hud-hp'),
      hpBar: $('hud-hp-bar'),
      hunger: $('hud-hunger'),
      hungerBar: $('hud-hunger-bar'),
      level: $('hud-level'),
      str: $('hud-str'),
      exp: $('hud-exp'),
      gold: $('hud-gold'),
      turn: $('hud-turn'),
      time: $('hud-time'),
      weapon: $('hud-weapon'),
      shield: $('hud-shield'),
      ring: $('hud-ring'),
      log: $('log'),
      inventory: $('inventory'),
      invCount: $('inv-count'),
      invList: $('inv-list'),
      invDetail: $('inv-detail'),
      actions: $('action-menu'),
      dialog: $('dialog'),
      dialogText: $('dialog-text'),
      dialogList: $('dialog-list'),
    };
    this.invOpen = false;
    this.invIndex = 0;
    this.actionsOpen = false;
    this.actionIndex = 0;
    this.dialogIndex = 0;
    this.shownRequest = null;
    this.bindClicks();
    this.closeInventory();
    this.el.dialog.classList.add('hidden');
  }

  setGame(game) {
    this.game = game;
    this.closeInventory();
    this.shownRequest = null;
    this.el.dialog.classList.add('hidden');
    this._lastLogLen = -1;
  }

  // 何かのウィンドウが開いていて、マップ操作を受け付けない状態か
  get blocking() {
    return this.invOpen || !!this.game.request;
  }

  fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // -----------------------------------------------------------
  // 毎フレームの更新
  // -----------------------------------------------------------
  update() {
    const g = this.game;
    const p = g.player;
    this.el.area.textContent = AREAS[areaIndexForFloor(g.floor)].name;
    this.el.floor.textContent = `${g.floor}F`;
    this.el.hp.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    this.el.hpBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;
    this.el.hpBar.style.background = p.hp / p.maxHp > 0.3 ? '#66bb6a' : '#ef5350';
    this.el.hunger.textContent = `${Math.ceil(p.hunger)}/${p.maxHunger}`;
    this.el.hungerBar.style.width = `${(p.hunger / p.maxHunger) * 100}%`;
    this.el.level.textContent = p.level;
    this.el.str.textContent = `${p.str}/${p.maxStr}`;
    this.el.str.classList.toggle('warn', p.str < p.maxStr);
    this.el.exp.textContent = p.expToNext();
    this.el.gold.textContent = p.gold;
    this.el.turn.textContent = g.turn;
    const liveSec = g.over ? g.elapsed : Math.floor((Date.now() - g.startTime) / 1000);
    this.el.time.textContent = this.fmtTime(liveSec);
    this.el.weapon.textContent = p.weapon ? displayName(p.weapon) : 'なし';
    this.el.shield.textContent = p.shield ? displayName(p.shield) : 'なし';
    this.el.ring.textContent = p.ring ? displayName(p.ring) : 'なし';

    this.renderLog();
    if (this.invOpen) {
      // 持ち物が減って選択位置がはみ出したら詰める
      const len = p.inventory.length;
      if (this.invIndex >= len) this.invIndex = Math.max(0, len - 1);
      this.renderInventory();
    }
    this.syncDialog();
  }

  renderLog() {
    const len = this.game.messages.length;
    if (len === this._lastLogLen && this.game.messages[len - 1] === this._lastLogMsg) return;
    this._lastLogLen = len;
    this._lastLogMsg = this.game.messages[len - 1];
    const recent = this.game.messages.slice(-4);
    this.el.log.innerHTML = recent
      .map((m, i) => `<div class="log-line${i === recent.length - 1 ? ' log-new' : ''}">${esc(m)}</div>`)
      .join('');
  }

  // -----------------------------------------------------------
  // 持ち物一覧
  // -----------------------------------------------------------
  toggleInventory() {
    if (this.invOpen) this.closeInventory();
    else this.openInventory();
  }

  openInventory() {
    if (this.game.over || this.game.request) return;
    this.invOpen = true;
    this.invIndex = 0;
    this.actionsOpen = false;
    this.el.inventory.classList.remove('hidden');
    this._lastInvSig = null;
    this.renderInventory();
  }

  closeInventory() {
    this.invOpen = false;
    this.actionsOpen = false;
    this.el.inventory.classList.add('hidden');
    this.el.actions.classList.add('hidden');
  }

  moveCursor(dir) {
    const len = this.game.player.inventory.length;
    if (len === 0) return;
    this.invIndex = (this.invIndex + dir + len) % len;
    this.renderInventory();
  }

  selectedItem() {
    return this.game.player.inventory[this.invIndex] || null;
  }

  itemRow(item, selected, extra = '') {
    const p = this.game.player;
    const eq = p.isEquipped(item) ? '<span class="inv-eq">E</span>' : '';
    const price = item.unpaid ? `<span class="inv-price">${itemPrice(item)}G</span>` : '';
    return `<div class="inv-item${selected ? ' selected' : ''}${item.unpaid ? ' unpaid' : ''}" ${extra}>
      <img class="inv-icon" src="${getItemSpriteURL(item)}" alt="">
      <span class="inv-type">${typeLabel(item)}</span>
      <span class="inv-name">${esc(displayName(item))}${eq}</span>${price}
    </div>`;
  }

  renderInventory() {
    const g = this.game;
    const inv = g.player.inventory;
    const sig = inv.map(it => `${displayName(it)}${g.player.isEquipped(it) ? 'E' : ''}${it.unpaid ? 'U' : ''}`).join('|')
      + `#${this.invIndex}#${this.actionsOpen ? this.actionIndex : -1}#${g.inShop()}`;
    if (sig === this._lastInvSig) return;
    this._lastInvSig = sig;
    this.el.invCount.textContent = `${inv.length}/${INVENTORY_MAX}`;
    if (inv.length === 0) {
      this.el.invList.innerHTML = '<div class="inv-empty">持ち物は からっぽだ</div>';
      this.el.invDetail.textContent = '';
      this.el.actions.classList.add('hidden');
      return;
    }
    this.el.invList.innerHTML = inv.map((item, i) => this.itemRow(item, i === this.invIndex, `data-inv="${i}"`)).join('');
    const sel = this.el.invList.querySelector('.selected');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });

    // 選択中アイテムの説明（お店では売値も）
    const item = this.selectedItem();
    let detail = describe(item);
    if (item.unpaid) detail += `　【未払い ${itemPrice(item)}ゴールド】`;
    else if (g.shopOpen() && g.inShop()) detail += `　【売値 ${sellPrice(item)}ゴールド】`;
    this.el.invDetail.textContent = detail;

    this.renderActions();
  }

  // -----------------------------------------------------------
  // 行動メニュー（使う・置く・説明…）
  // -----------------------------------------------------------
  openActions() {
    const item = this.selectedItem();
    if (!item) return;
    this.actionsOpen = true;
    this.actionIndex = 0;
    this._lastInvSig = null;
    this.renderInventory();
  }

  closeActions() {
    this.actionsOpen = false;
    this._lastInvSig = null;
    this.el.actions.classList.add('hidden');
    this.renderInventory();
  }

  renderActions() {
    const item = this.selectedItem();
    if (!this.actionsOpen || !item) {
      this.el.actions.classList.add('hidden');
      return;
    }
    const acts = this.game.itemActions(item);
    if (this.actionIndex >= acts.length) this.actionIndex = 0;
    this.el.actions.innerHTML = acts
      .map((a, i) => `<div class="act-item${i === this.actionIndex ? ' selected' : ''}" data-act="${i}">${esc(a.label)}</div>`)
      .join('');
    this.el.actions.classList.remove('hidden');
  }

  runAction(index) {
    const item = this.selectedItem();
    if (!item) return;
    const acts = this.game.itemActions(item);
    const act = acts[index];
    if (!act) return;
    this.game.doItemAction(item, act.id);
    // 説明・のぞくは一覧に戻る。それ以外は閉じてマップへ
    if (act.id === 'desc' || act.id === 'peek') {
      this.closeActions();
    } else {
      this.closeInventory();
    }
  }

  // -----------------------------------------------------------
  // ダイアログ（game.request：確認 / アイテム選択）
  // -----------------------------------------------------------
  syncDialog() {
    const r = this.game.request;
    if (r !== this.shownRequest) {
      this.shownRequest = r;
      this.dialogIndex = 0;
      if (r) this.closeInventory();
      this.renderDialog();
    }
  }

  renderDialog() {
    const r = this.game.request;
    if (!r) {
      this.el.dialog.classList.add('hidden');
      return;
    }
    this.el.dialog.classList.remove('hidden');
    this.el.dialogText.textContent = r.text;
    if (r.kind === 'confirm') {
      this.el.dialogList.className = 'dialog-options';
      this.el.dialogList.innerHTML = r.options
        .map((o, i) => `<div class="act-item${i === this.dialogIndex ? ' selected' : ''}" data-dlg="${i}">${esc(o)}</div>`)
        .join('');
    } else {
      this.el.dialogList.className = 'dialog-items';
      this.el.dialogList.innerHTML = r.items
        .map((it, i) => this.itemRow(it, i === this.dialogIndex, `data-dlg="${i}"`))
        .join('') + `<div class="dialog-cancel act-item" data-dlg="-1">やめる（Esc）</div>`;
      const sel = this.el.dialogList.querySelector('.selected');
      if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
    }
  }

  dialogCount() {
    const r = this.game.request;
    if (!r) return 0;
    return r.kind === 'confirm' ? r.options.length : r.items.length;
  }

  answerDialog(index) {
    const r = this.game.request;
    if (!r) return;
    if (r.kind === 'confirm') {
      this.game.resolveRequest(index < 0 ? r.options.length - 1 : index);
    } else {
      this.game.resolveRequest(index < 0 ? null : r.items[index]);
    }
    this.syncDialog();
  }

  // -----------------------------------------------------------
  // キー入力（ウィンドウが開いているとき）。処理したら true
  // -----------------------------------------------------------
  handleKey(e) {
    const key = e.key;
    const up = key === 'ArrowUp' || key === 'k' || key === 'w' || key === '8';
    const down = key === 'ArrowDown' || key === 'j' || key === 's' || key === '2';
    const ok = key === 'Enter' || key === ' ' || key === 'z';
    const cancel = key === 'Escape' || key === 'x' || key === 'Backspace';

    // ダイアログ
    if (this.game.request) {
      const n = this.dialogCount();
      if (up || key === 'ArrowLeft') { this.dialogIndex = (this.dialogIndex - 1 + n) % n; this.renderDialog(); }
      else if (down || key === 'ArrowRight') { this.dialogIndex = (this.dialogIndex + 1) % n; this.renderDialog(); }
      else if (ok) this.answerDialog(this.dialogIndex);
      else if (cancel) this.answerDialog(-1);
      return true;
    }

    if (!this.invOpen) return false;

    // 行動メニュー
    if (this.actionsOpen) {
      const acts = this.game.itemActions(this.selectedItem());
      if (up) { this.actionIndex = (this.actionIndex - 1 + acts.length) % acts.length; this._lastInvSig = null; this.renderInventory(); }
      else if (down) { this.actionIndex = (this.actionIndex + 1) % acts.length; this._lastInvSig = null; this.renderInventory(); }
      else if (ok) this.runAction(this.actionIndex);
      else if (cancel || key === 'ArrowLeft') this.closeActions();
      return true;
    }

    // 持ち物一覧
    if (key === 'i' || key === 'Tab' || cancel) this.closeInventory();
    else if (up) this.moveCursor(-1);
    else if (down) this.moveCursor(1);
    else if (ok || key === 'ArrowRight') this.openActions();
    else if (key === 't') { // ショートカット：置く
      const item = this.selectedItem();
      if (item) { this.game.doItemAction(item, 'drop'); this.closeInventory(); }
    }
    return true;
  }

  // -----------------------------------------------------------
  // タッチ・クリック操作
  // -----------------------------------------------------------
  bindClicks() {
    this.el.invList.addEventListener('click', (ev) => {
      const row = ev.target.closest('[data-inv]');
      if (!row) return;
      const i = Number(row.dataset.inv);
      if (i === this.invIndex && this.actionsOpen) { this.closeActions(); return; }
      this.invIndex = i;
      this.openActions();
    });
    this.el.actions.addEventListener('click', (ev) => {
      const row = ev.target.closest('[data-act]');
      if (row) this.runAction(Number(row.dataset.act));
    });
    this.el.dialogList.addEventListener('click', (ev) => {
      const row = ev.target.closest('[data-dlg]');
      if (row) this.answerDialog(Number(row.dataset.dlg));
    });
    const close = document.getElementById('inv-close');
    if (close) close.addEventListener('click', () => this.closeInventory());
  }
}
