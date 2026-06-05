// =============================================================
// dungeon.js - ダンジョン自動生成
//   グリッドを区画(グリッドルーム)に分割し、各区画に部屋を配置、
//   隣接区画を通路でつなぐ「グリッド分割方式」。
//   風来のシレン系の典型的なダンジョン生成手法。
// =============================================================
import { TILE } from './data.js';
import { randInt, choice, shuffle } from './rng.js';

export const MAP_W = 48;
export const MAP_H = 36;

export class Dungeon {
  constructor(w = MAP_W, h = MAP_H) {
    this.w = w;
    this.h = h;
    this.tiles = [];          // 2次元配列 [y][x]
    this.rooms = [];          // {x,y,w,h, cx,cy} 部屋情報
    this.stairs = { x: 0, y: 0 };
    this.generate();
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return TILE.WALL;
    return this.tiles[y][x];
  }

  set(x, y, t) {
    if (this.inBounds(x, y)) this.tiles[y][x] = t;
  }

  isWalkable(x, y) {
    const t = this.get(x, y);
    return t === TILE.FLOOR || t === TILE.CORRIDOR || t === TILE.STAIRS;
  }

  // 床(部屋)タイルかどうか
  isRoomFloor(x, y) {
    return this.get(x, y) === TILE.FLOOR || this.get(x, y) === TILE.STAIRS;
  }

  // ある座標が属する部屋を返す（なければnull）
  roomAt(x, y) {
    for (const r of this.rooms) {
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
    }
    return null;
  }

  generate() {
    // 全タイルを壁で初期化
    this.tiles = Array.from({ length: this.h }, () =>
      Array.from({ length: this.w }, () => TILE.WALL)
    );
    this.rooms = [];

    // マップを cols x rows のグリッド区画に分割
    const cols = 3;
    const rows = 2;
    const cellW = Math.floor(this.w / cols);
    const cellH = Math.floor(this.h / rows);

    const grid = []; // grid[ry][rx] = room
    for (let ry = 0; ry < rows; ry++) {
      grid[ry] = [];
      for (let rx = 0; rx < cols; rx++) {
        // 区画内に余白を持たせて部屋を作る
        const margin = 2;
        const maxRw = cellW - margin * 2;
        const maxRh = cellH - margin * 2;
        const rw = randInt(5, Math.max(6, maxRw));
        const rh = randInt(4, Math.max(5, maxRh));
        const ox = rx * cellW + margin;
        const oy = ry * cellH + margin;
        const rxPos = ox + randInt(0, Math.max(0, maxRw - rw));
        const ryPos = oy + randInt(0, Math.max(0, maxRh - rh));

        const room = {
          x: rxPos, y: ryPos, w: rw, h: rh,
          cx: rxPos + Math.floor(rw / 2),
          cy: ryPos + Math.floor(rh / 2),
          gx: rx, gy: ry,
        };
        this.carveRoom(room);
        this.rooms.push(room);
        grid[ry][rx] = room;
      }
    }

    // 隣接する区画同士を通路でつなぐ（横方向）
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols - 1; rx++) {
        this.connectRooms(grid[ry][rx], grid[ry][rx + 1]);
      }
    }
    // 縦方向の接続（各列で1つ）
    for (let rx = 0; rx < cols; rx++) {
      const ry = randInt(0, rows - 1);
      if (ry + 1 < rows) this.connectRooms(grid[ry][rx], grid[ry + 1][rx]);
    }

    // 階段を最後の部屋付近に配置
    const stairRoom = choice(this.rooms);
    this.stairs = {
      x: stairRoom.x + randInt(1, stairRoom.w - 2),
      y: stairRoom.y + randInt(1, stairRoom.h - 2),
    };
    this.set(this.stairs.x, this.stairs.y, TILE.STAIRS);
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.set(x, y, TILE.FLOOR);
      }
    }
  }

  // 2部屋の中心をL字通路で接続
  connectRooms(a, b) {
    let x = a.cx, y = a.cy;
    const tx = b.cx, ty = b.cy;
    const horizFirst = Math.random() < 0.5;

    const carve = () => {
      if (this.get(x, y) === TILE.WALL) this.set(x, y, TILE.CORRIDOR);
    };

    if (horizFirst) {
      while (x !== tx) { x += Math.sign(tx - x); carve(); }
      while (y !== ty) { y += Math.sign(ty - y); carve(); }
    } else {
      while (y !== ty) { y += Math.sign(ty - y); carve(); }
      while (x !== tx) { x += Math.sign(tx - x); carve(); }
    }
  }

  // ランダムな歩行可能タイル（部屋の床）を返す
  randomFloor(exclude = []) {
    for (let tries = 0; tries < 500; tries++) {
      const room = choice(this.rooms);
      const x = room.x + randInt(1, room.w - 2);
      const y = room.y + randInt(1, room.h - 2);
      if (this.get(x, y) !== TILE.FLOOR) continue;
      if (exclude.some(e => e.x === x && e.y === y)) continue;
      return { x, y };
    }
    return { x: this.rooms[0].cx, y: this.rooms[0].cy };
  }
}
