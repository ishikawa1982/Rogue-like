# 画像素材のクレジット

`assets/tiles.png` のタイル画像は、**Dungeon Crawl Stone Soup** のタイルを
再利用しやすく整理した [crawl/tiles](https://github.com/crawl/tiles) から使っています。

- ライセンス：**CC0 1.0（パブリックドメイン相当）**
  <https://creativecommons.org/publicdomain/zero/1.0/>
- 作者：Dungeon Crawl Stone Soup の開発者・アーティストのみなさん
  （作者一覧は [ARTISTS.md](https://github.com/crawl/tiles/blob/master/ARTISTS.md)）
- 元になった RLTiles：<http://rltiles.sourceforge.net/>
- ライセンスが不明なタイル（crawl/tiles の `TILES_UNDER_UNKNOWN_LICENSE.md` に載っているもの）は使っていません。
  `tools/build_assets.py` がこの一覧と照合し、載っているタイルがあれば生成を止めます。

CC0 のためクレジット表記は必須ではありませんが、素材を作ったみなさんへの感謝をこめて記載しています。

## このゲームで描き足したもの

次の2つは Crawl に無いため、`tools/build_assets.py` の中でドット絵を描いて生成しています。

- ポット（壺）4色
- お店のじゅうたん

## 明るさの調整

床のタイルは、ゲームのライティングと重ねても見やすいよう、エリアごとに明るさを上げています
（`tools/build_assets.py` の `THEMES`）。
