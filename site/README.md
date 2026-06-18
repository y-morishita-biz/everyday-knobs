# site — 公開LP（ランディングページ）の置き場

このフォルダに **LP（紹介ページ）のソース** を置きます。Claude Design で作った
`index.html` / CSS / 画像などをここに入れてください。

## 公開時の構成（GitHub Pages）

`main` に push すると、[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) が
自動でビルド＆デプロイします。

```
公開URL（例）  https://y-morishita-biz.github.io/everyday-knobs/
├─ /            ← この site/ の中身（LP）          … index.html がトップページ
├─ /app/        ← ジェネレーター本体（app/ をビルド）
└─ /.nojekyll   ← 自動付与
```

## 置き方のルール

- **トップページは `site/index.html`**（これが公開URLのルートになる）。
- CSS・画像など LP 用アセットも **この site/ 配下**に置く（例：`site/styles.css`、`site/assets/...`）。
- パスは**相対参照**にする（`./styles.css`、`./assets/hero.png` など）。サブパス公開でも崩れない。
- ジェネレーターへのリンクは **`app/`**（相対）でOK → `<a href="app/">ジェネレーターを開く</a>`。
- マニュアルを別ページにするなら `site/manual.html`（→ `/manual.html`）。
- 既存の作例スクショを使いたい場合は、必要な画像を `posts/images/` などから
  `site/assets/` にコピーして使う（デプロイは site/ の中だけを公開ルートへ運ぶため）。

## 必須要素（要件定義より）

- **#まいにちのぶ** セクション
- **X CTA** … `https://x.com/penomo`（@penomo）
- 主CTA … 「ジェネレーターを開く」→ `app/`
- 詳細は [`../docs/site-plan.md`](../docs/site-plan.md) を参照。
