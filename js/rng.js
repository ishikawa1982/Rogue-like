// =============================================================
// rng.js - 乱数ユーティリティ
// =============================================================

// min〜max（両端含む）の整数
export function randInt(min, max) {
  if (max < min) max = min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列からランダムに1つ
export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 確率p(0〜1)でtrue
export function chance(p) {
  return Math.random() < p;
}

// 配列をシャッフル（破壊的・新配列を返す）
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
