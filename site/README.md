# site — 公開LP（ランディングページ）

GitHub Pages の**公開ルート（`/`）に出る LP** のソース。`main` に push すると
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) が自動でビルド＆デプロイします。

```
公開URL  https://y-morishita-biz.github.io/everyday-knobs/
├─ /            ← この site/ の中身（LP）
└─ /app/        ← ジェネレーター本体（app/ をビルドして配置）
```

## 構成

```
site/
├── index.html      … LP本体（静的・OGP/メタ込み）。これが公開トップ
├── assets/
│   ├── lp.js              … グリフ生成 / テーマ・アクセント切替 / ヒーロー3D
│   ├── three.module.min.js, three.core.min.js … Three.js（vendor）
│   ├── hero/<id>.json     … ヒーローの3Dノブメッシュ（複数・読み込み毎にランダム選択）
│   └── og.png             … OGP / X カード画像
└── README.md       … このファイル（デプロイ時は除外）
```

## メモ

- **テーマ / アクセント色はアプリと localStorage 共有**（`everyday-knobs.theme` / `.accent`）。
  LP で選んだ色のまま `/app/` に入れます。
- ヒーローのノブは Three.js の実3D（斜め上ビュー・自動回転）。読み込み毎に
  `assets/hero/<id>.json` から1つをランダムに表示。`prefers-reduced-motion`
  で停止、WebGL不可時は `og.png` にフォールバック。
- ノブメッシュの作り直し：[`../app/bake-hero.ts`](../app/bake-hero.ts) を esbuild で
  バンドルして node 実行（手順はファイル冒頭コメント）。`assets/hero/` に出力。
  作例ギャラリーは `app/#preset=<id>` で各プリセットへディープリンクする。
- Claude Design のデザイン元データは [`../design/`](../design/) に保管（公開はしない）。
- 要件は [`../docs/site-plan.md`](../docs/site-plan.md)。
