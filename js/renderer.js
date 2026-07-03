// =============================================================
// renderer.js - Canvas描画（ドット絵スプライト・タイルテクスチャ）
//   32pxドット絵のスーファミ風レンダラー。
//   ・タイル間のなめらか移動補間＋スムーズなカメラ追従
//   ・松明のゆらぐ動的ライティング（明暗マップ＋暖色グロー）
//   ・パーティクル（環境の塵・砂煙・撃破バースト・回復の光）
//   ・方向つき斬撃スイング、ダメージ数字のポップ演出
//   ・フロア移動のアイリスワイプ、画面フラッシュ、ビネット
// =============================================================
import { TILE } from './data.js';
import {
  getSprite, getItemSprite, getTileTexture, getDecoTexture, getTorchSprite,
  themeForFloor, spriteExists, hash, TILE_THEMES, TILE_VARIANTS, DECO_COUNT,
} from './sprites.js';

export const TILE_SIZE = 32;
const TS = TILE_SIZE;
const MOVE_MS = 130;   // 1マス移動の補間時間
const IRIS_MS = 700;   // フロア移動アイリスワイプ

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class Renderer {
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimap = minimap;
    this.mctx = minimap.getContext('2d');
    this.dpr = 1;

    // カメラ（ワールドpx座標）
    this.camX = null;
    this.camY = null;
    this.lastTime = 0;

    // パーティクル（renderer側で完結する演出）
    this.particles = [];
    this.motes = [];      // 環境にただよう塵・きらめき

    // 明暗マップ用の小さなオフスクリーン（タイル解像度で描き拡大）
    this.lightCanvas = document.createElement('canvas');
    this.lctx = this.lightCanvas.getContext('2d');
    this.lumDungeon = null; // どのダンジョンの輝度マップか
    this.lum = null;        // Float32Array: タイルごとの現在輝度（時間平滑）

    // フロアごとの松明位置キャッシュ
    this.torchDungeon = null;
    this.torches = [];

    this.vignette = null; // サイズごとに作り直すビネット
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.vignette = null;
  }

  // デバイスピクセルに揃えて座標を丸める（ドットのにじみ防止）
  snap(v) { return Math.round(v * this.dpr) / this.dpr; }

  // -----------------------------------------------------------
  // エンティティの補間位置（タイル単位の小数）
  // -----------------------------------------------------------
  entityPos(e, now) {
    const t = clamp((now - (e.movedAt || 0)) / MOVE_MS, 0, 1);
    const fx = e.fromX ?? e.x;
    const fy = e.fromY ?? e.y;
    const k = 1 - (1 - t) * (1 - t); // easeOutQuad
    return { x: lerp(fx, e.x, k), y: lerp(fy, e.y, k), t };
  }

  render(game, now = Date.now()) {
    const ctx = this.ctx;
    const d = game.dungeon;
    const dpr = this.dpr;
    const W = this.canvas.width / dpr;
    const H = this.canvas.height / dpr;
    const dt = Math.min(0.05, this.lastTime ? (now - this.lastTime) / 1000 : 0.016);
    this.lastTime = now;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false; // ドット絵をくっきり拡大

    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // ---- フロアが変わったらキャッシュ類を作り直す ----
    if (this.lumDungeon !== d) {
      this.lumDungeon = d;
      this.lum = new Float32Array(d.w * d.h);
      this.camX = null; // カメラは即ジャンプ
      this.particles.length = 0;
      this.motes.length = 0;
      this.scanTorches(d);
    }

    // ---- カメラ：プレイヤー補間位置をなめらかに追う ----
    const pp = this.entityPos(game.player, now);
    const maxCamX = Math.max(0, d.w * TS - W);
    const maxCamY = Math.max(0, d.h * TS - H + 4 * TS); // 下端はログぶん余裕
    const tx = clamp(pp.x * TS + TS / 2 - W / 2, 0, maxCamX);
    const ty = clamp(pp.y * TS + TS / 2 - H / 2, 0, maxCamY);
    if (this.camX === null) { this.camX = tx; this.camY = ty; }
    const ck = 1 - Math.exp(-dt * 10);
    this.camX += (tx - this.camX) * ck;
    this.camY += (ty - this.camY) * ck;
    const camX = this.snap(this.camX);
    const camY = this.snap(this.camY);

    const themeIdx = themeForFloor(game.floor);
    const theme = TILE_THEMES[themeIdx];

    // 表示タイル範囲
    const x0 = Math.max(0, Math.floor(camX / TS));
    const y0 = Math.max(0, Math.floor(camY / TS));
    const x1 = Math.min(d.w - 1, Math.ceil((camX + W) / TS));
    const y1 = Math.min(d.h - 1, Math.ceil((camY + H) / TS));

    // 新しいエフェクトからパーティクルを起こす
    this.spawnFromEffects(game, now);
    this.updateMotes(game, dt, now, theme, x0, y0, x1, y1);

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
    const torchFrame = Math.floor(now / 130);
    const visibleTorches = []; // {x,y} このフレームで光る松明
    for (let my = y0; my <= y1; my++) {
      for (let mx = x0; mx <= x1; mx++) {
        if (!game.explored[my][mx]) continue;
        const px = this.snap(mx * TS - camX);
        const py = this.snap(my * TS - camY);
        const tile = d.get(mx, my);
        const variant = Math.floor(hash(mx * 3 + 11, my * 7 + 29) * TILE_VARIANTS);

        let isFace = false;
        let tex;
        if (tile === TILE.WALL) {
          // 下が歩ける場所なら「崖の壁面」、そうでなければ「岩の上面」
          isFace = d.isWalkable(mx, my + 1);
          tex = getTileTexture(themeIdx, isFace ? 'wallFace' : 'wallTop', variant);
        } else if (tile === TILE.CORRIDOR) {
          tex = getTileTexture(themeIdx, 'corridor', variant);
        } else {
          tex = getTileTexture(themeIdx, 'floor', variant);
        }
        ctx.drawImage(tex, px, py, TS, TS);

        if (tile !== TILE.WALL) {
          // 床の装飾（部屋の床のみ・まばら）
          if (tile === TILE.FLOOR && hash(mx * 13 + 5, my * 17 + 3) < 0.10) {
            const idx = Math.floor(hash(mx * 29 + 1, my * 31 + 7) * DECO_COUNT);
            ctx.drawImage(getDecoTexture(themeIdx, idx), px, py, TS, TS);
          }
          // 壁ぎわの接地影（上に壁があれば落ち影で立体感）
          if (d.get(mx, my - 1) === TILE.WALL) {
            const g = ctx.createLinearGradient(0, py, 0, py + 12);
            g.addColorStop(0, 'rgba(0,0,10,0.34)');
            g.addColorStop(1, 'rgba(0,0,10,0)');
            ctx.fillStyle = g;
            ctx.fillRect(px, py, TS, 12);
          }
          if (d.get(mx - 1, my) === TILE.WALL) {
            const g = ctx.createLinearGradient(px, 0, px + 8, 0);
            g.addColorStop(0, 'rgba(0,0,10,0.20)');
            g.addColorStop(1, 'rgba(0,0,10,0)');
            ctx.fillStyle = g;
            ctx.fillRect(px, py, 8, TS);
          }
        } else if (isFace && this.isTorchAt(mx, my)) {
          // 壁面の松明（ゆらめく3フレーム）
          const f = (torchFrame + Math.floor(hash(mx, my) * 3)) % 3;
          ctx.drawImage(getTorchSprite(f), px, py, TS, TS);
          if (game.visible[my][mx] || (d.inBounds(mx, my + 1) && game.visible[my + 1][mx])) {
            visibleTorches.push({ x: mx, y: my });
          }
        }

        // 階段（穴＋はしご）＋うっすら光る
        if (tile === TILE.STAIRS) {
          ctx.drawImage(getSprite('stairs'), px, py, TS, TS);
        }
      }
    }

    // ---- 床落ちアイテム（ふわふわ浮遊＋足元の影）----
    for (const g of game.groundItems) {
      if (!game.visible[g.y] || !game.visible[g.y][g.x]) continue;
      const px = this.snap(g.x * TS - camX);
      const py = this.snap(g.y * TS - camY);
      const bob = Math.sin(now / 300 + g.x * 7 + g.y * 13) * 2;
      const spr = g.gold !== undefined ? getSprite('coin') : getItemSprite(g.item);
      this.drawShadow(px, py, 0.24, 1 - bob * 0.06);
      ctx.drawImage(spr, px, this.snap(py - 3 + bob), TS, TS);
    }

    // ---- エンティティ（y座標でソートして重なりを正しく）----
    const drawables = [];
    for (const m of game.monsters) {
      if (!game.visible[m.y] || !game.visible[m.y][m.x]) continue;
      drawables.push(m);
    }
    drawables.push(game.player);
    drawables.sort((a, b) => this.entityPos(a, now).y - this.entityPos(b, now).y);
    for (const e of drawables) {
      const isPlayer = e === game.player;
      this.drawEntity(e, isPlayer ? 'player' : (e.sprite || e.id), camX, camY, now);
      if (!isPlayer && e.hp < e.maxHp) {
        const ep = this.entityPos(e, now);
        this.drawHpBar(e, ep.x * TS - camX, ep.y * TS - camY, dt);
      }
    }

    // ---- パーティクル（塵・砂煙・火花など）----
    this.updateAndDrawParticles(dt, camX, camY, game, now);

    // ---- ライティング（明暗マップ＋光源グロー）----
    this.drawLighting(game, d, now, dt, camX, camY, x0, y0, x1, y1, pp, visibleTorches);
    this.drawGlows(game, d, now, camX, camY, pp, visibleTorches, theme);

    // ---- エフェクト（ダメージ数字・斬撃・消滅・レベルアップ）----
    this.drawEffects(game, camX, camY, now);

    ctx.restore(); // 画面ゆれの解除

    // ---- 画面全体の演出（ワイプ・フラッシュ・ビネット）----
    this.drawIris(game, now, W, H, pp, camX, camY);
    this.drawFlash(game, now, W, H);
    this.drawVignette(W, H);

    this.renderMinimap(game, now);
  }

  // -----------------------------------------------------------
  // 松明の配置（壁面タイルからハッシュで決定的に選ぶ）
  // -----------------------------------------------------------
  scanTorches(d) {
    this.torchDungeon = d;
    this.torches = [];
    this.torchSet = new Set();
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        if (d.get(x, y) !== TILE.WALL) continue;
        if (!d.isWalkable(x, y + 1)) continue; // 壁面のみ
        if (hash(x * 5 + 1, y * 7 + 2) < 0.07 && !this.torchSet.has(`${x - 1},${y}`)) {
          this.torches.push({ x, y });
          this.torchSet.add(`${x},${y}`);
        }
      }
    }
  }

  isTorchAt(x, y) {
    return this.torchSet && this.torchSet.has(`${x},${y}`);
  }

  // -----------------------------------------------------------
  // ライティング：タイル解像度の明暗マップを平滑補間で拡大描画
  // -----------------------------------------------------------
  drawLighting(game, d, now, dt, camX, camY, x0, y0, x1, y1, pp, torches) {
    const ctx = this.ctx;
    const gw = x1 - x0 + 1;
    const gh = y1 - y0 + 1;
    if (gw <= 0 || gh <= 0) return;
    if (this.lightCanvas.width !== gw || this.lightCanvas.height !== gh) {
      this.lightCanvas.width = gw;
      this.lightCanvas.height = gh;
    }

    // プレイヤーの松明：半径がゆらぐ
    const flick = 1 + Math.sin(now * 0.011) * 0.03 + Math.sin(now * 0.027 + 1.7) * 0.03;
    const radius = 7.5 * flick;
    const smoothK = 1 - Math.exp(-dt * 9); // 視界変化をふわっと反映

    const img = this.lctx.createImageData(gw, gh);
    const data = img.data;
    for (let my = y0; my <= y1; my++) {
      for (let mx = x0; mx <= x1; mx++) {
        const vis = game.visible[my][mx];
        const exp = game.explored[my][mx];
        // 記憶している場所はうっすら、見えている場所は明るく
        const target = vis ? 1 : (exp ? 0.5 : 0);
        const li = my * d.w + mx;
        this.lum[li] += (target - this.lum[li]) * smoothK;
        const lum = this.lum[li];

        // プレイヤー光の減衰
        const dx = mx + 0.5 - (pp.x + 0.5);
        const dy = my + 0.5 - (pp.y + 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const fall = Math.max(0, 1 - dist / radius);
        let light = lum * (0.42 + 0.62 * Math.pow(fall, 1.2));

        // 松明の局所光
        for (const t of torches) {
          const tdx = mx - t.x, tdy = my - (t.y + 0.6);
          const td = Math.sqrt(tdx * tdx + tdy * tdy);
          if (td < 3.4) light += lum * 0.5 * (1 - td / 3.4) * flick;
        }
        // 階段の金色の気配
        const sdx = mx - d.stairs.x, sdy = my - d.stairs.y;
        const sd = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sd < 2.4 && exp) light += lum * 0.3 * (1 - sd / 2.4);

        light = clamp(light, 0, 1);
        const alpha = (1 - light) * (exp ? 0.88 : 1);
        const idx = ((my - y0) * gw + (mx - x0)) * 4;
        data[idx] = 6;
        data[idx + 1] = 6;
        data[idx + 2] = 24;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }
    this.lctx.putImageData(img, 0, 0);

    // タイル解像度→画面へ、バイリニアでなめらかに拡大
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.lightCanvas, 0, 0, gw, gh,
      x0 * TS - camX, y0 * TS - camY, gw * TS, gh * TS);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  // 光源の暖色グロー（加算合成のラジアルグラデーション）
  drawGlows(game, d, now, camX, camY, pp, torches, theme) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const radial = (cx, cy, r, color, a) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `${color}${a})`);
      g.addColorStop(1, `${color}0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    const flick = 1 + Math.sin(now * 0.013) * 0.06 + Math.sin(now * 0.031 + 2.1) * 0.05;

    // プレイヤーの持つあかり（ほんのり暖色）
    radial(pp.x * TS + TS / 2 - camX, pp.y * TS + TS / 2 - camY, TS * 4.6 * flick, theme.glow, 0.10);

    // 壁の松明
    for (const t of torches) {
      radial(t.x * TS + TS / 2 - camX, t.y * TS + TS * 0.45 - camY, TS * 2.4 * flick, 'rgba(255,150,60,', 0.20);
    }

    // 階段の金色パルス
    const pulse = 0.10 + 0.06 * Math.sin(now / 350);
    if (game.explored[d.stairs.y] && game.explored[d.stairs.y][d.stairs.x]) {
      radial(d.stairs.x * TS + TS / 2 - camX, d.stairs.y * TS + TS / 2 - camY, TS * 1.8, 'rgba(255,220,90,', pulse);
    }
    ctx.restore();
  }

  // -----------------------------------------------------------
  // キャラ1体を描画（補間移動・ホップ・踏み込み・被弾点滅つき）
  // -----------------------------------------------------------
  drawEntity(e, spriteKey, camX, camY, now) {
    const ep = this.entityPos(e, now);
    let px = ep.x * TS - camX;
    let py = ep.y * TS - camY;

    // 攻撃の踏み込み（target方向へ出て戻る）
    if (e.attackAnim) {
      const t = (now - e.attackAnim.start) / 180;
      if (t < 1) {
        const f = Math.sin(Math.PI * t) * TS * 0.3;
        px += e.attackAnim.dx * f;
        py += e.attackAnim.dy * f;
      } else {
        e.attackAnim = null;
      }
    }

    // 歩行フレーム：移動補間中＋少し余韻。1歩ごとに小さくホップ
    const walking = now - (e.movedAt || 0) < Math.max(MOVE_MS, 220);
    const frame = walking ? (e.stepFrame ? 2 : 1) : 0;
    const hop = ep.t < 1 ? Math.sin(Math.PI * ep.t) * 2.5 : 0;

    // 向きに応じてスプライト/反転を決定
    //   down  : 正面（基本スプライト）
    //   up    : 背面（専用 _up があれば使用、なければ顔を消した自動背面）
    //   side  : 横向き（専用 _side があれば使用＋左右反転、なければ正面を反転）
    const dir = e.dir || 'down';
    let spr, flip = false;
    if (dir === 'up') {
      if (spriteExists(spriteKey + '_up')) spr = getSprite(spriteKey + '_up', null, frame);
      else spr = getSprite(spriteKey, null, frame, 'back');
    } else if (dir === 'side') {
      flip = e.facing < 0;
      const sideKey = spriteKey + '_side';
      spr = spriteExists(sideKey) ? getSprite(sideKey, null, frame) : getSprite(spriteKey, null, frame);
    } else {
      spr = getSprite(spriteKey, null, frame);
    }

    px = this.snap(px);
    py = this.snap(py);
    this.drawShadow(px, py, 0.30, 1 - hop * 0.05);

    // 被弾点滅（白くフラッシュ）
    const hurt = now - (e.hurtAt || 0) < 160;
    this.drawSprite(spr, px, this.snap(py - hop), flip);
    if (hurt) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.globalCompositeOperation = 'lighter';
      this.drawSprite(spr, px, this.snap(py - hop), flip);
      ctx.restore();
    }
  }

  drawSprite(spr, px, py, flip = false) {
    const ctx = this.ctx;
    if (flip) {
      ctx.save();
      ctx.translate(px + TS, py);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0, TS, TS);
      ctx.restore();
    } else {
      ctx.drawImage(spr, px, py, TS, TS);
    }
  }

  // -----------------------------------------------------------
  // パーティクル
  // -----------------------------------------------------------
  addParticle(p) {
    if (this.particles.length > 300) this.particles.shift();
    this.particles.push({ born: Date.now(), g: 0, size: 2, ...p });
  }

  // gameのeffectsキューから1回だけパーティクルを起こす
  spawnFromEffects(game, now) {
    for (const e of game.effects) {
      if (e._spawned) continue;
      e._spawned = true;
      const cx = e.x * TS + TS / 2;
      const cy = e.y * TS + TS / 2;

      if (e.type === 'dust') {
        // 足元の砂ぼこり
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          this.addParticle({
            x: cx + (Math.random() - 0.5) * 8, y: e.y * TS + TS - 4,
            vx: Math.cos(a) * 12, vy: -8 - Math.random() * 10,
            ttl: 300 + Math.random() * 150, size: 2, color: 'rgba(200,190,170,', a0: 0.5,
          });
        }
      } else if (e.type === 'poof') {
        // 撃破：色つき破片が飛び散る
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
          const sp = 40 + Math.random() * 70;
          this.addParticle({
            x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
            g: 160, ttl: 400 + Math.random() * 250, size: 2 + (Math.random() < 0.4 ? 1 : 0),
            colorHex: e.color || '#ffffff', a0: 1,
          });
        }
      } else if (e.type === 'heal') {
        // 回復：緑の光が立ちのぼる
        for (let i = 0; i < 8; i++) {
          this.addParticle({
            x: cx + (Math.random() - 0.5) * 22, y: cy + 8 + Math.random() * 8,
            vx: (Math.random() - 0.5) * 6, vy: -28 - Math.random() * 22,
            ttl: 550 + Math.random() * 250, size: 2, color: 'rgba(130,250,120,', a0: 0.95, twinkle: true,
          });
        }
      } else if (e.type === 'levelup') {
        // レベルアップ：金色の光の柱
        for (let i = 0; i < 16; i++) {
          this.addParticle({
            x: cx + (Math.random() - 0.5) * 26, y: cy + 10 + Math.random() * 6,
            vx: (Math.random() - 0.5) * 8, vy: -45 - Math.random() * 45,
            ttl: 650 + Math.random() * 300, size: 2 + (i % 2), color: 'rgba(255,225,90,', a0: 1, twinkle: true,
          });
        }
      } else if (e.type === 'slash') {
        // 斬撃の火花
        const bx = (e.dx || 0), by = (e.dy || 0);
        for (let i = 0; i < 6; i++) {
          const a = Math.atan2(by, bx || 1) + (Math.random() - 0.5) * 1.6;
          const sp = 60 + Math.random() * 80;
          this.addParticle({
            x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            g: 140, ttl: 220 + Math.random() * 160, size: 2,
            color: e.crit ? 'rgba(255,226,74,' : 'rgba(255,255,255,', a0: 0.95,
          });
        }
      }
    }
  }

  // 環境の塵・きらめき（テーマ色で可視タイルの上をただよう）
  updateMotes(game, dt, now, theme, x0, y0, x1, y1) {
    const want = 40;
    while (this.motes.length < want) {
      this.motes.push({ x: 0, y: 0, vy: 0, phase: Math.random() * 10, ttl: 0, born: 0 });
    }
    for (const m of this.motes) {
      const dead = now - m.born > m.ttl;
      const tileX = Math.floor(m.x / TS);
      const tileY = Math.floor(m.y / TS);
      const out = tileX < x0 || tileX > x1 || tileY < y0 || tileY > y1;
      if (dead || out) {
        // 可視タイルのどこかに湧き直す
        for (let tries = 0; tries < 8; tries++) {
          const mx = x0 + Math.floor(Math.random() * (x1 - x0 + 1));
          const my = y0 + Math.floor(Math.random() * (y1 - y0 + 1));
          if (game.visible[my] && game.visible[my][mx] && game.dungeon.isWalkable(mx, my)) {
            m.x = mx * TS + Math.random() * TS;
            m.y = my * TS + Math.random() * TS;
            m.vy = -(3 + Math.random() * 7);
            m.vx = (Math.random() - 0.5) * 5;
            m.ttl = 2500 + Math.random() * 2500;
            m.born = now;
            m.color = theme.mote[Math.floor(Math.random() * theme.mote.length)];
            break;
          }
        }
        continue;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
  }

  updateAndDrawParticles(dt, camX, camY, game, now) {
    const ctx = this.ctx;

    // 環境の塵（可視タイル上のみ、ふわっと明滅）
    for (const m of this.motes) {
      if (!m.ttl) continue;
      const tileX = Math.floor(m.x / TS);
      const tileY = Math.floor(m.y / TS);
      if (!game.visible[tileY] || !game.visible[tileY][tileX]) continue;
      const t = (now - m.born) / m.ttl;
      if (t >= 1) continue;
      const tw = Math.pow(Math.sin(m.phase + now / 480), 2);
      const alpha = Math.sin(Math.PI * t) * 0.45 * (0.4 + 0.6 * tw);
      ctx.fillStyle = `${m.color}${alpha.toFixed(3)})`;
      ctx.fillRect(this.snap(m.x - camX), this.snap(m.y - camY), 2, 2);
    }

    // イベント系パーティクル
    const alive = [];
    for (const p of this.particles) {
      const age = now - p.born;
      const t = age / p.ttl;
      if (t >= 1) continue;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      alive.push(p);

      let alpha = (p.a0 ?? 1) * (1 - t);
      if (p.twinkle) alpha *= 0.5 + 0.5 * Math.sin(now / 60 + p.born);
      if (p.colorHex) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.colorHex;
        ctx.fillRect(this.snap(p.x - camX), this.snap(p.y - camY), p.size, p.size);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = `${p.color}${alpha.toFixed(3)})`;
        ctx.fillRect(this.snap(p.x - camX), this.snap(p.y - camY), p.size, p.size);
      }
    }
    this.particles = alive;
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
      const cx = e.x * TS + TS / 2 - camX;
      const cy = e.y * TS + TS / 2 - camY;

      if (e.type === 'damage' || e.type === 'heal') {
        const rise = t * 22;
        const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        // 出現時にポンと拡大（easeOutBack風）
        const pop = t < 0.18 ? (() => { const q = t / 0.18; return 0.4 + 0.6 * (1 + 1.9 * Math.pow(q - 1, 3) + 0.9 * Math.pow(q - 1, 2)); })() : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(cx, cy - 10 - rise);
        ctx.scale(pop, pop);
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
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = fill;
        ctx.fillText(txt, 0, 0);
        if (e.crit) {
          ctx.fillStyle = '#ffe24a';
          ctx.font = `bold 11px "DotGothic16", monospace`;
          ctx.strokeText('CRITICAL!', 0, -18);
          ctx.fillText('CRITICAL!', 0, -18);
        }
        ctx.restore();

      } else if (e.type === 'slash') {
        // 方向つき斬撃スイング（三日月の軌跡＋グロー）
        const base = Math.atan2(e.dy || 0, (e.dx ?? 1) || 1);
        const sweep = -1.4 + t * 2.8; // 振り抜き
        const r = TS * (0.42 + t * 0.34);
        const alpha = 1 - t;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(base);
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';
        ctx.shadowColor = e.crit ? '#ffe24a' : '#ffffff';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = i === 0 ? (e.crit ? '#fff6c8' : '#ffffff')
            : (e.crit ? 'rgba(255,226,74,0.55)' : 'rgba(255,255,255,0.4)');
          ctx.lineWidth = (e.crit ? 4.5 : 3.5) - i;
          ctx.beginPath();
          ctx.arc(0, 0, r - i * 3, sweep - 0.9, sweep + 0.35);
          ctx.stroke();
        }
        ctx.restore();

      } else if (e.type === 'poof') {
        // 消滅：閃光＋広がるリング（破片はパーティクル側）
        ctx.save();
        const r = t * TS * 0.9;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = e.color || '#ffffff';
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        if (t < 0.25) {
          ctx.globalAlpha = (1 - t / 0.25) * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, TS * 0.35 * (1 - t / 0.25), 0, Math.PI * 2);
          ctx.fill();
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
        ctx.shadowColor = '#ffe24a';
        ctx.shadowBlur = 10;
        ctx.strokeText(txt, cx, cy - 24 - rise);
        ctx.fillStyle = '#ffe24a';
        ctx.fillText(txt, cx, cy - 24 - rise);
        ctx.restore();
      }
    }
  }

  // -----------------------------------------------------------
  // 画面全体の演出
  // -----------------------------------------------------------
  // フロア移動：黒からのアイリスワイプ（プレイヤー中心に開く円）
  drawIris(game, now, W, H, pp, camX, camY) {
    if (!game.enteredAt) return;
    const t = (now - game.enteredAt) / IRIS_MS;
    if (t >= 1) return;
    const ctx = this.ctx;
    const cx = pp.x * TS + TS / 2 - camX;
    const cy = pp.y * TS + TS / 2 - camY;
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 8;
    const k = 1 - Math.pow(1 - clamp(t, 0, 1), 3); // easeOutCubic
    ctx.save();
    ctx.fillStyle = '#000006';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(cx, cy, Math.max(0.01, maxR * k), 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }

  // 会心・レベルアップなどの一瞬の画面フラッシュ
  drawFlash(game, now, W, H) {
    if (!game.flash) return;
    const t = (now - game.flash.start) / game.flash.ttl;
    if (t >= 1) { game.flash = null; return; }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = game.flash.alpha * (1 - t);
    ctx.fillStyle = game.flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawVignette(W, H) {
    if (!this.vignette || this.vignette.w !== W || this.vignette.h !== H) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(W));
      c.height = Math.max(1, Math.round(H));
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      grad.addColorStop(0, 'rgba(0,0,10,0)');
      grad.addColorStop(1, 'rgba(0,0,10,0.38)');
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
      this.vignette = { canvas: c, w: W, h: H };
    }
    this.ctx.drawImage(this.vignette.canvas, 0, 0, W, H);
  }

  drawShadow(px, py, alpha = 0.30, scale = 1) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(px + TS / 2, py + TS - 2, TS * 0.32 * scale, TS * 0.10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // HPバー：黒フチ＋減った分が白く残ってスッと縮む
  drawHpBar(e, px, py, dt) {
    const ctx = this.ctx;
    const ratio = Math.max(0, e.hp / e.maxHp);
    if (e._hpDisp === undefined) e._hpDisp = ratio;
    e._hpDisp += (ratio - e._hpDisp) * Math.min(1, dt * 6);
    const w = TS * 0.8;
    const x = this.snap(px + (TS - w) / 2);
    const y = this.snap(py - 3);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    if (e._hpDisp > ratio) { // ダメージの残像
      ctx.fillStyle = 'rgba(255,240,220,0.85)';
      ctx.fillRect(x, y, w * e._hpDisp, 3);
    }
    ctx.fillStyle = ratio > 0.5 ? '#66bb6a' : ratio > 0.25 ? '#ffca28' : '#ef5350';
    ctx.fillRect(x, y, w * ratio, 3);
  }

  // -----------------------------------------------------------
  // ミニマップ
  // -----------------------------------------------------------
  renderMinimap(game, now = Date.now()) {
    const d = game.dungeon;
    const mc = this.minimap;
    const ctx = this.mctx;
    const pad = 4;
    const scale = Math.min((mc.width - pad * 2) / d.w, (mc.height - pad * 2) / d.h);
    const ox = pad + ((mc.width - pad * 2) - d.w * scale) / 2;
    const oy = pad + ((mc.height - pad * 2) - d.h * scale) / 2;
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, mc.width, mc.height);

    const cell = Math.ceil(scale);
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        if (!game.explored[y][x]) continue;
        const t = d.get(x, y);
        if (t === TILE.WALL) continue;
        const lit = game.visible[y][x];
        if (t === TILE.STAIRS) {
          // 階段は金色で明滅
          const blink = 0.6 + 0.4 * Math.sin(now / 250);
          ctx.fillStyle = `rgba(255,220,80,${blink.toFixed(2)})`;
        } else if (t === TILE.CORRIDOR) {
          ctx.fillStyle = lit ? '#4a5270' : '#343a52';
        } else {
          ctx.fillStyle = lit ? '#6a80b8' : '#4a5a86';
        }
        ctx.fillRect(ox + x * scale, oy + y * scale, cell, cell);
      }
    }
    // アイテム（可視のみ・シアン）
    ctx.fillStyle = '#4fd8e8';
    for (const g of game.groundItems) {
      if (!game.visible[g.y] || !game.visible[g.y][g.x]) continue;
      ctx.fillRect(ox + g.x * scale, oy + g.y * scale, cell, cell);
    }
    // モンスター（可視のみ・赤）
    ctx.fillStyle = '#ef5350';
    for (const m of game.monsters) {
      if (!game.visible[m.y] || !game.visible[m.y][m.x]) continue;
      ctx.fillRect(ox + m.x * scale, oy + m.y * scale, cell, cell);
    }
    // プレイヤー（白リング＋黄色で脈動）
    const px = ox + game.player.x * scale;
    const py = oy + game.player.y * scale;
    const pulse = 1 + 0.5 * Math.sin(now / 220);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(px - pulse, py - pulse, cell + pulse * 2, cell + pulse * 2);
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(px, py, cell + 1, cell + 1);
  }
}
