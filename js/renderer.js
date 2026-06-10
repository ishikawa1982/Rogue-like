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

  render(game, now = Date.now()) {
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

    // ---- 画面ゆれ（被弾・かみなり・ゲームオーバー）----
    ctx.save();
    if (game.shake) {
      const st = (now - game.shake.start) / game.shake.ttl;
      if (st < 1) {
        const m = game.shake.mag * (1 - st);
        ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
      } else {
        game.shake = null;
      }
    }

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
      this.drawEntity(m, m.sprite || m.id, camX, camY, now);
      const px = (m.x - camX) * TILE_SIZE;
      const py = (m.y - camY) * TILE_SIZE;
      if (m.hp < m.maxHp) this.drawHpBar(px, py, m.hp / m.maxHp);
    }

    // ---- プレイヤー ----
    this.drawEntity(game.player, 'player', camX, camY, now);

    // ---- エフェクト（ダメージ数字・斬撃・消滅・レベルアップ）----
    this.drawEffects(game, camX, camY, now);

    ctx.restore(); // 画面ゆれの解除

    this.renderMinimap(game);
  }

  // キャラ1体を描画（歩行アニメ・踏み込み・被弾点滅つき）
  drawEntity(e, spriteKey, camX, camY, now) {
    let px = (e.x - camX) * TILE_SIZE;
    let py = (e.y - camY) * TILE_SIZE;

    // 攻撃の踏み込み（target方向へ出て戻る）
    if (e.attackAnim) {
      const t = (now - e.attackAnim.start) / 180;
      if (t < 1) {
        const f = Math.sin(Math.PI * t) * TILE_SIZE * 0.3;
        px += e.attackAnim.dx * f;
        py += e.attackAnim.dy * f;
      } else {
        e.attackAnim = null;
      }
    }

    // 歩行フレーム選択：直近220ms以内に移動していたら歩行絵
    const walking = now - (e.movedAt || 0) < 220;
    const frame = walking ? (e.stepFrame ? 2 : 1) : 0;
    const bob = walking ? 1 : 0; // 歩行中は1px浮く

    this.drawShadow(px, py);

    const spr = getSprite(spriteKey, null, frame);
    // 被弾点滅（白くフラッシュ）
    const hurt = now - (e.hurtAt || 0) < 160;
    this.drawSprite(spr, px, py - bob, e.facing < 0);
    if (hurt) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'lighter';
      this.drawSprite(spr, px, py - bob, e.facing < 0);
      ctx.restore();
    }
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

  // -----------------------------------------------------------
  // エフェクト描画
  // -----------------------------------------------------------
  drawEffects(game, camX, camY, now) {
    const ctx = this.ctx;
    for (const e of game.effects) {
      const age = now - e.start;
      const t = age / e.ttl;
      if (t >= 1 || t < 0) continue;
      const cx = (e.x - camX) * TILE_SIZE + TILE_SIZE / 2;
      const cy = (e.y - camY) * TILE_SIZE + TILE_SIZE / 2;

      if (e.type === 'damage' || e.type === 'heal') {
        const rise = t * 22;
        const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        const big = e.crit ? 22 : 17;
        ctx.font = `bold ${big}px "DotGothic16", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let txt, fill;
        if (e.type === 'heal') { txt = `+${e.value}`; fill = '#7CFC6A'; }
        else if (e.kind === 'player') { txt = `${e.value}`; fill = '#ff5a5a'; }
        else { txt = `${e.value}`; fill = e.crit ? '#ffe24a' : '#ffffff'; }
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.strokeText(txt, cx, cy - 10 - rise);
        ctx.fillStyle = fill;
        ctx.fillText(txt, cx, cy - 10 - rise);
        if (e.crit) {
          ctx.fillStyle = '#ffe24a';
          ctx.font = `bold 11px "DotGothic16", monospace`;
          ctx.strokeText('CRITICAL!', cx, cy - 28 - rise);
          ctx.fillText('CRITICAL!', cx, cy - 28 - rise);
        }
        ctx.restore();

      } else if (e.type === 'slash') {
        // 斬撃のきらめき（拡大しながら消える×印）
        const s = (0.4 + t * 0.9) * TILE_SIZE;
        const alpha = 1 - t;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = e.crit ? '#ffe24a' : '#ffffff';
        ctx.lineWidth = e.crit ? 4 : 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - s / 2, cy - s / 2);
        ctx.lineTo(cx + s / 2, cy + s / 2);
        ctx.moveTo(cx + s / 2, cy - s / 2);
        ctx.lineTo(cx - s / 2, cy + s / 2);
        ctx.stroke();
        ctx.restore();

      } else if (e.type === 'poof') {
        // 消滅：拡がる粒子リング
        ctx.save();
        const n = 8;
        const r = t * TILE_SIZE * 0.9;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = e.color || '#ffffff';
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const sz = 4 * (1 - t) + 1;
          ctx.fillRect(cx + Math.cos(a) * r - sz / 2, cy + Math.sin(a) * r - sz / 2, sz, sz);
        }
        ctx.restore();

      } else if (e.type === 'levelup') {
        const rise = t * 26;
        const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = `bold 16px "DotGothic16", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        const txt = e.text || 'LEVEL UP!';
        ctx.strokeText(txt, cx, cy - 24 - rise);
        ctx.fillStyle = '#ffe24a';
        ctx.fillText(txt, cx, cy - 24 - rise);
        ctx.restore();
      }
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
