// =============================================================
// data.js - ゲーム内のマスターデータ（モンスター・アイテム定義）
//   王道ファンタジーの世界観：剣と魔法の地下迷宮
// =============================================================

// タイル種別
export const TILE = {
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  STAIRS: 3,
};

// アイテム種別
export const ITEM_TYPE = {
  WEAPON: 'weapon',   // 武器
  SHIELD: 'shield',   // 盾
  POTION: 'potion',   // ポーション
  SCROLL: 'scroll',   // スクロール
  WAND: 'wand',       // ワンド
  FOOD: 'food',       // 食料
  POT: 'pot',         // ポット（壺）
  RING: 'ring',       // リング（腕輪）
};

// 種別の表示名
export const TYPE_LABEL = {
  weapon: '武器', shield: '盾', potion: '薬', scroll: '巻物',
  wand: '杖', food: '食料', pot: '壺', ring: '腕輪',
};

// 未識別になりうる種別（同じ種類は1つ識別すると全部わかる）
export const UNIDENTIFIED_TYPES = ['potion', 'scroll', 'wand', 'ring', 'pot'];

// -------------------------------------------------------------
// エリア（3フロアごとに景色とBGMが変わる）
// -------------------------------------------------------------
export const AREAS = [
  { name: 'いにしえの石回廊', floors: [1, 3] },
  { name: '灰色の地下墓所',   floors: [4, 6] },
  { name: '苔むした遺跡',     floors: [7, 9] },
  { name: 'アルカナの深層',   floors: [10, 12] },
];

export function areaIndexForFloor(floor) {
  return Math.max(0, Math.min(AREAS.length - 1, Math.floor((floor - 1) / 3)));
}

// -------------------------------------------------------------
// フロア構成の確率
// -------------------------------------------------------------
export const SHOP_CHANCE = 0.20;      // お店が出るフロアの確率
export const MH_CHANCE = 0.15;        // モンスターハウスが出る確率
export const MH_MIN_FLOOR = 3;        // モンスターハウスが出はじめるフロア
export const MAX_FLOOR = 12;          // この階の階段を降りるとクリア
export const INVENTORY_MAX = 20;      // 持ち物の最大数

// -------------------------------------------------------------
// モンスター定義
//   minFloor: 出現する最小フロア / hp, atk: ステータス
//   exp: 経験値 / gold: 落とすゴールドの最大値
//   ai: 'chase'(追跡) / 'erratic'(ふらふら)
//   speed: 1=通常 / 2=倍速（1ターンに2回行動） / 0.5=鈍足（2ターンに1回）
//   special:
//     steal   … 持ち物かゴールドを盗んでワープで逃げる
//     weaken  … 攻撃が当たると ちから が下がることがある
//     hunger  … 攻撃が当たると 満腹度 が減ることがある
//     phase   … 壁の中を移動できる
//     arrow   … 離れた一直線上から矢を放つ
//     regen   … 毎ターンHPが回復する
//     breath  … 離れた一直線上から炎を吐く
//   sprite: アトラスのキー / color: 撃破時の破片やミニマップの色
// -------------------------------------------------------------
export const MONSTERS = [
  { id: 'slime',    name: 'スライム',         minFloor: 1,  hp: 6,  atk: 2,  exp: 2,  gold: 12,  ai: 'chase',   speed: 1,   color: '#58a0f0' },
  { id: 'bat',      name: 'ケイブバット',     minFloor: 1,  hp: 8,  atk: 3,  exp: 3,  gold: 12,  ai: 'erratic', speed: 1,   color: '#9a7a68' },
  { id: 'kobold',   name: 'コボルド',         minFloor: 2,  hp: 11, atk: 4,  exp: 4,  gold: 18,  ai: 'chase',   speed: 1,   color: '#b89060' },
  { id: 'goblin',   name: 'ゴブリンシーフ',   minFloor: 2,  hp: 10, atk: 3,  exp: 5,  gold: 40,  ai: 'chase',   speed: 1,   color: '#d05040', special: 'steal' },
  { id: 'scorpion', name: 'スコーピオン',     minFloor: 3,  hp: 13, atk: 4,  exp: 6,  gold: 20,  ai: 'chase',   speed: 1,   color: '#c0a050', special: 'weaken' },
  { id: 'wolf',     name: 'ウルフ',           minFloor: 4,  hp: 15, atk: 5,  exp: 8,  gold: 20,  ai: 'chase',   speed: 2,   color: '#a8a8b0' },
  { id: 'orc',      name: 'オークウォリアー', minFloor: 4,  hp: 22, atk: 7,  exp: 11, gold: 30,  ai: 'chase',   speed: 1,   color: '#b07858' },
  { id: 'ghost',    name: 'ゴースト',         minFloor: 5,  hp: 16, atk: 6,  exp: 12, gold: 25,  ai: 'chase',   speed: 1,   color: '#d8d8e8', special: 'phase' },
  { id: 'archer',   name: 'ダークアーチャー', minFloor: 6,  hp: 20, atk: 6,  exp: 15, gold: 36,  ai: 'chase',   speed: 1,   color: '#58a048', special: 'arrow' },
  { id: 'skeleton', name: 'スケルトンナイト', minFloor: 6,  hp: 28, atk: 9,  exp: 17, gold: 40,  ai: 'chase',   speed: 1,   color: '#e8e8d8' },
  { id: 'ghoul',    name: 'グール',           minFloor: 7,  hp: 30, atk: 9,  exp: 20, gold: 40,  ai: 'chase',   speed: 1,   color: '#607048', special: 'hunger' },
  { id: 'troll',    name: 'トロール',         minFloor: 8,  hp: 42, atk: 12, exp: 28, gold: 50,  ai: 'chase',   speed: 1,   color: '#3858c0', special: 'regen' },
  { id: 'golem',    name: 'アイアンゴーレム', minFloor: 9,  hp: 60, atk: 16, exp: 35, gold: 60,  ai: 'chase',   speed: 0.5, color: '#a0a4b0' },
  { id: 'wyvern',   name: 'ワイバーン',       minFloor: 10, hp: 48, atk: 15, exp: 42, gold: 80,  ai: 'chase',   speed: 2,   color: '#58c890' },
  { id: 'dragon',   name: 'ゴールドドラゴン', minFloor: 11, hp: 75, atk: 19, exp: 60, gold: 120, ai: 'chase',   speed: 1,   color: '#f0c040', special: 'breath' },
];
for (const m of MONSTERS) m.sprite = 'mon_' + m.id;

// お店の主人（ふだんは中立。泥棒すると倍速の強敵になる）
export const SHOPKEEPER = {
  id: 'shopkeeper', name: '店主', minFloor: 99, hp: 180, atk: 26, exp: 100, gold: 0,
  ai: 'chase', speed: 2, color: '#e0c080', sprite: 'mon_shopkeeper',
};

// -------------------------------------------------------------
// アイテム定義
//   price: お店での基本価格（売るときは約4割）
//   minFloor: 出はじめるフロア / weight: 同じ種別内での出やすさ
//   sprite: 見た目が固定のアイテムのアトラスキー（未識別品は見た目をシャッフル）
//   icon: 識別済みのとき右下に重ねるアイコン
// -------------------------------------------------------------
export const ITEMS = [
  // --- 武器（power=攻撃力補正） ---
  { id: 'dagger',     name: 'ダガー',         type: 'weapon', power: 2,  price: 150,  minFloor: 1, weight: 3, sprite: 'item_dagger',     doll: 'doll_w_dagger',     desc: '軽くて扱いやすい短剣。' },
  { id: 'shortsword', name: 'ショートソード', type: 'weapon', power: 3,  price: 300,  minFloor: 1, weight: 4, sprite: 'item_shortsword', doll: 'doll_w_shortsword', desc: '冒険者に定番の片手剣。' },
  { id: 'handaxe',    name: 'ハンドアックス', type: 'weapon', power: 5,  price: 600,  minFloor: 2, weight: 3, sprite: 'item_handaxe',    doll: 'doll_w_handaxe',    desc: '重みのある片手斧。' },
  { id: 'longsword',  name: 'ロングソード',   type: 'weapon', power: 6,  price: 800,  minFloor: 4, weight: 3, sprite: 'item_longsword',  doll: 'doll_w_longsword',  desc: '刀身の長いよく切れる剣。' },
  { id: 'greatsword', name: 'グレートソード', type: 'weapon', power: 8,  price: 1500, minFloor: 7, weight: 2, sprite: 'item_greatsword', doll: 'doll_w_greatsword', desc: '大きく重い両手剣。攻撃力が高い。' },
  { id: 'runeblade',  name: 'ルーンブレード', type: 'weapon', power: 10, price: 3000, minFloor: 9, weight: 1, sprite: 'item_runeblade',  doll: 'doll_w_runeblade',  desc: 'ルーン文字が青く光る伝説の剣。' },

  // --- 盾（power=防御力補正） ---
  { id: 'buckler', name: 'バックラー',       type: 'shield', power: 2, price: 150,  minFloor: 1, weight: 4, sprite: 'item_buckler', doll: 'doll_s_buckler', desc: '小さな丸盾。' },
  { id: 'heater',  name: 'ヒーターシールド', type: 'shield', power: 3, price: 300,  minFloor: 1, weight: 4, sprite: 'item_heater',  doll: 'doll_s_heater',  desc: '赤と黄色に塗られた盾。' },
  { id: 'knight',  name: 'ナイトシールド',   type: 'shield', power: 5, price: 700,  minFloor: 3, weight: 3, sprite: 'item_knight',  doll: 'doll_s_knight',  desc: '騎士団の紋章入りの盾。' },
  { id: 'large',   name: 'ラージシールド',   type: 'shield', power: 7, price: 1200, minFloor: 6, weight: 2, sprite: 'item_large',   doll: 'doll_s_large',   desc: '全身を守れる大きな盾。' },
  { id: 'mirror',  name: 'ミラーシールド',   type: 'shield', power: 9, price: 2500, minFloor: 9, weight: 1, sprite: 'item_mirror',  doll: 'doll_s_mirror',  desc: '鏡のように磨かれた伝説の盾。' },

  // --- ポーション ---
  { id: 'p_heal',     name: 'ヒールポーション',       type: 'potion', effect: 'heal',     value: 30,  price: 100, minFloor: 1, weight: 6, icon: 'icon_heal',      desc: 'HPを30回復する。HPが満タンなら最大HPが1増える。' },
  { id: 'p_extra',    name: 'エクストラポーション',   type: 'potion', effect: 'heal',     value: 100, price: 300, minFloor: 3, weight: 2, icon: 'icon_extraheal', desc: 'HPを100回復する。HPが満タンなら最大HPが2増える。' },
  { id: 'p_life',     name: 'ライフポーション',       type: 'potion', effect: 'life',     value: 5,   price: 500, minFloor: 2, weight: 1, icon: 'icon_life',      desc: '最大HPが5増える。' },
  { id: 'p_strength', name: 'ストレングスポーション', type: 'potion', effect: 'strength', value: 1,   price: 500, minFloor: 2, weight: 2, icon: 'icon_strength',  desc: 'ちからが1上がる。下がっていれば1回復する。' },
  { id: 'p_poison',   name: 'ポイズンポーション',     type: 'potion', effect: 'poison',   value: 3,   price: 100, minFloor: 1, weight: 3, icon: 'icon_poison',    desc: '毒入り。飲むと ちからが3下がる。' },
  { id: 'p_cure',     name: 'キュアポーション',       type: 'potion', effect: 'cure',     value: 0,   price: 200, minFloor: 2, weight: 2, icon: 'icon_cure',      desc: '下がった ちからを元に戻す。' },

  // --- スクロール ---
  { id: 's_map',      name: 'マップスクロール',       type: 'scroll', effect: 'map',      price: 250, minFloor: 1, weight: 4, icon: 'icon_map',       desc: 'フロアの地図と落ちているアイテムがわかる。' },
  { id: 's_identify', name: 'アイデンティファイ',     type: 'scroll', effect: 'identify', price: 150, minFloor: 1, weight: 5, icon: 'icon_identify',  desc: '持ち物を1つ選んで正体を調べる。' },
  { id: 's_thunder',  name: 'サンダースクロール',     type: 'scroll', effect: 'thunder',  price: 300, minFloor: 2, weight: 3, icon: 'icon_thunder',   desc: '見えている敵すべてに雷を落とす。' },
  { id: 's_teleport', name: 'テレポートスクロール',   type: 'scroll', effect: 'teleport', price: 200, minFloor: 1, weight: 3, icon: 'icon_teleport',  desc: 'フロアのどこかへワープする。' },
  { id: 's_enchant',  name: 'エンチャントスクロール', type: 'scroll', effect: 'enchant',  price: 500, minFloor: 3, weight: 2, icon: 'icon_enchant',   desc: '装備中の武器が+1される。' },
  { id: 's_protect',  name: 'プロテクトスクロール',   type: 'scroll', effect: 'protect',  price: 500, minFloor: 3, weight: 2, icon: 'icon_protect',   desc: '装備中の盾が+1される。' },

  // --- ワンド（いちばん近い見えている敵に向けて振る） ---
  { id: 'w_swap',      name: 'スワップワンド',     type: 'wand', effect: 'swap',      charges: 4, price: 500, minFloor: 1, weight: 3, icon: 'icon_swap',      desc: '敵と自分の位置を入れ替える。' },
  { id: 'w_blast',     name: 'ブラストワンド',     type: 'wand', effect: 'blast',     charges: 5, price: 400, minFloor: 1, weight: 3, icon: 'icon_blast',     desc: '敵を遠くへ吹き飛ばす。壁にぶつかるとダメージ。' },
  { id: 'w_lightning', name: 'ライトニングワンド', type: 'wand', effect: 'lightning', charges: 4, price: 700, minFloor: 3, weight: 2, icon: 'icon_lightning', desc: '稲妻で敵に大ダメージを与える。' },
  { id: 'w_warp',      name: 'ワープワンド',       type: 'wand', effect: 'warp',      charges: 4, price: 600, minFloor: 2, weight: 2, icon: 'icon_warp',      desc: '敵をフロアのどこかへ飛ばす。' },

  // --- 食料 ---
  { id: 'apple', name: 'アップル',   type: 'food', value: 30,  price: 50,  minFloor: 1, weight: 3, sprite: 'item_apple', desc: '満腹度が30回復する。' },
  { id: 'bread', name: 'パン',       type: 'food', value: 50,  price: 100, minFloor: 1, weight: 5, sprite: 'item_bread', desc: '満腹度が50回復する。' },
  { id: 'meat',  name: 'ビッグミート', type: 'food', value: 100, price: 300, minFloor: 2, weight: 2, sprite: 'item_meat',  desc: '満腹度が100回復する。お腹いっぱいのときに食べると最大満腹度が10増える。' },

  // --- ポット（壺）：アイテムを入れる。「割る」と中身が出てくる ---
  { id: 'pot_analyze', name: 'アナライズポット', type: 'pot', effect: 'analyze', price: 600, minFloor: 1, weight: 3, desc: '入れたアイテムの正体がわかる。割ると中身が出てくる。' },
  { id: 'pot_change',  name: 'チェンジポット',   type: 'pot', effect: 'change',  price: 800, minFloor: 2, weight: 2, desc: '入れたアイテムが別のアイテムに変わる。割ると中身が出てくる。' },

  // --- リング（腕輪：装備枠1つ） ---
  { id: 'r_heal',    name: 'ヒールリング',   type: 'ring', effect: 'heal',    price: 1500, minFloor: 2, weight: 2, icon: 'icon_regen',   desc: 'HPの回復が3倍速くなるが、お腹も2倍減りやすい。' },
  { id: 'r_sense',   name: 'サーチリング',   type: 'ring', effect: 'sense',   price: 1000, minFloor: 1, weight: 2, icon: 'icon_sense',   desc: 'フロアにいる敵の位置がすべてわかる。' },
  { id: 'r_stamina', name: 'スタミナリング', type: 'ring', effect: 'stamina', price: 1200, minFloor: 2, weight: 2, icon: 'icon_sustain', desc: '満腹度が減らなくなる。' },
];
for (const it of ITEMS) {
  if (UNIDENTIFIED_TYPES.includes(it.type)) it.unidentified = true;
}

// アイテム種別ごとの出現率（床落ち・お店・モンスターハウス共通）
export const ITEM_TYPE_WEIGHTS = [
  ['weapon', 11], ['shield', 10], ['potion', 22], ['scroll', 17],
  ['wand', 8], ['food', 17], ['pot', 7], ['ring', 5],
];

// 未識別アイテムの見た目（名前の候補）。アトラスの見た目キーと対応
export const LOOK_NAMES = {
  potion: {
    ruby: 'あかいポーション', brilliant_blue: 'あおいポーション', golden: 'きんいろのポーション',
    murky: 'にごったポーション', bubbly: 'あわだつポーション', cloudy: 'くもったポーション',
    magenta: 'むらさきのポーション', cyan: 'みずいろのポーション', orange: 'だいだいいろのポーション',
    white: 'しろいポーション', black: 'くろいポーション', sky_blue: 'そらいろのポーション',
  },
  scroll: {
    blue: 'あおひものスクロール', brown: 'ちゃひものスクロール', cyan: 'みずいろひものスクロール',
    green: 'みどりひものスクロール', grey: 'はいいろひものスクロール', purple: 'むらさきひものスクロール',
    red: 'あかひものスクロール', yellow: 'きいろひものスクロール',
  },
  wand: {
    wood: 'きのワンド', iron: 'てつのワンド', silver: 'ぎんのワンド', gold: 'きんのワンド',
    bone: 'ほねのワンド', glass: 'ガラスのワンド', copper: 'どうのワンド', ivory: 'ぞうげのワンド',
  },
  ring: {
    ruby: 'ルビーのリング', tourmaline: 'トルマリンのリング', emerald: 'エメラルドのリング',
    opal: 'オパールのリング', pearl: 'パールのリング', diamond: 'ダイヤのリング',
    moonstone: 'ムーンストーンのリング', jade: 'ヒスイのリング',
  },
  pot: {
    clay: 'つちいろのポット', blue: 'あおいポット', green: 'みどりのポット', purple: 'むらさきのポット',
  },
};

// レベルアップに必要な経験値テーブル（インデックス=レベル）
export const EXP_TABLE = [
  0, 5, 14, 30, 56, 109, 185, 305, 470, 720, 1080, 1530, 2130, 2880, 3800, 5000,
];

// レベルごとの最大HP・ちからの基準値
export function levelStats(level) {
  return {
    maxHp: 30 + (level - 1) * 8,            // Lv1=30, 以降+8
    str:   8 + Math.floor((level - 1) / 2), // 2レベルごとに+1
  };
}
