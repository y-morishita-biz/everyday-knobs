# CLAUDE.md — everyday-knobs 開発ガイド & 作業手順

> このファイルは Claude Code がセッション開始時に自動で読み込む。**「1日1ノブ」を回す
> ための定番手順**をここに固定し、機能を実装し終えるたびに必ず反芻する。
> （プロジェクトの方針・ゴールは [`README.md`](README.md)、日々の記録は
> [`docs/devlog.md`](docs/devlog.md)。）

## プロジェクト一言まとめ

ロータリーエンコーダ（ALPS **EC1110120005** = φ6 Dカット軸 / **EC12E085** = 中空軸）に挿さる
ツマミを、ブラウザ上でパラメトリックに生成・プレビュー・STL/STEP エクスポートするジェネレーター。
サーバー不要のクライアントオンリー（Vite + React + TypeScript + Replicad(WASM) + Three.js）。
アプリ本体は [`app/`](app/)。

## 黄金ルール（1日1ノブのリズム）

**1機能 = 1ブランチ = 1作例ノブ = 1 devlog エントリ = 1 Xポスト（#まいにちのぶ）**

機能の粒度は「要素分解された独立して足せる単位」（例：天面インジケーター、ローレット、
本体形状追加、JSON保存…）。大きすぎたら分割する。

---

## 機能実装の標準フロー（毎回これを順番に実行する）

### 1. 着手：main から機能ブランチを切る
```bash
git checkout main && git pull origin main
git checkout -b feat/day-NN-<slug>      # 例: feat/day-02-top-indicator
```
- `NN` は devlog の通し番号（次の番号は `docs/devlog.md` 先頭で確認）。
- 1ブランチ = 1機能。混ぜない。

### 2. 実装
- アプリの変更は [`app/`](app/) 配下。軸寸法の「正」は [`reference/`](reference/)（README の実測表）。
- 既存のコード様式・命名・コメント量に合わせる。

### 3. 検証（"動いた" を確認してから先へ）
```bash
cd app
npm install            # 依存が増えたときだけ
npm run build          # 型チェック＋バンドルが通ること
npm run dev            # http://localhost:5173 を実機ブラウザで確認
```
- 受け入れ基準（プレビュー表示・トグル/スライダーのリアルタイム更新・破綻形状の防止・
  STL/STEP 書き出し）を満たすか目視で確認。可能ならスクリーンショットを残す。
- コンソールエラーが 0 件であること。

### 4. devlog に追記
[`docs/devlog.md`](docs/devlog.md) の**先頭**に新しい `## Day NN` エントリを追加（雛形は同ファイル冒頭）。
**Xポスト下書き（#まいにちのぶ）も必ず書く。**

### 5. コミット
- メッセージは日本語、命令形の要約 + 箇条書き。1機能でまとめる。
- 例：`feat: 天面ポインターを追加` / `docs: Day 02 を devlog に記録`

### 6. push
```bash
git push -u origin feat/day-NN-<slug>
```
ネットワーク失敗時は指数バックオフ（2s,4s,8s,16s）で最大4回リトライ。

### 7. main にマージ（= その日の機能を確定）
```bash
git checkout main && git pull origin main
git merge --no-ff feat/day-NN-<slug> -m "merge: Day NN <タイトル>"
git push origin main
```
- `--no-ff` で「1日 = 1マージコミット」を main 履歴に残す（活動の単位が見えるように）。
- 共同作業者がいる/レビューを通したい場合は PR を作成してマージに切り替える
  （PR は**ユーザーが明示的に頼んだときだけ**作る）。

### 8. 次の日へ
- マージ後、作業ツリーは main に戻っている。次の機能はまた **1.** から（新しいブランチ）。
- Xへの投稿は devlog の「Xポスト下書き」をそのまま使う。

---

## Definition of Done（完了チェックリスト）

機能を「完了」と呼ぶ前に、以下が全部 ✅ であること：

- [ ] `npm run build` が通る
- [ ] 実機（`npm run dev`）で動作確認した（コンソールエラー 0）
- [ ] 破綻パラメータがスライダー可動域で防がれている
- [ ] STL / STEP が書き出せる（既存機能を壊していない）
- [ ] `docs/devlog.md` に Day エントリと **#まいにちのぶ Xポスト下書き**を追記した
- [ ] 機能ブランチでコミット → push → **main に `--no-ff` マージ** → push した

## コミット / ブランチ規約

- ブランチ：`feat/day-NN-<slug>`（機能）。雑作業は `chore/<slug>` / `fix/<slug>` / `docs/<slug>`。
- コミット要約は日本語・命令形。本文に「なぜ」を箇条書き。
- main への直接コミット禁止。必ず機能ブランチ経由。

## 開発メモ

- Node 20+（22で確認）。アプリは `app/`。CAD は WebWorker（`app/src/worker/cad.worker.ts`）。
- OpenCASCADE の WASM(~11MB) はワーカー内で初期化。初回プレビューは数秒かかる。
- 公開ホスティング（GitHub Pages 等）を犠牲にしない設計を保つ（`base: "./"`、サーバー機能を足さない）。

## 参照

- 方針・ゴール・受け入れ基準・ロードマップ … [`README.md`](README.md)
- 要件定義 v1 … [`docs/requirements_v1.md`](docs/requirements_v1.md)
- 対象エンコーダの寸法・形状の正 … [`reference/README.md`](reference/README.md)
- 日々の記録 … [`docs/devlog.md`](docs/devlog.md)
