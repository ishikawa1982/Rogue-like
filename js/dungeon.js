// =============================================================
// dungeon.js - ダンジョン自動生成
//   グリッドを区画に分割し、各区画に部屋（または通路の分岐点）を置いて
//   隣接区画を通路でつなぐ「グリッド分割方式」。
//   区画の数はフロアごとに 3x2 / 4x2 / 3x3 / 4x3 から選ぶ。
// =============================================================
import { TILE } from './data.js';
import { randInt, choice, shuffle, chance } from './rng.js';

export const MAP_W = 48;
export const MAP_H = 36;

const GRIDS = [[3, 2], [4, 2], [3, 3], [4, 3]];

export class Dungeon {
  constructor(w = MAP_W, h = MAP_H) {
    this.w = w;
    this.h = h;
    this.tiles = [];          // 2次元配列 [y][x]
    this.rooms = [];          // {x,y,w,h, cx,cy} 部屋情報
    this.stairs = { x: 0, y: 0 };
    this.shopRoom = null;     // お店の部屋（game が設定）
    this.houseRoom = null;    // モンスターハウスの部屋（game が設定）
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

  inRoom(room, x, y) {
    return !!room && x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
  }

  generate() {
    // 部屋が4つ以上できるまで作り直す（お店・モンスターハウス・スタート・階段を分けるため）
    for (let tries = 0; tries < 20; tries++) {
      this.generateOnce();
      if (this.rooms.length >= 4) break;
    }
    // 階段
    const stairRoom = choice(this.rooms);
    this.stairs = {
      x: stairRoom.x + randInt(1, stairRoom.w - 2),
      y: stairRoom.y + randInt(1, stairRoom.h - 2),
    };
    this.set(this.stairs.x, this.stairs.y, TILE.STAIRS);
  }

  generateOnce() {
    this.tiles = Array.from({ length: this.h }, () =>
      Array.from({ length: this.w }, () => TILE.WALL)
    );
    this.rooms = [];

    const [cols, rows] = choice(GRIDS);
    const cellW = Math.floor(this.w / cols);
    const cellH = Math.floor(this.h / rows);
    const total = cols * rows;
    // 部屋を置かない区画（通路の分岐点になる）
    const junctions = new Set();
    const maxJunctions = Math.max(0, total - 5);
    for (let i = 0; i < total; i++) {
      if (junctions.size < maxJunctions && chance(0.2)) junctions.add(i);
    }

    const grid = [];
    for (let ry = 0; ry < rows; ry++) {
      grid[ry] = [];
      for (let rx = 0; rx < cols; rx++) {
        const margin = 2;
        const ox = rx * cellW + margin;
        const oy = ry * cellH + margin;
        const maxRw = cellW - margin * 2;
        const maxRh = cellH - margin * 2;
        if (junctions.has(ry * cols + rx)) {
          const jx = ox + randInt(1, Math.max(1, maxRw - 2));
          const jy = oy + randInt(1, Math.max(1, maxRh - 2));
          this.set(jx, jy, TILE.CORRIDOR);
          grid[ry][rx] = { cx: jx, cy: jy, junction: true };
          continue;
        }
        const rw = randInt(5, Math.max(5, maxRw));
        const rh = randInt(4, Math.max(4, maxRh));
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

    // 全区画をつなぐ全域木（ランダムDFS）＋ときどき余分な通路でループを作る
    const key = (x, y) => y * cols + x;
    const visited = new Set([key(0, 0)]);
    const stack = [[0, 0]];
    const linked = new Set();
    const link = (ax, ay, bx, by) => {
      const k = [key(ax, ay), key(bx, by)].sort((a, b) => a - b).join('-');
      if (linked.has(k)) return;
      linked.add(k);
      this.connectRooms(grid[ay][ax], grid[by][bx]);
    };
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nexts = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]])
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited.has(key(nx, ny)));
      if (!nexts.length) { stack.pop(); continue; }
      const [nx, ny] = nexts[0];
      visited.add(key(nx, ny));
      link(x, y, nx, ny);
      stack.push([nx, ny]);
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (x + 1 < cols && chance(0.25)) link(x, y, x + 1, y);
        if (y + 1 < rows && chance(0.25)) link(x, y, x, y + 1);
      }
    }
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.set(x, y, TILE.FLOOR);
      }
    }
  }

  // 2点（部屋の中心 or 分岐点）をL字通路で接続
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

  // 部屋の出入口（部屋のふちのタイルで、外側が通路につながっているもの）
  entrances(room) {
    const list = [];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        const edge = x === room.x || y === room.y || x === room.x + room.w - 1 || y === room.y + room.h - 1;
        if (!edge) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (!this.inRoom(room, nx, ny) && this.get(nx, ny) === TILE.CORRIDOR) {
            list.push({ x, y, ox: nx, oy: ny });
            break;
          }
        }
      }
    }
    return list;
  }

  // ランダムな部屋の床を返す
  //   exclude: 使えない座標の配列 / opts.rooms: 候補の部屋 / opts.avoidRooms: 除外する部屋
  randomFloor(exclude = [], opts = {}) {
    let rooms = opts.rooms || this.rooms;
    if (opts.avoidRooms) rooms = rooms.filter(r => !opts.avoidRooms.includes(r));
    if (!rooms.length) rooms = this.rooms;
    for (let tries = 0; tries < 500; tries++) {
      const room = choice(rooms);
      const x = room.x + randInt(0, room.w - 1);
      const y = room.y + randInt(0, room.h - 1);
      if (this.get(x, y) !== TILE.FLOOR) continue;
      if (exclude.some(e => e.x === x && e.y === y)) continue;
      return { x, y };
    }
    const r = rooms[0];
    return { x: r.cx, y: r.cy };
  }
}
