# サードパーティ ライセンス表記（THIRD-PARTY NOTICES）

everyday-knobs 本体は [MIT License](LICENSE) です。ビルド成果物（`app/`）には以下の
サードパーティ ソフトウェアが含まれます。各コンポーネントは、それぞれのライセンス条項に
従って再配布しています。

## 実行時に配布されるもの（ブラウザに読み込まれる）

| コンポーネント | ライセンス | 備考 |
|---|---|---|
| React / React DOM | MIT | © Meta Platforms, Inc. |
| Three.js | MIT | © three.js authors |
| Replicad | MIT | © Steve Genoud |
| comlink | Apache-2.0 | © Google LLC |
| **OpenCASCADE Technology (OCCT)** | **LGPL-2.1 ＋ OPEN CASCADE 例外** | CADカーネル。下記参照 |
| replicad-opencascadejs / opencascade.js | ラッパー: MIT ／ 同梱WASM: OCCT の LGPL に従う | OCCT を WebAssembly にビルドしたもの |

> ビルド時のみ利用（配布物に含まれない）：Vite（MIT）、TypeScript（Apache-2.0）、
> @vitejs/plugin-react（MIT）、各種 @types（MIT）。

## OpenCASCADE Technology について

本アプリの CAD カーネルには **OpenCASCADE Technology（OCCT）** を、
[opencascade.js](https://github.com/donalffons/opencascade.js)（npm: `replicad-opencascadejs`）
経由の WebAssembly ビルドとして、**未改変のまま**利用しています。

- OCCT のライセンス：**GNU LGPL 2.1** に **OPEN CASCADE 例外** を加えたもの。
  （参照: <https://dev.opencascade.org/resources/licensing>）
- 本プロジェクトは OCCT を**改変しておらず**、ライブラリとしてリンク（WASM を独立ファイルとして
  読み込み）しているため、LGPL / OCCT 例外の条件下で MIT ライセンスのアプリに組み込めます。
- OCCT の WASM は独立したファイルとして配布され、本プロジェクトのソースは公開されているため、
  LGPL が求める「置き換え・再リンク可能性」も満たしています。

Copyright (c) OPEN CASCADE SAS. OpenCASCADE Technology is licensed under the
GNU Lesser General Public License (LGPL) version 2.1 with the OPEN CASCADE
exception.
