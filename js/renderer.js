// =============================================================
// renderer.js - Canvas描画（ダンジョン・エンティティ・ミニマップ）
// =============================================================
import { TILE, ITEM_TYPE } from './data.js';

export const TILE_SIZE = 36;

export class Renderer {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimap = minimap;
    this.mctx = minimap.getContext('2d');
  }

  resize() {
    // 親要素いっぱいに広げる
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  render(game) {
    const ctx = this.ctx;
    const d = game.dungeon;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // プレイヤーを中心にしたカメラ
    const cols = Math.ceil(W / TILE_SIZE);
    const rows = Math.ceil(H / TILE_SIZE);
    let camX = game.player.x - Math.floor(cols / 2);
    let camY = game.player.y - Math.floor(rows / 2);
    camX = Math.max(0, Math.min(camX, d.w - cols));
    camY = Math.max(0, Math.min(camY, d.h - rows));

    // タイル描画
    for (let sy = 0; sy < rows + 1; sy++) {
      for (let sx = 0; sx < cols + 1; sx++) {
        const mx = camX + sx;
        const my = camY + sy;
        if (!d.inBounds(mx, my)) continue;
        if (!game.explored[my][mx]) continue;
        const px = sx * TILE_SIZE;
        const py = sy * TILE_SIZE;
        const vis = game.visible[my][mx];
        this.drawTile(d.get(mx, my), px, py, vis);
      }
    }

    // 床落ちアイテム
    for (const g of game.groundItems) {
      if (!game.visible[g.y] || !game.visible[g.y][g.x]) continue;
      const px = (g.x - camX) * TILE_SIZE;
      const py = (g.y - camY) * TILE_SIZE;
      if (g.gold !== undefined) {
        this.drawGlyph('$', '#ffd54f', px, py);
      } else {
        this.drawGlyph(g.item.glyph, g.item.color, px, py);
      }
    }

    // 階段（可視時に強調）
    if (game.visible[d.stairs.y] && game.visible[d.stairs.y][d.stairs.x]) {
      const px = (d.stairs.x - camX) * TILE_SIZE;
      const py = (d.stairs.y - camY) * TILE_SIZE;
      this.drawGlyph('▼', '#ffffff', px, py);
    }

    // モンスター
    for (const m of game.monsters) {
      if (!game.visible[m.y] || !game.visible[m.y][m.x]) continue;
      const px = (m.x - camX) * TILE_SIZE;
      const py = (m.y - camY) * TILE_SIZE;
      this.drawCreature(m.glyph, m.color, px, py);
      this.drawHpBar(px, py, m.hp / m.maxHp);
    }

    // プレイヤー
    const ppx = (game.player.x - camX) * TILE_SIZE;
    const ppy = (game.player.y - camY) * TILE_SIZE;
    this.drawCreature('@', '#ffeb3b', ppx, ppy, true);

    this.renderMinimap(game);
  }

  drawTile(tile, px, py, visible) {
    const ctx = this.ctx;
    const s = TILE_SIZE;
    let color;
    switch (tile) {
      case TILE.WALL:     color = visible ? '#3a3f4b' : '#1c1f26'; break;
      case TILE.FLOOR:    color = visible ? '#5a6072' : '#2a2e38'; break;
      case TILE.CORRIDOR: color = visible ? '#4a5060' : '#23272f'; break;
      case TILE.STAIRS:   color = visible ? '#6b7385' : '#2a2e38'; break;
      default:            color = '#000';
    }
    ctx.fillStyle = color;
    ctx.fillRect(px, py, s, s);

    if (tile === TILE.FLOOR || tile === TILE.CORRIDOR || tile === TILE.STAIRS) {
      // グリッド線
      ctx.strokeStyle = visible ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
      ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
    } else if (tile === TILE.WALL) {
      ctx.fillStyle = visible ? 'rgba(255,255,255,0.04)' : 'transparent';
      ctx.fillRect(px, py, s, 4);
    }
  }

  drawGlyph(ch, color, px, py) {
    const ctx = this.ctx;
    ctx.font = `bold ${Math.floor(TILE_SIZE * 0.6)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(ch, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 2);
  }

  drawCreature(ch, color, px, py, isPlayer = false) {
    const ctx = this.ctx;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const r = TILE_SIZE * 0.38;
    // 体（円）
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isPlayer ? '#fff' : 'rgba(0,0,0,0.5)';
    ctx.stroke();
    // 文字
    ctx.font = `bold ${Math.floor(TILE_SIZE * 0.46)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#10131a';
    ctx.fillText(ch, cx, cy + 1);
  }

  drawHpBar(px, py, ratio) {
    const ctx = this.ctx;
    const w = TILE_SIZE * 0.8;
    const x = px + (TILE_SIZE - w) / 2;
    const y = py + 3;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = ratio > 0.5 ? '#66bb6a' : ratio > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(x, y, w * Math.max(0, ratio), 4);
  }

  // -----------------------------------------------------------
  // ミニマップ
  // -----------------------------------------------------------
  renderMinimap(game) {
    const d = game.dungeon;
    const mc = this.minimap;
    const ctx = this.mctx;
    const scale = Math.min(mc.width / d.w, mc.height / d.h);
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(0, 0, mc.width, mc.height);

    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        if (!game.explored[y][x]) continue;
        const t = d.get(x, y);
        if (t === TILE.WALL) continue;
        ctx.fillStyle = t === TILE.STAIRS ? '#ffffff'
          : t === TILE.CORRIDOR ? '#3d4356' : '#566a9c';
        ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    // モンスター（可視のみ）
    ctx.fillStyle = '#ef5350';
    for (const m of game.monsters) {
      if (!game.visible[m.y] || !game.visible[m.y][m.x]) continue;
      ctx.fillRect(m.x * scale, m.y * scale, Math.ceil(scale), Math.ceil(scale));
    }
    // プレイヤー
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(game.player.x * scale, game.player.y * scale, Math.ceil(scale) + 1, Math.ceil(scale) + 1);
  }
}
