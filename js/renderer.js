// =============================================================
// renderer.js - Canvas描画（ドット絵スプライト・タイルテクスチャ）
//   16x16のドット絵を2倍に拡大描画するスーファミ風レンダラー。
// =============================================================
import { TILE } from './data.js';
import { getSprite, getItemSprite, getTileTexture, themeForFloor } from './sprites.js';

export const TILE_SIZE = 32;

export class Renderer {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimap = minimap;
    this.mctx = minimap.getContext('2d');
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  render(game) {
    const ctx = this.ctx;
    const d = game.dungeon;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.imageSmoothingEnabled = false; // ドット絵をくっきり拡大

    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // プレイヤーを中心にしたカメラ
    const cols = Math.ceil(W / TILE_SIZE);
    const rows = Math.ceil(H / TILE_SIZE);
    let camX = game.player.x - Math.floor(cols / 2);
    let camY = game.player.y - Math.floor(rows / 2);
    // 下端はログウィンドウぶん余裕を持たせる（マップ外は黒で見せる）
    camX = Math.max(0, Math.min(camX, d.w - cols));
    camY = Math.max(0, Math.min(camY, d.h - rows + 4));

    const theme = themeForFloor(game.floor);
    const bob = game.turn % 2; // ターンごとに1pxゆれる（生きてる感）

    // ---- タイル描画 ----
    for (let sy = 0; sy < rows + 1; sy++) {
      for (let sx = 0; sx < cols + 1; sx++) {
        const mx = camX + sx;
        const my = camY + sy;
        if (!d.inBounds(mx, my)) continue;
        if (!game.explored[my][mx]) continue;
        const px = sx * TILE_SIZE;
        const py = sy * TILE_SIZE;
        const tile = d.get(mx, my);

        let tex;
        if (tile === TILE.WALL) {
          // 下が歩ける場所なら「崖の壁面」、そうでなければ「岩の上面」
          tex = d.isWalkable(mx, my + 1)
            ? getTileTexture(theme, 'wallFace')
            : getTileTexture(theme, 'wallTop');
        } else if (tile === TILE.CORRIDOR) {
          tex = getTileTexture(theme, 'corridor');
        } else {
          tex = getTileTexture(theme, 'floor');
        }
        ctx.drawImage(tex, px, py, TILE_SIZE, TILE_SIZE);

        // 階段（穴＋はしご）
        if (tile === TILE.STAIRS) {
          ctx.drawImage(getSprite('stairs'), px, py, TILE_SIZE, TILE_SIZE);
        }

        // 探索済みだが今見えていない場所は暗く
        if (!game.visible[my][mx]) {
          ctx.fillStyle = 'rgba(4,4,20,0.55)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // ---- 床落ちアイテム ----
    for (const g of game.groundItems) {
      if (!game.visible[g.y] || !game.visible[g.y][g.x]) continue;
      const px = (g.x - camX) * TILE_SIZE;
      const py = (g.y - camY) * TILE_SIZE;
      const spr = g.gold !== undefined ? getSprite('coin') : getItemSprite(g.item);
      ctx.drawImage(spr, px, py, TILE_SIZE, TILE_SIZE);
    }

    // ---- モンスター ----
    for (const m of game.monsters) {
      if (!game.visible[m.y] || !game.visible[m.y][m.x]) continue;
      const px = (m.x - camX) * TILE_SIZE;
      const py = (m.y - camY) * TILE_SIZE;
      const yOff = (bob + m.x + m.y) % 2; // 個体ごとに位相をずらす
      this.drawShadow(px, py);
      this.drawSprite(getSprite(m.sprite || m.id), px, py - yOff, m.facing < 0);
      if (m.hp < m.maxHp) this.drawHpBar(px, py, m.hp / m.maxHp);
    }

    // ---- プレイヤー ----
    const ppx = (game.player.x - camX) * TILE_SIZE;
    const ppy = (game.player.y - camY) * TILE_SIZE;
    this.drawShadow(ppx, ppy);
    this.drawSprite(getSprite('player'), ppx, ppy - bob, game.player.facing < 0);

    this.renderMinimap(game);
  }

  drawSprite(spr, px, py, flip = false) {
    const ctx = this.ctx;
    if (flip) {
      ctx.save();
      ctx.translate(px + TILE_SIZE, py);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0, TILE_SIZE, TILE_SIZE);
      ctx.restore();
    } else {
      ctx.drawImage(spr, px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  drawShadow(px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 2, TILE_SIZE * 0.32, TILE_SIZE * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHpBar(px, py, ratio) {
    const ctx = this.ctx;
    const w = TILE_SIZE * 0.8;
    const x = px + (TILE_SIZE - w) / 2;
    const y = py - 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = ratio > 0.5 ? '#66bb6a' : ratio > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(x, y, w * Math.max(0, ratio), 3);
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
