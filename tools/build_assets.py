#!/usr/bin/env python3
# =============================================================
# build_assets.py - 画像素材（タイルアトラス）の生成スクリプト
#
#   Dungeon Crawl Stone Soup の CC0 タイル（https://github.com/crawl/tiles）
#   から使うタイルを抜き出し、1枚のアトラス画像 assets/tiles.png と
#   キー→位置の対応表 js/atlas.js を生成する。
#   Crawl に無い素材（ポット・お店のじゅうたん）はここでドット絵を描く。
#
#   使い方:
#     git clone --depth 1 https://github.com/crawl/tiles crawl-tiles
#     pip install pillow
#     python3 tools/build_assets.py crawl-tiles/releases
# =============================================================
import os
import sys
from PIL import Image, ImageDraw

TS = 32
COLS = 16

if len(sys.argv) < 2:
    print('使い方: python3 tools/build_assets.py <crawl-tiles/releases のパス>')
    sys.exit(1)

REL = sys.argv[1]
NOV = os.path.join(REL, 'Nov-2015')
OLD = os.path.join(REL, 'Ancient', 'Oct-5-2010')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def nov(p):
    return os.path.join(NOV, p + '.png')


def old(p):
    return os.path.join(OLD, p + '.png')


# -------------------------------------------------------------
# 使用するタイル（キー: ファイル）
# -------------------------------------------------------------
TILES = {}

# ---- モンスター ----
MONSTERS = {
    'slime': 'mon/amorphous/azure_jelly',
    'bat': 'mon/animals/bat',
    'kobold': 'mon/kobold',
    'goblin': 'mon/goblin',
    'scorpion': 'mon/animals/scorpion',
    'wolf': 'mon/animals/wolf',
    'orc': 'mon/orc_warrior',
    'ghost': 'mon/undead/ghost',
    'archer': 'mon/deep_elf_master_archer',
    'skeleton': 'mon/undead/skeletal_warrior',
    'ghoul': 'mon/undead/ghoul',
    'troll': 'mon/deep_troll',
    'golem': 'mon/nonliving/iron_golem',
    'wyvern': 'mon/dragons/wyvern',
    'dragon': 'mon/dragons/golden_dragon',
    'shopkeeper': 'mon/human',
}
for k, p in MONSTERS.items():
    TILES['mon_' + k] = nov(p)

# ---- 主人公の着せ替えパーツ（装備が見た目に反映される） ----
HERO_BASE = ['player/cloak/blue', 'player/base/human_m', 'player/boots/middle_brown',
             'player/legs/pants_blue', 'player/body/jacket2']
HERO_HAIR = 'player/hair/brown1'
DOLL_WEAPON = {
    'dagger': 'player/hand1/dagger',
    'shortsword': 'player/hand1/short_sword',
    'handaxe': 'player/hand1/hand_axe',
    'longsword': 'player/hand1/long_sword_slant',
    'greatsword': 'player/hand1/great_sword_slant',
    'runeblade': 'player/hand1/sword_twist',
}
DOLL_SHIELD = {
    'buckler': 'player/hand2/buckler_round',
    'heater': 'player/hand2/shield_donald',
    'knight': 'player/hand2/shield_knight_blue',
    'large': 'player/hand2/lshield_long_red',
    'mirror': 'player/hand2/lshield_louise',
}
TILES['hero_hair'] = nov(HERO_HAIR)
for k, p in DOLL_WEAPON.items():
    TILES['doll_w_' + k] = nov(p)
for k, p in DOLL_SHIELD.items():
    TILES['doll_s_' + k] = nov(p)

# ---- アイテム ----
ITEM_TILES = {
    # 武器
    'dagger': 'item/weapon/dagger',
    'shortsword': 'item/weapon/short_sword1',
    'handaxe': 'item/weapon/hand_axe1',
    'longsword': 'item/weapon/long_sword1',
    'greatsword': 'item/weapon/greatsword1',
    'runeblade': 'item/weapon/artefact/urand_jihad',
    # 盾
    'buckler': 'item/armour/shields/buckler1',
    'heater': 'item/armour/shields/shield_donald',
    'knight': 'item/armour/shields/shield2',
    'large': 'item/armour/shields/large_shield1',
    'mirror': 'item/armour/shields/lshield_louise',
    # 食料
    'apple': 'item/food/apple',
    'bread': 'item/food/bread_ration',
    'meat': 'item/food/meat_ration',
}
for k, p in ITEM_TILES.items():
    TILES['item_' + k] = nov(p)

# 未識別アイテムの「見た目」（ゲームごとにシャッフルして割り当てる）
POTION_LOOKS = ['ruby', 'brilliant_blue', 'golden', 'murky', 'bubbly', 'cloudy',
                'magenta', 'cyan', 'orange', 'white', 'black', 'sky_blue']
SCROLL_LOOKS = ['blue', 'brown', 'cyan', 'green', 'grey', 'purple', 'red', 'yellow']
WAND_LOOKS = ['wood', 'iron', 'silver', 'gold', 'bone', 'glass', 'copper', 'ivory']
RING_LOOKS_NOV = ['ruby', 'tourmaline']
RING_LOOKS_OLD = ['emerald', 'opal', 'pearl', 'diamond', 'moonstone', 'jade']
for k in POTION_LOOKS:
    TILES['potion_' + k] = nov('item/potion/' + k)
for k in SCROLL_LOOKS:
    TILES['scroll_' + k] = nov('item/scroll/scroll-' + k)
for k in WAND_LOOKS:
    TILES['wand_' + k] = nov('item/wand/gem_' + k)
for k in RING_LOOKS_NOV:
    TILES['ring_' + k] = nov('item/ring/' + k)
for k in RING_LOOKS_OLD:
    TILES['ring_' + k] = old('item/ring/' + k)

# 識別済みアイテムに重ねる小アイコン
ICONS = {
    'heal': nov('item/potion/i-heal-wounds'),
    'extraheal': nov('item/potion/i-curing'),
    'life': nov('item/potion/i-experience'),
    'strength': nov('item/potion/i-might'),
    'poison': nov('item/potion/i-poison'),
    'cure': nov('item/potion/i-restore-abilities'),
    'map': nov('item/scroll/i-magic_mapping'),
    'identify': nov('item/scroll/i-identify'),
    'thunder': nov('item/wand/i-lightning'),
    'teleport': nov('item/scroll/i-teleportation'),
    'enchant': nov('item/scroll/i-enchant-weapon'),
    'protect': nov('item/scroll/i-enchant_armour'),
    'swap': nov('item/wand/i-polymorph'),
    'blast': nov('item/wand/i-magic_darts'),
    'lightning': nov('item/wand/i-lightning'),
    'warp': nov('item/wand/i-teleportation'),
    'regen': old('item/ring/i-regeneration'),
    'sense': old('item/ring/i-see-invis'),
    'sustain': old('item/ring/i-sustenance'),
}
for k, p in ICONS.items():
    TILES['icon_' + k] = p

# ゴールドの山（金額で見た目が変わる）
for n in ['01', '03', '06', '10', '16']:
    TILES['gold_' + n] = nov('item/gold/' + n)

# ---- ダンジョン（3フロアごとにテーマが変わる） ----
#   Crawl の床は暗めなので、ライティングと重ねても見やすいよう明るさを補正する
#   （床・壁ファイル名, 番号, 明るさの倍率）
THEMES = [
    ('floor/pebble_brown', [0, 1, 2, 3], 3.4, 'wall/brick_brown', [0, 1, 2, 3], 1.3),
    ('floor/cobble_blood', [1, 2, 3, 4], 2.0, 'wall/brick_gray', [0, 1, 2, 3], 1.2),
    ('floor/lair', [0, 1, 2, 3], 2.1, 'wall/wall_vines', [0, 1, 2, 3], 1.0),
    ('floor/marble_floor', [1, 2, 3, 4], 2.3, 'wall/crystal_wall', ['00', '01', '02', '03'], 0.9),
]
GAIN = {}
for ti, (fl, fls, fg, wl, wls, wg) in enumerate(THEMES):
    for vi, n in enumerate(fls):
        TILES[f'floor{ti}_{vi}'] = nov(f'dngn/{fl}{n}')
        GAIN[f'floor{ti}_{vi}'] = fg
    for vi, n in enumerate(wls):
        TILES[f'wall{ti}_{vi}'] = nov(f'dngn/{wl}{n}')
        GAIN[f'wall{ti}_{vi}'] = wg

TILES['stairs'] = old('dc-dngn/gateways/stone_stairs_down')
for i in range(5):
    TILES[f'torch_{i}'] = old(f'dc-dngn/wall/torches/torch{i}')


# -------------------------------------------------------------
# 自作ドット絵（Crawl に無い素材）
# -------------------------------------------------------------
def hexrgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb[:3]) + (rgb[3],)


def draw_pot(base_hex):
    """ずんぐりしたツボ（輪郭線＋左上からの陰影）"""
    im = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
    px = im.load()
    base = hexrgb(base_hex)
    hi = shade(base, 1.35)
    mid = base
    dark = shade(base, 0.62)
    darker = shade(base, 0.42)
    fill = {}
    # 胴体（楕円）
    cx, cy, rx, ry = 15.5, 20.0, 10.5, 9.0
    for y in range(TS):
        for x in range(TS):
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            if dx * dx + dy * dy <= 1.0 and y <= 29:
                fill[(x, y)] = 'body'
    # 首
    for y in range(7, 12):
        for x in range(11, 21):
            fill[(x, y)] = 'neck'
    # 口のふち
    for y in range(5, 8):
        for x in range(9, 23):
            fill[(x, y)] = 'rim'
    # 塗り
    for (x, y), part in fill.items():
        if part == 'rim':
            c = hi if y == 5 else (mid if y == 6 else dark)
            if x in (9, 22):
                c = dark
        elif part == 'neck':
            c = darker if y <= 8 else dark
            if x == 11:
                c = mid
        else:
            # 光源は左上：左上ほど明るく、右下ほど暗い
            dx = (x - cx) / rx
            dy = (y - cy) / ry
            l = -0.6 * dx - 0.5 * dy
            if l > 0.55:
                c = hi
            elif l > -0.15:
                c = mid
            elif l > -0.7:
                c = dark
            else:
                c = darker
        px[x, y] = c
    # 口の穴
    for x in range(11, 21):
        px[x, 6] = (30, 20, 16, 255)
    # 胴の飾り帯
    for x in range(6, 26):
        if (x, 17) in fill and fill[(x, 17)] == 'body':
            px[x, 17] = shade(px[x, 17], 0.7)
            px[x, 18] = (235, 205, 120, 255) if x % 3 else shade(px[x, 18], 0.8)
    # ハイライト
    for (x, y) in [(9, 15), (9, 16), (10, 14), (8, 17), (8, 18)]:
        if (x, y) in fill:
            px[x, y] = (255, 255, 255, 200)
    # 輪郭線
    out = im.copy()
    op = out.load()
    for y in range(TS):
        for x in range(TS):
            if px[x, y][3] != 0:
                continue
            near = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < TS and 0 <= ny < TS and px[nx, ny][3] != 0:
                        near = True
            if near:
                op[x, y] = (18, 12, 10, 255)
    # 足元の影
    sh = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((6, 27, 26, 31), fill=(0, 0, 0, 90))
    sh.alpha_composite(out)
    return sh


def draw_rug():
    """お店のじゅうたん（床に重ねる半透明タイル）"""
    im = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, TS - 1, TS - 1), fill=(150, 32, 40, 190))
    d.rectangle((1, 1, TS - 2, TS - 2), outline=(90, 16, 24, 200))
    # 金色のひし形模様
    gold = (232, 190, 90, 210)
    c = TS // 2
    for i in range(0, 9):
        for (x, y) in [(c - i, c - 8 + i), (c + i, c - 8 + i), (c - i, c + 8 - i), (c + i, c + 8 - i)]:
            if 0 <= x < TS and 0 <= y < TS:
                im.putpixel((x, y), gold)
    im.putpixel((c, c), gold)
    for (x, y) in [(3, 3), (TS - 4, 3), (3, TS - 4), (TS - 4, TS - 4)]:
        d.rectangle((x - 1, y - 1, x + 1, y + 1), fill=gold)
    return im


GENERATED = {}
POT_LOOKS = {'clay': '#b86a3c', 'blue': '#4a72c8', 'green': '#48a060', 'purple': '#8c58b8'}
for k, col in POT_LOOKS.items():
    GENERATED['pot_' + k] = draw_pot(col)
GENERATED['rug'] = draw_rug()


# -------------------------------------------------------------
# ライセンス確認：不明ライセンスの一覧に載っているファイルは使わない
# -------------------------------------------------------------
def unknown_license_names():
    path = os.path.join(os.path.dirname(REL), 'TILES_UNDER_UNKNOWN_LICENSE.md')
    names = set()
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if line.startswith('- '):
                names.add(line[2:].strip())
    return names


def main():
    banned = unknown_license_names()
    if not banned:
        print('警告: TILES_UNDER_UNKNOWN_LICENSE.md が見つかりません')
    keys = []
    images = {}
    for k, p in TILES.items():
        if not os.path.exists(p):
            print('エラー: ファイルがありません', p)
            sys.exit(1)
        if os.path.basename(p) in banned:
            print('エラー: ライセンス不明のタイルです', p)
            sys.exit(1)
        im = Image.open(p).convert('RGBA')
        if im.size != (TS, TS):
            print('エラー: 32x32 ではありません', p, im.size)
            sys.exit(1)
        if k in GAIN and GAIN[k] != 1.0:
            g = GAIN[k]
            r, gg, b, a = im.split()
            r, gg, b = (ch.point(lambda v: min(255, int(v * g))) for ch in (r, gg, b))
            im = Image.merge('RGBA', (r, gg, b, a))
        images[k] = im
        keys.append(k)

    # 主人公の素体（マント・体・靴・ズボン・上着）を1枚に合成
    hero = Image.new('RGBA', (TS, TS), (0, 0, 0, 0))
    for p in HERO_BASE:
        path = nov(p)
        if os.path.basename(path) in banned:
            print('エラー: ライセンス不明のタイルです', path)
            sys.exit(1)
        hero.alpha_composite(Image.open(path).convert('RGBA'))
    images['hero_base'] = hero
    keys.insert(0, 'hero_base')

    for k, im in GENERATED.items():
        images[k] = im
        keys.append(k)

    rows = (len(keys) + COLS - 1) // COLS
    atlas = Image.new('RGBA', (COLS * TS, rows * TS), (0, 0, 0, 0))
    index = {}
    for i, k in enumerate(keys):
        x, y = (i % COLS) * TS, (i // COLS) * TS
        atlas.alpha_composite(images[k], (x, y))
        index[k] = i

    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    atlas.save(os.path.join(ROOT, 'assets', 'tiles.png'), optimize=True)

    lines = [
        '// =============================================================',
        '// atlas.js - タイルアトラスの対応表（tools/build_assets.py が自動生成）',
        '//   手で編集しないこと。素材を変えたらスクリプトを再実行する。',
        '// =============================================================',
        f'export const ATLAS_COLS = {COLS};',
        f'export const ATLAS_TILE = {TS};',
        'export const ATLAS = {',
    ]
    for k in keys:
        lines.append(f"  '{k}': {index[k]},")
    lines.append('};')
    lines.append('export const LOOKS = {')
    lines.append(f"  potion: {POTION_LOOKS!r},".replace("'", "'"))
    lines.append(f"  scroll: {SCROLL_LOOKS!r},")
    lines.append(f"  wand: {WAND_LOOKS!r},")
    lines.append(f"  ring: {RING_LOOKS_NOV + RING_LOOKS_OLD!r},")
    lines.append(f"  pot: {list(POT_LOOKS.keys())!r},")
    lines.append('};')
    with open(os.path.join(ROOT, 'js', 'atlas.js'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'assets/tiles.png ({atlas.size[0]}x{atlas.size[1]}, {len(keys)}枚) と js/atlas.js を生成しました')


main()
